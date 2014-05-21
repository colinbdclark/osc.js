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

    osc.chrome.listenToTransport = function (that, transport, idName) {
        transport.onReceive.addListener(function (e) {
            if (e[idName] === that[idName]) {
                that.emit("data", e.data);
            }
        });

        transport.onRecieveError.addListener(function (err) {
            if (e[idName] === that[idName]) {
                that.emit("error", err);
            }
        });

        that.emit("ready");
    };

    osc.chrome.emitNetworkError = function (that, resultCode) {
        that.emit("error",
            "There was an error while opening the UDP socket connection. Result code: " +
            resultCode);
    };

    osc.chrome.SerialPort = function (options) {
        this.on("open", this.listen.bind(this));
        osc.SLIPPort.call(this, options);
    };

    var p = osc.chrome.SerialPort.prototype = new osc.SLIPPort();

    p.open = function () {
        var that = this;

        chrome.serial.connect(this.options.devicePath, function (info) {
            that.connectionId = info.connectionId;
            that.emit("open", info);
        });
    };

    p.listen = function () {
        osc.chrome.listenToTransport(this, chrome.serial, "connectionId");
    };

    p.send = function (oscPacket) {
        var encoded = this.encodeOSC(oscPacket),
            that = this;

        chrome.serial.send(this.connectionId, encoded.buffer, function (bytesSent, err) {
            if (err) {
                that.emit("error", err + ". Total bytes sent: " + bytesSent);
            }
        });
    };

    p.close = function () {
        if (this.connectionId) {
            var that = this;
            chrome.serial.disconnect(this.connectionId, function (result) {
                if (result) {
                    that.emit("close");
                }
            });
        }
    };


    osc.chrome.UDPPort = function (options) {
        var o = this.options;
        o.localAddress = o.localAddress || "127.0.0.1";
        o.localPort = o.localPort !== undefined ? o.localPort : 0;

        this.on("open", this.bindSocket.bind(this));
        osc.Port.call(this, o);
    };

    p = osc.chrome.UDPPort.prototype = new osc.Port();

    p.open = function () {
        var o = this.options,
            props = {
                persistent: o.persistent,
                name: o.name,
                bufferSize: o.bufferSize
            },
            that = this;

        chrome.sockets.udp.create(props, function (info) {
            that.socketId = info.socketId;
            that.bindSocket();
        });
    };

    p.bindSocket = function () {
        var that = this,
            o = this.options;

        chrome.sockets.udp.bind(this.socketId, o.localAddress, o.localPport, function (resultCode) {
            if (resultCode > 0) {
                osc.chrome.emitNetworkError(that, resultCode);
                return;
            }

            that.emit("open", info);
            that.listen();
        });
    };

    p.listen = function () {
        osc.chrome.listenToTransport(that, chrome.sockets.udp, "socketId");
    };

    p.send = function (port, address) {
        var o = this.options,
            encoded = this.encodeOSC(oscPacket),
            that = this;

        chrome.sockets.udp.send(this.socketId, encoded, function (info) {
            if (info.resultCode > 0) {
                osc.chrome.emitNetworkError(that, info.resultCode);
            }
        });
    };

    p.close = function () {
        if (this.socketId) {
            var that = this;
            chrome.sockets.udp.close(this.socketId, function () {
                that.emit("close");
            });
        }
    };
}());
