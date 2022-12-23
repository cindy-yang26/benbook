var AWS = require('aws-sdk');
const { json } = require('express');
AWS.config.update({region:'us-east-1'});
var db = new AWS.DynamoDB();  

//function to add user to user_invites
async function add_user_to_chats(user, callback) {
    var invites = await get_invites(user);
    if (invites.Items[0] == undefined || invites.Items[0] == null) {
      var params = {
        Item : {
            'username': {
                S: user
            }, 
            'invites': {
              L:[]
            },
        }, TableName : 'user_invites', 
        ReturnValues : 'NONE',
    }
    db.putItem(params, function(err, data){
	    if (err)
	      callback(err, null)
	    else
	      callback(null, {success: true});
	  });	
    }
}

//function to delete the user from user_location (do when they are not longer online)
function remove_user_location(user, callback) {
  var params = {
      "Key" : {
          'username': {
              S: user
          }
      }, TableName : 'user_location',       
  }

  db.deleteItem(params, function(err, data){
    if (err)
      callback(err, null)
    else
      callback(null, {success: true});
  });	
}

//function to get online status of a user
function get_online(searchTerm, callback) {
    var params = {
        KeyConditions: {
          username: {
            ComparisonOperator: 'EQ',
            AttributeValueList: [ { S: searchTerm } ]
          }
        },
        TableName: "users"
    };
  
    db.query(params, function(err, data) {
      if (err) {
        callback(err, null);
      } else if ( data.Items.length == 0) {
        callback(null, null);
      } else {
        var online = data.Items[0].status.BOOL;
        console.log("online: " + online);
        callback(null, online);
      }
    });
}

