const detectIndent = require('detect-indent');

/**
 * Applies editorconfig rules to a string content.
 * There is no support for `charset` because this function doesn't work with files.
 * 
 * @param {string} source   source code
 * @param {object} ecConfig editorconfig options
 * 
 * @returns {string}
 */
module.exports = function editorconfigFix(source, ecConfig) {
    if (typeof source !== 'string') {
        throw new Error('source must be a string');
    }

    if (!ecConfig || typeof ecConfig !== 'object') {
        throw new Error('editorconfig is required');
    }

    let lines = source.match(/^.+$/gm);
    if (!lines) {
        return source;
    }

    let options = editorConfigToInternal(ecConfig);
    let origIndent = detectIndent(source);

    let indentRegexp = new RegExp(`^((${origIndent.indent})*)(.*)`);
    let whitelines = lines.map(line => {
        let matches = line.match(indentRegexp); 
        let lineIndent = matches[1] || '';
        let theRest = matches[3] || '';

        if (options.trimTrailingWhitespace) {
            theRest = trimTrailingWhitespace(theRest);

            // consider indentation as a trailing whitespace
            if (theRest.length === 0 && lineIndent.length > 0) {
                lineIndent = '';
            }
        }

        if (lineIndent && options.indentationUnit) {
            let amount = Math.floor(lineIndent.length / origIndent.amount);
            return options.indentationUnit.repeat(amount) + theRest;
        } else {
            return lineIndent + theRest;
        }
    });

    if (options.finalNewline) {
        let lastLine = whitelines[whitelines.length - 1];
        if(lastLine.length > 0) {
            whitelines.push('');
        }
    }

    return whitelines.join(options.eol);
}

/**
 * Convert humanized editorconfig settings to a more convenient intenal format
 * 
 * @param {object} ecConfig editrorconfig settigs
 *   
 * @returns {object}    internal editorconfig-like format
 */
function editorConfigToInternal(ecConfig) {
  let config = {},
    indentSize,
    indentChar;

  if (ecConfig.indent_size) {
    indentSize = ecConfig.indent_size;
  } 

  if (ecConfig.indent_style === "tab") {
    indentChar = '\t';
    if (ecConfig.tab_width) {
        indentSize = ecConfig.tab_width;
    }
  } else if (ecConfig.indent_style === 'space') {
    indentChar = ' ';
  }

  if (indentChar && indentSize) {
    config.indentationUnit = indentChar.repeat(indentSize);
  }

  if (ecConfig.trim_trailing_whitespace) {
    config.trimTrailingWhitespace = ecConfig.trim_trailing_whitespace;
  } else {
    config.trimTrailingWhitespace = true;
  }

  if (ecConfig.insert_final_newline === false) {
    config.finalNewline = false;
  } else {
    config.finalNewline = true;
  }

  if (ecConfig.end_of_line === 'cr') {
      config.eol = '\r';
  } else if (ecConfig.end_of_line === 'crlf') {
      config.eol = '\r\n';
  } else {
      config.eol = '\n';
  } 

  return config;
}

function trimTrailingWhitespace(input = '') {
    return input.replace(/[\s]*$/, '');
}
