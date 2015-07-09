/*jslint node:true */

/**
 * Webcheck core
 * @author Arne Schubert <atd.schubert@gmail.com>
 */

'use strict';

var async = require('async');
var request = require('request');
var winston = require('winston');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var cheerioize = require('./cheerioize');

var pkg = require('./package.json');

var std = {
    headers: {
        'User-Agent': pkg.name + ' ' + pkg.version
    },
    concurrency: 5
};

/**
 * Webcheck constuctor
 * @param opts
 * @constructor
 */
var Webcheck = function (opts) {
    var drained, queue, self, sleepingQueue;

    if (!this) {
        return new Webcheck(opts);
    }

    opts = opts || {};
    self = this;
    sleepingQueue = [];
    queue = async.queue(function (task, callback) {
        var options, req;

        options = {
            uri: task.url,
            headers: task.headers || opts.headers || std.headers,
            task: task
        };

        req = self.request(options)
            .on('response', function (response) {
                var i, obj;
                obj = {
                    url: task.url,
                    request: req,
                    response: response
                };
                obj.getCheerio = function getCheerio(cb) {
                    cheerioize(response, cb);
                };
                for (i = 0; i < self.middlewares.length; i += 1) {
                    self.middlewares[i].call(self, obj);
                }
                callback();
            })
            .on('error', function (err) {
                self.logger.error('Error in request', err);
                callback(err);
            });
        req.task = task;
        // task.headers, task.url
    }, opts.concurrency || std.concurrency);

    queue.drain = function () {
        drained = true;
        self.emit('drain');
    };

    /**
     * A logger instantiated from winston
     * @type {*|exports|ProfileHandler.logger}
     */
    this.logger = opts.logger || winston;
    /**
     * Request module to make requests with
     * @type {*|responseToJSON.request|request|exports|Querystring.request|Multipart.request}
     */
    this.request = opts.request || request;
    /**
     * List of used middlewares
     * @type {Array}
     */
    this.middlewares = [];

    /**
     * Object to write in reports
     * @type {{}}
     */
    this.report = {};

    /**
     * Add middlewares to webcheck
     * @param middleware {function}
     */
    this.use = function (middleware) {
        this.middlewares.push(middleware);
        if (typeof middleware.init === 'function') {
            middleware.init(this);
        }
        this.emit('use', middleware);
    };
    /**
     * Crawl a resource
     * @param url {string}
     * @param options {{}}
     * @returns {self}
     */
    this.crawl = function (url, options) {
        options = options || {};

        if (!url) {
            return self.logger.error('No url specified!', new Error('No url specified!'));
        }

        var caller = function () {
            drained = false;
            self.emit('run', {url:url, options:options, fn: caller});
            queue.push({
                url: url,
                headers: options.headers,
                options: options
            });
        };

        this.emit('crawl', {url:url, options:options, fn: caller});

        if (options.sleep) {
            sleepingQueue.push(caller);
            setTimeout(function () {
                sleepingQueue.splice(sleepingQueue.indexOf(caller), 1)();
            }, options.sleep);
        } else {
            caller();
        }
        return this;
    };

    /**
     * Returns the status of webcheck
     * @returns {{queueConcurrency: (number|webcheck.concurrency|q.concurrency), sleepingQueue: Number, drained: boolean}}
     */
    this.getStatus = function () {
        return {
            queueConcurrency: opts.concurrency || std.concurrency,
            sleepingQueue: sleepingQueue.length,
            drained: drained
        };
    };
};

util.inherits(Webcheck, EventEmitter);

module.exports = Webcheck;
