'use strict';

const Blueprint = require('../../index.js');
const expect    = require('chai').expect;
const fs        = require('fs');
const path      = require('path');
const root      = process.cwd();
const tmp       = require('tmp-sync');
const tmproot   = path.join(root, 'tmp');
const MockUI    = require('console-ui/mock');

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
});
