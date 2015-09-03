"use strict";

var assert = require('assert')
  , request = require('supertest')
  , should = require('should')
  , mysql = require('mysql');

var connection = mysql.createConnection({
  host : 'localhost',
  user : 'root',
  database : 'todo_list',
  password : ''
});

var HOST = 'http://localhost:8080';

describe('To-Do List', function() {

  before(function(done) {
    // Nuke the db and insert sample data.
    runQuery('SET FOREIGN_KEY_CHECKS = 0')
    runQuery('TRUNCATE user');
    runQuery('TRUNCATE item');
    runQuery('SET FOREIGN_KEY_CHECKS = 1');
    runQuery("INSERT INTO user(user_name)" 
            + " VALUES ('steve'), ('lisa'), ('miles'), ('charlie'), ('zacky')");
    runQuery("INSERT INTO item (user_id, content, due)"
            + " VALUES (1, 'sample item', '2015-09-01'), (1, 'another one', '2015-09-01')");
    runQuery("INSERT INTO item (user_id, content, due, complete)"
            + " VALUES (1, 'third item', '2015-09-02', true)", done);
  });

  it('should print a greeting', function(done) {
    get('/', function(res) {
      res.body.message.should.equal('Welcome to the To-Do List');
      done();
    });
  });

  it('should return list of 3 items for user 1', function(done) {
    get('/list/1', function(res) {
      var list = res.body;
      list.length.should.equal(3);
      var item = list[0];
      item.item_id.should.equal(1);
      item.content.should.equal('sample item');
      item.due.should.startWith('2015-09-01');
      item.complete.should.equal(0);
      item = list[1];
      item.item_id.should.equal(2);
      item.content.should.equal('another one');
      item.due.should.startWith('2015-09-01');
      item.complete.should.equal(0);
      item = list[2];
      item.item_id.should.equal(3);
      item.content.should.equal('third item');
      item.due.should.startWith('2015-09-02');
      item.complete.should.equal(1);
      done();
    });
  });

  it('should return an empty list for other valid users', function(done) {
    for (var i = 2; i <= 5; i++) {
      get('/list/' + i, function(res) {
        res.body.length.should.equal(0);
        var path = res.request.url.split('/');
        if (path[path.length - 1] == 5) {
          done();
        }
      });
    }
  });

  it('should return 404 for non-existent users', function(done) {
    request(HOST)
      .get('/list/8')
      .end(function(err, res) {
        res.status.should.equal(404);
        done();
      });
  });

  it('should add a new item', function(done) {
    var newItem = {'content': 'posted new item', 'due': '2015-10-31'};
    request(HOST)
      .post('/list/1/newitem')
      .send(newItem)
      .end(function(err, res) {
        res.status.should.equal(201); // resource created status
        var list = res.body;
        list.length.should.equal(4);
        var item = list[3];
        item.item_id.should.equal(4);
        item.content.should.equal('posted new item');
        item.due.should.startWith('2015-10-31');
        item.complete.should.equal(0);
        done();
      });
  });

  it('should set the completed state of an item', function(done) {
    get('/list/1', function(res) {
      res.body[1].item_id.should.equal(2);
      res.body[1].complete.should.equal(0);
      var update = {'item_id': 2, 'complete': 1};
      request(HOST)
        .put('/list/1')
        .send(update)
        .expect(200)
        .end(function(err, res) {
          res.body[1].item_id.should.equal(2);
          res.body[1].complete.should.equal(1);
          done();
        });
    });
  });

  it('should return 404 for non-existent items', function(done) {
    var update = {'item_id': 123, 'complete': 1};
    request(HOST)
      .put('/list/1')
      .send(update)
      .end(function(err, res) {
        res.status.should.equal(404);
        done();
      });
  });

  it('should return 404 for items that belong to another user', function(done) {
    var update = {'item_id': 2, 'complete': 1};
    request(HOST)
      .put('/list/2')
      .send(update)
      .end(function(err, res) {
        res.status.should.equal(404);
        done();
      });
  });

  it('should return 400 for invalid item_id', function(done) {
    var update = {'item_id': 'x', 'complete': 1};
    request(HOST)
      .put('/list/1')
      .send(update)
      .end(function(err, res) {
        res.status.should.equal(400);
        done();
      });
  });

  it('should return 400 for invalid value for complete', function(done) {
    var update = {'item_id': '2', 'complete': null};
    request(HOST)
      .put('/list/1')
      .send(update)
      .end(function(err, res) {
        res.status.should.equal(400);
        done();
      });
  });

  it('should return only uncompleted items', function(done) {
    get('/list/1?complete=0', function(res) {
      var list = res.body;
      list.length.should.equal(2);
      var item = list[0];
      item.item_id.should.equal(1);
      item.complete.should.equal(0);
      item = list[1];
      item.item_id.should.equal(4);
      item.complete.should.equal(0);
      done();
    });
  });

});


function runQuery(query, done) {
  connection.query(query, function(err) {
    if (err) {
      throw err;
    }
    if (done) {
      done();
    }
  });
}

function get(route, callback) {
  return request(HOST)
    .get(route)
    .expect('Content-Type', /json/)
    .end(function(err, res) {
      res.status.should.equal(200);
      if (err) {
        throw err;
      }
      callback(res);
    });
}
