## Blueprint

[![Build Status](https://travis-ci.org/ember-cli/blueprint.svg?branch=master)](https://travis-ci.org/ember-cli/blueprint)

**Under Construction**

A tool for describing and generating files and directory structures.

Extracted from [ember-cli](http://ember-cli.com/).

## Writing a blueprint

```
example-blueprint/
├── files
│   ├── lib
│   │   └── __name__.js
│   └── tests
│       └── __name__-test.js
└── index.js
```

## Installing a blueprint

```js
var Blueprint = require('ember-cli-blueprint');

var exampleBlueprint = Blueprint.load('path/to/example-blueprint');

var options = {
  entity: {
    name: 'foo'
  },
  target: 'path/to/destination'
};

fooBlueprint.install(options)
  .then(function() {
    console.log('Done!');
  });
```

Generates the following:

```
path/to/destination/
├── lib
│   └── foo.js
└── tests
    └── foo-test.js
```