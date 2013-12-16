"use strict";
var w3cjs = require("w3cjs");
var request = require('request');
var jsdom = require("jsdom");
var autoKeywords = require("auto-keywords");
var fs = require("fs");
var mime = require("mime");

//var jQueryURL = "http://code.jquery.com/jquery.js";
var jQuerySrc = fs.readFileSync( __dirname + "/jquery.js", "utf-8");

/*exports.example = function(opts){ // Use this as a middleware template...
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
};*/
exports.mimeType = function(opts){ // Use this as a middleware template...
  var mw = function(worker){
    worker.name="MimeType Checker";
    
    var mkJob = function(po, root){
      var tmp = po.url.absolute.split("/");
      tmp = tmp[tmp.length-1];
      tmp = tmp.split("?")[0].split("#")[0];
      if(tmp.split(".").length>1){
        var fn = function(cb){
          po.mimeType = mime.lookup(tmp);
          cb();
        }
        worker.addJob(fn, {method: "parallel", name:"Mime Lookup of "+po.url.absolute});
      }
      return;
    };
    return mkJob;
  };
  return mw;
};

exports.pageSpeed = function(opts){
  //if(!opts || !opts.apiKey) throw new Error("Please insert Google API key as option to the middleware ({apiKey:'Your Key here...').");
  //var apiKey = opts.apiKey;
  
  
  var mw = function(worker){
    worker.name="PageSpeed Test";
    
    var mkJob = function(po, root){
      if(po.contentType.indexOf("text/html")>=0 && po.status==200) {
        var fn = function(cb){
          request("https://www.googleapis.com/pagespeedonline/v1/runPagespeed?url="+po.url.absolute, function (error, response, body) { // +"&key="+apiKey
            if(error) return cb(error);
            
            if (response.statusCode == 200) {
              eval("po.pagespeed = "+body);
            }
            cb();
          });
        }
        worker.addJob(fn, {method: "parallel", name: "PageSpeed of "+po.url.absolute});
      }
      return;
    };
    return mkJob;
  };
  return mw;
};
exports.seo = function(opts){
  if (!opts) opts = {};
  var mw = function(worker){
    var fetchDocument = exports.fetchDocument()(worker);
    var countTags = exports.countTags({tags: ["title", "h1", "h2", "h3", "h4", "p", "b"]})(worker);
    var keywords = exports.keywords()(worker);
    
    // Maybe insert google API Key
    var pageSpeed;
    if(opts.googleApiKey) {
      speedTest = exports.pageSpeed({apiKey:opts.googleApiKey})(worker);
    } else {
      speedTest = exports.pageSpeed()(worker);
    }
    
    
    worker.name="SEO Group";
    
    var mkJob = function(po, root){
      fetchDocument(po, root);
      countTags(po, root);
      keywords(po, root);
      speedTest(po, root);
      return;
    };
    return mkJob;
  };
  return mw;
};

exports.fetchDocument = function(opts){
  if(!opts) opts={};
  
  var fetchHead = opts.fetchHead || true;
  var filterFn = opts.filterFn || function(po){
    return po.contentType.indexOf("text/html")>=0 && po.status==200;
  };
  
  var mw = function(worker){
    worker.name="Document fetcher";
    
    var mkJob = function(po, root){
      if(filterFn(po)) {
        var fn = function(cb){
          request(po.url.absolute, function (error, response, body) {
            if(error) return cb(error);
            if (response.statusCode == 200) {
              po.document = body;
              if(fetchHead) po.headers = response.headers;
            }
            cb();
          });
        }
        worker.addJob(fn, {method: "series", name: "Fetchting document "+po.url.absolute});
      }
      return;
    };
    return mkJob;
  };
  return mw;
};

exports.img = function(opts) {
  var mw = function(worker){
    worker.name="Image analyzer";
    
    var mkJob = function(po, root){
      if(po.contentType.indexOf("text/html")>=0 && po.status==200) {
        var fn = function(cb){
          jsdom.env(
            po.document ? po.document : po.url.absolute,
            [],
            function (errors, window) {
              var arr = [];
              var i=0;
              po.imgs = {};
              arr = window.document.querySelectorAll("img");
              for (i=0; i<arr.length; i++) {
                if(arr[i].src) po.imgs[arr[i].src] = {src:arr[i].src, alt:arr[i].alt, title:arr[i].title};
              }
              cb();
            }
          );
        }
        worker.addJob(fn, {method: "parallel", name: "Analyze IMG Tags of "+po.url.absolute});
      }
      return;
    };
    return mkJob;
  };
  return mw;
};

