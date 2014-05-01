(function () {

    QUnit.module("OSC Reader");

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

    var isArray = function (obj) {
        return obj && Object.prototype.toString.call(obj) === "[object Array]";
    };

    var arrayEqual = function (actual, expected, msg) {
        var mismatch = false;
        equal(actual.length, expected.length, "The array should be the expected length.");
        for (var i = 0; i < actual.length; i++) {
            var actualVal = actual[i];
            // We've got an array-like thing here.
            if (typeof actualVal === "object" && typeof actualVal.length === "number") {
                arrayEqual(actualVal, expected[i], msg);
            } else if (actualVal !== expected[i]) {
                mismatch = true;
            }
        }

        ok(!mismatch, msg);
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
            if (isArray(val)) {
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
                 "The offset state should correctly reflect the null padding of the OSC string.")
        });

    };


    var testWriteString = function (testSpec) {
        test("writeString " + testSpec.name, function () {
            var expectedDV = stringToDataView(testSpec.paddedString),
                expected = new Uint8Array(expectedDV.buffer),
                actualBuf = osc.writeString(testSpec.rawString),
                actual = new Uint8Array(actualBuf);

            arrayEqual(actual, expected, "The string should have been written correctly.");
            ok(actualBuf instanceof ArrayBuffer, "The returned value should be an ArrayBuffer.");
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
    }

    stringTests(stringTestSpecs);


    /****************
     * Read Numbers *
     ****************/

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


    /*****************
     * Write Numbers *
     *****************/

    test("writeInt32", function () {
        var val = 32,
            size = 4,
            expected = new Uint8Array([0, 0, 0, 32]),
            actual = osc.writeInt32(val, new DataView(new ArrayBuffer(size)));

        arrayEqual(actual, expected.buffer, "The value should have been written to the output buffer.");
    });

    var testWritePrimitive = function (testSpec) {
        test(testSpec.writer + " " + testSpec.name, function () {
            var expected = testSpec.expected.buffer,
                outBuf = new ArrayBuffer(expected.byteLength),
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
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0
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
        var data = rawData,
            expected = oscBlob,
            actual = osc.writeBlob(rawData);

        arrayEqual(new Uint8Array(actual), expected,
            "The data should have been packed into a correctly-formatted OSC blob.");
        ok(actual instanceof ArrayBuffer, "The written blob should be an ArrayBuffer");
    });


    /**********************************************
     * Read Type-Only Arguments (e.g. T, F, N, I) *
     **********************************************/

    test("Type-only arguments", function () {
        var arr = new Uint8Array(255, 0, 128, 63, 255, 0),
            dv = new DataView(arr.buffer),
            offsetState = {
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

    var testArguments = function (rawArgBuffer, expected, roundToDecimals, offsetState) {
        offsetState = offsetState || {
            idx: 0
        };

        var dv = new DataView(rawArgBuffer.buffer),
            actual = osc.readArguments(dv, offsetState);

        if (roundToDecimals !== undefined) {
            arrayEqualRounded(actual, expected, roundToDecimals, offsetState);
        } else {
            arrayEqual(actual, expected,
                "The returned arguments should have the correct values in the correct order.");
        }
    };

    var argumentTestSpecs = [
        {
            // ",f" | 440
            rawArgBuffer: new Uint8Array([
                0x2c, 0x66, 0, 0,
                0x43, 0xdc, 0 , 0
            ]),
            expected: [440]
        },
        {
            // ",bf" | 3 | [0x63 0x61 0x74], 440
            rawArgBuffer: new Uint8Array([
                0x2c, 0x62, 0x66, 0,
                0, 0, 0, 3,
                0x63, 0x61, 0x74, 0,
                0x43, 0xdc, 0 , 0
            ]),
            expected: [new Uint8Array([
                0x63, 0x61, 0x74,
            ]), 440]
        },
        {
            // ",iisff" | 1000, -1, "hello", 1.1234, 5.678
            rawArgBuffer: new Uint8Array([
                0x2c, 0x69, 0x69, 0x73,
                0x66, 0x66, 0, 0,
                0, 0, 0x3, 0xe8,
                0xff, 0xff, 0xff, 0xff,
                0x68, 0x65, 0x6c, 0x6c,
                0x6f, 0, 0, 0,
                0x3f, 0x9d, 0xf3, 0xb6,
                0x40, 0xb5, 0xb2, 0x2d
            ]),
            expected: [1000, -1, "hello", 1.234, 5.678],
            roundToDecimals: 3
        }
    ];

    test("readArguments", function () {
        for (var i = 0; i < argumentTestSpecs.length; i++) {
            var testSpec = argumentTestSpecs[i];
            testArguments(testSpec.rawArgBuffer, testSpec.expected, testSpec.roundToDecimals);
        }
    });


    /*****************
     * Read Messages *
     *****************/

    var testMessage = function (testSpec) {
        testSpec.offsetState = testSpec.offsetState || {
            idx: 0
        };

        var dv = new DataView(testSpec.rawMessageBuffer.buffer),
            actual = osc.readMessage(dv, testSpec.offsetState, testSpec.withMetadata),
            msg = "The returned message object should match the raw message data.";

        if (testSpec.roundToDecimals !== undefined) {
            roundedDeepEqual(actual, testSpec.expected, testSpec.roundToDecimals, msg);
        } else {
            deepEqual(actual, testSpec.expected, msg);
        }
    };

    var messageTestSpecs = [
        {
            // "/oscillator/4/frequency" | ",f" | 440
            rawMessageBuffer: new Uint8Array([
                0x2f, 0x6f, 0x73, 0x63,
                0x69, 0x6c, 0x6c, 0x61,
                0x74, 0x6f, 0x72, 0x2f,
                0x34, 0x2f, 0x66, 0x72,
                0x65, 0x71, 0x75, 0x65,
                0x6e, 0x63, 0x79, 0,
                0x2c, 0x66, 0, 0,
                0x43, 0xdc, 0, 0
            ]),

            expected: {
                address: "/oscillator/4/frequency",
                args: 440
            }
        },
        {
            rawMessageBuffer: new Uint8Array([
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

            expected: {
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

            withMetadata: true
        }
    ];

    test("readMessage", function () {
        for (var i = 0; i < messageTestSpecs.length; i++) {
            var testSpec = messageTestSpecs[i];
            testMessage(testSpec);
        }
    });

}());
