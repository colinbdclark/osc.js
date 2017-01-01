/*jshint node:true*/

"use strict";

var fluid = require("infusion");
require("./app.js");

var electronTests = fluid.registerNamespace("oscjs.tests.electron");
electronTests.app();
