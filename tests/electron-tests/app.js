/*jshint node:true*/

"use strict";

var fluid = require("infusion"),
    osc = require("osc");

require("infusion-electron");

var oscjs = fluid.registerNamespace("oscjs");

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
            type: "oscjs.tests.electron.electronTestWindow",
            options: {
                windowOptions: {
                    webPreferences: {
                        nodeIntegration: true,
                        contextIsolation: false
                    }
                }
            }
        },

        udpServer: {
            type: "oscjs.tests.electron.echoUDPServer"
        }
    },

    listeners: {
        "onCreate.setRendererProcessReuse": {
            funcName: "oscjs.tests.electron.app.setRendererProcessReuse",
            args: ["{that}.app"]
        }
    }
});

// Note: This has been deprecated and will likely fail to work
// in future Electron versions. The SerialPort depedendency
// will need to be updated to be Electron context aware.
oscjs.tests.electron.app.setRendererProcessReuse = function (app) {
    app.allowRendererProcessReuse = false;
};

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
        y: 0,
        width: 1024,
        height: 768
    },

    url: "%url/../all-tests.html"
});

fluid.defaults("oscjs.tests.electron.electronTestWindow", {
    gradeNames: "oscjs.tests.electron.window",

    windowOptions: {
        title: "osc.js Electron Unit Tests",
        width: 1024,
        height: 768,
        x: 320,
        y: 320
    },

    url: "%url/electron-render-process-tests.html"
});

fluid.defaults("oscjs.tests.electron.udpServer", {
    gradeNames: "fluid.component",

    portOptions: {
        localAddress: "127.0.0.1",
        localPort: 57129
    },

    members: {
        udpPort: "@expand:oscjs.tests.electron.createUDPPort({that}.options.portOptions)"
    },

    events: {
        onReady: null,
        onOSC: null
    },

    listeners: {
        onCreate: [
            {
                "this": "{that}.udpPort",
                method: "on",
                args: ["ready", "{that}.events.onReady.fire"]
            },
            {
                "this": "{that}.udpPort",
                method: "on",
                args: ["osc", "{that}.events.onOSC.fire"]
            },
            {
                "this": "{that}.udpPort",
                method: "open"
            }
        ]
    }
});

oscjs.tests.electron.createUDPPort = function (options) {
    return new osc.UDPPort(options);
};

fluid.defaults("oscjs.tests.electron.echoUDPServer", {
    gradeNames: ["oscjs.tests.electron.udpServer"],

    listeners: {
        onOSC: [
            {
                "this": "{that}.udpPort",
                method: "send",
                args: ["{arguments}.0", "{arguments}.1.address", "{arguments}.1.port"]
            }
        ]
    }
});
