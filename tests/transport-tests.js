/*
 * osc.js: An Open Sound Control library for JavaScript that works in both the browser and Node.js
 *
 * Cross-Platform osc.js Transport Tests
 *
 * Copyright 2015-2016, Colin Clark
 * Licensed under the MIT and GPL 3 licenses.
 */

/*global require*/

var fluid = fluid || require("infusion"),
    jqUnit = jqUnit || require("node-jqunit"),
    osc = osc || require("../src/platforms/osc-node.js");

(function () {
    "use strict";

    var QUnit = fluid.registerNamespace("QUnit");

    QUnit.module("Error handling");

    var portErrorTester = function (expectedErrorMsg) {
        var port = new osc.Port();
        port.on("message", function () {
            QUnit.ok(false, "A message event should not have been emitted for an invalid message.");
            QUnit.start();
        });

        port.on("error", function (err) {
            QUnit.ok(err.message.indexOf(expectedErrorMsg) > -1,
                "An error event should be emitted for an invalid message.");
            QUnit.start();
        });

        return port;
    };

    QUnit.asyncTest("Decoding malformed messages", function () {
        var port = portErrorTester("packet didn't contain an OSC address or a #bundle string");

        port.decodeOSC(
            // "0oscillator/4/frequency" | ",f" | 440
            new Uint8Array([
                0, 0x6f, 0x73, 0x63,
                0x69, 0x6c, 0x6c, 0x61,
                0x74, 0x6f, 0x72, 0x2f,
                0x34, 0x2f, 0x66, 0x72,
                0x65, 0x71, 0x75, 0x65,
                0x6e, 0x63, 0x79, 0,
                0x2c, 0x66, 0, 0,
                0x43, 0xdc, 0, 0
            ])
        );
    });

    QUnit.asyncTest("Encoding a malformed message", function () {
        var expectedErrorMsg = "packet was not recognized as a valid OSC";
        var port = portErrorTester(expectedErrorMsg);

        port.encodeOSC({
            address: "0oscillator/4/frequency",
            args: 440
        });
    });

}());
