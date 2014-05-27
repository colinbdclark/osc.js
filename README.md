osc.js
======

osc.js is a library for reading and writing [Open Sound Control](http://opensoundcontrol.org) messages in JavaScript. It works in both Node.js and in a web browser.

Why osc.js?
-----------

There are several other OSC libraries available for JavaScript. However, they all depend on Node.js-specific APIs. This means that they can't be run in a browser or on web-only platforms such as Chrome OS. osc.js uses only cross-platform APIs (`TypedArrays` and `DataView`), ensuring that it can run in any modern JavaScript environment.

What Does it Do?
----------------

osc.js reads and writes OSC-formatted binary data into plain JavaScript objects. It provides adaptors for Node.js Buffer objects as well as standard ArrayBuffers.

osc.js is transport agnostic. You can receive OSC data in whatever manner works best for your application: serial port APIs such as node-serialport or chrome.serial, socket APIs such as Node.js dgram or WebRTC data channels, WebSockets or binary XHR messages should all work. Connect osc.js up to your source of incoming/outgoing data, and you're all set. This approach is consistent with the design of Open Sound Control as a _content format_ that is independent from its means of transport.

In addition to the low-level encoder/decoder functions, osc.js also provides a comprehensive set of transport objects, called <code>Port</code>s, for use in standard browsers, Chrome Apps, and Node.js applications. These include:

<table>
    <tr>
        <th>Transport</th>
        <th>Supported Platforms</th>
    </tr>
    <tr>
        <td>UDP</td>
        <td>Node.js, Chrome Apps</td>
    </tr>
    <tr>
        <td>Serial port</td>
        <td>Node.js, Chrome Apps</td>
    </tr>
    <tr>
        <td>Web Sockets</td>
        <td>Browsers, Node.js, Chrome Apps</td>
    </tr>
    <tr>
        <td>TCP</td>
        <td>Node.js</td>
    </tr>
</table>


Status
------

osc.js supports all OSC 1.0 and 1.1 required types. It supports all OSC 1.1 optional types except Int64s ("h"), since JavaScript numbers are limited IEEE 754 Doubles and thus don't have sufficient precision to represent all 64 bits.

Using osc.js
------------

There are two primary functions in osc.js used to read and write OSC data:

* ``osc.readPacket()``, which takes a DataView-friendly data buffer (i.e. an ArrayBuffer, TypedArray, DataView, or Node.js Buffer) and returns a tree of JavaScript objects representing the messages and bundles that were read
* ``osc.writePacket()``, which takes a message or bundle object and packs it up into a Uint8Array

Both functions take an optional `withMetadata` parameter, which specifies if the OSC type metadata should be included. By default, type metadata isn't included when reading packets, and is inferred automatically when writing packets.If you need greater precision in regards to the arguments in an OSC message, set the `withMetadata` argument to true.

### OSC Bundle and Message Objects

osc.js represents bundles and messages as (mostly) JSON-compatible objects. Here's how they are structured:

#### Messages
OSC Message objects consist of two properties, `address`, which contains the URL-style address path and `args` which is an array of either raw argument values or type-annotated Argument objects (depending on the value of `withMetadata` when reading the message).

```javascript
{
    address: "/an/osc/address",
    args: [
        {} // Raw or type-annotated OSC arguments
    ]
}
```

#### Bundles

OSC bundle objects consist of a time tag and an array of `packets`. Packets can be a mix of OSC bundle objects and message objects.

```javascript
{
    timeTag: {
        // OSC Time Tag object
    },
    packets: [
        {} // Nested OSC bundle and message objects>
    ]
}
```

#### Argument Objects with Type Metadata

Type-annotated argument objects contain two properties:  `type`, which contains the OSC type tag character (e.g. `"i"`, `"f"`, `"t"`, etc.) and the raw `value`.

```javascript
{
    type: "f", // OSC type tag string
    value: 444.4
}
```

#### Time Tags
Time tag objects contain two different representations: the raw NTP time and the equivalent (though less precise) native JavaScript timestamp. NTP times consist of a pair of values in an array. The first value represents the number of seconds since January 1, 1900. The second value is a Uint32 value (i.e. between 0 and 4294967296) that represents fractions of a second.

JavaScript timestamps are represented as milliseconds since January 1, 1970, which is the same unit as is returned by calls to `Date.now()`.

```javascript
{
    raw: [
        3608146800, // seconds since January 1, 1900.
        2147483648  // fractions of a second
    ],
    native: Number // Milliseconds since January 1, 1970
}
```
#### Colours
Colours are automatically normalized to CSS 3 rgba values (i.e. the alpha channel is represented as a float from `0.0` to `1.0`).

```javascript
{
    r: 255,
    g: 255,
    b: 255,
    a: 1.0
}
```

Mapping OSC to JSON
-------------------

Here are a few examples showing how OSC packets are mapped to JSON objects by osc.js.

<table>
    <tr>
        <th>Message</th>
        <th>Objects</th>
    </tr>
    <tr>
        <td>"/carrier/freq" ",f" 440.4</td>
        <td><pre><code>{
  address: "/carrier/freq",
  args: [440.4]
}</pre></code></td>
    </tr>
    <tr>
        <td>"/float/andArray" ",f[ii]" 440.4 42 47</td>
        <td><pre><code>{
  address: "/carrier/freq",
  args: [
    440.4, [42, 47]
  ]
}</pre></code></td>
    </tr>
    <tr>
        <td>"/aTimeTag" ",t" 3608146800 2147483648</td>
        <td><pre><code>{
  address: "/scheduleAt",
  args: [
    {
      raw: [3608146800, 2147483648],
      jsTime: 1399158000500
    }
  ]
}</code></pre>
    </tr>
    <tr>
        <td>"/blob" ",b" 0x63 0x61 0x74 0x21</td>
        <td><pre><code>
{
  address: "/blob",
  args: [
    Uint8Aray([0x63, 0x61, 0x74, 0x21])
  ]
}
    <tr>
        <td>"/colour" ",r" "255 255 255 255"</td>
        <td><pre><code>{
  address: "/colour",
  args: [{
      r: 255,
      g: 255,
      b: 255,
      a: 1.0
    }
  ]
}</pre></code</td>
    <tr>
        <td>"/midiMessage" ",m" 0x00 0x90 0x45 0x65</td>
        <td><pre><code>{
  address: "/midiMessage",
  args: [
    // Port ID, Status, Data 1, Data 2
    Uint8Array([0, 144, 69, 101])
  ]
}</pre></code</td>
</table>

License
-------

osc.js was written by Colin Clark and is distributed under the MIT and GPL 3 licenses.
