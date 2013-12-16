"use strict";

var kwv = require("./keyword-vektor");

/*exports.example = function(opts){ // Use this as a middleware template...
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
};//*/

exports.keywords = function(opts){ // Use this as a middleware template...
  var mw = function(worker){                        // This function collect jobs
    worker.name="Keyword checker";
    var pos = [];
    var mkJob = function(po, root, report){                 // This is the job that runs asynchron
      
      var mkEntry = function(type){
        var cs = po.checksum;
        var url = po.url.absolute;
        var entry = {checksum: cs, url:url, type: type, message: ""};
        
        if(!report[type]) report[type]={};
        if(!report[type][worker.name]) report[type][worker.name]=[];
        
        report[type][worker.name].push(entry);
        
        return entry;
      };
      
      if(po.contentType.indexOf("text/html")>=0 && po.status == 200 && po.keywords) {
        pos.push(po);
        var fn = function(cb){
          var i = 0;
          var res;
          for(i=0; i<pos.length; i++) {
            // Compare this file with others...
            if(pos[i] !== po) {
              res = kwv.compare(po.keywords.body.vektor, pos[i].keywords.body.vektor);
              if(res>0.5) mkEntry("alert").message = "This file is very similar (>"+Math.round(res*100)+"%) to "+pos[i].url.absolute;
              else if(res>0.2) mkEntry("warning").message = "This file is similar (>"+Math.round(res*100)+"%) to "+pos[i].url.absolute;
              else if(res>0.1) mkEntry("info").message = "This file is quite similar (>"+Math.round(res*100)+"%) to "+pos[i].url.absolute;
            }
          }
          
          // Wordcount
          if(po.keywords.body.wc<300) mkEntry("warning").message = "This file has less then 300 words...";
          
          // Compare title and heading-1
          /*res = kwv.compare(po.keywords.meta["h1"][0].vektor, po.keywords.meta.title.vektor);
          console.warn("h1 to Title: "+Math.round(res*100));
          if(res < 0.5) mkEntry("alert").message = "Heading and title are very unsimilar (~"+Math.round(res*100)+"%)!";
          //*/
          // Compare title and content
          res = kwv.compare(po.keywords.meta.title.vektor, po.keywords.body.vektor);
          if(res < 0.5) mkEntry("alert").message = "Heading and content are very unsimilar (~"+Math.round(res*100)+"%)!";
          cb();
        }
        worker.addJob(fn, {method: "parallel", name: "Comparing the keywords of "+po.url.absolute+" with the other pages..."});
      }
      return;
    };
    return mkJob;
  };
  return mw;
};

exports.W3CValidate = function(opts){ // Use this as a middleware template...
  var mw = function(worker){                        // This function collect jobs
    worker.name="W3C Validation checker";
    
    var mkJob = function(po, root, report){                 // This is the job that runs asynchron
      
      var mkEntry = function(type){
        var cs = po.checksum;
        var url = po.url.absolute;
        var entry = {checksum: cs, url:url, type: type, message: ""};
        
        if(!report[type]) report[type]={};
        if(!report[type][worker.name]) report[type][worker.name]=[];
        
        report[type][worker.name].push(entry);
        
        return entry;
      };
      if(po.validator && po.validator.length>0) {
        var fn = function(cb){
          var i;
          for(i=0; i<po.validator.length; i++) {
            if(po.validator[i].type === "error") {
              mkEntry("alert").message=po.validator[i].message;
            } else {
              mkEntry(po.validator[i].type).message=po.validator[i].message;
            }
          }
          cb();
        }
        worker.addJob(fn, {method: "parallel", name: "Fetching the results of the W3C Validator to the report..."});
      }
      return;
    };
    return mkJob;
  };
  return mw;
};

exports.statusCodeCheck = function(opts){
  var mw = function(worker){                        // This function collect jobs
    worker.name="Status-code checker";
    
    var mkJob = function(po, root, report){                 // This is the job that runs asynchron
      var mkEntry = function(type){
        var cs = po.checksum;
        var url = po.url.absolute;
        var entry = {checksum: cs, url:url, type: type, message: ""};
        
        if(!report[type]) report[type]={};
        if(!report[type][worker.name]) report[type][worker.name]=[];
        
        report[type][worker.name].push(entry);
        
        return entry;
      };
      if(po.status != 200) {
        var fn = function(cb){
          switch(po.status) {
            case 404:
            case 500:
            case 501:
              mkEntry("alert").message="Document have status-code "+po.status+" and reffered from "+po.referrers.join(", ");
              break;
            default:
              mkEntry("warning").message="Document have status-code "+po.status+" and reffered from "+po.referrers.join(", ");

          }
          cb();
        }
        worker.addJob(fn, {method: "parallel", name: "Checking the status-code of "+po.url.absolute+"..."});
      }
      return;
    };
    return mkJob;
  };
  return mw;
};
