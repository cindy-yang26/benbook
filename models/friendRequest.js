var AWS = require('aws-sdk');
const { json, request } = require('express');
const { batch_get_names_affiliation_status } = require('./visualizer');
AWS.config.update({region:'us-east-1'});
var db = new AWS.DynamoDB();  
var get_orig_friends = require("./visualizer").get_orig_friends
var get_friend_name = require("./visualizer").batch_get_names_affiliation_status

// checks if user and friend are friends by checking if user is in the friends list of friend 
async function check_friends(user, friend, callback) {
    var friends = await get_orig_friends(friend)
    if (friends !== null && friends.includes(user)) {
        callback(true)
    } else {
        callback(false)
    }
}

async function get_friends_list(user, callback) {
    var friends = await get_orig_friends(user)
    callback(friends)
}

// adds friend to user's table
async function add_friend(user, friend, callback) {
    var friends = await get_orig_friends(user)
    var list = []
    if (friends) {
        friends.forEach(element => {
            obj = {} 
            obj.S = element
            list.push(obj)
        })
    }
    obj = {}
    obj.S = friend 
    list.push(obj)
    var params = {
        Item: {
          "username": {
            S: user
          },
          "friends": { 
            L: list
          }, 
        },
        TableName: "friends",
        ReturnValues: 'NONE'
    };
    db.putItem(params, function(err, data){
        if (err) {
            callback(err, null)
        } else {
            callback(null, null)
        }
    });
}

// queries requests table to get user's list of friend requests
function get_friend_requests(user) {
    return new Promise((resolve, reject) => {
        var params = {
            KeyConditions: {
              username: {
                ComparisonOperator: 'EQ',
                AttributeValueList: [ { S: user } ]
              }
            },
            TableName: "requests",
            AttributesToGet: [ 'friend_requests' ]
        };
      
        db.query(params, function(err, data) {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
    })
}

// deletes the friend from the user's table by checking if they are currently friends, removing the index, and adding back 
// to the table
async function delete_friend(user, friend, callback) {
    try {
        var data = await get_friend_requests(user)
        if (data.Items.length === 0 || data.Items[0].friend_requests === undefined) {
            callback("error")
        } else {
            for (var i = 0; i < data.Items[0].friend_requests.L.length; i++) {
                element = data.Items[0].friend_requests.L[i]
                if (element.S === friend) {
                    data.Items[0].friend_requests.L.splice(i, 1)
                }
            }
            var params = {
                Item: {
                  "username": {
                    S: user
                  },
                  "friend_requests": { 
                    L: data.Items[0].friend_requests.L
                  }, 
                },
                TableName: "requests",
                ReturnValues: 'NONE'
            };
            db.putItem(params, function(err, data){
                if (err) {
                    callback(err, null)
                } else {
                    callback(null, null)
                }
            });
        }
    } catch (err) {
        callback(err)
    }
}

// formats all the information about the users into a matrix
async function get_friend_reqs_formatted(user, callback) {
    try {        
        var data = await get_friend_requests(user)
        var requests = []
        if (data.Items.length === 0 || data.Items[0].friend_requests === undefined) {
            callback(null, requests)
        } else {
            var realNames = {}
            var res = {}
            data.Items[0].friend_requests.L.forEach((element) => {
                requests.push(element.S)
            })
            if (requests.length > 0) {
                var aff_and_status = await batch_get_names_affiliation_status(requests, realNames, false); 
                var aff = aff_and_status[0]; 
                var status = aff_and_status[1];
                for (const [key, value] of Object.entries(realNames)) {
                    if (aff[key] !== undefined && status[key] !== undefined) {
                        res[key] = [value, aff[key], status[key]]
                    }
                }
            }
            callback(null, res)
        }
    } catch (err) {
        callback(err)
    }
}

// adds friend request of friend onto user's list
async function add_request(user, friend, callback) {
    try {
        var requests = []
        var data = await get_friend_requests(friend)
        if (data.Items[0] !== undefined && data.Items[0].friend_requests !== undefined) {
            requests = data.Items[0].friend_requests.L
        }
        var obj = {} 
        obj.S = user
        requests.push(obj)
        var params = {
            Item: {
              "username": {
                S: friend
              },
              "friend_requests": { 
                L: requests
              }, 
            },
            TableName: "requests",
            ReturnValues: 'NONE'
        };
        db.putItem(params, function(err, data){
            if (err) {
                callback(err, null)
            } else {
                callback(null, null)
            }
        });
    } catch (error) {
        callback(error, null)
    }
}

// checks friendship status of user on friend's list
async function check_status(user, friend, callback) {
    try {
        var data = await get_friend_requests(friend)
        if (data.Items.length === 0 || data.Items[0].friend_requests === undefined) {
            callback(null, false)
        } else {
            var requests = []
            data.Items[0].friend_requests.L.forEach((element) => {
                requests.push(element.S)
            })
            if (requests.includes(user)) {
                callback(null, true)
            } else {
                callback(null, false)
            }
        }
    } catch (error) {
        callback(error, null)
    }
}

// gets the name of the friend
async function get_name(user, callback) {
    var name = {}
    await get_friend_name([user], name, false)
    callback(name[user])
}

var database = { 
    check_friends: check_friends, 
    get_name: get_name, 
    check_status: check_status, 
    add_request, add_request, 
    formatted_reqs: get_friend_reqs_formatted, 
    reject_friend: delete_friend, 
    add_friend: add_friend, 
    get_friends_list, get_friends_list, 
}

module.exports = database