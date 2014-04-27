(function () {

    module("OSC Reader");

    var stringToDataView = function (str) {
        var data = new Uint8Array(str.length),
            dv = new DataView(data.buffer);

        for (var i = 0; i < str.length; i++) {
            dv.setUint8(i, str.charCodeAt(i));
        }

        return dv;
    };

    var testString = function (input, expected, offsetState) {
        offsetState = offsetState || {
            idx: 0
        };

        var dv = stringToDataView(input),
            actual = osc.readString(dv, offsetState);

         equal(actual, expected, "The string should have been read correctly.");
         equal(offsetState.idx, input.length,
             "The offset state should correctly reflect the null padding of the OSC string.")
    };

    var readStringTestSpecs = [
        {
            oscString: "data\u0000\u0000\u0000\u0000",
            expected: "data"
        },
        {
            oscString: "OSC\u0000",
            expected: "OSC"
        }
    ];

    test("readString", function () {
        for (var i = 0; i < readStringTestSpecs.length; i++) {
            var testSpec = readStringTestSpecs[i];
            testString(testSpec.oscString, testSpec.expected);
        }
    });

    var numbersToDataView = function (nums, type, width) {
        var arrayBuf = new ArrayBuffer(nums.length * width),
            setter = "set" + type[0].toUpperCase() + type.substring(1),
            dv = new DataView(arrayBuf);

        for (var i = 0, offset = 0; i < nums.length; i++, offset = i * width) {
            var num = nums[i];
            dv[setter](offset, num, false);
        }

        return dv;
    };

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


    var equalRoundedTo = function (actual, expected, numDecimals, msg) {
        var actualRounded = parseFloat(actual.toFixed(numDecimals)),
            expectedRounded = parseFloat(expected.toFixed(numDecimals));

        equal(actualRounded, expectedRounded, msg + " Unrounded value was: " + expected);
    };

    var testPrimitive = function (type, arr, expected, offsetState) {
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

    var makeTester = function (type, testSpec) {
        return function () {
            testPrimitive(type, testSpec.nums, testSpec.expected, {
                idx: testSpec.offset
            });
        };
    };

    var primitiveTests = function (testSpecs) {
        for (var type in testSpecs) {
            var specsForType = testSpecs[type];

            for (var i = 0; i < specsForType.length; i++) {
                var spec = specsForType[i];
                test(spec.name, makeTester(type, spec));
            }
        }
    };

    var primitiveTestSpecs = {
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

    primitiveTests(primitiveTestSpecs);

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
}());
