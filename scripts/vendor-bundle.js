/* @preserve
 * The MIT License (MIT)
 * 
 * Copyright (c) 2013-2018 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
/**
 * bluebird build version 3.5.3
 * Features enabled: core
 * Features disabled: race, call_get, generators, map, nodeify, promisify, props, reduce, settle, some, using, timers, filter, any, each
*/
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Promise=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof _dereq_=="function"&&_dereq_;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof _dereq_=="function"&&_dereq_;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
"use strict";
var firstLineError;
try {throw new Error(); } catch (e) {firstLineError = e;}
var schedule = _dereq_("./schedule");
var Queue = _dereq_("./queue");
var util = _dereq_("./util");

function Async() {
    this._customScheduler = false;
    this._isTickUsed = false;
    this._lateQueue = new Queue(16);
    this._normalQueue = new Queue(16);
    this._haveDrainedQueues = false;
    this._trampolineEnabled = true;
    var self = this;
    this.drainQueues = function () {
        self._drainQueues();
    };
    this._schedule = schedule;
}

Async.prototype.setScheduler = function(fn) {
    var prev = this._schedule;
    this._schedule = fn;
    this._customScheduler = true;
    return prev;
};

Async.prototype.hasCustomScheduler = function() {
    return this._customScheduler;
};

Async.prototype.enableTrampoline = function() {
    this._trampolineEnabled = true;
};

Async.prototype.disableTrampolineIfNecessary = function() {
    if (util.hasDevTools) {
        this._trampolineEnabled = false;
    }
};

Async.prototype.haveItemsQueued = function () {
    return this._isTickUsed || this._haveDrainedQueues;
};


Async.prototype.fatalError = function(e, isNode) {
    if (isNode) {
        process.stderr.write("Fatal " + (e instanceof Error ? e.stack : e) +
            "\n");
        process.exit(2);
    } else {
        this.throwLater(e);
    }
};

Async.prototype.throwLater = function(fn, arg) {
    if (arguments.length === 1) {
        arg = fn;
        fn = function () { throw arg; };
    }
    if (typeof setTimeout !== "undefined") {
        setTimeout(function() {
            fn(arg);
        }, 0);
    } else try {
        this._schedule(function() {
            fn(arg);
        });
    } catch (e) {
        throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
};

function AsyncInvokeLater(fn, receiver, arg) {
    this._lateQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncInvoke(fn, receiver, arg) {
    this._normalQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncSettlePromises(promise) {
    this._normalQueue._pushOne(promise);
    this._queueTick();
}

if (!util.hasDevTools) {
    Async.prototype.invokeLater = AsyncInvokeLater;
    Async.prototype.invoke = AsyncInvoke;
    Async.prototype.settlePromises = AsyncSettlePromises;
} else {
    Async.prototype.invokeLater = function (fn, receiver, arg) {
        if (this._trampolineEnabled) {
            AsyncInvokeLater.call(this, fn, receiver, arg);
        } else {
            this._schedule(function() {
                setTimeout(function() {
                    fn.call(receiver, arg);
                }, 100);
            });
        }
    };

    Async.prototype.invoke = function (fn, receiver, arg) {
        if (this._trampolineEnabled) {
            AsyncInvoke.call(this, fn, receiver, arg);
        } else {
            this._schedule(function() {
                fn.call(receiver, arg);
            });
        }
    };

    Async.prototype.settlePromises = function(promise) {
        if (this._trampolineEnabled) {
            AsyncSettlePromises.call(this, promise);
        } else {
            this._schedule(function() {
                promise._settlePromises();
            });
        }
    };
}

function _drainQueue(queue) {
    while (queue.length() > 0) {
        _drainQueueStep(queue);
    }
}

function _drainQueueStep(queue) {
    var fn = queue.shift();
    if (typeof fn !== "function") {
        fn._settlePromises();
    } else {
        var receiver = queue.shift();
        var arg = queue.shift();
        fn.call(receiver, arg);
    }
}

Async.prototype._drainQueues = function () {
    _drainQueue(this._normalQueue);
    this._reset();
    this._haveDrainedQueues = true;
    _drainQueue(this._lateQueue);
};

Async.prototype._queueTick = function () {
    if (!this._isTickUsed) {
        this._isTickUsed = true;
        this._schedule(this.drainQueues);
    }
};

Async.prototype._reset = function () {
    this._isTickUsed = false;
};

module.exports = Async;
module.exports.firstLineError = firstLineError;

},{"./queue":17,"./schedule":18,"./util":21}],2:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise, debug) {
var calledBind = false;
var rejectThis = function(_, e) {
    this._reject(e);
};

var targetRejected = function(e, context) {
    context.promiseRejectionQueued = true;
    context.bindingPromise._then(rejectThis, rejectThis, null, this, e);
};

var bindingResolved = function(thisArg, context) {
    if (((this._bitField & 50397184) === 0)) {
        this._resolveCallback(context.target);
    }
};

var bindingRejected = function(e, context) {
    if (!context.promiseRejectionQueued) this._reject(e);
};

Promise.prototype.bind = function (thisArg) {
    if (!calledBind) {
        calledBind = true;
        Promise.prototype._propagateFrom = debug.propagateFromFunction();
        Promise.prototype._boundValue = debug.boundValueFunction();
    }
    var maybePromise = tryConvertToPromise(thisArg);
    var ret = new Promise(INTERNAL);
    ret._propagateFrom(this, 1);
    var target = this._target();
    ret._setBoundTo(maybePromise);
    if (maybePromise instanceof Promise) {
        var context = {
            promiseRejectionQueued: false,
            promise: ret,
            target: target,
            bindingPromise: maybePromise
        };
        target._then(INTERNAL, targetRejected, undefined, ret, context);
        maybePromise._then(
            bindingResolved, bindingRejected, undefined, ret, context);
        ret._setOnCancel(maybePromise);
    } else {
        ret._resolveCallback(target);
    }
    return ret;
};

Promise.prototype._setBoundTo = function (obj) {
    if (obj !== undefined) {
        this._bitField = this._bitField | 2097152;
        this._boundTo = obj;
    } else {
        this._bitField = this._bitField & (~2097152);
    }
};

Promise.prototype._isBound = function () {
    return (this._bitField & 2097152) === 2097152;
};

Promise.bind = function (thisArg, value) {
    return Promise.resolve(value).bind(thisArg);
};
};

},{}],3:[function(_dereq_,module,exports){
"use strict";
var old;
if (typeof Promise !== "undefined") old = Promise;
function noConflict() {
    try { if (Promise === bluebird) Promise = old; }
    catch (e) {}
    return bluebird;
}
var bluebird = _dereq_("./promise")();
bluebird.noConflict = noConflict;
module.exports = bluebird;

},{"./promise":15}],4:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, PromiseArray, apiRejection, debug) {
var util = _dereq_("./util");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var async = Promise._async;

Promise.prototype["break"] = Promise.prototype.cancel = function() {
    if (!debug.cancellation()) return this._warn("cancellation is disabled");

    var promise = this;
    var child = promise;
    while (promise._isCancellable()) {
        if (!promise._cancelBy(child)) {
            if (child._isFollowing()) {
                child._followee().cancel();
            } else {
                child._cancelBranched();
            }
            break;
        }

        var parent = promise._cancellationParent;
        if (parent == null || !parent._isCancellable()) {
            if (promise._isFollowing()) {
                promise._followee().cancel();
            } else {
                promise._cancelBranched();
            }
            break;
        } else {
            if (promise._isFollowing()) promise._followee().cancel();
            promise._setWillBeCancelled();
            child = promise;
            promise = parent;
        }
    }
};

Promise.prototype._branchHasCancelled = function() {
    this._branchesRemainingToCancel--;
};

Promise.prototype._enoughBranchesHaveCancelled = function() {
    return this._branchesRemainingToCancel === undefined ||
           this._branchesRemainingToCancel <= 0;
};

Promise.prototype._cancelBy = function(canceller) {
    if (canceller === this) {
        this._branchesRemainingToCancel = 0;
        this._invokeOnCancel();
        return true;
    } else {
        this._branchHasCancelled();
        if (this._enoughBranchesHaveCancelled()) {
            this._invokeOnCancel();
            return true;
        }
    }
    return false;
};

Promise.prototype._cancelBranched = function() {
    if (this._enoughBranchesHaveCancelled()) {
        this._cancel();
    }
};

Promise.prototype._cancel = function() {
    if (!this._isCancellable()) return;
    this._setCancelled();
    async.invoke(this._cancelPromises, this, undefined);
};

Promise.prototype._cancelPromises = function() {
    if (this._length() > 0) this._settlePromises();
};

Promise.prototype._unsetOnCancel = function() {
    this._onCancelField = undefined;
};

Promise.prototype._isCancellable = function() {
    return this.isPending() && !this._isCancelled();
};

Promise.prototype.isCancellable = function() {
    return this.isPending() && !this.isCancelled();
};

Promise.prototype._doInvokeOnCancel = function(onCancelCallback, internalOnly) {
    if (util.isArray(onCancelCallback)) {
        for (var i = 0; i < onCancelCallback.length; ++i) {
            this._doInvokeOnCancel(onCancelCallback[i], internalOnly);
        }
    } else if (onCancelCallback !== undefined) {
        if (typeof onCancelCallback === "function") {
            if (!internalOnly) {
                var e = tryCatch(onCancelCallback).call(this._boundValue());
                if (e === errorObj) {
                    this._attachExtraTrace(e.e);
                    async.throwLater(e.e);
                }
            }
        } else {
            onCancelCallback._resultCancelled(this);
        }
    }
};

Promise.prototype._invokeOnCancel = function() {
    var onCancelCallback = this._onCancel();
    this._unsetOnCancel();
    async.invoke(this._doInvokeOnCancel, this, onCancelCallback);
};

Promise.prototype._invokeInternalOnCancel = function() {
    if (this._isCancellable()) {
        this._doInvokeOnCancel(this._onCancel(), true);
        this._unsetOnCancel();
    }
};

Promise.prototype._resultCancelled = function() {
    this.cancel();
};

};

},{"./util":21}],5:[function(_dereq_,module,exports){
"use strict";
module.exports = function(NEXT_FILTER) {
var util = _dereq_("./util");
var getKeys = _dereq_("./es5").keys;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

function catchFilter(instances, cb, promise) {
    return function(e) {
        var boundTo = promise._boundValue();
        predicateLoop: for (var i = 0; i < instances.length; ++i) {
            var item = instances[i];

            if (item === Error ||
                (item != null && item.prototype instanceof Error)) {
                if (e instanceof item) {
                    return tryCatch(cb).call(boundTo, e);
                }
            } else if (typeof item === "function") {
                var matchesPredicate = tryCatch(item).call(boundTo, e);
                if (matchesPredicate === errorObj) {
                    return matchesPredicate;
                } else if (matchesPredicate) {
                    return tryCatch(cb).call(boundTo, e);
                }
            } else if (util.isObject(e)) {
                var keys = getKeys(item);
                for (var j = 0; j < keys.length; ++j) {
                    var key = keys[j];
                    if (item[key] != e[key]) {
                        continue predicateLoop;
                    }
                }
                return tryCatch(cb).call(boundTo, e);
            }
        }
        return NEXT_FILTER;
    };
}

return catchFilter;
};

},{"./es5":10,"./util":21}],6:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var longStackTraces = false;
var contextStack = [];

Promise.prototype._promiseCreated = function() {};
Promise.prototype._pushContext = function() {};
Promise.prototype._popContext = function() {return null;};
Promise._peekContext = Promise.prototype._peekContext = function() {};

function Context() {
    this._trace = new Context.CapturedTrace(peekContext());
}
Context.prototype._pushContext = function () {
    if (this._trace !== undefined) {
        this._trace._promiseCreated = null;
        contextStack.push(this._trace);
    }
};

Context.prototype._popContext = function () {
    if (this._trace !== undefined) {
        var trace = contextStack.pop();
        var ret = trace._promiseCreated;
        trace._promiseCreated = null;
        return ret;
    }
    return null;
};

function createContext() {
    if (longStackTraces) return new Context();
}

function peekContext() {
    var lastIndex = contextStack.length - 1;
    if (lastIndex >= 0) {
        return contextStack[lastIndex];
    }
    return undefined;
}
Context.CapturedTrace = null;
Context.create = createContext;
Context.deactivateLongStackTraces = function() {};
Context.activateLongStackTraces = function() {
    var Promise_pushContext = Promise.prototype._pushContext;
    var Promise_popContext = Promise.prototype._popContext;
    var Promise_PeekContext = Promise._peekContext;
    var Promise_peekContext = Promise.prototype._peekContext;
    var Promise_promiseCreated = Promise.prototype._promiseCreated;
    Context.deactivateLongStackTraces = function() {
        Promise.prototype._pushContext = Promise_pushContext;
        Promise.prototype._popContext = Promise_popContext;
        Promise._peekContext = Promise_PeekContext;
        Promise.prototype._peekContext = Promise_peekContext;
        Promise.prototype._promiseCreated = Promise_promiseCreated;
        longStackTraces = false;
    };
    longStackTraces = true;
    Promise.prototype._pushContext = Context.prototype._pushContext;
    Promise.prototype._popContext = Context.prototype._popContext;
    Promise._peekContext = Promise.prototype._peekContext = peekContext;
    Promise.prototype._promiseCreated = function() {
        var ctx = this._peekContext();
        if (ctx && ctx._promiseCreated == null) ctx._promiseCreated = this;
    };
};
return Context;
};

},{}],7:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, Context) {
var getDomain = Promise._getDomain;
var async = Promise._async;
var Warning = _dereq_("./errors").Warning;
var util = _dereq_("./util");
var es5 = _dereq_("./es5");
var canAttachTrace = util.canAttachTrace;
var unhandledRejectionHandled;
var possiblyUnhandledRejection;
var bluebirdFramePattern =
    /[\\\/]bluebird[\\\/]js[\\\/](release|debug|instrumented)/;
var nodeFramePattern = /\((?:timers\.js):\d+:\d+\)/;
var parseLinePattern = /[\/<\(](.+?):(\d+):(\d+)\)?\s*$/;
var stackFramePattern = null;
var formatStack = null;
var indentStackFrames = false;
var printWarning;
var debugging = !!(util.env("BLUEBIRD_DEBUG") != 0 &&
                        (true ||
                         util.env("BLUEBIRD_DEBUG") ||
                         util.env("NODE_ENV") === "development"));

var warnings = !!(util.env("BLUEBIRD_WARNINGS") != 0 &&
    (debugging || util.env("BLUEBIRD_WARNINGS")));

var longStackTraces = !!(util.env("BLUEBIRD_LONG_STACK_TRACES") != 0 &&
    (debugging || util.env("BLUEBIRD_LONG_STACK_TRACES")));

var wForgottenReturn = util.env("BLUEBIRD_W_FORGOTTEN_RETURN") != 0 &&
    (warnings || !!util.env("BLUEBIRD_W_FORGOTTEN_RETURN"));

Promise.prototype.suppressUnhandledRejections = function() {
    var target = this._target();
    target._bitField = ((target._bitField & (~1048576)) |
                      524288);
};

Promise.prototype._ensurePossibleRejectionHandled = function () {
    if ((this._bitField & 524288) !== 0) return;
    this._setRejectionIsUnhandled();
    var self = this;
    setTimeout(function() {
        self._notifyUnhandledRejection();
    }, 1);
};

Promise.prototype._notifyUnhandledRejectionIsHandled = function () {
    fireRejectionEvent("rejectionHandled",
                                  unhandledRejectionHandled, undefined, this);
};

Promise.prototype._setReturnedNonUndefined = function() {
    this._bitField = this._bitField | 268435456;
};

Promise.prototype._returnedNonUndefined = function() {
    return (this._bitField & 268435456) !== 0;
};

Promise.prototype._notifyUnhandledRejection = function () {
    if (this._isRejectionUnhandled()) {
        var reason = this._settledValue();
        this._setUnhandledRejectionIsNotified();
        fireRejectionEvent("unhandledRejection",
                                      possiblyUnhandledRejection, reason, this);
    }
};

Promise.prototype._setUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField | 262144;
};

Promise.prototype._unsetUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField & (~262144);
};

Promise.prototype._isUnhandledRejectionNotified = function () {
    return (this._bitField & 262144) > 0;
};

Promise.prototype._setRejectionIsUnhandled = function () {
    this._bitField = this._bitField | 1048576;
};

Promise.prototype._unsetRejectionIsUnhandled = function () {
    this._bitField = this._bitField & (~1048576);
    if (this._isUnhandledRejectionNotified()) {
        this._unsetUnhandledRejectionIsNotified();
        this._notifyUnhandledRejectionIsHandled();
    }
};

Promise.prototype._isRejectionUnhandled = function () {
    return (this._bitField & 1048576) > 0;
};

Promise.prototype._warn = function(message, shouldUseOwnTrace, promise) {
    return warn(message, shouldUseOwnTrace, promise || this);
};

Promise.onPossiblyUnhandledRejection = function (fn) {
    var domain = getDomain();
    possiblyUnhandledRejection =
        typeof fn === "function" ? (domain === null ?
                                            fn : util.domainBind(domain, fn))
                                 : undefined;
};

Promise.onUnhandledRejectionHandled = function (fn) {
    var domain = getDomain();
    unhandledRejectionHandled =
        typeof fn === "function" ? (domain === null ?
                                            fn : util.domainBind(domain, fn))
                                 : undefined;
};

var disableLongStackTraces = function() {};
Promise.longStackTraces = function () {
    if (async.haveItemsQueued() && !config.longStackTraces) {
        throw new Error("cannot enable long stack traces after promises have been created\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    if (!config.longStackTraces && longStackTracesIsSupported()) {
        var Promise_captureStackTrace = Promise.prototype._captureStackTrace;
        var Promise_attachExtraTrace = Promise.prototype._attachExtraTrace;
        var Promise_dereferenceTrace = Promise.prototype._dereferenceTrace;
        config.longStackTraces = true;
        disableLongStackTraces = function() {
            if (async.haveItemsQueued() && !config.longStackTraces) {
                throw new Error("cannot enable long stack traces after promises have been created\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
            }
            Promise.prototype._captureStackTrace = Promise_captureStackTrace;
            Promise.prototype._attachExtraTrace = Promise_attachExtraTrace;
            Promise.prototype._dereferenceTrace = Promise_dereferenceTrace;
            Context.deactivateLongStackTraces();
            async.enableTrampoline();
            config.longStackTraces = false;
        };
        Promise.prototype._captureStackTrace = longStackTracesCaptureStackTrace;
        Promise.prototype._attachExtraTrace = longStackTracesAttachExtraTrace;
        Promise.prototype._dereferenceTrace = longStackTracesDereferenceTrace;
        Context.activateLongStackTraces();
        async.disableTrampolineIfNecessary();
    }
};

Promise.hasLongStackTraces = function () {
    return config.longStackTraces && longStackTracesIsSupported();
};

var fireDomEvent = (function() {
    try {
        if (typeof CustomEvent === "function") {
            var event = new CustomEvent("CustomEvent");
            util.global.dispatchEvent(event);
            return function(name, event) {
                var eventData = {
                    detail: event,
                    cancelable: true
                };
                es5.defineProperty(
                    eventData, "promise", {value: event.promise});
                es5.defineProperty(eventData, "reason", {value: event.reason});
                var domEvent = new CustomEvent(name.toLowerCase(), eventData);
                return !util.global.dispatchEvent(domEvent);
            };
        } else if (typeof Event === "function") {
            var event = new Event("CustomEvent");
            util.global.dispatchEvent(event);
            return function(name, event) {
                var domEvent = new Event(name.toLowerCase(), {
                    cancelable: true
                });
                domEvent.detail = event;
                es5.defineProperty(domEvent, "promise", {value: event.promise});
                es5.defineProperty(domEvent, "reason", {value: event.reason});
                return !util.global.dispatchEvent(domEvent);
            };
        } else {
            var event = document.createEvent("CustomEvent");
            event.initCustomEvent("testingtheevent", false, true, {});
            util.global.dispatchEvent(event);
            return function(name, event) {
                var domEvent = document.createEvent("CustomEvent");
                domEvent.initCustomEvent(name.toLowerCase(), false, true,
                    event);
                return !util.global.dispatchEvent(domEvent);
            };
        }
    } catch (e) {}
    return function() {
        return false;
    };
})();

var fireGlobalEvent = (function() {
    if (util.isNode) {
        return function() {
            return process.emit.apply(process, arguments);
        };
    } else {
        if (!util.global) {
            return function() {
                return false;
            };
        }
        return function(name) {
            var methodName = "on" + name.toLowerCase();
            var method = util.global[methodName];
            if (!method) return false;
            method.apply(util.global, [].slice.call(arguments, 1));
            return true;
        };
    }
})();

function generatePromiseLifecycleEventObject(name, promise) {
    return {promise: promise};
}

var eventToObjectGenerator = {
    promiseCreated: generatePromiseLifecycleEventObject,
    promiseFulfilled: generatePromiseLifecycleEventObject,
    promiseRejected: generatePromiseLifecycleEventObject,
    promiseResolved: generatePromiseLifecycleEventObject,
    promiseCancelled: generatePromiseLifecycleEventObject,
    promiseChained: function(name, promise, child) {
        return {promise: promise, child: child};
    },
    warning: function(name, warning) {
        return {warning: warning};
    },
    unhandledRejection: function (name, reason, promise) {
        return {reason: reason, promise: promise};
    },
    rejectionHandled: generatePromiseLifecycleEventObject
};

var activeFireEvent = function (name) {
    var globalEventFired = false;
    try {
        globalEventFired = fireGlobalEvent.apply(null, arguments);
    } catch (e) {
        async.throwLater(e);
        globalEventFired = true;
    }

    var domEventFired = false;
    try {
        domEventFired = fireDomEvent(name,
                    eventToObjectGenerator[name].apply(null, arguments));
    } catch (e) {
        async.throwLater(e);
        domEventFired = true;
    }

    return domEventFired || globalEventFired;
};

Promise.config = function(opts) {
    opts = Object(opts);
    if ("longStackTraces" in opts) {
        if (opts.longStackTraces) {
            Promise.longStackTraces();
        } else if (!opts.longStackTraces && Promise.hasLongStackTraces()) {
            disableLongStackTraces();
        }
    }
    if ("warnings" in opts) {
        var warningsOption = opts.warnings;
        config.warnings = !!warningsOption;
        wForgottenReturn = config.warnings;

        if (util.isObject(warningsOption)) {
            if ("wForgottenReturn" in warningsOption) {
                wForgottenReturn = !!warningsOption.wForgottenReturn;
            }
        }
    }
    if ("cancellation" in opts && opts.cancellation && !config.cancellation) {
        if (async.haveItemsQueued()) {
            throw new Error(
                "cannot enable cancellation after promises are in use");
        }
        Promise.prototype._clearCancellationData =
            cancellationClearCancellationData;
        Promise.prototype._propagateFrom = cancellationPropagateFrom;
        Promise.prototype._onCancel = cancellationOnCancel;
        Promise.prototype._setOnCancel = cancellationSetOnCancel;
        Promise.prototype._attachCancellationCallback =
            cancellationAttachCancellationCallback;
        Promise.prototype._execute = cancellationExecute;
        propagateFromFunction = cancellationPropagateFrom;
        config.cancellation = true;
    }
    if ("monitoring" in opts) {
        if (opts.monitoring && !config.monitoring) {
            config.monitoring = true;
            Promise.prototype._fireEvent = activeFireEvent;
        } else if (!opts.monitoring && config.monitoring) {
            config.monitoring = false;
            Promise.prototype._fireEvent = defaultFireEvent;
        }
    }
    return Promise;
};

function defaultFireEvent() { return false; }

Promise.prototype._fireEvent = defaultFireEvent;
Promise.prototype._execute = function(executor, resolve, reject) {
    try {
        executor(resolve, reject);
    } catch (e) {
        return e;
    }
};
Promise.prototype._onCancel = function () {};
Promise.prototype._setOnCancel = function (handler) { ; };
Promise.prototype._attachCancellationCallback = function(onCancel) {
    ;
};
Promise.prototype._captureStackTrace = function () {};
Promise.prototype._attachExtraTrace = function () {};
Promise.prototype._dereferenceTrace = function () {};
Promise.prototype._clearCancellationData = function() {};
Promise.prototype._propagateFrom = function (parent, flags) {
    ;
    ;
};

function cancellationExecute(executor, resolve, reject) {
    var promise = this;
    try {
        executor(resolve, reject, function(onCancel) {
            if (typeof onCancel !== "function") {
                throw new TypeError("onCancel must be a function, got: " +
                                    util.toString(onCancel));
            }
            promise._attachCancellationCallback(onCancel);
        });
    } catch (e) {
        return e;
    }
}

function cancellationAttachCancellationCallback(onCancel) {
    if (!this._isCancellable()) return this;

    var previousOnCancel = this._onCancel();
    if (previousOnCancel !== undefined) {
        if (util.isArray(previousOnCancel)) {
            previousOnCancel.push(onCancel);
        } else {
            this._setOnCancel([previousOnCancel, onCancel]);
        }
    } else {
        this._setOnCancel(onCancel);
    }
}

function cancellationOnCancel() {
    return this._onCancelField;
}

function cancellationSetOnCancel(onCancel) {
    this._onCancelField = onCancel;
}

function cancellationClearCancellationData() {
    this._cancellationParent = undefined;
    this._onCancelField = undefined;
}

function cancellationPropagateFrom(parent, flags) {
    if ((flags & 1) !== 0) {
        this._cancellationParent = parent;
        var branchesRemainingToCancel = parent._branchesRemainingToCancel;
        if (branchesRemainingToCancel === undefined) {
            branchesRemainingToCancel = 0;
        }
        parent._branchesRemainingToCancel = branchesRemainingToCancel + 1;
    }
    if ((flags & 2) !== 0 && parent._isBound()) {
        this._setBoundTo(parent._boundTo);
    }
}

function bindingPropagateFrom(parent, flags) {
    if ((flags & 2) !== 0 && parent._isBound()) {
        this._setBoundTo(parent._boundTo);
    }
}
var propagateFromFunction = bindingPropagateFrom;

function boundValueFunction() {
    var ret = this._boundTo;
    if (ret !== undefined) {
        if (ret instanceof Promise) {
            if (ret.isFulfilled()) {
                return ret.value();
            } else {
                return undefined;
            }
        }
    }
    return ret;
}

function longStackTracesCaptureStackTrace() {
    this._trace = new CapturedTrace(this._peekContext());
}

function longStackTracesAttachExtraTrace(error, ignoreSelf) {
    if (canAttachTrace(error)) {
        var trace = this._trace;
        if (trace !== undefined) {
            if (ignoreSelf) trace = trace._parent;
        }
        if (trace !== undefined) {
            trace.attachExtraTrace(error);
        } else if (!error.__stackCleaned__) {
            var parsed = parseStackAndMessage(error);
            util.notEnumerableProp(error, "stack",
                parsed.message + "\n" + parsed.stack.join("\n"));
            util.notEnumerableProp(error, "__stackCleaned__", true);
        }
    }
}

function longStackTracesDereferenceTrace() {
    this._trace = undefined;
}

function checkForgottenReturns(returnValue, promiseCreated, name, promise,
                               parent) {
    if (returnValue === undefined && promiseCreated !== null &&
        wForgottenReturn) {
        if (parent !== undefined && parent._returnedNonUndefined()) return;
        if ((promise._bitField & 65535) === 0) return;

        if (name) name = name + " ";
        var handlerLine = "";
        var creatorLine = "";
        if (promiseCreated._trace) {
            var traceLines = promiseCreated._trace.stack.split("\n");
            var stack = cleanStack(traceLines);
            for (var i = stack.length - 1; i >= 0; --i) {
                var line = stack[i];
                if (!nodeFramePattern.test(line)) {
                    var lineMatches = line.match(parseLinePattern);
                    if (lineMatches) {
                        handlerLine  = "at " + lineMatches[1] +
                            ":" + lineMatches[2] + ":" + lineMatches[3] + " ";
                    }
                    break;
                }
            }

            if (stack.length > 0) {
                var firstUserLine = stack[0];
                for (var i = 0; i < traceLines.length; ++i) {

                    if (traceLines[i] === firstUserLine) {
                        if (i > 0) {
                            creatorLine = "\n" + traceLines[i - 1];
                        }
                        break;
                    }
                }

            }
        }
        var msg = "a promise was created in a " + name +
            "handler " + handlerLine + "but was not returned from it, " +
            "see http://goo.gl/rRqMUw" +
            creatorLine;
        promise._warn(msg, true, promiseCreated);
    }
}

function deprecated(name, replacement) {
    var message = name +
        " is deprecated and will be removed in a future version.";
    if (replacement) message += " Use " + replacement + " instead.";
    return warn(message);
}

function warn(message, shouldUseOwnTrace, promise) {
    if (!config.warnings) return;
    var warning = new Warning(message);
    var ctx;
    if (shouldUseOwnTrace) {
        promise._attachExtraTrace(warning);
    } else if (config.longStackTraces && (ctx = Promise._peekContext())) {
        ctx.attachExtraTrace(warning);
    } else {
        var parsed = parseStackAndMessage(warning);
        warning.stack = parsed.message + "\n" + parsed.stack.join("\n");
    }

    if (!activeFireEvent("warning", warning)) {
        formatAndLogError(warning, "", true);
    }
}

function reconstructStack(message, stacks) {
    for (var i = 0; i < stacks.length - 1; ++i) {
        stacks[i].push("From previous event:");
        stacks[i] = stacks[i].join("\n");
    }
    if (i < stacks.length) {
        stacks[i] = stacks[i].join("\n");
    }
    return message + "\n" + stacks.join("\n");
}

function removeDuplicateOrEmptyJumps(stacks) {
    for (var i = 0; i < stacks.length; ++i) {
        if (stacks[i].length === 0 ||
            ((i + 1 < stacks.length) && stacks[i][0] === stacks[i+1][0])) {
            stacks.splice(i, 1);
            i--;
        }
    }
}

function removeCommonRoots(stacks) {
    var current = stacks[0];
    for (var i = 1; i < stacks.length; ++i) {
        var prev = stacks[i];
        var currentLastIndex = current.length - 1;
        var currentLastLine = current[currentLastIndex];
        var commonRootMeetPoint = -1;

        for (var j = prev.length - 1; j >= 0; --j) {
            if (prev[j] === currentLastLine) {
                commonRootMeetPoint = j;
                break;
            }
        }

        for (var j = commonRootMeetPoint; j >= 0; --j) {
            var line = prev[j];
            if (current[currentLastIndex] === line) {
                current.pop();
                currentLastIndex--;
            } else {
                break;
            }
        }
        current = prev;
    }
}

function cleanStack(stack) {
    var ret = [];
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        var isTraceLine = "    (No stack trace)" === line ||
            stackFramePattern.test(line);
        var isInternalFrame = isTraceLine && shouldIgnore(line);
        if (isTraceLine && !isInternalFrame) {
            if (indentStackFrames && line.charAt(0) !== " ") {
                line = "    " + line;
            }
            ret.push(line);
        }
    }
    return ret;
}

function stackFramesAsArray(error) {
    var stack = error.stack.replace(/\s+$/g, "").split("\n");
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        if ("    (No stack trace)" === line || stackFramePattern.test(line)) {
            break;
        }
    }
    if (i > 0 && error.name != "SyntaxError") {
        stack = stack.slice(i);
    }
    return stack;
}

function parseStackAndMessage(error) {
    var stack = error.stack;
    var message = error.toString();
    stack = typeof stack === "string" && stack.length > 0
                ? stackFramesAsArray(error) : ["    (No stack trace)"];
    return {
        message: message,
        stack: error.name == "SyntaxError" ? stack : cleanStack(stack)
    };
}

function formatAndLogError(error, title, isSoft) {
    if (typeof console !== "undefined") {
        var message;
        if (util.isObject(error)) {
            var stack = error.stack;
            message = title + formatStack(stack, error);
        } else {
            message = title + String(error);
        }
        if (typeof printWarning === "function") {
            printWarning(message, isSoft);
        } else if (typeof console.log === "function" ||
            typeof console.log === "object") {
            console.log(message);
        }
    }
}

function fireRejectionEvent(name, localHandler, reason, promise) {
    var localEventFired = false;
    try {
        if (typeof localHandler === "function") {
            localEventFired = true;
            if (name === "rejectionHandled") {
                localHandler(promise);
            } else {
                localHandler(reason, promise);
            }
        }
    } catch (e) {
        async.throwLater(e);
    }

    if (name === "unhandledRejection") {
        if (!activeFireEvent(name, reason, promise) && !localEventFired) {
            formatAndLogError(reason, "Unhandled rejection ");
        }
    } else {
        activeFireEvent(name, promise);
    }
}

function formatNonError(obj) {
    var str;
    if (typeof obj === "function") {
        str = "[function " +
            (obj.name || "anonymous") +
            "]";
    } else {
        str = obj && typeof obj.toString === "function"
            ? obj.toString() : util.toString(obj);
        var ruselessToString = /\[object [a-zA-Z0-9$_]+\]/;
        if (ruselessToString.test(str)) {
            try {
                var newStr = JSON.stringify(obj);
                str = newStr;
            }
            catch(e) {

            }
        }
        if (str.length === 0) {
            str = "(empty array)";
        }
    }
    return ("(<" + snip(str) + ">, no stack trace)");
}

function snip(str) {
    var maxChars = 41;
    if (str.length < maxChars) {
        return str;
    }
    return str.substr(0, maxChars - 3) + "...";
}

function longStackTracesIsSupported() {
    return typeof captureStackTrace === "function";
}

var shouldIgnore = function() { return false; };
var parseLineInfoRegex = /[\/<\(]([^:\/]+):(\d+):(?:\d+)\)?\s*$/;
function parseLineInfo(line) {
    var matches = line.match(parseLineInfoRegex);
    if (matches) {
        return {
            fileName: matches[1],
            line: parseInt(matches[2], 10)
        };
    }
}

function setBounds(firstLineError, lastLineError) {
    if (!longStackTracesIsSupported()) return;
    var firstStackLines = firstLineError.stack.split("\n");
    var lastStackLines = lastLineError.stack.split("\n");
    var firstIndex = -1;
    var lastIndex = -1;
    var firstFileName;
    var lastFileName;
    for (var i = 0; i < firstStackLines.length; ++i) {
        var result = parseLineInfo(firstStackLines[i]);
        if (result) {
            firstFileName = result.fileName;
            firstIndex = result.line;
            break;
        }
    }
    for (var i = 0; i < lastStackLines.length; ++i) {
        var result = parseLineInfo(lastStackLines[i]);
        if (result) {
            lastFileName = result.fileName;
            lastIndex = result.line;
            break;
        }
    }
    if (firstIndex < 0 || lastIndex < 0 || !firstFileName || !lastFileName ||
        firstFileName !== lastFileName || firstIndex >= lastIndex) {
        return;
    }

    shouldIgnore = function(line) {
        if (bluebirdFramePattern.test(line)) return true;
        var info = parseLineInfo(line);
        if (info) {
            if (info.fileName === firstFileName &&
                (firstIndex <= info.line && info.line <= lastIndex)) {
                return true;
            }
        }
        return false;
    };
}

function CapturedTrace(parent) {
    this._parent = parent;
    this._promisesCreated = 0;
    var length = this._length = 1 + (parent === undefined ? 0 : parent._length);
    captureStackTrace(this, CapturedTrace);
    if (length > 32) this.uncycle();
}
util.inherits(CapturedTrace, Error);
Context.CapturedTrace = CapturedTrace;

CapturedTrace.prototype.uncycle = function() {
    var length = this._length;
    if (length < 2) return;
    var nodes = [];
    var stackToIndex = {};

    for (var i = 0, node = this; node !== undefined; ++i) {
        nodes.push(node);
        node = node._parent;
    }
    length = this._length = i;
    for (var i = length - 1; i >= 0; --i) {
        var stack = nodes[i].stack;
        if (stackToIndex[stack] === undefined) {
            stackToIndex[stack] = i;
        }
    }
    for (var i = 0; i < length; ++i) {
        var currentStack = nodes[i].stack;
        var index = stackToIndex[currentStack];
        if (index !== undefined && index !== i) {
            if (index > 0) {
                nodes[index - 1]._parent = undefined;
                nodes[index - 1]._length = 1;
            }
            nodes[i]._parent = undefined;
            nodes[i]._length = 1;
            var cycleEdgeNode = i > 0 ? nodes[i - 1] : this;

            if (index < length - 1) {
                cycleEdgeNode._parent = nodes[index + 1];
                cycleEdgeNode._parent.uncycle();
                cycleEdgeNode._length =
                    cycleEdgeNode._parent._length + 1;
            } else {
                cycleEdgeNode._parent = undefined;
                cycleEdgeNode._length = 1;
            }
            var currentChildLength = cycleEdgeNode._length + 1;
            for (var j = i - 2; j >= 0; --j) {
                nodes[j]._length = currentChildLength;
                currentChildLength++;
            }
            return;
        }
    }
};

CapturedTrace.prototype.attachExtraTrace = function(error) {
    if (error.__stackCleaned__) return;
    this.uncycle();
    var parsed = parseStackAndMessage(error);
    var message = parsed.message;
    var stacks = [parsed.stack];

    var trace = this;
    while (trace !== undefined) {
        stacks.push(cleanStack(trace.stack.split("\n")));
        trace = trace._parent;
    }
    removeCommonRoots(stacks);
    removeDuplicateOrEmptyJumps(stacks);
    util.notEnumerableProp(error, "stack", reconstructStack(message, stacks));
    util.notEnumerableProp(error, "__stackCleaned__", true);
};

var captureStackTrace = (function stackDetection() {
    var v8stackFramePattern = /^\s*at\s*/;
    var v8stackFormatter = function(stack, error) {
        if (typeof stack === "string") return stack;

        if (error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    if (typeof Error.stackTraceLimit === "number" &&
        typeof Error.captureStackTrace === "function") {
        Error.stackTraceLimit += 6;
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        var captureStackTrace = Error.captureStackTrace;

        shouldIgnore = function(line) {
            return bluebirdFramePattern.test(line);
        };
        return function(receiver, ignoreUntil) {
            Error.stackTraceLimit += 6;
            captureStackTrace(receiver, ignoreUntil);
            Error.stackTraceLimit -= 6;
        };
    }
    var err = new Error();

    if (typeof err.stack === "string" &&
        err.stack.split("\n")[0].indexOf("stackDetection@") >= 0) {
        stackFramePattern = /@/;
        formatStack = v8stackFormatter;
        indentStackFrames = true;
        return function captureStackTrace(o) {
            o.stack = new Error().stack;
        };
    }

    var hasStackAfterThrow;
    try { throw new Error(); }
    catch(e) {
        hasStackAfterThrow = ("stack" in e);
    }
    if (!("stack" in err) && hasStackAfterThrow &&
        typeof Error.stackTraceLimit === "number") {
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        return function captureStackTrace(o) {
            Error.stackTraceLimit += 6;
            try { throw new Error(); }
            catch(e) { o.stack = e.stack; }
            Error.stackTraceLimit -= 6;
        };
    }

    formatStack = function(stack, error) {
        if (typeof stack === "string") return stack;

        if ((typeof error === "object" ||
            typeof error === "function") &&
            error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    return null;

})([]);

if (typeof console !== "undefined" && typeof console.warn !== "undefined") {
    printWarning = function (message) {
        console.warn(message);
    };
    if (util.isNode && process.stderr.isTTY) {
        printWarning = function(message, isSoft) {
            var color = isSoft ? "\u001b[33m" : "\u001b[31m";
            console.warn(color + message + "\u001b[0m\n");
        };
    } else if (!util.isNode && typeof (new Error().stack) === "string") {
        printWarning = function(message, isSoft) {
            console.warn("%c" + message,
                        isSoft ? "color: darkorange" : "color: red");
        };
    }
}

var config = {
    warnings: warnings,
    longStackTraces: false,
    cancellation: false,
    monitoring: false
};

if (longStackTraces) Promise.longStackTraces();

return {
    longStackTraces: function() {
        return config.longStackTraces;
    },
    warnings: function() {
        return config.warnings;
    },
    cancellation: function() {
        return config.cancellation;
    },
    monitoring: function() {
        return config.monitoring;
    },
    propagateFromFunction: function() {
        return propagateFromFunction;
    },
    boundValueFunction: function() {
        return boundValueFunction;
    },
    checkForgottenReturns: checkForgottenReturns,
    setBounds: setBounds,
    warn: warn,
    deprecated: deprecated,
    CapturedTrace: CapturedTrace,
    fireDomEvent: fireDomEvent,
    fireGlobalEvent: fireGlobalEvent
};
};

},{"./errors":9,"./es5":10,"./util":21}],8:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
function returner() {
    return this.value;
}
function thrower() {
    throw this.reason;
}

Promise.prototype["return"] =
Promise.prototype.thenReturn = function (value) {
    if (value instanceof Promise) value.suppressUnhandledRejections();
    return this._then(
        returner, undefined, undefined, {value: value}, undefined);
};

Promise.prototype["throw"] =
Promise.prototype.thenThrow = function (reason) {
    return this._then(
        thrower, undefined, undefined, {reason: reason}, undefined);
};

Promise.prototype.catchThrow = function (reason) {
    if (arguments.length <= 1) {
        return this._then(
            undefined, thrower, undefined, {reason: reason}, undefined);
    } else {
        var _reason = arguments[1];
        var handler = function() {throw _reason;};
        return this.caught(reason, handler);
    }
};

Promise.prototype.catchReturn = function (value) {
    if (arguments.length <= 1) {
        if (value instanceof Promise) value.suppressUnhandledRejections();
        return this._then(
            undefined, returner, undefined, {value: value}, undefined);
    } else {
        var _value = arguments[1];
        if (_value instanceof Promise) _value.suppressUnhandledRejections();
        var handler = function() {return _value;};
        return this.caught(value, handler);
    }
};
};

},{}],9:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5");
var Objectfreeze = es5.freeze;
var util = _dereq_("./util");
var inherits = util.inherits;
var notEnumerableProp = util.notEnumerableProp;

function subError(nameProperty, defaultMessage) {
    function SubError(message) {
        if (!(this instanceof SubError)) return new SubError(message);
        notEnumerableProp(this, "message",
            typeof message === "string" ? message : defaultMessage);
        notEnumerableProp(this, "name", nameProperty);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        } else {
            Error.call(this);
        }
    }
    inherits(SubError, Error);
    return SubError;
}

var _TypeError, _RangeError;
var Warning = subError("Warning", "warning");
var CancellationError = subError("CancellationError", "cancellation error");
var TimeoutError = subError("TimeoutError", "timeout error");
var AggregateError = subError("AggregateError", "aggregate error");
try {
    _TypeError = TypeError;
    _RangeError = RangeError;
} catch(e) {
    _TypeError = subError("TypeError", "type error");
    _RangeError = subError("RangeError", "range error");
}

var methods = ("join pop push shift unshift slice filter forEach some " +
    "every map indexOf lastIndexOf reduce reduceRight sort reverse").split(" ");

for (var i = 0; i < methods.length; ++i) {
    if (typeof Array.prototype[methods[i]] === "function") {
        AggregateError.prototype[methods[i]] = Array.prototype[methods[i]];
    }
}

es5.defineProperty(AggregateError.prototype, "length", {
    value: 0,
    configurable: false,
    writable: true,
    enumerable: true
});
AggregateError.prototype["isOperational"] = true;
var level = 0;
AggregateError.prototype.toString = function() {
    var indent = Array(level * 4 + 1).join(" ");
    var ret = "\n" + indent + "AggregateError of:" + "\n";
    level++;
    indent = Array(level * 4 + 1).join(" ");
    for (var i = 0; i < this.length; ++i) {
        var str = this[i] === this ? "[Circular AggregateError]" : this[i] + "";
        var lines = str.split("\n");
        for (var j = 0; j < lines.length; ++j) {
            lines[j] = indent + lines[j];
        }
        str = lines.join("\n");
        ret += str + "\n";
    }
    level--;
    return ret;
};

function OperationalError(message) {
    if (!(this instanceof OperationalError))
        return new OperationalError(message);
    notEnumerableProp(this, "name", "OperationalError");
    notEnumerableProp(this, "message", message);
    this.cause = message;
    this["isOperational"] = true;

    if (message instanceof Error) {
        notEnumerableProp(this, "message", message.message);
        notEnumerableProp(this, "stack", message.stack);
    } else if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    }

}
inherits(OperationalError, Error);

var errorTypes = Error["__BluebirdErrorTypes__"];
if (!errorTypes) {
    errorTypes = Objectfreeze({
        CancellationError: CancellationError,
        TimeoutError: TimeoutError,
        OperationalError: OperationalError,
        RejectionError: OperationalError,
        AggregateError: AggregateError
    });
    es5.defineProperty(Error, "__BluebirdErrorTypes__", {
        value: errorTypes,
        writable: false,
        enumerable: false,
        configurable: false
    });
}

module.exports = {
    Error: Error,
    TypeError: _TypeError,
    RangeError: _RangeError,
    CancellationError: errorTypes.CancellationError,
    OperationalError: errorTypes.OperationalError,
    TimeoutError: errorTypes.TimeoutError,
    AggregateError: errorTypes.AggregateError,
    Warning: Warning
};

},{"./es5":10,"./util":21}],10:[function(_dereq_,module,exports){
var isES5 = (function(){
    "use strict";
    return this === undefined;
})();

if (isES5) {
    module.exports = {
        freeze: Object.freeze,
        defineProperty: Object.defineProperty,
        getDescriptor: Object.getOwnPropertyDescriptor,
        keys: Object.keys,
        names: Object.getOwnPropertyNames,
        getPrototypeOf: Object.getPrototypeOf,
        isArray: Array.isArray,
        isES5: isES5,
        propertyIsWritable: function(obj, prop) {
            var descriptor = Object.getOwnPropertyDescriptor(obj, prop);
            return !!(!descriptor || descriptor.writable || descriptor.set);
        }
    };
} else {
    var has = {}.hasOwnProperty;
    var str = {}.toString;
    var proto = {}.constructor.prototype;

    var ObjectKeys = function (o) {
        var ret = [];
        for (var key in o) {
            if (has.call(o, key)) {
                ret.push(key);
            }
        }
        return ret;
    };

    var ObjectGetDescriptor = function(o, key) {
        return {value: o[key]};
    };

    var ObjectDefineProperty = function (o, key, desc) {
        o[key] = desc.value;
        return o;
    };

    var ObjectFreeze = function (obj) {
        return obj;
    };

    var ObjectGetPrototypeOf = function (obj) {
        try {
            return Object(obj).constructor.prototype;
        }
        catch (e) {
            return proto;
        }
    };

    var ArrayIsArray = function (obj) {
        try {
            return str.call(obj) === "[object Array]";
        }
        catch(e) {
            return false;
        }
    };

    module.exports = {
        isArray: ArrayIsArray,
        keys: ObjectKeys,
        names: ObjectKeys,
        defineProperty: ObjectDefineProperty,
        getDescriptor: ObjectGetDescriptor,
        freeze: ObjectFreeze,
        getPrototypeOf: ObjectGetPrototypeOf,
        isES5: isES5,
        propertyIsWritable: function() {
            return true;
        }
    };
}

},{}],11:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, tryConvertToPromise, NEXT_FILTER) {
var util = _dereq_("./util");
var CancellationError = Promise.CancellationError;
var errorObj = util.errorObj;
var catchFilter = _dereq_("./catch_filter")(NEXT_FILTER);

function PassThroughHandlerContext(promise, type, handler) {
    this.promise = promise;
    this.type = type;
    this.handler = handler;
    this.called = false;
    this.cancelPromise = null;
}

PassThroughHandlerContext.prototype.isFinallyHandler = function() {
    return this.type === 0;
};

function FinallyHandlerCancelReaction(finallyHandler) {
    this.finallyHandler = finallyHandler;
}

FinallyHandlerCancelReaction.prototype._resultCancelled = function() {
    checkCancel(this.finallyHandler);
};

function checkCancel(ctx, reason) {
    if (ctx.cancelPromise != null) {
        if (arguments.length > 1) {
            ctx.cancelPromise._reject(reason);
        } else {
            ctx.cancelPromise._cancel();
        }
        ctx.cancelPromise = null;
        return true;
    }
    return false;
}

function succeed() {
    return finallyHandler.call(this, this.promise._target()._settledValue());
}
function fail(reason) {
    if (checkCancel(this, reason)) return;
    errorObj.e = reason;
    return errorObj;
}
function finallyHandler(reasonOrValue) {
    var promise = this.promise;
    var handler = this.handler;

    if (!this.called) {
        this.called = true;
        var ret = this.isFinallyHandler()
            ? handler.call(promise._boundValue())
            : handler.call(promise._boundValue(), reasonOrValue);
        if (ret === NEXT_FILTER) {
            return ret;
        } else if (ret !== undefined) {
            promise._setReturnedNonUndefined();
            var maybePromise = tryConvertToPromise(ret, promise);
            if (maybePromise instanceof Promise) {
                if (this.cancelPromise != null) {
                    if (maybePromise._isCancelled()) {
                        var reason =
                            new CancellationError("late cancellation observer");
                        promise._attachExtraTrace(reason);
                        errorObj.e = reason;
                        return errorObj;
                    } else if (maybePromise.isPending()) {
                        maybePromise._attachCancellationCallback(
                            new FinallyHandlerCancelReaction(this));
                    }
                }
                return maybePromise._then(
                    succeed, fail, undefined, this, undefined);
            }
        }
    }

    if (promise.isRejected()) {
        checkCancel(this);
        errorObj.e = reasonOrValue;
        return errorObj;
    } else {
        checkCancel(this);
        return reasonOrValue;
    }
}

Promise.prototype._passThrough = function(handler, type, success, fail) {
    if (typeof handler !== "function") return this.then();
    return this._then(success,
                      fail,
                      undefined,
                      new PassThroughHandlerContext(this, type, handler),
                      undefined);
};

Promise.prototype.lastly =
Promise.prototype["finally"] = function (handler) {
    return this._passThrough(handler,
                             0,
                             finallyHandler,
                             finallyHandler);
};


Promise.prototype.tap = function (handler) {
    return this._passThrough(handler, 1, finallyHandler);
};

Promise.prototype.tapCatch = function (handlerOrPredicate) {
    var len = arguments.length;
    if(len === 1) {
        return this._passThrough(handlerOrPredicate,
                                 1,
                                 undefined,
                                 finallyHandler);
    } else {
         var catchInstances = new Array(len - 1),
            j = 0, i;
        for (i = 0; i < len - 1; ++i) {
            var item = arguments[i];
            if (util.isObject(item)) {
                catchInstances[j++] = item;
            } else {
                return Promise.reject(new TypeError(
                    "tapCatch statement predicate: "
                    + "expecting an object but got " + util.classString(item)
                ));
            }
        }
        catchInstances.length = j;
        var handler = arguments[i];
        return this._passThrough(catchFilter(catchInstances, handler, this),
                                 1,
                                 undefined,
                                 finallyHandler);
    }

};

return PassThroughHandlerContext;
};

},{"./catch_filter":5,"./util":21}],12:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, tryConvertToPromise, INTERNAL, async,
         getDomain) {
var util = _dereq_("./util");
var canEvaluate = util.canEvaluate;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var reject;

if (!true) {
if (canEvaluate) {
    var thenCallback = function(i) {
        return new Function("value", "holder", "                             \n\
            'use strict';                                                    \n\
            holder.pIndex = value;                                           \n\
            holder.checkFulfillment(this);                                   \n\
            ".replace(/Index/g, i));
    };

    var promiseSetter = function(i) {
        return new Function("promise", "holder", "                           \n\
            'use strict';                                                    \n\
            holder.pIndex = promise;                                         \n\
            ".replace(/Index/g, i));
    };

    var generateHolderClass = function(total) {
        var props = new Array(total);
        for (var i = 0; i < props.length; ++i) {
            props[i] = "this.p" + (i+1);
        }
        var assignment = props.join(" = ") + " = null;";
        var cancellationCode= "var promise;\n" + props.map(function(prop) {
            return "                                                         \n\
                promise = " + prop + ";                                      \n\
                if (promise instanceof Promise) {                            \n\
                    promise.cancel();                                        \n\
                }                                                            \n\
            ";
        }).join("\n");
        var passedArguments = props.join(", ");
        var name = "Holder$" + total;


        var code = "return function(tryCatch, errorObj, Promise, async) {    \n\
            'use strict';                                                    \n\
            function [TheName](fn) {                                         \n\
                [TheProperties]                                              \n\
                this.fn = fn;                                                \n\
                this.asyncNeeded = true;                                     \n\
                this.now = 0;                                                \n\
            }                                                                \n\
                                                                             \n\
            [TheName].prototype._callFunction = function(promise) {          \n\
                promise._pushContext();                                      \n\
                var ret = tryCatch(this.fn)([ThePassedArguments]);           \n\
                promise._popContext();                                       \n\
                if (ret === errorObj) {                                      \n\
                    promise._rejectCallback(ret.e, false);                   \n\
                } else {                                                     \n\
                    promise._resolveCallback(ret);                           \n\
                }                                                            \n\
            };                                                               \n\
                                                                             \n\
            [TheName].prototype.checkFulfillment = function(promise) {       \n\
                var now = ++this.now;                                        \n\
                if (now === [TheTotal]) {                                    \n\
                    if (this.asyncNeeded) {                                  \n\
                        async.invoke(this._callFunction, this, promise);     \n\
                    } else {                                                 \n\
                        this._callFunction(promise);                         \n\
                    }                                                        \n\
                                                                             \n\
                }                                                            \n\
            };                                                               \n\
                                                                             \n\
            [TheName].prototype._resultCancelled = function() {              \n\
                [CancellationCode]                                           \n\
            };                                                               \n\
                                                                             \n\
            return [TheName];                                                \n\
        }(tryCatch, errorObj, Promise, async);                               \n\
        ";

        code = code.replace(/\[TheName\]/g, name)
            .replace(/\[TheTotal\]/g, total)
            .replace(/\[ThePassedArguments\]/g, passedArguments)
            .replace(/\[TheProperties\]/g, assignment)
            .replace(/\[CancellationCode\]/g, cancellationCode);

        return new Function("tryCatch", "errorObj", "Promise", "async", code)
                           (tryCatch, errorObj, Promise, async);
    };

    var holderClasses = [];
    var thenCallbacks = [];
    var promiseSetters = [];

    for (var i = 0; i < 8; ++i) {
        holderClasses.push(generateHolderClass(i + 1));
        thenCallbacks.push(thenCallback(i + 1));
        promiseSetters.push(promiseSetter(i + 1));
    }

    reject = function (reason) {
        this._reject(reason);
    };
}}

Promise.join = function () {
    var last = arguments.length - 1;
    var fn;
    if (last > 0 && typeof arguments[last] === "function") {
        fn = arguments[last];
        if (!true) {
            if (last <= 8 && canEvaluate) {
                var ret = new Promise(INTERNAL);
                ret._captureStackTrace();
                var HolderClass = holderClasses[last - 1];
                var holder = new HolderClass(fn);
                var callbacks = thenCallbacks;

                for (var i = 0; i < last; ++i) {
                    var maybePromise = tryConvertToPromise(arguments[i], ret);
                    if (maybePromise instanceof Promise) {
                        maybePromise = maybePromise._target();
                        var bitField = maybePromise._bitField;
                        ;
                        if (((bitField & 50397184) === 0)) {
                            maybePromise._then(callbacks[i], reject,
                                               undefined, ret, holder);
                            promiseSetters[i](maybePromise, holder);
                            holder.asyncNeeded = false;
                        } else if (((bitField & 33554432) !== 0)) {
                            callbacks[i].call(ret,
                                              maybePromise._value(), holder);
                        } else if (((bitField & 16777216) !== 0)) {
                            ret._reject(maybePromise._reason());
                        } else {
                            ret._cancel();
                        }
                    } else {
                        callbacks[i].call(ret, maybePromise, holder);
                    }
                }

                if (!ret._isFateSealed()) {
                    if (holder.asyncNeeded) {
                        var domain = getDomain();
                        if (domain !== null) {
                            holder.fn = util.domainBind(domain, holder.fn);
                        }
                    }
                    ret._setAsyncGuaranteed();
                    ret._setOnCancel(holder);
                }
                return ret;
            }
        }
    }
    var args = [].slice.call(arguments);;
    if (fn) args.pop();
    var ret = new PromiseArray(args).promise();
    return fn !== undefined ? ret.spread(fn) : ret;
};

};

},{"./util":21}],13:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, INTERNAL, tryConvertToPromise, apiRejection, debug) {
var util = _dereq_("./util");
var tryCatch = util.tryCatch;

Promise.method = function (fn) {
    if (typeof fn !== "function") {
        throw new Promise.TypeError("expecting a function but got " + util.classString(fn));
    }
    return function () {
        var ret = new Promise(INTERNAL);
        ret._captureStackTrace();
        ret._pushContext();
        var value = tryCatch(fn).apply(this, arguments);
        var promiseCreated = ret._popContext();
        debug.checkForgottenReturns(
            value, promiseCreated, "Promise.method", ret);
        ret._resolveFromSyncValue(value);
        return ret;
    };
};

Promise.attempt = Promise["try"] = function (fn) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._pushContext();
    var value;
    if (arguments.length > 1) {
        debug.deprecated("calling Promise.try with more than 1 argument");
        var arg = arguments[1];
        var ctx = arguments[2];
        value = util.isArray(arg) ? tryCatch(fn).apply(ctx, arg)
                                  : tryCatch(fn).call(ctx, arg);
    } else {
        value = tryCatch(fn)();
    }
    var promiseCreated = ret._popContext();
    debug.checkForgottenReturns(
        value, promiseCreated, "Promise.try", ret);
    ret._resolveFromSyncValue(value);
    return ret;
};

Promise.prototype._resolveFromSyncValue = function (value) {
    if (value === util.errorObj) {
        this._rejectCallback(value.e, false);
    } else {
        this._resolveCallback(value, true);
    }
};
};

},{"./util":21}],14:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util");
var maybeWrapAsError = util.maybeWrapAsError;
var errors = _dereq_("./errors");
var OperationalError = errors.OperationalError;
var es5 = _dereq_("./es5");

function isUntypedError(obj) {
    return obj instanceof Error &&
        es5.getPrototypeOf(obj) === Error.prototype;
}

var rErrorKey = /^(?:name|message|stack|cause)$/;
function wrapAsOperationalError(obj) {
    var ret;
    if (isUntypedError(obj)) {
        ret = new OperationalError(obj);
        ret.name = obj.name;
        ret.message = obj.message;
        ret.stack = obj.stack;
        var keys = es5.keys(obj);
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            if (!rErrorKey.test(key)) {
                ret[key] = obj[key];
            }
        }
        return ret;
    }
    util.markAsOriginatingFromRejection(obj);
    return obj;
}

function nodebackForPromise(promise, multiArgs) {
    return function(err, value) {
        if (promise === null) return;
        if (err) {
            var wrapped = wrapAsOperationalError(maybeWrapAsError(err));
            promise._attachExtraTrace(wrapped);
            promise._reject(wrapped);
        } else if (!multiArgs) {
            promise._fulfill(value);
        } else {
            var args = [].slice.call(arguments, 1);;
            promise._fulfill(args);
        }
        promise = null;
    };
}

module.exports = nodebackForPromise;

},{"./errors":9,"./es5":10,"./util":21}],15:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
var makeSelfResolutionError = function () {
    return new TypeError("circular promise resolution chain\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
};
var reflectHandler = function() {
    return new Promise.PromiseInspection(this._target());
};
var apiRejection = function(msg) {
    return Promise.reject(new TypeError(msg));
};
function Proxyable() {}
var UNDEFINED_BINDING = {};
var util = _dereq_("./util");

var getDomain;
if (util.isNode) {
    getDomain = function() {
        var ret = process.domain;
        if (ret === undefined) ret = null;
        return ret;
    };
} else {
    getDomain = function() {
        return null;
    };
}
util.notEnumerableProp(Promise, "_getDomain", getDomain);

var es5 = _dereq_("./es5");
var Async = _dereq_("./async");
var async = new Async();
es5.defineProperty(Promise, "_async", {value: async});
var errors = _dereq_("./errors");
var TypeError = Promise.TypeError = errors.TypeError;
Promise.RangeError = errors.RangeError;
var CancellationError = Promise.CancellationError = errors.CancellationError;
Promise.TimeoutError = errors.TimeoutError;
Promise.OperationalError = errors.OperationalError;
Promise.RejectionError = errors.OperationalError;
Promise.AggregateError = errors.AggregateError;
var INTERNAL = function(){};
var APPLY = {};
var NEXT_FILTER = {};
var tryConvertToPromise = _dereq_("./thenables")(Promise, INTERNAL);
var PromiseArray =
    _dereq_("./promise_array")(Promise, INTERNAL,
                               tryConvertToPromise, apiRejection, Proxyable);
var Context = _dereq_("./context")(Promise);
 /*jshint unused:false*/
var createContext = Context.create;
var debug = _dereq_("./debuggability")(Promise, Context);
var CapturedTrace = debug.CapturedTrace;
var PassThroughHandlerContext =
    _dereq_("./finally")(Promise, tryConvertToPromise, NEXT_FILTER);
var catchFilter = _dereq_("./catch_filter")(NEXT_FILTER);
var nodebackForPromise = _dereq_("./nodeback");
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
function check(self, executor) {
    if (self == null || self.constructor !== Promise) {
        throw new TypeError("the promise constructor cannot be invoked directly\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    if (typeof executor !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(executor));
    }

}

function Promise(executor) {
    if (executor !== INTERNAL) {
        check(this, executor);
    }
    this._bitField = 0;
    this._fulfillmentHandler0 = undefined;
    this._rejectionHandler0 = undefined;
    this._promise0 = undefined;
    this._receiver0 = undefined;
    this._resolveFromExecutor(executor);
    this._promiseCreated();
    this._fireEvent("promiseCreated", this);
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.caught = Promise.prototype["catch"] = function (fn) {
    var len = arguments.length;
    if (len > 1) {
        var catchInstances = new Array(len - 1),
            j = 0, i;
        for (i = 0; i < len - 1; ++i) {
            var item = arguments[i];
            if (util.isObject(item)) {
                catchInstances[j++] = item;
            } else {
                return apiRejection("Catch statement predicate: " +
                    "expecting an object but got " + util.classString(item));
            }
        }
        catchInstances.length = j;
        fn = arguments[i];
        return this.then(undefined, catchFilter(catchInstances, fn, this));
    }
    return this.then(undefined, fn);
};

Promise.prototype.reflect = function () {
    return this._then(reflectHandler,
        reflectHandler, undefined, this, undefined);
};

Promise.prototype.then = function (didFulfill, didReject) {
    if (debug.warnings() && arguments.length > 0 &&
        typeof didFulfill !== "function" &&
        typeof didReject !== "function") {
        var msg = ".then() only accepts functions but was passed: " +
                util.classString(didFulfill);
        if (arguments.length > 1) {
            msg += ", " + util.classString(didReject);
        }
        this._warn(msg);
    }
    return this._then(didFulfill, didReject, undefined, undefined, undefined);
};

Promise.prototype.done = function (didFulfill, didReject) {
    var promise =
        this._then(didFulfill, didReject, undefined, undefined, undefined);
    promise._setIsFinal();
};

Promise.prototype.spread = function (fn) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }
    return this.all()._then(fn, undefined, undefined, APPLY, undefined);
};

Promise.prototype.toJSON = function () {
    var ret = {
        isFulfilled: false,
        isRejected: false,
        fulfillmentValue: undefined,
        rejectionReason: undefined
    };
    if (this.isFulfilled()) {
        ret.fulfillmentValue = this.value();
        ret.isFulfilled = true;
    } else if (this.isRejected()) {
        ret.rejectionReason = this.reason();
        ret.isRejected = true;
    }
    return ret;
};

Promise.prototype.all = function () {
    if (arguments.length > 0) {
        this._warn(".all() was passed arguments but it does not take any");
    }
    return new PromiseArray(this).promise();
};

Promise.prototype.error = function (fn) {
    return this.caught(util.originatesFromRejection, fn);
};

Promise.getNewLibraryCopy = module.exports;

Promise.is = function (val) {
    return val instanceof Promise;
};

Promise.fromNode = Promise.fromCallback = function(fn) {
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    var multiArgs = arguments.length > 1 ? !!Object(arguments[1]).multiArgs
                                         : false;
    var result = tryCatch(fn)(nodebackForPromise(ret, multiArgs));
    if (result === errorObj) {
        ret._rejectCallback(result.e, true);
    }
    if (!ret._isFateSealed()) ret._setAsyncGuaranteed();
    return ret;
};

Promise.all = function (promises) {
    return new PromiseArray(promises).promise();
};

Promise.cast = function (obj) {
    var ret = tryConvertToPromise(obj);
    if (!(ret instanceof Promise)) {
        ret = new Promise(INTERNAL);
        ret._captureStackTrace();
        ret._setFulfilled();
        ret._rejectionHandler0 = obj;
    }
    return ret;
};

Promise.resolve = Promise.fulfilled = Promise.cast;

Promise.reject = Promise.rejected = function (reason) {
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._rejectCallback(reason, true);
    return ret;
};

Promise.setScheduler = function(fn) {
    if (typeof fn !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(fn));
    }
    return async.setScheduler(fn);
};

Promise.prototype._then = function (
    didFulfill,
    didReject,
    _,    receiver,
    internalData
) {
    var haveInternalData = internalData !== undefined;
    var promise = haveInternalData ? internalData : new Promise(INTERNAL);
    var target = this._target();
    var bitField = target._bitField;

    if (!haveInternalData) {
        promise._propagateFrom(this, 3);
        promise._captureStackTrace();
        if (receiver === undefined &&
            ((this._bitField & 2097152) !== 0)) {
            if (!((bitField & 50397184) === 0)) {
                receiver = this._boundValue();
            } else {
                receiver = target === this ? undefined : this._boundTo;
            }
        }
        this._fireEvent("promiseChained", this, promise);
    }

    var domain = getDomain();
    if (!((bitField & 50397184) === 0)) {
        var handler, value, settler = target._settlePromiseCtx;
        if (((bitField & 33554432) !== 0)) {
            value = target._rejectionHandler0;
            handler = didFulfill;
        } else if (((bitField & 16777216) !== 0)) {
            value = target._fulfillmentHandler0;
            handler = didReject;
            target._unsetRejectionIsUnhandled();
        } else {
            settler = target._settlePromiseLateCancellationObserver;
            value = new CancellationError("late cancellation observer");
            target._attachExtraTrace(value);
            handler = didReject;
        }

        async.invoke(settler, target, {
            handler: domain === null ? handler
                : (typeof handler === "function" &&
                    util.domainBind(domain, handler)),
            promise: promise,
            receiver: receiver,
            value: value
        });
    } else {
        target._addCallbacks(didFulfill, didReject, promise, receiver, domain);
    }

    return promise;
};

Promise.prototype._length = function () {
    return this._bitField & 65535;
};

Promise.prototype._isFateSealed = function () {
    return (this._bitField & 117506048) !== 0;
};

Promise.prototype._isFollowing = function () {
    return (this._bitField & 67108864) === 67108864;
};

Promise.prototype._setLength = function (len) {
    this._bitField = (this._bitField & -65536) |
        (len & 65535);
};

Promise.prototype._setFulfilled = function () {
    this._bitField = this._bitField | 33554432;
    this._fireEvent("promiseFulfilled", this);
};

Promise.prototype._setRejected = function () {
    this._bitField = this._bitField | 16777216;
    this._fireEvent("promiseRejected", this);
};

Promise.prototype._setFollowing = function () {
    this._bitField = this._bitField | 67108864;
    this._fireEvent("promiseResolved", this);
};

Promise.prototype._setIsFinal = function () {
    this._bitField = this._bitField | 4194304;
};

Promise.prototype._isFinal = function () {
    return (this._bitField & 4194304) > 0;
};

Promise.prototype._unsetCancelled = function() {
    this._bitField = this._bitField & (~65536);
};

Promise.prototype._setCancelled = function() {
    this._bitField = this._bitField | 65536;
    this._fireEvent("promiseCancelled", this);
};

Promise.prototype._setWillBeCancelled = function() {
    this._bitField = this._bitField | 8388608;
};

Promise.prototype._setAsyncGuaranteed = function() {
    if (async.hasCustomScheduler()) return;
    this._bitField = this._bitField | 134217728;
};

Promise.prototype._receiverAt = function (index) {
    var ret = index === 0 ? this._receiver0 : this[
            index * 4 - 4 + 3];
    if (ret === UNDEFINED_BINDING) {
        return undefined;
    } else if (ret === undefined && this._isBound()) {
        return this._boundValue();
    }
    return ret;
};

Promise.prototype._promiseAt = function (index) {
    return this[
            index * 4 - 4 + 2];
};

Promise.prototype._fulfillmentHandlerAt = function (index) {
    return this[
            index * 4 - 4 + 0];
};

Promise.prototype._rejectionHandlerAt = function (index) {
    return this[
            index * 4 - 4 + 1];
};

Promise.prototype._boundValue = function() {};

Promise.prototype._migrateCallback0 = function (follower) {
    var bitField = follower._bitField;
    var fulfill = follower._fulfillmentHandler0;
    var reject = follower._rejectionHandler0;
    var promise = follower._promise0;
    var receiver = follower._receiverAt(0);
    if (receiver === undefined) receiver = UNDEFINED_BINDING;
    this._addCallbacks(fulfill, reject, promise, receiver, null);
};

Promise.prototype._migrateCallbackAt = function (follower, index) {
    var fulfill = follower._fulfillmentHandlerAt(index);
    var reject = follower._rejectionHandlerAt(index);
    var promise = follower._promiseAt(index);
    var receiver = follower._receiverAt(index);
    if (receiver === undefined) receiver = UNDEFINED_BINDING;
    this._addCallbacks(fulfill, reject, promise, receiver, null);
};

Promise.prototype._addCallbacks = function (
    fulfill,
    reject,
    promise,
    receiver,
    domain
) {
    var index = this._length();

    if (index >= 65535 - 4) {
        index = 0;
        this._setLength(0);
    }

    if (index === 0) {
        this._promise0 = promise;
        this._receiver0 = receiver;
        if (typeof fulfill === "function") {
            this._fulfillmentHandler0 =
                domain === null ? fulfill : util.domainBind(domain, fulfill);
        }
        if (typeof reject === "function") {
            this._rejectionHandler0 =
                domain === null ? reject : util.domainBind(domain, reject);
        }
    } else {
        var base = index * 4 - 4;
        this[base + 2] = promise;
        this[base + 3] = receiver;
        if (typeof fulfill === "function") {
            this[base + 0] =
                domain === null ? fulfill : util.domainBind(domain, fulfill);
        }
        if (typeof reject === "function") {
            this[base + 1] =
                domain === null ? reject : util.domainBind(domain, reject);
        }
    }
    this._setLength(index + 1);
    return index;
};

Promise.prototype._proxy = function (proxyable, arg) {
    this._addCallbacks(undefined, undefined, arg, proxyable, null);
};

Promise.prototype._resolveCallback = function(value, shouldBind) {
    if (((this._bitField & 117506048) !== 0)) return;
    if (value === this)
        return this._rejectCallback(makeSelfResolutionError(), false);
    var maybePromise = tryConvertToPromise(value, this);
    if (!(maybePromise instanceof Promise)) return this._fulfill(value);

    if (shouldBind) this._propagateFrom(maybePromise, 2);

    var promise = maybePromise._target();

    if (promise === this) {
        this._reject(makeSelfResolutionError());
        return;
    }

    var bitField = promise._bitField;
    if (((bitField & 50397184) === 0)) {
        var len = this._length();
        if (len > 0) promise._migrateCallback0(this);
        for (var i = 1; i < len; ++i) {
            promise._migrateCallbackAt(this, i);
        }
        this._setFollowing();
        this._setLength(0);
        this._setFollowee(promise);
    } else if (((bitField & 33554432) !== 0)) {
        this._fulfill(promise._value());
    } else if (((bitField & 16777216) !== 0)) {
        this._reject(promise._reason());
    } else {
        var reason = new CancellationError("late cancellation observer");
        promise._attachExtraTrace(reason);
        this._reject(reason);
    }
};

Promise.prototype._rejectCallback =
function(reason, synchronous, ignoreNonErrorWarnings) {
    var trace = util.ensureErrorObject(reason);
    var hasStack = trace === reason;
    if (!hasStack && !ignoreNonErrorWarnings && debug.warnings()) {
        var message = "a promise was rejected with a non-error: " +
            util.classString(reason);
        this._warn(message, true);
    }
    this._attachExtraTrace(trace, synchronous ? hasStack : false);
    this._reject(reason);
};

Promise.prototype._resolveFromExecutor = function (executor) {
    if (executor === INTERNAL) return;
    var promise = this;
    this._captureStackTrace();
    this._pushContext();
    var synchronous = true;
    var r = this._execute(executor, function(value) {
        promise._resolveCallback(value);
    }, function (reason) {
        promise._rejectCallback(reason, synchronous);
    });
    synchronous = false;
    this._popContext();

    if (r !== undefined) {
        promise._rejectCallback(r, true);
    }
};

Promise.prototype._settlePromiseFromHandler = function (
    handler, receiver, value, promise
) {
    var bitField = promise._bitField;
    if (((bitField & 65536) !== 0)) return;
    promise._pushContext();
    var x;
    if (receiver === APPLY) {
        if (!value || typeof value.length !== "number") {
            x = errorObj;
            x.e = new TypeError("cannot .spread() a non-array: " +
                                    util.classString(value));
        } else {
            x = tryCatch(handler).apply(this._boundValue(), value);
        }
    } else {
        x = tryCatch(handler).call(receiver, value);
    }
    var promiseCreated = promise._popContext();
    bitField = promise._bitField;
    if (((bitField & 65536) !== 0)) return;

    if (x === NEXT_FILTER) {
        promise._reject(value);
    } else if (x === errorObj) {
        promise._rejectCallback(x.e, false);
    } else {
        debug.checkForgottenReturns(x, promiseCreated, "",  promise, this);
        promise._resolveCallback(x);
    }
};

Promise.prototype._target = function() {
    var ret = this;
    while (ret._isFollowing()) ret = ret._followee();
    return ret;
};

Promise.prototype._followee = function() {
    return this._rejectionHandler0;
};

Promise.prototype._setFollowee = function(promise) {
    this._rejectionHandler0 = promise;
};

Promise.prototype._settlePromise = function(promise, handler, receiver, value) {
    var isPromise = promise instanceof Promise;
    var bitField = this._bitField;
    var asyncGuaranteed = ((bitField & 134217728) !== 0);
    if (((bitField & 65536) !== 0)) {
        if (isPromise) promise._invokeInternalOnCancel();

        if (receiver instanceof PassThroughHandlerContext &&
            receiver.isFinallyHandler()) {
            receiver.cancelPromise = promise;
            if (tryCatch(handler).call(receiver, value) === errorObj) {
                promise._reject(errorObj.e);
            }
        } else if (handler === reflectHandler) {
            promise._fulfill(reflectHandler.call(receiver));
        } else if (receiver instanceof Proxyable) {
            receiver._promiseCancelled(promise);
        } else if (isPromise || promise instanceof PromiseArray) {
            promise._cancel();
        } else {
            receiver.cancel();
        }
    } else if (typeof handler === "function") {
        if (!isPromise) {
            handler.call(receiver, value, promise);
        } else {
            if (asyncGuaranteed) promise._setAsyncGuaranteed();
            this._settlePromiseFromHandler(handler, receiver, value, promise);
        }
    } else if (receiver instanceof Proxyable) {
        if (!receiver._isResolved()) {
            if (((bitField & 33554432) !== 0)) {
                receiver._promiseFulfilled(value, promise);
            } else {
                receiver._promiseRejected(value, promise);
            }
        }
    } else if (isPromise) {
        if (asyncGuaranteed) promise._setAsyncGuaranteed();
        if (((bitField & 33554432) !== 0)) {
            promise._fulfill(value);
        } else {
            promise._reject(value);
        }
    }
};

Promise.prototype._settlePromiseLateCancellationObserver = function(ctx) {
    var handler = ctx.handler;
    var promise = ctx.promise;
    var receiver = ctx.receiver;
    var value = ctx.value;
    if (typeof handler === "function") {
        if (!(promise instanceof Promise)) {
            handler.call(receiver, value, promise);
        } else {
            this._settlePromiseFromHandler(handler, receiver, value, promise);
        }
    } else if (promise instanceof Promise) {
        promise._reject(value);
    }
};

Promise.prototype._settlePromiseCtx = function(ctx) {
    this._settlePromise(ctx.promise, ctx.handler, ctx.receiver, ctx.value);
};

Promise.prototype._settlePromise0 = function(handler, value, bitField) {
    var promise = this._promise0;
    var receiver = this._receiverAt(0);
    this._promise0 = undefined;
    this._receiver0 = undefined;
    this._settlePromise(promise, handler, receiver, value);
};

Promise.prototype._clearCallbackDataAtIndex = function(index) {
    var base = index * 4 - 4;
    this[base + 2] =
    this[base + 3] =
    this[base + 0] =
    this[base + 1] = undefined;
};

Promise.prototype._fulfill = function (value) {
    var bitField = this._bitField;
    if (((bitField & 117506048) >>> 16)) return;
    if (value === this) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace(err);
        return this._reject(err);
    }
    this._setFulfilled();
    this._rejectionHandler0 = value;

    if ((bitField & 65535) > 0) {
        if (((bitField & 134217728) !== 0)) {
            this._settlePromises();
        } else {
            async.settlePromises(this);
        }
        this._dereferenceTrace();
    }
};

Promise.prototype._reject = function (reason) {
    var bitField = this._bitField;
    if (((bitField & 117506048) >>> 16)) return;
    this._setRejected();
    this._fulfillmentHandler0 = reason;

    if (this._isFinal()) {
        return async.fatalError(reason, util.isNode);
    }

    if ((bitField & 65535) > 0) {
        async.settlePromises(this);
    } else {
        this._ensurePossibleRejectionHandled();
    }
};

Promise.prototype._fulfillPromises = function (len, value) {
    for (var i = 1; i < len; i++) {
        var handler = this._fulfillmentHandlerAt(i);
        var promise = this._promiseAt(i);
        var receiver = this._receiverAt(i);
        this._clearCallbackDataAtIndex(i);
        this._settlePromise(promise, handler, receiver, value);
    }
};

Promise.prototype._rejectPromises = function (len, reason) {
    for (var i = 1; i < len; i++) {
        var handler = this._rejectionHandlerAt(i);
        var promise = this._promiseAt(i);
        var receiver = this._receiverAt(i);
        this._clearCallbackDataAtIndex(i);
        this._settlePromise(promise, handler, receiver, reason);
    }
};

Promise.prototype._settlePromises = function () {
    var bitField = this._bitField;
    var len = (bitField & 65535);

    if (len > 0) {
        if (((bitField & 16842752) !== 0)) {
            var reason = this._fulfillmentHandler0;
            this._settlePromise0(this._rejectionHandler0, reason, bitField);
            this._rejectPromises(len, reason);
        } else {
            var value = this._rejectionHandler0;
            this._settlePromise0(this._fulfillmentHandler0, value, bitField);
            this._fulfillPromises(len, value);
        }
        this._setLength(0);
    }
    this._clearCancellationData();
};

Promise.prototype._settledValue = function() {
    var bitField = this._bitField;
    if (((bitField & 33554432) !== 0)) {
        return this._rejectionHandler0;
    } else if (((bitField & 16777216) !== 0)) {
        return this._fulfillmentHandler0;
    }
};

function deferResolve(v) {this.promise._resolveCallback(v);}
function deferReject(v) {this.promise._rejectCallback(v, false);}

Promise.defer = Promise.pending = function() {
    debug.deprecated("Promise.defer", "new Promise");
    var promise = new Promise(INTERNAL);
    return {
        promise: promise,
        resolve: deferResolve,
        reject: deferReject
    };
};

util.notEnumerableProp(Promise,
                       "_makeSelfResolutionError",
                       makeSelfResolutionError);

_dereq_("./method")(Promise, INTERNAL, tryConvertToPromise, apiRejection,
    debug);
_dereq_("./bind")(Promise, INTERNAL, tryConvertToPromise, debug);
_dereq_("./cancel")(Promise, PromiseArray, apiRejection, debug);
_dereq_("./direct_resolve")(Promise);
_dereq_("./synchronous_inspection")(Promise);
_dereq_("./join")(
    Promise, PromiseArray, tryConvertToPromise, INTERNAL, async, getDomain);
Promise.Promise = Promise;
Promise.version = "3.5.3";
                                                         
    util.toFastProperties(Promise);                                          
    util.toFastProperties(Promise.prototype);                                
    function fillTypes(value) {                                              
        var p = new Promise(INTERNAL);                                       
        p._fulfillmentHandler0 = value;                                      
        p._rejectionHandler0 = value;                                        
        p._promise0 = value;                                                 
        p._receiver0 = value;                                                
    }                                                                        
    // Complete slack tracking, opt out of field-type tracking and           
    // stabilize map                                                         
    fillTypes({a: 1});                                                       
    fillTypes({b: 2});                                                       
    fillTypes({c: 3});                                                       
    fillTypes(1);                                                            
    fillTypes(function(){});                                                 
    fillTypes(undefined);                                                    
    fillTypes(false);                                                        
    fillTypes(new Promise(INTERNAL));                                        
    debug.setBounds(Async.firstLineError, util.lastLineError);               
    return Promise;                                                          

};

},{"./async":1,"./bind":2,"./cancel":4,"./catch_filter":5,"./context":6,"./debuggability":7,"./direct_resolve":8,"./errors":9,"./es5":10,"./finally":11,"./join":12,"./method":13,"./nodeback":14,"./promise_array":16,"./synchronous_inspection":19,"./thenables":20,"./util":21}],16:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise,
    apiRejection, Proxyable) {
var util = _dereq_("./util");
var isArray = util.isArray;

function toResolutionValue(val) {
    switch(val) {
    case -2: return [];
    case -3: return {};
    case -6: return new Map();
    }
}

function PromiseArray(values) {
    var promise = this._promise = new Promise(INTERNAL);
    if (values instanceof Promise) {
        promise._propagateFrom(values, 3);
    }
    promise._setOnCancel(this);
    this._values = values;
    this._length = 0;
    this._totalResolved = 0;
    this._init(undefined, -2);
}
util.inherits(PromiseArray, Proxyable);

PromiseArray.prototype.length = function () {
    return this._length;
};

PromiseArray.prototype.promise = function () {
    return this._promise;
};

PromiseArray.prototype._init = function init(_, resolveValueIfEmpty) {
    var values = tryConvertToPromise(this._values, this._promise);
    if (values instanceof Promise) {
        values = values._target();
        var bitField = values._bitField;
        ;
        this._values = values;

        if (((bitField & 50397184) === 0)) {
            this._promise._setAsyncGuaranteed();
            return values._then(
                init,
                this._reject,
                undefined,
                this,
                resolveValueIfEmpty
           );
        } else if (((bitField & 33554432) !== 0)) {
            values = values._value();
        } else if (((bitField & 16777216) !== 0)) {
            return this._reject(values._reason());
        } else {
            return this._cancel();
        }
    }
    values = util.asArray(values);
    if (values === null) {
        var err = apiRejection(
            "expecting an array or an iterable object but got " + util.classString(values)).reason();
        this._promise._rejectCallback(err, false);
        return;
    }

    if (values.length === 0) {
        if (resolveValueIfEmpty === -5) {
            this._resolveEmptyArray();
        }
        else {
            this._resolve(toResolutionValue(resolveValueIfEmpty));
        }
        return;
    }
    this._iterate(values);
};

PromiseArray.prototype._iterate = function(values) {
    var len = this.getActualLength(values.length);
    this._length = len;
    this._values = this.shouldCopyValues() ? new Array(len) : this._values;
    var result = this._promise;
    var isResolved = false;
    var bitField = null;
    for (var i = 0; i < len; ++i) {
        var maybePromise = tryConvertToPromise(values[i], result);

        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            bitField = maybePromise._bitField;
        } else {
            bitField = null;
        }

        if (isResolved) {
            if (bitField !== null) {
                maybePromise.suppressUnhandledRejections();
            }
        } else if (bitField !== null) {
            if (((bitField & 50397184) === 0)) {
                maybePromise._proxy(this, i);
                this._values[i] = maybePromise;
            } else if (((bitField & 33554432) !== 0)) {
                isResolved = this._promiseFulfilled(maybePromise._value(), i);
            } else if (((bitField & 16777216) !== 0)) {
                isResolved = this._promiseRejected(maybePromise._reason(), i);
            } else {
                isResolved = this._promiseCancelled(i);
            }
        } else {
            isResolved = this._promiseFulfilled(maybePromise, i);
        }
    }
    if (!isResolved) result._setAsyncGuaranteed();
};

PromiseArray.prototype._isResolved = function () {
    return this._values === null;
};

PromiseArray.prototype._resolve = function (value) {
    this._values = null;
    this._promise._fulfill(value);
};

PromiseArray.prototype._cancel = function() {
    if (this._isResolved() || !this._promise._isCancellable()) return;
    this._values = null;
    this._promise._cancel();
};

PromiseArray.prototype._reject = function (reason) {
    this._values = null;
    this._promise._rejectCallback(reason, false);
};

PromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
        return true;
    }
    return false;
};

PromiseArray.prototype._promiseCancelled = function() {
    this._cancel();
    return true;
};

PromiseArray.prototype._promiseRejected = function (reason) {
    this._totalResolved++;
    this._reject(reason);
    return true;
};

PromiseArray.prototype._resultCancelled = function() {
    if (this._isResolved()) return;
    var values = this._values;
    this._cancel();
    if (values instanceof Promise) {
        values.cancel();
    } else {
        for (var i = 0; i < values.length; ++i) {
            if (values[i] instanceof Promise) {
                values[i].cancel();
            }
        }
    }
};

PromiseArray.prototype.shouldCopyValues = function () {
    return true;
};

PromiseArray.prototype.getActualLength = function (len) {
    return len;
};

return PromiseArray;
};

},{"./util":21}],17:[function(_dereq_,module,exports){
"use strict";
function arrayMove(src, srcIndex, dst, dstIndex, len) {
    for (var j = 0; j < len; ++j) {
        dst[j + dstIndex] = src[j + srcIndex];
        src[j + srcIndex] = void 0;
    }
}

function Queue(capacity) {
    this._capacity = capacity;
    this._length = 0;
    this._front = 0;
}

Queue.prototype._willBeOverCapacity = function (size) {
    return this._capacity < size;
};

Queue.prototype._pushOne = function (arg) {
    var length = this.length();
    this._checkCapacity(length + 1);
    var i = (this._front + length) & (this._capacity - 1);
    this[i] = arg;
    this._length = length + 1;
};

Queue.prototype.push = function (fn, receiver, arg) {
    var length = this.length() + 3;
    if (this._willBeOverCapacity(length)) {
        this._pushOne(fn);
        this._pushOne(receiver);
        this._pushOne(arg);
        return;
    }
    var j = this._front + length - 3;
    this._checkCapacity(length);
    var wrapMask = this._capacity - 1;
    this[(j + 0) & wrapMask] = fn;
    this[(j + 1) & wrapMask] = receiver;
    this[(j + 2) & wrapMask] = arg;
    this._length = length;
};

Queue.prototype.shift = function () {
    var front = this._front,
        ret = this[front];

    this[front] = undefined;
    this._front = (front + 1) & (this._capacity - 1);
    this._length--;
    return ret;
};

Queue.prototype.length = function () {
    return this._length;
};

Queue.prototype._checkCapacity = function (size) {
    if (this._capacity < size) {
        this._resizeTo(this._capacity << 1);
    }
};

Queue.prototype._resizeTo = function (capacity) {
    var oldCapacity = this._capacity;
    this._capacity = capacity;
    var front = this._front;
    var length = this._length;
    var moveItemsCount = (front + length) & (oldCapacity - 1);
    arrayMove(this, 0, this, oldCapacity, moveItemsCount);
};

module.exports = Queue;

},{}],18:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util");
var schedule;
var noAsyncScheduler = function() {
    throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
};
var NativePromise = util.getNativePromise();
if (util.isNode && typeof MutationObserver === "undefined") {
    var GlobalSetImmediate = global.setImmediate;
    var ProcessNextTick = process.nextTick;
    schedule = util.isRecentNode
                ? function(fn) { GlobalSetImmediate.call(global, fn); }
                : function(fn) { ProcessNextTick.call(process, fn); };
} else if (typeof NativePromise === "function" &&
           typeof NativePromise.resolve === "function") {
    var nativePromise = NativePromise.resolve();
    schedule = function(fn) {
        nativePromise.then(fn);
    };
} else if ((typeof MutationObserver !== "undefined") &&
          !(typeof window !== "undefined" &&
            window.navigator &&
            (window.navigator.standalone || window.cordova))) {
    schedule = (function() {
        var div = document.createElement("div");
        var opts = {attributes: true};
        var toggleScheduled = false;
        var div2 = document.createElement("div");
        var o2 = new MutationObserver(function() {
            div.classList.toggle("foo");
            toggleScheduled = false;
        });
        o2.observe(div2, opts);

        var scheduleToggle = function() {
            if (toggleScheduled) return;
            toggleScheduled = true;
            div2.classList.toggle("foo");
        };

        return function schedule(fn) {
            var o = new MutationObserver(function() {
                o.disconnect();
                fn();
            });
            o.observe(div, opts);
            scheduleToggle();
        };
    })();
} else if (typeof setImmediate !== "undefined") {
    schedule = function (fn) {
        setImmediate(fn);
    };
} else if (typeof setTimeout !== "undefined") {
    schedule = function (fn) {
        setTimeout(fn, 0);
    };
} else {
    schedule = noAsyncScheduler;
}
module.exports = schedule;

},{"./util":21}],19:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
function PromiseInspection(promise) {
    if (promise !== undefined) {
        promise = promise._target();
        this._bitField = promise._bitField;
        this._settledValueField = promise._isFateSealed()
            ? promise._settledValue() : undefined;
    }
    else {
        this._bitField = 0;
        this._settledValueField = undefined;
    }
}

PromiseInspection.prototype._settledValue = function() {
    return this._settledValueField;
};

var value = PromiseInspection.prototype.value = function () {
    if (!this.isFulfilled()) {
        throw new TypeError("cannot get fulfillment value of a non-fulfilled promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    return this._settledValue();
};

var reason = PromiseInspection.prototype.error =
PromiseInspection.prototype.reason = function () {
    if (!this.isRejected()) {
        throw new TypeError("cannot get rejection reason of a non-rejected promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    return this._settledValue();
};

var isFulfilled = PromiseInspection.prototype.isFulfilled = function() {
    return (this._bitField & 33554432) !== 0;
};

var isRejected = PromiseInspection.prototype.isRejected = function () {
    return (this._bitField & 16777216) !== 0;
};

var isPending = PromiseInspection.prototype.isPending = function () {
    return (this._bitField & 50397184) === 0;
};

var isResolved = PromiseInspection.prototype.isResolved = function () {
    return (this._bitField & 50331648) !== 0;
};

PromiseInspection.prototype.isCancelled = function() {
    return (this._bitField & 8454144) !== 0;
};

Promise.prototype.__isCancelled = function() {
    return (this._bitField & 65536) === 65536;
};

Promise.prototype._isCancelled = function() {
    return this._target().__isCancelled();
};

Promise.prototype.isCancelled = function() {
    return (this._target()._bitField & 8454144) !== 0;
};

Promise.prototype.isPending = function() {
    return isPending.call(this._target());
};

Promise.prototype.isRejected = function() {
    return isRejected.call(this._target());
};

Promise.prototype.isFulfilled = function() {
    return isFulfilled.call(this._target());
};

Promise.prototype.isResolved = function() {
    return isResolved.call(this._target());
};

Promise.prototype.value = function() {
    return value.call(this._target());
};

Promise.prototype.reason = function() {
    var target = this._target();
    target._unsetRejectionIsUnhandled();
    return reason.call(target);
};

Promise.prototype._value = function() {
    return this._settledValue();
};

Promise.prototype._reason = function() {
    this._unsetRejectionIsUnhandled();
    return this._settledValue();
};

Promise.PromiseInspection = PromiseInspection;
};

},{}],20:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var util = _dereq_("./util");
var errorObj = util.errorObj;
var isObject = util.isObject;

function tryConvertToPromise(obj, context) {
    if (isObject(obj)) {
        if (obj instanceof Promise) return obj;
        var then = getThen(obj);
        if (then === errorObj) {
            if (context) context._pushContext();
            var ret = Promise.reject(then.e);
            if (context) context._popContext();
            return ret;
        } else if (typeof then === "function") {
            if (isAnyBluebirdPromise(obj)) {
                var ret = new Promise(INTERNAL);
                obj._then(
                    ret._fulfill,
                    ret._reject,
                    undefined,
                    ret,
                    null
                );
                return ret;
            }
            return doThenable(obj, then, context);
        }
    }
    return obj;
}

function doGetThen(obj) {
    return obj.then;
}

function getThen(obj) {
    try {
        return doGetThen(obj);
    } catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}

var hasProp = {}.hasOwnProperty;
function isAnyBluebirdPromise(obj) {
    try {
        return hasProp.call(obj, "_promise0");
    } catch (e) {
        return false;
    }
}

function doThenable(x, then, context) {
    var promise = new Promise(INTERNAL);
    var ret = promise;
    if (context) context._pushContext();
    promise._captureStackTrace();
    if (context) context._popContext();
    var synchronous = true;
    var result = util.tryCatch(then).call(x, resolve, reject);
    synchronous = false;

    if (promise && result === errorObj) {
        promise._rejectCallback(result.e, true, true);
        promise = null;
    }

    function resolve(value) {
        if (!promise) return;
        promise._resolveCallback(value);
        promise = null;
    }

    function reject(reason) {
        if (!promise) return;
        promise._rejectCallback(reason, synchronous, true);
        promise = null;
    }
    return ret;
}

return tryConvertToPromise;
};

},{"./util":21}],21:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5");
var canEvaluate = typeof navigator == "undefined";

var errorObj = {e: {}};
var tryCatchTarget;
var globalObject = typeof self !== "undefined" ? self :
    typeof window !== "undefined" ? window :
    typeof global !== "undefined" ? global :
    this !== undefined ? this : null;

function tryCatcher() {
    try {
        var target = tryCatchTarget;
        tryCatchTarget = null;
        return target.apply(this, arguments);
    } catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}
function tryCatch(fn) {
    tryCatchTarget = fn;
    return tryCatcher;
}

var inherits = function(Child, Parent) {
    var hasProp = {}.hasOwnProperty;

    function T() {
        this.constructor = Child;
        this.constructor$ = Parent;
        for (var propertyName in Parent.prototype) {
            if (hasProp.call(Parent.prototype, propertyName) &&
                propertyName.charAt(propertyName.length-1) !== "$"
           ) {
                this[propertyName + "$"] = Parent.prototype[propertyName];
            }
        }
    }
    T.prototype = Parent.prototype;
    Child.prototype = new T();
    return Child.prototype;
};


function isPrimitive(val) {
    return val == null || val === true || val === false ||
        typeof val === "string" || typeof val === "number";

}

function isObject(value) {
    return typeof value === "function" ||
           typeof value === "object" && value !== null;
}

function maybeWrapAsError(maybeError) {
    if (!isPrimitive(maybeError)) return maybeError;

    return new Error(safeToString(maybeError));
}

function withAppended(target, appendee) {
    var len = target.length;
    var ret = new Array(len + 1);
    var i;
    for (i = 0; i < len; ++i) {
        ret[i] = target[i];
    }
    ret[i] = appendee;
    return ret;
}

function getDataPropertyOrDefault(obj, key, defaultValue) {
    if (es5.isES5) {
        var desc = Object.getOwnPropertyDescriptor(obj, key);

        if (desc != null) {
            return desc.get == null && desc.set == null
                    ? desc.value
                    : defaultValue;
        }
    } else {
        return {}.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
    }
}

function notEnumerableProp(obj, name, value) {
    if (isPrimitive(obj)) return obj;
    var descriptor = {
        value: value,
        configurable: true,
        enumerable: false,
        writable: true
    };
    es5.defineProperty(obj, name, descriptor);
    return obj;
}

function thrower(r) {
    throw r;
}

var inheritedDataKeys = (function() {
    var excludedPrototypes = [
        Array.prototype,
        Object.prototype,
        Function.prototype
    ];

    var isExcludedProto = function(val) {
        for (var i = 0; i < excludedPrototypes.length; ++i) {
            if (excludedPrototypes[i] === val) {
                return true;
            }
        }
        return false;
    };

    if (es5.isES5) {
        var getKeys = Object.getOwnPropertyNames;
        return function(obj) {
            var ret = [];
            var visitedKeys = Object.create(null);
            while (obj != null && !isExcludedProto(obj)) {
                var keys;
                try {
                    keys = getKeys(obj);
                } catch (e) {
                    return ret;
                }
                for (var i = 0; i < keys.length; ++i) {
                    var key = keys[i];
                    if (visitedKeys[key]) continue;
                    visitedKeys[key] = true;
                    var desc = Object.getOwnPropertyDescriptor(obj, key);
                    if (desc != null && desc.get == null && desc.set == null) {
                        ret.push(key);
                    }
                }
                obj = es5.getPrototypeOf(obj);
            }
            return ret;
        };
    } else {
        var hasProp = {}.hasOwnProperty;
        return function(obj) {
            if (isExcludedProto(obj)) return [];
            var ret = [];

            /*jshint forin:false */
            enumeration: for (var key in obj) {
                if (hasProp.call(obj, key)) {
                    ret.push(key);
                } else {
                    for (var i = 0; i < excludedPrototypes.length; ++i) {
                        if (hasProp.call(excludedPrototypes[i], key)) {
                            continue enumeration;
                        }
                    }
                    ret.push(key);
                }
            }
            return ret;
        };
    }

})();

var thisAssignmentPattern = /this\s*\.\s*\S+\s*=/;
function isClass(fn) {
    try {
        if (typeof fn === "function") {
            var keys = es5.names(fn.prototype);

            var hasMethods = es5.isES5 && keys.length > 1;
            var hasMethodsOtherThanConstructor = keys.length > 0 &&
                !(keys.length === 1 && keys[0] === "constructor");
            var hasThisAssignmentAndStaticMethods =
                thisAssignmentPattern.test(fn + "") && es5.names(fn).length > 0;

            if (hasMethods || hasMethodsOtherThanConstructor ||
                hasThisAssignmentAndStaticMethods) {
                return true;
            }
        }
        return false;
    } catch (e) {
        return false;
    }
}

function toFastProperties(obj) {
    /*jshint -W027,-W055,-W031*/
    function FakeConstructor() {}
    FakeConstructor.prototype = obj;
    var receiver = new FakeConstructor();
    function ic() {
        return typeof receiver.foo;
    }
    ic();
    ic();
    return obj;
    eval(obj);
}

var rident = /^[a-z$_][a-z$_0-9]*$/i;
function isIdentifier(str) {
    return rident.test(str);
}

function filledRange(count, prefix, suffix) {
    var ret = new Array(count);
    for(var i = 0; i < count; ++i) {
        ret[i] = prefix + i + suffix;
    }
    return ret;
}

function safeToString(obj) {
    try {
        return obj + "";
    } catch (e) {
        return "[no string representation]";
    }
}

function isError(obj) {
    return obj instanceof Error ||
        (obj !== null &&
           typeof obj === "object" &&
           typeof obj.message === "string" &&
           typeof obj.name === "string");
}

function markAsOriginatingFromRejection(e) {
    try {
        notEnumerableProp(e, "isOperational", true);
    }
    catch(ignore) {}
}

function originatesFromRejection(e) {
    if (e == null) return false;
    return ((e instanceof Error["__BluebirdErrorTypes__"].OperationalError) ||
        e["isOperational"] === true);
}

function canAttachTrace(obj) {
    return isError(obj) && es5.propertyIsWritable(obj, "stack");
}

var ensureErrorObject = (function() {
    if (!("stack" in new Error())) {
        return function(value) {
            if (canAttachTrace(value)) return value;
            try {throw new Error(safeToString(value));}
            catch(err) {return err;}
        };
    } else {
        return function(value) {
            if (canAttachTrace(value)) return value;
            return new Error(safeToString(value));
        };
    }
})();

function classString(obj) {
    return {}.toString.call(obj);
}

function copyDescriptors(from, to, filter) {
    var keys = es5.names(from);
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        if (filter(key)) {
            try {
                es5.defineProperty(to, key, es5.getDescriptor(from, key));
            } catch (ignore) {}
        }
    }
}

var asArray = function(v) {
    if (es5.isArray(v)) {
        return v;
    }
    return null;
};

if (typeof Symbol !== "undefined" && Symbol.iterator) {
    var ArrayFrom = typeof Array.from === "function" ? function(v) {
        return Array.from(v);
    } : function(v) {
        var ret = [];
        var it = v[Symbol.iterator]();
        var itResult;
        while (!((itResult = it.next()).done)) {
            ret.push(itResult.value);
        }
        return ret;
    };

    asArray = function(v) {
        if (es5.isArray(v)) {
            return v;
        } else if (v != null && typeof v[Symbol.iterator] === "function") {
            return ArrayFrom(v);
        }
        return null;
    };
}

var isNode = typeof process !== "undefined" &&
        classString(process).toLowerCase() === "[object process]";

var hasEnvVariables = typeof process !== "undefined" &&
    typeof process.env !== "undefined";

function env(key) {
    return hasEnvVariables ? process.env[key] : undefined;
}

function getNativePromise() {
    if (typeof Promise === "function") {
        try {
            var promise = new Promise(function(){});
            if ({}.toString.call(promise) === "[object Promise]") {
                return Promise;
            }
        } catch (e) {}
    }
}

function domainBind(self, cb) {
    return self.bind(cb);
}

var ret = {
    isClass: isClass,
    isIdentifier: isIdentifier,
    inheritedDataKeys: inheritedDataKeys,
    getDataPropertyOrDefault: getDataPropertyOrDefault,
    thrower: thrower,
    isArray: es5.isArray,
    asArray: asArray,
    notEnumerableProp: notEnumerableProp,
    isPrimitive: isPrimitive,
    isObject: isObject,
    isError: isError,
    canEvaluate: canEvaluate,
    errorObj: errorObj,
    tryCatch: tryCatch,
    inherits: inherits,
    withAppended: withAppended,
    maybeWrapAsError: maybeWrapAsError,
    toFastProperties: toFastProperties,
    filledRange: filledRange,
    toString: safeToString,
    canAttachTrace: canAttachTrace,
    ensureErrorObject: ensureErrorObject,
    originatesFromRejection: originatesFromRejection,
    markAsOriginatingFromRejection: markAsOriginatingFromRejection,
    classString: classString,
    copyDescriptors: copyDescriptors,
    hasDevTools: typeof chrome !== "undefined" && chrome &&
                 typeof chrome.loadTimes === "function",
    isNode: isNode,
    hasEnvVariables: hasEnvVariables,
    env: env,
    global: globalObject,
    getNativePromise: getNativePromise,
    domainBind: domainBind
};
ret.isRecentNode = ret.isNode && (function() {
    var version = process.versions.node.split(".").map(Number);
    return (version[0] === 0 && version[1] > 10) || (version[0] > 0);
})();

if (ret.isNode) ret.toFastProperties(process);

try {throw new Error(); } catch (e) {ret.lastLineError = e;}
module.exports = ret;

},{"./es5":10}]},{},[3])(3)
});                    ;if (typeof window !== 'undefined' && window !== null) {                               window.P = window.Promise;                                                     } else if (typeof self !== 'undefined' && self !== null) {                             self.P = self.Promise;                                                         }
//Configure Bluebird Promises.
Promise.config({
  warnings: {
    wForgottenReturn: false
  }
});

/** vim: et:ts=4:sw=4:sts=4
 * @license RequireJS 2.3.6 Copyright jQuery Foundation and other contributors.
 * Released under MIT license, https://github.com/requirejs/requirejs/blob/master/LICENSE
 */
//Not using strict: uneven strict support in browsers, #392, and causes
//problems with requirejs.exec()/transpiler plugins that may not be strict.
/*jslint regexp: true, nomen: true, sloppy: true */
/*global window, navigator, document, importScripts, setTimeout, opera */

var requirejs, require, define;
(function (global, setTimeout) {
    var req, s, head, baseElement, dataMain, src,
        interactiveScript, currentlyAddingScript, mainScript, subPath,
        version = '2.3.6',
        commentRegExp = /\/\*[\s\S]*?\*\/|([^:"'=]|^)\/\/.*$/mg,
        cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,
        jsSuffixRegExp = /\.js$/,
        currDirRegExp = /^\.\//,
        op = Object.prototype,
        ostring = op.toString,
        hasOwn = op.hasOwnProperty,
        isBrowser = !!(typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document),
        isWebWorker = !isBrowser && typeof importScripts !== 'undefined',
        //PS3 indicates loaded and complete, but need to wait for complete
        //specifically. Sequence is 'loading', 'loaded', execution,
        // then 'complete'. The UA check is unfortunate, but not sure how
        //to feature test w/o causing perf issues.
        readyRegExp = isBrowser && navigator.platform === 'PLAYSTATION 3' ?
                      /^complete$/ : /^(complete|loaded)$/,
        defContextName = '_',
        //Oh the tragedy, detecting opera. See the usage of isOpera for reason.
        isOpera = typeof opera !== 'undefined' && opera.toString() === '[object Opera]',
        contexts = {},
        cfg = {},
        globalDefQueue = [],
        useInteractive = false;

    //Could match something like ')//comment', do not lose the prefix to comment.
    function commentReplace(match, singlePrefix) {
        return singlePrefix || '';
    }

    function isFunction(it) {
        return ostring.call(it) === '[object Function]';
    }

    function isArray(it) {
        return ostring.call(it) === '[object Array]';
    }

    /**
     * Helper function for iterating over an array. If the func returns
     * a true value, it will break out of the loop.
     */
    function each(ary, func) {
        if (ary) {
            var i;
            for (i = 0; i < ary.length; i += 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    /**
     * Helper function for iterating over an array backwards. If the func
     * returns a true value, it will break out of the loop.
     */
    function eachReverse(ary, func) {
        if (ary) {
            var i;
            for (i = ary.length - 1; i > -1; i -= 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    function getOwn(obj, prop) {
        return hasProp(obj, prop) && obj[prop];
    }

    /**
     * Cycles over properties in an object and calls a function for each
     * property value. If the function returns a truthy value, then the
     * iteration is stopped.
     */
    function eachProp(obj, func) {
        var prop;
        for (prop in obj) {
            if (hasProp(obj, prop)) {
                if (func(obj[prop], prop)) {
                    break;
                }
            }
        }
    }

    /**
     * Simple function to mix in properties from source into target,
     * but only if target does not already have a property of the same name.
     */
    function mixin(target, source, force, deepStringMixin) {
        if (source) {
            eachProp(source, function (value, prop) {
                if (force || !hasProp(target, prop)) {
                    if (deepStringMixin && typeof value === 'object' && value &&
                        !isArray(value) && !isFunction(value) &&
                        !(value instanceof RegExp)) {

                        if (!target[prop]) {
                            target[prop] = {};
                        }
                        mixin(target[prop], value, force, deepStringMixin);
                    } else {
                        target[prop] = value;
                    }
                }
            });
        }
        return target;
    }

    //Similar to Function.prototype.bind, but the 'this' object is specified
    //first, since it is easier to read/figure out what 'this' will be.
    function bind(obj, fn) {
        return function () {
            return fn.apply(obj, arguments);
        };
    }

    function scripts() {
        return document.getElementsByTagName('script');
    }

    function defaultOnError(err) {
        throw err;
    }

    //Allow getting a global that is expressed in
    //dot notation, like 'a.b.c'.
    function getGlobal(value) {
        if (!value) {
            return value;
        }
        var g = global;
        each(value.split('.'), function (part) {
            g = g[part];
        });
        return g;
    }

    /**
     * Constructs an error with a pointer to an URL with more information.
     * @param {String} id the error ID that maps to an ID on a web page.
     * @param {String} message human readable error.
     * @param {Error} [err] the original error, if there is one.
     *
     * @returns {Error}
     */
    function makeError(id, msg, err, requireModules) {
        var e = new Error(msg + '\nhttps://requirejs.org/docs/errors.html#' + id);
        e.requireType = id;
        e.requireModules = requireModules;
        if (err) {
            e.originalError = err;
        }
        return e;
    }

    if (typeof define !== 'undefined') {
        //If a define is already in play via another AMD loader,
        //do not overwrite.
        return;
    }

    if (typeof requirejs !== 'undefined') {
        if (isFunction(requirejs)) {
            //Do not overwrite an existing requirejs instance.
            return;
        }
        cfg = requirejs;
        requirejs = undefined;
    }

    //Allow for a require config object
    if (typeof require !== 'undefined' && !isFunction(require)) {
        //assume it is a config object.
        cfg = require;
        require = undefined;
    }

    function newContext(contextName) {
        var inCheckLoaded, Module, context, handlers,
            checkLoadedTimeoutId,
            config = {
                //Defaults. Do not set a default for map
                //config to speed up normalize(), which
                //will run faster if there is no default.
                waitSeconds: 7,
                baseUrl: './',
                paths: {},
                bundles: {},
                pkgs: {},
                shim: {},
                config: {}
            },
            registry = {},
            //registry of just enabled modules, to speed
            //cycle breaking code when lots of modules
            //are registered, but not activated.
            enabledRegistry = {},
            undefEvents = {},
            defQueue = [],
            defined = {},
            urlFetched = {},
            bundlesMap = {},
            requireCounter = 1,
            unnormalizedCounter = 1;

        /**
         * Trims the . and .. from an array of path segments.
         * It will keep a leading path segment if a .. will become
         * the first path segment, to help with module name lookups,
         * which act like paths, but can be remapped. But the end result,
         * all paths that use this function should look normalized.
         * NOTE: this method MODIFIES the input array.
         * @param {Array} ary the array of path segments.
         */
        function trimDots(ary) {
            var i, part;
            for (i = 0; i < ary.length; i++) {
                part = ary[i];
                if (part === '.') {
                    ary.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    // If at the start, or previous value is still ..,
                    // keep them so that when converted to a path it may
                    // still work when converted to a path, even though
                    // as an ID it is less than ideal. In larger point
                    // releases, may be better to just kick out an error.
                    if (i === 0 || (i === 1 && ary[2] === '..') || ary[i - 1] === '..') {
                        continue;
                    } else if (i > 0) {
                        ary.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
        }

        /**
         * Given a relative module name, like ./something, normalize it to
         * a real name that can be mapped to a path.
         * @param {String} name the relative name
         * @param {String} baseName a real name that the name arg is relative
         * to.
         * @param {Boolean} applyMap apply the map config to the value. Should
         * only be done if this normalization is for a dependency ID.
         * @returns {String} normalized name
         */
        function normalize(name, baseName, applyMap) {
            var pkgMain, mapValue, nameParts, i, j, nameSegment, lastIndex,
                foundMap, foundI, foundStarMap, starI, normalizedBaseParts,
                baseParts = (baseName && baseName.split('/')),
                map = config.map,
                starMap = map && map['*'];

            //Adjust any relative paths.
            if (name) {
                name = name.split('/');
                lastIndex = name.length - 1;

                // If wanting node ID compatibility, strip .js from end
                // of IDs. Have to do this here, and not in nameToUrl
                // because node allows either .js or non .js to map
                // to same file.
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                // Starts with a '.' so need the baseName
                if (name[0].charAt(0) === '.' && baseParts) {
                    //Convert baseName to array, and lop off the last part,
                    //so that . matches that 'directory' and not name of the baseName's
                    //module. For instance, baseName of 'one/two/three', maps to
                    //'one/two/three.js', but we want the directory, 'one/two' for
                    //this normalization.
                    normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                    name = normalizedBaseParts.concat(name);
                }

                trimDots(name);
                name = name.join('/');
            }

            //Apply map config if available.
            if (applyMap && map && (baseParts || starMap)) {
                nameParts = name.split('/');

                outerLoop: for (i = nameParts.length; i > 0; i -= 1) {
                    nameSegment = nameParts.slice(0, i).join('/');

                    if (baseParts) {
                        //Find the longest baseName segment match in the config.
                        //So, do joins on the biggest to smallest lengths of baseParts.
                        for (j = baseParts.length; j > 0; j -= 1) {
                            mapValue = getOwn(map, baseParts.slice(0, j).join('/'));

                            //baseName segment has config, find if it has one for
                            //this name.
                            if (mapValue) {
                                mapValue = getOwn(mapValue, nameSegment);
                                if (mapValue) {
                                    //Match, update name to the new value.
                                    foundMap = mapValue;
                                    foundI = i;
                                    break outerLoop;
                                }
                            }
                        }
                    }

                    //Check for a star map match, but just hold on to it,
                    //if there is a shorter segment match later in a matching
                    //config, then favor over this star map.
                    if (!foundStarMap && starMap && getOwn(starMap, nameSegment)) {
                        foundStarMap = getOwn(starMap, nameSegment);
                        starI = i;
                    }
                }

                if (!foundMap && foundStarMap) {
                    foundMap = foundStarMap;
                    foundI = starI;
                }

                if (foundMap) {
                    nameParts.splice(0, foundI, foundMap);
                    name = nameParts.join('/');
                }
            }

            // If the name points to a package's name, use
            // the package main instead.
            pkgMain = getOwn(config.pkgs, name);

            return pkgMain ? pkgMain : name;
        }

        function removeScript(name) {
            if (isBrowser) {
                each(scripts(), function (scriptNode) {
                    if (scriptNode.getAttribute('data-requiremodule') === name &&
                            scriptNode.getAttribute('data-requirecontext') === context.contextName) {
                        scriptNode.parentNode.removeChild(scriptNode);
                        return true;
                    }
                });
            }
        }

        function hasPathFallback(id) {
            var pathConfig = getOwn(config.paths, id);
            if (pathConfig && isArray(pathConfig) && pathConfig.length > 1) {
                //Pop off the first array value, since it failed, and
                //retry
                pathConfig.shift();
                context.require.undef(id);

                //Custom require that does not do map translation, since
                //ID is "absolute", already mapped/resolved.
                context.makeRequire(null, {
                    skipMap: true
                })([id]);

                return true;
            }
        }

        //Turns a plugin!resource to [plugin, resource]
        //with the plugin being undefined if the name
        //did not have a plugin prefix.
        function splitPrefix(name) {
            var prefix,
                index = name ? name.indexOf('!') : -1;
            if (index > -1) {
                prefix = name.substring(0, index);
                name = name.substring(index + 1, name.length);
            }
            return [prefix, name];
        }

        /**
         * Creates a module mapping that includes plugin prefix, module
         * name, and path. If parentModuleMap is provided it will
         * also normalize the name via require.normalize()
         *
         * @param {String} name the module name
         * @param {String} [parentModuleMap] parent module map
         * for the module name, used to resolve relative names.
         * @param {Boolean} isNormalized: is the ID already normalized.
         * This is true if this call is done for a define() module ID.
         * @param {Boolean} applyMap: apply the map config to the ID.
         * Should only be true if this map is for a dependency.
         *
         * @returns {Object}
         */
        function makeModuleMap(name, parentModuleMap, isNormalized, applyMap) {
            var url, pluginModule, suffix, nameParts,
                prefix = null,
                parentName = parentModuleMap ? parentModuleMap.name : null,
                originalName = name,
                isDefine = true,
                normalizedName = '';

            //If no name, then it means it is a require call, generate an
            //internal name.
            if (!name) {
                isDefine = false;
                name = '_@r' + (requireCounter += 1);
            }

            nameParts = splitPrefix(name);
            prefix = nameParts[0];
            name = nameParts[1];

            if (prefix) {
                prefix = normalize(prefix, parentName, applyMap);
                pluginModule = getOwn(defined, prefix);
            }

            //Account for relative paths if there is a base name.
            if (name) {
                if (prefix) {
                    if (isNormalized) {
                        normalizedName = name;
                    } else if (pluginModule && pluginModule.normalize) {
                        //Plugin is loaded, use its normalize method.
                        normalizedName = pluginModule.normalize(name, function (name) {
                            return normalize(name, parentName, applyMap);
                        });
                    } else {
                        // If nested plugin references, then do not try to
                        // normalize, as it will not normalize correctly. This
                        // places a restriction on resourceIds, and the longer
                        // term solution is not to normalize until plugins are
                        // loaded and all normalizations to allow for async
                        // loading of a loader plugin. But for now, fixes the
                        // common uses. Details in #1131
                        normalizedName = name.indexOf('!') === -1 ?
                                         normalize(name, parentName, applyMap) :
                                         name;
                    }
                } else {
                    //A regular module.
                    normalizedName = normalize(name, parentName, applyMap);

                    //Normalized name may be a plugin ID due to map config
                    //application in normalize. The map config values must
                    //already be normalized, so do not need to redo that part.
                    nameParts = splitPrefix(normalizedName);
                    prefix = nameParts[0];
                    normalizedName = nameParts[1];
                    isNormalized = true;

                    url = context.nameToUrl(normalizedName);
                }
            }

            //If the id is a plugin id that cannot be determined if it needs
            //normalization, stamp it with a unique ID so two matching relative
            //ids that may conflict can be separate.
            suffix = prefix && !pluginModule && !isNormalized ?
                     '_unnormalized' + (unnormalizedCounter += 1) :
                     '';

            return {
                prefix: prefix,
                name: normalizedName,
                parentMap: parentModuleMap,
                unnormalized: !!suffix,
                url: url,
                originalName: originalName,
                isDefine: isDefine,
                id: (prefix ?
                        prefix + '!' + normalizedName :
                        normalizedName) + suffix
            };
        }

        function getModule(depMap) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (!mod) {
                mod = registry[id] = new context.Module(depMap);
            }

            return mod;
        }

        function on(depMap, name, fn) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (hasProp(defined, id) &&
                    (!mod || mod.defineEmitComplete)) {
                if (name === 'defined') {
                    fn(defined[id]);
                }
            } else {
                mod = getModule(depMap);
                if (mod.error && name === 'error') {
                    fn(mod.error);
                } else {
                    mod.on(name, fn);
                }
            }
        }

        function onError(err, errback) {
            var ids = err.requireModules,
                notified = false;

            if (errback) {
                errback(err);
            } else {
                each(ids, function (id) {
                    var mod = getOwn(registry, id);
                    if (mod) {
                        //Set error on module, so it skips timeout checks.
                        mod.error = err;
                        if (mod.events.error) {
                            notified = true;
                            mod.emit('error', err);
                        }
                    }
                });

                if (!notified) {
                    req.onError(err);
                }
            }
        }

        /**
         * Internal method to transfer globalQueue items to this context's
         * defQueue.
         */
        function takeGlobalQueue() {
            //Push all the globalDefQueue items into the context's defQueue
            if (globalDefQueue.length) {
                each(globalDefQueue, function(queueItem) {
                    var id = queueItem[0];
                    if (typeof id === 'string') {
                        context.defQueueMap[id] = true;
                    }
                    defQueue.push(queueItem);
                });
                globalDefQueue = [];
            }
        }

        handlers = {
            'require': function (mod) {
                if (mod.require) {
                    return mod.require;
                } else {
                    return (mod.require = context.makeRequire(mod.map));
                }
            },
            'exports': function (mod) {
                mod.usingExports = true;
                if (mod.map.isDefine) {
                    if (mod.exports) {
                        return (defined[mod.map.id] = mod.exports);
                    } else {
                        return (mod.exports = defined[mod.map.id] = {});
                    }
                }
            },
            'module': function (mod) {
                if (mod.module) {
                    return mod.module;
                } else {
                    return (mod.module = {
                        id: mod.map.id,
                        uri: mod.map.url,
                        config: function () {
                            return getOwn(config.config, mod.map.id) || {};
                        },
                        exports: mod.exports || (mod.exports = {})
                    });
                }
            }
        };

        function cleanRegistry(id) {
            //Clean up machinery used for waiting modules.
            delete registry[id];
            delete enabledRegistry[id];
        }

        function breakCycle(mod, traced, processed) {
            var id = mod.map.id;

            if (mod.error) {
                mod.emit('error', mod.error);
            } else {
                traced[id] = true;
                each(mod.depMaps, function (depMap, i) {
                    var depId = depMap.id,
                        dep = getOwn(registry, depId);

                    //Only force things that have not completed
                    //being defined, so still in the registry,
                    //and only if it has not been matched up
                    //in the module already.
                    if (dep && !mod.depMatched[i] && !processed[depId]) {
                        if (getOwn(traced, depId)) {
                            mod.defineDep(i, defined[depId]);
                            mod.check(); //pass false?
                        } else {
                            breakCycle(dep, traced, processed);
                        }
                    }
                });
                processed[id] = true;
            }
        }

        function checkLoaded() {
            var err, usingPathFallback,
                waitInterval = config.waitSeconds * 1000,
                //It is possible to disable the wait interval by using waitSeconds of 0.
                expired = waitInterval && (context.startTime + waitInterval) < new Date().getTime(),
                noLoads = [],
                reqCalls = [],
                stillLoading = false,
                needCycleCheck = true;

            //Do not bother if this call was a result of a cycle break.
            if (inCheckLoaded) {
                return;
            }

            inCheckLoaded = true;

            //Figure out the state of all the modules.
            eachProp(enabledRegistry, function (mod) {
                var map = mod.map,
                    modId = map.id;

                //Skip things that are not enabled or in error state.
                if (!mod.enabled) {
                    return;
                }

                if (!map.isDefine) {
                    reqCalls.push(mod);
                }

                if (!mod.error) {
                    //If the module should be executed, and it has not
                    //been inited and time is up, remember it.
                    if (!mod.inited && expired) {
                        if (hasPathFallback(modId)) {
                            usingPathFallback = true;
                            stillLoading = true;
                        } else {
                            noLoads.push(modId);
                            removeScript(modId);
                        }
                    } else if (!mod.inited && mod.fetched && map.isDefine) {
                        stillLoading = true;
                        if (!map.prefix) {
                            //No reason to keep looking for unfinished
                            //loading. If the only stillLoading is a
                            //plugin resource though, keep going,
                            //because it may be that a plugin resource
                            //is waiting on a non-plugin cycle.
                            return (needCycleCheck = false);
                        }
                    }
                }
            });

            if (expired && noLoads.length) {
                //If wait time expired, throw error of unloaded modules.
                err = makeError('timeout', 'Load timeout for modules: ' + noLoads, null, noLoads);
                err.contextName = context.contextName;
                return onError(err);
            }

            //Not expired, check for a cycle.
            if (needCycleCheck) {
                each(reqCalls, function (mod) {
                    breakCycle(mod, {}, {});
                });
            }

            //If still waiting on loads, and the waiting load is something
            //other than a plugin resource, or there are still outstanding
            //scripts, then just try back later.
            if ((!expired || usingPathFallback) && stillLoading) {
                //Something is still waiting to load. Wait for it, but only
                //if a timeout is not already in effect.
                if ((isBrowser || isWebWorker) && !checkLoadedTimeoutId) {
                    checkLoadedTimeoutId = setTimeout(function () {
                        checkLoadedTimeoutId = 0;
                        checkLoaded();
                    }, 50);
                }
            }

            inCheckLoaded = false;
        }

        Module = function (map) {
            this.events = getOwn(undefEvents, map.id) || {};
            this.map = map;
            this.shim = getOwn(config.shim, map.id);
            this.depExports = [];
            this.depMaps = [];
            this.depMatched = [];
            this.pluginMaps = {};
            this.depCount = 0;

            /* this.exports this.factory
               this.depMaps = [],
               this.enabled, this.fetched
            */
        };

        Module.prototype = {
            init: function (depMaps, factory, errback, options) {
                options = options || {};

                //Do not do more inits if already done. Can happen if there
                //are multiple define calls for the same module. That is not
                //a normal, common case, but it is also not unexpected.
                if (this.inited) {
                    return;
                }

                this.factory = factory;

                if (errback) {
                    //Register for errors on this module.
                    this.on('error', errback);
                } else if (this.events.error) {
                    //If no errback already, but there are error listeners
                    //on this module, set up an errback to pass to the deps.
                    errback = bind(this, function (err) {
                        this.emit('error', err);
                    });
                }

                //Do a copy of the dependency array, so that
                //source inputs are not modified. For example
                //"shim" deps are passed in here directly, and
                //doing a direct modification of the depMaps array
                //would affect that config.
                this.depMaps = depMaps && depMaps.slice(0);

                this.errback = errback;

                //Indicate this module has be initialized
                this.inited = true;

                this.ignore = options.ignore;

                //Could have option to init this module in enabled mode,
                //or could have been previously marked as enabled. However,
                //the dependencies are not known until init is called. So
                //if enabled previously, now trigger dependencies as enabled.
                if (options.enabled || this.enabled) {
                    //Enable this module and dependencies.
                    //Will call this.check()
                    this.enable();
                } else {
                    this.check();
                }
            },

            defineDep: function (i, depExports) {
                //Because of cycles, defined callback for a given
                //export can be called more than once.
                if (!this.depMatched[i]) {
                    this.depMatched[i] = true;
                    this.depCount -= 1;
                    this.depExports[i] = depExports;
                }
            },

            fetch: function () {
                if (this.fetched) {
                    return;
                }
                this.fetched = true;

                context.startTime = (new Date()).getTime();

                var map = this.map;

                //If the manager is for a plugin managed resource,
                //ask the plugin to load it now.
                if (this.shim) {
                    context.makeRequire(this.map, {
                        enableBuildCallback: true
                    })(this.shim.deps || [], bind(this, function () {
                        return map.prefix ? this.callPlugin() : this.load();
                    }));
                } else {
                    //Regular dependency.
                    return map.prefix ? this.callPlugin() : this.load();
                }
            },

            load: function () {
                var url = this.map.url;

                //Regular dependency.
                if (!urlFetched[url]) {
                    urlFetched[url] = true;
                    context.load(this.map.id, url);
                }
            },

            /**
             * Checks if the module is ready to define itself, and if so,
             * define it.
             */
            check: function () {
                if (!this.enabled || this.enabling) {
                    return;
                }

                var err, cjsModule,
                    id = this.map.id,
                    depExports = this.depExports,
                    exports = this.exports,
                    factory = this.factory;

                if (!this.inited) {
                    // Only fetch if not already in the defQueue.
                    if (!hasProp(context.defQueueMap, id)) {
                        this.fetch();
                    }
                } else if (this.error) {
                    this.emit('error', this.error);
                } else if (!this.defining) {
                    //The factory could trigger another require call
                    //that would result in checking this module to
                    //define itself again. If already in the process
                    //of doing that, skip this work.
                    this.defining = true;

                    if (this.depCount < 1 && !this.defined) {
                        if (isFunction(factory)) {
                            //If there is an error listener, favor passing
                            //to that instead of throwing an error. However,
                            //only do it for define()'d  modules. require
                            //errbacks should not be called for failures in
                            //their callbacks (#699). However if a global
                            //onError is set, use that.
                            if ((this.events.error && this.map.isDefine) ||
                                req.onError !== defaultOnError) {
                                try {
                                    exports = context.execCb(id, factory, depExports, exports);
                                } catch (e) {
                                    err = e;
                                }
                            } else {
                                exports = context.execCb(id, factory, depExports, exports);
                            }

                            // Favor return value over exports. If node/cjs in play,
                            // then will not have a return value anyway. Favor
                            // module.exports assignment over exports object.
                            if (this.map.isDefine && exports === undefined) {
                                cjsModule = this.module;
                                if (cjsModule) {
                                    exports = cjsModule.exports;
                                } else if (this.usingExports) {
                                    //exports already set the defined value.
                                    exports = this.exports;
                                }
                            }

                            if (err) {
                                err.requireMap = this.map;
                                err.requireModules = this.map.isDefine ? [this.map.id] : null;
                                err.requireType = this.map.isDefine ? 'define' : 'require';
                                return onError((this.error = err));
                            }

                        } else {
                            //Just a literal value
                            exports = factory;
                        }

                        this.exports = exports;

                        if (this.map.isDefine && !this.ignore) {
                            defined[id] = exports;

                            if (req.onResourceLoad) {
                                var resLoadMaps = [];
                                each(this.depMaps, function (depMap) {
                                    resLoadMaps.push(depMap.normalizedMap || depMap);
                                });
                                req.onResourceLoad(context, this.map, resLoadMaps);
                            }
                        }

                        //Clean up
                        cleanRegistry(id);

                        this.defined = true;
                    }

                    //Finished the define stage. Allow calling check again
                    //to allow define notifications below in the case of a
                    //cycle.
                    this.defining = false;

                    if (this.defined && !this.defineEmitted) {
                        this.defineEmitted = true;
                        this.emit('defined', this.exports);
                        this.defineEmitComplete = true;
                    }

                }
            },

            callPlugin: function () {
                var map = this.map,
                    id = map.id,
                    //Map already normalized the prefix.
                    pluginMap = makeModuleMap(map.prefix);

                //Mark this as a dependency for this plugin, so it
                //can be traced for cycles.
                this.depMaps.push(pluginMap);

                on(pluginMap, 'defined', bind(this, function (plugin) {
                    var load, normalizedMap, normalizedMod,
                        bundleId = getOwn(bundlesMap, this.map.id),
                        name = this.map.name,
                        parentName = this.map.parentMap ? this.map.parentMap.name : null,
                        localRequire = context.makeRequire(map.parentMap, {
                            enableBuildCallback: true
                        });

                    //If current map is not normalized, wait for that
                    //normalized name to load instead of continuing.
                    if (this.map.unnormalized) {
                        //Normalize the ID if the plugin allows it.
                        if (plugin.normalize) {
                            name = plugin.normalize(name, function (name) {
                                return normalize(name, parentName, true);
                            }) || '';
                        }

                        //prefix and name should already be normalized, no need
                        //for applying map config again either.
                        normalizedMap = makeModuleMap(map.prefix + '!' + name,
                                                      this.map.parentMap,
                                                      true);
                        on(normalizedMap,
                            'defined', bind(this, function (value) {
                                this.map.normalizedMap = normalizedMap;
                                this.init([], function () { return value; }, null, {
                                    enabled: true,
                                    ignore: true
                                });
                            }));

                        normalizedMod = getOwn(registry, normalizedMap.id);
                        if (normalizedMod) {
                            //Mark this as a dependency for this plugin, so it
                            //can be traced for cycles.
                            this.depMaps.push(normalizedMap);

                            if (this.events.error) {
                                normalizedMod.on('error', bind(this, function (err) {
                                    this.emit('error', err);
                                }));
                            }
                            normalizedMod.enable();
                        }

                        return;
                    }

                    //If a paths config, then just load that file instead to
                    //resolve the plugin, as it is built into that paths layer.
                    if (bundleId) {
                        this.map.url = context.nameToUrl(bundleId);
                        this.load();
                        return;
                    }

                    load = bind(this, function (value) {
                        this.init([], function () { return value; }, null, {
                            enabled: true
                        });
                    });

                    load.error = bind(this, function (err) {
                        this.inited = true;
                        this.error = err;
                        err.requireModules = [id];

                        //Remove temp unnormalized modules for this module,
                        //since they will never be resolved otherwise now.
                        eachProp(registry, function (mod) {
                            if (mod.map.id.indexOf(id + '_unnormalized') === 0) {
                                cleanRegistry(mod.map.id);
                            }
                        });

                        onError(err);
                    });

                    //Allow plugins to load other code without having to know the
                    //context or how to 'complete' the load.
                    load.fromText = bind(this, function (text, textAlt) {
                        /*jslint evil: true */
                        var moduleName = map.name,
                            moduleMap = makeModuleMap(moduleName),
                            hasInteractive = useInteractive;

                        //As of 2.1.0, support just passing the text, to reinforce
                        //fromText only being called once per resource. Still
                        //support old style of passing moduleName but discard
                        //that moduleName in favor of the internal ref.
                        if (textAlt) {
                            text = textAlt;
                        }

                        //Turn off interactive script matching for IE for any define
                        //calls in the text, then turn it back on at the end.
                        if (hasInteractive) {
                            useInteractive = false;
                        }

                        //Prime the system by creating a module instance for
                        //it.
                        getModule(moduleMap);

                        //Transfer any config to this other module.
                        if (hasProp(config.config, id)) {
                            config.config[moduleName] = config.config[id];
                        }

                        try {
                            req.exec(text);
                        } catch (e) {
                            return onError(makeError('fromtexteval',
                                             'fromText eval for ' + id +
                                            ' failed: ' + e,
                                             e,
                                             [id]));
                        }

                        if (hasInteractive) {
                            useInteractive = true;
                        }

                        //Mark this as a dependency for the plugin
                        //resource
                        this.depMaps.push(moduleMap);

                        //Support anonymous modules.
                        context.completeLoad(moduleName);

                        //Bind the value of that module to the value for this
                        //resource ID.
                        localRequire([moduleName], load);
                    });

                    //Use parentName here since the plugin's name is not reliable,
                    //could be some weird string with no path that actually wants to
                    //reference the parentName's path.
                    plugin.load(map.name, localRequire, load, config);
                }));

                context.enable(pluginMap, this);
                this.pluginMaps[pluginMap.id] = pluginMap;
            },

            enable: function () {
                enabledRegistry[this.map.id] = this;
                this.enabled = true;

                //Set flag mentioning that the module is enabling,
                //so that immediate calls to the defined callbacks
                //for dependencies do not trigger inadvertent load
                //with the depCount still being zero.
                this.enabling = true;

                //Enable each dependency
                each(this.depMaps, bind(this, function (depMap, i) {
                    var id, mod, handler;

                    if (typeof depMap === 'string') {
                        //Dependency needs to be converted to a depMap
                        //and wired up to this module.
                        depMap = makeModuleMap(depMap,
                                               (this.map.isDefine ? this.map : this.map.parentMap),
                                               false,
                                               !this.skipMap);
                        this.depMaps[i] = depMap;

                        handler = getOwn(handlers, depMap.id);

                        if (handler) {
                            this.depExports[i] = handler(this);
                            return;
                        }

                        this.depCount += 1;

                        on(depMap, 'defined', bind(this, function (depExports) {
                            if (this.undefed) {
                                return;
                            }
                            this.defineDep(i, depExports);
                            this.check();
                        }));

                        if (this.errback) {
                            on(depMap, 'error', bind(this, this.errback));
                        } else if (this.events.error) {
                            // No direct errback on this module, but something
                            // else is listening for errors, so be sure to
                            // propagate the error correctly.
                            on(depMap, 'error', bind(this, function(err) {
                                this.emit('error', err);
                            }));
                        }
                    }

                    id = depMap.id;
                    mod = registry[id];

                    //Skip special modules like 'require', 'exports', 'module'
                    //Also, don't call enable if it is already enabled,
                    //important in circular dependency cases.
                    if (!hasProp(handlers, id) && mod && !mod.enabled) {
                        context.enable(depMap, this);
                    }
                }));

                //Enable each plugin that is used in
                //a dependency
                eachProp(this.pluginMaps, bind(this, function (pluginMap) {
                    var mod = getOwn(registry, pluginMap.id);
                    if (mod && !mod.enabled) {
                        context.enable(pluginMap, this);
                    }
                }));

                this.enabling = false;

                this.check();
            },

            on: function (name, cb) {
                var cbs = this.events[name];
                if (!cbs) {
                    cbs = this.events[name] = [];
                }
                cbs.push(cb);
            },

            emit: function (name, evt) {
                each(this.events[name], function (cb) {
                    cb(evt);
                });
                if (name === 'error') {
                    //Now that the error handler was triggered, remove
                    //the listeners, since this broken Module instance
                    //can stay around for a while in the registry.
                    delete this.events[name];
                }
            }
        };

        function callGetModule(args) {
            //Skip modules already defined.
            if (!hasProp(defined, args[0])) {
                getModule(makeModuleMap(args[0], null, true)).init(args[1], args[2]);
            }
        }

        function removeListener(node, func, name, ieName) {
            //Favor detachEvent because of IE9
            //issue, see attachEvent/addEventListener comment elsewhere
            //in this file.
            if (node.detachEvent && !isOpera) {
                //Probably IE. If not it will throw an error, which will be
                //useful to know.
                if (ieName) {
                    node.detachEvent(ieName, func);
                }
            } else {
                node.removeEventListener(name, func, false);
            }
        }

        /**
         * Given an event from a script node, get the requirejs info from it,
         * and then removes the event listeners on the node.
         * @param {Event} evt
         * @returns {Object}
         */
        function getScriptData(evt) {
            //Using currentTarget instead of target for Firefox 2.0's sake. Not
            //all old browsers will be supported, but this one was easy enough
            //to support and still makes sense.
            var node = evt.currentTarget || evt.srcElement;

            //Remove the listeners once here.
            removeListener(node, context.onScriptLoad, 'load', 'onreadystatechange');
            removeListener(node, context.onScriptError, 'error');

            return {
                node: node,
                id: node && node.getAttribute('data-requiremodule')
            };
        }

        function intakeDefines() {
            var args;

            //Any defined modules in the global queue, intake them now.
            takeGlobalQueue();

            //Make sure any remaining defQueue items get properly processed.
            while (defQueue.length) {
                args = defQueue.shift();
                if (args[0] === null) {
                    return onError(makeError('mismatch', 'Mismatched anonymous define() module: ' +
                        args[args.length - 1]));
                } else {
                    //args are id, deps, factory. Should be normalized by the
                    //define() function.
                    callGetModule(args);
                }
            }
            context.defQueueMap = {};
        }

        context = {
            config: config,
            contextName: contextName,
            registry: registry,
            defined: defined,
            urlFetched: urlFetched,
            defQueue: defQueue,
            defQueueMap: {},
            Module: Module,
            makeModuleMap: makeModuleMap,
            nextTick: req.nextTick,
            onError: onError,

            /**
             * Set a configuration for the context.
             * @param {Object} cfg config object to integrate.
             */
            configure: function (cfg) {
                //Make sure the baseUrl ends in a slash.
                if (cfg.baseUrl) {
                    if (cfg.baseUrl.charAt(cfg.baseUrl.length - 1) !== '/') {
                        cfg.baseUrl += '/';
                    }
                }

                // Convert old style urlArgs string to a function.
                if (typeof cfg.urlArgs === 'string') {
                    var urlArgs = cfg.urlArgs;
                    cfg.urlArgs = function(id, url) {
                        return (url.indexOf('?') === -1 ? '?' : '&') + urlArgs;
                    };
                }

                //Save off the paths since they require special processing,
                //they are additive.
                var shim = config.shim,
                    objs = {
                        paths: true,
                        bundles: true,
                        config: true,
                        map: true
                    };

                eachProp(cfg, function (value, prop) {
                    if (objs[prop]) {
                        if (!config[prop]) {
                            config[prop] = {};
                        }
                        mixin(config[prop], value, true, true);
                    } else {
                        config[prop] = value;
                    }
                });

                //Reverse map the bundles
                if (cfg.bundles) {
                    eachProp(cfg.bundles, function (value, prop) {
                        each(value, function (v) {
                            if (v !== prop) {
                                bundlesMap[v] = prop;
                            }
                        });
                    });
                }

                //Merge shim
                if (cfg.shim) {
                    eachProp(cfg.shim, function (value, id) {
                        //Normalize the structure
                        if (isArray(value)) {
                            value = {
                                deps: value
                            };
                        }
                        if ((value.exports || value.init) && !value.exportsFn) {
                            value.exportsFn = context.makeShimExports(value);
                        }
                        shim[id] = value;
                    });
                    config.shim = shim;
                }

                //Adjust packages if necessary.
                if (cfg.packages) {
                    each(cfg.packages, function (pkgObj) {
                        var location, name;

                        pkgObj = typeof pkgObj === 'string' ? {name: pkgObj} : pkgObj;

                        name = pkgObj.name;
                        location = pkgObj.location;
                        if (location) {
                            config.paths[name] = pkgObj.location;
                        }

                        //Save pointer to main module ID for pkg name.
                        //Remove leading dot in main, so main paths are normalized,
                        //and remove any trailing .js, since different package
                        //envs have different conventions: some use a module name,
                        //some use a file name.
                        config.pkgs[name] = pkgObj.name + '/' + (pkgObj.main || 'main')
                                     .replace(currDirRegExp, '')
                                     .replace(jsSuffixRegExp, '');
                    });
                }

                //If there are any "waiting to execute" modules in the registry,
                //update the maps for them, since their info, like URLs to load,
                //may have changed.
                eachProp(registry, function (mod, id) {
                    //If module already has init called, since it is too
                    //late to modify them, and ignore unnormalized ones
                    //since they are transient.
                    if (!mod.inited && !mod.map.unnormalized) {
                        mod.map = makeModuleMap(id, null, true);
                    }
                });

                //If a deps array or a config callback is specified, then call
                //require with those args. This is useful when require is defined as a
                //config object before require.js is loaded.
                if (cfg.deps || cfg.callback) {
                    context.require(cfg.deps || [], cfg.callback);
                }
            },

            makeShimExports: function (value) {
                function fn() {
                    var ret;
                    if (value.init) {
                        ret = value.init.apply(global, arguments);
                    }
                    return ret || (value.exports && getGlobal(value.exports));
                }
                return fn;
            },

            makeRequire: function (relMap, options) {
                options = options || {};

                function localRequire(deps, callback, errback) {
                    var id, map, requireMod;

                    if (options.enableBuildCallback && callback && isFunction(callback)) {
                        callback.__requireJsBuild = true;
                    }

                    if (typeof deps === 'string') {
                        if (isFunction(callback)) {
                            //Invalid call
                            return onError(makeError('requireargs', 'Invalid require call'), errback);
                        }

                        //If require|exports|module are requested, get the
                        //value for them from the special handlers. Caveat:
                        //this only works while module is being defined.
                        if (relMap && hasProp(handlers, deps)) {
                            return handlers[deps](registry[relMap.id]);
                        }

                        //Synchronous access to one module. If require.get is
                        //available (as in the Node adapter), prefer that.
                        if (req.get) {
                            return req.get(context, deps, relMap, localRequire);
                        }

                        //Normalize module name, if it contains . or ..
                        map = makeModuleMap(deps, relMap, false, true);
                        id = map.id;

                        if (!hasProp(defined, id)) {
                            return onError(makeError('notloaded', 'Module name "' +
                                        id +
                                        '" has not been loaded yet for context: ' +
                                        contextName +
                                        (relMap ? '' : '. Use require([])')));
                        }
                        return defined[id];
                    }

                    //Grab defines waiting in the global queue.
                    intakeDefines();

                    //Mark all the dependencies as needing to be loaded.
                    context.nextTick(function () {
                        //Some defines could have been added since the
                        //require call, collect them.
                        intakeDefines();

                        requireMod = getModule(makeModuleMap(null, relMap));

                        //Store if map config should be applied to this require
                        //call for dependencies.
                        requireMod.skipMap = options.skipMap;

                        requireMod.init(deps, callback, errback, {
                            enabled: true
                        });

                        checkLoaded();
                    });

                    return localRequire;
                }

                mixin(localRequire, {
                    isBrowser: isBrowser,

                    /**
                     * Converts a module name + .extension into an URL path.
                     * *Requires* the use of a module name. It does not support using
                     * plain URLs like nameToUrl.
                     */
                    toUrl: function (moduleNamePlusExt) {
                        var ext,
                            index = moduleNamePlusExt.lastIndexOf('.'),
                            segment = moduleNamePlusExt.split('/')[0],
                            isRelative = segment === '.' || segment === '..';

                        //Have a file extension alias, and it is not the
                        //dots from a relative path.
                        if (index !== -1 && (!isRelative || index > 1)) {
                            ext = moduleNamePlusExt.substring(index, moduleNamePlusExt.length);
                            moduleNamePlusExt = moduleNamePlusExt.substring(0, index);
                        }

                        return context.nameToUrl(normalize(moduleNamePlusExt,
                                                relMap && relMap.id, true), ext,  true);
                    },

                    defined: function (id) {
                        return hasProp(defined, makeModuleMap(id, relMap, false, true).id);
                    },

                    specified: function (id) {
                        id = makeModuleMap(id, relMap, false, true).id;
                        return hasProp(defined, id) || hasProp(registry, id);
                    }
                });

                //Only allow undef on top level require calls
                if (!relMap) {
                    localRequire.undef = function (id) {
                        //Bind any waiting define() calls to this context,
                        //fix for #408
                        takeGlobalQueue();

                        var map = makeModuleMap(id, relMap, true),
                            mod = getOwn(registry, id);

                        mod.undefed = true;
                        removeScript(id);

                        delete defined[id];
                        delete urlFetched[map.url];
                        delete undefEvents[id];

                        //Clean queued defines too. Go backwards
                        //in array so that the splices do not
                        //mess up the iteration.
                        eachReverse(defQueue, function(args, i) {
                            if (args[0] === id) {
                                defQueue.splice(i, 1);
                            }
                        });
                        delete context.defQueueMap[id];

                        if (mod) {
                            //Hold on to listeners in case the
                            //module will be attempted to be reloaded
                            //using a different config.
                            if (mod.events.defined) {
                                undefEvents[id] = mod.events;
                            }

                            cleanRegistry(id);
                        }
                    };
                }

                return localRequire;
            },

            /**
             * Called to enable a module if it is still in the registry
             * awaiting enablement. A second arg, parent, the parent module,
             * is passed in for context, when this method is overridden by
             * the optimizer. Not shown here to keep code compact.
             */
            enable: function (depMap) {
                var mod = getOwn(registry, depMap.id);
                if (mod) {
                    getModule(depMap).enable();
                }
            },

            /**
             * Internal method used by environment adapters to complete a load event.
             * A load event could be a script load or just a load pass from a synchronous
             * load call.
             * @param {String} moduleName the name of the module to potentially complete.
             */
            completeLoad: function (moduleName) {
                var found, args, mod,
                    shim = getOwn(config.shim, moduleName) || {},
                    shExports = shim.exports;

                takeGlobalQueue();

                while (defQueue.length) {
                    args = defQueue.shift();
                    if (args[0] === null) {
                        args[0] = moduleName;
                        //If already found an anonymous module and bound it
                        //to this name, then this is some other anon module
                        //waiting for its completeLoad to fire.
                        if (found) {
                            break;
                        }
                        found = true;
                    } else if (args[0] === moduleName) {
                        //Found matching define call for this script!
                        found = true;
                    }

                    callGetModule(args);
                }
                context.defQueueMap = {};

                //Do this after the cycle of callGetModule in case the result
                //of those calls/init calls changes the registry.
                mod = getOwn(registry, moduleName);

                if (!found && !hasProp(defined, moduleName) && mod && !mod.inited) {
                    if (config.enforceDefine && (!shExports || !getGlobal(shExports))) {
                        if (hasPathFallback(moduleName)) {
                            return;
                        } else {
                            return onError(makeError('nodefine',
                                             'No define call for ' + moduleName,
                                             null,
                                             [moduleName]));
                        }
                    } else {
                        //A script that does not call define(), so just simulate
                        //the call for it.
                        callGetModule([moduleName, (shim.deps || []), shim.exportsFn]);
                    }
                }

                checkLoaded();
            },

            /**
             * Converts a module name to a file path. Supports cases where
             * moduleName may actually be just an URL.
             * Note that it **does not** call normalize on the moduleName,
             * it is assumed to have already been normalized. This is an
             * internal API, not a public one. Use toUrl for the public API.
             */
            nameToUrl: function (moduleName, ext, skipExt) {
                var paths, syms, i, parentModule, url,
                    parentPath, bundleId,
                    pkgMain = getOwn(config.pkgs, moduleName);

                if (pkgMain) {
                    moduleName = pkgMain;
                }

                bundleId = getOwn(bundlesMap, moduleName);

                if (bundleId) {
                    return context.nameToUrl(bundleId, ext, skipExt);
                }

                //If a colon is in the URL, it indicates a protocol is used and it is just
                //an URL to a file, or if it starts with a slash, contains a query arg (i.e. ?)
                //or ends with .js, then assume the user meant to use an url and not a module id.
                //The slash is important for protocol-less URLs as well as full paths.
                if (req.jsExtRegExp.test(moduleName)) {
                    //Just a plain path, not module name lookup, so just return it.
                    //Add extension if it is included. This is a bit wonky, only non-.js things pass
                    //an extension, this method probably needs to be reworked.
                    url = moduleName + (ext || '');
                } else {
                    //A module that needs to be converted to a path.
                    paths = config.paths;

                    syms = moduleName.split('/');
                    //For each module name segment, see if there is a path
                    //registered for it. Start with most specific name
                    //and work up from it.
                    for (i = syms.length; i > 0; i -= 1) {
                        parentModule = syms.slice(0, i).join('/');

                        parentPath = getOwn(paths, parentModule);
                        if (parentPath) {
                            //If an array, it means there are a few choices,
                            //Choose the one that is desired
                            if (isArray(parentPath)) {
                                parentPath = parentPath[0];
                            }
                            syms.splice(0, i, parentPath);
                            break;
                        }
                    }

                    //Join the path parts together, then figure out if baseUrl is needed.
                    url = syms.join('/');
                    url += (ext || (/^data\:|^blob\:|\?/.test(url) || skipExt ? '' : '.js'));
                    url = (url.charAt(0) === '/' || url.match(/^[\w\+\.\-]+:/) ? '' : config.baseUrl) + url;
                }

                return config.urlArgs && !/^blob\:/.test(url) ?
                       url + config.urlArgs(moduleName, url) : url;
            },

            //Delegates to req.load. Broken out as a separate function to
            //allow overriding in the optimizer.
            load: function (id, url) {
                req.load(context, id, url);
            },

            /**
             * Executes a module callback function. Broken out as a separate function
             * solely to allow the build system to sequence the files in the built
             * layer in the right sequence.
             *
             * @private
             */
            execCb: function (name, callback, args, exports) {
                return callback.apply(exports, args);
            },

            /**
             * callback for script loads, used to check status of loading.
             *
             * @param {Event} evt the event from the browser for the script
             * that was loaded.
             */
            onScriptLoad: function (evt) {
                //Using currentTarget instead of target for Firefox 2.0's sake. Not
                //all old browsers will be supported, but this one was easy enough
                //to support and still makes sense.
                if (evt.type === 'load' ||
                        (readyRegExp.test((evt.currentTarget || evt.srcElement).readyState))) {
                    //Reset interactive script so a script node is not held onto for
                    //to long.
                    interactiveScript = null;

                    //Pull out the name of the module and the context.
                    var data = getScriptData(evt);
                    context.completeLoad(data.id);
                }
            },

            /**
             * Callback for script errors.
             */
            onScriptError: function (evt) {
                var data = getScriptData(evt);
                if (!hasPathFallback(data.id)) {
                    var parents = [];
                    eachProp(registry, function(value, key) {
                        if (key.indexOf('_@r') !== 0) {
                            each(value.depMaps, function(depMap) {
                                if (depMap.id === data.id) {
                                    parents.push(key);
                                    return true;
                                }
                            });
                        }
                    });
                    return onError(makeError('scripterror', 'Script error for "' + data.id +
                                             (parents.length ?
                                             '", needed by: ' + parents.join(', ') :
                                             '"'), evt, [data.id]));
                }
            }
        };

        context.require = context.makeRequire();
        return context;
    }

    /**
     * Main entry point.
     *
     * If the only argument to require is a string, then the module that
     * is represented by that string is fetched for the appropriate context.
     *
     * If the first argument is an array, then it will be treated as an array
     * of dependency string names to fetch. An optional function callback can
     * be specified to execute when all of those dependencies are available.
     *
     * Make a local req variable to help Caja compliance (it assumes things
     * on a require that are not standardized), and to give a short
     * name for minification/local scope use.
     */
    req = requirejs = function (deps, callback, errback, optional) {

        //Find the right context, use default
        var context, config,
            contextName = defContextName;

        // Determine if have config object in the call.
        if (!isArray(deps) && typeof deps !== 'string') {
            // deps is a config object
            config = deps;
            if (isArray(callback)) {
                // Adjust args if there are dependencies
                deps = callback;
                callback = errback;
                errback = optional;
            } else {
                deps = [];
            }
        }

        if (config && config.context) {
            contextName = config.context;
        }

        context = getOwn(contexts, contextName);
        if (!context) {
            context = contexts[contextName] = req.s.newContext(contextName);
        }

        if (config) {
            context.configure(config);
        }

        return context.require(deps, callback, errback);
    };

    /**
     * Support require.config() to make it easier to cooperate with other
     * AMD loaders on globally agreed names.
     */
    req.config = function (config) {
        return req(config);
    };

    /**
     * Execute something after the current tick
     * of the event loop. Override for other envs
     * that have a better solution than setTimeout.
     * @param  {Function} fn function to execute later.
     */
    req.nextTick = typeof setTimeout !== 'undefined' ? function (fn) {
        setTimeout(fn, 4);
    } : function (fn) { fn(); };

    /**
     * Export require as a global, but only if it does not already exist.
     */
    if (!require) {
        require = req;
    }

    req.version = version;

    //Used to filter out dependencies that are already paths.
    req.jsExtRegExp = /^\/|:|\?|\.js$/;
    req.isBrowser = isBrowser;
    s = req.s = {
        contexts: contexts,
        newContext: newContext
    };

    //Create default context.
    req({});

    //Exports some context-sensitive methods on global require.
    each([
        'toUrl',
        'undef',
        'defined',
        'specified'
    ], function (prop) {
        //Reference from contexts instead of early binding to default context,
        //so that during builds, the latest instance of the default context
        //with its config gets used.
        req[prop] = function () {
            var ctx = contexts[defContextName];
            return ctx.require[prop].apply(ctx, arguments);
        };
    });

    if (isBrowser) {
        head = s.head = document.getElementsByTagName('head')[0];
        //If BASE tag is in play, using appendChild is a problem for IE6.
        //When that browser dies, this can be removed. Details in this jQuery bug:
        //http://dev.jquery.com/ticket/2709
        baseElement = document.getElementsByTagName('base')[0];
        if (baseElement) {
            head = s.head = baseElement.parentNode;
        }
    }

    /**
     * Any errors that require explicitly generates will be passed to this
     * function. Intercept/override it if you want custom error handling.
     * @param {Error} err the error object.
     */
    req.onError = defaultOnError;

    /**
     * Creates the node for the load command. Only used in browser envs.
     */
    req.createNode = function (config, moduleName, url) {
        var node = config.xhtml ?
                document.createElementNS('http://www.w3.org/1999/xhtml', 'html:script') :
                document.createElement('script');
        node.type = config.scriptType || 'text/javascript';
        node.charset = 'utf-8';
        node.async = true;
        return node;
    };

    /**
     * Does the request to load a module for the browser case.
     * Make this a separate function to allow other environments
     * to override it.
     *
     * @param {Object} context the require context to find state.
     * @param {String} moduleName the name of the module.
     * @param {Object} url the URL to the module.
     */
    req.load = function (context, moduleName, url) {
        var config = (context && context.config) || {},
            node;
        if (isBrowser) {
            //In the browser so use a script tag
            node = req.createNode(config, moduleName, url);

            node.setAttribute('data-requirecontext', context.contextName);
            node.setAttribute('data-requiremodule', moduleName);

            //Set up load listener. Test attachEvent first because IE9 has
            //a subtle issue in its addEventListener and script onload firings
            //that do not match the behavior of all other browsers with
            //addEventListener support, which fire the onload event for a
            //script right after the script execution. See:
            //https://connect.microsoft.com/IE/feedback/details/648057/script-onload-event-is-not-fired-immediately-after-script-execution
            //UNFORTUNATELY Opera implements attachEvent but does not follow the script
            //script execution mode.
            if (node.attachEvent &&
                    //Check if node.attachEvent is artificially added by custom script or
                    //natively supported by browser
                    //read https://github.com/requirejs/requirejs/issues/187
                    //if we can NOT find [native code] then it must NOT natively supported.
                    //in IE8, node.attachEvent does not have toString()
                    //Note the test for "[native code" with no closing brace, see:
                    //https://github.com/requirejs/requirejs/issues/273
                    !(node.attachEvent.toString && node.attachEvent.toString().indexOf('[native code') < 0) &&
                    !isOpera) {
                //Probably IE. IE (at least 6-8) do not fire
                //script onload right after executing the script, so
                //we cannot tie the anonymous define call to a name.
                //However, IE reports the script as being in 'interactive'
                //readyState at the time of the define call.
                useInteractive = true;

                node.attachEvent('onreadystatechange', context.onScriptLoad);
                //It would be great to add an error handler here to catch
                //404s in IE9+. However, onreadystatechange will fire before
                //the error handler, so that does not help. If addEventListener
                //is used, then IE will fire error before load, but we cannot
                //use that pathway given the connect.microsoft.com issue
                //mentioned above about not doing the 'script execute,
                //then fire the script load event listener before execute
                //next script' that other browsers do.
                //Best hope: IE10 fixes the issues,
                //and then destroys all installs of IE 6-9.
                //node.attachEvent('onerror', context.onScriptError);
            } else {
                node.addEventListener('load', context.onScriptLoad, false);
                node.addEventListener('error', context.onScriptError, false);
            }
            node.src = url;

            //Calling onNodeCreated after all properties on the node have been
            //set, but before it is placed in the DOM.
            if (config.onNodeCreated) {
                config.onNodeCreated(node, config, moduleName, url);
            }

            //For some cache cases in IE 6-8, the script executes before the end
            //of the appendChild execution, so to tie an anonymous define
            //call to the module name (which is stored on the node), hold on
            //to a reference to this node, but clear after the DOM insertion.
            currentlyAddingScript = node;
            if (baseElement) {
                head.insertBefore(node, baseElement);
            } else {
                head.appendChild(node);
            }
            currentlyAddingScript = null;

            return node;
        } else if (isWebWorker) {
            try {
                //In a web worker, use importScripts. This is not a very
                //efficient use of importScripts, importScripts will block until
                //its script is downloaded and evaluated. However, if web workers
                //are in play, the expectation is that a build has been done so
                //that only one script needs to be loaded anyway. This may need
                //to be reevaluated if other use cases become common.

                // Post a task to the event loop to work around a bug in WebKit
                // where the worker gets garbage-collected after calling
                // importScripts(): https://webkit.org/b/153317
                setTimeout(function() {}, 0);
                importScripts(url);

                //Account for anonymous modules
                context.completeLoad(moduleName);
            } catch (e) {
                context.onError(makeError('importscripts',
                                'importScripts failed for ' +
                                    moduleName + ' at ' + url,
                                e,
                                [moduleName]));
            }
        }
    };

    function getInteractiveScript() {
        if (interactiveScript && interactiveScript.readyState === 'interactive') {
            return interactiveScript;
        }

        eachReverse(scripts(), function (script) {
            if (script.readyState === 'interactive') {
                return (interactiveScript = script);
            }
        });
        return interactiveScript;
    }

    //Look for a data-main script attribute, which could also adjust the baseUrl.
    if (isBrowser && !cfg.skipDataMain) {
        //Figure out baseUrl. Get it from the script tag with require.js in it.
        eachReverse(scripts(), function (script) {
            //Set the 'head' where we can append children by
            //using the script's parent.
            if (!head) {
                head = script.parentNode;
            }

            //Look for a data-main attribute to set main script for the page
            //to load. If it is there, the path to data main becomes the
            //baseUrl, if it is not already set.
            dataMain = script.getAttribute('data-main');
            if (dataMain) {
                //Preserve dataMain in case it is a path (i.e. contains '?')
                mainScript = dataMain;

                //Set final baseUrl if there is not already an explicit one,
                //but only do so if the data-main value is not a loader plugin
                //module ID.
                if (!cfg.baseUrl && mainScript.indexOf('!') === -1) {
                    //Pull off the directory of data-main for use as the
                    //baseUrl.
                    src = mainScript.split('/');
                    mainScript = src.pop();
                    subPath = src.length ? src.join('/')  + '/' : './';

                    cfg.baseUrl = subPath;
                }

                //Strip off any trailing .js since mainScript is now
                //like a module name.
                mainScript = mainScript.replace(jsSuffixRegExp, '');

                //If mainScript is still a path, fall back to dataMain
                if (req.jsExtRegExp.test(mainScript)) {
                    mainScript = dataMain;
                }

                //Put the data-main script in the files to load.
                cfg.deps = cfg.deps ? cfg.deps.concat(mainScript) : [mainScript];

                return true;
            }
        });
    }

    /**
     * The function that handles definitions of modules. Differs from
     * require() in that a string for the module should be the first argument,
     * and the function to execute after dependencies are loaded should
     * return a value to define the module corresponding to the first argument's
     * name.
     */
    define = function (name, deps, callback) {
        var node, context;

        //Allow for anonymous modules
        if (typeof name !== 'string') {
            //Adjust args appropriately
            callback = deps;
            deps = name;
            name = null;
        }

        //This module may not have dependencies
        if (!isArray(deps)) {
            callback = deps;
            deps = null;
        }

        //If no name, and callback is a function, then figure out if it a
        //CommonJS thing with dependencies.
        if (!deps && isFunction(callback)) {
            deps = [];
            //Remove comments from the callback string,
            //look for require calls, and pull them into the dependencies,
            //but only if there are function args.
            if (callback.length) {
                callback
                    .toString()
                    .replace(commentRegExp, commentReplace)
                    .replace(cjsRequireRegExp, function (match, dep) {
                        deps.push(dep);
                    });

                //May be a CommonJS thing even without require calls, but still
                //could use exports, and module. Avoid doing exports and module
                //work though if it just needs require.
                //REQUIRES the function to expect the CommonJS variables in the
                //order listed below.
                deps = (callback.length === 1 ? ['require'] : ['require', 'exports', 'module']).concat(deps);
            }
        }

        //If in IE 6-8 and hit an anonymous define() call, do the interactive
        //work.
        if (useInteractive) {
            node = currentlyAddingScript || getInteractiveScript();
            if (node) {
                if (!name) {
                    name = node.getAttribute('data-requiremodule');
                }
                context = contexts[node.getAttribute('data-requirecontext')];
            }
        }

        //Always save off evaluating the def call until the script onload handler.
        //This allows multiple modules to be in a file without prematurely
        //tracing dependencies, and allows for anonymous module support,
        //where the module name is not known until the script onload event
        //occurs. If no context, use the global queue, and get it processed
        //in the onscript load callback.
        if (context) {
            context.defQueue.push([name, deps, callback]);
            context.defQueueMap[name] = true;
        } else {
            globalDefQueue.push([name, deps, callback]);
        }
    };

    define.amd = {
        jQuery: true
    };

    /**
     * Executes the text. Normally just uses eval, but can be modified
     * to use a better, environment-specific call. Only used for transpiling
     * loader plugins, not for plain JS modules.
     * @param {String} text the text to execute/evaluate.
     */
    req.exec = function (text) {
        /*jslint evil: true */
        return eval(text);
    };

    //Set up with config info.
    req(cfg);
}(this, (typeof setTimeout === 'undefined' ? undefined : setTimeout)));

_aureliaConfigureModuleLoader();
define('aurelia-binding/dist/es2015/aurelia-binding',["exports", "aurelia-logging", "aurelia-pal", "aurelia-task-queue", "aurelia-metadata"], function (_exports, LogManager, _aureliaPal, _aureliaTaskQueue, _aureliaMetadata) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.camelCase = camelCase;
  _exports.createOverrideContext = createOverrideContext;
  _exports.getContextFor = getContextFor;
  _exports.createScopeForTest = createScopeForTest;
  _exports.connectable = connectable;
  _exports.enqueueBindingConnect = enqueueBindingConnect;
  _exports.subscriberCollection = subscriberCollection;
  _exports.calcSplices = calcSplices;
  _exports.mergeSplice = mergeSplice;
  _exports.projectArraySplices = projectArraySplices;
  _exports.getChangeRecords = getChangeRecords;
  _exports.getArrayObserver = getArrayObserver;
  _exports.cloneExpression = cloneExpression;
  _exports.getMapObserver = getMapObserver;
  _exports.hasDeclaredDependencies = hasDeclaredDependencies;
  _exports.declarePropertyDependencies = declarePropertyDependencies;
  _exports.computedFrom = computedFrom;
  _exports.createComputedObserver = createComputedObserver;
  _exports.valueConverter = valueConverter;
  _exports.bindingBehavior = bindingBehavior;
  _exports.getSetObserver = getSetObserver;
  _exports.observable = observable;
  _exports.connectBindingToSignal = connectBindingToSignal;
  _exports.signalBindings = signalBindings;
  _exports.BindingEngine = _exports.NameExpression = _exports.Listener = _exports.ListenerExpression = _exports.BindingBehaviorResource = _exports.ValueConverterResource = _exports.Call = _exports.CallExpression = _exports.Binding = _exports.BindingExpression = _exports.ObjectObservationAdapter = _exports.ObserverLocator = _exports.SVGAnalyzer = _exports.presentationAttributes = _exports.presentationElements = _exports.elements = _exports.ComputedExpression = _exports.ClassObserver = _exports.SelectValueObserver = _exports.CheckedObserver = _exports.ValueAttributeObserver = _exports.StyleObserver = _exports.DataAttributeObserver = _exports.dataAttributeAccessor = _exports.XLinkAttributeObserver = _exports.SetterObserver = _exports.PrimitiveObserver = _exports.propertyAccessor = _exports.DirtyCheckProperty = _exports.DirtyChecker = _exports.EventSubscriber = _exports.EventManager = _exports.delegationStrategy = _exports.ParserImplementation = _exports.Parser = _exports.bindingMode = _exports.ExpressionCloner = _exports.Unparser = _exports.LiteralObject = _exports.LiteralArray = _exports.LiteralTemplate = _exports.LiteralString = _exports.LiteralPrimitive = _exports.Unary = _exports.Binary = _exports.CallFunction = _exports.CallMember = _exports.CallScope = _exports.AccessKeyed = _exports.AccessMember = _exports.AccessScope = _exports.AccessThis = _exports.Conditional = _exports.Assign = _exports.ValueConverter = _exports.BindingBehavior = _exports.Expression = _exports.CollectionLengthObserver = _exports.ModifyCollectionObserver = _exports.ExpressionObserver = _exports.sourceContext = _exports.targetContext = void 0;
  LogManager = _interopRequireWildcard(LogManager);

  function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

  var _dec, _dec2, _class, _dec3, _class2, _dec4, _class3, _dec5, _class5, _dec6, _class7, _dec7, _class8, _dec8, _class9, _dec9, _class10, _class11, _temp, _dec10, _class12, _class13, _temp2;

  const targetContext = 'Binding:target';
  _exports.targetContext = targetContext;
  const sourceContext = 'Binding:source';
  _exports.sourceContext = sourceContext;
  const map = Object.create(null);

  function camelCase(name) {
    if (name in map) {
      return map[name];
    }

    const result = name.charAt(0).toLowerCase() + name.slice(1).replace(/[_.-](\w|$)/g, (_, x) => x.toUpperCase());
    map[name] = result;
    return result;
  }

  function createOverrideContext(bindingContext, parentOverrideContext) {
    return {
      bindingContext: bindingContext,
      parentOverrideContext: parentOverrideContext || null
    };
  }

  function getContextFor(name, scope, ancestor) {
    let oc = scope.overrideContext;

    if (ancestor) {
      while (ancestor && oc) {
        ancestor--;
        oc = oc.parentOverrideContext;
      }

      if (ancestor || !oc) {
        return undefined;
      }

      return name in oc ? oc : oc.bindingContext;
    }

    while (oc && !(name in oc) && !(oc.bindingContext && name in oc.bindingContext)) {
      oc = oc.parentOverrideContext;
    }

    if (oc) {
      return name in oc ? oc : oc.bindingContext;
    }

    return scope.bindingContext || scope.overrideContext;
  }

  function createScopeForTest(bindingContext, parentBindingContext) {
    if (parentBindingContext) {
      return {
        bindingContext,
        overrideContext: createOverrideContext(bindingContext, createOverrideContext(parentBindingContext))
      };
    }

    return {
      bindingContext,
      overrideContext: createOverrideContext(bindingContext)
    };
  }

  const slotNames = [];
  const versionSlotNames = [];

  for (let i = 0; i < 100; i++) {
    slotNames.push(`_observer${i}`);
    versionSlotNames.push(`_observerVersion${i}`);
  }

  function addObserver(observer) {
    let observerSlots = this._observerSlots === undefined ? 0 : this._observerSlots;
    let i = observerSlots;

    while (i-- && this[slotNames[i]] !== observer) {}

    if (i === -1) {
      i = 0;

      while (this[slotNames[i]]) {
        i++;
      }

      this[slotNames[i]] = observer;
      observer.subscribe(sourceContext, this);

      if (i === observerSlots) {
        this._observerSlots = i + 1;
      }
    }

    if (this._version === undefined) {
      this._version = 0;
    }

    this[versionSlotNames[i]] = this._version;
  }

  function observeProperty(obj, propertyName) {
    let observer = this.observerLocator.getObserver(obj, propertyName);
    addObserver.call(this, observer);
  }

  function observeArray(array) {
    let observer = this.observerLocator.getArrayObserver(array);
    addObserver.call(this, observer);
  }

  function unobserve(all) {
    let i = this._observerSlots;

    while (i--) {
      if (all || this[versionSlotNames[i]] !== this._version) {
        let observer = this[slotNames[i]];
        this[slotNames[i]] = null;

        if (observer) {
          observer.unsubscribe(sourceContext, this);
        }
      }
    }
  }

  function connectable() {
    return function (target) {
      target.prototype.observeProperty = observeProperty;
      target.prototype.observeArray = observeArray;
      target.prototype.unobserve = unobserve;
      target.prototype.addObserver = addObserver;
    };
  }

  const queue = [];
  const queued = {};
  let nextId = 0;
  const minimumImmediate = 100;
  const frameBudget = 15;
  let isFlushRequested = false;
  let immediate = 0;

  function flush(animationFrameStart) {
    const length = queue.length;
    let i = 0;

    while (i < length) {
      const binding = queue[i];
      queued[binding.__connectQueueId] = false;
      binding.connect(true);
      i++;

      if (i % 100 === 0 && _aureliaPal.PLATFORM.performance.now() - animationFrameStart > frameBudget) {
        break;
      }
    }

    queue.splice(0, i);

    if (queue.length) {
      _aureliaPal.PLATFORM.requestAnimationFrame(flush);
    } else {
      isFlushRequested = false;
      immediate = 0;
    }
  }

  function enqueueBindingConnect(binding) {
    if (immediate < minimumImmediate) {
      immediate++;
      binding.connect(false);
    } else {
      let id = binding.__connectQueueId;

      if (id === undefined) {
        id = nextId;
        nextId++;
        binding.__connectQueueId = id;
      }

      if (!queued[id]) {
        queue.push(binding);
        queued[id] = true;
      }
    }

    if (!isFlushRequested) {
      isFlushRequested = true;

      _aureliaPal.PLATFORM.requestAnimationFrame(flush);
    }
  }

  function addSubscriber(context, callable) {
    if (this.hasSubscriber(context, callable)) {
      return false;
    }

    if (!this._context0) {
      this._context0 = context;
      this._callable0 = callable;
      return true;
    }

    if (!this._context1) {
      this._context1 = context;
      this._callable1 = callable;
      return true;
    }

    if (!this._context2) {
      this._context2 = context;
      this._callable2 = callable;
      return true;
    }

    if (!this._contextsRest) {
      this._contextsRest = [context];
      this._callablesRest = [callable];
      return true;
    }

    this._contextsRest.push(context);

    this._callablesRest.push(callable);

    return true;
  }

  function removeSubscriber(context, callable) {
    if (this._context0 === context && this._callable0 === callable) {
      this._context0 = null;
      this._callable0 = null;
      return true;
    }

    if (this._context1 === context && this._callable1 === callable) {
      this._context1 = null;
      this._callable1 = null;
      return true;
    }

    if (this._context2 === context && this._callable2 === callable) {
      this._context2 = null;
      this._callable2 = null;
      return true;
    }

    const callables = this._callablesRest;

    if (callables === undefined || callables.length === 0) {
      return false;
    }

    const contexts = this._contextsRest;
    let i = 0;

    while (!(callables[i] === callable && contexts[i] === context) && callables.length > i) {
      i++;
    }

    if (i >= callables.length) {
      return false;
    }

    contexts.splice(i, 1);
    callables.splice(i, 1);
    return true;
  }

  let arrayPool1 = [];
  let arrayPool2 = [];
  let poolUtilization = [];

  function callSubscribers(newValue, oldValue) {
    let context0 = this._context0;
    let callable0 = this._callable0;
    let context1 = this._context1;
    let callable1 = this._callable1;
    let context2 = this._context2;
    let callable2 = this._callable2;
    let length = this._contextsRest ? this._contextsRest.length : 0;
    let contextsRest;
    let callablesRest;
    let poolIndex;
    let i;

    if (length) {
      poolIndex = poolUtilization.length;

      while (poolIndex-- && poolUtilization[poolIndex]) {}

      if (poolIndex < 0) {
        poolIndex = poolUtilization.length;
        contextsRest = [];
        callablesRest = [];
        poolUtilization.push(true);
        arrayPool1.push(contextsRest);
        arrayPool2.push(callablesRest);
      } else {
        poolUtilization[poolIndex] = true;
        contextsRest = arrayPool1[poolIndex];
        callablesRest = arrayPool2[poolIndex];
      }

      i = length;

      while (i--) {
        contextsRest[i] = this._contextsRest[i];
        callablesRest[i] = this._callablesRest[i];
      }
    }

    if (context0) {
      if (callable0) {
        callable0.call(context0, newValue, oldValue);
      } else {
        context0(newValue, oldValue);
      }
    }

    if (context1) {
      if (callable1) {
        callable1.call(context1, newValue, oldValue);
      } else {
        context1(newValue, oldValue);
      }
    }

    if (context2) {
      if (callable2) {
        callable2.call(context2, newValue, oldValue);
      } else {
        context2(newValue, oldValue);
      }
    }

    if (length) {
      for (i = 0; i < length; i++) {
        let callable = callablesRest[i];
        let context = contextsRest[i];

        if (callable) {
          callable.call(context, newValue, oldValue);
        } else {
          context(newValue, oldValue);
        }

        contextsRest[i] = null;
        callablesRest[i] = null;
      }

      poolUtilization[poolIndex] = false;
    }
  }

  function hasSubscribers() {
    return !!(this._context0 || this._context1 || this._context2 || this._contextsRest && this._contextsRest.length);
  }

  function hasSubscriber(context, callable) {
    let has = this._context0 === context && this._callable0 === callable || this._context1 === context && this._callable1 === callable || this._context2 === context && this._callable2 === callable;

    if (has) {
      return true;
    }

    let index;
    let contexts = this._contextsRest;

    if (!contexts || (index = contexts.length) === 0) {
      return false;
    }

    let callables = this._callablesRest;

    while (index--) {
      if (contexts[index] === context && callables[index] === callable) {
        return true;
      }
    }

    return false;
  }

  function subscriberCollection() {
    return function (target) {
      target.prototype.addSubscriber = addSubscriber;
      target.prototype.removeSubscriber = removeSubscriber;
      target.prototype.callSubscribers = callSubscribers;
      target.prototype.hasSubscribers = hasSubscribers;
      target.prototype.hasSubscriber = hasSubscriber;
    };
  }

  let ExpressionObserver = (_dec = connectable(), _dec2 = subscriberCollection(), _dec(_class = _dec2(_class = class ExpressionObserver {
    constructor(scope, expression, observerLocator, lookupFunctions) {
      this.scope = scope;
      this.expression = expression;
      this.observerLocator = observerLocator;
      this.lookupFunctions = lookupFunctions;
    }

    getValue() {
      return this.expression.evaluate(this.scope, this.lookupFunctions);
    }

    setValue(newValue) {
      this.expression.assign(this.scope, newValue);
    }

    subscribe(context, callable) {
      if (!this.hasSubscribers()) {
        this.oldValue = this.expression.evaluate(this.scope, this.lookupFunctions);
        this.expression.connect(this, this.scope);
      }

      this.addSubscriber(context, callable);

      if (arguments.length === 1 && context instanceof Function) {
        return {
          dispose: () => {
            this.unsubscribe(context, callable);
          }
        };
      }
    }

    unsubscribe(context, callable) {
      if (this.removeSubscriber(context, callable) && !this.hasSubscribers()) {
        this.unobserve(true);
        this.oldValue = undefined;
      }
    }

    call() {
      let newValue = this.expression.evaluate(this.scope, this.lookupFunctions);
      let oldValue = this.oldValue;

      if (newValue !== oldValue) {
        this.oldValue = newValue;
        this.callSubscribers(newValue, oldValue);
      }

      this._version++;
      this.expression.connect(this, this.scope);
      this.unobserve(false);
    }

  }) || _class) || _class);
  _exports.ExpressionObserver = ExpressionObserver;

  function isIndex(s) {
    return +s === s >>> 0;
  }

  function toNumber(s) {
    return +s;
  }

  function newSplice(index, removed, addedCount) {
    return {
      index: index,
      removed: removed,
      addedCount: addedCount
    };
  }

  const EDIT_LEAVE = 0;
  const EDIT_UPDATE = 1;
  const EDIT_ADD = 2;
  const EDIT_DELETE = 3;

  function ArraySplice() {}

  ArraySplice.prototype = {
    calcEditDistances: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
      let rowCount = oldEnd - oldStart + 1;
      let columnCount = currentEnd - currentStart + 1;
      let distances = new Array(rowCount);
      let north;
      let west;

      for (let i = 0; i < rowCount; ++i) {
        distances[i] = new Array(columnCount);
        distances[i][0] = i;
      }

      for (let j = 0; j < columnCount; ++j) {
        distances[0][j] = j;
      }

      for (let i = 1; i < rowCount; ++i) {
        for (let j = 1; j < columnCount; ++j) {
          if (this.equals(current[currentStart + j - 1], old[oldStart + i - 1])) {
            distances[i][j] = distances[i - 1][j - 1];
          } else {
            north = distances[i - 1][j] + 1;
            west = distances[i][j - 1] + 1;
            distances[i][j] = north < west ? north : west;
          }
        }
      }

      return distances;
    },
    spliceOperationsFromEditDistances: function (distances) {
      let i = distances.length - 1;
      let j = distances[0].length - 1;
      let current = distances[i][j];
      let edits = [];

      while (i > 0 || j > 0) {
        if (i === 0) {
          edits.push(EDIT_ADD);
          j--;
          continue;
        }

        if (j === 0) {
          edits.push(EDIT_DELETE);
          i--;
          continue;
        }

        let northWest = distances[i - 1][j - 1];
        let west = distances[i - 1][j];
        let north = distances[i][j - 1];
        let min;

        if (west < north) {
          min = west < northWest ? west : northWest;
        } else {
          min = north < northWest ? north : northWest;
        }

        if (min === northWest) {
          if (northWest === current) {
            edits.push(EDIT_LEAVE);
          } else {
            edits.push(EDIT_UPDATE);
            current = northWest;
          }

          i--;
          j--;
        } else if (min === west) {
          edits.push(EDIT_DELETE);
          i--;
          current = west;
        } else {
          edits.push(EDIT_ADD);
          j--;
          current = north;
        }
      }

      edits.reverse();
      return edits;
    },
    calcSplices: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
      let prefixCount = 0;
      let suffixCount = 0;
      let minLength = Math.min(currentEnd - currentStart, oldEnd - oldStart);

      if (currentStart === 0 && oldStart === 0) {
        prefixCount = this.sharedPrefix(current, old, minLength);
      }

      if (currentEnd === current.length && oldEnd === old.length) {
        suffixCount = this.sharedSuffix(current, old, minLength - prefixCount);
      }

      currentStart += prefixCount;
      oldStart += prefixCount;
      currentEnd -= suffixCount;
      oldEnd -= suffixCount;

      if (currentEnd - currentStart === 0 && oldEnd - oldStart === 0) {
        return [];
      }

      if (currentStart === currentEnd) {
        let splice = newSplice(currentStart, [], 0);

        while (oldStart < oldEnd) {
          splice.removed.push(old[oldStart++]);
        }

        return [splice];
      } else if (oldStart === oldEnd) {
        return [newSplice(currentStart, [], currentEnd - currentStart)];
      }

      let ops = this.spliceOperationsFromEditDistances(this.calcEditDistances(current, currentStart, currentEnd, old, oldStart, oldEnd));
      let splice = undefined;
      let splices = [];
      let index = currentStart;
      let oldIndex = oldStart;

      for (let i = 0; i < ops.length; ++i) {
        switch (ops[i]) {
          case EDIT_LEAVE:
            if (splice) {
              splices.push(splice);
              splice = undefined;
            }

            index++;
            oldIndex++;
            break;

          case EDIT_UPDATE:
            if (!splice) {
              splice = newSplice(index, [], 0);
            }

            splice.addedCount++;
            index++;
            splice.removed.push(old[oldIndex]);
            oldIndex++;
            break;

          case EDIT_ADD:
            if (!splice) {
              splice = newSplice(index, [], 0);
            }

            splice.addedCount++;
            index++;
            break;

          case EDIT_DELETE:
            if (!splice) {
              splice = newSplice(index, [], 0);
            }

            splice.removed.push(old[oldIndex]);
            oldIndex++;
            break;
        }
      }

      if (splice) {
        splices.push(splice);
      }

      return splices;
    },
    sharedPrefix: function (current, old, searchLength) {
      for (let i = 0; i < searchLength; ++i) {
        if (!this.equals(current[i], old[i])) {
          return i;
        }
      }

      return searchLength;
    },
    sharedSuffix: function (current, old, searchLength) {
      let index1 = current.length;
      let index2 = old.length;
      let count = 0;

      while (count < searchLength && this.equals(current[--index1], old[--index2])) {
        count++;
      }

      return count;
    },
    calculateSplices: function (current, previous) {
      return this.calcSplices(current, 0, current.length, previous, 0, previous.length);
    },
    equals: function (currentValue, previousValue) {
      return currentValue === previousValue;
    }
  };
  let arraySplice = new ArraySplice();

  function calcSplices(current, currentStart, currentEnd, old, oldStart, oldEnd) {
    return arraySplice.calcSplices(current, currentStart, currentEnd, old, oldStart, oldEnd);
  }

  function intersect(start1, end1, start2, end2) {
    if (end1 < start2 || end2 < start1) {
      return -1;
    }

    if (end1 === start2 || end2 === start1) {
      return 0;
    }

    if (start1 < start2) {
      if (end1 < end2) {
        return end1 - start2;
      }

      return end2 - start2;
    }

    if (end2 < end1) {
      return end2 - start1;
    }

    return end1 - start1;
  }

  function mergeSplice(splices, index, removed, addedCount) {
    let splice = newSplice(index, removed, addedCount);
    let inserted = false;
    let insertionOffset = 0;

    for (let i = 0; i < splices.length; i++) {
      let current = splices[i];
      current.index += insertionOffset;

      if (inserted) {
        continue;
      }

      let intersectCount = intersect(splice.index, splice.index + splice.removed.length, current.index, current.index + current.addedCount);

      if (intersectCount >= 0) {
        splices.splice(i, 1);
        i--;
        insertionOffset -= current.addedCount - current.removed.length;
        splice.addedCount += current.addedCount - intersectCount;
        let deleteCount = splice.removed.length + current.removed.length - intersectCount;

        if (!splice.addedCount && !deleteCount) {
          inserted = true;
        } else {
          let currentRemoved = current.removed;

          if (splice.index < current.index) {
            let prepend = splice.removed.slice(0, current.index - splice.index);
            Array.prototype.push.apply(prepend, currentRemoved);
            currentRemoved = prepend;
          }

          if (splice.index + splice.removed.length > current.index + current.addedCount) {
            let append = splice.removed.slice(current.index + current.addedCount - splice.index);
            Array.prototype.push.apply(currentRemoved, append);
          }

          splice.removed = currentRemoved;

          if (current.index < splice.index) {
            splice.index = current.index;
          }
        }
      } else if (splice.index < current.index) {
        inserted = true;
        splices.splice(i, 0, splice);
        i++;
        let offset = splice.addedCount - splice.removed.length;
        current.index += offset;
        insertionOffset += offset;
      }
    }

    if (!inserted) {
      splices.push(splice);
    }
  }

  function createInitialSplices(array, changeRecords) {
    let splices = [];

    for (let i = 0; i < changeRecords.length; i++) {
      let record = changeRecords[i];

      switch (record.type) {
        case 'splice':
          mergeSplice(splices, record.index, record.removed.slice(), record.addedCount);
          break;

        case 'add':
        case 'update':
        case 'delete':
          if (!isIndex(record.name)) {
            continue;
          }

          let index = toNumber(record.name);

          if (index < 0) {
            continue;
          }

          mergeSplice(splices, index, [record.oldValue], record.type === 'delete' ? 0 : 1);
          break;

        default:
          console.error('Unexpected record type: ' + JSON.stringify(record));
          break;
      }
    }

    return splices;
  }

  function projectArraySplices(array, changeRecords) {
    let splices = [];
    createInitialSplices(array, changeRecords).forEach(function (splice) {
      if (splice.addedCount === 1 && splice.removed.length === 1) {
        if (splice.removed[0] !== array[splice.index]) {
          splices.push(splice);
        }

        return;
      }

      splices = splices.concat(calcSplices(array, splice.index, splice.index + splice.addedCount, splice.removed, 0, splice.removed.length));
    });
    return splices;
  }

  function newRecord(type, object, key, oldValue) {
    return {
      type: type,
      object: object,
      key: key,
      oldValue: oldValue
    };
  }

  function getChangeRecords(map) {
    let entries = new Array(map.size);
    let keys = map.keys();
    let i = 0;
    let item;

    while (item = keys.next()) {
      if (item.done) {
        break;
      }

      entries[i] = newRecord('added', map, item.value);
      i++;
    }

    return entries;
  }

  let ModifyCollectionObserver = (_dec3 = subscriberCollection(), _dec3(_class2 = class ModifyCollectionObserver {
    constructor(taskQueue, collection) {
      this.taskQueue = taskQueue;
      this.queued = false;
      this.changeRecords = null;
      this.oldCollection = null;
      this.collection = collection;
      this.lengthPropertyName = collection instanceof Map || collection instanceof Set ? 'size' : 'length';
    }

    subscribe(context, callable) {
      this.addSubscriber(context, callable);
    }

    unsubscribe(context, callable) {
      this.removeSubscriber(context, callable);
    }

    addChangeRecord(changeRecord) {
      if (!this.hasSubscribers() && !this.lengthObserver) {
        return;
      }

      if (changeRecord.type === 'splice') {
        let index = changeRecord.index;
        let arrayLength = changeRecord.object.length;

        if (index > arrayLength) {
          index = arrayLength - changeRecord.addedCount;
        } else if (index < 0) {
          index = arrayLength + changeRecord.removed.length + index - changeRecord.addedCount;
        }

        if (index < 0) {
          index = 0;
        }

        changeRecord.index = index;
      }

      if (this.changeRecords === null) {
        this.changeRecords = [changeRecord];
      } else {
        this.changeRecords.push(changeRecord);
      }

      if (!this.queued) {
        this.queued = true;
        this.taskQueue.queueMicroTask(this);
      }
    }

    flushChangeRecords() {
      if (this.changeRecords && this.changeRecords.length || this.oldCollection) {
        this.call();
      }
    }

    reset(oldCollection) {
      this.oldCollection = oldCollection;

      if (this.hasSubscribers() && !this.queued) {
        this.queued = true;
        this.taskQueue.queueMicroTask(this);
      }
    }

    getLengthObserver() {
      return this.lengthObserver || (this.lengthObserver = new CollectionLengthObserver(this.collection));
    }

    call() {
      let changeRecords = this.changeRecords;
      let oldCollection = this.oldCollection;
      let records;
      this.queued = false;
      this.changeRecords = [];
      this.oldCollection = null;

      if (this.hasSubscribers()) {
        if (oldCollection) {
          if (this.collection instanceof Map || this.collection instanceof Set) {
            records = getChangeRecords(oldCollection);
          } else {
            records = calcSplices(this.collection, 0, this.collection.length, oldCollection, 0, oldCollection.length);
          }
        } else {
          if (this.collection instanceof Map || this.collection instanceof Set) {
            records = changeRecords;
          } else {
            records = projectArraySplices(this.collection, changeRecords);
          }
        }

        this.callSubscribers(records);
      }

      if (this.lengthObserver) {
        this.lengthObserver.call(this.collection[this.lengthPropertyName]);
      }
    }

  }) || _class2);
  _exports.ModifyCollectionObserver = ModifyCollectionObserver;
  let CollectionLengthObserver = (_dec4 = subscriberCollection(), _dec4(_class3 = class CollectionLengthObserver {
    constructor(collection) {
      this.collection = collection;
      this.lengthPropertyName = collection instanceof Map || collection instanceof Set ? 'size' : 'length';
      this.currentValue = collection[this.lengthPropertyName];
    }

    getValue() {
      return this.collection[this.lengthPropertyName];
    }

    setValue(newValue) {
      this.collection[this.lengthPropertyName] = newValue;
    }

    subscribe(context, callable) {
      this.addSubscriber(context, callable);
    }

    unsubscribe(context, callable) {
      this.removeSubscriber(context, callable);
    }

    call(newValue) {
      let oldValue = this.currentValue;
      this.callSubscribers(newValue, oldValue);
      this.currentValue = newValue;
    }

  }) || _class3);
  _exports.CollectionLengthObserver = CollectionLengthObserver;
  const arrayProto = Array.prototype;
  const pop = arrayProto.pop;
  const push = arrayProto.push;
  const reverse = arrayProto.reverse;
  const shift = arrayProto.shift;
  const sort = arrayProto.sort;
  const splice = arrayProto.splice;
  const unshift = arrayProto.unshift;

  if (arrayProto.__au_patched__) {
    LogManager.getLogger('array-observation').warn('Detected 2nd attempt of patching array from Aurelia binding.' + ' This is probably caused by dependency mismatch between core modules and a 3rd party plugin.' + ' Please see https://github.com/aurelia/cli/pull/906 if you are using webpack.');
  } else {
    Reflect.defineProperty(arrayProto, '__au_patched__', {
      value: 1
    });

    arrayProto.pop = function () {
      let notEmpty = this.length > 0;
      let methodCallResult = pop.apply(this, arguments);

      if (notEmpty && this.__array_observer__ !== undefined) {
        this.__array_observer__.addChangeRecord({
          type: 'delete',
          object: this,
          name: this.length,
          oldValue: methodCallResult
        });
      }

      return methodCallResult;
    };

    arrayProto.push = function () {
      let methodCallResult = push.apply(this, arguments);

      if (this.__array_observer__ !== undefined) {
        this.__array_observer__.addChangeRecord({
          type: 'splice',
          object: this,
          index: this.length - arguments.length,
          removed: [],
          addedCount: arguments.length
        });
      }

      return methodCallResult;
    };

    arrayProto.reverse = function () {
      let oldArray;

      if (this.__array_observer__ !== undefined) {
        this.__array_observer__.flushChangeRecords();

        oldArray = this.slice();
      }

      let methodCallResult = reverse.apply(this, arguments);

      if (this.__array_observer__ !== undefined) {
        this.__array_observer__.reset(oldArray);
      }

      return methodCallResult;
    };

    arrayProto.shift = function () {
      let notEmpty = this.length > 0;
      let methodCallResult = shift.apply(this, arguments);

      if (notEmpty && this.__array_observer__ !== undefined) {
        this.__array_observer__.addChangeRecord({
          type: 'delete',
          object: this,
          name: 0,
          oldValue: methodCallResult
        });
      }

      return methodCallResult;
    };

    arrayProto.sort = function () {
      let oldArray;

      if (this.__array_observer__ !== undefined) {
        this.__array_observer__.flushChangeRecords();

        oldArray = this.slice();
      }

      let methodCallResult = sort.apply(this, arguments);

      if (this.__array_observer__ !== undefined) {
        this.__array_observer__.reset(oldArray);
      }

      return methodCallResult;
    };

    arrayProto.splice = function () {
      let methodCallResult = splice.apply(this, arguments);

      if (this.__array_observer__ !== undefined) {
        this.__array_observer__.addChangeRecord({
          type: 'splice',
          object: this,
          index: +arguments[0],
          removed: methodCallResult,
          addedCount: arguments.length > 2 ? arguments.length - 2 : 0
        });
      }

      return methodCallResult;
    };

    arrayProto.unshift = function () {
      let methodCallResult = unshift.apply(this, arguments);

      if (this.__array_observer__ !== undefined) {
        this.__array_observer__.addChangeRecord({
          type: 'splice',
          object: this,
          index: 0,
          removed: [],
          addedCount: arguments.length
        });
      }

      return methodCallResult;
    };
  }

  function getArrayObserver(taskQueue, array) {
    return ModifyArrayObserver.for(taskQueue, array);
  }

  let ModifyArrayObserver = class ModifyArrayObserver extends ModifyCollectionObserver {
    constructor(taskQueue, array) {
      super(taskQueue, array);
    }

    static for(taskQueue, array) {
      if (!('__array_observer__' in array)) {
        Reflect.defineProperty(array, '__array_observer__', {
          value: ModifyArrayObserver.create(taskQueue, array),
          enumerable: false,
          configurable: false
        });
      }

      return array.__array_observer__;
    }

    static create(taskQueue, array) {
      return new ModifyArrayObserver(taskQueue, array);
    }

  };
  let Expression = class Expression {
    constructor() {
      this.isAssignable = false;
    }

    evaluate(scope, lookupFunctions, args) {
      throw new Error(`Binding expression "${this}" cannot be evaluated.`);
    }

    assign(scope, value, lookupFunctions) {
      throw new Error(`Binding expression "${this}" cannot be assigned to.`);
    }

    toString() {
      return typeof FEATURE_NO_UNPARSER === 'undefined' ? Unparser.unparse(this) : super.toString();
    }

  };
  _exports.Expression = Expression;
  let BindingBehavior = class BindingBehavior extends Expression {
    constructor(expression, name, args) {
      super();
      this.expression = expression;
      this.name = name;
      this.args = args;
    }

    evaluate(scope, lookupFunctions) {
      return this.expression.evaluate(scope, lookupFunctions);
    }

    assign(scope, value, lookupFunctions) {
      return this.expression.assign(scope, value, lookupFunctions);
    }

    accept(visitor) {
      return visitor.visitBindingBehavior(this);
    }

    connect(binding, scope) {
      this.expression.connect(binding, scope);
    }

    bind(binding, scope, lookupFunctions) {
      if (this.expression.expression && this.expression.bind) {
        this.expression.bind(binding, scope, lookupFunctions);
      }

      let behavior = lookupFunctions.bindingBehaviors(this.name);

      if (!behavior) {
        throw new Error(`No BindingBehavior named "${this.name}" was found!`);
      }

      let behaviorKey = `behavior-${this.name}`;

      if (binding[behaviorKey]) {
        throw new Error(`A binding behavior named "${this.name}" has already been applied to "${this.expression}"`);
      }

      binding[behaviorKey] = behavior;
      behavior.bind.apply(behavior, [binding, scope].concat(evalList(scope, this.args, binding.lookupFunctions)));
    }

    unbind(binding, scope) {
      let behaviorKey = `behavior-${this.name}`;
      binding[behaviorKey].unbind(binding, scope);
      binding[behaviorKey] = null;

      if (this.expression.expression && this.expression.unbind) {
        this.expression.unbind(binding, scope);
      }
    }

  };
  _exports.BindingBehavior = BindingBehavior;
  let ValueConverter = class ValueConverter extends Expression {
    constructor(expression, name, args) {
      super();
      this.expression = expression;
      this.name = name;
      this.args = args;
      this.allArgs = [expression].concat(args);
    }

    evaluate(scope, lookupFunctions) {
      let converter = lookupFunctions.valueConverters(this.name);

      if (!converter) {
        throw new Error(`No ValueConverter named "${this.name}" was found!`);
      }

      if ('toView' in converter) {
        return converter.toView.apply(converter, evalList(scope, this.allArgs, lookupFunctions));
      }

      return this.allArgs[0].evaluate(scope, lookupFunctions);
    }

    assign(scope, value, lookupFunctions) {
      let converter = lookupFunctions.valueConverters(this.name);

      if (!converter) {
        throw new Error(`No ValueConverter named "${this.name}" was found!`);
      }

      if ('fromView' in converter) {
        value = converter.fromView.apply(converter, [value].concat(evalList(scope, this.args, lookupFunctions)));
      }

      return this.allArgs[0].assign(scope, value, lookupFunctions);
    }

    accept(visitor) {
      return visitor.visitValueConverter(this);
    }

    connect(binding, scope) {
      let expressions = this.allArgs;
      let i = expressions.length;

      while (i--) {
        expressions[i].connect(binding, scope);
      }

      let converter = binding.lookupFunctions.valueConverters(this.name);

      if (!converter) {
        throw new Error(`No ValueConverter named "${this.name}" was found!`);
      }

      let signals = converter.signals;

      if (signals === undefined) {
        return;
      }

      i = signals.length;

      while (i--) {
        connectBindingToSignal(binding, signals[i]);
      }
    }

  };
  _exports.ValueConverter = ValueConverter;
  let Assign = class Assign extends Expression {
    constructor(target, value) {
      super();
      this.target = target;
      this.value = value;
      this.isAssignable = true;
    }

    evaluate(scope, lookupFunctions) {
      return this.target.assign(scope, this.value.evaluate(scope, lookupFunctions));
    }

    accept(vistor) {
      vistor.visitAssign(this);
    }

    connect(binding, scope) {}

    assign(scope, value) {
      this.value.assign(scope, value);
      this.target.assign(scope, value);
    }

  };
  _exports.Assign = Assign;
  let Conditional = class Conditional extends Expression {
    constructor(condition, yes, no) {
      super();
      this.condition = condition;
      this.yes = yes;
      this.no = no;
    }

    evaluate(scope, lookupFunctions) {
      return !!this.condition.evaluate(scope, lookupFunctions) ? this.yes.evaluate(scope, lookupFunctions) : this.no.evaluate(scope, lookupFunctions);
    }

    accept(visitor) {
      return visitor.visitConditional(this);
    }

    connect(binding, scope) {
      this.condition.connect(binding, scope);

      if (this.condition.evaluate(scope)) {
        this.yes.connect(binding, scope);
      } else {
        this.no.connect(binding, scope);
      }
    }

  };
  _exports.Conditional = Conditional;
  let AccessThis = class AccessThis extends Expression {
    constructor(ancestor) {
      super();
      this.ancestor = ancestor;
    }

    evaluate(scope, lookupFunctions) {
      let oc = scope.overrideContext;
      let i = this.ancestor;

      while (i-- && oc) {
        oc = oc.parentOverrideContext;
      }

      return i < 1 && oc ? oc.bindingContext : undefined;
    }

    accept(visitor) {
      return visitor.visitAccessThis(this);
    }

    connect(binding, scope) {}

  };
  _exports.AccessThis = AccessThis;
  let AccessScope = class AccessScope extends Expression {
    constructor(name, ancestor) {
      super();
      this.name = name;
      this.ancestor = ancestor;
      this.isAssignable = true;
    }

    evaluate(scope, lookupFunctions) {
      let context = getContextFor(this.name, scope, this.ancestor);
      return context[this.name];
    }

    assign(scope, value) {
      let context = getContextFor(this.name, scope, this.ancestor);
      return context ? context[this.name] = value : undefined;
    }

    accept(visitor) {
      return visitor.visitAccessScope(this);
    }

    connect(binding, scope) {
      let context = getContextFor(this.name, scope, this.ancestor);
      binding.observeProperty(context, this.name);
    }

  };
  _exports.AccessScope = AccessScope;
  let AccessMember = class AccessMember extends Expression {
    constructor(object, name) {
      super();
      this.object = object;
      this.name = name;
      this.isAssignable = true;
    }

    evaluate(scope, lookupFunctions) {
      let instance = this.object.evaluate(scope, lookupFunctions);
      return instance === null || instance === undefined ? instance : instance[this.name];
    }

    assign(scope, value) {
      let instance = this.object.evaluate(scope);

      if (instance === null || instance === undefined) {
        instance = {};
        this.object.assign(scope, instance);
      }

      instance[this.name] = value;
      return value;
    }

    accept(visitor) {
      return visitor.visitAccessMember(this);
    }

    connect(binding, scope) {
      this.object.connect(binding, scope);
      let obj = this.object.evaluate(scope);

      if (obj) {
        binding.observeProperty(obj, this.name);
      }
    }

  };
  _exports.AccessMember = AccessMember;
  let AccessKeyed = class AccessKeyed extends Expression {
    constructor(object, key) {
      super();
      this.object = object;
      this.key = key;
      this.isAssignable = true;
    }

    evaluate(scope, lookupFunctions) {
      let instance = this.object.evaluate(scope, lookupFunctions);
      let lookup = this.key.evaluate(scope, lookupFunctions);
      return getKeyed(instance, lookup);
    }

    assign(scope, value) {
      let instance = this.object.evaluate(scope);
      let lookup = this.key.evaluate(scope);
      return setKeyed(instance, lookup, value);
    }

    accept(visitor) {
      return visitor.visitAccessKeyed(this);
    }

    connect(binding, scope) {
      this.object.connect(binding, scope);
      let obj = this.object.evaluate(scope);

      if (obj instanceof Object) {
        this.key.connect(binding, scope);
        let key = this.key.evaluate(scope);

        if (key !== null && key !== undefined && !(Array.isArray(obj) && typeof key === 'number')) {
          binding.observeProperty(obj, key);
        }
      }
    }

  };
  _exports.AccessKeyed = AccessKeyed;
  let CallScope = class CallScope extends Expression {
    constructor(name, args, ancestor) {
      super();
      this.name = name;
      this.args = args;
      this.ancestor = ancestor;
    }

    evaluate(scope, lookupFunctions, mustEvaluate) {
      let args = evalList(scope, this.args, lookupFunctions);
      let context = getContextFor(this.name, scope, this.ancestor);
      let func = getFunction(context, this.name, mustEvaluate);

      if (func) {
        return func.apply(context, args);
      }

      return undefined;
    }

    accept(visitor) {
      return visitor.visitCallScope(this);
    }

    connect(binding, scope) {
      let args = this.args;
      let i = args.length;

      while (i--) {
        args[i].connect(binding, scope);
      }
    }

  };
  _exports.CallScope = CallScope;
  let CallMember = class CallMember extends Expression {
    constructor(object, name, args) {
      super();
      this.object = object;
      this.name = name;
      this.args = args;
    }

    evaluate(scope, lookupFunctions, mustEvaluate) {
      let instance = this.object.evaluate(scope, lookupFunctions);
      let args = evalList(scope, this.args, lookupFunctions);
      let func = getFunction(instance, this.name, mustEvaluate);

      if (func) {
        return func.apply(instance, args);
      }

      return undefined;
    }

    accept(visitor) {
      return visitor.visitCallMember(this);
    }

    connect(binding, scope) {
      this.object.connect(binding, scope);
      let obj = this.object.evaluate(scope);

      if (getFunction(obj, this.name, false)) {
        let args = this.args;
        let i = args.length;

        while (i--) {
          args[i].connect(binding, scope);
        }
      }
    }

  };
  _exports.CallMember = CallMember;
  let CallFunction = class CallFunction extends Expression {
    constructor(func, args) {
      super();
      this.func = func;
      this.args = args;
    }

    evaluate(scope, lookupFunctions, mustEvaluate) {
      let func = this.func.evaluate(scope, lookupFunctions);

      if (typeof func === 'function') {
        return func.apply(null, evalList(scope, this.args, lookupFunctions));
      }

      if (!mustEvaluate && (func === null || func === undefined)) {
        return undefined;
      }

      throw new Error(`${this.func} is not a function`);
    }

    accept(visitor) {
      return visitor.visitCallFunction(this);
    }

    connect(binding, scope) {
      this.func.connect(binding, scope);
      let func = this.func.evaluate(scope);

      if (typeof func === 'function') {
        let args = this.args;
        let i = args.length;

        while (i--) {
          args[i].connect(binding, scope);
        }
      }
    }

  };
  _exports.CallFunction = CallFunction;
  let Binary = class Binary extends Expression {
    constructor(operation, left, right) {
      super();
      this.operation = operation;
      this.left = left;
      this.right = right;
    }

    evaluate(scope, lookupFunctions) {
      let left = this.left.evaluate(scope, lookupFunctions);

      switch (this.operation) {
        case '&&':
          return left && this.right.evaluate(scope, lookupFunctions);

        case '||':
          return left || this.right.evaluate(scope, lookupFunctions);
      }

      let right = this.right.evaluate(scope, lookupFunctions);

      switch (this.operation) {
        case '==':
          return left == right;

        case '===':
          return left === right;

        case '!=':
          return left != right;

        case '!==':
          return left !== right;

        case 'instanceof':
          return typeof right === 'function' && left instanceof right;

        case 'in':
          return typeof right === 'object' && right !== null && left in right;
      }

      if (left === null || right === null || left === undefined || right === undefined) {
        switch (this.operation) {
          case '+':
            if (left !== null && left !== undefined) return left;
            if (right !== null && right !== undefined) return right;
            return 0;

          case '-':
            if (left !== null && left !== undefined) return left;
            if (right !== null && right !== undefined) return 0 - right;
            return 0;
        }

        return null;
      }

      switch (this.operation) {
        case '+':
          return autoConvertAdd(left, right);

        case '-':
          return left - right;

        case '*':
          return left * right;

        case '/':
          return left / right;

        case '%':
          return left % right;

        case '<':
          return left < right;

        case '>':
          return left > right;

        case '<=':
          return left <= right;

        case '>=':
          return left >= right;

        case '^':
          return left ^ right;
      }

      throw new Error(`Internal error [${this.operation}] not handled`);
    }

    accept(visitor) {
      return visitor.visitBinary(this);
    }

    connect(binding, scope) {
      this.left.connect(binding, scope);
      let left = this.left.evaluate(scope);

      if (this.operation === '&&' && !left || this.operation === '||' && left) {
        return;
      }

      this.right.connect(binding, scope);
    }

  };
  _exports.Binary = Binary;
  let Unary = class Unary extends Expression {
    constructor(operation, expression) {
      super();
      this.operation = operation;
      this.expression = expression;
    }

    evaluate(scope, lookupFunctions) {
      switch (this.operation) {
        case '!':
          return !this.expression.evaluate(scope, lookupFunctions);

        case 'typeof':
          return typeof this.expression.evaluate(scope, lookupFunctions);

        case 'void':
          return void this.expression.evaluate(scope, lookupFunctions);
      }

      throw new Error(`Internal error [${this.operation}] not handled`);
    }

    accept(visitor) {
      return visitor.visitPrefix(this);
    }

    connect(binding, scope) {
      this.expression.connect(binding, scope);
    }

  };
  _exports.Unary = Unary;
  let LiteralPrimitive = class LiteralPrimitive extends Expression {
    constructor(value) {
      super();
      this.value = value;
    }

    evaluate(scope, lookupFunctions) {
      return this.value;
    }

    accept(visitor) {
      return visitor.visitLiteralPrimitive(this);
    }

    connect(binding, scope) {}

  };
  _exports.LiteralPrimitive = LiteralPrimitive;
  let LiteralString = class LiteralString extends Expression {
    constructor(value) {
      super();
      this.value = value;
    }

    evaluate(scope, lookupFunctions) {
      return this.value;
    }

    accept(visitor) {
      return visitor.visitLiteralString(this);
    }

    connect(binding, scope) {}

  };
  _exports.LiteralString = LiteralString;
  let LiteralTemplate = class LiteralTemplate extends Expression {
    constructor(cooked, expressions, raw, tag) {
      super();
      this.cooked = cooked;
      this.expressions = expressions || [];
      this.length = this.expressions.length;
      this.tagged = tag !== undefined;

      if (this.tagged) {
        this.cooked.raw = raw;
        this.tag = tag;

        if (tag instanceof AccessScope) {
          this.contextType = 'Scope';
        } else if (tag instanceof AccessMember || tag instanceof AccessKeyed) {
          this.contextType = 'Object';
        } else {
          throw new Error(`${this.tag} is not a valid template tag`);
        }
      }
    }

    getScopeContext(scope, lookupFunctions) {
      return getContextFor(this.tag.name, scope, this.tag.ancestor);
    }

    getObjectContext(scope, lookupFunctions) {
      return this.tag.object.evaluate(scope, lookupFunctions);
    }

    evaluate(scope, lookupFunctions, mustEvaluate) {
      const results = new Array(this.length);

      for (let i = 0; i < this.length; i++) {
        results[i] = this.expressions[i].evaluate(scope, lookupFunctions);
      }

      if (this.tagged) {
        const func = this.tag.evaluate(scope, lookupFunctions);

        if (typeof func === 'function') {
          const context = this[`get${this.contextType}Context`](scope, lookupFunctions);
          return func.call(context, this.cooked, ...results);
        }

        if (!mustEvaluate) {
          return null;
        }

        throw new Error(`${this.tag} is not a function`);
      }

      let result = this.cooked[0];

      for (let i = 0; i < this.length; i++) {
        result = String.prototype.concat(result, results[i], this.cooked[i + 1]);
      }

      return result;
    }

    accept(visitor) {
      return visitor.visitLiteralTemplate(this);
    }

    connect(binding, scope) {
      for (let i = 0; i < this.length; i++) {
        this.expressions[i].connect(binding, scope);
      }

      if (this.tagged) {
        this.tag.connect(binding, scope);
      }
    }

  };
  _exports.LiteralTemplate = LiteralTemplate;
  let LiteralArray = class LiteralArray extends Expression {
    constructor(elements) {
      super();
      this.elements = elements;
    }

    evaluate(scope, lookupFunctions) {
      let elements = this.elements;
      let result = [];

      for (let i = 0, length = elements.length; i < length; ++i) {
        result[i] = elements[i].evaluate(scope, lookupFunctions);
      }

      return result;
    }

    accept(visitor) {
      return visitor.visitLiteralArray(this);
    }

    connect(binding, scope) {
      let length = this.elements.length;

      for (let i = 0; i < length; i++) {
        this.elements[i].connect(binding, scope);
      }
    }

  };
  _exports.LiteralArray = LiteralArray;
  let LiteralObject = class LiteralObject extends Expression {
    constructor(keys, values) {
      super();
      this.keys = keys;
      this.values = values;
    }

    evaluate(scope, lookupFunctions) {
      let instance = {};
      let keys = this.keys;
      let values = this.values;

      for (let i = 0, length = keys.length; i < length; ++i) {
        instance[keys[i]] = values[i].evaluate(scope, lookupFunctions);
      }

      return instance;
    }

    accept(visitor) {
      return visitor.visitLiteralObject(this);
    }

    connect(binding, scope) {
      let length = this.keys.length;

      for (let i = 0; i < length; i++) {
        this.values[i].connect(binding, scope);
      }
    }

  };
  _exports.LiteralObject = LiteralObject;

  function evalList(scope, list, lookupFunctions) {
    const length = list.length;
    const result = [];

    for (let i = 0; i < length; i++) {
      result[i] = list[i].evaluate(scope, lookupFunctions);
    }

    return result;
  }

  function autoConvertAdd(a, b) {
    if (a !== null && b !== null) {
      if (typeof a === 'string' && typeof b !== 'string') {
        return a + b.toString();
      }

      if (typeof a !== 'string' && typeof b === 'string') {
        return a.toString() + b;
      }

      return a + b;
    }

    if (a !== null) {
      return a;
    }

    if (b !== null) {
      return b;
    }

    return 0;
  }

  function getFunction(obj, name, mustExist) {
    let func = obj === null || obj === undefined ? null : obj[name];

    if (typeof func === 'function') {
      return func;
    }

    if (!mustExist && (func === null || func === undefined)) {
      return null;
    }

    throw new Error(`${name} is not a function`);
  }

  function getKeyed(obj, key) {
    if (Array.isArray(obj)) {
      return obj[parseInt(key, 10)];
    } else if (obj) {
      return obj[key];
    } else if (obj === null || obj === undefined) {
      return undefined;
    }

    return obj[key];
  }

  function setKeyed(obj, key, value) {
    if (Array.isArray(obj)) {
      let index = parseInt(key, 10);

      if (obj.length <= index) {
        obj.length = index + 1;
      }

      obj[index] = value;
    } else {
      obj[key] = value;
    }

    return value;
  }

  let Unparser = null;
  _exports.Unparser = Unparser;

  if (typeof FEATURE_NO_UNPARSER === 'undefined') {
    _exports.Unparser = Unparser = class {
      constructor(buffer) {
        this.buffer = buffer;
      }

      static unparse(expression) {
        let buffer = [];
        let visitor = new Unparser(buffer);
        expression.accept(visitor);
        return buffer.join('');
      }

      write(text) {
        this.buffer.push(text);
      }

      writeArgs(args) {
        this.write('(');

        for (let i = 0, length = args.length; i < length; ++i) {
          if (i !== 0) {
            this.write(',');
          }

          args[i].accept(this);
        }

        this.write(')');
      }

      visitBindingBehavior(behavior) {
        let args = behavior.args;
        behavior.expression.accept(this);
        this.write(`&${behavior.name}`);

        for (let i = 0, length = args.length; i < length; ++i) {
          this.write(':');
          args[i].accept(this);
        }
      }

      visitValueConverter(converter) {
        let args = converter.args;
        converter.expression.accept(this);
        this.write(`|${converter.name}`);

        for (let i = 0, length = args.length; i < length; ++i) {
          this.write(':');
          args[i].accept(this);
        }
      }

      visitAssign(assign) {
        assign.target.accept(this);
        this.write('=');
        assign.value.accept(this);
      }

      visitConditional(conditional) {
        conditional.condition.accept(this);
        this.write('?');
        conditional.yes.accept(this);
        this.write(':');
        conditional.no.accept(this);
      }

      visitAccessThis(access) {
        if (access.ancestor === 0) {
          this.write('$this');
          return;
        }

        this.write('$parent');
        let i = access.ancestor - 1;

        while (i--) {
          this.write('.$parent');
        }
      }

      visitAccessScope(access) {
        let i = access.ancestor;

        while (i--) {
          this.write('$parent.');
        }

        this.write(access.name);
      }

      visitAccessMember(access) {
        access.object.accept(this);
        this.write(`.${access.name}`);
      }

      visitAccessKeyed(access) {
        access.object.accept(this);
        this.write('[');
        access.key.accept(this);
        this.write(']');
      }

      visitCallScope(call) {
        let i = call.ancestor;

        while (i--) {
          this.write('$parent.');
        }

        this.write(call.name);
        this.writeArgs(call.args);
      }

      visitCallFunction(call) {
        call.func.accept(this);
        this.writeArgs(call.args);
      }

      visitCallMember(call) {
        call.object.accept(this);
        this.write(`.${call.name}`);
        this.writeArgs(call.args);
      }

      visitPrefix(prefix) {
        this.write(`(${prefix.operation}`);

        if (prefix.operation.charCodeAt(0) >= 97) {
          this.write(' ');
        }

        prefix.expression.accept(this);
        this.write(')');
      }

      visitBinary(binary) {
        binary.left.accept(this);

        if (binary.operation.charCodeAt(0) === 105) {
          this.write(` ${binary.operation} `);
        } else {
          this.write(binary.operation);
        }

        binary.right.accept(this);
      }

      visitLiteralPrimitive(literal) {
        this.write(`${literal.value}`);
      }

      visitLiteralArray(literal) {
        let elements = literal.elements;
        this.write('[');

        for (let i = 0, length = elements.length; i < length; ++i) {
          if (i !== 0) {
            this.write(',');
          }

          elements[i].accept(this);
        }

        this.write(']');
      }

      visitLiteralObject(literal) {
        let keys = literal.keys;
        let values = literal.values;
        this.write('{');

        for (let i = 0, length = keys.length; i < length; ++i) {
          if (i !== 0) {
            this.write(',');
          }

          this.write(`'${keys[i]}':`);
          values[i].accept(this);
        }

        this.write('}');
      }

      visitLiteralString(literal) {
        let escaped = literal.value.replace(/'/g, "\'");
        this.write(`'${escaped}'`);
      }

      visitLiteralTemplate(literal) {
        const {
          cooked,
          expressions
        } = literal;
        const length = expressions.length;
        this.write('`');
        this.write(cooked[0]);

        for (let i = 0; i < length; i++) {
          expressions[i].accept(this);
          this.write(cooked[i + 1]);
        }

        this.write('`');
      }

    };
  }

  let ExpressionCloner = class ExpressionCloner {
    cloneExpressionArray(array) {
      let clonedArray = [];
      let i = array.length;

      while (i--) {
        clonedArray[i] = array[i].accept(this);
      }

      return clonedArray;
    }

    visitBindingBehavior(behavior) {
      return new BindingBehavior(behavior.expression.accept(this), behavior.name, this.cloneExpressionArray(behavior.args));
    }

    visitValueConverter(converter) {
      return new ValueConverter(converter.expression.accept(this), converter.name, this.cloneExpressionArray(converter.args));
    }

    visitAssign(assign) {
      return new Assign(assign.target.accept(this), assign.value.accept(this));
    }

    visitConditional(conditional) {
      return new Conditional(conditional.condition.accept(this), conditional.yes.accept(this), conditional.no.accept(this));
    }

    visitAccessThis(access) {
      return new AccessThis(access.ancestor);
    }

    visitAccessScope(access) {
      return new AccessScope(access.name, access.ancestor);
    }

    visitAccessMember(access) {
      return new AccessMember(access.object.accept(this), access.name);
    }

    visitAccessKeyed(access) {
      return new AccessKeyed(access.object.accept(this), access.key.accept(this));
    }

    visitCallScope(call) {
      return new CallScope(call.name, this.cloneExpressionArray(call.args), call.ancestor);
    }

    visitCallFunction(call) {
      return new CallFunction(call.func.accept(this), this.cloneExpressionArray(call.args));
    }

    visitCallMember(call) {
      return new CallMember(call.object.accept(this), call.name, this.cloneExpressionArray(call.args));
    }

    visitUnary(unary) {
      return new Unary(prefix.operation, prefix.expression.accept(this));
    }

    visitBinary(binary) {
      return new Binary(binary.operation, binary.left.accept(this), binary.right.accept(this));
    }

    visitLiteralPrimitive(literal) {
      return new LiteralPrimitive(literal);
    }

    visitLiteralArray(literal) {
      return new LiteralArray(this.cloneExpressionArray(literal.elements));
    }

    visitLiteralObject(literal) {
      return new LiteralObject(literal.keys, this.cloneExpressionArray(literal.values));
    }

    visitLiteralString(literal) {
      return new LiteralString(literal.value);
    }

    visitLiteralTemplate(literal) {
      return new LiteralTemplate(literal.cooked, this.cloneExpressionArray(literal.expressions), literal.raw, literal.tag && literal.tag.accept(this));
    }

  };
  _exports.ExpressionCloner = ExpressionCloner;

  function cloneExpression(expression) {
    let visitor = new ExpressionCloner();
    return expression.accept(visitor);
  }

  const bindingMode = {
    oneTime: 0,
    toView: 1,
    oneWay: 1,
    twoWay: 2,
    fromView: 3
  };
  _exports.bindingMode = bindingMode;
  let Parser = class Parser {
    constructor() {
      this.cache = Object.create(null);
    }

    parse(src) {
      src = src || '';
      return this.cache[src] || (this.cache[src] = new ParserImplementation(src).parseBindingBehavior());
    }

  };
  _exports.Parser = Parser;
  const fromCharCode = String.fromCharCode;
  let ParserImplementation = class ParserImplementation {
    get raw() {
      return this.src.slice(this.start, this.idx);
    }

    constructor(src) {
      this.idx = 0;
      this.start = 0;
      this.src = src;
      this.len = src.length;
      this.tkn = T$EOF;
      this.val = undefined;
      this.ch = src.charCodeAt(0);
    }

    parseBindingBehavior() {
      this.nextToken();

      if (this.tkn & T$ExpressionTerminal) {
        this.err('Invalid start of expression');
      }

      let result = this.parseValueConverter();

      while (this.opt(T$Ampersand)) {
        result = new BindingBehavior(result, this.val, this.parseVariadicArgs());
      }

      if (this.tkn !== T$EOF) {
        this.err(`Unconsumed token ${this.raw}`);
      }

      return result;
    }

    parseValueConverter() {
      let result = this.parseExpression();

      while (this.opt(T$Bar)) {
        result = new ValueConverter(result, this.val, this.parseVariadicArgs());
      }

      return result;
    }

    parseVariadicArgs() {
      this.nextToken();
      const result = [];

      while (this.opt(T$Colon)) {
        result.push(this.parseExpression());
      }

      return result;
    }

    parseExpression() {
      let exprStart = this.idx;
      let result = this.parseConditional();

      while (this.tkn === T$Eq) {
        if (!result.isAssignable) {
          this.err(`Expression ${this.src.slice(exprStart, this.start)} is not assignable`);
        }

        this.nextToken();
        exprStart = this.idx;
        result = new Assign(result, this.parseConditional());
      }

      return result;
    }

    parseConditional() {
      let result = this.parseBinary(0);

      if (this.opt(T$Question)) {
        let yes = this.parseExpression();
        this.expect(T$Colon);
        result = new Conditional(result, yes, this.parseExpression());
      }

      return result;
    }

    parseBinary(minPrecedence) {
      let left = this.parseLeftHandSide(0);

      while (this.tkn & T$BinaryOp) {
        const opToken = this.tkn;

        if ((opToken & T$Precedence) <= minPrecedence) {
          break;
        }

        this.nextToken();
        left = new Binary(TokenValues[opToken & T$TokenMask], left, this.parseBinary(opToken & T$Precedence));
      }

      return left;
    }

    parseLeftHandSide(context) {
      let result;

      primary: switch (this.tkn) {
        case T$Plus:
          this.nextToken();
          return this.parseLeftHandSide(0);

        case T$Minus:
          this.nextToken();
          return new Binary('-', new LiteralPrimitive(0), this.parseLeftHandSide(0));

        case T$Bang:
        case T$TypeofKeyword:
        case T$VoidKeyword:
          const op = TokenValues[this.tkn & T$TokenMask];
          this.nextToken();
          return new Unary(op, this.parseLeftHandSide(0));

        case T$ParentScope:
          {
            do {
              this.nextToken();
              context++;

              if (this.opt(T$Period)) {
                if (this.tkn === T$Period) {
                  this.err();
                }

                continue;
              } else if (this.tkn & T$AccessScopeTerminal) {
                result = new AccessThis(context & C$Ancestor);
                context = context & C$ShorthandProp | C$This;
                break primary;
              } else {
                this.err();
              }
            } while (this.tkn === T$ParentScope);
          }

        case T$Identifier:
          {
            result = new AccessScope(this.val, context & C$Ancestor);
            this.nextToken();
            context = context & C$ShorthandProp | C$Scope;
            break;
          }

        case T$ThisScope:
          this.nextToken();
          result = new AccessThis(0);
          context = context & C$ShorthandProp | C$This;
          break;

        case T$LParen:
          this.nextToken();
          result = this.parseExpression();
          this.expect(T$RParen);
          context = C$Primary;
          break;

        case T$LBracket:
          {
            this.nextToken();
            const elements = [];

            if (this.tkn !== T$RBracket) {
              do {
                elements.push(this.parseExpression());
              } while (this.opt(T$Comma));
            }

            this.expect(T$RBracket);
            result = new LiteralArray(elements);
            context = C$Primary;
            break;
          }

        case T$LBrace:
          {
            const keys = [];
            const values = [];
            this.nextToken();

            while (this.tkn !== T$RBrace) {
              if (this.tkn & T$IdentifierOrKeyword) {
                const {
                  ch,
                  tkn,
                  idx
                } = this;
                keys.push(this.val);
                this.nextToken();

                if (this.opt(T$Colon)) {
                  values.push(this.parseExpression());
                } else {
                  this.ch = ch;
                  this.tkn = tkn;
                  this.idx = idx;
                  values.push(this.parseLeftHandSide(C$ShorthandProp));
                }
              } else if (this.tkn & T$Literal) {
                keys.push(this.val);
                this.nextToken();
                this.expect(T$Colon);
                values.push(this.parseExpression());
              } else {
                this.err();
              }

              if (this.tkn !== T$RBrace) {
                this.expect(T$Comma);
              }
            }

            this.expect(T$RBrace);
            result = new LiteralObject(keys, values);
            context = C$Primary;
            break;
          }

        case T$StringLiteral:
          result = new LiteralString(this.val);
          this.nextToken();
          context = C$Primary;
          break;

        case T$TemplateTail:
          result = new LiteralTemplate([this.val]);
          this.nextToken();
          context = C$Primary;
          break;

        case T$TemplateContinuation:
          result = this.parseTemplate(0);
          context = C$Primary;
          break;

        case T$NumericLiteral:
          {
            result = new LiteralPrimitive(this.val);
            this.nextToken();
            break;
          }

        case T$NullKeyword:
        case T$UndefinedKeyword:
        case T$TrueKeyword:
        case T$FalseKeyword:
          result = new LiteralPrimitive(TokenValues[this.tkn & T$TokenMask]);
          this.nextToken();
          context = C$Primary;
          break;

        default:
          if (this.idx >= this.len) {
            this.err('Unexpected end of expression');
          } else {
            this.err();
          }

      }

      if (context & C$ShorthandProp) {
        return result;
      }

      let name = this.val;

      while (this.tkn & T$MemberOrCallExpression) {
        switch (this.tkn) {
          case T$Period:
            this.nextToken();

            if (!(this.tkn & T$IdentifierOrKeyword)) {
              this.err();
            }

            name = this.val;
            this.nextToken();
            context = context & C$Primary | (context & (C$This | C$Scope)) << 1 | context & C$Member | (context & C$Keyed) >> 1 | (context & C$Call) >> 2;

            if (this.tkn === T$LParen) {
              continue;
            }

            if (context & C$Scope) {
              result = new AccessScope(name, result.ancestor);
            } else {
              result = new AccessMember(result, name);
            }

            continue;

          case T$LBracket:
            this.nextToken();
            context = C$Keyed;
            result = new AccessKeyed(result, this.parseExpression());
            this.expect(T$RBracket);
            break;

          case T$LParen:
            this.nextToken();
            const args = [];

            while (this.tkn !== T$RParen) {
              args.push(this.parseExpression());

              if (!this.opt(T$Comma)) {
                break;
              }
            }

            this.expect(T$RParen);

            if (context & C$Scope) {
              result = new CallScope(name, args, result.ancestor);
            } else if (context & (C$Member | C$Primary)) {
              result = new CallMember(result, name, args);
            } else {
              result = new CallFunction(result, args);
            }

            context = C$Call;
            break;

          case T$TemplateTail:
            result = new LiteralTemplate([this.val], [], [this.raw], result);
            this.nextToken();
            break;

          case T$TemplateContinuation:
            result = this.parseTemplate(context | C$Tagged, result);
        }
      }

      return result;
    }

    parseTemplate(context, func) {
      const cooked = [this.val];
      const raw = context & C$Tagged ? [this.raw] : undefined;
      this.expect(T$TemplateContinuation);
      const expressions = [this.parseExpression()];

      while ((this.tkn = this.scanTemplateTail()) !== T$TemplateTail) {
        cooked.push(this.val);

        if (context & C$Tagged) {
          raw.push(this.raw);
        }

        this.expect(T$TemplateContinuation);
        expressions.push(this.parseExpression());
      }

      cooked.push(this.val);

      if (context & C$Tagged) {
        raw.push(this.raw);
      }

      this.nextToken();
      return new LiteralTemplate(cooked, expressions, raw, func);
    }

    nextToken() {
      while (this.idx < this.len) {
        if (this.ch <= 0x20) {
          this.next();
          continue;
        }

        this.start = this.idx;

        if (this.ch === 0x24 || this.ch >= 0x61 && this.ch <= 0x7A) {
          this.tkn = this.scanIdentifier();
          return;
        }

        if ((this.tkn = CharScanners[this.ch](this)) !== null) {
          return;
        }
      }

      this.tkn = T$EOF;
    }

    next() {
      return this.ch = this.src.charCodeAt(++this.idx);
    }

    scanIdentifier() {
      while (AsciiIdParts.has(this.next()) || this.ch > 0x7F && IdParts[this.ch]) {}

      return KeywordLookup[this.val = this.raw] || T$Identifier;
    }

    scanNumber(isFloat) {
      if (isFloat) {
        this.val = 0;
      } else {
        this.val = this.ch - 0x30;

        while (this.next() <= 0x39 && this.ch >= 0x30) {
          this.val = this.val * 10 + this.ch - 0x30;
        }
      }

      if (isFloat || this.ch === 0x2E) {
        if (!isFloat) {
          this.next();
        }

        const start = this.idx;
        let value = this.ch - 0x30;

        while (this.next() <= 0x39 && this.ch >= 0x30) {
          value = value * 10 + this.ch - 0x30;
        }

        this.val = this.val + value / Math.pow(10, this.idx - start);
      }

      if (this.ch === 0x65 || this.ch === 0x45) {
        const start = this.idx;
        this.next();

        if (this.ch === 0x2D || this.ch === 0x2B) {
          this.next();
        }

        if (!(this.ch >= 0x30 && this.ch <= 0x39)) {
          this.idx = start;
          this.err('Invalid exponent');
        }

        while (this.next() <= 0x39 && this.ch >= 0x30) {}

        this.val = parseFloat(this.src.slice(this.start, this.idx));
      }

      return T$NumericLiteral;
    }

    scanString() {
      let quote = this.ch;
      this.next();
      let buffer;
      let marker = this.idx;

      while (this.ch !== quote) {
        if (this.ch === 0x5C) {
          if (!buffer) {
            buffer = [];
          }

          buffer.push(this.src.slice(marker, this.idx));
          this.next();
          let unescaped;

          if (this.ch === 0x75) {
            this.next();

            if (this.idx + 4 < this.len) {
              let hex = this.src.slice(this.idx, this.idx + 4);

              if (!/[A-Z0-9]{4}/i.test(hex)) {
                this.err(`Invalid unicode escape [\\u${hex}]`);
              }

              unescaped = parseInt(hex, 16);
              this.idx += 4;
              this.ch = this.src.charCodeAt(this.idx);
            } else {
              this.err();
            }
          } else {
            unescaped = unescape(this.ch);
            this.next();
          }

          buffer.push(fromCharCode(unescaped));
          marker = this.idx;
        } else if (this.ch === 0 || this.idx >= this.len) {
          this.err('Unterminated quote');
        } else {
          this.next();
        }
      }

      let last = this.src.slice(marker, this.idx);
      this.next();
      let unescaped = last;

      if (buffer !== null && buffer !== undefined) {
        buffer.push(last);
        unescaped = buffer.join('');
      }

      this.val = unescaped;
      return T$StringLiteral;
    }

    scanTemplate() {
      let tail = true;
      let result = '';

      while (this.next() !== 0x60) {
        if (this.ch === 0x24) {
          if (this.idx + 1 < this.len && this.src.charCodeAt(this.idx + 1) === 0x7B) {
            this.idx++;
            tail = false;
            break;
          } else {
            result += '$';
          }
        } else if (this.ch === 0x5C) {
          result += fromCharCode(unescape(this.next()));
        } else if (this.ch === 0 || this.idx >= this.len) {
          this.err('Unterminated template literal');
        } else {
          result += fromCharCode(this.ch);
        }
      }

      this.next();
      this.val = result;

      if (tail) {
        return T$TemplateTail;
      }

      return T$TemplateContinuation;
    }

    scanTemplateTail() {
      if (this.idx >= this.len) {
        this.err('Unterminated template');
      }

      this.idx--;
      return this.scanTemplate();
    }

    err(message = `Unexpected token ${this.raw}`, column = this.start) {
      throw new Error(`Parser Error: ${message} at column ${column} in expression [${this.src}]`);
    }

    opt(token) {
      if (this.tkn === token) {
        this.nextToken();
        return true;
      }

      return false;
    }

    expect(token) {
      if (this.tkn === token) {
        this.nextToken();
      } else {
        this.err(`Missing expected token ${TokenValues[token & T$TokenMask]}`, this.idx);
      }
    }

  };
  _exports.ParserImplementation = ParserImplementation;

  function unescape(code) {
    switch (code) {
      case 0x66:
        return 0xC;

      case 0x6E:
        return 0xA;

      case 0x72:
        return 0xD;

      case 0x74:
        return 0x9;

      case 0x76:
        return 0xB;

      default:
        return code;
    }
  }

  const C$This = 1 << 10;
  const C$Scope = 1 << 11;
  const C$Member = 1 << 12;
  const C$Keyed = 1 << 13;
  const C$Call = 1 << 14;
  const C$Primary = 1 << 15;
  const C$ShorthandProp = 1 << 16;
  const C$Tagged = 1 << 17;
  const C$Ancestor = (1 << 9) - 1;
  const T$TokenMask = (1 << 6) - 1;
  const T$PrecShift = 6;
  const T$Precedence = 7 << T$PrecShift;
  const T$ExpressionTerminal = 1 << 11;
  const T$ClosingToken = 1 << 12;
  const T$OpeningToken = 1 << 13;
  const T$AccessScopeTerminal = 1 << 14;
  const T$Keyword = 1 << 15;
  const T$EOF = 1 << 16 | T$AccessScopeTerminal | T$ExpressionTerminal;
  const T$Identifier = 1 << 17;
  const T$IdentifierOrKeyword = T$Identifier | T$Keyword;
  const T$Literal = 1 << 18;
  const T$NumericLiteral = 1 << 19 | T$Literal;
  const T$StringLiteral = 1 << 20 | T$Literal;
  const T$BinaryOp = 1 << 21;
  const T$UnaryOp = 1 << 22;
  const T$MemberExpression = 1 << 23;
  const T$MemberOrCallExpression = 1 << 24;
  const T$TemplateTail = 1 << 25 | T$MemberOrCallExpression;
  const T$TemplateContinuation = 1 << 26 | T$MemberOrCallExpression;
  const T$FalseKeyword = 0 | T$Keyword | T$Literal;
  const T$TrueKeyword = 1 | T$Keyword | T$Literal;
  const T$NullKeyword = 2 | T$Keyword | T$Literal;
  const T$UndefinedKeyword = 3 | T$Keyword | T$Literal;
  const T$ThisScope = 4 | T$IdentifierOrKeyword;
  const T$ParentScope = 5 | T$IdentifierOrKeyword;
  const T$LParen = 6 | T$OpeningToken | T$AccessScopeTerminal | T$MemberOrCallExpression;
  const T$LBrace = 7 | T$OpeningToken;
  const T$Period = 8 | T$MemberExpression | T$MemberOrCallExpression;
  const T$RBrace = 9 | T$AccessScopeTerminal | T$ClosingToken | T$ExpressionTerminal;
  const T$RParen = 10 | T$AccessScopeTerminal | T$ClosingToken | T$ExpressionTerminal;
  const T$Comma = 11 | T$AccessScopeTerminal;
  const T$LBracket = 12 | T$OpeningToken | T$AccessScopeTerminal | T$MemberExpression | T$MemberOrCallExpression;
  const T$RBracket = 13 | T$ClosingToken | T$ExpressionTerminal;
  const T$Colon = 14 | T$AccessScopeTerminal;
  const T$Question = 15;
  const T$Ampersand = 18 | T$AccessScopeTerminal;
  const T$Bar = 19 | T$AccessScopeTerminal;
  const T$BarBar = 20 | 1 << T$PrecShift | T$BinaryOp;
  const T$AmpersandAmpersand = 21 | 2 << T$PrecShift | T$BinaryOp;
  const T$Caret = 22 | 3 << T$PrecShift | T$BinaryOp;
  const T$EqEq = 23 | 4 << T$PrecShift | T$BinaryOp;
  const T$BangEq = 24 | 4 << T$PrecShift | T$BinaryOp;
  const T$EqEqEq = 25 | 4 << T$PrecShift | T$BinaryOp;
  const T$BangEqEq = 26 | 4 << T$PrecShift | T$BinaryOp;
  const T$Lt = 27 | 5 << T$PrecShift | T$BinaryOp;
  const T$Gt = 28 | 5 << T$PrecShift | T$BinaryOp;
  const T$LtEq = 29 | 5 << T$PrecShift | T$BinaryOp;
  const T$GtEq = 30 | 5 << T$PrecShift | T$BinaryOp;
  const T$InKeyword = 31 | 5 << T$PrecShift | T$BinaryOp | T$Keyword;
  const T$InstanceOfKeyword = 32 | 5 << T$PrecShift | T$BinaryOp | T$Keyword;
  const T$Plus = 33 | 6 << T$PrecShift | T$BinaryOp | T$UnaryOp;
  const T$Minus = 34 | 6 << T$PrecShift | T$BinaryOp | T$UnaryOp;
  const T$TypeofKeyword = 35 | T$UnaryOp | T$Keyword;
  const T$VoidKeyword = 36 | T$UnaryOp | T$Keyword;
  const T$Star = 37 | 7 << T$PrecShift | T$BinaryOp;
  const T$Percent = 38 | 7 << T$PrecShift | T$BinaryOp;
  const T$Slash = 39 | 7 << T$PrecShift | T$BinaryOp;
  const T$Eq = 40;
  const T$Bang = 41 | T$UnaryOp;
  const KeywordLookup = Object.create(null);
  KeywordLookup.true = T$TrueKeyword;
  KeywordLookup.null = T$NullKeyword;
  KeywordLookup.false = T$FalseKeyword;
  KeywordLookup.undefined = T$UndefinedKeyword;
  KeywordLookup.$this = T$ThisScope;
  KeywordLookup.$parent = T$ParentScope;
  KeywordLookup.in = T$InKeyword;
  KeywordLookup.instanceof = T$InstanceOfKeyword;
  KeywordLookup.typeof = T$TypeofKeyword;
  KeywordLookup.void = T$VoidKeyword;
  const TokenValues = [false, true, null, undefined, '$this', '$parent', '(', '{', '.', '}', ')', ',', '[', ']', ':', '?', '\'', '"', '&', '|', '||', '&&', '^', '==', '!=', '===', '!==', '<', '>', '<=', '>=', 'in', 'instanceof', '+', '-', 'typeof', 'void', '*', '%', '/', '=', '!'];
  const codes = {
    AsciiIdPart: [0x24, 0, 0x30, 0x3A, 0x41, 0x5B, 0x5F, 0, 0x61, 0x7B],
    IdStart: [0x24, 0, 0x41, 0x5B, 0x5F, 0, 0x61, 0x7B, 0xAA, 0, 0xBA, 0, 0xC0, 0xD7, 0xD8, 0xF7, 0xF8, 0x2B9, 0x2E0, 0x2E5, 0x1D00, 0x1D26, 0x1D2C, 0x1D5D, 0x1D62, 0x1D66, 0x1D6B, 0x1D78, 0x1D79, 0x1DBF, 0x1E00, 0x1F00, 0x2071, 0, 0x207F, 0, 0x2090, 0x209D, 0x212A, 0x212C, 0x2132, 0, 0x214E, 0, 0x2160, 0x2189, 0x2C60, 0x2C80, 0xA722, 0xA788, 0xA78B, 0xA7AF, 0xA7B0, 0xA7B8, 0xA7F7, 0xA800, 0xAB30, 0xAB5B, 0xAB5C, 0xAB65, 0xFB00, 0xFB07, 0xFF21, 0xFF3B, 0xFF41, 0xFF5B],
    Digit: [0x30, 0x3A],
    Skip: [0, 0x21, 0x7F, 0xA1]
  };

  function decompress(lookup, set, compressed, value) {
    let rangeCount = compressed.length;

    for (let i = 0; i < rangeCount; i += 2) {
      const start = compressed[i];
      let end = compressed[i + 1];
      end = end > 0 ? end : start + 1;

      if (lookup) {
        let j = start;

        while (j < end) {
          lookup[j] = value;
          j++;
        }
      }

      if (set) {
        for (let ch = start; ch < end; ch++) {
          set.add(ch);
        }
      }
    }
  }

  function returnToken(token) {
    return p => {
      p.next();
      return token;
    };
  }

  function unexpectedCharacter(p) {
    p.err(`Unexpected character [${fromCharCode(p.ch)}]`);
    return null;
  }

  const AsciiIdParts = new Set();
  decompress(null, AsciiIdParts, codes.AsciiIdPart, true);
  const IdParts = new Uint8Array(0xFFFF);
  decompress(IdParts, null, codes.IdStart, 1);
  decompress(IdParts, null, codes.Digit, 1);
  const CharScanners = new Array(0xFFFF);
  let ci = 0;

  while (ci < 0xFFFF) {
    CharScanners[ci] = unexpectedCharacter;
    ci++;
  }

  decompress(CharScanners, null, codes.Skip, p => {
    p.next();
    return null;
  });
  decompress(CharScanners, null, codes.IdStart, p => p.scanIdentifier());
  decompress(CharScanners, null, codes.Digit, p => p.scanNumber(false));

  CharScanners[0x22] = CharScanners[0x27] = p => {
    return p.scanString();
  };

  CharScanners[0x60] = p => {
    return p.scanTemplate();
  };

  CharScanners[0x21] = p => {
    if (p.next() !== 0x3D) {
      return T$Bang;
    }

    if (p.next() !== 0x3D) {
      return T$BangEq;
    }

    p.next();
    return T$BangEqEq;
  };

  CharScanners[0x3D] = p => {
    if (p.next() !== 0x3D) {
      return T$Eq;
    }

    if (p.next() !== 0x3D) {
      return T$EqEq;
    }

    p.next();
    return T$EqEqEq;
  };

  CharScanners[0x26] = p => {
    if (p.next() !== 0x26) {
      return T$Ampersand;
    }

    p.next();
    return T$AmpersandAmpersand;
  };

  CharScanners[0x7C] = p => {
    if (p.next() !== 0x7C) {
      return T$Bar;
    }

    p.next();
    return T$BarBar;
  };

  CharScanners[0x2E] = p => {
    if (p.next() <= 0x39 && p.ch >= 0x30) {
      return p.scanNumber(true);
    }

    return T$Period;
  };

  CharScanners[0x3C] = p => {
    if (p.next() !== 0x3D) {
      return T$Lt;
    }

    p.next();
    return T$LtEq;
  };

  CharScanners[0x3E] = p => {
    if (p.next() !== 0x3D) {
      return T$Gt;
    }

    p.next();
    return T$GtEq;
  };

  CharScanners[0x25] = returnToken(T$Percent);
  CharScanners[0x28] = returnToken(T$LParen);
  CharScanners[0x29] = returnToken(T$RParen);
  CharScanners[0x2A] = returnToken(T$Star);
  CharScanners[0x2B] = returnToken(T$Plus);
  CharScanners[0x2C] = returnToken(T$Comma);
  CharScanners[0x2D] = returnToken(T$Minus);
  CharScanners[0x2F] = returnToken(T$Slash);
  CharScanners[0x3A] = returnToken(T$Colon);
  CharScanners[0x3F] = returnToken(T$Question);
  CharScanners[0x5B] = returnToken(T$LBracket);
  CharScanners[0x5D] = returnToken(T$RBracket);
  CharScanners[0x5E] = returnToken(T$Caret);
  CharScanners[0x7B] = returnToken(T$LBrace);
  CharScanners[0x7D] = returnToken(T$RBrace);
  let mapProto = Map.prototype;

  function getMapObserver(taskQueue, map) {
    return ModifyMapObserver.for(taskQueue, map);
  }

  let ModifyMapObserver = class ModifyMapObserver extends ModifyCollectionObserver {
    constructor(taskQueue, map) {
      super(taskQueue, map);
    }

    static for(taskQueue, map) {
      if (!('__map_observer__' in map)) {
        Reflect.defineProperty(map, '__map_observer__', {
          value: ModifyMapObserver.create(taskQueue, map),
          enumerable: false,
          configurable: false
        });
      }

      return map.__map_observer__;
    }

    static create(taskQueue, map) {
      let observer = new ModifyMapObserver(taskQueue, map);
      let proto = mapProto;

      if (proto.set !== map.set || proto.delete !== map.delete || proto.clear !== map.clear) {
        proto = {
          set: map.set,
          delete: map.delete,
          clear: map.clear
        };
      }

      map.set = function () {
        let hasValue = map.has(arguments[0]);
        let type = hasValue ? 'update' : 'add';
        let oldValue = map.get(arguments[0]);
        let methodCallResult = proto.set.apply(map, arguments);

        if (!hasValue || oldValue !== map.get(arguments[0])) {
          observer.addChangeRecord({
            type: type,
            object: map,
            key: arguments[0],
            oldValue: oldValue
          });
        }

        return methodCallResult;
      };

      map.delete = function () {
        let hasValue = map.has(arguments[0]);
        let oldValue = map.get(arguments[0]);
        let methodCallResult = proto.delete.apply(map, arguments);

        if (hasValue) {
          observer.addChangeRecord({
            type: 'delete',
            object: map,
            key: arguments[0],
            oldValue: oldValue
          });
        }

        return methodCallResult;
      };

      map.clear = function () {
        let methodCallResult = proto.clear.apply(map, arguments);
        observer.addChangeRecord({
          type: 'clear',
          object: map
        });
        return methodCallResult;
      };

      return observer;
    }

  };

  function findOriginalEventTarget(event) {
    return event.path && event.path[0] || event.deepPath && event.deepPath[0] || event.target;
  }

  function stopPropagation() {
    this.standardStopPropagation();
    this.propagationStopped = true;
  }

  function handleCapturedEvent(event) {
    event.propagationStopped = false;
    let target = findOriginalEventTarget(event);
    let orderedCallbacks = [];

    while (target) {
      if (target.capturedCallbacks) {
        let callback = target.capturedCallbacks[event.type];

        if (callback) {
          if (event.stopPropagation !== stopPropagation) {
            event.standardStopPropagation = event.stopPropagation;
            event.stopPropagation = stopPropagation;
          }

          orderedCallbacks.push(callback);
        }
      }

      target = target.parentNode;
    }

    for (let i = orderedCallbacks.length - 1; i >= 0 && !event.propagationStopped; i--) {
      let orderedCallback = orderedCallbacks[i];

      if ('handleEvent' in orderedCallback) {
        orderedCallback.handleEvent(event);
      } else {
        orderedCallback(event);
      }
    }
  }

  let CapturedHandlerEntry = class CapturedHandlerEntry {
    constructor(eventName) {
      this.eventName = eventName;
      this.count = 0;
    }

    increment() {
      this.count++;

      if (this.count === 1) {
        _aureliaPal.DOM.addEventListener(this.eventName, handleCapturedEvent, true);
      }
    }

    decrement() {
      this.count--;

      if (this.count === 0) {
        _aureliaPal.DOM.removeEventListener(this.eventName, handleCapturedEvent, true);
      }
    }

  };

  function handleDelegatedEvent(event) {
    event.propagationStopped = false;
    let target = findOriginalEventTarget(event);

    while (target && !event.propagationStopped) {
      if (target.delegatedCallbacks) {
        let callback = target.delegatedCallbacks[event.type];

        if (callback) {
          if (event.stopPropagation !== stopPropagation) {
            event.standardStopPropagation = event.stopPropagation;
            event.stopPropagation = stopPropagation;
          }

          if ('handleEvent' in callback) {
            callback.handleEvent(event);
          } else {
            callback(event);
          }
        }
      }

      target = target.parentNode;
    }
  }

  let DelegateHandlerEntry = class DelegateHandlerEntry {
    constructor(eventName) {
      this.eventName = eventName;
      this.count = 0;
    }

    increment() {
      this.count++;

      if (this.count === 1) {
        _aureliaPal.DOM.addEventListener(this.eventName, handleDelegatedEvent, false);
      }
    }

    decrement() {
      this.count--;

      if (this.count === 0) {
        _aureliaPal.DOM.removeEventListener(this.eventName, handleDelegatedEvent, false);
      }
    }

  };
  let DelegationEntryHandler = class DelegationEntryHandler {
    constructor(entry, lookup, targetEvent) {
      this.entry = entry;
      this.lookup = lookup;
      this.targetEvent = targetEvent;
    }

    dispose() {
      this.entry.decrement();
      this.lookup[this.targetEvent] = null;
    }

  };
  let EventHandler = class EventHandler {
    constructor(target, targetEvent, callback) {
      this.target = target;
      this.targetEvent = targetEvent;
      this.callback = callback;
    }

    dispose() {
      this.target.removeEventListener(this.targetEvent, this.callback);
    }

  };
  let DefaultEventStrategy = class DefaultEventStrategy {
    constructor() {
      this.delegatedHandlers = {};
      this.capturedHandlers = {};
    }

    subscribe(target, targetEvent, callback, strategy, disposable) {
      let delegatedHandlers;
      let capturedHandlers;
      let handlerEntry;

      if (strategy === delegationStrategy.bubbling) {
        delegatedHandlers = this.delegatedHandlers;
        handlerEntry = delegatedHandlers[targetEvent] || (delegatedHandlers[targetEvent] = new DelegateHandlerEntry(targetEvent));
        let delegatedCallbacks = target.delegatedCallbacks || (target.delegatedCallbacks = {});
        handlerEntry.increment();
        delegatedCallbacks[targetEvent] = callback;

        if (disposable === true) {
          return new DelegationEntryHandler(handlerEntry, delegatedCallbacks, targetEvent);
        }

        return function () {
          handlerEntry.decrement();
          delegatedCallbacks[targetEvent] = null;
        };
      }

      if (strategy === delegationStrategy.capturing) {
        capturedHandlers = this.capturedHandlers;
        handlerEntry = capturedHandlers[targetEvent] || (capturedHandlers[targetEvent] = new CapturedHandlerEntry(targetEvent));
        let capturedCallbacks = target.capturedCallbacks || (target.capturedCallbacks = {});
        handlerEntry.increment();
        capturedCallbacks[targetEvent] = callback;

        if (disposable === true) {
          return new DelegationEntryHandler(handlerEntry, capturedCallbacks, targetEvent);
        }

        return function () {
          handlerEntry.decrement();
          capturedCallbacks[targetEvent] = null;
        };
      }

      target.addEventListener(targetEvent, callback);

      if (disposable === true) {
        return new EventHandler(target, targetEvent, callback);
      }

      return function () {
        target.removeEventListener(targetEvent, callback);
      };
    }

  };
  const delegationStrategy = {
    none: 0,
    capturing: 1,
    bubbling: 2
  };
  _exports.delegationStrategy = delegationStrategy;
  let EventManager = class EventManager {
    constructor() {
      this.elementHandlerLookup = {};
      this.eventStrategyLookup = {};
      this.registerElementConfig({
        tagName: 'input',
        properties: {
          value: ['change', 'input'],
          checked: ['change', 'input'],
          files: ['change', 'input']
        }
      });
      this.registerElementConfig({
        tagName: 'textarea',
        properties: {
          value: ['change', 'input']
        }
      });
      this.registerElementConfig({
        tagName: 'select',
        properties: {
          value: ['change']
        }
      });
      this.registerElementConfig({
        tagName: 'content editable',
        properties: {
          value: ['change', 'input', 'blur', 'keyup', 'paste']
        }
      });
      this.registerElementConfig({
        tagName: 'scrollable element',
        properties: {
          scrollTop: ['scroll'],
          scrollLeft: ['scroll']
        }
      });
      this.defaultEventStrategy = new DefaultEventStrategy();
    }

    registerElementConfig(config) {
      let tagName = config.tagName.toLowerCase();
      let properties = config.properties;
      let propertyName;
      let lookup = this.elementHandlerLookup[tagName] = {};

      for (propertyName in properties) {
        if (properties.hasOwnProperty(propertyName)) {
          lookup[propertyName] = properties[propertyName];
        }
      }
    }

    registerEventStrategy(eventName, strategy) {
      this.eventStrategyLookup[eventName] = strategy;
    }

    getElementHandler(target, propertyName) {
      let tagName;
      let lookup = this.elementHandlerLookup;

      if (target.tagName) {
        tagName = target.tagName.toLowerCase();

        if (lookup[tagName] && lookup[tagName][propertyName]) {
          return new EventSubscriber(lookup[tagName][propertyName]);
        }

        if (propertyName === 'textContent' || propertyName === 'innerHTML') {
          return new EventSubscriber(lookup['content editable'].value);
        }

        if (propertyName === 'scrollTop' || propertyName === 'scrollLeft') {
          return new EventSubscriber(lookup['scrollable element'][propertyName]);
        }
      }

      return null;
    }

    addEventListener(target, targetEvent, callbackOrListener, delegate, disposable) {
      return (this.eventStrategyLookup[targetEvent] || this.defaultEventStrategy).subscribe(target, targetEvent, callbackOrListener, delegate, disposable);
    }

  };
  _exports.EventManager = EventManager;
  let EventSubscriber = class EventSubscriber {
    constructor(events) {
      this.events = events;
      this.element = null;
      this.handler = null;
    }

    subscribe(element, callbackOrListener) {
      this.element = element;
      this.handler = callbackOrListener;
      let events = this.events;

      for (let i = 0, ii = events.length; ii > i; ++i) {
        element.addEventListener(events[i], callbackOrListener);
      }
    }

    dispose() {
      if (this.element === null) {
        return;
      }

      let element = this.element;
      let callbackOrListener = this.handler;
      let events = this.events;

      for (let i = 0, ii = events.length; ii > i; ++i) {
        element.removeEventListener(events[i], callbackOrListener);
      }

      this.element = this.handler = null;
    }

  };
  _exports.EventSubscriber = EventSubscriber;
  let DirtyChecker = class DirtyChecker {
    constructor() {
      this.tracked = [];
      this.checkDelay = 120;
    }

    addProperty(property) {
      let tracked = this.tracked;
      tracked.push(property);

      if (tracked.length === 1) {
        this.scheduleDirtyCheck();
      }
    }

    removeProperty(property) {
      let tracked = this.tracked;
      tracked.splice(tracked.indexOf(property), 1);
    }

    scheduleDirtyCheck() {
      setTimeout(() => this.check(), this.checkDelay);
    }

    check() {
      let tracked = this.tracked;
      let i = tracked.length;

      while (i--) {
        let current = tracked[i];

        if (current.isDirty()) {
          current.call();
        }
      }

      if (tracked.length) {
        this.scheduleDirtyCheck();
      }
    }

  };
  _exports.DirtyChecker = DirtyChecker;
  let DirtyCheckProperty = (_dec5 = subscriberCollection(), _dec5(_class5 = class DirtyCheckProperty {
    constructor(dirtyChecker, obj, propertyName) {
      this.dirtyChecker = dirtyChecker;
      this.obj = obj;
      this.propertyName = propertyName;
    }

    getValue() {
      return this.obj[this.propertyName];
    }

    setValue(newValue) {
      this.obj[this.propertyName] = newValue;
    }

    call() {
      let oldValue = this.oldValue;
      let newValue = this.getValue();
      this.callSubscribers(newValue, oldValue);
      this.oldValue = newValue;
    }

    isDirty() {
      return this.oldValue !== this.obj[this.propertyName];
    }

    subscribe(context, callable) {
      if (!this.hasSubscribers()) {
        this.oldValue = this.getValue();
        this.dirtyChecker.addProperty(this);
      }

      this.addSubscriber(context, callable);
    }

    unsubscribe(context, callable) {
      if (this.removeSubscriber(context, callable) && !this.hasSubscribers()) {
        this.dirtyChecker.removeProperty(this);
      }
    }

  }) || _class5);
  _exports.DirtyCheckProperty = DirtyCheckProperty;
  const logger = LogManager.getLogger('property-observation');
  const propertyAccessor = {
    getValue: (obj, propertyName) => obj[propertyName],
    setValue: (value, obj, propertyName) => {
      obj[propertyName] = value;
    }
  };
  _exports.propertyAccessor = propertyAccessor;
  let PrimitiveObserver = class PrimitiveObserver {
    constructor(primitive, propertyName) {
      this.doNotCache = true;
      this.primitive = primitive;
      this.propertyName = propertyName;
    }

    getValue() {
      return this.primitive[this.propertyName];
    }

    setValue() {
      let type = typeof this.primitive;
      throw new Error(`The ${this.propertyName} property of a ${type} (${this.primitive}) cannot be assigned.`);
    }

    subscribe() {}

    unsubscribe() {}

  };
  _exports.PrimitiveObserver = PrimitiveObserver;
  let SetterObserver = (_dec6 = subscriberCollection(), _dec6(_class7 = class SetterObserver {
    constructor(taskQueue, obj, propertyName) {
      this.taskQueue = taskQueue;
      this.obj = obj;
      this.propertyName = propertyName;
      this.queued = false;
      this.observing = false;
    }

    getValue() {
      return this.obj[this.propertyName];
    }

    setValue(newValue) {
      this.obj[this.propertyName] = newValue;
    }

    getterValue() {
      return this.currentValue;
    }

    setterValue(newValue) {
      let oldValue = this.currentValue;

      if (oldValue !== newValue) {
        if (!this.queued) {
          this.oldValue = oldValue;
          this.queued = true;
          this.taskQueue.queueMicroTask(this);
        }

        this.currentValue = newValue;
      }
    }

    call() {
      let oldValue = this.oldValue;
      let newValue = this.currentValue;
      this.queued = false;
      this.callSubscribers(newValue, oldValue);
    }

    subscribe(context, callable) {
      if (!this.observing) {
        this.convertProperty();
      }

      this.addSubscriber(context, callable);
    }

    unsubscribe(context, callable) {
      this.removeSubscriber(context, callable);
    }

    convertProperty() {
      this.observing = true;
      this.currentValue = this.obj[this.propertyName];
      this.setValue = this.setterValue;
      this.getValue = this.getterValue;

      if (!Reflect.defineProperty(this.obj, this.propertyName, {
        configurable: true,
        enumerable: this.propertyName in this.obj ? this.obj.propertyIsEnumerable(this.propertyName) : true,
        get: this.getValue.bind(this),
        set: this.setValue.bind(this)
      })) {
        logger.warn(`Cannot observe property '${this.propertyName}' of object`, this.obj);
      }
    }

  }) || _class7);
  _exports.SetterObserver = SetterObserver;
  let XLinkAttributeObserver = class XLinkAttributeObserver {
    constructor(element, propertyName, attributeName) {
      this.element = element;
      this.propertyName = propertyName;
      this.attributeName = attributeName;
    }

    getValue() {
      return this.element.getAttributeNS('http://www.w3.org/1999/xlink', this.attributeName);
    }

    setValue(newValue) {
      return this.element.setAttributeNS('http://www.w3.org/1999/xlink', this.attributeName, newValue);
    }

    subscribe() {
      throw new Error(`Observation of a "${this.element.nodeName}" element\'s "${this.propertyName}" property is not supported.`);
    }

  };
  _exports.XLinkAttributeObserver = XLinkAttributeObserver;
  const dataAttributeAccessor = {
    getValue: (obj, propertyName) => obj.getAttribute(propertyName),
    setValue: (value, obj, propertyName) => {
      if (value === null || value === undefined) {
        obj.removeAttribute(propertyName);
      } else {
        obj.setAttribute(propertyName, value);
      }
    }
  };
  _exports.dataAttributeAccessor = dataAttributeAccessor;
  let DataAttributeObserver = class DataAttributeObserver {
    constructor(element, propertyName) {
      this.element = element;
      this.propertyName = propertyName;
    }

    getValue() {
      return this.element.getAttribute(this.propertyName);
    }

    setValue(newValue) {
      if (newValue === null || newValue === undefined) {
        return this.element.removeAttribute(this.propertyName);
      }

      return this.element.setAttribute(this.propertyName, newValue);
    }

    subscribe() {
      throw new Error(`Observation of a "${this.element.nodeName}" element\'s "${this.propertyName}" property is not supported.`);
    }

  };
  _exports.DataAttributeObserver = DataAttributeObserver;
  let StyleObserver = class StyleObserver {
    constructor(element, propertyName) {
      this.element = element;
      this.propertyName = propertyName;
      this.styles = null;
      this.version = 0;
    }

    getValue() {
      return this.element.style.cssText;
    }

    _setProperty(style, value) {
      let priority = '';

      if (value !== null && value !== undefined && typeof value.indexOf === 'function' && value.indexOf('!important') !== -1) {
        priority = 'important';
        value = value.replace('!important', '');
      }

      this.element.style.setProperty(style, value, priority);
    }

    setValue(newValue) {
      let styles = this.styles || {};
      let style;
      let version = this.version;

      if (newValue !== null && newValue !== undefined) {
        if (newValue instanceof Object) {
          let value;

          for (style in newValue) {
            if (newValue.hasOwnProperty(style)) {
              value = newValue[style];
              style = style.replace(/([A-Z])/g, m => '-' + m.toLowerCase());
              styles[style] = version;

              this._setProperty(style, value);
            }
          }
        } else if (newValue.length) {
          let rx = /\s*([\w\-]+)\s*:\s*((?:(?:[\w\-]+\(\s*(?:"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|[\w\-]+\(\s*(?:^"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|[^\)]*)\),?|[^\)]*)\),?|"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|[^;]*),?\s*)+);?/g;
          let pair;

          while ((pair = rx.exec(newValue)) !== null) {
            style = pair[1];

            if (!style) {
              continue;
            }

            styles[style] = version;

            this._setProperty(style, pair[2]);
          }
        }
      }

      this.styles = styles;
      this.version += 1;

      if (version === 0) {
        return;
      }

      version -= 1;

      for (style in styles) {
        if (!styles.hasOwnProperty(style) || styles[style] !== version) {
          continue;
        }

        this.element.style.removeProperty(style);
      }
    }

    subscribe() {
      throw new Error(`Observation of a "${this.element.nodeName}" element\'s "${this.propertyName}" property is not supported.`);
    }

  };
  _exports.StyleObserver = StyleObserver;
  let ValueAttributeObserver = (_dec7 = subscriberCollection(), _dec7(_class8 = class ValueAttributeObserver {
    constructor(element, propertyName, handler) {
      this.element = element;
      this.propertyName = propertyName;
      this.handler = handler;

      if (propertyName === 'files') {
        this.setValue = () => {};
      }
    }

    getValue() {
      return this.element[this.propertyName];
    }

    setValue(newValue) {
      newValue = newValue === undefined || newValue === null ? '' : newValue;

      if (this.element[this.propertyName] !== newValue) {
        this.element[this.propertyName] = newValue;
        this.notify();
      }
    }

    notify() {
      let oldValue = this.oldValue;
      let newValue = this.getValue();
      this.callSubscribers(newValue, oldValue);
      this.oldValue = newValue;
    }

    handleEvent() {
      this.notify();
    }

    subscribe(context, callable) {
      if (!this.hasSubscribers()) {
        this.oldValue = this.getValue();
        this.handler.subscribe(this.element, this);
      }

      this.addSubscriber(context, callable);
    }

    unsubscribe(context, callable) {
      if (this.removeSubscriber(context, callable) && !this.hasSubscribers()) {
        this.handler.dispose();
      }
    }

  }) || _class8);
  _exports.ValueAttributeObserver = ValueAttributeObserver;
  const checkedArrayContext = 'CheckedObserver:array';
  const checkedValueContext = 'CheckedObserver:value';
  let CheckedObserver = (_dec8 = subscriberCollection(), _dec8(_class9 = class CheckedObserver {
    constructor(element, handler, observerLocator) {
      this.element = element;
      this.handler = handler;
      this.observerLocator = observerLocator;
    }

    getValue() {
      return this.value;
    }

    setValue(newValue) {
      if (this.initialSync && this.value === newValue) {
        return;
      }

      if (this.arrayObserver) {
        this.arrayObserver.unsubscribe(checkedArrayContext, this);
        this.arrayObserver = null;
      }

      if (this.element.type === 'checkbox' && Array.isArray(newValue)) {
        this.arrayObserver = this.observerLocator.getArrayObserver(newValue);
        this.arrayObserver.subscribe(checkedArrayContext, this);
      }

      this.oldValue = this.value;
      this.value = newValue;
      this.synchronizeElement();
      this.notify();

      if (!this.initialSync) {
        this.initialSync = true;
        this.observerLocator.taskQueue.queueMicroTask(this);
      }
    }

    call(context, splices) {
      this.synchronizeElement();

      if (!this.valueObserver) {
        this.valueObserver = this.element.__observers__.model || this.element.__observers__.value;

        if (this.valueObserver) {
          this.valueObserver.subscribe(checkedValueContext, this);
        }
      }
    }

    synchronizeElement() {
      let value = this.value;
      let element = this.element;
      let elementValue = element.hasOwnProperty('model') ? element.model : element.value;
      let isRadio = element.type === 'radio';

      let matcher = element.matcher || ((a, b) => a === b);

      element.checked = isRadio && !!matcher(value, elementValue) || !isRadio && value === true || !isRadio && Array.isArray(value) && value.findIndex(item => !!matcher(item, elementValue)) !== -1;
    }

    synchronizeValue() {
      let value = this.value;
      let element = this.element;
      let elementValue = element.hasOwnProperty('model') ? element.model : element.value;
      let index;

      let matcher = element.matcher || ((a, b) => a === b);

      if (element.type === 'checkbox') {
        if (Array.isArray(value)) {
          index = value.findIndex(item => !!matcher(item, elementValue));

          if (element.checked && index === -1) {
            value.push(elementValue);
          } else if (!element.checked && index !== -1) {
            value.splice(index, 1);
          }

          return;
        }

        value = element.checked;
      } else if (element.checked) {
        value = elementValue;
      } else {
        return;
      }

      this.oldValue = this.value;
      this.value = value;
      this.notify();
    }

    notify() {
      let oldValue = this.oldValue;
      let newValue = this.value;

      if (newValue === oldValue) {
        return;
      }

      this.callSubscribers(newValue, oldValue);
    }

    handleEvent() {
      this.synchronizeValue();
    }

    subscribe(context, callable) {
      if (!this.hasSubscribers()) {
        this.handler.subscribe(this.element, this);
      }

      this.addSubscriber(context, callable);
    }

    unsubscribe(context, callable) {
      if (this.removeSubscriber(context, callable) && !this.hasSubscribers()) {
        this.handler.dispose();
      }
    }

    unbind() {
      if (this.arrayObserver) {
        this.arrayObserver.unsubscribe(checkedArrayContext, this);
        this.arrayObserver = null;
      }

      if (this.valueObserver) {
        this.valueObserver.unsubscribe(checkedValueContext, this);
      }
    }

  }) || _class9);
  _exports.CheckedObserver = CheckedObserver;
  const selectArrayContext = 'SelectValueObserver:array';
  let SelectValueObserver = (_dec9 = subscriberCollection(), _dec9(_class10 = class SelectValueObserver {
    constructor(element, handler, observerLocator) {
      this.element = element;
      this.handler = handler;
      this.observerLocator = observerLocator;
    }

    getValue() {
      return this.value;
    }

    setValue(newValue) {
      if (newValue !== null && newValue !== undefined && this.element.multiple && !Array.isArray(newValue)) {
        throw new Error('Only null or Array instances can be bound to a multi-select.');
      }

      if (this.value === newValue) {
        return;
      }

      if (this.arrayObserver) {
        this.arrayObserver.unsubscribe(selectArrayContext, this);
        this.arrayObserver = null;
      }

      if (Array.isArray(newValue)) {
        this.arrayObserver = this.observerLocator.getArrayObserver(newValue);
        this.arrayObserver.subscribe(selectArrayContext, this);
      }

      this.oldValue = this.value;
      this.value = newValue;
      this.synchronizeOptions();
      this.notify();

      if (!this.initialSync) {
        this.initialSync = true;
        this.observerLocator.taskQueue.queueMicroTask(this);
      }
    }

    call(context, splices) {
      this.synchronizeOptions();
    }

    synchronizeOptions() {
      let value = this.value;
      let isArray;

      if (Array.isArray(value)) {
        isArray = true;
      }

      let options = this.element.options;
      let i = options.length;

      let matcher = this.element.matcher || ((a, b) => a === b);

      while (i--) {
        let option = options.item(i);
        let optionValue = option.hasOwnProperty('model') ? option.model : option.value;

        if (isArray) {
          option.selected = value.findIndex(item => !!matcher(optionValue, item)) !== -1;
          continue;
        }

        option.selected = !!matcher(optionValue, value);
      }
    }

    synchronizeValue() {
      let options = this.element.options;
      let count = 0;
      let value = [];

      for (let i = 0, ii = options.length; i < ii; i++) {
        let option = options.item(i);

        if (!option.selected) {
          continue;
        }

        value.push(option.hasOwnProperty('model') ? option.model : option.value);
        count++;
      }

      if (this.element.multiple) {
        if (Array.isArray(this.value)) {
          let matcher = this.element.matcher || ((a, b) => a === b);

          let i = 0;

          while (i < this.value.length) {
            let a = this.value[i];

            if (value.findIndex(b => matcher(a, b)) === -1) {
              this.value.splice(i, 1);
            } else {
              i++;
            }
          }

          i = 0;

          while (i < value.length) {
            let a = value[i];

            if (this.value.findIndex(b => matcher(a, b)) === -1) {
              this.value.push(a);
            }

            i++;
          }

          return;
        }
      } else {
        if (count === 0) {
          value = null;
        } else {
          value = value[0];
        }
      }

      if (value !== this.value) {
        this.oldValue = this.value;
        this.value = value;
        this.notify();
      }
    }

    notify() {
      let oldValue = this.oldValue;
      let newValue = this.value;
      this.callSubscribers(newValue, oldValue);
    }

    handleEvent() {
      this.synchronizeValue();
    }

    subscribe(context, callable) {
      if (!this.hasSubscribers()) {
        this.handler.subscribe(this.element, this);
      }

      this.addSubscriber(context, callable);
    }

    unsubscribe(context, callable) {
      if (this.removeSubscriber(context, callable) && !this.hasSubscribers()) {
        this.handler.dispose();
      }
    }

    bind() {
      this.domObserver = _aureliaPal.DOM.createMutationObserver(() => {
        this.synchronizeOptions();
        this.synchronizeValue();
      });
      this.domObserver.observe(this.element, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }

    unbind() {
      this.domObserver.disconnect();
      this.domObserver = null;

      if (this.arrayObserver) {
        this.arrayObserver.unsubscribe(selectArrayContext, this);
        this.arrayObserver = null;
      }
    }

  }) || _class10);
  _exports.SelectValueObserver = SelectValueObserver;
  let ClassObserver = class ClassObserver {
    constructor(element) {
      this.element = element;
      this.doNotCache = true;
      this.value = '';
      this.version = 0;
    }

    getValue() {
      return this.value;
    }

    setValue(newValue) {
      let nameIndex = this.nameIndex || {};
      let version = this.version;
      let names;
      let name;

      if (newValue !== null && newValue !== undefined && newValue.length) {
        names = newValue.split(/\s+/);

        for (let i = 0, length = names.length; i < length; i++) {
          name = names[i];

          if (name === '') {
            continue;
          }

          nameIndex[name] = version;
          this.element.classList.add(name);
        }
      }

      this.value = newValue;
      this.nameIndex = nameIndex;
      this.version += 1;

      if (version === 0) {
        return;
      }

      version -= 1;

      for (name in nameIndex) {
        if (!nameIndex.hasOwnProperty(name) || nameIndex[name] !== version) {
          continue;
        }

        this.element.classList.remove(name);
      }
    }

    subscribe() {
      throw new Error(`Observation of a "${this.element.nodeName}" element\'s "class" property is not supported.`);
    }

  };
  _exports.ClassObserver = ClassObserver;

  function hasDeclaredDependencies(descriptor) {
    return !!(descriptor && descriptor.get && descriptor.get.dependencies);
  }

  function declarePropertyDependencies(ctor, propertyName, dependencies) {
    let descriptor = Object.getOwnPropertyDescriptor(ctor.prototype, propertyName);
    descriptor.get.dependencies = dependencies;
  }

  function computedFrom(...rest) {
    return function (target, key, descriptor) {
      descriptor.get.dependencies = rest;
      return descriptor;
    };
  }

  let ComputedExpression = class ComputedExpression extends Expression {
    constructor(name, dependencies) {
      super();
      this.name = name;
      this.dependencies = dependencies;
      this.isAssignable = true;
    }

    evaluate(scope, lookupFunctions) {
      return scope.bindingContext[this.name];
    }

    assign(scope, value) {
      scope.bindingContext[this.name] = value;
    }

    accept(visitor) {
      throw new Error('not implemented');
    }

    connect(binding, scope) {
      let dependencies = this.dependencies;
      let i = dependencies.length;

      while (i--) {
        dependencies[i].connect(binding, scope);
      }
    }

  };
  _exports.ComputedExpression = ComputedExpression;

  function createComputedObserver(obj, propertyName, descriptor, observerLocator) {
    let dependencies = descriptor.get.dependencies;

    if (!(dependencies instanceof ComputedExpression)) {
      let i = dependencies.length;

      while (i--) {
        dependencies[i] = observerLocator.parser.parse(dependencies[i]);
      }

      dependencies = descriptor.get.dependencies = new ComputedExpression(propertyName, dependencies);
    }

    let scope = {
      bindingContext: obj,
      overrideContext: createOverrideContext(obj)
    };
    return new ExpressionObserver(scope, dependencies, observerLocator);
  }

  let svgElements;
  let svgPresentationElements;
  let svgPresentationAttributes;
  let svgAnalyzer;

  if (typeof FEATURE_NO_SVG === 'undefined') {
    svgElements = {
      a: ['class', 'externalResourcesRequired', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'target', 'transform', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space'],
      altGlyph: ['class', 'dx', 'dy', 'externalResourcesRequired', 'format', 'glyphRef', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'rotate', 'style', 'systemLanguage', 'x', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      altGlyphDef: ['id', 'xml:base', 'xml:lang', 'xml:space'],
      altGlyphItem: ['id', 'xml:base', 'xml:lang', 'xml:space'],
      animate: ['accumulate', 'additive', 'attributeName', 'attributeType', 'begin', 'by', 'calcMode', 'dur', 'end', 'externalResourcesRequired', 'fill', 'from', 'id', 'keySplines', 'keyTimes', 'max', 'min', 'onbegin', 'onend', 'onload', 'onrepeat', 'repeatCount', 'repeatDur', 'requiredExtensions', 'requiredFeatures', 'restart', 'systemLanguage', 'to', 'values', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space'],
      animateColor: ['accumulate', 'additive', 'attributeName', 'attributeType', 'begin', 'by', 'calcMode', 'dur', 'end', 'externalResourcesRequired', 'fill', 'from', 'id', 'keySplines', 'keyTimes', 'max', 'min', 'onbegin', 'onend', 'onload', 'onrepeat', 'repeatCount', 'repeatDur', 'requiredExtensions', 'requiredFeatures', 'restart', 'systemLanguage', 'to', 'values', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space'],
      animateMotion: ['accumulate', 'additive', 'begin', 'by', 'calcMode', 'dur', 'end', 'externalResourcesRequired', 'fill', 'from', 'id', 'keyPoints', 'keySplines', 'keyTimes', 'max', 'min', 'onbegin', 'onend', 'onload', 'onrepeat', 'origin', 'path', 'repeatCount', 'repeatDur', 'requiredExtensions', 'requiredFeatures', 'restart', 'rotate', 'systemLanguage', 'to', 'values', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space'],
      animateTransform: ['accumulate', 'additive', 'attributeName', 'attributeType', 'begin', 'by', 'calcMode', 'dur', 'end', 'externalResourcesRequired', 'fill', 'from', 'id', 'keySplines', 'keyTimes', 'max', 'min', 'onbegin', 'onend', 'onload', 'onrepeat', 'repeatCount', 'repeatDur', 'requiredExtensions', 'requiredFeatures', 'restart', 'systemLanguage', 'to', 'type', 'values', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space'],
      circle: ['class', 'cx', 'cy', 'externalResourcesRequired', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'r', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'transform', 'xml:base', 'xml:lang', 'xml:space'],
      clipPath: ['class', 'clipPathUnits', 'externalResourcesRequired', 'id', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'transform', 'xml:base', 'xml:lang', 'xml:space'],
      'color-profile': ['id', 'local', 'name', 'rendering-intent', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space'],
      cursor: ['externalResourcesRequired', 'id', 'requiredExtensions', 'requiredFeatures', 'systemLanguage', 'x', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      defs: ['class', 'externalResourcesRequired', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'transform', 'xml:base', 'xml:lang', 'xml:space'],
      desc: ['class', 'id', 'style', 'xml:base', 'xml:lang', 'xml:space'],
      ellipse: ['class', 'cx', 'cy', 'externalResourcesRequired', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'rx', 'ry', 'style', 'systemLanguage', 'transform', 'xml:base', 'xml:lang', 'xml:space'],
      feBlend: ['class', 'height', 'id', 'in', 'in2', 'mode', 'result', 'style', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      feColorMatrix: ['class', 'height', 'id', 'in', 'result', 'style', 'type', 'values', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      feComponentTransfer: ['class', 'height', 'id', 'in', 'result', 'style', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      feComposite: ['class', 'height', 'id', 'in', 'in2', 'k1', 'k2', 'k3', 'k4', 'operator', 'result', 'style', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      feConvolveMatrix: ['bias', 'class', 'divisor', 'edgeMode', 'height', 'id', 'in', 'kernelMatrix', 'kernelUnitLength', 'order', 'preserveAlpha', 'result', 'style', 'targetX', 'targetY', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      feDiffuseLighting: ['class', 'diffuseConstant', 'height', 'id', 'in', 'kernelUnitLength', 'result', 'style', 'surfaceScale', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      feDisplacementMap: ['class', 'height', 'id', 'in', 'in2', 'result', 'scale', 'style', 'width', 'x', 'xChannelSelector', 'xml:base', 'xml:lang', 'xml:space', 'y', 'yChannelSelector'],
      feDistantLight: ['azimuth', 'elevation', 'id', 'xml:base', 'xml:lang', 'xml:space'],
      feFlood: ['class', 'height', 'id', 'result', 'style', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      feFuncA: ['amplitude', 'exponent', 'id', 'intercept', 'offset', 'slope', 'tableValues', 'type', 'xml:base', 'xml:lang', 'xml:space'],
      feFuncB: ['amplitude', 'exponent', 'id', 'intercept', 'offset', 'slope', 'tableValues', 'type', 'xml:base', 'xml:lang', 'xml:space'],
      feFuncG: ['amplitude', 'exponent', 'id', 'intercept', 'offset', 'slope', 'tableValues', 'type', 'xml:base', 'xml:lang', 'xml:space'],
      feFuncR: ['amplitude', 'exponent', 'id', 'intercept', 'offset', 'slope', 'tableValues', 'type', 'xml:base', 'xml:lang', 'xml:space'],
      feGaussianBlur: ['class', 'height', 'id', 'in', 'result', 'stdDeviation', 'style', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      feImage: ['class', 'externalResourcesRequired', 'height', 'id', 'preserveAspectRatio', 'result', 'style', 'width', 'x', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      feMerge: ['class', 'height', 'id', 'result', 'style', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      feMergeNode: ['id', 'xml:base', 'xml:lang', 'xml:space'],
      feMorphology: ['class', 'height', 'id', 'in', 'operator', 'radius', 'result', 'style', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      feOffset: ['class', 'dx', 'dy', 'height', 'id', 'in', 'result', 'style', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      fePointLight: ['id', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y', 'z'],
      feSpecularLighting: ['class', 'height', 'id', 'in', 'kernelUnitLength', 'result', 'specularConstant', 'specularExponent', 'style', 'surfaceScale', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      feSpotLight: ['id', 'limitingConeAngle', 'pointsAtX', 'pointsAtY', 'pointsAtZ', 'specularExponent', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y', 'z'],
      feTile: ['class', 'height', 'id', 'in', 'result', 'style', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      feTurbulence: ['baseFrequency', 'class', 'height', 'id', 'numOctaves', 'result', 'seed', 'stitchTiles', 'style', 'type', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      filter: ['class', 'externalResourcesRequired', 'filterRes', 'filterUnits', 'height', 'id', 'primitiveUnits', 'style', 'width', 'x', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      font: ['class', 'externalResourcesRequired', 'horiz-adv-x', 'horiz-origin-x', 'horiz-origin-y', 'id', 'style', 'vert-adv-y', 'vert-origin-x', 'vert-origin-y', 'xml:base', 'xml:lang', 'xml:space'],
      'font-face': ['accent-height', 'alphabetic', 'ascent', 'bbox', 'cap-height', 'descent', 'font-family', 'font-size', 'font-stretch', 'font-style', 'font-variant', 'font-weight', 'hanging', 'id', 'ideographic', 'mathematical', 'overline-position', 'overline-thickness', 'panose-1', 'slope', 'stemh', 'stemv', 'strikethrough-position', 'strikethrough-thickness', 'underline-position', 'underline-thickness', 'unicode-range', 'units-per-em', 'v-alphabetic', 'v-hanging', 'v-ideographic', 'v-mathematical', 'widths', 'x-height', 'xml:base', 'xml:lang', 'xml:space'],
      'font-face-format': ['id', 'string', 'xml:base', 'xml:lang', 'xml:space'],
      'font-face-name': ['id', 'name', 'xml:base', 'xml:lang', 'xml:space'],
      'font-face-src': ['id', 'xml:base', 'xml:lang', 'xml:space'],
      'font-face-uri': ['id', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space'],
      foreignObject: ['class', 'externalResourcesRequired', 'height', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'transform', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      g: ['class', 'externalResourcesRequired', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'transform', 'xml:base', 'xml:lang', 'xml:space'],
      glyph: ['arabic-form', 'class', 'd', 'glyph-name', 'horiz-adv-x', 'id', 'lang', 'orientation', 'style', 'unicode', 'vert-adv-y', 'vert-origin-x', 'vert-origin-y', 'xml:base', 'xml:lang', 'xml:space'],
      glyphRef: ['class', 'dx', 'dy', 'format', 'glyphRef', 'id', 'style', 'x', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      hkern: ['g1', 'g2', 'id', 'k', 'u1', 'u2', 'xml:base', 'xml:lang', 'xml:space'],
      image: ['class', 'externalResourcesRequired', 'height', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'preserveAspectRatio', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'transform', 'width', 'x', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      line: ['class', 'externalResourcesRequired', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'transform', 'x1', 'x2', 'xml:base', 'xml:lang', 'xml:space', 'y1', 'y2'],
      linearGradient: ['class', 'externalResourcesRequired', 'gradientTransform', 'gradientUnits', 'id', 'spreadMethod', 'style', 'x1', 'x2', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space', 'y1', 'y2'],
      marker: ['class', 'externalResourcesRequired', 'id', 'markerHeight', 'markerUnits', 'markerWidth', 'orient', 'preserveAspectRatio', 'refX', 'refY', 'style', 'viewBox', 'xml:base', 'xml:lang', 'xml:space'],
      mask: ['class', 'externalResourcesRequired', 'height', 'id', 'maskContentUnits', 'maskUnits', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      metadata: ['id', 'xml:base', 'xml:lang', 'xml:space'],
      'missing-glyph': ['class', 'd', 'horiz-adv-x', 'id', 'style', 'vert-adv-y', 'vert-origin-x', 'vert-origin-y', 'xml:base', 'xml:lang', 'xml:space'],
      mpath: ['externalResourcesRequired', 'id', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space'],
      path: ['class', 'd', 'externalResourcesRequired', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'pathLength', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'transform', 'xml:base', 'xml:lang', 'xml:space'],
      pattern: ['class', 'externalResourcesRequired', 'height', 'id', 'patternContentUnits', 'patternTransform', 'patternUnits', 'preserveAspectRatio', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'viewBox', 'width', 'x', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      polygon: ['class', 'externalResourcesRequired', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'points', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'transform', 'xml:base', 'xml:lang', 'xml:space'],
      polyline: ['class', 'externalResourcesRequired', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'points', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'transform', 'xml:base', 'xml:lang', 'xml:space'],
      radialGradient: ['class', 'cx', 'cy', 'externalResourcesRequired', 'fx', 'fy', 'gradientTransform', 'gradientUnits', 'id', 'r', 'spreadMethod', 'style', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space'],
      rect: ['class', 'externalResourcesRequired', 'height', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'rx', 'ry', 'style', 'systemLanguage', 'transform', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      script: ['externalResourcesRequired', 'id', 'type', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space'],
      set: ['attributeName', 'attributeType', 'begin', 'dur', 'end', 'externalResourcesRequired', 'fill', 'id', 'max', 'min', 'onbegin', 'onend', 'onload', 'onrepeat', 'repeatCount', 'repeatDur', 'requiredExtensions', 'requiredFeatures', 'restart', 'systemLanguage', 'to', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space'],
      stop: ['class', 'id', 'offset', 'style', 'xml:base', 'xml:lang', 'xml:space'],
      style: ['id', 'media', 'title', 'type', 'xml:base', 'xml:lang', 'xml:space'],
      svg: ['baseProfile', 'class', 'contentScriptType', 'contentStyleType', 'externalResourcesRequired', 'height', 'id', 'onabort', 'onactivate', 'onclick', 'onerror', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'onresize', 'onscroll', 'onunload', 'onzoom', 'preserveAspectRatio', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'version', 'viewBox', 'width', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y', 'zoomAndPan'],
      switch: ['class', 'externalResourcesRequired', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'transform', 'xml:base', 'xml:lang', 'xml:space'],
      symbol: ['class', 'externalResourcesRequired', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'preserveAspectRatio', 'style', 'viewBox', 'xml:base', 'xml:lang', 'xml:space'],
      text: ['class', 'dx', 'dy', 'externalResourcesRequired', 'id', 'lengthAdjust', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'rotate', 'style', 'systemLanguage', 'textLength', 'transform', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      textPath: ['class', 'externalResourcesRequired', 'id', 'lengthAdjust', 'method', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'spacing', 'startOffset', 'style', 'systemLanguage', 'textLength', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space'],
      title: ['class', 'id', 'style', 'xml:base', 'xml:lang', 'xml:space'],
      tref: ['class', 'dx', 'dy', 'externalResourcesRequired', 'id', 'lengthAdjust', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'rotate', 'style', 'systemLanguage', 'textLength', 'x', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      tspan: ['class', 'dx', 'dy', 'externalResourcesRequired', 'id', 'lengthAdjust', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'rotate', 'style', 'systemLanguage', 'textLength', 'x', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      use: ['class', 'externalResourcesRequired', 'height', 'id', 'onactivate', 'onclick', 'onfocusin', 'onfocusout', 'onload', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'requiredExtensions', 'requiredFeatures', 'style', 'systemLanguage', 'transform', 'width', 'x', 'xlink:actuate', 'xlink:arcrole', 'xlink:href', 'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:base', 'xml:lang', 'xml:space', 'y'],
      view: ['externalResourcesRequired', 'id', 'preserveAspectRatio', 'viewBox', 'viewTarget', 'xml:base', 'xml:lang', 'xml:space', 'zoomAndPan'],
      vkern: ['g1', 'g2', 'id', 'k', 'u1', 'u2', 'xml:base', 'xml:lang', 'xml:space']
    };
    svgPresentationElements = {
      'a': true,
      'altGlyph': true,
      'animate': true,
      'animateColor': true,
      'circle': true,
      'clipPath': true,
      'defs': true,
      'ellipse': true,
      'feBlend': true,
      'feColorMatrix': true,
      'feComponentTransfer': true,
      'feComposite': true,
      'feConvolveMatrix': true,
      'feDiffuseLighting': true,
      'feDisplacementMap': true,
      'feFlood': true,
      'feGaussianBlur': true,
      'feImage': true,
      'feMerge': true,
      'feMorphology': true,
      'feOffset': true,
      'feSpecularLighting': true,
      'feTile': true,
      'feTurbulence': true,
      'filter': true,
      'font': true,
      'foreignObject': true,
      'g': true,
      'glyph': true,
      'glyphRef': true,
      'image': true,
      'line': true,
      'linearGradient': true,
      'marker': true,
      'mask': true,
      'missing-glyph': true,
      'path': true,
      'pattern': true,
      'polygon': true,
      'polyline': true,
      'radialGradient': true,
      'rect': true,
      'stop': true,
      'svg': true,
      'switch': true,
      'symbol': true,
      'text': true,
      'textPath': true,
      'tref': true,
      'tspan': true,
      'use': true
    };
    svgPresentationAttributes = {
      'alignment-baseline': true,
      'baseline-shift': true,
      'clip-path': true,
      'clip-rule': true,
      'clip': true,
      'color-interpolation-filters': true,
      'color-interpolation': true,
      'color-profile': true,
      'color-rendering': true,
      'color': true,
      'cursor': true,
      'direction': true,
      'display': true,
      'dominant-baseline': true,
      'enable-background': true,
      'fill-opacity': true,
      'fill-rule': true,
      'fill': true,
      'filter': true,
      'flood-color': true,
      'flood-opacity': true,
      'font-family': true,
      'font-size-adjust': true,
      'font-size': true,
      'font-stretch': true,
      'font-style': true,
      'font-variant': true,
      'font-weight': true,
      'glyph-orientation-horizontal': true,
      'glyph-orientation-vertical': true,
      'image-rendering': true,
      'kerning': true,
      'letter-spacing': true,
      'lighting-color': true,
      'marker-end': true,
      'marker-mid': true,
      'marker-start': true,
      'mask': true,
      'opacity': true,
      'overflow': true,
      'pointer-events': true,
      'shape-rendering': true,
      'stop-color': true,
      'stop-opacity': true,
      'stroke-dasharray': true,
      'stroke-dashoffset': true,
      'stroke-linecap': true,
      'stroke-linejoin': true,
      'stroke-miterlimit': true,
      'stroke-opacity': true,
      'stroke-width': true,
      'stroke': true,
      'text-anchor': true,
      'text-decoration': true,
      'text-rendering': true,
      'unicode-bidi': true,
      'visibility': true,
      'word-spacing': true,
      'writing-mode': true
    };

    let createElement = function (html) {
      let div = _aureliaPal.DOM.createElement('div');

      div.innerHTML = html;
      return div.firstChild;
    };

    svgAnalyzer = class SVGAnalyzer {
      constructor() {
        if (createElement('<svg><altGlyph /></svg>').firstElementChild.nodeName === 'altglyph' && elements.altGlyph) {
          elements.altglyph = elements.altGlyph;
          delete elements.altGlyph;
          elements.altglyphdef = elements.altGlyphDef;
          delete elements.altGlyphDef;
          elements.altglyphitem = elements.altGlyphItem;
          delete elements.altGlyphItem;
          elements.glyphref = elements.glyphRef;
          delete elements.glyphRef;
        }
      }

      isStandardSvgAttribute(nodeName, attributeName) {
        return presentationElements[nodeName] && presentationAttributes[attributeName] || elements[nodeName] && elements[nodeName].indexOf(attributeName) !== -1;
      }

    };
  }

  const elements = svgElements;
  _exports.elements = elements;
  const presentationElements = svgPresentationElements;
  _exports.presentationElements = presentationElements;
  const presentationAttributes = svgPresentationAttributes;
  _exports.presentationAttributes = presentationAttributes;
  const SVGAnalyzer = svgAnalyzer || class {
    isStandardSvgAttribute() {
      return false;
    }

  };
  _exports.SVGAnalyzer = SVGAnalyzer;
  let ObserverLocator = (_temp = _class11 = class ObserverLocator {
    constructor(taskQueue, eventManager, dirtyChecker, svgAnalyzer, parser) {
      this.taskQueue = taskQueue;
      this.eventManager = eventManager;
      this.dirtyChecker = dirtyChecker;
      this.svgAnalyzer = svgAnalyzer;
      this.parser = parser;
      this.adapters = [];
      this.logger = LogManager.getLogger('observer-locator');
    }

    getObserver(obj, propertyName) {
      let observersLookup = obj.__observers__;
      let observer;

      if (observersLookup && propertyName in observersLookup) {
        return observersLookup[propertyName];
      }

      observer = this.createPropertyObserver(obj, propertyName);

      if (!observer.doNotCache) {
        if (observersLookup === undefined) {
          observersLookup = this.getOrCreateObserversLookup(obj);
        }

        observersLookup[propertyName] = observer;
      }

      return observer;
    }

    getOrCreateObserversLookup(obj) {
      return obj.__observers__ || this.createObserversLookup(obj);
    }

    createObserversLookup(obj) {
      let value = {};

      if (!Reflect.defineProperty(obj, '__observers__', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: value
      })) {
        this.logger.warn('Cannot add observers to object', obj);
      }

      return value;
    }

    addAdapter(adapter) {
      this.adapters.push(adapter);
    }

    getAdapterObserver(obj, propertyName, descriptor) {
      for (let i = 0, ii = this.adapters.length; i < ii; i++) {
        let adapter = this.adapters[i];
        let observer = adapter.getObserver(obj, propertyName, descriptor);

        if (observer) {
          return observer;
        }
      }

      return null;
    }

    createPropertyObserver(obj, propertyName) {
      let descriptor;
      let handler;
      let xlinkResult;

      if (!(obj instanceof Object)) {
        return new PrimitiveObserver(obj, propertyName);
      }

      if (obj instanceof _aureliaPal.DOM.Element) {
        if (propertyName === 'class') {
          return new ClassObserver(obj);
        }

        if (propertyName === 'style' || propertyName === 'css') {
          return new StyleObserver(obj, propertyName);
        }

        handler = this.eventManager.getElementHandler(obj, propertyName);

        if (propertyName === 'value' && obj.tagName.toLowerCase() === 'select') {
          return new SelectValueObserver(obj, handler, this);
        }

        if (propertyName === 'checked' && obj.tagName.toLowerCase() === 'input') {
          return new CheckedObserver(obj, handler, this);
        }

        if (handler) {
          return new ValueAttributeObserver(obj, propertyName, handler);
        }

        xlinkResult = /^xlink:(.+)$/.exec(propertyName);

        if (xlinkResult) {
          return new XLinkAttributeObserver(obj, propertyName, xlinkResult[1]);
        }

        if (propertyName === 'role' && (obj instanceof _aureliaPal.DOM.Element || obj instanceof _aureliaPal.DOM.SVGElement) || /^\w+:|^data-|^aria-/.test(propertyName) || obj instanceof _aureliaPal.DOM.SVGElement && this.svgAnalyzer.isStandardSvgAttribute(obj.nodeName, propertyName)) {
          return new DataAttributeObserver(obj, propertyName);
        }
      }

      descriptor = Object.getPropertyDescriptor(obj, propertyName);

      if (hasDeclaredDependencies(descriptor)) {
        return createComputedObserver(obj, propertyName, descriptor, this);
      }

      if (descriptor) {
        const existingGetterOrSetter = descriptor.get || descriptor.set;

        if (existingGetterOrSetter) {
          if (existingGetterOrSetter.getObserver) {
            return existingGetterOrSetter.getObserver(obj);
          }

          let adapterObserver = this.getAdapterObserver(obj, propertyName, descriptor);

          if (adapterObserver) {
            return adapterObserver;
          }

          return new DirtyCheckProperty(this.dirtyChecker, obj, propertyName);
        }
      }

      if (obj instanceof Array) {
        if (propertyName === 'length') {
          return this.getArrayObserver(obj).getLengthObserver();
        }

        return new DirtyCheckProperty(this.dirtyChecker, obj, propertyName);
      } else if (obj instanceof Map) {
        if (propertyName === 'size') {
          return this.getMapObserver(obj).getLengthObserver();
        }

        return new DirtyCheckProperty(this.dirtyChecker, obj, propertyName);
      } else if (obj instanceof Set) {
        if (propertyName === 'size') {
          return this.getSetObserver(obj).getLengthObserver();
        }

        return new DirtyCheckProperty(this.dirtyChecker, obj, propertyName);
      }

      return new SetterObserver(this.taskQueue, obj, propertyName);
    }

    getAccessor(obj, propertyName) {
      if (obj instanceof _aureliaPal.DOM.Element) {
        if (propertyName === 'class' || propertyName === 'style' || propertyName === 'css' || propertyName === 'value' && (obj.tagName.toLowerCase() === 'input' || obj.tagName.toLowerCase() === 'select') || propertyName === 'checked' && obj.tagName.toLowerCase() === 'input' || propertyName === 'model' && obj.tagName.toLowerCase() === 'input' || /^xlink:.+$/.exec(propertyName)) {
          return this.getObserver(obj, propertyName);
        }

        if (/^\w+:|^data-|^aria-/.test(propertyName) || obj instanceof _aureliaPal.DOM.SVGElement && this.svgAnalyzer.isStandardSvgAttribute(obj.nodeName, propertyName) || obj.tagName.toLowerCase() === 'img' && propertyName === 'src' || obj.tagName.toLowerCase() === 'a' && propertyName === 'href') {
          return dataAttributeAccessor;
        }
      }

      return propertyAccessor;
    }

    getArrayObserver(array) {
      return getArrayObserver(this.taskQueue, array);
    }

    getMapObserver(map) {
      return getMapObserver(this.taskQueue, map);
    }

    getSetObserver(set) {
      return getSetObserver(this.taskQueue, set);
    }

  }, _class11.inject = [_aureliaTaskQueue.TaskQueue, EventManager, DirtyChecker, SVGAnalyzer, Parser], _temp);
  _exports.ObserverLocator = ObserverLocator;
  let ObjectObservationAdapter = class ObjectObservationAdapter {
    getObserver(object, propertyName, descriptor) {
      throw new Error('BindingAdapters must implement getObserver(object, propertyName).');
    }

  };
  _exports.ObjectObservationAdapter = ObjectObservationAdapter;
  let BindingExpression = class BindingExpression {
    constructor(observerLocator, targetProperty, sourceExpression, mode, lookupFunctions, attribute) {
      this.observerLocator = observerLocator;
      this.targetProperty = targetProperty;
      this.sourceExpression = sourceExpression;
      this.mode = mode;
      this.lookupFunctions = lookupFunctions;
      this.attribute = attribute;
      this.discrete = false;
    }

    createBinding(target) {
      return new Binding(this.observerLocator, this.sourceExpression, target, this.targetProperty, this.mode, this.lookupFunctions);
    }

  };
  _exports.BindingExpression = BindingExpression;
  let Binding = (_dec10 = connectable(), _dec10(_class12 = class Binding {
    constructor(observerLocator, sourceExpression, target, targetProperty, mode, lookupFunctions) {
      this.observerLocator = observerLocator;
      this.sourceExpression = sourceExpression;
      this.target = target;
      this.targetProperty = targetProperty;
      this.mode = mode;
      this.lookupFunctions = lookupFunctions;
    }

    updateTarget(value) {
      this.targetObserver.setValue(value, this.target, this.targetProperty);
    }

    updateSource(value) {
      this.sourceExpression.assign(this.source, value, this.lookupFunctions);
    }

    call(context, newValue, oldValue) {
      if (!this.isBound) {
        return;
      }

      if (context === sourceContext) {
        oldValue = this.targetObserver.getValue(this.target, this.targetProperty);
        newValue = this.sourceExpression.evaluate(this.source, this.lookupFunctions);

        if (newValue !== oldValue) {
          this.updateTarget(newValue);
        }

        if (this.mode !== bindingMode.oneTime) {
          this._version++;
          this.sourceExpression.connect(this, this.source);
          this.unobserve(false);
        }

        return;
      }

      if (context === targetContext) {
        if (newValue !== this.sourceExpression.evaluate(this.source, this.lookupFunctions)) {
          this.updateSource(newValue);
        }

        return;
      }

      throw new Error(`Unexpected call context ${context}`);
    }

    bind(source) {
      if (this.isBound) {
        if (this.source === source) {
          return;
        }

        this.unbind();
      }

      this.isBound = true;
      this.source = source;

      if (this.sourceExpression.bind) {
        this.sourceExpression.bind(this, source, this.lookupFunctions);
      }

      let mode = this.mode;

      if (!this.targetObserver) {
        let method = mode === bindingMode.twoWay || mode === bindingMode.fromView ? 'getObserver' : 'getAccessor';
        this.targetObserver = this.observerLocator[method](this.target, this.targetProperty);
      }

      if ('bind' in this.targetObserver) {
        this.targetObserver.bind();
      }

      if (this.mode !== bindingMode.fromView) {
        let value = this.sourceExpression.evaluate(source, this.lookupFunctions);
        this.updateTarget(value);
      }

      if (mode === bindingMode.oneTime) {
        return;
      } else if (mode === bindingMode.toView) {
        enqueueBindingConnect(this);
      } else if (mode === bindingMode.twoWay) {
        this.sourceExpression.connect(this, source);
        this.targetObserver.subscribe(targetContext, this);
      } else if (mode === bindingMode.fromView) {
        this.targetObserver.subscribe(targetContext, this);
      }
    }

    unbind() {
      if (!this.isBound) {
        return;
      }

      this.isBound = false;

      if (this.sourceExpression.unbind) {
        this.sourceExpression.unbind(this, this.source);
      }

      this.source = null;

      if ('unbind' in this.targetObserver) {
        this.targetObserver.unbind();
      }

      if (this.targetObserver.unsubscribe) {
        this.targetObserver.unsubscribe(targetContext, this);
      }

      this.unobserve(true);
    }

    connect(evaluate) {
      if (!this.isBound) {
        return;
      }

      if (evaluate) {
        let value = this.sourceExpression.evaluate(this.source, this.lookupFunctions);
        this.updateTarget(value);
      }

      this.sourceExpression.connect(this, this.source);
    }

  }) || _class12);
  _exports.Binding = Binding;
  let CallExpression = class CallExpression {
    constructor(observerLocator, targetProperty, sourceExpression, lookupFunctions) {
      this.observerLocator = observerLocator;
      this.targetProperty = targetProperty;
      this.sourceExpression = sourceExpression;
      this.lookupFunctions = lookupFunctions;
    }

    createBinding(target) {
      return new Call(this.observerLocator, this.sourceExpression, target, this.targetProperty, this.lookupFunctions);
    }

  };
  _exports.CallExpression = CallExpression;
  let Call = class Call {
    constructor(observerLocator, sourceExpression, target, targetProperty, lookupFunctions) {
      this.sourceExpression = sourceExpression;
      this.target = target;
      this.targetProperty = observerLocator.getObserver(target, targetProperty);
      this.lookupFunctions = lookupFunctions;
    }

    callSource($event) {
      let overrideContext = this.source.overrideContext;
      Object.assign(overrideContext, $event);
      overrideContext.$event = $event;
      let mustEvaluate = true;
      let result = this.sourceExpression.evaluate(this.source, this.lookupFunctions, mustEvaluate);
      delete overrideContext.$event;

      for (let prop in $event) {
        delete overrideContext[prop];
      }

      return result;
    }

    bind(source) {
      if (this.isBound) {
        if (this.source === source) {
          return;
        }

        this.unbind();
      }

      this.isBound = true;
      this.source = source;

      if (this.sourceExpression.bind) {
        this.sourceExpression.bind(this, source, this.lookupFunctions);
      }

      this.targetProperty.setValue($event => this.callSource($event));
    }

    unbind() {
      if (!this.isBound) {
        return;
      }

      this.isBound = false;

      if (this.sourceExpression.unbind) {
        this.sourceExpression.unbind(this, this.source);
      }

      this.source = null;
      this.targetProperty.setValue(null);
    }

  };
  _exports.Call = Call;
  let ValueConverterResource = class ValueConverterResource {
    constructor(name) {
      this.name = name;
    }

    static convention(name) {
      if (name.endsWith('ValueConverter')) {
        return new ValueConverterResource(camelCase(name.substring(0, name.length - 14)));
      }
    }

    initialize(container, target) {
      this.instance = container.get(target);
    }

    register(registry, name) {
      registry.registerValueConverter(name || this.name, this.instance);
    }

    load(container, target) {}

  };
  _exports.ValueConverterResource = ValueConverterResource;

  function valueConverter(nameOrTarget) {
    if (nameOrTarget === undefined || typeof nameOrTarget === 'string') {
      return function (target) {
        _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, new ValueConverterResource(nameOrTarget), target);
      };
    }

    _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, new ValueConverterResource(), nameOrTarget);
  }

  let BindingBehaviorResource = class BindingBehaviorResource {
    constructor(name) {
      this.name = name;
    }

    static convention(name) {
      if (name.endsWith('BindingBehavior')) {
        return new BindingBehaviorResource(camelCase(name.substring(0, name.length - 15)));
      }
    }

    initialize(container, target) {
      this.instance = container.get(target);
    }

    register(registry, name) {
      registry.registerBindingBehavior(name || this.name, this.instance);
    }

    load(container, target) {}

  };
  _exports.BindingBehaviorResource = BindingBehaviorResource;

  function bindingBehavior(nameOrTarget) {
    if (nameOrTarget === undefined || typeof nameOrTarget === 'string') {
      return function (target) {
        _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, new BindingBehaviorResource(nameOrTarget), target);
      };
    }

    _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, new BindingBehaviorResource(), nameOrTarget);
  }

  let ListenerExpression = class ListenerExpression {
    constructor(eventManager, targetEvent, sourceExpression, delegationStrategy, preventDefault, lookupFunctions) {
      this.eventManager = eventManager;
      this.targetEvent = targetEvent;
      this.sourceExpression = sourceExpression;
      this.delegationStrategy = delegationStrategy;
      this.discrete = true;
      this.preventDefault = preventDefault;
      this.lookupFunctions = lookupFunctions;
    }

    createBinding(target) {
      return new Listener(this.eventManager, this.targetEvent, this.delegationStrategy, this.sourceExpression, target, this.preventDefault, this.lookupFunctions);
    }

  };
  _exports.ListenerExpression = ListenerExpression;
  let Listener = class Listener {
    constructor(eventManager, targetEvent, delegationStrategy, sourceExpression, target, preventDefault, lookupFunctions) {
      this.eventManager = eventManager;
      this.targetEvent = targetEvent;
      this.delegationStrategy = delegationStrategy;
      this.sourceExpression = sourceExpression;
      this.target = target;
      this.preventDefault = preventDefault;
      this.lookupFunctions = lookupFunctions;
    }

    callSource(event) {
      let overrideContext = this.source.overrideContext;
      overrideContext.$event = event;
      let mustEvaluate = true;
      let result = this.sourceExpression.evaluate(this.source, this.lookupFunctions, mustEvaluate);
      delete overrideContext.$event;

      if (result !== true && this.preventDefault) {
        event.preventDefault();
      }

      return result;
    }

    handleEvent(event) {
      this.callSource(event);
    }

    bind(source) {
      if (this.isBound) {
        if (this.source === source) {
          return;
        }

        this.unbind();
      }

      this.isBound = true;
      this.source = source;

      if (this.sourceExpression.bind) {
        this.sourceExpression.bind(this, source, this.lookupFunctions);
      }

      this._handler = this.eventManager.addEventListener(this.target, this.targetEvent, this, this.delegationStrategy, true);
    }

    unbind() {
      if (!this.isBound) {
        return;
      }

      this.isBound = false;

      if (this.sourceExpression.unbind) {
        this.sourceExpression.unbind(this, this.source);
      }

      this.source = null;

      this._handler.dispose();

      this._handler = null;
    }

  };
  _exports.Listener = Listener;

  function getAU(element) {
    let au = element.au;

    if (au === undefined) {
      throw new Error(`No Aurelia APIs are defined for the element: "${element.tagName}".`);
    }

    return au;
  }

  let NameExpression = class NameExpression {
    constructor(sourceExpression, apiName, lookupFunctions) {
      this.sourceExpression = sourceExpression;
      this.apiName = apiName;
      this.lookupFunctions = lookupFunctions;
      this.discrete = true;
    }

    createBinding(target) {
      return new NameBinder(this.sourceExpression, NameExpression.locateAPI(target, this.apiName), this.lookupFunctions);
    }

    static locateAPI(element, apiName) {
      switch (apiName) {
        case 'element':
          return element;

        case 'controller':
          return getAU(element).controller;

        case 'view-model':
          return getAU(element).controller.viewModel;

        case 'view':
          return getAU(element).controller.view;

        default:
          let target = getAU(element)[apiName];

          if (target === undefined) {
            throw new Error(`Attempted to reference "${apiName}", but it was not found amongst the target's API.`);
          }

          return target.viewModel;
      }
    }

  };
  _exports.NameExpression = NameExpression;
  let NameBinder = class NameBinder {
    constructor(sourceExpression, target, lookupFunctions) {
      this.sourceExpression = sourceExpression;
      this.target = target;
      this.lookupFunctions = lookupFunctions;
    }

    bind(source) {
      if (this.isBound) {
        if (this.source === source) {
          return;
        }

        this.unbind();
      }

      this.isBound = true;
      this.source = source;

      if (this.sourceExpression.bind) {
        this.sourceExpression.bind(this, source, this.lookupFunctions);
      }

      this.sourceExpression.assign(this.source, this.target, this.lookupFunctions);
    }

    unbind() {
      if (!this.isBound) {
        return;
      }

      this.isBound = false;

      if (this.sourceExpression.evaluate(this.source, this.lookupFunctions) === this.target) {
        this.sourceExpression.assign(this.source, null, this.lookupFunctions);
      }

      if (this.sourceExpression.unbind) {
        this.sourceExpression.unbind(this, this.source);
      }

      this.source = null;
    }

  };
  const LookupFunctions = {
    bindingBehaviors: name => null,
    valueConverters: name => null
  };
  let BindingEngine = (_temp2 = _class13 = class BindingEngine {
    constructor(observerLocator, parser) {
      this.observerLocator = observerLocator;
      this.parser = parser;
    }

    createBindingExpression(targetProperty, sourceExpression, mode = bindingMode.toView, lookupFunctions = LookupFunctions) {
      return new BindingExpression(this.observerLocator, targetProperty, this.parser.parse(sourceExpression), mode, lookupFunctions);
    }

    propertyObserver(obj, propertyName) {
      return {
        subscribe: callback => {
          let observer = this.observerLocator.getObserver(obj, propertyName);
          observer.subscribe(callback);
          return {
            dispose: () => observer.unsubscribe(callback)
          };
        }
      };
    }

    collectionObserver(collection) {
      return {
        subscribe: callback => {
          let observer;

          if (collection instanceof Array) {
            observer = this.observerLocator.getArrayObserver(collection);
          } else if (collection instanceof Map) {
            observer = this.observerLocator.getMapObserver(collection);
          } else if (collection instanceof Set) {
            observer = this.observerLocator.getSetObserver(collection);
          } else {
            throw new Error('collection must be an instance of Array, Map or Set.');
          }

          observer.subscribe(callback);
          return {
            dispose: () => observer.unsubscribe(callback)
          };
        }
      };
    }

    expressionObserver(bindingContext, expression) {
      let scope = {
        bindingContext,
        overrideContext: createOverrideContext(bindingContext)
      };
      return new ExpressionObserver(scope, this.parser.parse(expression), this.observerLocator, LookupFunctions);
    }

    parseExpression(expression) {
      return this.parser.parse(expression);
    }

    registerAdapter(adapter) {
      this.observerLocator.addAdapter(adapter);
    }

  }, _class13.inject = [ObserverLocator, Parser], _temp2);
  _exports.BindingEngine = BindingEngine;
  let setProto = Set.prototype;

  function getSetObserver(taskQueue, set) {
    return ModifySetObserver.for(taskQueue, set);
  }

  let ModifySetObserver = class ModifySetObserver extends ModifyCollectionObserver {
    constructor(taskQueue, set) {
      super(taskQueue, set);
    }

    static for(taskQueue, set) {
      if (!('__set_observer__' in set)) {
        Reflect.defineProperty(set, '__set_observer__', {
          value: ModifySetObserver.create(taskQueue, set),
          enumerable: false,
          configurable: false
        });
      }

      return set.__set_observer__;
    }

    static create(taskQueue, set) {
      let observer = new ModifySetObserver(taskQueue, set);
      let proto = setProto;

      if (proto.add !== set.add || proto.delete !== set.delete || proto.clear !== set.clear) {
        proto = {
          add: set.add,
          delete: set.delete,
          clear: set.clear
        };
      }

      set.add = function () {
        let type = 'add';
        let oldSize = set.size;
        let methodCallResult = proto.add.apply(set, arguments);
        let hasValue = set.size === oldSize;

        if (!hasValue) {
          observer.addChangeRecord({
            type: type,
            object: set,
            value: Array.from(set).pop()
          });
        }

        return methodCallResult;
      };

      set.delete = function () {
        let hasValue = set.has(arguments[0]);
        let methodCallResult = proto.delete.apply(set, arguments);

        if (hasValue) {
          observer.addChangeRecord({
            type: 'delete',
            object: set,
            value: arguments[0]
          });
        }

        return methodCallResult;
      };

      set.clear = function () {
        let methodCallResult = proto.clear.apply(set, arguments);
        observer.addChangeRecord({
          type: 'clear',
          object: set
        });
        return methodCallResult;
      };

      return observer;
    }

  };

  function observable(targetOrConfig, key, descriptor) {
    function deco(target, key, descriptor, config) {
      const isClassDecorator = key === undefined;

      if (isClassDecorator) {
        target = target.prototype;
        key = typeof config === 'string' ? config : config.name;
      }

      let innerPropertyName = `_${key}`;
      const innerPropertyDescriptor = {
        configurable: true,
        enumerable: false,
        writable: true
      };
      const callbackName = config && config.changeHandler || `${key}Changed`;

      if (descriptor) {
        if (typeof descriptor.initializer === 'function') {
          innerPropertyDescriptor.value = descriptor.initializer();
        }
      } else {
        descriptor = {};
      }

      if (!('enumerable' in descriptor)) {
        descriptor.enumerable = true;
      }

      delete descriptor.value;
      delete descriptor.writable;
      delete descriptor.initializer;
      Reflect.defineProperty(target, innerPropertyName, innerPropertyDescriptor);

      descriptor.get = function () {
        return this[innerPropertyName];
      };

      descriptor.set = function (newValue) {
        let oldValue = this[innerPropertyName];

        if (newValue === oldValue) {
          return;
        }

        this[innerPropertyName] = newValue;
        Reflect.defineProperty(this, innerPropertyName, {
          enumerable: false
        });

        if (this[callbackName]) {
          this[callbackName](newValue, oldValue, key);
        }
      };

      descriptor.get.dependencies = [innerPropertyName];

      if (isClassDecorator) {
        Reflect.defineProperty(target, key, descriptor);
      } else {
        return descriptor;
      }
    }

    if (key === undefined) {
      return (t, k, d) => deco(t, k, d, targetOrConfig);
    }

    return deco(targetOrConfig, key, descriptor);
  }

  const signals = {};

  function connectBindingToSignal(binding, name) {
    if (!signals.hasOwnProperty(name)) {
      signals[name] = 0;
    }

    binding.observeProperty(signals, name);
  }

  function signalBindings(name) {
    if (signals.hasOwnProperty(name)) {
      signals[name]++;
    }
  }
});
define('aurelia-bootstrapper/dist/commonjs/aurelia-bootstrapper',['require','exports','module','aurelia-polyfills','aurelia-pal'],function (require, exports, module) {'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.starting = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.bootstrap = bootstrap;

require('aurelia-polyfills');

var _aureliaPal = require('aurelia-pal');

var bootstrapPromises = [];
var startResolve = void 0;

var startPromise = new Promise(function (resolve) {
  return startResolve = resolve;
});
var host = _aureliaPal.PLATFORM.global;
var isNodeLike = typeof process !== 'undefined' && !process.browser;

function ready() {
  if (!host.document || host.document.readyState === 'complete') {
    return Promise.resolve();
  }

  return new Promise(function (resolve) {
    host.document.addEventListener('DOMContentLoaded', completed);
    host.addEventListener('load', completed);

    function completed() {
      host.document.removeEventListener('DOMContentLoaded', completed);
      host.removeEventListener('load', completed);
      resolve();
    }
  });
}

function createLoader() {
  if (_aureliaPal.PLATFORM.Loader) {
    return Promise.resolve(new _aureliaPal.PLATFORM.Loader());
  }

  if (typeof AURELIA_WEBPACK_2_0 === 'undefined') {
    if (typeof __webpack_require__ !== 'undefined') {
      var m = __webpack_require__(require.resolve('aurelia-loader-webpack'));
      return Promise.resolve(new m.WebpackLoader());
    }

    if (host.System && typeof host.System.config === 'function') {
      return host.System.normalize('aurelia-bootstrapper').then(function (bsn) {
        return host.System.normalize('aurelia-loader-default', bsn);
      }).then(function (loaderName) {
        return host.System.import(loaderName).then(function (m) {
          return new m.DefaultLoader();
        });
      });
    }

    if (typeof host.require === 'function' && typeof host.define === 'function' && _typeof(host.define.amd) === 'object') {
      return new Promise(function (resolve, reject) {
        return host.require(['aurelia-loader-default'], function (m) {
          return resolve(new m.DefaultLoader());
        }, reject);
      });
    }

    if (isNodeLike && typeof module !== 'undefined' && typeof module.require !== 'undefined') {
      var _m = module.require('aurelia-loader-nodejs');
      return Promise.resolve(new _m.NodeJsLoader());
    }
  }

  return Promise.reject('No PLATFORM.Loader is defined and there is neither a System API (ES6) or a Require API (AMD) globally available to load your app.');
}

function initializePal(loader) {
  var type = void 0;

  var isRenderer = isNodeLike && (process.type === 'renderer' || process.versions['node-webkit']);

  if (isNodeLike && !isRenderer) {
    type = 'nodejs';
  } else if (typeof window !== 'undefined') {
    type = 'browser';
  } else if (typeof self !== 'undefined') {
    type = 'worker';
  } else {
    throw new Error('Could not determine platform implementation to load.');
  }

  return loader.loadModule('aurelia-pal-' + type).then(function (palModule) {
    return type === 'nodejs' && !_aureliaPal.isInitialized && palModule.globalize() || palModule.initialize();
  });
}

function preparePlatform(loader) {
  var map = function map(moduleId, relativeTo) {
    return loader.normalize(moduleId, relativeTo).then(function (normalized) {
      loader.map(moduleId, normalized);
      return normalized;
    });
  };

  return initializePal(loader).then(function () {
    return loader.normalize('aurelia-bootstrapper');
  }).then(function (bootstrapperName) {
    var frameworkPromise = map(_aureliaPal.PLATFORM.moduleName('aurelia-framework', { exports: ['Aurelia'] }), bootstrapperName);

    return Promise.all([frameworkPromise, frameworkPromise.then(function (frameworkName) {
      return map('aurelia-dependency-injection', frameworkName);
    }), map('aurelia-router', bootstrapperName), map('aurelia-logging-console', bootstrapperName)]);
  }).then(function (_ref) {
    var frameworkName = _ref[0];
    return loader.loadModule(frameworkName);
  }).then(function (fx) {
    return startResolve(function () {
      return new fx.Aurelia(loader);
    });
  });
}

function config(appHost, configModuleId, aurelia) {
  aurelia.host = appHost;
  aurelia.configModuleId = configModuleId || null;

  if (configModuleId) {
    return aurelia.loader.loadModule(configModuleId).then(function (customConfig) {
      if (!customConfig.configure) {
        throw new Error('Cannot initialize module \'' + configModuleId + '\' without a configure function.');
      }

      return customConfig.configure(aurelia);
    });
  }

  aurelia.use.standardConfiguration().developmentLogging();

  return aurelia.start().then(function () {
    return aurelia.setRoot();
  });
}

function run() {
  return ready().then(createLoader).then(preparePlatform).then(function () {
    var appHosts = host.document.querySelectorAll('[aurelia-app],[data-aurelia-app]');
    for (var i = 0, ii = appHosts.length; i < ii; ++i) {
      var appHost = appHosts[i];
      var moduleId = appHost.getAttribute('aurelia-app') || appHost.getAttribute('data-aurelia-app');
      bootstrap(config.bind(null, appHost, moduleId));
    }

    var toConsole = console.error.bind(console);
    var bootstraps = bootstrapPromises.map(function (p) {
      return p.catch(toConsole);
    });
    bootstrapPromises = null;
    return Promise.all(bootstraps);
  });
}

function bootstrap(configure) {
  var p = startPromise.then(function (factory) {
    return configure(factory());
  });
  if (bootstrapPromises) bootstrapPromises.push(p);
  return p;
}

var starting = exports.starting = run();
});

define('aurelia-dependency-injection/dist/es2015/aurelia-dependency-injection',["exports", "aurelia-metadata", "aurelia-pal"], function (_exports, _aureliaMetadata, _aureliaPal) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.getDecoratorDependencies = getDecoratorDependencies;
  _exports.lazy = lazy;
  _exports.all = all;
  _exports.optional = optional;
  _exports.parent = parent;
  _exports.factory = factory;
  _exports.newInstance = newInstance;
  _exports.invoker = invoker;
  _exports.invokeAsFactory = invokeAsFactory;
  _exports.registration = registration;
  _exports.transient = transient;
  _exports.singleton = singleton;
  _exports.autoinject = autoinject;
  _exports.inject = inject;
  _exports.Container = _exports.InvocationHandler = _exports._emptyParameters = _exports.SingletonRegistration = _exports.TransientRegistration = _exports.FactoryInvoker = _exports.NewInstance = _exports.Factory = _exports.Parent = _exports.Optional = _exports.All = _exports.Lazy = _exports.StrategyResolver = _exports.resolver = void 0;

  var _dec, _class, _dec2, _class2, _dec3, _class3, _dec4, _class4, _dec5, _class5, _dec6, _class6, _dec7, _class7;

  const resolver = _aureliaMetadata.protocol.create('aurelia:resolver', function (target) {
    if (!(typeof target.get === 'function')) {
      return 'Resolvers must implement: get(container: Container, key: any): any';
    }

    return true;
  });

  _exports.resolver = resolver;
  let StrategyResolver = (_dec = resolver(), _dec(_class = class StrategyResolver {
    constructor(strategy, state) {
      this.strategy = strategy;
      this.state = state;
    }

    get(container, key) {
      switch (this.strategy) {
        case 0:
          return this.state;

        case 1:
          let singleton = container.invoke(this.state);
          this.state = singleton;
          this.strategy = 0;
          return singleton;

        case 2:
          return container.invoke(this.state);

        case 3:
          return this.state(container, key, this);

        case 4:
          return this.state[0].get(container, key);

        case 5:
          return container.get(this.state);

        default:
          throw new Error('Invalid strategy: ' + this.strategy);
      }
    }

  }) || _class);
  _exports.StrategyResolver = StrategyResolver;
  let Lazy = (_dec2 = resolver(), _dec2(_class2 = class Lazy {
    constructor(key) {
      this._key = key;
    }

    get(container) {
      return () => container.get(this._key);
    }

    static of(key) {
      return new Lazy(key);
    }

  }) || _class2);
  _exports.Lazy = Lazy;
  let All = (_dec3 = resolver(), _dec3(_class3 = class All {
    constructor(key) {
      this._key = key;
    }

    get(container) {
      return container.getAll(this._key);
    }

    static of(key) {
      return new All(key);
    }

  }) || _class3);
  _exports.All = All;
  let Optional = (_dec4 = resolver(), _dec4(_class4 = class Optional {
    constructor(key, checkParent = true) {
      this._key = key;
      this._checkParent = checkParent;
    }

    get(container) {
      if (container.hasResolver(this._key, this._checkParent)) {
        return container.get(this._key);
      }

      return null;
    }

    static of(key, checkParent = true) {
      return new Optional(key, checkParent);
    }

  }) || _class4);
  _exports.Optional = Optional;
  let Parent = (_dec5 = resolver(), _dec5(_class5 = class Parent {
    constructor(key) {
      this._key = key;
    }

    get(container) {
      return container.parent ? container.parent.get(this._key) : null;
    }

    static of(key) {
      return new Parent(key);
    }

  }) || _class5);
  _exports.Parent = Parent;
  let Factory = (_dec6 = resolver(), _dec6(_class6 = class Factory {
    constructor(key) {
      this._key = key;
    }

    get(container) {
      let fn = this._key;
      let resolver = container.getResolver(fn);

      if (resolver && resolver.strategy === 3) {
        fn = resolver.state;
      }

      return (...rest) => container.invoke(fn, rest);
    }

    static of(key) {
      return new Factory(key);
    }

  }) || _class6);
  _exports.Factory = Factory;
  let NewInstance = (_dec7 = resolver(), _dec7(_class7 = class NewInstance {
    constructor(key, ...dynamicDependencies) {
      this.key = key;
      this.asKey = key;
      this.dynamicDependencies = dynamicDependencies;
    }

    get(container) {
      let dynamicDependencies = this.dynamicDependencies.length > 0 ? this.dynamicDependencies.map(dependency => dependency['protocol:aurelia:resolver'] ? dependency.get(container) : container.get(dependency)) : undefined;
      let fn = this.key;
      let resolver = container.getResolver(fn);

      if (resolver && resolver.strategy === 3) {
        fn = resolver.state;
      }

      const instance = container.invoke(fn, dynamicDependencies);
      container.registerInstance(this.asKey, instance);
      return instance;
    }

    as(key) {
      this.asKey = key;
      return this;
    }

    static of(key, ...dynamicDependencies) {
      return new NewInstance(key, ...dynamicDependencies);
    }

  }) || _class7);
  _exports.NewInstance = NewInstance;

  function getDecoratorDependencies(target) {
    autoinject(target);
    return target.inject;
  }

  function lazy(keyValue) {
    return function (target, key, index) {
      let inject = getDecoratorDependencies(target);
      inject[index] = Lazy.of(keyValue);
    };
  }

  function all(keyValue) {
    return function (target, key, index) {
      let inject = getDecoratorDependencies(target);
      inject[index] = All.of(keyValue);
    };
  }

  function optional(checkParentOrTarget = true) {
    let deco = function (checkParent) {
      return function (target, key, index) {
        let inject = getDecoratorDependencies(target);
        inject[index] = Optional.of(inject[index], checkParent);
      };
    };

    if (typeof checkParentOrTarget === 'boolean') {
      return deco(checkParentOrTarget);
    }

    return deco(true);
  }

  function parent(target, key, index) {
    let inject = getDecoratorDependencies(target);
    inject[index] = Parent.of(inject[index]);
  }

  function factory(keyValue) {
    return function (target, key, index) {
      let inject = getDecoratorDependencies(target);
      inject[index] = Factory.of(keyValue);
    };
  }

  function newInstance(asKeyOrTarget, ...dynamicDependencies) {
    let deco = function (asKey) {
      return function (target, key, index) {
        let inject = getDecoratorDependencies(target);
        inject[index] = NewInstance.of(inject[index], ...dynamicDependencies);

        if (!!asKey) {
          inject[index].as(asKey);
        }
      };
    };

    if (arguments.length >= 1) {
      return deco(asKeyOrTarget);
    }

    return deco();
  }

  function invoker(value) {
    return function (target) {
      _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.invoker, value, target);
    };
  }

  function invokeAsFactory(potentialTarget) {
    let deco = function (target) {
      _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.invoker, FactoryInvoker.instance, target);
    };

    return potentialTarget ? deco(potentialTarget) : deco;
  }

  let FactoryInvoker = class FactoryInvoker {
    invoke(container, fn, dependencies) {
      let i = dependencies.length;
      let args = new Array(i);

      while (i--) {
        args[i] = container.get(dependencies[i]);
      }

      return fn.apply(undefined, args);
    }

    invokeWithDynamicDependencies(container, fn, staticDependencies, dynamicDependencies) {
      let i = staticDependencies.length;
      let args = new Array(i);

      while (i--) {
        args[i] = container.get(staticDependencies[i]);
      }

      if (dynamicDependencies !== undefined) {
        args = args.concat(dynamicDependencies);
      }

      return fn.apply(undefined, args);
    }

  };
  _exports.FactoryInvoker = FactoryInvoker;
  FactoryInvoker.instance = new FactoryInvoker();

  function registration(value) {
    return function (target) {
      _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.registration, value, target);
    };
  }

  function transient(key) {
    return registration(new TransientRegistration(key));
  }

  function singleton(keyOrRegisterInChild, registerInChild = false) {
    return registration(new SingletonRegistration(keyOrRegisterInChild, registerInChild));
  }

  let TransientRegistration = class TransientRegistration {
    constructor(key) {
      this._key = key;
    }

    registerResolver(container, key, fn) {
      let existingResolver = container.getResolver(this._key || key);
      return existingResolver === undefined ? container.registerTransient(this._key || key, fn) : existingResolver;
    }

  };
  _exports.TransientRegistration = TransientRegistration;
  let SingletonRegistration = class SingletonRegistration {
    constructor(keyOrRegisterInChild, registerInChild = false) {
      if (typeof keyOrRegisterInChild === 'boolean') {
        this._registerInChild = keyOrRegisterInChild;
      } else {
        this._key = keyOrRegisterInChild;
        this._registerInChild = registerInChild;
      }
    }

    registerResolver(container, key, fn) {
      let targetContainer = this._registerInChild ? container : container.root;
      let existingResolver = targetContainer.getResolver(this._key || key);
      return existingResolver === undefined ? targetContainer.registerSingleton(this._key || key, fn) : existingResolver;
    }

  };
  _exports.SingletonRegistration = SingletonRegistration;

  function validateKey(key) {
    if (key === null || key === undefined) {
      throw new Error('key/value cannot be null or undefined. Are you trying to inject/register something that doesn\'t exist with DI?');
    }
  }

  const _emptyParameters = Object.freeze([]);

  _exports._emptyParameters = _emptyParameters;
  _aureliaMetadata.metadata.registration = 'aurelia:registration';
  _aureliaMetadata.metadata.invoker = 'aurelia:invoker';
  let resolverDecorates = resolver.decorates;
  let InvocationHandler = class InvocationHandler {
    constructor(fn, invoker, dependencies) {
      this.fn = fn;
      this.invoker = invoker;
      this.dependencies = dependencies;
    }

    invoke(container, dynamicDependencies) {
      return dynamicDependencies !== undefined ? this.invoker.invokeWithDynamicDependencies(container, this.fn, this.dependencies, dynamicDependencies) : this.invoker.invoke(container, this.fn, this.dependencies);
    }

  };
  _exports.InvocationHandler = InvocationHandler;

  function invokeWithDynamicDependencies(container, fn, staticDependencies, dynamicDependencies) {
    let i = staticDependencies.length;
    let args = new Array(i);
    let lookup;

    while (i--) {
      lookup = staticDependencies[i];

      if (lookup === null || lookup === undefined) {
        throw new Error('Constructor Parameter with index ' + i + ' cannot be null or undefined. Are you trying to inject/register something that doesn\'t exist with DI?');
      } else {
        args[i] = container.get(lookup);
      }
    }

    if (dynamicDependencies !== undefined) {
      args = args.concat(dynamicDependencies);
    }

    return Reflect.construct(fn, args);
  }

  let classInvokers = {
    [0]: {
      invoke(container, Type) {
        return new Type();
      },

      invokeWithDynamicDependencies: invokeWithDynamicDependencies
    },
    [1]: {
      invoke(container, Type, deps) {
        return new Type(container.get(deps[0]));
      },

      invokeWithDynamicDependencies: invokeWithDynamicDependencies
    },
    [2]: {
      invoke(container, Type, deps) {
        return new Type(container.get(deps[0]), container.get(deps[1]));
      },

      invokeWithDynamicDependencies: invokeWithDynamicDependencies
    },
    [3]: {
      invoke(container, Type, deps) {
        return new Type(container.get(deps[0]), container.get(deps[1]), container.get(deps[2]));
      },

      invokeWithDynamicDependencies: invokeWithDynamicDependencies
    },
    [4]: {
      invoke(container, Type, deps) {
        return new Type(container.get(deps[0]), container.get(deps[1]), container.get(deps[2]), container.get(deps[3]));
      },

      invokeWithDynamicDependencies: invokeWithDynamicDependencies
    },
    [5]: {
      invoke(container, Type, deps) {
        return new Type(container.get(deps[0]), container.get(deps[1]), container.get(deps[2]), container.get(deps[3]), container.get(deps[4]));
      },

      invokeWithDynamicDependencies: invokeWithDynamicDependencies
    },
    fallback: {
      invoke: invokeWithDynamicDependencies,
      invokeWithDynamicDependencies: invokeWithDynamicDependencies
    }
  };

  function getDependencies(f) {
    if (!f.hasOwnProperty('inject')) {
      return [];
    }

    if (typeof f.inject === 'function') {
      return f.inject();
    }

    return f.inject;
  }

  let Container = class Container {
    constructor(configuration) {
      if (configuration === undefined) {
        configuration = {};
      }

      this._configuration = configuration;
      this._onHandlerCreated = configuration.onHandlerCreated;
      this._handlers = configuration.handlers || (configuration.handlers = new Map());
      this._resolvers = new Map();
      this.root = this;
      this.parent = null;
    }

    makeGlobal() {
      Container.instance = this;
      return this;
    }

    setHandlerCreatedCallback(onHandlerCreated) {
      this._onHandlerCreated = onHandlerCreated;
      this._configuration.onHandlerCreated = onHandlerCreated;
    }

    registerInstance(key, instance) {
      return this.registerResolver(key, new StrategyResolver(0, instance === undefined ? key : instance));
    }

    registerSingleton(key, fn) {
      return this.registerResolver(key, new StrategyResolver(1, fn === undefined ? key : fn));
    }

    registerTransient(key, fn) {
      return this.registerResolver(key, new StrategyResolver(2, fn === undefined ? key : fn));
    }

    registerHandler(key, handler) {
      return this.registerResolver(key, new StrategyResolver(3, handler));
    }

    registerAlias(originalKey, aliasKey) {
      return this.registerResolver(aliasKey, new StrategyResolver(5, originalKey));
    }

    registerResolver(key, resolver) {
      validateKey(key);
      let allResolvers = this._resolvers;
      let result = allResolvers.get(key);

      if (result === undefined) {
        allResolvers.set(key, resolver);
      } else if (result.strategy === 4) {
        result.state.push(resolver);
      } else {
        allResolvers.set(key, new StrategyResolver(4, [result, resolver]));
      }

      return resolver;
    }

    autoRegister(key, fn) {
      fn = fn === undefined ? key : fn;

      if (typeof fn === 'function') {
        let registration = _aureliaMetadata.metadata.get(_aureliaMetadata.metadata.registration, fn);

        if (registration === undefined) {
          return this.registerResolver(key, new StrategyResolver(1, fn));
        }

        return registration.registerResolver(this, key, fn);
      }

      return this.registerResolver(key, new StrategyResolver(0, fn));
    }

    autoRegisterAll(fns) {
      let i = fns.length;

      while (i--) {
        this.autoRegister(fns[i]);
      }
    }

    unregister(key) {
      this._resolvers.delete(key);
    }

    hasResolver(key, checkParent = false) {
      validateKey(key);
      return this._resolvers.has(key) || checkParent && this.parent !== null && this.parent.hasResolver(key, checkParent);
    }

    getResolver(key) {
      return this._resolvers.get(key);
    }

    get(key) {
      validateKey(key);

      if (key === Container) {
        return this;
      }

      if (resolverDecorates(key)) {
        return key.get(this, key);
      }

      let resolver = this._resolvers.get(key);

      if (resolver === undefined) {
        if (this.parent === null) {
          return this.autoRegister(key).get(this, key);
        }

        let registration = _aureliaMetadata.metadata.get(_aureliaMetadata.metadata.registration, key);

        if (registration === undefined) {
          return this.parent._get(key);
        }

        return registration.registerResolver(this, key, key).get(this, key);
      }

      return resolver.get(this, key);
    }

    _get(key) {
      let resolver = this._resolvers.get(key);

      if (resolver === undefined) {
        if (this.parent === null) {
          return this.autoRegister(key).get(this, key);
        }

        return this.parent._get(key);
      }

      return resolver.get(this, key);
    }

    getAll(key) {
      validateKey(key);

      let resolver = this._resolvers.get(key);

      if (resolver === undefined) {
        if (this.parent === null) {
          return _emptyParameters;
        }

        return this.parent.getAll(key);
      }

      if (resolver.strategy === 4) {
        let state = resolver.state;
        let i = state.length;
        let results = new Array(i);

        while (i--) {
          results[i] = state[i].get(this, key);
        }

        return results;
      }

      return [resolver.get(this, key)];
    }

    createChild() {
      let child = new Container(this._configuration);
      child.root = this.root;
      child.parent = this;
      return child;
    }

    invoke(fn, dynamicDependencies) {
      try {
        let handler = this._handlers.get(fn);

        if (handler === undefined) {
          handler = this._createInvocationHandler(fn);

          this._handlers.set(fn, handler);
        }

        return handler.invoke(this, dynamicDependencies);
      } catch (e) {
        throw new _aureliaPal.AggregateError(`Error invoking ${fn.name}. Check the inner error for details.`, e, true);
      }
    }

    _createInvocationHandler(fn) {
      let dependencies;

      if (fn.inject === undefined) {
        dependencies = _aureliaMetadata.metadata.getOwn(_aureliaMetadata.metadata.paramTypes, fn) || _emptyParameters;
      } else {
        dependencies = [];
        let ctor = fn;

        while (typeof ctor === 'function') {
          dependencies.push(...getDependencies(ctor));
          ctor = Object.getPrototypeOf(ctor);
        }
      }

      let invoker = _aureliaMetadata.metadata.getOwn(_aureliaMetadata.metadata.invoker, fn) || classInvokers[dependencies.length] || classInvokers.fallback;
      let handler = new InvocationHandler(fn, invoker, dependencies);
      return this._onHandlerCreated !== undefined ? this._onHandlerCreated(handler) : handler;
    }

  };
  _exports.Container = Container;

  function autoinject(potentialTarget) {
    let deco = function (target) {
      if (!target.hasOwnProperty('inject')) {
        target.inject = (_aureliaMetadata.metadata.getOwn(_aureliaMetadata.metadata.paramTypes, target) || _emptyParameters).slice();

        if (target.inject.length > 0 && target.inject[target.inject.length - 1] === Object) {
          target.inject.pop();
        }
      }
    };

    return potentialTarget ? deco(potentialTarget) : deco;
  }

  function inject(...rest) {
    return function (target, key, descriptor) {
      if (typeof descriptor === 'number') {
        autoinject(target);

        if (rest.length === 1) {
          target.inject[descriptor] = rest[0];
        }

        return;
      }

      if (descriptor) {
        const fn = descriptor.value;
        fn.inject = rest;
      } else {
        target.inject = rest;
      }
    };
  }
});
define('aurelia-event-aggregator/dist/commonjs/aurelia-event-aggregator',['require','exports','module','aurelia-logging'],function (require, exports, module) {'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EventAggregator = undefined;
exports.includeEventsIn = includeEventsIn;
exports.configure = configure;

var _aureliaLogging = require('aurelia-logging');

var LogManager = _interopRequireWildcard(_aureliaLogging);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }



var logger = LogManager.getLogger('event-aggregator');

var Handler = function () {
  function Handler(messageType, callback) {
    

    this.messageType = messageType;
    this.callback = callback;
  }

  Handler.prototype.handle = function handle(message) {
    if (message instanceof this.messageType) {
      this.callback.call(null, message);
    }
  };

  return Handler;
}();

function invokeCallback(callback, data, event) {
  try {
    callback(data, event);
  } catch (e) {
    logger.error(e);
  }
}

function invokeHandler(handler, data) {
  try {
    handler.handle(data);
  } catch (e) {
    logger.error(e);
  }
}

var EventAggregator = exports.EventAggregator = function () {
  function EventAggregator() {
    

    this.eventLookup = {};
    this.messageHandlers = [];
  }

  EventAggregator.prototype.publish = function publish(event, data) {
    var subscribers = void 0;
    var i = void 0;

    if (!event) {
      throw new Error('Event was invalid.');
    }

    if (typeof event === 'string') {
      subscribers = this.eventLookup[event];
      if (subscribers) {
        subscribers = subscribers.slice();
        i = subscribers.length;

        while (i--) {
          invokeCallback(subscribers[i], data, event);
        }
      }
    } else {
      subscribers = this.messageHandlers.slice();
      i = subscribers.length;

      while (i--) {
        invokeHandler(subscribers[i], event);
      }
    }
  };

  EventAggregator.prototype.subscribe = function subscribe(event, callback) {
    var handler = void 0;
    var subscribers = void 0;

    if (!event) {
      throw new Error('Event channel/type was invalid.');
    }

    if (typeof event === 'string') {
      handler = callback;
      subscribers = this.eventLookup[event] || (this.eventLookup[event] = []);
    } else {
      handler = new Handler(event, callback);
      subscribers = this.messageHandlers;
    }

    subscribers.push(handler);

    return {
      dispose: function dispose() {
        var idx = subscribers.indexOf(handler);
        if (idx !== -1) {
          subscribers.splice(idx, 1);
        }
      }
    };
  };

  EventAggregator.prototype.subscribeOnce = function subscribeOnce(event, callback) {
    var sub = this.subscribe(event, function (a, b) {
      sub.dispose();
      return callback(a, b);
    });

    return sub;
  };

  return EventAggregator;
}();

function includeEventsIn(obj) {
  var ea = new EventAggregator();

  obj.subscribeOnce = function (event, callback) {
    return ea.subscribeOnce(event, callback);
  };

  obj.subscribe = function (event, callback) {
    return ea.subscribe(event, callback);
  };

  obj.publish = function (event, data) {
    ea.publish(event, data);
  };

  return ea;
}

function configure(config) {
  config.instance(EventAggregator, includeEventsIn(config.aurelia));
}
});

define('aurelia-framework/dist/commonjs/aurelia-framework',['require','exports','module','aurelia-dependency-injection','aurelia-binding','aurelia-metadata','aurelia-templating','aurelia-loader','aurelia-task-queue','aurelia-path','aurelia-pal','aurelia-logging'],function (require, exports, module) {'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LogManager = exports.FrameworkConfiguration = exports.Aurelia = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _aureliaDependencyInjection = require('aurelia-dependency-injection');

Object.keys(_aureliaDependencyInjection).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _aureliaDependencyInjection[key];
    }
  });
});

var _aureliaBinding = require('aurelia-binding');

Object.keys(_aureliaBinding).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _aureliaBinding[key];
    }
  });
});

var _aureliaMetadata = require('aurelia-metadata');

Object.keys(_aureliaMetadata).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _aureliaMetadata[key];
    }
  });
});

var _aureliaTemplating = require('aurelia-templating');

Object.keys(_aureliaTemplating).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _aureliaTemplating[key];
    }
  });
});

var _aureliaLoader = require('aurelia-loader');

Object.keys(_aureliaLoader).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _aureliaLoader[key];
    }
  });
});

var _aureliaTaskQueue = require('aurelia-task-queue');

Object.keys(_aureliaTaskQueue).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _aureliaTaskQueue[key];
    }
  });
});

var _aureliaPath = require('aurelia-path');

Object.keys(_aureliaPath).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _aureliaPath[key];
    }
  });
});

var _aureliaPal = require('aurelia-pal');

Object.keys(_aureliaPal).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _aureliaPal[key];
    }
  });
});

var _aureliaLogging = require('aurelia-logging');

var TheLogManager = _interopRequireWildcard(_aureliaLogging);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }



function preventActionlessFormSubmit() {
  _aureliaPal.DOM.addEventListener('submit', function (evt) {
    var target = evt.target;
    var action = target.action;

    if (target.tagName.toLowerCase() === 'form' && !action) {
      evt.preventDefault();
    }
  });
}

var Aurelia = exports.Aurelia = function () {
  function Aurelia(loader, container, resources) {
    

    this.loader = loader || new _aureliaPal.PLATFORM.Loader();
    this.container = container || new _aureliaDependencyInjection.Container().makeGlobal();
    this.resources = resources || new _aureliaTemplating.ViewResources();
    this.use = new FrameworkConfiguration(this);
    this.logger = TheLogManager.getLogger('aurelia');
    this.hostConfigured = false;
    this.host = null;

    this.use.instance(Aurelia, this);
    this.use.instance(_aureliaLoader.Loader, this.loader);
    this.use.instance(_aureliaTemplating.ViewResources, this.resources);
  }

  Aurelia.prototype.start = function start() {
    var _this = this;

    if (this._started) {
      return this._started;
    }

    this.logger.info('Aurelia Starting');
    return this._started = this.use.apply().then(function () {
      preventActionlessFormSubmit();

      if (!_this.container.hasResolver(_aureliaTemplating.BindingLanguage)) {
        var message = 'You must configure Aurelia with a BindingLanguage implementation.';
        _this.logger.error(message);
        throw new Error(message);
      }

      _this.logger.info('Aurelia Started');
      var evt = _aureliaPal.DOM.createCustomEvent('aurelia-started', { bubbles: true, cancelable: true });
      _aureliaPal.DOM.dispatchEvent(evt);
      return _this;
    });
  };

  Aurelia.prototype.enhance = function enhance() {
    var _this2 = this;

    var bindingContext = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var applicationHost = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

    this._configureHost(applicationHost || _aureliaPal.DOM.querySelectorAll('body')[0]);

    return new Promise(function (resolve) {
      var engine = _this2.container.get(_aureliaTemplating.TemplatingEngine);
      _this2.root = engine.enhance({ container: _this2.container, element: _this2.host, resources: _this2.resources, bindingContext: bindingContext });
      _this2.root.attached();
      _this2._onAureliaComposed();
      resolve(_this2);
    });
  };

  Aurelia.prototype.setRoot = function setRoot() {
    var _this3 = this;

    var root = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    var applicationHost = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

    var instruction = {};

    if (this.root && this.root.viewModel && this.root.viewModel.router) {
      this.root.viewModel.router.deactivate();
      this.root.viewModel.router.reset();
    }

    this._configureHost(applicationHost);

    var engine = this.container.get(_aureliaTemplating.TemplatingEngine);
    var transaction = this.container.get(_aureliaTemplating.CompositionTransaction);
    delete transaction.initialComposition;

    if (!root) {
      if (this.configModuleId) {
        root = (0, _aureliaPath.relativeToFile)('./app', this.configModuleId);
      } else {
        root = 'app';
      }
    }

    instruction.viewModel = root;
    instruction.container = instruction.childContainer = this.container;
    instruction.viewSlot = this.hostSlot;
    instruction.host = this.host;

    return engine.compose(instruction).then(function (r) {
      _this3.root = r;
      instruction.viewSlot.attached();
      _this3._onAureliaComposed();
      return _this3;
    });
  };

  Aurelia.prototype._configureHost = function _configureHost(applicationHost) {
    if (this.hostConfigured) {
      return;
    }
    applicationHost = applicationHost || this.host;

    if (!applicationHost || typeof applicationHost === 'string') {
      this.host = _aureliaPal.DOM.getElementById(applicationHost || 'applicationHost');
    } else {
      this.host = applicationHost;
    }

    if (!this.host) {
      throw new Error('No applicationHost was specified.');
    }

    this.hostConfigured = true;
    this.host.aurelia = this;
    this.hostSlot = new _aureliaTemplating.ViewSlot(this.host, true);
    this.hostSlot.transformChildNodesIntoView();
    this.container.registerInstance(_aureliaPal.DOM.boundary, this.host);
  };

  Aurelia.prototype._onAureliaComposed = function _onAureliaComposed() {
    var evt = _aureliaPal.DOM.createCustomEvent('aurelia-composed', { bubbles: true, cancelable: true });
    setTimeout(function () {
      return _aureliaPal.DOM.dispatchEvent(evt);
    }, 1);
  };

  return Aurelia;
}();

var logger = TheLogManager.getLogger('aurelia');
var extPattern = /\.[^/.]+$/;

function runTasks(config, tasks) {
  var current = void 0;
  var next = function next() {
    current = tasks.shift();
    if (current) {
      return Promise.resolve(current(config)).then(next);
    }

    return Promise.resolve();
  };

  return next();
}

function loadPlugin(fwConfig, loader, info) {
  logger.debug('Loading plugin ' + info.moduleId + '.');
  if (typeof info.moduleId === 'string') {
    fwConfig.resourcesRelativeTo = info.resourcesRelativeTo;

    var id = info.moduleId;

    if (info.resourcesRelativeTo.length > 1) {
      return loader.normalize(info.moduleId, info.resourcesRelativeTo[1]).then(function (normalizedId) {
        return _loadPlugin(normalizedId);
      });
    }

    return _loadPlugin(id);
  } else if (typeof info.configure === 'function') {
    if (fwConfig.configuredPlugins.indexOf(info.configure) !== -1) {
      return Promise.resolve();
    }
    fwConfig.configuredPlugins.push(info.configure);

    return Promise.resolve(info.configure.call(null, fwConfig, info.config || {}));
  }
  throw new Error(invalidConfigMsg(info.moduleId || info.configure, 'plugin'));

  function _loadPlugin(moduleId) {
    return loader.loadModule(moduleId).then(function (m) {
      if ('configure' in m) {
        if (fwConfig.configuredPlugins.indexOf(m.configure) !== -1) {
          return Promise.resolve();
        }
        return Promise.resolve(m.configure(fwConfig, info.config || {})).then(function () {
          fwConfig.configuredPlugins.push(m.configure);
          fwConfig.resourcesRelativeTo = null;
          logger.debug('Configured plugin ' + info.moduleId + '.');
        });
      }

      fwConfig.resourcesRelativeTo = null;
      logger.debug('Loaded plugin ' + info.moduleId + '.');
    });
  }
}

function loadResources(aurelia, resourcesToLoad, appResources) {
  if (Object.keys(resourcesToLoad).length === 0) {
    return Promise.resolve();
  }
  var viewEngine = aurelia.container.get(_aureliaTemplating.ViewEngine);

  return Promise.all(Object.keys(resourcesToLoad).map(function (n) {
    return _normalize(resourcesToLoad[n]);
  })).then(function (loads) {
    var names = [];
    var importIds = [];

    loads.forEach(function (l) {
      names.push(undefined);
      importIds.push(l.importId);
    });

    return viewEngine.importViewResources(importIds, names, appResources);
  });

  function _normalize(load) {
    var moduleId = load.moduleId;
    var ext = getExt(moduleId);

    if (isOtherResource(moduleId)) {
      moduleId = removeExt(moduleId);
    }

    return aurelia.loader.normalize(moduleId, load.relativeTo).then(function (normalized) {
      return {
        name: load.moduleId,
        importId: isOtherResource(load.moduleId) ? addOriginalExt(normalized, ext) : normalized
      };
    });
  }

  function isOtherResource(name) {
    var ext = getExt(name);
    if (!ext) return false;
    if (ext === '') return false;
    if (ext === '.js' || ext === '.ts') return false;
    return true;
  }

  function removeExt(name) {
    return name.replace(extPattern, '');
  }

  function addOriginalExt(normalized, ext) {
    return removeExt(normalized) + '.' + ext;
  }
}

function getExt(name) {
  var match = name.match(extPattern);
  if (match && match.length > 0) {
    return match[0].split('.')[1];
  }
}

function loadBehaviors(config) {
  return Promise.all(config.behaviorsToLoad.map(function (m) {
    return m.load(config.container, m.target);
  })).then(function () {
    config.behaviorsToLoad = null;
  });
}

function assertProcessed(plugins) {
  if (plugins.processed) {
    throw new Error('This config instance has already been applied. To load more plugins or global resources, create a new FrameworkConfiguration instance.');
  }
}

function invalidConfigMsg(cfg, type) {
  return 'Invalid ' + type + ' [' + cfg + '], ' + type + ' must be specified as functions or relative module IDs.';
}

var FrameworkConfiguration = function () {
  function FrameworkConfiguration(aurelia) {
    var _this4 = this;

    

    this.aurelia = aurelia;
    this.container = aurelia.container;

    this.info = [];
    this.processed = false;
    this.preTasks = [];
    this.postTasks = [];

    this.behaviorsToLoad = [];

    this.configuredPlugins = [];
    this.resourcesToLoad = {};
    this.preTask(function () {
      return aurelia.loader.normalize('aurelia-bootstrapper').then(function (name) {
        return _this4.bootstrapperName = name;
      });
    });
    this.postTask(function () {
      return loadResources(aurelia, _this4.resourcesToLoad, aurelia.resources);
    });
  }

  FrameworkConfiguration.prototype.instance = function instance(type, _instance) {
    this.container.registerInstance(type, _instance);
    return this;
  };

  FrameworkConfiguration.prototype.singleton = function singleton(type, implementation) {
    this.container.registerSingleton(type, implementation);
    return this;
  };

  FrameworkConfiguration.prototype.transient = function transient(type, implementation) {
    this.container.registerTransient(type, implementation);
    return this;
  };

  FrameworkConfiguration.prototype.preTask = function preTask(task) {
    assertProcessed(this);
    this.preTasks.push(task);
    return this;
  };

  FrameworkConfiguration.prototype.postTask = function postTask(task) {
    assertProcessed(this);
    this.postTasks.push(task);
    return this;
  };

  FrameworkConfiguration.prototype.feature = function feature(plugin) {
    var config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    switch (typeof plugin === 'undefined' ? 'undefined' : _typeof(plugin)) {
      case 'string':
        var hasIndex = /\/index$/i.test(plugin);
        var _moduleId = hasIndex || getExt(plugin) ? plugin : plugin + '/index';
        var root = hasIndex ? plugin.substr(0, plugin.length - 6) : plugin;
        this.info.push({ moduleId: _moduleId, resourcesRelativeTo: [root, ''], config: config });
        break;

      case 'function':
        this.info.push({ configure: plugin, config: config || {} });
        break;
      default:
        throw new Error(invalidConfigMsg(plugin, 'feature'));
    }
    return this;
  };

  FrameworkConfiguration.prototype.globalResources = function globalResources(resources) {
    var _this5 = this;

    assertProcessed(this);

    var toAdd = Array.isArray(resources) ? resources : arguments;
    var resource = void 0;
    var resourcesRelativeTo = this.resourcesRelativeTo || ['', ''];

    for (var i = 0, ii = toAdd.length; i < ii; ++i) {
      resource = toAdd[i];
      switch (typeof resource === 'undefined' ? 'undefined' : _typeof(resource)) {
        case 'string':
          var parent = resourcesRelativeTo[0];
          var grandParent = resourcesRelativeTo[1];
          var name = resource;

          if ((resource.startsWith('./') || resource.startsWith('../')) && parent !== '') {
            name = (0, _aureliaPath.join)(parent, resource);
          }

          this.resourcesToLoad[name] = { moduleId: name, relativeTo: grandParent };
          break;
        case 'function':
          var meta = this.aurelia.resources.autoRegister(this.container, resource);
          if (meta instanceof _aureliaTemplating.HtmlBehaviorResource && meta.elementName !== null) {
            if (this.behaviorsToLoad.push(meta) === 1) {
              this.postTask(function () {
                return loadBehaviors(_this5);
              });
            }
          }
          break;
        default:
          throw new Error(invalidConfigMsg(resource, 'resource'));
      }
    }

    return this;
  };

  FrameworkConfiguration.prototype.globalName = function globalName(resourcePath, newName) {
    assertProcessed(this);
    this.resourcesToLoad[resourcePath] = { moduleId: newName, relativeTo: '' };
    return this;
  };

  FrameworkConfiguration.prototype.plugin = function plugin(_plugin, pluginConfig) {
    assertProcessed(this);

    var info = void 0;
    switch (typeof _plugin === 'undefined' ? 'undefined' : _typeof(_plugin)) {
      case 'string':
        info = { moduleId: _plugin, resourcesRelativeTo: [_plugin, ''], config: pluginConfig || {} };
        break;
      case 'function':
        info = { configure: _plugin, config: pluginConfig || {} };
        break;
      default:
        throw new Error(invalidConfigMsg(_plugin, 'plugin'));
    }
    this.info.push(info);
    return this;
  };

  FrameworkConfiguration.prototype._addNormalizedPlugin = function _addNormalizedPlugin(name, config) {
    var _this6 = this;

    var plugin = { moduleId: name, resourcesRelativeTo: [name, ''], config: config || {} };
    this.info.push(plugin);

    this.preTask(function () {
      var relativeTo = [name, _this6.bootstrapperName];
      plugin.moduleId = name;
      plugin.resourcesRelativeTo = relativeTo;
      return Promise.resolve();
    });

    return this;
  };

  FrameworkConfiguration.prototype.defaultBindingLanguage = function defaultBindingLanguage() {
    return this._addNormalizedPlugin('aurelia-templating-binding');
  };

  FrameworkConfiguration.prototype.router = function router() {
    return this._addNormalizedPlugin('aurelia-templating-router');
  };

  FrameworkConfiguration.prototype.history = function history() {
    return this._addNormalizedPlugin('aurelia-history-browser');
  };

  FrameworkConfiguration.prototype.defaultResources = function defaultResources() {
    return this._addNormalizedPlugin('aurelia-templating-resources');
  };

  FrameworkConfiguration.prototype.eventAggregator = function eventAggregator() {
    return this._addNormalizedPlugin('aurelia-event-aggregator');
  };

  FrameworkConfiguration.prototype.basicConfiguration = function basicConfiguration() {
    return this.defaultBindingLanguage().defaultResources().eventAggregator();
  };

  FrameworkConfiguration.prototype.standardConfiguration = function standardConfiguration() {
    return this.basicConfiguration().history().router();
  };

  FrameworkConfiguration.prototype.developmentLogging = function developmentLogging(level) {
    var _this7 = this;

    var logLevel = level ? TheLogManager.logLevel[level] : undefined;

    if (logLevel === undefined) {
      logLevel = TheLogManager.logLevel.debug;
    }

    this.preTask(function () {
      return _this7.aurelia.loader.normalize('aurelia-logging-console', _this7.bootstrapperName).then(function (name) {
        return _this7.aurelia.loader.loadModule(name).then(function (m) {
          TheLogManager.addAppender(new m.ConsoleAppender());
          TheLogManager.setLevel(logLevel);
        });
      });
    });

    return this;
  };

  FrameworkConfiguration.prototype.apply = function apply() {
    var _this8 = this;

    if (this.processed) {
      return Promise.resolve();
    }

    return runTasks(this, this.preTasks).then(function () {
      var loader = _this8.aurelia.loader;
      var info = _this8.info;
      var current = void 0;

      var next = function next() {
        current = info.shift();
        if (current) {
          return loadPlugin(_this8, loader, current).then(next);
        }

        _this8.processed = true;
        _this8.configuredPlugins = null;
        return Promise.resolve();
      };

      return next().then(function () {
        return runTasks(_this8, _this8.postTasks);
      });
    });
  };

  return FrameworkConfiguration;
}();

exports.FrameworkConfiguration = FrameworkConfiguration;
var LogManager = exports.LogManager = TheLogManager;
});

define('aurelia-history-browser/dist/commonjs/aurelia-history-browser',['require','exports','module','aurelia-pal','aurelia-history'],function (require, exports, module) {'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BrowserHistory = exports.DefaultLinkHandler = exports.LinkHandler = undefined;

var _class, _temp;

exports.configure = configure;

var _aureliaPal = require('aurelia-pal');

var _aureliaHistory = require('aurelia-history');

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }



var LinkHandler = exports.LinkHandler = function () {
  function LinkHandler() {
    
  }

  LinkHandler.prototype.activate = function activate(history) {};

  LinkHandler.prototype.deactivate = function deactivate() {};

  return LinkHandler;
}();

var DefaultLinkHandler = exports.DefaultLinkHandler = function (_LinkHandler) {
  _inherits(DefaultLinkHandler, _LinkHandler);

  function DefaultLinkHandler() {
    

    var _this = _possibleConstructorReturn(this, _LinkHandler.call(this));

    _this.handler = function (e) {
      var _DefaultLinkHandler$g = DefaultLinkHandler.getEventInfo(e),
          shouldHandleEvent = _DefaultLinkHandler$g.shouldHandleEvent,
          href = _DefaultLinkHandler$g.href;

      if (shouldHandleEvent) {
        e.preventDefault();
        _this.history.navigate(href);
      }
    };
    return _this;
  }

  DefaultLinkHandler.prototype.activate = function activate(history) {
    if (history._hasPushState) {
      this.history = history;
      _aureliaPal.DOM.addEventListener('click', this.handler, true);
    }
  };

  DefaultLinkHandler.prototype.deactivate = function deactivate() {
    _aureliaPal.DOM.removeEventListener('click', this.handler);
  };

  DefaultLinkHandler.getEventInfo = function getEventInfo(event) {
    var info = {
      shouldHandleEvent: false,
      href: null,
      anchor: null
    };

    var target = DefaultLinkHandler.findClosestAnchor(event.target);
    if (!target || !DefaultLinkHandler.targetIsThisWindow(target)) {
      return info;
    }

    if (target.hasAttribute('download') || target.hasAttribute('router-ignore')) {
      return info;
    }

    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return info;
    }

    var href = target.getAttribute('href');
    info.anchor = target;
    info.href = href;

    var leftButtonClicked = event.which === 1;
    var isRelative = href && !(href.charAt(0) === '#' || /^[a-z]+:/i.test(href));

    info.shouldHandleEvent = leftButtonClicked && isRelative;
    return info;
  };

  DefaultLinkHandler.findClosestAnchor = function findClosestAnchor(el) {
    while (el) {
      if (el.tagName === 'A') {
        return el;
      }

      el = el.parentNode;
    }
  };

  DefaultLinkHandler.targetIsThisWindow = function targetIsThisWindow(target) {
    var targetWindow = target.getAttribute('target');
    var win = _aureliaPal.PLATFORM.global;

    return !targetWindow || targetWindow === win.name || targetWindow === '_self';
  };

  return DefaultLinkHandler;
}(LinkHandler);

function configure(config) {
  config.singleton(_aureliaHistory.History, BrowserHistory);
  config.transient(LinkHandler, DefaultLinkHandler);
}

var BrowserHistory = exports.BrowserHistory = (_temp = _class = function (_History) {
  _inherits(BrowserHistory, _History);

  function BrowserHistory(linkHandler) {
    

    var _this2 = _possibleConstructorReturn(this, _History.call(this));

    _this2._isActive = false;
    _this2._checkUrlCallback = _this2._checkUrl.bind(_this2);

    _this2.location = _aureliaPal.PLATFORM.location;
    _this2.history = _aureliaPal.PLATFORM.history;
    _this2.linkHandler = linkHandler;
    return _this2;
  }

  BrowserHistory.prototype.activate = function activate(options) {
    if (this._isActive) {
      throw new Error('History has already been activated.');
    }

    var wantsPushState = !!options.pushState;

    this._isActive = true;
    this.options = Object.assign({}, { root: '/' }, this.options, options);

    this.root = ('/' + this.options.root + '/').replace(rootStripper, '/');

    this._wantsHashChange = this.options.hashChange !== false;
    this._hasPushState = !!(this.options.pushState && this.history && this.history.pushState);

    var eventName = void 0;
    if (this._hasPushState) {
      eventName = 'popstate';
    } else if (this._wantsHashChange) {
      eventName = 'hashchange';
    }

    _aureliaPal.PLATFORM.addEventListener(eventName, this._checkUrlCallback);

    if (this._wantsHashChange && wantsPushState) {
      var loc = this.location;
      var atRoot = loc.pathname.replace(/[^\/]$/, '$&/') === this.root;

      if (!this._hasPushState && !atRoot) {
        this.fragment = this._getFragment(null, true);
        this.location.replace(this.root + this.location.search + '#' + this.fragment);

        return true;
      } else if (this._hasPushState && atRoot && loc.hash) {
        this.fragment = this._getHash().replace(routeStripper, '');
        this.history.replaceState({}, _aureliaPal.DOM.title, this.root + this.fragment + loc.search);
      }
    }

    if (!this.fragment) {
      this.fragment = this._getFragment();
    }

    this.linkHandler.activate(this);

    if (!this.options.silent) {
      return this._loadUrl();
    }
  };

  BrowserHistory.prototype.deactivate = function deactivate() {
    _aureliaPal.PLATFORM.removeEventListener('popstate', this._checkUrlCallback);
    _aureliaPal.PLATFORM.removeEventListener('hashchange', this._checkUrlCallback);
    this._isActive = false;
    this.linkHandler.deactivate();
  };

  BrowserHistory.prototype.getAbsoluteRoot = function getAbsoluteRoot() {
    var origin = createOrigin(this.location.protocol, this.location.hostname, this.location.port);
    return '' + origin + this.root;
  };

  BrowserHistory.prototype.navigate = function navigate(fragment) {
    var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
        _ref$trigger = _ref.trigger,
        trigger = _ref$trigger === undefined ? true : _ref$trigger,
        _ref$replace = _ref.replace,
        replace = _ref$replace === undefined ? false : _ref$replace;

    if (fragment && absoluteUrl.test(fragment)) {
      this.location.href = fragment;
      return true;
    }

    if (!this._isActive) {
      return false;
    }

    fragment = this._getFragment(fragment || '');

    if (this.fragment === fragment && !replace) {
      return false;
    }

    this.fragment = fragment;

    var url = this.root + fragment;

    if (fragment === '' && url !== '/') {
      url = url.slice(0, -1);
    }

    if (this._hasPushState) {
      url = url.replace('//', '/');
      this.history[replace ? 'replaceState' : 'pushState']({}, _aureliaPal.DOM.title, url);
    } else if (this._wantsHashChange) {
      updateHash(this.location, fragment, replace);
    } else {
      this.location.assign(url);
    }

    if (trigger) {
      return this._loadUrl(fragment);
    }

    return true;
  };

  BrowserHistory.prototype.navigateBack = function navigateBack() {
    this.history.back();
  };

  BrowserHistory.prototype.setTitle = function setTitle(title) {
    _aureliaPal.DOM.title = title;
  };

  BrowserHistory.prototype.setState = function setState(key, value) {
    var state = Object.assign({}, this.history.state);
    var _location = this.location,
        pathname = _location.pathname,
        search = _location.search,
        hash = _location.hash;

    state[key] = value;
    this.history.replaceState(state, null, '' + pathname + search + hash);
  };

  BrowserHistory.prototype.getState = function getState(key) {
    var state = Object.assign({}, this.history.state);
    return state[key];
  };

  BrowserHistory.prototype._getHash = function _getHash() {
    return this.location.hash.substr(1);
  };

  BrowserHistory.prototype._getFragment = function _getFragment(fragment, forcePushState) {
    var root = void 0;

    if (!fragment) {
      if (this._hasPushState || !this._wantsHashChange || forcePushState) {
        fragment = this.location.pathname + this.location.search;
        root = this.root.replace(trailingSlash, '');
        if (!fragment.indexOf(root)) {
          fragment = fragment.substr(root.length);
        }
      } else {
        fragment = this._getHash();
      }
    }

    return '/' + fragment.replace(routeStripper, '');
  };

  BrowserHistory.prototype._checkUrl = function _checkUrl() {
    var current = this._getFragment();
    if (current !== this.fragment) {
      this._loadUrl();
    }
  };

  BrowserHistory.prototype._loadUrl = function _loadUrl(fragmentOverride) {
    var fragment = this.fragment = this._getFragment(fragmentOverride);

    return this.options.routeHandler ? this.options.routeHandler(fragment) : false;
  };

  return BrowserHistory;
}(_aureliaHistory.History), _class.inject = [LinkHandler], _temp);

var routeStripper = /^#?\/*|\s+$/g;

var rootStripper = /^\/+|\/+$/g;

var trailingSlash = /\/$/;

var absoluteUrl = /^([a-z][a-z0-9+\-.]*:)?\/\//i;

function updateHash(location, fragment, replace) {
  if (replace) {
    var _href = location.href.replace(/(javascript:|#).*$/, '');
    location.replace(_href + '#' + fragment);
  } else {
    location.hash = '#' + fragment;
  }
}

function createOrigin(protocol, hostname, port) {
  return protocol + '//' + hostname + (port ? ':' + port : '');
}
});

define('aurelia-history/dist/commonjs/aurelia-history',['require','exports','module'],function (require, exports, module) {'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});



function mi(name) {
  throw new Error('History must implement ' + name + '().');
}

var History = exports.History = function () {
  function History() {
    
  }

  History.prototype.activate = function activate(options) {
    mi('activate');
  };

  History.prototype.deactivate = function deactivate() {
    mi('deactivate');
  };

  History.prototype.getAbsoluteRoot = function getAbsoluteRoot() {
    mi('getAbsoluteRoot');
  };

  History.prototype.navigate = function navigate(fragment, options) {
    mi('navigate');
  };

  History.prototype.navigateBack = function navigateBack() {
    mi('navigateBack');
  };

  History.prototype.setTitle = function setTitle(title) {
    mi('setTitle');
  };

  History.prototype.setState = function setState(key, value) {
    mi('setState');
  };

  History.prototype.getState = function getState(key) {
    mi('getState');
  };

  return History;
}();
});

define('aurelia-loader-default/dist/commonjs/aurelia-loader-default',['require','exports','module','aurelia-loader','aurelia-pal','aurelia-metadata'],function (require, exports, module) {'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DefaultLoader = exports.TextTemplateLoader = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _aureliaLoader = require('aurelia-loader');

var _aureliaPal = require('aurelia-pal');

var _aureliaMetadata = require('aurelia-metadata');

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }



var TextTemplateLoader = exports.TextTemplateLoader = function () {
  function TextTemplateLoader() {
    
  }

  TextTemplateLoader.prototype.loadTemplate = function loadTemplate(loader, entry) {
    return loader.loadText(entry.address).then(function (text) {
      entry.template = _aureliaPal.DOM.createTemplateFromMarkup(text);
    });
  };

  return TextTemplateLoader;
}();

function ensureOriginOnExports(executed, name) {
  var target = executed;
  var key = void 0;
  var exportedValue = void 0;

  if (target.__useDefault) {
    target = target['default'];
  }

  _aureliaMetadata.Origin.set(target, new _aureliaMetadata.Origin(name, 'default'));

  for (key in target) {
    exportedValue = target[key];

    if (typeof exportedValue === 'function') {
      _aureliaMetadata.Origin.set(exportedValue, new _aureliaMetadata.Origin(name, key));
    }
  }

  return executed;
}

var DefaultLoader = exports.DefaultLoader = function (_Loader) {
  _inherits(DefaultLoader, _Loader);

  function DefaultLoader() {
    

    var _this = _possibleConstructorReturn(this, _Loader.call(this));

    _this.textPluginName = 'text';


    _this.moduleRegistry = Object.create(null);
    _this.useTemplateLoader(new TextTemplateLoader());

    var that = _this;

    _this.addPlugin('template-registry-entry', {
      'fetch': function fetch(address) {
        var entry = that.getOrCreateTemplateRegistryEntry(address);
        return entry.templateIsLoaded ? entry : that.templateLoader.loadTemplate(that, entry).then(function (x) {
          return entry;
        });
      }
    });
    return _this;
  }

  DefaultLoader.prototype.useTemplateLoader = function useTemplateLoader(templateLoader) {
    this.templateLoader = templateLoader;
  };

  DefaultLoader.prototype.loadAllModules = function loadAllModules(ids) {
    var loads = [];

    for (var i = 0, ii = ids.length; i < ii; ++i) {
      loads.push(this.loadModule(ids[i]));
    }

    return Promise.all(loads);
  };

  DefaultLoader.prototype.loadTemplate = function loadTemplate(url) {
    return this._import(this.applyPluginToUrl(url, 'template-registry-entry'));
  };

  DefaultLoader.prototype.loadText = function loadText(url) {
    return this._import(this.applyPluginToUrl(url, this.textPluginName)).then(function (textOrModule) {
      if (typeof textOrModule === 'string') {
        return textOrModule;
      }

      return textOrModule['default'];
    });
  };

  return DefaultLoader;
}(_aureliaLoader.Loader);

_aureliaPal.PLATFORM.Loader = DefaultLoader;

if (!_aureliaPal.PLATFORM.global.System || !_aureliaPal.PLATFORM.global.System.import) {
  if (_aureliaPal.PLATFORM.global.requirejs) {
    var defined = void 0;

    if (_typeof(_aureliaPal.PLATFORM.global.requirejs.s) === 'object') {
      defined = _aureliaPal.PLATFORM.global.requirejs.s.contexts._.defined;
    } else if (_typeof(_aureliaPal.PLATFORM.global.requirejs.contexts) === 'object') {
        defined = _aureliaPal.PLATFORM.global.requirejs.contexts._.defined;
      } else {
        throw new Error('Unknown AMD loader');
      }
    _aureliaPal.PLATFORM.eachModule = function (callback) {
      for (var key in defined) {
        try {
          if (callback(key, defined[key])) return;
        } catch (e) {}
      }
    };
  } else {
    _aureliaPal.PLATFORM.eachModule = function (callback) {};
  }

  DefaultLoader.prototype._import = function (moduleId) {
    return new Promise(function (resolve, reject) {
      _aureliaPal.PLATFORM.global.require([moduleId], resolve, reject);
    });
  };

  DefaultLoader.prototype.loadModule = function (id) {
    var _this2 = this;

    var existing = this.moduleRegistry[id];
    if (existing !== undefined) {
      return Promise.resolve(existing);
    }

    return new Promise(function (resolve, reject) {
      _aureliaPal.PLATFORM.global.require([id], function (m) {
        _this2.moduleRegistry[id] = m;
        resolve(ensureOriginOnExports(m, id));
      }, reject);
    });
  };

  DefaultLoader.prototype.map = function (id, source) {};

  DefaultLoader.prototype.normalize = function (moduleId, relativeTo) {
    return Promise.resolve(moduleId);
  };

  DefaultLoader.prototype.normalizeSync = function (moduleId, relativeTo) {
    return moduleId;
  };

  DefaultLoader.prototype.applyPluginToUrl = function (url, pluginName) {
    return pluginName + '!' + url;
  };

  DefaultLoader.prototype.addPlugin = function (pluginName, implementation) {
    var nonAnonDefine = define;
    nonAnonDefine(pluginName, [], {
      'load': function load(name, req, onload) {
        var result = implementation.fetch(name);
        Promise.resolve(result).then(onload);
      }
    });
  };
} else {
  _aureliaPal.PLATFORM.eachModule = function (callback) {
    if (System.registry) {
      var keys = Array.from(System.registry.keys());
      for (var i = 0; i < keys.length; i++) {
        try {
          var key = keys[i];
          if (callback(key, System.registry.get(key))) {
            return;
          }
        } catch (e) {}
      }
      return;
    }

    var modules = System._loader.modules;

    for (var _key in modules) {
      try {
        if (callback(_key, modules[_key].module)) return;
      } catch (e) {}
    }
  };

  DefaultLoader.prototype._import = function (moduleId) {
    return System.import(moduleId);
  };

  DefaultLoader.prototype.loadModule = function (id) {
    var _this3 = this;

    return System.normalize(id).then(function (newId) {
      var existing = _this3.moduleRegistry[newId];
      if (existing !== undefined) {
        return Promise.resolve(existing);
      }

      return System.import(newId).then(function (m) {
        _this3.moduleRegistry[newId] = m;
        return ensureOriginOnExports(m, newId);
      });
    });
  };

  DefaultLoader.prototype.map = function (id, source) {
    var _map;

    System.config({ map: (_map = {}, _map[id] = source, _map) });
  };

  DefaultLoader.prototype.normalizeSync = function (moduleId, relativeTo) {
    return System.normalizeSync(moduleId, relativeTo);
  };

  DefaultLoader.prototype.normalize = function (moduleId, relativeTo) {
    return System.normalize(moduleId, relativeTo);
  };

  DefaultLoader.prototype.applyPluginToUrl = function (url, pluginName) {
    return url + '!' + pluginName;
  };

  DefaultLoader.prototype.addPlugin = function (pluginName, implementation) {
    System.set(pluginName, System.newModule({
      'fetch': function fetch(load, _fetch) {
        var result = implementation.fetch(load.address);
        return Promise.resolve(result).then(function (x) {
          load.metadata.result = x;
          return '';
        });
      },
      'instantiate': function instantiate(load) {
        return load.metadata.result;
      }
    }));
  };
}
});

define('aurelia-loader/dist/commonjs/aurelia-loader',['require','exports','module','aurelia-path','aurelia-metadata'],function (require, exports, module) {'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Loader = exports.TemplateRegistryEntry = exports.TemplateDependency = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _aureliaPath = require('aurelia-path');

var _aureliaMetadata = require('aurelia-metadata');



var TemplateDependency = exports.TemplateDependency = function TemplateDependency(src, name) {
  

  this.src = src;
  this.name = name;
};

var TemplateRegistryEntry = exports.TemplateRegistryEntry = function () {
  function TemplateRegistryEntry(address) {
    

    this.templateIsLoaded = false;
    this.factoryIsReady = false;
    this.resources = null;
    this.dependencies = null;

    this.address = address;
    this.onReady = null;
    this._template = null;
    this._factory = null;
  }

  TemplateRegistryEntry.prototype.addDependency = function addDependency(src, name) {
    var finalSrc = typeof src === 'string' ? (0, _aureliaPath.relativeToFile)(src, this.address) : _aureliaMetadata.Origin.get(src).moduleId;

    this.dependencies.push(new TemplateDependency(finalSrc, name));
  };

  _createClass(TemplateRegistryEntry, [{
    key: 'template',
    get: function get() {
      return this._template;
    },
    set: function set(value) {
      var address = this.address;
      var requires = void 0;
      var current = void 0;
      var src = void 0;
      var dependencies = void 0;

      this._template = value;
      this.templateIsLoaded = true;

      requires = value.content.querySelectorAll('require');
      dependencies = this.dependencies = new Array(requires.length);

      for (var i = 0, ii = requires.length; i < ii; ++i) {
        current = requires[i];
        src = current.getAttribute('from');

        if (!src) {
          throw new Error('<require> element in ' + address + ' has no "from" attribute.');
        }

        dependencies[i] = new TemplateDependency((0, _aureliaPath.relativeToFile)(src, address), current.getAttribute('as'));

        if (current.parentNode) {
          current.parentNode.removeChild(current);
        }
      }
    }
  }, {
    key: 'factory',
    get: function get() {
      return this._factory;
    },
    set: function set(value) {
      this._factory = value;
      this.factoryIsReady = true;
    }
  }]);

  return TemplateRegistryEntry;
}();

var Loader = exports.Loader = function () {
  function Loader() {
    

    this.templateRegistry = {};
  }

  Loader.prototype.map = function map(id, source) {
    throw new Error('Loaders must implement map(id, source).');
  };

  Loader.prototype.normalizeSync = function normalizeSync(moduleId, relativeTo) {
    throw new Error('Loaders must implement normalizeSync(moduleId, relativeTo).');
  };

  Loader.prototype.normalize = function normalize(moduleId, relativeTo) {
    throw new Error('Loaders must implement normalize(moduleId: string, relativeTo: string): Promise<string>.');
  };

  Loader.prototype.loadModule = function loadModule(id) {
    throw new Error('Loaders must implement loadModule(id).');
  };

  Loader.prototype.loadAllModules = function loadAllModules(ids) {
    throw new Error('Loader must implement loadAllModules(ids).');
  };

  Loader.prototype.loadTemplate = function loadTemplate(url) {
    throw new Error('Loader must implement loadTemplate(url).');
  };

  Loader.prototype.loadText = function loadText(url) {
    throw new Error('Loader must implement loadText(url).');
  };

  Loader.prototype.applyPluginToUrl = function applyPluginToUrl(url, pluginName) {
    throw new Error('Loader must implement applyPluginToUrl(url, pluginName).');
  };

  Loader.prototype.addPlugin = function addPlugin(pluginName, implementation) {
    throw new Error('Loader must implement addPlugin(pluginName, implementation).');
  };

  Loader.prototype.getOrCreateTemplateRegistryEntry = function getOrCreateTemplateRegistryEntry(address) {
    return this.templateRegistry[address] || (this.templateRegistry[address] = new TemplateRegistryEntry(address));
  };

  return Loader;
}();
});

define('aurelia-logging-console/dist/commonjs/aurelia-logging-console',['require','exports','module','aurelia-logging'],function (require, exports, module) {'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ConsoleAppender = undefined;

var _aureliaLogging = require('aurelia-logging');



var ConsoleAppender = exports.ConsoleAppender = function () {
  function ConsoleAppender() {
    
  }

  ConsoleAppender.prototype.debug = function debug(logger) {
    var _console;

    for (var _len = arguments.length, rest = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      rest[_key - 1] = arguments[_key];
    }

    (_console = console).debug.apply(_console, ['DEBUG [' + logger.id + ']'].concat(rest));
  };

  ConsoleAppender.prototype.info = function info(logger) {
    var _console2;

    for (var _len2 = arguments.length, rest = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
      rest[_key2 - 1] = arguments[_key2];
    }

    (_console2 = console).info.apply(_console2, ['INFO [' + logger.id + ']'].concat(rest));
  };

  ConsoleAppender.prototype.warn = function warn(logger) {
    var _console3;

    for (var _len3 = arguments.length, rest = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
      rest[_key3 - 1] = arguments[_key3];
    }

    (_console3 = console).warn.apply(_console3, ['WARN [' + logger.id + ']'].concat(rest));
  };

  ConsoleAppender.prototype.error = function error(logger) {
    var _console4;

    for (var _len4 = arguments.length, rest = Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
      rest[_key4 - 1] = arguments[_key4];
    }

    (_console4 = console).error.apply(_console4, ['ERROR [' + logger.id + ']'].concat(rest));
  };

  return ConsoleAppender;
}();
});

define('aurelia-logging/dist/commonjs/aurelia-logging',['require','exports','module'],function (require, exports, module) {'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getLogger = getLogger;
exports.addAppender = addAppender;
exports.removeAppender = removeAppender;
exports.getAppenders = getAppenders;
exports.clearAppenders = clearAppenders;
exports.addCustomLevel = addCustomLevel;
exports.removeCustomLevel = removeCustomLevel;
exports.setLevel = setLevel;
exports.getLevel = getLevel;



var logLevel = exports.logLevel = {
  none: 0,
  error: 10,
  warn: 20,
  info: 30,
  debug: 40
};

var loggers = {};
var appenders = [];
var globalDefaultLevel = logLevel.none;

var standardLevels = ['none', 'error', 'warn', 'info', 'debug'];
function isStandardLevel(level) {
  return standardLevels.filter(function (l) {
    return l === level;
  }).length > 0;
}

function appendArgs() {
  return [this].concat(Array.prototype.slice.call(arguments));
}

function logFactory(level) {
  var threshold = logLevel[level];
  return function () {
    if (this.level < threshold) {
      return;
    }

    var args = appendArgs.apply(this, arguments);
    var i = appenders.length;
    while (i--) {
      var _appenders$i;

      (_appenders$i = appenders[i])[level].apply(_appenders$i, args);
    }
  };
}

function logFactoryCustom(level) {
  var threshold = logLevel[level];
  return function () {
    if (this.level < threshold) {
      return;
    }

    var args = appendArgs.apply(this, arguments);
    var i = appenders.length;
    while (i--) {
      var appender = appenders[i];
      if (appender[level] !== undefined) {
        appender[level].apply(appender, args);
      }
    }
  };
}

function connectLoggers() {
  var proto = Logger.prototype;
  for (var _level in logLevel) {
    if (isStandardLevel(_level)) {
      if (_level !== 'none') {
        proto[_level] = logFactory(_level);
      }
    } else {
      proto[_level] = logFactoryCustom(_level);
    }
  }
}

function disconnectLoggers() {
  var proto = Logger.prototype;
  for (var _level2 in logLevel) {
    if (_level2 !== 'none') {
      proto[_level2] = function () {};
    }
  }
}

function getLogger(id) {
  return loggers[id] || new Logger(id);
}

function addAppender(appender) {
  if (appenders.push(appender) === 1) {
    connectLoggers();
  }
}

function removeAppender(appender) {
  appenders = appenders.filter(function (a) {
    return a !== appender;
  });
}

function getAppenders() {
  return [].concat(appenders);
}

function clearAppenders() {
  appenders = [];
  disconnectLoggers();
}

function addCustomLevel(name, value) {
  if (logLevel[name] !== undefined) {
    throw Error('Log level "' + name + '" already exists.');
  }

  if (isNaN(value)) {
    throw Error('Value must be a number.');
  }

  logLevel[name] = value;

  if (appenders.length > 0) {
    connectLoggers();
  } else {
    Logger.prototype[name] = function () {};
  }
}

function removeCustomLevel(name) {
  if (logLevel[name] === undefined) {
    return;
  }

  if (isStandardLevel(name)) {
    throw Error('Built-in log level "' + name + '" cannot be removed.');
  }

  delete logLevel[name];
  delete Logger.prototype[name];
}

function setLevel(level) {
  globalDefaultLevel = level;
  for (var key in loggers) {
    loggers[key].setLevel(level);
  }
}

function getLevel() {
  return globalDefaultLevel;
}

var Logger = exports.Logger = function () {
  function Logger(id) {
    

    var cached = loggers[id];
    if (cached) {
      return cached;
    }

    loggers[id] = this;
    this.id = id;
    this.level = globalDefaultLevel;
  }

  Logger.prototype.debug = function debug(message) {};

  Logger.prototype.info = function info(message) {};

  Logger.prototype.warn = function warn(message) {};

  Logger.prototype.error = function error(message) {};

  Logger.prototype.setLevel = function setLevel(level) {
    this.level = level;
  };

  Logger.prototype.isDebugEnabled = function isDebugEnabled() {
    return this.level === logLevel.debug;
  };

  return Logger;
}();
});

define('aurelia-metadata/dist/commonjs/aurelia-metadata',['require','exports','module','aurelia-pal'],function (require, exports, module) {'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Origin = exports.metadata = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.decorators = decorators;
exports.deprecated = deprecated;
exports.mixin = mixin;
exports.protocol = protocol;

var _aureliaPal = require('aurelia-pal');



function isObject(val) {
  return val && (typeof val === 'function' || (typeof val === 'undefined' ? 'undefined' : _typeof(val)) === 'object');
}

var metadata = exports.metadata = {
  resource: 'aurelia:resource',
  paramTypes: 'design:paramtypes',
  propertyType: 'design:type',
  properties: 'design:properties',
  get: function get(metadataKey, target, targetKey) {
    if (!isObject(target)) {
      return undefined;
    }
    var result = metadata.getOwn(metadataKey, target, targetKey);
    return result === undefined ? metadata.get(metadataKey, Object.getPrototypeOf(target), targetKey) : result;
  },
  getOwn: function getOwn(metadataKey, target, targetKey) {
    if (!isObject(target)) {
      return undefined;
    }
    return Reflect.getOwnMetadata(metadataKey, target, targetKey);
  },
  define: function define(metadataKey, metadataValue, target, targetKey) {
    Reflect.defineMetadata(metadataKey, metadataValue, target, targetKey);
  },
  getOrCreateOwn: function getOrCreateOwn(metadataKey, Type, target, targetKey) {
    var result = metadata.getOwn(metadataKey, target, targetKey);

    if (result === undefined) {
      result = new Type();
      Reflect.defineMetadata(metadataKey, result, target, targetKey);
    }

    return result;
  }
};

var originStorage = new Map();
var unknownOrigin = Object.freeze({ moduleId: undefined, moduleMember: undefined });

var Origin = exports.Origin = function () {
  function Origin(moduleId, moduleMember) {
    

    this.moduleId = moduleId;
    this.moduleMember = moduleMember;
  }

  Origin.get = function get(fn) {
    var origin = originStorage.get(fn);

    if (origin === undefined) {
      _aureliaPal.PLATFORM.eachModule(function (key, value) {
        if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
          for (var name in value) {
            try {
              var exp = value[name];
              if (exp === fn) {
                originStorage.set(fn, origin = new Origin(key, name));
                return true;
              }
            } catch (e) {}
          }
        }

        if (value === fn) {
          originStorage.set(fn, origin = new Origin(key, 'default'));
          return true;
        }

        return false;
      });
    }

    return origin || unknownOrigin;
  };

  Origin.set = function set(fn, origin) {
    originStorage.set(fn, origin);
  };

  return Origin;
}();

function decorators() {
  for (var _len = arguments.length, rest = Array(_len), _key = 0; _key < _len; _key++) {
    rest[_key] = arguments[_key];
  }

  var applicator = function applicator(target, key, descriptor) {
    var i = rest.length;

    if (key) {
      descriptor = descriptor || {
        value: target[key],
        writable: true,
        configurable: true,
        enumerable: true
      };

      while (i--) {
        descriptor = rest[i](target, key, descriptor) || descriptor;
      }

      Object.defineProperty(target, key, descriptor);
    } else {
      while (i--) {
        target = rest[i](target) || target;
      }
    }

    return target;
  };

  applicator.on = applicator;
  return applicator;
}

function deprecated(optionsOrTarget, maybeKey, maybeDescriptor) {
  function decorator(target, key, descriptor) {
    var methodSignature = target.constructor.name + '#' + key;
    var options = maybeKey ? {} : optionsOrTarget || {};
    var message = 'DEPRECATION - ' + methodSignature;

    if (typeof descriptor.value !== 'function') {
      throw new SyntaxError('Only methods can be marked as deprecated.');
    }

    if (options.message) {
      message += ' - ' + options.message;
    }

    return _extends({}, descriptor, {
      value: function deprecationWrapper() {
        if (options.error) {
          throw new Error(message);
        } else {
          console.warn(message);
        }

        return descriptor.value.apply(this, arguments);
      }
    });
  }

  return maybeKey ? decorator(optionsOrTarget, maybeKey, maybeDescriptor) : decorator;
}

function mixin(behavior) {
  var instanceKeys = Object.keys(behavior);

  function _mixin(possible) {
    var decorator = function decorator(target) {
      var resolvedTarget = typeof target === 'function' ? target.prototype : target;

      var i = instanceKeys.length;
      while (i--) {
        var property = instanceKeys[i];
        Object.defineProperty(resolvedTarget, property, {
          value: behavior[property],
          writable: true
        });
      }
    };

    return possible ? decorator(possible) : decorator;
  }

  return _mixin;
}

function alwaysValid() {
  return true;
}
function noCompose() {}

function ensureProtocolOptions(options) {
  if (options === undefined) {
    options = {};
  } else if (typeof options === 'function') {
    options = {
      validate: options
    };
  }

  if (!options.validate) {
    options.validate = alwaysValid;
  }

  if (!options.compose) {
    options.compose = noCompose;
  }

  return options;
}

function createProtocolValidator(validate) {
  return function (target) {
    var result = validate(target);
    return result === true;
  };
}

function createProtocolAsserter(name, validate) {
  return function (target) {
    var result = validate(target);
    if (result !== true) {
      throw new Error(result || name + ' was not correctly implemented.');
    }
  };
}

function protocol(name, options) {
  options = ensureProtocolOptions(options);

  var result = function result(target) {
    var resolvedTarget = typeof target === 'function' ? target.prototype : target;

    options.compose(resolvedTarget);
    result.assert(resolvedTarget);

    Object.defineProperty(resolvedTarget, 'protocol:' + name, {
      enumerable: false,
      configurable: false,
      writable: false,
      value: true
    });
  };

  result.validate = createProtocolValidator(options.validate);
  result.assert = createProtocolAsserter(name, options.validate);

  return result;
}

protocol.create = function (name, options) {
  options = ensureProtocolOptions(options);
  var hidden = 'protocol:' + name;
  var result = function result(target) {
    var decorator = protocol(name, options);
    return target ? decorator(target) : decorator;
  };

  result.decorates = function (obj) {
    return obj[hidden] === true;
  };
  result.validate = createProtocolValidator(options.validate);
  result.assert = createProtocolAsserter(name, options.validate);

  return result;
};
});

define('aurelia-pal-browser/dist/commonjs/aurelia-pal-browser',['require','exports','module','aurelia-pal'],function (require, exports, module) {'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._DOM = exports._FEATURE = exports._PLATFORM = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.initialize = initialize;

var _aureliaPal = require('aurelia-pal');

var _PLATFORM = exports._PLATFORM = {
  location: window.location,
  history: window.history,
  addEventListener: function addEventListener(eventName, callback, capture) {
    this.global.addEventListener(eventName, callback, capture);
  },
  removeEventListener: function removeEventListener(eventName, callback, capture) {
    this.global.removeEventListener(eventName, callback, capture);
  },

  performance: window.performance,
  requestAnimationFrame: function requestAnimationFrame(callback) {
    return this.global.requestAnimationFrame(callback);
  }
};

if (typeof FEATURE_NO_IE === 'undefined') {
  var test = function test() {};

  if (test.name === undefined) {
    Object.defineProperty(Function.prototype, 'name', {
      get: function get() {
        var name = this.toString().match(/^\s*function\s*(\S*)\s*\(/)[1];

        Object.defineProperty(this, 'name', { value: name });
        return name;
      }
    });
  }
}

if (typeof FEATURE_NO_IE === 'undefined') {
  if (!('classList' in document.createElement('_')) || document.createElementNS && !('classList' in document.createElementNS('http://www.w3.org/2000/svg', 'g'))) {
    var protoProp = 'prototype';
    var strTrim = String.prototype.trim;
    var arrIndexOf = Array.prototype.indexOf;
    var emptyArray = [];

    var DOMEx = function DOMEx(type, message) {
      this.name = type;
      this.code = DOMException[type];
      this.message = message;
    };

    var checkTokenAndGetIndex = function checkTokenAndGetIndex(classList, token) {
      if (token === '') {
        throw new DOMEx('SYNTAX_ERR', 'An invalid or illegal string was specified');
      }

      if (/\s/.test(token)) {
        throw new DOMEx('INVALID_CHARACTER_ERR', 'String contains an invalid character');
      }

      return arrIndexOf.call(classList, token);
    };

    var ClassList = function ClassList(elem) {
      var trimmedClasses = strTrim.call(elem.getAttribute('class') || '');
      var classes = trimmedClasses ? trimmedClasses.split(/\s+/) : emptyArray;

      for (var i = 0, ii = classes.length; i < ii; ++i) {
        this.push(classes[i]);
      }

      this._updateClassName = function () {
        elem.setAttribute('class', this.toString());
      };
    };

    var classListProto = ClassList[protoProp] = [];

    DOMEx[protoProp] = Error[protoProp];

    classListProto.item = function (i) {
      return this[i] || null;
    };

    classListProto.contains = function (token) {
      token += '';
      return checkTokenAndGetIndex(this, token) !== -1;
    };

    classListProto.add = function () {
      var tokens = arguments;
      var i = 0;
      var ii = tokens.length;
      var token = void 0;
      var updated = false;

      do {
        token = tokens[i] + '';
        if (checkTokenAndGetIndex(this, token) === -1) {
          this.push(token);
          updated = true;
        }
      } while (++i < ii);

      if (updated) {
        this._updateClassName();
      }
    };

    classListProto.remove = function () {
      var tokens = arguments;
      var i = 0;
      var ii = tokens.length;
      var token = void 0;
      var updated = false;
      var index = void 0;

      do {
        token = tokens[i] + '';
        index = checkTokenAndGetIndex(this, token);
        while (index !== -1) {
          this.splice(index, 1);
          updated = true;
          index = checkTokenAndGetIndex(this, token);
        }
      } while (++i < ii);

      if (updated) {
        this._updateClassName();
      }
    };

    classListProto.toggle = function (token, force) {
      token += '';

      var result = this.contains(token);
      var method = result ? force !== true && 'remove' : force !== false && 'add';

      if (method) {
        this[method](token);
      }

      if (force === true || force === false) {
        return force;
      }

      return !result;
    };

    classListProto.toString = function () {
      return this.join(' ');
    };

    Object.defineProperty(Element.prototype, 'classList', {
      get: function get() {
        return new ClassList(this);
      },
      enumerable: true,
      configurable: true
    });
  } else {
    var testElement = document.createElement('_');
    testElement.classList.add('c1', 'c2');

    if (!testElement.classList.contains('c2')) {
      var createMethod = function createMethod(method) {
        var original = DOMTokenList.prototype[method];

        DOMTokenList.prototype[method] = function (token) {
          for (var i = 0, ii = arguments.length; i < ii; ++i) {
            token = arguments[i];
            original.call(this, token);
          }
        };
      };

      createMethod('add');
      createMethod('remove');
    }

    testElement.classList.toggle('c3', false);

    if (testElement.classList.contains('c3')) {
      var _toggle = DOMTokenList.prototype.toggle;

      DOMTokenList.prototype.toggle = function (token, force) {
        if (1 in arguments && !this.contains(token) === !force) {
          return force;
        }

        return _toggle.call(this, token);
      };
    }

    testElement = null;
  }
}

if (typeof FEATURE_NO_IE === 'undefined') {
  var _filterEntries = function _filterEntries(key, value) {
    var i = 0,
        n = _entries.length,
        result = [];
    for (; i < n; i++) {
      if (_entries[i][key] == value) {
        result.push(_entries[i]);
      }
    }
    return result;
  };

  var _clearEntries = function _clearEntries(type, name) {
    var i = _entries.length,
        entry;
    while (i--) {
      entry = _entries[i];
      if (entry.entryType == type && (name === void 0 || entry.name == name)) {
        _entries.splice(i, 1);
      }
    }
  };

  // @license http://opensource.org/licenses/MIT
  if ('performance' in window === false) {
    window.performance = {};
  }

  if ('now' in window.performance === false) {
    var nowOffset = Date.now();

    if (performance.timing && performance.timing.navigationStart) {
      nowOffset = performance.timing.navigationStart;
    }

    window.performance.now = function now() {
      return Date.now() - nowOffset;
    };
  }

  var startOffset = Date.now ? Date.now() : +new Date();
  var _entries = [];
  var _marksIndex = {};

  ;

  if (!window.performance.mark) {
    window.performance.mark = window.performance.webkitMark || function (name) {
      var mark = {
        name: name,
        entryType: "mark",
        startTime: window.performance.now(),
        duration: 0
      };

      _entries.push(mark);
      _marksIndex[name] = mark;
    };
  }

  if (!window.performance.measure) {
    window.performance.measure = window.performance.webkitMeasure || function (name, startMark, endMark) {
      startMark = _marksIndex[startMark].startTime;
      endMark = _marksIndex[endMark].startTime;

      _entries.push({
        name: name,
        entryType: "measure",
        startTime: startMark,
        duration: endMark - startMark
      });
    };
  }

  if (!window.performance.getEntriesByType) {
    window.performance.getEntriesByType = window.performance.webkitGetEntriesByType || function (type) {
      return _filterEntries("entryType", type);
    };
  }

  if (!window.performance.getEntriesByName) {
    window.performance.getEntriesByName = window.performance.webkitGetEntriesByName || function (name) {
      return _filterEntries("name", name);
    };
  }

  if (!window.performance.clearMarks) {
    window.performance.clearMarks = window.performance.webkitClearMarks || function (name) {
      _clearEntries("mark", name);
    };
  }

  if (!window.performance.clearMeasures) {
    window.performance.clearMeasures = window.performance.webkitClearMeasures || function (name) {
      _clearEntries("measure", name);
    };
  }

  _PLATFORM.performance = window.performance;
}

if (typeof FEATURE_NO_IE === 'undefined') {
  var con = window.console = window.console || {};
  var nop = function nop() {};

  if (!con.memory) con.memory = {};
  ('assert,clear,count,debug,dir,dirxml,error,exception,group,' + 'groupCollapsed,groupEnd,info,log,markTimeline,profile,profiles,profileEnd,' + 'show,table,time,timeEnd,timeline,timelineEnd,timeStamp,trace,warn').split(',').forEach(function (m) {
    if (!con[m]) con[m] = nop;
  });

  if (_typeof(con.log) === 'object') {
    'log,info,warn,error,assert,dir,clear,profile,profileEnd'.split(',').forEach(function (method) {
      console[method] = this.bind(console[method], console);
    }, Function.prototype.call);
  }
}

if (typeof FEATURE_NO_IE === 'undefined') {
  if (!window.CustomEvent || typeof window.CustomEvent !== 'function') {
    var _CustomEvent = function _CustomEvent(event, params) {
      params = params || {
        bubbles: false,
        cancelable: false,
        detail: undefined
      };

      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
      return evt;
    };

    _CustomEvent.prototype = window.Event.prototype;
    window.CustomEvent = _CustomEvent;
  }
}

if (Element && !Element.prototype.matches) {
  var proto = Element.prototype;
  proto.matches = proto.matchesSelector || proto.mozMatchesSelector || proto.msMatchesSelector || proto.oMatchesSelector || proto.webkitMatchesSelector;
}

var _FEATURE = exports._FEATURE = {
  shadowDOM: !!HTMLElement.prototype.attachShadow,
  scopedCSS: 'scoped' in document.createElement('style'),
  htmlTemplateElement: function () {
    var d = document.createElement('div');
    d.innerHTML = '<template></template>';
    return 'content' in d.children[0];
  }(),
  mutationObserver: !!(window.MutationObserver || window.WebKitMutationObserver),
  ensureHTMLTemplateElement: function ensureHTMLTemplateElement(t) {
    return t;
  }
};

if (typeof FEATURE_NO_IE === 'undefined') {
  var isSVGTemplate = function isSVGTemplate(el) {
    return el.tagName === 'template' && el.namespaceURI === 'http://www.w3.org/2000/svg';
  };

  var fixSVGTemplateElement = function fixSVGTemplateElement(el) {
    var template = el.ownerDocument.createElement('template');
    var attrs = el.attributes;
    var length = attrs.length;
    var attr = void 0;

    el.parentNode.insertBefore(template, el);

    while (length-- > 0) {
      attr = attrs[length];
      template.setAttribute(attr.name, attr.value);
      el.removeAttribute(attr.name);
    }

    el.parentNode.removeChild(el);

    return fixHTMLTemplateElement(template);
  };

  var fixHTMLTemplateElement = function fixHTMLTemplateElement(template) {
    var content = template.content = document.createDocumentFragment();
    var child = void 0;

    while (child = template.firstChild) {
      content.appendChild(child);
    }

    return template;
  };

  var fixHTMLTemplateElementRoot = function fixHTMLTemplateElementRoot(template) {
    var content = fixHTMLTemplateElement(template).content;
    var childTemplates = content.querySelectorAll('template');

    for (var i = 0, ii = childTemplates.length; i < ii; ++i) {
      var child = childTemplates[i];

      if (isSVGTemplate(child)) {
        fixSVGTemplateElement(child);
      } else {
        fixHTMLTemplateElement(child);
      }
    }

    return template;
  };

  if (!_FEATURE.htmlTemplateElement) {
    _FEATURE.ensureHTMLTemplateElement = fixHTMLTemplateElementRoot;
  }
}

var shadowPoly = window.ShadowDOMPolyfill || null;

var _DOM = exports._DOM = {
  Element: Element,
  NodeList: NodeList,
  SVGElement: SVGElement,
  boundary: 'aurelia-dom-boundary',
  addEventListener: function addEventListener(eventName, callback, capture) {
    document.addEventListener(eventName, callback, capture);
  },
  removeEventListener: function removeEventListener(eventName, callback, capture) {
    document.removeEventListener(eventName, callback, capture);
  },
  adoptNode: function adoptNode(node) {
    return document.adoptNode(node);
  },
  createAttribute: function createAttribute(name) {
    return document.createAttribute(name);
  },
  createElement: function createElement(tagName) {
    return document.createElement(tagName);
  },
  createTextNode: function createTextNode(text) {
    return document.createTextNode(text);
  },
  createComment: function createComment(text) {
    return document.createComment(text);
  },
  createDocumentFragment: function createDocumentFragment() {
    return document.createDocumentFragment();
  },
  createTemplateElement: function createTemplateElement() {
    var template = document.createElement('template');
    return _FEATURE.ensureHTMLTemplateElement(template);
  },
  createMutationObserver: function createMutationObserver(callback) {
    return new (window.MutationObserver || window.WebKitMutationObserver)(callback);
  },
  createCustomEvent: function createCustomEvent(eventType, options) {
    return new window.CustomEvent(eventType, options);
  },
  dispatchEvent: function dispatchEvent(evt) {
    document.dispatchEvent(evt);
  },
  getComputedStyle: function getComputedStyle(element) {
    return window.getComputedStyle(element);
  },
  getElementById: function getElementById(id) {
    return document.getElementById(id);
  },
  querySelector: function querySelector(query) {
    return document.querySelector(query);
  },
  querySelectorAll: function querySelectorAll(query) {
    return document.querySelectorAll(query);
  },
  nextElementSibling: function nextElementSibling(element) {
    if (element.nextElementSibling) {
      return element.nextElementSibling;
    }
    do {
      element = element.nextSibling;
    } while (element && element.nodeType !== 1);
    return element;
  },
  createTemplateFromMarkup: function createTemplateFromMarkup(markup) {
    var parser = document.createElement('div');
    parser.innerHTML = markup;

    var temp = parser.firstElementChild;
    if (!temp || temp.nodeName !== 'TEMPLATE') {
      throw new Error('Template markup must be wrapped in a <template> element e.g. <template> <!-- markup here --> </template>');
    }

    return _FEATURE.ensureHTMLTemplateElement(temp);
  },
  appendNode: function appendNode(newNode, parentNode) {
    (parentNode || document.body).appendChild(newNode);
  },
  replaceNode: function replaceNode(newNode, node, parentNode) {
    if (node.parentNode) {
      node.parentNode.replaceChild(newNode, node);
    } else if (shadowPoly !== null) {
      shadowPoly.unwrap(parentNode).replaceChild(shadowPoly.unwrap(newNode), shadowPoly.unwrap(node));
    } else {
      parentNode.replaceChild(newNode, node);
    }
  },
  removeNode: function removeNode(node, parentNode) {
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    } else if (parentNode) {
      if (shadowPoly !== null) {
        shadowPoly.unwrap(parentNode).removeChild(shadowPoly.unwrap(node));
      } else {
        parentNode.removeChild(node);
      }
    }
  },
  injectStyles: function injectStyles(styles, destination, prepend, id) {
    if (id) {
      var oldStyle = document.getElementById(id);
      if (oldStyle) {
        var isStyleTag = oldStyle.tagName.toLowerCase() === 'style';

        if (isStyleTag) {
          oldStyle.innerHTML = styles;
          return;
        }

        throw new Error('The provided id does not indicate a style tag.');
      }
    }

    var node = document.createElement('style');
    node.innerHTML = styles;
    node.type = 'text/css';

    if (id) {
      node.id = id;
    }

    destination = destination || document.head;

    if (prepend && destination.childNodes.length > 0) {
      destination.insertBefore(node, destination.childNodes[0]);
    } else {
      destination.appendChild(node);
    }

    return node;
  }
};

function initialize() {
  if (_aureliaPal.isInitialized) {
    return;
  }

  (0, _aureliaPal.initializePAL)(function (platform, feature, dom) {
    Object.assign(platform, _PLATFORM);
    Object.assign(feature, _FEATURE);
    Object.assign(dom, _DOM);

    Object.defineProperty(dom, 'title', {
      get: function get() {
        return document.title;
      },
      set: function set(value) {
        document.title = value;
      }
    });

    Object.defineProperty(dom, 'activeElement', {
      get: function get() {
        return document.activeElement;
      }
    });

    Object.defineProperty(platform, 'XMLHttpRequest', {
      get: function get() {
        return platform.global.XMLHttpRequest;
      }
    });
  });
}
});

define('aurelia-pal/dist/commonjs/aurelia-pal',['require','exports','module'],function (require, exports, module) {'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AggregateError = AggregateError;
exports.initializePAL = initializePAL;
exports.reset = reset;
function AggregateError(message, innerError, skipIfAlreadyAggregate) {
  if (innerError) {
    if (innerError.innerError && skipIfAlreadyAggregate) {
      return innerError;
    }

    var separator = '\n------------------------------------------------\n';

    message += separator + 'Inner Error:\n';

    if (typeof innerError === 'string') {
      message += 'Message: ' + innerError;
    } else {
      if (innerError.message) {
        message += 'Message: ' + innerError.message;
      } else {
        message += 'Unknown Inner Error Type. Displaying Inner Error as JSON:\n ' + JSON.stringify(innerError, null, '  ');
      }

      if (innerError.stack) {
        message += '\nInner Error Stack:\n' + innerError.stack;
        message += '\nEnd Inner Error Stack';
      }
    }

    message += separator;
  }

  var e = new Error(message);
  if (innerError) {
    e.innerError = innerError;
  }

  return e;
}

var FEATURE = exports.FEATURE = {};

var PLATFORM = exports.PLATFORM = {
  noop: function noop() {},
  eachModule: function eachModule() {},
  moduleName: function (_moduleName) {
    function moduleName(_x) {
      return _moduleName.apply(this, arguments);
    }

    moduleName.toString = function () {
      return _moduleName.toString();
    };

    return moduleName;
  }(function (moduleName) {
    return moduleName;
  })
};

PLATFORM.global = function () {
  if (typeof self !== 'undefined') {
    return self;
  }

  if (typeof global !== 'undefined') {
    return global;
  }

  return new Function('return this')();
}();

var DOM = exports.DOM = {};
var isInitialized = exports.isInitialized = false;
function initializePAL(callback) {
  if (isInitialized) {
    return;
  }
  exports.isInitialized = isInitialized = true;
  if (typeof Object.getPropertyDescriptor !== 'function') {
    Object.getPropertyDescriptor = function (subject, name) {
      var pd = Object.getOwnPropertyDescriptor(subject, name);
      var proto = Object.getPrototypeOf(subject);
      while (typeof pd === 'undefined' && proto !== null) {
        pd = Object.getOwnPropertyDescriptor(proto, name);
        proto = Object.getPrototypeOf(proto);
      }
      return pd;
    };
  }

  callback(PLATFORM, FEATURE, DOM);
}
function reset() {
  exports.isInitialized = isInitialized = false;
}
});

define('aurelia-path/dist/commonjs/aurelia-path',['require','exports','module'],function (require, exports, module) {'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

exports.relativeToFile = relativeToFile;
exports.join = join;
exports.buildQueryString = buildQueryString;
exports.parseQueryString = parseQueryString;

function trimDots(ary) {
  for (var i = 0; i < ary.length; ++i) {
    var part = ary[i];
    if (part === '.') {
      ary.splice(i, 1);
      i -= 1;
    } else if (part === '..') {
      if (i === 0 || i === 1 && ary[2] === '..' || ary[i - 1] === '..') {
        continue;
      } else if (i > 0) {
        ary.splice(i - 1, 2);
        i -= 2;
      }
    }
  }
}

function relativeToFile(name, file) {
  var fileParts = file && file.split('/');
  var nameParts = name.trim().split('/');

  if (nameParts[0].charAt(0) === '.' && fileParts) {
    var normalizedBaseParts = fileParts.slice(0, fileParts.length - 1);
    nameParts.unshift.apply(nameParts, normalizedBaseParts);
  }

  trimDots(nameParts);

  return nameParts.join('/');
}

function join(path1, path2) {
  if (!path1) {
    return path2;
  }

  if (!path2) {
    return path1;
  }

  var schemeMatch = path1.match(/^([^/]*?:)\//);
  var scheme = schemeMatch && schemeMatch.length > 0 ? schemeMatch[1] : '';
  path1 = path1.substr(scheme.length);

  var urlPrefix = void 0;
  if (path1.indexOf('///') === 0 && scheme === 'file:') {
    urlPrefix = '///';
  } else if (path1.indexOf('//') === 0) {
    urlPrefix = '//';
  } else if (path1.indexOf('/') === 0) {
    urlPrefix = '/';
  } else {
    urlPrefix = '';
  }

  var trailingSlash = path2.slice(-1) === '/' ? '/' : '';

  var url1 = path1.split('/');
  var url2 = path2.split('/');
  var url3 = [];

  for (var i = 0, ii = url1.length; i < ii; ++i) {
    if (url1[i] === '..') {
      url3.pop();
    } else if (url1[i] === '.' || url1[i] === '') {
      continue;
    } else {
      url3.push(url1[i]);
    }
  }

  for (var _i = 0, _ii = url2.length; _i < _ii; ++_i) {
    if (url2[_i] === '..') {
      url3.pop();
    } else if (url2[_i] === '.' || url2[_i] === '') {
      continue;
    } else {
      url3.push(url2[_i]);
    }
  }

  return scheme + urlPrefix + url3.join('/') + trailingSlash;
}

var encode = encodeURIComponent;
var encodeKey = function encodeKey(k) {
  return encode(k).replace('%24', '$');
};

function buildParam(key, value, traditional) {
  var result = [];
  if (value === null || value === undefined) {
    return result;
  }
  if (Array.isArray(value)) {
    for (var i = 0, l = value.length; i < l; i++) {
      if (traditional) {
        result.push(encodeKey(key) + '=' + encode(value[i]));
      } else {
        var arrayKey = key + '[' + (_typeof(value[i]) === 'object' && value[i] !== null ? i : '') + ']';
        result = result.concat(buildParam(arrayKey, value[i]));
      }
    }
  } else if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' && !traditional) {
    for (var propertyName in value) {
      result = result.concat(buildParam(key + '[' + propertyName + ']', value[propertyName]));
    }
  } else {
    result.push(encodeKey(key) + '=' + encode(value));
  }
  return result;
}

function buildQueryString(params, traditional) {
  var pairs = [];
  var keys = Object.keys(params || {}).sort();
  for (var i = 0, len = keys.length; i < len; i++) {
    var key = keys[i];
    pairs = pairs.concat(buildParam(key, params[key], traditional));
  }

  if (pairs.length === 0) {
    return '';
  }

  return pairs.join('&');
}

function processScalarParam(existedParam, value) {
  if (Array.isArray(existedParam)) {
    existedParam.push(value);
    return existedParam;
  }
  if (existedParam !== undefined) {
    return [existedParam, value];
  }

  return value;
}

function parseComplexParam(queryParams, keys, value) {
  var currentParams = queryParams;
  var keysLastIndex = keys.length - 1;
  for (var j = 0; j <= keysLastIndex; j++) {
    var key = keys[j] === '' ? currentParams.length : keys[j];
    if (j < keysLastIndex) {
      var prevValue = !currentParams[key] || _typeof(currentParams[key]) === 'object' ? currentParams[key] : [currentParams[key]];
      currentParams = currentParams[key] = prevValue || (isNaN(keys[j + 1]) ? {} : []);
    } else {
      currentParams = currentParams[key] = value;
    }
  }
}

function parseQueryString(queryString) {
  var queryParams = {};
  if (!queryString || typeof queryString !== 'string') {
    return queryParams;
  }

  var query = queryString;
  if (query.charAt(0) === '?') {
    query = query.substr(1);
  }

  var pairs = query.replace(/\+/g, ' ').split('&');
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i].split('=');
    var key = decodeURIComponent(pair[0]);
    if (!key) {
      continue;
    }

    var keys = key.split('][');
    var keysLastIndex = keys.length - 1;

    if (/\[/.test(keys[0]) && /\]$/.test(keys[keysLastIndex])) {
      keys[keysLastIndex] = keys[keysLastIndex].replace(/\]$/, '');
      keys = keys.shift().split('[').concat(keys);
      keysLastIndex = keys.length - 1;
    } else {
      keysLastIndex = 0;
    }

    if (pair.length >= 2) {
      var value = pair[1] ? decodeURIComponent(pair[1]) : '';
      if (keysLastIndex) {
        parseComplexParam(queryParams, keys, value);
      } else {
        queryParams[key] = processScalarParam(queryParams[key], value);
      }
    } else {
      queryParams[key] = true;
    }
  }
  return queryParams;
}
});

define('aurelia-polyfills/dist/commonjs/aurelia-polyfills',['require','exports','module','aurelia-pal'],function (require, exports, module) {'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _aureliaPal = require('aurelia-pal');

if (typeof FEATURE_NO_ES2015 === 'undefined') {

  (function (Object, GOPS) {
    'use strict';

    if (GOPS in Object) return;

    var setDescriptor,
        G = _aureliaPal.PLATFORM.global,
        id = 0,
        random = '' + Math.random(),
        prefix = '__\x01symbol:',
        prefixLength = prefix.length,
        internalSymbol = '__\x01symbol@@' + random,
        DP = 'defineProperty',
        DPies = 'defineProperties',
        GOPN = 'getOwnPropertyNames',
        GOPD = 'getOwnPropertyDescriptor',
        PIE = 'propertyIsEnumerable',
        gOPN = Object[GOPN],
        gOPD = Object[GOPD],
        create = Object.create,
        keys = Object.keys,
        defineProperty = Object[DP],
        $defineProperties = Object[DPies],
        descriptor = gOPD(Object, GOPN),
        ObjectProto = Object.prototype,
        hOP = ObjectProto.hasOwnProperty,
        pIE = ObjectProto[PIE],
        toString = ObjectProto.toString,
        indexOf = Array.prototype.indexOf || function (v) {
      for (var i = this.length; i-- && this[i] !== v;) {}
      return i;
    },
        addInternalIfNeeded = function addInternalIfNeeded(o, uid, enumerable) {
      if (!hOP.call(o, internalSymbol)) {
        defineProperty(o, internalSymbol, {
          enumerable: false,
          configurable: false,
          writable: false,
          value: {}
        });
      }
      o[internalSymbol]['@@' + uid] = enumerable;
    },
        createWithSymbols = function createWithSymbols(proto, descriptors) {
      var self = create(proto);
      if (descriptors !== null && (typeof descriptors === 'undefined' ? 'undefined' : _typeof(descriptors)) === 'object') {
        gOPN(descriptors).forEach(function (key) {
          if (propertyIsEnumerable.call(descriptors, key)) {
            $defineProperty(self, key, descriptors[key]);
          }
        });
      }
      return self;
    },
        copyAsNonEnumerable = function copyAsNonEnumerable(descriptor) {
      var newDescriptor = create(descriptor);
      newDescriptor.enumerable = false;
      return newDescriptor;
    },
        get = function get() {},
        onlyNonSymbols = function onlyNonSymbols(name) {
      return name != internalSymbol && !hOP.call(source, name);
    },
        onlySymbols = function onlySymbols(name) {
      return name != internalSymbol && hOP.call(source, name);
    },
        propertyIsEnumerable = function propertyIsEnumerable(key) {
      var uid = '' + key;
      return onlySymbols(uid) ? hOP.call(this, uid) && this[internalSymbol] && this[internalSymbol]['@@' + uid] : pIE.call(this, key);
    },
        setAndGetSymbol = function setAndGetSymbol(uid) {
      var descriptor = {
        enumerable: false,
        configurable: true,
        get: get,
        set: function set(value) {
          setDescriptor(this, uid, {
            enumerable: false,
            configurable: true,
            writable: true,
            value: value
          });
          addInternalIfNeeded(this, uid, true);
        }
      };
      defineProperty(ObjectProto, uid, descriptor);
      return source[uid] = defineProperty(Object(uid), 'constructor', sourceConstructor);
    },
        _Symbol = function _Symbol2(description) {
      if (this && this !== G) {
        throw new TypeError('Symbol is not a constructor');
      }
      return setAndGetSymbol(prefix.concat(description || '', random, ++id));
    },
        source = create(null),
        sourceConstructor = { value: _Symbol },
        sourceMap = function sourceMap(uid) {
      return source[uid];
    },
        $defineProperty = function defineProp(o, key, descriptor) {
      var uid = '' + key;
      if (onlySymbols(uid)) {
        setDescriptor(o, uid, descriptor.enumerable ? copyAsNonEnumerable(descriptor) : descriptor);
        addInternalIfNeeded(o, uid, !!descriptor.enumerable);
      } else {
        defineProperty(o, key, descriptor);
      }
      return o;
    },
        $getOwnPropertySymbols = function getOwnPropertySymbols(o) {
      var cof = toString.call(o);
      o = cof === '[object String]' ? o.split('') : Object(o);
      return gOPN(o).filter(onlySymbols).map(sourceMap);
    };

    descriptor.value = $defineProperty;
    defineProperty(Object, DP, descriptor);

    descriptor.value = $getOwnPropertySymbols;
    defineProperty(Object, GOPS, descriptor);

    var cachedWindowNames = (typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object' ? Object.getOwnPropertyNames(window) : [];
    var originalObjectGetOwnPropertyNames = Object.getOwnPropertyNames;
    descriptor.value = function getOwnPropertyNames(o) {
      if (toString.call(o) === '[object Window]') {
        try {
          return originalObjectGetOwnPropertyNames(o);
        } catch (e) {
          return [].concat([], cachedWindowNames);
        }
      }
      return gOPN(o).filter(onlyNonSymbols);
    };
    defineProperty(Object, GOPN, descriptor);

    descriptor.value = function defineProperties(o, descriptors) {
      var symbols = $getOwnPropertySymbols(descriptors);
      if (symbols.length) {
        keys(descriptors).concat(symbols).forEach(function (uid) {
          if (propertyIsEnumerable.call(descriptors, uid)) {
            $defineProperty(o, uid, descriptors[uid]);
          }
        });
      } else {
        $defineProperties(o, descriptors);
      }
      return o;
    };
    defineProperty(Object, DPies, descriptor);

    descriptor.value = propertyIsEnumerable;
    defineProperty(ObjectProto, PIE, descriptor);

    descriptor.value = _Symbol;
    defineProperty(G, 'Symbol', descriptor);

    descriptor.value = function (key) {
      var uid = prefix.concat(prefix, key, random);
      return uid in ObjectProto ? source[uid] : setAndGetSymbol(uid);
    };
    defineProperty(_Symbol, 'for', descriptor);

    descriptor.value = function (symbol) {
      return hOP.call(source, symbol) ? symbol.slice(prefixLength * 2, -random.length) : void 0;
    };
    defineProperty(_Symbol, 'keyFor', descriptor);

    descriptor.value = function getOwnPropertyDescriptor(o, key) {
      var descriptor = gOPD(o, key);
      if (descriptor && onlySymbols(key)) {
        descriptor.enumerable = propertyIsEnumerable.call(o, key);
      }
      return descriptor;
    };
    defineProperty(Object, GOPD, descriptor);

    descriptor.value = function (proto, descriptors) {
      return arguments.length === 1 ? create(proto) : createWithSymbols(proto, descriptors);
    };
    defineProperty(Object, 'create', descriptor);

    descriptor.value = function () {
      var str = toString.call(this);
      return str === '[object String]' && onlySymbols(this) ? '[object Symbol]' : str;
    };
    defineProperty(ObjectProto, 'toString', descriptor);

    try {
      setDescriptor = create(defineProperty({}, prefix, {
        get: function get() {
          return defineProperty(this, prefix, { value: false })[prefix];
        }
      }))[prefix] || defineProperty;
    } catch (o_O) {
      setDescriptor = function setDescriptor(o, key, descriptor) {
        var protoDescriptor = gOPD(ObjectProto, key);
        delete ObjectProto[key];
        defineProperty(o, key, descriptor);
        defineProperty(ObjectProto, key, protoDescriptor);
      };
    }
  })(Object, 'getOwnPropertySymbols');

  (function (O, S) {
    var dP = O.defineProperty,
        ObjectProto = O.prototype,
        toString = ObjectProto.toString,
        toStringTag = 'toStringTag',
        descriptor;
    ['iterator', 'match', 'replace', 'search', 'split', 'hasInstance', 'isConcatSpreadable', 'unscopables', 'species', 'toPrimitive', toStringTag].forEach(function (name) {
      if (!(name in Symbol)) {
        dP(Symbol, name, { value: Symbol(name) });
        switch (name) {
          case toStringTag:
            descriptor = O.getOwnPropertyDescriptor(ObjectProto, 'toString');
            descriptor.value = function () {
              var str = toString.call(this),
                  tst = typeof this === 'undefined' || this === null ? undefined : this[Symbol.toStringTag];
              return typeof tst === 'undefined' ? str : '[object ' + tst + ']';
            };
            dP(ObjectProto, 'toString', descriptor);
            break;
        }
      }
    });
  })(Object, Symbol);

  (function (Si, AP, SP) {

    function returnThis() {
      return this;
    }

    if (!AP[Si]) AP[Si] = function () {
      var i = 0,
          self = this,
          iterator = {
        next: function next() {
          var done = self.length <= i;
          return done ? { done: done } : { done: done, value: self[i++] };
        }
      };
      iterator[Si] = returnThis;
      return iterator;
    };

    if (!SP[Si]) SP[Si] = function () {
      var fromCodePoint = String.fromCodePoint,
          self = this,
          i = 0,
          length = self.length,
          iterator = {
        next: function next() {
          var done = length <= i,
              c = done ? '' : fromCodePoint(self.codePointAt(i));
          i += c.length;
          return done ? { done: done } : { done: done, value: c };
        }
      };
      iterator[Si] = returnThis;
      return iterator;
    };
  })(Symbol.iterator, Array.prototype, String.prototype);
}

if (typeof FEATURE_NO_ES2015 === 'undefined') {

  Number.isNaN = Number.isNaN || function (value) {
    return value !== value;
  };

  Number.isFinite = Number.isFinite || function (value) {
    return typeof value === "number" && isFinite(value);
  };
}

if (!String.prototype.endsWith || function () {
  try {
    return !"ab".endsWith("a", 1);
  } catch (e) {
    return true;
  }
}()) {
  String.prototype.endsWith = function (searchString, position) {
    var subjectString = this.toString();
    if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
      position = subjectString.length;
    }
    position -= searchString.length;
    var lastIndex = subjectString.indexOf(searchString, position);
    return lastIndex !== -1 && lastIndex === position;
  };
}

if (!String.prototype.startsWith || function () {
  try {
    return !"ab".startsWith("b", 1);
  } catch (e) {
    return true;
  }
}()) {
  String.prototype.startsWith = function (searchString, position) {
    position = position || 0;
    return this.substr(position, searchString.length) === searchString;
  };
}

if (typeof FEATURE_NO_ES2015 === 'undefined') {

  if (!Array.from) {
    Array.from = function () {
      var toInteger = function toInteger(it) {
        return isNaN(it = +it) ? 0 : (it > 0 ? Math.floor : Math.ceil)(it);
      };
      var toLength = function toLength(it) {
        return it > 0 ? Math.min(toInteger(it), 0x1fffffffffffff) : 0;
      };
      var iterCall = function iterCall(iter, fn, val, index) {
        try {
          return fn(val, index);
        } catch (E) {
          if (typeof iter.return == 'function') iter.return();
          throw E;
        }
      };

      return function from(arrayLike) {
        var O = Object(arrayLike),
            C = typeof this == 'function' ? this : Array,
            aLen = arguments.length,
            mapfn = aLen > 1 ? arguments[1] : undefined,
            mapping = mapfn !== undefined,
            index = 0,
            iterFn = O[Symbol.iterator],
            length,
            result,
            step,
            iterator;
        if (mapping) mapfn = mapfn.bind(aLen > 2 ? arguments[2] : undefined);
        if (iterFn != undefined && !Array.isArray(arrayLike)) {
          for (iterator = iterFn.call(O), result = new C(); !(step = iterator.next()).done; index++) {
            result[index] = mapping ? iterCall(iterator, mapfn, step.value, index) : step.value;
          }
        } else {
          length = toLength(O.length);
          for (result = new C(length); length > index; index++) {
            result[index] = mapping ? mapfn(O[index], index) : O[index];
          }
        }
        result.length = index;
        return result;
      };
    }();
  }

  if (!Array.prototype.find) {
    Object.defineProperty(Array.prototype, 'find', {
      configurable: true,
      writable: true,
      enumerable: false,
      value: function value(predicate) {
        if (this === null) {
          throw new TypeError('Array.prototype.find called on null or undefined');
        }
        if (typeof predicate !== 'function') {
          throw new TypeError('predicate must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        var value;

        for (var i = 0; i < length; i++) {
          value = list[i];
          if (predicate.call(thisArg, value, i, list)) {
            return value;
          }
        }
        return undefined;
      }
    });
  }

  if (!Array.prototype.findIndex) {
    Object.defineProperty(Array.prototype, 'findIndex', {
      configurable: true,
      writable: true,
      enumerable: false,
      value: function value(predicate) {
        if (this === null) {
          throw new TypeError('Array.prototype.findIndex called on null or undefined');
        }
        if (typeof predicate !== 'function') {
          throw new TypeError('predicate must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        var value;

        for (var i = 0; i < length; i++) {
          value = list[i];
          if (predicate.call(thisArg, value, i, list)) {
            return i;
          }
        }
        return -1;
      }
    });
  }
}

if (typeof FEATURE_NO_ES2016 === 'undefined' && !Array.prototype.includes) {
  Object.defineProperty(Array.prototype, 'includes', {
    configurable: true,
    writable: true,
    enumerable: false,
    value: function value(searchElement) {
      var O = Object(this);
      var len = parseInt(O.length) || 0;
      if (len === 0) {
        return false;
      }
      var n = parseInt(arguments[1]) || 0;
      var k;
      if (n >= 0) {
        k = n;
      } else {
        k = len + n;
        if (k < 0) {
          k = 0;
        }
      }
      var currentElement;
      while (k < len) {
        currentElement = O[k];
        if (searchElement === currentElement || searchElement !== searchElement && currentElement !== currentElement) {
          return true;
        }
        k++;
      }
      return false;
    }
  });
}

if (typeof FEATURE_NO_ES2015 === 'undefined') {

  (function () {
    var needsFix = false;

    try {
      var s = Object.keys('a');
      needsFix = s.length !== 1 || s[0] !== '0';
    } catch (e) {
      needsFix = true;
    }

    if (needsFix) {
      Object.keys = function () {
        var hasOwnProperty = Object.prototype.hasOwnProperty,
            hasDontEnumBug = !{ toString: null }.propertyIsEnumerable('toString'),
            dontEnums = ['toString', 'toLocaleString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'constructor'],
            dontEnumsLength = dontEnums.length;

        return function (obj) {
          if (obj === undefined || obj === null) {
            throw TypeError('Cannot convert undefined or null to object');
          }

          obj = Object(obj);

          var result = [],
              prop,
              i;

          for (prop in obj) {
            if (hasOwnProperty.call(obj, prop)) {
              result.push(prop);
            }
          }

          if (hasDontEnumBug) {
            for (i = 0; i < dontEnumsLength; i++) {
              if (hasOwnProperty.call(obj, dontEnums[i])) {
                result.push(dontEnums[i]);
              }
            }
          }

          return result;
        };
      }();
    }
  })();

  (function (O) {
    if ('assign' in O) {
      return;
    }

    O.defineProperty(O, 'assign', {
      configurable: true,
      writable: true,
      value: function () {
        var gOPS = O.getOwnPropertySymbols,
            pIE = O.propertyIsEnumerable,
            filterOS = gOPS ? function (self) {
          return gOPS(self).filter(pIE, self);
        } : function () {
          return Array.prototype;
        };

        return function assign(where) {
          if (gOPS && !(where instanceof O)) {
            console.warn('problematic Symbols', where);
          }

          function set(keyOrSymbol) {
            where[keyOrSymbol] = arg[keyOrSymbol];
          }

          for (var i = 1, ii = arguments.length; i < ii; ++i) {
            var arg = arguments[i];

            if (arg === null || arg === undefined) {
              continue;
            }

            O.keys(arg).concat(filterOS(arg)).forEach(set);
          }

          return where;
        };
      }()
    });
  })(Object);

  if (!Object.is) {
    Object.is = function (x, y) {
      if (x === y) {
        return x !== 0 || 1 / x === 1 / y;
      } else {
        return x !== x && y !== y;
      }
    };
  }
}

if (typeof FEATURE_NO_ES2015 === 'undefined') {

  (function (global) {
    var i;

    var defineProperty = Object.defineProperty,
        is = function is(a, b) {
      return a === b || a !== a && b !== b;
    };

    if (typeof WeakMap == 'undefined') {
      global.WeakMap = createCollection({
        'delete': sharedDelete,

        clear: sharedClear,

        get: sharedGet,

        has: mapHas,

        set: sharedSet
      }, true);
    }

    if (typeof Map == 'undefined' || typeof new Map().values !== 'function' || !new Map().values().next) {
      var _createCollection;

      global.Map = createCollection((_createCollection = {
        'delete': sharedDelete,

        has: mapHas,

        get: sharedGet,

        set: sharedSet,

        keys: sharedKeys,

        values: sharedValues,

        entries: mapEntries,

        forEach: sharedForEach,

        clear: sharedClear
      }, _createCollection[Symbol.iterator] = mapEntries, _createCollection));
    }

    if (typeof Set == 'undefined' || typeof new Set().values !== 'function' || !new Set().values().next) {
      var _createCollection2;

      global.Set = createCollection((_createCollection2 = {
        has: setHas,

        add: sharedAdd,

        'delete': sharedDelete,

        clear: sharedClear,

        keys: sharedValues,
        values: sharedValues,

        entries: setEntries,

        forEach: sharedForEach
      }, _createCollection2[Symbol.iterator] = sharedValues, _createCollection2));
    }

    if (typeof WeakSet == 'undefined') {
      global.WeakSet = createCollection({
        'delete': sharedDelete,

        add: sharedAdd,

        clear: sharedClear,

        has: setHas
      }, true);
    }

    function createCollection(proto, objectOnly) {
      function Collection(a) {
        if (!this || this.constructor !== Collection) return new Collection(a);
        this._keys = [];
        this._values = [];
        this._itp = [];
        this.objectOnly = objectOnly;

        if (a) init.call(this, a);
      }

      if (!objectOnly) {
        defineProperty(proto, 'size', {
          get: sharedSize
        });
      }

      proto.constructor = Collection;
      Collection.prototype = proto;

      return Collection;
    }

    function init(a) {
      var i;

      if (this.add) a.forEach(this.add, this);else a.forEach(function (a) {
          this.set(a[0], a[1]);
        }, this);
    }

    function sharedDelete(key) {
      if (this.has(key)) {
        this._keys.splice(i, 1);
        this._values.splice(i, 1);

        this._itp.forEach(function (p) {
          if (i < p[0]) p[0]--;
        });
      }

      return -1 < i;
    };

    function sharedGet(key) {
      return this.has(key) ? this._values[i] : undefined;
    }

    function has(list, key) {
      if (this.objectOnly && key !== Object(key)) throw new TypeError("Invalid value used as weak collection key");

      if (key != key || key === 0) for (i = list.length; i-- && !is(list[i], key);) {} else i = list.indexOf(key);
      return -1 < i;
    }

    function setHas(value) {
      return has.call(this, this._values, value);
    }

    function mapHas(value) {
      return has.call(this, this._keys, value);
    }

    function sharedSet(key, value) {
      this.has(key) ? this._values[i] = value : this._values[this._keys.push(key) - 1] = value;
      return this;
    }

    function sharedAdd(value) {
      if (!this.has(value)) this._values.push(value);
      return this;
    }

    function sharedClear() {
      (this._keys || 0).length = this._values.length = 0;
    }

    function sharedKeys() {
      return sharedIterator(this._itp, this._keys);
    }

    function sharedValues() {
      return sharedIterator(this._itp, this._values);
    }

    function mapEntries() {
      return sharedIterator(this._itp, this._keys, this._values);
    }

    function setEntries() {
      return sharedIterator(this._itp, this._values, this._values);
    }

    function sharedIterator(itp, array, array2) {
      var _ref;

      var p = [0],
          done = false;
      itp.push(p);
      return _ref = {}, _ref[Symbol.iterator] = function () {
        return this;
      }, _ref.next = function next() {
        var v,
            k = p[0];
        if (!done && k < array.length) {
          v = array2 ? [array[k], array2[k]] : array[k];
          p[0]++;
        } else {
          done = true;
          itp.splice(itp.indexOf(p), 1);
        }
        return { done: done, value: v };
      }, _ref;
    }

    function sharedSize() {
      return this._values.length;
    }

    function sharedForEach(callback, context) {
      var it = this.entries();
      for (;;) {
        var r = it.next();
        if (r.done) break;
        callback.call(context, r.value[1], r.value[0], this);
      }
    }
  })(_aureliaPal.PLATFORM.global);
}

if (typeof FEATURE_NO_ES2015 === 'undefined') {
  (function () {

    var bind = Function.prototype.bind;

    if (typeof _aureliaPal.PLATFORM.global.Reflect === 'undefined') {
      _aureliaPal.PLATFORM.global.Reflect = {};
    }

    if (typeof Reflect.defineProperty !== 'function') {
      Reflect.defineProperty = function (target, propertyKey, descriptor) {
        if ((typeof target === 'undefined' ? 'undefined' : _typeof(target)) === 'object' ? target === null : typeof target !== 'function') {
          throw new TypeError('Reflect.defineProperty called on non-object');
        }
        try {
          Object.defineProperty(target, propertyKey, descriptor);
          return true;
        } catch (e) {
          return false;
        }
      };
    }

    if (typeof Reflect.construct !== 'function') {
      Reflect.construct = function (Target, args) {
        if (args) {
          switch (args.length) {
            case 0:
              return new Target();
            case 1:
              return new Target(args[0]);
            case 2:
              return new Target(args[0], args[1]);
            case 3:
              return new Target(args[0], args[1], args[2]);
            case 4:
              return new Target(args[0], args[1], args[2], args[3]);
          }
        }

        var a = [null];
        a.push.apply(a, args);
        return new (bind.apply(Target, a))();
      };
    }

    if (typeof Reflect.ownKeys !== 'function') {
      Reflect.ownKeys = function (o) {
        return Object.getOwnPropertyNames(o).concat(Object.getOwnPropertySymbols(o));
      };
    }
  })();
}

if (typeof FEATURE_NO_ESNEXT === 'undefined') {
  (function () {

    var emptyMetadata = Object.freeze({});
    var metadataContainerKey = '__metadata__';

    if (typeof Reflect.getOwnMetadata !== 'function') {
      Reflect.getOwnMetadata = function (metadataKey, target, targetKey) {
        if (target.hasOwnProperty(metadataContainerKey)) {
          return (target[metadataContainerKey][targetKey] || emptyMetadata)[metadataKey];
        }
      };
    }

    if (typeof Reflect.defineMetadata !== 'function') {
      Reflect.defineMetadata = function (metadataKey, metadataValue, target, targetKey) {
        var metadataContainer = target.hasOwnProperty(metadataContainerKey) ? target[metadataContainerKey] : target[metadataContainerKey] = {};
        var targetContainer = metadataContainer[targetKey] || (metadataContainer[targetKey] = {});
        targetContainer[metadataKey] = metadataValue;
      };
    }

    if (typeof Reflect.metadata !== 'function') {
      Reflect.metadata = function (metadataKey, metadataValue) {
        return function (target, targetKey) {
          Reflect.defineMetadata(metadataKey, metadataValue, target, targetKey);
        };
      };
    }
  })();
}
});

define('aurelia-route-recognizer/dist/es2015/aurelia-route-recognizer',["exports", "aurelia-path"], function (_exports, _aureliaPath) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.RouteRecognizer = _exports.EpsilonSegment = _exports.StarSegment = _exports.DynamicSegment = _exports.StaticSegment = _exports.State = void 0;
  let State = class State {
    constructor(charSpec) {
      this.charSpec = charSpec;
      this.nextStates = [];
    }

    get(charSpec) {
      for (let child of this.nextStates) {
        let isEqual = child.charSpec.validChars === charSpec.validChars && child.charSpec.invalidChars === charSpec.invalidChars;

        if (isEqual) {
          return child;
        }
      }

      return undefined;
    }

    put(charSpec) {
      let state = this.get(charSpec);

      if (state) {
        return state;
      }

      state = new State(charSpec);
      this.nextStates.push(state);

      if (charSpec.repeat) {
        state.nextStates.push(state);
      }

      return state;
    }

    match(ch) {
      let nextStates = this.nextStates;
      let results = [];

      for (let i = 0, l = nextStates.length; i < l; i++) {
        let child = nextStates[i];
        let charSpec = child.charSpec;

        if (charSpec.validChars !== undefined) {
          if (charSpec.validChars.indexOf(ch) !== -1) {
            results.push(child);
          }
        } else if (charSpec.invalidChars !== undefined) {
          if (charSpec.invalidChars.indexOf(ch) === -1) {
            results.push(child);
          }
        }
      }

      return results;
    }

  };
  _exports.State = State;
  const specials = ['/', '.', '*', '+', '?', '|', '(', ')', '[', ']', '{', '}', '\\'];
  const escapeRegex = new RegExp('(\\' + specials.join('|\\') + ')', 'g');
  let StaticSegment = class StaticSegment {
    constructor(string, caseSensitive) {
      this.string = string;
      this.caseSensitive = caseSensitive;
    }

    eachChar(callback) {
      let s = this.string;

      for (let i = 0, ii = s.length; i < ii; ++i) {
        let ch = s[i];
        callback({
          validChars: this.caseSensitive ? ch : ch.toUpperCase() + ch.toLowerCase()
        });
      }
    }

    regex() {
      return this.string.replace(escapeRegex, '\\$1');
    }

    generate() {
      return this.string;
    }

  };
  _exports.StaticSegment = StaticSegment;
  let DynamicSegment = class DynamicSegment {
    constructor(name, optional) {
      this.name = name;
      this.optional = optional;
    }

    eachChar(callback) {
      callback({
        invalidChars: '/',
        repeat: true
      });
    }

    regex() {
      return '([^/]+)';
    }

    generate(params, consumed) {
      consumed[this.name] = true;
      return params[this.name];
    }

  };
  _exports.DynamicSegment = DynamicSegment;
  let StarSegment = class StarSegment {
    constructor(name) {
      this.name = name;
    }

    eachChar(callback) {
      callback({
        invalidChars: '',
        repeat: true
      });
    }

    regex() {
      return '(.+)';
    }

    generate(params, consumed) {
      consumed[this.name] = true;
      return params[this.name];
    }

  };
  _exports.StarSegment = StarSegment;
  let EpsilonSegment = class EpsilonSegment {
    eachChar() {}

    regex() {
      return '';
    }

    generate() {
      return '';
    }

  };
  _exports.EpsilonSegment = EpsilonSegment;
  let RouteRecognizer = class RouteRecognizer {
    constructor() {
      this.rootState = new State();
      this.names = {};
      this.routes = new Map();
    }

    add(route) {
      if (Array.isArray(route)) {
        route.forEach(r => this.add(r));
        return undefined;
      }

      let currentState = this.rootState;
      let skippableStates = [];
      let regex = '^';
      let types = {
        statics: 0,
        dynamics: 0,
        stars: 0
      };
      let names = [];
      let routeName = route.handler.name;
      let isEmpty = true;
      let segments = parse(route.path, names, types, route.caseSensitive);

      for (let i = 0, ii = segments.length; i < ii; i++) {
        let segment = segments[i];

        if (segment instanceof EpsilonSegment) {
          continue;
        }

        let [firstState, nextState] = addSegment(currentState, segment);

        for (let j = 0, jj = skippableStates.length; j < jj; j++) {
          skippableStates[j].nextStates.push(firstState);
        }

        if (segment.optional) {
          skippableStates.push(nextState);
          regex += `(?:/${segment.regex()})?`;
        } else {
          currentState = nextState;
          regex += `/${segment.regex()}`;
          skippableStates.length = 0;
          isEmpty = false;
        }
      }

      if (isEmpty) {
        currentState = currentState.put({
          validChars: '/'
        });
        regex += '/?';
      }

      let handlers = [{
        handler: route.handler,
        names: names
      }];
      this.routes.set(route.handler, {
        segments,
        handlers
      });

      if (routeName) {
        let routeNames = Array.isArray(routeName) ? routeName : [routeName];

        for (let i = 0; i < routeNames.length; i++) {
          if (!(routeNames[i] in this.names)) {
            this.names[routeNames[i]] = {
              segments,
              handlers
            };
          }
        }
      }

      for (let i = 0; i < skippableStates.length; i++) {
        let state = skippableStates[i];
        state.handlers = handlers;
        state.regex = new RegExp(regex + '$', route.caseSensitive ? '' : 'i');
        state.types = types;
      }

      currentState.handlers = handlers;
      currentState.regex = new RegExp(regex + '$', route.caseSensitive ? '' : 'i');
      currentState.types = types;
      return currentState;
    }

    getRoute(nameOrRoute) {
      return typeof nameOrRoute === 'string' ? this.names[nameOrRoute] : this.routes.get(nameOrRoute);
    }

    handlersFor(nameOrRoute) {
      let route = this.getRoute(nameOrRoute);

      if (!route) {
        throw new Error(`There is no route named ${nameOrRoute}`);
      }

      return [...route.handlers];
    }

    hasRoute(nameOrRoute) {
      return !!this.getRoute(nameOrRoute);
    }

    generate(nameOrRoute, params) {
      let route = this.getRoute(nameOrRoute);

      if (!route) {
        throw new Error(`There is no route named ${nameOrRoute}`);
      }

      let handler = route.handlers[0].handler;

      if (handler.generationUsesHref) {
        return handler.href;
      }

      let routeParams = Object.assign({}, params);
      let segments = route.segments;
      let consumed = {};
      let output = '';

      for (let i = 0, l = segments.length; i < l; i++) {
        let segment = segments[i];

        if (segment instanceof EpsilonSegment) {
          continue;
        }

        let segmentValue = segment.generate(routeParams, consumed);

        if (segmentValue === null || segmentValue === undefined) {
          if (!segment.optional) {
            throw new Error(`A value is required for route parameter '${segment.name}' in route '${nameOrRoute}'.`);
          }
        } else {
          output += '/';
          output += segmentValue;
        }
      }

      if (output.charAt(0) !== '/') {
        output = '/' + output;
      }

      for (let param in consumed) {
        delete routeParams[param];
      }

      let queryString = (0, _aureliaPath.buildQueryString)(routeParams);
      output += queryString ? `?${queryString}` : '';
      return output;
    }

    recognize(path) {
      let states = [this.rootState];
      let queryParams = {};
      let isSlashDropped = false;
      let normalizedPath = path;
      let queryStart = normalizedPath.indexOf('?');

      if (queryStart !== -1) {
        let queryString = normalizedPath.substr(queryStart + 1, normalizedPath.length);
        normalizedPath = normalizedPath.substr(0, queryStart);
        queryParams = (0, _aureliaPath.parseQueryString)(queryString);
      }

      normalizedPath = decodeURI(normalizedPath);

      if (normalizedPath.charAt(0) !== '/') {
        normalizedPath = '/' + normalizedPath;
      }

      let pathLen = normalizedPath.length;

      if (pathLen > 1 && normalizedPath.charAt(pathLen - 1) === '/') {
        normalizedPath = normalizedPath.substr(0, pathLen - 1);
        isSlashDropped = true;
      }

      for (let i = 0, l = normalizedPath.length; i < l; i++) {
        states = recognizeChar(states, normalizedPath.charAt(i));

        if (!states.length) {
          break;
        }
      }

      let solutions = [];

      for (let i = 0, l = states.length; i < l; i++) {
        if (states[i].handlers) {
          solutions.push(states[i]);
        }
      }

      states = sortSolutions(solutions);
      let state = solutions[0];

      if (state && state.handlers) {
        if (isSlashDropped && state.regex.source.slice(-5) === '(.+)$') {
          normalizedPath = normalizedPath + '/';
        }

        return findHandler(state, normalizedPath, queryParams);
      }
    }

  };
  _exports.RouteRecognizer = RouteRecognizer;
  let RecognizeResults = class RecognizeResults {
    constructor(queryParams) {
      this.splice = Array.prototype.splice;
      this.slice = Array.prototype.slice;
      this.push = Array.prototype.push;
      this.length = 0;
      this.queryParams = queryParams || {};
    }

  };

  function parse(route, names, types, caseSensitive) {
    let normalizedRoute = route;

    if (route.charAt(0) === '/') {
      normalizedRoute = route.substr(1);
    }

    let results = [];
    let splitRoute = normalizedRoute.split('/');

    for (let i = 0, ii = splitRoute.length; i < ii; ++i) {
      let segment = splitRoute[i];
      let match = segment.match(/^:([^?]+)(\?)?$/);

      if (match) {
        let [, name, optional] = match;

        if (name.indexOf('=') !== -1) {
          throw new Error(`Parameter ${name} in route ${route} has a default value, which is not supported.`);
        }

        results.push(new DynamicSegment(name, !!optional));
        names.push(name);
        types.dynamics++;
        continue;
      }

      match = segment.match(/^\*(.+)$/);

      if (match) {
        results.push(new StarSegment(match[1]));
        names.push(match[1]);
        types.stars++;
      } else if (segment === '') {
        results.push(new EpsilonSegment());
      } else {
        results.push(new StaticSegment(segment, caseSensitive));
        types.statics++;
      }
    }

    return results;
  }

  function sortSolutions(states) {
    return states.sort((a, b) => {
      if (a.types.stars !== b.types.stars) {
        return a.types.stars - b.types.stars;
      }

      if (a.types.stars) {
        if (a.types.statics !== b.types.statics) {
          return b.types.statics - a.types.statics;
        }

        if (a.types.dynamics !== b.types.dynamics) {
          return b.types.dynamics - a.types.dynamics;
        }
      }

      if (a.types.dynamics !== b.types.dynamics) {
        return a.types.dynamics - b.types.dynamics;
      }

      if (a.types.statics !== b.types.statics) {
        return b.types.statics - a.types.statics;
      }

      return 0;
    });
  }

  function recognizeChar(states, ch) {
    let nextStates = [];

    for (let i = 0, l = states.length; i < l; i++) {
      let state = states[i];
      nextStates.push(...state.match(ch));
    }

    return nextStates;
  }

  function findHandler(state, path, queryParams) {
    let handlers = state.handlers;
    let regex = state.regex;
    let captures = path.match(regex);
    let currentCapture = 1;
    let result = new RecognizeResults(queryParams);

    for (let i = 0, l = handlers.length; i < l; i++) {
      let handler = handlers[i];
      let names = handler.names;
      let params = {};

      for (let j = 0, m = names.length; j < m; j++) {
        params[names[j]] = captures[currentCapture++];
      }

      result.push({
        handler: handler.handler,
        params: params,
        isDynamic: !!names.length
      });
    }

    return result;
  }

  function addSegment(currentState, segment) {
    let firstState = currentState.put({
      validChars: '/'
    });
    let nextState = firstState;
    segment.eachChar(ch => {
      nextState = nextState.put(ch);
    });
    return [firstState, nextState];
  }
});
define('aurelia-router/dist/commonjs/aurelia-router',['require','exports','module','aurelia-logging','aurelia-route-recognizer','aurelia-dependency-injection','aurelia-history','aurelia-event-aggregator'],function (require, exports, module) {'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AppRouter = exports.PipelineProvider = exports.LoadRouteStep = exports.RouteLoader = exports.ActivateNextStep = exports.DeactivatePreviousStep = exports.CanActivateNextStep = exports.CanDeactivatePreviousStep = exports.Router = exports.BuildNavigationPlanStep = exports.activationStrategy = exports.RouterConfiguration = exports.Pipeline = exports.pipelineStatus = exports.RedirectToRoute = exports.Redirect = exports.NavModel = exports.NavigationInstruction = exports.CommitChangesStep = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports._normalizeAbsolutePath = _normalizeAbsolutePath;
exports._createRootedPath = _createRootedPath;
exports._resolveUrl = _resolveUrl;
exports._ensureArrayWithSingleRoutePerConfig = _ensureArrayWithSingleRoutePerConfig;
exports.isNavigationCommand = isNavigationCommand;
exports._buildNavigationPlan = _buildNavigationPlan;

var _aureliaLogging = require('aurelia-logging');

var LogManager = _interopRequireWildcard(_aureliaLogging);

var _aureliaRouteRecognizer = require('aurelia-route-recognizer');

var _aureliaDependencyInjection = require('aurelia-dependency-injection');

var _aureliaHistory = require('aurelia-history');

var _aureliaEventAggregator = require('aurelia-event-aggregator');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }



function _normalizeAbsolutePath(path, hasPushState) {
  var absolute = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  if (!hasPushState && path[0] !== '#') {
    path = '#' + path;
  }

  if (hasPushState && absolute) {
    path = path.substring(1, path.length);
  }

  return path;
}

function _createRootedPath(fragment, baseUrl, hasPushState, absolute) {
  if (isAbsoluteUrl.test(fragment)) {
    return fragment;
  }

  var path = '';

  if (baseUrl.length && baseUrl[0] !== '/') {
    path += '/';
  }

  path += baseUrl;

  if ((!path.length || path[path.length - 1] !== '/') && fragment[0] !== '/') {
    path += '/';
  }

  if (path.length && path[path.length - 1] === '/' && fragment[0] === '/') {
    path = path.substring(0, path.length - 1);
  }

  return _normalizeAbsolutePath(path + fragment, hasPushState, absolute);
}

function _resolveUrl(fragment, baseUrl, hasPushState) {
  if (isRootedPath.test(fragment)) {
    return _normalizeAbsolutePath(fragment, hasPushState);
  }

  return _createRootedPath(fragment, baseUrl, hasPushState);
}

function _ensureArrayWithSingleRoutePerConfig(config) {
  var routeConfigs = [];

  if (Array.isArray(config.route)) {
    for (var i = 0, ii = config.route.length; i < ii; ++i) {
      var current = Object.assign({}, config);
      current.route = config.route[i];
      routeConfigs.push(current);
    }
  } else {
    routeConfigs.push(Object.assign({}, config));
  }

  return routeConfigs;
}

var isRootedPath = /^#?\//;
var isAbsoluteUrl = /^([a-z][a-z0-9+\-.]*:)?\/\//i;

var CommitChangesStep = exports.CommitChangesStep = function () {
  function CommitChangesStep() {
    
  }

  CommitChangesStep.prototype.run = function run(navigationInstruction, next) {
    return navigationInstruction._commitChanges(true).then(function () {
      navigationInstruction._updateTitle();
      return next();
    });
  };

  return CommitChangesStep;
}();

var NavigationInstruction = exports.NavigationInstruction = function () {
  function NavigationInstruction(init) {
    

    this.plan = null;
    this.options = {};

    Object.assign(this, init);

    this.params = this.params || {};
    this.viewPortInstructions = {};

    var ancestorParams = [];
    var current = this;
    do {
      var currentParams = Object.assign({}, current.params);
      if (current.config && current.config.hasChildRouter) {
        delete currentParams[current.getWildCardName()];
      }

      ancestorParams.unshift(currentParams);
      current = current.parentInstruction;
    } while (current);

    var allParams = Object.assign.apply(Object, [{}, this.queryParams].concat(ancestorParams));
    this.lifecycleArgs = [allParams, this.config, this];
  }

  NavigationInstruction.prototype.getAllInstructions = function getAllInstructions() {
    var instructions = [this];
    for (var _key in this.viewPortInstructions) {
      var childInstruction = this.viewPortInstructions[_key].childNavigationInstruction;
      if (childInstruction) {
        instructions.push.apply(instructions, childInstruction.getAllInstructions());
      }
    }

    return instructions;
  };

  NavigationInstruction.prototype.getAllPreviousInstructions = function getAllPreviousInstructions() {
    return this.getAllInstructions().map(function (c) {
      return c.previousInstruction;
    }).filter(function (c) {
      return c;
    });
  };

  NavigationInstruction.prototype.addViewPortInstruction = function addViewPortInstruction(viewPortName, strategy, moduleId, component) {
    var config = Object.assign({}, this.lifecycleArgs[1], { currentViewPort: viewPortName });
    var viewportInstruction = this.viewPortInstructions[viewPortName] = {
      name: viewPortName,
      strategy: strategy,
      moduleId: moduleId,
      component: component,
      childRouter: component.childRouter,
      lifecycleArgs: [].concat(this.lifecycleArgs[0], config, this.lifecycleArgs[2])
    };

    return viewportInstruction;
  };

  NavigationInstruction.prototype.getWildCardName = function getWildCardName() {
    var wildcardIndex = this.config.route.lastIndexOf('*');
    return this.config.route.substr(wildcardIndex + 1);
  };

  NavigationInstruction.prototype.getWildcardPath = function getWildcardPath() {
    var wildcardName = this.getWildCardName();
    var path = this.params[wildcardName] || '';

    if (this.queryString) {
      path += '?' + this.queryString;
    }

    return path;
  };

  NavigationInstruction.prototype.getBaseUrl = function getBaseUrl() {
    var _this = this;

    var fragment = decodeURI(this.fragment);

    if (fragment === '') {
      var nonEmptyRoute = this.router.routes.find(function (route) {
        return route.name === _this.config.name && route.route !== '';
      });
      if (nonEmptyRoute) {
        fragment = nonEmptyRoute.route;
      }
    }

    if (!this.params) {
      return encodeURI(fragment);
    }

    var wildcardName = this.getWildCardName();
    var path = this.params[wildcardName] || '';

    if (!path) {
      return encodeURI(fragment);
    }

    return encodeURI(fragment.substr(0, fragment.lastIndexOf(path)));
  };

  NavigationInstruction.prototype._commitChanges = function _commitChanges(waitToSwap) {
    var _this2 = this;

    var router = this.router;
    router.currentInstruction = this;

    if (this.previousInstruction) {
      this.previousInstruction.config.navModel.isActive = false;
    }

    this.config.navModel.isActive = true;

    router.refreshNavigation();

    var loads = [];
    var delaySwaps = [];

    var _loop = function _loop(viewPortName) {
      var viewPortInstruction = _this2.viewPortInstructions[viewPortName];
      var viewPort = router.viewPorts[viewPortName];

      if (!viewPort) {
        throw new Error('There was no router-view found in the view for ' + viewPortInstruction.moduleId + '.');
      }

      if (viewPortInstruction.strategy === activationStrategy.replace) {
        if (viewPortInstruction.childNavigationInstruction && viewPortInstruction.childNavigationInstruction.parentCatchHandler) {
          loads.push(viewPortInstruction.childNavigationInstruction._commitChanges(waitToSwap));
        } else {
          if (waitToSwap) {
            delaySwaps.push({ viewPort: viewPort, viewPortInstruction: viewPortInstruction });
          }
          loads.push(viewPort.process(viewPortInstruction, waitToSwap).then(function (x) {
            if (viewPortInstruction.childNavigationInstruction) {
              return viewPortInstruction.childNavigationInstruction._commitChanges(waitToSwap);
            }
          }));
        }
      } else {
        if (viewPortInstruction.childNavigationInstruction) {
          loads.push(viewPortInstruction.childNavigationInstruction._commitChanges(waitToSwap));
        }
      }
    };

    for (var viewPortName in this.viewPortInstructions) {
      _loop(viewPortName);
    }

    return Promise.all(loads).then(function () {
      delaySwaps.forEach(function (x) {
        return x.viewPort.swap(x.viewPortInstruction);
      });
      return null;
    }).then(function () {
      return prune(_this2);
    });
  };

  NavigationInstruction.prototype._updateTitle = function _updateTitle() {
    var title = this._buildTitle(this.router.titleSeparator);
    if (title) {
      this.router.history.setTitle(title);
    }
  };

  NavigationInstruction.prototype._buildTitle = function _buildTitle() {
    var separator = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : ' | ';

    var title = '';
    var childTitles = [];

    if (this.config.navModel.title) {
      title = this.router.transformTitle(this.config.navModel.title);
    }

    for (var viewPortName in this.viewPortInstructions) {
      var _viewPortInstruction = this.viewPortInstructions[viewPortName];

      if (_viewPortInstruction.childNavigationInstruction) {
        var childTitle = _viewPortInstruction.childNavigationInstruction._buildTitle(separator);
        if (childTitle) {
          childTitles.push(childTitle);
        }
      }
    }

    if (childTitles.length) {
      title = childTitles.join(separator) + (title ? separator : '') + title;
    }

    if (this.router.title) {
      title += (title ? separator : '') + this.router.transformTitle(this.router.title);
    }

    return title;
  };

  return NavigationInstruction;
}();

function prune(instruction) {
  instruction.previousInstruction = null;
  instruction.plan = null;
}

var NavModel = exports.NavModel = function () {
  function NavModel(router, relativeHref) {
    

    this.isActive = false;
    this.title = null;
    this.href = null;
    this.relativeHref = null;
    this.settings = {};
    this.config = null;

    this.router = router;
    this.relativeHref = relativeHref;
  }

  NavModel.prototype.setTitle = function setTitle(title) {
    this.title = title;

    if (this.isActive) {
      this.router.updateTitle();
    }
  };

  return NavModel;
}();

function isNavigationCommand(obj) {
  return obj && typeof obj.navigate === 'function';
}

var Redirect = exports.Redirect = function () {
  function Redirect(url) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    

    this.url = url;
    this.options = Object.assign({ trigger: true, replace: true }, options);
    this.shouldContinueProcessing = false;
  }

  Redirect.prototype.setRouter = function setRouter(router) {
    this.router = router;
  };

  Redirect.prototype.navigate = function navigate(appRouter) {
    var navigatingRouter = this.options.useAppRouter ? appRouter : this.router || appRouter;
    navigatingRouter.navigate(this.url, this.options);
  };

  return Redirect;
}();

var RedirectToRoute = exports.RedirectToRoute = function () {
  function RedirectToRoute(route) {
    var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    

    this.route = route;
    this.params = params;
    this.options = Object.assign({ trigger: true, replace: true }, options);
    this.shouldContinueProcessing = false;
  }

  RedirectToRoute.prototype.setRouter = function setRouter(router) {
    this.router = router;
  };

  RedirectToRoute.prototype.navigate = function navigate(appRouter) {
    var navigatingRouter = this.options.useAppRouter ? appRouter : this.router || appRouter;
    navigatingRouter.navigateToRoute(this.route, this.params, this.options);
  };

  return RedirectToRoute;
}();

var pipelineStatus = exports.pipelineStatus = {
  completed: 'completed',
  canceled: 'canceled',
  rejected: 'rejected',
  running: 'running'
};

var Pipeline = exports.Pipeline = function () {
  function Pipeline() {
    

    this.steps = [];
  }

  Pipeline.prototype.addStep = function addStep(step) {
    var run = void 0;

    if (typeof step === 'function') {
      run = step;
    } else if (typeof step.getSteps === 'function') {
      var steps = step.getSteps();
      for (var i = 0, l = steps.length; i < l; i++) {
        this.addStep(steps[i]);
      }

      return this;
    } else {
      run = step.run.bind(step);
    }

    this.steps.push(run);

    return this;
  };

  Pipeline.prototype.run = function run(instruction) {
    var index = -1;
    var steps = this.steps;

    function next() {
      index++;

      if (index < steps.length) {
        var currentStep = steps[index];

        try {
          return currentStep(instruction, next);
        } catch (e) {
          return next.reject(e);
        }
      } else {
        return next.complete();
      }
    }

    next.complete = createCompletionHandler(next, pipelineStatus.completed);
    next.cancel = createCompletionHandler(next, pipelineStatus.canceled);
    next.reject = createCompletionHandler(next, pipelineStatus.rejected);

    return next();
  };

  return Pipeline;
}();

function createCompletionHandler(next, status) {
  return function (output) {
    return Promise.resolve({ status: status, output: output, completed: status === pipelineStatus.completed });
  };
}

var RouterConfiguration = exports.RouterConfiguration = function () {
  function RouterConfiguration() {
    

    this.instructions = [];
    this.options = {};
    this.pipelineSteps = [];
  }

  RouterConfiguration.prototype.addPipelineStep = function addPipelineStep(name, step) {
    if (step === null || step === undefined) {
      throw new Error('Pipeline step cannot be null or undefined.');
    }
    this.pipelineSteps.push({ name: name, step: step });
    return this;
  };

  RouterConfiguration.prototype.addAuthorizeStep = function addAuthorizeStep(step) {
    return this.addPipelineStep('authorize', step);
  };

  RouterConfiguration.prototype.addPreActivateStep = function addPreActivateStep(step) {
    return this.addPipelineStep('preActivate', step);
  };

  RouterConfiguration.prototype.addPreRenderStep = function addPreRenderStep(step) {
    return this.addPipelineStep('preRender', step);
  };

  RouterConfiguration.prototype.addPostRenderStep = function addPostRenderStep(step) {
    return this.addPipelineStep('postRender', step);
  };

  RouterConfiguration.prototype.fallbackRoute = function fallbackRoute(fragment) {
    this._fallbackRoute = fragment;
    return this;
  };

  RouterConfiguration.prototype.map = function map(route) {
    if (Array.isArray(route)) {
      route.forEach(this.map.bind(this));
      return this;
    }

    return this.mapRoute(route);
  };

  RouterConfiguration.prototype.useViewPortDefaults = function useViewPortDefaults(viewPortConfig) {
    this.viewPortDefaults = viewPortConfig;
    return this;
  };

  RouterConfiguration.prototype.mapRoute = function mapRoute(config) {
    this.instructions.push(function (router) {
      var routeConfigs = _ensureArrayWithSingleRoutePerConfig(config);

      var navModel = void 0;
      for (var i = 0, ii = routeConfigs.length; i < ii; ++i) {
        var _routeConfig = routeConfigs[i];
        _routeConfig.settings = _routeConfig.settings || {};
        if (!navModel) {
          navModel = router.createNavModel(_routeConfig);
        }

        router.addRoute(_routeConfig, navModel);
      }
    });

    return this;
  };

  RouterConfiguration.prototype.mapUnknownRoutes = function mapUnknownRoutes(config) {
    this.unknownRouteConfig = config;
    return this;
  };

  RouterConfiguration.prototype.exportToRouter = function exportToRouter(router) {
    var instructions = this.instructions;
    for (var i = 0, ii = instructions.length; i < ii; ++i) {
      instructions[i](router);
    }

    if (this.title) {
      router.title = this.title;
    }

    if (this.titleSeparator) {
      router.titleSeparator = this.titleSeparator;
    }

    if (this.unknownRouteConfig) {
      router.handleUnknownRoutes(this.unknownRouteConfig);
    }

    if (this._fallbackRoute) {
      router.fallbackRoute = this._fallbackRoute;
    }

    if (this.viewPortDefaults) {
      router.useViewPortDefaults(this.viewPortDefaults);
    }

    Object.assign(router.options, this.options);

    var pipelineSteps = this.pipelineSteps;
    if (pipelineSteps.length) {
      if (!router.isRoot) {
        throw new Error('Pipeline steps can only be added to the root router');
      }

      var pipelineProvider = router.pipelineProvider;
      for (var _i = 0, _ii = pipelineSteps.length; _i < _ii; ++_i) {
        var _pipelineSteps$_i = pipelineSteps[_i],
            _name = _pipelineSteps$_i.name,
            _step = _pipelineSteps$_i.step;

        pipelineProvider.addStep(_name, _step);
      }
    }
  };

  return RouterConfiguration;
}();

var activationStrategy = exports.activationStrategy = {
  noChange: 'no-change',
  invokeLifecycle: 'invoke-lifecycle',
  replace: 'replace'
};

var BuildNavigationPlanStep = exports.BuildNavigationPlanStep = function () {
  function BuildNavigationPlanStep() {
    
  }

  BuildNavigationPlanStep.prototype.run = function run(navigationInstruction, next) {
    return _buildNavigationPlan(navigationInstruction).then(function (plan) {
      if (plan instanceof Redirect) {
        return next.cancel(plan);
      }
      navigationInstruction.plan = plan;
      return next();
    }).catch(next.cancel);
  };

  return BuildNavigationPlanStep;
}();

function _buildNavigationPlan(instruction, forceLifecycleMinimum) {
  var config = instruction.config;

  if ('redirect' in config) {
    var _router = instruction.router;
    return _router._createNavigationInstruction(config.redirect).then(function (newInstruction) {
      var params = {};
      for (var _key2 in newInstruction.params) {
        var val = newInstruction.params[_key2];
        if (typeof val === 'string' && val[0] === ':') {
          val = val.slice(1);

          if (val in instruction.params) {
            params[_key2] = instruction.params[val];
          }
        } else {
          params[_key2] = newInstruction.params[_key2];
        }
      }
      var redirectLocation = _router.generate(newInstruction.config.name, params, instruction.options);

      if (instruction.queryString) {
        redirectLocation += '?' + instruction.queryString;
      }

      return Promise.resolve(new Redirect(redirectLocation));
    });
  }

  var prev = instruction.previousInstruction;
  var plan = {};
  var defaults = instruction.router.viewPortDefaults;

  if (prev) {
    var newParams = hasDifferentParameterValues(prev, instruction);
    var pending = [];

    var _loop2 = function _loop2(viewPortName) {
      var prevViewPortInstruction = prev.viewPortInstructions[viewPortName];
      var nextViewPortConfig = viewPortName in config.viewPorts ? config.viewPorts[viewPortName] : prevViewPortInstruction;
      if (nextViewPortConfig.moduleId === null && viewPortName in instruction.router.viewPortDefaults) {
        nextViewPortConfig = defaults[viewPortName];
      }

      var viewPortPlan = plan[viewPortName] = {
        name: viewPortName,
        config: nextViewPortConfig,
        prevComponent: prevViewPortInstruction.component,
        prevModuleId: prevViewPortInstruction.moduleId
      };

      if (prevViewPortInstruction.moduleId !== nextViewPortConfig.moduleId) {
        viewPortPlan.strategy = activationStrategy.replace;
      } else if ('determineActivationStrategy' in prevViewPortInstruction.component.viewModel) {
        var _prevViewPortInstruct;

        viewPortPlan.strategy = (_prevViewPortInstruct = prevViewPortInstruction.component.viewModel).determineActivationStrategy.apply(_prevViewPortInstruct, instruction.lifecycleArgs);
      } else if (config.activationStrategy) {
        viewPortPlan.strategy = config.activationStrategy;
      } else if (newParams || forceLifecycleMinimum) {
        viewPortPlan.strategy = activationStrategy.invokeLifecycle;
      } else {
        viewPortPlan.strategy = activationStrategy.noChange;
      }

      if (viewPortPlan.strategy !== activationStrategy.replace && prevViewPortInstruction.childRouter) {
        var path = instruction.getWildcardPath();
        var task = prevViewPortInstruction.childRouter._createNavigationInstruction(path, instruction).then(function (childInstruction) {
          viewPortPlan.childNavigationInstruction = childInstruction;

          return _buildNavigationPlan(childInstruction, viewPortPlan.strategy === activationStrategy.invokeLifecycle).then(function (childPlan) {
            if (childPlan instanceof Redirect) {
              return Promise.reject(childPlan);
            }
            childInstruction.plan = childPlan;
          });
        });

        pending.push(task);
      }
    };

    for (var viewPortName in prev.viewPortInstructions) {
      _loop2(viewPortName);
    }

    return Promise.all(pending).then(function () {
      return plan;
    });
  }

  for (var viewPortName in config.viewPorts) {
    var viewPortConfig = config.viewPorts[viewPortName];
    if (viewPortConfig.moduleId === null && viewPortName in instruction.router.viewPortDefaults) {
      viewPortConfig = defaults[viewPortName];
    }
    plan[viewPortName] = {
      name: viewPortName,
      strategy: activationStrategy.replace,
      config: viewPortConfig
    };
  }

  return Promise.resolve(plan);
}

function hasDifferentParameterValues(prev, next) {
  var prevParams = prev.params;
  var nextParams = next.params;
  var nextWildCardName = next.config.hasChildRouter ? next.getWildCardName() : null;

  for (var _key3 in nextParams) {
    if (_key3 === nextWildCardName) {
      continue;
    }

    if (prevParams[_key3] !== nextParams[_key3]) {
      return true;
    }
  }

  for (var _key4 in prevParams) {
    if (_key4 === nextWildCardName) {
      continue;
    }

    if (prevParams[_key4] !== nextParams[_key4]) {
      return true;
    }
  }

  if (!next.options.compareQueryParams) {
    return false;
  }

  var prevQueryParams = prev.queryParams;
  var nextQueryParams = next.queryParams;
  for (var _key5 in nextQueryParams) {
    if (prevQueryParams[_key5] !== nextQueryParams[_key5]) {
      return true;
    }
  }

  for (var _key6 in prevQueryParams) {
    if (prevQueryParams[_key6] !== nextQueryParams[_key6]) {
      return true;
    }
  }

  return false;
}

var Router = exports.Router = function () {
  function Router(container, history) {
    var _this3 = this;

    

    this.parent = null;
    this.options = {};
    this.viewPortDefaults = {};

    this.transformTitle = function (title) {
      if (_this3.parent) {
        return _this3.parent.transformTitle(title);
      }
      return title;
    };

    this.container = container;
    this.history = history;
    this.reset();
  }

  Router.prototype.reset = function reset() {
    var _this4 = this;

    this.viewPorts = {};
    this.routes = [];
    this.baseUrl = '';
    this.isConfigured = false;
    this.isNavigating = false;
    this.isExplicitNavigation = false;
    this.isExplicitNavigationBack = false;
    this.isNavigatingFirst = false;
    this.isNavigatingNew = false;
    this.isNavigatingRefresh = false;
    this.isNavigatingForward = false;
    this.isNavigatingBack = false;
    this.couldDeactivate = false;
    this.navigation = [];
    this.currentInstruction = null;
    this.viewPortDefaults = {};
    this._fallbackOrder = 100;
    this._recognizer = new _aureliaRouteRecognizer.RouteRecognizer();
    this._childRecognizer = new _aureliaRouteRecognizer.RouteRecognizer();
    this._configuredPromise = new Promise(function (resolve) {
      _this4._resolveConfiguredPromise = resolve;
    });
  };

  Router.prototype.registerViewPort = function registerViewPort(viewPort, name) {
    name = name || 'default';
    this.viewPorts[name] = viewPort;
  };

  Router.prototype.ensureConfigured = function ensureConfigured() {
    return this._configuredPromise;
  };

  Router.prototype.configure = function configure(callbackOrConfig) {
    var _this5 = this;

    this.isConfigured = true;

    var result = callbackOrConfig;
    var config = void 0;
    if (typeof callbackOrConfig === 'function') {
      config = new RouterConfiguration();
      result = callbackOrConfig(config);
    }

    return Promise.resolve(result).then(function (c) {
      if (c && c.exportToRouter) {
        config = c;
      }

      config.exportToRouter(_this5);
      _this5.isConfigured = true;
      _this5._resolveConfiguredPromise();
    });
  };

  Router.prototype.navigate = function navigate(fragment, options) {
    if (!this.isConfigured && this.parent) {
      return this.parent.navigate(fragment, options);
    }

    this.isExplicitNavigation = true;
    return this.history.navigate(_resolveUrl(fragment, this.baseUrl, this.history._hasPushState), options);
  };

  Router.prototype.navigateToRoute = function navigateToRoute(route, params, options) {
    var path = this.generate(route, params);
    return this.navigate(path, options);
  };

  Router.prototype.navigateBack = function navigateBack() {
    this.isExplicitNavigationBack = true;
    this.history.navigateBack();
  };

  Router.prototype.createChild = function createChild(container) {
    var childRouter = new Router(container || this.container.createChild(), this.history);
    childRouter.parent = this;
    return childRouter;
  };

  Router.prototype.generate = function generate(name, params) {
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    var hasRoute = this._recognizer.hasRoute(name);
    if ((!this.isConfigured || !hasRoute) && this.parent) {
      return this.parent.generate(name, params, options);
    }

    if (!hasRoute) {
      throw new Error('A route with name \'' + name + '\' could not be found. Check that `name: \'' + name + '\'` was specified in the route\'s config.');
    }

    var path = this._recognizer.generate(name, params);
    var rootedPath = _createRootedPath(path, this.baseUrl, this.history._hasPushState, options.absolute);
    return options.absolute ? '' + this.history.getAbsoluteRoot() + rootedPath : rootedPath;
  };

  Router.prototype.createNavModel = function createNavModel(config) {
    var navModel = new NavModel(this, 'href' in config ? config.href : config.route);
    navModel.title = config.title;
    navModel.order = config.nav;
    navModel.href = config.href;
    navModel.settings = config.settings;
    navModel.config = config;

    return navModel;
  };

  Router.prototype.addRoute = function addRoute(config, navModel) {
    if (Array.isArray(config.route)) {
      var routeConfigs = _ensureArrayWithSingleRoutePerConfig(config);
      routeConfigs.forEach(this.addRoute.bind(this));
      return;
    }

    validateRouteConfig(config, this.routes);

    if (!('viewPorts' in config) && !config.navigationStrategy) {
      config.viewPorts = {
        'default': {
          moduleId: config.moduleId,
          view: config.view
        }
      };
    }

    if (!navModel) {
      navModel = this.createNavModel(config);
    }

    this.routes.push(config);

    var path = config.route;
    if (path.charAt(0) === '/') {
      path = path.substr(1);
    }
    var caseSensitive = config.caseSensitive === true;
    var state = this._recognizer.add({ path: path, handler: config, caseSensitive: caseSensitive });

    if (path) {
      var _settings = config.settings;
      delete config.settings;
      var withChild = JSON.parse(JSON.stringify(config));
      config.settings = _settings;
      withChild.route = path + '/*childRoute';
      withChild.hasChildRouter = true;
      this._childRecognizer.add({
        path: withChild.route,
        handler: withChild,
        caseSensitive: caseSensitive
      });

      withChild.navModel = navModel;
      withChild.settings = config.settings;
      withChild.navigationStrategy = config.navigationStrategy;
    }

    config.navModel = navModel;

    if ((navModel.order || navModel.order === 0) && this.navigation.indexOf(navModel) === -1) {
      if (!navModel.href && navModel.href !== '' && (state.types.dynamics || state.types.stars)) {
        throw new Error('Invalid route config for "' + config.route + '" : dynamic routes must specify an "href:" to be included in the navigation model.');
      }

      if (typeof navModel.order !== 'number') {
        navModel.order = ++this._fallbackOrder;
      }

      this.navigation.push(navModel);
      this.navigation = this.navigation.sort(function (a, b) {
        return a.order - b.order;
      });
    }
  };

  Router.prototype.hasRoute = function hasRoute(name) {
    return !!(this._recognizer.hasRoute(name) || this.parent && this.parent.hasRoute(name));
  };

  Router.prototype.hasOwnRoute = function hasOwnRoute(name) {
    return this._recognizer.hasRoute(name);
  };

  Router.prototype.handleUnknownRoutes = function handleUnknownRoutes(config) {
    var _this6 = this;

    if (!config) {
      throw new Error('Invalid unknown route handler');
    }

    this.catchAllHandler = function (instruction) {
      return _this6._createRouteConfig(config, instruction).then(function (c) {
        instruction.config = c;
        return instruction;
      });
    };
  };

  Router.prototype.updateTitle = function updateTitle() {
    if (this.parent) {
      return this.parent.updateTitle();
    }

    if (this.currentInstruction) {
      this.currentInstruction._updateTitle();
    }
    return undefined;
  };

  Router.prototype.refreshNavigation = function refreshNavigation() {
    var nav = this.navigation;

    for (var i = 0, length = nav.length; i < length; i++) {
      var _current = nav[i];
      if (!_current.config.href) {
        _current.href = _createRootedPath(_current.relativeHref, this.baseUrl, this.history._hasPushState);
      } else {
        _current.href = _normalizeAbsolutePath(_current.config.href, this.history._hasPushState);
      }
    }
  };

  Router.prototype.useViewPortDefaults = function useViewPortDefaults(viewPortDefaults) {
    for (var viewPortName in viewPortDefaults) {
      var viewPortConfig = viewPortDefaults[viewPortName];
      this.viewPortDefaults[viewPortName] = {
        moduleId: viewPortConfig.moduleId
      };
    }
  };

  Router.prototype._refreshBaseUrl = function _refreshBaseUrl() {
    if (this.parent) {
      this.baseUrl = generateBaseUrl(this.parent, this.parent.currentInstruction);
    }
  };

  Router.prototype._createNavigationInstruction = function _createNavigationInstruction() {
    var url = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    var parentInstruction = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

    var fragment = url;
    var queryString = '';

    var queryIndex = url.indexOf('?');
    if (queryIndex !== -1) {
      fragment = url.substr(0, queryIndex);
      queryString = url.substr(queryIndex + 1);
    }

    var results = this._recognizer.recognize(url);
    if (!results || !results.length) {
      results = this._childRecognizer.recognize(url);
    }

    var instructionInit = {
      fragment: fragment,
      queryString: queryString,
      config: null,
      parentInstruction: parentInstruction,
      previousInstruction: this.currentInstruction,
      router: this,
      options: {
        compareQueryParams: this.options.compareQueryParams
      }
    };

    var result = void 0;

    if (results && results.length) {
      var first = results[0];
      var _instruction = new NavigationInstruction(Object.assign({}, instructionInit, {
        params: first.params,
        queryParams: first.queryParams || results.queryParams,
        config: first.config || first.handler
      }));

      if (typeof first.handler === 'function') {
        result = evaluateNavigationStrategy(_instruction, first.handler, first);
      } else if (first.handler && typeof first.handler.navigationStrategy === 'function') {
        result = evaluateNavigationStrategy(_instruction, first.handler.navigationStrategy, first.handler);
      } else {
        result = Promise.resolve(_instruction);
      }
    } else if (this.catchAllHandler) {
      var _instruction2 = new NavigationInstruction(Object.assign({}, instructionInit, {
        params: { path: fragment },
        queryParams: results ? results.queryParams : {},
        config: null }));

      result = evaluateNavigationStrategy(_instruction2, this.catchAllHandler);
    } else if (this.parent) {
      var _router2 = this._parentCatchAllHandler(this.parent);

      if (_router2) {
        var newParentInstruction = this._findParentInstructionFromRouter(_router2, parentInstruction);

        var _instruction3 = new NavigationInstruction(Object.assign({}, instructionInit, {
          params: { path: fragment },
          queryParams: results ? results.queryParams : {},
          router: _router2,
          parentInstruction: newParentInstruction,
          parentCatchHandler: true,
          config: null }));

        result = evaluateNavigationStrategy(_instruction3, _router2.catchAllHandler);
      }
    }

    if (result && parentInstruction) {
      this.baseUrl = generateBaseUrl(this.parent, parentInstruction);
    }

    return result || Promise.reject(new Error('Route not found: ' + url));
  };

  Router.prototype._findParentInstructionFromRouter = function _findParentInstructionFromRouter(router, instruction) {
    if (instruction.router === router) {
      instruction.fragment = router.baseUrl;
      return instruction;
    } else if (instruction.parentInstruction) {
      return this._findParentInstructionFromRouter(router, instruction.parentInstruction);
    }
    return undefined;
  };

  Router.prototype._parentCatchAllHandler = function _parentCatchAllHandler(router) {
    if (router.catchAllHandler) {
      return router;
    } else if (router.parent) {
      return this._parentCatchAllHandler(router.parent);
    }
    return false;
  };

  Router.prototype._createRouteConfig = function _createRouteConfig(config, instruction) {
    var _this7 = this;

    return Promise.resolve(config).then(function (c) {
      if (typeof c === 'string') {
        return { moduleId: c };
      } else if (typeof c === 'function') {
        return c(instruction);
      }

      return c;
    }).then(function (c) {
      return typeof c === 'string' ? { moduleId: c } : c;
    }).then(function (c) {
      c.route = instruction.params.path;
      validateRouteConfig(c, _this7.routes);

      if (!c.navModel) {
        c.navModel = _this7.createNavModel(c);
      }

      return c;
    });
  };

  _createClass(Router, [{
    key: 'isRoot',
    get: function get() {
      return !this.parent;
    }
  }]);

  return Router;
}();

function generateBaseUrl(router, instruction) {
  return '' + (router.baseUrl || '') + (instruction.getBaseUrl() || '');
}

function validateRouteConfig(config, routes) {
  if ((typeof config === 'undefined' ? 'undefined' : _typeof(config)) !== 'object') {
    throw new Error('Invalid Route Config');
  }

  if (typeof config.route !== 'string') {
    var _name2 = config.name || '(no name)';
    throw new Error('Invalid Route Config for "' + _name2 + '": You must specify a "route:" pattern.');
  }

  if (!('redirect' in config || config.moduleId || config.navigationStrategy || config.viewPorts)) {
    throw new Error('Invalid Route Config for "' + config.route + '": You must specify a "moduleId:", "redirect:", "navigationStrategy:", or "viewPorts:".');
  }
}

function evaluateNavigationStrategy(instruction, evaluator, context) {
  return Promise.resolve(evaluator.call(context, instruction)).then(function () {
    if (!('viewPorts' in instruction.config)) {
      instruction.config.viewPorts = {
        'default': {
          moduleId: instruction.config.moduleId
        }
      };
    }

    return instruction;
  });
}

var CanDeactivatePreviousStep = exports.CanDeactivatePreviousStep = function () {
  function CanDeactivatePreviousStep() {
    
  }

  CanDeactivatePreviousStep.prototype.run = function run(navigationInstruction, next) {
    return processDeactivatable(navigationInstruction, 'canDeactivate', next);
  };

  return CanDeactivatePreviousStep;
}();

var CanActivateNextStep = exports.CanActivateNextStep = function () {
  function CanActivateNextStep() {
    
  }

  CanActivateNextStep.prototype.run = function run(navigationInstruction, next) {
    return processActivatable(navigationInstruction, 'canActivate', next);
  };

  return CanActivateNextStep;
}();

var DeactivatePreviousStep = exports.DeactivatePreviousStep = function () {
  function DeactivatePreviousStep() {
    
  }

  DeactivatePreviousStep.prototype.run = function run(navigationInstruction, next) {
    return processDeactivatable(navigationInstruction, 'deactivate', next, true);
  };

  return DeactivatePreviousStep;
}();

var ActivateNextStep = exports.ActivateNextStep = function () {
  function ActivateNextStep() {
    
  }

  ActivateNextStep.prototype.run = function run(navigationInstruction, next) {
    return processActivatable(navigationInstruction, 'activate', next, true);
  };

  return ActivateNextStep;
}();

function processDeactivatable(navigationInstruction, callbackName, next, ignoreResult) {
  var plan = navigationInstruction.plan;
  var infos = findDeactivatable(plan, callbackName);
  var i = infos.length;

  function inspect(val) {
    if (ignoreResult || shouldContinue(val)) {
      return iterate();
    }

    return next.cancel(val);
  }

  function iterate() {
    if (i--) {
      try {
        var viewModel = infos[i];
        var _result = viewModel[callbackName](navigationInstruction);
        return processPotential(_result, inspect, next.cancel);
      } catch (error) {
        return next.cancel(error);
      }
    }

    navigationInstruction.router.couldDeactivate = true;

    return next();
  }

  return iterate();
}

function findDeactivatable(plan, callbackName) {
  var list = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

  for (var viewPortName in plan) {
    var _viewPortPlan = plan[viewPortName];
    var prevComponent = _viewPortPlan.prevComponent;

    if ((_viewPortPlan.strategy === activationStrategy.invokeLifecycle || _viewPortPlan.strategy === activationStrategy.replace) && prevComponent) {
      var viewModel = prevComponent.viewModel;

      if (callbackName in viewModel) {
        list.push(viewModel);
      }
    }

    if (_viewPortPlan.strategy === activationStrategy.replace && prevComponent) {
      addPreviousDeactivatable(prevComponent, callbackName, list);
    } else if (_viewPortPlan.childNavigationInstruction) {
      findDeactivatable(_viewPortPlan.childNavigationInstruction.plan, callbackName, list);
    }
  }

  return list;
}

function addPreviousDeactivatable(component, callbackName, list) {
  var childRouter = component.childRouter;

  if (childRouter && childRouter.currentInstruction) {
    var viewPortInstructions = childRouter.currentInstruction.viewPortInstructions;

    for (var viewPortName in viewPortInstructions) {
      var _viewPortInstruction2 = viewPortInstructions[viewPortName];
      var prevComponent = _viewPortInstruction2.component;
      var prevViewModel = prevComponent.viewModel;

      if (callbackName in prevViewModel) {
        list.push(prevViewModel);
      }

      addPreviousDeactivatable(prevComponent, callbackName, list);
    }
  }
}

function processActivatable(navigationInstruction, callbackName, next, ignoreResult) {
  var infos = findActivatable(navigationInstruction, callbackName);
  var length = infos.length;
  var i = -1;

  function inspect(val, router) {
    if (ignoreResult || shouldContinue(val, router)) {
      return iterate();
    }

    return next.cancel(val);
  }

  function iterate() {
    i++;

    if (i < length) {
      try {
        var _current2$viewModel;

        var _current2 = infos[i];
        var _result2 = (_current2$viewModel = _current2.viewModel)[callbackName].apply(_current2$viewModel, _current2.lifecycleArgs);
        return processPotential(_result2, function (val) {
          return inspect(val, _current2.router);
        }, next.cancel);
      } catch (error) {
        return next.cancel(error);
      }
    }

    return next();
  }

  return iterate();
}

function findActivatable(navigationInstruction, callbackName) {
  var list = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  var router = arguments[3];

  var plan = navigationInstruction.plan;

  Object.keys(plan).filter(function (viewPortName) {
    var viewPortPlan = plan[viewPortName];
    var viewPortInstruction = navigationInstruction.viewPortInstructions[viewPortName];
    var viewModel = viewPortInstruction.component.viewModel;

    if ((viewPortPlan.strategy === activationStrategy.invokeLifecycle || viewPortPlan.strategy === activationStrategy.replace) && callbackName in viewModel) {
      list.push({
        viewModel: viewModel,
        lifecycleArgs: viewPortInstruction.lifecycleArgs,
        router: router
      });
    }

    if (viewPortPlan.childNavigationInstruction) {
      findActivatable(viewPortPlan.childNavigationInstruction, callbackName, list, viewPortInstruction.component.childRouter || router);
    }
  });

  return list;
}

function shouldContinue(output, router) {
  if (output instanceof Error) {
    return false;
  }

  if (isNavigationCommand(output)) {
    if (typeof output.setRouter === 'function') {
      output.setRouter(router);
    }

    return !!output.shouldContinueProcessing;
  }

  if (output === undefined) {
    return true;
  }

  return output;
}

var SafeSubscription = function () {
  function SafeSubscription(subscriptionFunc) {
    

    this._subscribed = true;
    this._subscription = subscriptionFunc(this);

    if (!this._subscribed) this.unsubscribe();
  }

  SafeSubscription.prototype.unsubscribe = function unsubscribe() {
    if (this._subscribed && this._subscription) this._subscription.unsubscribe();

    this._subscribed = false;
  };

  _createClass(SafeSubscription, [{
    key: 'subscribed',
    get: function get() {
      return this._subscribed;
    }
  }]);

  return SafeSubscription;
}();

function processPotential(obj, resolve, reject) {
  if (obj && typeof obj.then === 'function') {
    return Promise.resolve(obj).then(resolve).catch(reject);
  }

  if (obj && typeof obj.subscribe === 'function') {
    var obs = obj;
    return new SafeSubscription(function (sub) {
      return obs.subscribe({
        next: function next() {
          if (sub.subscribed) {
            sub.unsubscribe();
            resolve(obj);
          }
        },
        error: function error(_error) {
          if (sub.subscribed) {
            sub.unsubscribe();
            reject(_error);
          }
        },
        complete: function complete() {
          if (sub.subscribed) {
            sub.unsubscribe();
            resolve(obj);
          }
        }
      });
    });
  }

  try {
    return resolve(obj);
  } catch (error) {
    return reject(error);
  }
}

var RouteLoader = exports.RouteLoader = function () {
  function RouteLoader() {
    
  }

  RouteLoader.prototype.loadRoute = function loadRoute(router, config, navigationInstruction) {
    throw Error('Route loaders must implement "loadRoute(router, config, navigationInstruction)".');
  };

  return RouteLoader;
}();

var LoadRouteStep = exports.LoadRouteStep = function () {
  LoadRouteStep.inject = function inject() {
    return [RouteLoader];
  };

  function LoadRouteStep(routeLoader) {
    

    this.routeLoader = routeLoader;
  }

  LoadRouteStep.prototype.run = function run(navigationInstruction, next) {
    return loadNewRoute(this.routeLoader, navigationInstruction).then(next).catch(next.cancel);
  };

  return LoadRouteStep;
}();

function loadNewRoute(routeLoader, navigationInstruction) {
  var toLoad = determineWhatToLoad(navigationInstruction);
  var loadPromises = toLoad.map(function (current) {
    return loadRoute(routeLoader, current.navigationInstruction, current.viewPortPlan);
  });

  return Promise.all(loadPromises);
}

function determineWhatToLoad(navigationInstruction) {
  var toLoad = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

  var plan = navigationInstruction.plan;

  for (var viewPortName in plan) {
    var _viewPortPlan2 = plan[viewPortName];

    if (_viewPortPlan2.strategy === activationStrategy.replace) {
      toLoad.push({ viewPortPlan: _viewPortPlan2, navigationInstruction: navigationInstruction });

      if (_viewPortPlan2.childNavigationInstruction) {
        determineWhatToLoad(_viewPortPlan2.childNavigationInstruction, toLoad);
      }
    } else {
      var _viewPortInstruction3 = navigationInstruction.addViewPortInstruction(viewPortName, _viewPortPlan2.strategy, _viewPortPlan2.prevModuleId, _viewPortPlan2.prevComponent);

      if (_viewPortPlan2.childNavigationInstruction) {
        _viewPortInstruction3.childNavigationInstruction = _viewPortPlan2.childNavigationInstruction;
        determineWhatToLoad(_viewPortPlan2.childNavigationInstruction, toLoad);
      }
    }
  }

  return toLoad;
}

function loadRoute(routeLoader, navigationInstruction, viewPortPlan) {
  var moduleId = viewPortPlan.config ? viewPortPlan.config.moduleId : null;

  return loadComponent(routeLoader, navigationInstruction, viewPortPlan.config).then(function (component) {
    var viewPortInstruction = navigationInstruction.addViewPortInstruction(viewPortPlan.name, viewPortPlan.strategy, moduleId, component);

    var childRouter = component.childRouter;
    if (childRouter) {
      var path = navigationInstruction.getWildcardPath();

      return childRouter._createNavigationInstruction(path, navigationInstruction).then(function (childInstruction) {
        viewPortPlan.childNavigationInstruction = childInstruction;

        return _buildNavigationPlan(childInstruction).then(function (childPlan) {
          if (childPlan instanceof Redirect) {
            return Promise.reject(childPlan);
          }
          childInstruction.plan = childPlan;
          viewPortInstruction.childNavigationInstruction = childInstruction;

          return loadNewRoute(routeLoader, childInstruction);
        });
      });
    }

    return undefined;
  });
}

function loadComponent(routeLoader, navigationInstruction, config) {
  var router = navigationInstruction.router;
  var lifecycleArgs = navigationInstruction.lifecycleArgs;

  return routeLoader.loadRoute(router, config, navigationInstruction).then(function (component) {
    var viewModel = component.viewModel,
        childContainer = component.childContainer;

    component.router = router;
    component.config = config;

    if ('configureRouter' in viewModel) {
      var childRouter = childContainer.getChildRouter();
      component.childRouter = childRouter;

      return childRouter.configure(function (c) {
        return viewModel.configureRouter.apply(viewModel, [c, childRouter].concat(lifecycleArgs));
      }).then(function () {
        return component;
      });
    }

    return component;
  });
}

var PipelineSlot = function () {
  function PipelineSlot(container, name, alias) {
    

    this.steps = [];

    this.container = container;
    this.slotName = name;
    this.slotAlias = alias;
  }

  PipelineSlot.prototype.getSteps = function getSteps() {
    var _this8 = this;

    return this.steps.map(function (x) {
      return _this8.container.get(x);
    });
  };

  return PipelineSlot;
}();

var PipelineProvider = exports.PipelineProvider = function () {
  PipelineProvider.inject = function inject() {
    return [_aureliaDependencyInjection.Container];
  };

  function PipelineProvider(container) {
    

    this.container = container;
    this.steps = [BuildNavigationPlanStep, CanDeactivatePreviousStep, LoadRouteStep, this._createPipelineSlot('authorize'), CanActivateNextStep, this._createPipelineSlot('preActivate', 'modelbind'), DeactivatePreviousStep, ActivateNextStep, this._createPipelineSlot('preRender', 'precommit'), CommitChangesStep, this._createPipelineSlot('postRender', 'postcomplete')];
  }

  PipelineProvider.prototype.createPipeline = function createPipeline() {
    var _this9 = this;

    var useCanDeactivateStep = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

    var pipeline = new Pipeline();
    this.steps.forEach(function (step) {
      if (useCanDeactivateStep || step !== CanDeactivatePreviousStep) {
        pipeline.addStep(_this9.container.get(step));
      }
    });
    return pipeline;
  };

  PipelineProvider.prototype._findStep = function _findStep(name) {
    return this.steps.find(function (x) {
      return x.slotName === name || x.slotAlias === name;
    });
  };

  PipelineProvider.prototype.addStep = function addStep(name, step) {
    var found = this._findStep(name);
    if (found) {
      if (!found.steps.includes(step)) {
        found.steps.push(step);
      }
    } else {
      throw new Error('Invalid pipeline slot name: ' + name + '.');
    }
  };

  PipelineProvider.prototype.removeStep = function removeStep(name, step) {
    var slot = this._findStep(name);
    if (slot) {
      slot.steps.splice(slot.steps.indexOf(step), 1);
    }
  };

  PipelineProvider.prototype._clearSteps = function _clearSteps() {
    var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

    var slot = this._findStep(name);
    if (slot) {
      slot.steps = [];
    }
  };

  PipelineProvider.prototype.reset = function reset() {
    this._clearSteps('authorize');
    this._clearSteps('preActivate');
    this._clearSteps('preRender');
    this._clearSteps('postRender');
  };

  PipelineProvider.prototype._createPipelineSlot = function _createPipelineSlot(name, alias) {
    return new PipelineSlot(this.container, name, alias);
  };

  return PipelineProvider;
}();

var logger = LogManager.getLogger('app-router');

var AppRouter = exports.AppRouter = function (_Router) {
  _inherits(AppRouter, _Router);

  AppRouter.inject = function inject() {
    return [_aureliaDependencyInjection.Container, _aureliaHistory.History, PipelineProvider, _aureliaEventAggregator.EventAggregator];
  };

  function AppRouter(container, history, pipelineProvider, events) {
    

    var _this10 = _possibleConstructorReturn(this, _Router.call(this, container, history));

    _this10.pipelineProvider = pipelineProvider;
    _this10.events = events;
    return _this10;
  }

  AppRouter.prototype.reset = function reset() {
    _Router.prototype.reset.call(this);
    this.maxInstructionCount = 10;
    if (!this._queue) {
      this._queue = [];
    } else {
      this._queue.length = 0;
    }
  };

  AppRouter.prototype.loadUrl = function loadUrl(url) {
    var _this11 = this;

    return this._createNavigationInstruction(url).then(function (instruction) {
      return _this11._queueInstruction(instruction);
    }).catch(function (error) {
      logger.error(error);
      restorePreviousLocation(_this11);
    });
  };

  AppRouter.prototype.registerViewPort = function registerViewPort(viewPort, name) {
    var _this12 = this;

    _Router.prototype.registerViewPort.call(this, viewPort, name);

    if (!this.isActive) {
      var viewModel = this._findViewModel(viewPort);
      if ('configureRouter' in viewModel) {
        if (!this.isConfigured) {
          var resolveConfiguredPromise = this._resolveConfiguredPromise;
          this._resolveConfiguredPromise = function () {};
          return this.configure(function (config) {
            return viewModel.configureRouter(config, _this12);
          }).then(function () {
            _this12.activate();
            resolveConfiguredPromise();
          });
        }
      } else {
        this.activate();
      }
    } else {
      this._dequeueInstruction();
    }

    return Promise.resolve();
  };

  AppRouter.prototype.activate = function activate(options) {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.options = Object.assign({ routeHandler: this.loadUrl.bind(this) }, this.options, options);
    this.history.activate(this.options);
    this._dequeueInstruction();
  };

  AppRouter.prototype.deactivate = function deactivate() {
    this.isActive = false;
    this.history.deactivate();
  };

  AppRouter.prototype._queueInstruction = function _queueInstruction(instruction) {
    var _this13 = this;

    return new Promise(function (resolve) {
      instruction.resolve = resolve;
      _this13._queue.unshift(instruction);
      _this13._dequeueInstruction();
    });
  };

  AppRouter.prototype._dequeueInstruction = function _dequeueInstruction() {
    var _this14 = this;

    var instructionCount = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

    return Promise.resolve().then(function () {
      if (_this14.isNavigating && !instructionCount) {
        return undefined;
      }

      var instruction = _this14._queue.shift();
      _this14._queue.length = 0;

      if (!instruction) {
        return undefined;
      }

      _this14.isNavigating = true;

      var navtracker = _this14.history.getState('NavigationTracker');
      if (!navtracker && !_this14.currentNavigationTracker) {
        _this14.isNavigatingFirst = true;
        _this14.isNavigatingNew = true;
      } else if (!navtracker) {
        _this14.isNavigatingNew = true;
      } else if (!_this14.currentNavigationTracker) {
        _this14.isNavigatingRefresh = true;
      } else if (_this14.currentNavigationTracker < navtracker) {
        _this14.isNavigatingForward = true;
      } else if (_this14.currentNavigationTracker > navtracker) {
        _this14.isNavigatingBack = true;
      }if (!navtracker) {
        navtracker = Date.now();
        _this14.history.setState('NavigationTracker', navtracker);
      }
      _this14.currentNavigationTracker = navtracker;

      instruction.previousInstruction = _this14.currentInstruction;

      if (!instructionCount) {
        _this14.events.publish('router:navigation:processing', { instruction: instruction });
      } else if (instructionCount === _this14.maxInstructionCount - 1) {
        logger.error(instructionCount + 1 + ' navigation instructions have been attempted without success. Restoring last known good location.');
        restorePreviousLocation(_this14);
        return _this14._dequeueInstruction(instructionCount + 1);
      } else if (instructionCount > _this14.maxInstructionCount) {
        throw new Error('Maximum navigation attempts exceeded. Giving up.');
      }

      var pipeline = _this14.pipelineProvider.createPipeline(!_this14.couldDeactivate);

      return pipeline.run(instruction).then(function (result) {
        return processResult(instruction, result, instructionCount, _this14);
      }).catch(function (error) {
        return { output: error instanceof Error ? error : new Error(error) };
      }).then(function (result) {
        return resolveInstruction(instruction, result, !!instructionCount, _this14);
      });
    });
  };

  AppRouter.prototype._findViewModel = function _findViewModel(viewPort) {
    if (this.container.viewModel) {
      return this.container.viewModel;
    }

    if (viewPort.container) {
      var container = viewPort.container;

      while (container) {
        if (container.viewModel) {
          this.container.viewModel = container.viewModel;
          return container.viewModel;
        }

        container = container.parent;
      }
    }

    return undefined;
  };

  return AppRouter;
}(Router);

function processResult(instruction, result, instructionCount, router) {
  if (!(result && 'completed' in result && 'output' in result)) {
    result = result || {};
    result.output = new Error('Expected router pipeline to return a navigation result, but got [' + JSON.stringify(result) + '] instead.');
  }

  var finalResult = null;
  var navigationCommandResult = null;
  if (isNavigationCommand(result.output)) {
    navigationCommandResult = result.output.navigate(router);
  } else {
    finalResult = result;

    if (!result.completed) {
      if (result.output instanceof Error) {
        logger.error(result.output);
      }

      restorePreviousLocation(router);
    }
  }

  return Promise.resolve(navigationCommandResult).then(function (_) {
    return router._dequeueInstruction(instructionCount + 1);
  }).then(function (innerResult) {
    return finalResult || innerResult || result;
  });
}

function resolveInstruction(instruction, result, isInnerInstruction, router) {
  instruction.resolve(result);

  var eventArgs = { instruction: instruction, result: result };
  if (!isInnerInstruction) {
    router.isNavigating = false;
    router.isExplicitNavigation = false;
    router.isExplicitNavigationBack = false;
    router.isNavigatingFirst = false;
    router.isNavigatingNew = false;
    router.isNavigatingRefresh = false;
    router.isNavigatingForward = false;
    router.isNavigatingBack = false;
    router.couldDeactivate = false;

    var eventName = void 0;

    if (result.output instanceof Error) {
      eventName = 'error';
    } else if (!result.completed) {
      eventName = 'canceled';
    } else {
      var _queryString = instruction.queryString ? '?' + instruction.queryString : '';
      router.history.previousLocation = instruction.fragment + _queryString;
      eventName = 'success';
    }

    router.events.publish('router:navigation:' + eventName, eventArgs);
    router.events.publish('router:navigation:complete', eventArgs);
  } else {
    router.events.publish('router:navigation:child:complete', eventArgs);
  }

  return result;
}

function restorePreviousLocation(router) {
  var previousLocation = router.history.previousLocation;
  if (previousLocation) {
    router.navigate(router.history.previousLocation, { trigger: false, replace: true });
  } else if (router.fallbackRoute) {
    router.navigate(router.fallbackRoute, { trigger: true, replace: true });
  } else {
    logger.error('Router navigation failed, and no previous location or fallbackRoute could be restored.');
  }
}
});

define('aurelia-task-queue/dist/commonjs/aurelia-task-queue',['require','exports','module','aurelia-pal'],function (require, exports, module) {'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TaskQueue = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _aureliaPal = require('aurelia-pal');



var stackSeparator = '\nEnqueued in TaskQueue by:\n';
var microStackSeparator = '\nEnqueued in MicroTaskQueue by:\n';

function makeRequestFlushFromMutationObserver(flush) {
  var observer = _aureliaPal.DOM.createMutationObserver(flush);
  var val = 'a';
  var node = _aureliaPal.DOM.createTextNode('a');
  var values = Object.create(null);
  values.a = 'b';
  values.b = 'a';
  observer.observe(node, { characterData: true });
  return function requestFlush() {
    node.data = val = values[val];
  };
}

function makeRequestFlushFromTimer(flush) {
  return function requestFlush() {
    var timeoutHandle = setTimeout(handleFlushTimer, 0);

    var intervalHandle = setInterval(handleFlushTimer, 50);
    function handleFlushTimer() {
      clearTimeout(timeoutHandle);
      clearInterval(intervalHandle);
      flush();
    }
  };
}

function onError(error, task, longStacks) {
  if (longStacks && task.stack && (typeof error === 'undefined' ? 'undefined' : _typeof(error)) === 'object' && error !== null) {
    error.stack = filterFlushStack(error.stack) + task.stack;
  }

  if ('onError' in task) {
    task.onError(error);
  } else {
    setTimeout(function () {
      throw error;
    }, 0);
  }
}

var TaskQueue = exports.TaskQueue = function () {
  function TaskQueue() {
    var _this = this;

    

    this.flushing = false;
    this.longStacks = false;

    this.microTaskQueue = [];
    this.microTaskQueueCapacity = 1024;
    this.taskQueue = [];

    if (_aureliaPal.FEATURE.mutationObserver) {
      this.requestFlushMicroTaskQueue = makeRequestFlushFromMutationObserver(function () {
        return _this.flushMicroTaskQueue();
      });
    } else {
      this.requestFlushMicroTaskQueue = makeRequestFlushFromTimer(function () {
        return _this.flushMicroTaskQueue();
      });
    }

    this.requestFlushTaskQueue = makeRequestFlushFromTimer(function () {
      return _this.flushTaskQueue();
    });
  }

  TaskQueue.prototype._flushQueue = function _flushQueue(queue, capacity) {
    var index = 0;
    var task = void 0;

    try {
      this.flushing = true;
      while (index < queue.length) {
        task = queue[index];
        if (this.longStacks) {
          this.stack = typeof task.stack === 'string' ? task.stack : undefined;
        }
        task.call();
        index++;

        if (index > capacity) {
          for (var scan = 0, newLength = queue.length - index; scan < newLength; scan++) {
            queue[scan] = queue[scan + index];
          }

          queue.length -= index;
          index = 0;
        }
      }
    } catch (error) {
      onError(error, task, this.longStacks);
    } finally {
      this.flushing = false;
    }
  };

  TaskQueue.prototype.queueMicroTask = function queueMicroTask(task) {
    if (this.microTaskQueue.length < 1) {
      this.requestFlushMicroTaskQueue();
    }

    if (this.longStacks) {
      task.stack = this.prepareQueueStack(microStackSeparator);
    }

    this.microTaskQueue.push(task);
  };

  TaskQueue.prototype.queueTask = function queueTask(task) {
    if (this.taskQueue.length < 1) {
      this.requestFlushTaskQueue();
    }

    if (this.longStacks) {
      task.stack = this.prepareQueueStack(stackSeparator);
    }

    this.taskQueue.push(task);
  };

  TaskQueue.prototype.flushTaskQueue = function flushTaskQueue() {
    var queue = this.taskQueue;
    this.taskQueue = [];
    this._flushQueue(queue, Number.MAX_VALUE);
  };

  TaskQueue.prototype.flushMicroTaskQueue = function flushMicroTaskQueue() {
    var queue = this.microTaskQueue;
    this._flushQueue(queue, this.microTaskQueueCapacity);
    queue.length = 0;
  };

  TaskQueue.prototype.prepareQueueStack = function prepareQueueStack(separator) {
    var stack = separator + filterQueueStack(captureStack());

    if (typeof this.stack === 'string') {
      stack = filterFlushStack(stack) + this.stack;
    }

    return stack;
  };

  return TaskQueue;
}();

function captureStack() {
  var error = new Error();

  if (error.stack) {
    return error.stack;
  }

  try {
    throw error;
  } catch (e) {
    return e.stack;
  }
}

function filterQueueStack(stack) {
  return stack.replace(/^[\s\S]*?\bqueue(Micro)?Task\b[^\n]*\n/, '');
}

function filterFlushStack(stack) {
  var index = stack.lastIndexOf('flushMicroTaskQueue');

  if (index < 0) {
    index = stack.lastIndexOf('flushTaskQueue');
    if (index < 0) {
      return stack;
    }
  }

  index = stack.lastIndexOf('\n', index);

  return index < 0 ? stack : stack.substr(0, index);
}
});

define('aurelia-templating-binding/dist/es2015/aurelia-templating-binding',["exports", "aurelia-logging", "aurelia-binding", "aurelia-templating"], function (_exports, LogManager, _aureliaBinding, _aureliaTemplating) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.configure = configure;
  _exports.TemplatingBindingLanguage = _exports.SyntaxInterpreter = _exports.LetInterpolationBinding = _exports.LetInterpolationBindingExpression = _exports.LetBinding = _exports.LetExpression = _exports.ChildInterpolationBinding = _exports.InterpolationBinding = _exports.InterpolationBindingExpression = _exports.AttributeMap = void 0;
  LogManager = _interopRequireWildcard(LogManager);

  function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

  var _class, _temp, _dec, _class2, _dec2, _class3, _class4, _temp2, _class5, _temp3;

  let AttributeMap = (_temp = _class = class AttributeMap {
    constructor(svg) {
      this.elements = Object.create(null);
      this.allElements = Object.create(null);
      this.svg = svg;
      this.registerUniversal('accesskey', 'accessKey');
      this.registerUniversal('contenteditable', 'contentEditable');
      this.registerUniversal('tabindex', 'tabIndex');
      this.registerUniversal('textcontent', 'textContent');
      this.registerUniversal('innerhtml', 'innerHTML');
      this.registerUniversal('scrolltop', 'scrollTop');
      this.registerUniversal('scrollleft', 'scrollLeft');
      this.registerUniversal('readonly', 'readOnly');
      this.register('label', 'for', 'htmlFor');
      this.register('img', 'usemap', 'useMap');
      this.register('input', 'maxlength', 'maxLength');
      this.register('input', 'minlength', 'minLength');
      this.register('input', 'formaction', 'formAction');
      this.register('input', 'formenctype', 'formEncType');
      this.register('input', 'formmethod', 'formMethod');
      this.register('input', 'formnovalidate', 'formNoValidate');
      this.register('input', 'formtarget', 'formTarget');
      this.register('textarea', 'maxlength', 'maxLength');
      this.register('td', 'rowspan', 'rowSpan');
      this.register('td', 'colspan', 'colSpan');
      this.register('th', 'rowspan', 'rowSpan');
      this.register('th', 'colspan', 'colSpan');
    }

    register(elementName, attributeName, propertyName) {
      elementName = elementName.toLowerCase();
      attributeName = attributeName.toLowerCase();
      const element = this.elements[elementName] = this.elements[elementName] || Object.create(null);
      element[attributeName] = propertyName;
    }

    registerUniversal(attributeName, propertyName) {
      attributeName = attributeName.toLowerCase();
      this.allElements[attributeName] = propertyName;
    }

    map(elementName, attributeName) {
      if (this.svg.isStandardSvgAttribute(elementName, attributeName)) {
        return attributeName;
      }

      elementName = elementName.toLowerCase();
      attributeName = attributeName.toLowerCase();
      const element = this.elements[elementName];

      if (element !== undefined && attributeName in element) {
        return element[attributeName];
      }

      if (attributeName in this.allElements) {
        return this.allElements[attributeName];
      }

      if (/(?:^data-)|(?:^aria-)|:/.test(attributeName)) {
        return attributeName;
      }

      return (0, _aureliaBinding.camelCase)(attributeName);
    }

  }, _class.inject = [_aureliaBinding.SVGAnalyzer], _temp);
  _exports.AttributeMap = AttributeMap;
  let InterpolationBindingExpression = class InterpolationBindingExpression {
    constructor(observerLocator, targetProperty, parts, mode, lookupFunctions, attribute) {
      this.observerLocator = observerLocator;
      this.targetProperty = targetProperty;
      this.parts = parts;
      this.mode = mode;
      this.lookupFunctions = lookupFunctions;
      this.attribute = this.attrToRemove = attribute;
      this.discrete = false;
    }

    createBinding(target) {
      if (this.parts.length === 3) {
        return new ChildInterpolationBinding(target, this.observerLocator, this.parts[1], this.mode, this.lookupFunctions, this.targetProperty, this.parts[0], this.parts[2]);
      }

      return new InterpolationBinding(this.observerLocator, this.parts, target, this.targetProperty, this.mode, this.lookupFunctions);
    }

  };
  _exports.InterpolationBindingExpression = InterpolationBindingExpression;

  function validateTarget(target, propertyName) {
    if (propertyName === 'style') {
      LogManager.getLogger('templating-binding').info('Internet Explorer does not support interpolation in "style" attributes.  Use the style attribute\'s alias, "css" instead.');
    } else if (target.parentElement && target.parentElement.nodeName === 'TEXTAREA' && propertyName === 'textContent') {
      throw new Error('Interpolation binding cannot be used in the content of a textarea element.  Use <textarea value.bind="expression"></textarea> instead.');
    }
  }

  let InterpolationBinding = class InterpolationBinding {
    constructor(observerLocator, parts, target, targetProperty, mode, lookupFunctions) {
      validateTarget(target, targetProperty);
      this.observerLocator = observerLocator;
      this.parts = parts;
      this.target = target;
      this.targetProperty = targetProperty;
      this.targetAccessor = observerLocator.getAccessor(target, targetProperty);
      this.mode = mode;
      this.lookupFunctions = lookupFunctions;
    }

    interpolate() {
      if (this.isBound) {
        let value = '';
        let parts = this.parts;

        for (let i = 0, ii = parts.length; i < ii; i++) {
          value += i % 2 === 0 ? parts[i] : this[`childBinding${i}`].value;
        }

        this.targetAccessor.setValue(value, this.target, this.targetProperty);
      }
    }

    updateOneTimeBindings() {
      for (let i = 1, ii = this.parts.length; i < ii; i += 2) {
        let child = this[`childBinding${i}`];

        if (child.mode === _aureliaBinding.bindingMode.oneTime) {
          child.call();
        }
      }
    }

    bind(source) {
      if (this.isBound) {
        if (this.source === source) {
          return;
        }

        this.unbind();
      }

      this.source = source;
      let parts = this.parts;

      for (let i = 1, ii = parts.length; i < ii; i += 2) {
        let binding = new ChildInterpolationBinding(this, this.observerLocator, parts[i], this.mode, this.lookupFunctions);
        binding.bind(source);
        this[`childBinding${i}`] = binding;
      }

      this.isBound = true;
      this.interpolate();
    }

    unbind() {
      if (!this.isBound) {
        return;
      }

      this.isBound = false;
      this.source = null;
      let parts = this.parts;

      for (let i = 1, ii = parts.length; i < ii; i += 2) {
        let name = `childBinding${i}`;
        this[name].unbind();
      }
    }

  };
  _exports.InterpolationBinding = InterpolationBinding;
  let ChildInterpolationBinding = (_dec = (0, _aureliaBinding.connectable)(), _dec(_class2 = class ChildInterpolationBinding {
    constructor(target, observerLocator, sourceExpression, mode, lookupFunctions, targetProperty, left, right) {
      if (target instanceof InterpolationBinding) {
        this.parent = target;
      } else {
        validateTarget(target, targetProperty);
        this.target = target;
        this.targetProperty = targetProperty;
        this.targetAccessor = observerLocator.getAccessor(target, targetProperty);
      }

      this.observerLocator = observerLocator;
      this.sourceExpression = sourceExpression;
      this.mode = mode;
      this.lookupFunctions = lookupFunctions;
      this.left = left;
      this.right = right;
    }

    updateTarget(value) {
      value = value === null || value === undefined ? '' : value.toString();

      if (value !== this.value) {
        this.value = value;

        if (this.parent) {
          this.parent.interpolate();
        } else {
          this.targetAccessor.setValue(this.left + value + this.right, this.target, this.targetProperty);
        }
      }
    }

    call() {
      if (!this.isBound) {
        return;
      }

      this.rawValue = this.sourceExpression.evaluate(this.source, this.lookupFunctions);
      this.updateTarget(this.rawValue);

      if (this.mode !== _aureliaBinding.bindingMode.oneTime) {
        this._version++;
        this.sourceExpression.connect(this, this.source);

        if (this.rawValue instanceof Array) {
          this.observeArray(this.rawValue);
        }

        this.unobserve(false);
      }
    }

    bind(source) {
      if (this.isBound) {
        if (this.source === source) {
          return;
        }

        this.unbind();
      }

      this.isBound = true;
      this.source = source;
      let sourceExpression = this.sourceExpression;

      if (sourceExpression.bind) {
        sourceExpression.bind(this, source, this.lookupFunctions);
      }

      this.rawValue = sourceExpression.evaluate(source, this.lookupFunctions);
      this.updateTarget(this.rawValue);

      if (this.mode === _aureliaBinding.bindingMode.oneWay) {
        (0, _aureliaBinding.enqueueBindingConnect)(this);
      }
    }

    unbind() {
      if (!this.isBound) {
        return;
      }

      this.isBound = false;
      let sourceExpression = this.sourceExpression;

      if (sourceExpression.unbind) {
        sourceExpression.unbind(this, this.source);
      }

      this.source = null;
      this.value = null;
      this.rawValue = null;
      this.unobserve(true);
    }

    connect(evaluate) {
      if (!this.isBound) {
        return;
      }

      if (evaluate) {
        this.rawValue = this.sourceExpression.evaluate(this.source, this.lookupFunctions);
        this.updateTarget(this.rawValue);
      }

      this.sourceExpression.connect(this, this.source);

      if (this.rawValue instanceof Array) {
        this.observeArray(this.rawValue);
      }
    }

  }) || _class2);
  _exports.ChildInterpolationBinding = ChildInterpolationBinding;
  let LetExpression = class LetExpression {
    constructor(observerLocator, targetProperty, sourceExpression, lookupFunctions, toBindingContext) {
      this.observerLocator = observerLocator;
      this.sourceExpression = sourceExpression;
      this.targetProperty = targetProperty;
      this.lookupFunctions = lookupFunctions;
      this.toBindingContext = toBindingContext;
    }

    createBinding() {
      return new LetBinding(this.observerLocator, this.sourceExpression, this.targetProperty, this.lookupFunctions, this.toBindingContext);
    }

  };
  _exports.LetExpression = LetExpression;
  let LetBinding = (_dec2 = (0, _aureliaBinding.connectable)(), _dec2(_class3 = class LetBinding {
    constructor(observerLocator, sourceExpression, targetProperty, lookupFunctions, toBindingContext) {
      this.observerLocator = observerLocator;
      this.sourceExpression = sourceExpression;
      this.targetProperty = targetProperty;
      this.lookupFunctions = lookupFunctions;
      this.source = null;
      this.target = null;
      this.toBindingContext = toBindingContext;
    }

    updateTarget() {
      const value = this.sourceExpression.evaluate(this.source, this.lookupFunctions);
      this.target[this.targetProperty] = value;
    }

    call(context) {
      if (!this.isBound) {
        return;
      }

      if (context === _aureliaBinding.sourceContext) {
        this.updateTarget();
        return;
      }

      throw new Error(`Unexpected call context ${context}`);
    }

    bind(source) {
      if (this.isBound) {
        if (this.source === source) {
          return;
        }

        this.unbind();
      }

      this.isBound = true;
      this.source = source;
      this.target = this.toBindingContext ? source.bindingContext : source.overrideContext;

      if (this.sourceExpression.bind) {
        this.sourceExpression.bind(this, source, this.lookupFunctions);
      }

      (0, _aureliaBinding.enqueueBindingConnect)(this);
    }

    unbind() {
      if (!this.isBound) {
        return;
      }

      this.isBound = false;

      if (this.sourceExpression.unbind) {
        this.sourceExpression.unbind(this, this.source);
      }

      this.source = null;
      this.target = null;
      this.unobserve(true);
    }

    connect() {
      if (!this.isBound) {
        return;
      }

      this.updateTarget();
      this.sourceExpression.connect(this, this.source);
    }

  }) || _class3);
  _exports.LetBinding = LetBinding;
  let LetInterpolationBindingExpression = class LetInterpolationBindingExpression {
    constructor(observerLocator, targetProperty, parts, lookupFunctions, toBindingContext) {
      this.observerLocator = observerLocator;
      this.targetProperty = targetProperty;
      this.parts = parts;
      this.lookupFunctions = lookupFunctions;
      this.toBindingContext = toBindingContext;
    }

    createBinding() {
      return new LetInterpolationBinding(this.observerLocator, this.targetProperty, this.parts, this.lookupFunctions, this.toBindingContext);
    }

  };
  _exports.LetInterpolationBindingExpression = LetInterpolationBindingExpression;
  let LetInterpolationBinding = class LetInterpolationBinding {
    constructor(observerLocator, targetProperty, parts, lookupFunctions, toBindingContext) {
      this.observerLocator = observerLocator;
      this.parts = parts;
      this.targetProperty = targetProperty;
      this.lookupFunctions = lookupFunctions;
      this.toBindingContext = toBindingContext;
      this.target = null;
    }

    bind(source) {
      if (this.isBound) {
        if (this.source === source) {
          return;
        }

        this.unbind();
      }

      this.isBound = true;
      this.source = source;
      this.target = this.toBindingContext ? source.bindingContext : source.overrideContext;
      this.interpolationBinding = this.createInterpolationBinding();
      this.interpolationBinding.bind(source);
    }

    unbind() {
      if (!this.isBound) {
        return;
      }

      this.isBound = false;
      this.source = null;
      this.target = null;
      this.interpolationBinding.unbind();
      this.interpolationBinding = null;
    }

    createInterpolationBinding() {
      if (this.parts.length === 3) {
        return new ChildInterpolationBinding(this.target, this.observerLocator, this.parts[1], _aureliaBinding.bindingMode.oneWay, this.lookupFunctions, this.targetProperty, this.parts[0], this.parts[2]);
      }

      return new InterpolationBinding(this.observerLocator, this.parts, this.target, this.targetProperty, _aureliaBinding.bindingMode.oneWay, this.lookupFunctions);
    }

  };
  _exports.LetInterpolationBinding = LetInterpolationBinding;
  let SyntaxInterpreter = (_temp2 = _class4 = class SyntaxInterpreter {
    constructor(parser, observerLocator, eventManager, attributeMap) {
      this.parser = parser;
      this.observerLocator = observerLocator;
      this.eventManager = eventManager;
      this.attributeMap = attributeMap;
    }

    interpret(resources, element, info, existingInstruction, context) {
      if (info.command in this) {
        return this[info.command](resources, element, info, existingInstruction, context);
      }

      return this.handleUnknownCommand(resources, element, info, existingInstruction, context);
    }

    handleUnknownCommand(resources, element, info, existingInstruction, context) {
      LogManager.getLogger('templating-binding').warn('Unknown binding command.', info);
      return existingInstruction;
    }

    determineDefaultBindingMode(element, attrName, context) {
      let tagName = element.tagName.toLowerCase();

      if (tagName === 'input' && (attrName === 'value' || attrName === 'files') && element.type !== 'checkbox' && element.type !== 'radio' || tagName === 'input' && attrName === 'checked' && (element.type === 'checkbox' || element.type === 'radio') || (tagName === 'textarea' || tagName === 'select') && attrName === 'value' || (attrName === 'textcontent' || attrName === 'innerhtml') && element.contentEditable === 'true' || attrName === 'scrolltop' || attrName === 'scrollleft') {
        return _aureliaBinding.bindingMode.twoWay;
      }

      if (context && attrName in context.attributes && context.attributes[attrName] && context.attributes[attrName].defaultBindingMode >= _aureliaBinding.bindingMode.oneTime) {
        return context.attributes[attrName].defaultBindingMode;
      }

      return _aureliaBinding.bindingMode.oneWay;
    }

    bind(resources, element, info, existingInstruction, context) {
      let instruction = existingInstruction || _aureliaTemplating.BehaviorInstruction.attribute(info.attrName);

      instruction.attributes[info.attrName] = new _aureliaBinding.BindingExpression(this.observerLocator, this.attributeMap.map(element.tagName, info.attrName), this.parser.parse(info.attrValue), info.defaultBindingMode === undefined || info.defaultBindingMode === null ? this.determineDefaultBindingMode(element, info.attrName, context) : info.defaultBindingMode, resources.lookupFunctions);
      return instruction;
    }

    trigger(resources, element, info) {
      return new _aureliaBinding.ListenerExpression(this.eventManager, info.attrName, this.parser.parse(info.attrValue), _aureliaBinding.delegationStrategy.none, true, resources.lookupFunctions);
    }

    capture(resources, element, info) {
      return new _aureliaBinding.ListenerExpression(this.eventManager, info.attrName, this.parser.parse(info.attrValue), _aureliaBinding.delegationStrategy.capturing, true, resources.lookupFunctions);
    }

    delegate(resources, element, info) {
      return new _aureliaBinding.ListenerExpression(this.eventManager, info.attrName, this.parser.parse(info.attrValue), _aureliaBinding.delegationStrategy.bubbling, true, resources.lookupFunctions);
    }

    call(resources, element, info, existingInstruction) {
      let instruction = existingInstruction || _aureliaTemplating.BehaviorInstruction.attribute(info.attrName);

      instruction.attributes[info.attrName] = new _aureliaBinding.CallExpression(this.observerLocator, info.attrName, this.parser.parse(info.attrValue), resources.lookupFunctions);
      return instruction;
    }

    options(resources, element, info, existingInstruction, context) {
      let instruction = existingInstruction || _aureliaTemplating.BehaviorInstruction.attribute(info.attrName);

      let attrValue = info.attrValue;
      let language = this.language;
      let name = null;
      let target = '';
      let current;
      let i;
      let ii;
      let inString = false;
      let inEscape = false;
      let foundName = false;

      for (i = 0, ii = attrValue.length; i < ii; ++i) {
        current = attrValue[i];

        if (current === ';' && !inString) {
          if (!foundName) {
            name = this._getPrimaryPropertyName(resources, context);
          }

          info = language.inspectAttribute(resources, '?', name, target.trim());
          language.createAttributeInstruction(resources, element, info, instruction, context);

          if (!instruction.attributes[info.attrName]) {
            instruction.attributes[info.attrName] = info.attrValue;
          }

          target = '';
          name = null;
        } else if (current === ':' && name === null) {
          foundName = true;
          name = target.trim();
          target = '';
        } else if (current === '\\') {
          target += current;
          inEscape = true;
          continue;
        } else {
          target += current;

          if (name !== null && inEscape === false && current === '\'') {
            inString = !inString;
          }
        }

        inEscape = false;
      }

      if (!foundName) {
        name = this._getPrimaryPropertyName(resources, context);
      }

      if (name !== null) {
        info = language.inspectAttribute(resources, '?', name, target.trim());
        language.createAttributeInstruction(resources, element, info, instruction, context);

        if (!instruction.attributes[info.attrName]) {
          instruction.attributes[info.attrName] = info.attrValue;
        }
      }

      return instruction;
    }

    _getPrimaryPropertyName(resources, context) {
      let type = resources.getAttribute(context.attributeName);

      if (type && type.primaryProperty) {
        return type.primaryProperty.attribute;
      }

      return null;
    }

    'for'(resources, element, info, existingInstruction) {
      let parts;
      let keyValue;
      let instruction;
      let attrValue;
      let isDestructuring;
      attrValue = info.attrValue;
      isDestructuring = attrValue.match(/^ *[[].+[\]]/);
      parts = isDestructuring ? attrValue.split('of ') : attrValue.split(' of ');

      if (parts.length !== 2) {
        throw new Error('Incorrect syntax for "for". The form is: "$local of $items" or "[$key, $value] of $items".');
      }

      instruction = existingInstruction || _aureliaTemplating.BehaviorInstruction.attribute(info.attrName);

      if (isDestructuring) {
        keyValue = parts[0].replace(/[[\]]/g, '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim().split(' ');
        instruction.attributes.key = keyValue[0];
        instruction.attributes.value = keyValue[1];
      } else {
        instruction.attributes.local = parts[0];
      }

      instruction.attributes.items = new _aureliaBinding.BindingExpression(this.observerLocator, 'items', this.parser.parse(parts[1]), _aureliaBinding.bindingMode.oneWay, resources.lookupFunctions);
      return instruction;
    }

    'two-way'(resources, element, info, existingInstruction) {
      let instruction = existingInstruction || _aureliaTemplating.BehaviorInstruction.attribute(info.attrName);

      instruction.attributes[info.attrName] = new _aureliaBinding.BindingExpression(this.observerLocator, this.attributeMap.map(element.tagName, info.attrName), this.parser.parse(info.attrValue), _aureliaBinding.bindingMode.twoWay, resources.lookupFunctions);
      return instruction;
    }

    'to-view'(resources, element, info, existingInstruction) {
      let instruction = existingInstruction || _aureliaTemplating.BehaviorInstruction.attribute(info.attrName);

      instruction.attributes[info.attrName] = new _aureliaBinding.BindingExpression(this.observerLocator, this.attributeMap.map(element.tagName, info.attrName), this.parser.parse(info.attrValue), _aureliaBinding.bindingMode.toView, resources.lookupFunctions);
      return instruction;
    }

    'from-view'(resources, element, info, existingInstruction) {
      let instruction = existingInstruction || _aureliaTemplating.BehaviorInstruction.attribute(info.attrName);

      instruction.attributes[info.attrName] = new _aureliaBinding.BindingExpression(this.observerLocator, this.attributeMap.map(element.tagName, info.attrName), this.parser.parse(info.attrValue), _aureliaBinding.bindingMode.fromView, resources.lookupFunctions);
      return instruction;
    }

    'one-time'(resources, element, info, existingInstruction) {
      let instruction = existingInstruction || _aureliaTemplating.BehaviorInstruction.attribute(info.attrName);

      instruction.attributes[info.attrName] = new _aureliaBinding.BindingExpression(this.observerLocator, this.attributeMap.map(element.tagName, info.attrName), this.parser.parse(info.attrValue), _aureliaBinding.bindingMode.oneTime, resources.lookupFunctions);
      return instruction;
    }

  }, _class4.inject = [_aureliaBinding.Parser, _aureliaBinding.ObserverLocator, _aureliaBinding.EventManager, AttributeMap], _temp2);
  _exports.SyntaxInterpreter = SyntaxInterpreter;
  SyntaxInterpreter.prototype['one-way'] = SyntaxInterpreter.prototype['to-view'];
  let info = {};
  let TemplatingBindingLanguage = (_temp3 = _class5 = class TemplatingBindingLanguage extends _aureliaTemplating.BindingLanguage {
    constructor(parser, observerLocator, syntaxInterpreter, attributeMap) {
      super();
      this.parser = parser;
      this.observerLocator = observerLocator;
      this.syntaxInterpreter = syntaxInterpreter;
      this.emptyStringExpression = this.parser.parse('\'\'');
      syntaxInterpreter.language = this;
      this.attributeMap = attributeMap;
      this.toBindingContextAttr = 'to-binding-context';
    }

    inspectAttribute(resources, elementName, attrName, attrValue) {
      let parts = attrName.split('.');
      info.defaultBindingMode = null;

      if (parts.length === 2) {
        info.attrName = parts[0].trim();
        info.attrValue = attrValue;
        info.command = parts[1].trim();

        if (info.command === 'ref') {
          info.expression = new _aureliaBinding.NameExpression(this.parser.parse(attrValue), info.attrName, resources.lookupFunctions);
          info.command = null;
          info.attrName = 'ref';
        } else {
          info.expression = null;
        }
      } else if (attrName === 'ref') {
        info.attrName = attrName;
        info.attrValue = attrValue;
        info.command = null;
        info.expression = new _aureliaBinding.NameExpression(this.parser.parse(attrValue), 'element', resources.lookupFunctions);
      } else {
        info.attrName = attrName;
        info.attrValue = attrValue;
        info.command = null;
        const interpolationParts = this.parseInterpolation(resources, attrValue);

        if (interpolationParts === null) {
          info.expression = null;
        } else {
          info.expression = new InterpolationBindingExpression(this.observerLocator, this.attributeMap.map(elementName, attrName), interpolationParts, _aureliaBinding.bindingMode.oneWay, resources.lookupFunctions, attrName);
        }
      }

      return info;
    }

    createAttributeInstruction(resources, element, theInfo, existingInstruction, context) {
      let instruction;

      if (theInfo.expression) {
        if (theInfo.attrName === 'ref') {
          return theInfo.expression;
        }

        instruction = existingInstruction || _aureliaTemplating.BehaviorInstruction.attribute(theInfo.attrName);
        instruction.attributes[theInfo.attrName] = theInfo.expression;
      } else if (theInfo.command) {
        instruction = this.syntaxInterpreter.interpret(resources, element, theInfo, existingInstruction, context);
      }

      return instruction;
    }

    createLetExpressions(resources, letElement) {
      let expressions = [];
      let attributes = letElement.attributes;
      let attr;
      let parts;
      let attrName;
      let attrValue;
      let command;
      let toBindingContextAttr = this.toBindingContextAttr;
      let toBindingContext = letElement.hasAttribute(toBindingContextAttr);

      for (let i = 0, ii = attributes.length; ii > i; ++i) {
        attr = attributes[i];
        attrName = attr.name;
        attrValue = attr.nodeValue;
        parts = attrName.split('.');

        if (attrName === toBindingContextAttr) {
          continue;
        }

        if (parts.length === 2) {
          command = parts[1];

          if (command !== 'bind') {
            LogManager.getLogger('templating-binding-language').warn(`Detected invalid let command. Expected "${parts[0]}.bind", given "${attrName}"`);
            continue;
          }

          expressions.push(new LetExpression(this.observerLocator, (0, _aureliaBinding.camelCase)(parts[0]), this.parser.parse(attrValue), resources.lookupFunctions, toBindingContext));
        } else {
          attrName = (0, _aureliaBinding.camelCase)(attrName);
          parts = this.parseInterpolation(resources, attrValue);

          if (parts === null) {
            LogManager.getLogger('templating-binding-language').warn(`Detected string literal in let bindings. Did you mean "${attrName}.bind=${attrValue}" or "${attrName}=\${${attrValue}}" ?`);
          }

          if (parts) {
            expressions.push(new LetInterpolationBindingExpression(this.observerLocator, attrName, parts, resources.lookupFunctions, toBindingContext));
          } else {
            expressions.push(new LetExpression(this.observerLocator, attrName, new _aureliaBinding.LiteralString(attrValue), resources.lookupFunctions, toBindingContext));
          }
        }
      }

      return expressions;
    }

    inspectTextContent(resources, value) {
      const parts = this.parseInterpolation(resources, value);

      if (parts === null) {
        return null;
      }

      return new InterpolationBindingExpression(this.observerLocator, 'textContent', parts, _aureliaBinding.bindingMode.oneWay, resources.lookupFunctions, 'textContent');
    }

    parseInterpolation(resources, value) {
      let i = value.indexOf('${', 0);
      let ii = value.length;
      let char;
      let pos = 0;
      let open = 0;
      let quote = null;
      let interpolationStart;
      let parts;
      let partIndex = 0;

      while (i >= 0 && i < ii - 2) {
        open = 1;
        interpolationStart = i;
        i += 2;

        do {
          char = value[i];
          i++;

          if (char === "'" || char === '"') {
            if (quote === null) {
              quote = char;
            } else if (quote === char) {
              quote = null;
            }

            continue;
          }

          if (char === '\\') {
            i++;
            continue;
          }

          if (quote !== null) {
            continue;
          }

          if (char === '{') {
            open++;
          } else if (char === '}') {
            open--;
          }
        } while (open > 0 && i < ii);

        if (open === 0) {
          parts = parts || [];

          if (value[interpolationStart - 1] === '\\' && value[interpolationStart - 2] !== '\\') {
            parts[partIndex] = value.substring(pos, interpolationStart - 1) + value.substring(interpolationStart, i);
            partIndex++;
            parts[partIndex] = this.emptyStringExpression;
            partIndex++;
          } else {
            parts[partIndex] = value.substring(pos, interpolationStart);
            partIndex++;
            parts[partIndex] = this.parser.parse(value.substring(interpolationStart + 2, i - 1));
            partIndex++;
          }

          pos = i;
          i = value.indexOf('${', i);
        } else {
          break;
        }
      }

      if (partIndex === 0) {
        return null;
      }

      parts[partIndex] = value.substr(pos);
      return parts;
    }

  }, _class5.inject = [_aureliaBinding.Parser, _aureliaBinding.ObserverLocator, SyntaxInterpreter, AttributeMap], _temp3);
  _exports.TemplatingBindingLanguage = TemplatingBindingLanguage;

  function configure(config) {
    config.container.registerSingleton(_aureliaTemplating.BindingLanguage, TemplatingBindingLanguage);
    config.container.registerAlias(_aureliaTemplating.BindingLanguage, TemplatingBindingLanguage);
  }
});
define('aurelia-templating-resources/abstract-repeater',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  

  var AbstractRepeater = exports.AbstractRepeater = function () {
    function AbstractRepeater(options) {
      

      Object.assign(this, {
        local: 'items',
        viewsRequireLifecycle: true
      }, options);
    }

    AbstractRepeater.prototype.viewCount = function viewCount() {
      throw new Error('subclass must implement `viewCount`');
    };

    AbstractRepeater.prototype.views = function views() {
      throw new Error('subclass must implement `views`');
    };

    AbstractRepeater.prototype.view = function view(index) {
      throw new Error('subclass must implement `view`');
    };

    AbstractRepeater.prototype.matcher = function matcher() {
      throw new Error('subclass must implement `matcher`');
    };

    AbstractRepeater.prototype.addView = function addView(bindingContext, overrideContext) {
      throw new Error('subclass must implement `addView`');
    };

    AbstractRepeater.prototype.insertView = function insertView(index, bindingContext, overrideContext) {
      throw new Error('subclass must implement `insertView`');
    };

    AbstractRepeater.prototype.moveView = function moveView(sourceIndex, targetIndex) {
      throw new Error('subclass must implement `moveView`');
    };

    AbstractRepeater.prototype.removeAllViews = function removeAllViews(returnToCache, skipAnimation) {
      throw new Error('subclass must implement `removeAllViews`');
    };

    AbstractRepeater.prototype.removeViews = function removeViews(viewsToRemove, returnToCache, skipAnimation) {
      throw new Error('subclass must implement `removeView`');
    };

    AbstractRepeater.prototype.removeView = function removeView(index, returnToCache, skipAnimation) {
      throw new Error('subclass must implement `removeView`');
    };

    AbstractRepeater.prototype.updateBindings = function updateBindings(view) {
      throw new Error('subclass must implement `updateBindings`');
    };

    return AbstractRepeater;
  }();
});
define('aurelia-templating-resources/analyze-view-factory',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.viewsRequireLifecycle = viewsRequireLifecycle;
  var lifecycleOptionalBehaviors = exports.lifecycleOptionalBehaviors = ['focus', 'if', 'else', 'repeat', 'show', 'hide', 'with'];

  function behaviorRequiresLifecycle(instruction) {
    var t = instruction.type;
    var name = t.elementName !== null ? t.elementName : t.attributeName;
    return lifecycleOptionalBehaviors.indexOf(name) === -1 && (t.handlesAttached || t.handlesBind || t.handlesCreated || t.handlesDetached || t.handlesUnbind) || t.viewFactory && viewsRequireLifecycle(t.viewFactory) || instruction.viewFactory && viewsRequireLifecycle(instruction.viewFactory);
  }

  function targetRequiresLifecycle(instruction) {
    var behaviors = instruction.behaviorInstructions;
    if (behaviors) {
      var i = behaviors.length;
      while (i--) {
        if (behaviorRequiresLifecycle(behaviors[i])) {
          return true;
        }
      }
    }

    return instruction.viewFactory && viewsRequireLifecycle(instruction.viewFactory);
  }

  function viewsRequireLifecycle(viewFactory) {
    if ('_viewsRequireLifecycle' in viewFactory) {
      return viewFactory._viewsRequireLifecycle;
    }

    viewFactory._viewsRequireLifecycle = false;

    if (viewFactory.viewFactory) {
      viewFactory._viewsRequireLifecycle = viewsRequireLifecycle(viewFactory.viewFactory);
      return viewFactory._viewsRequireLifecycle;
    }

    if (viewFactory.template.querySelector('.au-animate')) {
      viewFactory._viewsRequireLifecycle = true;
      return true;
    }

    for (var id in viewFactory.instructions) {
      if (targetRequiresLifecycle(viewFactory.instructions[id])) {
        viewFactory._viewsRequireLifecycle = true;
        return true;
      }
    }

    viewFactory._viewsRequireLifecycle = false;
    return false;
  }
});
define('aurelia-templating-resources/array-repeat-strategy',['exports', './repeat-utilities', 'aurelia-binding'], function (exports, _repeatUtilities, _aureliaBinding) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.ArrayRepeatStrategy = undefined;

  

  var ArrayRepeatStrategy = exports.ArrayRepeatStrategy = function () {
    function ArrayRepeatStrategy() {
      
    }

    ArrayRepeatStrategy.prototype.getCollectionObserver = function getCollectionObserver(observerLocator, items) {
      return observerLocator.getArrayObserver(items);
    };

    ArrayRepeatStrategy.prototype.instanceChanged = function instanceChanged(repeat, items) {
      var _this = this;

      var itemsLength = items.length;

      if (!items || itemsLength === 0) {
        repeat.removeAllViews(true, !repeat.viewsRequireLifecycle);
        return;
      }

      var children = repeat.views();
      var viewsLength = children.length;

      if (viewsLength === 0) {
        this._standardProcessInstanceChanged(repeat, items);
        return;
      }

      if (repeat.viewsRequireLifecycle) {
        var childrenSnapshot = children.slice(0);
        var itemNameInBindingContext = repeat.local;
        var matcher = repeat.matcher();

        var itemsPreviouslyInViews = [];
        var viewsToRemove = [];

        for (var index = 0; index < viewsLength; index++) {
          var view = childrenSnapshot[index];
          var oldItem = view.bindingContext[itemNameInBindingContext];

          if ((0, _repeatUtilities.indexOf)(items, oldItem, matcher) === -1) {
            viewsToRemove.push(view);
          } else {
            itemsPreviouslyInViews.push(oldItem);
          }
        }

        var updateViews = void 0;
        var removePromise = void 0;

        if (itemsPreviouslyInViews.length > 0) {
          removePromise = repeat.removeViews(viewsToRemove, true, !repeat.viewsRequireLifecycle);
          updateViews = function updateViews() {
            for (var _index = 0; _index < itemsLength; _index++) {
              var item = items[_index];
              var indexOfView = (0, _repeatUtilities.indexOf)(itemsPreviouslyInViews, item, matcher, _index);
              var _view = void 0;

              if (indexOfView === -1) {
                var overrideContext = (0, _repeatUtilities.createFullOverrideContext)(repeat, items[_index], _index, itemsLength);
                repeat.insertView(_index, overrideContext.bindingContext, overrideContext);

                itemsPreviouslyInViews.splice(_index, 0, undefined);
              } else if (indexOfView === _index) {
                _view = children[indexOfView];
                itemsPreviouslyInViews[indexOfView] = undefined;
              } else {
                _view = children[indexOfView];
                repeat.moveView(indexOfView, _index);
                itemsPreviouslyInViews.splice(indexOfView, 1);
                itemsPreviouslyInViews.splice(_index, 0, undefined);
              }

              if (_view) {
                (0, _repeatUtilities.updateOverrideContext)(_view.overrideContext, _index, itemsLength);
              }
            }

            _this._inPlaceProcessItems(repeat, items);
          };
        } else {
          removePromise = repeat.removeAllViews(true, !repeat.viewsRequireLifecycle);
          updateViews = function updateViews() {
            return _this._standardProcessInstanceChanged(repeat, items);
          };
        }

        if (removePromise instanceof Promise) {
          removePromise.then(updateViews);
        } else {
          updateViews();
        }
      } else {
        this._inPlaceProcessItems(repeat, items);
      }
    };

    ArrayRepeatStrategy.prototype._standardProcessInstanceChanged = function _standardProcessInstanceChanged(repeat, items) {
      for (var i = 0, ii = items.length; i < ii; i++) {
        var overrideContext = (0, _repeatUtilities.createFullOverrideContext)(repeat, items[i], i, ii);
        repeat.addView(overrideContext.bindingContext, overrideContext);
      }
    };

    ArrayRepeatStrategy.prototype._inPlaceProcessItems = function _inPlaceProcessItems(repeat, items) {
      var itemsLength = items.length;
      var viewsLength = repeat.viewCount();

      while (viewsLength > itemsLength) {
        viewsLength--;
        repeat.removeView(viewsLength, true, !repeat.viewsRequireLifecycle);
      }

      var local = repeat.local;

      for (var i = 0; i < viewsLength; i++) {
        var view = repeat.view(i);
        var last = i === itemsLength - 1;
        var middle = i !== 0 && !last;

        if (view.bindingContext[local] === items[i] && view.overrideContext.$middle === middle && view.overrideContext.$last === last) {
          continue;
        }

        view.bindingContext[local] = items[i];
        view.overrideContext.$middle = middle;
        view.overrideContext.$last = last;
        repeat.updateBindings(view);
      }

      for (var _i = viewsLength; _i < itemsLength; _i++) {
        var overrideContext = (0, _repeatUtilities.createFullOverrideContext)(repeat, items[_i], _i, itemsLength);
        repeat.addView(overrideContext.bindingContext, overrideContext);
      }
    };

    ArrayRepeatStrategy.prototype.instanceMutated = function instanceMutated(repeat, array, splices) {
      var _this2 = this;

      if (repeat.__queuedSplices) {
        for (var i = 0, ii = splices.length; i < ii; ++i) {
          var _splices$i = splices[i],
              index = _splices$i.index,
              removed = _splices$i.removed,
              addedCount = _splices$i.addedCount;

          (0, _aureliaBinding.mergeSplice)(repeat.__queuedSplices, index, removed, addedCount);
        }

        repeat.__array = array.slice(0);
        return;
      }

      var maybePromise = this._runSplices(repeat, array.slice(0), splices);
      if (maybePromise instanceof Promise) {
        var queuedSplices = repeat.__queuedSplices = [];

        var runQueuedSplices = function runQueuedSplices() {
          if (!queuedSplices.length) {
            repeat.__queuedSplices = undefined;
            repeat.__array = undefined;
            return;
          }

          var nextPromise = _this2._runSplices(repeat, repeat.__array, queuedSplices) || Promise.resolve();
          queuedSplices = repeat.__queuedSplices = [];
          nextPromise.then(runQueuedSplices);
        };

        maybePromise.then(runQueuedSplices);
      }
    };

    ArrayRepeatStrategy.prototype._runSplices = function _runSplices(repeat, array, splices) {
      var _this3 = this;

      var removeDelta = 0;
      var rmPromises = [];

      for (var i = 0, ii = splices.length; i < ii; ++i) {
        var splice = splices[i];
        var removed = splice.removed;

        for (var j = 0, jj = removed.length; j < jj; ++j) {
          var viewOrPromise = repeat.removeView(splice.index + removeDelta + rmPromises.length, true);
          if (viewOrPromise instanceof Promise) {
            rmPromises.push(viewOrPromise);
          }
        }
        removeDelta -= splice.addedCount;
      }

      if (rmPromises.length > 0) {
        return Promise.all(rmPromises).then(function () {
          var spliceIndexLow = _this3._handleAddedSplices(repeat, array, splices);
          (0, _repeatUtilities.updateOverrideContexts)(repeat.views(), spliceIndexLow);
        });
      }

      var spliceIndexLow = this._handleAddedSplices(repeat, array, splices);
      (0, _repeatUtilities.updateOverrideContexts)(repeat.views(), spliceIndexLow);

      return undefined;
    };

    ArrayRepeatStrategy.prototype._handleAddedSplices = function _handleAddedSplices(repeat, array, splices) {
      var spliceIndex = void 0;
      var spliceIndexLow = void 0;
      var arrayLength = array.length;
      for (var i = 0, ii = splices.length; i < ii; ++i) {
        var splice = splices[i];
        var addIndex = spliceIndex = splice.index;
        var end = splice.index + splice.addedCount;

        if (typeof spliceIndexLow === 'undefined' || spliceIndexLow === null || spliceIndexLow > splice.index) {
          spliceIndexLow = spliceIndex;
        }

        for (; addIndex < end; ++addIndex) {
          var overrideContext = (0, _repeatUtilities.createFullOverrideContext)(repeat, array[addIndex], addIndex, arrayLength);
          repeat.insertView(addIndex, overrideContext.bindingContext, overrideContext);
        }
      }

      return spliceIndexLow;
    };

    return ArrayRepeatStrategy;
  }();
});
define('aurelia-templating-resources/attr-binding-behavior',['exports', 'aurelia-binding'], function (exports, _aureliaBinding) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.AttrBindingBehavior = undefined;

  

  var _dec, _class;

  var AttrBindingBehavior = exports.AttrBindingBehavior = (_dec = (0, _aureliaBinding.bindingBehavior)('attr'), _dec(_class = function () {
    function AttrBindingBehavior() {
      
    }

    AttrBindingBehavior.prototype.bind = function bind(binding, source) {
      binding.targetObserver = new _aureliaBinding.DataAttributeObserver(binding.target, binding.targetProperty);
    };

    AttrBindingBehavior.prototype.unbind = function unbind(binding, source) {};

    return AttrBindingBehavior;
  }()) || _class);
});
define('aurelia-templating-resources/aurelia-hide-style',['exports', 'aurelia-pal'], function (exports, _aureliaPal) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.aureliaHideClassName = undefined;
  exports.injectAureliaHideStyleAtHead = injectAureliaHideStyleAtHead;
  exports.injectAureliaHideStyleAtBoundary = injectAureliaHideStyleAtBoundary;
  var aureliaHideClassName = exports.aureliaHideClassName = 'aurelia-hide';

  var aureliaHideClass = '.' + aureliaHideClassName + ' { display:none !important; }';

  function injectAureliaHideStyleAtHead() {
    _aureliaPal.DOM.injectStyles(aureliaHideClass);
  }

  function injectAureliaHideStyleAtBoundary(domBoundary) {
    if (_aureliaPal.FEATURE.shadowDOM && domBoundary && !domBoundary.hasAureliaHideStyle) {
      domBoundary.hasAureliaHideStyle = true;
      _aureliaPal.DOM.injectStyles(aureliaHideClass, domBoundary);
    }
  }
});
define('aurelia-templating-resources/aurelia-templating-resources',['exports', './compose', './if', './else', './with', './repeat', './show', './hide', './sanitize-html', './replaceable', './focus', 'aurelia-templating', './css-resource', './html-sanitizer', './attr-binding-behavior', './binding-mode-behaviors', './throttle-binding-behavior', './debounce-binding-behavior', './self-binding-behavior', './signal-binding-behavior', './binding-signaler', './update-trigger-binding-behavior', './abstract-repeater', './repeat-strategy-locator', './html-resource-plugin', './null-repeat-strategy', './array-repeat-strategy', './map-repeat-strategy', './set-repeat-strategy', './number-repeat-strategy', './repeat-utilities', './analyze-view-factory', './aurelia-hide-style'], function (exports, _compose, _if, _else, _with, _repeat, _show, _hide, _sanitizeHtml, _replaceable, _focus, _aureliaTemplating, _cssResource, _htmlSanitizer, _attrBindingBehavior, _bindingModeBehaviors, _throttleBindingBehavior, _debounceBindingBehavior, _selfBindingBehavior, _signalBindingBehavior, _bindingSignaler, _updateTriggerBindingBehavior, _abstractRepeater, _repeatStrategyLocator, _htmlResourcePlugin, _nullRepeatStrategy, _arrayRepeatStrategy, _mapRepeatStrategy, _setRepeatStrategy, _numberRepeatStrategy, _repeatUtilities, _analyzeViewFactory, _aureliaHideStyle) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.viewsRequireLifecycle = exports.unwrapExpression = exports.updateOneTimeBinding = exports.isOneTime = exports.getItemsSourceExpression = exports.updateOverrideContext = exports.createFullOverrideContext = exports.NumberRepeatStrategy = exports.SetRepeatStrategy = exports.MapRepeatStrategy = exports.ArrayRepeatStrategy = exports.NullRepeatStrategy = exports.RepeatStrategyLocator = exports.AbstractRepeater = exports.UpdateTriggerBindingBehavior = exports.BindingSignaler = exports.SignalBindingBehavior = exports.SelfBindingBehavior = exports.DebounceBindingBehavior = exports.ThrottleBindingBehavior = exports.TwoWayBindingBehavior = exports.FromViewBindingBehavior = exports.ToViewBindingBehavior = exports.OneWayBindingBehavior = exports.OneTimeBindingBehavior = exports.AttrBindingBehavior = exports.configure = exports.Focus = exports.Replaceable = exports.SanitizeHTMLValueConverter = exports.HTMLSanitizer = exports.Hide = exports.Show = exports.Repeat = exports.With = exports.Else = exports.If = exports.Compose = undefined;


  function configure(config) {
    (0, _aureliaHideStyle.injectAureliaHideStyleAtHead)();

    config.globalResources(_compose.Compose, _if.If, _else.Else, _with.With, _repeat.Repeat, _show.Show, _hide.Hide, _replaceable.Replaceable, _focus.Focus, _sanitizeHtml.SanitizeHTMLValueConverter, _bindingModeBehaviors.OneTimeBindingBehavior, _bindingModeBehaviors.OneWayBindingBehavior, _bindingModeBehaviors.ToViewBindingBehavior, _bindingModeBehaviors.FromViewBindingBehavior, _bindingModeBehaviors.TwoWayBindingBehavior, _throttleBindingBehavior.ThrottleBindingBehavior, _debounceBindingBehavior.DebounceBindingBehavior, _selfBindingBehavior.SelfBindingBehavior, _signalBindingBehavior.SignalBindingBehavior, _updateTriggerBindingBehavior.UpdateTriggerBindingBehavior, _attrBindingBehavior.AttrBindingBehavior);

    (0, _htmlResourcePlugin.configure)(config);

    var viewEngine = config.container.get(_aureliaTemplating.ViewEngine);
    var styleResourcePlugin = {
      fetch: function fetch(address) {
        var _ref;

        return _ref = {}, _ref[address] = (0, _cssResource._createCSSResource)(address), _ref;
      }
    };
    ['.css', '.less', '.sass', '.scss', '.styl'].forEach(function (ext) {
      return viewEngine.addResourcePlugin(ext, styleResourcePlugin);
    });
  }

  exports.Compose = _compose.Compose;
  exports.If = _if.If;
  exports.Else = _else.Else;
  exports.With = _with.With;
  exports.Repeat = _repeat.Repeat;
  exports.Show = _show.Show;
  exports.Hide = _hide.Hide;
  exports.HTMLSanitizer = _htmlSanitizer.HTMLSanitizer;
  exports.SanitizeHTMLValueConverter = _sanitizeHtml.SanitizeHTMLValueConverter;
  exports.Replaceable = _replaceable.Replaceable;
  exports.Focus = _focus.Focus;
  exports.configure = configure;
  exports.AttrBindingBehavior = _attrBindingBehavior.AttrBindingBehavior;
  exports.OneTimeBindingBehavior = _bindingModeBehaviors.OneTimeBindingBehavior;
  exports.OneWayBindingBehavior = _bindingModeBehaviors.OneWayBindingBehavior;
  exports.ToViewBindingBehavior = _bindingModeBehaviors.ToViewBindingBehavior;
  exports.FromViewBindingBehavior = _bindingModeBehaviors.FromViewBindingBehavior;
  exports.TwoWayBindingBehavior = _bindingModeBehaviors.TwoWayBindingBehavior;
  exports.ThrottleBindingBehavior = _throttleBindingBehavior.ThrottleBindingBehavior;
  exports.DebounceBindingBehavior = _debounceBindingBehavior.DebounceBindingBehavior;
  exports.SelfBindingBehavior = _selfBindingBehavior.SelfBindingBehavior;
  exports.SignalBindingBehavior = _signalBindingBehavior.SignalBindingBehavior;
  exports.BindingSignaler = _bindingSignaler.BindingSignaler;
  exports.UpdateTriggerBindingBehavior = _updateTriggerBindingBehavior.UpdateTriggerBindingBehavior;
  exports.AbstractRepeater = _abstractRepeater.AbstractRepeater;
  exports.RepeatStrategyLocator = _repeatStrategyLocator.RepeatStrategyLocator;
  exports.NullRepeatStrategy = _nullRepeatStrategy.NullRepeatStrategy;
  exports.ArrayRepeatStrategy = _arrayRepeatStrategy.ArrayRepeatStrategy;
  exports.MapRepeatStrategy = _mapRepeatStrategy.MapRepeatStrategy;
  exports.SetRepeatStrategy = _setRepeatStrategy.SetRepeatStrategy;
  exports.NumberRepeatStrategy = _numberRepeatStrategy.NumberRepeatStrategy;
  exports.createFullOverrideContext = _repeatUtilities.createFullOverrideContext;
  exports.updateOverrideContext = _repeatUtilities.updateOverrideContext;
  exports.getItemsSourceExpression = _repeatUtilities.getItemsSourceExpression;
  exports.isOneTime = _repeatUtilities.isOneTime;
  exports.updateOneTimeBinding = _repeatUtilities.updateOneTimeBinding;
  exports.unwrapExpression = _repeatUtilities.unwrapExpression;
  exports.viewsRequireLifecycle = _analyzeViewFactory.viewsRequireLifecycle;
});
define('aurelia-templating-resources/binding-mode-behaviors',['exports', 'aurelia-binding', 'aurelia-metadata'], function (exports, _aureliaBinding, _aureliaMetadata) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.TwoWayBindingBehavior = exports.FromViewBindingBehavior = exports.ToViewBindingBehavior = exports.OneWayBindingBehavior = exports.OneTimeBindingBehavior = undefined;

  

  var _dec, _dec2, _class, _dec3, _dec4, _class2, _dec5, _dec6, _class3, _dec7, _dec8, _class4, _dec9, _dec10, _class5;

  var modeBindingBehavior = {
    bind: function bind(binding, source, lookupFunctions) {
      binding.originalMode = binding.mode;
      binding.mode = this.mode;
    },
    unbind: function unbind(binding, source) {
      binding.mode = binding.originalMode;
      binding.originalMode = null;
    }
  };

  var OneTimeBindingBehavior = exports.OneTimeBindingBehavior = (_dec = (0, _aureliaMetadata.mixin)(modeBindingBehavior), _dec2 = (0, _aureliaBinding.bindingBehavior)('oneTime'), _dec(_class = _dec2(_class = function OneTimeBindingBehavior() {
    

    this.mode = _aureliaBinding.bindingMode.oneTime;
  }) || _class) || _class);
  var OneWayBindingBehavior = exports.OneWayBindingBehavior = (_dec3 = (0, _aureliaMetadata.mixin)(modeBindingBehavior), _dec4 = (0, _aureliaBinding.bindingBehavior)('oneWay'), _dec3(_class2 = _dec4(_class2 = function OneWayBindingBehavior() {
    

    this.mode = _aureliaBinding.bindingMode.toView;
  }) || _class2) || _class2);
  var ToViewBindingBehavior = exports.ToViewBindingBehavior = (_dec5 = (0, _aureliaMetadata.mixin)(modeBindingBehavior), _dec6 = (0, _aureliaBinding.bindingBehavior)('toView'), _dec5(_class3 = _dec6(_class3 = function ToViewBindingBehavior() {
    

    this.mode = _aureliaBinding.bindingMode.toView;
  }) || _class3) || _class3);
  var FromViewBindingBehavior = exports.FromViewBindingBehavior = (_dec7 = (0, _aureliaMetadata.mixin)(modeBindingBehavior), _dec8 = (0, _aureliaBinding.bindingBehavior)('fromView'), _dec7(_class4 = _dec8(_class4 = function FromViewBindingBehavior() {
    

    this.mode = _aureliaBinding.bindingMode.fromView;
  }) || _class4) || _class4);
  var TwoWayBindingBehavior = exports.TwoWayBindingBehavior = (_dec9 = (0, _aureliaMetadata.mixin)(modeBindingBehavior), _dec10 = (0, _aureliaBinding.bindingBehavior)('twoWay'), _dec9(_class5 = _dec10(_class5 = function TwoWayBindingBehavior() {
    

    this.mode = _aureliaBinding.bindingMode.twoWay;
  }) || _class5) || _class5);
});
define('aurelia-templating-resources/binding-signaler',['exports', 'aurelia-binding'], function (exports, _aureliaBinding) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.BindingSignaler = undefined;

  

  var BindingSignaler = exports.BindingSignaler = function () {
    function BindingSignaler() {
      

      this.signals = {};
    }

    BindingSignaler.prototype.signal = function signal(name) {
      var bindings = this.signals[name];
      if (!bindings) {
        return;
      }
      var i = bindings.length;
      while (i--) {
        bindings[i].call(_aureliaBinding.sourceContext);
      }
    };

    return BindingSignaler;
  }();
});
define('aurelia-templating-resources/compose',['exports', 'aurelia-dependency-injection', 'aurelia-task-queue', 'aurelia-templating', 'aurelia-pal'], function (exports, _aureliaDependencyInjection, _aureliaTaskQueue, _aureliaTemplating, _aureliaPal) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.Compose = undefined;

  function _initDefineProp(target, property, descriptor, context) {
    if (!descriptor) return;
    Object.defineProperty(target, property, {
      enumerable: descriptor.enumerable,
      configurable: descriptor.configurable,
      writable: descriptor.writable,
      value: descriptor.initializer ? descriptor.initializer.call(context) : void 0
    });
  }

  

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
    var desc = {};
    Object['ke' + 'ys'](descriptor).forEach(function (key) {
      desc[key] = descriptor[key];
    });
    desc.enumerable = !!desc.enumerable;
    desc.configurable = !!desc.configurable;

    if ('value' in desc || desc.initializer) {
      desc.writable = true;
    }

    desc = decorators.slice().reverse().reduce(function (desc, decorator) {
      return decorator(target, property, desc) || desc;
    }, desc);

    if (context && desc.initializer !== void 0) {
      desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
      desc.initializer = undefined;
    }

    if (desc.initializer === void 0) {
      Object['define' + 'Property'](target, property, desc);
      desc = null;
    }

    return desc;
  }

  function _initializerWarningHelper(descriptor, context) {
    throw new Error('Decorating class property failed. Please ensure that transform-class-properties is enabled.');
  }

  var _dec, _class, _desc, _value, _class2, _descriptor, _descriptor2, _descriptor3, _descriptor4;

  var Compose = exports.Compose = (_dec = (0, _aureliaTemplating.customElement)('compose'), _dec(_class = (0, _aureliaTemplating.noView)(_class = (_class2 = function () {
    Compose.inject = function inject() {
      return [_aureliaPal.DOM.Element, _aureliaDependencyInjection.Container, _aureliaTemplating.CompositionEngine, _aureliaTemplating.ViewSlot, _aureliaTemplating.ViewResources, _aureliaTaskQueue.TaskQueue];
    };

    function Compose(element, container, compositionEngine, viewSlot, viewResources, taskQueue) {
      

      _initDefineProp(this, 'model', _descriptor, this);

      _initDefineProp(this, 'view', _descriptor2, this);

      _initDefineProp(this, 'viewModel', _descriptor3, this);

      _initDefineProp(this, 'swapOrder', _descriptor4, this);

      this.element = element;
      this.container = container;
      this.compositionEngine = compositionEngine;
      this.viewSlot = viewSlot;
      this.viewResources = viewResources;
      this.taskQueue = taskQueue;
      this.currentController = null;
      this.currentViewModel = null;
      this.changes = Object.create(null);
    }

    Compose.prototype.created = function created(owningView) {
      this.owningView = owningView;
    };

    Compose.prototype.bind = function bind(bindingContext, overrideContext) {
      this.bindingContext = bindingContext;
      this.overrideContext = overrideContext;
      this.changes.view = this.view;
      this.changes.viewModel = this.viewModel;
      this.changes.model = this.model;
      if (!this.pendingTask) {
        processChanges(this);
      }
    };

    Compose.prototype.unbind = function unbind() {
      this.changes = Object.create(null);
      this.bindingContext = null;
      this.overrideContext = null;
      var returnToCache = true;
      var skipAnimation = true;
      this.viewSlot.removeAll(returnToCache, skipAnimation);
    };

    Compose.prototype.modelChanged = function modelChanged(newValue, oldValue) {
      this.changes.model = newValue;
      requestUpdate(this);
    };

    Compose.prototype.viewChanged = function viewChanged(newValue, oldValue) {
      this.changes.view = newValue;
      requestUpdate(this);
    };

    Compose.prototype.viewModelChanged = function viewModelChanged(newValue, oldValue) {
      this.changes.viewModel = newValue;
      requestUpdate(this);
    };

    return Compose;
  }(), (_descriptor = _applyDecoratedDescriptor(_class2.prototype, 'model', [_aureliaTemplating.bindable], {
    enumerable: true,
    initializer: null
  }), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, 'view', [_aureliaTemplating.bindable], {
    enumerable: true,
    initializer: null
  }), _descriptor3 = _applyDecoratedDescriptor(_class2.prototype, 'viewModel', [_aureliaTemplating.bindable], {
    enumerable: true,
    initializer: null
  }), _descriptor4 = _applyDecoratedDescriptor(_class2.prototype, 'swapOrder', [_aureliaTemplating.bindable], {
    enumerable: true,
    initializer: null
  })), _class2)) || _class) || _class);


  function isEmpty(obj) {
    for (var key in obj) {
      return false;
    }
    return true;
  }

  function tryActivateViewModel(vm, model) {
    if (vm && typeof vm.activate === 'function') {
      return Promise.resolve(vm.activate(model));
    }
  }

  function createInstruction(composer, instruction) {
    return Object.assign(instruction, {
      bindingContext: composer.bindingContext,
      overrideContext: composer.overrideContext,
      owningView: composer.owningView,
      container: composer.container,
      viewSlot: composer.viewSlot,
      viewResources: composer.viewResources,
      currentController: composer.currentController,
      host: composer.element,
      swapOrder: composer.swapOrder
    });
  }

  function processChanges(composer) {
    var changes = composer.changes;
    composer.changes = Object.create(null);

    if (!('view' in changes) && !('viewModel' in changes) && 'model' in changes) {
      composer.pendingTask = tryActivateViewModel(composer.currentViewModel, changes.model);
      if (!composer.pendingTask) {
        return;
      }
    } else {
      var instruction = {
        view: composer.view,
        viewModel: composer.currentViewModel || composer.viewModel,
        model: composer.model
      };

      instruction = Object.assign(instruction, changes);

      instruction = createInstruction(composer, instruction);
      composer.pendingTask = composer.compositionEngine.compose(instruction).then(function (controller) {
        composer.currentController = controller;
        composer.currentViewModel = controller ? controller.viewModel : null;
      });
    }

    composer.pendingTask = composer.pendingTask.then(function () {
      completeCompositionTask(composer);
    }, function (reason) {
      completeCompositionTask(composer);
      throw reason;
    });
  }

  function completeCompositionTask(composer) {
    composer.pendingTask = null;
    if (!isEmpty(composer.changes)) {
      processChanges(composer);
    }
  }

  function requestUpdate(composer) {
    if (composer.pendingTask || composer.updateRequested) {
      return;
    }
    composer.updateRequested = true;
    composer.taskQueue.queueMicroTask(function () {
      composer.updateRequested = false;
      processChanges(composer);
    });
  }
});
define('aurelia-templating-resources/css-resource',['exports', 'aurelia-templating', 'aurelia-loader', 'aurelia-dependency-injection', 'aurelia-path', 'aurelia-pal'], function (exports, _aureliaTemplating, _aureliaLoader, _aureliaDependencyInjection, _aureliaPath, _aureliaPal) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports._createCSSResource = _createCSSResource;

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  

  var cssUrlMatcher = /url\((?!['"]data)([^)]+)\)/gi;

  function fixupCSSUrls(address, css) {
    if (typeof css !== 'string') {
      throw new Error('Failed loading required CSS file: ' + address);
    }
    return css.replace(cssUrlMatcher, function (match, p1) {
      var quote = p1.charAt(0);
      if (quote === '\'' || quote === '"') {
        p1 = p1.substr(1, p1.length - 2);
      }
      return 'url(\'' + (0, _aureliaPath.relativeToFile)(p1, address) + '\')';
    });
  }

  var CSSResource = function () {
    function CSSResource(address) {
      

      this.address = address;
      this._scoped = null;
      this._global = false;
      this._alreadyGloballyInjected = false;
    }

    CSSResource.prototype.initialize = function initialize(container, target) {
      this._scoped = new target(this);
    };

    CSSResource.prototype.register = function register(registry, name) {
      if (name === 'scoped') {
        registry.registerViewEngineHooks(this._scoped);
      } else {
        this._global = true;
      }
    };

    CSSResource.prototype.load = function load(container) {
      var _this = this;

      return container.get(_aureliaLoader.Loader).loadText(this.address).catch(function (err) {
        return null;
      }).then(function (text) {
        text = fixupCSSUrls(_this.address, text);
        _this._scoped.css = text;
        if (_this._global) {
          _this._alreadyGloballyInjected = true;
          _aureliaPal.DOM.injectStyles(text);
        }
      });
    };

    return CSSResource;
  }();

  var CSSViewEngineHooks = function () {
    function CSSViewEngineHooks(owner) {
      

      this.owner = owner;
      this.css = null;
    }

    CSSViewEngineHooks.prototype.beforeCompile = function beforeCompile(content, resources, instruction) {
      if (instruction.targetShadowDOM) {
        _aureliaPal.DOM.injectStyles(this.css, content, true);
      } else if (_aureliaPal.FEATURE.scopedCSS) {
        var styleNode = _aureliaPal.DOM.injectStyles(this.css, content, true);
        styleNode.setAttribute('scoped', 'scoped');
      } else if (this._global && !this.owner._alreadyGloballyInjected) {
        _aureliaPal.DOM.injectStyles(this.css);
        this.owner._alreadyGloballyInjected = true;
      }
    };

    return CSSViewEngineHooks;
  }();

  function _createCSSResource(address) {
    var _dec, _class;

    var ViewCSS = (_dec = (0, _aureliaTemplating.resource)(new CSSResource(address)), _dec(_class = function (_CSSViewEngineHooks) {
      _inherits(ViewCSS, _CSSViewEngineHooks);

      function ViewCSS() {
        

        return _possibleConstructorReturn(this, _CSSViewEngineHooks.apply(this, arguments));
      }

      return ViewCSS;
    }(CSSViewEngineHooks)) || _class);

    return ViewCSS;
  }
});
define('aurelia-templating-resources/debounce-binding-behavior',['exports', 'aurelia-binding'], function (exports, _aureliaBinding) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.DebounceBindingBehavior = undefined;

  

  var _dec, _class;

  var unset = {};

  function debounceCallSource(event) {
    var _this = this;

    var state = this.debounceState;
    clearTimeout(state.timeoutId);
    state.timeoutId = setTimeout(function () {
      return _this.debouncedMethod(event);
    }, state.delay);
  }

  function debounceCall(context, newValue, oldValue) {
    var _this2 = this;

    var state = this.debounceState;
    clearTimeout(state.timeoutId);
    if (context !== state.callContextToDebounce) {
      state.oldValue = unset;
      this.debouncedMethod(context, newValue, oldValue);
      return;
    }
    if (state.oldValue === unset) {
      state.oldValue = oldValue;
    }
    state.timeoutId = setTimeout(function () {
      var _oldValue = state.oldValue;
      state.oldValue = unset;
      _this2.debouncedMethod(context, newValue, _oldValue);
    }, state.delay);
  }

  var DebounceBindingBehavior = exports.DebounceBindingBehavior = (_dec = (0, _aureliaBinding.bindingBehavior)('debounce'), _dec(_class = function () {
    function DebounceBindingBehavior() {
      
    }

    DebounceBindingBehavior.prototype.bind = function bind(binding, source) {
      var delay = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 200;

      var isCallSource = binding.callSource !== undefined;
      var methodToDebounce = isCallSource ? 'callSource' : 'call';
      var debouncer = isCallSource ? debounceCallSource : debounceCall;
      var mode = binding.mode;
      var callContextToDebounce = mode === _aureliaBinding.bindingMode.twoWay || mode === _aureliaBinding.bindingMode.fromView ? _aureliaBinding.targetContext : _aureliaBinding.sourceContext;

      binding.debouncedMethod = binding[methodToDebounce];
      binding.debouncedMethod.originalName = methodToDebounce;

      binding[methodToDebounce] = debouncer;

      binding.debounceState = {
        callContextToDebounce: callContextToDebounce,
        delay: delay,
        timeoutId: 0,
        oldValue: unset
      };
    };

    DebounceBindingBehavior.prototype.unbind = function unbind(binding, source) {
      var methodToRestore = binding.debouncedMethod.originalName;
      binding[methodToRestore] = binding.debouncedMethod;
      binding.debouncedMethod = null;
      clearTimeout(binding.debounceState.timeoutId);
      binding.debounceState = null;
    };

    return DebounceBindingBehavior;
  }()) || _class);
});
define('aurelia-templating-resources/dynamic-element',['exports', 'aurelia-templating'], function (exports, _aureliaTemplating) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports._createDynamicElement = _createDynamicElement;

  

  function _createDynamicElement(name, viewUrl, bindableNames) {
    var _dec, _dec2, _class;

    var DynamicElement = (_dec = (0, _aureliaTemplating.customElement)(name), _dec2 = (0, _aureliaTemplating.useView)(viewUrl), _dec(_class = _dec2(_class = function () {
      function DynamicElement() {
        
      }

      DynamicElement.prototype.bind = function bind(bindingContext) {
        this.$parent = bindingContext;
      };

      return DynamicElement;
    }()) || _class) || _class);

    for (var i = 0, ii = bindableNames.length; i < ii; ++i) {
      (0, _aureliaTemplating.bindable)(bindableNames[i])(DynamicElement);
    }
    return DynamicElement;
  }
});
define('aurelia-templating-resources/else',['exports', 'aurelia-templating', 'aurelia-dependency-injection', './if-core'], function (exports, _aureliaTemplating, _aureliaDependencyInjection, _ifCore) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.Else = undefined;

  

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  var _dec, _dec2, _class;

  var Else = exports.Else = (_dec = (0, _aureliaTemplating.customAttribute)('else'), _dec2 = (0, _aureliaDependencyInjection.inject)(_aureliaTemplating.BoundViewFactory, _aureliaTemplating.ViewSlot), _dec(_class = (0, _aureliaTemplating.templateController)(_class = _dec2(_class = function (_IfCore) {
    _inherits(Else, _IfCore);

    function Else(viewFactory, viewSlot) {
      

      var _this = _possibleConstructorReturn(this, _IfCore.call(this, viewFactory, viewSlot));

      _this._registerInIf();
      return _this;
    }

    Else.prototype.bind = function bind(bindingContext, overrideContext) {
      _IfCore.prototype.bind.call(this, bindingContext, overrideContext);

      if (this.ifVm.condition) {
        this._hide();
      } else {
        this._show();
      }
    };

    Else.prototype._registerInIf = function _registerInIf() {
      var previous = this.viewSlot.anchor.previousSibling;
      while (previous && !previous.au) {
        previous = previous.previousSibling;
      }
      if (!previous || !previous.au.if) {
        throw new Error("Can't find matching If for Else custom attribute.");
      }
      this.ifVm = previous.au.if.viewModel;
      this.ifVm.elseVm = this;
    };

    return Else;
  }(_ifCore.IfCore)) || _class) || _class) || _class);
});
define('aurelia-templating-resources/focus',['exports', 'aurelia-templating', 'aurelia-binding', 'aurelia-task-queue', 'aurelia-pal'], function (exports, _aureliaTemplating, _aureliaBinding, _aureliaTaskQueue, _aureliaPal) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.Focus = undefined;

  

  var _dec, _class;

  var Focus = exports.Focus = (_dec = (0, _aureliaTemplating.customAttribute)('focus', _aureliaBinding.bindingMode.twoWay), _dec(_class = function () {
    Focus.inject = function inject() {
      return [_aureliaPal.DOM.Element, _aureliaTaskQueue.TaskQueue];
    };

    function Focus(element, taskQueue) {
      

      this.element = element;
      this.taskQueue = taskQueue;
      this.isAttached = false;
      this.needsApply = false;
    }

    Focus.prototype.valueChanged = function valueChanged(newValue) {
      if (this.isAttached) {
        this._apply();
      } else {
        this.needsApply = true;
      }
    };

    Focus.prototype._apply = function _apply() {
      var _this = this;

      if (this.value) {
        this.taskQueue.queueMicroTask(function () {
          if (_this.value) {
            _this.element.focus();
          }
        });
      } else {
        this.element.blur();
      }
    };

    Focus.prototype.attached = function attached() {
      this.isAttached = true;
      if (this.needsApply) {
        this.needsApply = false;
        this._apply();
      }
      this.element.addEventListener('focus', this);
      this.element.addEventListener('blur', this);
    };

    Focus.prototype.detached = function detached() {
      this.isAttached = false;
      this.element.removeEventListener('focus', this);
      this.element.removeEventListener('blur', this);
    };

    Focus.prototype.handleEvent = function handleEvent(e) {
      if (e.type === 'focus') {
        this.value = true;
      } else if (_aureliaPal.DOM.activeElement !== this.element) {
        this.value = false;
      }
    };

    return Focus;
  }()) || _class);
});
define('aurelia-templating-resources/hide',['exports', 'aurelia-dependency-injection', 'aurelia-templating', 'aurelia-pal', './aurelia-hide-style'], function (exports, _aureliaDependencyInjection, _aureliaTemplating, _aureliaPal, _aureliaHideStyle) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.Hide = undefined;

  

  var _dec, _class;

  var Hide = exports.Hide = (_dec = (0, _aureliaTemplating.customAttribute)('hide'), _dec(_class = function () {
    Hide.inject = function inject() {
      return [_aureliaPal.DOM.Element, _aureliaTemplating.Animator, _aureliaDependencyInjection.Optional.of(_aureliaPal.DOM.boundary, true)];
    };

    function Hide(element, animator, domBoundary) {
      

      this.element = element;
      this.animator = animator;
      this.domBoundary = domBoundary;
    }

    Hide.prototype.created = function created() {
      (0, _aureliaHideStyle.injectAureliaHideStyleAtBoundary)(this.domBoundary);
    };

    Hide.prototype.valueChanged = function valueChanged(newValue) {
      if (newValue) {
        this.animator.addClass(this.element, _aureliaHideStyle.aureliaHideClassName);
      } else {
        this.animator.removeClass(this.element, _aureliaHideStyle.aureliaHideClassName);
      }
    };

    Hide.prototype.bind = function bind(bindingContext) {
      this.valueChanged(this.value);
    };

    return Hide;
  }()) || _class);
});
define('aurelia-templating-resources/html-resource-plugin',['exports', 'aurelia-templating', './dynamic-element'], function (exports, _aureliaTemplating, _dynamicElement) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.getElementName = getElementName;
  exports.configure = configure;
  function getElementName(address) {
    return (/([^\/^\?]+)\.html/i.exec(address)[1].toLowerCase()
    );
  }

  function configure(config) {
    var viewEngine = config.container.get(_aureliaTemplating.ViewEngine);
    var loader = config.aurelia.loader;

    viewEngine.addResourcePlugin('.html', {
      'fetch': function fetch(address) {
        return loader.loadTemplate(address).then(function (registryEntry) {
          var _ref;

          var bindable = registryEntry.template.getAttribute('bindable');
          var elementName = getElementName(address);

          if (bindable) {
            bindable = bindable.split(',').map(function (x) {
              return x.trim();
            });
            registryEntry.template.removeAttribute('bindable');
          } else {
            bindable = [];
          }

          return _ref = {}, _ref[elementName] = (0, _dynamicElement._createDynamicElement)(elementName, address, bindable), _ref;
        });
      }
    });
  }
});
define('aurelia-templating-resources/html-sanitizer',['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  

  var SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

  var HTMLSanitizer = exports.HTMLSanitizer = function () {
    function HTMLSanitizer() {
      
    }

    HTMLSanitizer.prototype.sanitize = function sanitize(input) {
      return input.replace(SCRIPT_REGEX, '');
    };

    return HTMLSanitizer;
  }();
});
define('aurelia-templating-resources/if',['exports', 'aurelia-templating', 'aurelia-dependency-injection', './if-core'], function (exports, _aureliaTemplating, _aureliaDependencyInjection, _ifCore) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.If = undefined;

  function _initDefineProp(target, property, descriptor, context) {
    if (!descriptor) return;
    Object.defineProperty(target, property, {
      enumerable: descriptor.enumerable,
      configurable: descriptor.configurable,
      writable: descriptor.writable,
      value: descriptor.initializer ? descriptor.initializer.call(context) : void 0
    });
  }

  

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
    var desc = {};
    Object['ke' + 'ys'](descriptor).forEach(function (key) {
      desc[key] = descriptor[key];
    });
    desc.enumerable = !!desc.enumerable;
    desc.configurable = !!desc.configurable;

    if ('value' in desc || desc.initializer) {
      desc.writable = true;
    }

    desc = decorators.slice().reverse().reduce(function (desc, decorator) {
      return decorator(target, property, desc) || desc;
    }, desc);

    if (context && desc.initializer !== void 0) {
      desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
      desc.initializer = undefined;
    }

    if (desc.initializer === void 0) {
      Object['define' + 'Property'](target, property, desc);
      desc = null;
    }

    return desc;
  }

  function _initializerWarningHelper(descriptor, context) {
    throw new Error('Decorating class property failed. Please ensure that transform-class-properties is enabled.');
  }

  var _dec, _dec2, _dec3, _class, _desc, _value, _class2, _descriptor, _descriptor2;

  var If = exports.If = (_dec = (0, _aureliaTemplating.customAttribute)('if'), _dec2 = (0, _aureliaDependencyInjection.inject)(_aureliaTemplating.BoundViewFactory, _aureliaTemplating.ViewSlot), _dec3 = (0, _aureliaTemplating.bindable)({ primaryProperty: true }), _dec(_class = (0, _aureliaTemplating.templateController)(_class = _dec2(_class = (_class2 = function (_IfCore) {
    _inherits(If, _IfCore);

    function If() {
      var _temp, _this, _ret;

      

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return _ret = (_temp = (_this = _possibleConstructorReturn(this, _IfCore.call.apply(_IfCore, [this].concat(args))), _this), _initDefineProp(_this, 'condition', _descriptor, _this), _initDefineProp(_this, 'swapOrder', _descriptor2, _this), _temp), _possibleConstructorReturn(_this, _ret);
    }

    If.prototype.bind = function bind(bindingContext, overrideContext) {
      _IfCore.prototype.bind.call(this, bindingContext, overrideContext);
      if (this.condition) {
        this._show();
      } else {
        this._hide();
      }
    };

    If.prototype.conditionChanged = function conditionChanged(newValue) {
      this._update(newValue);
    };

    If.prototype._update = function _update(show) {
      var _this2 = this;

      if (this.animating) {
        return;
      }

      var promise = void 0;
      if (this.elseVm) {
        promise = show ? this._swap(this.elseVm, this) : this._swap(this, this.elseVm);
      } else {
        promise = show ? this._show() : this._hide();
      }

      if (promise) {
        this.animating = true;
        promise.then(function () {
          _this2.animating = false;
          if (_this2.condition !== _this2.showing) {
            _this2._update(_this2.condition);
          }
        });
      }
    };

    If.prototype._swap = function _swap(remove, add) {
      switch (this.swapOrder) {
        case 'before':
          return Promise.resolve(add._show()).then(function () {
            return remove._hide();
          });
        case 'with':
          return Promise.all([remove._hide(), add._show()]);
        default:
          var promise = remove._hide();
          return promise ? promise.then(function () {
            return add._show();
          }) : add._show();
      }
    };

    return If;
  }(_ifCore.IfCore), (_descriptor = _applyDecoratedDescriptor(_class2.prototype, 'condition', [_dec3], {
    enumerable: true,
    initializer: null
  }), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, 'swapOrder', [_aureliaTemplating.bindable], {
    enumerable: true,
    initializer: null
  })), _class2)) || _class) || _class) || _class);
});
define('aurelia-templating-resources/if-core',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  

  var IfCore = exports.IfCore = function () {
    function IfCore(viewFactory, viewSlot) {
      

      this.viewFactory = viewFactory;
      this.viewSlot = viewSlot;
      this.view = null;
      this.bindingContext = null;
      this.overrideContext = null;

      this.showing = false;
    }

    IfCore.prototype.bind = function bind(bindingContext, overrideContext) {
      this.bindingContext = bindingContext;
      this.overrideContext = overrideContext;
    };

    IfCore.prototype.unbind = function unbind() {
      if (this.view === null) {
        return;
      }

      this.view.unbind();

      if (!this.viewFactory.isCaching) {
        return;
      }

      if (this.showing) {
        this.showing = false;
        this.viewSlot.remove(this.view, true, true);
      } else {
        this.view.returnToCache();
      }

      this.view = null;
    };

    IfCore.prototype._show = function _show() {
      if (this.showing) {
        if (!this.view.isBound) {
          this.view.bind(this.bindingContext, this.overrideContext);
        }
        return;
      }

      if (this.view === null) {
        this.view = this.viewFactory.create();
      }

      if (!this.view.isBound) {
        this.view.bind(this.bindingContext, this.overrideContext);
      }

      this.showing = true;
      return this.viewSlot.add(this.view);
    };

    IfCore.prototype._hide = function _hide() {
      var _this = this;

      if (!this.showing) {
        return;
      }

      this.showing = false;
      var removed = this.viewSlot.remove(this.view);

      if (removed instanceof Promise) {
        return removed.then(function () {
          return _this.view.unbind();
        });
      }

      this.view.unbind();
    };

    return IfCore;
  }();
});
define('aurelia-templating-resources/map-repeat-strategy',['exports', './repeat-utilities'], function (exports, _repeatUtilities) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.MapRepeatStrategy = undefined;

  

  var MapRepeatStrategy = exports.MapRepeatStrategy = function () {
    function MapRepeatStrategy() {
      
    }

    MapRepeatStrategy.prototype.getCollectionObserver = function getCollectionObserver(observerLocator, items) {
      return observerLocator.getMapObserver(items);
    };

    MapRepeatStrategy.prototype.instanceChanged = function instanceChanged(repeat, items) {
      var _this = this;

      var removePromise = repeat.removeAllViews(true, !repeat.viewsRequireLifecycle);
      if (removePromise instanceof Promise) {
        removePromise.then(function () {
          return _this._standardProcessItems(repeat, items);
        });
        return;
      }
      this._standardProcessItems(repeat, items);
    };

    MapRepeatStrategy.prototype._standardProcessItems = function _standardProcessItems(repeat, items) {
      var index = 0;
      var overrideContext = void 0;

      items.forEach(function (value, key) {
        overrideContext = (0, _repeatUtilities.createFullOverrideContext)(repeat, value, index, items.size, key);
        repeat.addView(overrideContext.bindingContext, overrideContext);
        ++index;
      });
    };

    MapRepeatStrategy.prototype.instanceMutated = function instanceMutated(repeat, map, records) {
      var key = void 0;
      var i = void 0;
      var ii = void 0;
      var overrideContext = void 0;
      var removeIndex = void 0;
      var addIndex = void 0;
      var record = void 0;
      var rmPromises = [];
      var viewOrPromise = void 0;

      for (i = 0, ii = records.length; i < ii; ++i) {
        record = records[i];
        key = record.key;
        switch (record.type) {
          case 'update':
            removeIndex = this._getViewIndexByKey(repeat, key);
            viewOrPromise = repeat.removeView(removeIndex, true, !repeat.viewsRequireLifecycle);
            if (viewOrPromise instanceof Promise) {
              rmPromises.push(viewOrPromise);
            }
            overrideContext = (0, _repeatUtilities.createFullOverrideContext)(repeat, map.get(key), removeIndex, map.size, key);
            repeat.insertView(removeIndex, overrideContext.bindingContext, overrideContext);
            break;
          case 'add':
            addIndex = repeat.viewCount() <= map.size - 1 ? repeat.viewCount() : map.size - 1;
            overrideContext = (0, _repeatUtilities.createFullOverrideContext)(repeat, map.get(key), addIndex, map.size, key);
            repeat.insertView(map.size - 1, overrideContext.bindingContext, overrideContext);
            break;
          case 'delete':
            if (record.oldValue === undefined) {
              return;
            }
            removeIndex = this._getViewIndexByKey(repeat, key);
            viewOrPromise = repeat.removeView(removeIndex, true, !repeat.viewsRequireLifecycle);
            if (viewOrPromise instanceof Promise) {
              rmPromises.push(viewOrPromise);
            }
            break;
          case 'clear':
            repeat.removeAllViews(true, !repeat.viewsRequireLifecycle);
            break;
          default:
            continue;
        }
      }

      if (rmPromises.length > 0) {
        Promise.all(rmPromises).then(function () {
          (0, _repeatUtilities.updateOverrideContexts)(repeat.views(), 0);
        });
      } else {
        (0, _repeatUtilities.updateOverrideContexts)(repeat.views(), 0);
      }
    };

    MapRepeatStrategy.prototype._getViewIndexByKey = function _getViewIndexByKey(repeat, key) {
      var i = void 0;
      var ii = void 0;
      var child = void 0;

      for (i = 0, ii = repeat.viewCount(); i < ii; ++i) {
        child = repeat.view(i);
        if (child.bindingContext[repeat.key] === key) {
          return i;
        }
      }

      return undefined;
    };

    return MapRepeatStrategy;
  }();
});
define('aurelia-templating-resources/null-repeat-strategy',["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  

  var NullRepeatStrategy = exports.NullRepeatStrategy = function () {
    function NullRepeatStrategy() {
      
    }

    NullRepeatStrategy.prototype.instanceChanged = function instanceChanged(repeat, items) {
      repeat.removeAllViews(true);
    };

    NullRepeatStrategy.prototype.getCollectionObserver = function getCollectionObserver(observerLocator, items) {};

    return NullRepeatStrategy;
  }();
});
define('aurelia-templating-resources/number-repeat-strategy',['exports', './repeat-utilities'], function (exports, _repeatUtilities) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.NumberRepeatStrategy = undefined;

  

  var NumberRepeatStrategy = exports.NumberRepeatStrategy = function () {
    function NumberRepeatStrategy() {
      
    }

    NumberRepeatStrategy.prototype.getCollectionObserver = function getCollectionObserver() {
      return null;
    };

    NumberRepeatStrategy.prototype.instanceChanged = function instanceChanged(repeat, value) {
      var _this = this;

      var removePromise = repeat.removeAllViews(true, !repeat.viewsRequireLifecycle);
      if (removePromise instanceof Promise) {
        removePromise.then(function () {
          return _this._standardProcessItems(repeat, value);
        });
        return;
      }
      this._standardProcessItems(repeat, value);
    };

    NumberRepeatStrategy.prototype._standardProcessItems = function _standardProcessItems(repeat, value) {
      var childrenLength = repeat.viewCount();
      var i = void 0;
      var ii = void 0;
      var overrideContext = void 0;
      var viewsToRemove = void 0;

      value = Math.floor(value);
      viewsToRemove = childrenLength - value;

      if (viewsToRemove > 0) {
        if (viewsToRemove > childrenLength) {
          viewsToRemove = childrenLength;
        }

        for (i = 0, ii = viewsToRemove; i < ii; ++i) {
          repeat.removeView(childrenLength - (i + 1), true, !repeat.viewsRequireLifecycle);
        }

        return;
      }

      for (i = childrenLength, ii = value; i < ii; ++i) {
        overrideContext = (0, _repeatUtilities.createFullOverrideContext)(repeat, i, i, ii);
        repeat.addView(overrideContext.bindingContext, overrideContext);
      }

      (0, _repeatUtilities.updateOverrideContexts)(repeat.views(), 0);
    };

    return NumberRepeatStrategy;
  }();
});
define('aurelia-templating-resources/repeat',['exports', 'aurelia-dependency-injection', 'aurelia-binding', 'aurelia-templating', './repeat-strategy-locator', './repeat-utilities', './analyze-view-factory', './abstract-repeater'], function (exports, _aureliaDependencyInjection, _aureliaBinding, _aureliaTemplating, _repeatStrategyLocator, _repeatUtilities, _analyzeViewFactory, _abstractRepeater) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.Repeat = undefined;

  function _initDefineProp(target, property, descriptor, context) {
    if (!descriptor) return;
    Object.defineProperty(target, property, {
      enumerable: descriptor.enumerable,
      configurable: descriptor.configurable,
      writable: descriptor.writable,
      value: descriptor.initializer ? descriptor.initializer.call(context) : void 0
    });
  }

  

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
    var desc = {};
    Object['ke' + 'ys'](descriptor).forEach(function (key) {
      desc[key] = descriptor[key];
    });
    desc.enumerable = !!desc.enumerable;
    desc.configurable = !!desc.configurable;

    if ('value' in desc || desc.initializer) {
      desc.writable = true;
    }

    desc = decorators.slice().reverse().reduce(function (desc, decorator) {
      return decorator(target, property, desc) || desc;
    }, desc);

    if (context && desc.initializer !== void 0) {
      desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
      desc.initializer = undefined;
    }

    if (desc.initializer === void 0) {
      Object['define' + 'Property'](target, property, desc);
      desc = null;
    }

    return desc;
  }

  function _initializerWarningHelper(descriptor, context) {
    throw new Error('Decorating class property failed. Please ensure that transform-class-properties is enabled.');
  }

  var _dec, _dec2, _class, _desc, _value, _class2, _descriptor, _descriptor2, _descriptor3, _descriptor4;

  var Repeat = exports.Repeat = (_dec = (0, _aureliaTemplating.customAttribute)('repeat'), _dec2 = (0, _aureliaDependencyInjection.inject)(_aureliaTemplating.BoundViewFactory, _aureliaTemplating.TargetInstruction, _aureliaTemplating.ViewSlot, _aureliaTemplating.ViewResources, _aureliaBinding.ObserverLocator, _repeatStrategyLocator.RepeatStrategyLocator), _dec(_class = (0, _aureliaTemplating.templateController)(_class = _dec2(_class = (_class2 = function (_AbstractRepeater) {
    _inherits(Repeat, _AbstractRepeater);

    function Repeat(viewFactory, instruction, viewSlot, viewResources, observerLocator, strategyLocator) {
      

      var _this = _possibleConstructorReturn(this, _AbstractRepeater.call(this, {
        local: 'item',
        viewsRequireLifecycle: (0, _analyzeViewFactory.viewsRequireLifecycle)(viewFactory)
      }));

      _initDefineProp(_this, 'items', _descriptor, _this);

      _initDefineProp(_this, 'local', _descriptor2, _this);

      _initDefineProp(_this, 'key', _descriptor3, _this);

      _initDefineProp(_this, 'value', _descriptor4, _this);

      _this.viewFactory = viewFactory;
      _this.instruction = instruction;
      _this.viewSlot = viewSlot;
      _this.lookupFunctions = viewResources.lookupFunctions;
      _this.observerLocator = observerLocator;
      _this.key = 'key';
      _this.value = 'value';
      _this.strategyLocator = strategyLocator;
      _this.ignoreMutation = false;
      _this.sourceExpression = (0, _repeatUtilities.getItemsSourceExpression)(_this.instruction, 'repeat.for');
      _this.isOneTime = (0, _repeatUtilities.isOneTime)(_this.sourceExpression);
      _this.viewsRequireLifecycle = (0, _analyzeViewFactory.viewsRequireLifecycle)(viewFactory);
      return _this;
    }

    Repeat.prototype.call = function call(context, changes) {
      this[context](this.items, changes);
    };

    Repeat.prototype.bind = function bind(bindingContext, overrideContext) {
      this.scope = { bindingContext: bindingContext, overrideContext: overrideContext };
      this.matcherBinding = this._captureAndRemoveMatcherBinding();
      this.itemsChanged();
    };

    Repeat.prototype.unbind = function unbind() {
      this.scope = null;
      this.items = null;
      this.matcherBinding = null;
      this.viewSlot.removeAll(true, true);
      this._unsubscribeCollection();
    };

    Repeat.prototype._unsubscribeCollection = function _unsubscribeCollection() {
      if (this.collectionObserver) {
        this.collectionObserver.unsubscribe(this.callContext, this);
        this.collectionObserver = null;
        this.callContext = null;
      }
    };

    Repeat.prototype.itemsChanged = function itemsChanged() {
      var _this2 = this;

      this._unsubscribeCollection();

      if (!this.scope) {
        return;
      }

      var items = this.items;
      this.strategy = this.strategyLocator.getStrategy(items);
      if (!this.strategy) {
        throw new Error('Value for \'' + this.sourceExpression + '\' is non-repeatable');
      }

      if (!this.isOneTime && !this._observeInnerCollection()) {
        this._observeCollection();
      }
      this.ignoreMutation = true;
      this.strategy.instanceChanged(this, items);
      this.observerLocator.taskQueue.queueMicroTask(function () {
        _this2.ignoreMutation = false;
      });
    };

    Repeat.prototype._getInnerCollection = function _getInnerCollection() {
      var expression = (0, _repeatUtilities.unwrapExpression)(this.sourceExpression);
      if (!expression) {
        return null;
      }
      return expression.evaluate(this.scope, null);
    };

    Repeat.prototype.handleCollectionMutated = function handleCollectionMutated(collection, changes) {
      if (!this.collectionObserver) {
        return;
      }
      if (this.ignoreMutation) {
        return;
      }
      this.strategy.instanceMutated(this, collection, changes);
    };

    Repeat.prototype.handleInnerCollectionMutated = function handleInnerCollectionMutated(collection, changes) {
      var _this3 = this;

      if (!this.collectionObserver) {
        return;
      }

      if (this.ignoreMutation) {
        return;
      }
      this.ignoreMutation = true;
      var newItems = this.sourceExpression.evaluate(this.scope, this.lookupFunctions);
      this.observerLocator.taskQueue.queueMicroTask(function () {
        return _this3.ignoreMutation = false;
      });

      if (newItems === this.items) {
        this.itemsChanged();
      } else {
        this.items = newItems;
      }
    };

    Repeat.prototype._observeInnerCollection = function _observeInnerCollection() {
      var items = this._getInnerCollection();
      var strategy = this.strategyLocator.getStrategy(items);
      if (!strategy) {
        return false;
      }
      this.collectionObserver = strategy.getCollectionObserver(this.observerLocator, items);
      if (!this.collectionObserver) {
        return false;
      }
      this.callContext = 'handleInnerCollectionMutated';
      this.collectionObserver.subscribe(this.callContext, this);
      return true;
    };

    Repeat.prototype._observeCollection = function _observeCollection() {
      var items = this.items;
      this.collectionObserver = this.strategy.getCollectionObserver(this.observerLocator, items);
      if (this.collectionObserver) {
        this.callContext = 'handleCollectionMutated';
        this.collectionObserver.subscribe(this.callContext, this);
      }
    };

    Repeat.prototype._captureAndRemoveMatcherBinding = function _captureAndRemoveMatcherBinding() {
      if (this.viewFactory.viewFactory) {
        var instructions = this.viewFactory.viewFactory.instructions;
        var instructionIds = Object.keys(instructions);
        for (var i = 0; i < instructionIds.length; i++) {
          var expressions = instructions[instructionIds[i]].expressions;
          if (expressions) {
            for (var ii = 0; i < expressions.length; i++) {
              if (expressions[ii].targetProperty === 'matcher') {
                var matcherBinding = expressions[ii];
                expressions.splice(ii, 1);
                return matcherBinding;
              }
            }
          }
        }
      }

      return undefined;
    };

    Repeat.prototype.viewCount = function viewCount() {
      return this.viewSlot.children.length;
    };

    Repeat.prototype.views = function views() {
      return this.viewSlot.children;
    };

    Repeat.prototype.view = function view(index) {
      return this.viewSlot.children[index];
    };

    Repeat.prototype.matcher = function matcher() {
      return this.matcherBinding ? this.matcherBinding.sourceExpression.evaluate(this.scope, this.matcherBinding.lookupFunctions) : null;
    };

    Repeat.prototype.addView = function addView(bindingContext, overrideContext) {
      var view = this.viewFactory.create();
      view.bind(bindingContext, overrideContext);
      this.viewSlot.add(view);
    };

    Repeat.prototype.insertView = function insertView(index, bindingContext, overrideContext) {
      var view = this.viewFactory.create();
      view.bind(bindingContext, overrideContext);
      this.viewSlot.insert(index, view);
    };

    Repeat.prototype.moveView = function moveView(sourceIndex, targetIndex) {
      this.viewSlot.move(sourceIndex, targetIndex);
    };

    Repeat.prototype.removeAllViews = function removeAllViews(returnToCache, skipAnimation) {
      return this.viewSlot.removeAll(returnToCache, skipAnimation);
    };

    Repeat.prototype.removeViews = function removeViews(viewsToRemove, returnToCache, skipAnimation) {
      return this.viewSlot.removeMany(viewsToRemove, returnToCache, skipAnimation);
    };

    Repeat.prototype.removeView = function removeView(index, returnToCache, skipAnimation) {
      return this.viewSlot.removeAt(index, returnToCache, skipAnimation);
    };

    Repeat.prototype.updateBindings = function updateBindings(view) {
      var j = view.bindings.length;
      while (j--) {
        (0, _repeatUtilities.updateOneTimeBinding)(view.bindings[j]);
      }
      j = view.controllers.length;
      while (j--) {
        var k = view.controllers[j].boundProperties.length;
        while (k--) {
          var binding = view.controllers[j].boundProperties[k].binding;
          (0, _repeatUtilities.updateOneTimeBinding)(binding);
        }
      }
    };

    return Repeat;
  }(_abstractRepeater.AbstractRepeater), (_descriptor = _applyDecoratedDescriptor(_class2.prototype, 'items', [_aureliaTemplating.bindable], {
    enumerable: true,
    initializer: null
  }), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, 'local', [_aureliaTemplating.bindable], {
    enumerable: true,
    initializer: null
  }), _descriptor3 = _applyDecoratedDescriptor(_class2.prototype, 'key', [_aureliaTemplating.bindable], {
    enumerable: true,
    initializer: null
  }), _descriptor4 = _applyDecoratedDescriptor(_class2.prototype, 'value', [_aureliaTemplating.bindable], {
    enumerable: true,
    initializer: null
  })), _class2)) || _class) || _class) || _class);
});
define('aurelia-templating-resources/repeat-strategy-locator',['exports', './null-repeat-strategy', './array-repeat-strategy', './map-repeat-strategy', './set-repeat-strategy', './number-repeat-strategy'], function (exports, _nullRepeatStrategy, _arrayRepeatStrategy, _mapRepeatStrategy, _setRepeatStrategy, _numberRepeatStrategy) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.RepeatStrategyLocator = undefined;

  

  var RepeatStrategyLocator = exports.RepeatStrategyLocator = function () {
    function RepeatStrategyLocator() {
      

      this.matchers = [];
      this.strategies = [];

      this.addStrategy(function (items) {
        return items === null || items === undefined;
      }, new _nullRepeatStrategy.NullRepeatStrategy());
      this.addStrategy(function (items) {
        return items instanceof Array;
      }, new _arrayRepeatStrategy.ArrayRepeatStrategy());
      this.addStrategy(function (items) {
        return items instanceof Map;
      }, new _mapRepeatStrategy.MapRepeatStrategy());
      this.addStrategy(function (items) {
        return items instanceof Set;
      }, new _setRepeatStrategy.SetRepeatStrategy());
      this.addStrategy(function (items) {
        return typeof items === 'number';
      }, new _numberRepeatStrategy.NumberRepeatStrategy());
    }

    RepeatStrategyLocator.prototype.addStrategy = function addStrategy(matcher, strategy) {
      this.matchers.push(matcher);
      this.strategies.push(strategy);
    };

    RepeatStrategyLocator.prototype.getStrategy = function getStrategy(items) {
      var matchers = this.matchers;

      for (var i = 0, ii = matchers.length; i < ii; ++i) {
        if (matchers[i](items)) {
          return this.strategies[i];
        }
      }

      return null;
    };

    return RepeatStrategyLocator;
  }();
});
define('aurelia-templating-resources/repeat-utilities',['exports', 'aurelia-binding'], function (exports, _aureliaBinding) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.updateOverrideContexts = updateOverrideContexts;
  exports.createFullOverrideContext = createFullOverrideContext;
  exports.updateOverrideContext = updateOverrideContext;
  exports.getItemsSourceExpression = getItemsSourceExpression;
  exports.unwrapExpression = unwrapExpression;
  exports.isOneTime = isOneTime;
  exports.updateOneTimeBinding = updateOneTimeBinding;
  exports.indexOf = indexOf;


  var oneTime = _aureliaBinding.bindingMode.oneTime;

  function updateOverrideContexts(views, startIndex) {
    var length = views.length;

    if (startIndex > 0) {
      startIndex = startIndex - 1;
    }

    for (; startIndex < length; ++startIndex) {
      updateOverrideContext(views[startIndex].overrideContext, startIndex, length);
    }
  }

  function createFullOverrideContext(repeat, data, index, length, key) {
    var bindingContext = {};
    var overrideContext = (0, _aureliaBinding.createOverrideContext)(bindingContext, repeat.scope.overrideContext);

    if (typeof key !== 'undefined') {
      bindingContext[repeat.key] = key;
      bindingContext[repeat.value] = data;
    } else {
      bindingContext[repeat.local] = data;
    }
    updateOverrideContext(overrideContext, index, length);
    return overrideContext;
  }

  function updateOverrideContext(overrideContext, index, length) {
    var first = index === 0;
    var last = index === length - 1;
    var even = index % 2 === 0;

    overrideContext.$index = index;
    overrideContext.$first = first;
    overrideContext.$last = last;
    overrideContext.$middle = !(first || last);
    overrideContext.$odd = !even;
    overrideContext.$even = even;
  }

  function getItemsSourceExpression(instruction, attrName) {
    return instruction.behaviorInstructions.filter(function (bi) {
      return bi.originalAttrName === attrName;
    })[0].attributes.items.sourceExpression;
  }

  function unwrapExpression(expression) {
    var unwrapped = false;
    while (expression instanceof _aureliaBinding.BindingBehavior) {
      expression = expression.expression;
    }
    while (expression instanceof _aureliaBinding.ValueConverter) {
      expression = expression.expression;
      unwrapped = true;
    }
    return unwrapped ? expression : null;
  }

  function isOneTime(expression) {
    while (expression instanceof _aureliaBinding.BindingBehavior) {
      if (expression.name === 'oneTime') {
        return true;
      }
      expression = expression.expression;
    }
    return false;
  }

  function updateOneTimeBinding(binding) {
    if (binding.call && binding.mode === oneTime) {
      binding.call(_aureliaBinding.sourceContext);
    } else if (binding.updateOneTimeBindings) {
      binding.updateOneTimeBindings();
    }
  }

  function indexOf(array, item, matcher, startIndex) {
    if (!matcher) {
      return array.indexOf(item);
    }
    var length = array.length;
    for (var index = startIndex || 0; index < length; index++) {
      if (matcher(array[index], item)) {
        return index;
      }
    }
    return -1;
  }
});
define('aurelia-templating-resources/replaceable',['exports', 'aurelia-dependency-injection', 'aurelia-templating'], function (exports, _aureliaDependencyInjection, _aureliaTemplating) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.Replaceable = undefined;

  

  var _dec, _dec2, _class;

  var Replaceable = exports.Replaceable = (_dec = (0, _aureliaTemplating.customAttribute)('replaceable'), _dec2 = (0, _aureliaDependencyInjection.inject)(_aureliaTemplating.BoundViewFactory, _aureliaTemplating.ViewSlot), _dec(_class = (0, _aureliaTemplating.templateController)(_class = _dec2(_class = function () {
    function Replaceable(viewFactory, viewSlot) {
      

      this.viewFactory = viewFactory;
      this.viewSlot = viewSlot;
      this.view = null;
    }

    Replaceable.prototype.bind = function bind(bindingContext, overrideContext) {
      if (this.view === null) {
        this.view = this.viewFactory.create();
        this.viewSlot.add(this.view);
      }

      this.view.bind(bindingContext, overrideContext);
    };

    Replaceable.prototype.unbind = function unbind() {
      this.view.unbind();
    };

    return Replaceable;
  }()) || _class) || _class) || _class);
});
define('aurelia-templating-resources/sanitize-html',['exports', 'aurelia-binding', 'aurelia-dependency-injection', './html-sanitizer'], function (exports, _aureliaBinding, _aureliaDependencyInjection, _htmlSanitizer) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.SanitizeHTMLValueConverter = undefined;

  

  var _dec, _dec2, _class;

  var SanitizeHTMLValueConverter = exports.SanitizeHTMLValueConverter = (_dec = (0, _aureliaBinding.valueConverter)('sanitizeHTML'), _dec2 = (0, _aureliaDependencyInjection.inject)(_htmlSanitizer.HTMLSanitizer), _dec(_class = _dec2(_class = function () {
    function SanitizeHTMLValueConverter(sanitizer) {
      

      this.sanitizer = sanitizer;
    }

    SanitizeHTMLValueConverter.prototype.toView = function toView(untrustedMarkup) {
      if (untrustedMarkup === null || untrustedMarkup === undefined) {
        return null;
      }

      return this.sanitizer.sanitize(untrustedMarkup);
    };

    return SanitizeHTMLValueConverter;
  }()) || _class) || _class);
});
define('aurelia-templating-resources/self-binding-behavior',['exports', 'aurelia-binding'], function (exports, _aureliaBinding) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.SelfBindingBehavior = undefined;

  

  var _dec, _class;

  function findOriginalEventTarget(event) {
    return event.path && event.path[0] || event.deepPath && event.deepPath[0] || event.target;
  }

  function handleSelfEvent(event) {
    var target = findOriginalEventTarget(event);
    if (this.target !== target) return;
    this.selfEventCallSource(event);
  }

  var SelfBindingBehavior = exports.SelfBindingBehavior = (_dec = (0, _aureliaBinding.bindingBehavior)('self'), _dec(_class = function () {
    function SelfBindingBehavior() {
      
    }

    SelfBindingBehavior.prototype.bind = function bind(binding, source) {
      if (!binding.callSource || !binding.targetEvent) throw new Error('Self binding behavior only supports event.');
      binding.selfEventCallSource = binding.callSource;
      binding.callSource = handleSelfEvent;
    };

    SelfBindingBehavior.prototype.unbind = function unbind(binding, source) {
      binding.callSource = binding.selfEventCallSource;
      binding.selfEventCallSource = null;
    };

    return SelfBindingBehavior;
  }()) || _class);
});
define('aurelia-templating-resources/set-repeat-strategy',['exports', './repeat-utilities'], function (exports, _repeatUtilities) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.SetRepeatStrategy = undefined;

  

  var SetRepeatStrategy = exports.SetRepeatStrategy = function () {
    function SetRepeatStrategy() {
      
    }

    SetRepeatStrategy.prototype.getCollectionObserver = function getCollectionObserver(observerLocator, items) {
      return observerLocator.getSetObserver(items);
    };

    SetRepeatStrategy.prototype.instanceChanged = function instanceChanged(repeat, items) {
      var _this = this;

      var removePromise = repeat.removeAllViews(true, !repeat.viewsRequireLifecycle);
      if (removePromise instanceof Promise) {
        removePromise.then(function () {
          return _this._standardProcessItems(repeat, items);
        });
        return;
      }
      this._standardProcessItems(repeat, items);
    };

    SetRepeatStrategy.prototype._standardProcessItems = function _standardProcessItems(repeat, items) {
      var index = 0;
      var overrideContext = void 0;

      items.forEach(function (value) {
        overrideContext = (0, _repeatUtilities.createFullOverrideContext)(repeat, value, index, items.size);
        repeat.addView(overrideContext.bindingContext, overrideContext);
        ++index;
      });
    };

    SetRepeatStrategy.prototype.instanceMutated = function instanceMutated(repeat, set, records) {
      var value = void 0;
      var i = void 0;
      var ii = void 0;
      var overrideContext = void 0;
      var removeIndex = void 0;
      var record = void 0;
      var rmPromises = [];
      var viewOrPromise = void 0;

      for (i = 0, ii = records.length; i < ii; ++i) {
        record = records[i];
        value = record.value;
        switch (record.type) {
          case 'add':
            var size = Math.max(set.size - 1, 0);
            overrideContext = (0, _repeatUtilities.createFullOverrideContext)(repeat, value, size, set.size);
            repeat.insertView(size, overrideContext.bindingContext, overrideContext);
            break;
          case 'delete':
            removeIndex = this._getViewIndexByValue(repeat, value);
            viewOrPromise = repeat.removeView(removeIndex, true, !repeat.viewsRequireLifecycle);
            if (viewOrPromise instanceof Promise) {
              rmPromises.push(viewOrPromise);
            }
            break;
          case 'clear':
            repeat.removeAllViews(true, !repeat.viewsRequireLifecycle);
            break;
          default:
            continue;
        }
      }

      if (rmPromises.length > 0) {
        Promise.all(rmPromises).then(function () {
          (0, _repeatUtilities.updateOverrideContexts)(repeat.views(), 0);
        });
      } else {
        (0, _repeatUtilities.updateOverrideContexts)(repeat.views(), 0);
      }
    };

    SetRepeatStrategy.prototype._getViewIndexByValue = function _getViewIndexByValue(repeat, value) {
      var i = void 0;
      var ii = void 0;
      var child = void 0;

      for (i = 0, ii = repeat.viewCount(); i < ii; ++i) {
        child = repeat.view(i);
        if (child.bindingContext[repeat.local] === value) {
          return i;
        }
      }

      return undefined;
    };

    return SetRepeatStrategy;
  }();
});
define('aurelia-templating-resources/show',['exports', 'aurelia-dependency-injection', 'aurelia-templating', 'aurelia-pal', './aurelia-hide-style'], function (exports, _aureliaDependencyInjection, _aureliaTemplating, _aureliaPal, _aureliaHideStyle) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.Show = undefined;

  

  var _dec, _class;

  var Show = exports.Show = (_dec = (0, _aureliaTemplating.customAttribute)('show'), _dec(_class = function () {
    Show.inject = function inject() {
      return [_aureliaPal.DOM.Element, _aureliaTemplating.Animator, _aureliaDependencyInjection.Optional.of(_aureliaPal.DOM.boundary, true)];
    };

    function Show(element, animator, domBoundary) {
      

      this.element = element;
      this.animator = animator;
      this.domBoundary = domBoundary;
    }

    Show.prototype.created = function created() {
      (0, _aureliaHideStyle.injectAureliaHideStyleAtBoundary)(this.domBoundary);
    };

    Show.prototype.valueChanged = function valueChanged(newValue) {
      if (newValue) {
        this.animator.removeClass(this.element, _aureliaHideStyle.aureliaHideClassName);
      } else {
        this.animator.addClass(this.element, _aureliaHideStyle.aureliaHideClassName);
      }
    };

    Show.prototype.bind = function bind(bindingContext) {
      this.valueChanged(this.value);
    };

    return Show;
  }()) || _class);
});
define('aurelia-templating-resources/signal-binding-behavior',['exports', 'aurelia-binding', './binding-signaler'], function (exports, _aureliaBinding, _bindingSignaler) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.SignalBindingBehavior = undefined;

  

  var _dec, _class;

  var SignalBindingBehavior = exports.SignalBindingBehavior = (_dec = (0, _aureliaBinding.bindingBehavior)('signal'), _dec(_class = function () {
    SignalBindingBehavior.inject = function inject() {
      return [_bindingSignaler.BindingSignaler];
    };

    function SignalBindingBehavior(bindingSignaler) {
      

      this.signals = bindingSignaler.signals;
    }

    SignalBindingBehavior.prototype.bind = function bind(binding, source) {
      if (!binding.updateTarget) {
        throw new Error('Only property bindings and string interpolation bindings can be signaled.  Trigger, delegate and call bindings cannot be signaled.');
      }
      if (arguments.length === 3) {
        var name = arguments[2];
        var bindings = this.signals[name] || (this.signals[name] = []);
        bindings.push(binding);
        binding.signalName = name;
      } else if (arguments.length > 3) {
        var names = Array.prototype.slice.call(arguments, 2);
        var i = names.length;
        while (i--) {
          var _name = names[i];
          var _bindings = this.signals[_name] || (this.signals[_name] = []);
          _bindings.push(binding);
        }
        binding.signalName = names;
      } else {
        throw new Error('Signal name is required.');
      }
    };

    SignalBindingBehavior.prototype.unbind = function unbind(binding, source) {
      var name = binding.signalName;
      binding.signalName = null;
      if (Array.isArray(name)) {
        var names = name;
        var i = names.length;
        while (i--) {
          var n = names[i];
          var bindings = this.signals[n];
          bindings.splice(bindings.indexOf(binding), 1);
        }
      } else {
        var _bindings2 = this.signals[name];
        _bindings2.splice(_bindings2.indexOf(binding), 1);
      }
    };

    return SignalBindingBehavior;
  }()) || _class);
});
define('aurelia-templating-resources/throttle-binding-behavior',['exports', 'aurelia-binding'], function (exports, _aureliaBinding) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.ThrottleBindingBehavior = undefined;

  

  var _dec, _class;

  function throttle(newValue) {
    var _this = this;

    var state = this.throttleState;
    var elapsed = +new Date() - state.last;
    if (elapsed >= state.delay) {
      clearTimeout(state.timeoutId);
      state.timeoutId = null;
      state.last = +new Date();
      this.throttledMethod(newValue);
      return;
    }
    state.newValue = newValue;
    if (state.timeoutId === null) {
      state.timeoutId = setTimeout(function () {
        state.timeoutId = null;
        state.last = +new Date();
        _this.throttledMethod(state.newValue);
      }, state.delay - elapsed);
    }
  }

  var ThrottleBindingBehavior = exports.ThrottleBindingBehavior = (_dec = (0, _aureliaBinding.bindingBehavior)('throttle'), _dec(_class = function () {
    function ThrottleBindingBehavior() {
      
    }

    ThrottleBindingBehavior.prototype.bind = function bind(binding, source) {
      var delay = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 200;

      var methodToThrottle = 'updateTarget';
      if (binding.callSource) {
        methodToThrottle = 'callSource';
      } else if (binding.updateSource && binding.mode === _aureliaBinding.bindingMode.twoWay) {
        methodToThrottle = 'updateSource';
      }

      binding.throttledMethod = binding[methodToThrottle];
      binding.throttledMethod.originalName = methodToThrottle;

      binding[methodToThrottle] = throttle;

      binding.throttleState = {
        delay: delay,
        last: 0,
        timeoutId: null
      };
    };

    ThrottleBindingBehavior.prototype.unbind = function unbind(binding, source) {
      var methodToRestore = binding.throttledMethod.originalName;
      binding[methodToRestore] = binding.throttledMethod;
      binding.throttledMethod = null;
      clearTimeout(binding.throttleState.timeoutId);
      binding.throttleState = null;
    };

    return ThrottleBindingBehavior;
  }()) || _class);
});
define('aurelia-templating-resources/update-trigger-binding-behavior',['exports', 'aurelia-binding'], function (exports, _aureliaBinding) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.UpdateTriggerBindingBehavior = undefined;

  

  var _dec, _class;

  var eventNamesRequired = 'The updateTrigger binding behavior requires at least one event name argument: eg <input value.bind="firstName & updateTrigger:\'blur\'">';
  var notApplicableMessage = 'The updateTrigger binding behavior can only be applied to two-way/ from-view bindings on input/select elements.';

  var UpdateTriggerBindingBehavior = exports.UpdateTriggerBindingBehavior = (_dec = (0, _aureliaBinding.bindingBehavior)('updateTrigger'), _dec(_class = function () {
    function UpdateTriggerBindingBehavior() {
      
    }

    UpdateTriggerBindingBehavior.prototype.bind = function bind(binding, source) {
      for (var _len = arguments.length, events = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
        events[_key - 2] = arguments[_key];
      }

      if (events.length === 0) {
        throw new Error(eventNamesRequired);
      }
      if (binding.mode !== _aureliaBinding.bindingMode.twoWay && binding.mode !== _aureliaBinding.bindingMode.fromView) {
        throw new Error(notApplicableMessage);
      }

      var targetObserver = binding.observerLocator.getObserver(binding.target, binding.targetProperty);
      if (!targetObserver.handler) {
        throw new Error(notApplicableMessage);
      }
      binding.targetObserver = targetObserver;

      targetObserver.originalHandler = binding.targetObserver.handler;

      var handler = new _aureliaBinding.EventSubscriber(events);
      targetObserver.handler = handler;
    };

    UpdateTriggerBindingBehavior.prototype.unbind = function unbind(binding, source) {
      binding.targetObserver.handler.dispose();
      binding.targetObserver.handler = binding.targetObserver.originalHandler;
      binding.targetObserver.originalHandler = null;
    };

    return UpdateTriggerBindingBehavior;
  }()) || _class);
});
define('aurelia-templating-resources/with',['exports', 'aurelia-dependency-injection', 'aurelia-templating', 'aurelia-binding'], function (exports, _aureliaDependencyInjection, _aureliaTemplating, _aureliaBinding) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.With = undefined;

  

  var _dec, _dec2, _class;

  var With = exports.With = (_dec = (0, _aureliaTemplating.customAttribute)('with'), _dec2 = (0, _aureliaDependencyInjection.inject)(_aureliaTemplating.BoundViewFactory, _aureliaTemplating.ViewSlot), _dec(_class = (0, _aureliaTemplating.templateController)(_class = _dec2(_class = function () {
    function With(viewFactory, viewSlot) {
      

      this.viewFactory = viewFactory;
      this.viewSlot = viewSlot;
      this.parentOverrideContext = null;
      this.view = null;
    }

    With.prototype.bind = function bind(bindingContext, overrideContext) {
      this.parentOverrideContext = overrideContext;
      this.valueChanged(this.value);
    };

    With.prototype.valueChanged = function valueChanged(newValue) {
      var overrideContext = (0, _aureliaBinding.createOverrideContext)(newValue, this.parentOverrideContext);
      if (!this.view) {
        this.view = this.viewFactory.create();
        this.view.bind(newValue, overrideContext);
        this.viewSlot.add(this.view);
      } else {
        this.view.bind(newValue, overrideContext);
      }
    };

    With.prototype.unbind = function unbind() {
      this.parentOverrideContext = null;

      if (this.view) {
        this.view.unbind();
      }
    };

    return With;
  }()) || _class) || _class) || _class);
});
define('aurelia-templating-router/aurelia-templating-router',['exports', 'aurelia-router', './route-loader', './router-view', './route-href'], function (exports, _aureliaRouter, _routeLoader, _routerView, _routeHref) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.configure = exports.RouteHref = exports.RouterView = exports.TemplatingRouteLoader = undefined;


  function configure(config) {
    config.singleton(_aureliaRouter.RouteLoader, _routeLoader.TemplatingRouteLoader).singleton(_aureliaRouter.Router, _aureliaRouter.AppRouter).globalResources(_routerView.RouterView, _routeHref.RouteHref);

    config.container.registerAlias(_aureliaRouter.Router, _aureliaRouter.AppRouter);
  }

  exports.TemplatingRouteLoader = _routeLoader.TemplatingRouteLoader;
  exports.RouterView = _routerView.RouterView;
  exports.RouteHref = _routeHref.RouteHref;
  exports.configure = configure;
});
define('aurelia-templating-router/route-href',['exports', 'aurelia-templating', 'aurelia-router', 'aurelia-pal', 'aurelia-logging'], function (exports, _aureliaTemplating, _aureliaRouter, _aureliaPal, _aureliaLogging) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.RouteHref = undefined;

  var LogManager = _interopRequireWildcard(_aureliaLogging);

  function _interopRequireWildcard(obj) {
    if (obj && obj.__esModule) {
      return obj;
    } else {
      var newObj = {};

      if (obj != null) {
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];
        }
      }

      newObj.default = obj;
      return newObj;
    }
  }

  

  var _dec, _dec2, _dec3, _dec4, _class;

  var logger = LogManager.getLogger('route-href');

  var RouteHref = exports.RouteHref = (_dec = (0, _aureliaTemplating.customAttribute)('route-href'), _dec2 = (0, _aureliaTemplating.bindable)({ name: 'route', changeHandler: 'processChange', primaryProperty: true }), _dec3 = (0, _aureliaTemplating.bindable)({ name: 'params', changeHandler: 'processChange' }), _dec4 = (0, _aureliaTemplating.bindable)({ name: 'attribute', defaultValue: 'href' }), _dec(_class = _dec2(_class = _dec3(_class = _dec4(_class = function () {
    RouteHref.inject = function inject() {
      return [_aureliaRouter.Router, _aureliaPal.DOM.Element];
    };

    function RouteHref(router, element) {
      

      this.router = router;
      this.element = element;
    }

    RouteHref.prototype.bind = function bind() {
      this.isActive = true;
      this.processChange();
    };

    RouteHref.prototype.unbind = function unbind() {
      this.isActive = false;
    };

    RouteHref.prototype.attributeChanged = function attributeChanged(value, previous) {
      if (previous) {
        this.element.removeAttribute(previous);
      }

      this.processChange();
    };

    RouteHref.prototype.processChange = function processChange() {
      var _this = this;

      return this.router.ensureConfigured().then(function () {
        if (!_this.isActive) {
          return null;
        }

        var href = _this.router.generate(_this.route, _this.params);

        if (_this.element.au.controller) {
          _this.element.au.controller.viewModel[_this.attribute] = href;
        } else {
          _this.element.setAttribute(_this.attribute, href);
        }

        return null;
      }).catch(function (reason) {
        logger.error(reason);
      });
    };

    return RouteHref;
  }()) || _class) || _class) || _class) || _class);
});
define('aurelia-templating-router/route-loader',['exports', 'aurelia-dependency-injection', 'aurelia-templating', 'aurelia-router', 'aurelia-path', 'aurelia-metadata', './router-view'], function (exports, _aureliaDependencyInjection, _aureliaTemplating, _aureliaRouter, _aureliaPath, _aureliaMetadata, _routerView) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.TemplatingRouteLoader = undefined;

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  

  var _dec, _class, _dec2, _class2;

  var EmptyClass = (_dec = (0, _aureliaTemplating.inlineView)('<template></template>'), _dec(_class = function EmptyClass() {
    
  }) || _class);
  var TemplatingRouteLoader = exports.TemplatingRouteLoader = (_dec2 = (0, _aureliaDependencyInjection.inject)(_aureliaTemplating.CompositionEngine), _dec2(_class2 = function (_RouteLoader) {
    _inherits(TemplatingRouteLoader, _RouteLoader);

    function TemplatingRouteLoader(compositionEngine) {
      

      var _this = _possibleConstructorReturn(this, _RouteLoader.call(this));

      _this.compositionEngine = compositionEngine;
      return _this;
    }

    TemplatingRouteLoader.prototype.loadRoute = function loadRoute(router, config) {
      var childContainer = router.container.createChild();

      var viewModel = void 0;
      if (config.moduleId === null) {
        viewModel = EmptyClass;
      } else if (/\.html/i.test(config.moduleId)) {
        viewModel = createDynamicClass(config.moduleId);
      } else {
        viewModel = (0, _aureliaPath.relativeToFile)(config.moduleId, _aureliaMetadata.Origin.get(router.container.viewModel.constructor).moduleId);
      }

      var instruction = {
        viewModel: viewModel,
        childContainer: childContainer,
        view: config.view || config.viewStrategy,
        router: router
      };

      childContainer.registerSingleton(_routerView.RouterViewLocator);

      childContainer.getChildRouter = function () {
        var childRouter = void 0;

        childContainer.registerHandler(_aureliaRouter.Router, function (c) {
          return childRouter || (childRouter = router.createChild(childContainer));
        });

        return childContainer.get(_aureliaRouter.Router);
      };

      return this.compositionEngine.ensureViewModel(instruction);
    };

    return TemplatingRouteLoader;
  }(_aureliaRouter.RouteLoader)) || _class2);


  function createDynamicClass(moduleId) {
    var _dec3, _dec4, _class3;

    var name = /([^\/^\?]+)\.html/i.exec(moduleId)[1];

    var DynamicClass = (_dec3 = (0, _aureliaTemplating.customElement)(name), _dec4 = (0, _aureliaTemplating.useView)(moduleId), _dec3(_class3 = _dec4(_class3 = function () {
      function DynamicClass() {
        
      }

      DynamicClass.prototype.bind = function bind(bindingContext) {
        this.$parent = bindingContext;
      };

      return DynamicClass;
    }()) || _class3) || _class3);


    return DynamicClass;
  }
});
define('aurelia-templating-router/router-view',['exports', 'aurelia-dependency-injection', 'aurelia-binding', 'aurelia-templating', 'aurelia-router', 'aurelia-metadata', 'aurelia-pal'], function (exports, _aureliaDependencyInjection, _aureliaBinding, _aureliaTemplating, _aureliaRouter, _aureliaMetadata, _aureliaPal) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.RouterViewLocator = exports.RouterView = undefined;

  function _initDefineProp(target, property, descriptor, context) {
    if (!descriptor) return;
    Object.defineProperty(target, property, {
      enumerable: descriptor.enumerable,
      configurable: descriptor.configurable,
      writable: descriptor.writable,
      value: descriptor.initializer ? descriptor.initializer.call(context) : void 0
    });
  }

  

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
    var desc = {};
    Object['ke' + 'ys'](descriptor).forEach(function (key) {
      desc[key] = descriptor[key];
    });
    desc.enumerable = !!desc.enumerable;
    desc.configurable = !!desc.configurable;

    if ('value' in desc || desc.initializer) {
      desc.writable = true;
    }

    desc = decorators.slice().reverse().reduce(function (desc, decorator) {
      return decorator(target, property, desc) || desc;
    }, desc);

    if (context && desc.initializer !== void 0) {
      desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
      desc.initializer = undefined;
    }

    if (desc.initializer === void 0) {
      Object['define' + 'Property'](target, property, desc);
      desc = null;
    }

    return desc;
  }

  function _initializerWarningHelper(descriptor, context) {
    throw new Error('Decorating class property failed. Please ensure that transform-class-properties is enabled.');
  }

  var _dec, _class, _desc, _value, _class2, _descriptor, _descriptor2, _descriptor3, _descriptor4;

  var RouterView = exports.RouterView = (_dec = (0, _aureliaTemplating.customElement)('router-view'), _dec(_class = (0, _aureliaTemplating.noView)(_class = (_class2 = function () {
    RouterView.inject = function inject() {
      return [_aureliaPal.DOM.Element, _aureliaDependencyInjection.Container, _aureliaTemplating.ViewSlot, _aureliaRouter.Router, _aureliaTemplating.ViewLocator, _aureliaTemplating.CompositionTransaction, _aureliaTemplating.CompositionEngine];
    };

    function RouterView(element, container, viewSlot, router, viewLocator, compositionTransaction, compositionEngine) {
      

      _initDefineProp(this, 'swapOrder', _descriptor, this);

      _initDefineProp(this, 'layoutView', _descriptor2, this);

      _initDefineProp(this, 'layoutViewModel', _descriptor3, this);

      _initDefineProp(this, 'layoutModel', _descriptor4, this);

      this.element = element;
      this.container = container;
      this.viewSlot = viewSlot;
      this.router = router;
      this.viewLocator = viewLocator;
      this.compositionTransaction = compositionTransaction;
      this.compositionEngine = compositionEngine;
      this.router.registerViewPort(this, this.element.getAttribute('name'));

      if (!('initialComposition' in compositionTransaction)) {
        compositionTransaction.initialComposition = true;
        this.compositionTransactionNotifier = compositionTransaction.enlist();
      }
    }

    RouterView.prototype.created = function created(owningView) {
      this.owningView = owningView;
    };

    RouterView.prototype.bind = function bind(bindingContext, overrideContext) {
      this.container.viewModel = bindingContext;
      this.overrideContext = overrideContext;
    };

    RouterView.prototype.process = function process(viewPortInstruction, waitToSwap) {
      var _this = this;

      var component = viewPortInstruction.component;
      var childContainer = component.childContainer;
      var viewModel = component.viewModel;
      var viewModelResource = component.viewModelResource;
      var metadata = viewModelResource.metadata;
      var config = component.router.currentInstruction.config;
      var viewPort = config.viewPorts ? config.viewPorts[viewPortInstruction.name] || {} : {};

      childContainer.get(RouterViewLocator)._notify(this);

      var layoutInstruction = {
        viewModel: viewPort.layoutViewModel || config.layoutViewModel || this.layoutViewModel,
        view: viewPort.layoutView || config.layoutView || this.layoutView,
        model: viewPort.layoutModel || config.layoutModel || this.layoutModel,
        router: viewPortInstruction.component.router,
        childContainer: childContainer,
        viewSlot: this.viewSlot
      };

      var viewStrategy = this.viewLocator.getViewStrategy(component.view || viewModel);
      if (viewStrategy && component.view) {
        viewStrategy.makeRelativeTo(_aureliaMetadata.Origin.get(component.router.container.viewModel.constructor).moduleId);
      }

      return metadata.load(childContainer, viewModelResource.value, null, viewStrategy, true).then(function (viewFactory) {
        if (!_this.compositionTransactionNotifier) {
          _this.compositionTransactionOwnershipToken = _this.compositionTransaction.tryCapture();
        }

        if (layoutInstruction.viewModel || layoutInstruction.view) {
          viewPortInstruction.layoutInstruction = layoutInstruction;
        }

        viewPortInstruction.controller = metadata.create(childContainer, _aureliaTemplating.BehaviorInstruction.dynamic(_this.element, viewModel, viewFactory));

        if (waitToSwap) {
          return null;
        }

        _this.swap(viewPortInstruction);
      });
    };

    RouterView.prototype.swap = function swap(viewPortInstruction) {
      var _this2 = this;

      var layoutInstruction = viewPortInstruction.layoutInstruction;
      var previousView = this.view;

      var work = function work() {
        var swapStrategy = _aureliaTemplating.SwapStrategies[_this2.swapOrder] || _aureliaTemplating.SwapStrategies.after;
        var viewSlot = _this2.viewSlot;

        swapStrategy(viewSlot, previousView, function () {
          return Promise.resolve(viewSlot.add(_this2.view));
        }).then(function () {
          _this2._notify();
        });
      };

      var ready = function ready(owningView) {
        viewPortInstruction.controller.automate(_this2.overrideContext, owningView);
        if (_this2.compositionTransactionOwnershipToken) {
          return _this2.compositionTransactionOwnershipToken.waitForCompositionComplete().then(function () {
            _this2.compositionTransactionOwnershipToken = null;
            return work();
          });
        }

        return work();
      };

      if (layoutInstruction) {
        if (!layoutInstruction.viewModel) {
          layoutInstruction.viewModel = {};
        }

        return this.compositionEngine.createController(layoutInstruction).then(function (controller) {
          _aureliaTemplating.ShadowDOM.distributeView(viewPortInstruction.controller.view, controller.slots || controller.view.slots);
          controller.automate((0, _aureliaBinding.createOverrideContext)(layoutInstruction.viewModel), _this2.owningView);
          controller.view.children.push(viewPortInstruction.controller.view);
          return controller.view || controller;
        }).then(function (newView) {
          _this2.view = newView;
          return ready(newView);
        });
      }

      this.view = viewPortInstruction.controller.view;

      return ready(this.owningView);
    };

    RouterView.prototype._notify = function _notify() {
      if (this.compositionTransactionNotifier) {
        this.compositionTransactionNotifier.done();
        this.compositionTransactionNotifier = null;
      }
    };

    return RouterView;
  }(), (_descriptor = _applyDecoratedDescriptor(_class2.prototype, 'swapOrder', [_aureliaTemplating.bindable], {
    enumerable: true,
    initializer: null
  }), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, 'layoutView', [_aureliaTemplating.bindable], {
    enumerable: true,
    initializer: null
  }), _descriptor3 = _applyDecoratedDescriptor(_class2.prototype, 'layoutViewModel', [_aureliaTemplating.bindable], {
    enumerable: true,
    initializer: null
  }), _descriptor4 = _applyDecoratedDescriptor(_class2.prototype, 'layoutModel', [_aureliaTemplating.bindable], {
    enumerable: true,
    initializer: null
  })), _class2)) || _class) || _class);

  var RouterViewLocator = exports.RouterViewLocator = function () {
    function RouterViewLocator() {
      var _this3 = this;

      

      this.promise = new Promise(function (resolve) {
        return _this3.resolve = resolve;
      });
    }

    RouterViewLocator.prototype.findNearest = function findNearest() {
      return this.promise;
    };

    RouterViewLocator.prototype._notify = function _notify(routerView) {
      this.resolve(routerView);
    };

    return RouterViewLocator;
  }();
});
define('aurelia-templating/dist/es2015/aurelia-templating',["exports", "aurelia-logging", "aurelia-metadata", "aurelia-pal", "aurelia-loader", "aurelia-path", "aurelia-binding", "aurelia-dependency-injection", "aurelia-task-queue"], function (_exports, LogManager, _aureliaMetadata, _aureliaPal, _aureliaLoader, _aureliaPath, _aureliaBinding, _aureliaDependencyInjection, _aureliaTaskQueue) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports._hyphenate = _hyphenate;
  _exports._isAllWhitespace = _isAllWhitespace;
  _exports.viewEngineHooks = viewEngineHooks;
  _exports.validateBehaviorName = validateBehaviorName;
  _exports.children = children;
  _exports.child = child;
  _exports.resource = resource;
  _exports.behavior = behavior;
  _exports.customElement = customElement;
  _exports.customAttribute = customAttribute;
  _exports.templateController = templateController;
  _exports.bindable = bindable;
  _exports.dynamicOptions = dynamicOptions;
  _exports.useShadowDOM = useShadowDOM;
  _exports.processAttributes = processAttributes;
  _exports.processContent = processContent;
  _exports.containerless = containerless;
  _exports.useViewStrategy = useViewStrategy;
  _exports.useView = useView;
  _exports.inlineView = inlineView;
  _exports.noView = noView;
  _exports.view = view;
  _exports.elementConfig = elementConfig;
  _exports.viewResources = viewResources;
  _exports.TemplatingEngine = _exports.ElementConfigResource = _exports.CompositionEngine = _exports.SwapStrategies = _exports.HtmlBehaviorResource = _exports.BindableProperty = _exports.BehaviorPropertyObserver = _exports.Controller = _exports.ViewEngine = _exports.ModuleAnalyzer = _exports.ResourceDescription = _exports.ResourceModule = _exports.ViewCompiler = _exports.ViewFactory = _exports.BoundViewFactory = _exports.ViewSlot = _exports.View = _exports.ViewResources = _exports.ShadowDOM = _exports.ShadowSlot = _exports.PassThroughSlot = _exports.SlotCustomAttribute = _exports.BindingLanguage = _exports.ViewLocator = _exports.StaticViewStrategy = _exports.InlineViewStrategy = _exports.TemplateRegistryViewStrategy = _exports.NoViewStrategy = _exports.ConventionalViewStrategy = _exports.RelativeViewStrategy = _exports.viewStrategy = _exports.TargetInstruction = _exports.BehaviorInstruction = _exports.ViewCompileInstruction = _exports.ResourceLoadContext = _exports.ElementEvents = _exports.ViewEngineHooksResource = _exports.CompositionTransaction = _exports.CompositionTransactionOwnershipToken = _exports.CompositionTransactionNotifier = _exports.Animator = _exports.animationEvent = void 0;
  LogManager = _interopRequireWildcard(LogManager);

  function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

  var _class, _temp, _dec, _class2, _dec2, _class3, _dec3, _class4, _dec4, _class5, _dec5, _class6, _dec6, _class7, _class8, _temp2, _class9, _temp3, _class11, _dec7, _class13, _dec8, _class14, _class15, _temp4, _dec9, _class16, _dec10, _class17, _dec11, _class18;

  const animationEvent = {
    enterBegin: 'animation:enter:begin',
    enterActive: 'animation:enter:active',
    enterDone: 'animation:enter:done',
    enterTimeout: 'animation:enter:timeout',
    leaveBegin: 'animation:leave:begin',
    leaveActive: 'animation:leave:active',
    leaveDone: 'animation:leave:done',
    leaveTimeout: 'animation:leave:timeout',
    staggerNext: 'animation:stagger:next',
    removeClassBegin: 'animation:remove-class:begin',
    removeClassActive: 'animation:remove-class:active',
    removeClassDone: 'animation:remove-class:done',
    removeClassTimeout: 'animation:remove-class:timeout',
    addClassBegin: 'animation:add-class:begin',
    addClassActive: 'animation:add-class:active',
    addClassDone: 'animation:add-class:done',
    addClassTimeout: 'animation:add-class:timeout',
    animateBegin: 'animation:animate:begin',
    animateActive: 'animation:animate:active',
    animateDone: 'animation:animate:done',
    animateTimeout: 'animation:animate:timeout',
    sequenceBegin: 'animation:sequence:begin',
    sequenceDone: 'animation:sequence:done'
  };
  _exports.animationEvent = animationEvent;
  let Animator = class Animator {
    enter(element) {
      return Promise.resolve(false);
    }

    leave(element) {
      return Promise.resolve(false);
    }

    removeClass(element, className) {
      element.classList.remove(className);
      return Promise.resolve(false);
    }

    addClass(element, className) {
      element.classList.add(className);
      return Promise.resolve(false);
    }

    animate(element, className) {
      return Promise.resolve(false);
    }

    runSequence(animations) {}

    registerEffect(effectName, properties) {}

    unregisterEffect(effectName) {}

  };
  _exports.Animator = Animator;
  let CompositionTransactionNotifier = class CompositionTransactionNotifier {
    constructor(owner) {
      this.owner = owner;
      this.owner._compositionCount++;
    }

    done() {
      this.owner._compositionCount--;

      this.owner._tryCompleteTransaction();
    }

  };
  _exports.CompositionTransactionNotifier = CompositionTransactionNotifier;
  let CompositionTransactionOwnershipToken = class CompositionTransactionOwnershipToken {
    constructor(owner) {
      this.owner = owner;
      this.owner._ownershipToken = this;
      this.thenable = this._createThenable();
    }

    waitForCompositionComplete() {
      this.owner._tryCompleteTransaction();

      return this.thenable;
    }

    resolve() {
      this._resolveCallback();
    }

    _createThenable() {
      return new Promise((resolve, reject) => {
        this._resolveCallback = resolve;
      });
    }

  };
  _exports.CompositionTransactionOwnershipToken = CompositionTransactionOwnershipToken;
  let CompositionTransaction = class CompositionTransaction {
    constructor() {
      this._ownershipToken = null;
      this._compositionCount = 0;
    }

    tryCapture() {
      return this._ownershipToken === null ? new CompositionTransactionOwnershipToken(this) : null;
    }

    enlist() {
      return new CompositionTransactionNotifier(this);
    }

    _tryCompleteTransaction() {
      if (this._compositionCount <= 0) {
        this._compositionCount = 0;

        if (this._ownershipToken !== null) {
          let token = this._ownershipToken;
          this._ownershipToken = null;
          token.resolve();
        }
      }
    }

  };
  _exports.CompositionTransaction = CompositionTransaction;
  const capitalMatcher = /([A-Z])/g;

  function addHyphenAndLower(char) {
    return '-' + char.toLowerCase();
  }

  function _hyphenate(name) {
    return (name.charAt(0).toLowerCase() + name.slice(1)).replace(capitalMatcher, addHyphenAndLower);
  }

  function _isAllWhitespace(node) {
    return !(node.auInterpolationTarget || /[^\t\n\r ]/.test(node.textContent));
  }

  let ViewEngineHooksResource = class ViewEngineHooksResource {
    constructor() {}

    initialize(container, target) {
      this.instance = container.get(target);
    }

    register(registry, name) {
      registry.registerViewEngineHooks(this.instance);
    }

    load(container, target) {}

    static convention(name) {
      if (name.endsWith('ViewEngineHooks')) {
        return new ViewEngineHooksResource();
      }
    }

  };
  _exports.ViewEngineHooksResource = ViewEngineHooksResource;

  function viewEngineHooks(target) {
    let deco = function (t) {
      _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, new ViewEngineHooksResource(), t);
    };

    return target ? deco(target) : deco;
  }

  let ElementEvents = class ElementEvents {
    constructor(element) {
      this.element = element;
      this.subscriptions = {};
    }

    _enqueueHandler(handler) {
      this.subscriptions[handler.eventName] = this.subscriptions[handler.eventName] || [];
      this.subscriptions[handler.eventName].push(handler);
    }

    _dequeueHandler(handler) {
      let index;
      let subscriptions = this.subscriptions[handler.eventName];

      if (subscriptions) {
        index = subscriptions.indexOf(handler);

        if (index > -1) {
          subscriptions.splice(index, 1);
        }
      }

      return handler;
    }

    publish(eventName, detail = {}, bubbles = true, cancelable = true) {
      let event = _aureliaPal.DOM.createCustomEvent(eventName, {
        cancelable,
        bubbles,
        detail
      });

      this.element.dispatchEvent(event);
    }

    subscribe(eventName, handler, captureOrOptions = true) {
      if (typeof handler === 'function') {
        const eventHandler = new EventHandlerImpl(this, eventName, handler, captureOrOptions, false);
        return eventHandler;
      }

      return undefined;
    }

    subscribeOnce(eventName, handler, captureOrOptions = true) {
      if (typeof handler === 'function') {
        const eventHandler = new EventHandlerImpl(this, eventName, handler, captureOrOptions, true);
        return eventHandler;
      }

      return undefined;
    }

    dispose(eventName) {
      if (eventName && typeof eventName === 'string') {
        let subscriptions = this.subscriptions[eventName];

        if (subscriptions) {
          while (subscriptions.length) {
            let subscription = subscriptions.pop();

            if (subscription) {
              subscription.dispose();
            }
          }
        }
      } else {
        this.disposeAll();
      }
    }

    disposeAll() {
      for (let key in this.subscriptions) {
        this.dispose(key);
      }
    }

  };
  _exports.ElementEvents = ElementEvents;
  let EventHandlerImpl = class EventHandlerImpl {
    constructor(owner, eventName, handler, captureOrOptions, once) {
      this.owner = owner;
      this.eventName = eventName;
      this.handler = handler;
      this.capture = typeof captureOrOptions === 'boolean' ? captureOrOptions : captureOrOptions.capture;
      this.bubbles = !this.capture;
      this.captureOrOptions = captureOrOptions;
      this.once = once;
      owner.element.addEventListener(eventName, this, captureOrOptions);

      owner._enqueueHandler(this);
    }

    handleEvent(e) {
      const fn = this.handler;
      fn(e);

      if (this.once) {
        this.dispose();
      }
    }

    dispose() {
      this.owner.element.removeEventListener(this.eventName, this, this.captureOrOptions);

      this.owner._dequeueHandler(this);

      this.owner = this.handler = null;
    }

  };
  let ResourceLoadContext = class ResourceLoadContext {
    constructor() {
      this.dependencies = {};
    }

    addDependency(url) {
      this.dependencies[url] = true;
    }

    hasDependency(url) {
      return url in this.dependencies;
    }

  };
  _exports.ResourceLoadContext = ResourceLoadContext;
  let ViewCompileInstruction = class ViewCompileInstruction {
    constructor(targetShadowDOM = false, compileSurrogate = false) {
      this.targetShadowDOM = targetShadowDOM;
      this.compileSurrogate = compileSurrogate;
      this.associatedModuleId = null;
    }

  };
  _exports.ViewCompileInstruction = ViewCompileInstruction;
  ViewCompileInstruction.normal = new ViewCompileInstruction();
  let BehaviorInstruction = class BehaviorInstruction {
    static enhance() {
      let instruction = new BehaviorInstruction();
      instruction.enhance = true;
      return instruction;
    }

    static unitTest(type, attributes) {
      let instruction = new BehaviorInstruction();
      instruction.type = type;
      instruction.attributes = attributes || {};
      return instruction;
    }

    static element(node, type) {
      let instruction = new BehaviorInstruction();
      instruction.type = type;
      instruction.attributes = {};
      instruction.anchorIsContainer = !(node.hasAttribute('containerless') || type.containerless);
      instruction.initiatedByBehavior = true;
      return instruction;
    }

    static attribute(attrName, type) {
      let instruction = new BehaviorInstruction();
      instruction.attrName = attrName;
      instruction.type = type || null;
      instruction.attributes = {};
      return instruction;
    }

    static dynamic(host, viewModel, viewFactory) {
      let instruction = new BehaviorInstruction();
      instruction.host = host;
      instruction.viewModel = viewModel;
      instruction.viewFactory = viewFactory;
      instruction.inheritBindingContext = true;
      return instruction;
    }

  };
  _exports.BehaviorInstruction = BehaviorInstruction;
  const biProto = BehaviorInstruction.prototype;
  biProto.initiatedByBehavior = false;
  biProto.enhance = false;
  biProto.partReplacements = null;
  biProto.viewFactory = null;
  biProto.originalAttrName = null;
  biProto.skipContentProcessing = false;
  biProto.contentFactory = null;
  biProto.viewModel = null;
  biProto.anchorIsContainer = false;
  biProto.host = null;
  biProto.attributes = null;
  biProto.type = null;
  biProto.attrName = null;
  biProto.inheritBindingContext = false;
  BehaviorInstruction.normal = new BehaviorInstruction();
  let TargetInstruction = (_temp = _class = class TargetInstruction {
    static shadowSlot(parentInjectorId) {
      let instruction = new TargetInstruction();
      instruction.parentInjectorId = parentInjectorId;
      instruction.shadowSlot = true;
      return instruction;
    }

    static contentExpression(expression) {
      let instruction = new TargetInstruction();
      instruction.contentExpression = expression;
      return instruction;
    }

    static letElement(expressions) {
      let instruction = new TargetInstruction();
      instruction.expressions = expressions;
      instruction.letElement = true;
      return instruction;
    }

    static lifting(parentInjectorId, liftingInstruction) {
      let instruction = new TargetInstruction();
      instruction.parentInjectorId = parentInjectorId;
      instruction.expressions = TargetInstruction.noExpressions;
      instruction.behaviorInstructions = [liftingInstruction];
      instruction.viewFactory = liftingInstruction.viewFactory;
      instruction.providers = [liftingInstruction.type.target];
      instruction.lifting = true;
      return instruction;
    }

    static normal(injectorId, parentInjectorId, providers, behaviorInstructions, expressions, elementInstruction) {
      let instruction = new TargetInstruction();
      instruction.injectorId = injectorId;
      instruction.parentInjectorId = parentInjectorId;
      instruction.providers = providers;
      instruction.behaviorInstructions = behaviorInstructions;
      instruction.expressions = expressions;
      instruction.anchorIsContainer = elementInstruction ? elementInstruction.anchorIsContainer : true;
      instruction.elementInstruction = elementInstruction;
      return instruction;
    }

    static surrogate(providers, behaviorInstructions, expressions, values) {
      let instruction = new TargetInstruction();
      instruction.expressions = expressions;
      instruction.behaviorInstructions = behaviorInstructions;
      instruction.providers = providers;
      instruction.values = values;
      return instruction;
    }

  }, _class.noExpressions = Object.freeze([]), _temp);
  _exports.TargetInstruction = TargetInstruction;
  const tiProto = TargetInstruction.prototype;
  tiProto.injectorId = null;
  tiProto.parentInjectorId = null;
  tiProto.shadowSlot = false;
  tiProto.slotName = null;
  tiProto.slotFallbackFactory = null;
  tiProto.contentExpression = null;
  tiProto.letElement = false;
  tiProto.expressions = null;
  tiProto.expressions = null;
  tiProto.providers = null;
  tiProto.viewFactory = null;
  tiProto.anchorIsContainer = false;
  tiProto.elementInstruction = null;
  tiProto.lifting = false;
  tiProto.values = null;

  const viewStrategy = _aureliaMetadata.protocol.create('aurelia:view-strategy', {
    validate(target) {
      if (!(typeof target.loadViewFactory === 'function')) {
        return 'View strategies must implement: loadViewFactory(viewEngine: ViewEngine, compileInstruction: ViewCompileInstruction, loadContext?: ResourceLoadContext): Promise<ViewFactory>';
      }

      return true;
    },

    compose(target) {
      if (!(typeof target.makeRelativeTo === 'function')) {
        target.makeRelativeTo = _aureliaPal.PLATFORM.noop;
      }
    }

  });

  _exports.viewStrategy = viewStrategy;
  let RelativeViewStrategy = (_dec = viewStrategy(), _dec(_class2 = class RelativeViewStrategy {
    constructor(path) {
      this.path = path;
      this.absolutePath = null;
    }

    loadViewFactory(viewEngine, compileInstruction, loadContext, target) {
      if (this.absolutePath === null && this.moduleId) {
        this.absolutePath = (0, _aureliaPath.relativeToFile)(this.path, this.moduleId);
      }

      compileInstruction.associatedModuleId = this.moduleId;
      return viewEngine.loadViewFactory(this.absolutePath || this.path, compileInstruction, loadContext, target);
    }

    makeRelativeTo(file) {
      if (this.absolutePath === null) {
        this.absolutePath = (0, _aureliaPath.relativeToFile)(this.path, file);
      }
    }

  }) || _class2);
  _exports.RelativeViewStrategy = RelativeViewStrategy;
  let ConventionalViewStrategy = (_dec2 = viewStrategy(), _dec2(_class3 = class ConventionalViewStrategy {
    constructor(viewLocator, origin) {
      this.moduleId = origin.moduleId;
      this.viewUrl = viewLocator.convertOriginToViewUrl(origin);
    }

    loadViewFactory(viewEngine, compileInstruction, loadContext, target) {
      compileInstruction.associatedModuleId = this.moduleId;
      return viewEngine.loadViewFactory(this.viewUrl, compileInstruction, loadContext, target);
    }

  }) || _class3);
  _exports.ConventionalViewStrategy = ConventionalViewStrategy;
  let NoViewStrategy = (_dec3 = viewStrategy(), _dec3(_class4 = class NoViewStrategy {
    constructor(dependencies, dependencyBaseUrl) {
      this.dependencies = dependencies || null;
      this.dependencyBaseUrl = dependencyBaseUrl || '';
    }

    loadViewFactory(viewEngine, compileInstruction, loadContext, target) {
      let entry = this.entry;
      let dependencies = this.dependencies;

      if (entry && entry.factoryIsReady) {
        return Promise.resolve(null);
      }

      this.entry = entry = new _aureliaLoader.TemplateRegistryEntry(this.moduleId || this.dependencyBaseUrl);
      entry.dependencies = [];
      entry.templateIsLoaded = true;

      if (dependencies !== null) {
        for (let i = 0, ii = dependencies.length; i < ii; ++i) {
          let current = dependencies[i];

          if (typeof current === 'string' || typeof current === 'function') {
            entry.addDependency(current);
          } else {
            entry.addDependency(current.from, current.as);
          }
        }
      }

      compileInstruction.associatedModuleId = this.moduleId;
      return viewEngine.loadViewFactory(entry, compileInstruction, loadContext, target);
    }

  }) || _class4);
  _exports.NoViewStrategy = NoViewStrategy;
  let TemplateRegistryViewStrategy = (_dec4 = viewStrategy(), _dec4(_class5 = class TemplateRegistryViewStrategy {
    constructor(moduleId, entry) {
      this.moduleId = moduleId;
      this.entry = entry;
    }

    loadViewFactory(viewEngine, compileInstruction, loadContext, target) {
      let entry = this.entry;

      if (entry.factoryIsReady) {
        return Promise.resolve(entry.factory);
      }

      compileInstruction.associatedModuleId = this.moduleId;
      return viewEngine.loadViewFactory(entry, compileInstruction, loadContext, target);
    }

  }) || _class5);
  _exports.TemplateRegistryViewStrategy = TemplateRegistryViewStrategy;
  let InlineViewStrategy = (_dec5 = viewStrategy(), _dec5(_class6 = class InlineViewStrategy {
    constructor(markup, dependencies, dependencyBaseUrl) {
      this.markup = markup;
      this.dependencies = dependencies || null;
      this.dependencyBaseUrl = dependencyBaseUrl || '';
    }

    loadViewFactory(viewEngine, compileInstruction, loadContext, target) {
      let entry = this.entry;
      let dependencies = this.dependencies;

      if (entry && entry.factoryIsReady) {
        return Promise.resolve(entry.factory);
      }

      this.entry = entry = new _aureliaLoader.TemplateRegistryEntry(this.moduleId || this.dependencyBaseUrl);
      entry.template = _aureliaPal.DOM.createTemplateFromMarkup(this.markup);

      if (dependencies !== null) {
        for (let i = 0, ii = dependencies.length; i < ii; ++i) {
          let current = dependencies[i];

          if (typeof current === 'string' || typeof current === 'function') {
            entry.addDependency(current);
          } else {
            entry.addDependency(current.from, current.as);
          }
        }
      }

      compileInstruction.associatedModuleId = this.moduleId;
      return viewEngine.loadViewFactory(entry, compileInstruction, loadContext, target);
    }

  }) || _class6);
  _exports.InlineViewStrategy = InlineViewStrategy;
  let StaticViewStrategy = (_dec6 = viewStrategy(), _dec6(_class7 = class StaticViewStrategy {
    constructor(config) {
      if (typeof config === 'string' || config instanceof _aureliaPal.DOM.Element && config.tagName === 'TEMPLATE') {
        config = {
          template: config
        };
      }

      this.template = config.template;
      this.dependencies = config.dependencies || [];
      this.factoryIsReady = false;
      this.onReady = null;
      this.moduleId = 'undefined';
    }

    loadViewFactory(viewEngine, compileInstruction, loadContext, target) {
      if (this.factoryIsReady) {
        return Promise.resolve(this.factory);
      }

      let deps = this.dependencies;
      deps = typeof deps === 'function' ? deps() : deps;
      deps = deps ? deps : [];
      deps = Array.isArray(deps) ? deps : [deps];
      return Promise.all(deps).then(dependencies => {
        const container = viewEngine.container;
        const appResources = viewEngine.appResources;
        const viewCompiler = viewEngine.viewCompiler;
        const viewResources = new ViewResources(appResources);
        let resource;
        let elDeps = [];

        if (target) {
          viewResources.autoRegister(container, target);
        }

        for (let dep of dependencies) {
          if (typeof dep === 'function') {
            resource = viewResources.autoRegister(container, dep);

            if (resource.elementName !== null) {
              elDeps.push(resource);
            }
          } else if (dep && typeof dep === 'object') {
            for (let key in dep) {
              let exported = dep[key];

              if (typeof exported === 'function') {
                resource = viewResources.autoRegister(container, exported);

                if (resource.elementName !== null) {
                  elDeps.push(resource);
                }
              }
            }
          } else {
            throw new Error(`dependency neither function nor object. Received: "${typeof dep}"`);
          }
        }

        return Promise.all(elDeps.map(el => el.load(container, el.target))).then(() => {
          const factory = this.template !== null ? viewCompiler.compile(this.template, viewResources, compileInstruction) : null;
          this.factoryIsReady = true;
          this.factory = factory;
          return factory;
        });
      });
    }

  }) || _class7);
  _exports.StaticViewStrategy = StaticViewStrategy;
  let ViewLocator = (_temp2 = _class8 = class ViewLocator {
    getViewStrategy(value) {
      if (!value) {
        return null;
      }

      if (typeof value === 'object' && 'getViewStrategy' in value) {
        let origin = _aureliaMetadata.Origin.get(value.constructor);

        value = value.getViewStrategy();

        if (typeof value === 'string') {
          value = new RelativeViewStrategy(value);
        }

        viewStrategy.assert(value);

        if (origin.moduleId) {
          value.makeRelativeTo(origin.moduleId);
        }

        return value;
      }

      if (typeof value === 'string') {
        value = new RelativeViewStrategy(value);
      }

      if (viewStrategy.validate(value)) {
        return value;
      }

      if (typeof value !== 'function') {
        value = value.constructor;
      }

      if ('$view' in value) {
        let c = value.$view;
        let view;
        c = typeof c === 'function' ? c.call(value) : c;

        if (c === null) {
          view = new NoViewStrategy();
        } else {
          view = c instanceof StaticViewStrategy ? c : new StaticViewStrategy(c);
        }

        _aureliaMetadata.metadata.define(ViewLocator.viewStrategyMetadataKey, view, value);

        return view;
      }

      let origin = _aureliaMetadata.Origin.get(value);

      let strategy = _aureliaMetadata.metadata.get(ViewLocator.viewStrategyMetadataKey, value);

      if (!strategy) {
        if (!origin.moduleId) {
          throw new Error('Cannot determine default view strategy for object.', value);
        }

        strategy = this.createFallbackViewStrategy(origin);
      } else if (origin.moduleId) {
        strategy.moduleId = origin.moduleId;
      }

      return strategy;
    }

    createFallbackViewStrategy(origin) {
      return new ConventionalViewStrategy(this, origin);
    }

    convertOriginToViewUrl(origin) {
      let moduleId = origin.moduleId;
      let id = moduleId.endsWith('.js') || moduleId.endsWith('.ts') ? moduleId.substring(0, moduleId.length - 3) : moduleId;
      return id + '.html';
    }

  }, _class8.viewStrategyMetadataKey = 'aurelia:view-strategy', _temp2);
  _exports.ViewLocator = ViewLocator;

  function mi(name) {
    throw new Error(`BindingLanguage must implement ${name}().`);
  }

  let BindingLanguage = class BindingLanguage {
    inspectAttribute(resources, elementName, attrName, attrValue) {
      mi('inspectAttribute');
    }

    createAttributeInstruction(resources, element, info, existingInstruction) {
      mi('createAttributeInstruction');
    }

    createLetExpressions(resources, element) {
      mi('createLetExpressions');
    }

    inspectTextContent(resources, value) {
      mi('inspectTextContent');
    }

  };
  _exports.BindingLanguage = BindingLanguage;
  let noNodes = Object.freeze([]);
  let SlotCustomAttribute = class SlotCustomAttribute {
    static inject() {
      return [_aureliaPal.DOM.Element];
    }

    constructor(element) {
      this.element = element;
      this.element.auSlotAttribute = this;
    }

    valueChanged(newValue, oldValue) {}

  };
  _exports.SlotCustomAttribute = SlotCustomAttribute;
  let PassThroughSlot = class PassThroughSlot {
    constructor(anchor, name, destinationName, fallbackFactory) {
      this.anchor = anchor;
      this.anchor.viewSlot = this;
      this.name = name;
      this.destinationName = destinationName;
      this.fallbackFactory = fallbackFactory;
      this.destinationSlot = null;
      this.projections = 0;
      this.contentView = null;
      let attr = new SlotCustomAttribute(this.anchor);
      attr.value = this.destinationName;
    }

    get needsFallbackRendering() {
      return this.fallbackFactory && this.projections === 0;
    }

    renderFallbackContent(view, nodes, projectionSource, index) {
      if (this.contentView === null) {
        this.contentView = this.fallbackFactory.create(this.ownerView.container);
        this.contentView.bind(this.ownerView.bindingContext, this.ownerView.overrideContext);
        let slots = Object.create(null);
        slots[this.destinationSlot.name] = this.destinationSlot;
        ShadowDOM.distributeView(this.contentView, slots, projectionSource, index, this.destinationSlot.name);
      }
    }

    passThroughTo(destinationSlot) {
      this.destinationSlot = destinationSlot;
    }

    addNode(view, node, projectionSource, index) {
      if (this.contentView !== null) {
        this.contentView.removeNodes();
        this.contentView.detached();
        this.contentView.unbind();
        this.contentView = null;
      }

      if (node.viewSlot instanceof PassThroughSlot) {
        node.viewSlot.passThroughTo(this);
        return;
      }

      this.projections++;
      this.destinationSlot.addNode(view, node, projectionSource, index);
    }

    removeView(view, projectionSource) {
      this.projections--;
      this.destinationSlot.removeView(view, projectionSource);

      if (this.needsFallbackRendering) {
        this.renderFallbackContent(null, noNodes, projectionSource);
      }
    }

    removeAll(projectionSource) {
      this.projections = 0;
      this.destinationSlot.removeAll(projectionSource);

      if (this.needsFallbackRendering) {
        this.renderFallbackContent(null, noNodes, projectionSource);
      }
    }

    projectFrom(view, projectionSource) {
      this.destinationSlot.projectFrom(view, projectionSource);
    }

    created(ownerView) {
      this.ownerView = ownerView;
    }

    bind(view) {
      if (this.contentView) {
        this.contentView.bind(view.bindingContext, view.overrideContext);
      }
    }

    attached() {
      if (this.contentView) {
        this.contentView.attached();
      }
    }

    detached() {
      if (this.contentView) {
        this.contentView.detached();
      }
    }

    unbind() {
      if (this.contentView) {
        this.contentView.unbind();
      }
    }

  };
  _exports.PassThroughSlot = PassThroughSlot;
  let ShadowSlot = class ShadowSlot {
    constructor(anchor, name, fallbackFactory) {
      this.anchor = anchor;
      this.anchor.isContentProjectionSource = true;
      this.anchor.viewSlot = this;
      this.name = name;
      this.fallbackFactory = fallbackFactory;
      this.contentView = null;
      this.projections = 0;
      this.children = [];
      this.projectFromAnchors = null;
      this.destinationSlots = null;
    }

    get needsFallbackRendering() {
      return this.fallbackFactory && this.projections === 0;
    }

    addNode(view, node, projectionSource, index, destination) {
      if (this.contentView !== null) {
        this.contentView.removeNodes();
        this.contentView.detached();
        this.contentView.unbind();
        this.contentView = null;
      }

      if (node.viewSlot instanceof PassThroughSlot) {
        node.viewSlot.passThroughTo(this);
        return;
      }

      if (this.destinationSlots !== null) {
        ShadowDOM.distributeNodes(view, [node], this.destinationSlots, this, index);
      } else {
        node.auOwnerView = view;
        node.auProjectionSource = projectionSource;
        node.auAssignedSlot = this;

        let anchor = this._findAnchor(view, node, projectionSource, index);

        let parent = anchor.parentNode;
        parent.insertBefore(node, anchor);
        this.children.push(node);
        this.projections++;
      }
    }

    removeView(view, projectionSource) {
      if (this.destinationSlots !== null) {
        ShadowDOM.undistributeView(view, this.destinationSlots, this);
      } else if (this.contentView && this.contentView.hasSlots) {
        ShadowDOM.undistributeView(view, this.contentView.slots, projectionSource);
      } else {
        let found = this.children.find(x => x.auSlotProjectFrom === projectionSource);

        if (found) {
          let children = found.auProjectionChildren;

          for (let i = 0, ii = children.length; i < ii; ++i) {
            let child = children[i];

            if (child.auOwnerView === view) {
              children.splice(i, 1);
              view.fragment.appendChild(child);
              i--;
              ii--;
              this.projections--;
            }
          }

          if (this.needsFallbackRendering) {
            this.renderFallbackContent(view, noNodes, projectionSource);
          }
        }
      }
    }

    removeAll(projectionSource) {
      if (this.destinationSlots !== null) {
        ShadowDOM.undistributeAll(this.destinationSlots, this);
      } else if (this.contentView && this.contentView.hasSlots) {
        ShadowDOM.undistributeAll(this.contentView.slots, projectionSource);
      } else {
        let found = this.children.find(x => x.auSlotProjectFrom === projectionSource);

        if (found) {
          let children = found.auProjectionChildren;

          for (let i = 0, ii = children.length; i < ii; ++i) {
            let child = children[i];
            child.auOwnerView.fragment.appendChild(child);
            this.projections--;
          }

          found.auProjectionChildren = [];

          if (this.needsFallbackRendering) {
            this.renderFallbackContent(null, noNodes, projectionSource);
          }
        }
      }
    }

    _findAnchor(view, node, projectionSource, index) {
      if (projectionSource) {
        let found = this.children.find(x => x.auSlotProjectFrom === projectionSource);

        if (found) {
          if (index !== undefined) {
            let children = found.auProjectionChildren;
            let viewIndex = -1;
            let lastView;

            for (let i = 0, ii = children.length; i < ii; ++i) {
              let current = children[i];

              if (current.auOwnerView !== lastView) {
                viewIndex++;
                lastView = current.auOwnerView;

                if (viewIndex >= index && lastView !== view) {
                  children.splice(i, 0, node);
                  return current;
                }
              }
            }
          }

          found.auProjectionChildren.push(node);
          return found;
        }
      }

      return this.anchor;
    }

    projectTo(slots) {
      this.destinationSlots = slots;
    }

    projectFrom(view, projectionSource) {
      let anchor = _aureliaPal.DOM.createComment('anchor');

      let parent = this.anchor.parentNode;
      anchor.auSlotProjectFrom = projectionSource;
      anchor.auOwnerView = view;
      anchor.auProjectionChildren = [];
      parent.insertBefore(anchor, this.anchor);
      this.children.push(anchor);

      if (this.projectFromAnchors === null) {
        this.projectFromAnchors = [];
      }

      this.projectFromAnchors.push(anchor);
    }

    renderFallbackContent(view, nodes, projectionSource, index) {
      if (this.contentView === null) {
        this.contentView = this.fallbackFactory.create(this.ownerView.container);
        this.contentView.bind(this.ownerView.bindingContext, this.ownerView.overrideContext);
        this.contentView.insertNodesBefore(this.anchor);
      }

      if (this.contentView.hasSlots) {
        let slots = this.contentView.slots;
        let projectFromAnchors = this.projectFromAnchors;

        if (projectFromAnchors !== null) {
          for (let slotName in slots) {
            let slot = slots[slotName];

            for (let i = 0, ii = projectFromAnchors.length; i < ii; ++i) {
              let anchor = projectFromAnchors[i];
              slot.projectFrom(anchor.auOwnerView, anchor.auSlotProjectFrom);
            }
          }
        }

        this.fallbackSlots = slots;
        ShadowDOM.distributeNodes(view, nodes, slots, projectionSource, index);
      }
    }

    created(ownerView) {
      this.ownerView = ownerView;
    }

    bind(view) {
      if (this.contentView) {
        this.contentView.bind(view.bindingContext, view.overrideContext);
      }
    }

    attached() {
      if (this.contentView) {
        this.contentView.attached();
      }
    }

    detached() {
      if (this.contentView) {
        this.contentView.detached();
      }
    }

    unbind() {
      if (this.contentView) {
        this.contentView.unbind();
      }
    }

  };
  _exports.ShadowSlot = ShadowSlot;
  let ShadowDOM = (_temp3 = _class9 = class ShadowDOM {
    static getSlotName(node) {
      if (node.auSlotAttribute === undefined) {
        return ShadowDOM.defaultSlotKey;
      }

      return node.auSlotAttribute.value;
    }

    static distributeView(view, slots, projectionSource, index, destinationOverride) {
      let nodes;

      if (view === null) {
        nodes = noNodes;
      } else {
        let childNodes = view.fragment.childNodes;
        let ii = childNodes.length;
        nodes = new Array(ii);

        for (let i = 0; i < ii; ++i) {
          nodes[i] = childNodes[i];
        }
      }

      ShadowDOM.distributeNodes(view, nodes, slots, projectionSource, index, destinationOverride);
    }

    static undistributeView(view, slots, projectionSource) {
      for (let slotName in slots) {
        slots[slotName].removeView(view, projectionSource);
      }
    }

    static undistributeAll(slots, projectionSource) {
      for (let slotName in slots) {
        slots[slotName].removeAll(projectionSource);
      }
    }

    static distributeNodes(view, nodes, slots, projectionSource, index, destinationOverride) {
      for (let i = 0, ii = nodes.length; i < ii; ++i) {
        let currentNode = nodes[i];
        let nodeType = currentNode.nodeType;

        if (currentNode.isContentProjectionSource) {
          currentNode.viewSlot.projectTo(slots);

          for (let slotName in slots) {
            slots[slotName].projectFrom(view, currentNode.viewSlot);
          }

          nodes.splice(i, 1);
          ii--;
          i--;
        } else if (nodeType === 1 || nodeType === 3 || currentNode.viewSlot instanceof PassThroughSlot) {
          if (nodeType === 3 && _isAllWhitespace(currentNode)) {
            nodes.splice(i, 1);
            ii--;
            i--;
          } else {
            let found = slots[destinationOverride || ShadowDOM.getSlotName(currentNode)];

            if (found) {
              found.addNode(view, currentNode, projectionSource, index);
              nodes.splice(i, 1);
              ii--;
              i--;
            }
          }
        } else {
          nodes.splice(i, 1);
          ii--;
          i--;
        }
      }

      for (let slotName in slots) {
        let slot = slots[slotName];

        if (slot.needsFallbackRendering) {
          slot.renderFallbackContent(view, nodes, projectionSource, index);
        }
      }
    }

  }, _class9.defaultSlotKey = '__au-default-slot-key__', _temp3);
  _exports.ShadowDOM = ShadowDOM;

  function register(lookup, name, resource, type) {
    if (!name) {
      return;
    }

    let existing = lookup[name];

    if (existing) {
      if (existing !== resource) {
        throw new Error(`Attempted to register ${type} when one with the same name already exists. Name: ${name}.`);
      }

      return;
    }

    lookup[name] = resource;
  }

  function validateBehaviorName(name, type) {
    if (/[A-Z]/.test(name)) {
      let newName = _hyphenate(name);

      LogManager.getLogger('templating').warn(`'${name}' is not a valid ${type} name and has been converted to '${newName}'. Upper-case letters are not allowed because the DOM is not case-sensitive.`);
      return newName;
    }

    return name;
  }

  const conventionMark = '__au_resource__';
  let ViewResources = class ViewResources {
    static convention(target, existing) {
      let resource;

      if (existing && conventionMark in existing) {
        return existing;
      }

      if ('$resource' in target) {
        let config = target.$resource;

        if (typeof config === 'string') {
          resource = existing || new HtmlBehaviorResource();
          resource[conventionMark] = true;

          if (!resource.elementName) {
            resource.elementName = validateBehaviorName(config, 'custom element');
          }
        } else {
          if (typeof config === 'function') {
            config = config.call(target);
          }

          if (typeof config === 'string') {
            config = {
              name: config
            };
          }

          config = Object.assign({}, config);
          let resourceType = config.type || 'element';
          let name = config.name;

          switch (resourceType) {
            case 'element':
            case 'attribute':
              resource = existing || new HtmlBehaviorResource();
              resource[conventionMark] = true;

              if (resourceType === 'element') {
                if (!resource.elementName) {
                  resource.elementName = name ? validateBehaviorName(name, 'custom element') : _hyphenate(target.name);
                }
              } else {
                if (!resource.attributeName) {
                  resource.attributeName = name ? validateBehaviorName(name, 'custom attribute') : _hyphenate(target.name);
                }
              }

              if ('templateController' in config) {
                config.liftsContent = config.templateController;
                delete config.templateController;
              }

              if ('defaultBindingMode' in config && resource.attributeDefaultBindingMode !== undefined) {
                config.attributeDefaultBindingMode = config.defaultBindingMode;
                delete config.defaultBindingMode;
              }

              delete config.name;
              Object.assign(resource, config);
              break;

            case 'valueConverter':
              resource = new _aureliaBinding.ValueConverterResource((0, _aureliaBinding.camelCase)(name || target.name));
              break;

            case 'bindingBehavior':
              resource = new _aureliaBinding.BindingBehaviorResource((0, _aureliaBinding.camelCase)(name || target.name));
              break;

            case 'viewEngineHooks':
              resource = new ViewEngineHooksResource();
              break;
          }
        }

        if (resource instanceof HtmlBehaviorResource) {
          let bindables = typeof config === 'string' ? undefined : config.bindables;
          let currentProps = resource.properties;

          if (Array.isArray(bindables)) {
            for (let i = 0, ii = bindables.length; ii > i; ++i) {
              let prop = bindables[i];

              if (!prop || typeof prop !== 'string' && !prop.name) {
                throw new Error(`Invalid bindable property at "${i}" for class "${target.name}". Expected either a string or an object with "name" property.`);
              }

              let newProp = new BindableProperty(prop);
              let existed = false;

              for (let j = 0, jj = currentProps.length; jj > j; ++j) {
                if (currentProps[j].name === newProp.name) {
                  existed = true;
                  break;
                }
              }

              if (existed) {
                continue;
              }

              newProp.registerWith(target, resource);
            }
          }
        }
      }

      return resource;
    }

    constructor(parent, viewUrl) {
      this.bindingLanguage = null;
      this.parent = parent || null;
      this.hasParent = this.parent !== null;
      this.viewUrl = viewUrl || '';
      this.lookupFunctions = {
        valueConverters: this.getValueConverter.bind(this),
        bindingBehaviors: this.getBindingBehavior.bind(this)
      };
      this.attributes = Object.create(null);
      this.elements = Object.create(null);
      this.valueConverters = Object.create(null);
      this.bindingBehaviors = Object.create(null);
      this.attributeMap = Object.create(null);
      this.values = Object.create(null);
      this.beforeCompile = this.afterCompile = this.beforeCreate = this.afterCreate = this.beforeBind = this.beforeUnbind = false;
    }

    _tryAddHook(obj, name) {
      if (typeof obj[name] === 'function') {
        let func = obj[name].bind(obj);
        let counter = 1;
        let callbackName;

        while (this[callbackName = name + counter.toString()] !== undefined) {
          counter++;
        }

        this[name] = true;
        this[callbackName] = func;
      }
    }

    _invokeHook(name, one, two, three, four) {
      if (this.hasParent) {
        this.parent._invokeHook(name, one, two, three, four);
      }

      if (this[name]) {
        this[name + '1'](one, two, three, four);
        let callbackName = name + '2';

        if (this[callbackName]) {
          this[callbackName](one, two, three, four);
          callbackName = name + '3';

          if (this[callbackName]) {
            this[callbackName](one, two, three, four);
            let counter = 4;

            while (this[callbackName = name + counter.toString()] !== undefined) {
              this[callbackName](one, two, three, four);
              counter++;
            }
          }
        }
      }
    }

    registerViewEngineHooks(hooks) {
      this._tryAddHook(hooks, 'beforeCompile');

      this._tryAddHook(hooks, 'afterCompile');

      this._tryAddHook(hooks, 'beforeCreate');

      this._tryAddHook(hooks, 'afterCreate');

      this._tryAddHook(hooks, 'beforeBind');

      this._tryAddHook(hooks, 'beforeUnbind');
    }

    getBindingLanguage(bindingLanguageFallback) {
      return this.bindingLanguage || (this.bindingLanguage = bindingLanguageFallback);
    }

    patchInParent(newParent) {
      let originalParent = this.parent;
      this.parent = newParent || null;
      this.hasParent = this.parent !== null;

      if (newParent.parent === null) {
        newParent.parent = originalParent;
        newParent.hasParent = originalParent !== null;
      }
    }

    relativeToView(path) {
      return (0, _aureliaPath.relativeToFile)(path, this.viewUrl);
    }

    registerElement(tagName, behavior) {
      register(this.elements, tagName, behavior, 'an Element');
    }

    getElement(tagName) {
      return this.elements[tagName] || (this.hasParent ? this.parent.getElement(tagName) : null);
    }

    mapAttribute(attribute) {
      return this.attributeMap[attribute] || (this.hasParent ? this.parent.mapAttribute(attribute) : null);
    }

    registerAttribute(attribute, behavior, knownAttribute) {
      this.attributeMap[attribute] = knownAttribute;
      register(this.attributes, attribute, behavior, 'an Attribute');
    }

    getAttribute(attribute) {
      return this.attributes[attribute] || (this.hasParent ? this.parent.getAttribute(attribute) : null);
    }

    registerValueConverter(name, valueConverter) {
      register(this.valueConverters, name, valueConverter, 'a ValueConverter');
    }

    getValueConverter(name) {
      return this.valueConverters[name] || (this.hasParent ? this.parent.getValueConverter(name) : null);
    }

    registerBindingBehavior(name, bindingBehavior) {
      register(this.bindingBehaviors, name, bindingBehavior, 'a BindingBehavior');
    }

    getBindingBehavior(name) {
      return this.bindingBehaviors[name] || (this.hasParent ? this.parent.getBindingBehavior(name) : null);
    }

    registerValue(name, value) {
      register(this.values, name, value, 'a value');
    }

    getValue(name) {
      return this.values[name] || (this.hasParent ? this.parent.getValue(name) : null);
    }

    autoRegister(container, impl) {
      let resourceTypeMeta = _aureliaMetadata.metadata.getOwn(_aureliaMetadata.metadata.resource, impl);

      if (resourceTypeMeta) {
        if (resourceTypeMeta instanceof HtmlBehaviorResource) {
          ViewResources.convention(impl, resourceTypeMeta);

          if (resourceTypeMeta.attributeName === null && resourceTypeMeta.elementName === null) {
            HtmlBehaviorResource.convention(impl.name, resourceTypeMeta);
          }

          if (resourceTypeMeta.attributeName === null && resourceTypeMeta.elementName === null) {
            resourceTypeMeta.elementName = _hyphenate(impl.name);
          }
        }
      } else {
        resourceTypeMeta = ViewResources.convention(impl) || HtmlBehaviorResource.convention(impl.name) || _aureliaBinding.ValueConverterResource.convention(impl.name) || _aureliaBinding.BindingBehaviorResource.convention(impl.name) || ViewEngineHooksResource.convention(impl.name);

        if (!resourceTypeMeta) {
          resourceTypeMeta = new HtmlBehaviorResource();
          resourceTypeMeta.elementName = _hyphenate(impl.name);
        }

        _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, resourceTypeMeta, impl);
      }

      resourceTypeMeta.initialize(container, impl);
      resourceTypeMeta.register(this);
      return resourceTypeMeta;
    }

  };
  _exports.ViewResources = ViewResources;
  let View = class View {
    constructor(container, viewFactory, fragment, controllers, bindings, children, slots) {
      this.container = container;
      this.viewFactory = viewFactory;
      this.resources = viewFactory.resources;
      this.fragment = fragment;
      this.firstChild = fragment.firstChild;
      this.lastChild = fragment.lastChild;
      this.controllers = controllers;
      this.bindings = bindings;
      this.children = children;
      this.slots = slots;
      this.hasSlots = false;
      this.fromCache = false;
      this.isBound = false;
      this.isAttached = false;
      this.bindingContext = null;
      this.overrideContext = null;
      this.controller = null;
      this.viewModelScope = null;
      this.animatableElement = undefined;
      this._isUserControlled = false;
      this.contentView = null;

      for (let key in slots) {
        this.hasSlots = true;
        break;
      }
    }

    returnToCache() {
      this.viewFactory.returnViewToCache(this);
    }

    created() {
      let i;
      let ii;
      let controllers = this.controllers;

      for (i = 0, ii = controllers.length; i < ii; ++i) {
        controllers[i].created(this);
      }
    }

    bind(bindingContext, overrideContext, _systemUpdate) {
      let controllers;
      let bindings;
      let children;
      let i;
      let ii;

      if (_systemUpdate && this._isUserControlled) {
        return;
      }

      if (this.isBound) {
        if (this.bindingContext === bindingContext) {
          return;
        }

        this.unbind();
      }

      this.isBound = true;
      this.bindingContext = bindingContext;
      this.overrideContext = overrideContext || (0, _aureliaBinding.createOverrideContext)(bindingContext);

      this.resources._invokeHook('beforeBind', this);

      bindings = this.bindings;

      for (i = 0, ii = bindings.length; i < ii; ++i) {
        bindings[i].bind(this);
      }

      if (this.viewModelScope !== null) {
        bindingContext.bind(this.viewModelScope.bindingContext, this.viewModelScope.overrideContext);
        this.viewModelScope = null;
      }

      controllers = this.controllers;

      for (i = 0, ii = controllers.length; i < ii; ++i) {
        controllers[i].bind(this);
      }

      children = this.children;

      for (i = 0, ii = children.length; i < ii; ++i) {
        children[i].bind(bindingContext, overrideContext, true);
      }

      if (this.hasSlots) {
        ShadowDOM.distributeView(this.contentView, this.slots);
      }
    }

    addBinding(binding) {
      this.bindings.push(binding);

      if (this.isBound) {
        binding.bind(this);
      }
    }

    unbind() {
      let controllers;
      let bindings;
      let children;
      let i;
      let ii;

      if (this.isBound) {
        this.isBound = false;

        this.resources._invokeHook('beforeUnbind', this);

        if (this.controller !== null) {
          this.controller.unbind();
        }

        bindings = this.bindings;

        for (i = 0, ii = bindings.length; i < ii; ++i) {
          bindings[i].unbind();
        }

        controllers = this.controllers;

        for (i = 0, ii = controllers.length; i < ii; ++i) {
          controllers[i].unbind();
        }

        children = this.children;

        for (i = 0, ii = children.length; i < ii; ++i) {
          children[i].unbind();
        }

        this.bindingContext = null;
        this.overrideContext = null;
      }
    }

    insertNodesBefore(refNode) {
      refNode.parentNode.insertBefore(this.fragment, refNode);
    }

    appendNodesTo(parent) {
      parent.appendChild(this.fragment);
    }

    removeNodes() {
      let fragment = this.fragment;
      let current = this.firstChild;
      let end = this.lastChild;
      let next;

      while (current) {
        next = current.nextSibling;
        fragment.appendChild(current);

        if (current === end) {
          break;
        }

        current = next;
      }
    }

    attached() {
      let controllers;
      let children;
      let i;
      let ii;

      if (this.isAttached) {
        return;
      }

      this.isAttached = true;

      if (this.controller !== null) {
        this.controller.attached();
      }

      controllers = this.controllers;

      for (i = 0, ii = controllers.length; i < ii; ++i) {
        controllers[i].attached();
      }

      children = this.children;

      for (i = 0, ii = children.length; i < ii; ++i) {
        children[i].attached();
      }
    }

    detached() {
      let controllers;
      let children;
      let i;
      let ii;

      if (this.isAttached) {
        this.isAttached = false;

        if (this.controller !== null) {
          this.controller.detached();
        }

        controllers = this.controllers;

        for (i = 0, ii = controllers.length; i < ii; ++i) {
          controllers[i].detached();
        }

        children = this.children;

        for (i = 0, ii = children.length; i < ii; ++i) {
          children[i].detached();
        }
      }
    }

  };
  _exports.View = View;

  function getAnimatableElement(view) {
    if (view.animatableElement !== undefined) {
      return view.animatableElement;
    }

    let current = view.firstChild;

    while (current && current.nodeType !== 1) {
      current = current.nextSibling;
    }

    if (current && current.nodeType === 1) {
      return view.animatableElement = current.classList.contains('au-animate') ? current : null;
    }

    return view.animatableElement = null;
  }

  let ViewSlot = class ViewSlot {
    constructor(anchor, anchorIsContainer, animator = Animator.instance) {
      this.anchor = anchor;
      this.anchorIsContainer = anchorIsContainer;
      this.bindingContext = null;
      this.overrideContext = null;
      this.animator = animator;
      this.children = [];
      this.isBound = false;
      this.isAttached = false;
      this.contentSelectors = null;
      anchor.viewSlot = this;
      anchor.isContentProjectionSource = false;
    }

    animateView(view, direction = 'enter') {
      let animatableElement = getAnimatableElement(view);

      if (animatableElement !== null) {
        switch (direction) {
          case 'enter':
            return this.animator.enter(animatableElement);

          case 'leave':
            return this.animator.leave(animatableElement);

          default:
            throw new Error('Invalid animation direction: ' + direction);
        }
      }
    }

    transformChildNodesIntoView() {
      let parent = this.anchor;
      this.children.push({
        fragment: parent,
        firstChild: parent.firstChild,
        lastChild: parent.lastChild,

        returnToCache() {},

        removeNodes() {
          let last;

          while (last = parent.lastChild) {
            parent.removeChild(last);
          }
        },

        created() {},

        bind() {},

        unbind() {},

        attached() {},

        detached() {}

      });
    }

    bind(bindingContext, overrideContext) {
      let i;
      let ii;
      let children;

      if (this.isBound) {
        if (this.bindingContext === bindingContext) {
          return;
        }

        this.unbind();
      }

      this.isBound = true;
      this.bindingContext = bindingContext = bindingContext || this.bindingContext;
      this.overrideContext = overrideContext = overrideContext || this.overrideContext;
      children = this.children;

      for (i = 0, ii = children.length; i < ii; ++i) {
        children[i].bind(bindingContext, overrideContext, true);
      }
    }

    unbind() {
      if (this.isBound) {
        let i;
        let ii;
        let children = this.children;
        this.isBound = false;
        this.bindingContext = null;
        this.overrideContext = null;

        for (i = 0, ii = children.length; i < ii; ++i) {
          children[i].unbind();
        }
      }
    }

    add(view) {
      if (this.anchorIsContainer) {
        view.appendNodesTo(this.anchor);
      } else {
        view.insertNodesBefore(this.anchor);
      }

      this.children.push(view);

      if (this.isAttached) {
        view.attached();
        return this.animateView(view, 'enter');
      }
    }

    insert(index, view) {
      let children = this.children;
      let length = children.length;

      if (index === 0 && length === 0 || index >= length) {
        return this.add(view);
      }

      view.insertNodesBefore(children[index].firstChild);
      children.splice(index, 0, view);

      if (this.isAttached) {
        view.attached();
        return this.animateView(view, 'enter');
      }
    }

    move(sourceIndex, targetIndex) {
      if (sourceIndex === targetIndex) {
        return;
      }

      const children = this.children;
      const view = children[sourceIndex];
      view.removeNodes();
      view.insertNodesBefore(children[targetIndex].firstChild);
      children.splice(sourceIndex, 1);
      children.splice(targetIndex, 0, view);
    }

    remove(view, returnToCache, skipAnimation) {
      return this.removeAt(this.children.indexOf(view), returnToCache, skipAnimation);
    }

    removeMany(viewsToRemove, returnToCache, skipAnimation) {
      const children = this.children;
      let ii = viewsToRemove.length;
      let i;
      let rmPromises = [];
      viewsToRemove.forEach(child => {
        if (skipAnimation) {
          child.removeNodes();
          return;
        }

        let animation = this.animateView(child, 'leave');

        if (animation) {
          rmPromises.push(animation.then(() => child.removeNodes()));
        } else {
          child.removeNodes();
        }
      });

      let removeAction = () => {
        if (this.isAttached) {
          for (i = 0; i < ii; ++i) {
            viewsToRemove[i].detached();
          }
        }

        if (returnToCache) {
          for (i = 0; i < ii; ++i) {
            viewsToRemove[i].returnToCache();
          }
        }

        for (i = 0; i < ii; ++i) {
          const index = children.indexOf(viewsToRemove[i]);

          if (index >= 0) {
            children.splice(index, 1);
          }
        }
      };

      if (rmPromises.length > 0) {
        return Promise.all(rmPromises).then(() => removeAction());
      }

      return removeAction();
    }

    removeAt(index, returnToCache, skipAnimation) {
      let view = this.children[index];

      let removeAction = () => {
        index = this.children.indexOf(view);
        view.removeNodes();
        this.children.splice(index, 1);

        if (this.isAttached) {
          view.detached();
        }

        if (returnToCache) {
          view.returnToCache();
        }

        return view;
      };

      if (!skipAnimation) {
        let animation = this.animateView(view, 'leave');

        if (animation) {
          return animation.then(() => removeAction());
        }
      }

      return removeAction();
    }

    removeAll(returnToCache, skipAnimation) {
      let children = this.children;
      let ii = children.length;
      let i;
      let rmPromises = [];
      children.forEach(child => {
        if (skipAnimation) {
          child.removeNodes();
          return;
        }

        let animation = this.animateView(child, 'leave');

        if (animation) {
          rmPromises.push(animation.then(() => child.removeNodes()));
        } else {
          child.removeNodes();
        }
      });

      let removeAction = () => {
        if (this.isAttached) {
          for (i = 0; i < ii; ++i) {
            children[i].detached();
          }
        }

        if (returnToCache) {
          for (i = 0; i < ii; ++i) {
            const child = children[i];

            if (child) {
              child.returnToCache();
            }
          }
        }

        this.children = [];
      };

      if (rmPromises.length > 0) {
        return Promise.all(rmPromises).then(() => removeAction());
      }

      return removeAction();
    }

    attached() {
      let i;
      let ii;
      let children;
      let child;

      if (this.isAttached) {
        return;
      }

      this.isAttached = true;
      children = this.children;

      for (i = 0, ii = children.length; i < ii; ++i) {
        child = children[i];
        child.attached();
        this.animateView(child, 'enter');
      }
    }

    detached() {
      let i;
      let ii;
      let children;

      if (this.isAttached) {
        this.isAttached = false;
        children = this.children;

        for (i = 0, ii = children.length; i < ii; ++i) {
          children[i].detached();
        }
      }
    }

    projectTo(slots) {
      this.projectToSlots = slots;
      this.add = this._projectionAdd;
      this.insert = this._projectionInsert;
      this.move = this._projectionMove;
      this.remove = this._projectionRemove;
      this.removeAt = this._projectionRemoveAt;
      this.removeMany = this._projectionRemoveMany;
      this.removeAll = this._projectionRemoveAll;
      this.children.forEach(view => ShadowDOM.distributeView(view, slots, this));
    }

    _projectionAdd(view) {
      ShadowDOM.distributeView(view, this.projectToSlots, this);
      this.children.push(view);

      if (this.isAttached) {
        view.attached();
      }
    }

    _projectionInsert(index, view) {
      if (index === 0 && !this.children.length || index >= this.children.length) {
        this.add(view);
      } else {
        ShadowDOM.distributeView(view, this.projectToSlots, this, index);
        this.children.splice(index, 0, view);

        if (this.isAttached) {
          view.attached();
        }
      }
    }

    _projectionMove(sourceIndex, targetIndex) {
      if (sourceIndex === targetIndex) {
        return;
      }

      const children = this.children;
      const view = children[sourceIndex];
      ShadowDOM.undistributeView(view, this.projectToSlots, this);
      ShadowDOM.distributeView(view, this.projectToSlots, this, targetIndex);
      children.splice(sourceIndex, 1);
      children.splice(targetIndex, 0, view);
    }

    _projectionRemove(view, returnToCache) {
      ShadowDOM.undistributeView(view, this.projectToSlots, this);
      this.children.splice(this.children.indexOf(view), 1);

      if (this.isAttached) {
        view.detached();
      }

      if (returnToCache) {
        view.returnToCache();
      }
    }

    _projectionRemoveAt(index, returnToCache) {
      let view = this.children[index];
      ShadowDOM.undistributeView(view, this.projectToSlots, this);
      this.children.splice(index, 1);

      if (this.isAttached) {
        view.detached();
      }

      if (returnToCache) {
        view.returnToCache();
      }
    }

    _projectionRemoveMany(viewsToRemove, returnToCache) {
      viewsToRemove.forEach(view => this.remove(view, returnToCache));
    }

    _projectionRemoveAll(returnToCache) {
      ShadowDOM.undistributeAll(this.projectToSlots, this);
      let children = this.children;
      let ii = children.length;

      for (let i = 0; i < ii; ++i) {
        if (returnToCache) {
          children[i].returnToCache();
        } else if (this.isAttached) {
          children[i].detached();
        }
      }

      this.children = [];
    }

  };
  _exports.ViewSlot = ViewSlot;

  let ProviderResolver = (0, _aureliaDependencyInjection.resolver)(_class11 = class ProviderResolver {
    get(container, key) {
      let id = key.__providerId__;
      return id in container ? container[id] : container[id] = container.invoke(key);
    }

  }) || _class11;

  let providerResolverInstance = new ProviderResolver();

  function elementContainerGet(key) {
    if (key === _aureliaPal.DOM.Element) {
      return this.element;
    }

    if (key === BoundViewFactory) {
      if (this.boundViewFactory) {
        return this.boundViewFactory;
      }

      let factory = this.instruction.viewFactory;
      let partReplacements = this.partReplacements;

      if (partReplacements) {
        factory = partReplacements[factory.part] || factory;
      }

      this.boundViewFactory = new BoundViewFactory(this, factory, partReplacements);
      return this.boundViewFactory;
    }

    if (key === ViewSlot) {
      if (this.viewSlot === undefined) {
        this.viewSlot = new ViewSlot(this.element, this.instruction.anchorIsContainer);
        this.element.isContentProjectionSource = this.instruction.lifting;
        this.children.push(this.viewSlot);
      }

      return this.viewSlot;
    }

    if (key === ElementEvents) {
      return this.elementEvents || (this.elementEvents = new ElementEvents(this.element));
    }

    if (key === CompositionTransaction) {
      return this.compositionTransaction || (this.compositionTransaction = this.parent.get(key));
    }

    if (key === ViewResources) {
      return this.viewResources;
    }

    if (key === TargetInstruction) {
      return this.instruction;
    }

    return this.superGet(key);
  }

  function createElementContainer(parent, element, instruction, children, partReplacements, resources) {
    let container = parent.createChild();
    let providers;
    let i;
    container.element = element;
    container.instruction = instruction;
    container.children = children;
    container.viewResources = resources;
    container.partReplacements = partReplacements;
    providers = instruction.providers;
    i = providers.length;

    while (i--) {
      container._resolvers.set(providers[i], providerResolverInstance);
    }

    container.superGet = container.get;
    container.get = elementContainerGet;
    return container;
  }

  function hasAttribute(name) {
    return this._element.hasAttribute(name);
  }

  function getAttribute(name) {
    return this._element.getAttribute(name);
  }

  function setAttribute(name, value) {
    this._element.setAttribute(name, value);
  }

  function makeElementIntoAnchor(element, elementInstruction) {
    let anchor = _aureliaPal.DOM.createComment('anchor');

    if (elementInstruction) {
      let firstChild = element.firstChild;

      if (firstChild && firstChild.tagName === 'AU-CONTENT') {
        anchor.contentElement = firstChild;
      }

      anchor._element = element;
      anchor.hasAttribute = hasAttribute;
      anchor.getAttribute = getAttribute;
      anchor.setAttribute = setAttribute;
    }

    _aureliaPal.DOM.replaceNode(anchor, element);

    return anchor;
  }

  function applyInstructions(containers, element, instruction, controllers, bindings, children, shadowSlots, partReplacements, resources) {
    let behaviorInstructions = instruction.behaviorInstructions;
    let expressions = instruction.expressions;
    let elementContainer;
    let i;
    let ii;
    let current;
    let instance;

    if (instruction.contentExpression) {
      bindings.push(instruction.contentExpression.createBinding(element.nextSibling));
      element.nextSibling.auInterpolationTarget = true;
      element.parentNode.removeChild(element);
      return;
    }

    if (instruction.shadowSlot) {
      let commentAnchor = _aureliaPal.DOM.createComment('slot');

      let slot;

      if (instruction.slotDestination) {
        slot = new PassThroughSlot(commentAnchor, instruction.slotName, instruction.slotDestination, instruction.slotFallbackFactory);
      } else {
        slot = new ShadowSlot(commentAnchor, instruction.slotName, instruction.slotFallbackFactory);
      }

      _aureliaPal.DOM.replaceNode(commentAnchor, element);

      shadowSlots[instruction.slotName] = slot;
      controllers.push(slot);
      return;
    }

    if (instruction.letElement) {
      for (i = 0, ii = expressions.length; i < ii; ++i) {
        bindings.push(expressions[i].createBinding());
      }

      element.parentNode.removeChild(element);
      return;
    }

    if (behaviorInstructions.length) {
      if (!instruction.anchorIsContainer) {
        element = makeElementIntoAnchor(element, instruction.elementInstruction);
      }

      containers[instruction.injectorId] = elementContainer = createElementContainer(containers[instruction.parentInjectorId], element, instruction, children, partReplacements, resources);

      for (i = 0, ii = behaviorInstructions.length; i < ii; ++i) {
        current = behaviorInstructions[i];
        instance = current.type.create(elementContainer, current, element, bindings);
        controllers.push(instance);
      }
    }

    for (i = 0, ii = expressions.length; i < ii; ++i) {
      bindings.push(expressions[i].createBinding(element));
    }
  }

  function styleStringToObject(style, target) {
    let attributes = style.split(';');
    let firstIndexOfColon;
    let i;
    let current;
    let key;
    let value;
    target = target || {};

    for (i = 0; i < attributes.length; i++) {
      current = attributes[i];
      firstIndexOfColon = current.indexOf(':');
      key = current.substring(0, firstIndexOfColon).trim();
      value = current.substring(firstIndexOfColon + 1).trim();
      target[key] = value;
    }

    return target;
  }

  function styleObjectToString(obj) {
    let result = '';

    for (let key in obj) {
      result += key + ':' + obj[key] + ';';
    }

    return result;
  }

  function applySurrogateInstruction(container, element, instruction, controllers, bindings, children) {
    let behaviorInstructions = instruction.behaviorInstructions;
    let expressions = instruction.expressions;
    let providers = instruction.providers;
    let values = instruction.values;
    let i;
    let ii;
    let current;
    let instance;
    let currentAttributeValue;
    i = providers.length;

    while (i--) {
      container._resolvers.set(providers[i], providerResolverInstance);
    }

    for (let key in values) {
      currentAttributeValue = element.getAttribute(key);

      if (currentAttributeValue) {
        if (key === 'class') {
          element.setAttribute('class', currentAttributeValue + ' ' + values[key]);
        } else if (key === 'style') {
          let styleObject = styleStringToObject(values[key]);
          styleStringToObject(currentAttributeValue, styleObject);
          element.setAttribute('style', styleObjectToString(styleObject));
        }
      } else {
        element.setAttribute(key, values[key]);
      }
    }

    if (behaviorInstructions.length) {
      for (i = 0, ii = behaviorInstructions.length; i < ii; ++i) {
        current = behaviorInstructions[i];
        instance = current.type.create(container, current, element, bindings);

        if (instance.contentView) {
          children.push(instance.contentView);
        }

        controllers.push(instance);
      }
    }

    for (i = 0, ii = expressions.length; i < ii; ++i) {
      bindings.push(expressions[i].createBinding(element));
    }
  }

  let BoundViewFactory = class BoundViewFactory {
    constructor(parentContainer, viewFactory, partReplacements) {
      this.parentContainer = parentContainer;
      this.viewFactory = viewFactory;
      this.factoryCreateInstruction = {
        partReplacements: partReplacements
      };
    }

    create() {
      let view = this.viewFactory.create(this.parentContainer.createChild(), this.factoryCreateInstruction);
      view._isUserControlled = true;
      return view;
    }

    get isCaching() {
      return this.viewFactory.isCaching;
    }

    setCacheSize(size, doNotOverrideIfAlreadySet) {
      this.viewFactory.setCacheSize(size, doNotOverrideIfAlreadySet);
    }

    getCachedView() {
      return this.viewFactory.getCachedView();
    }

    returnViewToCache(view) {
      this.viewFactory.returnViewToCache(view);
    }

  };
  _exports.BoundViewFactory = BoundViewFactory;
  let ViewFactory = class ViewFactory {
    constructor(template, instructions, resources) {
      this.isCaching = false;
      this.template = template;
      this.instructions = instructions;
      this.resources = resources;
      this.cacheSize = -1;
      this.cache = null;
    }

    setCacheSize(size, doNotOverrideIfAlreadySet) {
      if (size) {
        if (size === '*') {
          size = Number.MAX_VALUE;
        } else if (typeof size === 'string') {
          size = parseInt(size, 10);
        }
      }

      if (this.cacheSize === -1 || !doNotOverrideIfAlreadySet) {
        this.cacheSize = size;
      }

      if (this.cacheSize > 0) {
        this.cache = [];
      } else {
        this.cache = null;
      }

      this.isCaching = this.cacheSize > 0;
    }

    getCachedView() {
      return this.cache !== null ? this.cache.pop() || null : null;
    }

    returnViewToCache(view) {
      if (view.isAttached) {
        view.detached();
      }

      if (view.isBound) {
        view.unbind();
      }

      if (this.cache !== null && this.cache.length < this.cacheSize) {
        view.fromCache = true;
        this.cache.push(view);
      }
    }

    create(container, createInstruction, element) {
      createInstruction = createInstruction || BehaviorInstruction.normal;
      let cachedView = this.getCachedView();

      if (cachedView !== null) {
        return cachedView;
      }

      let fragment = createInstruction.enhance ? this.template : this.template.cloneNode(true);
      let instructables = fragment.querySelectorAll('.au-target');
      let instructions = this.instructions;
      let resources = this.resources;
      let controllers = [];
      let bindings = [];
      let children = [];
      let shadowSlots = Object.create(null);
      let containers = {
        root: container
      };
      let partReplacements = createInstruction.partReplacements;
      let i;
      let ii;
      let view;
      let instructable;
      let instruction;

      this.resources._invokeHook('beforeCreate', this, container, fragment, createInstruction);

      if (element && this.surrogateInstruction !== null) {
        applySurrogateInstruction(container, element, this.surrogateInstruction, controllers, bindings, children);
      }

      if (createInstruction.enhance && fragment.hasAttribute('au-target-id')) {
        instructable = fragment;
        instruction = instructions[instructable.getAttribute('au-target-id')];
        applyInstructions(containers, instructable, instruction, controllers, bindings, children, shadowSlots, partReplacements, resources);
      }

      for (i = 0, ii = instructables.length; i < ii; ++i) {
        instructable = instructables[i];
        instruction = instructions[instructable.getAttribute('au-target-id')];
        applyInstructions(containers, instructable, instruction, controllers, bindings, children, shadowSlots, partReplacements, resources);
      }

      view = new View(container, this, fragment, controllers, bindings, children, shadowSlots);

      if (!createInstruction.initiatedByBehavior) {
        view.created();
      }

      this.resources._invokeHook('afterCreate', view);

      return view;
    }

  };
  _exports.ViewFactory = ViewFactory;
  let nextInjectorId = 0;

  function getNextInjectorId() {
    return ++nextInjectorId;
  }

  let lastAUTargetID = 0;

  function getNextAUTargetID() {
    return (++lastAUTargetID).toString();
  }

  function makeIntoInstructionTarget(element) {
    let value = element.getAttribute('class');
    let auTargetID = getNextAUTargetID();
    element.setAttribute('class', value ? value + ' au-target' : 'au-target');
    element.setAttribute('au-target-id', auTargetID);
    return auTargetID;
  }

  function makeShadowSlot(compiler, resources, node, instructions, parentInjectorId) {
    let auShadowSlot = _aureliaPal.DOM.createElement('au-shadow-slot');

    _aureliaPal.DOM.replaceNode(auShadowSlot, node);

    let auTargetID = makeIntoInstructionTarget(auShadowSlot);
    let instruction = TargetInstruction.shadowSlot(parentInjectorId);
    instruction.slotName = node.getAttribute('name') || ShadowDOM.defaultSlotKey;
    instruction.slotDestination = node.getAttribute('slot');

    if (node.innerHTML.trim()) {
      let fragment = _aureliaPal.DOM.createDocumentFragment();

      let child;

      while (child = node.firstChild) {
        fragment.appendChild(child);
      }

      instruction.slotFallbackFactory = compiler.compile(fragment, resources);
    }

    instructions[auTargetID] = instruction;
    return auShadowSlot;
  }

  const defaultLetHandler = BindingLanguage.prototype.createLetExpressions;
  let ViewCompiler = (_dec7 = (0, _aureliaDependencyInjection.inject)(BindingLanguage, ViewResources), _dec7(_class13 = class ViewCompiler {
    constructor(bindingLanguage, resources) {
      this.bindingLanguage = bindingLanguage;
      this.resources = resources;
    }

    compile(source, resources, compileInstruction) {
      resources = resources || this.resources;
      compileInstruction = compileInstruction || ViewCompileInstruction.normal;
      source = typeof source === 'string' ? _aureliaPal.DOM.createTemplateFromMarkup(source) : source;
      let content;
      let part;
      let cacheSize;

      if (source.content) {
        part = source.getAttribute('part');
        cacheSize = source.getAttribute('view-cache');
        content = _aureliaPal.DOM.adoptNode(source.content);
      } else {
        content = source;
      }

      compileInstruction.targetShadowDOM = compileInstruction.targetShadowDOM && _aureliaPal.FEATURE.shadowDOM;

      resources._invokeHook('beforeCompile', content, resources, compileInstruction);

      let instructions = {};

      this._compileNode(content, resources, instructions, source, 'root', !compileInstruction.targetShadowDOM);

      let firstChild = content.firstChild;

      if (firstChild && firstChild.nodeType === 1) {
        let targetId = firstChild.getAttribute('au-target-id');

        if (targetId) {
          let ins = instructions[targetId];

          if (ins.shadowSlot || ins.lifting || ins.elementInstruction && !ins.elementInstruction.anchorIsContainer) {
            content.insertBefore(_aureliaPal.DOM.createComment('view'), firstChild);
          }
        }
      }

      let factory = new ViewFactory(content, instructions, resources);
      factory.surrogateInstruction = compileInstruction.compileSurrogate ? this._compileSurrogate(source, resources) : null;
      factory.part = part;

      if (cacheSize) {
        factory.setCacheSize(cacheSize);
      }

      resources._invokeHook('afterCompile', factory);

      return factory;
    }

    _compileNode(node, resources, instructions, parentNode, parentInjectorId, targetLightDOM) {
      switch (node.nodeType) {
        case 1:
          return this._compileElement(node, resources, instructions, parentNode, parentInjectorId, targetLightDOM);

        case 3:
          let expression = resources.getBindingLanguage(this.bindingLanguage).inspectTextContent(resources, node.wholeText);

          if (expression) {
            let marker = _aureliaPal.DOM.createElement('au-marker');

            let auTargetID = makeIntoInstructionTarget(marker);
            (node.parentNode || parentNode).insertBefore(marker, node);
            node.textContent = ' ';
            instructions[auTargetID] = TargetInstruction.contentExpression(expression);

            while (node.nextSibling && node.nextSibling.nodeType === 3) {
              (node.parentNode || parentNode).removeChild(node.nextSibling);
            }
          } else {
            while (node.nextSibling && node.nextSibling.nodeType === 3) {
              node = node.nextSibling;
            }
          }

          return node.nextSibling;

        case 11:
          let currentChild = node.firstChild;

          while (currentChild) {
            currentChild = this._compileNode(currentChild, resources, instructions, node, parentInjectorId, targetLightDOM);
          }

          break;

        default:
          break;
      }

      return node.nextSibling;
    }

    _compileSurrogate(node, resources) {
      let tagName = node.tagName.toLowerCase();
      let attributes = node.attributes;
      let bindingLanguage = resources.getBindingLanguage(this.bindingLanguage);
      let knownAttribute;
      let property;
      let instruction;
      let i;
      let ii;
      let attr;
      let attrName;
      let attrValue;
      let info;
      let type;
      let expressions = [];
      let expression;
      let behaviorInstructions = [];
      let values = {};
      let hasValues = false;
      let providers = [];

      for (i = 0, ii = attributes.length; i < ii; ++i) {
        attr = attributes[i];
        attrName = attr.name;
        attrValue = attr.value;
        info = bindingLanguage.inspectAttribute(resources, tagName, attrName, attrValue);
        type = resources.getAttribute(info.attrName);

        if (type) {
          knownAttribute = resources.mapAttribute(info.attrName);

          if (knownAttribute) {
            property = type.attributes[knownAttribute];

            if (property) {
              info.defaultBindingMode = property.defaultBindingMode;

              if (!info.command && !info.expression) {
                info.command = property.hasOptions ? 'options' : null;
              }

              if (info.command && info.command !== 'options' && type.primaryProperty) {
                const primaryProperty = type.primaryProperty;
                attrName = info.attrName = primaryProperty.attribute;
                info.defaultBindingMode = primaryProperty.defaultBindingMode;
              }
            }
          }
        }

        instruction = bindingLanguage.createAttributeInstruction(resources, node, info, undefined, type);

        if (instruction) {
          if (instruction.alteredAttr) {
            type = resources.getAttribute(instruction.attrName);
          }

          if (instruction.discrete) {
            expressions.push(instruction);
          } else {
            if (type) {
              instruction.type = type;

              this._configureProperties(instruction, resources);

              if (type.liftsContent) {
                throw new Error('You cannot place a template controller on a surrogate element.');
              } else {
                behaviorInstructions.push(instruction);
              }
            } else {
              expressions.push(instruction.attributes[instruction.attrName]);
            }
          }
        } else {
          if (type) {
            instruction = BehaviorInstruction.attribute(attrName, type);
            instruction.attributes[resources.mapAttribute(attrName)] = attrValue;

            if (type.liftsContent) {
              throw new Error('You cannot place a template controller on a surrogate element.');
            } else {
              behaviorInstructions.push(instruction);
            }
          } else if (attrName !== 'id' && attrName !== 'part' && attrName !== 'replace-part') {
            hasValues = true;
            values[attrName] = attrValue;
          }
        }
      }

      if (expressions.length || behaviorInstructions.length || hasValues) {
        for (i = 0, ii = behaviorInstructions.length; i < ii; ++i) {
          instruction = behaviorInstructions[i];
          instruction.type.compile(this, resources, node, instruction);
          providers.push(instruction.type.target);
        }

        for (i = 0, ii = expressions.length; i < ii; ++i) {
          expression = expressions[i];

          if (expression.attrToRemove !== undefined) {
            node.removeAttribute(expression.attrToRemove);
          }
        }

        return TargetInstruction.surrogate(providers, behaviorInstructions, expressions, values);
      }

      return null;
    }

    _compileElement(node, resources, instructions, parentNode, parentInjectorId, targetLightDOM) {
      let tagName = node.tagName.toLowerCase();
      let attributes = node.attributes;
      let expressions = [];
      let expression;
      let behaviorInstructions = [];
      let providers = [];
      let bindingLanguage = resources.getBindingLanguage(this.bindingLanguage);
      let liftingInstruction;
      let viewFactory;
      let type;
      let elementInstruction;
      let elementProperty;
      let i;
      let ii;
      let attr;
      let attrName;
      let attrValue;
      let originalAttrName;
      let instruction;
      let info;
      let property;
      let knownAttribute;
      let auTargetID;
      let injectorId;

      if (tagName === 'slot') {
        if (targetLightDOM) {
          node = makeShadowSlot(this, resources, node, instructions, parentInjectorId);
        }

        return node.nextSibling;
      } else if (tagName === 'template') {
        if (!('content' in node)) {
          throw new Error('You cannot place a template element within ' + node.namespaceURI + ' namespace');
        }

        viewFactory = this.compile(node, resources);
        viewFactory.part = node.getAttribute('part');
      } else {
        type = resources.getElement(node.getAttribute('as-element') || tagName);

        if (tagName === 'let' && !type && bindingLanguage.createLetExpressions !== defaultLetHandler) {
          expressions = bindingLanguage.createLetExpressions(resources, node);
          auTargetID = makeIntoInstructionTarget(node);
          instructions[auTargetID] = TargetInstruction.letElement(expressions);
          return node.nextSibling;
        }

        if (type) {
          elementInstruction = BehaviorInstruction.element(node, type);
          type.processAttributes(this, resources, node, attributes, elementInstruction);
          behaviorInstructions.push(elementInstruction);
        }
      }

      for (i = 0, ii = attributes.length; i < ii; ++i) {
        attr = attributes[i];
        originalAttrName = attrName = attr.name;
        attrValue = attr.value;
        info = bindingLanguage.inspectAttribute(resources, tagName, attrName, attrValue);

        if (targetLightDOM && info.attrName === 'slot') {
          info.attrName = attrName = 'au-slot';
        }

        type = resources.getAttribute(info.attrName);
        elementProperty = null;

        if (type) {
          knownAttribute = resources.mapAttribute(info.attrName);

          if (knownAttribute) {
            property = type.attributes[knownAttribute];

            if (property) {
              info.defaultBindingMode = property.defaultBindingMode;

              if (!info.command && !info.expression) {
                info.command = property.hasOptions ? 'options' : null;
              }

              if (info.command && info.command !== 'options' && type.primaryProperty) {
                const primaryProperty = type.primaryProperty;
                attrName = info.attrName = primaryProperty.attribute;
                info.defaultBindingMode = primaryProperty.defaultBindingMode;
              }
            }
          }
        } else if (elementInstruction) {
          elementProperty = elementInstruction.type.attributes[info.attrName];

          if (elementProperty) {
            info.defaultBindingMode = elementProperty.defaultBindingMode;
          }
        }

        if (elementProperty) {
          instruction = bindingLanguage.createAttributeInstruction(resources, node, info, elementInstruction);
        } else {
          instruction = bindingLanguage.createAttributeInstruction(resources, node, info, undefined, type);
        }

        if (instruction) {
          if (instruction.alteredAttr) {
            type = resources.getAttribute(instruction.attrName);
          }

          if (instruction.discrete) {
            expressions.push(instruction);
          } else {
            if (type) {
              instruction.type = type;

              this._configureProperties(instruction, resources);

              if (type.liftsContent) {
                instruction.originalAttrName = originalAttrName;
                liftingInstruction = instruction;
                break;
              } else {
                behaviorInstructions.push(instruction);
              }
            } else if (elementProperty) {
              elementInstruction.attributes[info.attrName].targetProperty = elementProperty.name;
            } else {
              expressions.push(instruction.attributes[instruction.attrName]);
            }
          }
        } else {
          if (type) {
            instruction = BehaviorInstruction.attribute(attrName, type);
            instruction.attributes[resources.mapAttribute(attrName)] = attrValue;

            if (type.liftsContent) {
              instruction.originalAttrName = originalAttrName;
              liftingInstruction = instruction;
              break;
            } else {
              behaviorInstructions.push(instruction);
            }
          } else if (elementProperty) {
            elementInstruction.attributes[attrName] = attrValue;
          }
        }
      }

      if (liftingInstruction) {
        liftingInstruction.viewFactory = viewFactory;
        node = liftingInstruction.type.compile(this, resources, node, liftingInstruction, parentNode);
        auTargetID = makeIntoInstructionTarget(node);
        instructions[auTargetID] = TargetInstruction.lifting(parentInjectorId, liftingInstruction);
      } else {
        let skipContentProcessing = false;

        if (expressions.length || behaviorInstructions.length) {
          injectorId = behaviorInstructions.length ? getNextInjectorId() : false;

          for (i = 0, ii = behaviorInstructions.length; i < ii; ++i) {
            instruction = behaviorInstructions[i];
            instruction.type.compile(this, resources, node, instruction, parentNode);
            providers.push(instruction.type.target);
            skipContentProcessing = skipContentProcessing || instruction.skipContentProcessing;
          }

          for (i = 0, ii = expressions.length; i < ii; ++i) {
            expression = expressions[i];

            if (expression.attrToRemove !== undefined) {
              node.removeAttribute(expression.attrToRemove);
            }
          }

          auTargetID = makeIntoInstructionTarget(node);
          instructions[auTargetID] = TargetInstruction.normal(injectorId, parentInjectorId, providers, behaviorInstructions, expressions, elementInstruction);
        }

        if (skipContentProcessing) {
          return node.nextSibling;
        }

        let currentChild = node.firstChild;

        while (currentChild) {
          currentChild = this._compileNode(currentChild, resources, instructions, node, injectorId || parentInjectorId, targetLightDOM);
        }
      }

      return node.nextSibling;
    }

    _configureProperties(instruction, resources) {
      let type = instruction.type;
      let attrName = instruction.attrName;
      let attributes = instruction.attributes;
      let property;
      let key;
      let value;
      let knownAttribute = resources.mapAttribute(attrName);

      if (knownAttribute && attrName in attributes && knownAttribute !== attrName) {
        attributes[knownAttribute] = attributes[attrName];
        delete attributes[attrName];
      }

      for (key in attributes) {
        value = attributes[key];

        if (value !== null && typeof value === 'object') {
          property = type.attributes[key];

          if (property !== undefined) {
            value.targetProperty = property.name;
          } else {
            value.targetProperty = key;
          }
        }
      }
    }

  }) || _class13);
  _exports.ViewCompiler = ViewCompiler;
  let ResourceModule = class ResourceModule {
    constructor(moduleId) {
      this.id = moduleId;
      this.moduleInstance = null;
      this.mainResource = null;
      this.resources = null;
      this.viewStrategy = null;
      this.isInitialized = false;
      this.onLoaded = null;
      this.loadContext = null;
    }

    initialize(container) {
      let current = this.mainResource;
      let resources = this.resources;
      let vs = this.viewStrategy;

      if (this.isInitialized) {
        return;
      }

      this.isInitialized = true;

      if (current !== undefined) {
        current.metadata.viewStrategy = vs;
        current.initialize(container);
      }

      for (let i = 0, ii = resources.length; i < ii; ++i) {
        current = resources[i];
        current.metadata.viewStrategy = vs;
        current.initialize(container);
      }
    }

    register(registry, name) {
      let main = this.mainResource;
      let resources = this.resources;

      if (main !== undefined) {
        main.register(registry, name);
        name = null;
      }

      for (let i = 0, ii = resources.length; i < ii; ++i) {
        resources[i].register(registry, name);
        name = null;
      }
    }

    load(container, loadContext) {
      if (this.onLoaded !== null) {
        return this.loadContext === loadContext ? Promise.resolve() : this.onLoaded;
      }

      let main = this.mainResource;
      let resources = this.resources;
      let loads;

      if (main !== undefined) {
        loads = new Array(resources.length + 1);
        loads[0] = main.load(container, loadContext);

        for (let i = 0, ii = resources.length; i < ii; ++i) {
          loads[i + 1] = resources[i].load(container, loadContext);
        }
      } else {
        loads = new Array(resources.length);

        for (let i = 0, ii = resources.length; i < ii; ++i) {
          loads[i] = resources[i].load(container, loadContext);
        }
      }

      this.loadContext = loadContext;
      this.onLoaded = Promise.all(loads);
      return this.onLoaded;
    }

  };
  _exports.ResourceModule = ResourceModule;
  let ResourceDescription = class ResourceDescription {
    constructor(key, exportedValue, resourceTypeMeta) {
      if (!resourceTypeMeta) {
        resourceTypeMeta = _aureliaMetadata.metadata.get(_aureliaMetadata.metadata.resource, exportedValue);

        if (!resourceTypeMeta) {
          resourceTypeMeta = new HtmlBehaviorResource();
          resourceTypeMeta.elementName = _hyphenate(key);

          _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, resourceTypeMeta, exportedValue);
        }
      }

      if (resourceTypeMeta instanceof HtmlBehaviorResource) {
        if (resourceTypeMeta.elementName === undefined) {
          resourceTypeMeta.elementName = _hyphenate(key);
        } else if (resourceTypeMeta.attributeName === undefined) {
          resourceTypeMeta.attributeName = _hyphenate(key);
        } else if (resourceTypeMeta.attributeName === null && resourceTypeMeta.elementName === null) {
          HtmlBehaviorResource.convention(key, resourceTypeMeta);
        }
      } else if (!resourceTypeMeta.name) {
        resourceTypeMeta.name = _hyphenate(key);
      }

      this.metadata = resourceTypeMeta;
      this.value = exportedValue;
    }

    initialize(container) {
      this.metadata.initialize(container, this.value);
    }

    register(registry, name) {
      this.metadata.register(registry, name);
    }

    load(container, loadContext) {
      return this.metadata.load(container, this.value, loadContext);
    }

  };
  _exports.ResourceDescription = ResourceDescription;
  let ModuleAnalyzer = class ModuleAnalyzer {
    constructor() {
      this.cache = Object.create(null);
    }

    getAnalysis(moduleId) {
      return this.cache[moduleId];
    }

    analyze(moduleId, moduleInstance, mainResourceKey) {
      let mainResource;
      let fallbackValue;
      let fallbackKey;
      let resourceTypeMeta;
      let key;
      let exportedValue;
      let resources = [];
      let conventional;
      let vs;
      let resourceModule;
      resourceModule = this.cache[moduleId];

      if (resourceModule) {
        return resourceModule;
      }

      resourceModule = new ResourceModule(moduleId);
      this.cache[moduleId] = resourceModule;

      if (typeof moduleInstance === 'function') {
        moduleInstance = {
          'default': moduleInstance
        };
      }

      if (mainResourceKey) {
        mainResource = new ResourceDescription(mainResourceKey, moduleInstance[mainResourceKey]);
      }

      for (key in moduleInstance) {
        exportedValue = moduleInstance[key];

        if (key === mainResourceKey || typeof exportedValue !== 'function') {
          continue;
        }

        resourceTypeMeta = _aureliaMetadata.metadata.get(_aureliaMetadata.metadata.resource, exportedValue);

        if (resourceTypeMeta) {
          if (resourceTypeMeta instanceof HtmlBehaviorResource) {
            ViewResources.convention(exportedValue, resourceTypeMeta);

            if (resourceTypeMeta.attributeName === null && resourceTypeMeta.elementName === null) {
              HtmlBehaviorResource.convention(key, resourceTypeMeta);
            }

            if (resourceTypeMeta.attributeName === null && resourceTypeMeta.elementName === null) {
              resourceTypeMeta.elementName = _hyphenate(key);
            }
          }

          if (!mainResource && resourceTypeMeta instanceof HtmlBehaviorResource && resourceTypeMeta.elementName !== null) {
            mainResource = new ResourceDescription(key, exportedValue, resourceTypeMeta);
          } else {
            resources.push(new ResourceDescription(key, exportedValue, resourceTypeMeta));
          }
        } else if (viewStrategy.decorates(exportedValue)) {
          vs = exportedValue;
        } else if (exportedValue instanceof _aureliaLoader.TemplateRegistryEntry) {
          vs = new TemplateRegistryViewStrategy(moduleId, exportedValue);
        } else {
          if (conventional = ViewResources.convention(exportedValue)) {
            if (conventional.elementName !== null && !mainResource) {
              mainResource = new ResourceDescription(key, exportedValue, conventional);
            } else {
              resources.push(new ResourceDescription(key, exportedValue, conventional));
            }

            _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, conventional, exportedValue);
          } else if (conventional = HtmlBehaviorResource.convention(key)) {
            if (conventional.elementName !== null && !mainResource) {
              mainResource = new ResourceDescription(key, exportedValue, conventional);
            } else {
              resources.push(new ResourceDescription(key, exportedValue, conventional));
            }

            _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, conventional, exportedValue);
          } else if (conventional = _aureliaBinding.ValueConverterResource.convention(key) || _aureliaBinding.BindingBehaviorResource.convention(key) || ViewEngineHooksResource.convention(key)) {
            resources.push(new ResourceDescription(key, exportedValue, conventional));

            _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, conventional, exportedValue);
          } else if (!fallbackValue) {
            fallbackValue = exportedValue;
            fallbackKey = key;
          }
        }
      }

      if (!mainResource && fallbackValue) {
        mainResource = new ResourceDescription(fallbackKey, fallbackValue);
      }

      resourceModule.moduleInstance = moduleInstance;
      resourceModule.mainResource = mainResource;
      resourceModule.resources = resources;
      resourceModule.viewStrategy = vs;
      return resourceModule;
    }

  };
  _exports.ModuleAnalyzer = ModuleAnalyzer;
  let logger = LogManager.getLogger('templating');

  function ensureRegistryEntry(loader, urlOrRegistryEntry) {
    if (urlOrRegistryEntry instanceof _aureliaLoader.TemplateRegistryEntry) {
      return Promise.resolve(urlOrRegistryEntry);
    }

    return loader.loadTemplate(urlOrRegistryEntry);
  }

  let ProxyViewFactory = class ProxyViewFactory {
    constructor(promise) {
      promise.then(x => this.viewFactory = x);
    }

    create(container, bindingContext, createInstruction, element) {
      return this.viewFactory.create(container, bindingContext, createInstruction, element);
    }

    get isCaching() {
      return this.viewFactory.isCaching;
    }

    setCacheSize(size, doNotOverrideIfAlreadySet) {
      this.viewFactory.setCacheSize(size, doNotOverrideIfAlreadySet);
    }

    getCachedView() {
      return this.viewFactory.getCachedView();
    }

    returnViewToCache(view) {
      this.viewFactory.returnViewToCache(view);
    }

  };
  let auSlotBehavior = null;
  let ViewEngine = (_dec8 = (0, _aureliaDependencyInjection.inject)(_aureliaLoader.Loader, _aureliaDependencyInjection.Container, ViewCompiler, ModuleAnalyzer, ViewResources), _dec8(_class14 = (_temp4 = _class15 = class ViewEngine {
    constructor(loader, container, viewCompiler, moduleAnalyzer, appResources) {
      this.loader = loader;
      this.container = container;
      this.viewCompiler = viewCompiler;
      this.moduleAnalyzer = moduleAnalyzer;
      this.appResources = appResources;
      this._pluginMap = {};

      if (auSlotBehavior === null) {
        auSlotBehavior = new HtmlBehaviorResource();
        auSlotBehavior.attributeName = 'au-slot';

        _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, auSlotBehavior, SlotCustomAttribute);
      }

      auSlotBehavior.initialize(container, SlotCustomAttribute);
      auSlotBehavior.register(appResources);
    }

    addResourcePlugin(extension, implementation) {
      let name = extension.replace('.', '') + '-resource-plugin';
      this._pluginMap[extension] = name;
      this.loader.addPlugin(name, implementation);
    }

    loadViewFactory(urlOrRegistryEntry, compileInstruction, loadContext, target) {
      loadContext = loadContext || new ResourceLoadContext();
      return ensureRegistryEntry(this.loader, urlOrRegistryEntry).then(registryEntry => {
        const url = registryEntry.address;

        if (registryEntry.onReady) {
          if (!loadContext.hasDependency(url)) {
            loadContext.addDependency(url);
            return registryEntry.onReady;
          }

          if (registryEntry.template === null) {
            return registryEntry.onReady;
          }

          return Promise.resolve(new ProxyViewFactory(registryEntry.onReady));
        }

        loadContext.addDependency(url);
        registryEntry.onReady = this.loadTemplateResources(registryEntry, compileInstruction, loadContext, target).then(resources => {
          registryEntry.resources = resources;

          if (registryEntry.template === null) {
            return registryEntry.factory = null;
          }

          let viewFactory = this.viewCompiler.compile(registryEntry.template, resources, compileInstruction);
          return registryEntry.factory = viewFactory;
        });
        return registryEntry.onReady;
      });
    }

    loadTemplateResources(registryEntry, compileInstruction, loadContext, target) {
      let resources = new ViewResources(this.appResources, registryEntry.address);
      let dependencies = registryEntry.dependencies;
      let importIds;
      let names;
      compileInstruction = compileInstruction || ViewCompileInstruction.normal;

      if (dependencies.length === 0 && !compileInstruction.associatedModuleId) {
        return Promise.resolve(resources);
      }

      importIds = dependencies.map(x => x.src);
      names = dependencies.map(x => x.name);
      logger.debug(`importing resources for ${registryEntry.address}`, importIds);

      if (target) {
        let viewModelRequires = _aureliaMetadata.metadata.get(ViewEngine.viewModelRequireMetadataKey, target);

        if (viewModelRequires) {
          let templateImportCount = importIds.length;

          for (let i = 0, ii = viewModelRequires.length; i < ii; ++i) {
            let req = viewModelRequires[i];
            let importId = typeof req === 'function' ? _aureliaMetadata.Origin.get(req).moduleId : (0, _aureliaPath.relativeToFile)(req.src || req, registryEntry.address);

            if (importIds.indexOf(importId) === -1) {
              importIds.push(importId);
              names.push(req.as);
            }
          }

          logger.debug(`importing ViewModel resources for ${compileInstruction.associatedModuleId}`, importIds.slice(templateImportCount));
        }
      }

      return this.importViewResources(importIds, names, resources, compileInstruction, loadContext);
    }

    importViewModelResource(moduleImport, moduleMember) {
      return this.loader.loadModule(moduleImport).then(viewModelModule => {
        let normalizedId = _aureliaMetadata.Origin.get(viewModelModule).moduleId;

        let resourceModule = this.moduleAnalyzer.analyze(normalizedId, viewModelModule, moduleMember);

        if (!resourceModule.mainResource) {
          throw new Error(`No view model found in module "${moduleImport}".`);
        }

        resourceModule.initialize(this.container);
        return resourceModule.mainResource;
      });
    }

    importViewResources(moduleIds, names, resources, compileInstruction, loadContext) {
      loadContext = loadContext || new ResourceLoadContext();
      compileInstruction = compileInstruction || ViewCompileInstruction.normal;
      moduleIds = moduleIds.map(x => this._applyLoaderPlugin(x));
      return this.loader.loadAllModules(moduleIds).then(imports => {
        let i;
        let ii;
        let analysis;
        let normalizedId;
        let current;
        let associatedModule;
        let container = this.container;
        let moduleAnalyzer = this.moduleAnalyzer;
        let allAnalysis = new Array(imports.length);

        for (i = 0, ii = imports.length; i < ii; ++i) {
          current = imports[i];
          normalizedId = _aureliaMetadata.Origin.get(current).moduleId;
          analysis = moduleAnalyzer.analyze(normalizedId, current);
          analysis.initialize(container);
          analysis.register(resources, names[i]);
          allAnalysis[i] = analysis;
        }

        if (compileInstruction.associatedModuleId) {
          associatedModule = moduleAnalyzer.getAnalysis(compileInstruction.associatedModuleId);

          if (associatedModule) {
            associatedModule.register(resources);
          }
        }

        for (i = 0, ii = allAnalysis.length; i < ii; ++i) {
          allAnalysis[i] = allAnalysis[i].load(container, loadContext);
        }

        return Promise.all(allAnalysis).then(() => resources);
      });
    }

    _applyLoaderPlugin(id) {
      let index = id.lastIndexOf('.');

      if (index !== -1) {
        let ext = id.substring(index);
        let pluginName = this._pluginMap[ext];

        if (pluginName === undefined) {
          return id;
        }

        return this.loader.applyPluginToUrl(id, pluginName);
      }

      return id;
    }

  }, _class15.viewModelRequireMetadataKey = 'aurelia:view-model-require', _temp4)) || _class14);
  _exports.ViewEngine = ViewEngine;
  let Controller = class Controller {
    constructor(behavior, instruction, viewModel, container) {
      this.behavior = behavior;
      this.instruction = instruction;
      this.viewModel = viewModel;
      this.isAttached = false;
      this.view = null;
      this.isBound = false;
      this.scope = null;
      this.container = container;
      this.elementEvents = container.elementEvents || null;
      let observerLookup = behavior.observerLocator.getOrCreateObserversLookup(viewModel);
      let handlesBind = behavior.handlesBind;
      let attributes = instruction.attributes;
      let boundProperties = this.boundProperties = [];
      let properties = behavior.properties;
      let i;
      let ii;

      behavior._ensurePropertiesDefined(viewModel, observerLookup);

      for (i = 0, ii = properties.length; i < ii; ++i) {
        properties[i]._initialize(viewModel, observerLookup, attributes, handlesBind, boundProperties);
      }
    }

    created(owningView) {
      if (this.behavior.handlesCreated) {
        this.viewModel.created(owningView, this.view);
      }
    }

    automate(overrideContext, owningView) {
      this.view.bindingContext = this.viewModel;
      this.view.overrideContext = overrideContext || (0, _aureliaBinding.createOverrideContext)(this.viewModel);
      this.view._isUserControlled = true;

      if (this.behavior.handlesCreated) {
        this.viewModel.created(owningView || null, this.view);
      }

      this.bind(this.view);
    }

    bind(scope) {
      let skipSelfSubscriber = this.behavior.handlesBind;
      let boundProperties = this.boundProperties;
      let i;
      let ii;
      let x;
      let observer;
      let selfSubscriber;

      if (this.isBound) {
        if (this.scope === scope) {
          return;
        }

        this.unbind();
      }

      this.isBound = true;
      this.scope = scope;

      for (i = 0, ii = boundProperties.length; i < ii; ++i) {
        x = boundProperties[i];
        observer = x.observer;
        selfSubscriber = observer.selfSubscriber;
        observer.publishing = false;

        if (skipSelfSubscriber) {
          observer.selfSubscriber = null;
        }

        x.binding.bind(scope);
        observer.call();
        observer.publishing = true;
        observer.selfSubscriber = selfSubscriber;
      }

      let overrideContext;

      if (this.view !== null) {
        if (skipSelfSubscriber) {
          this.view.viewModelScope = scope;
        }

        if (this.viewModel === scope.overrideContext.bindingContext) {
          overrideContext = scope.overrideContext;
        } else if (this.instruction.inheritBindingContext) {
          overrideContext = (0, _aureliaBinding.createOverrideContext)(this.viewModel, scope.overrideContext);
        } else {
          overrideContext = (0, _aureliaBinding.createOverrideContext)(this.viewModel);
          overrideContext.__parentOverrideContext = scope.overrideContext;
        }

        this.view.bind(this.viewModel, overrideContext);
      } else if (skipSelfSubscriber) {
        overrideContext = scope.overrideContext;

        if (scope.overrideContext.__parentOverrideContext !== undefined && this.viewModel.viewFactory && this.viewModel.viewFactory.factoryCreateInstruction.partReplacements) {
          overrideContext = Object.assign({}, scope.overrideContext);
          overrideContext.parentOverrideContext = scope.overrideContext.__parentOverrideContext;
        }

        this.viewModel.bind(scope.bindingContext, overrideContext);
      }
    }

    unbind() {
      if (this.isBound) {
        let boundProperties = this.boundProperties;
        let i;
        let ii;
        this.isBound = false;
        this.scope = null;

        if (this.view !== null) {
          this.view.unbind();
        }

        if (this.behavior.handlesUnbind) {
          this.viewModel.unbind();
        }

        if (this.elementEvents !== null) {
          this.elementEvents.disposeAll();
        }

        for (i = 0, ii = boundProperties.length; i < ii; ++i) {
          boundProperties[i].binding.unbind();
        }
      }
    }

    attached() {
      if (this.isAttached) {
        return;
      }

      this.isAttached = true;

      if (this.behavior.handlesAttached) {
        this.viewModel.attached();
      }

      if (this.view !== null) {
        this.view.attached();
      }
    }

    detached() {
      if (this.isAttached) {
        this.isAttached = false;

        if (this.view !== null) {
          this.view.detached();
        }

        if (this.behavior.handlesDetached) {
          this.viewModel.detached();
        }
      }
    }

  };
  _exports.Controller = Controller;
  let BehaviorPropertyObserver = (_dec9 = (0, _aureliaBinding.subscriberCollection)(), _dec9(_class16 = class BehaviorPropertyObserver {
    constructor(taskQueue, obj, propertyName, selfSubscriber, initialValue) {
      this.taskQueue = taskQueue;
      this.obj = obj;
      this.propertyName = propertyName;
      this.notqueued = true;
      this.publishing = false;
      this.selfSubscriber = selfSubscriber;
      this.currentValue = this.oldValue = initialValue;
    }

    getValue() {
      return this.currentValue;
    }

    setValue(newValue) {
      let oldValue = this.currentValue;

      if (!Object.is(newValue, oldValue)) {
        this.oldValue = oldValue;
        this.currentValue = newValue;

        if (this.publishing && this.notqueued) {
          if (this.taskQueue.flushing) {
            this.call();
          } else {
            this.notqueued = false;
            this.taskQueue.queueMicroTask(this);
          }
        }
      }
    }

    call() {
      let oldValue = this.oldValue;
      let newValue = this.currentValue;
      this.notqueued = true;

      if (Object.is(newValue, oldValue)) {
        return;
      }

      if (this.selfSubscriber) {
        this.selfSubscriber(newValue, oldValue);
      }

      this.callSubscribers(newValue, oldValue);
      this.oldValue = newValue;
    }

    subscribe(context, callable) {
      this.addSubscriber(context, callable);
    }

    unsubscribe(context, callable) {
      this.removeSubscriber(context, callable);
    }

  }) || _class16);
  _exports.BehaviorPropertyObserver = BehaviorPropertyObserver;

  function getObserver(instance, name) {
    let lookup = instance.__observers__;

    if (lookup === undefined) {
      let ctor = Object.getPrototypeOf(instance).constructor;

      let behavior = _aureliaMetadata.metadata.get(_aureliaMetadata.metadata.resource, ctor);

      if (!behavior.isInitialized) {
        behavior.initialize(_aureliaDependencyInjection.Container.instance || new _aureliaDependencyInjection.Container(), instance.constructor);
      }

      lookup = behavior.observerLocator.getOrCreateObserversLookup(instance);

      behavior._ensurePropertiesDefined(instance, lookup);
    }

    return lookup[name];
  }

  let BindableProperty = class BindableProperty {
    constructor(nameOrConfig) {
      if (typeof nameOrConfig === 'string') {
        this.name = nameOrConfig;
      } else {
        Object.assign(this, nameOrConfig);
      }

      this.attribute = this.attribute || _hyphenate(this.name);
      let defaultBindingMode = this.defaultBindingMode;

      if (defaultBindingMode === null || defaultBindingMode === undefined) {
        this.defaultBindingMode = _aureliaBinding.bindingMode.oneWay;
      } else if (typeof defaultBindingMode === 'string') {
        this.defaultBindingMode = _aureliaBinding.bindingMode[defaultBindingMode] || _aureliaBinding.bindingMode.oneWay;
      }

      this.changeHandler = this.changeHandler || null;
      this.owner = null;
      this.descriptor = null;
    }

    registerWith(target, behavior, descriptor) {
      behavior.properties.push(this);
      behavior.attributes[this.attribute] = this;
      this.owner = behavior;

      if (descriptor) {
        this.descriptor = descriptor;
        return this._configureDescriptor(descriptor);
      }

      return undefined;
    }

    _configureDescriptor(descriptor) {
      let name = this.name;
      descriptor.configurable = true;
      descriptor.enumerable = true;

      if ('initializer' in descriptor) {
        this.defaultValue = descriptor.initializer;
        delete descriptor.initializer;
        delete descriptor.writable;
      }

      if ('value' in descriptor) {
        this.defaultValue = descriptor.value;
        delete descriptor.value;
        delete descriptor.writable;
      }

      descriptor.get = function () {
        return getObserver(this, name).getValue();
      };

      descriptor.set = function (value) {
        getObserver(this, name).setValue(value);
      };

      descriptor.get.getObserver = function (obj) {
        return getObserver(obj, name);
      };

      return descriptor;
    }

    defineOn(target, behavior) {
      let name = this.name;
      let handlerName;

      if (this.changeHandler === null) {
        handlerName = name + 'Changed';

        if (handlerName in target.prototype) {
          this.changeHandler = handlerName;
        }
      }

      if (this.descriptor === null) {
        Object.defineProperty(target.prototype, name, this._configureDescriptor(behavior, {}));
      }
    }

    createObserver(viewModel) {
      let selfSubscriber = null;
      let defaultValue = this.defaultValue;
      let changeHandlerName = this.changeHandler;
      let name = this.name;
      let initialValue;

      if (this.hasOptions) {
        return undefined;
      }

      if (changeHandlerName in viewModel) {
        if ('propertyChanged' in viewModel) {
          selfSubscriber = (newValue, oldValue) => {
            viewModel[changeHandlerName](newValue, oldValue);
            viewModel.propertyChanged(name, newValue, oldValue);
          };
        } else {
          selfSubscriber = (newValue, oldValue) => viewModel[changeHandlerName](newValue, oldValue);
        }
      } else if ('propertyChanged' in viewModel) {
        selfSubscriber = (newValue, oldValue) => viewModel.propertyChanged(name, newValue, oldValue);
      } else if (changeHandlerName !== null) {
        throw new Error(`Change handler ${changeHandlerName} was specified but not declared on the class.`);
      }

      if (defaultValue !== undefined) {
        initialValue = typeof defaultValue === 'function' ? defaultValue.call(viewModel) : defaultValue;
      }

      return new BehaviorPropertyObserver(this.owner.taskQueue, viewModel, this.name, selfSubscriber, initialValue);
    }

    _initialize(viewModel, observerLookup, attributes, behaviorHandlesBind, boundProperties) {
      let selfSubscriber;
      let observer;
      let attribute;
      let defaultValue = this.defaultValue;

      if (this.isDynamic) {
        for (let key in attributes) {
          this._createDynamicProperty(viewModel, observerLookup, behaviorHandlesBind, key, attributes[key], boundProperties);
        }
      } else if (!this.hasOptions) {
        observer = observerLookup[this.name];

        if (attributes !== null) {
          selfSubscriber = observer.selfSubscriber;
          attribute = attributes[this.attribute];

          if (behaviorHandlesBind) {
            observer.selfSubscriber = null;
          }

          if (typeof attribute === 'string') {
            viewModel[this.name] = attribute;
            observer.call();
          } else if (attribute) {
            boundProperties.push({
              observer: observer,
              binding: attribute.createBinding(viewModel)
            });
          } else if (defaultValue !== undefined) {
            observer.call();
          }

          observer.selfSubscriber = selfSubscriber;
        }

        observer.publishing = true;
      }
    }

    _createDynamicProperty(viewModel, observerLookup, behaviorHandlesBind, name, attribute, boundProperties) {
      let changeHandlerName = name + 'Changed';
      let selfSubscriber = null;
      let observer;
      let info;

      if (changeHandlerName in viewModel) {
        if ('propertyChanged' in viewModel) {
          selfSubscriber = (newValue, oldValue) => {
            viewModel[changeHandlerName](newValue, oldValue);
            viewModel.propertyChanged(name, newValue, oldValue);
          };
        } else {
          selfSubscriber = (newValue, oldValue) => viewModel[changeHandlerName](newValue, oldValue);
        }
      } else if ('propertyChanged' in viewModel) {
        selfSubscriber = (newValue, oldValue) => viewModel.propertyChanged(name, newValue, oldValue);
      }

      observer = observerLookup[name] = new BehaviorPropertyObserver(this.owner.taskQueue, viewModel, name, selfSubscriber);
      Object.defineProperty(viewModel, name, {
        configurable: true,
        enumerable: true,
        get: observer.getValue.bind(observer),
        set: observer.setValue.bind(observer)
      });

      if (behaviorHandlesBind) {
        observer.selfSubscriber = null;
      }

      if (typeof attribute === 'string') {
        viewModel[name] = attribute;
        observer.call();
      } else if (attribute) {
        info = {
          observer: observer,
          binding: attribute.createBinding(viewModel)
        };
        boundProperties.push(info);
      }

      observer.publishing = true;
      observer.selfSubscriber = selfSubscriber;
    }

  };
  _exports.BindableProperty = BindableProperty;
  let lastProviderId = 0;

  function nextProviderId() {
    return ++lastProviderId;
  }

  function doProcessContent() {
    return true;
  }

  function doProcessAttributes() {}

  let HtmlBehaviorResource = class HtmlBehaviorResource {
    constructor() {
      this.elementName = null;
      this.attributeName = null;
      this.attributeDefaultBindingMode = undefined;
      this.liftsContent = false;
      this.targetShadowDOM = false;
      this.shadowDOMOptions = null;
      this.processAttributes = doProcessAttributes;
      this.processContent = doProcessContent;
      this.usesShadowDOM = false;
      this.childBindings = null;
      this.hasDynamicOptions = false;
      this.containerless = false;
      this.properties = [];
      this.attributes = {};
      this.isInitialized = false;
      this.primaryProperty = null;
    }

    static convention(name, existing) {
      let behavior;

      if (name.endsWith('CustomAttribute')) {
        behavior = existing || new HtmlBehaviorResource();
        behavior.attributeName = _hyphenate(name.substring(0, name.length - 15));
      }

      if (name.endsWith('CustomElement')) {
        behavior = existing || new HtmlBehaviorResource();
        behavior.elementName = _hyphenate(name.substring(0, name.length - 13));
      }

      return behavior;
    }

    addChildBinding(behavior) {
      if (this.childBindings === null) {
        this.childBindings = [];
      }

      this.childBindings.push(behavior);
    }

    initialize(container, target) {
      let proto = target.prototype;
      let properties = this.properties;
      let attributeName = this.attributeName;
      let attributeDefaultBindingMode = this.attributeDefaultBindingMode;
      let i;
      let ii;
      let current;

      if (this.isInitialized) {
        return;
      }

      this.isInitialized = true;
      target.__providerId__ = nextProviderId();
      this.observerLocator = container.get(_aureliaBinding.ObserverLocator);
      this.taskQueue = container.get(_aureliaTaskQueue.TaskQueue);
      this.target = target;
      this.usesShadowDOM = this.targetShadowDOM && _aureliaPal.FEATURE.shadowDOM;
      this.handlesCreated = 'created' in proto;
      this.handlesBind = 'bind' in proto;
      this.handlesUnbind = 'unbind' in proto;
      this.handlesAttached = 'attached' in proto;
      this.handlesDetached = 'detached' in proto;
      this.htmlName = this.elementName || this.attributeName;

      if (attributeName !== null) {
        if (properties.length === 0) {
          new BindableProperty({
            name: 'value',
            changeHandler: 'valueChanged' in proto ? 'valueChanged' : null,
            attribute: attributeName,
            defaultBindingMode: attributeDefaultBindingMode
          }).registerWith(target, this);
        }

        current = properties[0];

        if (properties.length === 1 && current.name === 'value') {
          current.isDynamic = current.hasOptions = this.hasDynamicOptions;
          current.defineOn(target, this);
        } else {
          for (i = 0, ii = properties.length; i < ii; ++i) {
            properties[i].defineOn(target, this);

            if (properties[i].primaryProperty) {
              if (this.primaryProperty) {
                throw new Error('Only one bindable property on a custom element can be defined as the default');
              }

              this.primaryProperty = properties[i];
            }
          }

          current = new BindableProperty({
            name: 'value',
            changeHandler: 'valueChanged' in proto ? 'valueChanged' : null,
            attribute: attributeName,
            defaultBindingMode: attributeDefaultBindingMode
          });
          current.hasOptions = true;
          current.registerWith(target, this);
        }
      } else {
        for (i = 0, ii = properties.length; i < ii; ++i) {
          properties[i].defineOn(target, this);
        }

        this._copyInheritedProperties(container, target);
      }
    }

    register(registry, name) {
      if (this.attributeName !== null) {
        registry.registerAttribute(name || this.attributeName, this, this.attributeName);

        if (Array.isArray(this.aliases)) {
          this.aliases.forEach(alias => {
            registry.registerAttribute(alias, this, this.attributeName);
          });
        }
      }

      if (this.elementName !== null) {
        registry.registerElement(name || this.elementName, this);
      }
    }

    load(container, target, loadContext, viewStrategy, transientView) {
      let options;

      if (this.elementName !== null) {
        viewStrategy = container.get(ViewLocator).getViewStrategy(viewStrategy || this.viewStrategy || target);
        options = new ViewCompileInstruction(this.targetShadowDOM, true);

        if (!viewStrategy.moduleId) {
          viewStrategy.moduleId = _aureliaMetadata.Origin.get(target).moduleId;
        }

        return viewStrategy.loadViewFactory(container.get(ViewEngine), options, loadContext, target).then(viewFactory => {
          if (!transientView || !this.viewFactory) {
            this.viewFactory = viewFactory;
          }

          return viewFactory;
        });
      }

      return Promise.resolve(this);
    }

    compile(compiler, resources, node, instruction, parentNode) {
      if (this.liftsContent) {
        if (!instruction.viewFactory) {
          let template = _aureliaPal.DOM.createElement('template');

          let fragment = _aureliaPal.DOM.createDocumentFragment();

          let cacheSize = node.getAttribute('view-cache');
          let part = node.getAttribute('part');
          node.removeAttribute(instruction.originalAttrName);

          _aureliaPal.DOM.replaceNode(template, node, parentNode);

          fragment.appendChild(node);
          instruction.viewFactory = compiler.compile(fragment, resources);

          if (part) {
            instruction.viewFactory.part = part;
            node.removeAttribute('part');
          }

          if (cacheSize) {
            instruction.viewFactory.setCacheSize(cacheSize);
            node.removeAttribute('view-cache');
          }

          node = template;
        }
      } else if (this.elementName !== null) {
        let partReplacements = {};

        if (this.processContent(compiler, resources, node, instruction) && node.hasChildNodes()) {
          let currentChild = node.firstChild;
          let contentElement = this.usesShadowDOM ? null : _aureliaPal.DOM.createElement('au-content');
          let nextSibling;
          let toReplace;

          while (currentChild) {
            nextSibling = currentChild.nextSibling;

            if (currentChild.tagName === 'TEMPLATE' && (toReplace = currentChild.getAttribute('replace-part'))) {
              partReplacements[toReplace] = compiler.compile(currentChild, resources);

              _aureliaPal.DOM.removeNode(currentChild, parentNode);

              instruction.partReplacements = partReplacements;
            } else if (contentElement !== null) {
              if (currentChild.nodeType === 3 && _isAllWhitespace(currentChild)) {
                _aureliaPal.DOM.removeNode(currentChild, parentNode);
              } else {
                contentElement.appendChild(currentChild);
              }
            }

            currentChild = nextSibling;
          }

          if (contentElement !== null && contentElement.hasChildNodes()) {
            node.appendChild(contentElement);
          }

          instruction.skipContentProcessing = false;
        } else {
          instruction.skipContentProcessing = true;
        }
      } else if (!this.processContent(compiler, resources, node, instruction)) {
        instruction.skipContentProcessing = true;
      }

      return node;
    }

    create(container, instruction, element, bindings) {
      let viewHost;
      let au = null;
      instruction = instruction || BehaviorInstruction.normal;
      element = element || null;
      bindings = bindings || null;

      if (this.elementName !== null && element) {
        if (this.usesShadowDOM) {
          viewHost = element.attachShadow(this.shadowDOMOptions);
          container.registerInstance(_aureliaPal.DOM.boundary, viewHost);
        } else {
          viewHost = element;

          if (this.targetShadowDOM) {
            container.registerInstance(_aureliaPal.DOM.boundary, viewHost);
          }
        }
      }

      if (element !== null) {
        element.au = au = element.au || {};
      }

      let viewModel = instruction.viewModel || container.get(this.target);
      let controller = new Controller(this, instruction, viewModel, container);
      let childBindings = this.childBindings;
      let viewFactory;

      if (this.liftsContent) {
        au.controller = controller;
      } else if (this.elementName !== null) {
        viewFactory = instruction.viewFactory || this.viewFactory;
        container.viewModel = viewModel;

        if (viewFactory) {
          controller.view = viewFactory.create(container, instruction, element);
        }

        if (element !== null) {
          au.controller = controller;

          if (controller.view) {
            if (!this.usesShadowDOM && (element.childNodes.length === 1 || element.contentElement)) {
              let contentElement = element.childNodes[0] || element.contentElement;
              controller.view.contentView = {
                fragment: contentElement
              };
              contentElement.parentNode && _aureliaPal.DOM.removeNode(contentElement);
            }

            if (instruction.anchorIsContainer) {
              if (childBindings !== null) {
                for (let i = 0, ii = childBindings.length; i < ii; ++i) {
                  controller.view.addBinding(childBindings[i].create(element, viewModel, controller));
                }
              }

              controller.view.appendNodesTo(viewHost);
            } else {
              controller.view.insertNodesBefore(viewHost);
            }
          } else if (childBindings !== null) {
            for (let i = 0, ii = childBindings.length; i < ii; ++i) {
              bindings.push(childBindings[i].create(element, viewModel, controller));
            }
          }
        } else if (controller.view) {
          controller.view.controller = controller;

          if (childBindings !== null) {
            for (let i = 0, ii = childBindings.length; i < ii; ++i) {
              controller.view.addBinding(childBindings[i].create(instruction.host, viewModel, controller));
            }
          }
        } else if (childBindings !== null) {
          for (let i = 0, ii = childBindings.length; i < ii; ++i) {
            bindings.push(childBindings[i].create(instruction.host, viewModel, controller));
          }
        }
      } else if (childBindings !== null) {
        for (let i = 0, ii = childBindings.length; i < ii; ++i) {
          bindings.push(childBindings[i].create(element, viewModel, controller));
        }
      }

      if (au !== null) {
        au[this.htmlName] = controller;
      }

      if (instruction.initiatedByBehavior && viewFactory) {
        controller.view.created();
      }

      return controller;
    }

    _ensurePropertiesDefined(instance, lookup) {
      let properties;
      let i;
      let ii;
      let observer;

      if ('__propertiesDefined__' in lookup) {
        return;
      }

      lookup.__propertiesDefined__ = true;
      properties = this.properties;

      for (i = 0, ii = properties.length; i < ii; ++i) {
        observer = properties[i].createObserver(instance);

        if (observer !== undefined) {
          lookup[observer.propertyName] = observer;
        }
      }
    }

    _copyInheritedProperties(container, target) {
      let behavior;
      let derived = target;

      while (true) {
        let proto = Object.getPrototypeOf(target.prototype);
        target = proto && proto.constructor;

        if (!target) {
          return;
        }

        behavior = _aureliaMetadata.metadata.getOwn(_aureliaMetadata.metadata.resource, target);

        if (behavior) {
          break;
        }
      }

      behavior.initialize(container, target);

      for (let i = 0, ii = behavior.properties.length; i < ii; ++i) {
        let prop = behavior.properties[i];

        if (this.properties.some(p => p.name === prop.name)) {
          continue;
        }

        new BindableProperty(prop).registerWith(derived, this);
      }
    }

  };
  _exports.HtmlBehaviorResource = HtmlBehaviorResource;

  function createChildObserverDecorator(selectorOrConfig, all) {
    return function (target, key, descriptor) {
      let actualTarget = typeof key === 'string' ? target.constructor : target;

      let r = _aureliaMetadata.metadata.getOrCreateOwn(_aureliaMetadata.metadata.resource, HtmlBehaviorResource, actualTarget);

      if (typeof selectorOrConfig === 'string') {
        selectorOrConfig = {
          selector: selectorOrConfig,
          name: key
        };
      }

      if (descriptor) {
        descriptor.writable = true;
        descriptor.configurable = true;
      }

      selectorOrConfig.all = all;
      r.addChildBinding(new ChildObserver(selectorOrConfig));
    };
  }

  function children(selectorOrConfig) {
    return createChildObserverDecorator(selectorOrConfig, true);
  }

  function child(selectorOrConfig) {
    return createChildObserverDecorator(selectorOrConfig, false);
  }

  let ChildObserver = class ChildObserver {
    constructor(config) {
      this.name = config.name;
      this.changeHandler = config.changeHandler || this.name + 'Changed';
      this.selector = config.selector;
      this.all = config.all;
    }

    create(viewHost, viewModel, controller) {
      return new ChildObserverBinder(this.selector, viewHost, this.name, viewModel, controller, this.changeHandler, this.all);
    }

  };
  const noMutations = [];

  function trackMutation(groupedMutations, binder, record) {
    let mutations = groupedMutations.get(binder);

    if (!mutations) {
      mutations = [];
      groupedMutations.set(binder, mutations);
    }

    mutations.push(record);
  }

  function onChildChange(mutations, observer) {
    let binders = observer.binders;
    let bindersLength = binders.length;
    let groupedMutations = new Map();

    for (let i = 0, ii = mutations.length; i < ii; ++i) {
      let record = mutations[i];
      let added = record.addedNodes;
      let removed = record.removedNodes;

      for (let j = 0, jj = removed.length; j < jj; ++j) {
        let node = removed[j];

        if (node.nodeType === 1) {
          for (let k = 0; k < bindersLength; ++k) {
            let binder = binders[k];

            if (binder.onRemove(node)) {
              trackMutation(groupedMutations, binder, record);
            }
          }
        }
      }

      for (let j = 0, jj = added.length; j < jj; ++j) {
        let node = added[j];

        if (node.nodeType === 1) {
          for (let k = 0; k < bindersLength; ++k) {
            let binder = binders[k];

            if (binder.onAdd(node)) {
              trackMutation(groupedMutations, binder, record);
            }
          }
        }
      }
    }

    groupedMutations.forEach((value, key) => {
      if (key.changeHandler !== null) {
        key.viewModel[key.changeHandler](value);
      }
    });
  }

  let ChildObserverBinder = class ChildObserverBinder {
    constructor(selector, viewHost, property, viewModel, controller, changeHandler, all) {
      this.selector = selector;
      this.viewHost = viewHost;
      this.property = property;
      this.viewModel = viewModel;
      this.controller = controller;
      this.changeHandler = changeHandler in viewModel ? changeHandler : null;
      this.usesShadowDOM = controller.behavior.usesShadowDOM;
      this.all = all;

      if (!this.usesShadowDOM && controller.view && controller.view.contentView) {
        this.contentView = controller.view.contentView;
      } else {
        this.contentView = null;
      }
    }

    matches(element) {
      if (element.matches(this.selector)) {
        if (this.contentView === null) {
          return true;
        }

        let contentView = this.contentView;
        let assignedSlot = element.auAssignedSlot;

        if (assignedSlot && assignedSlot.projectFromAnchors) {
          let anchors = assignedSlot.projectFromAnchors;

          for (let i = 0, ii = anchors.length; i < ii; ++i) {
            if (anchors[i].auOwnerView === contentView) {
              return true;
            }
          }

          return false;
        }

        return element.auOwnerView === contentView;
      }

      return false;
    }

    bind(source) {
      let viewHost = this.viewHost;
      let viewModel = this.viewModel;
      let observer = viewHost.__childObserver__;

      if (!observer) {
        observer = viewHost.__childObserver__ = _aureliaPal.DOM.createMutationObserver(onChildChange);
        let options = {
          childList: true,
          subtree: !this.usesShadowDOM
        };
        observer.observe(viewHost, options);
        observer.binders = [];
      }

      observer.binders.push(this);

      if (this.usesShadowDOM) {
        let current = viewHost.firstElementChild;

        if (this.all) {
          let items = viewModel[this.property];

          if (!items) {
            items = viewModel[this.property] = [];
          } else {
            items.splice(0);
          }

          while (current) {
            if (this.matches(current)) {
              items.push(current.au && current.au.controller ? current.au.controller.viewModel : current);
            }

            current = current.nextElementSibling;
          }

          if (this.changeHandler !== null) {
            this.viewModel[this.changeHandler](noMutations);
          }
        } else {
          while (current) {
            if (this.matches(current)) {
              let value = current.au && current.au.controller ? current.au.controller.viewModel : current;
              this.viewModel[this.property] = value;

              if (this.changeHandler !== null) {
                this.viewModel[this.changeHandler](value);
              }

              break;
            }

            current = current.nextElementSibling;
          }
        }
      }
    }

    onRemove(element) {
      if (this.matches(element)) {
        let value = element.au && element.au.controller ? element.au.controller.viewModel : element;

        if (this.all) {
          let items = this.viewModel[this.property] || (this.viewModel[this.property] = []);
          let index = items.indexOf(value);

          if (index !== -1) {
            items.splice(index, 1);
          }

          return true;
        }

        return false;
      }

      return false;
    }

    onAdd(element) {
      if (this.matches(element)) {
        let value = element.au && element.au.controller ? element.au.controller.viewModel : element;

        if (this.all) {
          let items = this.viewModel[this.property] || (this.viewModel[this.property] = []);

          if (this.selector === '*') {
            items.push(value);
            return true;
          }

          let index = 0;
          let prev = element.previousElementSibling;

          while (prev) {
            if (this.matches(prev)) {
              index++;
            }

            prev = prev.previousElementSibling;
          }

          items.splice(index, 0, value);
          return true;
        }

        this.viewModel[this.property] = value;

        if (this.changeHandler !== null) {
          this.viewModel[this.changeHandler](value);
        }
      }

      return false;
    }

    unbind() {
      if (this.viewHost.__childObserver__) {
        this.viewHost.__childObserver__.disconnect();

        this.viewHost.__childObserver__ = null;
        this.viewModel[this.property] = null;
      }
    }

  };

  function remove(viewSlot, previous) {
    return Array.isArray(previous) ? viewSlot.removeMany(previous, true) : viewSlot.remove(previous, true);
  }

  const SwapStrategies = {
    before(viewSlot, previous, callback) {
      return previous === undefined ? callback() : callback().then(() => remove(viewSlot, previous));
    },

    with(viewSlot, previous, callback) {
      return previous === undefined ? callback() : Promise.all([remove(viewSlot, previous), callback()]);
    },

    after(viewSlot, previous, callback) {
      return Promise.resolve(viewSlot.removeAll(true)).then(callback);
    }

  };
  _exports.SwapStrategies = SwapStrategies;

  function tryActivateViewModel(context) {
    if (context.skipActivation || typeof context.viewModel.activate !== 'function') {
      return Promise.resolve();
    }

    return context.viewModel.activate(context.model) || Promise.resolve();
  }

  let CompositionEngine = (_dec10 = (0, _aureliaDependencyInjection.inject)(ViewEngine, ViewLocator), _dec10(_class17 = class CompositionEngine {
    constructor(viewEngine, viewLocator) {
      this.viewEngine = viewEngine;
      this.viewLocator = viewLocator;
    }

    _swap(context, view) {
      let swapStrategy = SwapStrategies[context.swapOrder] || SwapStrategies.after;
      let previousViews = context.viewSlot.children.slice();
      return swapStrategy(context.viewSlot, previousViews, () => {
        return Promise.resolve(context.viewSlot.add(view)).then(() => {
          if (context.currentController) {
            context.currentController.unbind();
          }
        });
      }).then(() => {
        if (context.compositionTransactionNotifier) {
          context.compositionTransactionNotifier.done();
        }
      });
    }

    _createControllerAndSwap(context) {
      return this.createController(context).then(controller => {
        if (context.compositionTransactionOwnershipToken) {
          return context.compositionTransactionOwnershipToken.waitForCompositionComplete().then(() => {
            controller.automate(context.overrideContext, context.owningView);
            return this._swap(context, controller.view);
          }).then(() => controller);
        }

        controller.automate(context.overrideContext, context.owningView);
        return this._swap(context, controller.view).then(() => controller);
      });
    }

    createController(context) {
      let childContainer;
      let viewModel;
      let viewModelResource;
      let m;
      return this.ensureViewModel(context).then(tryActivateViewModel).then(() => {
        childContainer = context.childContainer;
        viewModel = context.viewModel;
        viewModelResource = context.viewModelResource;
        m = viewModelResource.metadata;
        let viewStrategy = this.viewLocator.getViewStrategy(context.view || viewModel);

        if (context.viewResources) {
          viewStrategy.makeRelativeTo(context.viewResources.viewUrl);
        }

        return m.load(childContainer, viewModelResource.value, null, viewStrategy, true);
      }).then(viewFactory => m.create(childContainer, BehaviorInstruction.dynamic(context.host, viewModel, viewFactory)));
    }

    ensureViewModel(context) {
      let childContainer = context.childContainer = context.childContainer || context.container.createChild();

      if (typeof context.viewModel === 'string') {
        context.viewModel = context.viewResources ? context.viewResources.relativeToView(context.viewModel) : context.viewModel;
        return this.viewEngine.importViewModelResource(context.viewModel).then(viewModelResource => {
          childContainer.autoRegister(viewModelResource.value);

          if (context.host) {
            childContainer.registerInstance(_aureliaPal.DOM.Element, context.host);
          }

          context.viewModel = childContainer.viewModel = childContainer.get(viewModelResource.value);
          context.viewModelResource = viewModelResource;
          return context;
        });
      }

      let ctor = context.viewModel.constructor;
      let isClass = typeof context.viewModel === 'function';

      if (isClass) {
        ctor = context.viewModel;
        childContainer.autoRegister(ctor);
      }

      let m = _aureliaMetadata.metadata.getOrCreateOwn(_aureliaMetadata.metadata.resource, HtmlBehaviorResource, ctor);

      m.elementName = m.elementName || 'dynamic-element';
      m.initialize(isClass ? childContainer : context.container || childContainer, ctor);
      context.viewModelResource = {
        metadata: m,
        value: ctor
      };

      if (context.host) {
        childContainer.registerInstance(_aureliaPal.DOM.Element, context.host);
      }

      childContainer.viewModel = context.viewModel = isClass ? childContainer.get(ctor) : context.viewModel;
      return Promise.resolve(context);
    }

    compose(context) {
      context.childContainer = context.childContainer || context.container.createChild();
      context.view = this.viewLocator.getViewStrategy(context.view);
      let transaction = context.childContainer.get(CompositionTransaction);
      let compositionTransactionOwnershipToken = transaction.tryCapture();

      if (compositionTransactionOwnershipToken) {
        context.compositionTransactionOwnershipToken = compositionTransactionOwnershipToken;
      } else {
        context.compositionTransactionNotifier = transaction.enlist();
      }

      if (context.viewModel) {
        return this._createControllerAndSwap(context);
      } else if (context.view) {
        if (context.viewResources) {
          context.view.makeRelativeTo(context.viewResources.viewUrl);
        }

        return context.view.loadViewFactory(this.viewEngine, new ViewCompileInstruction()).then(viewFactory => {
          let result = viewFactory.create(context.childContainer);
          result.bind(context.bindingContext, context.overrideContext);

          if (context.compositionTransactionOwnershipToken) {
            return context.compositionTransactionOwnershipToken.waitForCompositionComplete().then(() => this._swap(context, result)).then(() => result);
          }

          return this._swap(context, result).then(() => result);
        });
      } else if (context.viewSlot) {
        context.viewSlot.removeAll();

        if (context.compositionTransactionNotifier) {
          context.compositionTransactionNotifier.done();
        }

        return Promise.resolve(null);
      }

      return Promise.resolve(null);
    }

  }) || _class17);
  _exports.CompositionEngine = CompositionEngine;
  let ElementConfigResource = class ElementConfigResource {
    initialize(container, target) {}

    register(registry, name) {}

    load(container, target) {
      let config = new target();
      let eventManager = container.get(_aureliaBinding.EventManager);
      eventManager.registerElementConfig(config);
    }

  };
  _exports.ElementConfigResource = ElementConfigResource;

  function resource(instanceOrConfig) {
    return function (target) {
      let isConfig = typeof instanceOrConfig === 'string' || Object.getPrototypeOf(instanceOrConfig) === Object.prototype;

      if (isConfig) {
        target.$resource = instanceOrConfig;
      } else {
        _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, instanceOrConfig, target);
      }
    };
  }

  function behavior(override) {
    return function (target) {
      if (override instanceof HtmlBehaviorResource) {
        _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, override, target);
      } else {
        let r = _aureliaMetadata.metadata.getOrCreateOwn(_aureliaMetadata.metadata.resource, HtmlBehaviorResource, target);

        Object.assign(r, override);
      }
    };
  }

  function customElement(name) {
    return function (target) {
      let r = _aureliaMetadata.metadata.getOrCreateOwn(_aureliaMetadata.metadata.resource, HtmlBehaviorResource, target);

      r.elementName = validateBehaviorName(name, 'custom element');
    };
  }

  function customAttribute(name, defaultBindingMode, aliases) {
    return function (target) {
      let r = _aureliaMetadata.metadata.getOrCreateOwn(_aureliaMetadata.metadata.resource, HtmlBehaviorResource, target);

      r.attributeName = validateBehaviorName(name, 'custom attribute');
      r.attributeDefaultBindingMode = defaultBindingMode;
      r.aliases = aliases;
    };
  }

  function templateController(target) {
    let deco = function (t) {
      let r = _aureliaMetadata.metadata.getOrCreateOwn(_aureliaMetadata.metadata.resource, HtmlBehaviorResource, t);

      r.liftsContent = true;
    };

    return target ? deco(target) : deco;
  }

  function bindable(nameOrConfigOrTarget, key, descriptor) {
    let deco = function (target, key2, descriptor2) {
      let actualTarget = key2 ? target.constructor : target;

      let r = _aureliaMetadata.metadata.getOrCreateOwn(_aureliaMetadata.metadata.resource, HtmlBehaviorResource, actualTarget);

      let prop;

      if (key2) {
        nameOrConfigOrTarget = nameOrConfigOrTarget || {};
        nameOrConfigOrTarget.name = key2;
      }

      prop = new BindableProperty(nameOrConfigOrTarget);
      return prop.registerWith(actualTarget, r, descriptor2);
    };

    if (!nameOrConfigOrTarget) {
      return deco;
    }

    if (key) {
      let target = nameOrConfigOrTarget;
      nameOrConfigOrTarget = null;
      return deco(target, key, descriptor);
    }

    return deco;
  }

  function dynamicOptions(target) {
    let deco = function (t) {
      let r = _aureliaMetadata.metadata.getOrCreateOwn(_aureliaMetadata.metadata.resource, HtmlBehaviorResource, t);

      r.hasDynamicOptions = true;
    };

    return target ? deco(target) : deco;
  }

  const defaultShadowDOMOptions = {
    mode: 'open'
  };

  function useShadowDOM(targetOrOptions) {
    let options = typeof targetOrOptions === 'function' || !targetOrOptions ? defaultShadowDOMOptions : targetOrOptions;

    let deco = function (t) {
      let r = _aureliaMetadata.metadata.getOrCreateOwn(_aureliaMetadata.metadata.resource, HtmlBehaviorResource, t);

      r.targetShadowDOM = true;
      r.shadowDOMOptions = options;
    };

    return typeof targetOrOptions === 'function' ? deco(targetOrOptions) : deco;
  }

  function processAttributes(processor) {
    return function (t) {
      let r = _aureliaMetadata.metadata.getOrCreateOwn(_aureliaMetadata.metadata.resource, HtmlBehaviorResource, t);

      r.processAttributes = function (compiler, resources, node, attributes, elementInstruction) {
        try {
          processor(compiler, resources, node, attributes, elementInstruction);
        } catch (error) {
          LogManager.getLogger('templating').error(error);
        }
      };
    };
  }

  function doNotProcessContent() {
    return false;
  }

  function processContent(processor) {
    return function (t) {
      let r = _aureliaMetadata.metadata.getOrCreateOwn(_aureliaMetadata.metadata.resource, HtmlBehaviorResource, t);

      r.processContent = processor ? function (compiler, resources, node, instruction) {
        try {
          return processor(compiler, resources, node, instruction);
        } catch (error) {
          LogManager.getLogger('templating').error(error);
          return false;
        }
      } : doNotProcessContent;
    };
  }

  function containerless(target) {
    let deco = function (t) {
      let r = _aureliaMetadata.metadata.getOrCreateOwn(_aureliaMetadata.metadata.resource, HtmlBehaviorResource, t);

      r.containerless = true;
    };

    return target ? deco(target) : deco;
  }

  function useViewStrategy(strategy) {
    return function (target) {
      _aureliaMetadata.metadata.define(ViewLocator.viewStrategyMetadataKey, strategy, target);
    };
  }

  function useView(path) {
    return useViewStrategy(new RelativeViewStrategy(path));
  }

  function inlineView(markup, dependencies, dependencyBaseUrl) {
    return useViewStrategy(new InlineViewStrategy(markup, dependencies, dependencyBaseUrl));
  }

  function noView(targetOrDependencies, dependencyBaseUrl) {
    let target;
    let dependencies;

    if (typeof targetOrDependencies === 'function') {
      target = targetOrDependencies;
    } else {
      dependencies = targetOrDependencies;
      target = undefined;
    }

    let deco = function (t) {
      _aureliaMetadata.metadata.define(ViewLocator.viewStrategyMetadataKey, new NoViewStrategy(dependencies, dependencyBaseUrl), t);
    };

    return target ? deco(target) : deco;
  }

  function view(templateOrConfig) {
    return function (target) {
      target.$view = templateOrConfig;
    };
  }

  function elementConfig(target) {
    let deco = function (t) {
      _aureliaMetadata.metadata.define(_aureliaMetadata.metadata.resource, new ElementConfigResource(), t);
    };

    return target ? deco(target) : deco;
  }

  function viewResources(...resources) {
    return function (target) {
      _aureliaMetadata.metadata.define(ViewEngine.viewModelRequireMetadataKey, resources, target);
    };
  }

  let TemplatingEngine = (_dec11 = (0, _aureliaDependencyInjection.inject)(_aureliaDependencyInjection.Container, ModuleAnalyzer, ViewCompiler, CompositionEngine), _dec11(_class18 = class TemplatingEngine {
    constructor(container, moduleAnalyzer, viewCompiler, compositionEngine) {
      this._container = container;
      this._moduleAnalyzer = moduleAnalyzer;
      this._viewCompiler = viewCompiler;
      this._compositionEngine = compositionEngine;
      container.registerInstance(Animator, Animator.instance = new Animator());
    }

    configureAnimator(animator) {
      this._container.unregister(Animator);

      this._container.registerInstance(Animator, Animator.instance = animator);
    }

    compose(context) {
      return this._compositionEngine.compose(context);
    }

    enhance(instruction) {
      if (instruction instanceof _aureliaPal.DOM.Element) {
        instruction = {
          element: instruction
        };
      }

      let compilerInstructions = {
        letExpressions: []
      };

      let resources = instruction.resources || this._container.get(ViewResources);

      this._viewCompiler._compileNode(instruction.element, resources, compilerInstructions, instruction.element.parentNode, 'root', true);

      let factory = new ViewFactory(instruction.element, compilerInstructions, resources);

      let container = instruction.container || this._container.createChild();

      let view = factory.create(container, BehaviorInstruction.enhance());
      view.bind(instruction.bindingContext || {}, instruction.overrideContext);
      view.firstChild = view.lastChild = view.fragment;
      view.fragment = _aureliaPal.DOM.createDocumentFragment();
      view.attached();
      return view;
    }

  }) || _class18);
  _exports.TemplatingEngine = TemplatingEngine;
});
define('aurelia-testing/aurelia-testing',["require", "exports", "./compile-spy", "./view-spy", "./component-tester", "./wait"], function (require, exports, compile_spy_1, view_spy_1, component_tester_1, wait_1) {
    "use strict";
    function __export(m) {
        for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
    }
    Object.defineProperty(exports, "__esModule", { value: true });
    __export(compile_spy_1);
    __export(view_spy_1);
    __export(component_tester_1);
    __export(wait_1);
    function configure(config) {
        config.globalResources([
            './compile-spy',
            './view-spy'
        ]);
    }
    exports.configure = configure;
});

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
define('aurelia-testing/compile-spy',["require", "exports", "aurelia-templating", "aurelia-dependency-injection", "aurelia-logging", "aurelia-pal"], function (require, exports, aurelia_templating_1, aurelia_dependency_injection_1, aurelia_logging_1, aurelia_pal_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Attribute to be placed on any element to have it emit the View Compiler's
     * TargetInstruction into the debug console, giving you insight into all the
     * parsed bindings, behaviors and event handers for the targeted element.
     */
    var CompileSpy = /** @class */ (function () {
        /**
         * Creates and instanse of CompileSpy.
         * @param element target element on where attribute is placed on.
         * @param instruction instructions for how the target element should be enhanced.
         */
        function CompileSpy(element, instruction) {
            aurelia_logging_1.getLogger('compile-spy').info(element.toString(), instruction);
        }
        CompileSpy = __decorate([
            aurelia_templating_1.customAttribute('compile-spy'),
            aurelia_dependency_injection_1.inject(aurelia_pal_1.DOM.Element, aurelia_templating_1.TargetInstruction)
        ], CompileSpy);
        return CompileSpy;
    }());
    exports.CompileSpy = CompileSpy;
});

define('aurelia-testing/component-tester',["require", "exports", "aurelia-templating", "./wait"], function (require, exports, aurelia_templating_1, wait_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var StageComponent = /** @class */ (function () {
        function StageComponent() {
        }
        StageComponent.withResources = function (resources) {
            if (resources === void 0) { resources = []; }
            return new ComponentTester().withResources(resources);
        };
        return StageComponent;
    }());
    exports.StageComponent = StageComponent;
    var ComponentTester = /** @class */ (function () {
        function ComponentTester() {
            this.resources = [];
        }
        ComponentTester.prototype.configure = function (aurelia) {
            return aurelia.use.standardConfiguration();
        };
        ComponentTester.prototype.bootstrap = function (configure) {
            this.configure = configure;
        };
        ComponentTester.prototype.withResources = function (resources) {
            this.resources = resources;
            return this;
        };
        ComponentTester.prototype.inView = function (html) {
            this.html = html;
            return this;
        };
        ComponentTester.prototype.boundTo = function (bindingContext) {
            this.bindingContext = bindingContext;
            return this;
        };
        ComponentTester.prototype.manuallyHandleLifecycle = function () {
            this._prepareLifecycle();
            return this;
        };
        ComponentTester.prototype.create = function (bootstrap) {
            var _this = this;
            return bootstrap(function (aurelia) {
                return Promise.resolve(_this.configure(aurelia)).then(function () {
                    if (_this.resources) {
                        aurelia.use.globalResources(_this.resources);
                    }
                    return aurelia.start().then(function () {
                        _this.host = document.createElement('div');
                        _this.host.innerHTML = _this.html;
                        document.body.appendChild(_this.host);
                        return aurelia.enhance(_this.bindingContext, _this.host).then(function () {
                            _this.rootView = aurelia.root;
                            _this.element = _this.host.firstElementChild;
                            if (aurelia.root.controllers.length) {
                                _this.viewModel = aurelia.root.controllers[0].viewModel;
                            }
                            return new Promise(function (resolve) { return setTimeout(function () { return resolve(); }, 0); });
                        });
                    });
                });
            });
        };
        ComponentTester.prototype.dispose = function () {
            if (this.host === undefined || this.rootView === undefined) {
                throw new Error('Cannot call ComponentTester.dispose() before ComponentTester.create()');
            }
            this.rootView.detached();
            this.rootView.unbind();
            return this.host.parentNode.removeChild(this.host);
        };
        ComponentTester.prototype._prepareLifecycle = function () {
            var _this = this;
            // bind
            var bindPrototype = aurelia_templating_1.View.prototype.bind;
            // tslint:disable-next-line:no-empty
            aurelia_templating_1.View.prototype.bind = function () { };
            this.bind = function (bindingContext) { return new Promise(function (resolve) {
                aurelia_templating_1.View.prototype.bind = bindPrototype;
                if (bindingContext !== undefined) {
                    _this.bindingContext = bindingContext;
                }
                _this.rootView.bind(_this.bindingContext);
                setTimeout(function () { return resolve(); }, 0);
            }); };
            // attached
            var attachedPrototype = aurelia_templating_1.View.prototype.attached;
            // tslint:disable-next-line:no-empty
            aurelia_templating_1.View.prototype.attached = function () { };
            this.attached = function () { return new Promise(function (resolve) {
                aurelia_templating_1.View.prototype.attached = attachedPrototype;
                _this.rootView.attached();
                setTimeout(function () { return resolve(); }, 0);
            }); };
            // detached
            this.detached = function () { return new Promise(function (resolve) {
                _this.rootView.detached();
                setTimeout(function () { return resolve(); }, 0);
            }); };
            // unbind
            this.unbind = function () { return new Promise(function (resolve) {
                _this.rootView.unbind();
                setTimeout(function () { return resolve(); }, 0);
            }); };
        };
        ComponentTester.prototype.waitForElement = function (selector, options) {
            var _this = this;
            return wait_1.waitFor(function () { return _this.element.querySelector(selector); }, options);
        };
        ComponentTester.prototype.waitForElements = function (selector, options) {
            var _this = this;
            return wait_1.waitFor(function () { return _this.element.querySelectorAll(selector); }, options);
        };
        return ComponentTester;
    }());
    exports.ComponentTester = ComponentTester;
});

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
define('aurelia-testing/view-spy',["require", "exports", "aurelia-templating", "aurelia-logging"], function (require, exports, aurelia_templating_1, aurelia_logging_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Attribute to be placed on any HTML element in a view to emit the View instance
     * to the debug console, giving you insight into the live View instance, including
     * all child views, live bindings, behaviors and more.
     */
    var ViewSpy = /** @class */ (function () {
        /**
         * Creates a new instance of ViewSpy.
         */
        function ViewSpy() {
            this.logger = aurelia_logging_1.getLogger('view-spy');
        }
        ViewSpy.prototype._log = function (lifecycleName, context) {
            if (!this.value && lifecycleName === 'created') {
                this.logger.info(lifecycleName, this.view);
            }
            else if (this.value && this.value.indexOf(lifecycleName) !== -1) {
                this.logger.info(lifecycleName, this.view, context);
            }
        };
        /**
         * Invoked when the target view is created.
         * @param view The target view.
         */
        ViewSpy.prototype.created = function (view) {
            this.view = view;
            this._log('created');
        };
        /**
         * Invoked when the target view is bound.
         * @param bindingContext The target view's binding context.
         */
        ViewSpy.prototype.bind = function (bindingContext) {
            this._log('bind', bindingContext);
        };
        /**
         * Invoked when the target element is attached to the DOM.
         */
        ViewSpy.prototype.attached = function () {
            this._log('attached');
        };
        /**
         * Invoked when the target element is detached from the DOM.
         */
        ViewSpy.prototype.detached = function () {
            this._log('detached');
        };
        /**
         * Invoked when the target element is unbound.
         */
        ViewSpy.prototype.unbind = function () {
            this._log('unbind');
        };
        ViewSpy = __decorate([
            aurelia_templating_1.customAttribute('view-spy')
        ], ViewSpy);
        return ViewSpy;
    }());
    exports.ViewSpy = ViewSpy;
});

var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
define('aurelia-testing/wait',["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Generic function to wait for something to happen. Uses polling
     * @param getter: a getter function that returns anything else than `null` or an
     *                empty array or an empty jQuery object when the
     *                condition is met
     * @param options: lookup options, defaults to
     *                 `{present: true, interval: 50, timeout: 5000}`
     */
    function waitFor(getter, options) {
        if (options === void 0) { options = { present: true, interval: 50, timeout: 5000 }; }
        // prevents infinite recursion if the request times out
        var timedOut = false;
        options = __assign({ present: true, interval: 50, timeout: 5000 }, options);
        function wait() {
            var element = getter();
            // boolean is needed here, hence the length > 0
            var found = element !== null && (!(element instanceof NodeList) &&
                !element.jquery || element.length > 0);
            if (!options.present === !found || timedOut) {
                return Promise.resolve(element);
            }
            return new Promise(function (rs) { return setTimeout(rs, options.interval); }).then(wait);
        }
        return Promise.race([
            new Promise(function (_, rj) { return setTimeout(function () {
                timedOut = true;
                rj(new Error(options.present ? 'Element not found' : 'Element not removed'));
            }, options.timeout); }),
            wait()
        ]);
    }
    exports.waitFor = waitFor;
    function waitForDocumentElement(selector, options) {
        return waitFor(function () { return document.querySelector(selector); }, options);
    }
    exports.waitForDocumentElement = waitForDocumentElement;
    function waitForDocumentElements(selector, options) {
        return waitFor(function () { return document.querySelectorAll(selector); }, options);
    }
    exports.waitForDocumentElements = waitForDocumentElements;
});

/**
 * @license text 2.0.15 Copyright jQuery Foundation and other contributors.
 * Released under MIT license, http://github.com/requirejs/text/LICENSE
 */
/*jslint regexp: true */
/*global require, XMLHttpRequest, ActiveXObject,
  define, window, process, Packages,
  java, location, Components, FileUtils */

define('text/text',['module'], function (module) {
    'use strict';

    var text, fs, Cc, Ci, xpcIsWindows,
        progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'],
        xmlRegExp = /^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im,
        bodyRegExp = /<body[^>]*>\s*([\s\S]+)\s*<\/body>/im,
        hasLocation = typeof location !== 'undefined' && location.href,
        defaultProtocol = hasLocation && location.protocol && location.protocol.replace(/\:/, ''),
        defaultHostName = hasLocation && location.hostname,
        defaultPort = hasLocation && (location.port || undefined),
        buildMap = {},
        masterConfig = (module.config && module.config()) || {};

    function useDefault(value, defaultValue) {
        return value === undefined || value === '' ? defaultValue : value;
    }

    //Allow for default ports for http and https.
    function isSamePort(protocol1, port1, protocol2, port2) {
        if (port1 === port2) {
            return true;
        } else if (protocol1 === protocol2) {
            if (protocol1 === 'http') {
                return useDefault(port1, '80') === useDefault(port2, '80');
            } else if (protocol1 === 'https') {
                return useDefault(port1, '443') === useDefault(port2, '443');
            }
        }
        return false;
    }

    text = {
        version: '2.0.15',

        strip: function (content) {
            //Strips <?xml ...?> declarations so that external SVG and XML
            //documents can be added to a document without worry. Also, if the string
            //is an HTML document, only the part inside the body tag is returned.
            if (content) {
                content = content.replace(xmlRegExp, "");
                var matches = content.match(bodyRegExp);
                if (matches) {
                    content = matches[1];
                }
            } else {
                content = "";
            }
            return content;
        },

        jsEscape: function (content) {
            return content.replace(/(['\\])/g, '\\$1')
                .replace(/[\f]/g, "\\f")
                .replace(/[\b]/g, "\\b")
                .replace(/[\n]/g, "\\n")
                .replace(/[\t]/g, "\\t")
                .replace(/[\r]/g, "\\r")
                .replace(/[\u2028]/g, "\\u2028")
                .replace(/[\u2029]/g, "\\u2029");
        },

        createXhr: masterConfig.createXhr || function () {
            //Would love to dump the ActiveX crap in here. Need IE 6 to die first.
            var xhr, i, progId;
            if (typeof XMLHttpRequest !== "undefined") {
                return new XMLHttpRequest();
            } else if (typeof ActiveXObject !== "undefined") {
                for (i = 0; i < 3; i += 1) {
                    progId = progIds[i];
                    try {
                        xhr = new ActiveXObject(progId);
                    } catch (e) {}

                    if (xhr) {
                        progIds = [progId];  // so faster next time
                        break;
                    }
                }
            }

            return xhr;
        },

        /**
         * Parses a resource name into its component parts. Resource names
         * look like: module/name.ext!strip, where the !strip part is
         * optional.
         * @param {String} name the resource name
         * @returns {Object} with properties "moduleName", "ext" and "strip"
         * where strip is a boolean.
         */
        parseName: function (name) {
            var modName, ext, temp,
                strip = false,
                index = name.lastIndexOf("."),
                isRelative = name.indexOf('./') === 0 ||
                             name.indexOf('../') === 0;

            if (index !== -1 && (!isRelative || index > 1)) {
                modName = name.substring(0, index);
                ext = name.substring(index + 1);
            } else {
                modName = name;
            }

            temp = ext || modName;
            index = temp.indexOf("!");
            if (index !== -1) {
                //Pull off the strip arg.
                strip = temp.substring(index + 1) === "strip";
                temp = temp.substring(0, index);
                if (ext) {
                    ext = temp;
                } else {
                    modName = temp;
                }
            }

            return {
                moduleName: modName,
                ext: ext,
                strip: strip
            };
        },

        xdRegExp: /^((\w+)\:)?\/\/([^\/\\]+)/,

        /**
         * Is an URL on another domain. Only works for browser use, returns
         * false in non-browser environments. Only used to know if an
         * optimized .js version of a text resource should be loaded
         * instead.
         * @param {String} url
         * @returns Boolean
         */
        useXhr: function (url, protocol, hostname, port) {
            var uProtocol, uHostName, uPort,
                match = text.xdRegExp.exec(url);
            if (!match) {
                return true;
            }
            uProtocol = match[2];
            uHostName = match[3];

            uHostName = uHostName.split(':');
            uPort = uHostName[1];
            uHostName = uHostName[0];

            return (!uProtocol || uProtocol === protocol) &&
                   (!uHostName || uHostName.toLowerCase() === hostname.toLowerCase()) &&
                   ((!uPort && !uHostName) || isSamePort(uProtocol, uPort, protocol, port));
        },

        finishLoad: function (name, strip, content, onLoad) {
            content = strip ? text.strip(content) : content;
            if (masterConfig.isBuild) {
                buildMap[name] = content;
            }
            onLoad(content);
        },

        load: function (name, req, onLoad, config) {
            //Name has format: some.module.filext!strip
            //The strip part is optional.
            //if strip is present, then that means only get the string contents
            //inside a body tag in an HTML string. For XML/SVG content it means
            //removing the <?xml ...?> declarations so the content can be inserted
            //into the current doc without problems.

            // Do not bother with the work if a build and text will
            // not be inlined.
            if (config && config.isBuild && !config.inlineText) {
                onLoad();
                return;
            }

            masterConfig.isBuild = config && config.isBuild;

            var parsed = text.parseName(name),
                nonStripName = parsed.moduleName +
                    (parsed.ext ? '.' + parsed.ext : ''),
                url = req.toUrl(nonStripName),
                useXhr = (masterConfig.useXhr) ||
                         text.useXhr;

            // Do not load if it is an empty: url
            if (url.indexOf('empty:') === 0) {
                onLoad();
                return;
            }

            //Load the text. Use XHR if possible and in a browser.
            if (!hasLocation || useXhr(url, defaultProtocol, defaultHostName, defaultPort)) {
                text.get(url, function (content) {
                    text.finishLoad(name, parsed.strip, content, onLoad);
                }, function (err) {
                    if (onLoad.error) {
                        onLoad.error(err);
                    }
                });
            } else {
                //Need to fetch the resource across domains. Assume
                //the resource has been optimized into a JS module. Fetch
                //by the module name + extension, but do not include the
                //!strip part to avoid file system issues.
                req([nonStripName], function (content) {
                    text.finishLoad(parsed.moduleName + '.' + parsed.ext,
                                    parsed.strip, content, onLoad);
                });
            }
        },

        write: function (pluginName, moduleName, write, config) {
            if (buildMap.hasOwnProperty(moduleName)) {
                var content = text.jsEscape(buildMap[moduleName]);
                write.asModule(pluginName + "!" + moduleName,
                               "define(function () { return '" +
                                   content +
                               "';});\n");
            }
        },

        writeFile: function (pluginName, moduleName, req, write, config) {
            var parsed = text.parseName(moduleName),
                extPart = parsed.ext ? '.' + parsed.ext : '',
                nonStripName = parsed.moduleName + extPart,
                //Use a '.js' file name so that it indicates it is a
                //script that can be loaded across domains.
                fileName = req.toUrl(parsed.moduleName + extPart) + '.js';

            //Leverage own load() method to load plugin value, but only
            //write out values that do not have the strip argument,
            //to avoid any potential issues with ! in file names.
            text.load(nonStripName, req, function (value) {
                //Use own write() method to construct full module value.
                //But need to create shell that translates writeFile's
                //write() to the right interface.
                var textWrite = function (contents) {
                    return write(fileName, contents);
                };
                textWrite.asModule = function (moduleName, contents) {
                    return write.asModule(moduleName, fileName, contents);
                };

                text.write(pluginName, nonStripName, textWrite, config);
            }, config);
        }
    };

    if (masterConfig.env === 'node' || (!masterConfig.env &&
            typeof process !== "undefined" &&
            process.versions &&
            !!process.versions.node &&
            !process.versions['node-webkit'] &&
            !process.versions['atom-shell'])) {
        //Using special require.nodeRequire, something added by r.js.
        fs = require.nodeRequire('fs');

        text.get = function (url, callback, errback) {
            try {
                var file = fs.readFileSync(url, 'utf8');
                //Remove BOM (Byte Mark Order) from utf8 files if it is there.
                if (file[0] === '\uFEFF') {
                    file = file.substring(1);
                }
                callback(file);
            } catch (e) {
                if (errback) {
                    errback(e);
                }
            }
        };
    } else if (masterConfig.env === 'xhr' || (!masterConfig.env &&
            text.createXhr())) {
        text.get = function (url, callback, errback, headers) {
            var xhr = text.createXhr(), header;
            xhr.open('GET', url, true);

            //Allow plugins direct access to xhr headers
            if (headers) {
                for (header in headers) {
                    if (headers.hasOwnProperty(header)) {
                        xhr.setRequestHeader(header.toLowerCase(), headers[header]);
                    }
                }
            }

            //Allow overrides specified in config
            if (masterConfig.onXhr) {
                masterConfig.onXhr(xhr, url);
            }

            xhr.onreadystatechange = function (evt) {
                var status, err;
                //Do not explicitly handle errors, those should be
                //visible via console output in the browser.
                if (xhr.readyState === 4) {
                    status = xhr.status || 0;
                    if (status > 399 && status < 600) {
                        //An http 4xx or 5xx error. Signal an error.
                        err = new Error(url + ' HTTP status: ' + status);
                        err.xhr = xhr;
                        if (errback) {
                            errback(err);
                        }
                    } else {
                        callback(xhr.responseText);
                    }

                    if (masterConfig.onXhrComplete) {
                        masterConfig.onXhrComplete(xhr, url);
                    }
                }
            };
            xhr.send(null);
        };
    } else if (masterConfig.env === 'rhino' || (!masterConfig.env &&
            typeof Packages !== 'undefined' && typeof java !== 'undefined')) {
        //Why Java, why is this so awkward?
        text.get = function (url, callback) {
            var stringBuffer, line,
                encoding = "utf-8",
                file = new java.io.File(url),
                lineSeparator = java.lang.System.getProperty("line.separator"),
                input = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(file), encoding)),
                content = '';
            try {
                stringBuffer = new java.lang.StringBuffer();
                line = input.readLine();

                // Byte Order Mark (BOM) - The Unicode Standard, version 3.0, page 324
                // http://www.unicode.org/faq/utf_bom.html

                // Note that when we use utf-8, the BOM should appear as "EF BB BF", but it doesn't due to this bug in the JDK:
                // http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4508058
                if (line && line.length() && line.charAt(0) === 0xfeff) {
                    // Eat the BOM, since we've already found the encoding on this file,
                    // and we plan to concatenating this buffer with others; the BOM should
                    // only appear at the top of a file.
                    line = line.substring(1);
                }

                if (line !== null) {
                    stringBuffer.append(line);
                }

                while ((line = input.readLine()) !== null) {
                    stringBuffer.append(lineSeparator);
                    stringBuffer.append(line);
                }
                //Make sure we return a JavaScript string and not a Java string.
                content = String(stringBuffer.toString()); //String
            } finally {
                input.close();
            }
            callback(content);
        };
    } else if (masterConfig.env === 'xpconnect' || (!masterConfig.env &&
            typeof Components !== 'undefined' && Components.classes &&
            Components.interfaces)) {
        //Avert your gaze!
        Cc = Components.classes;
        Ci = Components.interfaces;
        Components.utils['import']('resource://gre/modules/FileUtils.jsm');
        xpcIsWindows = ('@mozilla.org/windows-registry-key;1' in Cc);

        text.get = function (url, callback) {
            var inStream, convertStream, fileObj,
                readData = {};

            if (xpcIsWindows) {
                url = url.replace(/\//g, '\\');
            }

            fileObj = new FileUtils.File(url);

            //XPCOM, you so crazy
            try {
                inStream = Cc['@mozilla.org/network/file-input-stream;1']
                           .createInstance(Ci.nsIFileInputStream);
                inStream.init(fileObj, 1, 0, false);

                convertStream = Cc['@mozilla.org/intl/converter-input-stream;1']
                                .createInstance(Ci.nsIConverterInputStream);
                convertStream.init(inStream, "utf-8", inStream.available(),
                Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

                convertStream.readString(inStream.available(), readData);
                convertStream.close();
                inStream.close();
                callback(readData.value);
            } catch (e) {
                throw new Error((fileObj && fileObj.path || '') + ': ' + e);
            }
        };
    }
    return text;
});

define('aurelia-binding',['aurelia-binding/dist/es2015/aurelia-binding'],function(m){return m;});
define('aurelia-bootstrapper',['aurelia-bootstrapper/dist/commonjs/aurelia-bootstrapper'],function(m){return m;});
define('aurelia-dependency-injection',['aurelia-dependency-injection/dist/es2015/aurelia-dependency-injection'],function(m){return m;});
define('aurelia-event-aggregator',['aurelia-event-aggregator/dist/commonjs/aurelia-event-aggregator'],function(m){return m;});
define('aurelia-framework',['aurelia-framework/dist/commonjs/aurelia-framework'],function(m){return m;});
define('aurelia-history',['aurelia-history/dist/commonjs/aurelia-history'],function(m){return m;});
define('aurelia-history-browser',['aurelia-history-browser/dist/commonjs/aurelia-history-browser'],function(m){return m;});
define('aurelia-loader',['aurelia-loader/dist/commonjs/aurelia-loader'],function(m){return m;});
define('aurelia-loader-default',['aurelia-loader-default/dist/commonjs/aurelia-loader-default'],function(m){return m;});
define('aurelia-logging',['aurelia-logging/dist/commonjs/aurelia-logging'],function(m){return m;});
define('aurelia-logging-console',['aurelia-logging-console/dist/commonjs/aurelia-logging-console'],function(m){return m;});
define('aurelia-metadata',['aurelia-metadata/dist/commonjs/aurelia-metadata'],function(m){return m;});
define('aurelia-pal',['aurelia-pal/dist/commonjs/aurelia-pal'],function(m){return m;});
define('aurelia-pal-browser',['aurelia-pal-browser/dist/commonjs/aurelia-pal-browser'],function(m){return m;});
define('aurelia-path',['aurelia-path/dist/commonjs/aurelia-path'],function(m){return m;});
define('aurelia-polyfills',['aurelia-polyfills/dist/commonjs/aurelia-polyfills'],function(m){return m;});
define('aurelia-route-recognizer',['aurelia-route-recognizer/dist/es2015/aurelia-route-recognizer'],function(m){return m;});
define('aurelia-router',['aurelia-router/dist/commonjs/aurelia-router'],function(m){return m;});
define('aurelia-task-queue',['aurelia-task-queue/dist/commonjs/aurelia-task-queue'],function(m){return m;});
define('aurelia-templating',['aurelia-templating/dist/es2015/aurelia-templating'],function(m){return m;});
define('aurelia-templating-binding',['aurelia-templating-binding/dist/es2015/aurelia-templating-binding'],function(m){return m;});
define('aurelia-templating-resources',['aurelia-templating-resources/aurelia-templating-resources'],function(m){return m;});
define('aurelia-templating-router',['aurelia-templating-router/aurelia-templating-router'],function(m){return m;});
define('aurelia-testing',['aurelia-testing/aurelia-testing'],function(m){return m;});
define('framework/api/application',['src/api/application'],function(m){return m;});
define('text!framework/api/application.html',['text!src/api/application.html'],function(m){return m;});
define('framework/api/datamodel',['src/api/datamodel'],function(m){return m;});
define('text!framework/api/datamodel.html',['text!src/api/datamodel.html'],function(m){return m;});
define('framework/api/datasource',['src/api/datasource'],function(m){return m;});
define('text!framework/api/datasource.html',['text!src/api/datasource.html'],function(m){return m;});
define('framework/api/event',['src/api/event'],function(m){return m;});
define('text!framework/api/event.html',['text!src/api/event.html'],function(m){return m;});
define('framework/api/http',['src/api/http'],function(m){return m;});
define('text!framework/api/http.html',['text!src/api/http.html'],function(m){return m;});
define('framework/api/view',['src/api/view'],function(m){return m;});
define('text!framework/api/view.html',['text!src/api/view.html'],function(m){return m;});
define('framework/app',['src/app'],function(m){return m;});
define('text!framework/app.html',['text!src/app.html'],function(m){return m;});
define('framework/components/alerts',['src/components/alerts'],function(m){return m;});
define('text!framework/components/alerts.html',['text!src/components/alerts.html'],function(m){return m;});
define('framework/components/dialogs',['src/components/dialogs'],function(m){return m;});
define('text!framework/components/dialogs.html',['text!src/components/dialogs.html'],function(m){return m;});
define('framework/components/dlg-lifecycle',['src/components/dlg-lifecycle'],function(m){return m;});
define('framework/components/dlg-view',['src/components/dlg-view'],function(m){return m;});
define('text!framework/components/dlg-view.html',['text!src/components/dlg-view.html'],function(m){return m;});
define('framework/components/drawer',['src/components/drawer'],function(m){return m;});
define('text!framework/components/drawer.html',['text!src/components/drawer.html'],function(m){return m;});
define('framework/components/indicators',['src/components/indicators'],function(m){return m;});
define('text!framework/components/indicators.html',['text!src/components/indicators.html'],function(m){return m;});
define('framework/components/menu',['src/components/menu'],function(m){return m;});
define('text!framework/components/menu.html',['text!src/components/menu.html'],function(m){return m;});
define('framework/components/panel',['src/components/panel'],function(m){return m;});
define('text!framework/components/panel.html',['text!src/components/panel.html'],function(m){return m;});
define('framework/components/sidebar',['src/components/sidebar'],function(m){return m;});
define('text!framework/components/sidebar.html',['text!src/components/sidebar.html'],function(m){return m;});
define('framework/components/statsbar',['src/components/statsbar'],function(m){return m;});
define('text!framework/components/statsbar.html',['text!src/components/statsbar.html'],function(m){return m;});
define('framework/components/tabpanel',['src/components/tabpanel'],function(m){return m;});
define('text!framework/components/tabpanel.html',['text!src/components/tabpanel.html'],function(m){return m;});
define('framework/components/toolbar',['src/components/toolbar'],function(m){return m;});
define('text!framework/components/toolbar.html',['text!src/components/toolbar.html'],function(m){return m;});
define('framework/components/tooltips',['src/components/tooltips'],function(m){return m;});
define('text!framework/components/tooltips.html',['text!src/components/tooltips.html'],function(m){return m;});
define('framework/components/tree',['src/components/tree'],function(m){return m;});
define('text!framework/components/tree.html',['text!src/components/tree.html'],function(m){return m;});
define('framework/core/grid',['src/core/grid'],function(m){return m;});
define('text!framework/core/grid.html',['text!src/core/grid.html'],function(m){return m;});
define('framework/core/page',['src/core/page'],function(m){return m;});
define('text!framework/core/page.html',['text!src/core/page.html'],function(m){return m;});
define('framework/core/viewport',['src/core/viewport'],function(m){return m;});
define('text!framework/core/viewport.html',['text!src/core/viewport.html'],function(m){return m;});
define('framework/datagrids/basic',['src/datagrids/basic'],function(m){return m;});
define('text!framework/datagrids/basic.html',['text!src/datagrids/basic.html'],function(m){return m;});
define('framework/datagrids/view',['src/datagrids/view'],function(m){return m;});
define('text!framework/datagrids/view.html',['text!src/datagrids/view.html'],function(m){return m;});
define('text!framework/home/lipsum-big.html',['text!src/home/lipsum-big.html'],function(m){return m;});
define('text!framework/home/lipsum-page.html',['text!src/home/lipsum-page.html'],function(m){return m;});
define('text!framework/home/lipsum-small.html',['text!src/home/lipsum-small.html'],function(m){return m;});
define('framework/home/unknown',['src/home/unknown'],function(m){return m;});
define('framework/home/view',['src/home/view'],function(m){return m;});
define('text!framework/home/view.html',['text!src/home/view.html'],function(m){return m;});
define('framework/inputs/buttons',['src/inputs/buttons'],function(m){return m;});
define('text!framework/inputs/buttons.html',['text!src/inputs/buttons.html'],function(m){return m;});
define('framework/inputs/content',['src/inputs/content'],function(m){return m;});
define('text!framework/inputs/content.html',['text!src/inputs/content.html'],function(m){return m;});
define('framework/inputs/dates',['src/inputs/dates'],function(m){return m;});
define('text!framework/inputs/dates.html',['text!src/inputs/dates.html'],function(m){return m;});
define('framework/inputs/inputs',['src/inputs/inputs'],function(m){return m;});
define('text!framework/inputs/inputs.html',['text!src/inputs/inputs.html'],function(m){return m;});
define('framework/inputs/lists',['src/inputs/lists'],function(m){return m;});
define('text!framework/inputs/lists.html',['text!src/inputs/lists.html'],function(m){return m;});
define('framework/inputs/options',['src/inputs/options'],function(m){return m;});
define('text!framework/inputs/options.html',['text!src/inputs/options.html'],function(m){return m;});
define('framework/inputs/validation',['src/inputs/validation'],function(m){return m;});
define('text!framework/inputs/validation.html',['text!src/inputs/validation.html'],function(m){return m;});
define('framework/main',['src/main'],function(m){return m;});
define('framework/resources/elements/container',['src/resources/elements/container'],function(m){return m;});
define('text!framework/resources/elements/container.html',['text!src/resources/elements/container.html'],function(m){return m;});
define('framework/resources/index',['src/resources/index'],function(m){return m;});
define('framework/samples/dashboard/dashboard',['src/samples/dashboard/dashboard'],function(m){return m;});
define('text!framework/samples/dashboard/dashboard.html',['text!src/samples/dashboard/dashboard.html'],function(m){return m;});
define('framework/samples/dashboard/view',['src/samples/dashboard/view'],function(m){return m;});
define('text!framework/samples/dashboard/view.html',['text!src/samples/dashboard/view.html'],function(m){return m;});
define('framework/samples/desktop/view',['src/samples/desktop/view'],function(m){return m;});
define('text!framework/samples/desktop/view.html',['text!src/samples/desktop/view.html'],function(m){return m;});
define('framework/samples/home',['src/samples/home'],function(m){return m;});
define('text!framework/samples/home.html',['text!src/samples/home.html'],function(m){return m;});
define('text!framework/samples/tabbed/home.html',['text!src/samples/tabbed/home.html'],function(m){return m;});
define('framework/samples/tabbed/view',['src/samples/tabbed/view'],function(m){return m;});
define('text!framework/samples/tabbed/view.html',['text!src/samples/tabbed/view.html'],function(m){return m;});
define('framework/start/install',['src/start/install'],function(m){return m;});
define('text!framework/start/install.html',['text!src/start/install.html'],function(m){return m;});
define('framework/start/prereq',['src/start/prereq'],function(m){return m;});
define('text!framework/start/prereq.html',['text!src/start/prereq.html'],function(m){return m;});
define('framework/start/view',['src/start/view'],function(m){return m;});
define('text!framework/start/view.html',['text!src/start/view.html'],function(m){return m;});
define('framework/styles/colors',['src/styles/colors'],function(m){return m;});
define('text!framework/styles/colors.html',['text!src/styles/colors.html'],function(m){return m;});
define('framework/styles/flags',['src/styles/flags'],function(m){return m;});
define('text!framework/styles/flags.html',['text!src/styles/flags.html'],function(m){return m;});
define('framework/styles/glyphs',['src/styles/glyphs'],function(m){return m;});
define('text!framework/styles/glyphs.html',['text!src/styles/glyphs.html'],function(m){return m;});
define('framework/styles/home',['src/styles/home'],function(m){return m;});
define('text!framework/styles/home.html',['text!src/styles/home.html'],function(m){return m;});
define('framework/styles/typo',['src/styles/typo'],function(m){return m;});
define('text!framework/styles/typo.html',['text!src/styles/typo.html'],function(m){return m;});
define('framework/styles/view',['src/styles/view'],function(m){return m;});
define('text!framework/styles/view.html',['text!src/styles/view.html'],function(m){return m;});
define('text',['text/text'],function(m){return m;});
function _aureliaConfigureModuleLoader(){requirejs.config({
  "baseUrl": "examples",
  "paths": {
    "root": "examples",
    "framework": "src",
    "resources": "resources",
    "elements": "resources/elements",
    "attributes": "resources/attributes",
    "valueConverters": "resources/value-converters",
    "bindingBehaviors": "resources/binding-behaviors",
    "app-bundle": "../scripts/app-bundle",
    "framework-bundle": "../scripts/framework-bundle",
    "charts-bundle": "../scripts/charts-bundle",
    "addons-bundle": "../scripts/addons-bundle"
  },
  "packages": [],
  "stubModules": [],
  "shim": {},
  "bundles": {
    "app-bundle": [
      "environment",
      "src/api/application",
      "text!src/api/application.html",
      "src/api/datamodel",
      "text!src/api/datamodel.html",
      "src/api/datasource",
      "text!src/api/datasource.html",
      "src/api/event",
      "text!src/api/event.html",
      "src/api/http",
      "text!src/api/http.html",
      "src/api/view",
      "text!src/api/view.html",
      "src/app",
      "text!src/app.html",
      "src/components/alerts",
      "text!src/components/alerts.html",
      "src/components/dialogs",
      "text!src/components/dialogs.html",
      "src/components/dlg-lifecycle",
      "src/components/dlg-view",
      "text!src/components/dlg-view.html",
      "src/components/drawer",
      "text!src/components/drawer.html",
      "src/components/indicators",
      "text!src/components/indicators.html",
      "src/components/menu",
      "text!src/components/menu.html",
      "src/components/panel",
      "text!src/components/panel.html",
      "src/components/sidebar",
      "text!src/components/sidebar.html",
      "src/components/statsbar",
      "text!src/components/statsbar.html",
      "src/components/tabpanel",
      "text!src/components/tabpanel.html",
      "src/components/toolbar",
      "text!src/components/toolbar.html",
      "src/components/tooltips",
      "text!src/components/tooltips.html",
      "src/components/tree",
      "text!src/components/tree.html",
      "src/core/grid",
      "text!src/core/grid.html",
      "src/core/page",
      "text!src/core/page.html",
      "src/core/viewport",
      "text!src/core/viewport.html",
      "src/datagrids/basic",
      "text!src/datagrids/basic.html",
      "src/datagrids/view",
      "text!src/datagrids/view.html",
      "text!src/home/lipsum-big.html",
      "text!src/home/lipsum-page.html",
      "text!src/home/lipsum-small.html",
      "src/home/unknown",
      "src/home/view",
      "text!src/home/view.html",
      "src/inputs/buttons",
      "text!src/inputs/buttons.html",
      "src/inputs/content",
      "text!src/inputs/content.html",
      "src/inputs/dates",
      "text!src/inputs/dates.html",
      "src/inputs/inputs",
      "text!src/inputs/inputs.html",
      "src/inputs/lists",
      "text!src/inputs/lists.html",
      "src/inputs/options",
      "text!src/inputs/options.html",
      "src/inputs/validation",
      "text!src/inputs/validation.html",
      "src/main",
      "src/resources/elements/container",
      "text!src/resources/elements/container.html",
      "src/resources/index",
      "src/samples/dashboard/dashboard",
      "text!src/samples/dashboard/dashboard.html",
      "src/samples/dashboard/view",
      "text!src/samples/dashboard/view.html",
      "src/samples/desktop/view",
      "text!src/samples/desktop/view.html",
      "src/samples/home",
      "text!src/samples/home.html",
      "text!src/samples/tabbed/home.html",
      "src/samples/tabbed/view",
      "text!src/samples/tabbed/view.html",
      "src/start/install",
      "text!src/start/install.html",
      "src/start/prereq",
      "text!src/start/prereq.html",
      "src/start/view",
      "text!src/start/view.html",
      "src/styles/colors",
      "text!src/styles/colors.html",
      "src/styles/flags",
      "text!src/styles/flags.html",
      "src/styles/glyphs",
      "text!src/styles/glyphs.html",
      "src/styles/home",
      "text!src/styles/home.html",
      "src/styles/typo",
      "text!src/styles/typo.html",
      "src/styles/view",
      "text!src/styles/view.html"
    ],
    "framework-bundle": [
      "auf-utility-library",
      "auf-utility-library/index",
      "auf-utility-library/libs/countries",
      "auf-utility-library/libs/currencies",
      "auf-utility-library/libs/filetypes",
      "auf-utility-library/libs/phonelib",
      "auf-utility-library/libs/window",
      "aurelia-ui-framework",
      "aurelia-ui-framework/attributes/ui-badge",
      "aurelia-ui-framework/attributes/ui-colors",
      "aurelia-ui-framework/attributes/ui-ribbon",
      "aurelia-ui-framework/attributes/ui-tooltip",
      "aurelia-ui-framework/aurelia-ui-framework",
      "aurelia-ui-framework/data/ui-datamodel",
      "aurelia-ui-framework/data/ui-datasource",
      "aurelia-ui-framework/data/ui-treemodel",
      "aurelia-ui-framework/elements/components/ui-alerts",
      "aurelia-ui-framework/elements/components/ui-bars",
      "aurelia-ui-framework/elements/components/ui-datagrid",
      "aurelia-ui-framework/elements/components/ui-dg-columns",
      "aurelia-ui-framework/elements/components/ui-drawer",
      "aurelia-ui-framework/elements/components/ui-dropdown",
      "aurelia-ui-framework/elements/components/ui-indicators",
      "aurelia-ui-framework/elements/components/ui-menu",
      "aurelia-ui-framework/elements/components/ui-panel",
      "aurelia-ui-framework/elements/components/ui-sidebar",
      "aurelia-ui-framework/elements/components/ui-tabpanel",
      "aurelia-ui-framework/elements/components/ui-tree",
      "aurelia-ui-framework/elements/core/ui-glyphs",
      "aurelia-ui-framework/elements/core/ui-grid",
      "aurelia-ui-framework/elements/core/ui-page",
      "aurelia-ui-framework/elements/core/ui-viewport",
      "aurelia-ui-framework/elements/inputs/ui-button",
      "aurelia-ui-framework/elements/inputs/ui-date",
      "aurelia-ui-framework/elements/inputs/ui-form",
      "aurelia-ui-framework/elements/inputs/ui-input",
      "aurelia-ui-framework/elements/inputs/ui-list",
      "aurelia-ui-framework/elements/inputs/ui-markdown",
      "aurelia-ui-framework/elements/inputs/ui-options",
      "aurelia-ui-framework/elements/inputs/ui-phone",
      "aurelia-ui-framework/elements/inputs/ui-textarea",
      "aurelia-ui-framework/utils/ui-application",
      "aurelia-ui-framework/utils/ui-constants",
      "aurelia-ui-framework/utils/ui-dialog",
      "aurelia-ui-framework/utils/ui-event",
      "aurelia-ui-framework/utils/ui-format",
      "aurelia-ui-framework/utils/ui-http",
      "aurelia-ui-framework/utils/ui-utils",
      "aurelia-ui-framework/utils/ui-validation",
      "aurelia-ui-framework/value-converters/ui-lodash",
      "aurelia-ui-framework/value-converters/ui-text"
    ],
    "charts-bundle": [
      "amcharts",
      "amcharts/amcharts",
      "amcharts/gantt",
      "amcharts/gauge",
      "amcharts/pie",
      "amcharts/plugins/responsive/responsive",
      "amcharts/serial",
      "amcharts/themes/dark",
      "amcharts/themes/light",
      "amcharts/xy"
    ],
    "addons-bundle": [
      "aurelia-animator-css",
      "aurelia-animator-css/dist/commonjs/aurelia-animator-css",
      "aurelia-fetch-client",
      "aurelia-fetch-client/dist/commonjs/aurelia-fetch-client",
      "aurelia-ui-virtualization",
      "aurelia-ui-virtualization/array-virtual-repeat-strategy",
      "aurelia-ui-virtualization/aurelia-ui-virtualization",
      "aurelia-ui-virtualization/dom-helper",
      "aurelia-ui-virtualization/infinite-scroll-next",
      "aurelia-ui-virtualization/null-virtual-repeat-strategy",
      "aurelia-ui-virtualization/template-strategy",
      "aurelia-ui-virtualization/utilities",
      "aurelia-ui-virtualization/virtual-repeat",
      "aurelia-ui-virtualization/virtual-repeat-strategy-locator",
      "aurelia-validation",
      "aurelia-validation/aurelia-validation",
      "highlightjs",
      "highlightjs/highlight.pack.min",
      "kramed",
      "kramed/kramed",
      "kramed/lex/block",
      "kramed/lex/html_blocks",
      "kramed/lex/inline",
      "kramed/lex/options",
      "kramed/parser",
      "kramed/renderer",
      "kramed/rules/block",
      "kramed/rules/inline",
      "kramed/utils",
      "lodash",
      "lodash/lodash",
      "moment",
      "moment/moment",
      "numeral",
      "numeral/numeral"
    ]
  }
})}