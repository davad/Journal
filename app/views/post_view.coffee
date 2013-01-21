PostTemplate = require 'views/templates/post'
class exports.PostView extends Backbone.View

  className: 'post'

  initialize: ->
    @listenTo @model, 'change', @render

  events:
    'dblclick': 'doubleclick'

  render: =>
    if @model.get('body') isnt "" and @model.get('title') isnt ""
      @model.renderThings()
      data = @model.toJSON()
      if @options.page
        data.page = true
      @$el.html PostTemplate data
    else
      @$el.html "<h2>Loading post&hellip; <img width='32px' height='32px' class='loading' src='/images/loading.gif' /></h2>"

    # Make external links open in new tab
    @$("a[href^=http]").each ->
      if @href.indexOf(location.hostname) is -1
        $(@).attr target: "_blank"
    @

  doubleclick: ->
    app.router.navigate "/node/#{ @model.get('nid') }/edit", true
