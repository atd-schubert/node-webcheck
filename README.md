## Introduction
Webcheck gives you an infrastructure to analyze websites and make a report. It is build very generic for supporting a wide range of possible use cases. You are able to analyze a single page, a whole domain or even everything connected to one or more seed resources. You can analyze every content-type. Only the basic middlewares, to use webcheck, are included. But there is a [list]() with more middlewares. Please send me the link to yours if you develop one.

### Notice
This module is refactored completely in version v0.3.0!

## How to use

*First install*
    npm install webcheck

*Then run in node*:

    var Webcheck = require("webcheck");
    webcheck = new Webcheck();
        // first let webcheck follow different resources
    webcheck.analyzer.use(Webcheck.middlewares.analyzer.followRedirects());
    webcheck.analyzer.use(Webcheck.middlewares.analyzer.followHTML({filter:/example.com/}));
    webcheck.analyzer.use(Webcheck.middlewares.analyzer.followCSS({filter:/http/}));
    
        // then let webcheck analyze the status code of the request and list all resources and referrers
    
    webcheck.analyzer.use(Webcheck.middlewares.analyzer.listResources());
    webcheck.analyzer.use(Webcheck.middlewares.analyzer.statusHTTP());
    
        // if you want add your own or others middlewares!
    webcheck.analyzer.use(function(resource, cb){
      var headers = resource.getResult().headers;
      resource.addAnalysis("headers", headers);
      if(!headers['content-type']) resource.addReport("warning", "Content-Type Check", {message: "This resource has no content-type!", headers: headers});
    });
        // Make webcheck verbose
    webcheck.on("error", console.error);
    webcheck.on("resource", function(resource){
      console.log("Analyzing: "+resource.getURL());
    })
    
        // let webcheck start analyzing
    webcheck.analyzer("http://www.example.com", function(err, result, report){
      if(err) return console.error(err);
      console.log(JSON.stringify(report, null, 2));
      
        // let webcheck starting the reporter
      webcheck.reporter(function(err, report){
    
        // on report is now the normal structured report, but in many cases the reverse report is mush smarter...
        console.log(JSON.stringify(webcheck.getReverseReport(), null, 2));
        
      });
    });

## Concept of this module
You can analyze a website in two steps.

The first step is webcheck.analyzer({uri:"https://example.com"}, callback). In this step your middleware can access the whole resource including the request that was fetched. All arguments are optional.

The second step is webcheck.reporter(opts, callback). In this step your middleware can access the whole results of all crawled resources. All arguments are optional.

_These two steps are implemented to provide huge crawls with much data but less system-resources!_

This module, without middlewares, would do nothing. You have to specify middlewares for both steps before you call them, like this:


    webcheck.analyzer.use(fn);

