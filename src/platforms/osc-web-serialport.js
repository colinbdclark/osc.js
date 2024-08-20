/*
 * osc.js: An Open Sound Control library for JavaScript that works in both the browser and Node.js
 *
 * WebSerial serial transport for osc.js
 *
 * Licensed under the MIT and GPL 3 licenses.
 */

/*global WebSerial, require*/
var osc = osc || require("../osc.js");

osc.supportsSerial = true;

(function () {
  "use strict";

  osc.SerialPort = function (options) {
    if ("serial" in navigator) {
      this.on("open", this.listen.bind(this));
      osc.SLIPPort.call(this, options);
      this.options.bitrate = this.options.bitrate || 9600;

      this.serialPort = options.serialPort;
      if (this.serialPort) {
        this.emit("open", this.serialPort);
      }
    } else {
      throw Error(
        "Web serial not supported in your browser. Check https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API#browser_compatibility for more info."
      );
    }
  };

  var p = (osc.SerialPort.prototype = Object.create(osc.SLIPPort.prototype));
  p.constructor = osc.SerialPort;

  p.open = async function () {
    if (this.serialPort) {
      // If we already have a serial port, close it and open a new one.
      this.once("close", this.open.bind(this));
      this.close();
      return;
    }

    try {
      this.serialPort = await navigator.serial.requestPort();
      await this.serialPort.open(this.options);
      this.serialPort.isOpen = true;
      this.emit("open", this.serialPort);
    } catch (error) {
      this.serialPort.isOpen = false;
      this.emit("error", error);
    }
  };

  p.listen = async function () {
    while (this.serialPort.readable) {
      const reader = this.serialPort.readable.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }
          this.emit("data", value, undefined);
        }
      } catch (error) {
        this.emit("error", error);
      } finally {
        reader.releaseLock();
      }
    }
    this.emit("ready");
  };

  p.messageQueue = [];
  p.isWriting = false;

  p.sendRaw = async function (encoded) {
    if (!this.serialPort || !this.serialPort.isOpen) {
      osc.fireClosedPortSendError(this);
      return;
    }

    this.messageQueue.push(encoded);

    if (!this.isWriting) {
      this.isWriting = true;
      const writer = this.serialPort.writable.getWriter();
      while (this.messageQueue.length > 0) {
        const nextMessage = this.messageQueue.shift();
        try {
          await writer.write(nextMessage);
        } catch (error) {
          console.error(error);
          this.emit("error", error);
        }
      }
      writer.releaseLock();
      this.isWriting = false;
    }
  };

  p.close = function () {
    if (this.serialPort) {
      this.serialPort.close();
      this.serialPort.isOpen = false;
    }
  };
})();
