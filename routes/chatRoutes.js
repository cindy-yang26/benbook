var chatsDB = require('../models/chats-database.js')
var friendsDB = require('../models/friends')
var friendReqDB = require('../models/friendRequest')
var regDB = require('../models/reg-database')

var renderChat = function(req, res) {
	var m = null;
	var user = req.session.uname
	if (req.session.invalidUser) m = req.session.invalidUser;
	friendsDB.get_friends(user, function(data) {
		friendReqDB.get_name(user, function(realName) {
			data[user] = [realName]
			res.render('chats.ejs', {uname: req.session.uname, message: m, chatmembers: [], friends: data});
		})
	})
}

var getSession = function(req, res) {
	return res.send(req.session);
}

var getInvites = async function(req, res) {
	try {
		var data = await chatsDB.getInvites(req.session.uname); 
		if (!data || data.Items[0].invites == null || data.Items[0].invites.L == null ||data.Items[0].invites.L.length <1 ) {
				return res.send({success: false, message: "internal error"});
		} else { // (data != null)
			res.send({hasInvites: true});
		} 
	} catch (err) {
		console.log("internal err");
	}
}

var loadInvites = async function(req, res) {
	try {
		var data = await chatsDB.getInvites(req.session.uname); 
		if (!data || data.Items[0].invites == null || data.Items[0].invites.L == null) {
				return res.send({success: false, message: "internal error"});
		} else { // (data != null)
			res.send({success : true, list :  data.Items[0].invites.L});
		} 
	} catch (err) {
		console.log("internal err here");
	}
}

var sendInvites = function(req, res) {
	var id = req.body.id;
	var user = req.body.user;
	chatsDB.send_invite(user, id, function(err, data) {
		if (err) {
			res.send({success: false, message: "internal error"});
		} else {
			res.send({success: true});
		}
	});
}

var checkOnline = function(req, res) {
	const username = req.body.user;
	if (username == req.session.uname) {
		return res.send({success: false, message: "unfortunately you cannot add yourself bc we want you to talk to real people:)"})
	}
	console.log(username);
	if (username == "") return res.send({success: false, message: "please provide a valid username"});
	chatsDB.online(username, function(err, status){
		if (err) {
			return res.send({success: false, message: "internal error"});
		} else if (status != null) {
			if (status == true) {
				console.log("user is online");
				return res.send({success: true});
			} else {
				console.log("user is not online");
				return res.send({success: false, message: username + " is not online"});

			}
		} else { 
			console.log("user not exist");
			return res.send({success: false, message: username + " does not exist"});

		}
	});
}

var getRoom = function(req, res) {
	var id = req.body.id;
	chatsDB.room(id, function(err, data){
		if (err) {
			return res.send({success: false, message: "internal error"});
		} else if (data && data.texts && data.members) { 
			//render all the past texts
			return res.send({success: true, texts: data.texts, members: data.members});
		} else { // need to create a new chat
			return res.send({success: true, newChat: true});
		}
	});
}

var addText = function(req, res) {
	var text = req.body.text;
	var user = req.body.user;
	var id = req.body.id;
	chatsDB.add_text(user, text, id, function(err, data){
		if (err || !data.success) {
			console.log("failed to send");
			return res.send({success: false});
		} else  { 
			return res.send({success: true});
		} 
	});
}

var updateLoc = function(req, res) {
	chatsDB.update_location(req.body.user, req.body.value, function(err, data){
		if (err) {
			console.log("there was an err");
			return res.send({success: false, message: "internal error"});
		} else  { 
			return res.send({success: true});
		} 
	});
}

var removeInvite = function(req, res) {
	chatsDB.remove_invite(req.body.me, req.body.id, function(err, data) {});
}

var createRoom = function(req, res) {
	var id = req.body.id;
	chatsDB.create_room(id, function(err, data){
		if (err) {
			return res.send({success: false, message: "internal error"});
		} else {
			return res.send({success: true});
		}
	});
}

var addMembers = function(req, res) {
	var user = req.body.user;
	var id = req.body.id;
	chatsDB.add_members( id, user, function(err, data){
		if (err || !data.success) {
			console.log("failed to send");
			return res.send({success: false});
		} else  { 
			return res.send({success: true});
		} 
	});
}

var removeMembers = function(req, res) {
	var user = req.body.user;
	var id = req.body.id;
	chatsDB.remove_member(user, id, function(err, data){
		if (err || !data.success) {
			console.log("failed to send");
			return res.send({success: false});
		} else  { 
			return res.send({success: true});
		} 
	});
}

var get_name = function(req, res) {
	var user = req.body.user;
	regDB.lookup(user, function(err, data){
		if (err) {
			console.log("failed to send");
			return res.send({success: false});
		} else  { 
			console.log(data[0].first_name.S);
			console.log(data[0].last_name.S);
			var first = data[0].first_name.S;
			var last = data[0].last_name.S;
			return res.send({success: true, name: first + " " + last});
		} 
	});
}


var get_members = function(req, res) {
    var id = req.body.id;
    chatsDB.get_gc(id, function(err, data){
        if (err) {
            console.log("failed to send here");
            return res.send({success: false});
        } else if (!data) { 
            return res.send({success: false});
        } else {
			console.log(data.members.L);
            return res.send({success: true, members: data.members.L});
        }
    });
}

var get_session = function(req, res) {
    var user = req.body.user;
    chatsDB.get_session(req.session.uname, function(err, data){
        if (err) {
            console.log("failed to send here");
            return res.send({success: false});
        } else if (!data) { 
            return res.send(null);
        } else {
			console.log(data.roomObj);
            return res.send({success: true, roomobj: data.roomobj.S});
        }
    });
}

var add_session = function(req, res) {
	var user = req.body.user;
	var obj = req.body.obj;
    chatsDB.add_session(user, obj, function(err, data){
        if (err) {
            console.log("failed to send here");
            return res.send({success: false});
        } else if (!data) { 
            return res.send({success: false});
        } else {
            return res.send({success: true});
        }
    });
}

var routes = { 
    render_chat: renderChat, 
    session: getSession,
    get_invites: getInvites,
    load_invites: loadInvites,
    send_invites: sendInvites,
    check_online: checkOnline,
    room: getRoom,
	create_room: createRoom, 
    add_text: addText,
    update_location: updateLoc, 
    remove_invite: removeInvite,
	add_members: addMembers,
	remove_members: removeMembers,
	get_name : get_name,
	get_members : get_members,
	get_session : get_session,
	add_session: add_session
}
  
module.exports = routes;