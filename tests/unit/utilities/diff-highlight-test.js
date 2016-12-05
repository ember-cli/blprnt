var expect = require('chai').expect;
var chalk = require('chalk');

var diffHighlight = require('../../../lib/utilities/diff-highlight');

describe('diff-highlight', function() {
  it('+ is green', function() {
    expect(diffHighlight('+ foo')).to.eql(chalk.green('+ foo'));
  });

  it('- is red', function() {
    expect(diffHighlight('- foo')).to.eql(chalk.red('- foo'));
  });

  it('@@ is cyan', function() {
    expect(diffHighlight('@@ foo')).to.eql(chalk.cyan('@@ foo'));
  });

  it('others nothing', function() {
    expect(diffHighlight('asdf foo')).to.eql('asdf foo');
  });
});
