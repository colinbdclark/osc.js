/*
 * osc.js: An Open Sound Control library for JavaScript that works in both the browser and Node.js
 *
 * Node.js Transport Tests
 *
 * Copyright 2014-2016, Colin Clark
 * Licensed under the MIT and GPL 3 licenses.
 */

/*global require*/
/*jshint node:true*/

"use strict";

var fluid = fluid || require("infusion"),
    jqUnit = jqUnit || fluid.require("node-jqunit"),
    osc = osc || require("../src/platforms/osc-node.js");

var QUnit = fluid.registerNamespace("QUnit");

jqUnit.module("Node.js transport tests");

var testOSCMessage = {
    address: "/test/freq",
    args: [440]
};


/*************
* UDP Tests *
*************/

function createUDPReceiver(onMessage, o) {
    o = o || {};

    var oscUDP = new osc.UDPPort(o);

    if (onMessage) {
        oscUDP.on("message", function (msg, timeTag, rinfo) {
            onMessage(msg, oscUDP, rinfo);
        });
    }

    oscUDP.open();

    return oscUDP;
}

function testReadUDP(msg, receiverOptions, senderOptions) {
    if (!receiverOptions) {
        receiverOptions = {
            localAddress: "127.0.0.1",
            localPort: 57121
        };
    }

    if (!senderOptions) {
        senderOptions = {
            localAddress: "127.0.0.1",
            localPort: 57122,
            remoteAddress: "127.0.0.1",
            remotePort: 57121
        };
    }

    var receiverPort,
        senderPort;

    var receiveFn = function (receivedOSCMessage) {
        QUnit.deepEqual(receivedOSCMessage, testOSCMessage, msg);
        receiverPort.close();
        senderPort.close();
        jqUnit.start();
    };

    receiverPort = createUDPReceiver(receiveFn, receiverOptions);
    senderPort = new osc.UDPPort(senderOptions);
    senderPort.open();

    // TODO: When Ports support Promises, make sure that this
    // only executes after both Ports are ready.
    receiverPort.on("ready", function () {
        senderPort.send(testOSCMessage);
    });
}

jqUnit.asyncTest("Send a message via a UDP socket", function () {
    testReadUDP("The message should have been sent and received successfully.");
});

jqUnit.asyncTest("Send a multicast message via a UDP socket", function () {
    var receiverOptions = {
        localAddress: "0.0.0.0",
        localPort: 57121,
        multicastMembership: ["239.255.255.250"]
    };

    var senderOptions = {
        multicastTTL: 2,
        localAddress: "0.0.0.0",
        localPort: 57122,
        remoteAddress: "239.255.255.250",
        remotePort: 57121
    };

    testReadUDP("The message should have been sent and received successfully when multicast is enabled.",
        receiverOptions, senderOptions);
});

jqUnit.asyncTest("Send a broadcast message via a UDP socket", function () {
    var receiverOptions = {
        broadcast: true,
        localAddress: "0.0.0.0",
        localPort: 57121
    };

    var senderOptions = {
        broadcast: true,
        localAddress: "0.0.0.0",
        localPort: 57122,
        remoteAddress: "255.255.255.255",
        remotePort: 57121
    };

    testReadUDP("The message should have been sent and received successfully when multicast is enabled.",
        receiverOptions, senderOptions);
});

jqUnit.asyncTest("Read from a UDP socket with metadata: true", function () {
    var expected = {
        address: "/sl/1/down",
        args: [
            {
                type: "f", // OSC type tag string
                value: 444.4
            }
        ]
    };

    var udpListener = function (msg, udpPort, rinfo) {
        QUnit.equal(msg.address, expected.address);
        QUnit.ok(Object.prototype.toString.call(msg.args) === "[object Array]",
            "The message arguments should be in an array.");
        QUnit.equal(msg.args.length, 1, "There should only be one argument.");
        QUnit.equal(msg.args[0].type, expected.args[0].type,
            "Type metadata should have been included.");
        QUnit.equal(typeof msg.args[0].value, "number",
            "The argument type should be a number.");
        jqUnit.assertLeftHand(
            "A remote information object should have been passed to the onMessage callback.",
            {
                address: "127.0.0.1",
                port: 57121
            },
            rinfo
        );
        udpPort.close();
        jqUnit.start();
    };

    var oscUDP = createUDPReceiver(udpListener, {
        metadata: true
    });

    oscUDP.on("ready", function () {
        oscUDP.send(expected);
    });
});


