"use strict";
var async = require("async");
var registerEventEmitter = require("./ree");

var mkFn = function(job){
  return function(cb) {
    job.run(cb);
  }
};

var Job = function(fn, opts){
  registerEventEmitter(this);
  
  this.name = opts.name || "unnamed job";
  this.fn = fn;
  
};

Job.prototype.run = function(cb){
  var self = this;
  var start = Date.now();
  this.emit("start", this, start);
  this.fn(function(err){
    self.emit("finish", this, start, Date.now());
    cb(err);
  });
};

var Worker = function(opts){
  registerEventEmitter(this);
  
  if(!opts) opts = {};
  var name = opts.name || "unnamed worker";
  
  this.jobs = {series: [], parallel: []}
  
  this.__defineGetter__('name', function(){
  	return name;
  });
  this.__defineSetter__('name', function(val){
  	name = val;
  });
};

Worker.prototype.exec = function(cb, opts){
  //if(opts.only)
  var self = this;
  var start = Date.now();
  this.emit("start", this, start);
  
  
  self.execSeries(function(err){
    if(err) return cb(err);
    self.execParallel(function(err){
      if(err) return cb(err);
      self.emit("finish", self, start, Date.now());
      cb(err);
    });
  });
};
Worker.prototype.execParallel = function(cb, opts){
  var start = Date.now();
  var self = this;
  this.emit("start-parallel", this, start);
  var arr = [];
  var jobs = self.jobs.parallel;
  var i;
  
  for(i=0; i<jobs.length; i++) {
    arr.push(mkFn(jobs[i]));
  }
  async.parallel(arr, function(err){
    if(err) return cb(err);
    self.emit("finish-parallel", self, start, Date.now());
    cb(err);
  });
};
Worker.prototype.execSeries = function(cb, opts){
  var start = Date.now();
  var self = this;
  this.emit("start-series", this, start);
  var arr = [];
  var jobs = self.jobs.series;
  var i;
  
  for(i=0; i<jobs.length; i++) {
    arr.push(mkFn(jobs[i]));
  }
  async.series(arr, function(err){
    if(err) return cb(err);
    self.emit("finish-series", self, start, Date.now());
    cb(err);
  });
};
Worker.prototype.addJob = function(fn, opts){
  if(!opts) opts={};
  var method = opts.method || "series";
  var self = this;
  var job = new Job(fn, opts);
  if(!this.jobs[method]) this.jobs[method] = []; // TODO. implement the other methods
  this.jobs[method].push(job);
  
  this.emit("addJob", this, job, opts);
};

exports.Worker = Worker;