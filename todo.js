"use strict";

var express = require('express')
  , bodyParser = require('body-parser')
  , expressValidator = require('express-validator')
  , mysql = require('mysql');

var app = express();

app.use(bodyParser.json({type: 'application/json'}));
app.use(expressValidator());

var connection = mysql.createConnection({
  host : 'localhost',
  user : 'root',
  database : 'todo_list',
  password : ''
});

connection.connect();

/*
 * Greeting on index page.
 */
app.get('/', function(req, res) {
  res.statusCode = 200;
  res.json({"message": "Welcome to the To-Do List"});
});

/*
 * Create router and add routes.
 */
var router = express.Router();

/*
 * Returns all items in the To-Do list for a given user.
 * If query string contains "complete=0" then only
 * incomplete items are returned.
 */
router.get('/:user_id([0-9]+)', 
  [getUser, getItems], 
  function(req, res) {
    res.statusCode = 200;
    res.json(req.items);
  });

/*
 * Adds a new item to the user's To-Do list.
 * Payload should be json with values for these keys:
 *  user_id
 *  content
 *  due
 */
router.post('/:user_id([0-9]+)/newitem', 
  getUser, 
  function(req, res, next) {
    var query = 'INSERT INTO item (user_id, content, due) VALUES (?, ?, ?)';
    var values = [req.user.user_id, req.body.content, req.body.due];
    connection.query(query, values, function(err) {
      if (err) {
        console.log(err);
        res.statusCode = 500;
        return res.json({errors: ['Error adding item']});
      }
      next();
    });
  },
  getItems, 
  function(req, res) {
    res.statusCode = 201;
    res.json(req.items);
  });

/*
 * Sets the completed state of an item. 
 * Payload should be json with values for these keys:
 *  item_id
 *  complete
 */
router.put('/:user_id([0-9]+)',
  [getUser, assertItem],
  function(req, res, next) {
    req.checkBody('complete', 'Invalid value for complete').notEmpty().isInt();
    var errors = req.validationErrors();
    if (errors) {
      res.statusCode = 400;
      return res.json({errors: [errors[0].msg]});
    }
    var query = 'UPDATE item SET complete = ? WHERE item_id = ?';
    var values = [req.body.complete, req.body.item_id];
    connection.query(query, values, function(err) {
      if (err) {
        console.log(err);
        res.statusCode = 500;
        return res.json({errors: ['Error adding item']});
      }
      next();
    });
  },
  getItems,
  function(req, res) {
    res.statusCode = 200;
    res.json(req.items);
  });


/*
 * Retrieves the user's name from the database. This method
 * is used to verify that a user (and therefore the user's
 * To-Do list) exists. Upon finding the user, the next
 * handler in the chain is invoked.
 */
function getUser(req, res, next) {
  var query = 'SELECT * FROM user WHERE user_id = ?';
  connection.query(query, [req.params.user_id], function(err, rows) {
    if (err) {
      console.log(err);
      res.statusCode = 500;
      return res.json({errors: ['Error finding user']});
    }
    if (rows.length === 0) {
      res.statusCode = 404;
      return res.json({errors: ['User not found']});
    }
    // Found the user; attach it to the request for downstream handlers.
    req.user = rows[0];
    next();
  });
}

/*
 * Retrieves a To-Do list from the database for a given user,
 * stores it in the request object for further processing,
 * and invokes the next handler in the chain.
 */
function getItems(req, res, next) {
  var query = 
     'SELECT item_id, content, due, complete FROM item'
    + ' WHERE user_id = ?';
  var values = [req.params.user_id];
  if (req.query.complete !== undefined) {
    query += ' AND complete = ?';
    values.push(parseInt(req.query.complete));
  }
  connection.query(query, values, function(err, rows) {
    if (err) {
      console.log(err);
      res.statusCode = 500;
      return res.json({errors: ['Error getting list']});
    }
    req.items = rows;
    next();
  });
}

/*
 * Asserts that an individual To-Do item exists
 * and belongs to the proper user.
 * If so, processing proceeds, otherwise a 404 
 * response is returned.
 */
function assertItem(req, res, next) {
  req.checkBody('item_id', 'Invalid item_id').notEmpty().isInt();
  var errors = req.validationErrors();
  if (errors) {
    res.statusCode = 400;
    return res.json({errors: [errors[0].msg]});
  }
  var query = 
     'SELECT * FROM item WHERE item_id = ? AND user_id = ?';
  var values = [req.body.item_id, req.params.user_id];
  connection.query(query, values, function(err, rows) {
    if (err) {
      console.log(err);
      res.statusCode = 500;
      return res.json({errors: ['Error getting item']});
    }
    if (rows.length === 0) {
      res.statusCode = 404;
      return res.json({errors: ['Item not found']});
    }
    next();
  });
}

app.use('/list', router);

app.listen(8080);
