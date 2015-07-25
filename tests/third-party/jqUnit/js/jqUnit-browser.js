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

var jqUnit = jqUnit || {};

// A function to load the testswarm agent if running in the testswarm environment
// This code was derived from testsuite.js ( http://code.google.com/p/jquery-ui/source/browse/trunk/tests/unit/testsuite.js )
(function ($, fluid) {
    "use strict";

    var param = "swarmURL=";
    var url = window.location.search;
    url = decodeURIComponent(url.slice(url.indexOf(param) + param.length));

    if (url && url.indexOf("http") === 0) {
        var injectPath = window.location.protocol + "//" + window.location.host + "/js/inject.js";
        document.write("<scr" + "ipt src='" + injectPath + "?" + (new Date()).getTime() + "'></scr" + "ipt>"); /* from testswarm setup */ // jshint ignore:line
    }


    /*******************************************
     * Browser-dependent jqUnit test functions *
     *******************************************/

    var testFns = {
        isVisible: function (msg, selector) {
            jqUnit.okWithPrefix($(selector).is(":visible"), msg);
        },

        notVisible: function (msg, selector) {
            jqUnit.okWithPrefix($(selector).is(":hidden"), msg);
        },

        exists: function (msg, selector) {
            jqUnit.okWithPrefix((selector)[0], msg);
        },

        notExists: function (msg, selector) {
            jqUnit.okWithPrefix(!$(selector)[0], msg);
        },

        // Overrides jQuery's animation routines to be synchronous. Careful!
        subvertAnimations: function () {
            $.fn.fadeIn = function (speed, callback) {
                this.show();
                if (callback) {
                    callback();
                }
            };

            $.fn.fadeOut = function (speed, callback) {
                this.hide();
                if (callback) {
                    callback();
                }
            };
        }
    };

    // Mix these test functions into the jqUnit namespace.
    $.extend(jqUnit, testFns);


    /*
     * A number of utility functions for creating "duck-type" events for testing various key
     * stroke combinations.
     */

    jqUnit.bindKeySimulator = function (keyLookup, targetNamespace) {
        var tn = fluid.registerNamespace(targetNamespace);
        tn.keyEvent = function (keyCode, target) {
            return {
                keyCode: keyLookup[keyCode],
                target: fluid.unwrap(target),
                preventDefault: function () {},
                stopPropagation: function () {}
            };
        };

        tn.ctrlKeyEvent = function (keyCode, target) {
            return tn.modKeyEvent("CTRL", keyCode, target);
        };


        tn.modKeyEvent = function (modifier, keyCode, target) {
            var togo = tn.keyEvent(keyCode, target);
            modifier = jQuery.makeArray(modifier);
            for (var i = 0; i < modifier.length; ++ i) {
                var mod = modifier[i];
                if (mod === "CTRL") {
                    togo.ctrlKey = true;
                }
                else if (mod === "SHIFT") {
                    togo.shiftKey = true;
                }
                else if (mod === "ALT") {
                    togo.altKey = true;
                }
            }
            return togo;
        };
    };

    // Canonicalise a list of DOM elements (or a jQuery) by converting elements to their ids (allocated if necessary)
    jqUnit.canonicaliseDom = function (list) {
        return fluid.transform(list, function (element) {
            return fluid.allocateSimpleId(element);
        });
    };

    // Compare two lists of DOM elements (or jQueries) for being equal by virtue of containing the same DOM elements
    jqUnit.assertDomEquals = function (message, expected, actual) {
        return jqUnit.assertCanoniseEqual(message, expected, actual, jqUnit.canonicaliseDom);
    };

    /** Condense a DOM node into a plain Javascript object, to facilitate testing against
     * a trial, with the use of assertDeepEq or similar
     */
    jqUnit.assertNode = function (message, expected, node) {
        if (!node.nodeType) { // Some types of DOM nodes (e.g. select) have a valid "length" property
            if (node.length === 1 && expected.length === undefined) {
                node = node[0];
            }
            else if (node.length !== undefined) {
                jqUnit.assertEquals("Expected number of nodes " + message, expected.length, node.length);
                for (var i = 0; i < node.length; ++ i) {
                    jqUnit.assertNode(message + ": node " + i + ": ", expected[i], node[i]);
                }
                return;
            }
        }
        for (var key in expected) {
            // mustn't use DOM getAttribute because of numerous bugs (in particular http://www.quirksmode.org/bugreports/archives/2007/03/getAttributefor_is_always_null_in_Internet_Explore.html )
            var attr = jQuery.attr(node, key);
            var messageExt = " - attribute " + key + "";
            if (key === "nodeName") {
                attr = node.tagName.toLowerCase();
                messageExt = " - node name";
            }
            else if (key === "nodeText") {
                attr = jQuery.trim(fluid.dom.getElementText(node));
            }
            else if (key === "nodeHTML") {
                attr = $(node).html();
            }
            var evalue = expected[key];
            var pass = evalue === attr;
            if (attr === false || attr === true) { // support for IE refusing to honour XHTML values
                pass = !!evalue === attr; /* convert evalue to boolean */ // jshint ignore:line
            }
            if (key !== "children") {
                jqUnit.assertTrue(message + messageExt + " expected value: " + evalue + " actual: " + attr, pass);
            }
            else {
                var children = $("> *", node);
                jqUnit.assertNode("> " + message, evalue, children);
            }
        }
    };

})(jQuery, fluid_2_0);