/********************
* Web Socket Tests *
********************/

var ws = require("ws");

function createWSServer(onConnection) {
    // Setup the Web Socket server.
    var wss = new ws.Server({
        port: 8081
    });

    wss.on("connection", function (socket) {
        var serverWebSocketPort = new osc.WebSocketPort({
            socket: socket
        });

        serverWebSocketPort.on("error", function (err) {
            console.error("A server error occurred while running the Web Socket tests: ");
            console.error(err.stack);
        });

        onConnection(serverWebSocketPort);
    });

    return wss;
}

function createWSClient(onMessage) {
    // Create a Web Socket client and connect it to the server.
    var wsc = new osc.WebSocketPort({
        url: "ws://localhost:8081"
    });

    wsc.on("message", onMessage);
    wsc.on("error", function (err) {
        console.error("A client error occurred while running the Web Socket tests: ", err);
    });

    wsc.open();
    return wsc;
}

function checkMessageReceived(oscMessage, wss, wsc, assertMessage) {
    QUnit.deepEqual(oscMessage, testOSCMessage, assertMessage);

    wsc.close();
    wss.close();
}

jqUnit.asyncTest("Send OSC messages both directions via a Web Socket", function () {
    var wss = createWSServer(function (oscServerPort) {
        oscServerPort.on("message", function (oscMessage) {
            QUnit.deepEqual(oscMessage, testOSCMessage,
                "The message should have been sent to the web socket server.");
            oscServerPort.send(testOSCMessage);
        });
    });

    var wsc = createWSClient(function (msg) {
        checkMessageReceived(msg, wss, wsc,
            "The message should have been sent to the web socket client.");
        jqUnit.start();
    });

    wsc.on("ready", function () {
        wsc.send(testOSCMessage);
    });
});

function testRelay(isRaw) {
    var udpPort = createUDPReceiver(),
        relay;

    udpPort.on("ready", function () {
        var wss = createWSServer(function (wsServerPort) {
            relay = new osc.Relay(udpPort, wsServerPort, {
                raw: isRaw
            });

            udpPort.send(testOSCMessage);
        });

        var wsc = createWSClient(function (msg) {
            checkMessageReceived(msg, wss, wsc,
                "The message should have been proxied from UDP to the web socket.");
            udpPort.close();
            jqUnit.start();
        });
    });
}

jqUnit.asyncTest("Parsed message relaying between UDP and Web Sockets", function () {
    testRelay(false);
});

jqUnit.asyncTest("Raw relaying between UDP and Web Sockets", function () {
    testRelay(true);
});

jqUnit.asyncTest("Relay closes when first port closes", function () {
    var firstPort = new osc.UDPPort({
        localPort: 57121
    });

    var secondPort = new osc.UDPPort({
        localPort: 57122
    });

    var relay = new osc.Relay(firstPort, secondPort);
    relay.on("close", function () {
        QUnit.ok(true, "The relay emitted its close event as a result of the first port closing.");
        jqUnit.start();
    });

    firstPort.on("ready", function () {
        secondPort.on("ready", function () {
            firstPort.close();
        });
    });

    firstPort.open();
    secondPort.open();
});


/*************
 * TCP Tests *
 *************/

var net = require("net");

jqUnit.asyncTest("Send an OSC message via TCP", function () {
    var port = 57122;

    var tcpServer = net.createServer(function (socket) {
        var tcpServerPort = new osc.TCPSocketPort({
            socket: socket
        });

        tcpServerPort.on("error", function (err) {
            console.error(err);
        });

        tcpServerPort.on("message", function (msg) {
            QUnit.deepEqual(msg, testOSCMessage,
                "The message should have been sent to the TCP server.");
            tcpServer.close();

            jqUnit.start();
        });
    });

    var tcpClientPort = new osc.TCPSocketPort({
        address: "127.0.0.1",
        port: port
    });

    tcpClientPort.on("ready", function () {
        tcpClientPort.send(testOSCMessage);
    });

    tcpClientPort.on("error", function (err) {
        console.error(err);
    });

    tcpServer.listen(port, function () {
        tcpClientPort.open();
    });

});
