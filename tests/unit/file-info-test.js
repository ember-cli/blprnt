'use strict';

var expect    = require('chai').expect;
var MockUI    = require('console-ui/mock');
var FileInfo  = require('../../lib/file-info');
var path      = require('path');
var fs        = require('fs-extra');
var EOL       = require('os').EOL;
var RSVP      = require('rsvp');
var writeFile = RSVP.denodeify(fs.writeFile);
var root       = process.cwd();
var tmproot    = path.join(root, 'tmp');
var assign     = require('ember-cli-lodash-subset').assign;
var mkTmpDirIn = require('../helpers/mk-tmp-dir-in');
var td         = require('testdouble');
var chalk      = require('chalk');
var testOutputPath;

var FIXTURES = path.join(__dirname, '../../tests-fixtures/file-info/');

describe('Unit - FileInfo', function() {
  var validOptions, ui;
  var openEditor = require('../../lib/utilities/open-editor');
  var originalCanEdit = openEditor.canEdit;

  beforeEach(function() {
    // force all platforms to have to claim to have an EDITOR
    openEditor.canEdit = function() {
      return true;
    };

    return mkTmpDirIn(tmproot).then(function(tmpdir) {
      testOutputPath = path.join(tmpdir, 'outputfile');

      ui = new MockUI();
      td.replace(ui, 'prompt');

      validOptions = {
        action: 'write',
        outputPath: testOutputPath,
        displayPath: '/pretty-output-path',
        inputPath: path.resolve(__dirname,
                                '../../tests-fixtures/blueprints/with-templating/files/foo.txt'),
        templateVariables: {},
        ui: ui
      };
    });
  });

  afterEach(function(done) {
    openEditor.canEdit = originalCanEdit;
    td.reset();
    fs.remove(tmproot, done);
  });

  it('can instantiate with options', function() {
    new FileInfo(validOptions);
  });

  describe('.render', function() {
    it('does not interpolate {{ }} or ${ }', function () {
      var options = {};
      assign(options, validOptions, {
        inputPath:  path.resolve(__dirname, '../../tests-fixtures/file-info/interpolate.txt'),
        templateVariables: { name: 'tacocat' }
      });

      var fileInfo = new FileInfo(options);
      return fileInfo.render().then(function(output) {
        expect(output.trim()).to.equal('{{ name }} ${ name }  tacocat tacocat');
      });
    });

    it('renders an input file', function() {
      validOptions.templateVariables.friend = 'Billy';
      var fileInfo = new FileInfo(validOptions);

      return fileInfo.render().then(function(output) {
        expect(output.trim()).to.equal('Howdy Billy',
          'expects the template to have been run');
      });
    });

    it('allows a FileInfo to replace the content after render', function() {
      validOptions.templateVariables.friend = 'Billy';
      let fileInfo;

      validOptions.replacer = function(content, theFileInfo) {
        expect(theFileInfo).to.eql(fileInfo);
        expect(content).to.eql('Howdy Billy\n');

        return content.toUpperCase();
      };

      fileInfo = new FileInfo(validOptions);

      return fileInfo.render().then(function(output) {
        expect(output.trim()).to.equal('HOWDY BILLY',
          'expects the template to have been run');
      });
    });

    it('rejects if templating throws', function() {
      var templateWithUndefinedVariable = path.resolve(__dirname,
        '../../tests-fixtures/blueprints/with-templating/files/with-undefined-variable.txt');
      var options = {};
      assign(options, validOptions, {
        inputPath: templateWithUndefinedVariable
      });
      var fileInfo = new FileInfo(options);

      return fileInfo.render().then(function() {
        throw new Error('FileInfo.render should reject if templating throws');
      }).catch(function(e) {
        if (!e.toString().match(/ReferenceError/)) {
          throw e;
        }
      });
    });

    it('does not explode when trying to template binary files', function() {
      var binary = path.resolve(__dirname, '../../tests-fixtures/problem-binary.png');

      validOptions.inputPath = binary;

      var fileInfo = new FileInfo(validOptions);

      return fileInfo.render().then(function(output) {
        expect(!!output, 'expects the file to be processed without error').to.equal(true);
      });
    });
  });

  describe('.displayDiff', function() {
    it('renders a diff to the UI', function() {
      validOptions.templateVariables.friend = 'Billy';
      var fileInfo = new FileInfo(validOptions);

      return writeFile(testOutputPath, 'Something Old' + EOL).then(function() {
        return fileInfo.displayDiff();
      }).then(function() {
        var output = ui.output.trim().split(EOL);
        expect(output.shift()).to.equal('Index: ' + testOutputPath);
        expect(output.shift()).to.match(/=+/);
        expect(output.shift()).to.match(/---/);
        expect(output.shift()).to.match(/\+{3}/);
        expect(output.shift()).to.match(/.*/);
        expect(output.shift()).to.match(/-Something Old/);
        expect(output.shift()).to.match(/\+Howdy Billy/);
      });
    });
  });

  describe('.confirmOverwrite', function() {
    it('renders a menu with an overwrite option', function() {
      td.when(ui.prompt(td.matchers.anything())).thenReturn(Promise.resolve({ answer: 'overwrite' }));

      var fileInfo = new FileInfo(validOptions);

      return fileInfo.confirmOverwrite('test.js').then(function(action) {
        td.verify(ui.prompt(td.matchers.anything()), { times: 1 });
        expect(action).to.equal('overwrite');
      });
    });

    it('renders a menu with a skip option', function() {
      td.when(ui.prompt(td.matchers.anything())).thenReturn(Promise.resolve({ answer: 'skip' }));

      var fileInfo = new FileInfo(validOptions);

      return fileInfo.confirmOverwrite('test.js').then(function(action) {
        td.verify(ui.prompt(td.matchers.anything()), { times: 1 });
        expect(action).to.equal('skip');
      });
    });

    it('renders a menu with a diff option', function() {
      td.when(ui.prompt(td.matchers.anything())).thenReturn(Promise.resolve({ answer: 'diff' }));

      var fileInfo = new FileInfo(validOptions);

      return fileInfo.confirmOverwrite('test.js').then(function(action) {
        td.verify(ui.prompt(td.matchers.anything()), { times: 1 });
        expect(action).to.equal('diff');
      });
    });

    it('renders a menu without diff and edit options when dealing with binary files', function() {
      td.when(ui.prompt(td.matchers.anything())).thenReturn(Promise.resolve({ answer: 'skip' }));

      var binary = path.resolve(__dirname, '../../tests-fixtures/problem-binary.png');
      validOptions.inputPath = binary;
      var fileInfo = new FileInfo(validOptions);

      return fileInfo.confirmOverwrite('test.png').then(function(/*action*/) {
        td.verify(ui.prompt(td.matchers.argThat(function(options) {
          return (
            options.choices.length === 2 &&
            options.choices[0].key === 'y' &&
            options.choices[1].key === 'n'
          );
        })));
      });
    });
  });

  describe('.checkForConflict', function() {
    it('discover conflict', function() {
      var info = new FileInfo({
        inputPath: FIXTURES + 'example.txt',
        outputPath: FIXTURES + 'example2.txt',
      });

      return info.checkForConflict().then(function(result) {
        expect(result).to.eql('confirm');
      });
    });

    it('discover NO conflict (target file is the same as the new file)', function() {
      var info = new FileInfo({
        inputPath: FIXTURES + 'example.txt',
        outputPath: FIXTURES + 'example.txt'
      });

      return info.checkForConflict().then(function(result) {
        expect(result).to.eql('identical');
      });
    });

    it('discover NO conflict (target file is not yet present)', function() {
      var info = new FileInfo({
        inputPath: FIXTURES + 'example.txt',
        outputPath: FIXTURES + 'no-a-file.txt',
      });

      return info.checkForConflict().then(function(result) {
        expect(result).to.eql('none');
      });
    });
  });

  describe('.confirmOverwriteTask', function() {
    var info;
    var ANSWER_PROMPT = {
      type: 'expand',
      name: 'answer',
      default: false,
      message: chalk.red('Overwrite') + ' example.txt?',
      choices: [
        { key: 'y', name: 'Yes, overwrite', value: 'overwrite' },
        { key: 'n', name: 'No, skip', value: 'skip' },
        { key: 'd', name: 'Diff', value: 'diff' },
        { key: 'e', name: 'Edit', value: 'edit' }
      ]
    };

    beforeEach(function() {
      info = new FileInfo({
        inputPath: FIXTURES + 'example.txt',
        outputPath: FIXTURES + 'output/example.txt',
        displayPath: 'example.txt',
        ui: ui
      });
    });

    describe('diff', function() {
      it('is unable to display the diff', function() {
        var displayDiffWasCalled = 0;
        info.displayDiff = function() {
          displayDiffWasCalled++;
          return RSVP.Promise.reject(new Error('Unable to Display Diff'));
        };
        var task = info.confirmOverwriteTask();

        td.when(ui.prompt(td.matchers.contains({
          name: 'answer',
          message: chalk.red('Overwrite') + ' example.txt?'
        }))).thenReturn(RSVP.Promise.resolve({
          answer: 'diff'
        }));

        return task().then(function() {
          expect(true).to.eql(false);
        }, function(reason) {
          expect(reason.message).to.eql('Unable to Display Diff');
          td.verify(ui.prompt(ANSWER_PROMPT), { times: 1 });
          expect(displayDiffWasCalled).to.eql(1);
        });
      });

      it('is able to display the diff', function() {
        var displayDiffWasCalled = 0;
        info.displayDiff = function() {
          displayDiffWasCalled++;
          return RSVP.Promise.resolve();
        };

        info.EditFileDiff = EditFileDiff;
        function EditFileDiff() { }

        EditFileDiff.prototype.edit = function() {
          return RSVP.Promise.resolve();
        };
        var task = info.confirmOverwriteTask();

        td.when(ui.prompt(td.matchers.contains({
          name: 'answer',
          message: chalk.red('Overwrite') + ' example.txt?'
        }))).thenReturn(RSVP.Promise.resolve({ answer: 'diff' }),
                        // choose `diff` again
                        RSVP.Promise.resolve({ answer: 'diff' }),
                        // then finally choose edit
                        RSVP.Promise.resolve({ answer: 'edit' })
        );

        return task().then(function() {
          td.verify(ui.prompt(ANSWER_PROMPT), { times: 3 });
          expect(displayDiffWasCalled).to.eql(2);
        });
      });
      // cycle
    });

    describe('edit', function() {
      it('selects edit action, edit output, and invokes editFileDiff', function() {
        function EditFileDiff() { }

        var editWasCalled = 0;
        EditFileDiff.prototype.edit = function() {
          editWasCalled++;
          return RSVP.Promise.resolve();
        };

        var info = new FileInfo({
          inputPath: FIXTURES + 'example.txt',
          displayPath: 'example.txt',
          ui: ui,
          EditFileDiff: EditFileDiff
        });

        var task = info.confirmOverwriteTask();

        td.when(ui.prompt(td.matchers.contains({
          name: 'answer',
          message: chalk.red('Overwrite') + ' example.txt?'
        }))).thenReturn(RSVP.Promise.resolve({
          answer: 'edit'
        }));

        return task().then(function() {
          td.verify(ui.prompt(ANSWER_PROMPT), { times: 1 });

          expect(editWasCalled).to.eql(1);
        });
      });

      it('first selection fails, but then edit', function() {
        function EditFileDiff() { }

        var editWasCalled = 0;
        EditFileDiff.prototype.edit = function() {
          editWasCalled++;
          if (editWasCalled === 1) {
            return RSVP.Promise.reject(new Error('try again'));
          }
          return RSVP.Promise.resolve();
        };

        var info = new FileInfo({
          inputPath: FIXTURES + 'example.txt',
          displayPath: 'example.txt',
          ui: ui,
          EditFileDiff: EditFileDiff
        });

        var task = info.confirmOverwriteTask();

        td.when(ui.prompt(td.matchers.contains({
          name: 'answer',
          message: chalk.red('Overwrite') + ' example.txt?'
        }))).thenReturn(RSVP.Promise.resolve({
          answer: 'edit'
        }));

        return task().then(function() {
          td.verify(ui.prompt(ANSWER_PROMPT), { times: 2 });
          expect(editWasCalled).to.eql(2);
        });
      });
    });

    describe('other (overwrite)', function() {
      it('selects overwrite action, and overwrite output', function() {
        var task = info.confirmOverwriteTask();

        td.when(ui.prompt(td.matchers.anything())).thenReturn(Promise.resolve({
          answer: 'overwrite'
        }));

        return task().then(function(_info) {
          expect(_info).to.deep.equal(info);
          expect(_info.action).to.deep.equal('overwrite');
          td.verify(ui.prompt(td.matchers.contains({
            type: 'expand',
            name: 'answer',
            default: false,
            message: chalk.red('Overwrite') + ' example.txt?',
          })), { times: 1 });
        });
      });
    });
  });
});
