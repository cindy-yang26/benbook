var newsDB = require('../models/news-database');

// redner the news route
var news = function(request, response) {
	// handle search
	if (request.query.search) {
		var freqs = new Map();
		// first do the search
		newsDB.get_keyword(request.query.search)
		.then((results) => {
			// for each article hit by a keyword, increment its frequency
			results.map((article) => {
				freqs.set(
					article.date.S + "-" + article.aid.N, 
					(freqs.get(article.date.S + "-" + article.aid.N) || 0) + 1
				);
				}
			);
			// now get the weights for the retrieved articles
			Promise.all(results.map((article) => 
				newsDB.get_rank(request.session.uname, article.date.S + "-" + article.aid.N)
			))
			.then((results) => {
				// for each article received, set its weight
				var weights = new Map();
				results.map((article) => {
					if (article != undefined) {
						weights.set(
							article.article.S, 
							article.weight.N
						)
					}
				});
				// now sort articles: first by number of terms, then by weight
				return Promise.all(Array.from(freqs.entries())
					.sort((x, y) => y[1] - x[1] || 
						(weights.get(y[0]) || 0) - (weights.get(x[0]) || 0)
					)
					// get actual article data
					.map(x =>  newsDB.get_article(x[0].slice(0, 10), x[0].slice(11), request.session.uname) )
				);
			})
			.then((results) => {
				// render keystring and top MAX_RESULTS results
				response.render("news.pug", {
					"keyword": request.query.search,
					"results": results.slice(0, newsDB.MAX_RESULTS)
				});
			});
		})
	// feed search
	} else {
		// get feed ranks
		newsDB.get_feed(request.session.uname)
		.then((results) => 
			// choose articles to show
			Promise.all(
				Array(Math.min(newsDB.MAX_RESULTS, results.length)).fill()
					.map(x => {
						// sample articles from feed based on weights
						// feed should never be empty here
						// reservoir sampling
						var chosen = null;
						var total = 0;
						results.map((article) => {
							total += article.weight.N;
							if (article.weight.N > total * Math.random())
								chosen = article
						})
						results.splice(results.indexOf(chosen), 1);
						return chosen;
					
					})
					// get actual article data
					.map(x => newsDB.get_article(x.article.S.slice(0, 10), x.article.S.slice(11), request.session.uname) )
		))
		.then((results) => {
			// render
			response.render("news.pug", {
				"results": results
			});
		});
	}
}

// toggle whether user has liked an article
var toggleLike = function(req, res) {
	var user = req.session.uname
	var article = req.body.article
	// true if liked, false if unliked
	var toggle = req.body.toggle
	if (user) {
		newsDB.toggle_like(user, article, toggle, function(err, data) {
			if (err) {
				console.log(err)
			} else {
				res.send(data)
			}
		})
	} else {
		req.session.loginerror = "Please sign in to continue";
		res.redirect('/')
	}
}

var routes = { 
	news: news,
	toggle_like: toggleLike, 
};
  
module.exports = routes;