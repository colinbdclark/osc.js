/*
 * osc.js: An Open Sound Control library for JavaScript that works in both the browser and Node.js
 *
 * Node.js serial port loader for osc.js
 *
 * Copyright 2019, Colin Clark
 * Licensed under the MIT and GPL 3 licenses.
 */

/*jshint node:true*/

var osc = osc || require("../osc.js");

try {
    var SerialPort = require("serialport");
    require("./osc-node-serialport.js");
} catch (err) {
    osc.SerialPort = function () {
        throw new Error("The Node.js SerialPort library is not installed. osc.js' serial transport is unavailable.");
    };
}
