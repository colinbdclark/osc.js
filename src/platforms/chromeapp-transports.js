/*
 * osc.js: An Open Sound Control library for JavaScript that works in both the browser and Node.js
 *
 * Copyright 2014, Colin Clark
 * Licensed under the MIT and GPL 3 licenses.
 */

/*global chrome*/

var osc = osc || {};

(function () {

    "use strict";

    osc.chrome = {};

    osc.chrome.SerialPort = function (options) {
        var o = this.options = options || {};
        o.useSLIP = o.useSLIP === undefined ? true : o.useSLIP;

        this.on("open", this.listen.bind(this));

        if (this.options.openImmediately) {
            this.open();
        }
    };

    var p = osc.chrome.SerialPort.prototype = new osc.Port();

    p.open = function () {
        var that = this;
        chrome.serial.connect(options.devicePath, function () {
            this.emit("open");
        });
    };

    p.listen = function () {
        chrome.serial.onReceive.addListener(function (e) {
            this.emit("data", e.data);
        });

        chrome.serial.onRecieveError.addListener(function (err) {
            this.emit("error", err);
        });

        this.emit("ready");
    };

}());
