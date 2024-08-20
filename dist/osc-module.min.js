/*! osc.js 2.4.5, Copyright 2024 Colin Clark | github.com/colinbdclark/osc.js */
((i, o) => {
    "object" == typeof exports ? (i.osc = exports, o(0, require("slip"), require("EventEmitter"), require("long"))) : "function" == typeof define && define.amd ? define([ "exports", "slip", "EventEmitter", "long" ], function(e, t, r, n) {
        return i.osc = e, o(0, t, r, n);
    }) : (i.osc = {}, o(0, slip, EventEmitter));
})(this, function(e, n, t, r) {
    (c = c || {}).SECS_70YRS = 2208988800, c.TWO_32 = 4294967296, c.defaults = {
        metadata: !1,
        unpackSingleArgs: !0
    }, c.isCommonJS = !("undefined" == typeof module || !module.exports), c.isNode = c.isCommonJS && "undefined" == typeof window, 
    c.isElectron = !("undefined" == typeof process || !process.versions || !process.versions.electron), 
    c.isBufferEnv = c.isNode || c.isElectron, c.isArray = function(e) {
        return e && "[object Array]" === Object.prototype.toString.call(e);
    }, c.isTypedArrayView = function(e) {
        return e.buffer && e.buffer instanceof ArrayBuffer;
    }, c.isBuffer = function(e) {
        return c.isBufferEnv && e instanceof Buffer;
    }, c.Long = void 0 !== r ? r : c.isNode ? require("long") : void 0, c.TextDecoder = "undefined" != typeof TextDecoder ? new TextDecoder("utf-8") : "undefined" != typeof util && (util.TextDecoder, 
    1) ? new util.TextDecoder("utf-8") : void 0, c.TextEncoder = "undefined" != typeof TextEncoder ? new TextEncoder("utf-8") : "undefined" != typeof util && (util.TextEncoder, 
    1) ? new util.TextEncoder("utf-8") : void 0, c.dataView = function(e, t, r) {
        return e.buffer ? new DataView(e.buffer, t, r) : e instanceof ArrayBuffer ? new DataView(e, t, r) : new DataView(new Uint8Array(e), t, r);
    }, c.byteArray = function(e) {
        if (e instanceof Uint8Array) return e;
        var t = e.buffer || e;
        if (t instanceof ArrayBuffer || void 0 !== t.length && "string" != typeof t) return new Uint8Array(t);
        throw new Error("Can't wrap a non-array-like object as Uint8Array. Object was: " + JSON.stringify(e, null, 2));
    }, c.nativeBuffer = function(e) {
        return c.isBufferEnv ? c.isBuffer(e) ? e : Buffer.from(e.buffer ? e : new Uint8Array(e)) : c.isTypedArrayView(e) ? e : new Uint8Array(e);
    }, c.copyByteArray = function(e, t, r) {
        if (c.isTypedArrayView(e) && c.isTypedArrayView(t)) t.set(e, r); else for (var n = void 0 === r ? 0 : r, i = Math.min(t.length - r, e.length), o = 0, a = n; o < i; o++, 
        a++) t[a] = e[o];
        return t;
    }, c.readString = function(e, t) {
        for (var r = [], n = t.idx; n < e.byteLength; n++) {
            var i = e.getUint8(n);
            if (0 === i) {
                n++;
                break;
            }
            r.push(i);
        }
        return t.idx = n = n + 3 & -4, (c.isBufferEnv ? c.readString.withBuffer : c.TextDecoder ? c.readString.withTextDecoder : c.readString.raw)(r);
    }, c.readString.raw = function(e) {
        for (var t = "", r = 0; r < e.length; r += 1e4) t += String.fromCharCode.apply(null, e.slice(r, r + 1e4));
        return t;
    }, c.readString.withTextDecoder = function(e) {
        e = new Int8Array(e);
        return c.TextDecoder.decode(e);
    }, c.readString.withBuffer = function(e) {
        return Buffer.from(e).toString("utf-8");
    }, c.writeString = function(e) {
        for (var t, r = c.isBufferEnv ? c.writeString.withBuffer : c.TextEncoder ? c.writeString.withTextEncoder : null, n = e + "\0", i = (r && (t = r(n)), 
        (r ? t : n).length), o = new Uint8Array(i + 3 & -4), a = 0; a < i - 1; a++) {
            var s = r ? t[a] : n.charCodeAt(a);
            o[a] = s;
        }
        return o;
    }, c.writeString.withTextEncoder = function(e) {
        return c.TextEncoder.encode(e);
    }, c.writeString.withBuffer = function(e) {
        return Buffer.from(e);
    }, c.readPrimitive = function(e, t, r, n) {
        e = e[t](n.idx, !1);
        return n.idx += r, e;
    }, c.writePrimitive = function(e, t, r, n, i) {
        var o;
        return i = void 0 === i ? 0 : i, t ? o = new Uint8Array(t.buffer) : (o = new Uint8Array(n), 
        t = new DataView(o.buffer)), t[r](i, e, !1), o;
    }, c.readInt32 = function(e, t) {
        return c.readPrimitive(e, "getInt32", 4, t);
    }, c.writeInt32 = function(e, t, r) {
        return c.writePrimitive(e, t, "setInt32", 4, r);
    }, c.readInt64 = function(e, t) {
        var r = c.readPrimitive(e, "getInt32", 4, t), e = c.readPrimitive(e, "getInt32", 4, t);
        return c.Long ? new c.Long(e, r) : {
            high: r,
            low: e,
            unsigned: !1
        };
    }, c.writeInt64 = function(e, t, r) {
        var n = new Uint8Array(8);
        return n.set(c.writePrimitive(e.high, t, "setInt32", 4, r), 0), n.set(c.writePrimitive(e.low, t, "setInt32", 4, r + 4), 4), 
        n;
    }, c.readFloat32 = function(e, t) {
        return c.readPrimitive(e, "getFloat32", 4, t);
    }, c.writeFloat32 = function(e, t, r) {
        return c.writePrimitive(e, t, "setFloat32", 4, r);
    }, c.readFloat64 = function(e, t) {
        return c.readPrimitive(e, "getFloat64", 8, t);
    }, c.writeFloat64 = function(e, t, r) {
        return c.writePrimitive(e, t, "setFloat64", 8, r);
    }, c.readChar32 = function(e, t) {
        e = c.readPrimitive(e, "getUint32", 4, t);
        return String.fromCharCode(e);
    }, c.writeChar32 = function(e, t, r) {
        e = e.charCodeAt(0);
        if (!(void 0 === e || e < -1)) return c.writePrimitive(e, t, "setUint32", 4, r);
    }, c.readBlob = function(e, t) {
        var r = c.readInt32(e, t), n = r + 3 & -4, e = new Uint8Array(e.buffer, t.idx, r);
        return t.idx += n, e;
    }, c.writeBlob = function(e) {
        var t = (e = c.byteArray(e)).byteLength, r = new Uint8Array(4 + (t + 3 & -4)), n = new DataView(r.buffer);
        return c.writeInt32(t, n), r.set(e, 4), r;
    }, c.readMIDIBytes = function(e, t) {
        e = new Uint8Array(e.buffer, t.idx, 4);
        return t.idx += 4, e;
    }, c.writeMIDIBytes = function(e) {
        e = c.byteArray(e);
        var t = new Uint8Array(4);
        return t.set(e), t;
    }, c.readColor = function(e, t) {
        var e = new Uint8Array(e.buffer, t.idx, 4), r = e[3] / 255;
        return t.idx += 4, {
            r: e[0],
            g: e[1],
            b: e[2],
            a: r
        };
    }, c.writeColor = function(e) {
        var t = Math.round(255 * e.a);
        return new Uint8Array([ e.r, e.g, e.b, t ]);
    }, c.readTrue = function() {
        return !0;
    }, c.readFalse = function() {
        return !1;
    }, c.readNull = function() {
        return null;
    }, c.readImpulse = function() {
        return 1;
    }, c.readTimeTag = function(e, t) {
        var r = c.readPrimitive(e, "getUint32", 4, t), e = c.readPrimitive(e, "getUint32", 4, t);
        return {
            raw: [ r, e ],
            native: 0 === r && 1 === e ? Date.now() : c.ntpToJSTime(r, e)
        };
    }, c.writeTimeTag = function(e) {
        var e = e.raw || c.jsToNTPTime(e.native), t = new Uint8Array(8), r = new DataView(t.buffer);
        return c.writeInt32(e[0], r, 0), c.writeInt32(e[1], r, 4), t;
    }, c.timeTag = function(e, t) {
        e = e || 0;
        var t = (t = t || Date.now()) / 1e3, r = Math.floor(t), t = t - r, n = Math.floor(e), t = t + (e - n);
        return 1 < t && (n += e = Math.floor(t), t = t - e), {
            raw: [ r + n + c.SECS_70YRS, Math.round(c.TWO_32 * t) ]
        };
    }, c.ntpToJSTime = function(e, t) {
        return 1e3 * (e - c.SECS_70YRS + t / c.TWO_32);
    }, c.jsToNTPTime = function(e) {
        var e = e / 1e3, t = Math.floor(e);
        return [ t + c.SECS_70YRS, Math.round(c.TWO_32 * (e - t)) ];
    }, c.readArguments = function(e, t, r) {
        var n = c.readString(e, r);
        if (0 !== n.indexOf(",")) throw new Error("A malformed type tag string was found while reading the arguments of an OSC message. String was: " + n, " at offset: " + r.idx);
        var i = n.substring(1).split(""), o = [];
        return c.readArgumentsIntoArray(o, i, n, e, t, r), o;
    }, c.readArgument = function(e, t, r, n, i) {
        var o = c.argumentTypes[e];
        if (o) return o = o.reader, o = c[o](r, i), n.metadata ? {
            type: e,
            value: o
        } : o;
        throw new Error("'" + e + "' is not a valid OSC type tag. Type tag string was: " + t);
    }, c.readArgumentsIntoArray = function(e, t, r, n, i, o) {
        for (var a = 0; a < t.length; ) {
            var s = t[a];
            if ("[" === s) {
                var u = t.slice(a + 1), d = u.indexOf("]");
                if (d < 0) throw new Error("Invalid argument type tag: an open array type tag ('[') was found without a matching close array tag ('[]'). Type tag was: " + r);
                u = u.slice(0, d), u = c.readArgumentsIntoArray([], u, r, n, i, o);
                a += d + 2;
            } else u = c.readArgument(s, r, n, i, o), a++;
            e.push(u);
        }
        return e;
    }, c.writeArguments = function(e, t) {
        e = c.collectArguments(e, t);
        return c.joinParts(e);
    }, c.joinParts = function(e) {
        for (var t = new Uint8Array(e.byteLength), r = e.parts, n = 0, i = 0; i < r.length; i++) {
            var o = r[i];
            c.copyByteArray(o, t, n), n += o.length;
        }
        return t;
    }, c.addDataPart = function(e, t) {
        t.parts.push(e), t.byteLength += e.length;
    }, c.writeArrayArguments = function(e, t) {
        for (var r = "[", n = 0; n < e.length; n++) r += c.writeArgument(e[n], t);
        return r += "]";
    }, c.writeArgument = function(e, t) {
        var r;
        return c.isArray(e) ? c.writeArrayArguments(e, t) : (r = e.type, (r = c.argumentTypes[r].writer) && (r = c[r](e.value), 
        c.addDataPart(r, t)), e.type);
    }, c.collectArguments = function(e, t, r) {
        c.isArray(e) || (e = void 0 === e ? [] : [ e ]), r = r || {
            byteLength: 0,
            parts: []
        }, t.metadata || (e = c.annotateArguments(e));
        for (var n = ",", t = r.parts.length, i = 0; i < e.length; i++) {
            var o = e[i];
            n += c.writeArgument(o, r);
        }
        var a = c.writeString(n);
        return r.byteLength += a.byteLength, r.parts.splice(t, 0, a), r;
    }, c.readMessage = function(e, t, r) {
        t = t || c.defaults;
        var e = c.dataView(e, e.byteOffset, e.byteLength), n = c.readString(e, r = r || {
            idx: 0
        });
        return c.readMessageContents(n, e, t, r);
    }, c.readMessageContents = function(e, t, r, n) {
        if (0 !== e.indexOf("/")) throw new Error("A malformed OSC address was found while reading an OSC message. String was: " + e);
        t = c.readArguments(t, r, n);
        return {
            address: e,
            args: 1 === t.length && r.unpackSingleArgs ? t[0] : t
        };
    }, c.collectMessageParts = function(e, t, r) {
        return r = r || {
            byteLength: 0,
            parts: []
        }, c.addDataPart(c.writeString(e.address), r), c.collectArguments(e.args, t, r);
    }, c.writeMessage = function(e, t) {
        if (t = t || c.defaults, c.isValidMessage(e)) return t = c.collectMessageParts(e, t), 
        c.joinParts(t);
        throw new Error("An OSC message must contain a valid address. Message was: " + JSON.stringify(e, null, 2));
    }, c.isValidMessage = function(e) {
        return e.address && 0 === e.address.indexOf("/");
    }, c.readBundle = function(e, t, r) {
        return c.readPacket(e, t, r);
    }, c.collectBundlePackets = function(e, t, r) {
        r = r || {
            byteLength: 0,
            parts: []
        }, c.addDataPart(c.writeString("#bundle"), r), c.addDataPart(c.writeTimeTag(e.timeTag), r);
        for (var n = 0; n < e.packets.length; n++) {
            var i = e.packets[n], i = (i.address ? c.collectMessageParts : c.collectBundlePackets)(i, t);
            r.byteLength += i.byteLength, c.addDataPart(c.writeInt32(i.byteLength), r), 
            r.parts = r.parts.concat(i.parts);
        }
        return r;
    }, c.writeBundle = function(e, t) {
        if (!c.isValidBundle(e)) throw new Error("An OSC bundle must contain 'timeTag' and 'packets' properties. Bundle was: " + JSON.stringify(e, null, 2));
        t = t || c.defaults;
        e = c.collectBundlePackets(e, t);
        return c.joinParts(e);
    }, c.isValidBundle = function(e) {
        return void 0 !== e.timeTag && void 0 !== e.packets;
    }, c.readBundleContents = function(e, t, r, n) {
        for (var i = c.readTimeTag(e, r), o = []; r.idx < n; ) {
            var a = c.readInt32(e, r), a = r.idx + a, a = c.readPacket(e, t, r, a);
            o.push(a);
        }
        return {
            timeTag: i,
            packets: o
        };
    }, c.readPacket = function(e, t, r, n) {
        var e = c.dataView(e, e.byteOffset, e.byteLength), i = (n = void 0 === n ? e.byteLength : n, 
        c.readString(e, r = r || {
            idx: 0
        })), o = i[0];
        if ("#" === o) return c.readBundleContents(e, t, r, n);
        if ("/" === o) return c.readMessageContents(i, e, t, r);
        throw new Error("The header of an OSC packet didn't contain an OSC address or a #bundle string. Header was: " + i);
    }, c.writePacket = function(e, t) {
        if (c.isValidMessage(e)) return c.writeMessage(e, t);
        if (c.isValidBundle(e)) return c.writeBundle(e, t);
        throw new Error("The specified packet was not recognized as a valid OSC message or bundle. Packet was: " + JSON.stringify(e, null, 2));
    }, c.argumentTypes = {
        i: {
            reader: "readInt32",
            writer: "writeInt32"
        },
        h: {
            reader: "readInt64",
            writer: "writeInt64"
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
        d: {
            reader: "readFloat64",
            writer: "writeFloat64"
        },
        c: {
            reader: "readChar32",
            writer: "writeChar32"
        },
        r: {
            reader: "readColor",
            writer: "writeColor"
        },
        m: {
            reader: "readMIDIBytes",
            writer: "writeMIDIBytes"
        }
    }, c.inferTypeForArgument = function(e) {
        switch (typeof e) {
          case "boolean":
            return e ? "T" : "F";

          case "string":
            return "s";

          case "number":
            return "f";

          case "undefined":
            return "N";

          case "object":
            if (null === e) return "N";
            if (e instanceof Uint8Array || e instanceof ArrayBuffer) return "b";
            if ("number" == typeof e.high && "number" == typeof e.low) return "h";
        }
        throw new Error("Can't infer OSC argument type for value: " + JSON.stringify(e, null, 2));
    }, c.annotateArguments = function(e) {
        for (var t = [], r = 0; r < e.length; r++) {
            var n = e[r];
            n = "object" == typeof n && n.type && void 0 !== n.value ? n : c.isArray(n) ? c.annotateArguments(n) : {
                type: c.inferTypeForArgument(n),
                value: n
            }, t.push(n);
        }
        return t;
    }, c.isCommonJS && (module.exports = c);
    var c = c || require("./osc.js"), n = n || require("slip"), t = t || require("events").EventEmitter;
    return c.supportsSerial = !1, c.firePacketEvents = function(e, t, r, n) {
        t.address ? e.emit("message", t, r, n) : c.fireBundleEvents(e, t, r, n);
    }, c.fireBundleEvents = function(e, t, r, n) {
        e.emit("bundle", t, r, n);
        for (var i = 0; i < t.packets.length; i++) {
            var o = t.packets[i];
            c.firePacketEvents(e, o, t.timeTag, n);
        }
    }, c.fireClosedPortSendError = function(e, t) {
        e.emit("error", t = t || "Can't send packets on a closed osc.Port object. Please open (or reopen) this Port by calling open().");
    }, c.Port = function(e) {
        this.options = e || {}, this.on("data", this.decodeOSC.bind(this));
    }, (r = c.Port.prototype = Object.create(t.prototype)).constructor = c.Port, 
    r.send = function(e) {
        var t = Array.prototype.slice.call(arguments), e = this.encodeOSC(e), e = c.nativeBuffer(e);
        t[0] = e, this.sendRaw.apply(this, t);
    }, r.encodeOSC = function(e) {
        var t;
        e = e.buffer || e;
        try {
            t = c.writePacket(e, this.options);
        } catch (e) {
            this.emit("error", e);
        }
        return t;
    }, r.decodeOSC = function(e, t) {
        e = c.byteArray(e), this.emit("raw", e, t);
        try {
            var r = c.readPacket(e, this.options);
            this.emit("osc", r, t), c.firePacketEvents(this, r, void 0, t);
        } catch (e) {
            this.emit("error", e);
        }
    }, c.SLIPPort = function(e) {
        var t = this, e = this.options = e || {}, e = (e.useSLIP = void 0 === e.useSLIP || e.useSLIP, 
        this.decoder = new n.Decoder({
            onMessage: this.decodeOSC.bind(this),
            onError: function(e) {
                t.emit("error", e);
            }
        }), e.useSLIP ? this.decodeSLIPData : this.decodeOSC);
        this.on("data", e.bind(this));
    }, (r = c.SLIPPort.prototype = Object.create(c.Port.prototype)).constructor = c.SLIPPort, 
    r.encodeOSC = function(e) {
        e = e.buffer || e;
        try {
            var t = c.writePacket(e, this.options), r = n.encode(t);
        } catch (e) {
            this.emit("error", e);
        }
        return r;
    }, r.decodeSLIPData = function(e, t) {
        this.decoder.decode(e, t);
    }, c.relay = function(e, t, r, n, i, o) {
        r = r || "message", n = n || "send", i = i || function() {}, o = o ? [ null ].concat(o) : [];
        function a(e) {
            o[0] = e, e = i(e), t[n].apply(t, o);
        }
        return e.on(r, a), {
            eventName: r,
            listener: a
        };
    }, c.relayPorts = function(e, t, r) {
        var n = r.raw ? "raw" : "osc";
        return c.relay(e, t, n, r.raw ? "sendRaw" : "send", r.transform);
    }, c.stopRelaying = function(e, t) {
        e.removeListener(t.eventName, t.listener);
    }, c.Relay = function(e, t, r) {
        (this.options = r || {}).raw = !1, this.port1 = e, this.port2 = t, this.listen();
    }, (r = c.Relay.prototype = Object.create(t.prototype)).constructor = c.Relay, 
    r.open = function() {
        this.port1.open(), this.port2.open();
    }, r.listen = function() {
        this.port1Spec && this.port2Spec && this.close(), this.port1Spec = c.relayPorts(this.port1, this.port2, this.options), 
        this.port2Spec = c.relayPorts(this.port2, this.port1, this.options);
        var e = this.close.bind(this);
        this.port1.on("close", e), this.port2.on("close", e);
    }, r.close = function() {
        c.stopRelaying(this.port1, this.port1Spec), c.stopRelaying(this.port2, this.port2Spec), 
        this.emit("close", this.port1, this.port2);
    }, "undefined" != typeof module && module.exports && (module.exports = c), (c = c || require("./osc.js")).WebSocket = "undefined" != typeof WebSocket ? WebSocket : require("ws"), 
    c.WebSocketPort = function(e) {
        c.Port.call(this, e), this.on("open", this.listen.bind(this)), this.socket = e.socket, 
        this.socket && (1 === this.socket.readyState ? (c.WebSocketPort.setupSocketForBinary(this.socket), 
        this.emit("open", this.socket)) : this.open());
    }, (t = c.WebSocketPort.prototype = Object.create(c.Port.prototype)).constructor = c.WebSocketPort, 
    t.open = function() {
        (!this.socket || 1 < this.socket.readyState) && (this.socket = new c.WebSocket(this.options.url)), 
        c.WebSocketPort.setupSocketForBinary(this.socket);
        var t = this;
        this.socket.onopen = function() {
            t.emit("open", t.socket);
        }, this.socket.onerror = function(e) {
            t.emit("error", e);
        };
    }, t.listen = function() {
        var t = this;
        this.socket.onmessage = function(e) {
            t.emit("data", e.data, e);
        }, this.socket.onclose = function(e) {
            t.emit("close", e);
        }, t.emit("ready");
    }, t.sendRaw = function(e) {
        this.socket && 1 === this.socket.readyState ? this.socket.send(e) : c.fireClosedPortSendError(this);
    }, t.close = function(e, t) {
        this.socket.close(e, t);
    }, c.WebSocketPort.setupSocketForBinary = function(e) {
        e.binaryType = c.isNode ? "nodebuffer" : "arraybuffer";
    }, c;
});