# Plugins for webcheck

*[Webcheck](https://github.com/atd-schubert/node-webcheck) is a [node.js](https://nodejs.org/) module for analyzing
and crawling web resources coded by Arne Schubert.*

## List of Plugins

- **[webcheck-cheerio](https://github.com/atd-schubert/webcheck-cheerio)**: Create a jQuery representation of HTML and
XML resources with [cheerio](https://github.com/cheeriojs/cheerio)
- **[webcheck-crawl-once](https://github.com/atd-schubert/webcheck-crawl-once)**: Provides that a web resource is not
crawled again
- **[webcheck-follow](https://github.com/atd-schubert/webcheck-follow)**: Follow resources from HTML and CSS resources.
- **[webcheck-mirror](https://github.com/atd-schubert/webcheck-mirror)**: Mirroring / copy resources.
- **[webcheck-to-string](https://github.com/atd-schubert/webcheck-to-string)**: Converts a buffer into a string and
provide a getString function in result.
- **[webcheck-robots](https://github.com/atd-schubert/webcheck-robots)**: Process robots.txt.

## Make your own Plugin

*If you make a plugin for webcheck, please make a pull request and add your plugin to this list with description.*

### Introduction

The basic logic for plugins are provided in the webcheck plugin class. You can find the source in `plugin.js` on
repository root. The best and easiest way to make a plugin is to augment this class for your plugin!

### Dependency to webchecks plugin class

You have to add webcheck as dependency in your package.json:

```json
{
  "dependencies": {
    "webcheck": "~1.0.0"
  }
}
```

### Basic structure

Your Plugin should have this structure:

```js
/*jslint node:true*/

'use strict';

var pkg = require('./package.json');          // Your package / module information are recommended

var Plugin = require('webcheck/plugin');      // Require plugin super-class for augmenting

var ExamplePlugin = function (opts) {
    Plugin.apply(this, arguments);            // Call constructor of super-class

    // register a middleware if you want to
    this.middleware = function (result, next) {
        console.log(result);
        next();
    };

    // register events on webcheck if you want to
    this.on.result = function (result) {};
};

ExamplePlugin.prototype = {
    __proto__: Plugin.prototype,              // Augment prototype from super-class

    package: pkg
};

module.exports = ExamplePlugin;               // Export if you create it as module

```

You can add a plugin to webcheck this way

```js
var myPlugin = new MyPlugin({myOptions: true});
webcheck.addPlugin(myPlugin);

myPlugin.enable();
```

For a working example, please look at `example.js`. For further information make a jsdoc from sources.
