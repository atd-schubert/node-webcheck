"use strict";

var Crawler = require("crawler").Crawler;
var resolveUrl = require("url").resolve;


var getDomain = function(url){
  return url.split("/")[2];
};

module.exports = function(){
  var url, opts, cb;
  var i = 0;
  for (i=0; i<arguments.length; i++) {
    switch (typeof arguments[i]) {
      case "object":
        opts = arguments[i];
        url = url || opts.url;
        cb = cb || opts.callback;
      case "function":
        cb = arguments[i];
        break;
      case "string":
        url = arguments[i];
        break;   
    }
  }
  if(!cb) cb = function(err){
    if(err) return console.error(err);
    console.warn("You havn't specify a callback function...");
  };
  if(!url) return cb("You have to specify a root url.");
  
  opts.maxConnections = opts.maxConnections || 10;
  opts.timeout = opts.timeout || 60000;
  opts.userAgent = opts.userAgent || "node-webcheck";
  opts.retries = opts.retries || 3;
  opts.retryTimeout = opts.retryTimeout || 10000;
  opts.skipForeigners = opts.skipForeigners || false; // completly skip urls of other domains than the baseURL
  opts.followForeigners = opts.followForeigners || false; // just check links to foraign domains, but don't check links on this pages
  
  var emit = opts.eventEmitter = opts.eventEmitter || function(){}; // Add eventemitter if you want to...
  
  if (opts.forceUTF8 === undefined) opts.forceUTF8 = true;
  // at this moment duplicates are all skipped... // if (opts.skipDuplicates === undefined) opts.skipDuplicates = true;
  
  var res = {};
  
  emit("base", url);
  
  var c = new Crawler({
    "maxConnections": opts.maxConnections,
    "timeout": opts.timeout,
    "userAgent": opts.userAgent,
    "retries": opts.retries,
    "retryTimeout": opts.retryTimeout,
    "forceUTF8": opts.forceUTF8,
    "callback": function(error,result,$) {
      if (error) {
        return emit("crawlingError", error); //res[result.window.location.href] = {};
      }
      try {
        var po = res[result.request.href] = {};

        po.url = result.request.href;
        po.status = result.statusCode;
        po.headers = result.headers;
        po.contentType = result.headers["content-type"];
        po.links = [];
      
        emit("crawling", po.url);
        
        if(po.contentType.indexOf("text/html")<0) return; // not a HTML // TODO: try to get another analyzer
        if(getDomain(url) !== getDomain(po.url) && !opts.followForeigners) return; // don't follow foraign pages if configured...
        
        var base = $("base").attr("href") || result.window.location.href;
                
        $("a[href]").each(function(index,a) {
          var href = resolveUrl(base, a.href);
          href = href.split("#")[0]; // crawl just url without hash!
          
          if(po.links.indexOf(href) < 0) po.links.push(href);
          emit("reference", href, po.url);
          
          if(getDomain(url) !== getDomain(href) && opts.skipForeigners) return;
          
          if(!res[href]) {
            res[href] = {};
            c.queue(href);
          }
        });
        
        var contentCallback = function(fn) { // std callback for nonHTML content. It can be extended with fn argument!
          return function(err, result) {
            var po = res[result.request.href] = {};
            po.url = result.request.href;
            po.status = result.statusCode;
            po.headers = result.headers;
            po.contentType = result.headers["content-type"];
            po.links = [];
            
            emit("crawling", po.url);
                        
            if(fn) fn(err, result, po);
          };
        }
        
        $("script[src]").each(function(index, script){
          var href = resolveUrl(base, script.src);
          if(po.links.indexOf(href) < 0) po.links.push(href);
          emit("reference", href, po.url);
          if(!res[href]) {
            res[href] = {};
            c.queue({
              "uri": href,
              "jQuery": false,
              "callback": contentCallback()
            });
          }
        });
        
        $('link[rel="stylesheet"]').each(function(index, link){
          var href = resolveUrl(base, link.href);
          if(po.links.indexOf(href) < 0) po.links.push(href);
          emit("reference", href, po.url);
          if(!res[href]) {
            res[href] = {};
            c.queue({
              "uri": href,
              "jQuery": false,
              "callback": contentCallback(function(err, result, po){
                var i = 0;
                var href = "";
                var splits = result.body.split("url(");
                for (i=1; i<splits.length; i++) {
                  href = splits[i].split(")")[0];
                  href = href.trim();
                  if(href.substr(0, 1)==='"' || href.substr(0, 1)==="'") {
                    href = href.substring(1, href.length-1);
                  }
                  href = resolveUrl(po.url, href);
                  if(po.links.indexOf(href) < 0) po.links.push(href);
                  emit("reference", href, po.url);
                  
                  if(!res[href]) {
                    res[href] = {};
                    c.queue({
                      "uri": href,
                      "jQuery": false,
                      "callback": contentCallback()
                    });
                  }
                }
              })
            });
          }
        });
        
        $('img[href]').each(function(index, img){
          var href = resolveUrl(base, img.href);
          if(po.links.indexOf(href) < 0) po.links.push(href);
          emit("reference", href, po.url);
          if(!res[href]) {
            res[href] = {};
            c.queue({
              "uri": href,
              "jQuery": false,
              "callback": contentCallback()
            });
          }
        });
        
      } catch(e) {
        try {
          res[result.window.location.href] = {status: "error"}; // try to reset result
        } catch(e) {
          
        }
      }
    },
    "onDrain": function(){ // no arguments!
      var result = [];
      for(var hash in res) {
        if(res[hash].url) result.push(res[hash]);
      }
      
      cb(null, result);
    }
  });
  c.queue(url);
  
};