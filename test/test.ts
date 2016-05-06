/*jslint node:true*/

/*global describe, it, before, after, beforeEach, afterEach*/

/// <reference path="../typings/main.d.ts"/>

import { Webcheck, Plugin, IResult, ICallback } from '../index';

describe('Webcheck', (): void => {

    
    
    describe('Basic functions and events', (): void => {
        var webcheck: Webcheck, request: any, response, settings;
        settings = {
            url: 'http://unimportant.for/test'
        };
        response = {};

        before((): void => {
            var spoofedEventHandler: any = {
                on: (name, fn): void => {
                    if (name === 'response') {
                        setTimeout((): void => {
                            fn(response);
                        }, 1);
                    }
                    return spoofedEventHandler;
                },
                once: (): void => {
                    return spoofedEventHandler;
                }
            };
            webcheck = new Webcheck({});
            request = function () {
                return spoofedEventHandler;
            };
            webcheck.request = request;
        });
        it('should fire queue event', (done: MochaDone): void => {
            var triggered: boolean;
            webcheck.once('queue', function (s) {
                if (s !== settings) {
                    return done(new Error('Wrong settings passed'));
                }
                triggered = true;
            });
            webcheck.crawl(settings, function (err) {
                if (err) {
                    return done(err);
                }
                if (triggered) {
                    return done();
                }
                return done(new Error('Event not triggered'));
            });
        });
        it('should prevent request in event settings object', (done: MochaDone): void => {
            webcheck.once('queue', function (settings) {
                settings.preventCrawl = true;
            });
            webcheck.once('request', (): void => {
                done(new Error('Request started'));
            });
            webcheck.crawl(settings, (err): void => {
                webcheck.removeAllListeners();
                if (err) {
                    return done(err);
                }
                return done();
            });
        });
        it('should fire wait and queue event if waiting', (done: MochaDone): void => {
            var triggeredQueue,
                triggeredWait;
            settings.wait = 1;
            webcheck.once('queue', (s): void => {
                if (s !== settings) {
                    return done(new Error('Wrong settings passed'));
                }
                triggeredQueue = true;
            });
            webcheck.once('wait', (s): void => {
                if (s !== settings) {
                    return done(new Error('Wrong settings passed'));
                }
                triggeredWait = true;
            });
            webcheck.crawl(settings, (err): void => {
                if (err) {
                    return done(err);
                }

                delete settings.wait;
                if (triggeredQueue && triggeredWait) {
                    return done();
                }
                return done(new Error('Event not triggered'));
            });
        });
        it('should fire response event and should replace replace function', (done): void => {
            var triggered;
            webcheck.once('response', (r): void => {
                if (r !== response) {
                    return done(new Error('Wrong response returned'));
                }
                triggered = true;
            });
            webcheck.crawl(settings, (err): void => {
                if (err) {
                    return done(err);
                }
                if (triggered) {
                    return done();
                }
                return done(new Error('Event not triggered'));
            });
        });
        it('should fire result event', (done: MochaDone): void => {
            var triggered;
            webcheck.once('result', (r): void => {
                if (r.response !== response) {
                    return done(new Error('Wrong response returned'));
                }
                triggered = true;
            });
            webcheck.crawl(settings, (err: Error): void => {
                if (err) {
                    return done(err);
                }
                if (triggered) {
                    return done();
                }
                return done(new Error('Event not triggered'));
            });
        });
    });

    describe('Middleware', (): void => {
        var webcheck: Webcheck,
            request: any,
            response: any;

        response = {};
        before((): void => {
            var spoofedEventHandler = {
                on: (name, fn): any => {
                    if (name === 'response') {
                        setTimeout((): void => {
                            fn(response);
                        }, 1);
                    }
                    return spoofedEventHandler;
                },
                once: (): any => {
                    return spoofedEventHandler;
                }
            };
            webcheck = new Webcheck({});
            request = (): any => {
                return spoofedEventHandler;
            };
            webcheck.request = request;
        });

        it('should not fire result if middleware prevent execution', (done: MochaDone): void => {
            webcheck.middlewares.push((result: IResult): void => {
                result.done();
            });
            webcheck.once('result', (): void => {
                return done(new Error('Event triggered'));
            });
            webcheck.crawl({
                url: 'http://unimportant.url'
            }, (err: Error): void => {
                webcheck.middlewares = [];
                webcheck.removeAllListeners('result');
                if (err) {
                    return done(err);
                }
                return done();
            });
        });
        it('should fire result if middleware going next', (done: MochaDone): void => {
            var triggered;
            webcheck.middlewares.push((result: IResult, next: ICallback): void => {
                next();
            });
            webcheck.once('result', (): void => {
                triggered = true;
            });
            webcheck.crawl({
                url: 'http://unimportant.url'
            }, (err: Error): void => {
                webcheck.middlewares = [];
                if (err) {
                    return done(err);
                }
                if (triggered) {
                    return done();
                }
                return done(new Error('Event not triggered'));
            });
        });
        it('should stop middleware execution if middleware nexts error', (done: MochaDone): void => {
            var error = new Error('test');
            webcheck.middlewares.push((result: IResult, next: ICallback): void => {
                next(error);
            });
            webcheck.crawl({
                url: 'http://unimportant.url'
            }, (err: Error): void => {
                webcheck.middlewares = [];
                if (err === error) {
                    return done();
                }
                if (err) {
                    return done(err);
                }
                return done(new Error('Error was not send'));
            });
        });
        it('should concat middleware in the right order', (done: MochaDone): void => {
            var triggeredFirst: boolean,
                triggeredSecond: boolean;

            webcheck.middlewares.push((result: IResult, next: ICallback): void => {
                triggeredFirst = true;
                next();
            });
            webcheck.middlewares.push((result: IResult, next): void => {
                if (!triggeredFirst) {
                    return next(new Error('first middleware was not executed'));
                }
                triggeredSecond = true;
                next();
            });
            webcheck.crawl({
                url: 'http://unimportant.url'
            }, (err: Error): void => {
                if (err) {
                    return done(err);
                }
                if (triggeredFirst && triggeredSecond) {
                    return done();
                }
                return done(new Error('Nothing was triggered'));
            });
        });
    });

    describe('Plugin', (): void => {
        var webcheck: Webcheck;
        before((): void => {
            webcheck = new Webcheck({});
        });

        it('should register plugin and trigger addPlugin event', (done: MochaDone): void => {
            var plugin: Plugin = new Plugin();

            webcheck.once('addPlugin', (p: Plugin): void => {
                if (p !== plugin) {
                    return done(new Error('Wrong'));
                }
                return done();
            });

            webcheck.addPlugin(plugin);
        });
        it('should trigger enablePlugin event', (done: MochaDone): void => {
            var plugin: Plugin = new Plugin();

            webcheck.once('enablePlugin', (p: Plugin): void => {
                if (p !== plugin) {
                    return done(new Error('Wrong plugin send in event'));
                }
                return done();
            });

            webcheck.addPlugin(plugin);
            plugin.enable();
        });
        it('should trigger disablePlugin event', (done: MochaDone): void => {
            var plugin: Plugin = new Plugin();

            webcheck.once('disablePlugin', (p: Plugin): void => {
                if (p !== plugin) {
                    return done(new Error('Wrong plugin send in event'));
                }
                return done();
            });

            webcheck.addPlugin(plugin);
            plugin.enable();
            plugin.disable();
        });
        it('should add a event on enablePlugin', (done: MochaDone): void => {
            var test: any = {},
                plugin: Plugin = new Plugin();

            plugin.once['test'] = (t: any): void => {
                if (test !== t) {
                    return done(new Error('Wrong parameter send on call'));
                }
                return done();
            };

            webcheck.addPlugin(plugin);
            plugin.enable();
            webcheck.emit('test', test);
        });
        it('should remove added event on disablePlugin', (done: MochaDone): void => {
            var test = {},
                plugin: Plugin = new Plugin();

            plugin.once['test'] = (t: any): void => {
                if (test !== t) {
                    return done(new Error('Wrong parameter send on call'));
                }
                return done();
            };

            webcheck.addPlugin(plugin);
            plugin.enable();
            plugin.disable();
            webcheck.emit('test', test);
            return done();
        });
    });
});