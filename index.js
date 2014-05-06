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
      
      
      var po = new PageObject(result);
      queued[result.request.href] = true;
      self.emit("resource:", po);
      self.emit("resource:"+result.request.href, po);
      async.applyEach(analyzerMiddlewares, po, function callback(err){
        if(err)console.error(err);
        po.clean();
      });
    },
    "onDrain": function(){ // no arguments!
      //self.emit("finish", start, Date.now(), results);
      self.emit("finishAnalyzer", start, Date.now(), results);
      //cb(null, results);
    }
  });
  
  var PageObject = function(result){ // result = request->result
    var po = this;
    

    
    //if(results[result.request.href]) {  console.log("A second PO!!!"+result.request.href); process.exit();}
    results[result.request.href] = this;
    
    var analysis = {};
    var report = {};
    var resources = {}; // {"http://url": count}
    var refferers = {}; // {"http://url": count}
    var poURL = result.request.href;
    
    po.getResult = function(){
      return result;
    };
    po.getURL = function(){
      return poURL;
    };
    po.getWebcheck = function(){
      return self;
    };
    po.addAnalysis = function(hash, data) { // emit addAnalysis emit("addAnalysis", {po:po, analysis:data}); emit("addAnalysis:"+hash, {po:po, analysis:data}); emit("addAnalysis:"+po.getURL()+":"+hash, {po:po, analysis:data});

      analysis[hash] = data;
      return po;
    };
    po.removeAnalysis = function(hash) {
      analysis[hash] = null;
      return po;
    };
    po.getAnalysis = function(optHash) {
      if (optHash) return analysis[optHash];
      return analysis;
    };
    po.addReport = function(level, name, data) { // emit addReport
      if(!report[name]) report[name] = {};
      report[name][level] = data; // recommandations for data: {message: "", test: "Name of the test"}
      return po;
    };
    po.getReport = function(optHash, optName) {
      if(optName) return report[optHash] ? report[optHash][optName] : {};
      if(optHash) return report[optHash];
      return report;
    };
    po.follow = function(href) {
      href = shortenURL(href);
      po.addResource(href);
      if(!queued[href] && href.substr(0,4)=="http") { // TODO maybe replace with url.format()[protocol]...
        queued[href] = true;
        self.queue(href);
      }
      return po;
    };
    po.addResource = function(href) { // TODO: absolute url!
      href = shortenURL(href);
      if(resources[href]) resources[href]++;
      else resources[href] = 1;
      
      var refferer = self.getPageObject(href);
      if(refferer) refferer.addRefferer(po.getURL());
      else self.on("resource:"+href, function(refferer){
        refferer.addRefferer(po.getURL());
      });
      
      return po;
    };
    po.getResources = function() {
      return resources;
    };
    po.getRefferers = function() {
      return refferers;
    };
    po.addRefferer = function(href) {
      href = shortenURL(href);
      if(refferers[href]) refferers[href]++
      else refferers[href] = 1;
      return po;
    };
    po.clean = function(){ // procedure to free memory
      result = false;
    };
    
    self.emit("resource", po);
    self.emit("resource:"+result.request.href, po);    
  };
  //util.inherits(PageObject, EventEmitter);
  //: Setter, getter for Webcheck
  
  this.getResults = function(){
    return results;
  };
  /*this.getJSONResults = function(){
    var hash;
    var res = {};
    for (hash in results) {
      res[hash] = {analysis:results[hash].getAnalysis(), report:results[hash].getReport()};
    }
    return res;
  };*/
  this.getReport = function(optHash){
    if(optHash) return this.getPageObject(optHash).getReport();
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
    if(optHash) return this.getPageObject(optHash).getAnalysis();
    var hash;
    var res = {};
    for (hash in results) {
      res[hash] = results[hash].getAnalysis();
    }
    return res;
  };
  this.getPageObject = function(url){
    url = shortenURL(url);
    return results[url];
  };
  
  //: Analyzer
  this.analyzer = function(opts, cb){ // opts = {maxConnections:""...}
    //EventEmitter.call(this);
    self.queue(opts);
    if(cb) self.on("finishAnalyzer", cb);
  };
  //util.inherits(this.analyzer, EventEmitter);
  //: End of Analyzer
  
  //: Reporter
  this.reporter = function(opts, cb){ // opts = {}
    //EventEmitter.call(this);
    var hash;
    
    async.each(results, function(po, cb){
      async.applyEach(reporterMiddlewares, po, function(err){
        cb(err);
      });
    }, function(err){
      cb(err, self.getReport(), self.getReverseReport());
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