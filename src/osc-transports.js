/*
 * osc.js: An Open Sound Control library for JavaScript that works in both the browser and Node.js
 *
 * Copyright 2014, Colin Clark
 * Licensed under the MIT and GPL 3 licenses.
 */

/* global EventEmitter */

var osc = osc || {};

(function () {

    "use strict";

    osc.Port = function (options) {
        this.options = options || {};

        if (this.options.useSLIP) {
            this.bindSLIP(options.withMetadata);
        } else {
            this.on("data", this.decodeOSC.bind(this));
        }
    };

    var p = osc.Port.prototype = new EventEmitter();

    p.bindSLIP = function (withMetadata) {
        this.decoder = new slip.Decoder({
            onMessage: this.decodeOSC.bind(this),
            onError: function (err) {
                this.emit("error", err);
            }
        });

        this.on("data", this.decodeSLIPData.bind(this));
    };

    p.send = function (packet) {
        var encoded = osc.writePacket(packet, this.options.withMetadata);
        if (this.useSLIP) {
            encoded = slip.encode(encoded);
        }

        return encoded;
    };

    p.decodeOSC = function (data) {
        var packet = osc.readPacket(data, this.options.withMetadata);
        this.emit("osc", packet);

        if (packet.address) {
            this.emit("message");
        } else {
            this.emit("bundle");
        }
    };

    p.decodeSLIPData = function (data) {
        this.decoder.decode(data);
    };

}());
