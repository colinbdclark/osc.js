/*global require, __dirname*/
/*jshint nomen: false*/

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

testRunner.run({
    code: {
        path: __dirname + "/../../src/osc.js",
        namespace: "osc"
    },
    tests: __dirname + "/osc-tests.js"
});
