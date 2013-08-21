(function(/*! Brunch !*/) {
  'use strict';

  var globals = typeof window !== 'undefined' ? window : global;
  if (typeof globals.require === 'function') return;

  var modules = {};
  var cache = {};

  var has = function(object, name) {
    return ({}).hasOwnProperty.call(object, name);
  };

  var expand = function(root, name) {
    var results = [], parts, part;
    if (/^\.\.?(\/|$)/.test(name)) {
      parts = [root, name].join('/').split('/');
    } else {
      parts = name.split('/');
    }
    for (var i = 0, length = parts.length; i < length; i++) {
      part = parts[i];
      if (part === '..') {
        results.pop();
      } else if (part !== '.' && part !== '') {
        results.push(part);
      }
    }
    return results.join('/');
  };

  var dirname = function(path) {
    return path.split('/').slice(0, -1).join('/');
  };

  var localRequire = function(path) {
    return function(name) {
      var dir = dirname(path);
      var absolute = expand(dir, name);
      return globals.require(absolute);
    };
  };

  var initModule = function(name, definition) {
    var module = {id: name, exports: {}};
    definition(module.exports, localRequire(name), module);
    var exports = cache[name] = module.exports;
    return exports;
  };

  var require = function(name) {
    var path = expand(name, '.');

    if (has(cache, path)) return cache[path];
    if (has(modules, path)) return initModule(path, modules[path]);

    var dirIndex = expand(path, './index');
    if (has(cache, dirIndex)) return cache[dirIndex];
    if (has(modules, dirIndex)) return initModule(dirIndex, modules[dirIndex]);

    throw new Error('Cannot find module "' + name + '"');
  };

  var define = function(bundle, fn) {
    if (typeof bundle === 'object') {
      for (var key in bundle) {
        if (has(bundle, key)) {
          modules[key] = bundle[key];
        }
      }
    } else {
      modules[bundle] = fn;
    }
  };

  globals.require = require;
  globals.require.define = define;
  globals.require.register = define;
  globals.require.brunch = true;
})();

