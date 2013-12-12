/*exports.example = function(opts){ // Use this as a middleware template...
  var mw = function(worker){                        // This function collect jobs
    worker.name="Example Middleware";
    
    var mkJob = function(po, root, report){                 // This is the job that runs asynchron
      
      var getEntry = function(type){
        var cs = po.checksum;
        var url = po.url.absolute;
        report[type]
        if(!report[type]) report[type]={};
        if(!report[type][worker.name]) report[type][worker.name]={};
        if(!report[type][worker.name][cs]) report[type][worker.name][cs]={};
        if(!report[type][worker.name][cs][url]) report[type][worker.name][cs][url]=[];
        
        return report[type][worker.name][cs][url];
      };
      
      if(po.contentType.indexOf("text/html")>=0) {
        var fn = function(cb){
          getEntry("info").push("This is a HTML file...");
          cb();
        }
        worker.addJob(fn, {method: "parallel"});
      }
      return;
    };
    return mkJob;
  };
  return mw;
};//*/

exports.statusCodeCheck = function(opts){
  var mw = function(worker){                        // This function collect jobs
    worker.name="Status-code checker";
    
    var mkJob = function(po, root, report){                 // This is the job that runs asynchron
      var mkEntry = function(type){
        var cs = po.checksum;
        var url = po.url.absolute;
        var entry = {checksum: cs, url:url, type: type, message: ""};
        
        if(!report[type]) report[type]={};
        if(!report[type][worker.name]) report[type][worker.name]=[];
        
        report[type][worker.name].push(entry);
        
        return entry;
      };
      if(po.status != 200) {
        var fn = function(cb){
          switch(po.status) {
            case 404:
            case 500:
            case 501:
              mkEntry("alert").message="Document have status-code "+po.status+" and reffered from "+po.referrers.join(", ");
              break;
            default:
              mkEntry("warning").message="Document have status-code "+po.status+" and reffered from "+po.referrers.join(", ");

          }
          cb();
        }
        worker.addJob(fn, {method: "parallel"});
      }
      return;
    };
    return mkJob;
  };
  return mw;
};
