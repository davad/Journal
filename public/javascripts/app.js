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
  
});
window.require.register("collections/drafts", function(exports, require, module) {
  var Draft, Drafts,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Draft = require('models/draft');

  module.exports = Drafts = (function(_super) {

    __extends(Drafts, _super);

    function Drafts() {
      return Drafts.__super__.constructor.apply(this, arguments);
    }

    Drafts.prototype.url = '/drafts';

    Drafts.prototype.model = Draft;

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
  var Post,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Post = require('models/post');

  exports.Posts = (function(_super) {

    __extends(Posts, _super);

    function Posts() {
      return Posts.__super__.constructor.apply(this, arguments);
    }

    Posts.prototype.url = '/posts';

    Posts.prototype.model = Post;

    Posts.prototype.sync = Backbone.cachingSync(Backbone.sync, 'posts', null, true);

    Posts.prototype.initialize = function() {
      var _this = this;
      this.lastPost = "";
      this.timesLoaded = 0;
      this.loading(false);
      this.on('set_cache_ids', this.setCacheIds);
      this.postsViewActive = false;
      this.setMaxOldPostFromCollection = _.once(function() {
        return _this.maxOld = _this.max(function(post) {
          return moment(post.get('created')).unix();
        });
      });
      return app.eventBus.on('visibilitychange', function(state) {
        if (state === "visible") {
          if (moment().diff(moment(_this.lastFetch), 'minutes') > 15) {
            return _this.loadChangesSinceLastFetch();
          }
        }
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

    Posts.prototype.loadChangesSinceLastFetch = function() {
      var _this = this;
      return this.fetch({
        update: true,
        remove: false,
        data: {
          changed: this.lastFetch,
          oldest: this.lastPost
        },
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
          success: function(collection, response, options) {
            var fromCache;
            _this.timesLoaded += 1;
            if ((response[0] != null) && response[0].id === _this.first().id) {
              fromCache = true;
            }
            if (_.last(response) == null) {
              return;
            }
            _this.lastFetch = new Date().toJSON();
            if (_.isString(response)) {
              app.eventBus.off(null, null, _this);
              _this.loading(false);
              return;
            }
            _this.resetCollection(response);
            _this.newLastPost = _.last(response)['created'];
            if (_this.newLastPost < _this.lastPost || _this.lastPost === "") {
              _this.lastPost = _this.newLastPost;
            }
            if (!fromCache) {
              _this.loading(false);
            }
            if (_this.timesLoaded === 2) {
              _this.loading(false);
            }
            return _.defer(function() {
              return _this.setCacheIds();
            });
          }
        });
      }
    };

    Posts.prototype.resetCollection = function(response) {
      var maxNew,
        _this = this;
      this.setMaxOldPostFromCollection();
      maxNew = _.max(response, function(post) {
        return moment(post.created).unix();
      });
      if ((this.maxOld != null) && (maxNew != null) && this.maxOld.get('created') < maxNew.created) {
        this.maxOld = this.first();
        return _.defer(function() {
          return _this.trigger('reset');
        });
      }
    };

    Posts.prototype.setCacheIds = function() {
      return this.burry.set('__ids__', _.pluck(this.first(10), 'id'));
    };

    return Posts;

  })(Backbone.Collection);
  
});
window.require.register("collections/posts_cache", function(exports, require, module) {
  var PostsCache,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  module.exports = PostsCache = (function(_super) {

    __extends(PostsCache, _super);

    function PostsCache() {
      return PostsCache.__super__.constructor.apply(this, arguments);
    }

    PostsCache.prototype.getByNid = function(nid) {
      nid = parseInt(nid, 10);
      return this.find(function(post) {
        return post.get('nid') === nid;
      });
    };

    return PostsCache;

  })(Backbone.Collection);
  
});
window.require.register("collections/search", function(exports, require, module) {
  var Result, Search,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Result = require('models/result');

  module.exports = Search = (function(_super) {

    __extends(Search, _super);

    function Search() {
      return Search.__super__.constructor.apply(this, arguments);
    }

    Search.prototype.model = Result;

    Search.prototype.query = function(query) {
      var start,
        _this = this;
      this.query_str = query;
      start = new Date();
      this.reset();
      if (query !== "") {
        return app.util.search(query, function(results) {
          var entry, year, _i, _len, _ref, _results;
          _this.searchtime = new Date() - start;
          _this.total = results.hits.total;
          _this.max_score = results.hits.max_score;
          _this.reset(results.hits.hits);
          _ref = results.facets.year.entries;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            entry = _ref[_i];
            year = moment.utc(entry.time).year();
            _results.push(console.log(year + ": " + entry.count));
          }
          return _results;
        });
      }
    };

    Search.prototype.clear = function() {
      this.reset();
      this.searchtime = null;
      this.max_score = null;
      this.total = null;
      return this.query_str = null;
    };

    return Search;

  })(Backbone.Collection);
  
});
window.require.register("file_drop_handler", function(exports, require, module) {
  var createAttachment;

  $('body').dropArea();

  $('body').on('drop', function(e) {
    var file, files, _i, _len, _results;
    e.preventDefault();
    e = e.originalEvent;
    console.log($('.body textarea').length);
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

      this.success = __bind(this.success, this);
      if (navigator.geolocation) {
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
      return {
        latitude: this.position.coords.latitude,
        longitude: this.position.coords.longitude
      };
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
      } else if (app.collections.postsCache.getByNid(id)) {
        return app.collections.postsCache.getByNid(id);
      } else {
        post = new Post({
          nid: id,
          id: null
        });
        post.fetch({
          nid: id
        });
        app.collections.postsCache.add(post);
        return post;
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
    var currentPosition, throttled;
    currentPosition = function() {
      if (window.location.pathname === '/') {
        return app.site.set({
          postsScroll: $(window).scrollTop()
        });
      }
    };
    throttled = _.throttle(currentPosition, 500);
    return $(window).scroll(throttled);
  };

  exports.search = function(query, callback) {
    return $.getJSON('/search/' + query, function(data) {
      return callback(data);
    });
  };

  $(function() {
    var reportNearBottom, throttled;
    reportNearBottom = function() {
      return app.eventBus.trigger('distance:bottom_page', ($(document).height() - $(window).height()) - $(window).scrollTop());
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
window.require.register("initialize", function(exports, require, module) {
  var BrunchApplication, Drafts, DraftsIndicatorView, MainRouter, MainView, Posts, PostsCache, PostsView, Search, clickHandler, loadPostModel, scrollPosition, search, throbber, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ref = require('helpers'), BrunchApplication = _ref.BrunchApplication, loadPostModel = _ref.loadPostModel, clickHandler = _ref.clickHandler, scrollPosition = _ref.scrollPosition, search = _ref.search, throbber = _ref.throbber;

  MainRouter = require('routers/main_router').MainRouter;

  MainView = require('views/main_view').MainView;

  PostsView = require('views/posts_view').PostsView;

  Posts = require('collections/posts').Posts;

  PostsCache = require('collections/posts_cache');

  Drafts = require('collections/drafts');

  DraftsIndicatorView = require('views/drafts_indicator_view');

  Search = require('collections/search');

  require('backbone_extensions');

  require('file_drop_handler');

  require('keyboard_shortcuts');

  exports.Application = (function(_super) {

    __extends(Application, _super);

    function Application() {
      return Application.__super__.constructor.apply(this, arguments);
    }

    Application.prototype.initialize = function() {
      var postsView;
      _.mixin(_.str.exports());
      this.collections = {};
      this.views = {};
      this.util = {};
      this.templates = {};
      this.geolocation = require('geolocation');
      this.util.loadPostModel = loadPostModel;
      this.util.clickHandler = clickHandler;
      this.util.search = search;
      this.templates.throbber = throbber;
      marked.setOptions({
        smartLists: true
      });
      this.site = new Backbone.Model;
      this.router = new MainRouter;
      this.eventBus = _.extend({}, Backbone.Events);
      this.collections.posts = new Posts;
      this.collections.posts.load(true);
      this.collections.postsCache = new PostsCache;
      this.collections.drafts = new Drafts;
      this.collections.drafts.fetch();
      this.collections.search = new Search;
      this.views.main = new MainView({
        el: $('#container')
      });
      postsView = new PostsView({
        collection: app.collections.posts,
        el: $('#posts')
      });
      postsView.render();
      this.views.draftsIndicatorView = new DraftsIndicatorView({
        el: $('#menu-container .drafts'),
        collection: this.collections.drafts
      }).render();
      scrollPosition();
      return $(window).on('click', app.util.clickHandler);
    };

    return Application;

  })(BrunchApplication);

  if (location.pathname !== '/login') {
    window.app = new exports.Application;
  }
  
});
window.require.register("keyboard_shortcuts", function(exports, require, module) {
  
  $(document).on('keydown', 'textarea, input', function(e) {
    if (e.which === 27) {
      return $(e.currentTarget).blur();
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
  var Draft,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  module.exports = Draft = (function(_super) {

    __extends(Draft, _super);

    function Draft() {
      return Draft.__super__.constructor.apply(this, arguments);
    }

    return Draft;

  })(Backbone.Model);
  
});
window.require.register("models/post", function(exports, require, module) {
  var Post,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  module.exports = Post = (function(_super) {

    __extends(Post, _super);

    function Post() {
      return Post.__super__.constructor.apply(this, arguments);
    }

    Post.prototype.defaults = {
      title: '',
      body: '',
      created: new Date().toISOString()
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
      return this.on('request', function() {
        if ((this.get('body') != null) && (this.get('title') != null)) {
          return this.renderThings(true);
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
        rendered_created: moment(this.get('created')).format("dddd, MMMM Do YYYY")
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

    return Post;

  })(Backbone.Model);
  
});
window.require.register("models/result", function(exports, require, module) {
  var Result,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  module.exports = Result = (function(_super) {

    __extends(Result, _super);

    function Result() {
      return Result.__super__.constructor.apply(this, arguments);
    }

    return Result;

  })(Backbone.Model);
  
});
window.require.register("routers/main_router", function(exports, require, module) {
  var Draft, Post, PostEditView, PostView, PostsView, SearchView,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  PostsView = require('views/posts_view').PostsView;

  PostView = require('views/post_view').PostView;

  PostEditView = require('views/post_edit_view').PostEditView;

  Post = require('models/post');

  Draft = require('models/draft');

  SearchView = require('views/search_view');

  exports.MainRouter = (function(_super) {

    __extends(MainRouter, _super);

    function MainRouter() {
      return MainRouter.__super__.constructor.apply(this, arguments);
    }

    MainRouter.prototype.initialize = function() {
      var _this = this;
      key('s,/', function() {
        return _this.search();
      });
      key('h', function() {
        return _this.home();
      });
      return key('n', function() {
        return _this.newPost(true);
      });
    };

    MainRouter.prototype.routes = {
      '': 'home',
      'node/:id': 'post',
      'posts/new': 'newPost',
      'node/:id/edit': 'editPost',
      'drafts/:id': 'editDraft',
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
      var draftModel, newPost, postEditView;
      if (focusTitle == null) {
        focusTitle = false;
      }
      document.body.scrollTop = document.documentElement.scrollTop = 0;
      newPost = new Post({}, {
        collection: app.collections.posts
      });
      draftModel = new Draft({}, {
        collection: app.collections.drafts
      });
      postEditView = new PostEditView({
        model: newPost,
        draftModel: draftModel,
        focusTitle: focusTitle
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

    MainRouter.prototype.editDraft = function(id) {
      var draftModel, newPost, postEditView;
      draftModel = app.collections.drafts.get(id);
      newPost = new Post;
      newPost.collection = app.collections.posts;
      newPost.set({
        title: draftModel.get('title'),
        body: draftModel.get('body'),
        created: draftModel.get('created'),
        changed: draftModel.get('changed')
      });
      postEditView = new PostEditView({
        model: newPost,
        draftModel: draftModel
      });
      return app.views.main.show(postEditView);
    };

    MainRouter.prototype.search = function(query) {
      var searchView;
      if (query == null) {
        query = "";
      }
      query = decodeURIComponent(query);
      if (query !== "") {
        app.collections.search.query(query);
      } else {
        app.collections.search.clear();
      }
      searchView = new SearchView({
        collection: app.collections.search
      });
      return app.views.main.show(searchView);
    };

    return MainRouter;

  })(Backbone.Router);
  
});
window.require.register("views/drafts_indicator_view", function(exports, require, module) {
  var DraftsIndicatorView,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  module.exports = DraftsIndicatorView = (function(_super) {

    __extends(DraftsIndicatorView, _super);

    function DraftsIndicatorView() {
      return DraftsIndicatorView.__super__.constructor.apply(this, arguments);
    }

    DraftsIndicatorView.prototype.initialize = function() {
      return this.listenTo(this.collection, 'all', this.update);
    };

    DraftsIndicatorView.prototype.events = {
      'click': 'toggleDropdown',
      'click .dropdown li': 'gotoDraftEditPage'
    };

    DraftsIndicatorView.prototype.render = function() {
      return this.update();
    };

    DraftsIndicatorView.prototype.update = function() {
      this.$('.count').html(this.collection.length);
      this.renderDrafts();
      if (this.collection.length > 0) {
        return this.$el.addClass('active');
      } else {
        return this.$el.removeClass('active');
      }
    };

    DraftsIndicatorView.prototype.renderDrafts = function() {
      var draft, _i, _len, _ref, _results;
      this.$('ul.dropdown').empty();
      _ref = this.collection.models;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        draft = _ref[_i];
        _results.push(this.$('ul.dropdown').append("<li data-draft-id='" + (draft.get('id')) + "'>" + (draft.get('title')) + " <em>" + (moment(draft.get('created')).fromNow()) + "</em></li>"));
      }
      return _results;
    };

    DraftsIndicatorView.prototype.toggleDropdown = function() {
      if (this.collection.length > 0) {
        this.renderDrafts();
        return this.$el.toggleClass('dropdown-active');
      }
    };

    DraftsIndicatorView.prototype.gotoDraftEditPage = function(e) {
      var draftId;
      draftId = $(e.target).closest('li').data('draft-id');
      return app.router.navigate('drafts/' + draftId, true);
    };

    return DraftsIndicatorView;

  })(Backbone.View);
  
});
window.require.register("views/main_view", function(exports, require, module) {
  var RegionManager,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  RegionManager = require('mixins/region_manager').RegionManager;

  exports.MainView = (function(_super) {

    __extends(MainView, _super);

    function MainView() {
      return MainView.__super__.constructor.apply(this, arguments);
    }

    return MainView;

  })(Backbone.View);

  exports.MainView.prototype = _.extend(exports.MainView.prototype, RegionManager);
  
});
window.require.register("views/post_edit_view", function(exports, require, module) {
  var ExpandingTextareaView, PostEditTemplate,
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

      this._autoscroll = __bind(this._autoscroll, this);
      return PostEditView.__super__.constructor.apply(this, arguments);
    }

    PostEditView.prototype.id = 'post-edit';

    PostEditView.prototype.initialize = function() {
      return this.throttledAutoScroll = _.throttle(this._autoscroll, 200);
    };

    PostEditView.prototype.events = {
      'click .save': 'save',
      'click .delete': 'delete',
      'click .cancel': 'cancel',
      'click .show-date-edit': 'toggleDateEdit',
      'click .save-draft': 'draftSave',
      'keypress': '_draftSave',
      'keydown .body textarea': 'throttledAutoScrollCallback'
    };

    PostEditView.prototype.render = function() {
      var _this = this;
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
        this.addChildView(new ExpandingTextareaView({
          el: this.$('.body'),
          edit_text: this.model.get('body'),
          placeholder: 'Start typing your post here&hellip;',
          lines: 20
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

    PostEditView.prototype.throttledAutoScrollCallback = function() {
      return this.throttledAutoScroll();
    };

    PostEditView.prototype._autoscroll = function(e) {
      var cursorMax, cursorPosition, distanceTextareaToTop, distanceToBottomFromTextarea, distanceToEnd, notInTitle, numCharactersTyped, textareaHeight;
      distanceTextareaToTop = $('.body textarea').offset().top - $(document).scrollTop();
      textareaHeight = this.$('.body textarea').height();
      distanceToBottomFromTextarea = $(window).height() - textareaHeight - distanceTextareaToTop;
      cursorPosition = this.$('.body textarea')[0].selectionStart;
      cursorMax = this.$('.body textarea')[0].value.length;
      distanceToEnd = cursorMax - cursorPosition;
      numCharactersTyped = this.$('.body textarea').val().length;
      if ($(document.activeElement).parents('.title').length > 0) {
        notInTitle = false;
      } else {
        notInTitle = true;
      }
      if ((-50 < distanceToBottomFromTextarea && distanceToBottomFromTextarea < 50) && distanceToEnd < 80 && numCharactersTyped > 400 && notInTitle) {
        $("html, body").animate({
          scrollTop: $(document).height() - $(window).height()
        });
      }
      if (cursorPosition < 200) {
        return $("html, body").animate({
          scrollTop: 0
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
      this.$('.js-loading').css('display', 'inline-block');
      return this.model.save(obj, {
        success: this.modelSynced
      });
    };

    PostEditView.prototype.modelSynced = function(model, response, options) {
      var newPost;
      if (this.options.draftModel != null) {
        this.options.draftModel.destroy();
        newPost = true;
      }
      this.model.collection.add(this.model, {
        silent: true
      });
      app.collections.posts.trigger('reset');
      app.collections.posts.burry.set(model.id, model.toJSON());
      app.collections.posts.setCacheIds();
      if (!newPost) {
        return window.history.back();
      } else {
        return app.router.navigate('/node/' + this.model.get('nid'), true);
      }
    };

    PostEditView.prototype["delete"] = function() {
      var _this = this;
      app.collections.posts.remove(this.model);
      app.collections.posts.sort();
      app.collections.posts.trigger('reset');
      app.router.navigate('/', true);
      if (this.options.draftModel != null) {
        this.options.draftModel.destroy();
      }
      return this.model.save({
        deleted: true
      }, {
        success: function() {
          return app.collections.posts.trigger('set_cache_ids');
        }
      });
    };

    PostEditView.prototype.cancel = function() {
      return window.history.back();
    };

    PostEditView.prototype.toggleDateEdit = function() {
      this.$('.date').hide();
      return this.$('.date-edit').show();
    };

    PostEditView.prototype._draftSave = function() {
      if (this.options.draftModel != null) {
        clearTimeout(this.saveDraftAfterDelay);
        this.saveDraftAfterDelay = setTimeout(this.draftSave, 2000);
        this.keystrokecounter += 1;
        if (this.keystrokecounter % 20 === 0) {
          return this.draftSave();
        }
      }
    };

    PostEditView.prototype.draftSave = function(e) {
      var obj,
        _this = this;
      if (this.options.draftModel != null) {
        obj = {};
        obj.title = this.$('.title textarea').val();
        obj.body = this.$('.body textarea').val();
        return this.options.draftModel.save(obj, {
          success: function(model) {
            app.collections.drafts.add(model, {
              merge: true
            });
            return _this.$('#last-saved').html("Last saved at " + new moment().format('h:mm:ss a'));
          }
        });
      }
    };

    PostEditView.prototype.onClose = function() {
      return clearTimeout(this.saveDraftAfterDelay);
    };

    return PostEditView;

  })(Backbone.View);
  
});
window.require.register("views/post_view", function(exports, require, module) {
  var PostTemplate,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  PostTemplate = require('views/templates/post');

  exports.PostView = (function(_super) {

    __extends(PostView, _super);

    function PostView() {
      this.render = __bind(this.render, this);
      return PostView.__super__.constructor.apply(this, arguments);
    }

    PostView.prototype.className = 'post';

    PostView.prototype.initialize = function() {
      this.debouncedRender = _.debounce(this.render, 25);
      this.listenTo(this.model, 'change', this.debouncedRender);
      return window.post = this;
    };

    PostView.prototype.events = {
      'dblclick': 'doubleclick'
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

    return PostView;

  })(Backbone.View);
  
});
window.require.register("views/posts_view", function(exports, require, module) {
  var PostView, PostsTemplate,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  PostView = require('views/post_view').PostView;

  PostsTemplate = require('views/templates/posts');

  exports.PostsView = (function(_super) {

    __extends(PostsView, _super);

    function PostsView() {
      this.addOne = __bind(this.addOne, this);

      this.render = __bind(this.render, this);
      return PostsView.__super__.constructor.apply(this, arguments);
    }

    PostsView.prototype.id = 'posts';

    PostsView.prototype.initialize = function() {
      var _this = this;
      this.debouncedCachePostPositions = _.debounce((function() {
        return _this.cachePostPositions();
      }), 100);
      this.listenTo(this.collection, 'reset add remove', this.debouncedCachePostPositions);
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
      app.eventBus.on('distance:bottom_page', (function(distance) {
        if (_this.$el.is(':hidden')) {
          return;
        }
        if (distance <= 1500) {
          return _this.collection.load();
        }
      }), this);
      key('j', function() {
        return _this.scrollNext();
      });
      return key('k', function() {
        return _this.scrollPrevious();
      });
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
        console.log((new Date().getTime() - performance.timing.navigationStart) / 1000);
        return _this.debouncedCachePostPositions();
      });
      return this;
    };

    PostsView.prototype.scrollLastPostion = function() {
      var scrollPosition;
      scrollPosition = app.site.get('postsScroll');
      return $(window).scrollTop(scrollPosition);
    };

    PostsView.prototype.showLoading = function() {
      return this.$('#loading-posts').show();
    };

    PostsView.prototype.hideLoading = function() {
      return this.$('#loading-posts').hide();
    };

    PostsView.prototype.addAll = function() {
      var post, _i, _len, _ref, _results;
      _ref = this.collection.models;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        post = _ref[_i];
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

    PostsView.prototype.cachePostPositions = function() {
      var post, _i, _len, _ref, _results;
      this.postPositions = [];
      _ref = this.$('.post');
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        post = _ref[_i];
        _results.push(this.postPositions.push($(post).offset().top));
      }
      return _results;
    };

    PostsView.prototype.scrollNext = function() {
      var curPosition, nextY;
      curPosition = $(window).scrollTop() + 81;
      nextY = _.find(this.postPositions, function(y) {
        return curPosition < y;
      });
      return window.scrollTo(0, nextY - 80);
    };

    PostsView.prototype.scrollPrevious = function() {
      var copyPostPostions, curPosition, nextY;
      curPosition = $(window).scrollTop() + 79;
      copyPostPostions = this.postPositions.slice(0).reverse();
      nextY = _.find(copyPostPostions, function(y) {
        return curPosition > y;
      });
      return window.scrollTo(0, nextY - 80);
    };

    return PostsView;

  })(Backbone.View);
  
});
window.require.register("views/result_view", function(exports, require, module) {
  var ResultTemplate, ResultView,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  ResultTemplate = require('views/templates/result');

  module.exports = ResultView = (function(_super) {

    __extends(ResultView, _super);

    function ResultView() {
      return ResultView.__super__.constructor.apply(this, arguments);
    }

    ResultView.prototype.className = 'search-result';

    ResultView.prototype.render = function() {
      var body, title, _ref, _ref1, _ref2, _ref3;
      if (((_ref = this.model.get('highlight').title) != null ? _ref[0] : void 0) != null) {
        title = (_ref1 = this.model.get('highlight').title) != null ? _ref1[0] : void 0;
      } else {
        title = this.model.get('_source').title;
      }
      if (((_ref2 = this.model.get('highlight').body) != null ? _ref2[0] : void 0) != null) {
        body = (_ref3 = this.model.get('highlight').body) != null ? _ref3[0] : void 0;
      } else {
        body = _.prune(this.model.get('_source').body, 200);
      }
      this.$el.html(ResultTemplate({
        title: title,
        body: body,
        created: moment(this.model.get('_source').created).format("D MMMM YYYY"),
        link: '/node/' + this.model.get('_source').nid
      }));
      return this;
    };

    return ResultView;

  })(Backbone.View);
  
});
window.require.register("views/search_view", function(exports, require, module) {
  var ResultView, SearchTemplate, SearchView,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  SearchTemplate = require('views/templates/search');

  ResultView = require('views/result_view');

  module.exports = SearchView = (function(_super) {

    __extends(SearchView, _super);

    function SearchView() {
      return SearchView.__super__.constructor.apply(this, arguments);
    }

    SearchView.prototype.id = 'search-page';

    SearchView.prototype.initialize = function() {
      return this.listenTo(this.collection, 'reset', this.renderResults);
    };

    SearchView.prototype.events = {
      'click button': 'search',
      'keypress input': 'searchByEnter'
    };

    SearchView.prototype.render = function() {
      var _this = this;
      this.$el.html(SearchTemplate());
      this.$('input').val(this.collection.query_str);
      this.renderResults();
      _.defer(function() {
        return _this.$('input').focus();
      });
      return this;
    };

    SearchView.prototype.renderResults = function() {
      var result, resultView, _i, _len, _ref;
      this.$('#search-results').empty();
      if ((this.collection.total != null) && (this.collection.searchtime != null)) {
        this.$('.search-meta').html("" + this.collection.total + " results (" + (this.collection.searchtime / 1000) + " seconds)");
      } else {
        this.$('.search-meta').empty();
      }
      if (this.collection.length) {
        this.$('.js-loading').hide();
        _ref = this.collection.models;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          result = _ref[_i];
          this.addChildView = resultView = new ResultView({
            model: result
          });
          this.$('#search-results').append(resultView.render().el);
        }
      } else if (this.collection.total === 0) {
        this.$('#search-results').html('<h4>No matches</h4>');
        this.$('.js-loading').hide();
      }
      return this;
    };

    SearchView.prototype.search = function() {
      var query;
      query = this.$('input').val();
      if (query !== "") {
        this.$('.js-loading').css('display', 'inline-block');
        this.collection.query(query);
        return app.router.navigate('/search/' + encodeURIComponent(query));
      }
    };

    SearchView.prototype.searchByEnter = function(e) {
      if (e.which === 13) {
        return this.search();
      }
    };

    return SearchView;

  })(Backbone.View);
  
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
          __out.push('</h1>\n');
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
      
        __out.push('<a class="button post-action" href="/posts/new">New post</a>\n<div class="posts"></div>\n<div id="loading-posts">\n  <em>Loading posts...</em> ');
      
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
      
        __out.push('<h3><a href="');
      
        __out.push(this.link);
      
        __out.push('">');
      
        __out.push(this.title);
      
        __out.push('</a> <span class="created">– ');
      
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
  var $, expandingTextarea,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  $ = jQuery;

  expandingTextarea = require('widgets/expanding_textarea/expanding_textarea');

  exports.ExpandingTextareaView = (function(_super) {

    __extends(ExpandingTextareaView, _super);

    function ExpandingTextareaView() {
      this.makeAreaExpandable = __bind(this.makeAreaExpandable, this);

      this.render = __bind(this.render, this);
      return ExpandingTextareaView.__super__.constructor.apply(this, arguments);
    }

    ExpandingTextareaView.prototype.render = function() {
      var cloneCSSProperties, context, k, v, _ref,
        _this = this;
      context = {};
      _ref = this.options;
      for (k in _ref) {
        v = _ref[k];
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
        if (!(lines != null)) {
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
