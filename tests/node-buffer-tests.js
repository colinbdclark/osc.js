/*global QUnit, osc, Buffer, test, deepEqual, ok*/
/*jshint node:true*/

(function () {
    "use strict";

    QUnit.module("Node.js buffer tests");

    // "/oscillator/4/frequency" | ",f" | 440
    var oscMessageBuffer = new Buffer([
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

    test("Read from a Node.js buffer", function () {
        var actual = osc.readMessage(oscMessageBuffer);
        deepEqual(actual, decodedMessage, "A message specified as a Node.js buffer should be read correctly.");
    });

    test("Write to a Node.js buffer", function () {
        var actual = osc.writePacket({
            timeTag: osc.timeTag(0),
            packets: [
                {
                    address: "/oscillator/4/frequency",
                    args: 440
                }
            ]
        });

        ok(actual instanceof Buffer, "Writing a packet should produce a Node.js Buffer object.");
    });
}());
