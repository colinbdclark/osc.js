osc.js
======

osc.js is a library for reading and writing [Open Sound Control](http://opensoundcontrol.org) messages in JavaScript. It works in both Node.js and in a web browser.

osc.js is maintained by [Colin Clark](https://colinclark.org). Please respect his unpaid labour (and that of other open source contributors), be kind, share projects you're working on, and consider contributing your own time to help improve the library. :heart:

Why osc.js?
-----------

There are several other OSC libraries available for JavaScript. However, most depend on Node.js-specific APIs. This means that they can't be run in a browser or on web-only platforms such as Chrome OS. osc.js uses only cross-platform APIs (`TypedArrays` and `DataView`), ensuring that it can run in any modern JavaScript environment.

osc.js is fast, comprehensive, fully spec-compliant, tested, modular, and provides a wide variety of optional transports for sending and receiving OSC data.

What Does it Do?
----------------

osc.js reads and writes OSC-formatted binary data into plain JavaScript objects. It provides adaptors for Node.js Buffer objects as well as standard ArrayBuffers.

The core of osc.js is transport agnostic. You can receive OSC data in whatever manner works best for your application: serial port APIs such as node-serialport or chrome.serial, socket APIs such as Node.js dgram or WebRTC data channels, WebSockets or binary XHR messages should all work. Connect osc.js up to your source of incoming/outgoing data, and you're all set. This approach is consistent with the design of Open Sound Control as a _content format_ that is independent from its means of transport.

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

For stream-based protocols such as serial and TCP, osc.js will take care of SLIP framing for you.

Status
------

osc.js supports all OSC 1.0 and 1.1 required and optional types.

Installing osc.js
-----------------

osc.js is typically installed via [npm](https://npmjs.com). [Bower](https://bower.io) support is available, but is deprecated and untested.

### Installing with npm

npm is a package manager for Node.js and web-based projects. Dependencies are registered in the [npmjs.org registry](https://www.npmjs.com/).

For an npm-based project that depends on osc.js, you'll need a <code>package.json</code> configuration file for it:

    {
        "name": "<your project name>",
        "version": "<your project version>",
        "dependencies": {
            "osc": "2.4.1"
        }
    }

Don't forget to update the <code>name</code>, <code>version</code>, and [other package.json fields](https://docs.npmjs.com/files/package.json) appropriately for your project.

Then, to install osc.js and all your other project dependencies, run:

    npm install

Your dependencies will be located in a directory called <code>node_modules</code> in your project root.

### Installing osc.js for use in Electron Applications

[Electron](https://github.com/electron/electron) allows developers to create applications using Web technologies and deploy them as native applications on Mac, Windows, and Linux.

Electron, however, ships with its own version of Node.js, which may be different from the  version you have installed on your computer. osc.js depends on native Node.js modules such as [node-serialport](https://github.com/EmergingTechnologyAdvisors/node-serialport), which need to be compiled against the Electron version of Node.js in order for them to work correctly.

To install osc.js for Electron applications, there are two options:

1. Follow [the instructions provided by the node-serialport project](https://github.com/EmergingTechnologyAdvisors/node-serialport#electron) and use [electron-rebuild](https://github.com/electron/electron-rebuild) to recompile your dependencies after running <code>npm install</code>
2. Use an <code>.npmrc</code> file to override npm's default compile target and runtime settings for Electron. Here's an example of an <code>.npmrc</code> file. Don't forget to make sure that the <code>target</code> property matches the version of Electron you're using:

```
target=23.1.3
disturl=https://electronjs.org/headers
runtime=electron
build_from_source=true
```

How osc.js Works
----------------

osc.js consists of two distinct layers:

1. The low-level functional API, which provides simple stateless functions for reading and writing OSC packets.
2. The transport layer, which provides a simple EventEmitter-style API for sending and receiving OSC packets using a variety of transports such as UDP and Web Sockets.

Typically, you'll use the Port API for sending and receiving OSC packets over a particular transport, but if you want to write your own transports or want a lower-level interface, you can use the functional API directly.

Port API
--------

### Methods

All <code>osc.Port</code> objects implement the following supported methods:

<table>
    <tr>
        <th>Method</th>
        <th>Description</th>
        <th>Arguments</th>
    </tr>
    <tr>
        <td><code>send</code></td>
        <td>Sends an OSC package (either a message or a bundle) on this Port.</td>
        <td>
            <code>packet</code>: the OSC message or bundle to send<br />
        </td>
    </tr>
</table>

### Events

All <code>osc.Port</code>s implement the [Event Emitter API](https://nodejs.org/api/events.html). The following events are supported:

<table>
    <thead>
        <tr>
            <th>Event</th>
            <th>Description</th>
            <th>Arguments</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>ready</code></td>
            <td>Fires when a Port is ready to send or receive messages.</td>
            <td>_none_</td>
        </tr>
        <tr>
            <td><code>message</code></td>
            <td>Fires whenever an OSC message is received by the Port.</td>
            <td>
                <code>message</code>: the OSC message received; <br />
                <code>timeTag</code>: the time tag specified by the sender (may be <code>undefined</code> for non-bundle messages); <br />
                <code>info</code>an implementation-specific remote information object
            </td>
        </tr>
        <tr>
            <td><code>bundle</code></td>
            <td>Fires whenever an OSC bundle is received. Subsequent <code>bundle</code> and/or <code>message</code> events will be fired for each sub-packet in the bundle.</td>
            <td>
                <code>bundle</code>: the OSC bundle received; <br />
                <code>timeTag</code>: the time tag specified by the sender; <br />
                <code>info</code>an implementation-specific remote information object
            </td>
        </tr>
        <tr>
            <td><code>osc</code></td>
            <td>Fires whenever any type of OSC packet is recieved by this Port.</td>
            <td>
                <code>packet</code>: the OSC message or bundle received<br />
                <code>info</code>an implementation-specific remote information object
            </td>
        </tr>
        <tr>
            <td><code>raw</code></td>
            <td>Fires whenever any data is recieved by this Port.</td>
            <td>
                <code>data</code>: an Uint8Array containing the raw data received<br />
                <code>info</code>an implementation-specific remote information object
            </td>
        </tr>
        <tr>
            <td><code>error</code></td>
            <td>Fires whenever an error occurs.</td>
            <td>
                <code>error</code>: the Error object that was raised
            </td>
        </tr>
    </tbody>
</table>


Examples
--------

In-depth example osc.js applications for the browser, Node.js, and Chrome OS are available in the [osc.js examples repository](https://github.com/colinbdclark/osc.js-examples).


### Web Sockets in the Browser

The <code>osc.WebSocketPort</code> object supports sending and receiving
OSC messages over Web Sockets.

#### Options

<table>
    <tr>
        <th>Property</th>
        <th>Description</th>
        <th>Default Value</th>
    </tr>
    <tr>
        <td>url</td>
        <td>The Web Socket URL to connect to (required for clients)</td>
        <td>none</td>
    </tr>
    <tr>
        <td>socket</td>
        <td>A Web Socket instance to bind to (optional); if supplied, it is your job to configure and open it appropriately</td>
        <td>none</td>
    </tr>
</table>

#### Sample Code

_More code examples showing how osc.js can be used in browser-based, Node.js, and Chrome App applications can be found in the [osc.js examples repository](https://github.com/colinbdclark/osc.js-examples)._

##### Including osc.js in your HTML page:
```html
<!DOCTYPE html>
<html>
    <head>
        <title>osc.js Web Sockets</title>
        <meta charset="UTF-8" />
        <script src="node_modules/osc.js/dist/osc-browser.min.js"></script>
    </head>
    <body></body>
</html>
```

##### Creating an OSC Web Socket Port object:
```javascript
var oscPort = new osc.WebSocketPort({
    url: "ws://localhost:8081", // URL to your Web Socket server.
    metadata: true
});
```

##### Opening the Port:
```javascript
oscPort.open();
```

##### Listening for incoming OSC messages:
```javascript
oscPort.on("message", function (oscMsg) {
    console.log("An OSC message just arrived!", oscMsg);
});
```

##### Sending OSC messages:
```javascript
// For most Ports, send() should only be called after the "ready" event fires.
oscPort.on("ready", function () {
    oscPort.send({
        address: "/carrier/frequency",
        args: [
            {
                type: "f",
                value: 440
            }
        ]
    });
});
```

##### Sending OSC bundles:
```javascript
oscPort.on("ready", function () {
    oscPort.send({
        // Tags this bundle with a timestamp that is 60 seconds from now.
        // Note that the message will be sent immediately;
        // the receiver should use the time tag to determine
        // when to act upon the received message.
        timeTag: osc.timeTag(60),

        packets: [
            {
                address: "/carrier/frequency",
                args: [
                    {
                        type: "f",
                        value: 440
                    }
                ]
            },
            {
                address: "/carrier/amplitude",
                args: [
                    {
                        type: "f",
                        value: 0.5
                    }
                ]
            }
        ]
    });
});

```

##### Using osc.js with Require.js
```javascript
// Define your module paths, including osc.js' dependencies.
// Note: these paths must resolve to wherever you have placed
// osc.js, slip.js, and eventEmitter in your project.
require.config({
    paths: {
        slip: "../node_modules/slip.js/dist/slip.min",
        EventEmitter: "../node_modules/eventEmitter/EventEmitter.min",
        long: "../node_modules/long/dist/Long.min",
        osc: "../node_modules/osc.js/osc-module.min"
    }
});

// Load it asynchronously.
require(["osc"], function (osc) {
    // Do something with osc.js when it has fully loaded.
});
```

##### Using osc.js with WebPack, etc. - help wanted!
Users have reported that osc.js can be used in browser-based applications with WebPack by loading the pre-built <code>osc-browser.js</code> package in their code:

```javascript
require("osc/dist/osc-browser");
```

osc.js is not currently tested using WebPack due to limited support resources. Nonetheless, contributions are very much welcomed from the community to help make osc.js more idiomatic when using WebPack or similar technologies, particularly if such changes enable continued support of simpler toolchains (or none) and the use of long-standing browser idioms such as plain old <code>script</code> tags.

osc.js also does not currently support being loaded as an ES6 module. Contributions for this are also welcome, but any solution should support full compatibility with simpler and long-standing web idioms as above (hint: a new built file will be required that contains suitable ES6 export boilerplate).

### Web Sockets in Node.js

The <code>osc.WebSocketPort</code> object supports sending and receiving
OSC messages over Web Sockets.

#### Options

<table>
    <tr>
        <th>Property</th>
        <th>Description</th>
        <th>Default Value</th>
    </tr>
    <tr>
        <td>url</td>
        <td>The Web Socket URL to connect to (required for clients)</td>
        <td>none</td>
    </tr>
    <tr>
        <td>socket</td>
        <td>A Web Socket instance to bind to (required for servers, optional for clients); if supplied, it is your job to configure and open it appropriately</td>
        <td>none</td>
    </tr>
</table>

#### Sample Code

```javascript
var osc = require("osc"),
    http = require("http"),
    WebSocket = require("ws");

// Create an Express server app
// and serve up a directory of static files.
var app = require("express").express(),
    server = app.listen(8081);

app.use("/", express.static(__dirname + "/static"));

// Listen for Web Socket requests.
var wss = new WebSocket.Server({
    server: server
});

// Listen for Web Socket connections.
wss.on("connection", function (socket) {
    var socketPort = new osc.WebSocketPort({
        socket: socket,
        metadata: true
    });

    socketPort.on("message", function (oscMsg) {
        console.log("An OSC Message was received!", oscMsg);
    });
});
```

### UDP in Node.js

The <code>osc.UDPPort</code> object supports the sending and receiving of
OSC messages over Node.js's UDP sockets. It also supports broadcast and multicast UDP.

#### Options

<table>
    <tr>
        <th>Property</th>
        <th>Description</th>
        <th>Default Value</th>
    </tr>
    <tr>
        <td>localPort</td>
        <td>The port to listen on</td>
        <td>57121</td>
    </tr>
    <tr>
         <td>localAddress</td>
         <td>The local address to bind to</td>
         <td>"127.0.0.1"</td>
    </tr>
    <tr>
        <td>remotePort</td>
        <td>The remote port to send messages to (optional)</td>
        <td>none</td>
    </tr>
    <tr>
        <td>remoteAddress</td>
        <td>The remote address to send messages to (optional)</td>
        <td>none</td>
    </tr>
    <tr>
        <td>broadcast</td>
        <td>A flag specifying if messages should be sent via UDP broadcast</td>
        <td>false</td>
    </tr>
    <tr>
        <td>multicastTTL</td>
        <td>The time to live (number of hops) for a multicast connection (optional)</td>
        <td>none</td>
    </tr>
    <tr>
        <td>multicastMembership</td>
        <td>An array of multicast addresses to join when listening for multicast messages (optional)</td>
        <td>none</td>
    </tr>
    <tr>
        <td>socket</td>
        <td>A raw dgram.Socket to use instead of osc.js creating one for you; if supplied, it is your job to configure and bind it appropriately</td>
        <td>none</td>
    </tr>
</table>

#### Sample Code

```javascript
// Create an osc.js UDP Port listening on port 57121.
var udpPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 57121,
    metadata: true
});

// Listen for incoming OSC messages.
udpPort.on("message", function (oscMsg, timeTag, info) {
    console.log("An OSC message just arrived!", oscMsg);
    console.log("Remote info is: ", info);
});

// Open the socket.
udpPort.open();


// When the port is read, send an OSC message to, say, SuperCollider
udpPort.on("ready", function () {
    udpPort.send({
        address: "/s_new",
        args: [
            {
                type: "s",
                value: "default"
            },
            {
                type: "i",
                value: 100
            }
        ]
    }, "127.0.0.1", 57110);
});
```

### Serial in a Chrome App

#### Including osc.js in your Chrome App page
```html
<script src="../bower_components/osc.js/dist/osc-chromeapp.min.js"></script>
```

#### Defining the appropriate permissions in manifest.json
```json
{
    "name": "OSC.js Chrome App Demo",
    "version": "1",
    "manifest_version": 2,
    "permissions": [
        "serial"
    ],
    "app": {
        "background": {
            "scripts": ["js/launch.js"],
            "transient": true
        }
    }
}
```

#### Connecting to the serial port and listening for OSC messages
```javascript
// Instantiate a new OSC Serial Port.
var serialPort = new osc.SerialPort({
    devicePath: "/dev/cu.usbmodem22131",
    metadata: true
});

// Listen for the message event and map the OSC message to the synth.
serialPort.on("message", function (oscMsg) {
    console.log("An OSC message was received!", oscMsg);
});

// Open the port.
serialPort.open();
```

### UDP in a Chrome App

The <code>osc.UDPPort</code> object supports the sending and receiving of
OSC messages over a <code>chrome.sockets.udp</code> socket. It also supports broadcast and multicast UDP.

#### Options

<table>
    <tr>
        <th>Property</th>
        <th>Description</th>
        <th>Default Value</th>
    </tr>
    <tr>
        <td>localPort</td>
        <td>The port to listen on</td>
        <td>57121</td>
    </tr>
    <tr>
         <td>localAddress</td>
         <td>The local address to bind to</td>
         <td>"127.0.0.1"</td>
    </tr>
    <tr>
        <td>remotePort</td>
        <td>The remote port to send messages to (optional)</td>
        <td>none</td>
    </tr>
    <tr>
        <td>remoteAddress</td>
        <td>The remote address to send messages to (optional)</td>
        <td>none</td>
    </tr>
    <tr>
        <td>broadcast</td>
        <td>A flag specifying if messages should be sent via UDP broadcast</td>
        <td>false</td>
    </tr>
    <tr>
        <td>multicastTTL</td>
        <td>The time to live (number of hops) for a multicast connection (optional)</td>
        <td>none</td>
    </tr>
    <tr>
        <td>multicastMembership</td>
        <td>An array of multicast addresses to join when listening for multicast messages (optional)</td>
        <td>none</td>
    </tr>
    <tr>
        <td>socketId</td>
        <td>The id of an existing socket to use instead of osc.js creating one for you; if supplied, it is your job to configure and bind it appropriately</td>
        <td>none</td>
    </tr>
</table>


Handling Errors
---------------

All osc.js Transport objects emit <code>"error"</code> messages whenever an error occurs,
such as when a malformed message is received. You should always listen for errors and
handle them in an appropriate manner for your application.

```javascript
var port = osc.UDPPort();
port.on("error", function (error) {
    console.log("An error occurred: ", error.message);
});
```

The low-level osc.js API, described below, will throw JavaScript <code>Error</code> objects whenever an error occurs;
they should be caught and handled using
<code>try</code>/<code>catch</code>.

```javascript
var msg;

try {
    msg = osc.readPacket(rawPacket);
} catch (error) {
    console.log("An error occurred: ", error.message);
}
```

The osc.js Low-Level API
------------------------

### OSC Bundle and Message Objects

osc.js represents bundles and messages as (mostly) JSON-compatible objects. Here's how they are structured:

#### Messages
OSC Message objects consist of two properties, `address`, which contains the URL-style address path and `args` which is an array of either raw argument values or type-annotated Argument objects (depending on the value of the <code>metadata</code> option used when reading the message).

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

If you are using type-annotated arguments, you should also set the <code>metadata</code> option to <code>true</code> when you instantiate your <code>OSCPort</code> instance (or in the <code>options</code> argument to <code>osc.writeMessage</code> if you're using the low-level API).


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

### Functions

There are two primary functions in osc.js used to read and write OSC data:

<table>
    <tr>
        <th>Function</th>
        <th>Description</th>
        <th>Arguments</th>
        <th>Return value</th>
    </tr>
    <tr>
        <td><code>osc.readPacket()</code></td>
        <td>Decodes binary OSC message into a tree of JavaScript objects containing the messages or bundles that were read.</td>
        <td>
            <code>data</code>: A <code>Uint8Array</code> containing the raw data of the OSC packet; <br />
            <code>options</code>: (optional) An options object, described below; <br />
            <code>offsetState</code>: (optional) an offset state object containing an <code>idx</code> property that specifies the offset index into <code>data</code>; <br />
            <code>length</code> the length (in bytes) to read from <code>data</code>
        </td>
        <td>An osc.js message or bundle object</td>
    </tr>
    <tr>
        <td><code>osc.writePacket()</code></td>
        <td>Writes an OSC message or bundle object to a binary array.</td>
        <td>
            <code>packet</code>: An osc.js message or bundle object;<br />
            <code>options</code>: (optional) An options object, described below<br />
        </td>
        <td>A <code>Uint8Array</code></td>
    </tr>
</table>

### Options

Many osc.js functions take an <code>options</code> object that can be used to customize its behaviour. These options are also supported by all <code>osc.Port</code> objects, and can be included as a parameter in the <code>options</code> arguments passed to any <code>Port</code> constructor. The supported fields in an options object are:

* <code>metadata</code>: specifies if the OSC type metadata should be included. By default, type metadata isn't included when reading packets, and is inferred automatically when writing packets. If you need greater precision in regards to the arguments in an OSC message, set the <code>metadata</code> argument to true. Defaults to <code>false</code>.
* <code>unpackSingleArgs</code>: specifies if osc.js should automatically unpack single-argument messages so that their <code>args</code> property isn't wrapped in an array. Defaults to <code>true</code>.


Mapping OSC to JS
------------------

Here are a few examples showing how OSC packets are mapped to plain JavaScript objects by osc.js.

<table>
    <tr>
        <th>Message</th>
        <th>Objects</th>
    </tr>
    <tr>
        <td>"/carrier/freq" ",f" 440.4</td>
        <td><pre><code>{
    address: "/carrier/freq",
    args: [
        {
            type: "f",
            value: 440.4
        }
    ]
}</pre></code></td>
    </tr>
    <tr>
        <td>"/float/andArray" ",f[ff]" 440.4 42 47</td>
        <td><pre><code>{
    address: "/float/andArray",
    args: [
        {
            type: "f",
            value: 440.4
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
        {
            type: "b",
            value: new Uint8Array([0x63, 0x61, 0x74, 0x21])
        }
    ]
}
    <tr>
        <td>"/colour" ",r" "255 255 255 255"</td>
        <td><pre><code>{
  address: "/colour",
  args: [
    {
        type: "r",
        value: {
            r: 255,
            g: 255,
            b: 255,
            a: 1.0
        }
    }
  ]
}</pre></code</td>
    <tr>
        <td>"/midiMessage" ",m" 0x00 0x90 0x45 0x65</td>
        <td><pre><code>{
    address: "/midiMessage",
    args: [
        {
            type: "m",
            value: new Uint8Array([0, 144, 69, 101]) // Port ID, Status, Data 1, Data 2
        }
    ]
}</pre></code</td>
</table>

License
-------

osc.js is maintained by Colin Clark and distributed under the MIT and GPL 3 licenses.

Supported Environments
----------------------

osc.js releases are tested and supported on a best-effort basis in the following environments:

<table>
    <thead>
        <tr><th>Environment</th><th>Tested OS</th><th>Version</th></tr>
    </thead>
    <tbody>
        <tr><td>Chrome</td><td>Mac OS X, Windows</td><td>Stable channel</td></tr>
        <tr><td>Firefox</td><td>Mac OS X, Windows</td><td>Stable channel</td></tr>
        <tr><td>Safari</td><td>Mac OS X</td><td>Latest</td></tr>
        <tr><td>Edge</td><td>Windows</td><td>Latest</td></tr>
        <tr><td>Node.js</td><td>Mac OS X, Windows</td><td>LTS</td></tr>
        <tr><td>Electron</td><td>Mac OS X, Windows</td><td>Latest</td></tr>
    </tbody>
</table>

Contributing to osc.js
----------------------

Contributions and pull requests to osc.js are hugely appreciated. Wherever possible, all fixes and new features should be accompanied by unit tests to help verify that they work and avoid regressions. When new features are introduced, a pull request to the [osc.js-examples repository](https://github.com/colinbdclark/osc.js-examples) with an example of how to use it is also appreciated.

Code should follow the style conventions of the project (such as they are), which can be automatically validated using JSHint by running <code>grunt jshint</code>.

Currently, the project is maintained by one person; sometimes it will take a bit of time to respond, review, and merge contributions. Help with bug triage, code reviews, testing, and examples is also welcome.

## How to Build and Test Your Contributions

osc.js depends on npm, Grunt, and Testem. Make sure you have these installed, and then run the following commands to fetch all necessary dependencies:

    npm install

To lint and generate builds from new source code:

    grunt

Running the unit tests:

1. To run the fully automated tests, run "npm test"
2. To run the electron tests, run "npm run electron-test"

Contributors
------------

 * @colinbdclark wrote osc.js.
 * @jacoscaz and @xseignard fixed bugs.
 * @drart made and helped test some examples.
 * @egasimus added support for 64-bit integers.
 * @heisters contributed fixes for broadcast and multicast UDP on Node.js and improved time tag support.
 * @tambien fixed error handling bugs in the transports layer.
 * @janslow added support for passing remote information to all Port data events.
