module.exports = function processTemplate(content, context) {
  var options = {
    evaluate:    /<%([\s\S]+?)%>/g,
    interpolate: /<%=([\s\S]+?)%>/g,
    escape:      /<%-([\s\S]+?)%>/g
  };
  return require('lodash.template')(content, options)(context);
}
