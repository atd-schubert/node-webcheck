"use strict";
var Webcheck = require("./index.js");

var fs = require('fs');

var w = new Webcheck();
w.analyzer.use(Webcheck.middlewares.analyzer.followRedirects());
w.analyzer.use(Webcheck.middlewares.analyzer.followHTML({filter:/^http:\/\/www.ccc.de\//}));
w.analyzer.use(Webcheck.middlewares.analyzer.followCSS({filter:/^http:\/\/www.ccc.de\//}));
w.analyzer.use(Webcheck.middlewares.analyzer.listResources());
w.analyzer.use(Webcheck.middlewares.analyzer.statusHTTP());

w.analyzer("http://www.ccc.de/", function(){
  fs.writeFile("./log-analysis.json", JSON.stringify(w.getAnalysis(),null, 2), function(err){
    console.log("saved analysis");
  });
  fs.writeFile("./log-report.json", JSON.stringify(w.getReverseReport(),null, 2), function(err){
    console.log("saved reverse report");
  });
  //console.log();
});
w.on("resource", function(po){
  console.log(po.getURL());
});
w.on("error", function(po){
  console.log("\n\nERROR\n\n");
  console.log(po);
  console.log("\n\n\n\n");
});