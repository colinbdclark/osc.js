/*global QUnit, equal, deepEqual, osc, test, ok*/

(function () {

    "use strict";

    /*************
     * Utilities *
     *************/

    var stringToDataView = function (str) {
        var arr = new Uint8Array(str.length),
            dv = new DataView(arr.buffer);

        for (var i = 0; i < str.length; i++) {
            dv.setUint8(i, str.charCodeAt(i));
        }

        return dv;
    };

    var numbersToDataView = function (nums, type, width) {
        var arr = new ArrayBuffer(nums.length * width),
            setter = "set" + type[0].toUpperCase() + type.substring(1),
            dv = new DataView(arr);

        for (var i = 0, offset = 0; i < nums.length; i++, offset = i * width) {
            var num = nums[i];
            dv[setter](offset, num, false);
        }

        return dv;
    };

    var arrayEqual = function (actual, expected, msg) {
        equal(actual.length, expected.length, "The array should be the expected length.");
        for (var i = 0; i < actual.length; i++) {
            var actualVal = actual[i],
                expectedVal = expected[i];

            if (typeof actualVal === "object" && typeof actualVal.length === "number") {
                arrayEqual(actualVal, expectedVal, msg);
            } else {
                deepEqual(actualVal, expectedVal, msg);
            }
        }
    };

    var roundTo = function (val, numDecimals) {
        return typeof val === "number" ? parseFloat(val.toFixed(numDecimals)) : val;
    };

    var equalRoundedTo = function (actual, expected, numDecimals, msg) {
        var actualRounded = roundTo(actual, numDecimals),
            expectedRounded = roundTo(expected, numDecimals);

        equal(actualRounded, expectedRounded, msg + "\nUnrounded value was: " + expected);
    };

    var roundArrayValues = function (arr, numDecimals) {
        var togo = [];

        for (var i = 0; i < arr.length; i++) {
            var val = arr[i];
            var type = typeof val;
            togo[i] = type === "object" ? roundAllValues(val, numDecimals) : roundTo(val, numDecimals);
        }

        return togo;
    };

    var arrayEqualRounded = function (actual, expected, numDecimals, msg) {
        var actualRounded = roundArrayValues(actual, numDecimals),
            expectedRounded = roundArrayValues(expected, numDecimals);

        arrayEqual(actualRounded, expectedRounded, msg + "\nActual unrounded array: " + actual);
    };

    var roundAllValues = function (obj, numDecimals) {
        var togo = {};

        for (var key in obj) {
            var val = obj[key];
            if (osc.isArray(val)) {
                togo[key] = roundArrayValues(val, numDecimals);
            } else if (typeof val === "object") {
                togo[key] = roundAllValues(val, numDecimals);
            } else {
                togo[key] = roundTo(val, numDecimals);
            }
        }

        return togo;
    };

    var roundedDeepEqual = function (actual, expected, numDecimals, msg) {
        var roundedActual = roundAllValues(actual, numDecimals),
            roundedExpected = roundAllValues(expected, numDecimals);

        deepEqual(roundedActual, roundedExpected, msg = "\nUnrounded actual object was: " +
            JSON.stringify(roundedActual));
    };


    /************
     * Strings  *
     ************/

    QUnit.module("Strings");

    var testReadString = function (testSpec) {
        var offsetState = testSpec.offsetState || {
            idx: 0
        };

        test("readString " + testSpec.name, function () {
            var expected = testSpec.rawString,
                dv = stringToDataView(testSpec.paddedString),
                actual = osc.readString(dv, offsetState);

            equal(actual, expected, "The string should have been read correctly.");
            equal(offsetState.idx, testSpec.paddedString.length,
                "The offset state should correctly reflect the null padding of the OSC string.");
        });

    };


    var testWriteString = function (testSpec) {
        test("writeString " + testSpec.name, function () {
            var expectedDV = stringToDataView(testSpec.paddedString),
                expected = new Uint8Array(expectedDV.buffer),
                actualBuf = osc.writeString(testSpec.rawString),
                actual = new Uint8Array(actualBuf);

            arrayEqual(actual, expected, "The string should have been written correctly.");
            ok(actualBuf instanceof Uint8Array, "The returned value should be a Uint8Array.");
        });
    };

    var stringTestSpecs = [
        {
            name: "four character (eight byte) string",
            paddedString: "data\u0000\u0000\u0000\u0000",
            rawString: "data"
        },
        {
            name: "three character (four byte) string",
            paddedString: "OSC\u0000",
            rawString: "OSC"
        }
    ];

    var stringTests = function (testSpecs) {
        for (var i = 0; i < testSpecs.length; i++) {
            var testSpec = testSpecs[i];
            testReadString(testSpec);
            testWriteString(testSpec);
        }
    };

    stringTests(stringTestSpecs);


    /***********
     * Numbers *
     ***********/

    QUnit.module("Numbers");

    var typeTesters = {
        "int32": {
            dataViewConverter: numbersToDataView,
            reader: osc.readInt32,
            width: 4
        },
        "float32": {
            dataViewConverter: numbersToDataView,
            reader: osc.readFloat32,
            width: 4
        }
    };

    var testReadPrimitive = function (type, arr, expected, offsetState) {
        offsetState = offsetState || {
            idx: 0
        };

        var testMap = typeTesters[type],
            dv = testMap.dataViewConverter(arr, type, testMap.width),
            expectedOffsetIdx = offsetState.idx + testMap.width,
            actual = testMap.reader(dv, offsetState);

        equalRoundedTo(actual, expected, 5, "The correct value should have been read.");
        equal(offsetState.idx, expectedOffsetIdx, "The offset state should have been updated appropriately.");
    };

    var makeReadPrimitiveTester = function (type, testSpec) {
        return function () {
            testReadPrimitive(type, testSpec.nums, testSpec.expected, {
                idx: testSpec.offset
            });
        };
    };

    var readPrimitiveTests = function (testSpecs) {
        for (var type in testSpecs) {
            var specsForType = testSpecs[type];

            for (var i = 0; i < specsForType.length; i++) {
                var spec = specsForType[i];
                test(spec.name, makeReadPrimitiveTester(type, spec));
            }
        }
    };

    var readPrimitiveTestSpecs = {
        "int32": [
            {
                name: "Read an int32 value in the middle of a byte array",
                nums: new Int32Array([1, -1, 2000000, -600]),
                expected: 2000000,
                offset: 8
            },
            {
                name: "Read an in32 value at the end of a byte array",
                nums: new Int32Array([1, -1, 2000000, -600]),
                expected: -600,
                offset: 12
            },
            {
                name: "Read an in32 value at the beginning of a byte array",
                nums: new Int32Array([1, -1, 2000000, -600]),
                expected: 1,
                offset: 0
            }
        ],

        "float32": [
            {
                name: "Read a float32 value in the middle of a byte array",
                nums: new Float32Array([42.42, 0.00001, 10000000000.00000001, 27]),
                expected: 0.00001,
                offset: 4
            },
            {
                name: "Read a float32 value in at the end of a byte array",
                nums: new Float32Array([42.42, 0.00001, 10000000000.00000001, 27]),
                expected: 27,
                offset: 12
            },
            {
                name: "Read a float32 value in at the beginning of a byte array",
                nums: new Float32Array([42.42, 0.00001, 10000000000.00000001, 27]),
                expected: 42.42,
                offset: 0
            }
        ]
    };

    readPrimitiveTests(readPrimitiveTestSpecs);


    var testWritePrimitive = function (testSpec) {
        test(testSpec.writer + " " + testSpec.name, function () {
            var expected = testSpec.expected,
                outBuf = new ArrayBuffer(expected.buffer.byteLength),
                dv = new DataView(outBuf),
                actual = osc[testSpec.writer](testSpec.val, dv, testSpec.offset);

            arrayEqual(actual, expected, "The value should have been written to the output buffer.");
        });
    };

    var writePrimitiveTestSpecs = [
        {
            writer: "writeInt32",
            name: "simple value",
            val: 32,
            expected: new Uint8Array([0, 0, 0, 32])
        },
        {
            writer: "writeInt32",
            name: "negative 32 bit value",
            val: -1,
            expected: new Uint8Array([255, 255, 255, 255])
        },
        {
            writer: "writeInt32",
            name: "with offset",
            val: -1,
            offset: 4,
            expected: new Uint8Array([0, 0, 0, 0, 255, 255, 255, 255])
        },
        {
            writer: "writeFloat32",
            name: "simple value",
            val: 42.42,
            expected: new Uint8Array([66, 41, 174, 20])
        },
        {
            writer: "writeFloat32",
            name: "negative value",
            val: -3.14159,
            expected: new Uint8Array([192, 73, 15, 208])
        },
        {
            writer: "writeFloat32",
            name: "simple value with offset",
            val: 1,
            offset: 12,
            expected: new Uint8Array([
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63, 128, 0, 0, 0, 0, 0, 0
            ])
        }
    ];

    var writePrimitiveTests = function (testSpecs) {
        for (var i = 0; i < testSpecs.length; i++) {
            var testSpec = testSpecs[i];
            testWritePrimitive(testSpec);
        }
    };

    writePrimitiveTests(writePrimitiveTestSpecs);


    /*********
     * Blobs *
     *********/

    QUnit.module("Blobs");

    var oscBlobOctets = [
        0, 0, 0, 3,            // Length 3
        0x63, 0x61, 0x74, 0   // raw bytes
    ];
    var oscBlob = new Uint8Array(oscBlobOctets);
    var oscBlobOctetsWithExtra = oscBlobOctets.concat([1, 2, 3, 4]);  // some random stuff afterwards.
    var oscExtraBlob = new Uint8Array(oscBlobOctetsWithExtra);

    var rawData = new Uint8Array([
        0x63, 0x61, 0x74
    ]);

    test("readBlob", function () {
        var dv = new DataView(oscExtraBlob.buffer);
        var expected = rawData;

        var offsetState = {
            idx: 0
        };

        var actual = osc.readBlob(dv, offsetState);

        arrayEqual(actual, expected, "The blob should be returned as-is.");
        ok(actual instanceof Uint8Array, "The blob should be returned as a Uint8Array.");
        equal(offsetState.idx, 8, "The offset state should have been updated correctly.");
    });


    test("writeBlob", function () {
        var expected = oscBlob,
            actual = osc.writeBlob(rawData);

        arrayEqual(new Uint8Array(actual), expected,
            "The data should have been packed into a correctly-formatted OSC blob.");
        ok(actual instanceof Uint8Array, "The written blob should be a Uint8Array");
    });


    /*************
     * Time Tags *
     *************/

    QUnit.module("Time Tags");

    var equalWithinTolerance = function (actual, expected, tolerance, msg) {
        var max = expected + tolerance,
            min = expected - tolerance;

        ok(actual <= max, "The value should be no greater than " + tolerance + ". " + msg);
        ok(actual >= min, "The value should be no less than " + tolerance + ". " + msg);
    };

    var testReadTimeTag = function (testSpec) {
        test("Read time tag " + testSpec.name, function () {
            var expected = testSpec.timeTag,
                dv = new DataView(testSpec.timeTagBytes.buffer);

            var actual = osc.readTimeTag(dv, {
                idx: 0
            });

            if (expected.raw[0] === 0 && expected.raw[1] === 1) {
                var tolerance = 150;
                equalWithinTolerance(actual.native, expected.native,
                    tolerance, "The native time tag should be within " + tolerance +
                    "ms of expected. Difference was: " + (actual.native - expected.native) + "ms.");
                deepEqual(actual.raw, expected.raw, "The raw time should match identically.");
            } else {
                deepEqual(actual, expected, "The date should have be read correctly.");
            }

        });
    };

    var testWriteTimeTag = function (testSpec) {
        test("Write time tag " + testSpec.name, function () {
            var expected = testSpec.timeTagBytes,
                actual = osc.writeTimeTag(testSpec.timeTag);

            arrayEqual(actual, expected, "The raw time tag should have have been written correctly.");
        });
    };

    var timeTagTestSpecs = [
        {
            name: "with seconds only",
            // May 4, 2014 at 0:00:00 UTC.
            timeTagBytes: new Uint8Array([
                215, 15, 243, 112,
                0, 0, 0, 0
            ]),
            timeTag: {
                raw: [3608146800, 0],
                native: 1399158000 * 1000
            }
        },
        {
            name: "with fractions of a second",
            // Half a second past midnight on Sunday May 4, 2014.
            timeTagBytes: new Uint8Array([
                // [3608146800, 2147483648]
                215, 15, 243, 112,
                128, 0, 0 , 0
            ]),
            timeTag: {
                raw: [3608146800, 4294967296 / 2],
                native: (1399158000 * 1000) + 500
            }
        },
        {
            name: "one fraction of a second (i.e. now in OSC time tag-speak)",
            timeTagBytes: new Uint8Array([
                0, 0, 0, 0,
                0, 0, 0, 1
            ]),
            timeTag: {
                raw: [0, 1],
                native: Date.now()
            }
        }
    ];

    var timeTagTests = function (testSpecs) {
        for (var i = 0; i < testSpecs.length; i++) {
            var testSpec = testSpecs[i];
            testReadTimeTag(testSpec);
            testWriteTimeTag(testSpec);
        }
    };

    timeTagTests(timeTagTestSpecs);

    test("Write native-only time tag.", function () {
        var testSpec = timeTagTestSpecs[1],
            expected = testSpec.timeTagBytes,
            timeTag = {
                native: testSpec.timeTag.native
            };

        var actual = osc.writeTimeTag(timeTag);
        arrayEqual(actual, expected,
            "A time tag with no raw value (only a native value) should be written correctly.");
    });

    var testTimeTag = function (actual, expectedJSTime, tolerance) {
        if (tolerance === undefined) {
            tolerance = 1000; // NTP fractional values.
        }
        // Convert the JS time to NTP time.
        var expected = osc.jsToNTPTime(expectedJSTime),
            max = expected[1] + tolerance,
            min = expected[1] - tolerance;

        equal(actual.raw[0], expected[0], "The generated timestamp should be accurate to the second.");
        ok(actual.raw[1] <= max, "The generated timestamp should be no greater than " + tolerance +
            " NTP fractions of a second from expected.");
        ok(actual.raw[1] >= min, "The generated timestamp should be no less than " + tolerance +
            " NTP fractions of a second from expected.");
    };

    test("osc.timeTag now", function () {
        var actual = osc.timeTag();
        testTimeTag(actual, Date.now());

        actual = osc.timeTag(0);
        testTimeTag(actual, Date.now());
    });

    test("osc.timeTag future", function () {
        var actual = osc.timeTag(10.5),
            expected = Date.now() + 10500;
        testTimeTag(actual, expected);

        actual = osc.timeTag(0.1);
        expected = Date.now() + 100;
        testTimeTag(actual, expected);

    });

    test("osc.timeTag past", function () {
        var actual = osc.timeTag(-1000),
            expected = Date.now() - 1000000;
        testTimeTag(actual, expected);

        actual = osc.timeTag(-0.01);
        expected = Date.now() - 10;
    });


    /**********************************************
     * Read Type-Only Arguments (e.g. T, F, N, I) *
     **********************************************/

    QUnit.module("Type-Only Arguments");

    test("Type-only arguments", function () {
        var offsetState = {
            idx: 27
        };

        var bool = osc.readTrue();
        equal(bool, true, "readTrue() should return a true value");
        equal(offsetState.idx, 27, "The offset state should not have been changed.");

        bool = osc.readFalse();
        equal(bool, false, "readFalse() should return false value");
        equal(offsetState.idx, 27, "The offset state should not have been changed.");

        var nully = osc.readNull();
        equal(nully, null, "readNull() should return null.");
        equal(offsetState.idx, 27, "The offset state should not have been changed.");

        var imp = osc.readImpulse();
        equal(imp, 1.0, "readImpulse() should return 1.0.");
        equal(offsetState.idx, 27, "The offset state should not have been changed.");
    });


    /******************
     * Read Arguments *
     ******************/

    QUnit.module("readArguments()");

    var testArguments = function (testSpec) {
        //rawArgBuffer, expected, roundToDecimals, offsetState
        //testSpec.rawArgBuffer, testSpec.expected, testSpec.roundToDecimals
        test(testSpec.name, function () {
            var offsetState = {
                idx: 0
            };

            var expected = testSpec.expected,
                dv = new DataView(testSpec.rawArgBuffer.buffer),
                actual = osc.readArguments(dv, false, offsetState);

            if (testSpec.roundToDecimals !== undefined) {
                arrayEqualRounded(actual, expected, testSpec.roundToDecimals, offsetState);
            } else {
                arrayEqual(actual, expected,
                    "The returned arguments should have the correct values in the correct order.");
            }
        });
    };

    var argumentTestSpecs = [
        {
            name: "single argument",
            rawArgBuffer: new Uint8Array([
                // ",f"
                0x2c, 0x66, 0, 0,
                // 440
                0x43, 0xdc, 0 , 0
            ]),
            expected: [440]
        },
        {
            name: "blob and float",
            rawArgBuffer: new Uint8Array([
                // ",bf"
                0x2c, 0x62, 0x66, 0,
                // 3
                0, 0, 0, 3,
                // blob
                0x63, 0x61, 0x74, 0,
                // 440
                0x43, 0xdc, 0 , 0
            ]),
            expected: [new Uint8Array([
                0x63, 0x61, 0x74,
            ]), 440]
        },
        {
            name: "multiple arguments of the same type",
            rawArgBuffer: new Uint8Array([
                //",iisff"
                0x2c, 0x69, 0x69, 0x73,
                0x66, 0x66, 0, 0,
                // 1000
                0, 0, 0x3, 0xe8,
                // -1
                0xff, 0xff, 0xff, 0xff,
                // "hello"
                0x68, 0x65, 0x6c, 0x6c,
                0x6f, 0, 0, 0,
                // 1.1234
                0x3f, 0x9d, 0xf3, 0xb6,
                // 5.678
                0x40, 0xb5, 0xb2, 0x2d
            ]),
            expected: [1000, -1, "hello", 1.234, 5.678],
            roundToDecimals: 3
        },
        {
            name: "colours",
            rawArgBuffer: new Uint8Array([
                // ,rr
                44, 114, 114, 0,
                // White color
                255, 255, 255, 0,
                // Green color rba(255, 255, 255, 0.3)
                0, 255, 0, 77,
                // Some junk
                255, 128, 64, 12
            ]),
            expected: [{r: 255, g: 255, b: 255, a: 0}, {r: 0, g: 255, b: 0, a: 77 / 255}]
        },
        {
            name: "arrays",
            rawArgBuffer: new Uint8Array([
                // ,s[rr]i
                44, 115, 91, 114,
                114, 93, 105, 0,
                // "cat",
                99, 97, 116, 0,
                // White color
                255, 255, 255, 0,
                // Green color rba(255, 255, 255, 0.3)
                0, 255, 0, 77,
                // #42
                0, 0, 0, 42
            ]),
            expected: [
                "cat",
                [{r: 255, g: 255, b: 255, a: 0}, {r: 0, g: 255, b: 0, a: 77 / 255}],
                42
            ]
        },
        {
            name: "every type of arg",
            rawArgBuffer: new Uint8Array([
                // ",ifsSbtTFNI[ii]dcrm"
                //44 105 102 115 83 98 116 84 70 78 73 91 105 105 93 100 99 114 109
                44, 105, 102, 115,
                83, 98, 116, 84,
                70, 78, 73, 91,
                105, 105, 93, 100,
                99, 114, 109, 0,
                // i: 1
                0, 0, 0, 1,
                //f: 1.234
                0x3f, 0x9d, 0xf3, 0xb6,
                // s: "cat"
                99, 97, 116, 0,
                //"\cat"
                92, 99, 97, 116,
                0, 0, 0, 0,
                // blob{3, [255, 255, 0]}
                0, 0, 0, 3,
                255, 255, 0, 0,
                // t: {raw: [2208988800, 0], native: 0}
                131, 170, 126, 128,
                0, 0, 0, 0,
                // [ii]: [42, 47]
                0, 0, 0, 42,
                0, 0, 0, 47,
                // d: 2.1
                0x40, 0x00, 0xCC, 0xCC,
                0xCC, 0xCC, 0xCC, 0xCD,
                // c: "z"
                0, 0, 0, 122,
                // {r: 128, g: 64, b: 192, a: 1.0},
                128, 64, 192, 255,
                // m: [1, 144, 69, 101] // port id 1 , note on chan 1, C3, velocity 101]
                1, 144, 69, 101

            ]),
            // ",ifsSbtTFNI[ii]dcrm"

            expected: [
                1,
                1.234,
                "cat",
                "\\cat",
                new Uint8Array([255, 255, 0]),
                {
                    raw: [2208988800, 0],
                    native: 0
                },
                true,
                false,
                null,
                1.0,
                [
                    42,
                    47
                ],
                2.1,
                "z",
                {
                    r: 128,
                    g: 64,
                    b: 192,
                    a: 1.0
                },
                new Uint8Array([1, 144, 69, 101])
            ],
            roundToDecimals: 3
        }
    ];

    var readArgumentsTests = function (testSpecs) {
        for (var i = 0; i < testSpecs.length; i++) {
            var testSpec = testSpecs[i];
            testArguments(testSpec);
        }
    };

    readArgumentsTests(argumentTestSpecs);


    /************
     * Messages *
     ************/

    QUnit.module("Messages");

    var testReadMessage = function (testSpec) {
        testSpec.offsetState = testSpec.offsetState || {
            idx: 0
        };

        test("readMessage " + testSpec.name, function () {
            var expected = testSpec.message,
                dv = new DataView(testSpec.oscMessageBuffer.buffer),
                actual = osc.readMessage(dv, testSpec.options, testSpec.offsetState),
                msg = "The returned message object should match the raw message data.";

            if (testSpec.roundToDecimals !== undefined) {
                roundedDeepEqual(actual, expected, testSpec.roundToDecimals, msg);
            } else {
                deepEqual(actual, expected, msg);
            }
        });
    };

    var testWriteMessage = function (testSpec) {
        test("writeMessage " + testSpec.name, function () {
            var expected = testSpec.oscMessageBuffer,
                actual = osc.writeMessage(testSpec.message, testSpec.options);

            arrayEqual(actual, expected, "The message should have been written correctly.");
        });
    };

    var messageTestSpecs = [
        {
            name: "without type metadata",

            // "/oscillator/4/frequency" | ",f" | 440
            oscMessageBuffer: new Uint8Array([
                0x2f, 0x6f, 0x73, 0x63,
                0x69, 0x6c, 0x6c, 0x61,
                0x74, 0x6f, 0x72, 0x2f,
                0x34, 0x2f, 0x66, 0x72,
                0x65, 0x71, 0x75, 0x65,
                0x6e, 0x63, 0x79, 0,
                0x2c, 0x66, 0, 0,
                0x43, 0xdc, 0, 0
            ]),

            message: {
                address: "/oscillator/4/frequency",
                args: 440
            }
        },
        {
            name: "with type metadata",

            oscMessageBuffer: new Uint8Array([
                // "/foo" | ",iisTff" | 1000, -1, "hello", 1.1234, 5.678
                0x2f, 0x66, 0x6f, 0x6f, // "/foo"
                0, 0, 0, 0,             // padding
                0x2c, 0x69, 0x69, 0x73, // ,iis
                0x54, 0x66, 0x66, 0,    // Tff padding
                0, 0, 0x3, 0xe8,
                0xff, 0xff, 0xff, 0xff,
                0x68, 0x65, 0x6c, 0x6c,
                0x6f, 0, 0, 0,
                0x3f, 0x9d, 0xf3, 0xb6,
                0x40, 0xb5, 0xb2, 0x2d
            ]),

            message: {
                address: "/foo",
                args: [
                    {
                        type: "i",
                        value: 1000
                    },
                    {
                        type: "i",
                        value: -1
                    },
                    {
                        type: "s",
                        value: "hello"
                    },
                    {
                        type: "T",
                        value: true
                    },
                    {
                        type: "f",
                        value: 1.234
                    },
                    {
                        type: "f",
                        value: 5.678
                    }
                ]
            },

            roundToDecimals: 3,

            options: {
                metadata: true
            }
        }
    ];

    var testMessages = function (testSpecs) {
        for (var i = 0; i < testSpecs.length; i++) {
            var testSpec = testSpecs[i];
            testReadMessage(testSpec);
            testWriteMessage(testSpec);
        }
    };

    testMessages(messageTestSpecs);

    test("gh-17", function () {
        var msg = {
            address: "/sl/1/down",
            args: [
                {
                    type: "f", // OSC type tag string
                    value: 444.4
                }
            ]
        };

        var encoded = osc.writeMessage(msg);
        var decoded = osc.readMessage(encoded, {
            metadata: true
        });
        roundedDeepEqual(decoded, msg, "The message should have been encoded and decoded correctly.");
    });


    /***********
     * Bundles *
     ***********/

    QUnit.module("Bundles");

    var testReadBundle = function (testSpec) {
        test("readBundle " + testSpec.name, function () {
            var expected = testSpec.bundle,
                dv = new DataView(testSpec.bytes.buffer),
                offsetState = {
                    idx: 0
                };

            var actual = osc.readBundle(dv, testSpec.options, offsetState);
            roundedDeepEqual(actual, expected,
                "The bundle should have been read correctly.");
            equal(offsetState.idx, dv.byteLength,
                "The offset state should have been adjusted correctly.");
        });
    };

    var testWriteBundle = function (testSpec) {
        test("writeBundle " + testSpec.name, function () {
            var expected = testSpec.bytes,
                actual = osc.writeBundle(testSpec.bundle, testSpec.options);

            arrayEqual(actual, expected,
                "The bundle should have been written correctly.");
        });
    };

    var bundleTestSpecs = [
        {
            name: "with nested bundles.",
            bytes: new Uint8Array([
                // "#bundle"
                35, 98, 117, 110,
                100, 108, 101, 0,
                // timetag [3608492400, 0]
                215, 21, 57, 112,
                0, 0, 0, 0,

                // first packet:
                // size 24 bytes
                0, 0, 0, 24,
                // "/cat/meow/freq"
                47, 99, 97, 116,
                47, 109, 101, 111,
                119, 47, 102, 114,
                101, 113, 0, 0,
                //,f
                44, 102, 0, 0,
                // 222.2
                67, 94, 51, 51,

                // second packet:
                // size 44 bytes
                0, 0, 0, 48,
                // "#bundle"
                35, 98, 117, 110,
                100, 108, 101, 0,
                // timetag [3608406000, 0]
                215, 19, 231, 240,
                0, 0, 0, 0,

                // packet 2.a:
                // size 28 bytes
                0, 0, 0, 28,
                // "/hamster/wheel/freq"
                47, 104, 97, 109,
                115, 116, 101, 114,
                47, 119, 104, 101,
                101, 108, 47, 102,
                114, 101, 113, 0,
                // type tag ,i
                44, 105, 0, 0,
                // 100
                0, 0, 0, 100,

                // third packet:
                // size 32 bytes
                0, 0, 0, 32,
                // "/fish/burble/amp"
                47, 102, 105, 115,
                104, 47, 98, 117,
                114, 98, 108, 101,
                47, 97, 109, 112,
                0, 0, 0, 0,
                // type tag ,fs
                44, 102, 115, 0,
                // -6, "dB"
                192, 192, 0, 0,
                100, 66, 0, 0
            ]),

            bundle: {
                timeTag: {
                    // 215, 21, 57, 112 | 0, 0, 0, 0
                    raw: [3608492400, 0],
                    native: 1399503600000
                },

                packets: [
                    {
                        // 47 99 97 116 | 47 109 101 111 | 119 47 102 114 | 101 113 0 0
                        address: "/cat/meow/freq",
                        // type tag: ,f: 44 102 0 0 | values: 67 94 51 51
                        args: [
                            {
                                type: "f",
                                value: 222.2,
                            }
                        ]
                    },
                    {
                        timeTag: {
                            // 215 19 231 240 | 0 0 0 0
                            raw: [3608406000, 0],
                            native: 1399417200000
                        },
                        packets: [
                            {
                                // 47 104 97 109 | 115 116 101 114 | 47 119 104 101 | 101 108 47 102 | 114 101 113 0
                                address: "/hamster/wheel/freq",
                                // type tag ,i: 44 105 0 0 | values: 66 200 0 0
                                args: [
                                    {
                                        type: "i",
                                        value: 100
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        // 47 102 105 115 | 104 47 98 117 | 114 98 108 101 | 47 97 109 112 | 0 0 0 0
                        address: "/fish/burble/amp",
                        // type tag ,fs: 44 102 115 0 | values: 255 255 255 250, 100 66 0 0
                        args: [
                            {
                                type: "f",
                                value: -6
                            },
                            {
                                type: "s",
                                value: "dB"
                            }
                        ]
                    }
                ]
            },

            options: {
                metadata: true
            }
        }
    ];

    var testBundles = function (testSpecs) {
        for (var i = 0; i < testSpecs.length; i++) {
            var testSpec = testSpecs[i];
            testReadBundle(testSpec);
            testWriteBundle(testSpec);
        }
    };

    testBundles(bundleTestSpecs);

}());
