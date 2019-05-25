/*
 * osc.js: An Open Sound Control library for JavaScript that works in both the browser and Node.js
 *
 * Web Tests
 *
 * Copyright 2019, Colin Clark
 * Licensed under the MIT and GPL 3 licenses.
 */

/*global osc, QUnit*/

(function () {
    "use strict";

    QUnit.module("osc.js Web Tests");

    QUnit.test("Serial port support is not loaded", function () {
        QUnit.expect(1);
        QUnit.ok(!osc.supportsSerial);
    });
}());