exports.countTags = function(opts) {
  var tags = opts.tags || ["title", "h1", "h2", "h3", "h4", "h5", "h6", "p"];
  var mw = function(worker){
    worker.name="Tag Counter";
    
    var mkJob = function(po, root){
      if(po.contentType.indexOf("text/html")>=0 && po.status==200) {
        var fn = function(cb){
          jsdom.env(
            po.document ? po.document : po.url.absolute,
            [],
            function (errors, window) {
              if(!po.tags || !po.tags.vektor) po.tags = {vektor: {}};
              
              var i=0;
              for (i=0; i<tags.length; i++) {
                po.tags.vektor[tags[i]] = window.document.querySelectorAll(tags[i]).length;
              }              
              cb();
            }
          );
        }
        worker.addJob(fn, {method: "parallel", name: "Counting tags in "+po.url.absolute});
      }
      return;
    };
    return mkJob;
  };
  return mw;
};

exports.keywords = function(opts){
  var mw = function(worker){
    worker.name="Keyword lookup";
    
    var mkJob = function(po, root){
      if(po.contentType.indexOf("text/html")>=0 && po.status==200) {
        var fn = function(cb){
          po.keywords = {meta: {}, body: {vektor:{}}};
          jsdom.env(
            po.document ? po.document : po.url.absolute,
            [],//[jQueryURL],
            function (errors, window) {
              eval(jQuerySrc);
              var i, n;
              
              po.keywords.meta.description = window.$('meta[name="description"]').attr("content") || "";
              po.keywords.meta.keywords = window.$('meta[name="keywords"]').attr("content") || "";
              po.keywords.meta.title = window.$('title').text() || "";
              
              for(n=1; n<9; n++ ) {
                po.keywords.meta["h"+n] = [];
                window.$('h'+n).each(function(){po.keywords.meta["h"+n].push(window.$(this).text());});
              }
              
              var text = window.$("body").text();
              var lowerText = text.toLowerCase();
              var kw = autoKeywords(text);
              
              po.keywords.body.ranked = kw;
              // TODO: redo: po.keywords.body.wc = text.match(/\S+/g).length;
              
              
              for(i=0; i<kw.length; i++) {
                var ce = po.keywords.body.vektor[kw[i]] = {count: lowerText.split(kw[i]).length-1, contains: []};
                if(po.keywords.meta.title.toLowerCase().split(kw[i]).length>1) ce.contains.push("TITLE");
                if(po.keywords.meta.keywords.toLowerCase().split(kw[i]).length>1) ce.contains.push("META:KEYWORDS");
                if(po.keywords.meta.description.toLowerCase().split(kw[i]).length>1) ce.contains.push("META:DESCRIPTION");
                
                for(n=1; n<9; n++) {
                  if(po.keywords.meta["h"+n].length>0 && po.keywords.meta["h"+n].join(" ").toLowerCase().split(kw[i]).length>1) ce.contains.push("H"+n);
                }
              }              
              cb();
            }
          );
        }
        worker.addJob(fn, {method: "parallel", name: "Collecting keywords in "+po.url.absolute});
      }
      return;
    };
    return mkJob;
  };
  return mw;
};

exports.W3CValidate = function(opts){
  var mw = function(worker){
    worker.name="W3C Validation Service";
    
    var mkJob = function(po, root){
      if(po.contentType.indexOf("text/html")>=0 || po.contentType.indexOf("text/css")>=0 || po.contentType.indexOf("application/javascript")>=0 && po.status==200) {
        var fn = function(cb){
          w3cjs.validate({
            file: po.url.absolute,
            output: 'json',
            callback: function(res){
              po.validator = res.messages;
              cb();
            }
          });
        }
        worker.addJob(fn, {method: "series", name: "Validate '"+po.url.absolute+"' with W3C Validator"});
      }
      return;
    };
    return mkJob;
  };
  return mw;
};