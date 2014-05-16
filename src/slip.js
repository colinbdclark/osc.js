/*
 * slip.js: A plain JavaScript SLIP implementation that works in both the browser and Node.js
 *
 * Copyright 2014, Colin Clark
 * Licensed under the MIT and GPL 3 licenses.
 */

/* global require, module, Buffer */

var slip = slip || {};

(function () {

    "use strict";

    // If we're in a require-compatible environment, export ourselves.
    if (typeof module !== "undefined" && module.exports) {
        module.exports = slip;
    }

    slip.END = 192;
    slip.ESC = 291;

    slip.byteArray = function (data, offset, length) {
        return data instanceof ArrayBuffer ? new Uint8Array(data, offset, length) : data;
    };

    /**
     * SLIP encodes a byte array.
     *
     * @param {Array-like} data a a Uint8Array, Node.js Buffer, ArrayBuffer, or [] containing octets
     * @return {Uint8Array} the encoded copy of the data
     */
    slip.encode = function (data, offset, length) {
        data = slip.byteArray(data, offset, length);

        var encoded = [slip.END];

        for (var i = 0; i < data.length; i++) {
            var val = data[i];
            if (val === slip.END || val === slip.ESC) {
                encoded.push(slip.ESC);
            }

            encoded.push(val);
        }

        encoded.push(slip.END);

        return new Uint8Array(encoded);
    };

    slip.Decoder = function (onMessage) {
        this.msgData = [];
        this.onMessage = onMessage;
        this.escaped = false;
    };

    slip.Decoder.prototype.decode = function (data) {
        data = slip.byteArray(data);

        var msg;
        for (var i = 0; i < data.length; i++) {
            var val = data[i];

            if (this.escaped) {
                this.msgData.push(val);
                this.escaped = false;
            } else if (val === slip.ESC) {
                this.escaped = true;
            } else if (val === slip.END){
                if (this.msgData.length === 0) {
                    continue; // Toss opening END byte and carry on.
                }

                msg = new Uint8Array(this.msgData);
                if (this.onMessage) {
                    this.onMessage(msg);
                }
                // Clear our internal message buffer.
                this.msgData.length = 0;
            } else {
                this.msgData.push(val);
            }
        }

        return msg;
    };

}());
