# Set these environmental variables to specify a different 
config = mongo_url: process.env.MONGO_URL ?  "mongodb://localhost/journal"
config.redis_url = process.env.REDIS_URL ? "redis://localhost"
config.redis_url = require("url").parse(config.redis_url)
config.elasticSearchHost = process.env.ELASTICSEARCH_URL ? 'localhost'

module.exports = config
