{BrunchApplication, loadPost, clickHandler, scrollPosition, search} = require 'helpers'
{MainRouter} = require 'routers/main_router'
{MainView} = require 'views/main_view'
{PostsView} = require 'views/posts_view'
{Posts} = require 'collections/posts'
Drafts = require 'collections/drafts'
DraftsIndicatorView = require 'views/drafts_indicator_view'
Search = require 'collections/search'

# Misc
require 'backbone_extensions'

class exports.Application extends BrunchApplication
  initialize: ->
    # Mixin Underscore.String functions.
    _.mixin(_.str.exports())

    @collections = {}
    @views = {}
    @util = {}

    @site = new Backbone.Model

    @router = new MainRouter
    @eventBus = _.extend({}, Backbone.Events)

    @collections.posts = new Posts
    @collections.posts.load(true)
    @collections.drafts = new Drafts
    @collections.drafts.fetch()
    @collections.search = new Search

    @views.main = new MainView el: $('#container')

    # Create and render our infinity.js postsView.
    postsView = new PostsView collection: app.collections.posts, el: $('#posts')
    postsView.render()

    @views.draftsIndicatorView = new DraftsIndicatorView(
      el: $('#menu-container .drafts')
      collection: @collections.drafts
    ).render()

    @util.loadPost = loadPost
    @util.clickHandler = clickHandler
    @util.search = search
    scrollPosition()
    $(window).on 'click', app.util.clickHandler

    # Make moving back to the postsView more snappy.
    # This configures how quickly infinity.js will respond to scroll events.
    infinity.config.SCROLL_THROTTLE = 100

unless location.pathname is '/login'
  window.app = new exports.Application
