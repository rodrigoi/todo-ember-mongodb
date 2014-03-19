(function(){
  'use strict';

  window.Todos = Ember.Application.create({
    LOG_ACTIVE_GENERATION: true, //log when ember generates a controller
    LOG_VIEW_LOOKUPS: true //log when ember lookups a template or a view
  });

  Todos.Todo = Ember.Model.extend({
    _id: Ember.attr(),
    title: Ember.attr(),
    done: Ember.attr()
  });

  Todos.Todo.url = '/todos';
  Todos.Todo.adapter = Ember.RESTAdapter.create();

  Todos.Router.map(function(){
    this.resource('todos', { path: '/'}, function(){
      this.route('active');
      this.route('completed');
    });
  });

  Todos.TodosRoute = Ember.Route.extend({
    model: function(){
      return this.store.find('todo');
    }
  });

  Todos.TodosIndexRoute = Ember.Route.extend({
    model: function () {
      return this.modelFor('todos');
    }
  });

  Todos.TodosActiveRoute = Ember.Route.extend({
    model: function(){
      return this.store.find('todo', { done: false });
    },
    renderTemplate: function(controller) {
      this.render('todos/index', { controller: controller });
    }
  });

  Todos.TodosCompletedRoute = Ember.Route.extend({
    model: function() {
      return this.store.find('todo', { done: true });
    },
    renderTemplate: function(controller) {
      this.render('todos/index', {controller: controller});
    }
  });

  Todos.TodoController = Ember.ObjectController.extend({
    actions: {
      editTodo: function() {
        this.set('isEditing', true);
      },
      acceptChanges: function(){
        this.set('isEditing', false);

        if(Ember.isEmpty(this.get('model.title'))) {
          this.send('removeTodo');
        } else {
          this.get('model').save();
        }
      },
      remove: function(){
        var todo = this.get('model');
        todo.deleteRecord();
        todo.save();
      }
    },
    done: function (key, value) {
      var todo = this.get('model');
      if(value == undefined) {
        return todo.get('done');
      }
      todo.set('done', value);
      todo.save();
      return value;
    }.property('model.done')
  });

  Todos.TodosController = Ember.ArrayController.extend({
    actions: {
      createTodo: function(){
        var title = this.get('title');
        var todo = Todos.Todo.create({ title: title, done: false });
        todo.save();
        this.set('title', '');
      },
      clearCompleted: function(){
        var completed = this.filterBy('done', true);
        completed.invoke('deleteRecord');
        completed.invoke('save');
      }
    },
    hasCompleted: function(){
      return this.get('completed') > 0;
    }.property('completed'),
    completed: function(){
      return this.filterBy('done', true).get('length');
    }.property('@each.done'),
    remaining: function (){
      return this.filterBy('done', false).get('length');
    }.property('@each.done'),
    inflection: function() {
      var remaining = this.get('remaining');
      return remaining === 1 ? 'item' : 'items';
    }.property('remaining')
  });

  Todos.EditTodoView = Ember.TextField.extend({
    didInsertElement: function(){
      this.$().focus();
    }
  });
  Ember.Handlebars.helper('edit-todo', Todos.EditTodoView);

})();
