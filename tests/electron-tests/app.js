/*jshint node:true*/

"use strict";

var fluid = require("infusion");
require("infusion-electron");

fluid.defaults("oscjs.tests.electron.app", {
    gradeNames: "electron.app",

    components: {
        browserTestWindow: {
            createOnEvent: "onReady",
            type: "oscjs.tests.electron.browserTestWindow"
        },

        // We need a separate window for Electron-specific tests
        // because qunit-composite uses iFrames, which are sandboxed from the
        // Electron Node.js API (e.g. require()).
        electronTestWindow: {
            createOnEvent: "onReady",
            type: "oscjs.tests.electron.electronTestWindow"
        }
    }
});

// TODO: infusion-electron's API needs to be fixed;
// it's very inconvenient to specify a window's URL.
fluid.defaults("oscjs.tests.electron.window", {
    gradeNames: "electron.browserWindow",

    url: undefined,

    model: {
        url: {
            expander: {
                funcName: "fluid.stringTemplate",
                args: ["{that}.options.url", "{app}.env.appRoot"]
            }
        },

        dimensions: {
            width: 640,
            height: 480
        }
    }
});

fluid.defaults("oscjs.tests.electron.browserTestWindow", {
    gradeNames: "oscjs.tests.electron.window",

    windowOptions: {
        title: "osc.js Browser Unit Tests in Electron",
        x: 0,
        y: 0
    },

    url: "%url/../all-tests.html"
});

fluid.defaults("oscjs.tests.electron.electronTestWindow", {
    gradeNames: "oscjs.tests.electron.window",

    windowOptions: {
        title: "osc.js Electron Unit Tests"
    },

    url: "%url/electron-render-process-tests.html"
});
