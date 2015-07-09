/*jslint node:true*/
'use strict';

var cheerio = require('cheerio');

var workers = [];

var cheerioize = function cheerioize(response, cb) {
    var i, obj, chunks;

    chunks = [];

    for (i = 0; i < workers.length; i += 1) {
        if (workers[i].response === response) {
            workers[i].cbs.push(cb);
            return;
        }
    }
    obj = {response: response, cbs: [cb]};
    workers.push(obj);
    response.on('data', function (chunk) {
        chunks.push(chunk.toString());
    });
    response.on('end', function () {
        var i, $;
        $ = cheerio.load(chunks.join(''));
        for (i = 0; i < obj.cbs.length; i += 1) {
            obj.cbs[i](null, $);
        }
    });
};

module.exports = cheerioize;