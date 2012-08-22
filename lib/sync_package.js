var http = require('http');
var request = require('request');
var EventProxy = require('eventproxy').EventProxy;
var npm = require('npm');
var colors = require('colors');

var options = {};

var compare = function (id, callback) {
  var ep = new EventProxy();
  ep.all('from', 'to', function (from, to) {
    callback(null, from, to);
  });
  ep.on('error', function (err) {
    ep.unbind();
    callback(err);
  });
  request.get({
    url: options.from + encodeURIComponent(id)
  }, function (err, res, body) {
    if (err) {
      return ep.emit('error', err);
    }
    var doc = JSON.parse(body);
    var latest = doc['dist-tags']['latest'];
    var dependencies = Object.keys(doc.versions[latest].dependencies);
    dependencies.forEach(function (dependency) {
      console.log("Sync dependency " + dependency.underline);
      sync(dependency);
    });
    ep.emit('from', doc._rev);
  });

  request.get({
    url: options.to + encodeURIComponent(id)
  }, function (err, res, body) {
    if (err) {
      return ep.emit('error', err);
    }
    var doc = JSON.parse(body);
    ep.emit('to', doc._rev);
  });
};

var _sync = function (id, rev, callback) {
  callback = callback || function () {};

  request.get({
    url: options.from + encodeURIComponent(id) + '?attachments=true&revs=true&rev=' + rev,
    headers: {'accept': "multipart/related,application/json"}
  }).pipe(request.put(options.to + encodeURIComponent(id) + '?new_edits=false&rev=' + rev, function (e, resp, b) {
    if (e) {
      callback({error: e, id: id, rev: rev, body: b});
    } else if (resp.statusCode > 199 && resp.statusCode < 300) {
      callback({id: id, rev: rev, success: true, resp: resp, body: b});
    } else {
      callback({error: "status code is not 201.", id: id, resp: resp, body: b});
    }
  }));
};

var sync = function (id, callback) {
  callback = callback || function () {
    console.log(("Sync " + id + " done.").green);
  };
  npm.load('~/.npmrc', function (err) {
    if (err) {
      throw err;
    }
    options.from = npm.config.get('remote_registry') || "http://isaacs.iriscouch.com/registry/";
    options.to = npm.config.get('local_registry');
    if (!options.from || !options.to) {
      console.log("Please use ");
      console.log("\tnpm config set remote_registry {remote_registry}".yellow);
      console.log("\tnpm config set local_registry {local_registry}");
      console.log("to set the remote and local registry.");
      return;
    }
    console.log('Sync package "' + id + '" from ' + options.from + ' to ' + options.to);
    compare(id, function (err, from, to) {
      if (err) {
        throw err;
      }
      console.log('The remote package "' + id + '"\' revsion is ' + from);
      console.log('The local package "' + id + '"\' revsion is ' + to);
      if (from !== to) {
        _sync(id, from, callback);
      } else {
        console.log("The local package is same as remote package, no need sync again.");
        callback();
      }
    });
  });
};

module.exports = sync;
