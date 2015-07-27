/*global require*/
/*jshint node:true*/

"use strict";

var fluid = require("infusion"),
    jqUnit = fluid.require("jqUnit"),
    osc = require("../src/platforms/osc-node.js");

var QUnit = fluid.registerNamespace("QUnit");

jqUnit.module("Node.js transport tests");

var testMessage = {
    address: "/test/freq",
    args: [440]
};

/*************
* UDP Tests *
*************/

function createUDPServer(onMessage, o) {
    o = o || {};
    o.localAddress = o.remoteAddress = "127.0.0.1";
    o.localPort = o.remotePort = 57121;

    var oscUDP = new osc.UDPPort(o);

    if (onMessage) {
        oscUDP.on("message", function (msg) {
            onMessage(msg, oscUDP);
        });
    }

    oscUDP.open();

    return oscUDP;
}

jqUnit.asyncTest("Send a message via a UDP socket", function () {
    var oscUDP = createUDPServer(function (msg) {
        QUnit.deepEqual(msg, testMessage,
            "The message should have been sent to the web socket.");
        oscUDP.close();
        jqUnit.start();
    });

    oscUDP.on("ready", function () {
        oscUDP.send(testMessage);
    });
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

    var udpListener = function (msg, udpPort) {
        QUnit.equal(msg.address, expected.address);
        QUnit.ok(Object.prototype.toString.call(msg.args) === "[object Array]",
            "The message arguments should be in an array.");
        QUnit.equal(msg.args.length, 1, "There should only be one argument.");
        QUnit.equal(msg.args[0].type, expected.args[0].type,
            "Type metadata should have been included.");
        QUnit.equal(typeof msg.args[0].value, "number",
            "The argument type should be a number.");

        udpPort.close();
        jqUnit.start();
    };

    var oscUDP = createUDPServer(udpListener, {
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
    QUnit.deepEqual(oscMessage, testMessage, assertMessage);

    wss.close();
    wsc.close();
}

jqUnit.asyncTest("Send OSC messages both directions via a Web Socket", function () {
    var wss = createWSServer(function (oscServerPort) {
        oscServerPort.on("message", function (oscMessage) {
            QUnit.deepEqual(oscMessage, testMessage,
                "The message should have been sent to the web socket server.");
            oscServerPort.send(testMessage);
        });
    });

    var wsc = createWSClient(function (msg) {
        checkMessageReceived(msg, wss, wsc,
            "The message should have been sent to the web socket client.");
        jqUnit.start();
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
            QUnit.deepEqual(msg, testMessage,
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
        tcpClientPort.send(testMessage);
    });

    tcpClientPort.on("error", function (err) {
        console.error(err);
    });

    tcpServer.listen(port, function () {
        tcpClientPort.open();
    });

});
