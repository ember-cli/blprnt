'use strict';

const Blueprint = require('../../index.js');
const expect    = require('chai').expect;
const fs        = require('fs');
const path      = require('path');
const root      = process.cwd();
const tmp       = require('tmp-sync');
const tmproot   = path.join(root, 'tmp');
const MockUI    = require('console-ui/mock');
const fixturify = require('fixturify');

describe('Blueprint', function() {
  let tmpdir;
  let ui;

  beforeEach(function() {
    tmpdir = tmp.in(tmproot);
    ui = new MockUI()
  });

  it('creates the correct files and directories', function() {
    let exampleBlueprint = Blueprint.load('tests-fixtures/blueprints/example-blueprint');

    let options = {
      entity: {
        name: 'foo'
      },
      target: tmpdir,
      project: {
        config() {
          return {};
        },
        name() {
          return 'foo';
        },
        root: tmpdir,
        // TODO: refactor out
        isEmberCliProject() {
          return true;
        },
        // TODO: refactor out
        isEmberCLIAddon() {
          return true;
        }
      },
      ui: ui
    };

    return exampleBlueprint.install(options)
      .then(() => {
        let filePath, actual;

        filePath = path.join(tmpdir, 'lib/foo.js');
        actual = fs.readFileSync(filePath, { encoding: 'utf-8' });
        expect(actual).to.equal('// foo\n');

        filePath = path.join(tmpdir, 'tests/foo-test.js');
        actual = fs.readFileSync(filePath, { encoding: 'utf-8' });
        expect(actual).to.equal('// A test for foo\n');
      });
  });

  it('respects editorconfig', function() {
    var exampleBlueprint = Blueprint.load('tests-fixtures/blueprints/example-web-app');

    var options = {
      entity: {
        name: 'foo'
      },
      ui,
      target: tmpdir,
      project: {
        config: function() {
          return {};
        },
        name: function() {
          return 'foo';
        },
        root: tmpdir,
        // TODO: refactor out
        isEmberCliProject: function() {
          return true;
        },
        // TODO: refactor out
        isEmberCLIAddon: function() {
          return true;
        }
      },
    };

    fixturify.writeSync(tmpdir, {
      '.editorconfig': `
root = true

[*]
indent_style = space
indent_size = 1
end_of_line = crlf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
`,
      'app': {
        '.editorconfig': `
[*]
indent_size = 3
insert_final_newline = false
`
      }
    });

    return exampleBlueprint.install(options)
      .then(function() {
        var actual = fixturify.readSync(tmpdir);

        // check project root settings
        expect(actual.tests['foo-test.js']).to.equal(`if (1) {\r\n // originally poor formatted file\r\n}\r\n`);

        // check folder specific settings and some of filetypes
        expect(actual.app['foo.js']).to.equal(`if (1) {\r\n   // originally poor formatted file\r\n}`);
        expect(actual.app['foo.css']).to.equal(`.if {\r\n   color: aquamarine;\r\n}`);
        expect(actual.app['foo.hbs']).to.equal(`{{#if}}\r\n   originally poor formatted\r\n{{/if}}`);
      });
  });
});
