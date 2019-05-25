/*
 * osc.js: An Open Sound Control library for JavaScript that works in both the browser and Node.js
 *
 * Node.js serial transport for osc.js
 *
 * Copyright 2014-2019, Colin Clark
 * Licensed under the MIT and GPL 3 licenses.
 */

/*jshint node:true*/

var osc = osc || require("../osc.js"),
    SerialPort = require("serialport");

osc.supportsSerial = true;

osc.SerialPort = function (options) {
    this.on("open", this.listen.bind(this));
    osc.SLIPPort.call(this, options);
    this.options.bitrate = this.options.bitrate || 9600;

    this.serialPort = options.serialPort;
    if (this.serialPort) {
        this.emit("open", this.serialPort);
    }
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

    this.serialPort = new SerialPort(this.options.devicePath, {
        baudRate: this.options.bitrate,
        autoOpen: false
    });

    this.serialPort.on("error", function (err) {
        that.emit("error", err);
    });

    this.serialPort.on("open", function () {
        that.emit("open", that.serialPort);
    });

    this.serialPort.open();
};

p.listen = function () {
    var that = this;

    this.serialPort.on("data", function (data) {
        that.emit("data", data, undefined);
    });

    this.serialPort.on("close", function () {
        that.emit("close");
    });

    that.emit("ready");
};

p.sendRaw = function (encoded) {
    if (!this.serialPort || !this.serialPort.isOpen) {
        osc.fireClosedPortSendError(this);
        return;
    }

    var that = this;
    this.serialPort.write(encoded);
};

p.close = function () {
    if (this.serialPort) {
        this.serialPort.close();
    }
};