//function to get the invites of a user
function get_invites(user) {
    return new Promise((resolve, reject) => {
        var params = {
            KeyConditions: {
              username: {
                ComparisonOperator: 'EQ',
                AttributeValueList: [ { S: user } ]
              }
            },
            TableName: "user_invites",
            AttributesToGet: [ 'invites' ]
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

//function to get the location of a user (what room they are in)
function get_location(user) {
  return new Promise((resolve, reject) => {
      var params = {
          KeyConditions: {
            username: {
              ComparisonOperator: 'EQ',
              AttributeValueList: [ { S: user } ]
            }
          },
          TableName: "user_location",
          AttributesToGet: [ 'location' ]
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

//call to send invite to a user
async function send_invite(user, id, callback) {
    try {
        var requests = []
        var data = await get_invites(user);
        console.log("data: " + data);
        console.log(data.Items[0]);
        if (data.Items[0] == undefined) {//this means that this user doesnt exist
            // add them to the table
            add_user_to_chats(user, function(err, data){
                if (err) {
                    console.log(err);
                }
            });
        }
        if (data.Items[0] !== undefined && data.Items[0].invites !== undefined) {
            requests = data.Items[0].invites.L;
            console.log("requests:  " + requests);
            for (obj of requests) {
                console.log(obj);
                if (obj.S == id) {
                    console.log("already in this chat");
                    return callback(null, {success: true, message: "they have already been invited to this chat"}); 
                }
            }
        } 
        var obj = {} 
        obj.S = id;
        requests.push(obj)
        console.log("final requests: " + requests);
        var params = {
            Item: {
              "username": {
                S: user
              },
              "invites": { 
                L: requests
              }, 
            },
            TableName: "user_invites",
            ReturnValues: 'NONE'
        };
        db.putItem(params, function(err, data){
            if (err) {
                callback(err, null)
            } else {
                callback(null, {sucess: true})
            }
        });
    } catch (error) {
        callback(error, null)
    }
}

//returns the room of an id
function room(searchTerm, callback) {
  var params = {
      KeyConditions: {
        id: {
          ComparisonOperator: 'EQ',
          AttributeValueList: [ { S: searchTerm } ]
        }
      },
      TableName: "rooms"
  };

  db.query(params, function(err, data) {
    if (err) {
      callback(err, null);
    } else if ( data.Items.length == 0) {
      callback(null, null);
    } else {
      console.log(data.Items[0].texts.L);
      var texts = data.Items[0].texts.L;
      var members = data.Items[0].members.L;
      callback(null, {success: true, texts : texts, members: members});
    }
  });
}

//create a new room
function create_room(id, callback) {
  console.log("ID" + id);
  var members = [];
  for (let v of id.split(", ")) {
    let obj = {};
    obj.S  = v;
    members.push(obj);
  }
  var params = {
    Item : {
        'id': {
            S: id
        }, 
        'texts' : {
          L: []
        }, 
        'members' : {
          L: members
        }
    }, TableName : 'rooms', 
    ReturnValues : 'NONE',
  }
  console.log(members);

  db.putItem(params, function(err, data){
    if (err){
      console.log("fialedd");
      callback(err, null);
    }
    else  {
      console.log("suerefwejfeowjf");
      callback(null, {success: true});
    }
  });	
}

// updates with a text to the room
async function add_text(user, text, id, callback) {
  var params = {
    KeyConditions: {
      id: {
        ComparisonOperator: 'EQ',
        AttributeValueList: [ { S: id } ]
      }
    },
    TableName: "rooms",
    AttributesToGet: [ 'texts' ]
  };
  db.query(params, function(err, data) {
    if (err) {
      console.log("error")
    } else {
      var prev = []
      if (data.Items[0].texts) {
        prev = data.Items[0].texts.L
      }
      var userObj = {};
      userObj.S = user;
      var textObj = {}
      textObj.S = text; 
      var list = [userObj, textObj];
      var bigObj = {};
      bigObj.L = list;
      prev.push(bigObj);

      var list = {};
      list.L = prev;
      var params = {
        TableName: 'rooms',
        Key: { 
          'id' : { S: id }, 
        },
        UpdateExpression: 'set #texts = :texts',
        ExpressionAttributeNames: {
          '#texts' : 'texts'},
        ExpressionAttributeValues: {
          ':texts' : list
        },
        ReturnValues: 'NONE'
      };
      db.updateItem(params, function(err, data){
        if (err) {
          callback(err)
        } else {
          callback(err, {success: true})
        }
      });
    }
  });
}


// updates with members to room
async function add_members(id, user, callback) {
  var params = {
    KeyConditions: {
      id: {
        ComparisonOperator: 'EQ',
        AttributeValueList: [ { S: id } ]
      }
    },
    TableName: "rooms",
    AttributesToGet: [ 'members' ]
  };
  db.query(params, function(err, data) {
    if (err) {
      console.log("error")
    } else {
      var prev = []
      if (data.Items[0].members) {
        prev = data.Items[0].members.L
      }
      var userObj = {};
      userObj.S = user;
      prev.push(userObj);

      var list = {};
      list.L = prev;
      var params = {
        TableName: 'rooms',
        Key: { 
          'id' : { S: id }, 
        },
        UpdateExpression: 'set #members = :members',
        ExpressionAttributeNames: {
          '#members' : 'members'},
        ExpressionAttributeValues: {
          ':members' : list
        },
        ReturnValues: 'NONE'
      };
      db.updateItem(params, function(err, data){
        if (err) {
          callback(err)
        } else {
          callback(err, {success: true})
        }
      });
    }
  });
}

// remove member from room
async function remove_member(user, id, callback) {
  var params = {
    KeyConditions: {
      id: {
        ComparisonOperator: 'EQ',
        AttributeValueList: [ { S: id } ]
      }
    },
    TableName: "rooms",
    AttributesToGet: [ 'members' ]
  };
  db.query(params, function(err, data) {
    if (err) {
      console.log("error")
    } else {
      var prev = []
      if (data.Items[0].members) {
        prev = data.Items[0].members.L
      }
      var newList = [];
      for (let m of prev) {
        if (m.S != user) newList.push(m);
      }

      var list = {};
      list.L = newList;
      var params = {
        TableName: 'rooms',
        Key: { 
          'id' : { S: id }, 
        },
        UpdateExpression: 'set #members = :members',
        ExpressionAttributeNames: {
          '#members' : 'members'},
        ExpressionAttributeValues: {
          ':members' : list
        },
        ReturnValues: 'NONE'
      };
      db.updateItem(params, function(err, data){
        if (err) {
          callback(err)
        } else {
          callback(err, {success: true})
        }
      });
    }
  });
}

//set the location of the user (which room they are in)
function update_location(user, value, callback) {
  var params = {
    Item : {
        'username': {
            S: user
        }, 
        'location': {
          S: value
        }
    }, TableName : 'user_location', 
    ReturnValues : 'NONE',
  }

  db.putItem(params, function(err, data){
    if (err) {
      callback(err, null)

    }
    else {
      callback(null, {success: true});
    }
  });	
} 

//delete user & location when they logout
function delete_location(user, callback) {
  var params = {
		"Key": {
			'username': {
				S: user
			}
		},
		TableName: 'user_location'
	};
	
	db.deleteItem(params, function(err, data) {
		if (err) {
			callback(err);
		} else {
			callback(null, 'Success');
		}
	});
} 

//remove the specific invite
async function remove_invite(me, id, callback) {
  var data = await get_invites(me);
  var list = [];
  if (data.Items[0] && data.Items[0].invites) {
    for (let obj of data.Items[0].invites.L) {
      if (obj.S != id) {
        list.push(obj);
      }
    }
    var params = {
      Item: {
        "username": {
          S: me
        },
        "invites": { 
          L: list
        }, 
      },
      TableName: "user_invites",
      ReturnValues: 'NONE'
    };
    db.putItem(params, function(err, data){
        if (err) {
            callback(err)
        } else {
            callback(null, {success: true});
            
        }
    });
  }
}


//function to get the name of the user
function get_name(searchTerm, callback) {
  console.log(searchTerm);
  var params = {
      KeyConditions: {
        username: {
          ComparisonOperator: 'EQ',
          AttributeValueList: [ { S: searchTerm } ]
        }
      },
      TableName: "users"
  };

  db.query(params, function(err, data) {
    if (err) {
      callback(err, null);
    } else if ( data.Items.length == 0) {
      console.log("hsfjo")
      callback(null, null);
    } else {
      console.log("success")
      var res = {
        first : data.Items[0].first_name.S,
        last : data.Items[0].last_name.S
      }
      callback(null, res);
    }
  });
}


//function to get gc 
function get_gc(searchTerm, callback) {
  console.log(searchTerm);
  var params = {
      KeyConditions: {
        id: {
          ComparisonOperator: 'EQ',
          AttributeValueList: [ { S: searchTerm } ]
        }
      },
      TableName: "rooms"
  };

  db.query(params, function(err, data) {
    if (err) {
      console.log("SDKFNSIFJS");
      callback(err, null);
    } else if ( data.Items.length == 0) {
      console.log("LSFJSFJ");
      callback(null, null);
    } else {
      callback(null, data.Items[0]);
    }
  });
}

//get the last session info
function get_session(searchTerm, callback) {
  console.log(searchTerm);
  var params = {
    KeyConditions: {
      username: {
        ComparisonOperator: 'EQ',
        AttributeValueList: [ { S: searchTerm } ]
      }
    },
    TableName: "session"
  };
  db.query(params, function(err, data) {
    if (err) {
      console.log("errr");
    } else if (data.Items.length == 0) {
      callback(null, null)
    } else {
      callback(null, data.Items[0])
    }
  });
}

//write the session info to db
function add_session(user, obj, callback) {
  var params = {
    Item: {
      "username": {
        S: user
      },
      "roomobj": { 
        S: obj
      }, 
    },
    TableName: "session",
    ReturnValues: 'NONE'
};
db.putItem(params, function(err, data){
    if (err) {
        callback(err, null)
    } else {
        callback(null, {sucess: true})
    }
});
}




var database = { 
    online: get_online,
    getInvites: get_invites,
    send_invite: send_invite,
    add_user_to_chats : add_user_to_chats,
    remove_user_location : remove_user_location,
    room : room,
    get_location : get_location,
    add_text : add_text,
    update_location : update_location, 
    remove_invite: remove_invite,
    delete_location : delete_location,
    add_members : add_members,
    remove_member : remove_member,
    create_room : create_room,
    get_name : get_name,
    get_gc : get_gc,
    get_session : get_session,
    add_session: add_session,
};
  
module.exports = database;                 