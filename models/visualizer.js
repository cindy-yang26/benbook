var AWS = require('aws-sdk');
const { json } = require('express');
AWS.config.update({region:'us-east-1'});
var db = new AWS.DynamoDB();  

var nodes = []; 
var mainUser = null; 
var mainUserAffiliation = null; 
var adjList = {}; 
var realNames = {}; 

// rerenders the graph when page is reloaded
function refresh() {
  nodes = []; 
  mainUser = null; 
  mainUserAffiliation = null; 
  adjList = {}; 
  realNames = {}; 
}

// organizes information and uses it to create the graph 
async function myDB_lookup(searchTerm) {
  mainUser = searchTerm; 
  nodes.push(mainUser)
  var friends = await get_orig_friends(mainUser)
  var tuple = await batch_get_names_affiliation_status([mainUser], realNames, false)
  if (tuple) {
    var aff = (await batch_get_names_affiliation_status([mainUser], realNames, false))[0]; 
    mainUserAffiliation = aff[mainUser]; 
  }
  if (friends !== null) {
    nodes = nodes.concat(friends)
    await batch_get_friends(nodes, false)
    await batch_get_names_affiliation_status(nodes, realNames, false)
  }
  adjList[mainUser] = nodes;
  var json_string = JSON.stringify(write_json())
  return JSON.parse(json_string)
}

// gets information about each user 
async function batch_get_names_affiliation_status(users, realNames, checkAff) {
  var affiliations = {}
  var statuses = {}
  keys = []
  users.forEach((user) => {
    obj = {}
    obj2 = {}
    obj2.S = user
    obj.username = obj2
    keys.push(obj)
  })
  if (keys.length > 0) {
    await get_names_helper(keys, checkAff, statuses, affiliations, realNames)
    return ([affiliations, statuses])
  } 
}

// queries db 
function get_names_helper(keys, checkAff, statuses, affiliations, realNames) {
  return new Promise(resolve => {
    var params = {
      RequestItems: {
        'users': {
          Keys: keys,
          ProjectionExpression: 'username, first_name, last_name, affiliation, #c', 
          ExpressionAttributeNames: {'#c' : 'status'}
        }
      }
    };  
  
    db.batchGetItem(params, function(err, data) {
      if (err) {
        console.log("Error", err);
      } else {
        data.Responses.users.forEach(function(element) {
          if ((checkAff && (element.affiliation.S === mainUserAffiliation)) || !checkAff) {
            affiliations[element.username.S] = element.affiliation.S
            statuses[element.username.S] = element.status.BOOL === undefined ? false : element.status.BOOL
            realNames[element.username.S] = element.first_name.S + " " + element.last_name.S
          }
        });
        if (data.UnprocessedKeys.Keys && data.UnprocessedKeys.Keys.length > 0) {
          return(resolve(get_names_helper(data.UnprocessedKeys, checkAff, statuses, affiliations, realNames)))
        } else {
          resolve("resolved")
        }
      }
    });
  })
}

// gets the current user's friends' usernames 
async function batch_get_friends(users, newFriends) {
  keys = []
  users.forEach((user) => {
    obj = {}
    obj2 = {}
    obj2.S = user
    obj.username = obj2
    keys.push(obj)
  })
  if (keys.length > 0) {
    await get_friends_helper(keys, newFriends)
  }
}

// queries the friends table for the usernames of each users friends
function get_friends_helper(keys, newFriends) {
  return new Promise(resolve => {
    var params = {
      RequestItems: {
        'friends': {
          Keys: keys,
          ProjectionExpression: 'username, friends'
        }
      }
    };  
  
    db.batchGetItem(params, function(err, data) {
      if (err) {
        console.log("Error", err);
      } else {
        data.Responses.friends.forEach(function(element) {
          var username = element.username.S
          var friendsList = []
          element.friends.L.forEach((elem) => {
            if (nodes.includes(elem.S)) {
              friendsList.push(elem.S)
            }
          })
          adjList[username] = friendsList
          if (newFriends) {
            friendsList.forEach((friend) => {
              if (adjList[friend] !== undefined && !(adjList[friend].includes(username))) {
                adjList[friend] = adjList[friend].concat([username])
              }
            })
          }
        });
      }
      if (data.UnprocessedKeys.Keys && data.UnprocessedKeys.Keys.length > 0) {
        return(resolve(get_friends_helper(data.UnprocessedKeys, newFriends)))
      } else {
        resolve("resolved")
      }
    });
  })
}

// organizes and creates graph for when a friend is clicked on 
async function myDB_lookup_friend(searchTerm) {
  var origFriends = await get_orig_friends(searchTerm)
  if (origFriends !== null) {
    newFriends = origFriends.filter(value => !nodes.includes(value) && value !== mainUser)
    var tuple = await batch_get_names_affiliation_status(newFriends, realNames, true)
    if (tuple) {
      var affiliationDict = tuple[0]
      nodes = nodes.concat(Object.keys(affiliationDict))
      await batch_get_friends(Object.keys(affiliationDict), true)
    }
  }
  var json_string = JSON.stringify(write_json())
  return JSON.parse(json_string)
}

// creates the JSON file used by the visualizer code
function write_json() {
  var visited = {} 
  for (var key in adjList) {
    for (var item in adjList[key]) {
      visited[[key, item]] = false
    }
  }
  return dfs(mainUser, null, visited)
}

// uses an edge-based and recursive dfs to traverse over all the edges and adds them to a JSON object 
function dfs(curr, prev, visited) {
  if (prev !== null) {
    visited[[prev, curr]] = true
    visited[[curr, prev]] = true
  }
  var obj = {} 
  obj.id = curr
  obj.name = realNames[curr]
  obj.children = []
  for (let x = 0; x < adjList[curr].length; x++) {
    var edge = [curr, adjList[curr][x]]
    if (!visited[edge]) {
      obj.children.push(dfs(adjList[curr][x], curr, visited))
    }
  }
  return obj
}

// queries the friends of a single user 
function get_orig_friends(user) {
  return new Promise(resolve => {
    get_friends(user, function(err, data) {
      if (err) {
        console.log(err);
      } else {
        resolve(data)
      }
    })
  })
}

// gets friends associated with one person
function get_friends(searchTerm, callback) {
  var params = {
      KeyConditions: {
        username: {
          ComparisonOperator: 'EQ',
          AttributeValueList: [ { S: searchTerm } ]
        }
      },
      TableName: "friends",
      AttributesToGet: [ 'friends' ]
  };

  db.query(params, function(err, data) {
    if (err || data.Items.length == 0) {
      callback(err, null);
    } else {
      var directFriends = []
      if (data.Items[0] && data.Items[0].friends) {
        data.Items[0].friends.L.forEach((element) => {
          directFriends.push(element.S)
        })
      }
      callback(err, directFriends);
    }
  });
}

var database = { 
  lookup_main: myDB_lookup, 
  lookup_friend: myDB_lookup_friend,
  refresh: refresh, 
};

module.exports = { database, get_orig_friends, batch_get_names_affiliation_status }                                      