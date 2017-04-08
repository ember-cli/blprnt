'use strict';

const fs           = require('fs');
const RSVP         = require('rsvp');
const readFile     = RSVP.denodeify(fs.readFile);
const lstat        = RSVP.denodeify(fs.stat);
const chalk        = require('chalk');
const EditFileDiff = require('./edit-file-diff');
const EOL          = require('os').EOL;
const isBinaryFile = require('isbinaryfile').sync;
const openEditor   = require('./utilities/open-editor');
const processTemplate = require('./utilities/process-template');
const diffHighlight = require('./utilities/diff-highlight');
const editorconfig = require('editorconfig');
const editorconfigFix = require('./utilities/editorconfig-fix');

const NOOP = _ => _;

module.exports = class FileInfo {
  constructor(options) {
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

  confirmOverwrite(path) {
    let promptOptions = {
      type: 'expand',
      name: 'answer',
      default: false,
      message: chalk.red('Overwrite') + ' ' + path + '?',
      choices: [
        { key: 'y', name: 'Yes, overwrite', value: 'overwrite' },
        { key: 'n', name: 'No, skip', value: 'skip' }
      ]
    };

    let outputPathIsFile = false;
    try {
      outputPathIsFile = fs.statSync(this.outputPath).isFile();
    } catch (err) { /* ignore */ }

    let canDiff = (
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
      .then(response => response.answer);
  }

  displayDiff() {
    let info = this;
    let jsdiff = require('diff');

    return RSVP.hash({
      input: this.render(),
      output: readFile(info.outputPath)
    }).then(result => {
      let diff = jsdiff.createPatch(
        info.outputPath,
        result.output.toString(),
        result.input);

      let lines = diff.split('\n');

      for (let i = 0; i < lines.length; i++) {
        info.ui.write(diffHighlight(lines[i] + EOL));
      }
    });
  }

  render() {
    if (!this.rendered) {
      this.rendered = this._render().then(result => this.replacer(result, this));
    }
    return this.rendered;
  }

  _render() {
    let path = this.inputPath;
    let outputPath = this.outputPath;
    let context = this.templateVariables;

    return readFile(path).then(content => {
      return lstat(path).then(fileStat => {
        if (isBinaryFile(content, fileStat.size)) {
          return content;
        } else {
          try {
            let processed = processTemplate(content.toString(), context);
            return editorconfig.parse(outputPath).then(ecConfig => {
              if (Object.keys(ecConfig).length === 0) {
                return processed;
              }

              return editorconfigFix(processed, ecConfig);
            });
          } catch (err) {
            err.message += ` (Error in blueprint template: ${path})`;
            throw err;
          }
        }
      });
    });
  }

  checkForConflict() {
    return new RSVP.Promise((resolve, reject) => {
      fs.exists(this.outputPath, (doesExist, error) => {
        if (error) {
          reject(error);
          return;
        }

        if (doesExist) {
          resolve(RSVP.hash({
            input: this.render(),
            output: readFile(this.outputPath)
          }).then(result => {
            let type;
            if (result.input.toString() === result.output.toString()) {
              type = 'identical';
            } else {
              type = 'confirm';
            }
            return type;
          }));
        } else {
          resolve('none');
        }
      });
    });
  }

  confirmOverwriteTask() {
    let info = this;

    return function() {
      return new Promise(resolve => {
        resolve(doConfirm());

        function doConfirm() {
          let result = info.confirmOverwrite(info.displayPath).then(action => {
            if (action === 'diff') {
              return info.displayDiff().then(doConfirm);
            } else if (action === 'edit') {

              let editFileDiff = new info.EditFileDiff({
                info: info,
                ui: info.ui
              });

              return editFileDiff.edit().then(() => {
                info.action = action;
                return info;
              }).catch(() => doConfirm().then(() => info));
            } else {
              info.action = action;
              return info;
            }
          });

          return result;
        }
      });
    };
  }
};
