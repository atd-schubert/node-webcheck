/*jslint node:true*/

/*global describe, it, before, after, beforeEach, afterEach*/

'use strict';

var Webcheck = require("../");

describe('Webcheck', function () {

    describe('Basic functions and events', function () {
        var webcheck, request, response, settings;
        settings = {
            url: 'http://unimportant.for/test'
        };
        response = {};

        before(function () {
            var spoofedEventHandler = {
                on: function (name, fn) {
                    if (name === 'response') {
                        setTimeout(function () {
                            fn(response);
                        }, 1);
                    }
                    return spoofedEventHandler;
                },
                once: function () {
                    return spoofedEventHandler;
                }
            };
            webcheck = new Webcheck();
            request = function (opts) {
                return spoofedEventHandler;
            };
            webcheck.request = request;
        });
        it('should fire queue event', function (done) {
            var triggered;
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
        it('should fire wait and queue event if waiting', function (done) {
            var triggeredQueue,
                triggeredWait;
            settings.wait = 1;
            webcheck.once('queue', function (s) {
                if (s !== settings) {
                    return done(new Error('Wrong settings passed'));
                }
                triggeredQueue = true;
            });
            webcheck.once('wait', function (s) {
                if (s !== settings) {
                    return done(new Error('Wrong settings passed'));
                }
                triggeredWait = true;
            });
            webcheck.crawl(settings, function (err) {
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
        it('should fire response event and should replace replace function', function (done) {
            var triggered;
            webcheck.once('response', function (r) {
                if (r !== response) {
                    return done(new Error('Wrong response returned'));
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
        it('should fire result event', function (done) {
            var triggered;
            webcheck.once('result', function (r) {
                if (r.response !== response) {
                    return done(new Error('Wrong response returned'));
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
    });

    describe('Middleware', function () {
        var webcheck, request, response;
        response = {};
        before(function () {
            var spoofedEventHandler = {
                on: function (name, fn) {
                    if (name === 'response') {
                        setTimeout(function () {
                            fn(response);
                        }, 1);
                    }
                    return spoofedEventHandler;
                },
                once: function () {
                    return spoofedEventHandler;
                }
            };
            webcheck = new Webcheck();
            request = function (opts) {
                return spoofedEventHandler;
            };
            webcheck.request = request;
        });

        it('should not fire result if middleware prevent execution', function (done) {
            webcheck.middlewares.push(function (result, next){
                result.done();
            });
            webcheck.once('result', function () {
                return done(new Error('Event triggered'));
            });
            webcheck.crawl({
                url: 'http://unimportant.url'
            }, function (err) {
                webcheck.middlewares = [];
                webcheck.removeAllListeners('result');
                if (err) {
                    return done(err);
                }
                return done();
            });
        });
        it('should fire result if middleware going next', function (done) {
            var triggered;
            webcheck.middlewares.push(function (result, next){
                next();
            });
            webcheck.once('result', function () {
                triggered = true;
            });
            webcheck.crawl({
                url: 'http://unimportant.url'
            }, function (err) {
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
        it('should stop middleware execution if middleware nexts error', function (done) {
            var error = new Error('test');
            webcheck.middlewares.push(function (result, next){
                next(error);
            });
            webcheck.crawl({
                url: 'http://unimportant.url'
            }, function (err) {
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
        it('should concat middleware in the right order', function (done) {
            var triggeredFirst, triggeredSecond;
            webcheck.middlewares.push(function (result, next){
                triggeredFirst = true;
                next();
            });
            webcheck.middlewares.push(function (result, next){
                if (!triggeredFirst) {
                    return next(new Error('first middleware was not executed'));
                }
                triggeredSecond = true;
                next();
            });
            webcheck.crawl({
                url: 'http://unimportant.url'
            }, function (err) {
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

    describe('Plugin', function () {
        var webcheck;
        before(function () {
            webcheck = new Webcheck();
        });

        it('should register plugin and trigger addPlugin event', function (done) {
            var plugin = new Webcheck.Plugin();

            webcheck.once('addPlugin', function (p) {
                if (p !== plugin) {
                    return done(new Error('Wrong'));
                }
                return done();
            });

            webcheck.addPlugin(plugin);
        });
        it('should trigger enablePlugin event', function (done) {
            var plugin = new Webcheck.Plugin();

            webcheck.once('enablePlugin', function (p) {
                if (p !== plugin) {
                    return done(new Error('Wrong plugin send in event'));
                }
                return done();
            });

            webcheck.addPlugin(plugin);
            plugin.enable();
        });
        it('should trigger disablePlugin event', function (done) {
            var plugin = new Webcheck.Plugin();

            webcheck.once('disablePlugin', function (p) {
                if (p !== plugin) {
                    return done(new Error('Wrong plugin send in event'));
                }
                return done();
            });

            webcheck.addPlugin(plugin);
            plugin.enable();
            plugin.disable();
        });
        it('should add a event on enablePlugin', function (done) {
            var test = {},
                plugin = new Webcheck.Plugin();

            plugin.once.test = function (t) {
                if (test !== t) {
                    return done(new Error('Wrong parameter send on call'));
                }
                return done();
            };

            webcheck.addPlugin(plugin);
            plugin.enable();
            webcheck.emit('test', test);
        });
        it('should remove added event on disablePlugin', function (done) {
            var test = {},
                plugin = new Webcheck.Plugin();

            plugin.once.test = function (t) {
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