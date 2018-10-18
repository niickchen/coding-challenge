import transactionController from './src/controller/transaction';

global.Promise = require('bluebird');

const express = require('express');
const app = express();

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

var timeout = require('connect-timeout');
app.use(timeout('10s'));

const {initMongoDB} = require('./src/middleware/mongodb.js');
initMongoDB();

app.get('/', transactionController.getRecurring);
app.post('/', transactionController.upsert);

app.use(haltOnTimedout);
function haltOnTimedout(req, res, next){
  if (!req.timedout) next();
}

app.listen(1984, function() {
    console.log('listening on 1984');
});
