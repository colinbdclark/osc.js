/*
 * osc.js: An Open Sound Control library for JavaScript that works in both the browser and Node.js
 *
 * Copyright 2014, Colin Clark
 * Licensed under the MIT and GPL 3 licenses.
 */

/* global require, slip */

var osc = osc || typeof require !== "undefined" ? require("./osc.js") : {};
var EventEmitter = EventEmitter ||
    typeof require !== "undefined" ? require("events").EventEmitter : undefined;

(function () {

    "use strict";

    osc.Port = function (options) {
        this.options = options || {};
        this.on("data", this.decodeOSC.bind(this));
    };

    var p = osc.Port.prototype = new EventEmitter();

    p.encodeOSC = function (packet) {
        packet = packet.buffer ? packet.buffer : packet;
        var encoded = osc.writePacket(packet, this.options.withMetadata);
        return encoded;
    };

    p.decodeOSC = function (data) {
        var packet = osc.readPacket(data, this.options.withMetadata);
        this.emit("osc", packet);

        if (packet.address) {
            this.emit("message", packet);
        } else {
            this.emit("bundle", packet);
        }
    };


    osc.SLIPPort = function (options) {
        var o = this.options = options || {};
        o.useSLIP = o.useSLIP === undefined ? true : o.useSLIP;

        this.decoder = new slip.Decoder({
            onMessage: this.decodeOSC.bind(this),
            onError: function (err) {
                this.emit("error", err);
            }
        });

        this.on("data", this.decodeSLIPData.bind(this));
    };

    p = osc.SLIPPort.prototype = new osc.Port();

    p.encodeOSC = function (packet) {
        packet = packet.buffer ? packet.buffer : packet;
        var encoded = osc.writePacket(packet, this.options.withMetadata);
        return slip.encode(encoded);
    };

    p.decodeSLIPData = function (data) {
        this.decoder.decode(data);
    };

    // If we're in a require-compatible environment, export ourselves.
    if (typeof module !== "undefined" && module.exports) {
        module.exports = osc;
    }
}());
