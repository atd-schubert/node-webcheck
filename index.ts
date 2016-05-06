/// <reference path="typings/main.d.ts" />
/**
 * Webcheck core module
 * @author Arne Schubert <atd.schubert@gmail.com>
 * @module webcheck
 */

import * as async from 'async';
import * as http from 'http';
import * as request from 'request';
import { EventEmitter } from 'events';

import * as pkg from './package.json';

export interface ICallback {
    (err?: Error): void;
}
export interface IMiddleware {
    (result: IResult, next: ICallback): void
}
interface ITaskRunner {
    (task: ICrawlOptions, callback: ICallback): void;
}
export interface IHeaders {
    [name: string]: string;
}
export interface IEmitterDictionary {
    response?: (response) => void;
    [event: string]: (...args) => void; // any other event
}
export interface IPlugin {
    handle: Webcheck;

    on: IEmitterDictionary;
    once: IEmitterDictionary;

    middleware?: IMiddleware;

    init?: Function;

    enable(): IPlugin;
    disable(): IPlugin;
    register(handle: IWebcheck): IPlugin;
}
export interface IWebcheckOptions {
    request?: request.RequestAPI<request.Request, request.CoreOptions, request.RequiredUriUrl>;
    headers?: IHeaders;
    concurrency?: number;
}
/**
 * @name ICrawlerOptions
 * @type {{}}
 * @property {string|url} url - URL to crawl
 * @property {headers} headers - Headers to use for this crawl (otherwise it uses the standard headers)
 * @property {number} wait - Milliseconds to wait until queuing
 * @property {boolean} preventCrawl - True if crawl should be prevented (works not async!)
 */
export interface ICrawlOptions {
    url: string;

    headers?: IHeaders;
    preventCrawl?: boolean;
    immediately?: boolean;
    wait?: number;
}

/**
 * @name IResult
 * @type {{}}
 * @property {string|url} url - URL to crawl
 * @property {ICrawlOptions} settings - The settings that called this result
 * @property {request.Request} request - The request
 * @property {stream} response - Response returned by request
 */
export interface IResult {
    url: string;
    settings: ICrawlOptions;
    request: request.Request;
    response: http.ClientResponse;
    done?: ICallback;
}

export interface IWebcheck {
    middlewares: IMiddleware[];
    queue: AsyncQueue<any>;

    request: request.RequestAPI<request.Request, request.CoreOptions, request.RequiredUriUrl>;
    headers: IHeaders;

    
    addPlugin(plugin: Plugin): IWebcheck;

    crawl(options: ICrawlOptions, callback: ICallback): IWebcheck;
}

export class Webcheck extends EventEmitter implements IWebcheck {
    /**
     * Number of simultaneous crawls
     * @type {number}
     */
    public static concurrency: number = 5;
    /**
     * Default headers
     * @type {IHeaders}
     */
    public static headers: IHeaders = {
        'User-Agent': pkg.name + ' ' + pkg.version
    };
    /**
     * Request module to make requests with by default
     * @type {request}
     */
    public static request: request.RequestAPI<request.Request, request.CoreOptions, request.RequiredUriUrl> = request;

    /**
     * List of registered middlewares
     * @type {IMiddleware[]}
     */
    public middlewares: IMiddleware[] = [];

    /**
     * Current queue
     */
    public queue: AsyncQueue<ICrawlOptions>;

    /**
     * Request module to make requests with
     */
    public request: request.RequestAPI<request.Request, request.CoreOptions, request.RequiredUriUrl>;

    /**
     * Headers used for crawl
     */
    public headers: IHeaders;

