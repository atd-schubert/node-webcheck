"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Plugin = /** @class */ (function () {
    function Plugin() {
        this.on = {};
        this.once = {};
    }
    Plugin.prototype.enable = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (!this.handle) {
            throw new Error("You have to register the plugin in Webcheck first");
        }
        this.handle.emit("enablePlugin", this);
        for (var hash in this.on) {
            if (this.on.hasOwnProperty(hash)) {
                this.handle.on(hash, this.on[hash]);
            }
        }
        for (var hash in this.once) {
            if (this.once.hasOwnProperty(hash)) {
                this.handle.once(hash, this.once[hash]);
            }
        }
        if (this.middleware) {
            this.handle.middlewares.push(this.middleware);
        }
        if (typeof this.init === "function") {
            this.init.apply(this, args);
        }
        return this;
    };
    Plugin.prototype.disable = function () {
        if (!this.handle) {
            throw new Error("You have to register the plugin in Webcheck first");
        }
        this.handle.emit("disablePlugin", this);
        for (var hash in this.on) {
            if (this.on.hasOwnProperty(hash)) {
                this.handle.removeListener(hash, this.on[hash]);
            }
        }
        for (var hash in this.once) {
            if (this.once.hasOwnProperty(hash)) {
                this.handle.removeListener(hash, this.once[hash]);
            }
        }
        if (this.middleware) {
            this.handle.middlewares.splice(this.handle.middlewares.indexOf(this.middleware), 1);
        }
        return this;
    };
    Plugin.prototype.register = function (handle) {
        this.handle = handle;
        this.handle.emit("registerPlugin", this);
        return this;
    };
    return Plugin;
}());
exports.Plugin = Plugin;
//# sourceMappingURL=plugin.js.map