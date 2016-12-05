'use strict';

var fs           = require('fs');
var RSVP         = require('rsvp');
var readFile     = RSVP.denodeify(fs.readFile);
var writeFile    = RSVP.denodeify(fs.writeFile);
var jsdiff       = require('diff');
var quickTemp    = require('quick-temp');
var path         = require('path');
var SilentError  = require('silent-error');
var openEditor   = require('./utilities/open-editor');

module.exports = EditFileDiff;
function EditFileDiff(options) {
  if (!(this instanceof EditFileDiff)) {
    throw new TypeError("Failed to construct 'EditFileDiff': Please use the 'new' operator, this object constructor cannot be called as a function.");
  }

  if (!(typeof options === 'object' && options !== null && options.info)) {
    throw new TypeError("options.info not provided to EditFileDiff constructor");
  }
  this.info = options.info;
  this.openEditor = options.openEditor || require('./utilities/open-editor');
  this.ui = options.ui;

  quickTemp.makeOrRemake(this, 'tmpDifferenceDir');
}

EditFileDiff.prototype.edit = function() {
  return RSVP.hash({
    input:  this.info.render(),
    output: readFile(this.info.outputPath)
  })
    .then(invokeEditor.bind(this))
    .then(applyPatch.bind(this))
    .finally(cleanUp.bind(this));
};

function cleanUp() {
  quickTemp.remove(this, 'tmpDifferenceDir');
}

function applyPatch(resultHash) {
  return RSVP.hash({
    diffString: readFile(resultHash.diffPath),
    currentString: readFile(resultHash.outputPath)
  }).then(function(result) {
    var appliedDiff = jsdiff.applyPatch(result.currentString.toString(), result.diffString.toString());

    if (appliedDiff === false) {
      var message = 'Patch was not cleanly applied.';
      this.ui.writeLine(message + ' Please choose another action.');
      throw new SilentError(message);
    }

    // TODO: this most likely should update info.rendered, and allow the
    // transaction blueprint commit to flush
    return writeFile(resultHash.outputPath, appliedDiff);
  }.bind(this));
}

function invokeEditor(result) {
  var info     = this.info;
  var diff     = jsdiff.createPatch(info.outputPath, result.output.toString(), result.input);
  var diffPath = path.join(this.tmpDifferenceDir, 'currentDiff.diff');

  return writeFile(diffPath, diff).then(function() {
    return this.openEditor(diffPath);
  }.bind(this)).then(function() {
    return {
      outputPath: info.outputPath,
      diffPath: diffPath
    };
  });
}
