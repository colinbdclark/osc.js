var osc = osc || {};

(function () {

    osc.readString = function (data, offsetState) {
        var charCodes = [],
            idx = offsetState.idx,
            j,
            charCode;

        for (idx; idx < data.byteLength; idx += 4) {
            for (j = 0; j < 4; j++) {
                charCode = data.getUint8(idx + j);
                if (charCode !== 0) {
                    charCodes.push(charCode);
                } else {
                    break;
                }
            }
        }

        offsetState.idx = idx;
        var str = String.fromCharCode.apply(null, charCodes);

        return str;
    };

    osc.readPrimitive = function (data, readerName, numBytes, offsetState) {
        var val = data[readerName](offsetState.idx, false);
        offsetState.idx += numBytes;
        
        return val;
    };

    osc.readInt32 = function (data, offsetState) {
        return osc.readPrimitive(data, "getInt32", 4, offsetState);
    };

    osc.readFloat32 = function (data, offsetState) {
        return osc.readPrimitive(data, "getFloat32", 4, offsetState);
    };

    osc.readBlob = function (data, offsetState) {
        var dataLength = osc.readInt32(data, offsetState),
            paddedLength = dataLength; // TODO: Calculate this properly!

        return new Uint8Array(data.buffer, offsetState.idx, paddedLength);
    };

    osc.readTrue = function () {
        return true;
    };

    osc.readFalse = function () {
        return false;
    };

    osc.readNull = function () {
        return null;
    };

    osc.readImpulse = function () {
        return 1.0;
    };

    osc.readTimeTag = function (data, offsetState) {
        // TODO: Implement.
    };

    osc.readArguments = function (data, offsetState) {
        var typeTagString = osc.readString(data, offsetState);
        if (typeTagString.indexOf(",") !== 0) {
            // Despite what the OSC 1.0 spec says,
            // it just doesn't make sense to handle messages without type tags.
            // scsynth appears to read such messages as if they have a single
            // Uint8 argument. sclang throws an error.
            throw new Error("A malformed type tag string was found while reading " +
                "the arguments of an OSC message. String was: " +
                typeTagString, " at offset: " + offState.idx);
        }

        var argTypes = typeTagString.substring(1).split(""),
            args = [],
            i,
            argType,
            argReader,
            arg;

        for (i = 0; i < argTypes.length; i++) {
            argType = argTypes[i];
            argReader = osc.argumentReaders[argType];
            arg = osc[argReader](data, offsetState);
            args.push(arg);
        }

        return args;
    };

    osc.readMessage = function (data, offsetState) {
        var address = osc.readString(data, offsetState);
        if (address.indexOf("/") !== 0) {
            throw new Error("A malformed OSC address was found while reading " +
                " an OSC message. String was: " + address);
        }

        var args = osc.readArguments(data, offsetState);
        if (args.length === 1) {
            args = args[0];
        }

        var message = {};
        message[address] = args;

        return message;
    };

    osc.argumentReaders = {
        i: "readInt32",
        f: "readFloat32",
        s: "readString",
        b: "readBlob",
        T: "readTrue",
        F: "readFalse",
        N: "readNull",
        I: "readImpulse",
        S: "readString",
        t: "readTimeTag"

        // Missing optional OSC 1.0 types:
        // h: "readInt64",
        // d: "readFloat64",
        // c: "readChar32",
        // r: "readColor",
        // m: "readMIDI"
    };


    // If we're in a require-compatible environment, export ourselves.
    if (typeof this.module !== "undefined") {
        module.exports = osc;
    }

}());
