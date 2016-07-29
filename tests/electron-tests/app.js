/*jshint node:true*/

"use strict";

var fluid = require("infusion");
require("infusion-electron");

fluid.defaults("oscjs.tests.electron.app", {
    gradeNames: "electron.app",

    components: {
        mainWindow: {
            createOnEvent: "onReady",
            type: "oscjs.tests.electron.mainWindow"
        }
    }
});

fluid.defaults("oscjs.tests.electron.mainWindow", {
    gradeNames: "electron.browserWindow",

    windowOptions: {
        title: "osc.js Electron Unit Tests"
    },

    model: {
        url: {
            expander: {
                funcName: "fluid.stringTemplate",
                args: ["%url/all-electron-tests.html", "{app}.env.appRoot"]
            }
        },

        dimensions: {
            width: 1280,
            height: 720
        }
    },

    listeners: {
        onCreate: [
            {
                "this": "console",
                method: "log",
                args: "{that}.model.url"
            }
        ]
    }
});
