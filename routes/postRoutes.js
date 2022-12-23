var wallsDB = require('../models/walls').database
var friendReqDB = require('../models/friendRequest')
var homeDB = require('../models/homepage')

var showWall = function(req, res) {
	var friend = req.query.username
	var user = req.session.uname
	var first_name = req.session.first_name;
	var last_name = req.session.last_name;
	if (friend) {
		friendReqDB.check_friends(user, friend, function(bool) {
			if (bool) {
				wallsDB.get_posts(friend, function(data) {
					friendReqDB.get_name(friend, function(data) {
						res.render('wall.ejs', {
							data: data, 
							user: friend, 
							fullname: data, 
							currLogin: user, 
						})
					})
				});
			} else {
				res.redirect('/friendreq?username=' + friend)
			}
		})
	} else {
		if (user) {
			wallsDB.get_posts(user, function(data) {
				res.render('wall.ejs', {
					data: data, 
					user: user, 
					fullname: first_name + " " + last_name, 
					currLogin: user, 
				})
			});
		} else {
			req.session.loginerror = "Please sign in to continue";
			res.redirect('/')
		}
	}
}

var renderWall = function(req, res) {
	var user = req.body.user
	if (user) {
		wallsDB.get_posts(user, function(data) {
			res.send(JSON.stringify(data))
		})
	} else {
		req.session.loginerror = "Please sign in to continue";
		res.redirect('/')
	}
}

var renderHome = function(req, res) {
	var user = req.body.user
	if (user) {
		homeDB.get_posts(user, function(data) {
			res.send(JSON.stringify(data))
		})
	} else {
		req.session.loginerror = "Please sign in to continue";
		res.redirect('/')
	}
}

var addComments = function(req, res) {
	var user = req.session.uname
	var comment = req.body.comment
	var id = req.body.postId
	var time = req.body.time
	if (user) {
		wallsDB.write_comment(user, comment, id, time, function(err, data) {
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

var addPostFunc = function(req, res) {
	var user = req.session.uname 
	var pageOwner = req.body.poster
	var post = req.body.post 
	var time = req.body.time 
	var id = req.body.id
	if (user) {
		addPost(user, pageOwner, post, time, id, res)
	} else {
		req.session.loginerror = "Please sign in to continue";
		res.redirect('/')
	}
}

function addPost(user, pageOwner, post, time, id, res) {
	wallsDB.create_post(id, time, post, user, pageOwner, function(err, data) {
		if (err) {
			console.log(err)
		} else {
			if (user !== pageOwner) {
				wallsDB.add_post_to_user(user, id, time, function(err, data) {
					if (err) {
						res.send(err)
					} else {
						wallsDB.add_post_to_user(pageOwner, id, time, function(err, data) {
							if (err) {
								res.send(err)
							} else {
								res.send(data)
							}
						})
					}
				})	
			} else {
				wallsDB.add_post_to_user(user, id, time, function(err, data) {
					if (err) {
						res.send(err)
					} else {
						res.send(data)
					}
				})
			}
		}
	})
}

var routes = { 
    show_wall: showWall, 
    render_wall: renderWall,
    render_home: renderHome,
    add_comments: addComments, 
    add_post: addPostFunc,
}
  
module.exports = routes;