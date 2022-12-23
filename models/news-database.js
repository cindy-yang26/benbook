const path = require("path");
const stemmer = require("stemmer")
const AWS = require("aws-sdk");
AWS.config.update({region:'us-east-1'});
const client = new AWS.DynamoDB();

// return today's articles with positive weights for our user
function getFeed(username) {
	// no feed if not logged in
	if (username == null)
		return new Promise((resolve) => []);
	
	// query to dynamodb for feed given username + today's date
 	const params = (u) => ({
		  ExpressionAttributeValues: {
		    ':u': {S: u},
		    ':d': {S: new Date().toISOString().slice(0, 10)}
		  },
		  KeyConditionExpression: 'username = :u and begins_with(article, :d)',
		  TableName: 'feeds'
	});
	
	// return feed array
	return new Promise((resolve) => {
		client.query(
			params(username),
			(err, data) => {
				resolve(data.Items.map(x => {
					x.weight.N = parseFloat(x.weight.N);
					return x;
				}));
			}
		)
	})
}

// return rank of this article
function getRank(username, article) {
	// no rank if not logged in
	if (username == null)
		return new Promise((resolve) => []);
	
	// query to dynamodb for rank given username + article
 	const params = (u, a) => ({
		  ExpressionAttributeValues: {
		    ':u': {S: u},
		    ':a': {S: a},
		  },
		  KeyConditionExpression: 'username = :u and article = :a',
		  TableName: 'feeds'
	});
	
	// return rank object
	return new Promise((resolve) => {
		client.query(
			params(username, article),
			(err, data) => {
				resolve(data.Items.map(x => {
					x.weight.N = parseFloat(x.weight.N);
					console.log("HEY " + x.weight.N + " " + x.article.S + " " + x.username.S);
					return x;
				})[0]);
			}
		)
	})
}

// get article data from date & id
function getArticle(date, aid, username) {
	// query to dynamodb for article data given date & id
 	const articleParams = (d, a) => ({
		  ExpressionAttributeValues: {
		    ':d': {S: d},
		    ':a': {N: a},
		  },
		  ExpressionAttributeNames: {
			'#date': 'date'
		  },
		  KeyConditionExpression: '#date = :d and aid = :a',
		  TableName: 'articles'
	});
	// query to dynamodb for like data given username and article
	const likeParams = (u, a) => ({
		ExpressionAttributeValues: {
			':u': {S: u},
			':a': {S: a},
		},
		KeyConditionExpression: 'username = :u and article = :a',
		TableName: 'likes'
	});
	
	// return object corresponding to our query
	return new Promise((resolve) => {
		Promise.all([
			// get article data
			new Promise((innerResolve) => {client.query(
				articleParams(date, aid),
				(err, data) => {
					innerResolve(data.Items[0]);
				}
			)}),
			// get like data
			new Promise((innerResolve) => {client.query(
				likeParams(username, date + "-" + aid),
				(err, data) => {
					innerResolve(data.Items.length > 0)
				}
			)})
		]).then((results) => {
			// add like field to article data
			if (results[1])
				results[0].liked = 'liked';
			resolve(results[0]);
		})
	})
}

function getKeyword(keyword) {
	// dynamodb query to get article from keyword
 	const params = (w) => ({
		  ExpressionAttributeValues: {
		    ':s': {S: stemmer(w.toLowerCase())}
		  },
		  KeyConditionExpression: 'keyword = :s',
		  TableName: 'inverted'
	});
	
	// create promise for when all queries finish
	return Promise.all(
		// split keystring into words
		keyword.split(" ").map((w) => 
			// for each word, query server and resolve to list
			new Promise((resolve) => {
				client.query(params(w), (_, data) => { 
					resolve(data.Items); 
				});
			})
		)
	)
	// return one array containing all results
	.then((results) => [].concat.apply([], results));
}

// toggle if article is liked in db
async function toggleLike(username, article, like, callback) {	
	// dynamodb put item into likes table
	if (like == "true") {
		const params = (u, a) => ({
		  Item: {
		    'username': {S: u},
		    'article': {S: a}
		  },
		  TableName: 'likes'
		});
		client.putItem(params(username, article), (err, data) => {
			if (err)
				callback(err)
			callback(err, "success")
		})
	// dynamodb delete item from likes table
	} else {
		const params = (u, a) => ({
		  Key: {
		    'username': {S: u},
		    'article': {S: a}
		  },
		  TableName: 'likes'
		});
		client.deleteItem(params(username, article), (err, data) => {
			if (err)
				callback(err)
			callback(err, "success")
		})
	}
}

var database = { 
    get_feed: getFeed, 
    get_article: getArticle,
    get_keyword: getKeyword,
    get_rank: getRank,
    toggle_like: toggleLike,
    MAX_RESULTS: 50,
}

module.exports = database