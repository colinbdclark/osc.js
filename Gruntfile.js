/*
 * osc.js: An Open Sound Control library for JavaScript that works in both the browser and Node.js
 *
 * Grunt Build File
 *
 * Copyright 2014-2015, Colin Clark
 * Licensed under the MIT and GPL 3 licenses.
 */

/*global module*/
/*jshint strict:false*/

module.exports = function(grunt) {

    var files = {
        moduleDeps: [
            "node_modules/long/dist/long.js",
            "node_modules/slip/src/slip.js",
            "node_modules/wolfy87-eventemitter/EventEmitter.js"
        ],

        osc: [
            "src/osc.js"
        ],

        oscWeb: [
            "src/osc-transports.js",
            "src/platforms/osc-websocket-client.js"
        ],

        oscChrome: [
            "src/platforms/osc-chromeapp.js"
        ],

        moduleHeader: [
            "build-support/js/module-header.js"
        ],

        moduleFooter: [
            "build-support/js/module-footer.js"
        ]
    };

    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),

        jshint: {
            all: ["src/*.js", "tests/**/*.js", "!**/node_modules/**"],
            options: {
                jshintrc: true
            }
        },

        concat: {
            options: {
                separator: ";\n",
                banner: "<%= oscjs.banners.short %>"
            },

            base: {
                src: [].concat(files.osc),
                dest: "dist/<%= pkg.name %>.js"
            },

            browser: {
                src: [].concat(files.osc, files.moduleDeps, files.oscWeb),
                dest: "dist/<%= pkg.name %>-browser.js"
            },

            chromeapp: {
                src: [].concat(files.osc, files.moduleDeps, files.oscWeb, files.oscChrome),
                dest: "dist/<%= pkg.name %>-chromeapp.js"
            },

            module: {
                src: [].concat(files.moduleHeader, files.osc, files.oscWeb, files.moduleFooter),
                dest: "dist/<%= pkg.name %>-module.js"
            }
        },

        replace: {
            dist: {
                options: {
                    patterns: [
                        {
                            match: /\.\.\/osc.js/g,
                            replacement: "./osc.js"
                        }
                    ]
                },
                files: [
                    {
                        src: "dist/*.js",
                        dest: "./"
                    }
                ]
            }
        },

        uglify: {
            options: {
                banner: "<%= oscjs.banners.short %>",
                beautify: {
                    ascii_only: true
                }
            },
            all: {
                files: [
                    {
                        expand: true,
                        cwd: "dist/",
                        src: ["*.js"],
                        dest: "dist/",
                        ext: ".min.js",
                    }
                ]
            }
        },

        clean: {
            all: {
                src: ["dist/"]
            }
        },

        oscjs: {
            banners: {
                short: "/*! osc.js <%= pkg.version %>, " +
                    "Copyright <%= grunt.template.today('yyyy') %> Colin Clark | " +
                    "github.com/colinbdclark/osc.js */\n\n"
            }
        }
    });

    // Load relevant Grunt plugins.
    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-replace");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-jshint");

    grunt.registerTask("default", ["clean", "jshint", "concat", "replace", "uglify"]);
};