    constructor(opts: IWebcheckOptions) {
        super();
        opts = opts || {};
        this.request = opts.request || Webcheck.request;
        this.headers = opts.headers || Webcheck.headers;

        opts.concurrency = opts.concurrency || Webcheck.concurrency;

        /**
         * Task runner for queue (async.queue)
         * @private
         * @param {ICrawlOptions} task
         * @param {Webcheck~requestDoneCallback} callback
         * @fires Webcheck#request
         */

        var taskRunner: ITaskRunner = (task: ICrawlOptions, callback: ICallback): void => {
            var req: request.Request;
            
            if (task.preventCrawl) {
                return callback();
            }
            /**
             * @event Webcheck#request
             * @type {ICrawlOptions}
             */
            this.emit('request', task);
            if (task.preventCrawl) {
                return callback();
            }
            req = this.request(task)
                .on('response', (response: http.ClientResponse): void => {
                    var result: IResult,
                        done;
                    this.emit('response', response);
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
                    async.applyEachSeries(this.middlewares, result, (err?: Error): void => {
                        if (err) {
                            return callback(err);
                        }
                        delete result.done;
                        /**
                         * @event Webcheck#result
                         * @type {Webcheck.result}
                         */
                        this.emit('result', result);

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
        this.queue.drain = (): void => {
            /**
             * Event that fires when queue has drained
             * @event Webcheck#drain
             * @type {undefined}
             */
            this.emit('drain');
        };
    }

    /**
     *
     * @param opts {ICrawlOptions}
     * @param cb {ICallback}
     * @returns {Webcheck}
     */
    public crawl(opts: ICrawlOptions, cb: ICallback = (): void => {}) {
        var caller;
        opts = opts || {};

        if (typeof opts.url !== 'string') {
            throw new Error('No url specified!');
        }

        opts.headers = opts.headers || this.headers;
        opts.preventCrawl = false;

        /**
         * @event Webcheck#crawl
         * @type {ICrawlOptions}
         */
        this.emit('crawl', opts);
        caller = (): void => {
            /**
             * @event Webcheck#queue
             * @type {ICrawlOptions}
             */
            this.emit('queue', opts);

            if (opts.preventCrawl) {
                return cb();
            }
            if (opts.immediately) {
                return this.queue.unshift(opts, cb);

            }
            /**
             * @callback Webcheck~queueCallback
             * @param {null|error} error - Throws error if there was one
             */

            this.queue.push(opts, cb);
        };

        if (typeof opts.wait === 'number') {
            this.emit('wait', opts);
            setTimeout(caller, opts.wait);
        } else {
            caller();
        }
        return this;
    }
    
    public addPlugin(plugin: Plugin): Webcheck {
        /**
         * Adding a plugin
         * @event Webcheck#addPlugin
         * @type {Plugin}
         */
        this.emit('addPlugin', plugin);
        plugin.register(this);
        return this;
    }
}

export class Plugin implements IPlugin {
    /**
     * Handle to webcheck instance
     */
    public handle: Webcheck;

    /**
     * Associative array of events that should be called
     */
    public on: IEmitterDictionary = {};

    /**
     * Associative array of events that should be called once
     */
    public once: IEmitterDictionary = {};

    /**
     * Middleware that should be called in webcheck
     */
    public middleware: IMiddleware;

    /**
     * Function to initialize this plugin on enable
     */
    public init: Function;

    /**
     * Enable this plugin on webcheck
     * @returns {Plugin}
     */
    public enable(): Plugin {
        var hash;

        this.handle.emit('enablePlugin', this);
        for (hash in this.on) {
            if (this.on.hasOwnProperty(hash)) {
                this.handle.on(hash, this.on[hash]);
            }
        }
        for (hash in this.once) {
            if (this.once.hasOwnProperty(hash)) {
                this.handle.once(hash, this.once[hash]);
            }
        }
        if (this.middleware) {
            this.handle.middlewares.push(this.middleware);
        }

        if (typeof this.init === 'function') {
            this.init.apply(this, arguments);
        }

        return this;
    }

    /**
     * Disable this plugin on webcheck
     * @returns {Plugin}
     */
    public disable(): Plugin {
        var hash;

        this.handle.emit('disablePlugin', this);
        for (hash in this.on) {
            if (this.on.hasOwnProperty(hash)) {
                this.handle.removeListener(hash, this.on[hash]);
            }
        }
        for (hash in this.once) {
            if (this.once.hasOwnProperty(hash)) {
                this.handle.removeListener(hash, this.once[hash]);
            }
        }
        if (this.middleware) {
            this.handle.middlewares.splice(this.handle.middlewares.indexOf(this.middleware), 1);
        }

        return this;
    }

    /**
     * Register this plugin on webcheck
     * @param handle
     * @returns {Plugin}
     */
    public register(handle: Webcheck): Plugin {
        this.handle = handle;
        this.handle.emit('registerPlugin', this);
        return this;
    }
}


