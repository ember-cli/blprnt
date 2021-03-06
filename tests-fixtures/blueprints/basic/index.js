'use strict';

var Blueprint = require('../../../lib/blueprint');
var RSVP = require('rsvp');

module.exports = Blueprint.extend({
  description: 'A basic blueprint',
  beforeInstall: function(options, locals){
    return RSVP.Promise.resolve().then(function(){
      locals.replacementTest = 'TESTY';
    });
  }
});
