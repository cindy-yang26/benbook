var visualizerDB = require('../models/visualizer.js').database
var friendsDB = require('../models/friends')
var friendReqDB = require('../models/friendRequest')

var showFriends = function(req, res) {
	var user = req.session.uname
	if (user) {
		friendsDB.get_friends(user, function(table){
			res.render('friends.ejs', {table: table})
		})
	} else {
		req.session.loginerror = "Please sign in to continue";
		res.redirect('/')
	}
}

var friendList = function(req, res) {
    var friend = req.body.user
    var user = req.session.uname
    if (user && friend) {
        friendsDB.get_friends(friend, function(table) {
            res.send(table)
        })
    } else {
        if (user) {
            friendsDB.get_friends(user, function(table) {
                res.send(table)
            })
        } else {
            req.session.loginerror = "Please sign in to continue";
            res.redirect('/')
        }
    }
}

var deleteFriend = function(req, res) {
	var user = req.session.uname
	var friend = req.body.friend
	if (user) {
		friendsDB.remove_friend(user, friend, function(err, data) {
			if (data) {
				friendsDB.remove_friend(friend, user, function(err, data) {
					res.send(data)
				})
			} 
		});
	} else {
		req.session.loginerror = "Please sign in to continue";
		res.redirect('/')
	}
}

var rejectFriend = function(req, res) {
	var user = req.session.uname
	var friend = req.body.friend
	if (user) {
		friendReqDB.reject_friend(user, friend, function(err, data) {
			if (err) {
				res.send(err)
			} else {
				res.send(data)
			}
		})
	} else {
		req.session.loginerror = "Please sign in to continue";
		res.redirect('/')
	}
}

var acceptFriend = function(req, res) {
	var user = req.session.uname
	var friend = req.body.friend
	if (user) {
		friendReqDB.reject_friend(user, friend, function(err, data) {
			if (err) {
				res.send(err)
			} else {
				friendReqDB.add_friend(user, friend, function(err, data) {
					if (err) {
						res.send(err)
					} else {
						friendReqDB.add_friend(friend, user, function(err, data) {
							if (err) {
								res.send(err)
							} else {
								res.send(data)
							}
						})
					}
				})
			}
		})
	} else {
		req.session.loginerror = "Please sign in to continue";
		res.redirect('/')
	}
}

var sendReq = function(req, res) {
	var friend = req.body.friend 
	var user = req.session.uname
	if (user && friend) {
		if (user === friend) {
			res.redirect('/wall')
		}
		friendReqDB.add_request(user, friend, function(err, data) {
			if (err) {
				res.send(err)
			} else {
				res.send("success")
			}
		})
	} else if (user) {
		res.send("noFriend")
	} else {
		req.session.loginerror = "Please sign in to continue";
		res.redirect('/')
	}
}

var currReqs = function(req, res) {
	var user = req.session.uname
	if (user) {
		friendReqDB.formatted_reqs(user, function(err, data) {
			if (err) {
				console.log(err)
			} else {
				res.render('userreqs.ejs', {table: data})
			}
		})
	} else {
		req.session.loginerror = "Please sign in to continue";
		res.redirect('/')
	}
}

var reqList = function(req, res) {
	var user = req.session.uname
	if (user) {
		friendReqDB.formatted_reqs(user, function(err, data) {
			if (err) {
				res.send(err)
			} else {
				res.send(data)
			}
		})
	} else {
		req.session.loginerror = "Please sign in to continue";
		res.redirect('/')
	}
}

var checkStatus = function(req, res) {
	var friendReq = req.body.friendReq
	var user = req.session.uname 
	if (user) {			
		friendReqDB.check_friends(user, friendReq, function(bool) {
			if (bool) {
				console.log("HERE")
				res.send("success")
			} else {
				friendReqDB.check_status(user, friendReq, function(err, reqSent) {
					if (err) {
						res.send(err)
					} else {
						res.send(reqSent)
					}
				})
			}
		})
	} else {
		req.session.loginerror = "Please sign in to continue";
		res.redirect('/')
	}
}

var friendReq = function(req, res) {
	var friend = req.query.username 
	var user = req.session.uname
	if (user && friend) {
		if (user === friend) {
			res.redirect('/wall')
		} else {
			friendReqDB.check_friends(user, friend, function(bool) {
			if (bool) {
				res.redirect('/wall?username=' + friend)
			} else {
				friendReqDB.get_name(friend, function(data) {
					if (data === undefined) {
						res.redirect('/error')
					} else {
						friendReqDB.check_status(user, friend, function(err, reqSent) {
							if (err) {
								console.log(err)
							} else {
								res.render('request.ejs', {friend: friend, fullname: data, requestSent: reqSent})
							}
						})
					}
				})
			}
		})}
	} else {
		req.session.loginerror = "Please sign in to continue";
		res.redirect('/')
	}
}

var checkFriend = function(req, res) {
	var friendReq = req.body.friend
	var user = req.session.uname 
	if (user) {			
		friendReqDB.check_friends(user, friendReq, function(bool) {
			if (bool) {
				res.send({isFriend: true})
			} else {
				res.send({isFriend: false})
			}
		})
	} else {
		req.session.loginerror = "Please sign in to continue";
		res.redirect('/')
	}
}

var renderVisual = function(req, res) {
	res.render('friendvisualizer.ejs');
}

var userVisual = function(req, res) {
    visualizerDB.refresh()
    var user = req.session.uname
	if (user) {
		visualizerDB.lookup_main(user).then(x => {
			var json = x;
			res.send(json)
		})
	} else {
		req.session.loginerror = "Please sign in to continue";
		res.redirect('/')
	}
}

var expandFriend = function(req, res) {
    const friend = req.params.user;
    visualizerDB.lookup_friend(friend).then(x => {
        var json = x;
        res.send(json)
    })
}

var routes = { 
    show_friends: showFriends,
    friend_list: friendList,
    delete_friend: deleteFriend,
    reject_friend: rejectFriend, 
    accept_friend: acceptFriend, 
    send_request: sendReq,
    current_requests: currReqs, 
    request_list: reqList, 
    friend_request: friendReq,
    request_status: checkStatus, 
    check_friends: checkFriend,
    visualizer: renderVisual,
    user_visualizer: userVisual,
    expand_friend: expandFriend,
};
  
module.exports = routes;