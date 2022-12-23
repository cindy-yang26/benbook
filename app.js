const express = require('express')
var bodyParser = require('body-parser')
var morgan = require('morgan')
var cookieParser = require('cookie-parser')
var session = require('express-session')
var path = require('path')
const app = express()

/* Add support for HTTPS */
var https = require('node:https')
var fs = require('node:fs')

/* Run the server */
console.log('Running on port 443');

const credentials = {
	key: fs.readFileSync('./tls/tls.key'),
	cert: fs.readFileSync('./tls/tls.crt')
};

const server = https.createServer(credentials, app);
var io = require('socket.io')(server);

server.listen(443);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(morgan('combined'));
app.use(cookieParser());
app.use(session({secret: "secretSession"}));

app.use(express.static(path.join(__dirname, 'public')));

var newsRoutes = require('./routes/newsRoutes')
var userRoutes = require('./routes/userRoutes')
var friendRoutes = require('./routes/friendRoutes')
var postRoutes = require('./routes/postRoutes')
var chatRoutes = require('./routes/chatRoutes')

app.get('/', userRoutes.sign_up);
app.post('/createaccount', userRoutes.create_account);
app.get('/editprofile', userRoutes.get_profile);
app.get('/getCats', userRoutes.get_cats);
app.get('/homepage', userRoutes.get_home);
app.post('/checklogin', userRoutes.check_login);
app.post('/changeaffil', userRoutes.change_affil);
app.post('/changeinterests', userRoutes.change_interests);
app.get('/currInterests', userRoutes.get_interests);
app.post('/changeemail', userRoutes.change_email);
app.post('/changepw', userRoutes.change_pw);
app.post('/userprofile', userRoutes.user_profile);
app.get('/logout', userRoutes.logout);
app.get('/error', userRoutes.error);
app.post('/searchterm', userRoutes.search_account);

app.get('/news', newsRoutes.news);
app.post('/toggleLike', newsRoutes.toggle_like);

app.get('/friends', friendRoutes.show_friends);
app.post('/getfriendslist', friendRoutes.friend_list);
app.post('/deleteFriend', friendRoutes.delete_friend);
app.post('/rejectFriend', friendRoutes.reject_friend);
app.post('/acceptFriend', friendRoutes.accept_friend);
app.post('/sendreq', friendRoutes.send_request);
app.get('/myfriendreqs', friendRoutes.current_requests);
app.post('/getreqslist', friendRoutes.request_list);
app.get('/friendreq', friendRoutes.friend_request);
app.post('/checkfriendreqstatus', friendRoutes.request_status);
app.post('/checkfriend', friendRoutes.check_friends);
app.get('/friendvisualization', friendRoutes.visualizer);
app.get('/visualization', friendRoutes.user_visualizer);
app.get('/getFriends/:user', friendRoutes.expand_friend);

app.get('/wall', postRoutes.show_wall);
app.post('/renderWalls', postRoutes.render_wall);
app.post('/renderHome', postRoutes.render_home);
app.post('/addComment', postRoutes.add_comments);
app.post('/addPost', postRoutes.add_post);

//socket connection
io.sockets.on("connection", function (socket) {
    console.log('user connected');
    socket.on("chat message", obj => {
		if (obj.notif && obj.notif == true) { //this check is to see if this is notif or a text
			io.to(obj.room).emit("chat message", {room: obj.room, text : obj.text, sender: ""});
		} else {
        	io.to(obj.room).emit("chat message", obj);
		}
    });
    socket.on("join room", obj => {
		console.log("joined room " + obj.room);
        socket.join(obj.room);
    });
    socket.on("leave room", obj => {
		console.log("left room " + obj.room);
        socket.leave(obj.room);
    });
});

app.get('/chats', chatRoutes.render_chat);
app.get('/session', chatRoutes.session);
app.get('/invites', chatRoutes.get_invites);
app.get('/loadinvites', chatRoutes.load_invites);
app.post('/sendinvite', chatRoutes.send_invites);
app.post('/online', chatRoutes.check_online);
app.post('/room', chatRoutes.room);
app.post('/createroom', chatRoutes.create_room);
app.post('/addtext', chatRoutes.add_text);
app.post('/addmembers', chatRoutes.add_members);
app.post('/removemember', chatRoutes.remove_members);
app.post('/getname', chatRoutes.get_name);
app.post('/getmembers', chatRoutes.get_members);
app.post('/updatelocation', chatRoutes.update_location);
app.post('/removeinvite', chatRoutes.remove_invite);
app.post('/getsession', chatRoutes.get_session);
app.post('/addsession', chatRoutes.add_session);

app.all('*', (req, res) => {
    res.redirect('/error')
})
	
