/*global console, require, QUnit, osc, asyncTest, deepEqual, start*/

"use strict"; // jshint ignore:line

QUnit.module("Node.js transport tests");

var testMessage = {
    address: "/test/freq",
    args: [440]
};

/*************
* UDP Tests *
*************/

asyncTest("Send a message via a UDP socket", function () {
    var ip = "127.0.0.1",
    port = 57121;

    var oscUDP = new osc.UDPPort({
        localAddress: ip,
        localPort: port
    });

    oscUDP.open();

    oscUDP.on("message", function (msg) {
        deepEqual(msg, testMessage,
            "The message should have been sent to the web socket.");
        start();
    });

    oscUDP.on("ready", function () {
        oscUDP.send(testMessage, ip, port);
    });
});


/********************
* Web Socket Tests *
********************/

var ws = require("ws");

function createWSServer (onConnection) {
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

function createWSClient (onMessage) {
    // Create a Web Socket client and connect it to the server.
    var wsc = new osc.WebSocketPort({
        url: "ws://localhost:8081"
    });

    wsc.on("message", onMessage);

    return wsc;
}

asyncTest("Send an OSC message via a Web Socket", function () {
    createWSServer(function (oscServerPort) {
        oscServerPort.send(testMessage);
    });

    var client = createWSClient(function (msg) {
        deepEqual(msg, testMessage,
            "The message should have been sent to the web socket.");
        start();
    });

    client.open();
});

// TODO: TCP socket tests.
