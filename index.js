/*jslint node:true */

/**
 * Webcheck core module
 * @author Arne Schubert <atd.schubert@gmail.com>
 * @module webcheck
 */

'use strict';

var async = require('async');
var request = require('request');
var EventEmitter = require('events').EventEmitter;

var pkg = require('./package.json');

/**
 * Webcheck constuctor
 * @param {{}} [opts={}] - Options for webcheck instance
 * @param {{}} [opts.headers] - Standard headers used for requests within the instance
 * @param {{}} [opts.concurrency] - Standard concurrency of requests
 * @augments EventEmitter
 * @constructor
 */
var Webcheck = function (opts) {
    var self, taskRunner;

    /**
     * @name webcheck.crawlSettings
     * @type {{}}
     * @property {string|url} url - URL to crawl
     * @property {headers} headers - Headers to use for this crawl (otherwise it uses the standard headers)
     * @property {number} wait - Milliseconds to wait until queuing
     * @property {boolean} preventCrawl - True if crawl should be prevented (works not async!)
     */
    /**
     * @name webcheck.result
     * @type {{}}
     * @property {string|url} url - URL to crawl
     * @property {Webcheck.crawlSettings} settings - The settings that called this result
     * @property {request.Request} request - The request
     * @property {stream} response - Response returned by request
     */
    if (!this) {
        return new Webcheck(opts);
    }
    self = this;

    opts = opts || {};
    opts.concurrency = opts.concurrency || Webcheck.concurrency;
    this.headers = opts.headers || Webcheck.headers;

    /**
     * Task runner for queue (async.queue)
     * @private
     * @param {webcheck.crawlSettings} task
     * @param {Webcheck~requestDoneCallback} callback
     * @fires Webcheck#request
     */
    taskRunner = function runTask(task, callback) {
        var req;
        if (task.preventCrawl) {
            return callback();
        }
        /**
         * @event Webcheck#request
         * @type {Webcheck.crawlSettings}
         */
        self.emit('request', task);
        if (task.preventCrawl) {
            return callback();
        }
        req = self.request(task)
            .on('response', function (response) {
                var result, done;
                self.emit('response', response);
                result = {
                    url: task.url,
                    settings: task,
                    request: req,
                    response: response,
                    done: function (err) {
                        if (!done) {
                            done = true;
                            return callback(err);
                        }
                        console.warn('done already triggered');
                    }
                };
                async.applyEachSeries(self.middlewares, result, function (err) {
                    if (err) {
                        return callback(err);
                    }
                    delete result.done;
                    /**
                     * @event Webcheck#result
                     * @type {Webcheck.result}
                     */
                    self.emit('result', result);

                    if (!done) {
                        /**
                         * @callback Webcheck~requestDoneCallback
                         * @param {null|error} error - Error if there was one
                         */
                        return callback();
                    }
                });
            })
            .on('error', function (err) {
                return callback(err);
            });
    };

    this.queue = async.queue(taskRunner, opts.concurrency);
    /**
     * Drain function for async-queue
     * @private
     * @fires Webcheck#drain
     */
    this.queue.drain = function () {
        /**
         * Event that fires when queue has drained
         * @event Webcheck#drain
         * @type {undefined}
         */
        self.emit('drain');
    };
    this.request = opts.request || Webcheck.request;
    this.middlewares = [];
};

Webcheck.prototype = {
    '__proto__': EventEmitter.prototype,
    /**
     * Add a plugin to webcheck
     * @param {Webcheck.Plugin} plugin - The plugin to add to webcheck
     * @returns {Webcheck}
     */
    addPlugin: function addPlugin(plugin) {
        this.emit('addPlugin', plugin);
        plugin.register(this);
        return this;
    },
    /**
     * Crawl a resource
     * @param {{}} settings - Settings for crawl
     * @param {string|url} settings.url - URL to crawl
     * @param {headers} [settings.headers] - Headers to use for this crawl (otherwise it uses the standard headers)
     * @param {number} [settings.wait] - Milliseconds to wait until queuing
     * @param {boolean} [settings.preventCrawl=false] - True if crawl should be prevented (works not async!)
     * @param {boolean} [settings.immediately=false] - True if crawl should run immediately
     * @param {*} [settings.parameters] - Parameters to pass for further processing
     * @param {Webcheck~queueCallback} cb - Callback for crawl
     * @returns {Webcheck}
     * @fires Webcheck#queue
     * @fires Webcheck#crawl
     */
    crawl: function crawlResource(settings, cb) {
        var caller;
        settings = settings || {};

        if (typeof settings.url !== 'string') {
            throw new Error('No url specified!');
        }

        settings.headers = settings.headers || this.headers;
        settings.preventCrawl = false;

        /**
         * @event Webcheck#crawl
         * @type {Webcheck.crawlSettings}
         */
        this.emit('crawl', settings);
        caller = function () {
            /**
             * @event Webcheck#queue
             * @type {Webcheck.crawlSettings}
             */
            this.emit('queue', settings);

            if (settings.preventCrawl) {
                return cb();
            }
            if (settings.immediately) {
                return this.queue.unshift(settings, cb);

            }
            /**
             * @callback Webcheck~queueCallback
             * @param {null|error} error - Throws error if there was one
             */

            this.queue.push(settings, cb);
        }.bind(this);

        if (typeof settings.wait === 'number') {
            this.emit('wait', settings);
            setTimeout(caller, settings.wait);
        } else {
            caller();
        }
        return this;
    },

    // Set in constructor
    /**
     * The crawler queue
     * @type {async.queue}
     */
    queue: null,
    /**
     * List of used middleware
     * @type {Array}
     */
    middlewares: null,
    /**
     * Request function to use (use static defaults as fallback)
     * @type {request|function}
     */
    request: null,
    /**
     * Default headers (use static defaults as fallback)
     * @type {headers}
     */
    headers: null
};

/**
 * Request module to make requests with by default
 * @type {*|responseToJSON.request|request|exports|Querystring.request|Multipart.request}
 */
Webcheck.request = request;

/**
 * Plugin class
 * @type {Plugin|exports|function}
 */
Webcheck.Plugin = require('./plugin');

Webcheck.headers = {
    'User-Agent': pkg.name + ' ' + pkg.version
};
Webcheck.concurrency = 5;

module.exports = Webcheck;
