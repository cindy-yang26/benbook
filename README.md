##benbook

Names and SEAS Logins:
Cindy Yang (cindyy)
Kaily Liu (liukaily)
Jack Hourigan (hojack)
Anna Zhou (annazhou)


Features: 
Start page - registration and log-in
Hashed passwords
Profile page (name, email, affiliation, birthday, interests) that can be edited 
Status updates
Wall posts and commenting
New friend requests
Online friends list
Dynamic refreshing
Dynamic search
Friend visualizer
Adsorption-based friend recommendations
Chats messaging
News


Source Files:
Models 
  |__ article.js, chats.js, editprofile.js, error.js, friendvisualizer.js, header.js, homepage.js, news.js, request.js, signup.js, wall.js
Public 
  |__ CSS 
        |__ article.css, base.css, chats.css, editprofile.css, error.css, header.css, homepage.css, news.css, request.css, signup.css, wall.css
       JS 
        |__ friendvisualizer.js, jit.js
Routes 
  |__chatRoutes.js, friendRoutes.js, newsRoutes.js, postRoutes.js, userRoutes.js
Views 
  |__article.pug, chats.ejs, editprofile.ejs, error.ejs, friendvisualizer.ejs, header.ejs, homepage.ejs, news.pug, request.ejs, signup.ejs, wall.ejs
app.js
readme.txt


Extra Credit:
Error pages: When a user attempts to load a random path, query, or parameter in the url, they are redirected to a “page not found” page.  
Friend requests: Friend connections are created with “LinkedIn-style” friend requests (i.e. being able to accept or deny friend requests).
Private pages: If users are not friends with each other, attempting to view each other’s walls will show a locked “you are not friends” page. 
HTTPS: We used LetsEncrypt to generate a TLS certificate and installed it on our app.


Declaration: 
All the code in this repo was written by ourselves besides some code for setting up socket.io that was
borrowed from the NETS2120 lab sessions


Running the project:
add aws credentials, install any necessary packages with npm init/npm start, and then run node app.js, use cron job to run 
data analytics
