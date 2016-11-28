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
  this.info = options.info;

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

    if (!appliedDiff) {
      var message = 'Patch was not cleanly applied.';
      this.info.ui.writeLine(message + ' Please choose another action.');
      throw new SilentError(message);
    }

    return writeFile(resultHash.outputPath, appliedDiff);
  }.bind(this));
}

function invokeEditor(result) {
  var info     = this.info;
  var diff     = jsdiff.createPatch(info.outputPath, result.output.toString(), result.input);
  var diffPath = path.join(this.tmpDifferenceDir, 'currentDiff.diff');

  return writeFile(diffPath, diff).then(function() {
    return openEditor(diffPath);
  }).then(function() {
    return { outputPath: info.outputPath, diffPath: diffPath };
  });
}
