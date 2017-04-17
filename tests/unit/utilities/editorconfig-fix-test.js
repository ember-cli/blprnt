'use strict';

var editorconfigFix = require('../../../lib/utilities/editorconfig-fix');

var expect = require('chai').expect;

describe('editorconfig-fix', function() {

  it('should throw if source is not a string', function() {
    var disalowed = [{}, [], 777, undefined, null, false, true];
    disalowed.forEach(d => {
      try {
        editorconfigFix(d, {});
        expect(false).to.be.false;
      } catch (e) {
        expect(e.message).to.equal('source must be a string');
      }
    });
  });
  
  it('should throw if editorconfig is not an object', function() {
    var disalowed = [{}, [], 777, undefined, null, false, true];

    disalowed.forEach(d => {
      try {
        editorconfigFix('', d);
        expect(false).to.be.false;
      } catch (e) {
        expect(e.message).to.equal('editorconfig is required');
      }
    });
  });

  describe('indentation', function() {
    it(`doesn't re-indendent if indent_size is missing`, function() {
      var result = editorconfigFix(
` a
 s`, 
      {
        indent_style: 'tab'
      });

      expect(result).to.equal(` a\n s\n`);
    });

    it(`doesn't re-indendent if indent_style is missing`, function() {
      var result = editorconfigFix(
` a
 s`, 
      {
        indent_size: 2
      });

      expect(result).to.equal(` a\n s\n`);
    });

    it(`should indent with spaces`, function() {
      var result = editorconfigFix(
` a
 s`, 
      {
        indent_style: 'space',
        indent_size: 2
      });

      expect(result).to.equal(`  a\n  s\n`);
    });

    it(`should not touch odd whitespace`, function() {
      var result = editorconfigFix(
`  a
   s`, 
      {
        indent_style: 'space',
        indent_size: 2
      });

      expect(result).to.equal(`  a\n   s\n`);
    });

    it(`should indent with tabs`, function() {
      var result = editorconfigFix(
` a
 s`, 
      {
        indent_style: 'tab',
        indent_size: 1
      });

      expect(result).to.equal(`\ta\n\ts\n`);
    });

    it(`respects tab_width`, function() {
      var result = editorconfigFix(
` a
 s`, 
      {
        indent_style: 'tab',
        tab_width: 2
      });

      expect(result).to.equal(`\t\ta\n\t\ts\n`);
    });
  });

  describe('trim_trailing_whitespace', function() {
    it('defaults to false', function() {
      var result = editorconfigFix(
`a  
s  `, 
      {});

      expect(result).to.equal(`a  \ns  \n`);
    });

    it('should not trim', function() {
      var result = editorconfigFix(
`a  
s  `, 
      {
        trim_trailing_whitespace: false
      });

      expect(result).to.equal(`a  \ns  \n`);
    });

    it('should trim', function() {
      var result = editorconfigFix(
`a  
s  `, 
      {
        trim_trailing_whitespace: true
      });

      expect(result).to.equal(`a\ns\n`);
    });

    it('should trim line with indentation only', function() {
      var result = editorconfigFix(
`  
a`, 
      {
        trim_trailing_whitespace: true
      });

      expect(result).to.equal(`\na\n`);
    });
  });

  describe('end_of_line', function() {
    it('defaults to "lf"', function() {
      var result = editorconfigFix(
`a
s`, 
      {});

      expect(result).to.equal(`a\ns\n`);
    });

    it('should work for "cr"', function() {
      var result = editorconfigFix(
`a
s`, 
      {
        end_of_line: 'cr'
      });

      expect(result).to.equal(`a\rs\r`);
    });

    it('should work for "crlf"', function() {
      var result = editorconfigFix(
`a
s`, 
      {
        end_of_line: 'crlf'
      });

      expect(result).to.equal(`a\r\ns\r\n`);
    });

    it('parses "crlf"', function() {
      var result = editorconfigFix(
`a\r\ns`, 
      {});

      expect(result).to.equal(`a\ns\n`);
    });

    it('parses "cr"', function() {
      var result = editorconfigFix(
`a\rs`, 
      {});

      expect(result).to.equal(`a\ns\n`);
    });

  })

  describe('insert_final_newline', function() {
    it(`doesn't touch an empty document`, function() {
      var result = editorconfigFix(``, {
        insert_final_newline: true
      });

      expect(result).to.equal(``);
    });

    it(`should not insert`, function() {
      var result = editorconfigFix(`a`, {
        insert_final_newline: false
      });

      expect(result).to.equal(`a`);
    });

    it(`should strip if final new line exists`, function() {
      var result = editorconfigFix(`a\n`, {
        insert_final_newline: false
      });

      expect(result).to.equal(`a`);
    });

    it(`should insert if final newline doesn't exist`, function() {
      var result = editorconfigFix(`a`, {
        insert_final_newline: true
      });

      expect(result).to.equal(`a\n`);
    });

    it(`should not insert if final newline exists`, function() {
      var result = editorconfigFix(`a\n`, {
        insert_final_newline: true
      });

      expect(result).to.equal(`a\n`);
    });
    
    it(`defaults to true`, function() {
      var result = editorconfigFix(`a\n`, {});

      expect(result).to.equal(`a\n`);
    });
  });
});
