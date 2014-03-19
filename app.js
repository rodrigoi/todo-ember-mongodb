var config = {
  port: process.env.PORT || 3000,
  mongodb: process.env.MONGOHQ_URL || "mongodb://localhost/todo",
  twilio: {
    accountSID: process.env.TWILIO_ACCOUNT_SID,
    auth_token: process.env.TWILIO_AUTH_TOKEN,
    to: process.env.TWILIO_TO,
    from: process.env.TWILIO_FROM
  }
};

/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var stylus = require('stylus');
var nib = require('nib');

var app = express();

// all environments
app.set('port', config.port);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);

app.use(stylus.middleware({
  src: __dirname + '/public',
  dest: __dirname + '/public',
  compile: function (str, path) {
  return stylus(str)
    .set('filename', path)
    .set('compress', true)
    .use(nib())
    .import('nib');
  }
}));

app.use(express.static(path.join(__dirname, 'public')));

var mongoose = require('mongoose');
var TodoSchema = new mongoose.Schema({
  title: String,
  done: Boolean
});
var Todo = mongoose.model('Todo', TodoSchema);
mongoose.connect(config.mongodb);

var twilio = require('twilio');
var twilioClient = new twilio.RestClient(config.twilio.accountSID, config.twilio.auth_token);

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', function(req, res){
  res.render('index', { title: 'Express' });
});

app.get('/todos', function(req, res) {
  Todo.find({}, function(err, todos) {
    res.send(todos);
  })
});

app.post('/todos', function(req, res) {
  var todo = new Todo({
    title: req.body.title,
    done: req.body.done
  });

  todo.save(function(){
    res.send(todo);
  })
});

app.put('/todos', function(req, res) {
  //using findOne and not findOneAndUpdate
  //because we need to toggle the current value
  Todo.findOne({ _id: req.body._id}, function(err, todo) {
    todo.title = req.body.title;
    todo.done = req.body.done;

    if(todo.done) {
      console.log("sending notifications");
      twilioClient.sms.messages.create({
        to: config.twilio.to,
        from: config.twilio.from,
        body: '"' + todo.title + '" task has been marked as done.'
      }, function(err, message) {
        if(err) {
          console.log('error sending sms', err);
        } else {
          console.log('sent sms with SID: ' + message.sid);
        }
      });
    }

    todo.save(function(){
      res.send(todo);
    });
  });
});

app.delete('/todos', function(req, res) {
  Todo.findOneAndRemove({ _id: req.body._id}, function(err, todo) {
    res.send(todo);
  });
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

module.exports = {
  app: app,
  twilioClient: twilioClient
};
