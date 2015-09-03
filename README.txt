To-Do List Project

Steve Fram
9/2/2015


Example Usage

Retrieve all To-Do items for user id 1, as a JSON array of items:
  GET http://localhost:8080/list/1

Retrieve only the To-Do items that aren't completed for user id 1, as a JSON array of items:
  GET http://localhost:8080/list/1?complete=0

Create a new To-Do item for user id 1, returning a JSON array of the user's items (including the new one):
  POST http://localhost:8080/list/1/newitem
with a JSON payload modeled after this example:
  {'content': 'new item', 'due': '2015-10-31'}

Set an existing To-Do item's completed state for user id 1, returning a JSON array of the user's items:
  PUT http://localhost:8080/list/1
with a JSON payload modeled after this example:
  {'item_id':1, 'complete':1}


System Requirements

node.js
mysql

Node modules were all installed "locally" so everything should already be
present in node_modules. The only exception is mocha which, if you'd like
to run the unit tests, must be installed globally: 
  $ npm install -g mocha

To run the web service:
  $ node todo.js

To run the unit tests:
  $ mocha

To set up the database:
  mysql> create database todo_list;
  mysql> use todo_list;
  mysql> source schema.sql;

The unit tests will also set up the database with the added bonus of creating
a few records of sample data.


