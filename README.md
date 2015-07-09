## Introduction
Webcheck gives you an infrastructure to analyze websites and make a report. It is build very generic for supporting a wide range of possible use cases. You are able to analyze a single page, a whole domain or even everything connected to one or more seed resources. You can analyze every content-type. Here is a [list](https://github.com/atd-schubert/node-webcheck/blob/master/MIDDLEWARES.md) with middlewares. Please send me the link to yours if you develop one.

### Notice
This module is refactored completely in version v1.0.0!

## How to use

**First install**

    npm install webcheck

**Then run in node**
```js
var Webcheck = require("webcheck");
webcheck = new Webcheck();
    // Add middlewares
webcheck.use(/* your middleware here */);

    // if you want add your own or others middlewares!
webcheck.use(function(result){
  var webcheck = this;                              // Get webcheck object (webcheck is binded on middleware!)
  var url = result.url;                             // Crawled URL
  var taskParameters = result.request.task.options; // Options in webcheck.crawl(url, parameters)
  var request = result.request;                     // Return of request call
  var response = result.response;                   // Response (stream) of request
  var status = result.response.statusCode;          // Status code of response
  var headers = result.response.headers;            // Response header

  result.getCheerio(function (err, $) {             // Get cheerio of response
    if (err) {
      /* handle error */
      return;
    }
    $(/* query like you know from jQuery */)
  });
});
    // Make webcheck verbose
webcheck.logger.level = 'debug';

    // let webcheck start analyzing
webcheck.crawl("http://www.example.com");
```

## Concept of this module
Yu

    webcheck.analyzer.use(fn);

You can use one of the [community middlewares](https://github.com/atd-schubert/node-webcheck/blob/master/MIDDLEWARES.md), or build your own like this way:

```js

var myMiddleware = function myMiddlewareFactory(opts) {
  var mw;
  opts = opts || {};

  mw = function myMiddleware(result) {
    if (/^https?:\/\/(www\.)?example\.com\//) {
      if ()
    }
  };

}

```

You can add a middleware to webcheck this way

```js
webcheck.use(myMiddleware({myOptions:true}));
```

For a working example, please look at `example.js`.


## Webcheck Class
### Methods of webcheck
#### webcheck.use(fn)
Add a middleware to webcheck.

#### webcheck.crawl(url, options)
Request a resource

##### List of Options
* `sleep | {Number}`: Time to wait till request (default: 0)
* `headers | {{}}`: Default headers (deafult: {'User-Agent': "webcheck v1.0.0"})
* `logger | {winston#}`: A winston logger
* `request | {request}`: The used request-module

### Properties of webcheck
#### webcheck.logger
This is a instance of [winston](https://github.com/winstonjs/winston). You should use this for logging, but you are able to swap this property.
#### webcheck.request
This is a instance of [request](https://github.com/request/request). Webcheck use this as function to request a resource. If you want another request function, for example to request resources from TOR, you are able to swap this property.
#### webcheck.middlewares
Array of used middlewares.
#### webcheck.report
An object to add report data, if you want.


### Events of webcheck

All events emitted on the webcheck object.

    var webcheck = new Webcheck();
    webcheck.on(event, fn);

Webcheck emits the following events:

#### error (error)
This event have an error as argument and is fired when a middleware or the core-modules itself emits an error.

#### use (middleware)
This event have an error as argument and is fired when a middleware or the core-modules itself emits an error.

#### analyzerError (error)
This event have an error as argument and is fired when a analyzer-middleware or the analyzer itself emits an error.

#### reporterError (error)
This event have an error as argument and is fired when a reporter-middleware or the reporter itself emits an error.

#### startAnalyzer ({timestamp: Date.now()})
This event have an object with a timestamp as argument and is fired when a analyzer starts.

#### finishAnalyzer ({timestamp: Date.now(), analysis:analysis})
This event have an object with a timestamp and the analysis of webcheck as argument and is fired when a analyzer finishes.

#### startReporter ({timestamp: Date.now()})
This event have an object with a timestamp as argument and is fired when a reporter starts.

#### finishReporter ({timestamp: Date.now(), report:report})
This event have an object with a timestamp and the report of webcheck as argument and is fired when a analyzer finishes.

#### addAnalysis ({name:mwName, data:data, resource:ro})
This event have an object with a name of entry, the data that should be saved on the resource and the resource itself as argument and is fired when analysis data is saved with [resource.addAnalysis](#rogetanalysisoptname).

#### addReport ({level:level, name:name, data:data, resource:ro})
This event have an object with a name of entry, the level of the report, the data that should be saved on the resource and the resource itself as argument and is fired when report data is saved with [resource.addReport](#roaddreportlevel-name-data).

#### resource (resource)
This is fired when a new resource have been crawled

#### resource:{url} (resource)
This is fired when a new resource have been crawled but the event specifies a specific url like: resource:http://example.com
