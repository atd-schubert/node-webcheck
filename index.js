"use strict";

var Crawler = require("crawler").Crawler;
var util = require("util");
var async = require("async");
var EventEmitter = require("events").EventEmitter;
var _ = require("underscore");
var url = require("url");

var shortenURL = function(url){
  if(typeof url != "string") throw new Error("URL must be a string!");
  return url.split("#")[0];
};

var Webcheck = exports = module.exports = function Webcheck(params) { // params = {url:""}

  EventEmitter.call(this);
  
  var results = {};
  var self = this;
  var start;
  
  var queued = {};
  
  var analyzerMiddlewares = [], reporterMiddlewares = [];
  
  params = params || {};

  _.extend(params, {
    maxConnections: 10,
    timeout: 60000,
    userAgent: "node-webcheck",
    retries: 3,
    retryTimeout: 10000,
    forceUTF8: true
  });
  
  var crawler = new Crawler({
    "maxConnections": params.maxConnections,
    "timeout": params.timeout,
    "userAgent": params.userAgent,
    "retries": params.retries,
    "retryTimeout": params.retryTimeout,
    "forceUTF8": params.forceUTF8,
    "followRedirect":false,
    //"jQuery":false,
    "callback": function(error,result,$) {
      if(error) { self.emit("error", error); self.emit("analyzerError", error);}
      if(!result) return;
      //if(queued[result.request.href]) return;
      if(results[result.request.href]) return;
      
      var ro = new Resource(result);
      queued[result.request.href] = true;
      async.applyEach(analyzerMiddlewares, ro, function callback(err){
        if(err) console.error(err);
        ro.clean();
      });
    },
    "onDrain": function(){ // no arguments!
      self.emit("finishAnalyzer", {timestamp: Date.now(), analysis: self.getAnalysis()});
    }
  });
  
  var Resource = function(result){
    var ro = this;
    
    results[result.request.href] = this;
    
    var analysis = {};
    var report = {};
    var resources = {}; // {"http://url": count}
    var referrers = {}; // {"http://url": count}
    var roURL = result.request.href;
    
    ro.getResult = function(){
      return result;
    };
    ro.getURL = function(){
      return roURL;
    };
    ro.getWebcheck = function(){
      return self;
    };
    ro.addAnalysis = function(hash, data) {

      analysis[hash] = data;
      
      self.emit("addAnalysis", {name:hash, data:data, resource:ro});
      return ro;
    };
    ro.removeAnalysis = function(hash) {
      analysis[hash] = null;
      return ro;
    };
    ro.getAnalysis = function(optHash) {
      if (optHash) return analysis[optHash];
      return analysis;
    };
    ro.addReport = function(level, name, data) {
      if(!report[name]) report[name] = {};
      report[name][level] = data; // recommandations for data: {message: "", test: "Name of the test"}
      self.emit("addReport", {level:level, name:name, data:data, resource:ro});
      return ro;
    };
    ro.getReport = function(optHash, optLevel) {
      if(optLevel) return report[optHash] ? report[optHash][optLevel] : {};
      if(optHash) return report[optHash] || {};
      return report;
    };
    ro.follow = function(href) {
      href = shortenURL(href);
      ro.addResource(href);
      if(!queued[href] && href.substr(0,4)=="http") { // TODO maybe replace with url.format()[protocol]...
        queued[href] = true;
        self.queue(href);
      }
      return ro;
    };
    ro.addResource = function(href) { // TODO: absolute url!
      href = shortenURL(href);
      if(resources[href]) resources[href]++;
      else resources[href] = 1;
      
      var referrer = self.getResource(href);
      if(referrer) referrer.addReferrer(ro.getURL());
      else self.on("resource:"+href, function(referrer){
        referrer.addReferrer(ro.getURL());
      });
      
      return ro;
    };
    ro.getResources = function() {
      return resources;
    };
    ro.getReferrers = function() {
      return referrers;
    };
    ro.addReferrer = function(href) {
      href = shortenURL(href);
      if(referrers[href]) referrers[href]++
      else referrers[href] = 1;
      return ro;
    };
    ro.clean = function(){ // procedure to free memory
      result = false;
      ro.follow = ro.addResource;
      return ro;
    };
    
    self.emit("resource", ro);
    self.emit("resource:"+result.request.href, ro); 
  };
  //: Setter, getter for Webcheck
  
  this.getResources = function(){
    return results;
  };
  this.getReport = function(optHash){
    if(optHash) return this.getResource(optHash).getReport();
    var hash;
    var res = {};
    for (hash in results) {
      res[hash] = results[hash].getReport();
    }
    return res;
  };
  this.getReverseReport = function(optHash){
    var tmp = this.getReport(optHash);
    var url, name, level;
    var res = {};
    for (url in tmp) {
      for(name in tmp[url]){
        for(level in tmp[url][name]) {
          res[level] = res[level] || {};
          res[level][name] = res[level][name] || {};
          res[level][name][url] = tmp[url][name][level];
        }
      }
    }
    return res;
  };
  this.getAnalysis = function(optHash){
    if(optHash) return this.getResource(optHash).getAnalysis();
    var hash;
    var res = {};
    for (hash in results) {
      res[hash] = results[hash].getAnalysis();
    }
    return res;
  };
  this.getResource = function(url){
    url = shortenURL(url);
    return results[url];
  };
  
  //: Analyzer
  this.analyzer = function(opts, cb){ // opts = {maxConnections:""...}
    var i;
    for (i=0; i<arguments.length; i++) {
      switch (typeof arguments[i]) {
        case "object":
          opts = arguments[i];
          break;
        case "function":
          cb = arguments[i];
      }
    }
    if(!cb || typeof cb !== "function") cb = function(){};
  
    //EventEmitter.call(this);
    self.emit("startAnalyzer", {timestamp: Date.now()});
    if(opts) self.queue(opts);
    self.on("finishAnalyzer", cb);
  };
  //util.inherits(this.analyzer, EventEmitter);
  //: End of Analyzer
  
  //: Reporter
  this.reporter = function(opts, cb){ 
    var i;
    for (i=0; i<arguments.length; i++) {
      switch (typeof arguments[i]) {
        case "object":
          opts = arguments[i];
          break;
        case "function":
          cb = arguments[i];
      }
    }
    if(!cb || typeof cb !== "function") cb = function(){};
    
    var hash;
    self.emit("startReporter", {timestamp: Date.now()});
    
    async.each(results, function(ro, cb){
      async.applyEach(reporterMiddlewares, ro, function(err){
        cb(err);
      });
    }, function(err){
      var r = self.getReport();
      self.emit("finishReporter", {report: r, timestamp:Date.now()});
      if(err) {self.emit("error", err); self.emit("reporterError", err);}
      cb(err, r, self.getReverseReport());
    });
    

    
  };
  //util.inherits(this.analyzer, EventEmitter);
  //: End of Reporter
  
  this.analyzer.use = function(middleware){
    
    analyzerMiddlewares.push(middleware);
    return self.analyzer;
  };
  this.reporter.use = function(middleware){
    reporterMiddlewares.push(middleware);
    //self.reporter.emit("use", middleware);
    return self.reporter;
  };
  this.queue = function(){crawler.queue.apply(crawler, arguments);};
  
  this.setMaxListeners(0);
};

util.inherits(Webcheck, EventEmitter);

Webcheck.middlewares = require("./lib/middlewares");