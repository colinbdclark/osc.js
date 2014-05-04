var osc = osc || {};

(function () {

    "use strict";

    osc.SEVENTY_YEARS_SECS = 2208988800;

    // Unsupported, non-API function.
    osc.isArray = function (obj) {
        return obj && Object.prototype.toString.call(obj) === "[object Array]";
    };

    /**
     * Wraps the specified object in a DataView.
     *
     * @param {Array-like} obj the object to wrap in a DataView instance
     * @return {DataView} the DataView object
     */
    // Unsupported, non-API function.
    osc.wrapAsDataView = function (obj) {
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

    /**
     * Takes an ArrayBuffer, TypedArray, DataView, Node.js Buffer, or array-like object
     * and returns a Uint8Array view of it.
     *
     * Throws an error if the object isn't suitably array-like.
     *
     * @param {Array-like or Array-wrapping} obj an array-like or array-wrapping object
     * @returns {Uint8Array} a typed array of octets
     */
    // Unsupported, non-API function.
    osc.byteArray = function (obj) {
        if (obj instanceof Uint8Array) {
            return obj;
        }

        var buf = obj.buffer ? obj.buffer : obj;

        if (typeof obj.length === "undefined" || typeof obj === "string") {
            throw new Error("Can't wrap a non-array-like object as Uint8Array. Object was: " + obj);
        }

        return new Uint8Array(buf);
    };

    /**
     * Reads an OSC-formatted string.
     *
     * @param {DataView} dv a DataView containing the raw bytes of the OSC string
     * @param {Object} offsetState an offsetState object used to store the current offset index
     * @return {String} the JavaScript String that was read
     */
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

    /**
     * Writes a JavaScript string as an OSC-formatted string.
     *
     * @param {String} str the string to write
     * @return {Uint8Array} a buffer containing the OSC-formatted string
     */
    osc.writeString = function (str) {
        var terminated = str + "\u0000",
            len = terminated.length,
            paddedLen = (len + 3) & ~0x03,
            buf = new ArrayBuffer(paddedLen),
            arr = new Uint8Array(buf);

        for (var i = 0; i < terminated.length; i++) {
            var charCode = terminated.charCodeAt(i);
            arr[i] = charCode;
        }

        return arr;
    };

    // Unsupported, non-API function.
    osc.readPrimitive = function (dv, readerName, numBytes, offsetState) {
        var val = dv[readerName](offsetState.idx, false);
        offsetState.idx += numBytes;

        return val;
    };

    // Unsupported, non-API function.
    osc.writePrimitive = function (val, dv, writerName, numBytes, offset) {
        offset = offset === undefined ? 0 : offset;

        var arr;
        if (!dv) {
            arr = new Uint8Array(numBytes);
            dv = new DataView(arr.buffer);
        } else {
            arr = new Uint8Array(dv.buffer);
        }

        dv[writerName](offset, val, false);

        return arr;
    };

    /**
     * Reads an OSC int32 ("i") value.
     *
     * @param {DataView} dv a DataView containing the raw bytes
     * @param {Object} offsetState an offsetState object used to store the current offset index into dv
     * @return {Number} the number that was read
     */
    osc.readInt32 = function (dv, offsetState) {
        return osc.readPrimitive(dv, "getInt32", 4, offsetState);
    };

    /**
     * Writes an OSC int32 ("i") value.
     *
     * @param {Number} val the number to write
     * @param {DataView} [dv] a DataView instance to write the number into
     * @param {Number} [offset] an offset into dv
     */
    osc.writeInt32 = function (val, dv, offset) {
        return osc.writePrimitive(val, dv, "setInt32", 4, offset);
    };

    /**
     * Reads an OSC int64 ("h") value.
     *
     * @param {DataView} dv a DataView containing the raw bytes
     * @param {Object} offsetState an offsetState object used to store the current offset index into dv
     * @return {Number} the number that was read
     */
    // TODO: Unit tests.
    osc.readInt64 = function (dv, offsetState) {
        return osc.readPrimitive(dv, "getInt64", 8, offsetState);
    };

    /**
     * Writes an OSC int64 ("h") value.
     *
     * @param {Number} val the number to write
     * @param {DataView} [dv] a DataView instance to write the number into
     * @param {Number} [offset] an offset into dv
     */
    // TODO: Unit tests.
    osc.writeInt64 = function (val, dv, offset) {
        return osc.writePrimitive(val, dv, "setInt64", 8, offset);
    };

    /**
     * Reads an OSC float32 ("f") value.
     *
     * @param {DataView} dv a DataView containing the raw bytes
     * @param {Object} offsetState an offsetState object used to store the current offset index into dv
     * @return {Number} the number that was read
     */
    osc.readFloat32 = function (dv, offsetState) {
        return osc.readPrimitive(dv, "getFloat32", 4, offsetState);
    };

    /**
     * Writes an OSC float32 ("f") value.
     *
     * @param {Number} val the number to write
     * @param {DataView} [dv] a DataView instance to write the number into
     * @param {Number} [offset] an offset into dv
     */
    osc.writeFloat32 = function (val, dv, offset) {
        return osc.writePrimitive(val, dv, "setFloat32", 4, offset);
    };

    /**
     * Reads an OSC float64 ("d") value.
     *
     * @param {DataView} dv a DataView containing the raw bytes
     * @param {Object} offsetState an offsetState object used to store the current offset index into dv
     * @return {Number} the number that was read
     */
    // TODO: Unit tests.
    osc.readFloat64 = function (dv, offsetState) {
        return osc.readPrimitive(dv, "getFloat64", 8, offsetState);
    };

    /**
     * Writes an OSC float64 ("d") value.
     *
     * @param {Number} val the number to write
     * @param {DataView} [dv] a DataView instance to write the number into
     * @param {Number} [offset] an offset into dv
     */
    // TODO: Unit tests.
    osc.writeFloat64 = function (val, dv, offset) {
        return osc.writePrimitive(val, dv, "setFloat64", 8, offset);
    };

    /**
     * Reads an OSC 32-bit ASCII character ("c") value.
     *
     * @param {DataView} dv a DataView containing the raw bytes
     * @param {Object} offsetState an offsetState object used to store the current offset index into dv
     * @return {String} a string containing the read character
     */
    // TODO: Unit tests.
    osc.readChar32 = function (dv, offsetState) {
        var charCode = osc.readPrimitive(dv, "getUint32", 4, offsetState);
        return String.fromCharCode(charCode);
    };

    /**
     * Writes an OSC 32-bit ASCII character ("c") value.
     *
     * @param {String} str the string from which the first character will be written
     * @param {DataView} [dv] a DataView instance to write the character into
     * @param {Number} [offset] an offset into dv
     * @return {String} a string containing the read character
     */
    // TODO: Unit tests.
    osc.readChar32 = function (str, dv, offset) {
        var charCode = str.charCodeAt(0);
        if (charCode === undefined || charCode < -1) {
            return undefined;
        }

        return osc.writePrimitive(charCode, dv, "setUint32", 4, offsetState);
    };

    /**
     * Reads an OSC blob ("b") (i.e. a Uint8Array).
     *
     * @param {DataView} dv a DataView instance to read from
     * @param {Object} offsetState an offsetState object used to store the current offset index into dv
     * @return {Uint8Array} the data that was read
     */
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
        data = osc.byteArray(data);

        var len = data.byteLength,
            paddedLen = (len + 3) & ~0x03,
            offset = 4, // Extra 4 bytes is for the size.
            blobLen = paddedLen + offset,
            arr = new Uint8Array(blobLen),
            dv = new DataView(arr.buffer);

        // Write the size.
        osc.writeInt32(len, dv);

        // Since we're writing to a real ArrayBuffer,
        // we don't need to pad the remaining bytes.
        for (var i = 0; i < len; i++, offset++) {
            dv.setUint8(offset, data[i]);
        }

        return arr;
    };

    /**
     * Reads an OSC true ("T") value by directly returning the JavaScript Boolean "true".
     */
    osc.readTrue = function () {
        return true;
    };

    /**
     * Reads an OSC false ("F") value by directly returning the JavaScript Boolean "false".
     */
    osc.readFalse = function () {
        return false;
    };

    /**
     * Reads an OSC nil ("N") value by directly returning the JavaScript "null" value.
     */
    osc.readNull = function () {
        return null;
    };

    /**
     * Reads an OSC impulse/bang/infinitum ("I") value by directly returning 1.0.
     */
    osc.readImpulse = function () {
        return 1.0;
    };

    /**
     * Reads an OSC time tag.
     *
     * @param {DataView} dv the DataView instance to read from
     * @param {Object} offsetState an offset state object containing the current index into dv
     * @param {Object} a time tag object containing both the raw NTP as well as the converted native (i.e. JS/UNIX) time
     */
    osc.readTimeTag = function (dv, offsetState) {
        var secs1900 = osc.readPrimitive(dv, "getUint32", 4, offsetState),
            frac = osc.readPrimitive(dv, "getUint32", 4, offsetState),
            native = osc.ntpToJSTime(secs1900, frac);

        return {
            raw: [secs1900, frac],
            native: native
        };
    };

    // TODO: Unit tests.
    osc.writeTimeTag = function (timeTag) {
        var raw = timeTag.raw ? timeTag.raw : osc.jsTimeToNTP(timeTag.native),
            arr = new Uint8Array(8), // Two Unit32s.
            dv = new DataView(arr.buffer);

        osc.writeInt32(raw[0], dv, 0);
        osc.writeInt32(raw[1], dv, 4);

        return arr;
    };

    // TODO: Unit tests.
    osc.futureTimeTag = function (secs) {
        var ms = sec * 1000,
            futureMS = Date.now() + ms;

        return {
            native: futureMS
        };
    };

    // TODO: Unit tests.
    osc.ntpToJSTime = function (secs1900, frac) {
        var secs1970 = secs1900 - osc.SEVENTY_YEARS_SECS,
            ms1970 = secs1970 * 1000,
            decimals = (frac / 4294967296) * 1000,
            msTime = ms1970 + decimals;

        return msTime;
    };

    // TODO: Unit tests.
    osc.jsTimeToNTP = function (jsTime) {
        var ms = jsTime | 0,
            secs = (ms / 1000) | 0,
            secs1900 = secs + osc.SEVENTY_YEARS_SECS,
            fracMs = jsTime - ms,
            fracSec = ((fracMs / 1000) * 4294967296) | 0;

        return [secs1900, fracSec];
    };

    /**
     * Reads the argument portion of an OSC message.
     *
     * @param {DataView} dv a DataView instance to read from
     * @param {Object} offsetState the offsetState object that stores the current offset into dv
     * @param {Boolean} [withMetadata] if true, the arguments will be returned with OSC type metadata included
     * @return {Array} an array of the OSC arguments that were read
     */
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
                typeSpec = osc.argumentTypes[argType],
                argReader;

            if (!typeSpec) {
                throw new Error("'" + argType + "' is not a valid OSC type tag. Type tag string was: " +
                    typeTagString);
            }

            var argReader = typeSpec.reader,
                arg = osc[argReader](dv, offsetState);

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

    /**
     * Writes the specified arguments.
     *
     * @param {Array} args an array of arguments
     * @param {Boolean} withMetadata if false, the argument types will be inferred automatically
     * @return {Uint8Array} a buffer containing the OSC-formatted argument type tag and values
     */
    osc.writeArguments = function (args, withMetadata) {
        var argCollection = osc.collectArguments(args, withMetadata);
        return osc.joinParts(argCollection);
    };

    // Unsupported, non-API function.
    osc.joinParts = function (dataCollection) {
        var buf = new Uint8Array(dataCollection.byteLength),
            parts = dataCollection.parts,
            offset = 0;

        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            buf.set(part, offset);
            offset += part.length;
        }

        return buf;
    };

    // Unsupported, non-API function.
    osc.collectArguments = function (args, withMetadata) {
        if (!withMetadata) {
            args = osc.annotateArguments(args);
        }

        var typeTagString = ",",
            len = 0,
            argData = [];

        for (var i = 0; i < args.length; i++) {
            var arg = args[i],
                type = arg.type,
                writer = osc.argumentTypes[type].writer;

            typeTagString += arg.type;
            if (writer) {
                var data = osc[writer](arg.value);
                len += data.byteLength;
                argData.push(data);
            }
        }

        var typeData = osc.writeString(typeTagString);
        len += typeData.byteLength;
        argData.unshift(typeData);

        return {
            byteLength: len,
            parts: argData
        };
    };

    /**
     * Reads an OSC message.
     *
     * @param {DataView} dv a DataView instance to read from
     * @param {Object} [offsetState] an offsetState object that stores the current offset into dv
     * @param {Boolean} [withMetadata] if true, the arguments will be returned with OSC type metadata included. Defaults to false
     * @return {Object} the OSC message, formatted as a JavaScript object containing "address" and "args" properties
     */
    osc.readMessage = function (dv, offsetState, withMetadata) {
        dv = osc.wrapAsDataView(dv);
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

    osc.writeMessage = function (msg, withMetadata) {
        var argCollection = osc.collectArguments(msg.args, withMetadata),
            parts = argCollection.parts,
            addressData = osc.writeString(msg.address);

        parts.unshift(addressData);

        return osc.joinParts({
            byteLength: argCollection.byteLength + addressData.length,
            parts: parts
        });
    };

    // Unsupported, non-API.
    osc.argumentTypes = {
        i: {
            reader: "readInt32",
            writer: "writeInt32"
        },
        f: {
            reader: "readFloat32",
            writer: "writeFloat32"
        },
        s: {
            reader: "readString",
            writer: "writeString"
        },
        S: {
            reader: "readString",
            writer: "writeString"
        },
        b: {
            reader: "readBlob",
            writer: "writeBlob"
        },
        t: {
            reader: "readTimeTag",
            writer: "writeTimeTag"
        },
        T: {
            reader: "readTrue"
        },
        F: {
            reader: "readFalse"
        },
        N: {
            reader: "readNull"
        },
        I: {
            reader: "readImpulse"
        },
        h: {
            reader: "readInt64",
            writer: "writeInt64"
        },
        d: {
            reader: "readFloat64",
            writer: "writeFloat64"
        },
        c: {
            reader: "readChar32",
            writer: "writeChar32"
        }

        // Missing optional OSC 1.0 types:
        // r: "readColor",
        // m: "readMIDI"
    };

    // Unsupported, non-API function.
    osc.inferTypeForArgument = function (arg) {
        var type = typeof arg;

        // TODO: This is freaking hideous.
        switch (type) {
            case "boolean":
                return arg ? "T" : "F";
            case "string":
                return "s";
            case "number":
                return "f";
            case "undefined":
                return "N";
            case "object":
                if (arg === null) {
                    return "N";
                } else if (arg instanceof Uint8Array ||
                    arg instanceof ArrayBuffer ||
                    (typeof Buffer !== "undefined" && arg instanceof Buffer)) {
                    return "b";
                }
            default:
                throw new Error("Can't infer OSC argument type for value: " + arg);
        }
    };

    // Unsupported, non-API function.
    osc.annotateArguments = function (args) {
        if (!osc.isArray(args)) {
            args = [args];
        }

        var annotated = [];
        for (var i = 0; i < args.length; i++) {
            var arg = args[i],
                oscType = osc.inferTypeForArgument(arg);

            annotated.push({
                type: oscType,
                value: arg
            });
        }

        return annotated;
    };


    // If we're in a require-compatible environment, export ourselves.
    if (typeof module !== "undefined" && module.exports) {

        // Check if we're in Node.js and override wrapAsDataView to support
        // native Node.js Buffers using the buffer-dataview library.
        if (typeof Buffer !== "undefined") {
            var BufferDataView = require("buffer-dataview");
            osc.wrapAsDataView = function (obj) {
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
