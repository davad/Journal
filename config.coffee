exports.config =
  # Edit the next line to change default build path.
  paths:
    public: 'public'

  files:
    javascripts:
      # Defines what file will be generated with `brunch generate`.
      defaultExtension: 'coffee'
      # Describes how files will be compiled & joined together.
      # Available formats:
      # * 'outputFilePath'
      # * map of ('outputFilePath': /regExp that matches input path/)
      # * map of ('outputFilePath': function that takes input path)
      joinTo:
        'javascripts/app.js': /^app/
        'javascripts/vendor.js': /^vendor/
      # Defines compilation order.
      # `vendor` files will be compiled before other ones
      # even if they are not present here.
      order:
        before: [
          'vendor/scripts/jquery.js'
          'vendor/scripts/console-helper.js'
          'vendor/scripts/underscore.js'
          'vendor/scripts/backbone-0.9.10.js'
          'vendor/scripts/burry.js'
          'vendor/scripts/marked.js'
          'vendor/scripts/moment.js'
          'vendor/scripts/kalendae.js'
          'vendor/scripts/expanding.js'
          'vendor/scripts/underscore.string.js'
        ]

    templates:
      defaultExtension: 'eco'
      joinTo: 'javascripts/app.js'

  # Change this if you're using something other than backbone (e.g. 'ember').
  # Content of files, generated with `brunch generate` depends on the setting.
  # framework: 'backbone'

  # Enable or disable minifying of result js / css files.
  minify: no

  # Settings of web server that will run with `brunch watch [--server]`.
  # server:
  #   # Path to your server node.js module.
  #   # If it's commented-out, brunch will use built-in express.js server.
  #   path: 'server.coffee'
  #   port: 3333
  #   # Run even without `--server` option?
  #   run: yes
