/*jslint node:true*/

/**
 * An example how to use webcheck
 * @author Arne Schubert <atd.schubert@gmail.com>
 */
'use strict';

var Webcheck = require('webcheck').Webcheck;
var CheerioPlugin = require('webcheck-cheerio');

var webcheck = new Webcheck();
var cheerio = new CheerioPlugin();
webcheck.addPlugin(cheerio);

cheerio.enable();

var url = require('url'); // <- We need this module to parse sub-urls

var webcheck = new Webcheck({ // Instantiate webcheck
    headers: {
        'User-Agent': 'Webcheck example crawler'
    },
    concurrency: 1
});

/*
 * Our own plugin
 *
 * It is much better to require a middleware as a module.
 */

var username = 'atd-schubert';

webcheck.on('result', function (result) {
    var arr = [];
    if (result.url.indexOf('https://github.com/' + username) === 0) {
        if (!result.test) {
            if (result.response.statusCode !== 200) {
                return console.error('User does not exists!');
            }
            if (typeof result.getCheerio === 'function') {
                result.getCheerio(function (err, $) {
                    if (err) {
                        return console.error(err);
                    }
                    $('.repo-list-item').each(function (i, elem) {
                        var proof = {};
                        webcheck.crawl({
                            url: url.resolve(result.url, $(elem).find('h3 a').attr('href')) + '/blob/master/LICENSE',
                            title: $(elem).find('h3').text().trim(),
                            proof: proof,
                            test: 'license'
                        });
                        webcheck.crawl({
                            url: url.resolve(result.url, $(elem).find('h3 a').attr('href')) + '/blob/master/README.md',
                            title: $(elem).find('h3').text().trim(),
                            proof: proof,
                            test: 'readme'
                        });
                    });
                });
            }
        } else {
            if (result.response.statusCode === 200) {
                result.proof[result.test] = true;
            } else {
                result.proof[result.test] = false;
            }
            if (result.proof.hasOwnProperty('license') && result.proof.hasOwnProperty('readme')) {
                arr.push('Repository ' + result.title + ' has');
                if (result.proof.license) {
                    arr.push('a license');
                } else {
                    arr.push('no license');
                }
                arr.push('and');
                if (result.proof.readme) {
                    arr.push('a readme');
                } else {
                    arr.push('no readme');
                }
                console.log(arr.join(' ') + '.');
            }
        }
    }
});


webcheck.crawl({
    url: 'https://github.com/' + username + '?tab=repositories'
});

// Have fun
