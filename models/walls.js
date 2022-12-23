var AWS = require('aws-sdk');
const { json } = require('express');
AWS.config.update({region:'us-east-1'});
var db = new AWS.DynamoDB();  

// gets information needed for walls
async function get_wall_info(user, callback) {
    var postIds = await get_posts(user)
    var entries = await batch_get_posts(postIds)
    callback(entries)
}

// gets postIDs from table 'walls' 
function get_posts(user) {
    return new Promise(resolve => {
        var params = {
            KeyConditions: {
              username: {
                ComparisonOperator: 'EQ',
                AttributeValueList: [ { S: user } ]
              }
            },
            TableName: "walls",
            AttributesToGet: [ 'posts' ]
        };
      
        db.query(params, function(err, data) {
          if (err || data.Items.length == 0) {
            if (err) {
                console.log(err)
            }
            resolve({})
          } else {
            var posts = data.Items[0].posts.L
            var postIds = {}
            posts.forEach((post) => {
                if (post.L[0].S !== undefined && post.L[1].N !== undefined) {
                    postIds[post.L[0].S] = post.L[1].N
                }
            })
            resolve(postIds)
          }
        });
    })
}

// gets post information from each of the post IDs  
async function batch_get_posts(posts) {
    keys = []
    for (const [key, value] of Object.entries(posts)) {
        obj = {} 
        obj2 = {}
        obj2.S = key 
        obj.id = obj2
        obj3 = {}
        obj3.N = value.toString()
        obj.time = obj3
        keys.push(obj)
    }
    if (keys.length > 0) {
        var entries = []
        await batch_get_posts_helper(keys, entries)
        return entries
    } else {
        return []
    }
}

// gets post information from a list of keys 
function batch_get_posts_helper(keys, entries) {
    return new Promise(resolve => {
        var params = {
          RequestItems: {
            'posts': {
              Keys: keys,
              ProjectionExpression: 'id, comments, post, poster, page_owner, #c', 
              ExpressionAttributeNames: {'#c' : 'time'}, 
            }
          }
        };  
      
        db.batchGetItem(params, function(err, data) {
          if (err) {
            console.log("Error", err);
          } else {
            var responses = data.Responses.posts.sort((a,b) => parseInt(b.time.N) - parseInt(a.time.N));
            responses.forEach((post) => {
              var poster = post.poster.S
              var time = post.time.N 
              var origPost = post.post.S
              var page_owner = post.page_owner.S
              var comments = []
              var id = post.id.S
              if (post.comments) {
                post.comments.L.forEach((comment) => {
                  comments.push([comment.L[0].S, comment.L[1].S])
                })
              }
              var newEntry = {}
              newEntry.id = id
              newEntry.poster = poster 
              newEntry.time = time 
              newEntry.origPost = origPost
              newEntry.comments = comments 
              newEntry.page_owner = page_owner
              entries.push(newEntry)
            })
            if (data.UnprocessedKeys.Keys && data.UnprocessedKeys.Keys.length > 0) {
              return(resolve(batch_get_posts(data.UnprocessedKeys)))
            } else {
              resolve("resolved")
            }
          }
        });
      })
}

// adds to the comment attribute of the posts table
async function comment(user, comment, id, time, callback) {
  var params = {
    KeyConditions: {
      id: {
        ComparisonOperator: 'EQ',
        AttributeValueList: [ { S: id } ]
      }
    },
    TableName: "posts",
    AttributesToGet: [ 'comments' ]
  };
  db.query(params, function(err, data) {
    if (err) {
      console.log("error")
    } else {
      var prev = []
      if (data.Items[0].comments) {
        prev = data.Items[0].comments.L
      }
      var commentObj = {}
      commentObj.S = comment 
      var posterObj = {}
      posterObj.S = user 
      var list = [posterObj, commentObj]
      var bigObj = {}
      bigObj.L = list
      prev.push(bigObj)

      var list = {}
      list.L = prev 
      var params = {
        TableName: 'posts',
        Key: { 
          'id' : { S: id }, 
          'time' : { N: time}
        },
        UpdateExpression: 'set #comments = :comments',
        ExpressionAttributeNames: {
          '#comments' : 'comments'},
        ExpressionAttributeValues: {
          ':comments' : list
        },
        ReturnValues: 'NONE'
      };
      db.updateItem(params, function(err, data){
        if (err) {
          callback(err)
        } else {
          callback(err, "success")
        }
      });
    }
  });
}

// adds a post to the posts table 
function create_post(id, time, post, poster, page_owner, callback) {
  var params = {
    Item: {
      "id": {
        S: id
      },
      "time": { 
        N: time
      }, 
      "post": {
        S: post
      }, 
      "page_owner": {
        S: page_owner
      },
      "poster": {
        S: poster
      }
    },
    TableName: "posts",
    ReturnValues:'NONE'
  };
  db.putItem(params, function(err, data){
      if (err) {
          callback(err)
      } else {
          callback(err, data)
      }
  });
}

// adds the post to each user's table 
function add_post_users(user, id, time, callback) {
  var params = {
    KeyConditions: {
      username: {
        ComparisonOperator: 'EQ',
        AttributeValueList: [ { S: user } ]
      }
    },
    TableName: "walls",
    AttributesToGet: [ 'posts' ]
  };
  db.query(params, function(err, data) {
    if (err) {
      console.log(err)
    } else {
      var prev = []
      if (data.Items.length !== 0) {
        prev = data.Items[0].posts.L
      }
      var postObj = {}
      postObj.S = id 
      var timeObj = {}
      timeObj.N = time 
      var list = [postObj, timeObj]
      var bigObj = {}
      bigObj.L = list
      prev.push(bigObj)
      var params = {
        Item: {
          "username": {
            S: user
          },
          "posts": { 
            L: prev
          }, 
        },
        TableName: "walls",
        ReturnValues: 'NONE'
      };
      db.putItem(params, function(err, data2){
          if (err) {
              callback(err)
          } else {
              callback(err, data2)
          }
      });
    }
  });
}

var database = {
    get_posts: get_wall_info, 
    write_comment: comment,
    create_post: create_post, 
    add_post_to_user: add_post_users
}

module.exports = { database, batch_get_posts }