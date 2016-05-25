/*
 * osc.js: An Open Sound Control library for JavaScript that works in both the browser and Node.js
 *
 * Node.js All Tests Runner
 *
 * Copyright 2014-2016, Colin Clark
 * Licensed under the MIT and GPL 3 licenses.
 */
/*jshint node:true*/

"use strict";

var testIncludes = [
    "./osc-tests.js",
    "./transport-tests.js",
    "./node-buffer-tests.js",
    "./node-transport-tests.js"
];

testIncludes.forEach(function (path) {
    require(path);
});
