/*jslint node:true*/

/**
 * An example how to use webcheck
 * @author Arne Schubert <atd.schubert@gmail.com>
 */
'use strict';


var Webcheck = require('./'); // <- for require('webcheck');

var url = require('url'); // <- We need this module to parse sub-urls

var webcheck = new Webcheck({ // Instantiate webcheck
    headers: {
        'User-Agent': 'Webcheck example crawler'
    },
    concurrency: 1
});

/*
 * Our own middleware
 *
 * It is much better to require a middleware as a module.
 * This is why I use a factory in this example
 */

var countMyRepos = function middlewareFactory(opts) {
    opts = opts || {};

    if(!opts.username) {
        throw new Error('You have to set a github username');
    }
    opts.repositoryFilter = opts.repositoryFilter || '.source';

    var middleware = function countMyReposMiddleware(result) {
        var webcheck = this; // <- Webcheck is binded to the middleware on call

        var check = function(report) {
            if (!report.hasOwnProperty('readme') || !report.hasOwnProperty('license')) {
                return; // At least one check is missing!
            }
            if (!report.readme || !report.license) {
                if(!report.readme) {
                    webcheck.logger.warn(report.title + ' has no README.md!', report.url);
                }
                if(!report.license) {
                    webcheck.logger.warn(report.title + ' has no LICENSE file!', report.url);
                }
            } else {
                webcheck.logger.info(report.title + ' has LICENSE file and README.md...', report.url);
            }
        };

        if(/^https?:\/\/github.com\//.test(result.url)) {
            if (result.url === 'https://github.com/' + opts.username +'?tab=repositories') {

                if (result.response.statusCode === 200) {
                    result.getCheerio(function(err, $){
                        if (err) {
                            return webcheck.logger.error('Error in parsing document ' + result.url, err);
                        }
                        $('.repo-list-item' + opts.repositoryFilter).each(function (i, elem) {
                            var data = {
                                title: $(elem).find('h3').text().trim(),
                                url: url.resolve(result.url, $(elem).find('h3 a').attr('href'))
                            };

                            webcheck.crawl(data.url + '/blob/master/LICENSE', {report: data});
                            webcheck.crawl(data.url + '/blob/master/README.md', {report: data});
                        });
                    });
                } else {
                    webcheck.logger.error('The github user does not exists!');
                }

            } else if (/\/LICENSE$/.test(result.url)) {
                if (result.request.task.options.report) {
                    result.request.task.options.report.license = result.response.statusCode === 200;
                    check(result.request.task.options.report);
                } else {
                    webcheck.logger.error('This request has no report!', result.url);
                }
            } else if (/\/README\.md$/.test(result.url)) {
                if (result.request.task.options.report) {
                    result.request.task.options.report.readme = result.response.statusCode === 200;
                    check(result.request.task.options.report);
                } else {
                    webcheck.logger.error('This request has no report!', result.url);
                }
            } else {
                webcheck.logger.warn('Can not handle url', result.url);
            }
        }
    };

    /*
     * We can use a init function as property of the middleware
     * function to initialize the middleware in webcheck.
     */
    middleware.init = function(webcheck) {
        webcheck.crawl('https://github.com/' + opts.username + '?tab=repositories');
        webcheck.logger.info('Checking repos of user: ' + opts.username);
    };

    return middleware;
};

webcheck.use(countMyRepos({username: 'atd-schubert'}));

// Have fun