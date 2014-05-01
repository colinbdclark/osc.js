var osc = osc || {};

(function () {

    /**
     * Takes an ArrayBuffer, TypedArray, DataView, Node.js Buffer, or array-like object
     * and returns a Uint8Array view of it.
     *
     * Throws an error if the object isn't suitably array-like.
     *
     * @param {Array-like or Array-wrapping} obj an array-like or array-wrapping object
     * @returns {Uint8Array} a typed array of octets
     */
    osc.normalizeByteArray = function (obj) {
        if (obj instanceof Uint8Array) {
            return obj;
        }

        var buf = obj.buffer ? obj.buffer : obj;

        if (typeof obj.length === "undefined" || typeof obj === "string") {
            throw new Error("Can't write from a non-array-like object: " + obj);
        }

        return new Uint8Array(buf);
    };

    osc.readString = function (dv, offsetState) {
        var charCodes = [],
            idx = offsetState.idx;

        for (; idx < dv.byteLength; idx++) {
            var charCode = dv.getUint8(idx);
            if (charCode !== 0) {
                charCodes.push(charCode);
            } else {
                idx++;
                break;
            }
        }

        // Round to the nearest 4-byte block.
        idx = (idx + 3) & ~0x03;
        offsetState.idx = idx;

        return String.fromCharCode.apply(null, charCodes);
    };

    osc.readPrimitive = function (dv, readerName, numBytes, offsetState) {
        var val = dv[readerName](offsetState.idx, false);
        offsetState.idx += numBytes;

        return val;
    };

    osc.readInt32 = function (dv, offsetState) {
        return osc.readPrimitive(dv, "getInt32", 4, offsetState);
    };

    osc.readFloat32 = function (dv, offsetState) {
        return osc.readPrimitive(dv, "getFloat32", 4, offsetState);
    };

    osc.writePrimitive = function (val, dv, writerName, numBytes, offset) {
        offset = offset === undefined ? 0 : offset;
        dv[writerName](offset, val, false);

        return dv.buffer;
    };

    osc.writeInt32 = function (val, dv, offset) {
        return osc.writePrimitive(val, dv, "setInt32", 4, offset);
    };

    osc.writeFloat32 = function (val, dv, offset) {
        return osc.writePrimitive(val, dv, "setFloat32", 4, offset);
    };

    osc.readBlob = function (dv, offsetState) {
        var len = osc.readInt32(dv, offsetState),
            paddedLen = (len + 3) & ~0x03,
            blob = new Uint8Array(dv.buffer, offsetState.idx, len);

        offsetState.idx += paddedLen;

        return blob;
    };

    /**
     * Writes a raw collection of bytes to a new ArrayBuffer.
     *
     * @param {Array-like} data a collection of octets
     * @return {ArrayBuffer} a buffer containing the OSC-formatted blob
     */
    osc.writeBlob = function (data) {
        data = osc.normalizeByteArray(data);

        var len = data.byteLength,
            paddedLen = (len + 3) & ~0x03,
            offset = 4, // Extra 4 bytes is for the size.
            msgLen = paddedLen + offset,
            msgBuf = new ArrayBuffer(msgLen),
            dv = new DataView(msgBuf);

        // Write the size.
        osc.writeInt32(len, dv);

        // Since we're writing to a real ArrayBuffer,
        // we don't need to pad the remaining bytes.
        for (var i = 0; i < len; i++, offset++) {
            dv.setUint8(offset, data[i]);
        }

        return dv.buffer;
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

    osc.readTimeTag = function (dv, offsetState) {
        // TODO: Implement.
    };

    osc.readArguments = function (dv, offsetState, withMetadata) {
        var typeTagString = osc.readString(dv, offsetState);
        if (typeTagString.indexOf(",") !== 0) {
            // Despite what the OSC 1.0 spec says,
            // it just doesn't make sense to handle messages without type tags.
            // scsynth appears to read such messages as if they have a single
            // Uint8 argument. sclang throws an error if the type tag is omitted.
            throw new Error("A malformed type tag string was found while reading " +
                "the arguments of an OSC message. String was: " +
                typeTagString, " at offset: " + offsetState.idx);
        }

        var argTypes = typeTagString.substring(1).split(""),
            args = [];

        for (var i = 0; i < argTypes.length; i++) {
            var argType = argTypes[i],
                argReader = osc.argumentReaders[argType];

            if (!argReader) {
                throw new Error("'" + argType + "' is not a valid OSC type tag. Type tag string was: " +
                    typeTagString);
            }

            var arg = osc[argReader](dv, offsetState);

            if (withMetadata) {
                arg = {
                    type: argType,
                    value: arg
                };
            }

            args.push(arg);
        }

        return args;
    };

    osc.readMessage = function (dv, offsetState, withMetadata) {
        dv = osc.makeDataView(dv);
        offsetState = offsetState || {
            idx: 0
        };

        var address = osc.readString(dv, offsetState);
        if (address.indexOf("/") !== 0) {
            throw new Error("A malformed OSC address was found while reading " +
                "an OSC message. String was: " + address);
        }

        var args = osc.readArguments(dv, offsetState, withMetadata);
        if (args.length === 1) {
            args = args[0];
        }

        var message = {
            address: address,
            args: args
        };

        return message;
    };

    osc.makeDataView = function (obj) {
        if (obj instanceof DataView) {
            return obj;
        }

        if (obj.buffer) {
            return new DataView(obj.buffer);
        }

        if (obj instanceof ArrayBuffer) {
            return new DataView(obj);
        }

        return new DataView(new Uint8Array(obj));
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
    if (typeof module !== "undefined" && module.exports) {

        // Check if we're in Node.js and override makeDataView to support
        // native Node.js Buffers using the buffer-dataview library.
        if (typeof Buffer !== "undefined") {
            var BufferDataView = require("buffer-dataview");
            osc.makeDataView = function (obj) {
                if (obj instanceof DataView || obj instanceof BufferDataView) {
                    return obj;
                }

                if (obj instanceof Buffer) {
                    return new BufferDataView(obj);
                }

                if (obj.buffer) {
                    return new DataView(obj.buffer);
                }

                if (obj instanceof ArrayBuffer) {
                    return new DataView(obj);
                }

                return new DataView(new Uint8Array(obj));
            };
        }

        module.exports = osc;
    }

}());