You can use one of the [build-in middlewares](#Included-build-in-Middlewares), one of the [community middlewares](), or build your own like this way:


    webcheck.analyzer.use(function(resourceObject, callback){
      // do something with the resource and finish with…
      callback();
    });

Please read the documatation of the [resource class](#Resource-Class) for further informations...



## Webcheck Class
### Methods of webcheck
#### webcheck.analyzer(optOpts, optCallback)
You can run the analyzer against a website passed in the options (optOpts = {uri:yourURL}).

If you want you can add a callback function, that receives the same arguments like the [finishAnalyzer event](#finishAnalyzer), or use the events instead...
#### webcheck.analyzer.use(middleware)
You can add a middleware to the analyzer by calling this function with a [middleware function](#Middleware).
#### webcheck.reporter(optOpts, optCallback)
You can run the reporter, with its middlewares, against all resources that the analyzer have crawled.

If you want you can add a callback function, that receives the same arguments like the [finishReporter event](#finishReporter), or use the events instead...
#### webcheck.reporter.use(middleware)
You can add a middleware to the reporter by calling this function with a [middleware function](#Middlewares).
#### webcheck.getResources()
This method receives an associative array by url of all analyzed [resources objects](#Resource-Class).
#### webcheck.getResource(url)
This method receives a resource-object of a specific crawled url.
#### webcheck.getAnalysis(optUrl)
This method receives a whole tree of analysis data or optional just from a specific url.
#### webcheck.getReport(optUrl)
This method receives a whole tree of a report or optional just from a specific url.
#### webcheck.getReverseReport(optUrl)
Inverses the structure of the json tree of the report.
### Events of webcheck

All events emitted on the webcheck object.

    var webcheck = new Webcheck();
    webcheck.on(event, fn);

Webcheck emits the following events:

#### error (error)
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
This event have an object with a name of entry, the data that should be saved on the resource and the resource itself as argument and is fired when analysis data is saved with [resource.addAnalysis](#ro.getAnalysis(optName)).

#### addReport ({level:level, name:name, data:data, resource:ro})
This event have an object with a name of entry, the level of the report, the data that should be saved on the resource and the resource itself as argument and is fired when report data is saved with [resource.addReport](#ro.addReport(optName)).

#### resource (resource)
This is fired when a new resource have been crawled

#### resource:{url} (resource)
This is fired when a new resource have been crawled but the event specifies a specific url like: resource:http://example.com


## Resource Class
### Methods of Resource
#### ro.getResult()
This method returns the original result of the crawler. If it's possible to parse for the crawler you can work with jQuery on result.window.$.
#### ro.getURL()
This method returns the url of the resource.
#### ro.getWebcheck()
This method returns the corresponding web check object.
#### ro.addAnalysis(name, data)
This method can add analysis data to the resource object. You have to call this method with an identifying name and your data.
#### ro.removeAnalysis(name)
Remove a dataset from this resource object.
#### ro.getAnalysis(optName)
Returns a dataset of a given identifier or the whole tree of analysis data.
#### ro.addReport(level, name, data)
This method can add reports to the resource object. You have to call this method with an identifying name, a level and your report data.
#### ro.getReport(optHash, optLevel)
Returns a report of a given identifier and a given reporting level or the whole tree of reporting data.
#### ro.follow(url)
Let webcheck follow an url and add it to its resources. Also it adds referrers to the target resource.
#### ro.addResource(url)
Add a resource to a resource object (like a javascript file from an html document).
#### ro.getResources()
Returns a list of all resources
#### ro.getReferrers()
Returns a list of all referrers 
#### ro.addReferrer(href)
Add a referrer to a resource object.  
#### ro.clean()
This method deletes the result and disables the ability to follow an url. Normally this method is called automatically after the analyzer middleware is ready on a resource object. Normally you don’t need to call this method, so be very careful on this!

### Events
This Class doesn't have an EventEmitter but emits these events on the webcheck object:

* error
* addAnalysis
* addReport
* resource
* resource:{url}

Please look at [events of webcheck](#Events-of-webcheck) for further informations.

## Middlewares
A middleware is a function that get passed a ResourceObject and a callback function. You can build them like this:

    webcheck.analyzer.use(function(resource, cb){
      var headers = resource.getResult().headers;
      resource.addAnalysis("headers", headers);
      if(!headers['content-type']) resource.addReport("warning", "Content-Type Check", {message: "This resource has no content-type!", headers: headers});
    });
    
### Use of jQuery
If the crawler is able to parse a valid document for jQuery and jsdom you can use jQuery by calling on a resource object:
    resource.getResult().window.$
### Included build-in Middlewares
#### followHTML
This middleware follows all resources on a html document, specified by a regular expression, or add them as resource.
   webcheck.analyzer.use(Webcheck.middleware.alanyzer.followHTML({filter:/example.com/}));
#### followCSS
This middleware follows all resources on a css resource, specified by a regular expression, or add them as resource.
   webcheck.analyzer.use(Webcheck.middleware.alanyzer.followCSS({filter:/example.com/}));
#### followRedirects
This middleware follows redirects using a location in header.
#### statusHTTP
This middleware saves the status on the analysis.
#### listResources
This middleware saves all resources and referrers on the analysis.
