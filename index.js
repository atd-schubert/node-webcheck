var crawler = require("crawl").crawl;
var path = require("path");
var async = require("async");
var console = require("log-colors");
var Worker = require("./lib/job.js").Worker;


var Webcheck = function(opts) {
  if(!opts) opts = {};
  // if(!opts.pageRoot) throw new Error("You have to specify a pageRoot to start crawling \"new Webcheck({pageRoot: 'http://nodejs.org'})\"...");

  // Read opts
  this.pageRoot = opts.pageRoot || "http://nodejs.org";
  this.result = {};
  this.report = {};
  
  var middlewaresAnalyzer = [];
  var middlewaresReporter = [];
  var self = this;
  
  var status = {
    crawled: false,
    analyzed: false,
    reported: false
  };
  
  this.crawlWebsite = function(cb) {
    var pages = {};
    var checksums = {};
    var list = [];
    var start = Date.now();
    
    var output = { websites: {}, checksums: checksums, list:list};
    output.websites[self.pageRoot] = {pages: pages};
    
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
    
    console.info("Start crawling in "+self.pageRoot);
    
    crawler(self.pageRoot, function(err, crawlResult){
      if(err) return cb(err);
      
      var i = 0;
      var currentPO = {};
      for (i=0; i<crawlResult.length; i++) {
        currentPO = mkPageObj(crawlResult[i]);
        list.push(currentPO);
        pages[currentPO.url.relative] = currentPO;
        checksums[crawlResult[i].checksum] = {};
        checksums[crawlResult[i].checksum][currentPO.url.absolute] = currentPO;
        
      }
      
      console.info("Finish crawling for "+self.pageRoot+" in "+((Date.now()-start)/1000)+"s...");
      console.info("Have "+crawlResult.length+" files crawled...");
      
      status.crawled = true;
      
      self.result = output;
      cb(null, output);
      
    });

  };
  this.analyzer = this.analyze = function(cb) {
    console.info("Start analyzing "+self.pageRoot+"...");
    var start = Date.now();
    
    var analyzeCrawled = function(err){
      if(err) return cb(err);
      var result = self.result;
      var hash;
      var path;
      var i, n;
      var asyncArray = [];
      var getFn = function(elem){
        return function(cb){
          elem.worker.exec(cb);
        };
      };
      
      for(n=0; n<result.list.length; n++) {
        for(i=0; i<middlewaresAnalyzer.length; i++) {
          middlewaresAnalyzer[i].mkJob(result.list[n], result);
        }
      }
      
      for(i=0; i<middlewaresAnalyzer.length; i++) {
        asyncArray.push(getFn(middlewaresAnalyzer[i]));
      }
      
      async.series(asyncArray, function(err){
        console.info("Analyze is ready in "+(Date.now()-start)/1000+"s...");
        
        status.analyzed = true;
        cb(err, result);
      });
    };
    status.crawled ? analyzeCrawled(null) : self.crawlWebsite(analyzeCrawled);

  };
  this.reporter = function(cb) {
    console.info("Start reporter...");
    var start = Date.now();
    var self = this;
    self.report= {};
    
    var reportAnalyzed = function(err){
      if(err) return cb(err);
      var result = self.result;
      var report = self.report;
      var hash;
      var path;
      var i, n;
      var asyncArray = [];
      var getFn = function(elem){
        return function(cb){
          elem.worker.exec(cb);
        };
      };
      
      for(n=0; n<result.list.length; n++) {
        for(i=0; i<middlewaresReporter.length; i++) {
          middlewaresReporter[i].mkJob(result.list[n], result, report);
        }
      }
      
      for(i=0; i<middlewaresReporter.length; i++) {
        asyncArray.push(getFn(middlewaresReporter[i]));
      }
      
      async.series(asyncArray, function(err){
        console.info("Reporter is ready in "+(Date.now()-start)/1000+"s...");
        
        status.reported = true;
        cb(err, result, report);
      });
    };
    status.analyzed ? reportAnalyzed(null) : self.analyze(reportAnalyzed);

  };
  
  this.analyzer.use = function(middleware, opts){
    var worker = new Worker();
    worker.on("start", function(obj, start){
      jobs = obj.jobs.series.length+obj.jobs.parallel.length;
      console.info("Started worker '"+obj.name+"' with "+jobs+" jobs...");
    });
    worker.on("finish", function(err, obj, start, end){
      console.info("Finished worker '"+obj.name+"' in "+((end-start)/1000)+" seconds...");
    });
    var obj = {
      middleware: middleware,
      worker: worker,
      mkJob: middleware(worker)
    };
    middlewaresAnalyzer.push(obj);
  };
  
  this.reporter.use = function(middleware, opts){
    var worker = new Worker();
    worker.on("start", function(obj, start){
      jobs = obj.jobs.series.length+obj.jobs.parallel.length;
      console.info("Started worker '"+obj.name+"' with "+jobs+" jobs...");
    });
    worker.on("finish", function(err, obj, start, end){
      console.info("Finished worker '"+obj.name+"' in "+((end-start)/1000)+" seconds...");
    });
    var obj = {
      middleware: middleware,
      worker: worker,
      mkJob: middleware(worker)
    };
    middlewaresReporter.push(obj);
  };

};
Webcheck.middleware = require("./lib/middleware");

module.exports = exports = Webcheck;