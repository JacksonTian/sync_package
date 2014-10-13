var request = require('request');
var EventProxy = require('eventproxy');
var npm = require('npm');
var colors = require('colors');

var options = {};
var cache = {};
var HEADERS = {
  accept: 'multipart/related,application/json'
};

var compare = function (id, installDependencies, installDevDependencies, callback) {
  var ep = new EventProxy();
  ep.all('from', 'to', function (from, to) {
    callback(null, from, to);
  });
  ep.fail(callback);
  request.get({
    url: options.from + encodeURIComponent(id) + '?revs_info=true',
    headers: HEADERS
  }, ep.done('from', function (res, body) {
    var doc;
    try {
      doc = JSON.parse(body);
    } catch (err) {
      err.message = 'Parse `from` module body error: ' + err.message;
      return ep.emit('error', err);
    }
    if (doc.error) {
      return '';
    }

    var latest = doc['dist-tags']['latest'];
    var dependencies = Object.keys(doc.versions[latest].dependencies || {});
    var devDependencies = Object.keys(doc.versions[latest].devDependencies || {});
    var allDependencies = installDevDependencies ? dependencies.concat(devDependencies) : dependencies;
    if (installDependencies && allDependencies.length > 0) {
      console.log('Check ' + id.magenta + '\'s ' + ('' + allDependencies.length).magenta + ' dependencies');
      allDependencies.forEach(function (dependency) {
        console.log('Sync dependency ' + dependency.underline.cyan);
        sync(dependency, installDependencies);
      });
    }
    return doc._rev;
  }));

  request.get({
    url: options.to + encodeURIComponent(id) + '?revs_info=true'
  }, ep.done('to', function (res, body) {
    var doc;
    try {
      doc = JSON.parse(body);
    } catch (err) {
      err.message = 'Parse `to` module body error: ' + err.message;
      return ep.emit('error', err);
    }
    if (doc.error) {
      return '';
    }

    return doc._rev;
  }));
};


function fetchDependencies(id, rev, tempDir, cb) {
  console.log("Syncing %s rev=%s", id.magenta, rev.magenta);

  var FF = require('npm-fullfat-registry');
  var execute = new FF({
    skim: options.from,
    fat: options.to,
    tmp: tempDir
  });

  request({
      url: options.from + encodeURIComponent(id) + '?attachments=true&revs=true&rev=' + rev,
      headers: HEADERS
    },
    function (error, response, body) {
      if (error) {
        console.error("Error fetching document", error, body);
        return cb(error);
      }

      execute.on('error', function(err) {
        execute.destroy();
        cb(err);
      });
      execute.on('put', function(doc, response) {
        execute.destroy();
        cb(null, response);
      });

      execute.onchange(null, {id: id, doc: JSON.parse(body)});
    });
}

var _sync = function (id, rev, callback) {
  callback = callback || function () {};

  request.get({
    url: options.from + encodeURIComponent(id) + '?attachments=true&revs=true&rev=' + rev,
    headers: HEADERS
  }).pipe(request.put(options.to + encodeURIComponent(id) + '?new_edits=false&rev=' + rev, function (e, resp, b) {
    if (e) {
      callback(e, {id: id, rev: rev, body: b});
    } else if (resp.statusCode > 199 && resp.statusCode < 300) {
      callback(null, {id: id, rev: rev, success: true, resp: resp, body: b});
    } else {
      callback(new Error('status code is not 201. statusCode: ' + resp.statusCode), {id: id, resp: resp, body: b});
    }
  })).on('data', function () {
    console.log('...'.green);
  });
};

var sync = function (id, installDependencies, installDevDependencies, browser, tempDir, callback) {
  if (typeof browser === 'function') {
    callback = browser;
    browser = false;
  }
  if (browser) {
    colors.mode = 'browser';
  }
  if (cache[id]) {
    return;
  } else {
    cache[id] = true;
  }
  callback = callback || function () {
    console.log(('Sync ' + id + ' done.').green);
  };

  npm.load('~/.npmrc', function (err) {
    if (err) {
      throw err;
    }
    options.from = npm.config.get('remote_registry') || 'http://isaacs.iriscouch.com/registry/';
    options.to = npm.config.get('local_registry');
    if (!options.from || !options.to) {
      console.log('Please use ');
      console.log('\tnpm config set remote_registry {remote_registry}'.yellow);
      console.log('\tnpm config set local_registry {local_registry}');
      console.log('to set the remote and local registry.');
      return;
    }

    console.log('Sync package ' + id.magenta + ' from ' + options.from + ' to ' + options.to.replace(/\/\/(.*@)/, '//'));
    compare(id, installDependencies, installDevDependencies, function (err, from, to) {
      if (err) {
        err.message = '. Wait a minute and try again!';
        throw err;
      }

      if (!from) {
        console.log('The remote package is inexsit, no need sync.');
        return callback();
      }

      if (from !== to) {
        console.log('The revision of remote package ' + id.magenta + ' is ' + from);
        console.log('The revision of local package ' + id.magenta + ' is ' + to);

        _sync(id, from, function (err, result) {
          console.log(result.body);
          if (err) {
            console.warn(err.message);
            console.warn(result.body);
            console.log(('Sync ' + id + ', rev: ' + from + ' fail.').red);
          } else {
            fetchDependencies(id, from, tempDir, function (err, result) {
              if (err) {
                console.log(('Sync ' + id + ', rev: ' + from + ' failed.').red, err);
              } else {
                console.log(('Sync ' + id + ', rev: ' + from + ' done.').green);
              }
            });
          }
        });
      } else {
        console.log('The local ' + id.green + ' package is same as remote package, no need sync again.');
        callback();
      }
    });
  });
};

module.exports = sync;
