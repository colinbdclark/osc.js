/*global module*/
/*jshint strict:false*/

module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),

        jshint: {
            all: ["src/*.js", "tests/**/*.js"],
            options: {
                jshintrc: true
            }
        },

        uglify: {
            options: {
                banner: "<%= oscjs.banners.short %>"
            },
            dist: {
                files: {
                    "dist/osc.min.js": ["src/osc.js"],
                    "dist/osc-chromeapp.min.js": [
                        "src/osc.js",
                        "bower_components/slip.js/src/slip.js",
                        "bower_components/eventEmitter/EventEmitter.js",
                        "src/osc-transports.js",
                        "src/platforms/osc-browser.js",
                        "src/platforms/osc-chromeapp.js"
                    ],
                    "dist/osc-browser.min.js": [
                        "src/osc.js",
                        "bower_components/slip.js/src/slip.js",
                        "bower_components/eventEmitter/EventEmitter.js",
                        "src/osc-transports.js",
                        "src/platforms/osc-browser.js"
                    ]
                }
            }
        },

        clean: {
            all: {
                src: ["dist/osc.min.js", "dist/osc-chromeapp.min.js"]
            }
        },

        qunit: {
            all: ["tests/**/*.html"]
        },

        "node-qunit": {
            all: {
                code: {
                    path: "./src/platforms/osc-node.js",
                    namespace: "osc"
                },
                tests: [
                    "./tests/osc-tests.js",
                    "./tests/node-buffer-tests.js",
                    "./tests/node-transport-tests.js"
                ]
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
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-contrib-qunit");
    grunt.loadNpmTasks("grunt-node-qunit");

    grunt.registerTask("default", ["clean", "jshint", "uglify", "qunit", "node-qunit"]);
};
