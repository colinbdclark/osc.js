/*
 * osc.js: An Open Sound Control library for JavaScript that works in both the browser and Node.js
 *
 * Core osc.js Tests
 *
 * Copyright 2014-2016, Colin Clark
 * Licensed under the MIT and GPL 3 licenses.
 */

/*global require, dcodeIO*/

var fluid = fluid || require("infusion"),
    jqUnit = jqUnit || fluid.require("node-jqunit"),
    osc = osc || fluid.require("%osc/src/platforms/osc-node.js", require, "osc");

(function () {
    "use strict";

    var QUnit = fluid.registerNamespace("QUnit");
    var Long = typeof dcodeIO !== "undefined" ? dcodeIO.Long : require("long");

    fluid.registerNamespace("osc.tests");

    /*************
     * Utilities *
     *************/

    osc.tests.stringToDataView = function (str) {
        var arr = new Uint8Array(str.length),
            dv = new DataView(arr.buffer);

        for (var i = 0; i < str.length; i++) {
            dv.setUint8(i, str.charCodeAt(i));
        }

        return dv;
    };

    osc.tests.numbersToDataView = function (nums, type, width) {
        var arr = new ArrayBuffer(nums.length * width),
            setter = "set" + type[0].toUpperCase() + type.substring(1),
            dv = new DataView(arr);

        for (var i = 0, offset = 0; i < nums.length; i++, offset = i * width) {
            var num = nums[i];
            dv[setter](offset, num, false);
        }

        return dv;
    };

    osc.tests.arrayEqual = function (actual, expected, msg) {
        QUnit.equal(actual.length, expected.length, "The array should be the expected length.");
        for (var i = 0; i < actual.length; i++) {
            var actualVal = actual[i],
                expectedVal = expected[i];

            if (typeof actualVal === "object" && typeof actualVal.length === "number") {
                osc.tests.arrayEqual(actualVal, expectedVal, msg);
            } else {
                QUnit.deepEqual(actualVal, expectedVal, msg);
            }
        }
    };

    osc.tests.roundTo = function (val, numDecimals) {
        return typeof val === "number" ? parseFloat(val.toFixed(numDecimals)) : val;
    };

    osc.tests.equalRoundedTo = function (actual, expected, numDecimals, msg) {
        var actualRounded = osc.tests.roundTo(actual, numDecimals),
            expectedRounded = osc.tests.roundTo(expected, numDecimals);

        QUnit.equal(actualRounded, expectedRounded, msg + "\nUnrounded value was: " + expected);
    };

    osc.tests.roundArrayValues = function (arr, numDecimals) {
        var togo = [];

        for (var i = 0; i < arr.length; i++) {
            var val = arr[i];
            var type = typeof val;
            togo[i] = type === "object" ? osc.tests.roundAllValues(val, numDecimals) :
                osc.tests.roundTo(val, numDecimals);
        }

        return togo;
    };

    osc.tests.roundAllValues = function (obj, numDecimals) {
        var togo = {};

        for (var key in obj) {
            var val = obj[key];
            if (osc.isArray(val)) {
                togo[key] = osc.tests.roundArrayValues(val, numDecimals);
            } else if (typeof val === "object") {
                togo[key] = osc.tests.roundAllValues(val, numDecimals);
            } else {
                togo[key] = osc.tests.roundTo(val, numDecimals);
            }
        }

        return togo;
    };

    osc.tests.deepEqualRounded = function (actual, expected, numDecimals, msg) {
        var roundedActual = osc.tests.roundAllValues(actual, numDecimals),
            roundedExpected = osc.tests.roundAllValues(expected, numDecimals);

        QUnit.deepEqual(roundedActual, roundedExpected, msg = "\nUnrounded actual object was: " +
            JSON.stringify(roundedActual));
    };

    osc.tests.isNonNumberPrimitive = function (val) {
        var type = typeof val;

        return val === null || type === "number" || type === "string" ||
            type === "undefined";
    };

    osc.tests.messageArgumentsEqual = function (actual, expected, numDecimals, msg) {
        QUnit.equal(actual.length, expected.length, "The arguments should be the expected length.");

        for (var i = 0; i < actual.length; i++) {
            var actualArg = actual[i];
            var expectedArg = expected[i];

            var msgTogo = "Argument #" + i + ": " + msg;

            if (typeof actualArg === "number") {
                osc.tests.equalRoundedTo(actualArg, expectedArg, numDecimals, msgTogo);
            } else if (osc.tests.isNonNumberPrimitive(actualArg)) {
                QUnit.equal(actualArg, expectedArg, msgTogo);
            } else if (typeof actualArg === "object" && typeof actualArg.length === "number") {
                osc.tests.arrayEqual(actualArg, expectedArg, msgTogo);
            } else if (expectedArg instanceof Long) {
                QUnit.deepEqual(actualArg, expectedArg, msgTogo + " actual: " +
                    actualArg.toString() + " expected: " + expectedArg.toString());
            } else {
                QUnit.deepEqual(actualArg, expectedArg, msgTogo);
            }
        }
    };


    /************
     * Strings  *
     ************/

    fluid.registerNamespace("osc.tests.strings");
    jqUnit.module("Strings");

    osc.tests.strings.testRead = function (testSpec) {
        var offsetState = testSpec.offsetState || {
            idx: 0
        };

        jqUnit.test("readString " + testSpec.name, function () {
            var expected = testSpec.rawString,
                dv = osc.tests.stringToDataView(testSpec.paddedString),
                actual = osc.readString(dv, offsetState);

            QUnit.equal(actual, expected, "The string should have been read correctly.");
            QUnit.equal(offsetState.idx, testSpec.paddedString.length,
                "The offset state should correctly reflect the null padding of the OSC string.");
        });

    };


    osc.tests.strings.testWrite = function (testSpec) {
        jqUnit.test("writeString " + testSpec.name, function () {
            var expectedDV = osc.tests.stringToDataView(testSpec.paddedString),
                expected = new Uint8Array(expectedDV.buffer),
                actualBuf = osc.writeString(testSpec.rawString),
                actual = new Uint8Array(actualBuf);

            osc.tests.arrayEqual(actual, expected, "The string should have been written correctly.");
            QUnit.ok(actualBuf instanceof Uint8Array, "The returned value should be a Uint8Array.");
        });
    };

    osc.tests.strings.testSpecs = [
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

    osc.tests.strings.readAndWriteTests = function (testSpecs) {
        for (var i = 0; i < testSpecs.length; i++) {
            var testSpec = testSpecs[i];
            osc.tests.strings.testRead(testSpec);
            osc.tests.strings.testWrite(testSpec);
        }
    };

    osc.tests.strings.readAndWriteTests(osc.tests.strings.testSpecs);


    osc.tests.strings.testEncodedObjectArgument = function (objectArg, argEncoder, argDecoder) {
        var msg = {
            address: "/thecat",
            args: argEncoder(objectArg)
        };

        var encoded = osc.writeMessage(msg),
            decoded = osc.readMessage(encoded);

        QUnit.deepEqual(decoded, msg,
            "The stringified object should have been correctly decoded.");
        QUnit.deepEqual(argDecoder(decoded.args), objectArg,
            "The object should parse correctly.");
    };

    QUnit.test("gh-40: Stringified ASCII-only object as string argument", function () {
        var objectArg =  {
            name: "Hugo",
            color: "White with tabby spots",
            age: 8
        };

        osc.tests.strings.testEncodedObjectArgument(objectArg, function (arg) {
            return JSON.stringify(arg);
        }, function (arg) {
            return JSON.parse(arg);
        });
    });

    QUnit.test("gh-40: Stringified extended character object as string argument", function () {
        var objectArg = {
            oneProperty: "Murdock’s Fougere",
            anotherProperty: "a gentleman’s look"
        };

        osc.tests.strings.testEncodedObjectArgument(objectArg, function (arg) {
            return encodeURIComponent(JSON.stringify(arg));
        }, function (arg) {
            return JSON.parse(decodeURIComponent(arg));
        });
    });


    /***********
     * Numbers *
     ***********/

    jqUnit.module("Numbers");
    fluid.registerNamespace("osc.tests.numbers");

    osc.tests.numbers.typeTesters = {
        "int32": {
            dataViewConverter: osc.tests.numbersToDataView,
            reader: osc.readInt32,
            width: 4
        },
        "float32": {
            dataViewConverter: osc.tests.numbersToDataView,
            reader: osc.readFloat32,
            width: 4
        }
    };

    osc.tests.numbers.testReadPrimitive = function (type, arr, expected, offsetState) {
        offsetState = offsetState || {
            idx: 0
        };

        var testMap = osc.tests.numbers.typeTesters[type],
            dv = testMap.dataViewConverter(arr, type, testMap.width),
            expectedOffsetIdx = offsetState.idx + testMap.width,
            actual = testMap.reader(dv, offsetState);

        osc.tests.equalRoundedTo(actual, expected, 5, "The correct value should have been read.");
        QUnit.equal(offsetState.idx, expectedOffsetIdx, "The offset state should have been updated appropriately.");
    };

    osc.tests.numbers.makeReadPrimitiveTester = function (type, testSpec) {
        return function () {
            osc.tests.numbers.testReadPrimitive(type, testSpec.nums, testSpec.expected, {
                idx: testSpec.offset
            });
        };
    };

    osc.tests.numbers.readPrimitiveTests = function (testSpecs) {
        for (var type in testSpecs) {
            var specsForType = testSpecs[type];

            for (var i = 0; i < specsForType.length; i++) {
                var spec = specsForType[i];
                jqUnit.test(spec.name, osc.tests.numbers.makeReadPrimitiveTester(type, spec));
            }
        }
    };

    osc.tests.numbers.readPrimitiveTestSpecs = {
        "int32": [
            {
                name: "Read an int32 value in the middle of a byte array",
                nums: new Int32Array([1, -1, 2000000, -600]),
                expected: 2000000,
                offset: 8
            },
            {
                name: "Read an int32 value at the end of a byte array",
                nums: new Int32Array([1, -1, 2000000, -600]),
                expected: -600,
                offset: 12
            },
            {
                name: "Read an int32 value at the beginning of a byte array",
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

    osc.tests.numbers.readPrimitiveTests(osc.tests.numbers.readPrimitiveTestSpecs);


    osc.tests.numbers.testWritePrimitive = function (testSpec) {
        jqUnit.test(testSpec.writer + " " + testSpec.name, function () {
            var expected = testSpec.expected,
                outBuf = new ArrayBuffer(expected.buffer.byteLength),
                dv = new DataView(outBuf),
                actual = osc[testSpec.writer](testSpec.val, dv, testSpec.offset);

            osc.tests.arrayEqual(actual, expected, "The value should have been written to the output buffer.");
        });
    };

    osc.tests.numbers.writePrimitiveTestSpecs = [
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

    osc.tests.numbers.writePrimitiveTests = function (testSpecs) {
        for (var i = 0; i < testSpecs.length; i++) {
            var testSpec = testSpecs[i];
            osc.tests.numbers.testWritePrimitive(testSpec);
        }
    };

    osc.tests.numbers.writePrimitiveTests(osc.tests.numbers.writePrimitiveTestSpecs);


    /*********
     * Blobs *
     *********/

    jqUnit.module("Blobs");
    fluid.registerNamespace("osc.tests.blobs");

    osc.tests.blobs.oscBlobOctets = [
        0, 0, 0, 3,            // Length 3
        0x63, 0x61, 0x74, 0   // raw bytes
    ];
    osc.tests.blobs.oscBlob = new Uint8Array(osc.tests.blobs.oscBlobOctets);
    osc.tests.blobs.oscBlobOctetsWithExtra = osc.tests.blobs.oscBlobOctets.concat([1, 2, 3, 4]);  // some random stuff afterwards.
    osc.tests.blobs.oscExtraBlob = new Uint8Array(osc.tests.blobs.oscBlobOctetsWithExtra);

    osc.tests.blobs.rawData = new Uint8Array([
        0x63, 0x61, 0x74
    ]);

    jqUnit.test("readBlob", function () {
        var dv = new DataView(osc.tests.blobs.oscExtraBlob.buffer);
        var expected = osc.tests.blobs.rawData;

        var offsetState = {
            idx: 0
        };

        var actual = osc.readBlob(dv, offsetState);

        osc.tests.arrayEqual(actual, expected, "The blob should be returned as-is.");
        QUnit.ok(actual instanceof Uint8Array, "The blob should be returned as a Uint8Array.");
        QUnit.equal(offsetState.idx, 8, "The offset state should have been updated correctly.");
    });


    jqUnit.test("writeBlob", function () {
        var expected = osc.tests.blobs.oscBlob,
            actual = osc.writeBlob(osc.tests.blobs.rawData);

        osc.tests.arrayEqual(new Uint8Array(actual), expected,
            "The data should have been packed into a correctly-formatted OSC blob.");
        QUnit.ok(actual instanceof Uint8Array, "The written blob should be a Uint8Array");
    });


    /*************
     * Time Tags *
     *************/

    jqUnit.module("Time Tags");
    fluid.registerNamespace("osc.tests.timeTags");

    osc.tests.timeTags.equalWithinTolerance = function (actual, expected, tolerance, msg) {
        var max = expected + tolerance,
            min = expected - tolerance;

        QUnit.ok(actual <= max, "The value should be no greater than " + tolerance + ". " + msg);
        QUnit.ok(actual >= min, "The value should be no less than " + tolerance + ". " + msg);
    };

    osc.tests.timeTags.testRead = function (testSpec) {
        jqUnit.test("Read time tag " + testSpec.name, function () {
            var expected = testSpec.timeTag,
                dv = new DataView(testSpec.timeTagBytes.buffer);

            var actual = osc.readTimeTag(dv, {
                idx: 0
            });

            if (expected.raw[0] === 0 && expected.raw[1] === 1) {
                var tolerance = 250;
                osc.tests.timeTags.equalWithinTolerance(actual.native, expected.native,
                    tolerance, "The native time tag should be within " + tolerance +
                    "ms of expected. Difference was: " + (actual.native - expected.native) + "ms.");
                QUnit.deepEqual(actual.raw, expected.raw, "The raw time should match identically.");
            } else {
                QUnit.deepEqual(actual, expected, "The date should have be read correctly.");
            }

        });
    };

    osc.tests.timeTags.testWrite = function (testSpec) {
        jqUnit.test("Write time tag " + testSpec.name, function () {
            var expected = testSpec.timeTagBytes,
                actual = osc.writeTimeTag(testSpec.timeTag);

            osc.tests.arrayEqual(actual, expected, "The raw time tag should have have been written correctly.");
        });
    };

    osc.tests.timeTags.testSpecs = [
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
                128, 0, 0, 0
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

    osc.tests.timeTags.readAndWriteTests = function (testSpecs) {
        for (var i = 0; i < testSpecs.length; i++) {
            var testSpec = testSpecs[i];
            osc.tests.timeTags.testRead(testSpec);
            osc.tests.timeTags.testWrite(testSpec);
        }
    };

    osc.tests.timeTags.readAndWriteTests(osc.tests.timeTags.testSpecs);

    jqUnit.test("Write native-only time tag.", function () {
        var testSpec = osc.tests.timeTags.testSpecs[1],
            expected = testSpec.timeTagBytes,
            timeTag = {
                native: testSpec.timeTag.native
            };

        var actual = osc.writeTimeTag(timeTag);
        osc.tests.arrayEqual(actual, expected,
            "A time tag with no raw value (only a native value) should be written correctly.");
    });

    osc.tests.timeTags.testTimeTag = function (actual, expectedJSTime, tolerance) {
        if (tolerance === undefined) {
            tolerance = 1000; // NTP fractional values.
        }
        // Convert the JS time to NTP time.
        var expected = osc.jsToNTPTime(expectedJSTime),
            max = expected[1] + tolerance,
            min = expected[1] - tolerance;

        QUnit.equal(actual.raw[0], expected[0], "The generated timestamp should be accurate to the second.");
        QUnit.ok(actual.raw[1] <= max, "The generated timestamp should be no greater than " + tolerance +
            " NTP fractions of a second from expected.");
        QUnit.ok(actual.raw[1] >= min, "The generated timestamp should be no less than " + tolerance +
            " NTP fractions of a second from expected.");
    };

    jqUnit.test("osc.timeTag now", function () {
        var actual = osc.timeTag();
        osc.tests.timeTags.testTimeTag(actual, Date.now());

        actual = osc.timeTag(0);
        osc.tests.timeTags.testTimeTag(actual, Date.now());
    });

    jqUnit.test("osc.timeTag future", function () {
        var actual = osc.timeTag(10.5),
            expected = Date.now() + 10500;
        osc.tests.timeTags.testTimeTag(actual, expected);

        actual = osc.timeTag(0.1);
        expected = Date.now() + 100;
        osc.tests.timeTags.testTimeTag(actual, expected);

    });

    jqUnit.test("osc.timeTag past", function () {
        var actual = osc.timeTag(-1000),
            expected = Date.now() - 1000000;
        osc.tests.timeTags.testTimeTag(actual, expected);

        actual = osc.timeTag(-0.01);
        expected = Date.now() - 10;
        osc.tests.timeTags.testTimeTag(actual, expected);
    });

    jqUnit.test("osc.timeTag relative to provided time", function () {
        var actual = osc.timeTag(0, Date.parse("2015-01-01")),
            expected = Date.parse("2015-01-01");
        osc.tests.timeTags.testTimeTag(actual, expected);
    });


    /**********************************************
     * Read Type-Only Arguments (e.g. T, F, N, I) *
     **********************************************/

    fluid.registerNamespace("osc.tests.args");

    jqUnit.module("Type-Only Arguments");

    jqUnit.test("Type-only arguments", function () {
        var offsetState = {
            idx: 27
        };

        var bool = osc.readTrue();
        QUnit.equal(bool, true, "readTrue() should return a true value");
        QUnit.equal(offsetState.idx, 27, "The offset state should not have been changed.");

        bool = osc.readFalse();
        QUnit.equal(bool, false, "readFalse() should return false value");
        QUnit.equal(offsetState.idx, 27, "The offset state should not have been changed.");

        var nully = osc.readNull();
        QUnit.equal(nully, null, "readNull() should return null.");
        QUnit.equal(offsetState.idx, 27, "The offset state should not have been changed.");

        var imp = osc.readImpulse();
        QUnit.equal(imp, 1.0, "readImpulse() should return 1.0.");
        QUnit.equal(offsetState.idx, 27, "The offset state should not have been changed.");
    });


    /****************************
     * Read and Write Arguments *
     ****************************/

    osc.tests.args.testRead = function (testSpec) {
        jqUnit.test("Read " + testSpec.name, function () {
            var offsetState = {
                idx: 0
            };

            var expected = testSpec.args,
                dv = new DataView(testSpec.rawArgBuffer.buffer),
                actual = osc.readArguments(dv, false, offsetState);

            osc.tests.messageArgumentsEqual(actual, expected, testSpec.roundToDecimals,
                "The returned arguments should have the correct values in the correct order.");
        });
    };

    osc.tests.args.createTypedArguments = function (args, typeTags) {
        return fluid.transform(args, function (arg, i) {
            return osc.isArray(arg) ? osc.tests.args.createTypedArguments(arg, typeTags[i]) :
                {
                    type: typeTags[i],
                    value: arg
                };
        });
    };

    osc.tests.args.testWrite = function (testSpec) {
        jqUnit.test("Write " + testSpec.name, function () {
            var argsToWrite = osc.tests.args.createTypedArguments(testSpec.args, testSpec.typeTags);

            var actual = osc.writeArguments(argsToWrite, {
                metadata: true
            });

            var expected = testSpec.rawArgBuffer;

            QUnit.deepEqual(osc.byteArray(actual), expected,
                "The arguments should have been correctly written.");
        });
    };

    osc.tests.args.testSpecs = [
        {
            name: "single argument",

            typeTags: ["f"],

            rawArgBuffer: new Uint8Array([
                // ",f"
                0x2c, 0x66, 0, 0,

                // 440
                0x43, 0xdc, 0, 0
            ]),

            args: [440]
        },
        {
            name: "blob and float",

            typeTags: ["b", "f"],

            rawArgBuffer: new Uint8Array([
                // ",bf"
                0x2c, 0x62, 0x66, 0,

                // 3
                0, 0, 0, 3,
                // blob
                0x63, 0x61, 0x74, 0,
                // 440
                0x43, 0xdc, 0, 0
            ]),

            args: [new Uint8Array([
                0x63, 0x61, 0x74,
            ]), 440]
        },
        {
            name: "multiple arguments of the same type",

            typeTags: ["i", "i", "s", "f", "f"],

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

            args: [1000, -1, "hello", 1.234, 5.678],

            roundToDecimals: 3
        },
        {
            name: "colours",

            typeTags: ["r", "r"],

            rawArgBuffer: new Uint8Array([
                // ,rr
                44, 114, 114, 0,

                // White color
                255, 255, 255, 0,
                // Green color rba(255, 255, 255, 0.3)
                0, 255, 0, 77
            ]),

            args: [
                {r: 255, g: 255, b: 255, a: 0},
                {r: 0, g: 255, b: 0, a: 77 / 255}
            ]
        },
        {
            name: "arrays",

            typeTags: ["s", ["r", "r"], "i"],

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

            args: [
                "cat",
                [
                    {r: 255, g: 255, b: 255, a: 0},
                    {r: 0, g: 255, b: 0, a: 77 / 255}
                ],
                42
            ]
        },
        {
            name: "every type of arg",

            typeTags: [
                "i", "f", "s", "S", "b", "t", "T", "F", "N", "I",
                ["i", "i"], "d", "c", "r", "m", "h"
            ],

            rawArgBuffer: new Uint8Array([
                // ",ifsSbtTFNI[ii]dcrmh"
                //44 105 102 115 83 98 116 84 70 78 73 91 105 105 93 100 99 114 109 104
                44, 105, 102, 115,
                83, 98, 116, 84,
                70, 78, 73, 91,
                105, 105, 93, 100,
                99, 114, 109, 104,
                0, 0, 0, 0,

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
                1, 144, 69, 101,
                // h: {high: 0x7FFFFFFF, low: 0xFFFFFFFF} 9223372036854775807
                127, 255, 255, 255,
                255, 255, 255, 255
            ]),

            args: [
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
                new Uint8Array([1, 144, 69, 101]),
                new Long(0xFFFFFFFF, 0x7FFFFFFF) // 9223372036854775807
            ],
            roundToDecimals: 3
        }
    ];

    osc.tests.args.testArguments = function (testSpecs, tester) {
        for (var i = 0; i < testSpecs.length; i++) {
            var testSpec = testSpecs[i];
            tester(testSpec);
        }
    };

    jqUnit.module("readArguments()");
    osc.tests.args.testArguments(osc.tests.args.testSpecs, osc.tests.args.testRead);

    jqUnit.module("writeArguments()");
    osc.tests.args.testArguments(osc.tests.args.testSpecs, osc.tests.args.testWrite);


    /************
     * Messages *
     ************/

    jqUnit.module("Messages");
    fluid.registerNamespace("osc.tests.messages");

    osc.tests.messages.readMessageTester = function (testSpec) {
        testSpec.offsetState = testSpec.offsetState || {
            idx: 0
        };

        var expected = testSpec.expectedMessage || testSpec.message,
            dv = new DataView(testSpec.oscMessageBuffer.buffer),
            actual = osc.readMessage(dv, testSpec.options, testSpec.offsetState),
            msg = "The returned message object should match the raw message data.";

        if (testSpec.roundToDecimals !== undefined) {
            osc.tests.deepEqualRounded(actual, expected, testSpec.roundToDecimals, msg);
        } else {
            QUnit.propEqual(actual, expected, msg);
        }
    };

    osc.tests.messages.testRead = function (testSpec) {
        jqUnit.test("readMessage " + testSpec.name, function () {
            osc.tests.messages.readMessageTester(testSpec);
        });
    };

    osc.tests.messages.writeMessageTester = function (expected, message, options) {
        var actual = osc.writeMessage(message, options);
        osc.tests.arrayEqual(actual, expected, "The message should have been written correctly.");

        return actual;
    };

    osc.tests.messages.testWrite = function (testSpec) {
        jqUnit.test("writeMessage " + testSpec.name, function () {
            osc.tests.messages.writeMessageTester(testSpec.oscMessageBuffer, testSpec.message, testSpec.options);
        });
    };

    osc.tests.messages.testRoundTrip = function (testSpec) {
        jqUnit.test("Read written message (roundtrip) " + testSpec.name, function () {
            var encoded = osc.tests.messages.writeMessageTester(testSpec.oscMessageBuffer,
                testSpec.message, testSpec.options);

            var readWrittenSpec = fluid.copy(testSpec);
            readWrittenSpec.oscMessageBuffer = encoded;
            readWrittenSpec.offsetState = null;
            osc.tests.messages.readMessageTester(readWrittenSpec);
        });
    };


    osc.tests.messages.testSpecs = [
        {
            name: "float and array example without type metadata",

            roundToDecimals: 3,

            // Note that without type metadata,
            // this message is semantically different from the one below,
            // since the number arguments must be interpreted as floats.
            oscMessageBuffer: new Uint8Array([
                // "//carrier/freq" | ",f[ff]" | 440.4, 42, 47
                0x2f, 0x63, 0x61, 0x72, // "/carrier/freq" + padding
                0x72, 0x69, 0x65, 0x72,
                0x2f, 0x66, 0x72, 0x65,
                0x71, 0, 0, 0,
                0x2c, 0x66, 0x5b, 0x66, // ,f[f
                0x66, 0x5d, 0, 0,       // f] padding
                0x43, 0xdc, 0x33, 0x33, // 440.4
                66, 40, 0, 0,           // 42.0
                66, 60, 0, 0            // 47.0
            ]),

            message: {
                address: "/carrier/freq",
                args: [
                    440.4, [42, 47]
                ]
            },

            options: {
                metadata: false
            }
        },

        {
            name: "float and array example with type metadata",

            roundToDecimals: 3,

            oscMessageBuffer: new Uint8Array([
                // "//carrier/freq" | ",f[ii]" | 440.4, 42, 47
                0x2f, 0x63, 0x61, 0x72, // "/carrier/freq" + padding
                0x72, 0x69, 0x65, 0x72,
                0x2f, 0x66, 0x72, 0x65,
                0x71, 0, 0, 0,
                0x2c, 0x66, 0x5b, 0x69, // ,f[i
                0x69, 0x5d, 0, 0,       // i] padding
                0x43, 0xdc, 0x33, 0x33, // 440.4
                0, 0, 0, 42,
                0, 0, 0, 47
            ]),

            message: {
                address: "/carrier/freq",
                args: [
                    {
                        type: "f",
                        value: 440.4
                    },
                    [
                        {
                            type: "i",
                            value: 42
                        },
                        {
                            type: "i",
                            value: 47
                        }
                    ]
                ]
            },

            options: {
                metadata: true
            }
        },

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
        },

        {
            name: "zero arguments, without type inference",
            // "/foo"
            oscMessageBuffer: new Uint8Array([
                0x2f, 0x66, 0x6f, 0x6f, // "/foo"
                0, 0, 0, 0,             // padding
                0x2c, 0, 0, 0           // , padding
            ]),

            message: {
                address: "/foo"
            },

            expectedMessage: {
                address: "/foo",
                args: []
            },

            options: {
                metadata: true
            }
        },

        {
            name: "zero arguments, with type inference",
            // "/foo"
            oscMessageBuffer: new Uint8Array([
                0x2f, 0x66, 0x6f, 0x6f, // "/foo"
                0, 0, 0, 0,             // padding
                0x2c, 0, 0, 0           // , padding
            ]),

            message: {
                address: "/foo"
            },

            expectedMessage: {
                address: "/foo",
                args: []
            },

            options: {
                metadata: false
            }
        }
    ];

    osc.tests.messages.testMessages = function (testSpecs) {
        for (var i = 0; i < testSpecs.length; i++) {
            var testSpec = testSpecs[i];
            osc.tests.messages.testRead(testSpec);
            osc.tests.messages.testWrite(testSpec);
            osc.tests.messages.testRoundTrip(testSpec);
        }
    };

    osc.tests.messages.testMessages(osc.tests.messages.testSpecs);

    jqUnit.test("gh-17", function () {
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
        osc.tests.deepEqualRounded(decoded, msg, "The message should have been encoded and decoded correctly.");
    });


    /***********
     * Bundles *
     ***********/

    jqUnit.module("Bundles");
    fluid.registerNamespace("osc.tests.bundles");

    osc.tests.bundles.testRead = function (testSpec) {
        jqUnit.test("readBundle " + testSpec.name, function () {
            var expected = testSpec.bundle,
                dv = new DataView(testSpec.bytes.buffer),
                offsetState = {
                    idx: 0
                };

            var actual = osc.readBundle(dv, testSpec.options, offsetState);
            osc.tests.deepEqualRounded(actual, expected,
                "The bundle should have been read correctly.");
            QUnit.equal(offsetState.idx, dv.byteLength,
                "The offset state should have been adjusted correctly.");
        });
    };

    osc.tests.bundles.testWrite = function (testSpec) {
        jqUnit.test("writeBundle " + testSpec.name, function () {
            var expected = testSpec.bytes,
                actual = osc.writeBundle(testSpec.bundle, testSpec.options);

            osc.tests.arrayEqual(actual, expected,
                "The bundle should have been written correctly.");
        });
    };

    osc.tests.bundles.testSpecs = [
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

    osc.tests.bundles.testBundles = function (testSpecs) {
        for (var i = 0; i < testSpecs.length; i++) {
            var testSpec = testSpecs[i];
            osc.tests.bundles.testRead(testSpec);
            osc.tests.bundles.testWrite(testSpec);
        }
    };

    osc.tests.bundles.testBundles(osc.tests.bundles.testSpecs);

    QUnit.test("gh-36: Write Long argument", function () {
        var msg = {
            address: "/cat/slash",
            args: [
                new Long(0xFFFFFFFF, 0x7FFFFFFF) // 9223372036854775807
            ]
        };

        var actual = osc.writeMessage(msg, {
            metadata: false
        });

        var actualRead = osc.readMessage(actual, {
            metadata: true
        });

        var expected = {
            addres: msg.address,
            args: [
                {
                    type: "h",
                    value: msg.args[0]
                }
            ]
        };

        QUnit.expect(2);

        QUnit.equal(1, actualRead.args.length,
            "There should only be one message argument.");

        QUnit.ok(actualRead.args[0].value.equals(expected.args[0].value),
            "The long integer should have been correctly type inferred when writing it" +
            " to a message.");
    });
}());
