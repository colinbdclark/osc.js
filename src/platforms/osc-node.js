/*
 * osc.js: An Open Sound Control library for JavaScript that works in both the browser and Node.js
 *
 * Copyright 2014, Colin Clark
 * Licensed under the MIT and GPL 3 licenses.
 */

/*global require, module*/

(function () {
    "use strict";

    var shallowMerge = function (target, toMerge) {
        target = target || {};
        if (toMerge.forEach === undefined) {
            toMerge = [toMerge];
        }

        toMerge.forEach(function (obj) {
            for (var prop in obj) {
                target[prop] = obj[prop];
            }
        });

        return target;
    };

    var dgram = require("dgram"),
        osc = shallowMerge(require("../osc.js"), require("../osc-transports.js"));

    osc.UDPPort = function (options) {
        osc.Port.call(this, options);

        this.options.localAddress = this.options.localAddress || "127.0.0.1";
        this.options.localPort = this.options.localPort !== undefined ?
            this.options.localPort : 57121;

        this.on("open", this.listen.bind(this));
    };

    var p = osc.UDPPort.prototype = new osc.Port();

    p.open = function () {
        var that = this;
        this.socket = dgram.createSocket("udp4");
        this.socket.bind(this.options.localPort, this.options.localAddress, function () {
            that.emit("open", this.socket);
        });
    };

    p.listen = function () {
        if (!this.socket) {
            return;
        }

        var that = this;
        this.socket.on("message", function (msg, rinfo) {
            that.emit("data", msg, rinfo);
        });

        this.socket.on("error", function (error) {
            that.emit("error", error);
        });
    };

    p.send = function (oscPacket, address, port) {
        if (!this.socket) {
            return;
        }

        var encoded = this.encodeOSC(oscPacket),
            length = encoded.byteLength !== undefined ? encoded.byteLength : encoded.length,
            that = this;

        address = address || this.options.remoteAddress;
        port = port !== undefined ? port : this.options.remotePort;

        this.socket.send(encoded, 0, length, port, address, function (err, bytes) {
            if (err) {
                that.emit("error", err);
            }
        });
    };

    p.close = function () {
        if (this.socket) {
            this.socket.close();
        }
    };

    module.exports = osc;
}());
