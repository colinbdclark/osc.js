var osc = require("osc");

fluid.registerNamespace("oscjs.tests.electron");

QUnit.test("osc.js' Node module is correctly loaded within an Electron renderer process", function () {
    QUnit.expect(3);

    ok(typeof osc.UDPPort === "function", "osc.UDPPort constructor is defined");
    ok(typeof osc.SerialPort === "function", "osc.SerialPort constructor is defined");
    ok(typeof osc.TCPSocketPort === "function", "osc.TCPSocketPort constructor is defined");
});

oscjs.tests.electron.testSuccessfulUDPSend = function (udpPort) {
    udpPort.send({
        address: "/hello",
        args: [
            {
                type: "f",
                value: 440.0
            }
        ]
    });

    QUnit.ok(true,
        "A message can successfully be send along a UDP in an Electron BrowserWindow.");
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
        start();
    });

    udpPort.open();
});
