var request = require('supertest'); 
var assert = require('assert');
var should = require('should');
var sinon = require('sinon');
var chai = require('chai');

chai.Should();
chai.use(require('sinon-chai'));

var server = require('../app.js');
var mongoose = require('mongoose');

var app = server.app;

describe('Todos', function(){
  it('should respond with a list of json items', function(done) {
    var findStub = sinon.stub(mongoose.model('Todo'), 'find', function(params, callback){
      callback(null, [ {}, {} ]);
    });

    request(app)
      .get('/todos')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function(err, res) {
        res.body.should.have.length(2);

        findStub.should.have.been.calledOnce;
        findStub.should.have.been.calledWith({});

        findStub.restore();

        done();
      });
  });

  it('should save a new todo item', function(done) {
    var todo = { title: 'snafu', done: false };

    var saveStub = sinon.stub(mongoose.model('Todo').prototype, 'save', function(callback){
      callback(todo);
    });

    request(app)
      .post('/todos')
      .send(todo)
      .expect(200)
      .end(function(err, res){
        saveStub.should.have.been.calledOnce;

        res.body.should.have.property('_id');
        res.body.should.have.property('done');

        saveStub.restore();

        done();
      });
  });

  it('should toggle done status for undone items and send notifications', function(done){
    var findOneStub = sinon.stub(mongoose.model('Todo'), 'findOne', function(params, callback){
      todo.done = false;
      callback(null, todo);
    });
    //initial state as should be sent over the wire.
    var todo = { title: 'snafu', done: true, save: function(callback){
      todo.done.should.be.ok;
      callback(todo);
    }};

    var smsStub = sinon.stub(server.twilioClient.sms.messages, 'create', function(message){
      message.body.should.equal('"snafu" task has been marked as done.');
    });

    request(app)
      .put('/todos')
      .send(todo)
      .end(function(err, res) {
        findOneStub.should.have.been.calledOnce;
        findOneStub.restore();

        smsStub.should.have.been.calledOnce;
        smsStub.restore();

        done();
      });

  });

  it('should toggle done status for done items', function(done){
    var findOneStub = sinon.stub(mongoose.model('Todo'), 'findOne', function(params, callback){
      todo.done = false;
      callback(null, todo);
    });

    //initial state as should be sent over the wire.
    //we request the status should be changed to these values.
    var todo = { title: 'snafu', done: false, save: function(callback){
      todo.done.should.not.be.ok;
      callback(todo);
    }};
    var smsStub = sinon.stub(server.twilioClient.sms.messages, 'create');

    request(app)
      .put('/todos')
      .send(todo)
      .end(function(err, res) {
        findOneStub.should.have.been.calledOnce;
        findOneStub.restore();

        smsStub.should.not.have.been.called;
        smsStub.restore();
        done();
      });
  });

  it('should delete an exisiting todo item', function(done){
    var todo = { _id: 1138,  title: 'snafu', done: false };

    var findOneAndRemoveStub = sinon.stub(mongoose.model('Todo'), 'findOneAndRemove', function(params, callback){
      callback(null, todo);
    });

    request(app)
      .del('/todos')
      .send(todo)
      .expect(200)
      .end(function(err, res) {

        findOneAndRemoveStub.should.have.been.calledOnce;
        findOneAndRemoveStub.should.have.been.calledWith({ _id: 1138 });
        findOneAndRemoveStub.restore();

        done();
      });
  });

});
