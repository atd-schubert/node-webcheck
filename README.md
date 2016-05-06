## Introduction
Webcheck gives you an infrastructure to analyze web resources. It is build very generic for supporting a wide range of
possible use cases. You are able to analyze a single page, a whole domain or even everything connected to one or more
seed resources. You can analyze every content-type.

Version 1.0.0 is refactored completely. Webcheck uses streams. Because of the streams it uses plugins instead of
middleware. There is a [list of plugins](https://github.com/atd-schubert/node-webcheck/blob/master/PLUGINS.md)
in the github repository. Please send me the link to yours if you develop one. Otherwise you should look on
[npm](https://www.npmjs.com/) for modules with prefix 'webcheck-'.

## How to use

### Installation

```bash
npm install webcheck
```

### Use in node.js

```js
var Webcheck = require('webcheck').Webcheck;
var AnyPlugin = require('webcheck-any-plugin');

var webcheck = new Webcheck();
var anyPlugin = new AnyPlugin({your: 'options'});
webcheck.addPlugin(anyPlugin);

anyPlugin.enable();

webcheck.crawl({
    url: 'http://some.website/url'
}, function (err) {
    if (err) {
        console.error('There was an error while crawling', err);
    }
    console.log('Crawling done...');
});
```


## Concept of this module
Since version 1.0.0 webcheck uses streams instead of callbacks. It is
not compatible to older versions!

Webcheck is small featured. You should extend your functionality with
plugins. Take a look at the
[list of plugins](https://github.com/atd-schubert/node-webcheck/blob/master/PLUGINS.md).

## Plugins

For further information about plugins in webcheck take a look at the
[plugin readme](PLUGINS.md).

## Webcheck Class
### Methods of webcheck
#### webcheck.addPlugin(plugin)

Add a plugin to webcheck.

#### webcheck.crawl(settings, callback)

Request a resource

##### List of settings

* `url | {string}` [mandatory]: URL to crawl
* `wait | {Number}`: Time to wait till request (default: 0)
* `headers | {Object}`: Default headers (default: {"User-Agent": "webcheck v1.0.0"})
* `request | {request}`: The used request-module
* `immediately | {boolean}`: Should the crawl push as next one to queue.
* `parameters | {Object}`: A object to pass parameters to other plugins about this crawl

### Properties of webcheck

#### webcheck.request

This is a instance of [request](https://github.com/request/request).
Webcheck use this as function to request a resource. If you want another
request function, for example to request resources from TOR with
[torrequest](https://github.com/atd-schubert/torrequest), you are able
*to swap this property.

#### webcheck.middlewares

Array of used middleware.

### Events of webcheck

All events emitted on the webcheck object.`

```js
var webcheck = new Webcheck();
webcheck.on(event, fn);
```

Webcheck emits the following events:

* `crawl` (request-settings): Emitted directly after calling crawl method.
* `request` (request-settings): Emitted before request is executed.
* `result` ({url, request-settings, request, response}): Emitted after middleware are executed and document is fetched
* `drain`: Emitted on draining of queue
* `queue` (request-settings): Emitted before adding to queue
* `addPlugin` (plugin): Emitted when a plugin is added
* `enablePlugin` (plugin): Emitted when a added plugin gets enabled
* `disablePlugin` (plugin): Emitted when a added plugin gets disabled


## Changes on version 1.1.0
Webcheck is (from now on) developed with
[TypeScript](http://www.typescriptlang.org/). In the older versions we
had exported Webcheck as module and not as class from a module.

```js
var Webcheck = require('webcheck');
```

From now on Webcheck is a class within the module `webcheck`.

That means no changes for Plugin, but Webcheck should now required over:
```js
var Webcheck = require('webcheck').Webcheck;
``` 

*For compatibility reasons it is still possible to require Webcheck the
old way... But the TypeScripts Typings would be incorrect!*

This way you should import this module within ES6 or TypeScript:

```typescript
import { Webcheck, Plugin } from 'webcheck';
```
