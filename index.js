"use strict";
var crawler = require("crawl").crawl;
var path = require("path");
var async = require("async");
var Worker = require("./lib/job.js").Worker;
var ree = require("./lib/ree");

var getFn = function(elem){
  return function(cb){
    elem.worker.exec(cb);
  };
};
      
var getSeriesFn = function(elem){
  return function(cb){
    elem.worker.execSeries(cb);
  };
};
var getParallelFn = function(elem){
  return function(cb){
    elem.worker.execParallel(cb);
  };
};


var Webcheck = function(opts) {
  if(!opts) opts = {};
  // if(!opts.pageRoot) throw new Error("You have to specify a pageRoot to start crawling \"new Webcheck({pageRoot: 'http://nodejs.org'})\"...");
  // TODO: logging = opts.logging || false;
  // Read opts
  this.pageRoot = opts.url || "http://nodejs.org";
  this.result = {};
  this.report = {};
  
  var middlewaresAnalyzer = [];
  var middlewaresReporter = [];
  var self = this;
  
  
  this.crawler = function(cb) {
    var start = Date.now();
    self.crawler.emit("start", start);
    
    crawler(self.pageRoot, function(err, crawlResult){
      if(err) return cb(err);
      self.crawler.results = crawlResult;
      self.crawler.status = "finished";
      
      self.crawler.emit("finish", start, Date.now(), crawlResult);
      cb(null, crawlResult);
      
    });

  };
  ree(this.crawler);
  
  this.analyzer = function(cb) {
    
    var start;
    
    var pages = {};
    var checksums = {};
    var list = [];
    
    var output = self.analyzer.results = { list:list, pages:pages};

    var mkPageObj = function(result){
      
      var target = {
        status: result.status,
        referrers: result.referrers,
        checksum: result.checksum,
        date: result.date,
        contentType: result.contentType,
        url: {
          relative: "",
          absolute: result.url
        }
      };
      if(!target.referrers) target.referrers= [];
      target.url.relative = path.relative(self.pageRoot, target.url.absolute);
      return target;
    };
    
    
    
    var analyzeCrawled = function(err){
      if(err) return cb(err);
      start = Date.now();
      self.analyzer.emit("start", start);
      var cr = self.crawler.results;
      var hash;
      var path;
      var i, n;
      var asyncParallelArray = [];
      var asyncSeriesArray = [];

      
      var currentPO = {};
      for (i=0; i<cr.length; i++) {
        currentPO = mkPageObj(cr[i]);
        list.push(currentPO);
        pages[currentPO.url.absolute] = currentPO;
      }
      
      for(n=0; n<list.length; n++) {
        for(i=0; i<middlewaresAnalyzer.length; i++) {
          middlewaresAnalyzer[i].mkJob(list[n], output);
        }
      }
      
      for(i=0; i<middlewaresAnalyzer.length; i++) {
        asyncParallelArray.push(getParallelFn(middlewaresAnalyzer[i]));
        asyncSeriesArray.push(getSeriesFn(middlewaresAnalyzer[i]));
      }
      
      async.series(asyncSeriesArray, function(err){
        if(err) return cb(err);
        async.parallel(asyncParallelArray, function(err){
        
          self.analyzer.status = "finished";
          
          self.analyzer.emit("finish", start, Date.now(), output);
          cb(err, output);
        });
      });
      
    };
    self.crawler.status === "finished" ? analyzeCrawled(null) : self.crawler(analyzeCrawled);
  };
  ree(this.analyzer);
  
  this.reporter = function(cb) {
    
    var start;
    var self = this;
    
    var reportAnalyzed = function(err){
      if(err) return cb(err);
      start = Date.now();
      self.reporter.emit("start", start);
      var result = self.analyzer.results;
      var report = self.reporter.results = {};
      var hash;
      var path;
      var i, n;
      var asyncParallelArray = [];
      var asyncSeriesArray = [];
      
      
      for(n=0; n<result.list.length; n++) {
        for(i=0; i<middlewaresReporter.length; i++) {
          middlewaresReporter[i].mkJob(result.list[n], result, report);
        }
      }
      
      for(i=0; i<middlewaresReporter.length; i++) {
        asyncParallelArray.push(getParallelFn(middlewaresReporter[i]));
        asyncSeriesArray.push(getSeriesFn(middlewaresReporter[i]));
      }
      
      async.series(asyncSeriesArray, function(err){
        if(err) return cb(err);
        async.parallel(asyncParallelArray, function(err){
          self.reporter.status = "finished";
          self.crawler.emit("finish", start, Date.now(), report);
          cb(err, report);
        });
      });
    };
    self.analyzer.status === "finished" ? reportAnalyzed(null) : self.analyzer(reportAnalyzed);

  };
  ree(this.reporter);
  this.analyzer.use = function(middleware, opts){
    var worker = new Worker();
    var obj = {
      middleware: middleware,
      worker: worker,
      mkJob: middleware(worker)
    };
    middlewaresAnalyzer.push(obj);
    this.emit("use", middleware, worker);
    return worker;
  };
  
  this.reporter.use = function(middleware, opts){
    var worker = new Worker();
    var obj = {
      middleware: middleware,
      worker: worker,
      mkJob: middleware(worker)
    };
    middlewaresReporter.push(obj);
    this.emit("use", middleware, worker);
    return worker;
  };
  
  this.crawler.status="no data";
  this.analyzer.status="no data";
  this.reporter.status="no data";
  this.crawler.results=[];
  this.analyzer.results={};
  this.reporter.results={};

};
Webcheck.middleware = require("./lib/middleware");

module.exports = exports = Webcheck;