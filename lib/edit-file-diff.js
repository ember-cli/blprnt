'use strict';

const fs           = require('fs');
const RSVP         = require('rsvp');
const readFile     = RSVP.denodeify(fs.readFile);
const writeFile    = RSVP.denodeify(fs.writeFile);
const jsdiff       = require('diff');
const quickTemp    = require('quick-temp');
const path         = require('path');
const SilentError  = require('silent-error');

module.exports = EditFileDiff;
function EditFileDiff(options) {
  if (!(this instanceof EditFileDiff)) {
    throw new TypeError('Failed to construct `EditFileDiff`: Please use the `new` operator, this object constructor cannot be called as a function.');
  }

  if (!(typeof options === 'object' && options !== null && options.info)) {
    throw new TypeError('options.info not provided to EditFileDiff constructor');
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
  }).then(result => {
    let appliedDiff = jsdiff.applyPatch(result.currentString.toString(), result.diffString.toString());

    if (appliedDiff === false) {
      let message = 'Patch was not cleanly applied.';
      this.ui.writeLine(message + ' Please choose another action.');
      throw new SilentError(message);
    }

    // TODO: this most likely should update info.rendered, and allow the
    // transaction blueprint commit to flush
    return writeFile(resultHash.outputPath, appliedDiff);
  });
}

function invokeEditor(result) {
  let info     = this.info;
  let diff     = jsdiff.createPatch(info.outputPath, result.output.toString(), result.input);
  let diffPath = path.join(this.tmpDifferenceDir, 'currentDiff.diff');

  return writeFile(diffPath, diff)
    .then(() => this.openEditor(diffPath))
    .then(() => {
      return {
        outputPath: info.outputPath,
        diffPath: diffPath
      };
    });
}
