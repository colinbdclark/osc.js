/*global require, __dirname*/
/*jshint nomen: false, node: true*/

var testRunner = require("qunit");

testRunner.setup({
    log: {
        assertions: true,
        errors: true,
        tests: true,
        summary: true,
        globalSummary: true,
        testing: true
    }
});

testRunner.run([
    {
        code: {
            path: __dirname + "/../src/platforms/osc-node.js",
            namespace: "osc"
        },
        tests: [
            __dirname + "/osc-tests.js",
            __dirname + "/node-buffer-tests.js",
            __dirname + "/node-transport-tests.js"
        ]
    }
]);
