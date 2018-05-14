/*
 * osc.js: An Open Sound Control library for JavaScript that works in both the browser and Node.js
 *
 * AMD Module Tests
 *
 * Copyright 2014-2016, Colin Clark
 * Licensed under the MIT and GPL 3 licenses.
 */

/*global require, QUnit*/

(function () {
    "use strict";

    require.config({
        paths: {
            slip: "../node_modules/slip/dist/slip.min",
            EventEmitter: "../node_modules/wolfy87-eventemitter/EventEmitter.min",
            long: "../node_modules/long/dist/long",
            osc: "../dist/osc-module.min"
        }
    });

    QUnit.module("Require.js AMD tests");

    QUnit.asyncTest("osc is defined and populated using the AMD style", function () {
        require(["osc"], function (osc) {
            QUnit.ok(osc, "The 'osc' variable should be defined");
            QUnit.ok(osc.WebSocketPort, "The osc browser transports should also be available.");

            QUnit.start();
        });
    });

}());
