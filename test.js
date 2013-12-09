var Webcheck = require("./index.js");

var fs = require('fs');

var webchecker = new Webcheck({pageRoot: "http://digitalcourage.de/"});

webchecker.analyzer.use(Webcheck.middleware.analyze.fetchDocument({filterFn: function(po){return po.contentType.indexOf("text/html")>=0 || po.contentType.indexOf("text/css")>=0;}}));
webchecker.analyzer.use(Webcheck.middleware.analyze.countTags({tags: ["title", "h1", "h2", "h3", "h4", "p", "b"]}));
webchecker.analyzer.use(Webcheck.middleware.analyze.keywords());
webchecker.analyzer.use(Webcheck.middleware.analyze.pageSpeed());
webchecker.analyzer.use(Webcheck.middleware.analyze.W3CValidate());
webchecker.analyzer.use(Webcheck.middleware.analyze.mimeType());
webchecker.analyzer.use(Webcheck.middleware.analyze.img());


webchecker.reporter.use(Webcheck.middleware.report.statusCodeCheck());

webchecker.reporter(function(err, result, report){
  if(err) return console.error(err);
  console.log("reporter is ready...");
  
  console.log(JSON.stringify(report, null, 4));
  
  fs.writeFile("./out.json", JSON.stringify(result, null, 4), function(err) {
    if(err) {
      console.log(err);
    } else {
      fs.writeFile("./report.json", JSON.stringify(report, null, 4), function(err) {
        if(err) return console.log(err);
        console.log("Report saved to report.json");
      });
      console.log("Result saved to out.json!");
    }
  });
});