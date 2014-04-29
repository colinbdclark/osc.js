osc.js
======

osc.js is a library for reading and writing [Open Sound Control](http://opensoundcontrol.org) messages in JavaScript. It has no dependencies on a particular environment or type of transport. As a result, it can be used in both Node.js and the browser.

Why osc.js?
-----------

There are several other OSC libraries written in JavaScript. All of them depend on Node.js-specific APIs, which means they can't be run in a browser. osc.js uses only cross-platform APIs (specifically, `TypedArrays` and `DataView`) to ensure that it can run equally well in Node.js or in a web browser. This makes it suitable for entirely in-browser applications such as those on Chrome OS and Firefox OS.

What Does it Do?
----------------

osc.js is transport- and source-agnostic. It simply reads and writes binary data, taking care of translating between ordinary JavaScript objects and OSC's low-level binary format. osc.js provides adaptors for reading/writing Node.js Buffer objects as well as standard ArrayBuffer objects.

You can receive OSC data in whatever manner works best for your application: serial port APIs such as node-serialport or chrome.serial, socket APIs such as Node.js dgram or WebRTC data channels, WebSockets or binary XHR messages should all work. Connect osc.js up to your source of incoming/outgoing data, and you're all set.

Status
------

osc.js is in early, active development. It does not yet (but will) support:

* Writing OSC messages
* Reading OSC bundles
* OSC time tags
* int64 types
* float64 types
* char32 types
* color types
* MIDI types
