"use strict";
var Webcheck = require("./index.js");

var fs = require('fs');
var logger = require('./lib/logger');

var webchecker = new Webcheck({url: "http://digitalcourage.de/"});
logger(webchecker, {workerTimeout:10000});

webchecker.analyzer.use(Webcheck.middleware.analyze.fetchDocument({filterFn: function(po){return po.contentType.indexOf("text/html")>=0 || po.contentType.indexOf("text/css")>=0;}}));
webchecker.analyzer.use(Webcheck.middleware.analyze.countTags({tags: ["title", "h1", "h2", "h3", "h4", "p", "b"]}));
webchecker.analyzer.use(Webcheck.middleware.analyze.keywords());
webchecker.analyzer.use(Webcheck.middleware.analyze.pageSpeed());
webchecker.analyzer.use(Webcheck.middleware.analyze.W3CValidate());
webchecker.analyzer.use(Webcheck.middleware.analyze.mimeType());
webchecker.analyzer.use(Webcheck.middleware.analyze.img());

webchecker.reporter.use(Webcheck.middleware.report.statusCodeCheck());
webchecker.reporter.use(Webcheck.middleware.report.keywords());
webchecker.reporter.use(Webcheck.middleware.report.W3CValidate());

/*
webchecker.crawler.set(require("./crawler.json"));

webchecker.analyzer.set(require("./analyzer.json"));
*/

webchecker.reporter(function(err, result){
  var results = {
    crawler: webchecker.crawler.results,
    analyzer: webchecker.analyzer.results,
    reporter: webchecker.reporter.results,
  }
  fs.writeFile("./report.json", JSON.stringify(results, null, 4), function(err) {
    console.log("The complete report is saved to './report.json'.");
  });
});