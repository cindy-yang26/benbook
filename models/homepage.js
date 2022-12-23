var AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
var db = new AWS.DynamoDB();  
var get_orig_friends = require("./visualizer").get_orig_friends
var get_posts = require("./walls").batch_get_posts

// gets all the posts associated with a user and their friends
async function homepage_posts(user, callback) {
    var friends = await get_orig_friends(user)
    if (friends === null) {
      friends = []
    }
    friends.push(user)
    keys = []
    friends.forEach((user) => {
        obj = {}
        obj2 = {}
        obj2.S = user
        obj.username = obj2
        keys.push(obj)
    })
    posts = {}
    if (keys.length > 0) {
        await homepage_helper(keys, posts)
        var data = await get_posts(posts)
        callback(data)
    } else {
        callback([])
    }
}

// queries posts table to get posts associated with a list of users
function homepage_helper(keys, posts) {
    return new Promise(resolve => {
      var params = {
        RequestItems: {
          'walls': {
            Keys: keys,
            ProjectionExpression: 'posts'
          }
        }
      };  
    
      db.batchGetItem(params, function(err, data) {
        if (err) {
          console.log("Error", err);
        } else {
            if (data.Responses.walls && data.Responses.walls.length > 0) {
                data.Responses.walls.forEach(function(element) {
                    var postsL = element.posts.L 
                    if (postsL.length > 0) {
                        postsL.forEach(function(post) {
                            var postId = post.L[0].S
                            var time = post.L[1].N
                            posts[postId] = time
                        })
                    }
                  });
                }
                if (data.UnprocessedKeys.Keys && data.UnprocessedKeys.Keys.length > 0) {
                  return(resolve(homepage_helper(data.UnprocessedKeys, posts)))
                } else {
                  resolve("resolved")
                }
            }
        });
    })
  }

var database = { 
    get_posts: homepage_posts
}

module.exports = database