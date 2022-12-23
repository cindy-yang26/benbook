var CryptoJS = require("crypto-js");
var db = require('../models/reg-database');
var chatsDB = require('../models/chats-database');
var wallsDB = require('../models/walls').database;
var homeDB = require('../models/homepage');
var searchDB = require('../models/search');

var getHome = function(req, res) {
	var user = req.session.uname
	if (user == null) {
		req.session.loginerror = "Please sign in to continue";
		res.redirect('/');
	} else {
		chatsDB.add_user_to_chats(req.session.uname, function(err, data) {
			if (err) console.log(err);
		})
		req.session.signuperror = null;
		homeDB.get_posts(user, function(data) {
			res.render('homepage.ejs', {
				user: user,
				first_name: req.session.first_name, 
				last_name: req.session.last_name,
				email: req.session.email, 
				affil: req.session.affil, 
				bday: req.session.bday,
				interests: req.session.interests, 
				message: req.session.error, 
				data: data
			});
		})
	}
};

var getSignup = function(req, res) {
	db.getCats(function(err, data) {
		if (err) {
			console.log(err);
		} else {
			var nums = [];
			for (var i = 0; i < data.length; i++) {
				nums.push(i.toString());
			}
			res.render('signup.ejs', {signup: req.session.signuperror, login: req.session.loginerror, data: data, nums: nums});
		}
	})
};

var createAccount = function(req, res) {
	var username = req.body.username;
	var pw = req.body.pw;
	var first_name = req.body.first_name;
	var last_name = req.body.last_name;
    var email = req.body.email;
    var affil = req.body.affil;
    var bday = req.body.bday;
    var interests = req.body.interests;
	interests = JSON.parse(interests);
	var interestArr = [];
	for (var i = 0; i < interests.length; i++) {
		var obj = new Object();
		obj.S = interests[i];
		interestArr.push(obj);
	}

	if (username.length == 0 || pw.length == 0 || first_name.length == 0 ||
        email.length == 0 || affil.length == 0 || bday.length == 0 || 
        last_name.length == 0) {
		var info = [];
		req.session.signuperror = "Please fill out all the fields to sign up";
		res.send(info);
	} else if (!checkLetterNum(username)) {
		var info = [];
		req.session.signuperror = "Your username contains invalid characters";
		res.send(info);
	} else if (!checkLetterNum(pw)) {
		var info = [];
		req.session.signuperror = "Your password contains invalid characters";
		res.send(info);
	} else if (!checkLetters(first_name)) {
		var info = [];
		req.session.signuperror = "Your first name can only contain letters";
		res.send(info);
	} else if (!checkLetters(last_name)) {
		var info = [];
		req.session.signuperror = "Your last name can only contain letters";
		res.send(info);
	} else if (!checkEmail(email)) {
		var info = [];
		req.session.signuperror = "Your email is not valid";
		res.send(info);
	} else if (!date(bday)) {
		var info = [];
		req.session.signuperror = "Your birthday is not in the correct form";
		res.send(info);
	} else if (interestArr.length < 2) {
		var info = [0];
		req.session.signuperror = "Please select at least 2 interests";
		res.send(info);
	} else {
		db.lookup(username, function(err, data) {
			if (err) {
				console.log(err);
			} else if (data.length > 0) {
				var info = [0, 1];
				req.session.signuperror = "This username already exists, please try again";
				res.send(info);
			} else {
				db.addUser(username, pw, first_name, last_name, email, affil, bday, interestArr, function(err, data) {
					if (err) {
						console.log(err);
					} else {
						req.session.uname = username;
						req.session.first_name = first_name;
						req.session.last_name = last_name;
						req.session.email = email;
						req.session.affil = affil;
						req.session.bday = bday;
						req.session.interests = interestArr;
						var info = [
							first_name, last_name, username, pw, email, affil,
							bday, interestArr
						]
						res.send(info);
					}
				});
			}
		});
	}
};

var getProfile = function(req, res) {
	if (req.session.uname == null) {
		req.session.loginerror = "Please sign in to continue";
		res.redirect('/');
	} else {
		res.render('editprofile.ejs',
		{first_name: req.session.first_name, last_name: req.session.last_name,
		username: req.session.uname, email: req.session.email, affil: req.session.affil, bday: req.session.bday,
		interests: req.session.interests});
	 }
}

var getCats = function(req, res) {
	db.getCats(function(err, data) {
		if (err) {
			console.log(err);
		} else {
			res.send(data);
		}
	})
}

var checkLogin = function(req, res) {
	var username = req.body.uname;
	var pw = req.body.pw;
	if (username.length == 0) {
		req.session.loginerror = "Please enter your username to login";
		res.redirect('/');
	} else if (pw.length == 0) {
		req.session.loginerror = "Please enter your password to login";
		res.redirect('/');
	} else {
	  	db.lookup(username, function(err, data) {
			if (err) {
				console.log(err);
			} else if (data) {
				if (data.length == 0) {
					req.session.loginerror = "This username does not exist. Please try again";
					res.redirect('/');	
				} else {
					var encriptpw = CryptoJS.SHA256(pw).toString();
					if (data[0].password.S != encriptpw) {
						req.session.loginerror = "Invalid password"
						res.redirect('/');	
					} else {
						db.updateStatus(username, true, function(err, data2) {
							if (err) {
								console.log(err);
							} else {
								req.session.loginerror = undefined;
								req.session.signuperror = undefined;
								req.session.uname = data[0].username.S;
								req.session.first_name = data[0].first_name.S;
								req.session.last_name = data[0].last_name.S;
								req.session.email = data[0].email.S;
								req.session.affil = data[0].affiliation.S;
								req.session.bday = data[0].birthday.S;
								req.session.interests = data[0].interests.L;
								res.redirect('/homepage');
							}
						})
					}
				}
			}
	 	});
	 }	
}

