var async = require("async");
var events = require("events");

function registerEventEmitter(obj) {
  var ev = new events.EventEmitter();
  obj.once = ev.once;
  obj.emit = ev.emit;
  obj.on = ev.on;
  
}

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
    self.emit("finish", err, this, start, Date.now());
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
  async.series(self.jobs.series, function(err){
    if(err) return cosole.error(err);
    async.parallel(self.jobs.parallel, function(err){
      self.emit("finish", err, self, start, Date.now());
      cb(err);
    });
  });
};
Worker.prototype.addJob = function(fn, opts){
  if(!opts) opts={};
  var method = opts.method || "series";
  var job = new Job(fn, opts);
  if(!this.jobs[method]) this.jobs[method] = []; // TODO. implement the other methods
  this.jobs[method].push(function(cb){job.run(cb);});
  
  this.emit("addJob", job, opts);
};
Worker.prototype.validate = function(){};

exports.Worker = Worker;