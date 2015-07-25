/*
Copyright 2008-2010 University of Cambridge
Copyright 2008-2009 University of Toronto
Copyright 2010-2011 Lucendo Development Ltd.
Copyright 2010-2014 OCAD University

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

var fluid_2_0 = fluid_2_0 || {};

(function ($, fluid) {
    "use strict";

    /** NOTE: The contents of this file are by default NOT PART OF THE PUBLIC FLUID API unless explicitly annotated before the function **/

    /** MODEL ACCESSOR ENGINE **/

    /** Standard strategies for resolving path segments **/

    fluid.model.makeEnvironmentStrategy = function (environment) {
        return function (root, segment, index) {
            return index === 0 && environment[segment] ?
                environment[segment] : undefined;
        };
    };

    fluid.model.defaultCreatorStrategy = function (root, segment) {
        if (root[segment] === undefined) {
            root[segment] = {};
            return root[segment];
        }
    };

    fluid.model.defaultFetchStrategy = function (root, segment) {
        return root[segment];
    };

    fluid.model.funcResolverStrategy = function (root, segment) {
        if (root.resolvePathSegment) {
            return root.resolvePathSegment(segment);
        }
    };

    fluid.model.traverseWithStrategy = function (root, segs, initPos, config, uncess) {
        var strategies = config.strategies;
        var limit = segs.length - uncess;
        for (var i = initPos; i < limit; ++i) {
            if (!root) {
                return root;
            }
            var accepted;
            for (var j = 0; j < strategies.length; ++ j) {
                accepted = strategies[j](root, segs[i], i + 1, segs);
                if (accepted !== undefined) {
                    break; // May now short-circuit with stateless strategies
                }
            }
            if (accepted === fluid.NO_VALUE) {
                accepted = undefined;
            }
            root = accepted;
        }
        return root;
    };

    /** Returns both the value and the path of the value held at the supplied EL path **/
    fluid.model.getValueAndSegments = function (root, EL, config, initSegs) {
        return fluid.model.accessWithStrategy(root, EL, fluid.NO_VALUE, config, initSegs, true);
    };

    // Very lightweight remnant of trundler, only used in resolvers
    fluid.model.makeTrundler = function (config) {
        return function (valueSeg, EL) {
            return fluid.model.getValueAndSegments(valueSeg.root, EL, config, valueSeg.segs);
        };
    };

    fluid.model.getWithStrategy = function (root, EL, config, initSegs) {
        return fluid.model.accessWithStrategy(root, EL, fluid.NO_VALUE, config, initSegs);
    };

    fluid.model.setWithStrategy = function (root, EL, newValue, config, initSegs) {
        fluid.model.accessWithStrategy(root, EL, newValue, config, initSegs);
    };

    fluid.model.accessWithStrategy = function (root, EL, newValue, config, initSegs, returnSegs) {
        // This function is written in this unfortunate style largely for efficiency reasons. In many cases
        // it should be capable of running with 0 allocations (EL is preparsed, initSegs is empty)
        if (!fluid.isPrimitive(EL) && !fluid.isArrayable(EL)) {
            var key = EL.type || "default";
            var resolver = config.resolvers[key];
            if (!resolver) {
                fluid.fail("Unable to find resolver of type " + key);
            }
            var trundler = fluid.model.makeTrundler(config); // very lightweight trundler for resolvers
            var valueSeg = {root: root, segs: initSegs};
            valueSeg = resolver(valueSeg, EL, trundler);
            if (EL.path && valueSeg) { // every resolver supports this piece of output resolution
                valueSeg = trundler(valueSeg, EL.path);
            }
            return returnSegs ? valueSeg : (valueSeg ? valueSeg.root : undefined);
        }
        else {
            return fluid.model.accessImpl(root, EL, newValue, config, initSegs, returnSegs, fluid.model.traverseWithStrategy);
        }
    };

    // Implementation notes: The EL path manipulation utilities here are somewhat more thorough
    // and expensive versions of those provided in Fluid.js - there is some duplication of
    // functionality. This is a tradeoff between stability and performance - the versions in
    // Fluid.js are the most frequently used and do not implement escaping of characters .
    // as \. and \ as \\ as the versions here. The implementations here are not
    // performant and are left here partially as an implementation note. Problems will
    // arise if clients manipulate JSON structures containing "." characters in keys as if they
    // are models. The basic utilities fluid.path(), fluid.parseEL and fluid.composePath are
    // the ones recommended for general users and the following implementations will
    // be upgraded to use regexes in future to make them better alternatives

    fluid.registerNamespace("fluid.pathUtil");

    var getPathSegmentImpl = function (accept, path, i) {
        var segment = null; // TODO: rewrite this with regexes and replaces
        if (accept) {
            segment = "";
        }
        var escaped = false;
        var limit = path.length;
        for (; i < limit; ++i) {
            var c = path.charAt(i);
            if (!escaped) {
                if (c === ".") {
                    break;
                }
                else if (c === "\\") {
                    escaped = true;
                }
                else if (segment !== null) {
                    segment += c;
                }
            }
            else {
                escaped = false;
                if (segment !== null) {
                    segment += c;
                }
            }
        }
        if (segment !== null) {
            accept[0] = segment;
        }
        return i;
    };

    var globalAccept = []; // TODO: serious reentrancy risk here, why is this impl like this?

    /** A version of fluid.model.parseEL that apples escaping rules - this allows path segments
     * to contain period characters . - characters "\" and "}" will also be escaped. WARNING -
     * this current implementation is EXTREMELY slow compared to fluid.model.parseEL and should
     * not be used in performance-sensitive applications */
    // supported, PUBLIC API function
    fluid.pathUtil.parseEL = function (path) {
        var togo = [];
        var index = 0;
        var limit = path.length;
        while (index < limit) {
            var firstdot = getPathSegmentImpl(globalAccept, path, index);
            togo.push(globalAccept[0]);
            index = firstdot + 1;
        }
        return togo;
    };

    // supported, PUBLIC API function
    fluid.pathUtil.composeSegment = function (prefix, toappend) {
        toappend = toappend.toString();
        for (var i = 0; i < toappend.length; ++i) {
            var c = toappend.charAt(i);
            if (c === "." || c === "\\" || c === "}") {
                prefix += "\\";
            }
            prefix += c;
        }
        return prefix;
    };

    /** Escapes a single path segment by replacing any character ".", "\" or "}" with
     * itself prepended by \
     */
    // supported, PUBLIC API function
    fluid.pathUtil.escapeSegment = function (segment) {
        return fluid.pathUtil.composeSegment("", segment);
    };

    /**
     * Compose a prefix and suffix EL path, where the prefix is already escaped.
     * Prefix may be empty, but not null. The suffix will become escaped.
     */
    // supported, PUBLIC API function
    fluid.pathUtil.composePath = function (prefix, suffix) {
        if (prefix.length !== 0) {
            prefix += ".";
        }
        return fluid.pathUtil.composeSegment(prefix, suffix);
    };

    /**
     * Compose a set of path segments supplied as arguments into an escaped EL expression. Escaped version
     * of fluid.model.composeSegments
     */

    // supported, PUBLIC API function
    fluid.pathUtil.composeSegments = function () {
        var path = "";
        for (var i = 0; i < arguments.length; ++ i) {
            path = fluid.pathUtil.composePath(path, arguments[i]);
        }
        return path;
    };

    fluid.model.unescapedParser = {
        parse: fluid.model.parseEL,
        compose: fluid.model.composeSegments
    };

    // supported, PUBLIC API record
    fluid.model.defaultGetConfig = {
        parser: fluid.model.unescapedParser,
        strategies: [fluid.model.funcResolverStrategy, fluid.model.defaultFetchStrategy]
    };

    // supported, PUBLIC API record
    fluid.model.defaultSetConfig = {
        parser: fluid.model.unescapedParser,
        strategies: [fluid.model.funcResolverStrategy, fluid.model.defaultFetchStrategy, fluid.model.defaultCreatorStrategy]
    };

    fluid.model.escapedParser = {
        parse: fluid.pathUtil.parseEL,
        compose: fluid.pathUtil.composeSegments
    };

    // supported, PUBLIC API record
    fluid.model.escapedGetConfig = {
        parser: fluid.model.escapedParser,
        strategies: [fluid.model.defaultFetchStrategy]
    };

    // supported, PUBLIC API record
    fluid.model.escapedSetConfig = {
        parser: fluid.model.escapedParser,
        strategies: [fluid.model.defaultFetchStrategy, fluid.model.defaultCreatorStrategy]
    };

    /** MODEL COMPONENT HIERARCHY AND RELAY SYSTEM **/

    fluid.initSimpleModel = function (that, optionsModel) {
        that.model = optionsModel || {};
        return that.model;
    };

    fluid.initRelayModel = function (that, modelRelayModel) {
        return modelRelayModel;
    };

    // TODO: This utility compensates for our lack of control over "wave of explosions" initialisation - we may
    // catch a model when it is apparently "completely initialised" and that's the best we can do, since we have
    // missed its own initial transaction

    fluid.isModelComplete = function (that) {
        return that.model !== fluid.inEvaluationMarker;
    };

    // Enlist this model component as part of the "initial transaction" wave - note that "special transaction" init
    // is indexed by component, not by applier, and has special record type (complete + initModel), not transaction
    fluid.enlistModelComponent = function (that) {
        var instantiator = fluid.getInstantiator(that);
        var enlist = instantiator.modelTransactions.init[that.id];
        if (!enlist) {
            enlist = {
                that: that,
                applier: fluid.getForComponent(that, "applier"), // required for FLUID-5504 even though currently unused
                complete: fluid.isModelComplete(that)
            };
            instantiator.modelTransactions.init[that.id] = enlist;
        }
        return enlist;
    };

    // Utility to coordinate with our crude "oscillation prevention system" which limits each link to 2 updates (presumably
    // in opposite directions). In the case of the initial transaction, we need to reset the count given that genuine
    // changes are arising in the system with each new enlisted model. TODO: if we ever get users operating their own
    // transactions, think of a way to incorporate this into that workflow
    fluid.clearLinkCounts = function (transRec, relaysAlso) {
        fluid.each(transRec, function (value, key) {
            if (typeof(value) === "number") {
                transRec[key] = 0;
            } else if (relaysAlso && value.options && typeof(value.relayCount) === "number") {
                value.relayCount = 0;
            }
        });
    };

    fluid.sortCompleteLast = function (reca, recb) {
        return (reca.completeOnInit ? 1 : 0) - (recb.completeOnInit ? 1 : 0);
    };

    // Operate all coordinated transactions by bringing models to their respective initial values, and then commit them all
    fluid.operateInitialTransaction = function (instantiator, mrec) {
        var transId = fluid.allocateGuid();
        var transRec = fluid.getModelTransactionRec(instantiator, transId);
        var transac;
        var transacs = fluid.transform(mrec, function (recel) {
            transac = recel.that.applier.initiate("init", transId);
            transRec[recel.that.applier.applierId] = {transaction: transac};
            return transac;
        });
        // TODO: This sort has very little effect in any current test (can be replaced by no-op - see FLUID-5339) - but
        // at least can't be performed in reverse order ("FLUID-3674 event coordination test" will fail) - need more cases
        var recs = fluid.values(mrec).sort(fluid.sortCompleteLast);
        fluid.each(recs, function (recel) {
            var that = recel.that;
            var transac = transacs[that.id];
            if (recel.completeOnInit) {
                fluid.initModelEvent(that, transac, that.applier.changeListeners.listeners);
            } else {
                fluid.each(recel.initModels, function (initModel) {
                    transac.fireChangeRequest({type: "ADD", segs: [], value: initModel});
                    fluid.clearLinkCounts(transRec, true);
                });
            }
            var shadow = fluid.shadowForComponent(that);
            shadow.modelComplete = true; // technically this is a little early, but this flag is only read in fluid.connectModelRelay
        });

        transac.commit(); // committing one representative transaction will commit them all
    };

    // This modelComponent has now concluded initialisation - commit its initialisation transaction if it is the last such in the wave
    fluid.deenlistModelComponent = function (that) {
        var instantiator = fluid.getInstantiator(that);
        var mrec = instantiator.modelTransactions.init;
        that.model = undefined; // Abuse of the ginger system - in fact it is "currently in evaluation" - we need to return a proper initial model value even if no init occurred yet
        mrec[that.id].complete = true; // flag means - "complete as in ready to participate in this transaction"
        var incomplete = fluid.find_if(mrec, function (recel) {
            return recel.complete !== true;
        });
        if (!incomplete) {
            fluid.operateInitialTransaction(instantiator, mrec);
            // NB: Don't call fluid.concludeTransaction since "init" is not a standard record - this occurs in commitRelays for the corresponding genuine record as usual
            instantiator.modelTransactions.init = {};
        }
    };

    fluid.transformToAdapter = function (transform, targetPath) {
        var basedTransform = {};
        basedTransform[targetPath] = transform;
        return function (trans, newValue /*, sourceSegs, targetSegs */) {
            // TODO: More efficient model that can only run invalidated portion of transform (need to access changeMap of source transaction)
            fluid.model.transformWithRules(newValue, basedTransform, {finalApplier: trans});
        };
    };

    fluid.parseModelReference = function (that, ref) {
        var parsed = fluid.parseContextReference(ref);
        parsed.segs = that.applier.parseEL(parsed.path);
        return parsed;
    };

    fluid.parseValidModelReference = function (that, name, ref) {
        var reject = function (message) {
            fluid.fail("Error in " + name + ": " + ref + message);
        };
        var parsed, target;
        if (ref.charAt(0) === "{") {
            parsed = fluid.parseModelReference(that, ref);
            if (parsed.segs[0] !== "model") {
                reject(" must be a reference into a component model beginning with \"model\"");
            } else {
                parsed.modelSegs = parsed.segs.slice(1);
                delete parsed.path;
            }
            target = fluid.resolveContext(parsed.context, that);
            if (!target) {
                reject(" must be a reference to an existing component");
            }
        } else {
            target = that;
            parsed = {
                path: ref,
                modelSegs: that.applier.parseEL(ref)
            };
        }
        if (!target.applier) {
            fluid.getForComponent(target, ["applier"]);
        }
        if (!target.applier) {
            reject(" must be a reference to a component with a ChangeApplier (descended from fluid.modelComponent)");
        }
        parsed.that = target;
        parsed.applier = target.applier;
        // TODO: remove this when the old ChangeApplier is abolished
        if (!parsed.path) {
            parsed.path = target.applier.composeSegments.apply(null, parsed.modelSegs);
        }
        return parsed;
    };

    // Gets global record for a particular transaction id - looks up applier id to transaction,
    // as well as looking up source id (linkId in below) to count/true
    fluid.getModelTransactionRec = function (instantiator, transId) {
        if (!transId) {
            fluid.fail("Cannot get transaction record without transaction id");
        }
        var transRec = instantiator.modelTransactions[transId];
        if (!transRec && !instantiator.free) {
            transRec = instantiator.modelTransactions[transId] = {};
            transRec.externalChanges = {}; // index by applierId to changePath to listener record
        }
        return transRec;
    };

    fluid.recordChangeListener = function (component, applier, sourceListener) {
        var shadow = fluid.shadowForComponent(component);
        fluid.recordListener(applier.modelChanged, sourceListener, shadow);
    };

    // Used with various arg combinations from different sources. For standard "implicit relay" or fully lensed relay,
    // the first 4 args will be set, and "options" will be empty

    // For a model-dependent relay, this will be used in two halves - firstly, all of the model
    // sources will bind to the relay transform document itself. In this case the argument "targetApplier" within "options" will be set.
    // In this case, the component known as "target" is really the source - it is a component reference discovered by parsing the
    // relay document.

    // Secondly, the relay itself will schedule an invalidation (as if receiving change to "*" of its source - which may in most
    // cases actually be empty) and play through its transducer. "Source" component itself is never empty, since it is used for listener
    // degistration on destruction (check this is correct for external model relay). However, "sourceSegs" may be empty in the case
    // there is no "source" component registered for the link. This change is played in a "half-transactional" way - that is, we wait
    // for all other changes in the system to settle before playing the relay document, in order to minimise the chances of multiple
    // firing and corruption. This is done via the "preCommit" hook registered at top level in establishModelRelay. This listener
    // is transactional but it does not require the transaction to conclude in order to fire - it may be reused as many times as
    // required within the "overall" transaction whilst genuine (external) changes continue to arrive.

    fluid.registerDirectChangeRelay = function (target, targetSegs, source, sourceSegs, linkId, transducer, options) {
        var instantiator = fluid.getInstantiator(target);
        var targetApplier = options.targetApplier || target.applier; // implies the target is a relay document
        var sourceApplier = options.sourceApplier || source.applier; // implies the source is a relay document - listener will be transactional
        var applierId = targetApplier.applierId;
        targetSegs = fluid.makeArray(targetSegs);
        sourceSegs = sourceSegs ? fluid.makeArray(sourceSegs) : sourceSegs; // take copies since originals will be trashed
        var sourceListener = function (newValue, oldValue, path, changeRequest, trans, applier) {
            var transId = trans.id;
            var transRec = fluid.getModelTransactionRec(instantiator, transId);
            if (applier && trans && !transRec[applier.applierId]) { // don't trash existing record which may contain "options" (FLUID-5397)
                transRec[applier.applierId] = {transaction: trans}; // enlist the outer user's original transaction
            }
            var existing = transRec[applierId];
            transRec[linkId] = transRec[linkId] || 0;
            // Crude "oscillation prevention" system limits each link to maximum of 2 operations per cycle (presumably in opposite directions)
            var relay = true; // TODO: See FLUID-5303 - we currently disable this check entirely to solve FLUID-5293 - perhaps we might remove link counts entirely
            if (relay) {
                ++transRec[linkId];
                if (!existing) {
                    var newTrans = targetApplier.initiate("relay", transId); // non-top-level transaction will defeat postCommit
                    existing = transRec[applierId] = {transaction: newTrans, relayCount: 0, options: options};
                }
                if (transducer && !options.targetApplier) {
                    // TODO: This is just for safety but is still unusual and now abused. The transducer doesn't need the "newValue" since all the transform information
                    // has been baked into the transform document itself. However, we now rely on this special signalling value to make sure we regenerate transforms in 
                    // the "forwardAdapter"
                    transducer(existing.transaction, options.sourceApplier ? undefined : newValue, sourceSegs, targetSegs);
                } else if (newValue !== undefined) {
                    existing.transaction.fireChangeRequest({type: "ADD", segs: targetSegs, value: newValue});
                }
            }
        };
        if (sourceSegs) {
            sourceApplier.modelChanged.addListener({
                isRelay: true,
                segs: sourceSegs,
                transactional: options.transactional
            }, sourceListener);
        }
        if (source) { // TODO - we actually may require to register on THREE sources in the case modelRelay is attached to a
            // component which is neither source nor target. Note there will be problems if source, say, is destroyed and recreated,
            // and holder is not - relay will in that case be lost. Need to integrate relay expressions with IoCSS.
            fluid.recordChangeListener(source, sourceApplier, sourceListener);
            if (target !== source) {
                fluid.recordChangeListener(target, sourceApplier, sourceListener);
            }
        }
    };

    // When called during parsing a contextualised model relay document, these arguments are reversed - "source" refers to the
    // current component, and "target" refers successively to the various "source" components.
    // "options" will be transformPackage
    fluid.connectModelRelay = function (source, sourceSegs, target, targetSegs, options) {
        var linkId = fluid.allocateGuid();
        function enlistComponent(component) {
            var enlist = fluid.enlistModelComponent(component);

            if (enlist.complete) {
                var shadow = fluid.shadowForComponent(component);
                if (shadow.modelComplete) {
                    enlist.completeOnInit = true;
                }
            }
        }
        enlistComponent(target);
        enlistComponent(source); // role of "source" and "target" may have been swapped in a modelRelay document

        if (options.update) { // it is a call via parseImplicitRelay for a relay document
            if (options.targetApplier) {
                // register changes from the model onto changes to the model relay document
                fluid.registerDirectChangeRelay(source, sourceSegs, target, targetSegs, linkId, null, {
                    transactional: false,
                    targetApplier: options.targetApplier,
                    update: options.update
                });
            } else {
                // if parsing a contextualised MR, skip the "orthogonal" registration - instead
                // register the "half-transactional" listener which binds changes from the relay itself onto the target
                fluid.registerDirectChangeRelay(target, targetSegs, source, [], linkId+"-transform", options.forwardAdapter, {transactional: true, sourceApplier: options.forwardApplier});
            }
        } else { // more efficient branch where relay is uncontextualised
            fluid.registerDirectChangeRelay(target, targetSegs, source, sourceSegs, linkId, options.forwardAdapter, {transactional: false});
            if (sourceSegs) {
                fluid.registerDirectChangeRelay(source, sourceSegs, target, targetSegs, linkId, options.backwardAdapter, {transactional: false});
            }
        }
    };

    fluid.model.guardedAdapter = function (componentThat, cond, func, args) {
        // TODO: We can't use fluid.isModelComplete here because of the broken half-transactional system - it may appear that model has arrived halfway through init transaction
        var isInit = componentThat.modelRelay === fluid.inEvaluationMarker;
        var condValue = cond[isInit ? "init" : "live"];
        if (condValue) {
            func.apply(null, args);
        }
    };

    fluid.makeTransformPackage = function (componentThat, transform, sourcePath, targetPath, forwardCond, backwardCond) {
        var that = {
            forwardHolder: {model: transform},
            backwardHolder: {model: null}
        };
        that.generateAdapters = function (trans) {
            // can't commit "half-transaction" or events will fire - violate encapsulation in this way
            that.forwardAdapterImpl = fluid.transformToAdapter(trans ? trans.newHolder.model : that.forwardHolder.model, targetPath);
            if (sourcePath !== null) {
                that.backwardHolder.model = fluid.model.transform.invertConfiguration(transform);
                that.backwardAdapterImpl = fluid.transformToAdapter(that.backwardHolder.model, sourcePath);
            }
        };
        that.forwardAdapter = function (transaction, newValue) { // create a stable function reference for this possibly changing adapter
            if (newValue === undefined) {
                that.generateAdapters(); // TODO: Quick fix for incorrect scheduling of invalidation/transducing
                // "it so happens" that fluid.registerDirectChangeRelay invokes us with empty newValue in the case of invalidation -> transduction
            }
            fluid.model.guardedAdapter(componentThat, forwardCond, that.forwardAdapterImpl, arguments);
        };
        // fired from fluid.model.updateRelays via invalidator event
        that.runTransform = function (trans) {
            trans.commit(); // this will reach the special "half-transactional listener" registered in fluid.connectModelRelay,
            // branch with options.targetApplier - by committing the transaction, we update the relay document in bulk and then cause
            // it to execute (via "transducer")
            trans.reset();
        };
        that.forwardApplier = fluid.makeNewChangeApplier(that.forwardHolder);
        that.forwardApplier.isRelayApplier = true; // special annotation so these can be discovered in the transaction record
        that.invalidator = fluid.makeEventFirer({name: "Invalidator for model relay with applier " + that.forwardApplier.applierId});
        if (sourcePath !== null) {
            that.backwardApplier = fluid.makeNewChangeApplier(that.backwardHolder);
            that.backwardAdapter = function () {
                fluid.model.guardedAdapter(componentThat, backwardCond, that.backwardAdapterImpl, arguments);
            };
        }
        that.update = that.invalidator.fire; // necessary so that both routes to fluid.connectModelRelay from here hit the first branch
        var implicitOptions = {
            targetApplier: that.forwardApplier, // this special field identifies us to fluid.connectModelRelay
            update: that.update,
            refCount: 0
        };
        that.forwardHolder.model = fluid.parseImplicitRelay(componentThat, transform, [], implicitOptions);
        that.refCount = implicitOptions.refCount;
        that.generateAdapters();
        that.invalidator.addListener(that.generateAdapters);
        that.invalidator.addListener(that.runTransform);
        return that;
    };

    fluid.singleTransformToFull = function (singleTransform) {
        var withPath = $.extend(true, {valuePath: ""}, singleTransform);
        return {
            "": {
                transform: withPath
            }
        };
    };

    fluid.model.relayConditions = {
        initOnly: {init: true,  live: false},
        liveOnly: {init: false, live: true},
        never:    {init: false, live: false},
        always:   {init: true,  live: true}
    };

    fluid.model.parseRelayCondition = function (condition) {
        return fluid.model.relayConditions[condition || "always"];
    };

    fluid.parseModelRelay = function (that, mrrec) {
        var parsedSource = mrrec.source ? fluid.parseValidModelReference(that, "modelRelay record member \"source\"", mrrec.source) :
            {path: null, modelSegs: null};
        var parsedTarget = fluid.parseValidModelReference(that, "modelRelay record member \"target\"", mrrec.target);

        var transform = mrrec.singleTransform ? fluid.singleTransformToFull(mrrec.singleTransform) : mrrec.transform;
        if (!transform) {
            fluid.fail("Cannot parse modelRelay record without element \"singleTransform\" or \"transform\":", mrrec);
        }
        var forwardCond = fluid.model.parseRelayCondition(mrrec.forward), backwardCond = fluid.model.parseRelayCondition(mrrec.backward);
        var transformPackage = fluid.makeTransformPackage(that, transform, parsedSource.path, parsedTarget.path, forwardCond, backwardCond);
        if (transformPackage.refCount === 0) {
            // This first call binds changes emitted from the relay ends to each other, synchronously
            fluid.connectModelRelay(parsedSource.that || that, parsedSource.modelSegs, parsedTarget.that, parsedTarget.modelSegs, {
                forwardAdapter: transformPackage.forwardAdapter,
                backwardAdapter: transformPackage.backwardAdapter
            });
        } else {
            // This second call binds changes emitted from the relay document itself onto the relay ends (using the "half-transactional system")
            fluid.connectModelRelay(parsedSource.that || that, parsedSource.modelSegs, parsedTarget.that, parsedTarget.modelSegs, transformPackage);
        }
    };

    fluid.parseImplicitRelay = function (that, modelRec, segs, options) {
        var value;
        if (typeof(modelRec) === "string" && modelRec.charAt(0) === "{") {
            var parsed = fluid.parseModelReference(that, modelRec);
            var target = fluid.resolveContext(parsed.context, that);
            if (parsed.segs[0] === "model") {
                var modelSegs = parsed.segs.slice(1);
                ++options.refCount;
                fluid.connectModelRelay(that, segs, target, modelSegs, options);
            } else {
                value = fluid.getForComponent(target, parsed.segs);
            }
        } else if (fluid.isPrimitive(modelRec) || !fluid.isPlainObject(modelRec)) {
            value = modelRec;
        } else if (modelRec.expander && fluid.isPlainObject(modelRec.expander)) {
            value = fluid.expandOptions(modelRec, that);
        } else {
            value = fluid.freshContainer(modelRec);
            fluid.each(modelRec, function (innerValue, key) {
                segs.push(key);
                var innerTrans = fluid.parseImplicitRelay(that, innerValue, segs, options);
                if (innerTrans !== undefined) {
                    value[key] = innerTrans;
                }
                segs.pop();
            });
        }
        return value;
    };


    // Conclude the transaction by firing to all external listeners in priority order
    fluid.model.notifyExternal = function (transRec) {
        var allChanges = transRec ? fluid.values(transRec.externalChanges) : [];
        allChanges.sort(fluid.priorityComparator);
        for (var i = 0; i < allChanges.length; ++ i) {
            var change = allChanges[i];
            var targetApplier = change.args[5]; // NOTE: This argument gets here via fluid.model.storeExternalChange from fluid.notifyModelChanges
            if (!targetApplier.destroyed) { // 3rd point of guarding for FLUID-5592
                change.listener.apply(null, change.args);
            }
        }
        fluid.clearLinkCounts(transRec, true); // "options" structures for relayCount are aliased
    };

    fluid.model.commitRelays = function (instantiator, transactionId) {
        var transRec = instantiator.modelTransactions[transactionId];
        fluid.each(transRec, function (transEl) {
        // EXPLAIN: This must commit ALL current transactions, not just those for relays - why?
            if (transEl.transaction) { // some entries are links
                transEl.transaction.commit("relay");
                transEl.transaction.reset();
            }
        });
    };

    fluid.model.updateRelays = function (instantiator, transactionId) {
        var transRec = instantiator.modelTransactions[transactionId];
        var updates = 0;
        fluid.each(transRec, function (transEl) {
            // TODO: integrate the "source" if any into this computation, and fire the relay if it has changed - perhaps by adding a listener
            // to it that updates changeRecord.changes (assuming we can find it)
            if (transEl.options && transEl.transaction && transEl.transaction.changeRecord.changes > 0 && transEl.relayCount < 2 && transEl.options.update) {
                transEl.relayCount++;
                fluid.clearLinkCounts(transRec);
                transEl.options.update(transEl.transaction, transRec);
                ++updates;
            }
        });
        return updates;
    };

    fluid.establishModelRelay = function (that, optionsModel, optionsML, optionsMR, applier) {
        fluid.mergeModelListeners(that, optionsML);

        var enlist = fluid.enlistModelComponent(that);
        fluid.each(optionsMR, function (mrrec) {
            fluid.parseModelRelay(that, mrrec);
        });

        var initModels = fluid.transform(optionsModel, function (modelRec) {
            return fluid.parseImplicitRelay(that, modelRec, [], {refCount: 0});
        });
        enlist.initModels = initModels;

        var instantiator = fluid.getInstantiator(that);

        function updateRelays(transaction) {
            while (fluid.model.updateRelays(instantiator, transaction.id) > 0){}
        }

        function commitRelays(transaction, applier, code) {
            if (code !== "relay") { // don't commit relays if this commit is already a relay commit
                fluid.model.commitRelays(instantiator, transaction.id);
            }
        }

        function concludeTransaction(transaction, applier, code) {
            if (code !== "relay") {
                fluid.model.notifyExternal(instantiator.modelTransactions[transaction.id]);
                delete instantiator.modelTransactions[transaction.id];
            }
        }

        applier.preCommit.addListener(updateRelays);
        applier.preCommit.addListener(commitRelays);
        applier.postCommit.addListener(concludeTransaction);

        fluid.deenlistModelComponent(that);

        return applier.holder.model;
    };

    // Grade common to "old" and "new" model components
    fluid.defaults("fluid.commonModelComponent", {
        gradeNames: ["fluid.littleComponent", "autoInit"],
        mergePolicy: {
            modelListeners: fluid.makeMergeListenersPolicy(fluid.arrayConcatPolicy)
        }
    });

    // supported, PUBLIC API grade
    fluid.defaults("fluid.modelComponent", {
        gradeNames: ["fluid.commonModelComponent", "autoInit"],
        members: {
            model: "@expand:fluid.initSimpleModel({that}, {that}.options.model)",
            applier: "@expand:fluid.makeChangeApplier({that}.model, {that}.options.changeApplierOptions)",
            modelListeners: "@expand:fluid.mergeModelListeners({that}, {that}.options.modelListeners)"
        },
        mergePolicy: {
            model: "preserve"
        }
    });

    // supported, PUBLIC API grade
    fluid.defaults("fluid.modelRelayComponent", {
        gradeNames: ["fluid.commonModelComponent", "fluid.eventedComponent", "autoInit"],
        changeApplierOptions: {
            relayStyle: true,
            cullUnchanged: true
        },
        members: {
            model: "@expand:fluid.initRelayModel({that}, {that}.modelRelay)",
            applier: "@expand:fluid.makeNewChangeApplier({that}, {that}.options.changeApplierOptions)",
            modelRelay: "@expand:fluid.establishModelRelay({that}, {that}.options.model, {that}.options.modelListeners, {that}.options.modelRelay, {that}.applier)"
        },
        mergePolicy: {
            model: {
                noexpand: true,
                func: fluid.arrayConcatPolicy
            },
            modelRelay: {
                noexpand: true,
                func: fluid.arrayConcatPolicy
            }
        }
    });

    // supported, PUBLIC API record
    fluid.defaults("fluid.standardComponent", {
        gradeNames: ["fluid.modelComponent", "fluid.eventedComponent", "autoInit"]
    });

    // supported, PUBLIC API record
    fluid.defaults("fluid.standardRelayComponent", {
        gradeNames: ["fluid.modelRelayComponent", "autoInit"]
    });

    fluid.modelChangedToChange = function (isNewApplier, args) {
        var newModel = args[0], oldModel = args[1], path = args[3]; // in 4th position for old applier
        return isNewApplier ? {
            value: args[0],
            oldValue: args[1],
            path: args[2]
        } : {
            value: fluid.get(newModel, path),
            oldValue: fluid.get(oldModel, path),
            path: path
        };
    };

    fluid.resolveModelListener = function (that, record, isNewApplier) {
        var togo = function () {
            if (fluid.isDestroyed(that)) { // first guarding point to resolve FLUID-5592
                return;
            }
            var change = fluid.modelChangedToChange(isNewApplier, arguments);
            var args = [change];
            var localRecord = {change: change, "arguments": args};
            if (record.args) {
                args = fluid.expandOptions(record.args, that, {}, localRecord);
            }
            fluid.event.invokeListener(record.listener, fluid.makeArray(args));
        };
        fluid.event.impersonateListener(record.listener, togo);
        return togo;
    };

    fluid.mergeModelListeners = function (that, listeners) {
        var listenerCount = 0;
        fluid.each(listeners, function (value, path) {
            if (typeof(value) === "string") {
                value = {
                    funcName: value
                };
            }
            var records = fluid.event.resolveListenerRecord(value, that, "modelListeners", null, false);
            var parsed = fluid.parseValidModelReference(that, "modelListeners entry", path);
            var isNewApplier = parsed.applier.preCommit;
            // Bypass fluid.event.dispatchListener by means of "standard = false" and enter our custom workflow including expanding "change":
            fluid.each(records.records, function (record) {
                var func = fluid.resolveModelListener(that, record, isNewApplier);
                var spec = {
                    listener: func, // for initModelEvent
                    listenerIndex: listenerCount,
                    segs: parsed.modelSegs,
                    path: parsed.path,
                    includeSource: record.includeSource,
                    excludeSource: record.excludeSource,
                    priority: record.priority,
                    guardSource: record.guardSource, // compatibility for obsolete system - will remove with old applier
                    transactional: true
                };
                ++listenerCount;
                if (record.guardSource) {
                    fluid.addSourceGuardedListener(parsed.applier, spec, record.guardSource, func, "modelChanged", record.namespace, record.softNamespace);
                } else {
                    parsed.applier.modelChanged.addListener(spec, func, record.namespace, record.softNamespace);
                }

                fluid.recordChangeListener(that, parsed.applier, func);
                function initModelEvent() {
                    if (isNewApplier && fluid.isModelComplete(parsed.that)) {
                        var trans = parsed.applier.initiate("init");
                        fluid.initModelEvent(that, trans, [spec]);
                        trans.commit();
                    }
                }
                if (that !== parsed.that && !fluid.isModelComplete(that)) { // TODO: Use FLUID-4883 "latched events" when available
                    // Don't confuse the end user by firing their listener before the component is constructed
                    // TODO: Better detection than this is requred - we assume that the target component will not be discovered as part
                    // of the initial transaction wave, but if it is, it will get a double notification - we really need "wave of explosions"
                    // since we are currently too early in initialisation of THIS component in order to tell if other will be found
                    // independently.
                    that.events.onCreate.addListener(initModelEvent);
                }
            });
        });
    };


    /** CHANGE APPLIER **/

    /** COMMON UTILITIES common between old and new ChangeAppliers **/

    /** Add a listener to a ChangeApplier event that only acts in the case the event
     * has not come from the specified source (typically ourself)
     * @param modelEvent An model event held by a changeApplier (typically applier.modelChanged)
     * @param path The path specification to listen to
     * @param source The source value to exclude (direct equality used)
     * @param func The listener to be notified of a change
     * @param [eventName] - optional - the event name to be listened to - defaults to "modelChanged"
     * @param [namespace] - optional - the event namespace
     */
    fluid.addSourceGuardedListener = function(applier, path, source, func, eventName, namespace, softNamespace) {
        eventName = eventName || "modelChanged";
        var wrapped = function (newValue, oldValue, path, changes) { // TODO: adapt signature
            if (!applier.hasChangeSource(source, changes)) {
                return func.apply(null, arguments);
            }
        };
        fluid.event.impersonateListener(func, wrapped);
        applier[eventName].addListener(path, wrapped, namespace, softNamespace);
    };

    /** Convenience method to fire a change event to a specified applier, including
     * a supplied "source" identified (perhaps for use with addSourceGuardedListener)
     */
    fluid.fireSourcedChange = function (applier, path, value, source) {
        applier.fireChangeRequest({
            path: path,
            value: value,
            source: source
        });
    };

    /** Dispatches a list of changes to the supplied applier */
    fluid.requestChanges = function (applier, changes) {
        for (var i = 0; i < changes.length; ++i) {
            applier.fireChangeRequest(changes[i]);
        }
    };


    // Automatically adapts requestChange onto fireChangeRequest
    fluid.bindRequestChange = function (that) {
        // The name "requestChange" will be deprecated in 1.5, removed in 2.0
        that.requestChange = that.change = function (path, value, type) {
            var changeRequest = {
                path: path,
                value: value,
                type: type
            };
            that.fireChangeRequest(changeRequest);
        };
    };

    fluid.identifyChangeListener = function (listener) {
        return fluid.event.identifyListener(listener) || listener;
    };


    /** NEW CHANGEAPPLIER IMPLEMENTATION (Will be default in Infusion 2.0 onwards **/

    fluid.typeCode = function (totest) {
        return fluid.isPrimitive(totest) || !fluid.isPlainObject(totest) ? "primitive" :
            fluid.isArrayable(totest) ? "array" : "object";
    };

    fluid.model.isChangedPath = function (changeMap, segs) {
        for (var i = 0; i <= segs.length; ++ i) {
            if (typeof(changeMap) === "string") {
                return true;
            }
            if (i < segs.length && changeMap) {
                changeMap = changeMap[segs[i]];
            }
        }
        return false;
    };

    fluid.model.setChangedPath = function (options, segs, value) {
        var notePath = function (record) {
            segs.unshift(record);
            fluid.model.setSimple(options, segs, value);
            segs.shift();
        };
        if (!fluid.model.isChangedPath(options.changeMap, segs)) {
            ++options.changes;
            notePath("changeMap");
        }
        if (!fluid.model.isChangedPath(options.deltaMap, segs)) {
            ++options.deltas;
            notePath("deltaMap");
        }
    };

    fluid.model.fetchChangeChildren = function (target, i, segs, source, options) {
        fluid.each(source, function (value, key) {
            segs[i] = key;
            fluid.model.applyChangeStrategy(target, key, i, segs, value, options);
            segs.length = i;
        });
    };

    // Called with two primitives which are compared for equality. This takes account of "floating point slop" to avoid
    // continuing to propagate inverted values as changes
    // TODO: replace with a pluggable implementation
    fluid.model.isSameValue = function (a, b) {
        if (typeof(a) !== "number" || typeof(b) !== "number") {
            return a === b;
        } else {
            if (a === b) {
                return true;
            } else {
                var relError = Math.abs((a - b) / b);
                return relError < 1e-12; // 64-bit floats have approx 16 digits accuracy, this should deal with most reasonable transforms
            }
        }
    };

    fluid.model.applyChangeStrategy = function (target, name, i, segs, source, options) {
        var targetSlot = target[name];
        var sourceCode = fluid.typeCode(source);
        var targetCode = fluid.typeCode(targetSlot);
        var changedValue = fluid.NO_VALUE;
        if (sourceCode === "primitive") {
            if (!fluid.model.isSameValue(targetSlot, source)) {
                changedValue = source;
                ++options.unchanged;
            }
        } else if (targetCode !== sourceCode || sourceCode === "array" && source.length !== targetSlot.length) {
            // RH is not primitive - array or object and mismatching or any array rewrite
            changedValue = fluid.freshContainer(source);
        }
        if (changedValue !== fluid.NO_VALUE) {
            target[name] = changedValue;
            if (options.changeMap) {
                fluid.model.setChangedPath(options, segs, options.inverse ? "DELETE" : "ADD");
            }
        }
        if (sourceCode !== "primitive") {
            fluid.model.fetchChangeChildren(target[name], i + 1, segs, source, options);
        }
    };

    fluid.model.stepTargetAccess = function (target, type, segs, startpos, endpos, options) {
        for (var i = startpos; i < endpos; ++ i) {
            var oldTrunk = target[segs[i]];
            target = fluid.model.traverseWithStrategy(target, segs, i, options[type === "ADD" ? "resolverSetConfig" : "resolverGetConfig"],
                segs.length - i - 1);
            if (oldTrunk !== target && options.changeMap) {
                fluid.model.setChangedPath(options, segs.slice(0, i + 1), "ADD");
            }
        }
        return {root: target, last: segs[endpos]};
    };

    fluid.model.defaultAccessorConfig = function (options) {
        options = options || {};
        options.resolverSetConfig = options.resolverSetConfig || fluid.model.defaultSetConfig;
        options.resolverGetConfig = options.resolverGetConfig || fluid.model.defaultGetConfig;
        return options;
    };

    // After the 1.5 release, this will replace the old "applyChangeRequest"
    // Changes: "MERGE" action abolished
    // ADD/DELETE at root can be destructive
    // changes tracked in optional final argument holding "changeMap: {}, changes: 0, unchanged: 0"
    fluid.model.applyHolderChangeRequest = function (holder, request, options) {
        options = fluid.model.defaultAccessorConfig(options);
        options.deltaMap = options.changeMap ? {} : null;
        options.deltas = 0;
        var length = request.segs.length;
        var pen, atRoot = length === 0;
        if (atRoot) {
            pen = {root: holder, last: "model"};
        } else {
            if (!holder.model) {
                holder.model = {};
                fluid.model.setChangedPath(options, [], options.inverse ? "DELETE" : "ADD");
            }
            pen = fluid.model.stepTargetAccess(holder.model, request.type, request.segs, 0, length - 1, options);
        }
        if (request.type === "ADD") {
            var value = request.value;
            var segs = fluid.makeArray(request.segs);
            fluid.model.applyChangeStrategy(pen.root, pen.last, length - 1, segs, value, options, atRoot);
        } else if (request.type === "DELETE") {
            if (pen.root && pen.root[pen.last] !== undefined) {
                delete pen.root[pen.last];
                if (options.changeMap) {
                    fluid.model.setChangedPath(options, request.segs, "DELETE");
                }
            }
        } else {
            fluid.fail("Unrecognised change type of " + request.type);
        }
        return options.deltas ? options.deltaMap : null;
    };
    
    /** Compare two models for equality using a deep algorithm. It is assumed that both models are JSON-equivalent and do
     * not contain circular links.
     * @param modela The first model to be compared
     * @param modelb The second model to be compared
     * @param options {Object} If supplied, will receive a map and summary of the change content between the objects. Structure is:
     *     changeMap: {Object/String} An isomorphic map of the object structures to values "ADD" or "DELETE" indicating
     * that values have been added/removed at that location. Note that in the case the object structure differs at the root, <code>changeMap</code> will hold
     * the plain String value "ADD" or "DELETE"
     *     changes: {Integer} Counts the number of changes between the objects - The two objects are identical iff <code>changes === 0</code>.
     *     unchanged: {Integer} Counts the number of leaf (primitive) values at which the two objects are identical. Note that the current implementation will
     * double-count, this summary should be considered indicative rather than precise.
     * @return <code>true</code> if the models are identical
     */
    // TODO: This algorithm is quite inefficient in that both models will be copied once each
    // supported, PUBLIC API function
    fluid.model.diff = function (modela, modelb, options) {
        options = options || {changes: 0, unchanged: 0, changeMap: {}}; // current algorithm can't avoid the expense of changeMap
        var typea = fluid.typeCode(modela);
        var typeb = fluid.typeCode(modelb);
        var togo;
        if (typea === "primitive" && typeb === "primitive") {
            togo = fluid.model.isSameValue(modela, modelb);
        } else if (typea === "primitive" ^ typeb === "primitive") {
            togo = false;
        } else {
            // Apply both forward and reverse changes - if no changes either way, models are identical
            // "ADD" reported in the reverse direction must be accounted as a "DELETE"
            var holdera = {
                model: fluid.copy(modela)
            };
            fluid.model.applyHolderChangeRequest(holdera, {value: modelb, segs: [], type: "ADD"}, options);
            var holderb = {
                model: fluid.copy(modelb)
            };
            options.inverse = true;
            fluid.model.applyHolderChangeRequest(holderb, {value: modela, segs: [], type: "ADD"}, options);
            togo = options.changes === 0;
        }
        if (togo === false && options.changes === 0) { // catch all primitive cases
            options.changes = 1;
            options.changeMap = modelb === undefined ? "DELETE" : "ADD";
        } else if (togo === true && options.unchanged === 0) {
            options.unchanged = 1;
        }
        return togo;
    };

    // Here we only support for now very simple expressions which have at most one
    // wildcard which must appear in the final segment
    fluid.matchChanges = function (changeMap, specSegs, newHolder) {
        var root = newHolder.model;
        var map = changeMap;
        var outSegs = ["model"];
        var wildcard = false;
        var togo = [];
        for (var i = 0; i < specSegs.length; ++ i) {
            var seg = specSegs[i];
            if (seg === "*") {
                if (i === specSegs.length - 1) {
                    wildcard = true;
                } else {
                    fluid.fail("Wildcard specification in modelChanged listener is only supported for the final path segment: " + specSegs.join("."));
                }
            } else {
                outSegs.push(seg);
                map = fluid.isPrimitive(map) ? map : map[seg];
                root = root ? root[seg] : undefined;
            }
        }
        if (map) {
            if (wildcard) {
                fluid.each(root, function (value, key) {
                    togo.push(outSegs.concat(key));
                });
            } else {
                togo.push(outSegs);
            }
        }
        return togo;
    };

    fluid.storeExternalChange = function (transRec, applier, invalidPath, spec, args) {
        var pathString = applier.composeSegments.apply(null, invalidPath);
        var keySegs = [applier.applierId, fluid.event.identifyListener(spec.listener), spec.listenerIndex, pathString];
        var keyString = keySegs.join("|");
        // These are unbottled in fluid.concludeTransaction
        transRec.externalChanges[keyString] = {listener: spec.listener, priority: spec.priority, args: args};
    };
    
    fluid.isExcludedChangeSource = function (transaction, spec) {
        if (!spec.excludeSource) { // mergeModelListeners initModelEvent fabricates a fake spec that bypasses processing
            return false;
        }
        var excluded = spec.excludeSource["*"];
        for (var source in transaction.sources) {
            if (spec.excludeSource[source]) {
                excluded = true;
            }
            if (spec.includeSource[source]) {
                excluded = false;
            }
        }
        return excluded;
    };

    fluid.notifyModelChanges = function (listeners, changeMap, newHolder, oldHolder, changeRequest, transaction, applier, that) {
        var instantiator = fluid.getInstantiator(that);
        var transRec = transaction && fluid.getModelTransactionRec(instantiator, transaction.id);
        for (var i = 0; i < listeners.length; ++ i) {
            var spec = listeners[i];
            var invalidPaths = fluid.matchChanges(changeMap, spec.segs, newHolder);
            for (var j = 0; j < invalidPaths.length; ++ j) {
                if (applier.destroyed) { // 2nd guarding point for FLUID-5592
                    return;
                }
                var invalidPath = invalidPaths[j];
                spec.listener = fluid.event.resolveListener(spec.listener);
                // TODO: process namespace and softNamespace rules, and propagate "sources" in 4th argument
                var args = [fluid.model.getSimple(newHolder, invalidPath), fluid.model.getSimple(oldHolder, invalidPath), invalidPath.slice(1), changeRequest, transaction, applier];
                // FLUID-5489: Do not notify of null changes which were reported as a result of invalidating a higher path
                // TODO: We can improve greatly on efficiency by i) reporting a special code from fluid.matchChanges which signals the difference between invalidating a higher and lower path,
                // ii) improving fluid.model.diff to create fewer intermediate structures and no copies
                // TODO: The relay invalidation system is broken and must always be notified (branch 1) - since our old/new value detection is based on the wrong (global) timepoints in the transaction here,
                // rather than the "last received model" by the holder of the transform document
                if (!spec.isRelay) {
                    var isNull = fluid.model.diff(args[0], args[1]);
                    if (isNull) {
                        continue;
                    }
                    var sourceExcluded = fluid.isExcludedChangeSource(transaction, spec);
                    if (sourceExcluded) {
                        continue;
                    }
                }
                if (transRec && !spec.isRelay && spec.transactional) { // bottle up genuine external changes so we can sort and dedupe them later
                    fluid.storeExternalChange(transRec, applier, invalidPath, spec, args);
                } else {
                    spec.listener.apply(null, args);
                }
            }
        }
    };

    fluid.bindELMethods = function (applier) {
        applier.parseEL = function (EL) {
            return fluid.model.pathToSegments(EL, applier.options.resolverSetConfig);
        };
        applier.composeSegments = function () {
            return applier.options.resolverSetConfig.parser.compose.apply(null, arguments);
        };
    };

    fluid.initModelEvent = function (that, trans, listeners) {
        fluid.notifyModelChanges(listeners, "ADD", trans.oldHolder, fluid.emptyHolder, null, trans, that);
    };

    fluid.emptyHolder = { model: undefined };

    fluid.makeNewChangeApplier = function (holder, options) {
        options = fluid.model.defaultAccessorConfig(options);
        var applierId = fluid.allocateGuid();
        var that = {
            applierId: applierId,
            holder: holder,
            changeListeners: {
                listeners: [],
                transListeners: []
            },
            options: options,
            modelChanged: {},
            preCommit: fluid.makeEventFirer({name: "preCommit event for ChangeApplier " }),
            postCommit: fluid.makeEventFirer({name: "postCommit event for ChangeApplier "})
        };
        function preFireChangeRequest(changeRequest) {
            if (!changeRequest.type) {
                changeRequest.type = "ADD";
            }
            changeRequest.segs = changeRequest.segs || that.parseEL(changeRequest.path);
        }
        that.destroy = function () {
            that.preCommit.destroy();
            that.postCommit.destroy();
            that.destroyed = true;
        };
        that.modelChanged.addListener = function (spec, listener, namespace, softNamespace) {
            if (typeof(spec) === "string") {
                spec = {path: spec};
            } else {
                spec = fluid.copy(spec);
            }
            spec.id = fluid.event.identifyListener(listener);
            spec.namespace = namespace;
            spec.softNamespace = softNamespace;
            if (typeof(listener) === "string") { // TODO: replicate this nonsense from Fluid.js until we remember its purpose
                listener = {globalName: listener};
            }
            spec.listener = listener;
            if (spec.transactional !== false) {
                spec.transactional = true;
            }
            spec.segs = spec.segs || that.parseEL(spec.path);
            var collection = that.changeListeners[spec.transactional ? "transListeners" : "listeners"];
            spec.excludeSource = fluid.arrayToHash(fluid.makeArray(spec.excludeSource || (spec.includeSource ? "*" : undefined)));
            spec.includeSource = fluid.arrayToHash(fluid.makeArray(spec.includeSource));
            spec.priority = fluid.event.mapPriority(spec.priority, collection.length);
            collection.push(spec);
        };
        that.modelChanged.removeListener = function (listener) {
            var id = fluid.event.identifyListener(listener);
            var namespace = typeof(listener) === "string" ? listener: null;
            var removePred = function (record) {
                return record.id === id || record.namespace === namespace;
            };
            fluid.remove_if(that.changeListeners.listeners, removePred);
            fluid.remove_if(that.changeListeners.transListeners, removePred);
        };
        that.modelChanged.isRelayEvent = true; // TODO: cheap helper for IoC testing framework - remove when old ChangeApplier goes
        that.fireChangeRequest = function (changeRequest) {
            var ation = that.initiate();
            ation.fireChangeRequest(changeRequest);
            ation.commit();
        };

        that.initiate = function (source, transactionId) {
            source = source || "local";
            var defeatPost = source === "relay"; // defeatPost is supplied for all non-top-level transactions
            var trans = {
                instanceId: fluid.allocateGuid(), // for debugging only
                id: transactionId || fluid.allocateGuid(),
                sources: {},
                changeRecord: {
                    resolverSetConfig: options.resolverSetConfig, // here to act as "options" in applyHolderChangeRequest
                    resolverGetConfig: options.resolverGetConfig
                },
                reset: function () {
                    trans.oldHolder = holder;
                    trans.newHolder = { model: fluid.copy(holder.model) };
                    trans.changeRecord.changes = 0;
                    trans.changeRecord.unchanged = 0; // just for type consistency - we don't use these values in the ChangeApplier
                    trans.changeRecord.changeMap = {};
                },
                commit: function (code) {
                    that.preCommit.fire(trans, that, code);
                    if (trans.changeRecord.changes > 0) {
                        var oldHolder = {model: holder.model};
                        holder.model = trans.newHolder.model;
                        fluid.notifyModelChanges(that.changeListeners.transListeners, trans.changeRecord.changeMap, holder, oldHolder, null, trans, that, holder);
                    }
                    if (!defeatPost) {
                        that.postCommit.fire(trans, that, code);
                    }
                },
                fireChangeRequest: function (changeRequest) {
                    preFireChangeRequest(changeRequest);
                    changeRequest.transactionId = trans.id;
                    var deltaMap = fluid.model.applyHolderChangeRequest(trans.newHolder, changeRequest, trans.changeRecord);
                    fluid.notifyModelChanges(that.changeListeners.listeners, deltaMap, trans.newHolder, holder, changeRequest, trans, that, holder);
                }
            };
            trans.sources[source] = true;
            trans.reset();
            fluid.bindRequestChange(trans);
            return trans;
        };
        that.hasChangeSource = function (source, changes) { // compatibility for old API
            return changes ? changes[source] : false;
        };

        fluid.bindRequestChange(that);
        fluid.bindELMethods(that);
        return that;
    };


    /** OLD CHANGEAPPLIER IMPLEMENTATION (Infusion 1.5 and before - this will be removed on Fluid 2.0) **/

    /** Parses a path segment, following escaping rules, starting from character index i in the supplied path */
    fluid.pathUtil.getPathSegment = function (path, i) {
        getPathSegmentImpl(globalAccept, path, i);
        return globalAccept[0];
    };

    /** Returns just the head segment of an EL path */
    fluid.pathUtil.getHeadPath = function (path) {
        return fluid.pathUtil.getPathSegment(path, 0);
    };

    /** Returns all of an EL path minus its first segment - if the path consists of just one segment, returns "" */
    fluid.pathUtil.getFromHeadPath = function (path) {
        var firstdot = getPathSegmentImpl(null, path, 0);
        return firstdot === path.length ? "" : path.substring(firstdot + 1);
    };

    function lastDotIndex(path) {
        // TODO: proper escaping rules
        return path.lastIndexOf(".");
    }

    /** Returns all of an EL path minus its final segment - if the path consists of just one segment, returns "" -
     * WARNING - this method does not follow escaping rules */
    fluid.pathUtil.getToTailPath = function (path) {
        var lastdot = lastDotIndex(path);
        return lastdot === -1 ? "" : path.substring(0, lastdot);
    };

    /** Returns the very last path component of an EL path
     * WARNING - this method does not follow escaping rules */
    fluid.pathUtil.getTailPath = function (path) {
        var lastdot = lastDotIndex(path);
        return fluid.pathUtil.getPathSegment(path, lastdot + 1);
    };

    /** Helpful utility for use in resolvers - matches a path which has already been
      * parsed into segments **/

    fluid.pathUtil.matchSegments = function (toMatch, segs, start, end) {
        if (end - start !== toMatch.length) {
            return false;
        }
        for (var i = start; i < end; ++ i) {
            if (segs[i] !== toMatch[i - start]) {
                return false;
            }
        }
        return true;
    };

    /** Determine the path by which a given path is nested within another **/
    // TODO: This utility is not used in the framework, and will cease to be useful in client code
    // once we move over to the declarative system for change binding
    fluid.pathUtil.getExcessPath = function (base, longer) {
        var index = longer.indexOf(base);
        if (index !== 0) {
            fluid.fail("Path " + base + " is not a prefix of path " + longer);
        }
        if (base.length === longer.length) {
            return "";
        }
        if (longer[base.length] !== ".") {
            fluid.fail("Path " + base + " is not properly nested in path " + longer);
        }
        return longer.substring(base.length + 1);
    };

    /** Determines whether a particular EL path matches a given path specification.
     * The specification consists of a path with optional wildcard segments represented by "*".
     * @param spec (string) The specification to be matched
     * @param path (string) The path to be tested
     * @param exact (boolean) Whether the path must exactly match the length of the specification in
     * terms of path segments in order to count as match. If exact is falsy, short specifications will
     * match all longer paths as if they were padded out with "*" segments
     * @return (array of string) The path segments which matched the specification, or <code>null</code> if there was no match
     */

    fluid.pathUtil.matchPath = function (spec, path, exact) {
        var togo = [];
        while (true) {
            if (((path === "") ^ (spec === "")) && exact) {
                return null;
            }
            // FLUID-4625 - symmetry on spec and path is actually undesirable, but this
            // quickly avoids at least missed notifications - improved (but slower)
            // implementation should explode composite changes
            if (!spec || !path) {
                break;
            }
            var spechead = fluid.pathUtil.getHeadPath(spec);
            var pathhead = fluid.pathUtil.getHeadPath(path);
            // if we fail to match on a specific component, fail.
            if (spechead !== "*" && spechead !== pathhead) {
                return null;
            }
            togo.push(pathhead);
            spec = fluid.pathUtil.getFromHeadPath(spec);
            path = fluid.pathUtil.getFromHeadPath(path);
        }
        return togo;
    };

    fluid.model.isNullChange = function (model, request, resolverGetConfig) {
        if (request.type === "ADD" && !request.forceChange) {
            var existing = fluid.get(model, request.segs, resolverGetConfig);
            if (existing === request.value) {
                return true;
            }
        }
    };

    /** Applies the supplied ChangeRequest object directly to the supplied model.
     */

    fluid.model.applyChangeRequest = function (model, request, resolverSetConfig) {
        var pen = fluid.model.accessWithStrategy(model, request.path, fluid.VALUE, resolverSetConfig || fluid.model.defaultSetConfig, null, true);
        var last = pen.segs[pen.segs.length - 1];

        if (request.type === "ADD" || request.type === "MERGE") {
            if (pen.segs.length === 0 || (request.type === "MERGE" && pen.root[last])) {
                if (request.type === "ADD") {
                    fluid.clear(pen.root);
                }
                $.extend(true, pen.segs.length === 0 ? pen.root : pen.root[last], request.value);
            }
            else {
                pen.root[last] = request.value;
            }
        }
        else if (request.type === "DELETE") {
            if (pen.segs.length === 0) {
                fluid.clear(pen.root);
            }
            else {
                delete pen.root[last];
            }
        }
    };

    // Utility used for source tracking in changeApplier

    function sourceWrapModelChanged(modelChanged, threadLocal) {
        return function (changeRequest) {
            var sources = threadLocal().sources;
            var args = arguments;
            var source = changeRequest.source || "";
            fluid.tryCatch(function () {
                if (sources[source] === undefined) {
                    sources[source] = 0;
                }
                ++sources[source];
                modelChanged.apply(null, args);
            }, null, function() {
                --sources[source];
            });
        };
    }


    /** The core creator function constructing ChangeAppliers. See API documentation
     * at http://wiki.fluidproject.org/display/fluid/ChangeApplier+API for the various
     * options supported in the options structure */

    fluid.makeChangeApplier = function (model, options) {
        return fluid.makeHolderChangeApplier({model: model}, options);
    };

    /** Make a "new-style" ChangeApplier that allows the base model reference to be overwritten. This is
     *  re-read on every access from the object "holder" (in typical usage, the component owning the
     *  ChangeApplier). This implementation will be removed after the 1.5 release */

    fluid.makeHolderChangeApplier = function (holder, options) {
        options = fluid.model.defaultAccessorConfig(options);
        var baseEvents = {
            guards: fluid.makeEventFirer({preventable: true, name: "guard event"}),
            postGuards: fluid.makeEventFirer({preventable: true, name: "postGuard event"}),
            modelChanged: fluid.makeEventFirer({name: "modelChanged event"})
        };
        var threadLocal = fluid.threadLocal(function() { return {sources: {}};});
        var that = {
        // For now, we don't use "id" to avoid confusing component detection which uses
        // a simple algorithm looking for that field
            applierId: fluid.allocateGuid(),
            holder: holder,
            options: options,
            destroy: fluid.identity // dummy function to avoid confusing FLUID-5592 code - we don't support this subtlety for old appliers
        };

        function makeGuardWrapper(cullUnchanged) {
            if (!cullUnchanged) {
                return null;
            }
            var togo = function (guard) {
                return function (model, changeRequest, internalApplier) {
                    var oldRet = guard(model, changeRequest, internalApplier);
                    if (oldRet === false) {
                        return false;
                    }
                    else {
                        if (fluid.model.isNullChange(model, changeRequest)) {
                            togo.culled = true;
                            return false;
                        }
                    }
                };
            };
            return togo;
        }

        function wrapListener(listener, spec) {
            var pathSpec = spec;
            var transactional = false;
            var priority = Number.MAX_VALUE;
            if (typeof (spec) === "string") {
                spec = {path: spec};
            }
            pathSpec = spec.path;
            transactional = spec.transactional;
            if (spec.priority !== undefined) {
                priority = spec.priority;
            }
            if (pathSpec.charAt(0) === "!") {
                transactional = true;
                pathSpec = pathSpec.substring(1);
            }
            var wrapped = function (changePath, fireSpec, accum) {
                var guid = fluid.event.identifyListener(listener);
                var exist = fireSpec.guids[guid];
                if (!exist || !accum) {
                    var match = fluid.pathUtil.matchPath(pathSpec, changePath);
                    if (match !== null) {
                        var record = {
                            match: match,
                            pathSpec: pathSpec,
                            listener: listener,
                            priority: priority,
                            transactional: transactional
                        };
                        if (accum) {
                            record.accumulate = [accum];
                        }
                        fireSpec.guids[guid] = record;
                        var collection = transactional ? "transListeners" : "listeners";
                        fireSpec[collection].push(record);
                        fireSpec.all.push(record);
                    }
                }
                else if (accum) {
                    if (!exist.accumulate) {
                        exist.accumulate = [];
                    }
                    exist.accumulate.push(accum);
                }
            };
            fluid.event.impersonateListener(listener, wrapped);
            return wrapped;
        }

        function fireFromSpec(name, fireSpec, args, category, wrapper) {
            return baseEvents[name].fireToListeners(fireSpec[category], args, wrapper);
        }

        function fireComparator(recA, recB) {
            return recA.priority - recB.priority;
        }

        function prepareFireEvent(name, changePath, fireSpec, accum) {
            baseEvents[name].fire(changePath, fireSpec, accum);
            fireSpec.all.sort(fireComparator);
            fireSpec.listeners.sort(fireComparator);
            fireSpec.transListeners.sort(fireComparator);
        }

        function makeFireSpec() {
            return {guids: {}, all: [], listeners: [], transListeners: []};
        }

        function getFireSpec(name, changePath) {
            var fireSpec = makeFireSpec();
            prepareFireEvent(name, changePath, fireSpec);
            return fireSpec;
        }

        function fireEvent(name, changePath, args, wrapper) {
            var fireSpec = getFireSpec(name, changePath);
            return fireFromSpec(name, fireSpec, args, "all", wrapper);
        }

        function adaptListener(that, name) {
            that[name] = {
                addListener: function (spec, listener, namespace, softNamespace) {
                    baseEvents[name].addListener(wrapListener(listener, spec), namespace, null, null, softNamespace);
                },
                removeListener: function (listener) {
                    baseEvents[name].removeListener(listener);
                }
            };
        }
        adaptListener(that, "guards");
        adaptListener(that, "postGuards");
        adaptListener(that, "modelChanged");

        function preFireChangeRequest(changeRequest) {
            if (!changeRequest.type) {
                changeRequest.type = "ADD";
            }
            changeRequest.segs = that.parseEL(changeRequest.path);
        }

        var bareApplier = {
            fireChangeRequest: function (changeRequest) {
                that.fireChangeRequest(changeRequest, true);
            }
        };
        fluid.bindRequestChange(bareApplier);

        that.fireChangeRequest = function (changeRequest) {
            preFireChangeRequest(changeRequest);
            var ation = that.initiate();
            ation.fireChangeRequest(changeRequest);
            ation.commit();
        };

        that.fireChangeRequest = sourceWrapModelChanged(that.fireChangeRequest, threadLocal);
        fluid.bindRequestChange(that);
        fluid.bindELMethods(that);

        // TODO: modelChanged has been moved to new model for firing. Once we abolish "guards", fireAgglomerated can go too.
        // Possibly also all the prepareFireEvent/wrapListener/fireSpec nonsense too.
        function fireAgglomerated(eventName, formName, changes, args, accpos, matchpos) {
            var fireSpec = makeFireSpec();
            for (var i = 0; i < changes.length; ++i) {
                prepareFireEvent(eventName, changes[i].path, fireSpec, changes[i]);
            }
            for (var j = 0; j < fireSpec[formName].length; ++j) {
                var spec = fireSpec[formName][j];
                if (accpos !== undefined) {
                    args[accpos] = spec.accumulate;
                }
                if (matchpos !== undefined) {
                    args[matchpos] = spec.match;
                }
                var ret = spec.listener.apply(null, args);
                if (ret === false) {
                    return false;
                }
            }
        }

        that.initiate = function (newModel) {
            var cancelled = false;
            var changes = [];
            if (options.thin) {
                newModel = holder.model;
            }
            else {
                newModel = newModel || {};
                fluid.model.copyModel(newModel, holder.model);
            }
            var ation = {
                commit: function () {
                    var oldModel;
                    if (cancelled) {
                        return false;
                    }
                    var ret = fireAgglomerated("postGuards", "transListeners", changes, [newModel, null, ation], 1);
                    if (ret === false || cancelled) {
                        return false;
                    }
                    if (options.thin) {
                        oldModel = holder.model;
                    }
                    else {
                        oldModel = {};
                        fluid.model.copyModel(oldModel, holder.model);
                        fluid.clear(holder.model);
                        fluid.model.copyModel(holder.model, newModel);
                    }
                    fireAgglomerated("modelChanged", "all", changes, [holder.model, oldModel, null, null], 2, 3);
                },
                fireChangeRequest: function (changeRequest) {
                    preFireChangeRequest(changeRequest);
                    if (options.cullUnchanged && fluid.model.isNullChange(holder.model, changeRequest, options.resolverGetConfig)) {
                        return;
                    }
                    var wrapper = makeGuardWrapper(options.cullUnchanged);
                    var prevent = fireEvent("guards", changeRequest.path, [newModel, changeRequest, ation], wrapper);
                    if (prevent === false && !(wrapper && wrapper.culled)) {
                        cancelled = true;
                    }
                    if (!cancelled) {
                        if (!(wrapper && wrapper.culled)) {
                            fluid.model.applyChangeRequest(newModel, changeRequest, options.resolverSetConfig);
                            changes.push(changeRequest);
                        }
                    }
                }
            };

            ation.fireChangeRequest = sourceWrapModelChanged(ation.fireChangeRequest, threadLocal);
            fluid.bindRequestChange(ation);

            return ation;
        };

        that.hasChangeSource = function (source) {
            return threadLocal().sources[source] > 0;
        };

        return that;
    };

    /** Old "SuperApplier" implementation - will be removed in 1.5 **/

    fluid.makeSuperApplier = function () {
        var subAppliers = [];
        var that = {};
        that.addSubApplier = function (path, subApplier) {
            subAppliers.push({path: path, subApplier: subApplier});
        };
        that.fireChangeRequest = function (request) {
            for (var i = 0; i < subAppliers.length; ++i) {
                var path = subAppliers[i].path;
                if (request.path.indexOf(path) === 0) {
                    var subpath = request.path.substring(path.length + 1);
                    var subRequest = fluid.copy(request);
                    subRequest.path = subpath;
                    // TODO: Deal with the as yet unsupported case of an EL rvalue DAR
                    subAppliers[i].subApplier.fireChangeRequest(subRequest);
                }
            }
        };
        fluid.bindRequestChange(that);
        return that;
    };

    fluid.attachModel = function (baseModel, path, model) {
        var segs = fluid.model.parseEL(path);
        for (var i = 0; i < segs.length - 1; ++i) {
            var seg = segs[i];
            var subModel = baseModel[seg];
            if (!subModel) {
                baseModel[seg] = subModel = {};
            }
            baseModel = subModel;
        }
        baseModel[segs[segs.length - 1]] = model;
    };

    fluid.assembleModel = function (modelSpec) {
        var model = {};
        var superApplier = fluid.makeSuperApplier();
        var togo = {model: model, applier: superApplier};
        for (var path in modelSpec) {
            var rec = modelSpec[path];
            fluid.attachModel(model, path, rec.model);
            if (rec.applier) {
                superApplier.addSubApplier(path, rec.applier);
            }
        }
        return togo;
    };

})(jQuery, fluid_2_0);
