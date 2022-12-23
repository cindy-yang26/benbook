var AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
var db = new AWS.DynamoDB();
var exec = require('child_process').exec;
var CryptoJS = require("crypto-js");

// queries specified username in 'user' table
var lookup_user = function(username, callback) {	 
	var params = {
		KeyConditions: {
			username: {
				ComparisonOperator: 'EQ',
				AttributeValueList: [{S: username}]
			}
		},
		TableName: 'users'
	}
	
	db.query(params, function(err, data) {
		if (err) {
			console.log(err);
			callback(err, null);
		} else {
			callback(err, data.Items);
		}
	});
};

// adds new user item to 'user' table
var add_user = function(username, pw, first_name, last_name, email, affil, bday, interests, callback) {
	var params = {
      Item: {
        'username': {
          S: username
        },
        ['password']: { 
          S: CryptoJS.SHA256(pw).toString()
        },
        ['first_name']: {
		  S: first_name
		},
        ['last_name']: {
            S: last_name
        },
        ['email']: {
            S: email
        },
        ['affiliation']: {
            S: affil
        },
        ['birthday']: {
            S: bday
        },
        ['interests']: {
            L: interests
        },
		['status']: {
			BOOL: true
		}
      },
      TableName: 'users',
      ReturnValues: 'NONE'
  	};
  	
  	db.putItem(params, function(err, data){
	    if (err) {
			callback(err)
		} else {
			add_trie_table(first_name + " " + last_name, username, function(err, data) {
				if (err) {
					callback(err)
				} else { 
					callback(null, 'Success')
				}
			})
		}
	});	
};

// constructs user's trie table for auto-fill search
var add_trie_table = function(fullname, username, callback) {
	var substrings = []
	for (var i = 1; i <= fullname.length; i++) {
		var substr = fullname.toLowerCase().substring(0, i); 
		var obj = {} 
		obj.substring = { S : substr }
		obj.username = { S : username }
		obj.full_name = { S : fullname }
		var item = {}
		item.Item = obj 
		var req = {}
		req.PutRequest = item
		substrings.push(req)
	}
	var tableObj = {}
	tableObj.search = substrings
	var main = {}
	main.RequestItems = tableObj
	var params = main 
	db.batchWriteItem(params, function(err, data) {
		if (err) {
			callback(err)
		} else {
			while (Object.keys(data.UnprocessedItems).length > 0) {
				db.batchWriteItem(params, function(err2, data2) {
					if (err2) {
						callback(err2)
					} else {
						data = data2
					}
				})
			}
			callback(err, data)
		}
	})
}

// Updates user's password in 'users' table
var update_pw = function(username, pw, callback) {
	var docClient = new AWS.DynamoDB.DocumentClient();
	var encriptpw = CryptoJS.SHA256(pw).toString();
	var params = {
		TableName: 'users',
		Key: { 
			'username' : username
		},
		UpdateExpression: 'set #password = :pw',
		ExpressionAttributeNames: {
			'#password' : 'password'},
		ExpressionAttributeValues: {
		  ':pw' : encriptpw
		},
		ReturnValues: 'NONE'
	  };

	docClient.update(params, function(err, data) {
        if (err) {
			callback(err);
		} else {
			callback(null, 'Success');
		}
    });
}

// Updates user's email in 'users' table
var update_email = function(username, email, callback) {
	var docClient = new AWS.DynamoDB.DocumentClient();
	var params = {
		TableName: 'users',
		Key: { 
			'username' : username
		},
		UpdateExpression: 'set #email = :email',
		ExpressionAttributeNames: {
			'#email' : 'email'},
		ExpressionAttributeValues: {
		  ':email' : email
		},
		ReturnValues: 'NONE'
	  };

	docClient.update(params, function(err, data) {
        if (err) {
			callback(err);
		} else {
			callback(null, 'Success');
		}
    });
}

// Updates user's affiliation in 'users' table
var update_affil = function(username, affil, callback) {
	var docClient = new AWS.DynamoDB.DocumentClient();
	var params = {
		TableName: 'users',
		Key: { 
			'username' : username
		},
		UpdateExpression: 'set #affil = :affil',
		ExpressionAttributeNames: {
			'#affil' : 'affiliation'},
		ExpressionAttributeValues: {
		  ':affil' : affil
		},
		ReturnValues: 'NONE'
	  };

	docClient.update(params, function(err, data) {
        if (err) {
			callback(err);
		} else {
			callback(null, 'Success');
		}
    });
}

// Updates user's online status in 'users' table
var update_status = function(username, status, callback) {
	var docClient = new AWS.DynamoDB.DocumentClient();
	var params = {
		TableName: 'users',
		Key: { 
			'username' : username
		},
		UpdateExpression: 'set #status = :status',
		ExpressionAttributeNames: {
			'#status' : 'status'},
		ExpressionAttributeValues: {
		  ':status' : status
		},
		ReturnValues: 'NONE'
	  };

	docClient.update(params, function(err, data) {
        if (err) {
			callback(err);
		} else {
			callback(null, 'Success');
		}
    });
}

// Retrieves list of all news categories
var get_cats = function(callback) {
	var params = {
		TableName: 'categories',
		Select: 'ALL_ATTRIBUTES'
	};
	
	db.scan(params, function(err, data) {
		if (err) {
			console.log(err);
			callback(err, null);
		} else {
			var items = [];
			for (var i = 0; i < data.Items.length; i++) {
				items.push(data.Items[i].category.S);
			}
			callback(err, items);
		}
	});
}

// Updates user's interests in 'users' table
var update_interests = function(username, interests, callback) {
	var docClient = new AWS.DynamoDB.DocumentClient();
	var params = {
		TableName: 'users',
		Key: { 
			'username' : username
		},
		UpdateExpression: 'set #interests = :interests',
		ExpressionAttributeNames: {
			'#interests' : 'interests'},
		ExpressionAttributeValues: {
		  ':interests' : interests
		},
		ReturnValues: 'NONE'
	  };

	docClient.update(params, function(err, data) {
        if (err) {
			callback(err);
		} else {
			// temp code to run spark job during demo
			exec('mvn exec:java -Dexec.mainClass=edu.upenn.cis.nets2120.rank.livy.ComputeRanksLivy',
				(err, stdout, stderr) => {
				if (err) {
					console.log(err);
					console.log(stdout);
					console.log(stderr);
				} else {
					console.log(stdout);
				}
			});
			callback(null, 'Success');
		}
    });
}

var database = { 
	lookup: lookup_user,
	addUser: add_user,
	updatePw: update_pw,
	updateEmail: update_email,
	updateAffil: update_affil,
	updateStatus: update_status,
	updateInterests: update_interests,
	getCats: get_cats
};

module.exports = database;