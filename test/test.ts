import { ICrawlOptions, Plugin as OriginalPlugin, Webcheck } from "../";

class Plugin extends OriginalPlugin {} // it is a abstract class...

describe("Webcheck", () => {

    describe("Basic functions and events", () => {
        // var webcheck, request, response, settings;
        const webcheck = new Webcheck();
        const settings: ICrawlOptions = {
            url: "http://unimportant.for/test",
        };
        const response = {};

        before(() => {
            const spoofedEventHandler = {
                on(name, fn) {
                    if (name === "response") {
                        setTimeout(() => {
                            fn(response);
                        }, 1);
                    }
                    return spoofedEventHandler;
                },
                once() {
                    return spoofedEventHandler;
                },
            };
            webcheck.request = () => {
                return spoofedEventHandler;
            };
        });
        it("should fire queue event", (done) => {
            let triggered;
            webcheck.once("queue", (s) => {
                if (s !== settings) {
                    return done(new Error("Wrong settings passed"));
                }
                triggered = true;
            });
            webcheck.crawl(settings, (err) => {
                if (err) {
                    return done(err);
                }
                if (triggered) {
                    return done();
                }
                return done(new Error("Event not triggered"));
            });
        });
        it("should prevent request in event settings object", (done: Mocha.Done) => {
            webcheck.once("queue", (receivedSettings: ICrawlOptions) => {
                receivedSettings.preventCrawl = true;
            });
            webcheck.once("request", () => {
                done(new Error("Request started"));
            });
            webcheck.crawl(settings, (err) => {
                webcheck.removeAllListeners();
                if (err) {
                    return done(err);
                }
                return done();
            });
        });
        it("should fire wait and queue event if waiting", (done: Mocha.Done) => {
            let triggeredQueue;
            let triggeredWait;

            settings.wait = 1;
            webcheck.once("queue", (s: ICrawlOptions) => {
                if (s !== settings) {
                    return done(new Error("Wrong settings passed"));
                }
                triggeredQueue = true;
            });
            webcheck.once("wait", (s: ICrawlOptions) => {
                if (s !== settings) {
                    return done(new Error("Wrong settings passed"));
                }
                triggeredWait = true;
            });
            webcheck.crawl(settings, (err?: Error) => {
                if (err) {
                    return done(err);
                }

                delete settings.wait;
                if (triggeredQueue && triggeredWait) {
                    return done();
                }
                return done(new Error("Event not triggered"));
            });
        });
        it("should fire response event and should replace replace function", (done: Mocha.Done) => {
            let triggered;
            webcheck.once("response", (r) => {
                if (r !== response) {
                    return done(new Error("Wrong response returned"));
                }
                triggered = true;
            });
            webcheck.crawl(settings, (err) => {
                if (err) {
                    return done(err);
                }
                if (triggered) {
                    return done();
                }
                return done(new Error("Event not triggered"));
            });
        });
        it("should fire result event", (done) => {
            let triggered;
            webcheck.once("result", (r) => {
                if (r.response !== response) {
                    return done(new Error("Wrong response returned"));
                }
                triggered = true;
            });
            webcheck.crawl(settings, (err) => {
                if (err) {
                    return done(err);
                }
                if (triggered) {
                    return done();
                }
                return done(new Error("Event not triggered"));
            });
        });
    });

    describe("Middleware", () => {
        const webcheck = new Webcheck();
        const response = {};
        before(() => {
            const spoofedEventHandler = {
                on(name, fn) {
                    if (name === "response") {
                        setTimeout(() => {
                            fn(response);
                        }, 1);
                    }
                    return spoofedEventHandler;
                },
                once() {
                    return spoofedEventHandler;
                },
            };
            webcheck.request = () => {
                return spoofedEventHandler;
            };
        });

        it("should not fire result if middleware prevent execution", (done: Mocha.Done) => {
            webcheck.middlewares.push((result) => {
                result.done();
            });
            webcheck.once("result", () => {
                return done(new Error("Event triggered"));
            });
            webcheck.crawl({
                url: "http://unimportant.url",
            }, (err?: Error) => {
                webcheck.middlewares.length = 0;
                webcheck.removeAllListeners("result");
                if (err) {
                    return done(err);
                }
                return done();
            });
        });
        it("should fire result if middleware going next", (done: Mocha.Done) => {
            let triggered;
            webcheck.middlewares.push((result, next) => {
                next();
            });
            webcheck.once("result", () => {
                triggered = true;
            });
            webcheck.crawl({
                url: "http://unimportant.url",
            }, (err?: Error) => {
                webcheck.middlewares.length = 0;
                if (err) {
                    return done(err);
                }
                if (triggered) {
                    return done();
                }
                return done(new Error("Event not triggered"));
            });
        });
        it("should stop middleware execution if middleware nexts error", (done) => {
            const error = new Error("test");
            webcheck.middlewares.push((result, next) => {
                next(error);
            });
            webcheck.crawl({
                url: "http://unimportant.url",
            }, (err) => {
                webcheck.middlewares.length = 0;
                if (err === error) {
                    return done();
                }
                if (err) {
                    return done(err);
                }
                return done(new Error("Error was not send"));
            });
        });
        it("should concat middleware in the right order", (done) => {
            let triggeredFirst;
            let triggeredSecond;
            webcheck.middlewares.push((result, next) => {
                triggeredFirst = true;
                next();
            });
            webcheck.middlewares.push((result, next) => {
                if (!triggeredFirst) {
                    return next(new Error("first middleware was not executed"));
                }
                triggeredSecond = true;
                next();
            });
            webcheck.crawl({
                url: "http://unimportant.url",
            }, (err) => {
                if (err) {
                    return done(err);
                }
                if (triggeredFirst && triggeredSecond) {
                    return done();
                }
                return done(new Error("Nothing was triggered"));
            });
        });
    });

    describe("Plugin", () => {
        const webcheck = new Webcheck();

        it("should register plugin and trigger addPlugin event", (done: Mocha.Done) => {
            const plugin = new Plugin();

            webcheck.once("addPlugin", (p) => {
                if (p !== plugin) {
                    return done(new Error("Wrong"));
                }
                return done();
            });

            webcheck.addPlugin(plugin);
        });
        it("should trigger enablePlugin event", (done: Mocha.Done) => {
            const plugin = new Plugin();

            webcheck.once("enablePlugin", (p) => {
                if (p !== plugin) {
                    return done(new Error("Wrong plugin send in event"));
                }
                return done();
            });

            webcheck.addPlugin(plugin);
            plugin.enable();
        });
        it("should trigger disablePlugin event", (done: Mocha.Done) => {
            const plugin = new Plugin();

            webcheck.once("disablePlugin", (p) => {
                if (p !== plugin) {
                    return done(new Error("Wrong plugin send in event"));
                }
                return done();
            });

            webcheck.addPlugin(plugin);
            plugin.enable();
            plugin.disable();
        });
        it("should add a event on enablePlugin", (done: Mocha.Done) => {
            const test = {};
            const plugin = new Plugin();

            (plugin as any).once.test = (t) => {
                if (test !== t) {
                    return done(new Error("Wrong parameter send on call"));
                }
                return done();
            };

            webcheck.addPlugin(plugin);
            plugin.enable();
            webcheck.emit("test", test);
        });
        it("should remove added event on disablePlugin", (done: Mocha.Done) => {
            const test = {};
            const plugin = new Plugin();

            (plugin as any).once.test = (t) => {
                if (test !== t) {
                    return done(new Error("Wrong parameter send on call"));
                }
                return done();
            };

            webcheck.addPlugin(plugin);
            plugin.enable();
            plugin.disable();
            webcheck.emit("test", test);
            return done();
        });
    });
});
