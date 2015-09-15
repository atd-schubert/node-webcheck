/*jslint node:true*/

'use strict';

/**
 * Plugin interface
 * @author Arne Schubert <atd.schubert@gmail.com>
 * @alias webcheck.Plugin
 * @constructor
 */
var Plugin = function () {
    this.on = {};
    this.once = {};
};
Plugin.prototype = {
    /**
     * Enable the plugin in webcheck
     * @returns {Plugin}
     */
    enable: function enablePlugin() {
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
    },
    /**
     * Disable the plugin in webcheck
     * @returns {Plugin}
     */
    disable: function disablePlugin() {
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
            this.handle.middleware.splice(this.handle.middleware.indexOf(this.middleware), 1);
        }

        return this;
    },
    /**
     * Register the Plugin
     * @param {webcheck} handle - Register Plugin on webcheck given by handle
     * @returns {Plugin}
     */
    register: function registerPlugin(handle) {
        this.handle = handle;
        this.handle.emit('registerPlugin', this);
        return this;
    },
    /**
     * @type {{}|null}
     */
    package: null,
    /**
     * @type {Webcheck|null}
     */
    handle: null,
    /**
     * @type {function|null}
     */
    middleware: null,
    /**
     * @type {{}|null}
     */
    on: null,
    /**
     * @type {{}|null}
     */
    once: null
};

module.exports = Plugin;