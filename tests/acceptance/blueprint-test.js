var Blueprint = require('../../index.js');
var expect    = require('chai').expect;
var fs        = require('fs');
var path      = require('path');
var root      = process.cwd();
var tmp       = require('tmp-sync');
var tmproot   = path.join(root, 'tmp');

describe('Blueprint', function() {
  var tmpdir;

  beforeEach(function() {
    tmpdir = tmp.in(tmproot);
  });

  it('creates the correct files and directories', function() {
    var exampleBlueprint = Blueprint.load('../fixtures/blueprints/example-blueprint');
    var model = {
      name: 'foo'
    };
    var options = {
      destDir: tmpdir
    };

    return exampleBlueprint.install(model, options)
      .then(function() {
        var filePath, actual

        filePath = path.join(tmpdir, 'lib/foo.js');
        actual = fs.readFileSync(filePath, { encoding: 'utf-8' });
        expect(actual).to.equal('// foo\n');

        filePath = path.join(tmpdir, 'tests/foo-test.js');
        actual = fs.readFileSync(filePath, { encoding: 'utf-8' });
        expect(actual).to.equal('// A test for foo\n');
      });
  });
});
