{PostView} = require 'views/post_view'
PostsTemplate = require 'views/templates/posts'

class exports.PostsView extends Backbone.View

  id: 'posts'

  initialize: ->
    @listenTo @collection, 'reset', @render
    @listenTo @collection, 'add', @addOne
    @listenTo @collection, 'loading-posts', -> @showLoading()
    @listenTo @collection, 'done-loading-posts', -> @hideLoading()
    # When an individual post or a postEdit view is loaded, hide.
    @listenTo app.eventBus, 'pane:show', -> @$el.hide()
    # We're live, scroll to the last position.
    @listenTo app.eventBus, 'posts:show', -> @scrollLastPostion()
    app.eventBus.on 'distance:bottom_page', ((distance) =>
      # Don't load more posts while the postsView is hidden.
      if @$el.is(':hidden') then return
      if distance <= 1500 then @collection.load()
    ), @


  render: =>
    @$el.html PostsTemplate()
    if @collection.isLoading then @showLoading() else @hideLoading()

    # Create infinity.js listView
    if @listView then @listView.remove()
    @listView = new infinity.ListView(@$('.posts-listview'))

    @addAll()

    # Time to initial render.
    _.defer ->
      console.log (new Date().getTime() - performance.timing.navigationStart) / 1000

    @

  scrollLastPostion: ->
    # Scroll to last place on screen.
    scrollPosition = app.site.get 'postsScroll'
    $(window).scrollTop(scrollPosition)

  showLoading: ->
    @$('#loading-posts').show()

  hideLoading: ->
    @$('#loading-posts').hide()

  addAll: ->
    for post in @collection.models
      @addOne post

  addOne: (post) =>
    postView = new PostView model: post
    postView.render()
    _.defer =>
      @listView.append postView.$el

  onClose: ->
    @listView.remove()
    app.eventBus.trigger 'postsView:active', false
