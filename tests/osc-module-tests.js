/*global require, QUnit*/

(function () {
    "use strict";

    require.config({
        paths: {
            slip: "../bower_components/slip.js/dist/slip.min",
            EventEmitter: "../bower_components/eventEmitter/EventEmitter.min",
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
