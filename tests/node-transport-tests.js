/*global console, require, QUnit, osc, asyncTest, deepEqual, start*/
/*jshint node:true*/

"use strict";

QUnit.module("Node.js transport tests");

var testMessage = {
    address: "/test/freq",
    args: [440]
};

/*************
* UDP Tests *
*************/

function createUDPServer(onMessage) {
    var ip = "127.0.0.1",
    port = 57121;

    var oscUDP = new osc.UDPPort({
        localAddress: ip,
        localPort: port,
        remoteAddress: ip,
        remotePort: port
    });

    if (onMessage) {
        oscUDP.on("message", onMessage);
    }

    oscUDP.open();

    return oscUDP;
}

asyncTest("Send a message via a UDP socket", function () {
    var oscUDP = createUDPServer(function (msg) {
        deepEqual(msg, testMessage,
            "The message should have been sent to the web socket.");
        start();
    });

    oscUDP.on("ready", function () {
        oscUDP.send(testMessage);
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
            console.error("An error occurred while running the Web Socket tests: ");
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
    wsc.open();
    return wsc;
}

function checkMessageReceived(oscMessage, wss, wsc, assertMessage) {
    deepEqual(oscMessage, testMessage, assertMessage);

    wss.close();
    wsc.close();

    start();
}

asyncTest("Send OSC messages both directions via a Web Socket", function () {
    var wss = createWSServer(function (oscServerPort) {
        oscServerPort.on("message", function (oscMessage) {
            deepEqual(oscMessage, testMessage,
                "The message should have been sent to the web socket server.");
            oscServerPort.send(testMessage);
        });
    });

    var wsc = createWSClient(function (msg) {
        checkMessageReceived(msg, wss, wsc,
            "The message should have been sent to the web socket client.");
    });

    wsc.on("ready", function () {
        wsc.send(testMessage);
    });
});

function testRelay(isRaw) {
    var udpPort = createUDPServer(),
    relay;

    udpPort.on("ready", function () {
        var wss = createWSServer(function (wsServerPort) {
            relay = new osc.Relay(udpPort, wsServerPort, {
                raw: isRaw
            });

            udpPort.send(testMessage);
        });

        var wsc = createWSClient(function (msg) {
            checkMessageReceived(msg, wss, wsc,
                "The message should have been proxied from UDP to the web socket.");
        });
    });
}

asyncTest("Parsed message relaying between UDP and Web Sockets", function () {
    testRelay(false);
});

asyncTest("Raw relaying between UDP and Web Sockets", function () {
    testRelay(true);
});


/*************
 * TCP Tests *
 *************/

var net = require("net");

asyncTest("Send an OSC message via TCP", function () {
    var port = 57122;

    var tcpServer = net.createServer(function (socket) {
        var tcpServerPort = new osc.TCPSocketPort({
            socket: socket
        });

        tcpServerPort.on("error", function (err) {
            console.error(err);
        });

        tcpServerPort.on("message", function (msg) {
            deepEqual(msg, testMessage,
                "The message should have been sent to the TCP server.");
            tcpServer.close();

            start();
        });
    });

    var tcpClientPort = new osc.TCPSocketPort({
        address: "127.0.0.1",
        port: port
    });

    tcpClientPort.on("ready", function () {
        tcpClientPort.send(testMessage);
    });

    tcpClientPort.on("error", function (err) {
        console.error(err);
    });

    tcpServer.listen(port, function () {
        tcpClientPort.open();
    });

});
