var AWS = require('aws-sdk');
const { json, request } = require('express');
AWS.config.update({region:'us-east-1'});
var db = new AWS.DynamoDB();  

// queries the search table for values associated with the term and gets their username and each user's attributes
function search(term, callback) {
    if (term !== "") {
        var params = {
            KeyConditions: {
              substring: {
                ComparisonOperator: 'EQ',
                AttributeValueList: [ { S: term.toLowerCase() } ]
              }
            },
            TableName: "search"
        };
        db.query(params, function(err, data) {
            if (err) {
                callback(err, null);
            } else {
                res = []
                if (data.Items && data.Items.length > 0) {
                    data.Items.forEach((elem) => {
                        if (res.length < 5) {
                            res.push([elem.username, elem.full_name])
                        }
                    })
                }
                callback(null, res)
            }
        });
    } else {
        callback(null, [])
    }
}

var database = { 
    search_term: search
}

module.exports = database