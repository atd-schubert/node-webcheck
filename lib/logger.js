"use strict";

var console = require("log-colors");

var mwLogger = function(mw, opts){

  if(Array.prototype.isPrototypeOf(mw)) {
    mw.forEach(function(mw){
      mwLogger(mw, opts);
    });
    return;
  }

  opts = opts || {};
  var workerTimeout = opts.workerTimeout || 1000*30;
   
  var nParallelJobs;
  var cParallelJobs;
  var nSeriesJobs;
  var cSerieslJobs;
  
  mw.on("start-parallel", function(obj, start){
    var jobs = obj.jobs.parallel;
    
    if(jobs.length == 0) return;
    
    console.info("Starting parallel worker "+obj.name+" with "+jobs.length+" jobs...");
    
    var cJobs = 0; // closed jobs
    var i;
    var interval = setInterval(function(){
      console.info(obj.name+": "+cJobs+"/"+jobs.length);
    }, workerTimeout);
    
    for(i=0; i<jobs.length; i++) {
      jobs[i].on("finish", function(){
        cJobs++;
        if(jobs.length==cJobs) clearInterval(interval);
      });
    }
  });
  
  mw.on("start-series", function(obj, start){
    var jobs = obj.jobs.series;
    
    if(jobs.length == 0) return;
    
    console.info("Starting series worker "+obj.name+" with "+jobs.length+" jobs...");
    
    var cJobs = 0; // closed jobs
    var i;
    var interval = setInterval(function(){
      console.info(obj.name+": "+cJobs+"/"+jobs.length+" done...");
    }, workerTimeout);
    
    for(i=0; i<jobs.length; i++) {
      jobs[i].on("finish", function(){
        cJobs++;
        if(jobs.length==cJobs) clearInterval(interval);
      });
    }
  });
  
  
  mw.on("finish-series", function(obj, start, end){
    if(obj.jobs.series.length == 0) return;
    console.info("Finished series worker "+obj.name+" in "+(end-start)/1000+"s...");
  });  
  mw.on("finish-parallel", function(obj, start, end){
    if(obj.jobs.series.parallel == 0) return;
    console.info("Finished parallel worker "+obj.name+" in "+(end-start)/1000+"s...");
  });
};

module.exports = function logger(wc, opts){
  var introduced;
  var introduce = function(){
    if(introduced) return;
    console.info("Started webchecker against '"+wc.pageRoot+"'...");
    introduced = true;
  };
  wc.crawler.on("start", function(start){
    introduce();
    console.info("Start crawler...");
  });
  wc.crawler.on("finish", function(start, end, result){
    console.info("Finished crawler in "+(end-start)/1000+"s.");
  });  

  wc.analyzer.on("use", function(mw, worker){
    mwLogger(worker, opts);
  });
  wc.analyzer.on("start", function(start){
    introduce();
    console.info("Start analyzer...");
  });
  wc.analyzer.on("finish", function(start, end, result){
    console.info("Finished analyzer in "+(end-start)/1000+"s.");
  });
  wc.reporter.on("use", function(mw, worker){
    mwLogger(worker, opts);
  });
  wc.reporter.on("start", function(start){
    introduce();
    console.info("Start reporter...");
  });
  wc.reporter.on("finish", function(start, end, result){
    console.info("Finished reporter in "+(end-start)/1000+"s.");
  });
}