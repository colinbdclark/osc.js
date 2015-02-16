/*
 * osc.js: An Open Sound Control library for JavaScript that works in both the browser and Node.js
 *
 * Copyright 2014, Colin Clark
 * Licensed under the MIT and GPL 3 licenses.
 */

/*global require, module, Buffer*/
/*jshint node:true*/

(function () {
    "use strict";

    var requireModules = function (paths) {
        if (paths.forEach === undefined) {
            paths = [paths];
        }

        var modules = [];
        paths.forEach(function (path) {
            var module = require(path);
            modules.push(module);
        });

        return modules;
    };

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
        serialport = require("serialport"),
        net = require("net"),
        WebSocket = require("ws"),
        modules = requireModules(["../osc.js", "../osc-transports.js"]),
        osc = shallowMerge({}, modules);


    /**********
     * Serial *
     **********/

    osc.SerialPort = function (options) {
        this.on("open", this.listen.bind(this));
        osc.SLIPPort.call(this, options);
        this.options.bitrate = this.options.bitrate || 9600;
    };

    var p = osc.SerialPort.prototype = Object.create(osc.SLIPPort.prototype);
    p.constructor = osc.SerialPort;

    p.open = function () {
        if (this.serialPort) {
            // If we already have a serial port, close it and open a new one.
            this.once("close", this.open.bind(this));
            this.close();
            return;
        }

        var that = this;

        this.serialPort = new serialport.SerialPort(this.options.devicePath, {
            baudrate: this.options.bitrate
        }, false);

        this.serialPort.open(function() {
            that.emit("open", that.serialPort);
        });
    };

    p.listen = function () {
        var that = this;

        this.serialPort.on("data", function (data) {
            that.emit("data", data);
        });

        this.serialPort.on("error", function (err) {
            that.emit("error", err);
        });

        this.serialPort.on("close", function (err) {
            if (err) {
                that.emit("error", err);
            } else {
                that.emit("close");
            }
        });

        that.emit("ready");
    };

    p.sendRaw = function (encoded) {
        if (!this.serialPort) {
            return;
        }

        var that = this;
        this.serialPort.write(encoded, function (err) {
            if (err) {
                that.emit("error", err);
            }
        });
    };

    p.close = function () {
        if (this.serialPort) {
            this.serialPort.close();
        }
    };


    /*******
     * UDP *
     *******/

    osc.UDPPort = function (options) {
        osc.Port.call(this, options);

        this.options.localAddress = this.options.localAddress || "127.0.0.1";
        this.options.localPort = this.options.localPort !== undefined ?
            this.options.localPort : 57121;

        this.on("open", this.listen.bind(this));
    };

    p = osc.UDPPort.prototype = Object.create(osc.Port.prototype);
    p.constructor = osc.UDPPort;

    p.open = function () {
        var that = this;
        this.socket = dgram.createSocket("udp4");

        function onBound() {
            that.emit("open", that.socket);
        }

        if (this.options.multicast) {
            this.socket.setBroadcast(this.options.multicast);
            this.socket.setMulticastTTL(this.options.multicastTTL);
            this.socket.bind(this.options.localPort, onBound);
        } else {
            this.socket.bind(this.options.localPort, this.options.localAddress, onBound);
        }
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

        that.emit("ready");
    };

    p.sendRaw = function (encoded, address, port) {
        if (!this.socket) {
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


    /**************
     * Web Sockets *
     **************/

    osc.WebSocketPort = function (options) {
        osc.Port.call(this, options);
        this.socket = options.socket;
        this.on("open", this.listen.bind(this));

        if (this.socket) {
            if (this.socket.readyState === 1) {
                this.emit("open", this.socket);
            } else {
                this.open();
            }
        }
    };

    p = osc.WebSocketPort.prototype = Object.create(osc.Port.prototype);
    p.constructor = osc.WebSocketPort;

    p.open = function () {
        if (!this.socket) {
            this.socket = new WebSocket(this.options.url);
        }

        var that = this;
        this.socket.on("open", function () {
            that.emit("open", that.socket);
        });
    };

    p.listen = function () {
        var that = this;
        this.socket.on("message", function (data) {
            that.emit("data", data);
        });

        this.socket.on("error", function (err) {
            that.emit("error", err);
        });

        this.socket.on("close", function (e) {
            that.emit("close", e);
        });

        that.emit("ready");
    };

    p.sendRaw = function (encoded) {
        if (!this.socket) {
            return;
        }

        var that = this;

        this.socket.send(encoded, {
            binary: true
        }, function (err) {
            if (err) {
                that.emit("error", err);
            }
        });
    };

    p.close = function (code, reason) {
        this.socket.close(code, reason);
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
            that.emit("data", msg);
        });

        this.socket.on("error", function (err) {
            that.emit("error", err);
        });

        this.socket.on("close", function (err) {
            if (err) {
                that.emit("error", err);
            } else {
                that.emit("close");
            }
        });

        this.socket.on("connect", function () {
            that.emit("ready");
        });
    };

    p.sendRaw = function (encoded) {
        if (!this.socket) {
            return;
        }

        encoded = new Buffer(encoded);

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
