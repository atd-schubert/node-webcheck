## Introduction
This module is for analyzing websites.

## How to use

First install:
    npm insatll webcheck

Simply use:
    
    var Webcheck = require("webcheck");
    check = new Webcheck({pageRoot:"http://nodejs.org"});
    check.analyzer.use(Webcheck.middleware.analyzer.keywords()); // register middleware for the analyzer this way...
    check.reporter.use(Webcheck.middleware.report.statusCodeCheck()); // register middleware for the reporter this way...
    check.reporter(function(err, result, report){
      if(err) return console.error(err);
      console.log(JSON.stringify(report, null, 4));
    });

### Concept of this module
This module first crawls a webpage from given root URL. After this it can analyze the pages by adding middlewares to the analyzer from the result of the crawler. In the last step it can make a report by adding middlewares to the reporter from the result of the analyzer. There are a few implemented middlewares for analyzer and reporter, but especially the reporter-middlewares depends on your own concept. If you build a middleware that you think is missing in this module, feel free to make a pull request on [github](https://github.com/atd-schubert/node-webcheck/)...

## Enhance use

### Configure the crawler
You can configure the crawler by calling the crawler seperately:

    var Webcheck = require("webcheck");
    check = new Webcheck({pageRoot:"http://nodejs.org"});
    check.crawler(callbackFunction, options);

Note that the callback return the following parameters:
- error, if there is one
- the result of the crawler

As options you can set:
- maxConnections: number of connections at the same time (default 10)
- timeout: time to wait for an response (default 60000)
- userAgent: the string passed as user agent (default "node-webcheck")
- retries: number of retries if case of failing a request (default 3)
- retryTimeout: time to wait before request agoin (default 10000)
- skipForeigners: completely pass resources that have not the same domain (default false)
- followForeigners: crawl resourses that are linked on pages wich are not on the same domain like the base URL (default false)
- forceUTF8: convert all resources to utf-8 and don't care futher on encodings (default true)
    
### Make this module verbose (especially for debuging)
You can get additional informations by using the build-in logger. Activate it the following way to get detailed informations on the process:

    var Webcheck = require("webcheck");
    check = new Webcheck({pageRoot:"http://nodejs.org"});
    Webcheck.logger(check, {workerTimeout:10000});
    check.analyzer.use(Webcheck.middleware.analyzer.keywords()); // register middleware for the analyzer this way...
    check.reporter.use(Webcheck.middleware.report.statusCodeCheck()); // register middleware for the reporter this way...
    check.reporter(function(err, result, report){
      if(err) return console.error(err);
      console.log(JSON.stringify(report, null, 4));
    });

The workerTimeout specifies the time to wait to give again informations of a running worker.

### Set crawler results
If you have a (saved) result of the crawler you can set it and pass the crawling again by (you have the results set to crawlResult):

    var Webcheck = require("webcheck");
    check = new Webcheck({pageRoot:"http://nodejs.org"});
    
    check.crawler.results = crawlResult;
    check.crawler.status = "finished";
    
    check.reporter(function(err, result, report){
      if(err) return console.error(err);
      console.log(JSON.stringify(report, null, 4));
    });
### Set analyzer results
If you have a (saved) result of the analyzer you can set it and pass the analyzing again by (you have the results set to analyzerResult):

    var Webcheck = require("webcheck");
    check = new Webcheck({pageRoot:"http://nodejs.org"});
    
    check.analyzer.results = analyzerResult;
    check.analyzer.status = "finished";
    
    check.reporter(function(err, result, report){
      if(err) return console.error(err);
      console.log(JSON.stringify(report, null, 4));
    });

Note: you can connect the both methods of setting results...

## List of middlewares bundled in this module
For further informations please look at /lib/middleware.
### Analyzer
- mimeType
- pageSpeed
- seo (group)
- fetchDocument
- img
- countTags
- keywords
- W3CValidate

### Reporter
- statusCodeCheck

## How to build a middleware
### Analyzer
    exports.example = function(opts){ // Use this as a middleware template...
      var mw = function(worker){                        // This function collect jobs
        worker.name="Example Middleware";
        
        var mkJob = function(po, root){                 // This is the job that runs asynchron
          if(po.contentType.indexOf("text/html")>=0) {
            var fn = function(cb){
              console.log("This is a HTML file...");
              cb();
            }
            worker.addJob(fn, {method: "parallel"});
          }
          return;
        };
        return mkJob;
      };
      return mw;
    };

### Reporter
    exports.example = function(opts){ // Use this as a middleware template...
      var mw = function(worker){                        // This function collect jobs
        worker.name="Example Middleware";
        
        var mkJob = function(po, root, report){                 // This is the job that runs asynchron
          
          var getEntry = function(type){
            var cs = po.checksum;
            var url = po.url.absolute;
            report[type]
            if(!report[type]) report[type]={};
            if(!report[type][worker.name]) report[type][worker.name]={};
            if(!report[type][worker.name][cs]) report[type][worker.name][cs]={};
            if(!report[type][worker.name][cs][url]) report[type][worker.name][cs][url]=[];
            
            return report[type][worker.name][cs][url];
          };
          
          if(po.contentType.indexOf("text/html")>=0) {
            var fn = function(cb){
              getEntry("info").push("This is a HTML file...");
              cb();
            }
            worker.addJob(fn, {method: "parallel"});
          }
          return;
        };
        return mkJob;
      };
      return mw;
    };
## How to make an own logger
For further informations please look at /lib/logger.js. You simple have to listen to the following events. 
### Crawler
- start: returns the timestamp of the start
- finish: returns the timestamp of the start, the timestamp of the end, and the result from the crawler
- base: returns the base url, that will be crawled
- crawling: returns the URL of the element that will be crawled at the moment
- crawlingError: returns the error that occured during the crawling process
- reference: returns the url of the reference that the crawler found and the url of the document where it is liked from

### Analyzer
- start: returns timestamp of the start
- finish: returns timestamp of the start, timestamp of the end and the result
- use: returns the middleware as function and the corresponding worker as object

### Reporer
- start: returns timestamp of the start
- finish: returns timestamp of the start, timestamp of the end and the result
- use: returns the middleware as function and the corresponding worker as object

### Middlewares
- start-series: returns the worker as object and the timestamp of the start
- start-parallel: returns the worker as object and the timestamp of the start
- finish-series: returns worker as object, timestamp of start, timestamp of end
- finish-parallel: returns worker as object, timestamp of start, timestamp of end
