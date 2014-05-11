osc.js
======

osc.js is a library for reading and writing [Open Sound Control](http://opensoundcontrol.org) messages in JavaScript. It works in both Node.js and in a web browser.

Why osc.js?
-----------

There are several other OSC libraries available for JavaScript. However, they all depend on Node.js-specific APIs. This means that they can't be run in a browser or on web-only platforms such as Chrome OS. osc.js uses only cross-platform APIs (`TypedArrays` and `DataView`), ensuring that it can run in any modern JavaScript environment.

What Does it Do?
----------------

osc.js reads and writes OSC-formatted binary data into plain JavaScript objects. It provides adaptors for Node.js Buffer objects as well as standard ArrayBuffers.

Currently, osc.js provides no built-in transport support. You can receive OSC data in whatever manner works best for your application: serial port APIs such as node-serialport or chrome.serial, socket APIs such as Node.js dgram or WebRTC data channels, WebSockets or binary XHR messages should all work. Connect osc.js up to your source of incoming/outgoing data, and you're all set.

This approach is consistent with the design of Open Sound Control as a _content format_ that is independent from its means of transport.

Status
------

osc.js supports all OSC 1.0 and 1.1 required types. It supports all OSC 1.1 optional types except Int64s ("h"), since JavaScript numbers are limited IEEE 754 Doubles and thus don't have sufficient precision to represent all 64 bits.

Mapping OSC to JSON
-------------------

Here are a few examples showing how OSC packets are mapped to JSON objects by osc.js.

<table>
    <tr>
        <th>Message</th>
        <th>Objects</th>
    </tr>
    <tr>
        <td>`/carrier/freq` `,f` `440.4`</td>
        <td><pre><code>{
  address: "/carrier/freq",
  args: [440.4]
}</pre></code></td>
    </tr>
    <tr>
        <td>`/float/andArray` `,f[ii]` `440.4 42 47`</td>
        <td><pre><code>{
  address: "/carrier/freq",
  args: [
    440.4, [42, 47]
  ]
}</pre></code></td>
    </tr>
    <tr>
        <td>`/aTimeTag` `,t` `3608146800 2147483648`</td>
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
        <td>`/blob` `,b` `0x63 0x61 0x74 0x21`</td>
        <td><pre><code>
{
  address: "/blob",
  args: [
    Uint8Aray([0x63, 0x61, 0x74, 0x21])
  ]
}
    <tr>
        <td>`/colour` `,r` `255 255 255 255`</td>
        <td><pre><code>{
  address: "colour",
  args: [{
      r: 255,
      g: 255,
      b: 255,
      a: 1.0
    }
  ]
}</pre></code</td>
</table>
