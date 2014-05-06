"use strict";

var resolveUrl = require("url").resolve;
var fs = require("fs");

exports.analyzer = {};
exports.reporter = {};

exports.analyzer.listResources = function listResourcesMiddlewareBuilder(opts){
  // no opts at this time...
  return function listResourcesMiddleware(ro, cb){
    ro.addAnalysis("referrers", ro.getReferrers());
    ro.addAnalysis("resources", ro.getResources());
    cb();
  };
};
exports.analyzer.followRedirects = function followHTMLMiddlewareBuilder(opts){
  // no opts at this time... TODO: 3xx status-code filter
  return function followHTTPRedirectsMiddleware(ro, cb){
    var result = ro.getResult();
    if(result.headers.location) ro.follow(result.headers.location);
    cb();
  };
};
exports.analyzer.statusHTTP = function getStatusOfHTTPBuilder(opts){
  return function getStatusOfHTTP(ro, cb){
    var result = ro.getResult();
    ro.addAnalysis("HTTP-Status", result.statusCode);
    //if(result.statusCode != 200) po.addReport("alert", "HTTP-Status", result.statusCode);
    
    if(!result.headers) console.warn(result);
    
    ro.addAnalysis("Content-Type", result.headers['content-type']);
    cb();
  };
};
exports.analyzer.followHTML = function followHTMLMiddlewareBuilder(opts){
  opts = opts || {};
  opts.filter = opts.filter || /http/;
  
  return function followHTMLMiddleware(ro, cb){
    var result = ro.getResult();
    if(/text\/x?-?html|application\/x?-?html/.test(result.headers['content-type'])) { // && result.window.$
      if(!result || !result.window || !result.window.$) {
        ro.addReport("error", "Favicon Check", "HTML is invalid!");
        return cb();
      }
      var $ = result.window.$;
      var wc = ro.getWebcheck();
      
      //----------------------------------
      var base = $("base").attr("href") || result.window.location.href;
      
      
      // TODO: erwarteter Contenttype vergleichen
      
      $("a[href]").each(function(index,a) {
        var href = resolveUrl(base, a.href);
        href = href.split("#")[0]; // crawl just url without hash!
        var target, obj;
        if(target = wc.getResource(href)) {
          if(obj = target.getAnalysis("Expected content-type")) obj.indexOf("*/*")>=0 || obj.push("*/*");
          else target.addAnalysis("Expected content-type", ["*/*"]);
        } else {
          wc.on("resource:"+href, function(target){
            if(obj = target.getAnalysis("Expected content-type")) obj.indexOf("*/*")>=0 || obj.push("*/*");
            else target.addAnalysis("Expected content-type", ["*/*"]);
          });
        }
        if(opts.filter.test(href)) ro.follow(href);
        else ro.addResource(href);
      });
      $("script[src]").each(function(index, script){
        var href = resolveUrl(base, script.src);
        var target, obj;
        if(target = wc.getResource(href)) {
          if(obj = target.getAnalysis("Expected content-type")) obj.indexOf("text/javascript, application/x-javascript")>=0 || obj.push("text/javascript, application/x-javascript");
          else target.addAnalysis("Expected content-type", ["text/javascript, application/x-javascript"]);
        } else {
          wc.on("resource:"+href, function(target){
            if(obj = target.getAnalysis("Expected content-type")) obj.indexOf("text/javascript, application/x-javascript")>=0 || obj.push("text/javascript, application/x-javascript");
            else target.addAnalysis("Expected content-type", ["text/javascript, application/x-javascript"]);
          });
        }
        if(opts.filter.test(href)) ro.follow(href);
        else ro.addResource(href);
      });
      $('link[rel="stylesheet"]').each(function(index, link){
        var href = resolveUrl(base, link.href);
        var target, obj;
        if(target = wc.getResource(href)) {
          if(obj = target.getAnalysis("Expected content-type")) obj.indexOf("text/css")>=0 || obj.push("text/css");
          else target.addAnalysis("Expected content-type", ["text/css"]);
        } else {
          wc.on("resource:"+href, function(target){
            if(obj = target.getAnalysis("Expected content-type")) obj.indexOf("text/css")>=0 || obj.push("text/css");
            else target.addAnalysis("Expected content-type", ["text/css"]);
          });
        }
        if(opts.filter.test(href)) ro.follow(href);
        else ro.addResource(href);
      });
      $('img[href]').each(function(index, img){
        var href = resolveUrl(base, img.src);
        var target, obj;
        if(target = wc.getResource(href)) {
          if(obj = target.getAnalysis("Expected content-type")) obj.indexOf("image/*")>=0 || obj.push("image/*");
          else target.addAnalysis("Expected content-type", ["image/*"]);
        } else {
          wc.on("resource:"+href, function(target){
            if(obj = target.getAnalysis("Expected content-type")) obj.indexOf("image/*")>=0 || obj.push("image/*");
            else target.addAnalysis("Expected content-type", ["image/*"]);
          });
        }
        if(opts.filter.test(href)) ro.follow(href);
        else ro.addResource(href);
      });
      cb();
    }
  };
};

exports.analyzer.followCSS = function followCSSMiddlewareBuilder(opts){
  opts = opts || {};
  opts.filter = opts.filter || /http/;
  return function followCSSMiddleware(ro, cb){
    var result = ro.getResult();
    if(result && result.headers && /text\/css/.test(result.headers['content-type'])) {
      var i = 0;
      var splits = result.body.split("url(");
      for (i=1; i<splits.length; i++) {
        var href = splits[i].split(")")[0];
        href = href.trim();
        if(href.substr(0, 1)==='"' || href.substr(0, 1)==="'") {
          href = href.substring(1, href.length-1);
        }
        href = resolveUrl(ro.getURL(), href);
        if(opts.filter.test(href)) ro.follow(href);
        else ro.addResource(href);
      }  
    }
    
    cb();
  };
};