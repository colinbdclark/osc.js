/*jshint node:true*/
/*global fluid*/

"use strict";
window.require = window.electron.nodeIntegration.require;

var osc = window.electron.nodeIntegration.require("osc"),
    QUnit = fluid.registerNamespace("QUnit"),
    oscjsTests = fluid.registerNamespace("oscjsTests");

/***************************
 * Electron-specific tests *
 ***************************/

fluid.registerNamespace("oscjsTests.electron");

QUnit.test("osc.js' Node module is correctly loaded within an Electron renderer process", function () {
    QUnit.expect(3);

    QUnit.ok(typeof osc.UDPPort === "function", "osc.UDPPort constructor is defined");
    QUnit.ok(typeof osc.SerialPort === "function", "osc.SerialPort constructor is defined");
    QUnit.ok(typeof osc.TCPSocketPort === "function", "osc.TCPSocketPort constructor is defined");
});

QUnit.test("Serial port support has been loaded.", function () {
    QUnit.expect(1);
    QUnit.ok(osc.supportsSerial, "The SerialPort library has been loaded.");
});

oscjsTests.electron.testSuccessfulUDPSend = function (udpPort) {
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
        udpPort.on("close", function () {
            QUnit.start();
        });
        udpPort.close();
    });
};

QUnit.asyncTest("Sending via UDP from an Electron renderer process", function () {
    QUnit.expect(1);

    var udpPort = new osc.UDPPort({
        remoteAddress: "127.0.0.1",
        remotePort: 57129,
        metadata: true,
        unpackSingleArgs: false
    });

    udpPort.on("ready", function () {
        oscjsTests.electron.testSuccessfulUDPSend(udpPort);
    });

    udpPort.open();
});
