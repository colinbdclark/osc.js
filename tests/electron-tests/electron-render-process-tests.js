/*jshint node:true*/
/*global fluid, require, QUnit*/

"use strict";

var fluid = require("infusion"),
    jqUnit = require("node-jqunit"),
    osc = require("osc"),
    QUnit = fluid.registerNamespace("QUnit"),
    oscjs = fluid.registerNamespace("oscjs");

/*************************************************
 * Run all the existing osc.js Node tests as-is. *
 *************************************************/
// require("../node-all-tests.js");

/***************************
 * Electron-specific tests *
 ***************************/

fluid.registerNamespace("oscjs.tests.electron");

QUnit.test("osc.js' Node module is correctly loaded within an Electron renderer process", function () {
    QUnit.expect(3);

    QUnit.ok(typeof osc.UDPPort === "function", "osc.UDPPort constructor is defined");
    QUnit.ok(typeof osc.SerialPort === "function", "osc.SerialPort constructor is defined");
    QUnit.ok(typeof osc.TCPSocketPort === "function", "osc.TCPSocketPort constructor is defined");
});

oscjs.tests.electron.testSuccessfulUDPSend = function (udpPort) {
    var sentMessage = {
        address: "/hello",
        args: [
            {
                type: "f",
                value: 440.0
            }
        ]
    };

    udpPort.send(sentMessage);

    udpPort.once("osc", function (receivedMessage) {
        QUnit.deepEqual(receivedMessage, sentMessage,
            "An OSC message was successfully sent and a response received via UDP in an Electron BrowserWindow.");
        QUnit.start();
    });
};

QUnit.asyncTest("Sending via UDP from an Electron renderer process", function () {
    QUnit.expect(1);

    var udpPort = new osc.UDPPort({
        remoteAddress: "127.0.0.1",
        remotePort: 57121,
        localPort: 57120,
        metadata: true,
        unpackSingleArgs: false
    });

    udpPort.on("ready", function () {
        oscjs.tests.electron.testSuccessfulUDPSend(udpPort);
    });

    udpPort.open();
});
