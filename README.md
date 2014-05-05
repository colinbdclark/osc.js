osc.js
======

osc.js is a library for reading and writing [Open Sound Control](http://opensoundcontrol.org) messages in JavaScript. It has no dependencies on the type of environment or transport used. As a result, it works both in Node.js and in a web browser.

Why osc.js?
-----------

There are several other OSC libraries written in JavaScript. All of them depend on Node.js-specific APIs, which means they can't be run in a browser. osc.js uses only cross-platform APIs (specifically, `TypedArrays` and `DataView`) to ensure that it can run in any modern JavaScript environment.

What Does it Do?
----------------

osc.js reads and writes OSC-formatted binary data into plain JavaScript objects. It provides adaptors for Node.js Buffer objects as well as standard ArrayBuffer objects.

You can receive OSC data in whatever manner works best for your application: serial port APIs such as node-serialport or chrome.serial, socket APIs such as Node.js dgram or WebRTC data channels, WebSockets or binary XHR messages should all work. Connect osc.js up to your source of incoming/outgoing data, and you're all set.

Status
------

osc.js is new and still in development. It does not yet (but will) support:

* Bundles
* color types
* MIDI types
