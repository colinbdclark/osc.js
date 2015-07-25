/*jshint node:true*/

"use strict";

var testIncludes = [
    "./osc-tests.js",
    "./node-buffer-tests.js",
    "./node-transport-tests.js"
];

testIncludes.forEach(function (path) {
    require(path);
});
