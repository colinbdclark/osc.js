/*
 * osc.js: An Open Sound Control library for JavaScript that works in both the browser and Node.js
 *
 * Node.js transports for osc.js
 *
 * Copyright 2014-2016, Colin Clark
 * Licensed under the MIT and GPL 3 licenses.
 */

/*global require, module, Buffer*/
/*jshint node:true*/

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
        net = require("net"),
        WebSocket = require("ws"),
        modules = [
            require("../osc.js"),
            require("../osc-transports.js"),
            require("./osc-websocket-client.js"),
            //require("./osc-node-serialport.js")
        ],
        osc = shallowMerge({}, modules);


    /*******
     * UDP *
     *******/

    osc.UDPPort = function (options) {
        osc.Port.call(this, options);

        this.options.localAddress = this.options.localAddress || "127.0.0.1";
        this.options.localPort = this.options.localPort !== undefined ?
            this.options.localPort : 57121;

        this.options.remoteAddress = this.options.remoteAddress || "127.0.0.1";
        this.options.remotePort = this.options.remotePort !== undefined ?
            this.options.remotePort : 57121;

        this.on("open", this.listen.bind(this));

        this.socket = options.socket;
        if (this.socket) {
            this.emit("open", this.socket);
        }
    };

    var p = osc.UDPPort.prototype = Object.create(osc.Port.prototype);
    p.constructor = osc.UDPPort;

    p.open = function () {
        var that = this;

        if (this.socket) {
            return;
        }

        this.socket = dgram.createSocket("udp4");

        this.socket.on("error", function (error) {
            that.emit("error", error);
        });

        function onBound() {
            osc.UDPPort.setupMulticast(that);

            if (that.options.broadcast) {
                that.socket.setBroadcast(that.options.broadcast);
            }

            that.emit("open", that.socket);
        }

        this.socket.bind(this.options.localPort, this.options.localAddress, onBound);
    };

    p.listen = function () {
        if (!this.socket) {
            return;
        }

        var that = this;
        this.socket.on("message", function (msg, rinfo) {
            that.emit("data", msg, rinfo);
        });

        this.socket.on("close", function () {
            that.emit("close");
        });

        that.emit("ready");
    };

    p.sendRaw = function (encoded, address, port) {
        if (!this.socket) {
            osc.fireClosedPortSendError(this);
            return;
        }

        var length = encoded.byteLength !== undefined ? encoded.byteLength : encoded.length,
            that = this;

        address = address || this.options.remoteAddress;
        port = port !== undefined ? port : this.options.remotePort;

        this.socket.send(encoded, 0, length, port, address, function (err) {
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

    osc.UDPPort.setupMulticast = function (that) {
        if (that.options.multicastTTL !== undefined) {
            that.socket.setMulticastTTL(that.options.multicastTTL);
        }

        if (that.options.multicastMembership) {
            if (typeof that.options.multicastMembership === "string") {
                that.options.multicastMembership = [that.options.multicastMembership];
            }

            that.options.multicastMembership.forEach(function (addr) {
                if (typeof addr === "string") {
                  that.socket.addMembership(addr);
                } else {
                  that.socket.addMembership(addr.address, addr.interface);
                }
            });
        }
    };


    /*******
     * TCP *
     *******/

    osc.TCPSocketPort = function (options) {
        osc.SLIPPort.call(this, options);

        var o = this.options;
        o.localAddress = o.localAddress || "127.0.0.1";
        o.localPort = o.localPort !== undefined ? o.localPort : 57121;

        this.on("open", this.listen.bind(this));
        this.socket = options.socket;

        if (this.socket) {
            this.emit("open", this.socket);
        }
    };

    p = osc.TCPSocketPort.prototype = Object.create(osc.SLIPPort.prototype);
    p.constructor = osc.TCPSocketPort;

    p.open = function (address, port) {
        var o = this.options;
        address = address || o.address;
        port = port !== undefined ? port : o.port;

        if (!this.socket) {
            this.socket = net.connect({
                port: port,
                host: address
            });
        } else {
            this.socket.connect(port, address);
        }

        this.emit("open", this.socket);
    };

    p.listen = function () {
        var that = this;
        this.socket.on("data", function (msg) {
            that.emit("data", msg, undefined);
        });

        this.socket.on("error", function (err) {
            that.emit("error", err);
        });

        this.socket.on("close", function (hadError) {
            that.emit("close", hadError);
        });

        this.socket.on("connect", function () {
            that.emit("ready");
        });
    };

    p.sendRaw = function (encoded) {
        if (!this.socket) {
            return;
        }

        encoded = Buffer.from(encoded);

        try {
            this.socket.write(encoded);
        } catch (err) {
            this.emit("error", err);
        }
    };

    p.close = function () {
        this.socket.end();
    };


    module.exports = osc;
}());
