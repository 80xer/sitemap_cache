var _ = require('lodash');
var request = require('request');

module.exports = Smcache;

function Smcache(options) {
  this.options = _.defaults(options || {});
}

Smcache.prototype.cache = function(config) {
  request(config.url, function (error, response, body) {
    if (error) {
      console.log('server not ready');
    } else if (!error && response.statusCode == 200) {
      console.log(body);
    }
  });
}
