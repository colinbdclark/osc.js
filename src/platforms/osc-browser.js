/*
 * osc.js: An Open Sound Control library for JavaScript that works in both the browser and Node.js
 *
 * Copyright 2014, Colin Clark
 * Licensed under the MIT and GPL 3 licenses.
 */

/*global WebSocket*/

var osc = osc;

(function () {

    "use strict";

    osc.WebSocketPort = function (options) {
        osc.Port.call(this, options);
        this.on("open", this.listen.bind(this));
    };

    var p = osc.WebSocketPort.prototype = Object.create(osc.Port.prototype);
    p.constructor = osc.WebSocketPort;

    p.open = function () {
        this.socket = new WebSocket(this.options.url);
        this.socket.binaryType = "arraybuffer";

        var that = this;
        this.socket.onopen = function () {
            that.emit("open", that.socket);
        };
    };

    p.listen = function () {
        var that = this;
        this.socket.onmessage = function (e) {
            that.emit("data", e.data);
        };

        this.socket.onerror = function (err) {
            that.emit("error", err);
        };

        this.socket.onclose = function (e) {
            that.emit("close", e);
        };

        that.emit("ready");
    };

    p.sendRaw = function (encoded) {
        if (!this.socket) {
            return;
        }
        this.socket.send(encoded.buffer);
    };

    p.close = function (code, reason) {
        this.socket.close(code, reason);
    };

}());
