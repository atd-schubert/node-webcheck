/**
 * Webcheck core module
 * @author Arne Schubert <atd.schubert@gmail.com>
 * @module webcheck
 */

import async, { AsyncQueue } from "async";
import { EventEmitter } from "events";
import { ServerResponse } from "http";
import request from "request";
import pkg = require("./package.json");
import { IPlugin } from "./plugin";

export type ICallback = (err?: Error | null) => void;
export type IMiddleware = (result: IResult, next: ICallback) => void;
export interface IHeaders {
    [name: string]: string;
}
export interface IEmitterDictionary {
    // response?: (response: Response) => void;
    [event: string]: (...args: any[]) => void;
}
export interface IWebcheckOptions {
    request?: request.RequestAPI<request.Request, request.CoreOptions, request.RequiredUriUrl>;
    headers?: IHeaders;
    concurrency?: number;
}
export interface ICrawlOptions {
    url: string;
    headers?: IHeaders;
    preventCrawl?: boolean;
    immediately?: boolean;
    wait?: number;
}
export interface IResult {
    url: string;
    settings: ICrawlOptions;
    request: request.Request;
    response: ServerResponse;
    done?: ICallback;
}
export interface IWebcheck extends EventEmitter {
    middlewares: IMiddleware[];
    queue: AsyncQueue<any>;
    request: request.RequestAPI<request.Request, request.CoreOptions, request.RequiredUriUrl>;
    headers: IHeaders;
    addPlugin(plugin: IPlugin): this;
    crawl(options: ICrawlOptions, callback?: ICallback): this;
}

export class Webcheck extends EventEmitter implements IWebcheck {
    public static concurrency: number = 5;
    public static headers: IHeaders = {
        "User-Agent": pkg.name + " " + pkg.version,
    };
    public static request: request.RequestAPI<request.Request, request.CoreOptions, request.RequiredUriUrl> = request;
    public concurrency: number = Webcheck.concurrency;
    public readonly middlewares: IMiddleware[] = [];
    public queue: AsyncQueue<ICrawlOptions>;
    public request: request.RequestAPI<request.Request, request.CoreOptions, request.RequiredUriUrl> = Webcheck.request;
    public headers: IHeaders = Webcheck.headers;
    constructor(opts: IWebcheckOptions = {}) {
        super();
        this.concurrency = opts.concurrency || Webcheck.concurrency;
        this.headers = opts.headers || Webcheck.headers;

        /**
         * Task runner for queue (async.queue)
         * @private
         * @fires Webcheck#request
         */
        const taskRunner = (task: ICrawlOptions, callback: ICallback) => {
            if (task.preventCrawl) {
                return callback();
            }
            /**
             * @event Webcheck#request
             * @type {ICrawlOptions}
             */
            this.emit("request", task);
            if (task.preventCrawl) {
                return callback();
            }
            const req = this.request(task)
                .on("response", (response) => {
                    let done: boolean = false;
                    this.emit("response", response);
                    const result = {
                        done: (err?: Error) => {
                            if (!done) {
                                done = true;
                                return callback(err);
                            }
                            this.emit("warn", "done already triggered");
                        },
                        request: req,
                        response,
                        settings: task,
                        url: task.url,
                    };
                    async.applyEachSeries(this.middlewares, result, (err?: Error) => {
                        if (err) {
                            return callback(err);
                        }
                        delete result.done;
                        this.emit("result", result);

                        if (!done) {
                            return callback();
                        }
                    });
                })
                .on("error", (err: Error) => {
                    return callback(err);
                });
        };

        this.queue = async.queue(taskRunner, this.concurrency);
    }
    public crawl(opts: ICrawlOptions, cb: ICallback = () => { /* do nothing */ }): this {
        if (typeof opts.url !== "string") {
            throw new Error("No url specified!");
        }

        opts.headers = opts.headers || this.headers;
        opts.preventCrawl = false;

        /**
         * @event Webcheck#crawl
         * @type {ICrawlOptions}
         */
        this.emit("crawl", opts);
        const caller = () => {
            /**
             * @event Webcheck#queue
             * @type {ICrawlOptions}
             */
            this.emit("queue", opts);

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

        if (typeof opts.wait === "number") {
            this.emit("wait", opts);
            setTimeout(caller, opts.wait);
        } else {
            caller();
        }
        return this;
    }

    public addPlugin(plugin: IPlugin) {
        this.emit("addPlugin", plugin);
        plugin.register(this);
        return this;
    }
}
