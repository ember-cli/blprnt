
'use strict';

var RSVP      = require('rsvp');
var fs        = require('fs-extra');
var temp      = require('temp');
var mkdir     = RSVP.denodeify(fs.mkdir);
var mkdirTemp = RSVP.denodeify(temp.mkdir);

function exists(dir) {
  return new Promise(function(resolve) {
    fs.exists(dir, resolve);
  });
}

module.exports = function mkTmpDirIn(dir) {
  return exists(dir).then(function(doesExist) {
    if (!doesExist) {
      return mkdir(dir);
    }
  }).then(function() {
    return mkdirTemp({ dir: dir });
  });
}
