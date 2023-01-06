## benbook

<p float="left">
 <img src="https://user-images.githubusercontent.com/59887357/210921614-3c154186-f093-4ec7-b892-564bd57a2b88.png" width="500" alt="homepage">
 <img src="https://user-images.githubusercontent.com/59887357/210922106-a4ee9102-e09b-42e2-8355-844426dca83f.png" width="500" alt="wall">
 <img src="https://user-images.githubusercontent.com/59887357/210922038-02c0a622-272c-405c-a2bd-f2b4d0cc011a.png" width="500" alt="chat">
 <img src="https://user-images.githubusercontent.com/59887357/210922288-219dda3b-62b9-48d3-aa90-7599afed6ec0.png" width="500" alt="news">
</p>

Names: 
* Cindy Yang
* Kaily Liu
* Jack Hourigan
* Anna Zhou

Features: 
* Start page - registration and log-in
* Hashed passwords
* Profile page (name, email, affiliation, birthday, interests) that can be edited 
* Status updates
* Wall posts and commenting
* New friend requests
* Online friends list
* Dynamic refreshing
* Dynamic search
* Friend visualizer
* Adsorption-based news recommendations
* Chats messaging

Source Files: 
* Models 
  * article.js
  * chats.js
  * editprofile.js
  * error.js
  * friendvisualizer.js
  * header.js
  * homepage.js
  * news.js
  * request.js
  * signup.js
  * wall.js
* Public 
  * CSS 
    * article.css 
    * base.css
    * chats.css
    * editprofile.css
    * error.css
    * header.css
    * homepage.css
    * news.css
    * request.css, signup.css, wall.css
  * JS 
    * friendvisualizer.js
    * jit.js
* Routes 
  * chatRoutes.js
  * friendRoutes.js
  * newsRoutes.js
  * postRoutes.js
  * userRoutes.js
* Views 
  * article.pug
  * chats.ejs
  * editprofile.ejs
  * error.ejs
  * friendvisualizer.ejs
  * header.ejs
  * homepage.ejs
  * news.pug
  * request.ejs
  * signup.ejs
  * wall.ejs
* App.js
* readme.txt

Extra Credit:
* Error pages: When a user attempts to load a random path, query, or parameter in the url, they are redirected to a “page not found” page.  
* Friend requests: Friend connections are created with “LinkedIn-style” friend requests (i.e. being able to accept or deny friend requests).
* Private pages: If users are not friends with each other, attempting to view each other’s walls will show a locked “you are not friends” page. 
* HTTPS: We used LetsEncrypt to generate a TLS certificate and installed it on our app.

Declaration: 
* All the code in this repo was written by ourselves besides some code for setting up socket.io that was borrowed from the NETS2120 lab sessions

Running the project:
* Add aws credentials, install any necessary packages with npm init/npm start, and then run node app.js, use cron job to run news analytics
