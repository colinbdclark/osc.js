/*
 * osc.js: An Open Sound Control library for JavaScript that works in both the browser and Node.js
 *
 * Node.js Buffer Tests
 *
 * Copyright 2014-2016, Colin Clark
 * Licensed under the MIT and GPL 3 licenses.
 */

/*global Buffer, require*/
/*jshint node:true*/

"use strict";

var fluid = fluid || require("infusion"),
    jqUnit = jqUnit || fluid.require("node-jqunit"),
    osc = osc || require("../src/platforms/osc-node.js");

var QUnit = fluid.registerNamespace("QUnit");

jqUnit.module("Node.js buffer tests");

// "/oscillator/4/frequency" | ",f" | 440
var oscMessageBuffer = Buffer.from([
    0x2f, 0x6f, 0x73, 0x63,
    0x69, 0x6c, 0x6c, 0x61,
    0x74, 0x6f, 0x72, 0x2f,
    0x34, 0x2f, 0x66, 0x72,
    0x65, 0x71, 0x75, 0x65,
    0x6e, 0x63, 0x79, 0,
    0x2c, 0x66, 0, 0,
    0x43, 0xdc, 0, 0
]);

var decodedMessage = {
    address: "/oscillator/4/frequency",
    args: 440
};

jqUnit.asyncTest("Read from a Node.js buffer", function () {
    var port = new osc.Port({
        metadata: false,
        unpackSingleArgs: true
    });

    port.on("osc", function (packet) {
        jqUnit.assertDeepEq("A message specified as a Node.js buffer should be read correctly.",
            decodedMessage, packet);
        jqUnit.start();
    });
    port.decodeOSC(oscMessageBuffer);
});


var testOSCBlobMessage = {
    address: "/test/blobby",
    args: [
        {
            type: "b",
            value: Buffer.from([
                0, 0, 0, 3,            // Length 3
                0x63, 0x61, 0x74, 0   // raw bytes
            ])
        }
    ]
};

var decodedOSCBlobMessage = {
    address: testOSCBlobMessage.address,
    args: [
        {
            type: testOSCBlobMessage.args[0].type,
            value: new Uint8Array([
                0, 0, 0, 3,            // Length 3
                0x63, 0x61, 0x74, 0   // raw bytes
            ])
        }
    ]
};

function messageCanonicalizer(msg) {
    var togo = fluid.copy(msg);

    fluid.each(togo.args, function (arg, idx) {
        if (osc.isTypedArrayView(arg.value) || osc.isBuffer(arg.value)) {
            togo.args[idx] = osc.copyByteArray(arg.value, new Uint8Array(arg.value.length));
        }
    });

    return togo;
}

jqUnit.asyncTest("gh-29: Receiving Buffer-based Blob messages", function () {
    var port = new osc.Port({
        metadata: true
    });

    port.on("message", function (message) {
        jqUnit.assertCanoniseEqual("The decoded message should contain a valid Blob.",
            decodedOSCBlobMessage, message, messageCanonicalizer);
        jqUnit.start();
    });

    port.on("error", function (err) {
        QUnit.ok(false, "An error was thrown while trying to decode a valid message with a Blob in it. " + err.message);
        jqUnit.start();
    });

    var rawMessage = osc.writeMessage(testOSCBlobMessage);
    port.decodeOSC(rawMessage);
});
