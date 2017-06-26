'use strict';

const expect = require('chai').expect;
const cleanRemove = require('../../../lib/utilities/clean-remove');
const temp = require('temp');
const path = require('path');
const fs = require('fs-extra');
const RSVP = require('rsvp');

const outputFile = RSVP.denodeify(fs.outputFile);
const stat = RSVP.denodeify(fs.stat);

describe('clean-remove', function() {
  const originalCwd = process.cwd();
  const nestedPath = 'nested1/nested2';

  let tempDir;
  let fileInfo;

  beforeEach(function() {
    tempDir = temp.mkdirSync('clean-remove');
    process.chdir(tempDir);

    fileInfo = {
      outputBasePath: tempDir
    };
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.removeSync(tempDir);
  });

  it('removes empty folders', function() {
    let displayPath = path.join(nestedPath, 'file.txt');

    fileInfo.outputPath = path.join(tempDir, displayPath);
    fileInfo.displayPath = displayPath;

    return outputFile(displayPath, '').then(() => {
      return stat(displayPath).then(stats => expect(stats).to.be.ok);
    }).
      then(() => cleanRemove(fileInfo)).
      then(() => {
        return stat('nested1')
          .then(() => expect(false).to.be.ok)
          .catch(err => expect(err).to.be.ok);
      });
  });

  it('preserves filled folders', function() {
    let removedDisplayPath = path.join(nestedPath, 'file.txt');
    let preservedDisplayPath = path.join(nestedPath, 'file2.txt');

    fileInfo.outputPath = path.join(tempDir, removedDisplayPath);
    fileInfo.displayPath = removedDisplayPath;

    return outputFile(removedDisplayPath, '')
      .then(() => outputFile(preservedDisplayPath, ''))
      .then(() => {
        return stat(preservedDisplayPath).then(stats => {
          expect(stats).to.be.ok;
        });
      }).then(() => cleanRemove(fileInfo))
        .then(() => {
          return stat(removedDisplayPath)
            .then(() => expect(false).to.be.ok)
            .catch(err => expect(err).to.be.ok);
        }).then(() => {
          return stat(preservedDisplayPath).then(stats => expect(stats).to.be.ok);
        });
  });
});
