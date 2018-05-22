/*
 * osc.js: An Open Sound Control library for JavaScript that works in both the browser and Node.js
 *
 * Core osc.js Tests
 *
 * Copyright 2014-2016, Colin Clark
 * Licensed under the MIT and GPL 3 licenses.
 */

/*global require*/

var fluid = fluid || require("infusion"),
    jqUnit = jqUnit || fluid.require("node-jqunit"),
    osc = osc || fluid.require("%osc/src/platforms/osc-node.js", require, "osc");

(function () {
    "use strict";

    var QUnit = fluid.registerNamespace("QUnit");

    var oscjsTests = fluid.registerNamespace("oscjsTests");

    /*************
     * Utilities *
     *************/

    oscjsTests.stringToDataView = function (str) {
        var arr = new Uint8Array(str.length),
            dv = new DataView(arr.buffer);

        for (var i = 0; i < str.length; i++) {
            dv.setUint8(i, str.charCodeAt(i));
        }

        return dv;
    };

    oscjsTests.numbersToDataView = function (nums, type, width) {
        var arr = new ArrayBuffer(nums.length * width),
            setter = "set" + type[0].toUpperCase() + type.substring(1),
            dv = new DataView(arr);

        for (var i = 0, offset = 0; i < nums.length; i++, offset = i * width) {
            var num = nums[i];
            dv[setter](offset, num, false);
        }

        return dv;
    };

    oscjsTests.arrayEqual = function (actual, expected, msg) {
        QUnit.equal(actual.length, expected.length, "The array should be the expected length.");
        for (var i = 0; i < actual.length; i++) {
            var actualVal = actual[i],
                expectedVal = expected[i];

            if (typeof actualVal === "object" && typeof actualVal.length === "number") {
                oscjsTests.arrayEqual(actualVal, expectedVal, msg);
            } else {
                QUnit.deepEqual(actualVal, expectedVal, msg);
            }
        }
    };

    oscjsTests.roundTo = function (val, numDecimals) {
        return typeof val === "number" ? parseFloat(val.toFixed(numDecimals)) : val;
    };

    oscjsTests.equalRoundedTo = function (actual, expected, numDecimals, msg) {
        var actualRounded = oscjsTests.roundTo(actual, numDecimals),
            expectedRounded = oscjsTests.roundTo(expected, numDecimals);

        QUnit.equal(actualRounded, expectedRounded, msg + "\nUnrounded value was: " + expected);
    };

    oscjsTests.roundArrayValues = function (arr, numDecimals) {
        var togo = [];

        for (var i = 0; i < arr.length; i++) {
            var val = arr[i];
            var type = typeof val;
            togo[i] = type === "object" ? oscjsTests.roundAllValues(val, numDecimals) :
                oscjsTests.roundTo(val, numDecimals);
        }

        return togo;
    };

    oscjsTests.roundAllValues = function (obj, numDecimals) {
        var togo = {};

        for (var key in obj) {
            var val = obj[key];
            if (osc.isArray(val)) {
                togo[key] = oscjsTests.roundArrayValues(val, numDecimals);
            } else if (typeof val === "object") {
                togo[key] = oscjsTests.roundAllValues(val, numDecimals);
            } else {
                togo[key] = oscjsTests.roundTo(val, numDecimals);
            }
        }

        return togo;
    };

    oscjsTests.deepEqualRounded = function (actual, expected, numDecimals, msg) {
        var roundedActual = oscjsTests.roundAllValues(actual, numDecimals),
            roundedExpected = oscjsTests.roundAllValues(expected, numDecimals);

        QUnit.deepEqual(roundedActual, roundedExpected, msg = "\nUnrounded actual object was: " +
            JSON.stringify(roundedActual));
    };

    oscjsTests.isNonNumberPrimitive = function (val) {
        var type = typeof val;

        return val === null || type === "number" || type === "string" ||
            type === "undefined";
    };

    oscjsTests.messageArgumentsEqual = function (actual, expected, numDecimals, msg) {
        QUnit.equal(actual.length, expected.length, "The arguments should be the expected length.");

        for (var i = 0; i < actual.length; i++) {
            var actualArg = actual[i];
            var expectedArg = expected[i];

            var msgTogo = "Argument #" + i + ": " + msg;

            if (typeof actualArg === "number") {
                oscjsTests.equalRoundedTo(actualArg, expectedArg, numDecimals, msgTogo);
            } else if (oscjsTests.isNonNumberPrimitive(actualArg)) {
                QUnit.equal(actualArg, expectedArg, msgTogo);
            } else if (typeof actualArg === "object" && typeof actualArg.length === "number") {
                oscjsTests.arrayEqual(actualArg, expectedArg, msgTogo);
            } else if (expectedArg instanceof osc.Long) {
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

    fluid.registerNamespace("oscjsTests.strings");
    jqUnit.module("Strings");

    oscjsTests.strings.testRead = function (testSpec) {
        var offsetState = testSpec.offsetState || {
            idx: 0
        };

        jqUnit.test("readString " + testSpec.name, function () {
            var expected = testSpec.rawString,
                dv = oscjsTests.stringToDataView(testSpec.paddedString),
                actual = osc.readString(dv, offsetState);

            QUnit.equal(actual, expected, "The string should have been read correctly.");
            QUnit.equal(offsetState.idx, testSpec.paddedString.length,
                "The offset state should correctly reflect the null padding of the OSC string.");
        });

    };


    oscjsTests.strings.testWrite = function (testSpec) {
        jqUnit.test("writeString " + testSpec.name, function () {
            var expectedDV = oscjsTests.stringToDataView(testSpec.paddedString),
                expected = new Uint8Array(expectedDV.buffer),
                actualBuf = osc.writeString(testSpec.rawString),
                actual = new Uint8Array(actualBuf);

            oscjsTests.arrayEqual(actual, expected, "The string should have been written correctly.");
            QUnit.ok(actualBuf instanceof Uint8Array, "The returned value should be a Uint8Array.");
        });
    };

    oscjsTests.strings.testSpecs = [
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

    oscjsTests.strings.readAndWriteTests = function (testSpecs) {
        for (var i = 0; i < testSpecs.length; i++) {
            var testSpec = testSpecs[i];
            oscjsTests.strings.testRead(testSpec);
            oscjsTests.strings.testWrite(testSpec);
        }
    };

    oscjsTests.strings.readAndWriteTests(oscjsTests.strings.testSpecs);


    oscjsTests.strings.testEncodedObjectArgument = function (objectArg, argEncoder, argDecoder) {
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

        oscjsTests.strings.testEncodedObjectArgument(objectArg, function (arg) {
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

        oscjsTests.strings.testEncodedObjectArgument(objectArg, function (arg) {
            return encodeURIComponent(JSON.stringify(arg));
        }, function (arg) {
            return JSON.parse(decodeURIComponent(arg));
        });
    });


    /***********
     * Numbers *
     ***********/

    jqUnit.module("Numbers");
    fluid.registerNamespace("oscjsTests.numbers");

    oscjsTests.numbers.typeTesters = {
        "int32": {
            dataViewConverter: oscjsTests.numbersToDataView,
            reader: osc.readInt32,
            width: 4
        },
        "float32": {
            dataViewConverter: oscjsTests.numbersToDataView,
            reader: osc.readFloat32,
            width: 4
        }
    };

    oscjsTests.numbers.testReadPrimitive = function (type, arr, expected, offsetState) {
        offsetState = offsetState || {
            idx: 0
        };

        var testMap = oscjsTests.numbers.typeTesters[type],
            dv = testMap.dataViewConverter(arr, type, testMap.width),
            expectedOffsetIdx = offsetState.idx + testMap.width,
            actual = testMap.reader(dv, offsetState);

        oscjsTests.equalRoundedTo(actual, expected, 5, "The correct value should have been read.");
        QUnit.equal(offsetState.idx, expectedOffsetIdx, "The offset state should have been updated appropriately.");
    };

    oscjsTests.numbers.makeReadPrimitiveTester = function (type, testSpec) {
        return function () {
            oscjsTests.numbers.testReadPrimitive(type, testSpec.nums, testSpec.expected, {
                idx: testSpec.offset
            });
        };
    };

    oscjsTests.numbers.readPrimitiveTests = function (testSpecs) {
        for (var type in testSpecs) {
            var specsForType = testSpecs[type];

            for (var i = 0; i < specsForType.length; i++) {
                var spec = specsForType[i];
                jqUnit.test(spec.name, oscjsTests.numbers.makeReadPrimitiveTester(type, spec));
            }
        }
    };

    oscjsTests.numbers.readPrimitiveTestSpecs = {
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

    oscjsTests.numbers.readPrimitiveTests(oscjsTests.numbers.readPrimitiveTestSpecs);


    oscjsTests.numbers.testWritePrimitive = function (testSpec) {
        jqUnit.test(testSpec.writer + " " + testSpec.name, function () {
            var expected = testSpec.expected,
                outBuf = new ArrayBuffer(expected.buffer.byteLength),
                dv = new DataView(outBuf),
                actual = osc[testSpec.writer](testSpec.val, dv, testSpec.offset);

            oscjsTests.arrayEqual(actual, expected, "The value should have been written to the output buffer.");
        });
    };

    oscjsTests.numbers.writePrimitiveTestSpecs = [
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

    oscjsTests.numbers.writePrimitiveTests = function (testSpecs) {
        for (var i = 0; i < testSpecs.length; i++) {
            var testSpec = testSpecs[i];
            oscjsTests.numbers.testWritePrimitive(testSpec);
        }
    };

    oscjsTests.numbers.writePrimitiveTests(oscjsTests.numbers.writePrimitiveTestSpecs);


    /*********
     * Blobs *
     *********/

    jqUnit.module("Blobs");
    fluid.registerNamespace("oscjsTests.blobs");

    oscjsTests.blobs.oscBlobOctets = [
        0, 0, 0, 3,            // Length 3
        0x63, 0x61, 0x74, 0   // raw bytes
    ];
    oscjsTests.blobs.oscBlob = new Uint8Array(oscjsTests.blobs.oscBlobOctets);
    oscjsTests.blobs.oscBlobOctetsWithExtra = oscjsTests.blobs.oscBlobOctets.concat([1, 2, 3, 4]);  // some random stuff afterwards.
    oscjsTests.blobs.oscExtraBlob = new Uint8Array(oscjsTests.blobs.oscBlobOctetsWithExtra);

    oscjsTests.blobs.rawData = new Uint8Array([
        0x63, 0x61, 0x74
    ]);

    jqUnit.test("readBlob", function () {
        var dv = new DataView(oscjsTests.blobs.oscExtraBlob.buffer);
        var expected = oscjsTests.blobs.rawData;

        var offsetState = {
            idx: 0
        };

        var actual = osc.readBlob(dv, offsetState);

        oscjsTests.arrayEqual(actual, expected, "The blob should be returned as-is.");
        QUnit.ok(actual instanceof Uint8Array, "The blob should be returned as a Uint8Array.");
        QUnit.equal(offsetState.idx, 8, "The offset state should have been updated correctly.");
    });


    jqUnit.test("writeBlob", function () {
        var expected = oscjsTests.blobs.oscBlob,
            actual = osc.writeBlob(oscjsTests.blobs.rawData);

        oscjsTests.arrayEqual(new Uint8Array(actual), expected,
            "The data should have been packed into a correctly-formatted OSC blob.");
        QUnit.ok(actual instanceof Uint8Array, "The written blob should be a Uint8Array");
    });


    /*************
     * Time Tags *
     *************/

    jqUnit.module("Time Tags");
    fluid.registerNamespace("oscjsTests.timeTags");

    fluid.defaults("oscjsTests.nowMock", {
        gradeNames: "fluid.modelComponent",

        members: {
            realNowFn: null
        },

        model: {
            nowTime: null,
            lastNowTime: 0
        },

        invokers: {
            now: {
                funcName: "oscjsTests.nowMock.now",
                args: ["{that}"]
            }
        },

        listeners: {
            "onCreate.register": {
                funcName: "oscjsTests.nowMock.register",
                args: ["{that}"]
            },

            "onDestroy.deregister": {
                funcName: "oscjsTests.nowMock.deregister",
                args: ["{that}"]
            }
        }
    });

    oscjsTests.nowMock.register = function (that) {
        that.realNowFn = Date.now;
        Date.now = that.now;
    };

    oscjsTests.nowMock.deregister = function (that) {
        Date.now = that.realNowFn;
    };

    oscjsTests.nowMock.now = function (that) {
        var injectedNow = that.model.nowTime,
            now = injectedNow === null || injectedNow === undefined ? that.realNowFn() : injectedNow;

        that.applier.change("lastNowTime", now);
        return that.model.lastNowTime;
    };

    oscjsTests.testInMockTime = function (testFn) {
        var nowMock = oscjsTests.nowMock();
        testFn(nowMock);
        nowMock.destroy();
    };

    oscjsTests.timeTags.testRead = function (testSpec) {
        jqUnit.test("Read time tag " + testSpec.name, function () {
            oscjsTests.testInMockTime(function (nowMock) {
                var expected = testSpec.timeTag,
                dv = new DataView(testSpec.timeTagBytes.buffer);

            var actual = osc.readTimeTag(dv, {
                idx: 0
            });

            if (expected.native === "NOW") {
                expected.native = nowMock.model.lastNowTime;
            }

            QUnit.deepEqual(actual, expected, "The date should have be read correctly.");
            });
        });
    };

    oscjsTests.timeTags.testWrite = function (testSpec) {
        jqUnit.test("Write time tag " + testSpec.name, function () {
            var expected = testSpec.timeTagBytes,
                actual = osc.writeTimeTag(testSpec.timeTag);

            oscjsTests.arrayEqual(actual, expected, "The raw time tag should have have been written correctly.");
        });
    };

    oscjsTests.timeTags.testSpecs = [
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
                native: "NOW"
            }
        }
    ];

    oscjsTests.timeTags.readAndWriteTests = function (testSpecs) {
        for (var i = 0; i < testSpecs.length; i++) {
            var testSpec = testSpecs[i];
            oscjsTests.timeTags.testRead(testSpec);
            oscjsTests.timeTags.testWrite(testSpec);
        }
    };

    oscjsTests.timeTags.readAndWriteTests(oscjsTests.timeTags.testSpecs);

    jqUnit.test("Write native-only time tag.", function () {
        var testSpec = oscjsTests.timeTags.testSpecs[1],
            expected = testSpec.timeTagBytes,
            timeTag = {
                native: testSpec.timeTag.native
            };

        var actual = osc.writeTimeTag(timeTag);
        oscjsTests.arrayEqual(actual, expected,
            "A time tag with no raw value (only a native value) should be written correctly.");
    });

    oscjsTests.timeTags.testTimeTag = function (actual, expectedJSTime) {
        // Convert the JS time to NTP time.
        // TODO: This appears to return inaccurate values
        // relative to the largely similar implementation it is being used to test against.
        // TODO: Instead, now that the time mock allows clients to
        // specify a known "now", the expected value should be specified in tests manually.
        var expected = osc.jsToNTPTime(expectedJSTime);

        QUnit.equal(actual.raw[0], expected[0], "The generated timestamp should be accurate to the second.");
        QUnit.equal(actual.raw[1], expected[1], "The generated timestamp should be accurate to the NTP fraction");
    };

    jqUnit.test("osc.timeTag now", function () {
        oscjsTests.testInMockTime(function (nowMock) {
            var actual = osc.timeTag();
            oscjsTests.timeTags.testTimeTag(actual, nowMock.model.lastNowTime);

            actual = osc.timeTag(0);
            oscjsTests.timeTags.testTimeTag(actual, nowMock.model.lastNowTime);
        });
    });

    jqUnit.test("osc.timeTag future", function () {
        oscjsTests.testInMockTime(function (nowMock) {
            nowMock.applier.change("nowTime", 1000);

            var actual = osc.timeTag(10.5),
                expected = nowMock.model.nowTime + 10500;

            oscjsTests.timeTags.testTimeTag(actual, expected);

            nowMock.applier.change("nowTime", 2000);
            actual = osc.timeTag(0.1);
            expected = nowMock.model.nowTime + 100;
            oscjsTests.timeTags.testTimeTag(actual, expected);
        });
    });

    jqUnit.test("osc.timeTag past", function () {
        oscjsTests.testInMockTime(function (nowMock) {
            nowMock.applier.change("nowTime", 9000);

            var actual = osc.timeTag(-1000),
                expected = nowMock.model.nowTime - 1000000;

            oscjsTests.timeTags.testTimeTag(actual, expected);

            nowMock.applier.change("nowTime", 222);
            actual = osc.timeTag(-0.01);
            expected = nowMock.model.nowTime - 10;
            oscjsTests.timeTags.testTimeTag(actual, expected);
        });
    });

    jqUnit.test("osc.timeTag relative to provided time", function () {
        var actual = osc.timeTag(0, Date.parse("2015-01-01")),
            expected = Date.parse("2015-01-01");
        oscjsTests.timeTags.testTimeTag(actual, expected);
    });


    /**********************************************
     * Read Type-Only Arguments (e.g. T, F, N, I) *
     **********************************************/

    fluid.registerNamespace("oscjsTests.args");

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

    oscjsTests.args.testRead = function (testSpec) {
        jqUnit.test("Read " + testSpec.name, function () {
            var offsetState = {
                idx: 0
            };

            var expected = testSpec.args,
                dv = new DataView(testSpec.rawArgBuffer.buffer),
                actual = osc.readArguments(dv, false, offsetState);

            oscjsTests.messageArgumentsEqual(actual, expected, testSpec.roundToDecimals,
                "The returned arguments should have the correct values in the correct order.");
        });
    };

    oscjsTests.args.createTypedArguments = function (args, typeTags) {
        return fluid.transform(args, function (arg, i) {
            return osc.isArray(arg) ? oscjsTests.args.createTypedArguments(arg, typeTags[i]) :
                {
                    type: typeTags[i],
                    value: arg
                };
        });
    };

    oscjsTests.args.testWrite = function (testSpec) {
        jqUnit.test("Write " + testSpec.name, function () {
            var argsToWrite = oscjsTests.args.createTypedArguments(testSpec.args, testSpec.typeTags);

            var actual = osc.writeArguments(argsToWrite, {
                metadata: true
            });

            var expected = testSpec.rawArgBuffer;

            QUnit.deepEqual(osc.byteArray(actual), expected,
                "The arguments should have been correctly written.");
        });
    };

    oscjsTests.args.testSpecs = [
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
                new osc.Long(0xFFFFFFFF, 0x7FFFFFFF) // 9223372036854775807
            ],
            roundToDecimals: 3
        }
    ];

    oscjsTests.args.testArguments = function (testSpecs, tester) {
        for (var i = 0; i < testSpecs.length; i++) {
            var testSpec = testSpecs[i];
            tester(testSpec);
        }
    };

    jqUnit.module("readArguments()");
    oscjsTests.args.testArguments(oscjsTests.args.testSpecs, oscjsTests.args.testRead);

    jqUnit.module("writeArguments()");
    oscjsTests.args.testArguments(oscjsTests.args.testSpecs, oscjsTests.args.testWrite);


    /************
     * Messages *
     ************/

    jqUnit.module("Messages");
    fluid.registerNamespace("oscjsTests.messages");

    oscjsTests.messages.readMessageTester = function (testSpec) {
        testSpec.offsetState = testSpec.offsetState || {
            idx: 0
        };

        var expected = testSpec.expectedMessage || testSpec.message,
            dv = new DataView(testSpec.oscMessageBuffer.buffer),
            actual = osc.readMessage(dv, testSpec.options, testSpec.offsetState),
            msg = "The returned message object should match the raw message data.";

        if (testSpec.roundToDecimals !== undefined) {
            oscjsTests.deepEqualRounded(actual, expected, testSpec.roundToDecimals, msg);
        } else {
            QUnit.propEqual(actual, expected, msg);
        }
    };

    oscjsTests.messages.testRead = function (testSpec) {
        jqUnit.test("readMessage " + testSpec.name, function () {
            oscjsTests.messages.readMessageTester(testSpec);
        });
    };

    oscjsTests.messages.writeMessageTester = function (expected, message, options) {
        var actual = osc.writeMessage(message, options);
        oscjsTests.arrayEqual(actual, expected, "The message should have been written correctly.");

        return actual;
    };

    oscjsTests.messages.testWrite = function (testSpec) {
        jqUnit.test("writeMessage " + testSpec.name, function () {
            oscjsTests.messages.writeMessageTester(testSpec.oscMessageBuffer, testSpec.message, testSpec.options);
        });
    };

    oscjsTests.messages.testRoundTrip = function (testSpec) {
        jqUnit.test("Read written message (roundtrip) " + testSpec.name, function () {
            var encoded = oscjsTests.messages.writeMessageTester(testSpec.oscMessageBuffer,
                testSpec.message, testSpec.options);

            var readWrittenSpec = fluid.copy(testSpec);
            readWrittenSpec.oscMessageBuffer = encoded;
            readWrittenSpec.offsetState = null;
            oscjsTests.messages.readMessageTester(readWrittenSpec);
        });
    };


    oscjsTests.messages.testSpecs = [
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

    oscjsTests.messages.testMessages = function (testSpecs) {
        for (var i = 0; i < testSpecs.length; i++) {
            var testSpec = testSpecs[i];
            oscjsTests.messages.testRead(testSpec);
            oscjsTests.messages.testWrite(testSpec);
            oscjsTests.messages.testRoundTrip(testSpec);
        }
    };

    oscjsTests.messages.testMessages(oscjsTests.messages.testSpecs);

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
        oscjsTests.deepEqualRounded(decoded, msg, "The message should have been encoded and decoded correctly.");
    });


    /***********
     * Bundles *
     ***********/

    jqUnit.module("Bundles");
    fluid.registerNamespace("oscjsTests.bundles");

    oscjsTests.bundles.testRead = function (testSpec) {
        jqUnit.test("readBundle " + testSpec.name, function () {
            var expected = testSpec.bundle,
                dv = new DataView(testSpec.bytes.buffer),
                offsetState = {
                    idx: 0
                };

            var actual = osc.readBundle(dv, testSpec.options, offsetState);
            oscjsTests.deepEqualRounded(actual, expected,
                "The bundle should have been read correctly.");
            QUnit.equal(offsetState.idx, dv.byteLength,
                "The offset state should have been adjusted correctly.");
        });
    };

    oscjsTests.bundles.testWrite = function (testSpec) {
        jqUnit.test("writeBundle " + testSpec.name, function () {
            var expected = testSpec.bytes,
                actual = osc.writeBundle(testSpec.bundle, testSpec.options);

            oscjsTests.arrayEqual(actual, expected,
                "The bundle should have been written correctly.");
        });
    };

    oscjsTests.bundles.testSpecs = [
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

    oscjsTests.bundles.testBundles = function (testSpecs) {
        for (var i = 0; i < testSpecs.length; i++) {
            var testSpec = testSpecs[i];
            oscjsTests.bundles.testRead(testSpec);
            oscjsTests.bundles.testWrite(testSpec);
        }
    };

    oscjsTests.bundles.testBundles(oscjsTests.bundles.testSpecs);

    QUnit.test("gh-36: Write Long argument", function () {
        var msg = {
            address: "/cat/slash",
            args: [
                new osc.Long(0xFFFFFFFF, 0x7FFFFFFF) // 9223372036854775807
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

    QUnit.test("gh-102: Send and receive array-typed arguments (based on example code) with type metadata", function () {
        var oscMsg = {
            address: "/float/andArray",
            args: [
                {
                    type: "f",
                    value: 440.0
                },
                [
                    {
                        type: "f",
                        value: 42.0
                    },
                    {
                        type: "f",
                        value: 47.0
                    }
                ]
            ]
        };

        var withMetadataOptions = {
            metadata: true,
            unpackSingleArgs: false
        };

        var encoded = osc.writePacket(oscMsg, withMetadataOptions),
            decoded = osc.readPacket(encoded, withMetadataOptions);

        QUnit.deepEqual(decoded, oscMsg,
            "Messages with array-typed arguments are successfully decoded.");
    });

    QUnit.test("gh-102: Send and receive array-typed arguments (based on example code) without type metadata", function () {
        var oscMsg = {
            address: "/float/andArray",
            args: [440.0, [42.0, 47.0]]
        };

        var withoutMetadataOptions = {
            metadata: false,
            unpackSingleArgs: true
        };

        var encoded = osc.writePacket(oscMsg, withoutMetadataOptions),
            decoded = osc.readPacket(encoded, withoutMetadataOptions);

        QUnit.deepEqual(decoded, oscMsg,
            "Messages with array-typed arguments are successfully decoded.");
    });
}());
