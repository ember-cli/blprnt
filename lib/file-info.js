'use strict';

var fs           = require('fs');
var RSVP         = require('rsvp');
var readFile     = RSVP.denodeify(fs.readFile);
var lstat        = RSVP.denodeify(fs.stat);
var chalk        = require('chalk');
var EditFileDiff = require('./edit-file-diff');
var EOL          = require('os').EOL;
var isBinaryFile = require('isbinaryfile').sync;
var openEditor   = require('./utilities/open-editor')
var processTemplate = require('./utilities/process-template');
var diffHighlight = require('./utilities/diff-highlight');

const NOOP = _ => _;
module.exports = FileInfo;
function FileInfo(options) {
  this.action = options.action;
  this.outputBasePath = options.outputBasePath;
  this.outputPath = options.outputPath;
  this.displayPath = options.displayPath;
  this.inputPath =  options.inputPath;
  this.templateVariables = options.templateVariables;
  this.replacer = options.replacer || NOOP;
  this.ui = options.ui;
  this.EditFileDiff = options.EditFileDiff || EditFileDiff;
}

FileInfo.prototype.confirmOverwrite = function(path) {
  var promptOptions = {
    type: 'expand',
    name: 'answer',
    default: false,
    message: chalk.red('Overwrite') + ' ' + path + '?',
    choices: [
      { key: 'y', name: 'Yes, overwrite', value: 'overwrite' },
      { key: 'n', name: 'No, skip', value: 'skip' }
    ]
  };

  var outputPathIsFile = false;
  try {
    outputPathIsFile = fs.statSync(this.outputPath).isFile();
  } catch (err) { /* ignore */ }

  var canDiff = (
    !isBinaryFile(this.inputPath) && (
      !outputPathIsFile ||
      !isBinaryFile(this.outputPath)
    )
  );

  if (canDiff) {
    promptOptions.choices.push({
      key: 'd',
      name: 'Diff',
      value: 'diff'
    });

    if (openEditor.canEdit()) {
      promptOptions.choices.push({
        key: 'e',
        name: 'Edit',
        value: 'edit'
      });
    }
  }

  return this.ui.prompt(promptOptions)
    .then(function(response) {
      return response.answer;
    });
};

FileInfo.prototype.displayDiff = function() {
  var info = this;
  var jsdiff = require('diff');

  return RSVP.hash({
    input: this.render(),
    output: readFile(info.outputPath)
  }).then(function(result) {
    var diff = jsdiff.createPatch(
      info.outputPath,
      result.output.toString(),
      result.input);

    var lines = diff.split('\n');

    for (var i = 0; i < lines.length; i++) {
      info.ui.write(diffHighlight(lines[i] + EOL));
    }
  });
};

FileInfo.prototype.render = function() {
  if (!this.rendered) {
    this.rendered = this._render().then(result => this.replacer(result, this));
  }
  return this.rendered;
};

FileInfo.prototype._render = function() {
  var path = this.inputPath;
  var context = this.templateVariables;

  return readFile(path).then(function(content) {
    return lstat(path).then(function(fileStat) {
      if (isBinaryFile(content, fileStat.size)) {
        return content;
      } else {
        try {
          return processTemplate(content.toString(), context);
        } catch (err) {
          err.message += ' (Error in blueprint template: ' + path + ')';
          throw err;
        }
      }
    });
  });
};

FileInfo.prototype.checkForConflict = function() {
  return new RSVP.Promise(function (resolve, reject) {
    fs.exists(this.outputPath, function (doesExist, error) {
      if (error) {
        reject(error);
        return;
      }

      var result;

      if (doesExist) {
        resolve(RSVP.hash({
          input: this.render(),
          output: readFile(this.outputPath)
        }).then(function(result) {
          var type;
          if (result.input.toString() === result.output.toString()) {
            type = 'identical';
          } else {
            type = 'confirm';
          }
          return type;
        }.bind(this)));
      } else {
        resolve('none');
      }
    }.bind(this));
  }.bind(this));
};

FileInfo.prototype.confirmOverwriteTask = function() {
  var info = this;

  return function() {
    return new Promise(function(resolve, reject) {
      resolve(doConfirm());

      function doConfirm() {
        var result = info.confirmOverwrite(info.displayPath).then(function(action) {
          if (action === 'diff') {
            return info.displayDiff().then(doConfirm);
          } else if (action === 'edit') {

            var editFileDiff = new info.EditFileDiff({
              info: info,
              ui: info.ui
            });

            return editFileDiff.edit().then(function() {
              info.action = action;
              return info;
            }).catch(function() {
              return doConfirm().then(function() {
                return info;
              });
            });
          } else {
            info.action = action;
            return info;
          }
        });

        return result;
      }
    });
  };
};

