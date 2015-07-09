/*jslint node:true*/

'use strict';

var Webcheck = require("../");
var webcheck = Webcheck();

describe('Webcheck', function () {

    describe('Middleware', function () {
        it('should run a init function on use', function (done) {
            var fn = function(){};
            fn.init = function (wc) {
                if (wc === webcheck) {
                    return done();
                }
                return done(new Error('Wrong webcheck'));
            };
            webcheck.use(fn);
        });
        it('should call an event on use', function (done) {
            var fn = function(){};
            webcheck.once('use', function (mw) {
                if(mw === fn) {
                    return done();
                }
                return done(new Error('Not the right middleware in event!'));
            });
            webcheck.use(fn);
        });
    });
});