window.require.register("alert_on_appcache_updates", function(exports, require, module) {
  window.addEventListener('load', function(e) {
    return window.applicationCache.addEventListener('updateready', function(e) {
      if (window.applicationCache.status === window.applicationCache.UPDATEREADY) {
        window.applicationCache.swapCache();
        $('body').append("<p class='alert-message'>A new version of the site is available, <a href='/'>reload now</a></p>");
        return $(document).on('click', function() {
          return window.location.reload();
        });
      }
    }, false);
  }, false);
  
});
window.require.register("backbone_extensions", function(exports, require, module) {
  Backbone.View.prototype.close = function() {
    this.off();
    this.remove();
    this.closeChildrenViews();
    if (this.onClose) {
      return this.onClose();
    }
  };

  Backbone.View.prototype.closeChildrenViews = function() {
    if (this.children) {
      _.each(this.children, function(childView) {
        if (childView.close != null) {
          return childView.close();
        }
      });
      return this.children = [];
    }
  };

  Backbone.View.prototype.addChildView = function(childView) {
    if (!this.children) {
      this.children = [];
    }
    this.children.push(childView);
    return childView;
  };

  Backbone.Model.prototype.saveLocal = function() {
    if (this.collection.burry != null) {
      return this.collection.burry.set(this.get('nid'), this.toJSON());
    }
  };
  
});
window.require.register("collections/drafts", function(exports, require, module) {
  var Draft, Drafts, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Draft = require('models/draft');

  module.exports = Drafts = (function(_super) {
    __extends(Drafts, _super);

    function Drafts() {
      _ref = Drafts.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    Drafts.prototype.url = '/drafts';

    Drafts.prototype.model = Draft;

    Drafts.prototype.initialize = function() {
      var _this = this;

      return this.on('sync', function() {
        var draft, _i, _len, _ref1, _results;

        _ref1 = _this.models;
        _results = [];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          draft = _ref1[_i];
          app.collections.posts.create({
            title: draft.get('title'),
            body: draft.get('body'),
            created: draft.get('created'),
            changed: draft.get('changed'),
            draft: true
          });
          _results.push(draft.destroy());
        }
        return _results;
      });
    };

    Drafts.prototype.comparator = function(model, model2) {
      if (model.get('created') === model2.get('created')) {
        return 0;
      }
      if (model.get('created') < model2.get('created')) {
        return 1;
      } else {
        return -1;
      }
    };

    return Drafts;

  })(Backbone.Collection);
  
});
window.require.register("collections/posts", function(exports, require, module) {
  var Post, _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Post = require('models/post');

  exports.Posts = (function(_super) {
    __extends(Posts, _super);

    function Posts() {
      this.fetchErrorHandler = __bind(this.fetchErrorHandler, this);    _ref = Posts.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    Posts.prototype.url = '/posts';

    Posts.prototype.model = Post;

    Posts.prototype.initialize = function() {
      var _this = this;

      this.currentScrollModel = 0;
      this.lastPost = "";
      this.timesLoaded = 0;
      this.loading(false);
      this.postsViewActive = false;
      this.setMaxNewPostFromCollection = function() {
        return _this.maxNew = _this.max(function(post) {
          return moment(post.get('created')).unix();
        });
      };
      this.on('add remove', function(model) {
        this.setCacheIds();
        return this.burry.remove(model.get('nid'));
      });
      this.burry = new Burry.Store('posts', 30240);
      if (this.burry.get('__ids__') != null) {
        this.loadFromCache();
      }
      app.eventBus.on('visibilitychange', function(state) {
        if (state === "visible") {
          if (moment().diff(moment(_this.lastFetch), 'minutes') > 15) {
            return _this.loadChangesSinceLastFetch();
          }
        }
      });
      return this.fetchDrafts();
    };

    Posts.prototype.getPosts = function() {
      return this.filter(function(post) {
        return post.get('draft') === false;
      });
    };

    Posts.prototype.getDrafts = function() {
      return this.filter(function(post) {
        return post.get('draft') === true;
      });
    };

    Posts.prototype.getByNid = function(nid) {
      nid = parseInt(nid, 10);
      return this.find(function(post) {
        return post.get('nid') === nid;
      });
    };

    Posts.prototype.comparator = function(model, model2) {
      if (model.get('created') === model2.get('created')) {
        return 0;
      }
      if (model.get('created') < model2.get('created')) {
        return 1;
      } else {
        return -1;
      }
    };

    Posts.prototype.loading = function(isLoading) {
      if (isLoading) {
        this.trigger('loading-posts');
        this.isLoading = true;
      }
      if (!isLoading) {
        this.trigger('done-loading-posts');
        return this.isLoading = false;
      }
    };

    Posts.prototype.fetchErrorHandler = function(models, xhr) {
      this.loading(false);
      if (xhr.status === 0) {
        return app.state.set('online', false);
      } else if (xhr.status === 401) {
        return window.location = "/login";
      }
    };

    Posts.prototype.loadChangesSinceLastFetch = function() {
      var _this = this;

      if (!app.state.isOnline()) {
        return;
      }
      return this.fetch({
        update: true,
        remove: false,
        data: {
          changed: this.lastFetch,
          oldest: this.lastPost
        },
        error: this.fetchErrorHandler,
        success: function(collection, response, options) {
          _this.lastFetch = new Date().toJSON();
          return _this.resetCollection(response);
        }
      });
    };

    Posts.prototype.load = function(override) {
      var created,
        _this = this;

      if (override == null) {
        override = false;
      }
      if (!app.state.isOnline()) {
        return;
      }
      if (this.loadedAllThePosts) {
        return;
      }
      if (!this.isLoading || override) {
        this.loading(true);
        setTimeout(function() {
          if (_this.isLoading) {
            _this.loading(false);
            return _this.load();
          }
        }, 10000);
        if (this.lastPost === "") {
          created = new Date().toJSON();
        } else {
          created = this.lastPost;
        }
        return this.fetch({
          update: true,
          remove: false,
          data: {
            created: created
          },
          error: this.fetchErrorHandler,
          success: function(collection, response, options) {
            var post, _i, _len, _ref1, _ref2;

            _this.lastFetch = new Date().toJSON();
            if (_.isString(response)) {
              _this.loadedAllThePosts = true;
              _this.loading(false);
              return;
            }
            _this.resetCollection(response);
            _this.newLastPost = _.last(response)['created'];
            if (_this.newLastPost < _this.lastPost || _this.lastPost === "") {
              _this.lastPost = _this.newLastPost;
            }
            _this.loading(false);
            _ref1 = _this.models;
            for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
              post = _ref1[_i];
              if (((_ref2 = _this.burry.get(post.get('nid'))) != null ? _ref2.changed : void 0) > post.get('changed')) {
                console.log(_this.burry.get(post.get('nid')));
                console.log(post.toJSON());
                _this.get(post.id).set(_this.burry.get(post.get('nid')));
              } else {
                _this.cachePost(post);
              }
            }
            _.defer(function() {
              return _this.setCacheIds();
            });
            return _this.setMaxNewPostFromCollection();
          }
        });
      }
    };

    Posts.prototype.resetCollection = function(response) {
      var maxNew,
        _this = this;

      maxNew = _.max(response, function(post) {
        return moment(post.created).unix();
      });
      if ((this.maxNew != null) && _.isObject(this.maxNew) && (maxNew != null) && this.maxNew.get('created') < maxNew.created) {
        this.maxNew = this.first();
        return _.defer(function() {
          return _this.trigger('reset');
        });
      }
    };

    Posts.prototype.setCacheIds = function() {
      var nids, post, posts;

      posts = this.getPosts().slice(0, 10);
      nids = (function() {
        var _i, _len, _results;

        _results = [];
        for (_i = 0, _len = posts.length; _i < _len; _i++) {
          post = posts[_i];
          _results.push(post.get('nid'));
        }
        return _results;
      })();
      return this.burry.set('__ids__', nids);
    };

    Posts.prototype.cachePost = function(post) {
      return this.burry.set(post.get('nid'), post.toJSON());
    };

    Posts.prototype.loadFromCache = function() {
      var nid, post, posts, postsIds, _i, _len;

      postsIds = this.burry.get('__ids__');
      posts = [];
      for (_i = 0, _len = postsIds.length; _i < _len; _i++) {
        nid = postsIds[_i];
        if (nid === null) {
          continue;
        }
        post = this.loadNidFromCache(nid);
        if (post != null) {
          posts.push(post);
        }
      }
      this.reset(posts);
      return this.setMaxNewPostFromCollection();
    };

    Posts.prototype.loadNidFromCache = function(nid) {
      return this.burry.get(nid);
    };

    Posts.prototype.posNext = function() {
      var model;

      model = this.at(this.currentScrollModel + 1);
      if (model != null) {
        this.currentScrollModel = this.currentScrollModel + 1;
        return model.position();
      } else {
        return void 0;
      }
    };

    Posts.prototype.posPrev = function() {
      var model;

      model = this.at(this.currentScrollModel - 1);
      if (model != null) {
        this.currentScrollModel = this.currentScrollModel - 1;
        return model.position();
      } else {
        return void 0;
      }
    };

    Posts.prototype.fetchDrafts = function() {
      var _this = this;

      if (!app.state.isOnline()) {
        return;
      }
      return $.getJSON('/posts?draft=true', function(drafts) {
        _this.add(drafts);
        return _this.trigger('sync:drafts');
      });
    };

    return Posts;

  })(Backbone.Collection);
  
});
window.require.register("collections/posts_cache", function(exports, require, module) {
  var Post, PostsCache, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Post = require('models/post');

  module.exports = PostsCache = (function(_super) {
    __extends(PostsCache, _super);

    function PostsCache() {
      _ref = PostsCache.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    PostsCache.prototype.getByNid = function(nid) {
      var json, post;

      nid = parseInt(nid, 10);
      if (this.find(function(post) {
        return post.get('nid') === nid;
      }) != null) {
        return this.find(function(post) {
          return post.get('nid') === nid;
        });
      } else if (app.collections.posts.burry.get(nid) != null) {
        json = app.collections.posts.burry.get(nid);
        post = new Post(json);
        post.fetch();
        this.add(post);
        return post;
      } else {
        return this.fetchPost(nid);
      }
    };

    PostsCache.prototype.fetchPost = function(pid) {
      var post;

      post = new Post({
        nid: pid,
        id: null
      });
      post.fetch({
        nid: pid
      });
      this.add(post);
      return post;
    };

    return PostsCache;

  })(Backbone.Collection);
  
});
window.require.register("collections/search", function(exports, require, module) {
  var Result, Search, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Result = require('models/result');

  module.exports = Search = (function(_super) {
    __extends(Search, _super);

    function Search() {
      _ref = Search.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    Search.prototype.model = Result;

    Search.prototype.initialize = function() {
      var _this = this;

      this.fetchCommonQueries();
      return this.on('search:complete', function() {
        return _this.fetchCommonQueries();
      });
    };

    Search.prototype.fetchCommonQueries = function() {
      var _this = this;

      return $.getJSON('/search/queries', function(data) {
        return _this.queries = data;
      });
    };

    Search.prototype.query = function(query) {
      var start,
        _this = this;

      if (query !== "") {
        this.trigger('search:started');
        this.query_str = query;
        start = new Date();
        this.reset();
        return app.util.search(query, function(results) {
          var entry, year, _i, _j, _len, _len1, _ref1, _ref2;

          _this.results = results;
          _this.searchtime = new Date() - start;
          _this.total = results.hits.total;
          _this.max_score = results.hits.max_score;
          _this.reset(results.hits.hits);
          console.log(results.facets);
          _ref1 = results.facets.year.entries;
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            entry = _ref1[_i];
            year = moment.utc(entry.time).year();
            console.log(year + ": " + entry.count);
            console.log('');
          }
          _ref2 = results.facets.month.entries;
          for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
            entry = _ref2[_j];
            year = moment.utc(entry.time).format('MMMM YYYY');
            console.log(year + ": " + entry.count);
          }
          return _this.trigger('search:complete');
        });
      } else {
        return this.clear();
      }
    };

    Search.prototype.clear = function() {
      this.results = null;
      this.searchtime = null;
      this.max_score = null;
      this.total = null;
      this.query_str = null;
      this.scrollTop = null;
      return this.reset();
    };

    return Search;

  })(Backbone.Collection);
  
});
window.require.register("collections/starred", function(exports, require, module) {
  var Starred, _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  module.exports = Starred = (function(_super) {
    __extends(Starred, _super);

    function Starred() {
      this.maintainStarred = __bind(this.maintainStarred, this);    _ref = Starred.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    Starred.prototype.initialize = function() {
      this.fetch();
      app.collections.posts.on('change:starred', this.maintainStarred);
      return app.collections.postsCache.on('change:starred', this.maintainStarred);
    };

    Starred.prototype.maintainStarred = function(model, starred) {
      if (starred) {
        return this.add(model, {
          merge: true
        });
      } else {
        return this.remove(model);
      }
    };

    Starred.prototype.fetch = function() {
      var _this = this;

      return $.getJSON('/posts?starred=true', function(posts) {
        _this.reset(posts);
        return _this.trigger('sync');
      });
    };

    Starred.prototype.comparator = function(model, model2) {
      if (model.get('created') === model2.get('created')) {
        return 0;
      }
      if (model.get('created') < model2.get('created')) {
        return 1;
      } else {
        return -1;
      }
    };

    return Starred;

  })(Backbone.Collection);
  
});
window.require.register("file_drop_handler", function(exports, require, module) {
  var createAttachment;

  $('body').dropArea();

  $('body').on('drop', function(e) {
    var file, files, _i, _len, _results;

    e.preventDefault();
    e = e.originalEvent;
    if (!app.state.isOnline()) {
      return;
    }
    if ($('.body textarea').length > 0) {
      files = e.dataTransfer.files;
      _results = [];
      for (_i = 0, _len = files.length; _i < _len; _i++) {
        file = files[_i];
        _results.push(createAttachment(file));
      }
      return _results;
    }
  });

  createAttachment = function(file) {
    var attachmentText, data, uid;

    uid = ['kylemathews', (new Date).getTime(), 'raw'].join('-');
    console.log(uid);
    data = new FormData();
    data.append('attachment[name]', file.name);
    data.append('attachment[file]', file);
    data.append('attachment[uid]', uid);
    $.ajax({
      url: '/attachments',
      data: data,
      cache: false,
      contentType: false,
      processData: false,
      type: 'POST'
    }).error(function(error) {
      return console.log('error uploading', error);
    });
    attachmentText = "![" + file.name + "](/attachments/" + uid + ")";
    return $('.body textarea').insertAtCaret(attachmentText + "\n\n");
  };
  
});
window.require.register("geolocation", function(exports, require, module) {
  var Geolocation,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Geolocation = (function() {
    function Geolocation() {
      this.error = __bind(this.error, this);
      this.success = __bind(this.success, this);    if (navigator.geolocation) {
        console.log('Geolocation is supported!');
        navigator.geolocation.getCurrentPosition(this.success, this.error);
      } else {
        console.log('Geolocation is not supported for this Browser/OS version yet.');
      }
    }

    Geolocation.prototype.success = function(position) {
      return this.position = position;
    };

    Geolocation.prototype.error = function(error) {
      console.log(error);
      return this.error = error;
    };

    Geolocation.prototype.getLatitudeLongitude = function() {
      if (this.position != null) {
        return {
          latitude: this.position.coords.latitude,
          longitude: this.position.coords.longitude
        };
      } else {
        return {
          latitude: "",
          longitude: ""
        };
      }
    };

    return Geolocation;

  })();

  module.exports = new Geolocation();
  
});
window.require.register("helpers", function(exports, require, module) {
  var Post;

  Post = require('models/post');

  exports.BrunchApplication = (function() {
    function BrunchApplication() {
      var _this = this;

      _.defer(function() {
        _this.initialize();
        return Backbone.history.start({
          pushState: true
        });
      });
    }

    BrunchApplication.prototype.initialize = function() {
      return null;
    };

    BrunchApplication.prototype.util = function() {};

    return BrunchApplication;

  })();

  exports.loadPostModel = function(id, nid) {
    var post;

    if (nid == null) {
      nid = false;
    }
    if (nid) {
      if (app.collections.posts.getByNid(id)) {
        return app.collections.posts.getByNid(id);
      } else {
        return app.collections.postsCache.getByNid(id);
      }
    } else {
      if (app.collections.posts.get(id)) {
        return app.collections.posts.get(id);
      } else {
        post = new Post({
          id: id
        });
        post.fetch();
        app.collections.postsCache.add(post);
        return post;
      }
    }
  };

  exports.clickHandler = function(e) {
    var href;

    if (!(e.target.tagName === 'A' && ($(e.target).attr('href') != null))) {
      return;
    }
    if (_.include(['/logout'], $(e.target).attr('href'))) {
      return;
    }
    if ($(e.target).attr('href').indexOf('http') !== 0) {
      e.preventDefault();
      href = $(e.target).attr('href');
      return app.router.navigate(href, {
        trigger: true
      });
    }
  };

  exports.scrollPosition = function() {
    return app.eventBus.on('distance:scrollTop', function() {
      if (window.location.pathname === '/') {
        return app.site.set({
          postsScroll: $(window).scrollTop()
        });
      }
    });
  };

  exports.search = function(query, callback) {
    return $.getJSON("/search/" + query, {
      ajax: true
    }, function(data) {
      return callback(data);
    });
  };

  $(function() {
    var reportNearBottom, throttled;

    reportNearBottom = function() {
      app.eventBus.trigger('distance:bottom_page', ($(document).height() - $(window).height()) - $(window).scrollTop());
      return app.eventBus.trigger('distance:scrollTop', $(window).scrollTop());
    };
    throttled = _.throttle(reportNearBottom, 200);
    return $(window).scroll(throttled);
  });

  exports.throbber = function(classes, size) {
    if (classes == null) {
      classes = "";
    }
    if (size == null) {
      size = "16px";
    }
    return '<span class="throbber ' + classes + '" style="height:' + size + ';width:' + size + ';">\
              <div class="bar1"></div> <div class="bar2"></div> <div class="bar3"></div> <div class="bar4"></div> <div class="bar5"></div> <div class="bar6"></div> <div class="bar7"></div> <div class="bar8"></div> <div class="bar9"></div> <div class="bar10"></div> <div class="bar11"></div> <div class="bar12"></div>\
              </span>';
  };
  
});
window.require.register("includes/offline_backbone_sync", function(exports, require, module) {
  var burry, getKeyByNid, methodMap, saveOfflineChanges;

  methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'patch': 'PATCH',
    'delete': 'DELETE',
    'read': 'GET'
  };

  window.offline_changes = burry = new Burry.Store('offline_changes');

  Backbone.sync = function(method, model, options) {
    var error, params, success, type, xhr, _ref;

    if (options == null) {
      options = {};
    }
    type = methodMap[method];
    params = {
      type: type,
      dataType: 'json'
    };
    if (!options.url) {
      params.url = _.result(model, 'url') || urlError();
    }
    if ((options.data == null) && model && (method === 'create' || method === 'update' || method === 'patch')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(options.attrs || model.toJSON(options));
    }
    if (params.type !== 'GET') {
      params.processData = false;
    }
    success = options.success;
    options.success = function(resp) {
      app.state.set('online', true);
      if (success) {
        success(model, resp, options);
      }
      return model.trigger('sync', model, resp, options);
    };
    error = options.error;
    options.error = function(xhr) {
      if (xhr.status === 0) {
        saveOfflineChanges(model, _.extend(params, options));
        app.state.set('online', false);
      } else if (xhr.status === 401) {
        window.location = "/login";
      }
      if (error) {
        error(model, xhr, options);
      }
      return model.trigger('error', model, xhr, options);
    };
    if (app.state.isOnline()) {
      if ((_ref = params.type) === 'POST' || _ref === 'PUT' || _ref === 'PATCH') {
        this.saveLocal();
      }
      xhr = options.xhr = Backbone.ajax(_.extend(params, options));
      model.trigger('request', model, xhr, options);
      return xhr;
    } else {
      saveOfflineChanges(model, _.extend(params, options));
      if (success) {
        success(model, {
          status: 200
        }, options);
      }
      return model.trigger('sync', model, {
        status: 200
      }, options);
    }
  };

  getKeyByNid = function(nid) {
    return _.find(burry.keys(), function(key) {
      return key.split("::")[1] === String(nid);
    });
  };

  saveOfflineChanges = function(model, options) {
    var key, newOperation, oldOperation;

    if (options.type === "GET") {
      return;
    }
    if (model.constructor.name !== 'Post') {
      return;
    }
    if (model.get('created') == null) {
      model.set('created', new Date().toJSON());
    }
    model.set('changed', new Date().toJSON());
    if (!model.id) {
      model.id = "OFFLINE_" + (Math.round(Math.random() * 10000000000));
    }
    if (!model.get('nid')) {
      model.set('nid', Math.round(Math.random() * 10000000000) + 1000000);
    }
    key = getKeyByNid(model.get('nid'));
    if (key != null) {
      oldOperation = key.split("::")[0];
      newOperation = options.type;
      console.log(newOperation, oldOperation);
      if (newOperation === "DELETE" && oldOperation === "POST") {
        return burry.remove(key);
      }
      if (newOperation === "DELETE" && oldOperation === "PUT") {
        burry.remove(key);
        key = "DELETE::" + (model.get('nid'));
      }
    } else {
      key = "" + options.type + "::" + (model.get('nid'));
    }
    return burry.set(key, model.toJSON());
  };

  app.state.on('change:online', function(model, online) {
    if (online && burry.keys().length > 0) {
      return replayChanges();
    }
  });

  window.replayChanges = function() {
    var key, model, operation, operations, promise, _i, _j, _len, _len1, _ref, _ref1, _results;

    if (!app.state.isOnline()) {
      return;
    }
    operations = [];
    _ref = burry.keys();
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      key = _ref[_i];
      model = burry.get(key);
      model._operation = key.split('::')[0];
      model._key = key;
      operations.push(model);
    }
    _results = [];
    for (_j = 0, _len1 = operations.length; _j < _len1; _j++) {
      model = operations[_j];
      operation = model._operation;
      key = model._key;
      model._operation = null;
      model._key = null;
      switch (operation) {
        case "POST":
          app.collections.posts.burry.remove(key.split('::')[1]);
          if (((_ref1 = app.models.editing) != null ? _ref1.get('nid') : void 0) === model.nid) {
            app.models.editing.id = null;
            app.models.editing.unset('nid');
            promise = app.models.editing.save();
            _results.push((function(key, promise) {
              return promise.done(function() {
                return burry.remove(key);
              });
            })(key, promise));
          } else if (app.collections.posts.getByNid(model.nid) != null) {
            model = app.collections.posts.getByNid(model.nid);
            model.id = null;
            model.unset('nid');
            model.once('sync', function() {
              return app.collections.posts.setCacheIds();
            });
            _results.push((function(key, model) {
              promise = model.save();
              return promise.done(function() {
                return burry.remove(key);
              });
            })(key, model));
          } else {
            model.id = null;
            model.nid = null;
            _results.push((function(key, model) {
              var newModel;

              newModel = app.collections.posts.create(model);
              return newModel.once('sync', function() {
                return burry.remove(key);
              });
            })(key, model));
          }
          break;
        case "PUT":
          if (app.collections.posts.getByNid(model.nid) != null) {
            _results.push((function(key, model) {
              promise = app.collections.posts.getByNid(model.nid).set(model).save();
              return promise.done(function() {
                return burry.remove(key);
              });
            })(key, model));
          } else {
            _results.push((function(key, model) {
              var realModel;

              realModel = app.util.loadPostModel(model.nid, true);
              promise = realModel.fetch();
              return promise.done(function() {
                promise = realModel.set(model).save();
                return promise.done(function() {
                  return burry.remove(key);
                });
              });
            })(key, model));
          }
          break;
        case "DELETE":
          if (app.collections.posts.getByNid(model.nid) != null) {
            _results.push(app.collections.posts.getByNid(model.nid).destroy());
          } else {
            _results.push((function(key, model) {
              var realModel;

              realModel = app.util.loadPostModel(model.nid, true);
              return realModel.once('sync', function() {
                if (realModel.destroy != null) {
                  promise = realModel.destroy();
                  return promise.done(function() {
                    return burry.remove(key);
                  });
                }
              });
            })(key, model));
          }
          break;
        default:
          _results.push(void 0);
      }
    }
    return _results;
  };
  
});
window.require.register("includes/online", function(exports, require, module) {
  var Online,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Online = (function() {
    function Online() {
      this.ping = __bind(this.ping, this);
      var _this = this;

      this.pingWait = 1000;
      this.ping();
      document.addEventListener('online', this.ping);
      document.addEventListener('offline', this.ping);
      app.state.on('change:online', function(model, online) {
        if (!online) {
          return _this.ping();
        }
      });
      app.eventBus.on('visibilitychange', function(state) {
        if (!app.state.isOnline()) {
          if (state === "visible") {
            return _this.ping();
          } else {
            return clearTimeout(_this.id);
          }
        }
      });
    }

    Online.prototype.ping = function() {
      var _this = this;

      this.lastPing = new Date();
      clearTimeout(this.id);
      return $.ajax({
        url: '/ping',
        success: function(result) {
          _this.pingWait = 1000;
          return app.state.set('online', true);
        },
        error: function(result) {
          app.state.set('online', false);
          if (!(_this.pingWait >= 120000)) {
            _this.pingWait = _this.pingWait * 1.5;
          } else {
            _this.pingWait = 120000;
          }
          return _this.id = setTimeout(_this.ping, _this.pingWait);
        }
      });
    };

    return Online;

  })();

  app.online = new Online();
  
});
window.require.register("initialize", function(exports, require, module) {
  var BrunchApplication, Drafts, MainRouter, MainView, MenuBarView, OfflineStatusView, Posts, PostsCache, PostsView, Search, Starred, State, clickHandler, loadPostModel, scrollPosition, search, throbber, _ref, _ref1,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ref = require('helpers'), BrunchApplication = _ref.BrunchApplication, loadPostModel = _ref.loadPostModel, clickHandler = _ref.clickHandler, scrollPosition = _ref.scrollPosition, search = _ref.search, throbber = _ref.throbber;

  MainRouter = require('routers/main_router').MainRouter;

  MainView = require('views/main_view').MainView;

  PostsView = require('views/posts_view').PostsView;

  Posts = require('collections/posts').Posts;

  PostsCache = require('collections/posts_cache');

  Drafts = require('collections/drafts');

  Starred = require('collections/starred');

  MenuBarView = require('views/menu_bar_view');

  OfflineStatusView = require('views/offline_status_view');

  Search = require('collections/search');

  State = require('models/state');

  require('backbone_extensions');

  require('file_drop_handler');

  require('alert_on_appcache_updates');

  exports.Application = (function(_super) {
    __extends(Application, _super);

    function Application() {
      _ref1 = Application.__super__.constructor.apply(this, arguments);
      return _ref1;
    }

    Application.prototype.initialize = function() {
      var postsView;

      _.mixin(_.str.exports());
      this.eventBus = _.extend({}, Backbone.Events);
      this.eventBus.on('all', function(eventName, args) {
        return console.log('EBUS', eventName, args);
      });
      this.collections = {};
      this.models = {};
      this.views = {};
      this.util = {};
      this.templates = {};
      this.geolocation = require('geolocation');
      this.state = new State();
      this.util.loadPostModel = loadPostModel;
      this.util.clickHandler = clickHandler;
      this.util.search = search;
      this.templates.throbber = throbber;
      marked.setOptions({
        smartLists: true
      });
      this.site = new Backbone.Model;
      this.router = new MainRouter;
      this.collections.posts = new Posts;
      this.collections.posts.load(true);
      this.collections.postsCache = new PostsCache;
      this.collections.starred = new Starred;
      this.collections.drafts = new Drafts;
      this.collections.drafts.fetch();
      this.collections.search = new Search;
      new MenuBarView({
        el: $('#menu-bar')
      });
      new OfflineStatusView({
        el: $('.offline-status')
      });
      this.views.main = new MainView({
        el: $('#container')
      });
      postsView = new PostsView({
        collection: app.collections.posts,
        el: $('#posts')
      });
      postsView.render();
      FastClick.attach(document.body);
      scrollPosition();
      return $(window).on('click', app.util.clickHandler);
    };

    return Application;

  })(BrunchApplication);

  if (location.pathname !== '/login') {
    window.app = new exports.Application;
  }

  _.defer(function() {
    require('keyboard_shortcuts');
    require('includes/online');
    return require('includes/offline_backbone_sync');
  });
  
});
window.require.register("keyboard_shortcuts", function(exports, require, module) {
  var _this = this;

  key('s,/', function() {
    return app.router.navigate('search', true);
  });

  key('h', function() {
    return app.router.navigate('', true);
  });

  key('n', function() {
    return app.router.navigate('posts/new', true);
  });

  $(document).on('keydown', 'textarea, input', function(e) {
    if (e.which === 27) {
      return $(e.currentTarget).blur();
    }
  });

  $(document).on('keydown', function(e) {
    if ($(e.target).is('input, textarea, select')) {
      return;
    }
    return app.eventBus.trigger('keydown', e.which);
  });

  app.eventBus.on('keydown', function(keycode) {
    if (keycode === 71) {
      return (function() {
        var callback;

        callback = function(keycode) {
          if (keycode === 71) {
            return $("html, body").animate({
              scrollTop: 0
            });
          }
        };
        app.eventBus.on('keydown', callback);
        return _.delay((function() {
          return app.eventBus.off('keydown', callback);
        }), 1000);
      })();
    }
  });
  
});
window.require.register("mixins/region_manager", function(exports, require, module) {
  exports.RegionManager = {
    show: function(view) {
      var oldView;

      this.$el.show();
      oldView = this.currentView;
      this.currentView = view;
      this._closeView(oldView);
      this._openView(view);
      return app.eventBus.trigger('pane:show');
    },
    _closeView: function(view) {
      if (view && view.close) {
        return view.close();
      }
    },
    _openView: function(view) {
      this.$el.html(view.render().el);
      if (view.onShow) {
        return view.onShow();
      }
    }
  };
  
});
window.require.register("models/draft", function(exports, require, module) {
  var Draft, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  module.exports = Draft = (function(_super) {
    __extends(Draft, _super);

    function Draft() {
      _ref = Draft.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    return Draft;

  })(Backbone.Model);
  
});
window.require.register("models/post", function(exports, require, module) {
  var Post, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  module.exports = Post = (function(_super) {
    __extends(Post, _super);

    function Post() {
      _ref = Post.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    Post.prototype.defaults = {
      title: '',
      body: ''
    };

    Post.prototype.url = function() {
      if (this.get('id')) {
        return "/posts/" + (this.get('id'));
      } else if (this.get('nid')) {
        return "/posts/?nid=" + (this.get('nid'));
      } else {
        return this.collection.url;
      }
    };

    Post.prototype.initialize = function() {
      Post.__super__.initialize.call(this);
      return this.on('sync', function() {
        if ((this.get('body') != null) && (this.get('title') != null)) {
          this.renderThings(true);
          return app.collections.posts.cachePost(this);
        }
      });
    };

    Post.prototype.renderThings = function(breakCache) {
      var html, piece, pieces, readMore, _i, _len;

      if ((this.get('rendered_body') != null) && this.get('rendered_body') !== "" && !breakCache) {
        return;
      }
      html = marked(this.get('body'));
      this.set({
        rendered_body: html
      }, {
        silent: true
      });
      this.set({
        rendered_created: moment.utc(this.get('created')).local().format("dddd, MMMM Do YYYY h:mma")
      }, {
        silent: true
      });
      if (this.get('body').length > 300) {
        pieces = this.get('body').split('\n');
        readMore = "";
        for (_i = 0, _len = pieces.length; _i < _len; _i++) {
          piece = pieces[_i];
          readMore += piece + "\n";
          if (readMore.length > 300) {
            break;
          }
        }
        readMore = _.str.trim(readMore);
        if (readMore.length !== _.str.trim(this.get('body')).length) {
          readMore += "\n\n[Read more](node/" + (this.get('nid')) + ")";
        }
        return this.set({
          readMore: marked(readMore)
        }, {
          silent: true
        });
      } else {
        return this.set({
          readMore: marked(this.get('body'))
        }, {
          silent: true
        });
      }
    };

    Post.prototype.position = function() {
      if (this.view) {
        return this.view.$el.offset().top;
      } else {
        return void 0;
      }
    };

    return Post;

  })(Backbone.Model);
  
});
window.require.register("models/result", function(exports, require, module) {
  var Result, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  module.exports = Result = (function(_super) {
    __extends(Result, _super);

    function Result() {
      _ref = Result.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    return Result;

  })(Backbone.Model);
  
});
window.require.register("models/state", function(exports, require, module) {
  var State, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  module.exports = State = (function(_super) {
    __extends(State, _super);

    function State() {
      _ref = State.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    State.prototype.isOnline = function() {
      return this.get('online') || _.isUndefined(this.get('online'));
    };

    return State;

  })(Backbone.Model);
  
});
window.require.register("routers/main_router", function(exports, require, module) {
  var DraftsView, Post, PostEditView, PostView, PostsView, SearchView, StarredView, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  PostsView = require('views/posts_view').PostsView;

  PostView = require('views/post_view').PostView;

  PostEditView = require('views/post_edit_view').PostEditView;

  Post = require('models/post');

  DraftsView = require('views/drafts_view');

  StarredView = require('views/starred_view');

  SearchView = require('views/search_view');

  exports.MainRouter = (function(_super) {
    __extends(MainRouter, _super);

    function MainRouter() {
      _ref = MainRouter.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    MainRouter.prototype.routes = {
      '': 'home',
      'node/:id': 'post',
      'posts/new': 'newPost',
      'node/:id/edit': 'editPost',
      'drafts': 'drafts',
      'starred': 'starred',
      'search': 'search',
      'search/:query': 'search'
    };

    MainRouter.prototype.home = function() {
      $('#container').hide();
      $('#posts').show();
      return app.eventBus.trigger('posts:show');
    };

    MainRouter.prototype.post = function(id) {
      var post, postView;

      post = app.util.loadPostModel(id, true);
      document.body.scrollTop = document.documentElement.scrollTop = 0;
      postView = new PostView({
        model: post,
        page: true
      });
      return app.views.main.show(postView);
    };

    MainRouter.prototype.newPost = function(focusTitle) {
      var newPost, postEditView;

      if (focusTitle == null) {
        focusTitle = false;
      }
      document.body.scrollTop = document.documentElement.scrollTop = 0;
      newPost = new Post({}, {
        collection: app.collections.posts
      });
      newPost.set({
        created: new Date().toISOString()
      });
      postEditView = new PostEditView({
        model: newPost,
        focusTitle: focusTitle,
        newPost: true
      });
      return app.views.main.show(postEditView);
    };

    MainRouter.prototype.editPost = function(id) {
      var post, postEditView;

      post = app.util.loadPostModel(id, true);
      document.body.scrollTop = document.documentElement.scrollTop = 0;
      postEditView = new PostEditView({
        model: post
      });
      return app.views.main.show(postEditView);
    };

    MainRouter.prototype.drafts = function() {
      var draftsView;

      document.body.scrollTop = document.documentElement.scrollTop = 0;
      draftsView = new DraftsView({
        collection: app.collections.posts
      });
      return app.views.main.show(draftsView);
    };

    MainRouter.prototype.starred = function() {
      var starredView;

      document.body.scrollTop = document.documentElement.scrollTop = 0;
      starredView = new StarredView({
        collection: app.collections.starred
      });
      return app.views.main.show(starredView);
    };

    MainRouter.prototype.search = function(query, reset) {
      var searchView;

      if (query == null) {
        query = "";
      }
      if (reset == null) {
        reset = false;
      }
      searchView = new SearchView({
        collection: app.collections.search
      });
      app.views.main.show(searchView);
      query = decodeURIComponent(query);
      if (query !== app.collections.search.query_str) {
        return app.collections.search.query(query);
      }
    };

    return MainRouter;

  })(Backbone.Router);
  
});
window.require.register("views/drafts_view", function(exports, require, module) {
  var DraftsTemplate, DraftsView, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  DraftsTemplate = require('views/templates/drafts');

  module.exports = DraftsView = (function(_super) {
    __extends(DraftsView, _super);

    function DraftsView() {
      _ref = DraftsView.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    DraftsView.prototype.className = "drafts-page";

    DraftsView.prototype.initialize = function() {
      return this.listenTo(this.collection, 'sync:drafts', this.render);
    };

    DraftsView.prototype.events = {
      'click a': 'clickHandler'
    };

    DraftsView.prototype.render = function() {
      this.$el.html(DraftsTemplate());
      this.addAll();
      return this;
    };

    DraftsView.prototype.addAll = function() {
      var draft, _i, _len, _ref1, _results;

      _ref1 = this.collection.getDrafts();
      _results = [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        draft = _ref1[_i];
        _results.push(this.$('ul').append("<li class='link'><a href='node/" + (draft.get('nid')) + "/edit'>" + (draft.get('title')) + " <em>" + (moment(draft.get('created')).fromNow()) + "</em></a></li>"));
      }
      return _results;
    };

    DraftsView.prototype.clickHandler = function(e) {
      var href;

      e.preventDefault();
      href = $(e.currentTarget).attr('href');
      return app.router.navigate(href, {
        trigger: true
      });
    };

    return DraftsView;

  })(Backbone.View);
  
});
window.require.register("views/main_view", function(exports, require, module) {
  var RegionManager, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  RegionManager = require('mixins/region_manager').RegionManager;

  exports.MainView = (function(_super) {
    __extends(MainView, _super);

    function MainView() {
      _ref = MainView.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    return MainView;

  })(Backbone.View);

  exports.MainView.prototype = _.extend(exports.MainView.prototype, RegionManager);
  
});
window.require.register("views/menu_bar_view", function(exports, require, module) {
  var MenuBarView, MenuDropdownView, _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  MenuDropdownView = require('views/menu_dropdown_view');

  module.exports = MenuBarView = (function(_super) {
    __extends(MenuBarView, _super);

    function MenuBarView() {
      this.scrollManagement = __bind(this.scrollManagement, this);    _ref = MenuBarView.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    MenuBarView.prototype.initialize = function() {
      this.throttledScroll = _.throttle(this.scrollManagement, 25);
      if (Modernizr.touch) {
        $(window).on('scroll', this.throttledScroll);
      }
      return this.listenTo(app.state, 'change:online', this.toggleOnlineStatus);
    };

    MenuBarView.prototype.events = {
      'click .home-link': 'travelHome',
      'click .dropdown-menu': 'toggleDropdown'
    };

    MenuBarView.prototype.travelHome = function() {
      return app.eventBus.trigger('menuBar:click-home');
    };

    MenuBarView.prototype.scrollManagement = function() {
      this.current = $(window).scrollTop();
      if (this.last != null) {
        if (this.current < this.last) {
          if (this.scrollingDirection === "down") {
            this.$el.css('position', 'fixed').css('top', 0);
          }
          this.scrollingDirection = "up";
        } else {
          if (this.scrollingDirection === "up" || _.isUndefined(this.scrollingDirection)) {
            this.$el.css('position', 'absolute');
            if (!this.isVisible()) {
              this.$el.css('top', this.current + "px");
            }
          }
          this.scrollingDirection = "down";
        }
      }
      return this.last = this.current;
    };

    MenuBarView.prototype.isVisible = function() {
      return this.$el.offset().top - this.current > -50;
    };

    MenuBarView.prototype.toggleDropdown = function() {
      var left, menuBarPadding, widthDropdown, widthIcon;

      this.$('.dropdown-menu').toggleClass('active');
      left = $('.dropdown-menu').offset().left;
      if (this.dropdownView != null) {
        this.dropdownView.close();
        return this.dropdownView = null;
      } else {
        this.$('.dropdown-menu').append('<ul class="dropdown"></ul>');
        this.dropdownView = new MenuDropdownView({
          el: this.$('ul.dropdown')
        }).render();
        this.dropdownView.parent = this;
        menuBarPadding = 14;
        widthDropdown = 252;
        widthIcon = 21;
        left = left - widthDropdown + widthIcon + menuBarPadding;
        return this.$('ul.dropdown').css('left', left);
      }
    };

    return MenuBarView;

  })(Backbone.View);
  
});
window.require.register("views/menu_dropdown_view", function(exports, require, module) {
  var MenuDropdownView, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  module.exports = MenuDropdownView = (function(_super) {
    __extends(MenuDropdownView, _super);

    function MenuDropdownView() {
      _ref = MenuDropdownView.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    MenuDropdownView.prototype.initialize = function() {
      var _this = this;

      $('html').on('click.menudropdownview', function(e) {
        if ($(e.target).get(0) === $('.dropdown-menu').get(0)) {
          return;
        }
        return _this.close();
      });
      return $(document).on("keydown.menudropdownview", function(e) {
        if (e.keyCode === 27) {
          return _this.close();
        }
      });
    };

    MenuDropdownView.prototype.events = {
      'click li': 'clickLink'
    };

    MenuDropdownView.prototype.render = function() {
      this.$el.html("      <li data-link='drafts'>Drafts (" + (app.collections.posts.getDrafts().length) + ")</li>      <li data-link='starred'>Starred</li>      <li data-link='logout'>Logout</li>      ");
      return this;
    };

    MenuDropdownView.prototype.clickLink = function(e) {
      var link;

      link = $(e.currentTarget).data('link');
      if (link === "logout") {
        return window.location = "/logout";
      } else {
        return app.router.navigate("/" + link, true);
      }
    };

    MenuDropdownView.prototype.onClose = function() {
      $('html').off('.menudropdownview');
      $('document').off('.menudropdownview');
      return this.parent.dropdownView = null;
    };

    return MenuDropdownView;

  })(Backbone.View);
  
});
window.require.register("views/offline_status_view", function(exports, require, module) {
  var OfflineStatusView, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  module.exports = OfflineStatusView = (function(_super) {
    __extends(OfflineStatusView, _super);

    function OfflineStatusView() {
      _ref = OfflineStatusView.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    OfflineStatusView.prototype.initialize = function() {
      this.listenTo(app.state, 'change:online', this.toggleOnlineStatus);
      return this.render();
    };

    OfflineStatusView.prototype.render = function() {
      this.$el.show().transition({
        y: '-3em'
      }, 0);
      if ($(document).width() > 650) {
        this.$el.html("App is offline. All changes made while offline will be saved to the server once you reconnect.");
      } else {
        this.$el.html("App is offline");
      }
      return this;
    };

    OfflineStatusView.prototype.toggleOnlineStatus = function(model, online) {
      if (online) {
        this.$el.transition({
          y: '-3em'
        });
        return $('#wrapper').transition({
          y: '0'
        });
      } else {
        this.$el.transition({
          y: 0
        });
        return $('#wrapper').transition({
          y: '3em'
        });
      }
    };

    return OfflineStatusView;

  })(Backbone.View);
  
});
window.require.register("views/post_edit_view", function(exports, require, module) {
  var ExpandingTextareaView, PostEditTemplate, _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  PostEditTemplate = require('views/templates/edit_post');

  ExpandingTextareaView = require('widgets/expanding_textarea/expanding_textarea_view').ExpandingTextareaView;

  exports.PostEditView = (function(_super) {
    __extends(PostEditView, _super);

    function PostEditView() {
      this.draftSave = __bind(this.draftSave, this);
      this.modelSynced = __bind(this.modelSynced, this);
      this._autoscroll = __bind(this._autoscroll, this);    _ref = PostEditView.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    PostEditView.prototype.id = 'post-edit';

    PostEditView.prototype.initialize = function() {
      this.throttledAutoScroll = _.throttle(this._autoscroll, 250);
      return app.models.editing = this.model;
    };

    PostEditView.prototype.events = {
      'click .save': 'save',
      'click .delete': 'delete',
      'click .cancel': 'cancel',
      'click .show-date-edit': 'toggleDateEdit',
      'click .save-draft': 'draftSave',
      'keypress': '_draftSave',
      'keydown .body textarea': 'throttledAutoScroll'
    };

    PostEditView.prototype.render = function() {
      var lines,
        _this = this;

      if (((this.model.get('nid') != null) || (this.model.id != null)) && (this.model.get('body') === "" || this.model.get('title') === "")) {
        this.$el.html("<h2>Loading post... " + (app.templates.throbber('show', '21px')) + " </h2>");
      } else {
        _.defer(function() {
          return _this.lineheight = _this.$('.textareaClone div').css('line-height').slice(0, -2);
        });
        this.keystrokecounter = 0;
        this.$el.html(PostEditTemplate(this.model.toJSON()));
        this.$('.date-edit').kalendae();
        this.addChildView(new ExpandingTextareaView({
          el: this.$('.title'),
          edit_text: this.model.get('title'),
          placeholder: 'Type your title here&hellip;',
          lines: 1
        }).render());
        lines = Math.min(18, Math.round(($(window).height() - 300) / 21));
        this.addChildView(new ExpandingTextareaView({
          el: this.$('.body'),
          edit_text: this.model.get('body'),
          placeholder: 'Start typing your post here&hellip;',
          lines: lines
        }).render());
        _.defer(function() {
          if (_this.options.focusTitle) {
            return _this.$('.title textarea').focus();
          }
        });
        this.$('.date').hover(function() {
          return _this.$('.show-date-edit').show();
        }, function() {
          return _this.$('.show-date-edit').hide();
        });
      }
      return this;
    };

    PostEditView.prototype._autoscroll = function(e) {
      var cursorMax, cursorPosition, distanceTextareaToTop, distanceToBottomOfWindowFromTextarea, distanceToEnd, notInTitle, numCharactersTyped, textareaHeight, _ref1;

      if (Modernizr.touch) {
        return;
      }
      distanceTextareaToTop = (_ref1 = $('.body textarea').offset()) != null ? _ref1.top : void 0;
      textareaHeight = this.$('.body textarea').height();
      distanceToBottomOfWindowFromTextarea = $(window).height() - textareaHeight - (distanceTextareaToTop - $(window).scrollTop());
      cursorPosition = this.$('.body textarea')[0].selectionStart;
      cursorMax = this.$('.body textarea')[0].value.length;
      distanceToEnd = cursorMax - cursorPosition;
      numCharactersTyped = this.$('.body textarea').val().length;
      if ($(document.activeElement).parents('.title').length > 0) {
        notInTitle = false;
      } else {
        notInTitle = true;
      }
      if ((-50 < distanceToBottomOfWindowFromTextarea && distanceToBottomOfWindowFromTextarea < 50) && distanceToEnd < 80 && numCharactersTyped > 400 && notInTitle) {
        $("html, body").animate({
          scrollTop: $(document).height() - $(window).height()
        });
      }
      if (cursorPosition < 5 && $(window).scrollTop() > (distanceTextareaToTop - 150)) {
        return $("html, body").animate({
          scrollTop: Math.max(0, distanceTextareaToTop - 150)
        });
      }
    };

    PostEditView.prototype.errorMessage = function(message) {
      return this.$('.error').html(message).show();
    };

    PostEditView.prototype.save = function() {
      var created, diff, newDate, obj, oldDate, pos;

      obj = {};
      obj.title = _.str.trim(this.$('.title textarea').val());
      obj.body = _.str.trim(this.$('.body textarea').val());
      if (obj.title === "") {
        return this.errorMessage('You are missing your title');
      }
      if (obj.body === "") {
        return this.errorMessage('You are missing the body of your post');
      }
      created = this.$('.date-edit').val();
      newDate = moment(created).hours(12);
      oldDate = moment(this.model.get('created'));
      diff = newDate.diff(oldDate);
      if (Math.abs(diff) > 86400000) {
        obj.created = newDate.format();
      }
      if (!((this.model.get('latitude') != null) || (this.model.get('longitude') != null))) {
        pos = app.geolocation.getLatitudeLongitude();
        obj.latitude = pos.latitude;
        obj.longitude = pos.longitude;
      }
      this.model.set('draft', false);
      this.$('.js-loading').css('display', 'inline-block');
      return this.model.save(obj, {
        success: this.modelSynced,
        error: this.modelSynced
      });
    };

    PostEditView.prototype.modelSynced = function(model, response, options) {
      this.model.collection.add(this.model, {
        silent: true
      });
      app.collections.posts.trigger('reset');
      app.collections.posts.setCacheIds();
      if (!this.options.newPost) {
        return window.history.back();
      } else {
        return app.router.navigate('/node/' + this.model.get('nid'), true);
      }
    };

    PostEditView.prototype["delete"] = function() {
      app.collections.posts.remove(this.model);
      app.collections.posts.sort();
      app.collections.posts.trigger('reset');
      app.router.navigate('/', true);
      return this.model.destroy();
    };

    PostEditView.prototype.cancel = function() {
      return window.history.back();
    };

    PostEditView.prototype.toggleDateEdit = function() {
      this.$('.date').hide();
      return this.$('.date-edit').show();
    };

    PostEditView.prototype._draftSave = function() {
      if (this.options.newPost || this.model.get('draft')) {
        clearTimeout(this.saveDraftAfterDelay);
        this.saveDraftAfterDelay = setTimeout(this.draftSave, 2000);
        this.keystrokecounter += 1;
        if (this.keystrokecounter % 20 === 0) {
          return this.draftSave();
        }
      }
    };

    PostEditView.prototype.draftSave = function() {
      var _this = this;

      this.model.set('title', this.$('.title textarea').val());
      this.model.set('body', this.$('.body textarea').val());
      this.model.set('draft', true);
      return this.model.save(null, {
        success: function(model) {
          return _this.$('#last-saved').html("Last saved at " + new moment().format('h:mm:ss a'));
        }
      });
    };

    PostEditView.prototype.onClose = function() {
      clearTimeout(this.saveDraftAfterDelay);
      return app.models.editing = null;
    };

    return PostEditView;

  })(Backbone.View);
  
});
window.require.register("views/post_view", function(exports, require, module) {
  var PostTemplate, _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  PostTemplate = require('views/templates/post');

  exports.PostView = (function(_super) {
    __extends(PostView, _super);

    function PostView() {
      this.render = __bind(this.render, this);    _ref = PostView.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    PostView.prototype.className = 'post';

    PostView.prototype.initialize = function() {
      this.debouncedRender = _.debounce(this.render, 25);
      this.listenTo(this.model, 'change sync', this.debouncedRender);
      this.listenTo(this.model, 'destroy', this.remove);
      this.listenTo(app.state, 'change:online', function(model, online) {
        if (!online) {
          return this.render();
        }
      });
      if (!this.options.page) {
        this.model.view = this;
      }
      return window.post = this;
    };

    PostView.prototype.events = {
      'dblclick': 'doubleclick',
      'click span.starred': 'toggleStarred'
    };

    PostView.prototype.render = function() {
      var data;

      if (this.model.get('body') !== "" && this.model.get('title') !== "") {
        this.model.renderThings(true);
        data = this.model.toJSON();
        if (this.options.page) {
          data.page = true;
        }
        this.$el.html(PostTemplate(data));
      } else if (!app.state.isOnline()) {
        this.$el.html("<div class='error show'>Sorry, this post can't be loaded while you are offline</div>");
      } else {
        this.$el.html("<h2>Loading post... " + (app.templates.throbber('show', '32px')) + "</h2>");
      }
      this.$("a[href^=http]").each(function() {
        if (this.href.indexOf(location.hostname) === -1) {
          return $(this).attr({
            target: "_blank"
          });
        }
      });
      this.$("img").each(function() {
        var el;

        el = $(this);
        if (_.str.include(el.attr('src'), 'attachments')) {
          return $(this).wrap("<a target='_blank' href='" + (el.attr('src') + "/original") + "' />");
        }
      });
      return this;
    };

    PostView.prototype.doubleclick = function() {
      return app.router.navigate("/node/" + (this.model.get('nid')) + "/edit", true);
    };

    PostView.prototype.toggleStarred = function() {
      if (this.model.get('starred')) {
        return this.model.save('starred', false);
      } else {
        return this.model.save('starred', true);
      }
    };

    return PostView;

  })(Backbone.View);
  
});
window.require.register("views/posts_view", function(exports, require, module) {
  var PostView, PostsTemplate, _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  PostView = require('views/post_view').PostView;

  PostsTemplate = require('views/templates/posts');

  exports.PostsView = (function(_super) {
    __extends(PostsView, _super);

    function PostsView() {
      this.addOne = __bind(this.addOne, this);
      this.render = __bind(this.render, this);    _ref = PostsView.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    PostsView.prototype.id = 'posts';

    PostsView.prototype.initialize = function() {
      var _this = this;

      this.listenTo(this.collection, 'reset', this.render);
      this.listenTo(this.collection, 'add', this.addOne);
      this.listenTo(this.collection, 'loading-posts', this.showLoading);
      this.listenTo(this.collection, 'done-loading-posts', this.hideLoading);
      this.listenTo(app.eventBus, 'pane:show', function() {
        return this.$el.hide();
      });
      this.listenTo(app.eventBus, 'posts:show', function() {
        return this.scrollLastPostion();
      });
      this.listenTo(app.eventBus, 'keydown', function(keycode) {
        if (keycode === 74) {
          _this.scrollNext();
        }
        if (keycode === 75) {
          return _this.scrollPrevious();
        }
      });
      this.listenTo(app.eventBus, 'menuBar:click-home', function() {
        if (_this.isVisible()) {
          return $("html, body").animate({
            scrollTop: 0
          });
        }
      });
      return this.listenTo(app.eventBus, 'distance:bottom_page', (function(distance) {
        if (_this.$el.is(':hidden')) {
          return;
        }
        if (distance <= 1500) {
          return _this.collection.load();
        }
      }), this);
    };

    PostsView.prototype.render = function() {
      var _this = this;

      this.$el.html(PostsTemplate());
      if (this.collection.isLoading) {
        this.showLoading();
      } else {
        this.hideLoading();
      }
      this.addAll();
      _.defer(function() {
        return console.log("rendering postsView", (new Date().getTime() - performance.timing.navigationStart) / 1000);
      });
      return this;
    };

    PostsView.prototype.scrollLastPostion = function() {
      var scrollPosition;

      scrollPosition = app.site.get('postsScroll');
      return $(window).scrollTop(scrollPosition);
    };

    PostsView.prototype.showLoading = function() {
      this.$('#loading-posts').show();
      return this.$('.js-top-loading').show();
    };

    PostsView.prototype.hideLoading = function() {
      this.$('#loading-posts').hide();
      return this.$('.js-top-loading').hide();
    };

    PostsView.prototype.addAll = function() {
      var post, _i, _len, _ref1, _results;

      _ref1 = this.collection.getPosts();
      _results = [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        post = _ref1[_i];
        _results.push(this.addOne(post));
      }
      return _results;
    };

    PostsView.prototype.addOne = function(post) {
      var postView;

      postView = new PostView({
        model: post
      });
      postView.render();
      return this.$('.posts').append(postView.el);
    };

    PostsView.prototype.onClose = function() {
      return app.eventBus.trigger('postsView:active', false);
    };

    PostsView.prototype.scrollNext = function() {
      var nextY;

      nextY = this.collection.posNext();
      if (!_.isUndefined(nextY)) {
        return window.scrollTo(0, nextY - 80);
      }
    };

    PostsView.prototype.scrollPrevious = function() {
      var prevY;

      prevY = this.collection.posPrev();
      if (!_.isUndefined(prevY)) {
        return window.scrollTo(0, prevY - 80);
      }
    };

    PostsView.prototype.isVisible = function() {
      return this.$el.is(':visible');
    };

    return PostsView;

  })(Backbone.View);
  
});
window.require.register("views/result_view", function(exports, require, module) {
  var ResultTemplate, ResultView, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  ResultTemplate = require('views/templates/result');

  module.exports = ResultView = (function(_super) {
    __extends(ResultView, _super);

    function ResultView() {
      _ref = ResultView.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    ResultView.prototype.className = 'search-result';

    ResultView.prototype.events = {
      'click .js-link': 'navigate'
    };

    ResultView.prototype.render = function() {
      var body, title, _ref1, _ref2, _ref3, _ref4;

      if (((_ref1 = this.model.get('highlight').title) != null ? _ref1[0] : void 0) != null) {
        title = (_ref2 = this.model.get('highlight').title) != null ? _ref2[0] : void 0;
      } else {
        title = this.model.get('_source').title;
      }
      if (((_ref3 = this.model.get('highlight').body) != null ? _ref3[0] : void 0) != null) {
        body = (_ref4 = this.model.get('highlight').body) != null ? _ref4[0] : void 0;
      } else {
        body = _.prune(this.model.get('_source').body, 200);
      }
      this.$el.html(ResultTemplate({
        title: title,
        body: body,
        created: moment(this.model.get('_source').created).format("D MMMM YYYY")
      }));
      return this;
    };

    ResultView.prototype.navigate = function() {
      var link;

      link = '/node/' + this.model.get('_source').nid;
      return app.router.navigate(link, true);
    };

    return ResultView;

  })(Backbone.View);
  
});
window.require.register("views/search_view", function(exports, require, module) {
  var ResultView, SearchTemplate, SearchView, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  SearchTemplate = require('views/templates/search');

  ResultView = require('views/result_view');

  module.exports = SearchView = (function(_super) {
    __extends(SearchView, _super);

    function SearchView() {
      _ref = SearchView.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    SearchView.prototype.id = 'search-page';

    SearchView.prototype.initialize = function() {
      var _this = this;

      this.listenTo(this.collection, 'search:complete', this.renderResults);
      this.listenTo(this.collection, 'search:started', this.showThrobber);
      this.listenTo(this.collection, 'search:complete', this.hideThrobber);
      return this.listenTo(app.eventBus, 'distance:scrollTop', function(scrollTop) {
        return _this.collection.scrollTop = scrollTop;
      });
    };

    SearchView.prototype.events = {
      'click button': 'search',
      'keypress input': 'searchByEnter'
    };

    SearchView.prototype.render = function() {
      var _this = this;

      this.$el.html(SearchTemplate());
      this.renderResults();
      _.defer(function() {
        _this.$('input').val(_this.collection.query_str);
        _this.$('input').focus();
        if (_this.collection.scrollTop != null) {
          return $(window).scrollTop(_this.collection.scrollTop);
        }
      });
      return this;
    };

    SearchView.prototype.renderResults = function() {
      var query, result, resultView, _i, _j, _len, _len1, _ref1, _ref2;

      this.$('#search-results').empty();
      if ((this.collection.total != null) && (this.collection.searchtime != null)) {
        this.$('.search-meta').html("" + this.collection.total + " results (" + (this.collection.searchtime / 1000) + " seconds)");
      } else {
        this.$('.search-meta').empty();
      }
      if (this.collection.length) {
        this.$('.js-loading').hide();
        _ref1 = this.collection.models;
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          result = _ref1[_i];
          this.addChildView = resultView = new ResultView({
            model: result
          });
          this.$('#search-results').append(resultView.render().el);
        }
      } else if (this.collection.total === 0) {
        this.$('#search-results').html('<h4>No matches</h4>');
        this.$('.js-loading').hide();
      } else {
        if (this.collection.queries != null) {
          this.$('#search-results').append("<h3>Common queries</h3><ul class='common-queries'>");
          _ref2 = this.collection.queries;
          for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
            query = _ref2[_j];
            this.$('#search-results ul').append("<li><a href='/search/" + query + "'>" + query + "</a></li>");
          }
        }
      }
      return this;
    };

    SearchView.prototype.search = function() {
      var query;

      query = this.$('input').val();
      if (query !== "") {
        this.collection.query(query);
        return app.router.navigate('/search/' + encodeURIComponent(query));
      }
    };

    SearchView.prototype.showThrobber = function() {
      return this.$('.js-loading').css('display', 'inline-block');
    };

    SearchView.prototype.hideThrobber = function() {
      return this.$('.js-loading').hide();
    };

    SearchView.prototype.searchByEnter = function(e) {
      if (e.which === 13) {
        return this.search();
      }
    };

    return SearchView;

  })(Backbone.View);
  
});
window.require.register("views/starred_view", function(exports, require, module) {
  var StarredView, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  module.exports = StarredView = (function(_super) {
    __extends(StarredView, _super);

    function StarredView() {
      _ref = StarredView.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    StarredView.prototype.className = "starred-posts-page";

    StarredView.prototype.initialize = function() {
      return this.listenTo(this.collection, 'sync reset add', this.render);
    };

    StarredView.prototype.events = {
      'click a': 'clickHandler'
    };

    StarredView.prototype.render = function() {
      this.$el.html("<h1>Starred Posts</h1><ul>");
      this.addAll();
      return this;
    };

    StarredView.prototype.addAll = function() {
      var group, grouped, post, week, _results;

      if (this.collection.length === 0) {
        return this.$el.append("<p>Posts you star will show up here!</p>");
      }
      grouped = this.collection.groupBy(function(post) {
        return moment(post.get('created')).local().format('YYYY-M');
      });
      _results = [];
      for (week in grouped) {
        group = grouped[week];
        this.$('ul').append("<h4>" + (moment(group[0].get('created')).local().format("MMMM YYYY")) + "</h4>");
        _results.push((function() {
          var _i, _len, _results1;

          _results1 = [];
          for (_i = 0, _len = group.length; _i < _len; _i++) {
            post = group[_i];
            _results1.push(this.$('ul').append("<li class='link'><a href='node/" + (post.get('nid')) + "'>" + (post.get('title')) + " - <em>" + (moment(post.get('created')).local().format('MMMM D')) + "</em></a></li>"));
          }
          return _results1;
        }).call(this));
      }
      return _results;
    };

    StarredView.prototype.clickHandler = function(e) {
      var href;

      e.preventDefault();
      href = $(e.currentTarget).attr('href');
      return app.router.navigate(href, {
        trigger: true
      });
    };

    return StarredView;

  })(Backbone.View);
  
});
window.require.register("views/templates/drafts", function(exports, require, module) {
  module.exports = function (__obj) {
    if (!__obj) __obj = {};
    var __out = [], __capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return __safe(result);
    }, __sanitize = function(value) {
      if (value && value.ecoSafe) {
        return value;
      } else if (typeof value !== 'undefined' && value != null) {
        return __escape(value);
      } else {
        return '';
      }
    }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
    __safe = __obj.safe = function(value) {
      if (value && value.ecoSafe) {
        return value;
      } else {
        if (!(typeof value !== 'undefined' && value != null)) value = '';
        var result = new String(value);
        result.ecoSafe = true;
        return result;
      }
    };
    if (!__escape) {
      __escape = __obj.escape = function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      };
    }
    (function() {
      (function() {
        __out.push('<h2>Drafts</h2>\n<ul class="drafts"></ul>\n');
      
      }).call(this);
      
    }).call(__obj);
    __obj.safe = __objSafe, __obj.escape = __escape;
    return __out.join('');
  }
});
window.require.register("views/templates/edit_post", function(exports, require, module) {
  module.exports = function (__obj) {
    if (!__obj) __obj = {};
    var __out = [], __capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return __safe(result);
    }, __sanitize = function(value) {
      if (value && value.ecoSafe) {
        return value;
      } else if (typeof value !== 'undefined' && value != null) {
        return __escape(value);
      } else {
        return '';
      }
    }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
    __safe = __obj.safe = function(value) {
      if (value && value.ecoSafe) {
        return value;
      } else {
        if (!(typeof value !== 'undefined' && value != null)) value = '';
        var result = new String(value);
        result.ecoSafe = true;
        return result;
      }
    };
    if (!__escape) {
      __escape = __obj.escape = function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      };
    }
    (function() {
      (function() {
        if (this.nid == null) {
          __out.push('\n  <h3>Create new post <span id="last-saved"></span></h3>\n');
        }
      
        __out.push('\n<div class="error"></div>\n<div class="title expanding-textarea"></div>\n<strong class="date">\n  ');
      
        __out.push(moment(this.created).format('MM/D/YYYY'));
      
        __out.push('\n  <span class="show-date-edit">edit</span>\n</strong>\n<input class="date-edit" value="');
      
        __out.push(moment(this.created).format('MM/D/YYYY'));
      
        __out.push('">\n<div class="body expanding-textarea"></div>\n<button class="save">Save</button>\n');
      
        if (this.nid != null) {
          __out.push('\n<span class="less-important-button cancel">Cancel</span>\n');
        } else {
          __out.push('\n<span class="less-important-button save-draft">Save Draft</span>\n');
        }
      
        __out.push('\n');
      
        __out.push(app.templates.throbber('button-throbber js-loading', '24px'));
      
        __out.push('\n<span class="delete">Delete</span>\n');
      
      }).call(this);
      
    }).call(__obj);
    __obj.safe = __objSafe, __obj.escape = __escape;
    return __out.join('');
  }
});
window.require.register("views/templates/post", function(exports, require, module) {
  module.exports = function (__obj) {
    if (!__obj) __obj = {};
    var __out = [], __capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return __safe(result);
    }, __sanitize = function(value) {
      if (value && value.ecoSafe) {
        return value;
      } else if (typeof value !== 'undefined' && value != null) {
        return __escape(value);
      } else {
        return '';
      }
    }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
    __safe = __obj.safe = function(value) {
      if (value && value.ecoSafe) {
        return value;
      } else {
        if (!(typeof value !== 'undefined' && value != null)) value = '';
        var result = new String(value);
        result.ecoSafe = true;
        return result;
      }
    };
    if (!__escape) {
      __escape = __obj.escape = function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      };
    }
    (function() {
      (function() {
        if (this.page) {
          __out.push('\n  <a class="button post-action" href="node/');
          __out.push(__sanitize(this.nid));
          __out.push('/edit">Edit post</a>\n');
        }
      
        __out.push('\n');
      
        if (this.page) {
          __out.push('\n  <h1>');
          __out.push(__sanitize(this.title));
          __out.push('</h1><span class="starred">');
          if (this.starred) {
            __out.push('starred');
          } else {
            __out.push('not starred');
          }
          __out.push('</span>\n');
        } else {
          __out.push('\n  <h1><a href="node/');
          __out.push(this.nid);
          __out.push('">');
          __out.push(__sanitize(this.title));
          __out.push('</a></h1>\n');
        }
      
        __out.push('\n<small class="post-date">');
      
        __out.push(this.rendered_created);
      
        __out.push('</small>\n');
      
        if (this.page) {
          __out.push('\n');
          __out.push(this.rendered_body);
          __out.push('\n');
        } else {
          __out.push('\n');
          __out.push(this.readMore);
          __out.push('\n');
        }
      
        __out.push('\n');
      
      }).call(this);
      
    }).call(__obj);
    __obj.safe = __objSafe, __obj.escape = __escape;
    return __out.join('');
  }
});
window.require.register("views/templates/posts", function(exports, require, module) {
  module.exports = function (__obj) {
    if (!__obj) __obj = {};
    var __out = [], __capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return __safe(result);
    }, __sanitize = function(value) {
      if (value && value.ecoSafe) {
        return value;
      } else if (typeof value !== 'undefined' && value != null) {
        return __escape(value);
      } else {
        return '';
      }
    }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
    __safe = __obj.safe = function(value) {
      if (value && value.ecoSafe) {
        return value;
      } else {
        if (!(typeof value !== 'undefined' && value != null)) value = '';
        var result = new String(value);
        result.ecoSafe = true;
        return result;
      }
    };
    if (!__escape) {
      __escape = __obj.escape = function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      };
    }
    (function() {
      (function() {
        __out.push(app.templates.throbber('js-top-loading global-loading', '24px'));
      
        __out.push('\n<a class="button post-action" href="/posts/new">New post</a>\n<div class="posts"></div>\n<div id="loading-posts">\n  <em>Loading posts...</em> ');
      
        __out.push(app.templates.throbber('show js-loading', '24px'));
      
        __out.push('\n</div>\n');
      
      }).call(this);
      
    }).call(__obj);
    __obj.safe = __objSafe, __obj.escape = __escape;
    return __out.join('');
  }
});
window.require.register("views/templates/result", function(exports, require, module) {
  module.exports = function (__obj) {
    if (!__obj) __obj = {};
    var __out = [], __capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return __safe(result);
    }, __sanitize = function(value) {
      if (value && value.ecoSafe) {
        return value;
      } else if (typeof value !== 'undefined' && value != null) {
        return __escape(value);
      } else {
        return '';
      }
    }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
    __safe = __obj.safe = function(value) {
      if (value && value.ecoSafe) {
        return value;
      } else {
        if (!(typeof value !== 'undefined' && value != null)) value = '';
        var result = new String(value);
        result.ecoSafe = true;
        return result;
      }
    };
    if (!__escape) {
      __escape = __obj.escape = function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      };
    }
    (function() {
      (function() {
        __out.push('<h3><span class="js-link link">');
      
        __out.push(this.title);
      
        __out.push('</span> <span class="created">– ');
      
        __out.push(this.created);
      
        __out.push('</span></h3>\n<p>');
      
        __out.push(this.body);
      
        __out.push('</p>\n');
      
      }).call(this);
      
    }).call(__obj);
    __obj.safe = __objSafe, __obj.escape = __escape;
    return __out.join('');
  }
});
window.require.register("views/templates/search", function(exports, require, module) {
  module.exports = function (__obj) {
    if (!__obj) __obj = {};
    var __out = [], __capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return __safe(result);
    }, __sanitize = function(value) {
      if (value && value.ecoSafe) {
        return value;
      } else if (typeof value !== 'undefined' && value != null) {
        return __escape(value);
      } else {
        return '';
      }
    }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
    __safe = __obj.safe = function(value) {
      if (value && value.ecoSafe) {
        return value;
      } else {
        if (!(typeof value !== 'undefined' && value != null)) value = '';
        var result = new String(value);
        result.ecoSafe = true;
        return result;
      }
    };
    if (!__escape) {
      __escape = __obj.escape = function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      };
    }
    (function() {
      (function() {
        __out.push('<h1>Search</h1>\n<input type=\'text\'><button>Search</button>\n');
      
        __out.push(app.templates.throbber('button-throbber js-loading', '24px'));
      
        __out.push('\n<p class="search-meta"></p>\n<div id="search-results"></div>\n');
      
      }).call(this);
      
    }).call(__obj);
    __obj.safe = __objSafe, __obj.escape = __escape;
    return __out.join('');
  }
});
window.require.register("widgets/expanding_textarea/expanding", function(exports, require, module) {
  // Expanding Textareas
  // https://github.com/bgrins/ExpandingTextareas

  (function(factory) {
      // Add jQuery via AMD registration or browser globals
      if (typeof define === 'function' && define.amd) {
          define([ 'jquery' ], factory);
      }
      else {
          factory(jQuery);
      }
  }(function ($) {
      $.expandingTextarea = $.extend({
          autoInitialize: true,
          initialSelector: "textarea.expanding"
      }, $.expandingTextarea || {});

      var cloneCSSProperties = [
          'lineHeight', 'textDecoration', 'letterSpacing',
          'fontSize', 'fontFamily', 'fontStyle',
          'fontWeight', 'textTransform', 'textAlign',
          'direction', 'wordSpacing', 'fontSizeAdjust',
          'wordWrap',
          'borderLeftWidth', 'borderRightWidth',
          'borderTopWidth','borderBottomWidth',
          'paddingLeft', 'paddingRight',
          'paddingTop','paddingBottom',
          'marginLeft', 'marginRight',
          'marginTop','marginBottom',
          'boxSizing', 'webkitBoxSizing', 'mozBoxSizing', 'msBoxSizing'
      ];

      var textareaCSS = {
          position: "absolute",
          height: "100%",
          resize: "none"
      };

      var preCSS = {
          visibility: "hidden",
          border: "0 solid",
          whiteSpace: "pre-wrap"
      };

      var containerCSS = {
          position: "relative"
      };

      function resize() {
          $(this).closest('.expandingText').find("div").text(this.value + ' ');
      }

      $.fn.expandingTextarea = function(o) {

          if (o === "resize") {
              return this.trigger("input.expanding");
          }

          if (o === "destroy") {
              this.filter(".expanding-init").each(function() {
                  var textarea = $(this).removeClass('expanding-init');
                  var container = textarea.closest('.expandingText');

                  container.before(textarea).remove();
                  textarea
                      .attr('style', textarea.data('expanding-styles') || '')
                      .removeData('expanding-styles');
              });

              return this;
          }

          this.filter("textarea").not(".expanding-init").each(function() {
              var textarea = $(this).addClass("expanding-init");

              textarea.wrap("<div class='expandingText'></div>");
              textarea.after("<pre class='textareaClone'><div></div></pre>");

              var container = textarea.parent().css(containerCSS);
              var pre = container.find("pre").css(preCSS);

              // Store the original styles in case of destroying.
              textarea.data('expanding-styles', textarea.attr('style'));
              textarea.css(textareaCSS);

              $.each(cloneCSSProperties, function(i, p) {
                  var val = textarea.css(p);

                  // Only set if different to prevent overriding percentage css values.
                  if (pre.css(p) !== val) {
                      pre.css(p, val);
                  }
              });

              textarea.bind("input.expanding propertychange.expanding", resize);
              resize.apply(this);
          });

          return this;
      };

      $(function () {
          if ($.expandingTextarea.autoInitialize) {
              $($.expandingTextarea.initialSelector).expandingTextarea();
          }
      });

  }));
  
});
window.require.register("widgets/expanding_textarea/expanding_textarea", function(exports, require, module) {
  module.exports = function (__obj) {
    if (!__obj) __obj = {};
    var __out = [], __capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return __safe(result);
    }, __sanitize = function(value) {
      if (value && value.ecoSafe) {
        return value;
      } else if (typeof value !== 'undefined' && value != null) {
        return __escape(value);
      } else {
        return '';
      }
    }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
    __safe = __obj.safe = function(value) {
      if (value && value.ecoSafe) {
        return value;
      } else {
        if (!(typeof value !== 'undefined' && value != null)) value = '';
        var result = new String(value);
        result.ecoSafe = true;
        return result;
      }
    };
    if (!__escape) {
      __escape = __obj.escape = function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      };
    }
    (function() {
      (function() {
        __out.push('<textarea class="input" placeholder="');
      
        __out.push(this.placeholder);
      
        __out.push('">');
      
        __out.push(__sanitize(this.edit_text));
      
        __out.push('</textarea>\n');
      
      }).call(this);
      
    }).call(__obj);
    __obj.safe = __objSafe, __obj.escape = __escape;
    return __out.join('');
  }
});
window.require.register("widgets/expanding_textarea/expanding_textarea_view", function(exports, require, module) {
  var $, expandingTextarea, _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  $ = jQuery;

  expandingTextarea = require('widgets/expanding_textarea/expanding_textarea');

  exports.ExpandingTextareaView = (function(_super) {
    __extends(ExpandingTextareaView, _super);

    function ExpandingTextareaView() {
      this.makeAreaExpandable = __bind(this.makeAreaExpandable, this);
      this.render = __bind(this.render, this);    _ref = ExpandingTextareaView.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    ExpandingTextareaView.prototype.render = function() {
      var cloneCSSProperties, context, k, v, _ref1,
        _this = this;

      context = {};
      _ref1 = this.options;
      for (k in _ref1) {
        v = _ref1[k];
        context[k] = v;
      }
      this.$el.html(expandingTextarea(context));
      this.makeAreaExpandable(context.lines);
      cloneCSSProperties = ['lineHeight', 'textDecoration', 'letterSpacing', 'fontSize', 'fontFamily', 'fontStyle', 'fontWeight', 'textTransform', 'textAlign', 'direction', 'wordSpacing', 'fontSizeAdjust', 'wordWrap', 'borderLeftWidth', 'borderRightWidth', 'borderTopWidth', 'borderBottomWidth', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'marginLeft', 'marginRight', 'marginTop', 'marginBottom', 'boxSizing', 'webkitBoxSizing', 'mozBoxSizing', 'msBoxSizing'];
      _.defer(function() {
        var pre, textarea;

        textarea = _this.$('textarea');
        pre = _this.$('pre');
        return $.each(cloneCSSProperties, function(i, p) {
          var val;

          val = textarea.css(p);
          if (pre.css(p) !== val) {
            return pre.css(p, val);
          }
        });
      });
      return this;
    };

    ExpandingTextareaView.prototype.makeAreaExpandable = function(lines) {
      var _this = this;

      this.$('textarea').expandingTextarea();
      return _.defer(function() {
        var fontSize, height, paddingBottom, paddingTop;

        if (lines == null) {
          lines = 1;
        }
        fontSize = parseInt(_this.$('textarea').css('font-size').slice(0, -2), 10);
        paddingTop = parseInt(_this.$('textarea').css('padding-top').slice(0, -2), 10);
        paddingBottom = parseInt(_this.$('textarea').css('padding-bottom').slice(0, -2), 10);
        height = (lines * 1.5) + (paddingTop + paddingBottom) / fontSize;
        height = height + "em";
        _this.$('textarea').css({
          'min-height': height
        });
        _this.$('.textareaClone').css({
          'min-height': height
        });
        _this.$el.addClass('active');
        return _.defer(function() {
          return _this.$('textarea').trigger('input');
        });
      });
    };

    return ExpandingTextareaView;

  })(Backbone.View);
  
});
