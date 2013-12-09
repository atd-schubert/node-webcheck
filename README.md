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
    check.reporter(function(err, reslut, report){
      if(err) return console.error(err);
      console.log(JSON.stringify(report, null, 4));
    });
    
## List of middlewares
### Analyzer
- mimeType
- pageSpeed
- seo
- etchDocument
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
