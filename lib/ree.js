"use strict";
var events = require("events");
module.exports= function registerEventEmitter(obj) {
  var ev = new events.EventEmitter();
  obj.once = ev.once;
  obj.emit = ev.emit;
  obj.on = ev.on;
}