"use strict";
var Webcheck = require("./index.js");

var fs = require('fs');

var w = new Webcheck();
w.analyzer.use(Webcheck.middlewares.analyzer.followRedirects());
//w.analyzer.use(Webcheck.middlewares.analyzer.followHTML({filter:/https?:\/\/[a-z]*.?hype|ruhmesmeile/}));
w.analyzer.use(Webcheck.middlewares.analyzer.followHTML({filter:/ruhmesmeile.com/}));
w.analyzer.use(Webcheck.middlewares.analyzer.followCSS({filter:/ruhmesmeile.com/}));
w.analyzer.use(Webcheck.middlewares.analyzer.listResources());
w.analyzer.use(Webcheck.middlewares.analyzer.statusHTTP());

//w.analyzer("http://hypeinnovation.com/", function(){
w.analyzer("http://ruhmesmeile.com/", function(){
  console.log("FERTIG!");
  fs.writeFile("./log-analysis.json", JSON.stringify(w.getAnalysis(),null, 2), function(err){
    console.log("gespeichert...");
  });
  fs.writeFile("./log-report.json", JSON.stringify(w.getReverseReport(),null, 2), function(err){
    console.log("gespeichert...");
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