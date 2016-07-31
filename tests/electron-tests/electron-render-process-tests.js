var osc = require("osc");

QUnit.test("osc.js' Node module is correctly loaded within an Electron renderer process", function () {
    ok(typeof osc.UDPPort !== "undefined", "osc.UDPPort is defined");
});
