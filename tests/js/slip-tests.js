/*global QUnit, equal, deepEqual, osc, test, ok*/

(function () {

    "use strict";

    var slipTestSpecs = {
        encode: [
            {
                name: "plain message",
                message: [
                    105, 32, 114, 101,
                    109, 101, 109, 98,
                    101, 114, 32, 83,
                    76, 73, 80, 32,
                    102, 114, 111, 109,
                    32, 116, 104, 101,
                    32, 49, 57, 57,
                    48, 115, 0, 0
                ],
                encoded: [
                    slip.END, 105, 32, 114, 101,
                    109, 101, 109, 98,
                    101, 114, 32, 83,
                    76, 73, 80, 32,
                    102, 114, 111, 109,
                    32, 116, 104, 101,
                    32, 49, 57, 57,
                    48, 115, 0, 0, slip.END
                ]
            },
            {
                name: "message with inline escapes",
                message: [
                    slip.ESC, 105, 32, 114,
                    101, 109, 101, 109,
                    98, 101, 114, 32,
                    83, 76, 73, 80,
                    32, 102, 114, 111,
                    109, 32, 116, 104,
                    101, 32, slip.ESC, 49,
                    57, 57, 48, 115,
                    0, 0
                ],
                encoded: [
                    slip.END, slip.ESC, slip.ESC, 105, 32, 114,
                    101, 109, 101, 109,
                    98, 101, 114, 32,
                    83, 76, 73, 80,
                    32, 102, 114, 111,
                    109, 32, 116, 104,
                    101, 32, slip.ESC, slip.ESC, 49,
                    57, 57, 48, 115,
                    0, 0, slip.END
                ]
            },

            {
                name: "message with inline ends",
                message: [
                    105, 32, 114,
                    101, 109, 101, 109,
                    98, 101, 114, 32,
                    83, 76, 73, 80,
                    32, 102, 114, 111,
                    109, 32, 116, 104,
                    101, 32, slip.END, 49,
                    57, 57, 48, 115,
                    0, 0
                ],
                encoded: [
                    slip.END, 105, 32, 114,
                    101, 109, 101, 109,
                    98, 101, 114, 32,
                    83, 76, 73, 80,
                    32, 102, 114, 111,
                    109, 32, 116, 104,
                    101, 32, slip.ESC, slip.END, 49,
                    57, 57, 48, 115,
                    0, 0, slip.END
                ]
            },
            {
                name: "both escapes and ends",
                message: [
                    slip.ESC, 105, 32, 114,
                    101, 109, 101, 109,
                    98, 101, 114, 32,
                    83, 76, 73, 80,
                    32, 102, 114, 111,
                    109, 32, 116, 104,
                    101, 32, slip.END, 49,
                    57, 57, 48, 115,
                    0, 0
                ],
                encoded: [
                    slip.END, slip.ESC, slip.ESC, 105, 32, 114,
                    101, 109, 101, 109,
                    98, 101, 114, 32,
                    83, 76, 73, 80,
                    32, 102, 114, 111,
                    109, 32, 116, 104,
                    101, 32, slip.ESC, slip.END, 49,
                    57, 57, 48, 115,
                    0, 0, slip.END
                ]
            }
        ],

        decode: [
            {
                name: "single packet message",
                packets: [
                    [
                        slip.END, slip.ESC, slip.ESC, 105, 32, 114,
                        101, 109, 101, 109,
                        98, 101, 114, 32,
                        83, 76, 73, 80,
                        32, 102, 114, 111,
                        109, 32, 116, 104,
                        101, 32, slip.ESC, slip.END, 49,
                        57, 57, 48, 115,
                        0, 0, slip.END
                    ]
                ],
                messages: [
                    new Uint8Array([
                        slip.ESC, 105, 32, 114,
                        101, 109, 101, 109,
                        98, 101, 114, 32,
                        83, 76, 73, 80,
                        32, 102, 114, 111,
                        109, 32, 116, 104,
                        101, 32, slip.END, 49,
                        57, 57, 48, 115,
                        0, 0
                    ])
                ]
            },
            {
                name: "one message in multiple packets, no leading END byte",
                packets: [
                    [
                        slip.ESC, slip.ESC, 105, 32, 114,
                        101, 109, 101, 109,
                        98, 101, 114, 32,
                        83, 76, 73, 80,
                        32, 102, 114, 111,
                    ],
                    [
                        109, 32, 116, 104,
                        101, 32, slip.ESC, slip.END, 49,
                        57, 57, 48, 115,
                        0, 0, slip.END
                    ]
                ],
                messages: [
                    new Uint8Array([
                        slip.ESC, 105, 32, 114,
                        101, 109, 101, 109,
                        98, 101, 114, 32,
                        83, 76, 73, 80,
                        32, 102, 114, 111,
                        109, 32, 116, 104,
                        101, 32, slip.END, 49,
                        57, 57, 48, 115,
                        0, 0
                    ])
                ]
            },
            {
                name: "two messages: the first spans both packets",
                packets: [
                    [
                        slip.ESC, slip.ESC, 105, 32, 114,
                        101, 109, 101, 109,
                        98, 101, 114, 32,
                        83, 76, 73, 80,
                        32, 102, 114, 111,
                    ],
                    [
                        109, 32, 116, 104,
                        101, 32, slip.ESC, slip.END, 49,
                        57, 57, 48, 115,
                        0, 0, slip.END,
                        slip.END, 99, 97, 116, slip.END
                    ]
                ],
                messages: [
                    new Uint8Array([
                        slip.ESC, 105, 32, 114,
                        101, 109, 101, 109,
                        98, 101, 114, 32,
                        83, 76, 73, 80,
                        32, 102, 114, 111,
                        109, 32, 116, 104,
                        101, 32, slip.END, 49,
                        57, 57, 48, 115,
                        0, 0
                    ]),
                    new Uint8Array([
                        99, 97, 116
                    ])
                ]
            }
        ]
    };

    var tests = {
        encode: function (testSpec) {
            test(testSpec.name, function () {
                var actual = slip.encode(testSpec.message);

                // TODO: This will likely fail in Node.js due to their TypedArray implementation.
                deepEqual(actual, new Uint8Array(testSpec.encoded),
                    "The message should be correctly SLIP encoded.");
            });
        },

        decode: function (testSpec) {
            test(testSpec.name, function () {
                var messages = [];

                var callback = function (msg) {
                    messages.push(msg);
                };

                var decoder = new slip.Decoder(callback);

                for (var i = 0; i < testSpec.packets.length; i++) {
                    decoder.decode(testSpec.packets[i]);
                }

                deepEqual(messages, testSpec.messages,
                    "The messages should have been decoded correctly.");
            });
        }
    };

    var runTests = function (testSpecs) {
        for (var testType in testSpecs) {
            var testSpecsForType = testSpecs[testType];

            QUnit.module(testType);

            for (var i = 0; i < testSpecsForType.length; i++) {
                var testSpec = testSpecsForType[i];
                tests[testType](testSpec)
            }
        }
    };

    runTests(slipTestSpecs);
}());
