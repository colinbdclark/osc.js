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

    // Unsupported, non-API function.
    osc.firePacketEvents = function (port, packet, timeTag) {
        if (packet.address) {
            port.emit("message", packet, timeTag);
        } else {
            osc.fireBundleEvents(port, packet, timeTag);
        }
    };

    // Unsupported, non-API function.
    osc.fireBundleEvents = function (port, bundle, timeTag) {
        port.emit("bundle", bundle, timeTag);
        for (var i = 0; i < bundle.packets.length; i++) {
            var packet = bundle.packets[i];
            osc.firePacketEvents(port, packet, bundle.timeTag);
        }
    };

    osc.Port = function (options) {
        this.options = options || {};
        this.on("data", this.decodeOSC.bind(this));
    };

    var p = osc.Port.prototype = Object.create(EventEmitter.prototype);
    p.constructor = osc.Port;

    p.send = function (oscPacket) {
        var encoded = this.encodeOSC(oscPacket);
        this.sendRaw(encoded);
    };

    p.encodeOSC = function (packet) {
        packet = packet.buffer ? packet.buffer : packet;
        var encoded = osc.writePacket(packet, this.options.withMetadata);
        return encoded;
    };

    p.decodeOSC = function (data) {
        this.emit("raw", data);

        var packet = osc.readPacket(data, this.options.withMetadata);
        this.emit("osc", packet);

        osc.firePacketEvents(this, packet);
    };


    osc.SLIPPort = function (options) {
        var that = this;
        var o = this.options = options || {};
        o.useSLIP = o.useSLIP === undefined ? true : o.useSLIP;

        this.decoder = new slip.Decoder({
            onMessage: this.decodeOSC.bind(this),
            onError: function (err) {
                that.emit("error", err);
            }
        });

        var decodeHandler = o.useSLIP ? this.decodeSLIPData : this.decodeOSC;
        this.on("data", decodeHandler.bind(this));
    };

    p = osc.SLIPPort.prototype = Object.create(osc.Port.prototype);
    p.constructor = osc.SLIPPort;

    p.encodeOSC = function (packet) {
        packet = packet.buffer ? packet.buffer : packet;
        var encoded = osc.writePacket(packet, this.options.withMetadata);
        return slip.encode(encoded);
    };

    p.decodeSLIPData = function (data) {
        this.decoder.decode(data);
    };


    // Unsupported, non-API function.
    osc.relay = function (from, to, relayRaw) {
        relayRaw = relayRaw === undefined ? true : relayRaw;

        var eventName = relayRaw ? "raw" : "osc",
            sendFnName = relayRaw ? "sendRaw" : "send",
            listener = to[sendFnName].bind(to);

        from.on(eventName, listener);

        return {
            eventName: eventName,
            listener: listener
        };
    };

    // Unsupported, non-API function.
    osc.stopRelaying = function (from, relaySpec) {
        from.removeListener(relaySpec.eventName, relaySpec.listener);
    };

    /**
     * A PortRelay connects two osc.Ports together,
     * relaying all OSC messages received by each port to the other.
     */
    osc.PortRelay = function (port1, port2, options) {
        this.options = options || {};
        this.port1 = port1;
        this.port2 = port2;

        this.listen();
    };

    p = osc.PortRelay.prototype;

    p.listen = function () {
        if (this.port1Spec && this.port2Spec) {
            this.close();
        }

        this.port1Spec = osc.relay(this.port1, this.port2, this.options.relayRaw);
        this.port2Spec = osc.relay(this.port2, this.port1, this.options.relayRaw);
    };

    p.close = function () {
        osc.stopRelaying(this.port1, this.port1Spec);
        osc.stopRelaying(this.port2, this.port2Spec);
    };


    // If we're in a require-compatible environment, export ourselves.
    if (typeof module !== "undefined" && module.exports) {
        module.exports = osc;
    }
}());
