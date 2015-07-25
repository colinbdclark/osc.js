/*
Copyright 2010-2012 Lucendo Development Ltd.

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

// Declare dependencies
/* global jqUnit, QUnit */

var fluid_2_0 = fluid_2_0 || {};

(function ($, fluid) {
    "use strict";

    fluid.registerNamespace("fluid.test");

    fluid.defaults("fluid.test.testEnvironment", {
        gradeNames: ["fluid.eventedComponent", "autoInit"],
        components: {
            sequenceListener: {
                type: "fluid.test.sequenceListener"
            }
        },
        hangWait: 5000, // number of milliseconds to wait for a listener fixture before emitting a diagnostic
        events: {
            onBeginSequence: null,
            onBeginSequenceStep: null,
            onEndSequenceStep: null,
            onEndSequence: null,
            onSequenceHang: null
        },
        members: {
            activeTests: 0,
            capturedMarkup: {
                expander: {
                    funcName: "fluid.test.captureMarkup",
                    args: "{that}.options.markupFixture"
                }
            }
        },
        listeners: {
            onCreate: {
                listener: "fluid.test.testEnvironment.runTests",
                args: "{that}"
            },
            "onBeginSequenceStep.checkHang": {
                listener: "fluid.test.checkHang.beginStep",
                args: ["{arguments}.1", "{that}"]
            },
            "onEndSequence.checkHang": {
                listener: "fluid.test.checkHang.endSequence",
                args: ["{arguments}.1", "{that}"]
            },
            "onSequenceHang.checkHang": {
                listener: "fluid.test.checkHang.reportHang",
                args: ["{arguments}.0", "{that}"]
            }
        }
    });
    
    fluid.registerNamespace("fluid.test.checkHang");
    
    fluid.test.checkHang.beginStep = function (sequenceState, testEnvironment) {
        clearTimeout(sequenceState.hangTimer);
        sequenceState.hangTimer = setTimeout(
            function () {
                testEnvironment.events.onSequenceHang.fire(sequenceState);
            }, testEnvironment.options.hangWait);
    };
    
    fluid.test.checkHang.endSequence = function (sequenceState) {
        clearTimeout(sequenceState.hangTimer);
    };
    
    fluid.test.checkHang.reportHang = function (sequenceState, testEnvironment) {
        fluid.log(fluid.logLevel.IMPORTANT, "Test case listener has not responded after " + testEnvironment.options.hangWait + "ms - at sequence pos " +
            sequenceState.sequenceText() + " sequence element ", sequenceState.fixture.sequence[sequenceState.sequencePos - 1], " of fixture " + sequenceState.fixture.name);
    };

    fluid.demands("fluid.test.sequenceListener", [], {funcName: "fluid.emptySubcomponent"});

    /** In the browser only, hijack a piece of the QUnit UI in order to show the running sequence number **/

    fluid.demands("fluid.test.sequenceListener", "fluid.browser", {funcName: "fluid.test.browserSequenceListener"});

    fluid.defaults("fluid.test.browserSequenceListener", {
        gradeNames: ["fluid.eventedComponent", "autoInit"],
        listeners: {
            "{testEnvironment}.events.onBeginSequence": {
                listener: "fluid.test.browserSequenceListener.onBeginSequence",
                args: ["{that}", "{arguments}.1"]
            },
            "{testEnvironment}.events.onBeginSequenceStep": {
                listener: "fluid.test.browserSequenceListener.onBeginSequenceStep",
                args: "{that}"
            }
        }
    });

    fluid.test.browserSequenceListener.onBeginSequence = function (that, sequenceExecutor) {
        // This unfortunate style is as good as the qunit markup!
        $("#qunit-testresult").append(" &mdash; at sequence position <span class=\"jqunit-sequence\"></span>");
        that.sequenceElement = $("#qunit-testresult .jqunit-sequence");
        that.renderSequence = function () {
            that.sequenceElement.text(sequenceExecutor.sequenceText());
        };
        that.renderSequence();
    };

    fluid.test.browserSequenceListener.onBeginSequenceStep = function (that) {
        that.renderSequence();
    };

    fluid.test.makeExpander = function (that) {
        return function (toExpand) {
            return fluid.expandOptions(toExpand, that);
        };
    };

    fluid.test.makeFuncExpander = function (expander) {
        return function (toExpand) {
            var testFunc = expander(toExpand);
            if (typeof(testFunc) === "string") {
                testFunc = fluid.getGlobalValue(testFunc);
            }
            return testFunc;
        };
    };

    fluid.test.expandModuleSource = function (moduleSource, testCaseState) {
        var funcSpec = moduleSource.func || moduleSource.funcName;
        var func = testCaseState.expandFunction(funcSpec);
        var args = testCaseState.expand(fluid.makeArray(moduleSource.args));
        return func.apply(null, args);
    };

    fluid.test.captureMarkup = function (markupFixture) {
        if (markupFixture) {
            var markupContainer = fluid.container(markupFixture, false);
            return {
                container: markupContainer,
                markup: markupContainer[0].innerHTML
            };
        }
    };

    fluid.test.testEnvironment.runTests = function (that) {
        var visitOptions = {};
        that.testCaseHolders = [];
        var visitor = function (component) {
            if (fluid.hasGrade(component.options, "fluid.test.testCaseHolder")) {
                that.testCaseHolders.push(component);
            }
        };
        fluid.visitComponentChildren(that, visitor, visitOptions, "");
        // This structure is constructed here, reused for each "TestCaseHolder" but is given a shallow
        // clone in "sequenceExecutor".
        var testCaseState = {
            root: that,
            events: that.events,
            hangWait: that.options.hangWait
        };
        if (that.options.markupFixture) {
            that.events.afterDestroy.addListener(function () {
                that.capturedMarkup.container[0].innerHTML = that.capturedMarkup.markup;
            });
        }
        fluid.each(that.testCaseHolders, function (testCaseHolder) {
            testCaseState.started = false;
            testCaseState.testCaseHolder = testCaseHolder;
            testCaseState.expand = fluid.test.makeExpander(testCaseHolder);
            testCaseState.expandFunction = fluid.test.makeFuncExpander(testCaseState.expand);
            if (testCaseHolder.options.moduleSource) {
                testCaseHolder.options.modules = fluid.test.expandModuleSource(testCaseHolder.options.moduleSource, testCaseState, testCaseHolder);
            }
            fluid.test.processTestCaseHolder(testCaseState);
        });
        // Fire this event so that environments which registered no tests (due to qunit filtering)
        // will terminate immediately
        fluid.test.noteTest(testCaseState.root, 0);
    };

    fluid.defaults("fluid.test.testCaseHolder", {
        gradeNames: ["fluid.eventedComponent", "autoInit"],
        mergePolicy: {
            modules: "noexpand",
            moduleSource: "noexpand"
        },
        events: {
            onTestCaseStart: null
        }
    });

    fluid.test.noteTest = function (root, count) {
        if (root.activeTests === "destroyed") {
            return;
        }
        root.activeTests += count;
        if (count === -1) {
            fluid.log(fluid.logLevel.TRACE, "Restarting QUnit for new fixture from environment ", root);
            QUnit.start();
        }
        if (root.activeTests === 0) {
            root.destroy();
            root.activeTests = "destroyed";
        }
    };

    fluid.test.decodeListener = function (testCaseState, fixture) {
        var listener, member;
        if (fixture.listener) {
            member = "listener";
            listener = testCaseState.expandFunction(fixture.listener);
        }
        else if (fixture.listenerMaker) {
            member = "listenerMaker";
            var maker = testCaseState.expandFunction(fixture.listenerMaker);
            if (!maker || !maker.apply) {
                fluid.fail("Unable to decode entry " + fixture.listenerMaker + " of fixture ", fixture, " to a function - got ", maker);
            }
            var args = testCaseState.expand(fixture.makerArgs);
            listener = maker.apply(null, args);
        } else {
            listener = fluid.identity;
        }
        if (typeof(listener) !== "function") {
            fluid.fail("Unable to decode entry " + member + " of fixture ", fixture, " to a function - record is ", listener);
        }
        var togo;
        if (fixture.args) {
            togo = function () {
                var expandedArgs = fluid.expandOptions(fixture.args, testCaseState.testCaseHolder, {}, {"arguments": arguments});
                return listener.apply(null, expandedArgs);
            };
        } else {
            togo = listener;
        }
        return togo;
    };

    fluid.test.decodeElement = function (testCaseState, fixture) {
        var element = testCaseState.expand(fixture.element);
        var jel = fluid.wrap(element);
        if (!jel || jel.length === 0) {
            fluid.fail("Unable to decode entry \"element\" of fixture ", fixture, " to a DOM element");
        }
        return jel;
    };

    fluid.test.decoders = {};

    fluid.test.decoders.func = function (testCaseState, fixture) {
        return {
            execute: function () {
                var testFunc = testCaseState.expandFunction(fixture.func || fixture.funcName);
                var args = testCaseState.expand(fixture.args);
                if (typeof(testFunc) !== "function") {
                    fluid.fail("Unable to decode entry func or funcName of fixture ", fixture, " to a function - got ", testFunc);
                }
                testFunc.apply(null, fluid.makeArray(args));
            }
        };
    };

    fluid.test.decoders.funcName = fluid.test.decoders.func;

    fluid.test.decoders.jQueryTrigger = function (testCaseState, fixture) {
        var event = fixture.jQueryTrigger;
        return {
            execute: function () {
                var args = fluid.makeArray(testCaseState.expand(fixture.args));
                args.unshift(event);
                var element = fluid.test.decodeElement(testCaseState, fixture);
                element.trigger.apply(element, args);
            }
        };
    };

    fluid.test.decoders.jQueryBind = function (testCaseState, fixture) {
        var event = fixture.jQueryBind;
        var listener = fluid.test.decodeListener(testCaseState, fixture);
        var element;
        var that = fluid.test.makeBinder(listener,
            function (wrapped) {
                element = fluid.test.decodeElement(testCaseState, fixture);
                var args = fluid.makeArray(testCaseState.expand(fixture.args));
                args.unshift(event);
                args.push(wrapped);
                element.one.apply(element, args);
            }, fluid.identity  // do nothing on unbind, jQuery.one has done it
        );
        return that;
    };
    
    fluid.test.composeSimple = function (f1, f2) {
        return function () {
            f1();
            f2();
        };
    };

    fluid.test.makeBinder = function (listener, innerBinder, innerRemover) {
        var that = {};
        that.bind = function (preWrap, postWrap) {
            var wrapped = function () {
                innerRemover(wrapped); // Since we have just fired, we can now unbind ourselves from whatever the listener was bound to
                preWrap();
                listener.apply(null, arguments);
                postWrap();
            };
            innerBinder(wrapped);
        };
        return that;
    };

    // TODO: This will eventually go into the core framework for "Luke Skywalker Event Binding"
    fluid.analyseTarget = function (testCaseState, material, expectedPrefix) {
        if (typeof(material) === "string" && material.charAt(0) === "{") {
            var parsed = fluid.parseContextReference(material);
            if (fluid.isIoCSSSelector(parsed.context)) {
                var selector = fluid.parseSelector(parsed.context, fluid.IoCSSMatcher);
                var headContext = fluid.extractSelectorHead(selector);
                var holder = testCaseState.testCaseHolder;
                var head = fluid.resolveContext(headContext, holder);
                if (!head) {
                    fluid.fail("Error in test case selector ", material, " cannot resolve to a root component from holder ", holder);
                }
                var segs = fluid.model.parseEL(parsed.path);
                if (segs.length < 2 || segs[0] !== expectedPrefix) {
                    fluid.fail("Error in test case selector ", material, " must start with path " + expectedPrefix);
                }
                return {selector: selector, head: head, path: segs.slice(1)};
            }
        }
        return {resolved: testCaseState.expand(material)};
    };

    fluid.test.decoders.event = function (testCaseState, fixture) {
        var analysed = fluid.analyseTarget(testCaseState, fixture.event, "events");
        var listener = fluid.test.decodeListener(testCaseState, fixture);
        var bind, unbind;
        if (analysed.resolved) {
            var event = analysed.resolved;
            bind = function (wrapped) {
                event.addListener(wrapped, fixture.namespace, null, fixture.priority);
            };
            unbind = function (wrapped) {
                event.removeListener(wrapped);
            };
        }
        else if (analysed.path) {
            var id;

            bind = function (wrapped) {
                var options = {};
                fluid.set(options, ["listeners"].concat(analysed.path), {
                    listener: wrapped,
                    args: fixture.args,
                    namespace: fixture.namespace,
                    priority: fixture.priority
                });
                id = fluid.pushDistributions(analysed.head, analysed.selector,
                    [{options: options, recordType: "distribution", priority: fluid.mergeRecordTypes.distribution}]
                );
            };
            unbind = function () {
                fluid.clearDistributions(analysed.head, id);
            };
        } else {
            fluid.fail("Error decoding event fixture ", fixture, ": must be able to look up member \"event\" to one or more events");
        }
        return fluid.test.makeBinder(listener, bind, unbind);
    };

    fluid.test.decoders.changeEvent = function (testCaseState, fixture) {
        var event = testCaseState.expand(fixture.changeEvent);
        var listener = fluid.test.decodeListener(testCaseState, fixture);
        var that = fluid.test.makeBinder(listener,
           function (wrapped) {
            var spec = fixture.path === undefined ? fixture.spec : {path: fixture.path};
            if (spec === undefined || spec.path === undefined) {
                fluid.fail("Error in changeEvent fixture ", fixture,
                   ": could not find path specification named \"path\" or \"spec\"");
            }
            if (event.isRelayEvent) { // special support for new-style change listeners
                spec.transactional = true;
                if (spec.priority === undefined) {
                    spec.priority = "last";
                }
            }
            event.addListener(spec, wrapped, fixture.namespace);
        }, function (wrapped) {
            event.removeListener(wrapped);
        });
        return that;
    };

    fluid.test.decoderDucks = ["func", "funcName", "event", "changeEvent", "jQueryTrigger", "jQueryBind"];

    fluid.test.decodeFixture = function (testCaseState, fixture) {
        var ducks = fluid.test.decoderDucks;
        var decoded = fluid.find(ducks, function (duck) {
            if (fixture[duck]) {
                return fluid.test.decoders[duck](testCaseState, fixture);
            }
        });
        if (decoded) {
            return decoded;
        }
        else {
            fluid.fail("Could not decode fixture record ", fixture,
                " as a valid fixture type - must contain key chosen from " +
                ducks.join(", "));
        }
    };

    fluid.test.execExecutor = function (executor, sequenceText) {
        jqUnit.setMessageSuffix(" - at sequence position " + sequenceText);
        executor.execute();
        jqUnit.setMessageSuffix("");
    };


    fluid.test.bindExecutor = function (binder, preWrap, postWrap, sequenceText) {
        function preFunc() {
            jqUnit.setMessageSuffix(" - at sequence position " + sequenceText);
        }
        function postFunc() {
            jqUnit.setMessageSuffix("");
        }
        var c = fluid.test.composeSimple;
        binder.bind(c(preWrap, preFunc), c(postFunc, postWrap));
    };

    // This check executes immediately BEFORE an initial execute or AFTER an initial bind
    fluid.test.checkTestStart = function (testCaseState) {
        if (!testCaseState.started) { // Support for FLUID-4929
            testCaseState.started = true;
            testCaseState.testCaseHolder.events.onTestCaseStart.fire(testCaseState.testCaseHolder);
        }
    };

    fluid.test.sequenceExecutor = function (testCaseState, fixture) {
        // lightweight pseudocomponent "that" holding per-sequence state
        // TODO: Why on earth did we not use the IoC system itself for this?
        var that = {
            testCaseState: $.extend({}, testCaseState),
            count: fixture.sequence.length,
            fixture: fixture,
            sequencePos: 0,
            executors: []
        };
        if (fixture.sequence.length === 0) {
            fluid.fail("Error in test fixture ", fixture, ": no elements in sequence");
        }
        that.decode = function (pos) {
            that.executors[pos] = fluid.test.decodeFixture(that.testCaseState, that.fixture.sequence[pos]);
            return that.executors[pos];
        };
        that.sequenceText = function (pos) {
            return (pos === undefined ? that.sequencePos : pos) + " of " + that.count;
        };
        testCaseState.events.onBeginSequence.fire(testCaseState, that);
        
        var finishSequence = function () {
            testCaseState.events.onEndSequence.fire(testCaseState, that);
            testCaseState.finisher();
        };

        that.decode(0);
        // this: exec, next: exec - do 1st exec, then 2nd exec (EX)
        // this: exec, next: bind - do 2nd bind (EX) FIRST, then exec [ODD - out of order]
        // this: bind, next: bind - do this bind, and send it 2nd bind (EX) as pre-wrapper
        // this: bind, next: exec - do this bind, send it exec (EX) as post-wrapper
        that.execute = function () {
            var thisExec = that.executors[that.sequencePos];
            if (thisExec.execute) { // All exec cases up front, all bind cases afterwards
                fluid.test.checkTestStart(testCaseState);
            }
            var pos = ++that.sequencePos;
            var thisText = that.sequenceText(pos);
            testCaseState.events.onBeginSequenceStep.fire(testCaseState, that);
            var last = pos === that.count;
            if (last) {
                if (thisExec.execute) {
                    fluid.test.execExecutor(thisExec, thisText);
                    finishSequence();
                }
                else {
                    fluid.test.bindExecutor(thisExec, fluid.identity, finishSequence, thisText);
                    fluid.test.checkTestStart(testCaseState);
                }
                return;
            }
            var nextExec = that.decode(pos); // decode the NEXT executor

            if (thisExec.bind) {
                var wrappers = nextExec.bind ? [that.execute, fluid.identity] :
                    [fluid.identity, that.execute];
                fluid.test.bindExecutor(thisExec, wrappers[0], wrappers[1], thisText);
                fluid.test.checkTestStart(testCaseState);
            }

            if (thisExec.execute) {
                if (nextExec.bind) {
                    that.execute(); // bind first [ODD]
                    fluid.test.execExecutor(thisExec, thisText);
                }
                else {
                    fluid.test.execExecutor(thisExec, thisText);
                    that.execute();
                }
            }
        };

        return that;
    };

    fluid.test.makeTestRunner = function () {
        var that = {
            index: 0,
            stopped: true,
            envs: []
        };
        that.next = function () {
            if (that.index < that.envs.length) {
                that.stopped = false;
                var env = that.envs[that.index];
                if (typeof(env) === "string") {
                    env = {type: env};
                }
                var options = $.extend(true, {}, env.options, {
                    listeners: {
                        afterDestroy: that.nextLater
                    }
                });
                if (!env.type) {
                    fluid.fail("Error in IoC Testing fixture - required member \"type\" was not found - fixture was ", env);
                }
                fluid.invokeGlobalFunction(env.type, [options]);
                that.index++;
            } else {
                that.stopped = true;
            }
        };
        that.nextLater = function () {
            fluid.invokeLater(that.next);
        };
        that.append = function (envs) {
            that.envs = that.envs.concat(envs);
            if (that.stopped) {
                that.next();
            }
        };
        return that;
    };

    /** Top-level driver function for users. Supply an array of grade names holding the
     *  list of the testing environments to be executed in sequence
     *  @param envs (Array of string/object) The testing environments to be executed - either a simple
     *  string holding the testing environment's name, or a record {type: typeName, options: options} holding
     *  IoC configuration for the environment as if for a subcomponent.
     */

    fluid.test.runTests = function (envs) {
        if (!fluid.test.iocTestState) {
            fluid.test.iocTestState = fluid.test.makeTestRunner();
        }
        fluid.test.iocTestState.append(envs);
    };

    fluid.test.processTestCase = function (testCaseState) {
        var testCase = testCaseState.testCase;
        jqUnit.module(testCase.name);
        var fixtures = fluid.makeArray(testCase.tests);
        fluid.each(fixtures, function (fixture) {
            var testType = "asyncTest";

            var testFunc = function () {
                if (fixture.expect !== undefined) {
                    jqUnit.expect(fixture.expect);
                }
                if (fixture.sequence) {
                    fluid.test.sequenceExecutor(testCaseState, fixture).execute();
                }
                else {
                    var decoded = fluid.test.decodeFixture(testCaseState, fixture);
                    if (decoded.execute) {
                        decoded.execute();
                        testCaseState.finisher();
                    }
                }
            };
            // Note that this test relies on an implementation detail of qunit. For those
            // tests which fail the "validTest" test due to being filtered out in the UI,
            // they result in no material placed in the queue. We escape the case where they
            // might enter the queue and immediately leave it as a result of only ever issuing
            // asynchronous tests
            var oldLength = QUnit.config.queue.length;
            jqUnit[testType](fixture.name, testFunc);
            if (QUnit.config.queue.length === oldLength) {
                fluid.log(fluid.logLevel.IMPORTANT, "Skipped test " + fixture.name);
            }
            else {
                fluid.log(fluid.logLevel.IMPORTANT, "Successfully queued test " + fixture.name);
                fluid.test.noteTest(testCaseState.root, 1);
            }
        });
    };

    fluid.test.processTestCaseHolder = function (testCaseState) {
        var modules = fluid.makeArray(testCaseState.testCaseHolder.options.modules);
        if (modules.length === 0) {
            fluid.fail("Error in test case environment ", testCaseState, ": no modules found in options.modules");
        }
        fluid.each(modules, function (testCase) {
            testCaseState.testCase = testCase;
            testCaseState.finisher = function () {
                fluid.invokeLater(function () { // finish asynchronously to avoid destroying components that may be listening in final fixture
                    fluid.test.noteTest(testCaseState.root, -1);
                });
            };
            fluid.test.processTestCase(testCaseState);
        });
    };

})(jQuery, fluid_2_0);
