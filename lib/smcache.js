var _ = require('lodash');
var request = require('sync-request');
var redis = require("redis");
var client = redis.createClient();
var phantom = require('phantom');
var Promise = require('bluebird');


module.exports = Smcache;

function Smcache(options) {
  this.options = _.defaults(options || {});
}

function exFrag(url) {
  return url.replace('&_escaped_fragment_=','').replace('&_escaped_fragment_', '').replace('?_escaped_fragment_=', '').replace('?_escaped_fragment_', '')
}

Smcache.prototype.cache = function(config) {
  var res = request('GET', config.url)
  var body = res.getBody('utf8');
  var result = body.match(/<loc>(.*?)<\/loc>/g).map(function(val){
     return val.replace(/<\/?loc>/g,'');
  });

  var i = 0, idx = 0;
  var start = new Date().getTime();

  var promiseWhile = function(condition, action) {
    var resolver = Promise.defer();

    var loop = function() {
      if (!condition()) return resolver.resolve();
      return Promise.cast(action())
        .then(loop)
        .catch(resolver.reject);
    };

    process.nextTick(loop);

    return resolver.promise;
  };
  

  promiseWhile(function () {
    return i < 1//!!result[i];
  }, function () {
    return new Promise(function (resolve) {
      url = result[i];
      idx = url.indexOf('/', 8);
      url = 'http://localhost:3002' + url.substr(idx)
      console.log(i+' loading... '+url);
      if (url) {
        phantom.create(function (ph) {
          ph.createPage(function (page) {
            page.open(url, function (status) {
              page.evaluate(function () { return document; }, function (result) {
                console.log(result); 
                idx = url.indexOf('/', 8);
                console.log(url);
                url = url.substr(idx);
                client.hmset(config.prefix + ':' + url, 'body', result, 'status', res.statusCode);
                client.expire(url, 604800);
                console.log('cached ' + config.prefix + ':' + url)

                ph.exit();
                resolve();
              });
            });
          });
        });
      } else {
        resolve();
      }
      i++;
    });
  }).then(function () {
    client.quit();
    var end = new Date().getTime();
    var time = end - start;
    console.log('Execution time: ' + time/1000 + 's');
  }).catch(function () {
    console.log('on catch');
    res.end();
  });
    

  // res = request('GET', url, {
  //   'headers': {
  //     'user-agent': 'Facebot'
  //   }
  // })
  // body = res.getBody('utf8');
  // idx = url.indexOf('/', 8);
  // console.log(url);
  // url = exFrag(url.substr(idx));
  // console.log(url);
  // if ( i === 3 ) {
  //   console.log(body);
  // }
  // client.hmset(config.prefix + ':' + url, 'body', body, 'status', res.statusCode);
  // client.expire(url, 604800);

  // _.each(result, function(url) {
  //   if ( i < 4 ) {
  //     url = encodeURI(url+ '?_escaped_fragment_=');
  //     idx = url.indexOf('/', 8);
  //     url = 'http://localhost:3002' + url.substr(idx)
  //     console.log(++i + ' : ' + res.statusCode + ' : ' + url);
  //     res = request('GET', url, {
  //       'headers': {
  //         'user-agent': 'Facebot'
  //       }
  //     })
  //     body = res.getBody('utf8');
  //     idx = url.indexOf('/', 8);
  //     console.log(url);
  //     url = exFrag(url.substr(idx));
  //     console.log(url);
  //     if ( i === 3 ) {
  //       console.log(body);
  //     }
  //     // client.hmset(config.prefix + ':' + url, 'body', body, 'status', res.statusCode);
  //     // client.expire(url, 604800);
  //   }
  // });
}
