var AWS = require('aws-sdk');
const { json } = require('express');
AWS.config.update({region:'us-east-1'});
var db = new AWS.DynamoDB();  
var get_orig_friends = require("./visualizer").get_orig_friends
var batch_get_names_affiliation_status = require("./visualizer").batch_get_names_affiliation_status

// gets users friends and information (affiliation, status, full name)
async function get_friends_and_stuff(user, callback) {
    var realNames = {}
    var friends = await get_orig_friends(user)
    if (friends) {
        var aff_and_status = await batch_get_names_affiliation_status(friends, realNames, false);
        var res = {}
        if (aff_and_status) {
            var aff = aff_and_status[0]; 
            var status = aff_and_status[1];
            for (const [key, value] of Object.entries(realNames)) {
                if (aff[key] !== undefined && status[key] !== undefined) {
                    res[key] = [value, aff[key], status[key]]
                }
            }
        }
        callback(res);
    } else {
        callback({});
    }
}

// removes friend
async function remove(user, friend, callback) {
    var friends = await get_orig_friends(user)
    var prevLength = friends.length; 
    const index = friends.indexOf(friend);
    if (index > -1) {
        friends.splice(index, 1); 
    }
    var formattedList = []
    friends.forEach((elem) => {
        var obj = {}
        obj.S = elem
        formattedList.push(obj)
    })
    var params = {
        Item: {
          "username": {
            S: user
          },
          "friends": { 
            L: formattedList
          }, 
        },
        TableName: "friends",
        ReturnValues: 'NONE'
    };
    db.putItem(params, function(err, data){
        if (err) {
            callback(err)
        } else {
            if (prevLength > 1) {
                get_friends_and_stuff(user, function(table) {
                    callback(null, table)
                })
            } else {
                callback(null, [])
            }
            
        }
    });
}

var database = { 
    get_friends: get_friends_and_stuff, 
    remove_friend: remove,
}

module.exports = database