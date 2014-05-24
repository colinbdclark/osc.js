/*
 * osc.js: An Open Sound Control library for JavaScript that works in both the browser and Node.js
 *
 * Copyright 2014, Colin Clark
 * Licensed under the MIT and GPL 3 licenses.
 */

/* global require, module */

var osc = osc || require("./osc.js"),
    slip = slip || require("slip"),
    EventEmitter = EventEmitter || require("events").EventEmitter;

(function () {

    "use strict";

    osc.Port = function (options) {
        this.options = options || {};
        this.on("data", this.decodeOSC.bind(this));
    };

    osc.Port.prototype = Object.create(EventEmitter.prototype);
    osc.Port.prototype.constructor = osc.Port;

    osc.Port.prototype.encodeOSC = function (packet) {
        packet = packet.buffer ? packet.buffer : packet;
        var encoded = osc.writePacket(packet, this.options.withMetadata);
        return encoded;
    };

    osc.Port.prototype.decodeOSC = function (data) {
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

    osc.SLIPPort.prototype = Object.create(osc.Port.prototype);
    osc.SLIPPort.prototype.constructor = osc.SLIPPort;

    osc.SLIPPort.prototype.encodeOSC = function (packet) {
        packet = packet.buffer ? packet.buffer : packet;
        var encoded = osc.writePacket(packet, this.options.withMetadata);
        return slip.encode(encoded);
    };

    osc.SLIPPort.prototype.decodeSLIPData = function (data) {
        this.decoder.decode(data);
    };

    // If we're in a require-compatible environment, export ourselves.
    if (typeof module !== "undefined" && module.exports) {
        module.exports = osc;
    }
}());
