/*
Copyright 2008-2009 University of Cambridge
Copyright 2008-2010 University of Toronto
Copyright 2010-2011 OCAD University
Copyright 2010-2011 Lucendo Development Ltd.

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

// Declare dependencies
/* global fluid, QUnit */

var jqUnit = jqUnit || {};

(function ($) {
    "use strict";

    var QUnitPassthroughs = ["module", "test", "asyncTest", "throws", "raises", "start", "stop", "expect"];
    QUnit.config.reorder = false; // defeat this QUnit feature which frequently just causes confusion

    for (var i = 0; i < QUnitPassthroughs.length; ++ i) {
        var method = QUnitPassthroughs[i];
        jqUnit[method] = QUnit[method];
        window[method] = undefined; // work around IE8 bug http://stackoverflow.com/questions/1073414/deleting-a-window-property-in-ie
    }
    
    jqUnit.failureHandler = function (args, activity) {
        if (QUnit.config.current) {
            QUnit.ok(false, "Assertion failure (see console.log for expanded message): ".concat(args));
        }
        fluid.builtinFail(false, args, activity);
    };

    fluid.pushSoftFailure(jqUnit.failureHandler);

    /**
     * Keeps track of the order of function invocations. The transcript contains information about
     * each invocation, including its name and the arguments that were supplied to it.
     */
    jqUnit.invocationTracker = function (options) {
        var that = {};
        that.runTestsOnFunctionNamed = options ? options.runTestsOnFunctionNamed : undefined;
        that.testBody = options ? options.testBody : undefined;

        /**
         * An array containing an ordered list of details about each function invocation.
         */
        that.transcript = [];

        /**
         * Called to listen for a function's invocation and record its details in the transcript.
         *
         * @param {Object} fnName the function name to listen for
         * @param {Object} onObject the object on which to invoke the method
         */
        that.intercept = function (fnName, onObject) {
            onObject = onObject || window;

            var wrappedFn = onObject[fnName];
            onObject[fnName] = function () {
                that.transcript.push({
                    name: fnName,
                    args: arguments
                });
                wrappedFn.apply(onObject, arguments);

                if (fnName === that.runTestsOnFunctionNamed) {
                    that.testBody(that.transcript);
                }
            };
        };

        /**
         * Intercepts all the functions on the specified object.
         *
         * @param {Object} obj
         */
        that.interceptAll = function (obj) {
            for (var fnName in obj) {
                that.intercept(fnName, obj);
            }
        };

        that.clearTranscript = function () {
            that.transcript = [];
        };

        return that;
    };

    var messageSuffix = "";
    var processMessage = function (message) {
        return message + messageSuffix;
    };

    var pok = function (condition, message) {
        QUnit.ok(condition, processMessage(message));
    };

    // unsupported, NON-API function
    jqUnit.okWithPrefix = pok;

    // unsupported, NON-API function
    jqUnit.setMessageSuffix = function (suffix) {
        messageSuffix = suffix;
    };

    /***********************
     * xUnit Compatibility *
     ***********************/

    var jsUnitCompat = {
        fail: function (msg) {
            pok(false, msg);
        },

        assert: function (msg) {
            pok(true, msg);
        },

        assertEquals: function (msg, expected, actual) {
            QUnit.equal(actual, expected, processMessage(msg));
        },

        assertNotEquals: function (msg, value1, value2) {
            pok(value1 !== value2, msg);
        },

        assertTrue: function (msg, value) {
            pok(value, msg);
        },

        assertFalse: function (msg, value) {
            pok(!value, msg);
        },

        assertUndefined: function (msg, value) {
            pok(value === undefined, msg);
        },

        assertNotUndefined: function (msg, value) {
            pok(value !== undefined, msg);
        },

        assertValue: function (msg, value) {
            pok(value !== null && value !== undefined, msg);
        },

        assertNoValue: function (msg, value) {
            pok(value === null || value === undefined, msg);
        },

        assertNull: function (msg, value) {
            QUnit.equal(value, null, processMessage(msg));
        },

        assertNotNull: function (msg, value) {
            pok(value !== null, msg);
        },

        assertDeepEq: function (msg, expected, actual) {
            QUnit.propEqual(actual, expected, processMessage(msg));
        },

        assertDeepNeq: function (msg, unexpected, actual) {
            QUnit.notPropEqual(actual, unexpected, processMessage(msg));
        },
        // This version of "expect" offers the cumulative semantic we desire
        expect: function (number) {
            var oldExpect = QUnit.expect();
            QUnit.expect(number + oldExpect);
        }
    };

    // Mix these compatibility functions into the jqUnit namespace.
    $.extend(jqUnit, jsUnitCompat);


    /** Sort a component tree into canonical order, to facilitate comparison with
     * deepEq */

    jqUnit.sortTree = function (tree) {
        function comparator(ela, elb) {
            var ida = ela.ID || "";
            var idb = elb.ID || "";
            var cola = ida.indexOf(":") === -1;
            var colb = idb.indexOf(":") === -1;
            if (cola && colb) { // if neither has a colon, compare by IDs if they have IDs
                return ida.localeCompare(idb);
            }
            else {
                return cola - colb;
            }
        }
        if (fluid.isArrayable(tree)) {
            tree.sort(comparator);
        }
        fluid.each(tree, function (value) {
            if (!fluid.isPrimitive(value)) {
                jqUnit.sortTree(value);
            }
        });

    };

    jqUnit.canonicaliseFunctions = function (tree) {
        return fluid.transform(tree, function (value) {
            if (fluid.isPrimitive(value)) {
                if (typeof(value) === "function") {
                    return fluid.identity;
                }
                else { return value; }
            }
            else { return jqUnit.canonicaliseFunctions(value); }
        });
    };

    /** Assert that two trees are equal after applying a "canonicalisation function". This can be used in
     * cases where the criterion for equivalence is looser than exact object equivalence - for example,
     * when using renderer trees, "jqUnit.sortTree" can be used for canonFunc", or in the case
     * of a resourceSpec, "jqUnit.canonicaliseFunctions". **/

    jqUnit.assertCanoniseEqual = function (message, expected, actual, canonFunc) {
        var expected2 = canonFunc(expected);
        var actual2 = canonFunc(actual);
        jqUnit.assertDeepEq(message, expected2, actual2);
    };

    /** Assert that the actual value object is a subset (considered in terms of shallow key coincidence) of the
     * expected value object (this method is the one that will be most often used in practice) **/

    jqUnit.assertLeftHand = function (message, expected, actual) {
        jqUnit.assertDeepEq(message, expected, fluid.filterKeys(actual, fluid.keys(expected)));
    };

    /** Assert that the actual value object is a superset of the expected value object **/

    jqUnit.assertRightHand = function (message, expected, actual) {
        jqUnit.assertDeepEq(message, fluid.filterKeys(expected, fluid.keys(actual)), actual);
    };
    
    /** Assert that the supplied callback will produce a framework diagnostic, containing the supplied text
     * somewhere in its error message - that is, the framework will invoke fluid.fail with a message containing
     * <code>errorText</code>.
     * @param message {String} The message prefix to be supplied for all the assertions this function issues
     * @param toInvoke {Function} A no-arg function holding the code to be tested for emission of the diagnostic
     * @param errorTexts {String} or {Array of String} Either a single string or array of strings which the <code>message</code> field
     * of the thrown exception will be tested against - each string must appear as a substring in the text
     */
     
    jqUnit.expectFrameworkDiagnostic = function (message, toInvoke, errorTexts) {
        errorTexts = fluid.makeArray(errorTexts);
        try {
            fluid.pushSoftFailure(true);
            jqUnit.expect(1 + errorTexts.length);
            toInvoke();
        } catch (e) {
            jqUnit.assertTrue(message, e instanceof fluid.FluidError);
            fluid.each(errorTexts, function (errorText) {
                jqUnit.assertTrue(message + " - message text", e.message.indexOf(errorText) >= 0);
            });
        } finally {
            fluid.pushSoftFailure(-1);
        }
    };

})(jQuery);