var changeAffil = function(req, res) {
	var username = req.session.uname;
	var first_name = req.session.first_name;
	var newAffil = req.body.affil;
	if (newAffil == null || newAffil.length == 0) {
		var info = [];
		res.send(info);
	} else {
		db.updateAffil(username, newAffil, function(err, data) {
			if (err) {
				console.log(err);
			} else {
				req.session.affil = newAffil;
				var user = username 
				var pageOwner = username
				var time = Date.now().toString()
				var id = time.toString() + user
				var post = first_name + " is now affiliated with " + newAffil
				addPost(user, pageOwner, post, time, id)
				var info = [newAffil];
				res.send(info);
			}
		});
	}
}

var changeInterests = function(req, res) {
	var interests = req.body.interests;
	var first_name = req.session.first_name;
	interests = JSON.parse(interests);
	var interestArr = [];
	for (var i = 0; i < interests.length; i++) {
		var obj = {};
		obj.S = interests[i];
		interestArr.push(obj);
	}
	var username = req.session.uname;
	if (interests.length < 2) {
		var info = [];
		res.send(info);
	} else {
		var user = username 
		var pageOwner = username
		var time = Date.now().toString()
		var id = time.toString() + user
		var interestsString = "" 
		for (var i = 0; i < interests.length; i++) {
			if (i !== 0) {
				interestsString = interestsString + ", " + interests[i].toLowerCase()
			} else {
				interestsString = interests[i].toLowerCase()
			}
		}
 		var post = first_name + " is now interested in " + interestsString
		addPost(user, pageOwner, post, time, id)
		db.updateInterests(username, interests, function(err, data) {
			if (err) {
				console.log(err);
			} else {
				var info = [1];
				res.send(info);
			}
		});
	}
}

var getInterests = function(req, res) {
	var username = req.session.uname;
	db.lookup(username, function(err, data) {
		if (err) {
			console.log(err);
		} else {
			var info = [];
			var list = data[0].interests.L;
			for (var i = 0; i < list.length; i++) {
				info.push(list[i].S);
			}
			res.send(info);
		}
	});
}

var changeEmail = function(req, res) {
	var username = req.session.uname;
	var newEmail = req.body.email;
	if (newEmail == null | newEmail.length == 0) {
		var info = [];
		res.send(info);
	} else {
		db.updateEmail(username, newEmail, function(err, data) {
			if (err) {
				console.log(err);
			} else {
				req.session.email = newEmail;
				var info = [newEmail];
				res.send(info);
			}
		});
	}
}

var changePw = function(req, res) {
	var username = req.session.uname;
	var newPw = req.body.pw;
	console.log(newPw);
	if (newPw == null || newPw.length == 0) {
		var info = [];
		res.send(info);
	} else {
		db.updatePw(username, newPw, function(err, data) {
			if (err) {
				console.log(err);
			} else {
				var info = [newPw];
				res.send(info);
			}
		});
	}
}

var logout = function(req, res) {
	req.session.loginerror = null;
	req.session.signuperror = null;
	var username = req.session.uname;
	db.updateStatus(username, false, function(err, data2) {
		if (err) {
			console.log(err);
		} else {
			chatsDB.delete_location(username, function(err, data3) {
				if (err) {
					console.log(err);
				} else {
					req.session.uname = null;
					res.redirect('/');
				}
			})
		}
	});
}

var userProfile = function(req, res) {
	var user = req.body.user
	db.lookup(user, function(err, data) {
		if (err) {
			console.log(err);
		} else {
			res.send(data);
		}
	})
}

var getLogin = function(req, res) {
	res.render('signup.ejs', {login: req.session.loginerror});
}

var searchAccount = function(req, res) {
	var term = req.body.searchTerm 
	var user = req.session.uname
	if (user) {
		searchDB.search_term(term, function(err, data) {
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

var error = function(req, res) {
	res.render("error.ejs")
}

var checkLetterNum = function(str) {
	return (/^[A-Za-z0-9]*$/.test(str))
}
var checkLetters = function(str) {
	return /^[A-Za-z ]*$/.test(str)
}
var checkEmail = function(str) {
	return /(.+)@(.+){2,}\.(.+){2,}/.test(str);
}
var date = function(str) {
    return /^(0?[1-9]|1[012])[\/\-](0?[1-9]|[12][0-9]|3[01])[\/\-]\d{4}$/.test(str)
}

function addPost(user, pageOwner, post, time, id) {
	wallsDB.create_post(id, time, post, user, pageOwner, function(err, data) {
		if (err) {
			console.log(err)
		} else {
			if (user !== pageOwner) {
				wallsDB.add_post_to_user(user, id, time, function(err, data) {
					if (err) {
						console.log(err)
					} else {
						wallsDB.add_post_to_user(pageOwner, id, time, function(err, data) {
							if (err) {
								console.log(err)
							} 
						})
					}
				})	
			} else {
				wallsDB.add_post_to_user(user, id, time, function(err, data) {
					if (err) {
						console.log(err)
					} 
				})
			}
		}
	})
}

var routes = { 
    get_home: getHome,
    sign_up: getSignup,
    create_account: createAccount,
    get_profile: getProfile,
    get_cats: getCats,
    check_login: checkLogin,
    change_affil: changeAffil,
    change_interests: changeInterests,
    get_interests: getInterests,
    change_email: changeEmail,
    change_pw: changePw,
    logout: logout,
    user_profile: userProfile,
    get_login: getLogin,
    error: error,
	search_account: searchAccount,
};
  
module.exports = routes;