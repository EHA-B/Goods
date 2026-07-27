import require$$0 from "events";
import require$$4 from "timers";
import require$$3 from "util";
import require$$2 from "stream";
import require$$0$1 from "tty";
import require$$2$1 from "os";
import require$$0$3 from "path";
import require$$0$2 from "fs";
import require$$1 from "url";
import require$$0$4 from "assert";
import require$$1$1 from "better-sqlite3";
import require$$15 from "pg";
import require$$13 from "tedious";
import require$$14 from "mysql";
import require$$4$1 from "mariadb/callback";
import require$$2$2 from "mysql2";
import require$$0$5 from "crypto";
import require$$3$1 from "oracledb";
import { app } from "electron";
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
function getAugmentedNamespace(n) {
  if (n.__esModule) return n;
  var f = n.default;
  if (typeof f == "function") {
    var a = function a2() {
      if (this instanceof a2) {
        return Reflect.construct(f, arguments, this.constructor);
      }
      return f.apply(this, arguments);
    };
    a.prototype = f.prototype;
  } else a = {};
  Object.defineProperty(a, "__esModule", { value: true });
  Object.keys(n).forEach(function(k) {
    var d = Object.getOwnPropertyDescriptor(n, k);
    Object.defineProperty(a, k, d.get ? d : {
      enumerable: true,
      get: function() {
        return n[k];
      }
    });
  });
  return a;
}
var tarn = { exports: {} };
var Pool$2 = {};
var PendingOperation$1 = {};
var TimeoutError$2 = {};
Object.defineProperty(TimeoutError$2, "__esModule", { value: true });
TimeoutError$2.TimeoutError = void 0;
let TimeoutError$1 = class TimeoutError extends Error {
};
TimeoutError$2.TimeoutError = TimeoutError$1;
var utils$3 = {};
var PromiseInspection$1 = {};
Object.defineProperty(PromiseInspection$1, "__esModule", { value: true });
PromiseInspection$1.PromiseInspection = void 0;
class PromiseInspection {
  constructor(args) {
    this._value = args.value;
    this._error = args.error;
  }
  value() {
    return this._value;
  }
  reason() {
    return this._error;
  }
  isRejected() {
    return !!this._error;
  }
  isFulfilled() {
    return !!this._value;
  }
}
PromiseInspection$1.PromiseInspection = PromiseInspection;
Object.defineProperty(utils$3, "__esModule", { value: true });
utils$3.defer = defer;
utils$3.now = now;
utils$3.duration = duration;
utils$3.checkOptionalTime = checkOptionalTime;
utils$3.checkRequiredTime = checkRequiredTime;
utils$3.delay = delay$2;
utils$3.reflect = reflect;
utils$3.tryPromise = tryPromise;
const PromiseInspection_1 = PromiseInspection$1;
function defer() {
  let resolve = null;
  let reject2 = null;
  const promise = new Promise((resolver, rejecter) => {
    resolve = resolver;
    reject2 = rejecter;
  });
  return {
    promise,
    resolve,
    reject: reject2
  };
}
function now() {
  return Date.now();
}
function duration(t1, t2) {
  return Math.abs(t2 - t1);
}
function checkOptionalTime(time) {
  if (typeof time === "undefined") {
    return true;
  }
  return checkRequiredTime(time);
}
function checkRequiredTime(time) {
  return typeof time === "number" && time === Math.round(time) && time > 0;
}
function delay$2(millis) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}
function reflect(promise) {
  return promise.then((value) => {
    return new PromiseInspection_1.PromiseInspection({ value });
  }).catch((error) => {
    return new PromiseInspection_1.PromiseInspection({ error });
  });
}
function tryPromise(cb) {
  try {
    const result = cb();
    return Promise.resolve(result);
  } catch (err) {
    return Promise.reject(err);
  }
}
Object.defineProperty(PendingOperation$1, "__esModule", { value: true });
PendingOperation$1.PendingOperation = void 0;
const TimeoutError_1 = TimeoutError$2;
const utils_1$2 = utils$3;
class PendingOperation {
  constructor(timeoutMillis) {
    this.timeoutMillis = timeoutMillis;
    this.deferred = (0, utils_1$2.defer)();
    this.possibleTimeoutCause = null;
    this.isRejected = false;
    this.promise = timeout$4(this.deferred.promise, timeoutMillis).catch((err) => {
      if (err instanceof TimeoutError_1.TimeoutError) {
        if (this.possibleTimeoutCause) {
          err = new TimeoutError_1.TimeoutError(this.possibleTimeoutCause.message);
        } else {
          err = new TimeoutError_1.TimeoutError("operation timed out for an unknown reason");
        }
      }
      this.deferred.reject(err);
      this.isRejected = true;
      return Promise.reject(err);
    });
  }
  abort() {
    this.reject(new Error("aborted"));
  }
  reject(err) {
    this.deferred.reject(err);
  }
  resolve(value) {
    this.deferred.resolve(value);
  }
}
PendingOperation$1.PendingOperation = PendingOperation;
function timeout$4(promise, time) {
  return new Promise((resolve, reject2) => {
    const timeoutHandle = setTimeout(() => reject2(new TimeoutError_1.TimeoutError()), time);
    promise.then((result) => {
      clearTimeout(timeoutHandle);
      resolve(result);
    }).catch((err) => {
      clearTimeout(timeoutHandle);
      reject2(err);
    });
  });
}
var Resource$1 = {};
Object.defineProperty(Resource$1, "__esModule", { value: true });
Resource$1.Resource = void 0;
const utils_1$1 = utils$3;
class Resource {
  constructor(resource) {
    this.resource = resource;
    this.resource = resource;
    this.timestamp = (0, utils_1$1.now)();
    this.deferred = (0, utils_1$1.defer)();
  }
  get promise() {
    return this.deferred.promise;
  }
  resolve() {
    this.deferred.resolve(void 0);
    return new Resource(this.resource);
  }
  settle() {
    this.deferred.resolve(void 0);
  }
}
Resource$1.Resource = Resource;
Object.defineProperty(Pool$2, "__esModule", { value: true });
Pool$2.Pool = void 0;
const PendingOperation_1 = PendingOperation$1;
const Resource_1 = Resource$1;
const utils_1 = utils$3;
const events_1 = require$$0;
const timers_1 = require$$4;
let Pool$1 = class Pool {
  constructor(opt) {
    this.destroyed = false;
    this.emitter = new events_1.EventEmitter();
    opt = opt || {};
    if (!opt.create) {
      throw new Error("Tarn: opt.create function most be provided");
    }
    if (!opt.destroy) {
      throw new Error("Tarn: opt.destroy function most be provided");
    }
    if (typeof opt.min !== "number" || opt.min < 0 || opt.min !== Math.round(opt.min)) {
      throw new Error("Tarn: opt.min must be an integer >= 0");
    }
    if (typeof opt.max !== "number" || opt.max <= 0 || opt.max !== Math.round(opt.max)) {
      throw new Error("Tarn: opt.max must be an integer > 0");
    }
    if (opt.min > opt.max) {
      throw new Error("Tarn: opt.max is smaller than opt.min");
    }
    if (!(0, utils_1.checkOptionalTime)(opt.acquireTimeoutMillis)) {
      throw new Error("Tarn: invalid opt.acquireTimeoutMillis " + JSON.stringify(opt.acquireTimeoutMillis));
    }
    if (!(0, utils_1.checkOptionalTime)(opt.createTimeoutMillis)) {
      throw new Error("Tarn: invalid opt.createTimeoutMillis " + JSON.stringify(opt.createTimeoutMillis));
    }
    if (!(0, utils_1.checkOptionalTime)(opt.destroyTimeoutMillis)) {
      throw new Error("Tarn: invalid opt.destroyTimeoutMillis " + JSON.stringify(opt.destroyTimeoutMillis));
    }
    if (!(0, utils_1.checkOptionalTime)(opt.idleTimeoutMillis)) {
      throw new Error("Tarn: invalid opt.idleTimeoutMillis " + JSON.stringify(opt.idleTimeoutMillis));
    }
    if (!(0, utils_1.checkOptionalTime)(opt.reapIntervalMillis)) {
      throw new Error("Tarn: invalid opt.reapIntervalMillis " + JSON.stringify(opt.reapIntervalMillis));
    }
    if (!(0, utils_1.checkOptionalTime)(opt.createRetryIntervalMillis)) {
      throw new Error("Tarn: invalid opt.createRetryIntervalMillis " + JSON.stringify(opt.createRetryIntervalMillis));
    }
    const allowedKeys = {
      create: true,
      validate: true,
      destroy: true,
      log: true,
      min: true,
      max: true,
      acquireTimeoutMillis: true,
      createTimeoutMillis: true,
      destroyTimeoutMillis: true,
      idleTimeoutMillis: true,
      reapIntervalMillis: true,
      createRetryIntervalMillis: true,
      propagateCreateError: true
    };
    for (const key of Object.keys(opt)) {
      if (!allowedKeys[key]) {
        throw new Error(`Tarn: unsupported option opt.${key}`);
      }
    }
    this.creator = opt.create;
    this.destroyer = opt.destroy;
    this.validate = typeof opt.validate === "function" ? opt.validate : () => true;
    this.log = opt.log || (() => {
    });
    this.acquireTimeoutMillis = opt.acquireTimeoutMillis || 3e4;
    this.createTimeoutMillis = opt.createTimeoutMillis || 3e4;
    this.destroyTimeoutMillis = opt.destroyTimeoutMillis || 5e3;
    this.idleTimeoutMillis = opt.idleTimeoutMillis || 3e4;
    this.reapIntervalMillis = opt.reapIntervalMillis || 1e3;
    this.createRetryIntervalMillis = opt.createRetryIntervalMillis || 200;
    this.propagateCreateError = !!opt.propagateCreateError;
    this.min = opt.min;
    this.max = opt.max;
    this.used = [];
    this.free = [];
    this.pendingCreates = [];
    this.pendingAcquires = [];
    this.pendingDestroys = [];
    this.pendingRetryTimers = [];
    this.pendingValidations = [];
    this.destroyed = false;
    this.interval = null;
    this.eventId = 1;
  }
  numUsed() {
    return this.used.length;
  }
  numFree() {
    return this.free.length;
  }
  numPendingAcquires() {
    return this.pendingAcquires.length;
  }
  numPendingValidations() {
    return this.pendingValidations.length;
  }
  numPendingCreates() {
    return this.pendingCreates.length;
  }
  acquire() {
    const eventId = this.eventId++;
    this._executeEventHandlers("acquireRequest", eventId);
    const pendingAcquire = new PendingOperation_1.PendingOperation(this.acquireTimeoutMillis);
    this.pendingAcquires.push(pendingAcquire);
    pendingAcquire.promise = pendingAcquire.promise.then((resource) => {
      this._executeEventHandlers("acquireSuccess", eventId, resource);
      return resource;
    }).catch((err) => {
      this._executeEventHandlers("acquireFail", eventId, err);
      remove(this.pendingAcquires, pendingAcquire);
      return Promise.reject(err);
    });
    this._tryAcquireOrCreate();
    return pendingAcquire;
  }
  release(resource) {
    this._executeEventHandlers("release", resource);
    for (let i = 0, l = this.used.length; i < l; ++i) {
      const used = this.used[i];
      if (used.resource === resource) {
        this.used.splice(i, 1);
        this.free.push(used.resolve());
        this._tryAcquireOrCreate();
        return true;
      }
    }
    return false;
  }
  isEmpty() {
    return [
      this.numFree(),
      this.numUsed(),
      this.numPendingAcquires(),
      this.numPendingValidations(),
      this.numPendingCreates()
    ].reduce((total, value) => total + value) === 0;
  }
  /**
   * Reaping cycle.
   */
  check() {
    const timestamp2 = (0, utils_1.now)();
    const newFree = [];
    const minKeep = this.min - this.used.length;
    const maxDestroy = this.free.length - minKeep;
    let numDestroyed = 0;
    this.free.forEach((free) => {
      if ((0, utils_1.duration)(timestamp2, free.timestamp) >= this.idleTimeoutMillis && numDestroyed < maxDestroy) {
        numDestroyed++;
        free.settle();
        this._destroy(free.resource);
      } else {
        newFree.push(free);
      }
    });
    this.free = newFree;
    if (this.isEmpty()) {
      this._stopReaping();
    }
  }
  destroy() {
    const eventId = this.eventId++;
    this._executeEventHandlers("poolDestroyRequest", eventId);
    this._stopReaping();
    this.destroyed = true;
    this.pendingRetryTimers.forEach((timer) => clearTimeout(timer));
    this.pendingRetryTimers = [];
    return (0, utils_1.reflect)(Promise.all(this.pendingCreates.map((create) => (0, utils_1.reflect)(create.promise))).then(() => {
      return new Promise((resolve, reject2) => {
        if (this.numPendingValidations() === 0) {
          resolve();
          return;
        }
        const interval = setInterval(() => {
          if (this.numPendingValidations() === 0) {
            (0, timers_1.clearInterval)(interval);
            resolve();
          }
        }, 100);
      });
    }).then(() => {
      return Promise.all(this.used.map((used) => (0, utils_1.reflect)(used.promise)));
    }).then(() => {
      return Promise.all(this.pendingAcquires.map((acquire) => {
        acquire.abort();
        return (0, utils_1.reflect)(acquire.promise);
      }));
    }).then(() => {
      this.free.forEach((free) => free.settle());
      return Promise.all(this.free.map((free) => (0, utils_1.reflect)(this._destroy(free.resource))));
    }).then(() => {
      return Promise.all(this.pendingDestroys.map((pd) => pd.promise));
    }).then(() => {
      this.free = [];
      this.pendingAcquires = [];
    })).then((res) => {
      this._executeEventHandlers("poolDestroySuccess", eventId);
      this.emitter.removeAllListeners();
      return res;
    });
  }
  on(event, listener) {
    this.emitter.on(event, listener);
  }
  removeListener(event, listener) {
    this.emitter.removeListener(event, listener);
  }
  removeAllListeners(event) {
    this.emitter.removeAllListeners(event);
  }
  /**
   * The most important method that is called always when resources
   * are created / destroyed / acquired / released. In other words
   * every time when resources are moved from used to free or vice
   * versa.
   *
   * Either assigns free resources to pendingAcquires or creates new
   * resources if there is room for it in the pool.
   */
  _tryAcquireOrCreate() {
    if (this.destroyed) {
      return;
    }
    if (this._hasFreeResources()) {
      this._doAcquire();
    } else if (this._shouldCreateMoreResources()) {
      this._doCreate();
    }
  }
  _hasFreeResources() {
    return this.free.length > 0;
  }
  _doAcquire() {
    while (this._canAcquire()) {
      const pendingAcquire = this.pendingAcquires.shift();
      const free = this.free.pop();
      if (free === void 0 || pendingAcquire === void 0) {
        const errMessage = "this.free was empty while trying to acquire resource";
        this.log(`Tarn: ${errMessage}`, "warn");
        throw new Error(`Internal error, should never happen. ${errMessage}`);
      }
      this.pendingValidations.push(pendingAcquire);
      this.used.push(free);
      const abortAbleValidation = new PendingOperation_1.PendingOperation(this.acquireTimeoutMillis);
      pendingAcquire.promise.catch((err) => {
        abortAbleValidation.abort();
      });
      abortAbleValidation.promise.catch((err) => {
        this.log("Tarn: resource validator threw an exception " + err.stack, "warn");
        return false;
      }).then((validationSuccess) => {
        try {
          if (validationSuccess && !pendingAcquire.isRejected) {
            this._startReaping();
            pendingAcquire.resolve(free.resource);
          } else {
            remove(this.used, free);
            if (!validationSuccess) {
              free.settle();
              this._destroy(free.resource);
              setTimeout(() => {
                this._tryAcquireOrCreate();
              }, 0);
            } else {
              this.free.push(free);
            }
            if (!pendingAcquire.isRejected) {
              this.pendingAcquires.unshift(pendingAcquire);
            }
          }
        } finally {
          remove(this.pendingValidations, pendingAcquire);
        }
      });
      this._validateResource(free.resource).then((validationSuccess) => {
        abortAbleValidation.resolve(validationSuccess);
      }).catch((err) => {
        abortAbleValidation.reject(err);
      });
    }
  }
  _canAcquire() {
    return this.free.length > 0 && this.pendingAcquires.length > 0;
  }
  _validateResource(resource) {
    try {
      return Promise.resolve(this.validate(resource));
    } catch (err) {
      return Promise.reject(err);
    }
  }
  _shouldCreateMoreResources() {
    return this.used.length + this.pendingCreates.length < this.max && this.pendingCreates.length < this.pendingAcquires.length;
  }
  _doCreate() {
    const pendingAcquiresBeforeCreate = this.pendingAcquires.slice();
    const pendingCreate = this._create();
    pendingCreate.promise.then(() => {
      this._tryAcquireOrCreate();
      return null;
    }).catch((err) => {
      if (this.destroyed) {
        return;
      }
      if (this.propagateCreateError && this.pendingAcquires.length !== 0) {
        this.pendingAcquires[0].reject(err);
      }
      pendingAcquiresBeforeCreate.forEach((pendingAcquire) => {
        pendingAcquire.possibleTimeoutCause = err;
      });
      const retryTimer = setTimeout(() => {
        remove(this.pendingRetryTimers, retryTimer);
        this._tryAcquireOrCreate();
      }, this.createRetryIntervalMillis);
      this.pendingRetryTimers.push(retryTimer);
    });
  }
  _create() {
    const eventId = this.eventId++;
    this._executeEventHandlers("createRequest", eventId);
    const pendingCreate = new PendingOperation_1.PendingOperation(this.createTimeoutMillis);
    pendingCreate.promise = pendingCreate.promise.catch((err) => {
      if (remove(this.pendingCreates, pendingCreate)) {
        this._executeEventHandlers("createFail", eventId, err);
      }
      throw err;
    });
    this.pendingCreates.push(pendingCreate);
    callbackOrPromise(this.creator).then((resource) => {
      if (pendingCreate.isRejected) {
        this.destroyer(resource);
        pendingCreate.resolve(resource);
        return null;
      }
      remove(this.pendingCreates, pendingCreate);
      this.free.push(new Resource_1.Resource(resource));
      pendingCreate.resolve(resource);
      this._executeEventHandlers("createSuccess", eventId, resource);
      return null;
    }).catch((err) => {
      if (pendingCreate.isRejected) {
        pendingCreate.reject(err);
        return null;
      }
      if (remove(this.pendingCreates, pendingCreate)) {
        this._executeEventHandlers("createFail", eventId, err);
      }
      pendingCreate.reject(err);
      return null;
    });
    return pendingCreate;
  }
  _destroy(resource) {
    const eventId = this.eventId++;
    this._executeEventHandlers("destroyRequest", eventId, resource);
    const pendingDestroy = new PendingOperation_1.PendingOperation(this.destroyTimeoutMillis);
    const retVal = Promise.resolve().then(() => this.destroyer(resource));
    retVal.then(() => {
      pendingDestroy.resolve(resource);
    }).catch((err) => {
      pendingDestroy.reject(err);
    });
    this.pendingDestroys.push(pendingDestroy);
    return pendingDestroy.promise.then((res) => {
      this._executeEventHandlers("destroySuccess", eventId, resource);
      return res;
    }).catch((err) => this._logDestroyerError(eventId, resource, err)).then((res) => {
      const index = this.pendingDestroys.findIndex((pd) => pd === pendingDestroy);
      this.pendingDestroys.splice(index, 1);
      return res;
    });
  }
  _logDestroyerError(eventId, resource, err) {
    this._executeEventHandlers("destroyFail", eventId, resource, err);
    this.log("Tarn: resource destroyer threw an exception " + err.stack, "warn");
  }
  _startReaping() {
    if (!this.interval) {
      this._executeEventHandlers("startReaping");
      this.interval = setInterval(() => this.check(), this.reapIntervalMillis);
    }
  }
  _stopReaping() {
    if (this.interval !== null) {
      this._executeEventHandlers("stopReaping");
      (0, timers_1.clearInterval)(this.interval);
    }
    this.interval = null;
  }
  _executeEventHandlers(eventName, ...args) {
    const listeners = this.emitter.listeners(eventName);
    listeners.forEach((listener) => {
      try {
        listener(...args);
      } catch (err) {
        this.log(`Tarn: event handler "${eventName}" threw an exception ${err.stack}`, "warn");
      }
    });
  }
};
Pool$2.Pool = Pool$1;
function remove(arr, item) {
  const idx = arr.indexOf(item);
  if (idx === -1) {
    return false;
  } else {
    arr.splice(idx, 1);
    return true;
  }
}
function callbackOrPromise(func) {
  return new Promise((resolve, reject2) => {
    const callback = (err, resource) => {
      if (err) {
        reject2(err);
      } else {
        resolve(resource);
      }
    };
    (0, utils_1.tryPromise)(() => func(callback)).then((res) => {
      if (res) {
        resolve(res);
      }
    }).catch((err) => {
      reject2(err);
    });
  });
}
(function(module, exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.TimeoutError = exports.Pool = void 0;
  const Pool_1 = Pool$2;
  Object.defineProperty(exports, "Pool", { enumerable: true, get: function() {
    return Pool_1.Pool;
  } });
  const TimeoutError_12 = TimeoutError$2;
  Object.defineProperty(exports, "TimeoutError", { enumerable: true, get: function() {
    return TimeoutError_12.TimeoutError;
  } });
  module.exports = {
    Pool: Pool_1.Pool,
    TimeoutError: TimeoutError_12.TimeoutError
  };
})(tarn, tarn.exports);
var tarnExports = tarn.exports;
const { Pool: Pool2 } = tarnExports;
let KnexPool$2 = class KnexPool extends Pool2 {
  constructor(config) {
    super(config);
  }
};
function isTarnPool$1(obj) {
  if (obj instanceof Pool2) return true;
  return typeof obj.acquire === "function" && typeof obj.release === "function" && typeof obj.destroy === "function" && typeof obj.numFree === "function" && typeof obj.numUsed === "function" && typeof obj.numPendingAcquires === "function";
}
var pool = { KnexPool: KnexPool$2, isTarnPool: isTarnPool$1 };
const charsRegex = /[\0\b\t\n\r\x1a"'\\]/g;
const charsMap = {
  "\0": "\\0",
  "\b": "\\b",
  "	": "\\t",
  "\n": "\\n",
  "\r": "\\r",
  "": "\\Z",
  '"': '\\"',
  "'": "\\'",
  "\\": "\\\\"
};
function wrapEscape(escapeFn) {
  return function finalEscape(val, ctx = {}) {
    return escapeFn(val, finalEscape, ctx);
  };
}
function makeEscape$1(config = {}) {
  const finalEscapeDate = config.escapeDate || dateToString;
  const finalEscapeArray = config.escapeArray || arrayToList;
  const finalEscapeBuffer = config.escapeBuffer || bufferToString;
  const finalEscapeString = config.escapeString || escapeString;
  const finalEscapeObject = config.escapeObject || escapeObject;
  const finalWrap = config.wrap || wrapEscape;
  function escapeFn(val, finalEscape, ctx) {
    if (val === void 0 || val === null) {
      return "NULL";
    }
    switch (typeof val) {
      case "boolean":
        return val ? "true" : "false";
      case "number":
        return val + "";
      case "object":
        if (val instanceof Date) {
          val = finalEscapeDate(val, finalEscape, ctx);
        } else if (Array.isArray(val)) {
          return finalEscapeArray(val, finalEscape, ctx);
        } else if (Buffer.isBuffer(val)) {
          return finalEscapeBuffer(val, finalEscape, ctx);
        } else {
          return finalEscapeObject(val, finalEscape, ctx);
        }
    }
    return finalEscapeString(val, finalEscape, ctx);
  }
  return finalWrap ? finalWrap(escapeFn) : escapeFn;
}
function escapeObject(val, finalEscape, ctx) {
  if (val && typeof val.toSQL === "function") {
    return val.toSQL(ctx);
  } else {
    return JSON.stringify(val);
  }
}
function arrayToList(array, finalEscape, ctx) {
  let sql = "";
  for (let i = 0; i < array.length; i++) {
    const val = array[i];
    if (Array.isArray(val)) {
      sql += (i === 0 ? "" : ", ") + "(" + arrayToList(val, finalEscape, ctx) + ")";
    } else {
      sql += (i === 0 ? "" : ", ") + finalEscape(val, ctx);
    }
  }
  return sql;
}
function bufferToString(buffer) {
  return "X" + escapeString(buffer.toString("hex"));
}
function escapeString(val, finalEscape, ctx) {
  let chunkIndex = charsRegex.lastIndex = 0;
  let escapedVal = "";
  let match;
  while (match = charsRegex.exec(val)) {
    escapedVal += val.slice(chunkIndex, match.index) + charsMap[match[0]];
    chunkIndex = charsRegex.lastIndex;
  }
  if (chunkIndex === 0) {
    return "'" + val + "'";
  }
  if (chunkIndex < val.length) {
    return "'" + escapedVal + val.slice(chunkIndex) + "'";
  }
  return "'" + escapedVal + "'";
}
function dateToString(date, finalEscape, ctx = {}) {
  const timeZone = ctx.timeZone || "local";
  const dt = new Date(date);
  let year;
  let month;
  let day;
  let hour;
  let minute;
  let second;
  let millisecond;
  if (timeZone === "local") {
    year = dt.getFullYear();
    month = dt.getMonth() + 1;
    day = dt.getDate();
    hour = dt.getHours();
    minute = dt.getMinutes();
    second = dt.getSeconds();
    millisecond = dt.getMilliseconds();
  } else {
    const tz = convertTimezone(timeZone);
    if (tz !== false && tz !== 0) {
      dt.setTime(dt.getTime() + tz * 6e4);
    }
    year = dt.getUTCFullYear();
    month = dt.getUTCMonth() + 1;
    day = dt.getUTCDate();
    hour = dt.getUTCHours();
    minute = dt.getUTCMinutes();
    second = dt.getUTCSeconds();
    millisecond = dt.getUTCMilliseconds();
  }
  return zeroPad(year, 4) + "-" + zeroPad(month, 2) + "-" + zeroPad(day, 2) + " " + zeroPad(hour, 2) + ":" + zeroPad(minute, 2) + ":" + zeroPad(second, 2) + "." + zeroPad(millisecond, 3);
}
function zeroPad(number, length) {
  number = number.toString();
  while (number.length < length) {
    number = "0" + number;
  }
  return number;
}
function convertTimezone(tz) {
  if (tz === "Z") {
    return 0;
  }
  const m = tz.match(/([+\-\s])(\d\d):?(\d\d)?/);
  if (m) {
    return (m[1] == "-" ? -1 : 1) * (parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) : 0) / 60) * 60;
  }
  return false;
}
var string = {
  makeEscape: makeEscape$1
};
function listCacheClear$1() {
  this.__data__ = [];
  this.size = 0;
}
var _listCacheClear = listCacheClear$1;
function eq$7(value, other) {
  return value === other || value !== value && other !== other;
}
var eq_1 = eq$7;
var eq$6 = eq_1;
function assocIndexOf$4(array, key) {
  var length = array.length;
  while (length--) {
    if (eq$6(array[length][0], key)) {
      return length;
    }
  }
  return -1;
}
var _assocIndexOf = assocIndexOf$4;
var assocIndexOf$3 = _assocIndexOf;
var arrayProto = Array.prototype;
var splice = arrayProto.splice;
function listCacheDelete$1(key) {
  var data = this.__data__, index = assocIndexOf$3(data, key);
  if (index < 0) {
    return false;
  }
  var lastIndex = data.length - 1;
  if (index == lastIndex) {
    data.pop();
  } else {
    splice.call(data, index, 1);
  }
  --this.size;
  return true;
}
var _listCacheDelete = listCacheDelete$1;
var assocIndexOf$2 = _assocIndexOf;
function listCacheGet$1(key) {
  var data = this.__data__, index = assocIndexOf$2(data, key);
  return index < 0 ? void 0 : data[index][1];
}
var _listCacheGet = listCacheGet$1;
var assocIndexOf$1 = _assocIndexOf;
function listCacheHas$1(key) {
  return assocIndexOf$1(this.__data__, key) > -1;
}
var _listCacheHas = listCacheHas$1;
var assocIndexOf = _assocIndexOf;
function listCacheSet$1(key, value) {
  var data = this.__data__, index = assocIndexOf(data, key);
  if (index < 0) {
    ++this.size;
    data.push([key, value]);
  } else {
    data[index][1] = value;
  }
  return this;
}
var _listCacheSet = listCacheSet$1;
var listCacheClear = _listCacheClear, listCacheDelete = _listCacheDelete, listCacheGet = _listCacheGet, listCacheHas = _listCacheHas, listCacheSet = _listCacheSet;
function ListCache$4(entries) {
  var index = -1, length = entries == null ? 0 : entries.length;
  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}
ListCache$4.prototype.clear = listCacheClear;
ListCache$4.prototype["delete"] = listCacheDelete;
ListCache$4.prototype.get = listCacheGet;
ListCache$4.prototype.has = listCacheHas;
ListCache$4.prototype.set = listCacheSet;
var _ListCache = ListCache$4;
var ListCache$3 = _ListCache;
function stackClear$1() {
  this.__data__ = new ListCache$3();
  this.size = 0;
}
var _stackClear = stackClear$1;
function stackDelete$1(key) {
  var data = this.__data__, result = data["delete"](key);
  this.size = data.size;
  return result;
}
var _stackDelete = stackDelete$1;
function stackGet$1(key) {
  return this.__data__.get(key);
}
var _stackGet = stackGet$1;
function stackHas$1(key) {
  return this.__data__.has(key);
}
var _stackHas = stackHas$1;
var freeGlobal$1 = typeof commonjsGlobal == "object" && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;
var _freeGlobal = freeGlobal$1;
var freeGlobal = _freeGlobal;
var freeSelf = typeof self == "object" && self && self.Object === Object && self;
var root$8 = freeGlobal || freeSelf || Function("return this")();
var _root = root$8;
var root$7 = _root;
var Symbol$8 = root$7.Symbol;
var _Symbol = Symbol$8;
var Symbol$7 = _Symbol;
var objectProto$m = Object.prototype;
var hasOwnProperty$j = objectProto$m.hasOwnProperty;
var nativeObjectToString$1 = objectProto$m.toString;
var symToStringTag$1 = Symbol$7 ? Symbol$7.toStringTag : void 0;
function getRawTag$1(value) {
  var isOwn = hasOwnProperty$j.call(value, symToStringTag$1), tag = value[symToStringTag$1];
  try {
    value[symToStringTag$1] = void 0;
    var unmasked = true;
  } catch (e) {
  }
  var result = nativeObjectToString$1.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag$1] = tag;
    } else {
      delete value[symToStringTag$1];
    }
  }
  return result;
}
var _getRawTag = getRawTag$1;
var objectProto$l = Object.prototype;
var nativeObjectToString = objectProto$l.toString;
function objectToString$1(value) {
  return nativeObjectToString.call(value);
}
var _objectToString = objectToString$1;
var Symbol$6 = _Symbol, getRawTag = _getRawTag, objectToString = _objectToString;
var nullTag = "[object Null]", undefinedTag = "[object Undefined]";
var symToStringTag = Symbol$6 ? Symbol$6.toStringTag : void 0;
function baseGetTag$8(value) {
  if (value == null) {
    return value === void 0 ? undefinedTag : nullTag;
  }
  return symToStringTag && symToStringTag in Object(value) ? getRawTag(value) : objectToString(value);
}
var _baseGetTag = baseGetTag$8;
function isObject$i(value) {
  var type = typeof value;
  return value != null && (type == "object" || type == "function");
}
var isObject_1 = isObject$i;
var baseGetTag$7 = _baseGetTag, isObject$h = isObject_1;
var asyncTag = "[object AsyncFunction]", funcTag$2 = "[object Function]", genTag$1 = "[object GeneratorFunction]", proxyTag = "[object Proxy]";
function isFunction$a(value) {
  if (!isObject$h(value)) {
    return false;
  }
  var tag = baseGetTag$7(value);
  return tag == funcTag$2 || tag == genTag$1 || tag == asyncTag || tag == proxyTag;
}
var isFunction_1 = isFunction$a;
var root$6 = _root;
var coreJsData$1 = root$6["__core-js_shared__"];
var _coreJsData = coreJsData$1;
var coreJsData = _coreJsData;
var maskSrcKey = function() {
  var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || "");
  return uid ? "Symbol(src)_1." + uid : "";
}();
function isMasked$1(func) {
  return !!maskSrcKey && maskSrcKey in func;
}
var _isMasked = isMasked$1;
var funcProto$2 = Function.prototype;
var funcToString$2 = funcProto$2.toString;
function toSource$2(func) {
  if (func != null) {
    try {
      return funcToString$2.call(func);
    } catch (e) {
    }
    try {
      return func + "";
    } catch (e) {
    }
  }
  return "";
}
var _toSource = toSource$2;
var isFunction$9 = isFunction_1, isMasked = _isMasked, isObject$g = isObject_1, toSource$1 = _toSource;
var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
var reIsHostCtor = /^\[object .+?Constructor\]$/;
var funcProto$1 = Function.prototype, objectProto$k = Object.prototype;
var funcToString$1 = funcProto$1.toString;
var hasOwnProperty$i = objectProto$k.hasOwnProperty;
var reIsNative = RegExp(
  "^" + funcToString$1.call(hasOwnProperty$i).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
);
function baseIsNative$1(value) {
  if (!isObject$g(value) || isMasked(value)) {
    return false;
  }
  var pattern = isFunction$9(value) ? reIsNative : reIsHostCtor;
  return pattern.test(toSource$1(value));
}
var _baseIsNative = baseIsNative$1;
function getValue$1(object, key) {
  return object == null ? void 0 : object[key];
}
var _getValue = getValue$1;
var baseIsNative = _baseIsNative, getValue = _getValue;
function getNative$7(object, key) {
  var value = getValue(object, key);
  return baseIsNative(value) ? value : void 0;
}
var _getNative = getNative$7;
var getNative$6 = _getNative, root$5 = _root;
var Map$4 = getNative$6(root$5, "Map");
var _Map = Map$4;
var getNative$5 = _getNative;
var nativeCreate$4 = getNative$5(Object, "create");
var _nativeCreate = nativeCreate$4;
var nativeCreate$3 = _nativeCreate;
function hashClear$1() {
  this.__data__ = nativeCreate$3 ? nativeCreate$3(null) : {};
  this.size = 0;
}
var _hashClear = hashClear$1;
function hashDelete$1(key) {
  var result = this.has(key) && delete this.__data__[key];
  this.size -= result ? 1 : 0;
  return result;
}
var _hashDelete = hashDelete$1;
var nativeCreate$2 = _nativeCreate;
var HASH_UNDEFINED$2 = "__lodash_hash_undefined__";
var objectProto$j = Object.prototype;
var hasOwnProperty$h = objectProto$j.hasOwnProperty;
function hashGet$1(key) {
  var data = this.__data__;
  if (nativeCreate$2) {
    var result = data[key];
    return result === HASH_UNDEFINED$2 ? void 0 : result;
  }
  return hasOwnProperty$h.call(data, key) ? data[key] : void 0;
}
var _hashGet = hashGet$1;
var nativeCreate$1 = _nativeCreate;
var objectProto$i = Object.prototype;
var hasOwnProperty$g = objectProto$i.hasOwnProperty;
function hashHas$1(key) {
  var data = this.__data__;
  return nativeCreate$1 ? data[key] !== void 0 : hasOwnProperty$g.call(data, key);
}
var _hashHas = hashHas$1;
var nativeCreate = _nativeCreate;
var HASH_UNDEFINED$1 = "__lodash_hash_undefined__";
function hashSet$1(key, value) {
  var data = this.__data__;
  this.size += this.has(key) ? 0 : 1;
  data[key] = nativeCreate && value === void 0 ? HASH_UNDEFINED$1 : value;
  return this;
}
var _hashSet = hashSet$1;
var hashClear = _hashClear, hashDelete = _hashDelete, hashGet = _hashGet, hashHas = _hashHas, hashSet = _hashSet;
function Hash$1(entries) {
  var index = -1, length = entries == null ? 0 : entries.length;
  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}
Hash$1.prototype.clear = hashClear;
Hash$1.prototype["delete"] = hashDelete;
Hash$1.prototype.get = hashGet;
Hash$1.prototype.has = hashHas;
Hash$1.prototype.set = hashSet;
var _Hash = Hash$1;
var Hash = _Hash, ListCache$2 = _ListCache, Map$3 = _Map;
function mapCacheClear$1() {
  this.size = 0;
  this.__data__ = {
    "hash": new Hash(),
    "map": new (Map$3 || ListCache$2)(),
    "string": new Hash()
  };
}
var _mapCacheClear = mapCacheClear$1;
function isKeyable$1(value) {
  var type = typeof value;
  return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value !== "__proto__" : value === null;
}
var _isKeyable = isKeyable$1;
var isKeyable = _isKeyable;
function getMapData$4(map2, key) {
  var data = map2.__data__;
  return isKeyable(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
}
var _getMapData = getMapData$4;
var getMapData$3 = _getMapData;
function mapCacheDelete$1(key) {
  var result = getMapData$3(this, key)["delete"](key);
  this.size -= result ? 1 : 0;
  return result;
}
var _mapCacheDelete = mapCacheDelete$1;
var getMapData$2 = _getMapData;
function mapCacheGet$1(key) {
  return getMapData$2(this, key).get(key);
}
var _mapCacheGet = mapCacheGet$1;
var getMapData$1 = _getMapData;
function mapCacheHas$1(key) {
  return getMapData$1(this, key).has(key);
}
var _mapCacheHas = mapCacheHas$1;
var getMapData = _getMapData;
function mapCacheSet$1(key, value) {
  var data = getMapData(this, key), size = data.size;
  data.set(key, value);
  this.size += data.size == size ? 0 : 1;
  return this;
}
var _mapCacheSet = mapCacheSet$1;
var mapCacheClear = _mapCacheClear, mapCacheDelete = _mapCacheDelete, mapCacheGet = _mapCacheGet, mapCacheHas = _mapCacheHas, mapCacheSet = _mapCacheSet;
function MapCache$3(entries) {
  var index = -1, length = entries == null ? 0 : entries.length;
  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}
MapCache$3.prototype.clear = mapCacheClear;
MapCache$3.prototype["delete"] = mapCacheDelete;
MapCache$3.prototype.get = mapCacheGet;
MapCache$3.prototype.has = mapCacheHas;
MapCache$3.prototype.set = mapCacheSet;
var _MapCache = MapCache$3;
var ListCache$1 = _ListCache, Map$2 = _Map, MapCache$2 = _MapCache;
var LARGE_ARRAY_SIZE$1 = 200;
function stackSet$1(key, value) {
  var data = this.__data__;
  if (data instanceof ListCache$1) {
    var pairs = data.__data__;
    if (!Map$2 || pairs.length < LARGE_ARRAY_SIZE$1 - 1) {
      pairs.push([key, value]);
      this.size = ++data.size;
      return this;
    }
    data = this.__data__ = new MapCache$2(pairs);
  }
  data.set(key, value);
  this.size = data.size;
  return this;
}
var _stackSet = stackSet$1;
var ListCache = _ListCache, stackClear = _stackClear, stackDelete = _stackDelete, stackGet = _stackGet, stackHas = _stackHas, stackSet = _stackSet;
function Stack$4(entries) {
  var data = this.__data__ = new ListCache(entries);
  this.size = data.size;
}
Stack$4.prototype.clear = stackClear;
Stack$4.prototype["delete"] = stackDelete;
Stack$4.prototype.get = stackGet;
Stack$4.prototype.has = stackHas;
Stack$4.prototype.set = stackSet;
var _Stack = Stack$4;
function arrayEach$4(array, iteratee) {
  var index = -1, length = array == null ? 0 : array.length;
  while (++index < length) {
    if (iteratee(array[index], index, array) === false) {
      break;
    }
  }
  return array;
}
var _arrayEach = arrayEach$4;
var getNative$4 = _getNative;
var defineProperty$2 = function() {
  try {
    var func = getNative$4(Object, "defineProperty");
    func({}, "", {});
    return func;
  } catch (e) {
  }
}();
var _defineProperty = defineProperty$2;
var defineProperty$1 = _defineProperty;
function baseAssignValue$4(object, key, value) {
  if (key == "__proto__" && defineProperty$1) {
    defineProperty$1(object, key, {
      "configurable": true,
      "enumerable": true,
      "value": value,
      "writable": true
    });
  } else {
    object[key] = value;
  }
}
var _baseAssignValue = baseAssignValue$4;
var baseAssignValue$3 = _baseAssignValue, eq$5 = eq_1;
var objectProto$h = Object.prototype;
var hasOwnProperty$f = objectProto$h.hasOwnProperty;
function assignValue$4(object, key, value) {
  var objValue = object[key];
  if (!(hasOwnProperty$f.call(object, key) && eq$5(objValue, value)) || value === void 0 && !(key in object)) {
    baseAssignValue$3(object, key, value);
  }
}
var _assignValue = assignValue$4;
var assignValue$3 = _assignValue, baseAssignValue$2 = _baseAssignValue;
function copyObject$8(source, props, object, customizer) {
  var isNew = !object;
  object || (object = {});
  var index = -1, length = props.length;
  while (++index < length) {
    var key = props[index];
    var newValue = customizer ? customizer(object[key], source[key], key, object, source) : void 0;
    if (newValue === void 0) {
      newValue = source[key];
    }
    if (isNew) {
      baseAssignValue$2(object, key, newValue);
    } else {
      assignValue$3(object, key, newValue);
    }
  }
  return object;
}
var _copyObject = copyObject$8;
function baseTimes$1(n, iteratee) {
  var index = -1, result = Array(n);
  while (++index < n) {
    result[index] = iteratee(index);
  }
  return result;
}
var _baseTimes = baseTimes$1;
function isObjectLike$b(value) {
  return value != null && typeof value == "object";
}
var isObjectLike_1 = isObjectLike$b;
var baseGetTag$6 = _baseGetTag, isObjectLike$a = isObjectLike_1;
var argsTag$3 = "[object Arguments]";
function baseIsArguments$1(value) {
  return isObjectLike$a(value) && baseGetTag$6(value) == argsTag$3;
}
var _baseIsArguments = baseIsArguments$1;
var baseIsArguments = _baseIsArguments, isObjectLike$9 = isObjectLike_1;
var objectProto$g = Object.prototype;
var hasOwnProperty$e = objectProto$g.hasOwnProperty;
var propertyIsEnumerable$1 = objectProto$g.propertyIsEnumerable;
var isArguments$5 = baseIsArguments(/* @__PURE__ */ function() {
  return arguments;
}()) ? baseIsArguments : function(value) {
  return isObjectLike$9(value) && hasOwnProperty$e.call(value, "callee") && !propertyIsEnumerable$1.call(value, "callee");
};
var isArguments_1 = isArguments$5;
var isArray$k = Array.isArray;
var isArray_1 = isArray$k;
var isBuffer$6 = { exports: {} };
function stubFalse() {
  return false;
}
var stubFalse_1 = stubFalse;
isBuffer$6.exports;
(function(module, exports) {
  var root2 = _root, stubFalse2 = stubFalse_1;
  var freeExports = exports && !exports.nodeType && exports;
  var freeModule = freeExports && true && module && !module.nodeType && module;
  var moduleExports = freeModule && freeModule.exports === freeExports;
  var Buffer2 = moduleExports ? root2.Buffer : void 0;
  var nativeIsBuffer = Buffer2 ? Buffer2.isBuffer : void 0;
  var isBuffer2 = nativeIsBuffer || stubFalse2;
  module.exports = isBuffer2;
})(isBuffer$6, isBuffer$6.exports);
var isBufferExports = isBuffer$6.exports;
var MAX_SAFE_INTEGER$1 = 9007199254740991;
var reIsUint = /^(?:0|[1-9]\d*)$/;
function isIndex$4(value, length) {
  var type = typeof value;
  length = length == null ? MAX_SAFE_INTEGER$1 : length;
  return !!length && (type == "number" || type != "symbol" && reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
}
var _isIndex = isIndex$4;
var MAX_SAFE_INTEGER = 9007199254740991;
function isLength$3(value) {
  return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}
var isLength_1 = isLength$3;
var baseGetTag$5 = _baseGetTag, isLength$2 = isLength_1, isObjectLike$8 = isObjectLike_1;
var argsTag$2 = "[object Arguments]", arrayTag$2 = "[object Array]", boolTag$3 = "[object Boolean]", dateTag$3 = "[object Date]", errorTag$3 = "[object Error]", funcTag$1 = "[object Function]", mapTag$7 = "[object Map]", numberTag$3 = "[object Number]", objectTag$4 = "[object Object]", regexpTag$3 = "[object RegExp]", setTag$7 = "[object Set]", stringTag$4 = "[object String]", weakMapTag$2 = "[object WeakMap]";
var arrayBufferTag$3 = "[object ArrayBuffer]", dataViewTag$4 = "[object DataView]", float32Tag$2 = "[object Float32Array]", float64Tag$2 = "[object Float64Array]", int8Tag$2 = "[object Int8Array]", int16Tag$2 = "[object Int16Array]", int32Tag$2 = "[object Int32Array]", uint8Tag$2 = "[object Uint8Array]", uint8ClampedTag$2 = "[object Uint8ClampedArray]", uint16Tag$2 = "[object Uint16Array]", uint32Tag$2 = "[object Uint32Array]";
var typedArrayTags = {};
typedArrayTags[float32Tag$2] = typedArrayTags[float64Tag$2] = typedArrayTags[int8Tag$2] = typedArrayTags[int16Tag$2] = typedArrayTags[int32Tag$2] = typedArrayTags[uint8Tag$2] = typedArrayTags[uint8ClampedTag$2] = typedArrayTags[uint16Tag$2] = typedArrayTags[uint32Tag$2] = true;
typedArrayTags[argsTag$2] = typedArrayTags[arrayTag$2] = typedArrayTags[arrayBufferTag$3] = typedArrayTags[boolTag$3] = typedArrayTags[dataViewTag$4] = typedArrayTags[dateTag$3] = typedArrayTags[errorTag$3] = typedArrayTags[funcTag$1] = typedArrayTags[mapTag$7] = typedArrayTags[numberTag$3] = typedArrayTags[objectTag$4] = typedArrayTags[regexpTag$3] = typedArrayTags[setTag$7] = typedArrayTags[stringTag$4] = typedArrayTags[weakMapTag$2] = false;
function baseIsTypedArray$1(value) {
  return isObjectLike$8(value) && isLength$2(value.length) && !!typedArrayTags[baseGetTag$5(value)];
}
var _baseIsTypedArray = baseIsTypedArray$1;
function baseUnary$5(func) {
  return function(value) {
    return func(value);
  };
}
var _baseUnary = baseUnary$5;
var _nodeUtil = { exports: {} };
_nodeUtil.exports;
(function(module, exports) {
  var freeGlobal2 = _freeGlobal;
  var freeExports = exports && !exports.nodeType && exports;
  var freeModule = freeExports && true && module && !module.nodeType && module;
  var moduleExports = freeModule && freeModule.exports === freeExports;
  var freeProcess = moduleExports && freeGlobal2.process;
  var nodeUtil2 = function() {
    try {
      var types = freeModule && freeModule.require && freeModule.require("util").types;
      if (types) {
        return types;
      }
      return freeProcess && freeProcess.binding && freeProcess.binding("util");
    } catch (e) {
    }
  }();
  module.exports = nodeUtil2;
})(_nodeUtil, _nodeUtil.exports);
var _nodeUtilExports = _nodeUtil.exports;
var baseIsTypedArray = _baseIsTypedArray, baseUnary$4 = _baseUnary, nodeUtil$2 = _nodeUtilExports;
var nodeIsTypedArray = nodeUtil$2 && nodeUtil$2.isTypedArray;
var isTypedArray$6 = nodeIsTypedArray ? baseUnary$4(nodeIsTypedArray) : baseIsTypedArray;
var isTypedArray_1 = isTypedArray$6;
var baseTimes = _baseTimes, isArguments$4 = isArguments_1, isArray$j = isArray_1, isBuffer$5 = isBufferExports, isIndex$3 = _isIndex, isTypedArray$5 = isTypedArray_1;
var objectProto$f = Object.prototype;
var hasOwnProperty$d = objectProto$f.hasOwnProperty;
function arrayLikeKeys$2(value, inherited) {
  var isArr = isArray$j(value), isArg = !isArr && isArguments$4(value), isBuff = !isArr && !isArg && isBuffer$5(value), isType = !isArr && !isArg && !isBuff && isTypedArray$5(value), skipIndexes = isArr || isArg || isBuff || isType, result = skipIndexes ? baseTimes(value.length, String) : [], length = result.length;
  for (var key in value) {
    if ((inherited || hasOwnProperty$d.call(value, key)) && !(skipIndexes && // Safari 9 has enumerable `arguments.length` in strict mode.
    (key == "length" || // Node.js 0.10 has enumerable non-index properties on buffers.
    isBuff && (key == "offset" || key == "parent") || // PhantomJS 2 has enumerable non-index properties on typed arrays.
    isType && (key == "buffer" || key == "byteLength" || key == "byteOffset") || // Skip index properties.
    isIndex$3(key, length)))) {
      result.push(key);
    }
  }
  return result;
}
var _arrayLikeKeys = arrayLikeKeys$2;
var objectProto$e = Object.prototype;
function isPrototype$5(value) {
  var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto$e;
  return value === proto;
}
var _isPrototype = isPrototype$5;
function overArg$2(func, transform2) {
  return function(arg) {
    return func(transform2(arg));
  };
}
var _overArg = overArg$2;
var overArg$1 = _overArg;
var nativeKeys$1 = overArg$1(Object.keys, Object);
var _nativeKeys = nativeKeys$1;
var isPrototype$4 = _isPrototype, nativeKeys = _nativeKeys;
var objectProto$d = Object.prototype;
var hasOwnProperty$c = objectProto$d.hasOwnProperty;
function baseKeys$2(object) {
  if (!isPrototype$4(object)) {
    return nativeKeys(object);
  }
  var result = [];
  for (var key in Object(object)) {
    if (hasOwnProperty$c.call(object, key) && key != "constructor") {
      result.push(key);
    }
  }
  return result;
}
var _baseKeys = baseKeys$2;
var isFunction$8 = isFunction_1, isLength$1 = isLength_1;
function isArrayLike$a(value) {
  return value != null && isLength$1(value.length) && !isFunction$8(value);
}
var isArrayLike_1 = isArrayLike$a;
var arrayLikeKeys$1 = _arrayLikeKeys, baseKeys$1 = _baseKeys, isArrayLike$9 = isArrayLike_1;
function keys$9(object) {
  return isArrayLike$9(object) ? arrayLikeKeys$1(object) : baseKeys$1(object);
}
var keys_1 = keys$9;
var copyObject$7 = _copyObject, keys$8 = keys_1;
function baseAssign$1(object, source) {
  return object && copyObject$7(source, keys$8(source), object);
}
var _baseAssign = baseAssign$1;
function nativeKeysIn$1(object) {
  var result = [];
  if (object != null) {
    for (var key in Object(object)) {
      result.push(key);
    }
  }
  return result;
}
var _nativeKeysIn = nativeKeysIn$1;
var isObject$f = isObject_1, isPrototype$3 = _isPrototype, nativeKeysIn = _nativeKeysIn;
var objectProto$c = Object.prototype;
var hasOwnProperty$b = objectProto$c.hasOwnProperty;
function baseKeysIn$1(object) {
  if (!isObject$f(object)) {
    return nativeKeysIn(object);
  }
  var isProto = isPrototype$3(object), result = [];
  for (var key in object) {
    if (!(key == "constructor" && (isProto || !hasOwnProperty$b.call(object, key)))) {
      result.push(key);
    }
  }
  return result;
}
var _baseKeysIn = baseKeysIn$1;
var arrayLikeKeys = _arrayLikeKeys, baseKeysIn = _baseKeysIn, isArrayLike$8 = isArrayLike_1;
function keysIn$7(object) {
  return isArrayLike$8(object) ? arrayLikeKeys(object, true) : baseKeysIn(object);
}
var keysIn_1 = keysIn$7;
var copyObject$6 = _copyObject, keysIn$6 = keysIn_1;
function baseAssignIn$1(object, source) {
  return object && copyObject$6(source, keysIn$6(source), object);
}
var _baseAssignIn = baseAssignIn$1;
var _cloneBuffer = { exports: {} };
_cloneBuffer.exports;
(function(module, exports) {
  var root2 = _root;
  var freeExports = exports && !exports.nodeType && exports;
  var freeModule = freeExports && true && module && !module.nodeType && module;
  var moduleExports = freeModule && freeModule.exports === freeExports;
  var Buffer2 = moduleExports ? root2.Buffer : void 0, allocUnsafe = Buffer2 ? Buffer2.allocUnsafe : void 0;
  function cloneBuffer2(buffer, isDeep) {
    if (isDeep) {
      return buffer.slice();
    }
    var length = buffer.length, result = allocUnsafe ? allocUnsafe(length) : new buffer.constructor(length);
    buffer.copy(result);
    return result;
  }
  module.exports = cloneBuffer2;
})(_cloneBuffer, _cloneBuffer.exports);
var _cloneBufferExports = _cloneBuffer.exports;
function copyArray$3(source, array) {
  var index = -1, length = source.length;
  array || (array = Array(length));
  while (++index < length) {
    array[index] = source[index];
  }
  return array;
}
var _copyArray = copyArray$3;
function arrayFilter$2(array, predicate) {
  var index = -1, length = array == null ? 0 : array.length, resIndex = 0, result = [];
  while (++index < length) {
    var value = array[index];
    if (predicate(value, index, array)) {
      result[resIndex++] = value;
    }
  }
  return result;
}
var _arrayFilter = arrayFilter$2;
function stubArray$2() {
  return [];
}
var stubArray_1 = stubArray$2;
var arrayFilter$1 = _arrayFilter, stubArray$1 = stubArray_1;
var objectProto$b = Object.prototype;
var propertyIsEnumerable = objectProto$b.propertyIsEnumerable;
var nativeGetSymbols$1 = Object.getOwnPropertySymbols;
var getSymbols$3 = !nativeGetSymbols$1 ? stubArray$1 : function(object) {
  if (object == null) {
    return [];
  }
  object = Object(object);
  return arrayFilter$1(nativeGetSymbols$1(object), function(symbol) {
    return propertyIsEnumerable.call(object, symbol);
  });
};
var _getSymbols = getSymbols$3;
var copyObject$5 = _copyObject, getSymbols$2 = _getSymbols;
function copySymbols$1(source, object) {
  return copyObject$5(source, getSymbols$2(source), object);
}
var _copySymbols = copySymbols$1;
function arrayPush$3(array, values2) {
  var index = -1, length = values2.length, offset = array.length;
  while (++index < length) {
    array[offset + index] = values2[index];
  }
  return array;
}
var _arrayPush = arrayPush$3;
var overArg = _overArg;
var getPrototype$4 = overArg(Object.getPrototypeOf, Object);
var _getPrototype = getPrototype$4;
var arrayPush$2 = _arrayPush, getPrototype$3 = _getPrototype, getSymbols$1 = _getSymbols, stubArray = stubArray_1;
var nativeGetSymbols = Object.getOwnPropertySymbols;
var getSymbolsIn$2 = !nativeGetSymbols ? stubArray : function(object) {
  var result = [];
  while (object) {
    arrayPush$2(result, getSymbols$1(object));
    object = getPrototype$3(object);
  }
  return result;
};
var _getSymbolsIn = getSymbolsIn$2;
var copyObject$4 = _copyObject, getSymbolsIn$1 = _getSymbolsIn;
function copySymbolsIn$1(source, object) {
  return copyObject$4(source, getSymbolsIn$1(source), object);
}
var _copySymbolsIn = copySymbolsIn$1;
var arrayPush$1 = _arrayPush, isArray$i = isArray_1;
function baseGetAllKeys$2(object, keysFunc, symbolsFunc) {
  var result = keysFunc(object);
  return isArray$i(object) ? result : arrayPush$1(result, symbolsFunc(object));
}
var _baseGetAllKeys = baseGetAllKeys$2;
var baseGetAllKeys$1 = _baseGetAllKeys, getSymbols = _getSymbols, keys$7 = keys_1;
function getAllKeys$2(object) {
  return baseGetAllKeys$1(object, keys$7, getSymbols);
}
var _getAllKeys = getAllKeys$2;
var baseGetAllKeys = _baseGetAllKeys, getSymbolsIn = _getSymbolsIn, keysIn$5 = keysIn_1;
function getAllKeysIn$2(object) {
  return baseGetAllKeys(object, keysIn$5, getSymbolsIn);
}
var _getAllKeysIn = getAllKeysIn$2;
var getNative$3 = _getNative, root$4 = _root;
var DataView$1 = getNative$3(root$4, "DataView");
var _DataView = DataView$1;
var getNative$2 = _getNative, root$3 = _root;
var Promise$2 = getNative$2(root$3, "Promise");
var _Promise = Promise$2;
var getNative$1 = _getNative, root$2 = _root;
var Set$2 = getNative$1(root$2, "Set");
var _Set = Set$2;
var getNative = _getNative, root$1 = _root;
var WeakMap$1 = getNative(root$1, "WeakMap");
var _WeakMap = WeakMap$1;
var DataView = _DataView, Map$1 = _Map, Promise$1 = _Promise, Set$1 = _Set, WeakMap = _WeakMap, baseGetTag$4 = _baseGetTag, toSource = _toSource;
var mapTag$6 = "[object Map]", objectTag$3 = "[object Object]", promiseTag = "[object Promise]", setTag$6 = "[object Set]", weakMapTag$1 = "[object WeakMap]";
var dataViewTag$3 = "[object DataView]";
var dataViewCtorString = toSource(DataView), mapCtorString = toSource(Map$1), promiseCtorString = toSource(Promise$1), setCtorString = toSource(Set$1), weakMapCtorString = toSource(WeakMap);
var getTag$6 = baseGetTag$4;
if (DataView && getTag$6(new DataView(new ArrayBuffer(1))) != dataViewTag$3 || Map$1 && getTag$6(new Map$1()) != mapTag$6 || Promise$1 && getTag$6(Promise$1.resolve()) != promiseTag || Set$1 && getTag$6(new Set$1()) != setTag$6 || WeakMap && getTag$6(new WeakMap()) != weakMapTag$1) {
  getTag$6 = function(value) {
    var result = baseGetTag$4(value), Ctor = result == objectTag$3 ? value.constructor : void 0, ctorString = Ctor ? toSource(Ctor) : "";
    if (ctorString) {
      switch (ctorString) {
        case dataViewCtorString:
          return dataViewTag$3;
        case mapCtorString:
          return mapTag$6;
        case promiseCtorString:
          return promiseTag;
        case setCtorString:
          return setTag$6;
        case weakMapCtorString:
          return weakMapTag$1;
      }
    }
    return result;
  };
}
var _getTag = getTag$6;
var objectProto$a = Object.prototype;
var hasOwnProperty$a = objectProto$a.hasOwnProperty;
function initCloneArray$1(array) {
  var length = array.length, result = new array.constructor(length);
  if (length && typeof array[0] == "string" && hasOwnProperty$a.call(array, "index")) {
    result.index = array.index;
    result.input = array.input;
  }
  return result;
}
var _initCloneArray = initCloneArray$1;
var root = _root;
var Uint8Array$2 = root.Uint8Array;
var _Uint8Array = Uint8Array$2;
var Uint8Array$1 = _Uint8Array;
function cloneArrayBuffer$3(arrayBuffer) {
  var result = new arrayBuffer.constructor(arrayBuffer.byteLength);
  new Uint8Array$1(result).set(new Uint8Array$1(arrayBuffer));
  return result;
}
var _cloneArrayBuffer = cloneArrayBuffer$3;
var cloneArrayBuffer$2 = _cloneArrayBuffer;
function cloneDataView$1(dataView, isDeep) {
  var buffer = isDeep ? cloneArrayBuffer$2(dataView.buffer) : dataView.buffer;
  return new dataView.constructor(buffer, dataView.byteOffset, dataView.byteLength);
}
var _cloneDataView = cloneDataView$1;
var reFlags = /\w*$/;
function cloneRegExp$1(regexp) {
  var result = new regexp.constructor(regexp.source, reFlags.exec(regexp));
  result.lastIndex = regexp.lastIndex;
  return result;
}
var _cloneRegExp = cloneRegExp$1;
var Symbol$5 = _Symbol;
var symbolProto$2 = Symbol$5 ? Symbol$5.prototype : void 0, symbolValueOf$1 = symbolProto$2 ? symbolProto$2.valueOf : void 0;
function cloneSymbol$1(symbol) {
  return symbolValueOf$1 ? Object(symbolValueOf$1.call(symbol)) : {};
}
var _cloneSymbol = cloneSymbol$1;
var cloneArrayBuffer$1 = _cloneArrayBuffer;
function cloneTypedArray$2(typedArray, isDeep) {
  var buffer = isDeep ? cloneArrayBuffer$1(typedArray.buffer) : typedArray.buffer;
  return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
}
var _cloneTypedArray = cloneTypedArray$2;
var cloneArrayBuffer = _cloneArrayBuffer, cloneDataView = _cloneDataView, cloneRegExp = _cloneRegExp, cloneSymbol = _cloneSymbol, cloneTypedArray$1 = _cloneTypedArray;
var boolTag$2 = "[object Boolean]", dateTag$2 = "[object Date]", mapTag$5 = "[object Map]", numberTag$2 = "[object Number]", regexpTag$2 = "[object RegExp]", setTag$5 = "[object Set]", stringTag$3 = "[object String]", symbolTag$3 = "[object Symbol]";
var arrayBufferTag$2 = "[object ArrayBuffer]", dataViewTag$2 = "[object DataView]", float32Tag$1 = "[object Float32Array]", float64Tag$1 = "[object Float64Array]", int8Tag$1 = "[object Int8Array]", int16Tag$1 = "[object Int16Array]", int32Tag$1 = "[object Int32Array]", uint8Tag$1 = "[object Uint8Array]", uint8ClampedTag$1 = "[object Uint8ClampedArray]", uint16Tag$1 = "[object Uint16Array]", uint32Tag$1 = "[object Uint32Array]";
function initCloneByTag$1(object, tag, isDeep) {
  var Ctor = object.constructor;
  switch (tag) {
    case arrayBufferTag$2:
      return cloneArrayBuffer(object);
    case boolTag$2:
    case dateTag$2:
      return new Ctor(+object);
    case dataViewTag$2:
      return cloneDataView(object, isDeep);
    case float32Tag$1:
    case float64Tag$1:
    case int8Tag$1:
    case int16Tag$1:
    case int32Tag$1:
    case uint8Tag$1:
    case uint8ClampedTag$1:
    case uint16Tag$1:
    case uint32Tag$1:
      return cloneTypedArray$1(object, isDeep);
    case mapTag$5:
      return new Ctor();
    case numberTag$2:
    case stringTag$3:
      return new Ctor(object);
    case regexpTag$2:
      return cloneRegExp(object);
    case setTag$5:
      return new Ctor();
    case symbolTag$3:
      return cloneSymbol(object);
  }
}
var _initCloneByTag = initCloneByTag$1;
var isObject$e = isObject_1;
var objectCreate = Object.create;
var baseCreate$2 = /* @__PURE__ */ function() {
  function object() {
  }
  return function(proto) {
    if (!isObject$e(proto)) {
      return {};
    }
    if (objectCreate) {
      return objectCreate(proto);
    }
    object.prototype = proto;
    var result = new object();
    object.prototype = void 0;
    return result;
  };
}();
var _baseCreate = baseCreate$2;
var baseCreate$1 = _baseCreate, getPrototype$2 = _getPrototype, isPrototype$2 = _isPrototype;
function initCloneObject$2(object) {
  return typeof object.constructor == "function" && !isPrototype$2(object) ? baseCreate$1(getPrototype$2(object)) : {};
}
var _initCloneObject = initCloneObject$2;
var getTag$5 = _getTag, isObjectLike$7 = isObjectLike_1;
var mapTag$4 = "[object Map]";
function baseIsMap$1(value) {
  return isObjectLike$7(value) && getTag$5(value) == mapTag$4;
}
var _baseIsMap = baseIsMap$1;
var baseIsMap = _baseIsMap, baseUnary$3 = _baseUnary, nodeUtil$1 = _nodeUtilExports;
var nodeIsMap = nodeUtil$1 && nodeUtil$1.isMap;
var isMap$1 = nodeIsMap ? baseUnary$3(nodeIsMap) : baseIsMap;
var isMap_1 = isMap$1;
var getTag$4 = _getTag, isObjectLike$6 = isObjectLike_1;
var setTag$4 = "[object Set]";
function baseIsSet$1(value) {
  return isObjectLike$6(value) && getTag$4(value) == setTag$4;
}
var _baseIsSet = baseIsSet$1;
var baseIsSet = _baseIsSet, baseUnary$2 = _baseUnary, nodeUtil = _nodeUtilExports;
var nodeIsSet = nodeUtil && nodeUtil.isSet;
var isSet$1 = nodeIsSet ? baseUnary$2(nodeIsSet) : baseIsSet;
var isSet_1 = isSet$1;
var Stack$3 = _Stack, arrayEach$3 = _arrayEach, assignValue$2 = _assignValue, baseAssign = _baseAssign, baseAssignIn = _baseAssignIn, cloneBuffer$1 = _cloneBufferExports, copyArray$2 = _copyArray, copySymbols = _copySymbols, copySymbolsIn = _copySymbolsIn, getAllKeys$1 = _getAllKeys, getAllKeysIn$1 = _getAllKeysIn, getTag$3 = _getTag, initCloneArray = _initCloneArray, initCloneByTag = _initCloneByTag, initCloneObject$1 = _initCloneObject, isArray$h = isArray_1, isBuffer$4 = isBufferExports, isMap = isMap_1, isObject$d = isObject_1, isSet = isSet_1, keys$6 = keys_1, keysIn$4 = keysIn_1;
var CLONE_DEEP_FLAG$1 = 1, CLONE_FLAT_FLAG = 2, CLONE_SYMBOLS_FLAG$2 = 4;
var argsTag$1 = "[object Arguments]", arrayTag$1 = "[object Array]", boolTag$1 = "[object Boolean]", dateTag$1 = "[object Date]", errorTag$2 = "[object Error]", funcTag = "[object Function]", genTag = "[object GeneratorFunction]", mapTag$3 = "[object Map]", numberTag$1 = "[object Number]", objectTag$2 = "[object Object]", regexpTag$1 = "[object RegExp]", setTag$3 = "[object Set]", stringTag$2 = "[object String]", symbolTag$2 = "[object Symbol]", weakMapTag = "[object WeakMap]";
var arrayBufferTag$1 = "[object ArrayBuffer]", dataViewTag$1 = "[object DataView]", float32Tag = "[object Float32Array]", float64Tag = "[object Float64Array]", int8Tag = "[object Int8Array]", int16Tag = "[object Int16Array]", int32Tag = "[object Int32Array]", uint8Tag = "[object Uint8Array]", uint8ClampedTag = "[object Uint8ClampedArray]", uint16Tag = "[object Uint16Array]", uint32Tag = "[object Uint32Array]";
var cloneableTags = {};
cloneableTags[argsTag$1] = cloneableTags[arrayTag$1] = cloneableTags[arrayBufferTag$1] = cloneableTags[dataViewTag$1] = cloneableTags[boolTag$1] = cloneableTags[dateTag$1] = cloneableTags[float32Tag] = cloneableTags[float64Tag] = cloneableTags[int8Tag] = cloneableTags[int16Tag] = cloneableTags[int32Tag] = cloneableTags[mapTag$3] = cloneableTags[numberTag$1] = cloneableTags[objectTag$2] = cloneableTags[regexpTag$1] = cloneableTags[setTag$3] = cloneableTags[stringTag$2] = cloneableTags[symbolTag$2] = cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] = cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
cloneableTags[errorTag$2] = cloneableTags[funcTag] = cloneableTags[weakMapTag] = false;
function baseClone$2(value, bitmask, customizer, key, object, stack) {
  var result, isDeep = bitmask & CLONE_DEEP_FLAG$1, isFlat = bitmask & CLONE_FLAT_FLAG, isFull = bitmask & CLONE_SYMBOLS_FLAG$2;
  if (customizer) {
    result = object ? customizer(value, key, object, stack) : customizer(value);
  }
  if (result !== void 0) {
    return result;
  }
  if (!isObject$d(value)) {
    return value;
  }
  var isArr = isArray$h(value);
  if (isArr) {
    result = initCloneArray(value);
    if (!isDeep) {
      return copyArray$2(value, result);
    }
  } else {
    var tag = getTag$3(value), isFunc = tag == funcTag || tag == genTag;
    if (isBuffer$4(value)) {
      return cloneBuffer$1(value, isDeep);
    }
    if (tag == objectTag$2 || tag == argsTag$1 || isFunc && !object) {
      result = isFlat || isFunc ? {} : initCloneObject$1(value);
      if (!isDeep) {
        return isFlat ? copySymbolsIn(value, baseAssignIn(result, value)) : copySymbols(value, baseAssign(result, value));
      }
    } else {
      if (!cloneableTags[tag]) {
        return object ? value : {};
      }
      result = initCloneByTag(value, tag, isDeep);
    }
  }
  stack || (stack = new Stack$3());
  var stacked = stack.get(value);
  if (stacked) {
    return stacked;
  }
  stack.set(value, result);
  if (isSet(value)) {
    value.forEach(function(subValue) {
      result.add(baseClone$2(subValue, bitmask, customizer, subValue, value, stack));
    });
  } else if (isMap(value)) {
    value.forEach(function(subValue, key2) {
      result.set(key2, baseClone$2(subValue, bitmask, customizer, key2, value, stack));
    });
  }
  var keysFunc = isFull ? isFlat ? getAllKeysIn$1 : getAllKeys$1 : isFlat ? keysIn$4 : keys$6;
  var props = isArr ? void 0 : keysFunc(value);
  arrayEach$3(props || value, function(subValue, key2) {
    if (props) {
      key2 = subValue;
      subValue = value[key2];
    }
    assignValue$2(result, key2, baseClone$2(subValue, bitmask, customizer, key2, value, stack));
  });
  return result;
}
var _baseClone = baseClone$2;
var baseClone$1 = _baseClone;
var CLONE_DEEP_FLAG = 1, CLONE_SYMBOLS_FLAG$1 = 4;
function cloneDeepWith$1(value, customizer) {
  customizer = typeof customizer == "function" ? customizer : void 0;
  return baseClone$1(value, CLONE_DEEP_FLAG | CLONE_SYMBOLS_FLAG$1, customizer);
}
var cloneDeepWith_1 = cloneDeepWith$1;
function identity$6(value) {
  return value;
}
var identity_1 = identity$6;
function apply$2(func, thisArg, args) {
  switch (args.length) {
    case 0:
      return func.call(thisArg);
    case 1:
      return func.call(thisArg, args[0]);
    case 2:
      return func.call(thisArg, args[0], args[1]);
    case 3:
      return func.call(thisArg, args[0], args[1], args[2]);
  }
  return func.apply(thisArg, args);
}
var _apply = apply$2;
var apply$1 = _apply;
var nativeMax$3 = Math.max;
function overRest$1(func, start, transform2) {
  start = nativeMax$3(start === void 0 ? func.length - 1 : start, 0);
  return function() {
    var args = arguments, index = -1, length = nativeMax$3(args.length - start, 0), array = Array(length);
    while (++index < length) {
      array[index] = args[start + index];
    }
    index = -1;
    var otherArgs = Array(start + 1);
    while (++index < start) {
      otherArgs[index] = args[index];
    }
    otherArgs[start] = transform2(array);
    return apply$1(func, this, otherArgs);
  };
}
var _overRest = overRest$1;
function constant$1(value) {
  return function() {
    return value;
  };
}
var constant_1 = constant$1;
var constant = constant_1, defineProperty = _defineProperty, identity$5 = identity_1;
var baseSetToString$1 = !defineProperty ? identity$5 : function(func, string2) {
  return defineProperty(func, "toString", {
    "configurable": true,
    "enumerable": false,
    "value": constant(string2),
    "writable": true
  });
};
var _baseSetToString = baseSetToString$1;
var HOT_COUNT = 800, HOT_SPAN = 16;
var nativeNow = Date.now;
function shortOut$1(func) {
  var count = 0, lastCalled = 0;
  return function() {
    var stamp = nativeNow(), remaining = HOT_SPAN - (stamp - lastCalled);
    lastCalled = stamp;
    if (remaining > 0) {
      if (++count >= HOT_COUNT) {
        return arguments[0];
      }
    } else {
      count = 0;
    }
    return func.apply(void 0, arguments);
  };
}
var _shortOut = shortOut$1;
var baseSetToString = _baseSetToString, shortOut = _shortOut;
var setToString$1 = shortOut(baseSetToString);
var _setToString = setToString$1;
var identity$4 = identity_1, overRest = _overRest, setToString = _setToString;
function baseRest$5(func, start) {
  return setToString(overRest(func, start, identity$4), func + "");
}
var _baseRest = baseRest$5;
var eq$4 = eq_1, isArrayLike$7 = isArrayLike_1, isIndex$2 = _isIndex, isObject$c = isObject_1;
function isIterateeCall$5(value, index, object) {
  if (!isObject$c(object)) {
    return false;
  }
  var type = typeof index;
  if (type == "number" ? isArrayLike$7(object) && isIndex$2(index, object.length) : type == "string" && index in object) {
    return eq$4(object[index], value);
  }
  return false;
}
var _isIterateeCall = isIterateeCall$5;
var baseRest$4 = _baseRest, eq$3 = eq_1, isIterateeCall$4 = _isIterateeCall, keysIn$3 = keysIn_1;
var objectProto$9 = Object.prototype;
var hasOwnProperty$9 = objectProto$9.hasOwnProperty;
var defaults$1 = baseRest$4(function(object, sources) {
  object = Object(object);
  var index = -1;
  var length = sources.length;
  var guard = length > 2 ? sources[2] : void 0;
  if (guard && isIterateeCall$4(sources[0], sources[1], guard)) {
    length = 1;
  }
  while (++index < length) {
    var source = sources[index];
    var props = keysIn$3(source);
    var propsIndex = -1;
    var propsLength = props.length;
    while (++propsIndex < propsLength) {
      var key = props[propsIndex];
      var value = object[key];
      if (value === void 0 || eq$3(value, objectProto$9[key]) && !hasOwnProperty$9.call(object, key)) {
        object[key] = source[key];
      }
    }
  }
  return object;
});
var defaults_1 = defaults$1;
function arrayMap$6(array, iteratee) {
  var index = -1, length = array == null ? 0 : array.length, result = Array(length);
  while (++index < length) {
    result[index] = iteratee(array[index], index, array);
  }
  return result;
}
var _arrayMap = arrayMap$6;
var baseGetTag$3 = _baseGetTag, isObjectLike$5 = isObjectLike_1;
var symbolTag$1 = "[object Symbol]";
function isSymbol$6(value) {
  return typeof value == "symbol" || isObjectLike$5(value) && baseGetTag$3(value) == symbolTag$1;
}
var isSymbol_1 = isSymbol$6;
var Symbol$4 = _Symbol, arrayMap$5 = _arrayMap, isArray$g = isArray_1, isSymbol$5 = isSymbol_1;
var symbolProto$1 = Symbol$4 ? Symbol$4.prototype : void 0, symbolToString = symbolProto$1 ? symbolProto$1.toString : void 0;
function baseToString$1(value) {
  if (typeof value == "string") {
    return value;
  }
  if (isArray$g(value)) {
    return arrayMap$5(value, baseToString$1) + "";
  }
  if (isSymbol$5(value)) {
    return symbolToString ? symbolToString.call(value) : "";
  }
  var result = value + "";
  return result == "0" && 1 / value == -Infinity ? "-0" : result;
}
var _baseToString = baseToString$1;
var baseToString = _baseToString;
function toString$4(value) {
  return value == null ? "" : baseToString(value);
}
var toString_1 = toString$4;
var toString$3 = toString_1;
var idCounter = 0;
function uniqueId$2(prefix) {
  var id = ++idCounter;
  return toString$3(prefix) + id;
}
var uniqueId_1 = uniqueId$2;
var timeout$3 = {};
let KnexTimeoutError$4 = class KnexTimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = "KnexTimeoutError";
  }
};
function timeout$2(promise, ms2) {
  return new Promise(function(resolve, reject2) {
    const id = setTimeout(function() {
      reject2(new KnexTimeoutError$4("operation timed out"));
    }, ms2);
    function wrappedResolve(value) {
      clearTimeout(id);
      resolve(value);
    }
    function wrappedReject(err) {
      clearTimeout(id);
      reject2(err);
    }
    promise.then(wrappedResolve, wrappedReject);
  });
}
timeout$3.KnexTimeoutError = KnexTimeoutError$4;
timeout$3.timeout = timeout$2;
function ensureConnectionCallback$1(runner2) {
  runner2.client.emit("start", runner2.builder);
  runner2.builder.emit("start", runner2.builder);
  const sql = runner2.builder.toSQL();
  if (runner2.builder._debug) {
    runner2.client.logger.debug(sql);
  }
  if (Array.isArray(sql)) {
    return runner2.queryArray(sql);
  }
  return runner2.query(sql);
}
function ensureConnectionStreamCallback$1(runner2, params) {
  try {
    const sql = runner2.builder.toSQL();
    if (Array.isArray(sql) && params.hasHandler) {
      throw new Error(
        "The stream may only be used with a single query statement."
      );
    }
    return runner2.client.stream(
      runner2.connection,
      sql,
      params.stream,
      params.options
    );
  } catch (e) {
    params.stream.emit("error", e);
    throw e;
  }
}
var ensureConnectionCallback_1 = {
  ensureConnectionCallback: ensureConnectionCallback$1,
  ensureConnectionStreamCallback: ensureConnectionStreamCallback$1
};
const { KnexTimeoutError: KnexTimeoutError$3 } = timeout$3;
const { timeout: timeout$1 } = timeout$3;
const {
  ensureConnectionCallback,
  ensureConnectionStreamCallback
} = ensureConnectionCallback_1;
let Transform;
let Runner$1 = class Runner {
  constructor(client2, builder2) {
    this.client = client2;
    this.builder = builder2;
    this.queries = [];
    this.connection = void 0;
  }
  // "Run" the target, calling "toSQL" on the builder, returning
  // an object or array of queries to run, each of which are run on
  // a single connection.
  async run() {
    const runner2 = this;
    try {
      const res = await this.ensureConnection(ensureConnectionCallback);
      runner2.builder.emit("end");
      return res;
    } catch (err) {
      if (runner2.builder._events && runner2.builder._events.error) {
        runner2.builder.emit("error", err);
      }
      throw err;
    }
  }
  // Stream the result set, by passing through to the dialect's streaming
  // capabilities. If the options are
  stream(optionsOrHandler, handlerOrNil) {
    const firstOptionIsHandler = typeof optionsOrHandler === "function" && arguments.length === 1;
    const options = firstOptionIsHandler ? {} : optionsOrHandler;
    const handler = firstOptionIsHandler ? optionsOrHandler : handlerOrNil;
    const hasHandler = typeof handler === "function";
    Transform = Transform || require$$2.Transform;
    const queryContext = this.builder.queryContext();
    const stream = new Transform({
      objectMode: true,
      transform: (chunk2, _, callback) => {
        try {
          callback(null, this.client.postProcessResponse(chunk2, queryContext));
        } catch (err) {
          callback(err);
        }
      }
    });
    stream.on("close", () => {
      if (this.connection) {
        this.client.releaseConnection(this.connection);
      }
    });
    stream.on("pipe", (sourceStream) => {
      const cleanSourceStream = () => {
        if (!sourceStream.closed) {
          sourceStream.destroy();
        }
      };
      if (stream.closed) {
        cleanSourceStream();
      } else {
        stream.on("close", cleanSourceStream);
      }
    });
    const connectionAcquirePromise = this.ensureConnection(
      ensureConnectionStreamCallback,
      {
        options,
        hasHandler,
        stream
      }
    ).catch((err) => {
      if (!this.connection) {
        stream.emit("error", err);
      }
    });
    if (hasHandler) {
      handler(stream);
      return connectionAcquirePromise;
    }
    return stream;
  }
  // Allow you to pipe the stream to a writable stream.
  pipe(writable, options) {
    return this.stream(options).pipe(writable);
  }
  // "Runs" a query, returning a promise. All queries specified by the builder are guaranteed
  // to run in sequence, and on the same connection, especially helpful when schema building
  // and dealing with foreign key constraints, etc.
  async query(obj) {
    const { __knexUid, __knexTxId } = this.connection;
    this.builder.emit("query", Object.assign({ __knexUid, __knexTxId }, obj));
    const runner2 = this;
    const queryContext = this.builder.queryContext();
    if (obj !== null && typeof obj === "object") {
      obj.queryContext = queryContext;
    }
    let queryPromise = this.client.query(this.connection, obj);
    if (obj.timeout) {
      queryPromise = timeout$1(queryPromise, obj.timeout);
    }
    return queryPromise.then((resp) => this.client.processResponse(resp, runner2)).then((processedResponse) => {
      const postProcessedResponse = this.client.postProcessResponse(
        processedResponse,
        queryContext
      );
      this.builder.emit(
        "query-response",
        postProcessedResponse,
        Object.assign({ __knexUid, __knexTxId }, obj),
        this.builder
      );
      this.client.emit(
        "query-response",
        postProcessedResponse,
        Object.assign({ __knexUid, __knexTxId }, obj),
        this.builder
      );
      return postProcessedResponse;
    }).catch((error) => {
      if (!(error instanceof KnexTimeoutError$3)) {
        return Promise.reject(error);
      }
      const { timeout: timeout2, sql, bindings: bindings2 } = obj;
      let cancelQuery;
      if (obj.cancelOnTimeout) {
        cancelQuery = this.client.cancelQuery(this.connection);
      } else {
        this.connection.__knex__disposed = error;
        cancelQuery = Promise.resolve();
      }
      return cancelQuery.catch((cancelError) => {
        this.connection.__knex__disposed = error;
        throw Object.assign(cancelError, {
          message: `After query timeout of ${timeout2}ms exceeded, cancelling of query failed.`,
          sql,
          bindings: bindings2,
          timeout: timeout2
        });
      }).then(() => {
        throw Object.assign(error, {
          message: `Defined query timeout of ${timeout2}ms exceeded when running query.`,
          sql,
          bindings: bindings2,
          timeout: timeout2
        });
      });
    }).catch((error) => {
      this.builder.emit(
        "query-error",
        error,
        Object.assign({ __knexUid, __knexTxId, queryContext }, obj)
      );
      throw error;
    });
  }
  // In the case of the "schema builder" we call `queryArray`, which runs each
  // of the queries in sequence.
  async queryArray(queries) {
    if (queries.length === 1) {
      const query = queries[0];
      if (!query.statementsProducer) {
        return this.query(query);
      }
      const statements = await query.statementsProducer(
        void 0,
        this.connection
      );
      const sqlQueryObjects = statements.sql.map((statement) => ({
        sql: statement,
        bindings: query.bindings
      }));
      const preQueryObjects = statements.pre.map((statement) => ({
        sql: statement,
        bindings: query.bindings
      }));
      const postQueryObjects = statements.post.map((statement) => ({
        sql: statement,
        bindings: query.bindings
      }));
      let results2 = [];
      await this.queryArray(preQueryObjects);
      try {
        await this.client.transaction(
          async (trx) => {
            const transactionRunner = new Runner(trx.client, this.builder);
            transactionRunner.connection = this.connection;
            results2 = await transactionRunner.queryArray(sqlQueryObjects);
            if (statements.check) {
              const foreignViolations = await trx.raw(statements.check);
              if (foreignViolations.length > 0) {
                throw new Error("FOREIGN KEY constraint failed");
              }
            }
          },
          { connection: this.connection }
        );
      } finally {
        await this.queryArray(postQueryObjects);
      }
      return results2;
    }
    const results = [];
    for (const query of queries) {
      results.push(await this.queryArray([query]));
    }
    return results;
  }
  // Check whether there's a transaction flag, and that it has a connection.
  async ensureConnection(cb, cbParams) {
    if (this.builder._connection) {
      this.connection = this.builder._connection;
    }
    if (this.connection) {
      return cb(this, cbParams);
    }
    let acquiredConnection;
    try {
      acquiredConnection = await this.client.acquireConnection();
    } catch (error) {
      if (!(error instanceof KnexTimeoutError$3)) {
        return Promise.reject(error);
      }
      if (this.builder) {
        error.sql = this.builder.sql;
        error.bindings = this.builder.bindings;
      }
      throw error;
    }
    try {
      this.connection = acquiredConnection;
      return await cb(this, cbParams);
    } finally {
      await this.client.releaseConnection(acquiredConnection);
    }
  }
};
var runner = Runner$1;
var src = { exports: {} };
var browser = { exports: {} };
var ms;
var hasRequiredMs;
function requireMs() {
  if (hasRequiredMs) return ms;
  hasRequiredMs = 1;
  var s = 1e3;
  var m = s * 60;
  var h = m * 60;
  var d = h * 24;
  var w = d * 7;
  var y = d * 365.25;
  ms = function(val, options) {
    options = options || {};
    var type = typeof val;
    if (type === "string" && val.length > 0) {
      return parse2(val);
    } else if (type === "number" && isFinite(val)) {
      return options.long ? fmtLong(val) : fmtShort(val);
    }
    throw new Error(
      "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
    );
  };
  function parse2(str) {
    str = String(str);
    if (str.length > 100) {
      return;
    }
    var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
      str
    );
    if (!match) {
      return;
    }
    var n = parseFloat(match[1]);
    var type = (match[2] || "ms").toLowerCase();
    switch (type) {
      case "years":
      case "year":
      case "yrs":
      case "yr":
      case "y":
        return n * y;
      case "weeks":
      case "week":
      case "w":
        return n * w;
      case "days":
      case "day":
      case "d":
        return n * d;
      case "hours":
      case "hour":
      case "hrs":
      case "hr":
      case "h":
        return n * h;
      case "minutes":
      case "minute":
      case "mins":
      case "min":
      case "m":
        return n * m;
      case "seconds":
      case "second":
      case "secs":
      case "sec":
      case "s":
        return n * s;
      case "milliseconds":
      case "millisecond":
      case "msecs":
      case "msec":
      case "ms":
        return n;
      default:
        return void 0;
    }
  }
  function fmtShort(ms2) {
    var msAbs = Math.abs(ms2);
    if (msAbs >= d) {
      return Math.round(ms2 / d) + "d";
    }
    if (msAbs >= h) {
      return Math.round(ms2 / h) + "h";
    }
    if (msAbs >= m) {
      return Math.round(ms2 / m) + "m";
    }
    if (msAbs >= s) {
      return Math.round(ms2 / s) + "s";
    }
    return ms2 + "ms";
  }
  function fmtLong(ms2) {
    var msAbs = Math.abs(ms2);
    if (msAbs >= d) {
      return plural(ms2, msAbs, d, "day");
    }
    if (msAbs >= h) {
      return plural(ms2, msAbs, h, "hour");
    }
    if (msAbs >= m) {
      return plural(ms2, msAbs, m, "minute");
    }
    if (msAbs >= s) {
      return plural(ms2, msAbs, s, "second");
    }
    return ms2 + " ms";
  }
  function plural(ms2, msAbs, n, name) {
    var isPlural = msAbs >= n * 1.5;
    return Math.round(ms2 / n) + " " + name + (isPlural ? "s" : "");
  }
  return ms;
}
var common;
var hasRequiredCommon;
function requireCommon() {
  if (hasRequiredCommon) return common;
  hasRequiredCommon = 1;
  function setup(env2) {
    createDebug.debug = createDebug;
    createDebug.default = createDebug;
    createDebug.coerce = coerce;
    createDebug.disable = disable;
    createDebug.enable = enable;
    createDebug.enabled = enabled;
    createDebug.humanize = requireMs();
    createDebug.destroy = destroy;
    Object.keys(env2).forEach((key) => {
      createDebug[key] = env2[key];
    });
    createDebug.names = [];
    createDebug.skips = [];
    createDebug.formatters = {};
    function selectColor(namespace) {
      let hash = 0;
      for (let i = 0; i < namespace.length; i++) {
        hash = (hash << 5) - hash + namespace.charCodeAt(i);
        hash |= 0;
      }
      return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
    }
    createDebug.selectColor = selectColor;
    function createDebug(namespace) {
      let prevTime;
      let enableOverride = null;
      let namespacesCache;
      let enabledCache;
      function debug2(...args) {
        if (!debug2.enabled) {
          return;
        }
        const self2 = debug2;
        const curr = Number(/* @__PURE__ */ new Date());
        const ms2 = curr - (prevTime || curr);
        self2.diff = ms2;
        self2.prev = prevTime;
        self2.curr = curr;
        prevTime = curr;
        args[0] = createDebug.coerce(args[0]);
        if (typeof args[0] !== "string") {
          args.unshift("%O");
        }
        let index = 0;
        args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
          if (match === "%%") {
            return "%";
          }
          index++;
          const formatter2 = createDebug.formatters[format];
          if (typeof formatter2 === "function") {
            const val = args[index];
            match = formatter2.call(self2, val);
            args.splice(index, 1);
            index--;
          }
          return match;
        });
        createDebug.formatArgs.call(self2, args);
        const logFn = self2.log || createDebug.log;
        logFn.apply(self2, args);
      }
      debug2.namespace = namespace;
      debug2.useColors = createDebug.useColors();
      debug2.color = createDebug.selectColor(namespace);
      debug2.extend = extend2;
      debug2.destroy = createDebug.destroy;
      Object.defineProperty(debug2, "enabled", {
        enumerable: true,
        configurable: false,
        get: () => {
          if (enableOverride !== null) {
            return enableOverride;
          }
          if (namespacesCache !== createDebug.namespaces) {
            namespacesCache = createDebug.namespaces;
            enabledCache = createDebug.enabled(namespace);
          }
          return enabledCache;
        },
        set: (v) => {
          enableOverride = v;
        }
      });
      if (typeof createDebug.init === "function") {
        createDebug.init(debug2);
      }
      return debug2;
    }
    function extend2(namespace, delimiter) {
      const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
      newDebug.log = this.log;
      return newDebug;
    }
    function enable(namespaces) {
      createDebug.save(namespaces);
      createDebug.namespaces = namespaces;
      createDebug.names = [];
      createDebug.skips = [];
      let i;
      const split = (typeof namespaces === "string" ? namespaces : "").split(/[\s,]+/);
      const len = split.length;
      for (i = 0; i < len; i++) {
        if (!split[i]) {
          continue;
        }
        namespaces = split[i].replace(/\*/g, ".*?");
        if (namespaces[0] === "-") {
          createDebug.skips.push(new RegExp("^" + namespaces.slice(1) + "$"));
        } else {
          createDebug.names.push(new RegExp("^" + namespaces + "$"));
        }
      }
    }
    function disable() {
      const namespaces = [
        ...createDebug.names.map(toNamespace),
        ...createDebug.skips.map(toNamespace).map((namespace) => "-" + namespace)
      ].join(",");
      createDebug.enable("");
      return namespaces;
    }
    function enabled(name) {
      if (name[name.length - 1] === "*") {
        return true;
      }
      let i;
      let len;
      for (i = 0, len = createDebug.skips.length; i < len; i++) {
        if (createDebug.skips[i].test(name)) {
          return false;
        }
      }
      for (i = 0, len = createDebug.names.length; i < len; i++) {
        if (createDebug.names[i].test(name)) {
          return true;
        }
      }
      return false;
    }
    function toNamespace(regexp) {
      return regexp.toString().substring(2, regexp.toString().length - 2).replace(/\.\*\?$/, "*");
    }
    function coerce(val) {
      if (val instanceof Error) {
        return val.stack || val.message;
      }
      return val;
    }
    function destroy() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    createDebug.enable(createDebug.load());
    return createDebug;
  }
  common = setup;
  return common;
}
var hasRequiredBrowser;
function requireBrowser() {
  if (hasRequiredBrowser) return browser.exports;
  hasRequiredBrowser = 1;
  (function(module, exports) {
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.storage = localstorage();
    exports.destroy = /* @__PURE__ */ (() => {
      let warned = false;
      return () => {
        if (!warned) {
          warned = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c = "color: " + this.color;
      args.splice(1, 0, c, "color: inherit");
      let index = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index++;
        if (match === "%c") {
          lastC = index;
        }
      });
      args.splice(lastC, 0, c);
    }
    exports.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports.storage.setItem("debug", namespaces);
        } else {
          exports.storage.removeItem("debug");
        }
      } catch (error) {
      }
    }
    function load() {
      let r;
      try {
        r = exports.storage.getItem("debug");
      } catch (error) {
      }
      if (!r && typeof process !== "undefined" && "env" in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (error) {
      }
    }
    module.exports = requireCommon()(exports);
    const { formatters } = module.exports;
    formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (error) {
        return "[UnexpectedJSONParseError]: " + error.message;
      }
    };
  })(browser, browser.exports);
  return browser.exports;
}
var node = { exports: {} };
var hasFlag;
var hasRequiredHasFlag;
function requireHasFlag() {
  if (hasRequiredHasFlag) return hasFlag;
  hasRequiredHasFlag = 1;
  hasFlag = (flag, argv2 = process.argv) => {
    const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
    const position = argv2.indexOf(prefix + flag);
    const terminatorPosition = argv2.indexOf("--");
    return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
  };
  return hasFlag;
}
var supportsColor_1;
var hasRequiredSupportsColor;
function requireSupportsColor() {
  if (hasRequiredSupportsColor) return supportsColor_1;
  hasRequiredSupportsColor = 1;
  const os = require$$2$1;
  const tty2 = require$$0$1;
  const hasFlag2 = requireHasFlag();
  const { env: env2 } = process;
  let forceColor;
  if (hasFlag2("no-color") || hasFlag2("no-colors") || hasFlag2("color=false") || hasFlag2("color=never")) {
    forceColor = 0;
  } else if (hasFlag2("color") || hasFlag2("colors") || hasFlag2("color=true") || hasFlag2("color=always")) {
    forceColor = 1;
  }
  if ("FORCE_COLOR" in env2) {
    if (env2.FORCE_COLOR === "true") {
      forceColor = 1;
    } else if (env2.FORCE_COLOR === "false") {
      forceColor = 0;
    } else {
      forceColor = env2.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(env2.FORCE_COLOR, 10), 3);
    }
  }
  function translateLevel(level) {
    if (level === 0) {
      return false;
    }
    return {
      level,
      hasBasic: true,
      has256: level >= 2,
      has16m: level >= 3
    };
  }
  function supportsColor(haveStream, streamIsTTY) {
    if (forceColor === 0) {
      return 0;
    }
    if (hasFlag2("color=16m") || hasFlag2("color=full") || hasFlag2("color=truecolor")) {
      return 3;
    }
    if (hasFlag2("color=256")) {
      return 2;
    }
    if (haveStream && !streamIsTTY && forceColor === void 0) {
      return 0;
    }
    const min = forceColor || 0;
    if (env2.TERM === "dumb") {
      return min;
    }
    if (process.platform === "win32") {
      const osRelease = os.release().split(".");
      if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
        return Number(osRelease[2]) >= 14931 ? 3 : 2;
      }
      return 1;
    }
    if ("CI" in env2) {
      if (["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((sign) => sign in env2) || env2.CI_NAME === "codeship") {
        return 1;
      }
      return min;
    }
    if ("TEAMCITY_VERSION" in env2) {
      return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env2.TEAMCITY_VERSION) ? 1 : 0;
    }
    if (env2.COLORTERM === "truecolor") {
      return 3;
    }
    if ("TERM_PROGRAM" in env2) {
      const version = parseInt((env2.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
      switch (env2.TERM_PROGRAM) {
        case "iTerm.app":
          return version >= 3 ? 3 : 2;
        case "Apple_Terminal":
          return 2;
      }
    }
    if (/-256(color)?$/i.test(env2.TERM)) {
      return 2;
    }
    if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env2.TERM)) {
      return 1;
    }
    if ("COLORTERM" in env2) {
      return 1;
    }
    return min;
  }
  function getSupportLevel(stream) {
    const level = supportsColor(stream, stream && stream.isTTY);
    return translateLevel(level);
  }
  supportsColor_1 = {
    supportsColor: getSupportLevel,
    stdout: translateLevel(supportsColor(true, tty2.isatty(1))),
    stderr: translateLevel(supportsColor(true, tty2.isatty(2)))
  };
  return supportsColor_1;
}
var hasRequiredNode;
function requireNode() {
  if (hasRequiredNode) return node.exports;
  hasRequiredNode = 1;
  (function(module, exports) {
    const tty2 = require$$0$1;
    const util = require$$3;
    exports.init = init2;
    exports.log = log;
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.destroy = util.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    );
    exports.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor = requireSupportsColor();
      if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
        exports.colors = [
          20,
          21,
          26,
          27,
          32,
          33,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          56,
          57,
          62,
          63,
          68,
          69,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          92,
          93,
          98,
          99,
          112,
          113,
          128,
          129,
          134,
          135,
          148,
          149,
          160,
          161,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          171,
          172,
          173,
          178,
          179,
          184,
          185,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          203,
          204,
          205,
          206,
          207,
          208,
          209,
          214,
          215,
          220,
          221
        ];
      }
    } catch (error) {
    }
    exports.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
        return k.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty2.isatty(process.stderr.fd);
    }
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c = this.color;
        const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
        const prefix = `  ${colorCode};1m${name} \x1B[0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module.exports.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    function getDate() {
      if (exports.inspectOpts.hideDate) {
        return "";
      }
      return (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function log(...args) {
      return process.stderr.write(util.format(...args) + "\n");
    }
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load() {
      return process.env.DEBUG;
    }
    function init2(debug2) {
      debug2.inspectOpts = {};
      const keys2 = Object.keys(exports.inspectOpts);
      for (let i = 0; i < keys2.length; i++) {
        debug2.inspectOpts[keys2[i]] = exports.inspectOpts[keys2[i]];
      }
    }
    module.exports = requireCommon()(exports);
    const { formatters } = module.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts);
    };
  })(node, node.exports);
  return node.exports;
}
if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
  src.exports = requireBrowser();
} else {
  src.exports = requireNode();
}
var srcExports = src.exports;
var HASH_UNDEFINED = "__lodash_hash_undefined__";
function setCacheAdd$1(value) {
  this.__data__.set(value, HASH_UNDEFINED);
  return this;
}
var _setCacheAdd = setCacheAdd$1;
function setCacheHas$1(value) {
  return this.__data__.has(value);
}
var _setCacheHas = setCacheHas$1;
var MapCache$1 = _MapCache, setCacheAdd = _setCacheAdd, setCacheHas = _setCacheHas;
function SetCache$2(values2) {
  var index = -1, length = values2 == null ? 0 : values2.length;
  this.__data__ = new MapCache$1();
  while (++index < length) {
    this.add(values2[index]);
  }
}
SetCache$2.prototype.add = SetCache$2.prototype.push = setCacheAdd;
SetCache$2.prototype.has = setCacheHas;
var _SetCache = SetCache$2;
function baseFindIndex$1(array, predicate, fromIndex, fromRight) {
  var length = array.length, index = fromIndex + (fromRight ? 1 : -1);
  while (fromRight ? index-- : ++index < length) {
    if (predicate(array[index], index, array)) {
      return index;
    }
  }
  return -1;
}
var _baseFindIndex = baseFindIndex$1;
function baseIsNaN$1(value) {
  return value !== value;
}
var _baseIsNaN = baseIsNaN$1;
function strictIndexOf$1(array, value, fromIndex) {
  var index = fromIndex - 1, length = array.length;
  while (++index < length) {
    if (array[index] === value) {
      return index;
    }
  }
  return -1;
}
var _strictIndexOf = strictIndexOf$1;
var baseFindIndex = _baseFindIndex, baseIsNaN = _baseIsNaN, strictIndexOf = _strictIndexOf;
function baseIndexOf$3(array, value, fromIndex) {
  return value === value ? strictIndexOf(array, value, fromIndex) : baseFindIndex(array, baseIsNaN, fromIndex);
}
var _baseIndexOf = baseIndexOf$3;
var baseIndexOf$2 = _baseIndexOf;
function arrayIncludes$1(array, value) {
  var length = array == null ? 0 : array.length;
  return !!length && baseIndexOf$2(array, value, 0) > -1;
}
var _arrayIncludes = arrayIncludes$1;
function arrayIncludesWith$1(array, value, comparator) {
  var index = -1, length = array == null ? 0 : array.length;
  while (++index < length) {
    if (comparator(value, array[index])) {
      return true;
    }
  }
  return false;
}
var _arrayIncludesWith = arrayIncludesWith$1;
function cacheHas$2(cache2, key) {
  return cache2.has(key);
}
var _cacheHas = cacheHas$2;
var SetCache$1 = _SetCache, arrayIncludes = _arrayIncludes, arrayIncludesWith = _arrayIncludesWith, arrayMap$4 = _arrayMap, baseUnary$1 = _baseUnary, cacheHas$1 = _cacheHas;
var LARGE_ARRAY_SIZE = 200;
function baseDifference$1(array, values2, iteratee, comparator) {
  var index = -1, includes2 = arrayIncludes, isCommon = true, length = array.length, result = [], valuesLength = values2.length;
  if (!length) {
    return result;
  }
  if (iteratee) {
    values2 = arrayMap$4(values2, baseUnary$1(iteratee));
  }
  if (comparator) {
    includes2 = arrayIncludesWith;
    isCommon = false;
  } else if (values2.length >= LARGE_ARRAY_SIZE) {
    includes2 = cacheHas$1;
    isCommon = false;
    values2 = new SetCache$1(values2);
  }
  outer:
    while (++index < length) {
      var value = array[index], computed = iteratee == null ? value : iteratee(value);
      value = comparator || value !== 0 ? value : 0;
      if (isCommon && computed === computed) {
        var valuesIndex = valuesLength;
        while (valuesIndex--) {
          if (values2[valuesIndex] === computed) {
            continue outer;
          }
        }
        result.push(value);
      } else if (!includes2(values2, computed, comparator)) {
        result.push(value);
      }
    }
  return result;
}
var _baseDifference = baseDifference$1;
var Symbol$3 = _Symbol, isArguments$3 = isArguments_1, isArray$f = isArray_1;
var spreadableSymbol = Symbol$3 ? Symbol$3.isConcatSpreadable : void 0;
function isFlattenable$1(value) {
  return isArray$f(value) || isArguments$3(value) || !!(spreadableSymbol && value && value[spreadableSymbol]);
}
var _isFlattenable = isFlattenable$1;
var arrayPush = _arrayPush, isFlattenable = _isFlattenable;
function baseFlatten$3(array, depth, predicate, isStrict, result) {
  var index = -1, length = array.length;
  predicate || (predicate = isFlattenable);
  result || (result = []);
  while (++index < length) {
    var value = array[index];
    if (depth > 0 && predicate(value)) {
      if (depth > 1) {
        baseFlatten$3(value, depth - 1, predicate, isStrict, result);
      } else {
        arrayPush(result, value);
      }
    } else if (!isStrict) {
      result[result.length] = value;
    }
  }
  return result;
}
var _baseFlatten = baseFlatten$3;
var isArrayLike$6 = isArrayLike_1, isObjectLike$4 = isObjectLike_1;
function isArrayLikeObject$2(value) {
  return isObjectLike$4(value) && isArrayLike$6(value);
}
var isArrayLikeObject_1 = isArrayLikeObject$2;
function last$2(array) {
  var length = array == null ? 0 : array.length;
  return length ? array[length - 1] : void 0;
}
var last_1 = last$2;
var baseDifference = _baseDifference, baseFlatten$2 = _baseFlatten, baseRest$3 = _baseRest, isArrayLikeObject$1 = isArrayLikeObject_1, last$1 = last_1;
var differenceWith$1 = baseRest$3(function(array, values2) {
  var comparator = last$1(values2);
  if (isArrayLikeObject$1(comparator)) {
    comparator = void 0;
  }
  return isArrayLikeObject$1(array) ? baseDifference(array, baseFlatten$2(values2, 1, isArrayLikeObject$1, true), void 0, comparator) : [];
});
var differenceWith_1 = differenceWith$1;
var isArray$e = isArray_1, isSymbol$4 = isSymbol_1;
var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/, reIsPlainProp = /^\w*$/;
function isKey$3(value, object) {
  if (isArray$e(value)) {
    return false;
  }
  var type = typeof value;
  if (type == "number" || type == "symbol" || type == "boolean" || value == null || isSymbol$4(value)) {
    return true;
  }
  return reIsPlainProp.test(value) || !reIsDeepProp.test(value) || object != null && value in Object(object);
}
var _isKey = isKey$3;
var MapCache = _MapCache;
var FUNC_ERROR_TEXT$1 = "Expected a function";
function memoize$1(func, resolver) {
  if (typeof func != "function" || resolver != null && typeof resolver != "function") {
    throw new TypeError(FUNC_ERROR_TEXT$1);
  }
  var memoized = function() {
    var args = arguments, key = resolver ? resolver.apply(this, args) : args[0], cache2 = memoized.cache;
    if (cache2.has(key)) {
      return cache2.get(key);
    }
    var result = func.apply(this, args);
    memoized.cache = cache2.set(key, result) || cache2;
    return result;
  };
  memoized.cache = new (memoize$1.Cache || MapCache)();
  return memoized;
}
memoize$1.Cache = MapCache;
var memoize_1 = memoize$1;
var memoize = memoize_1;
var MAX_MEMOIZE_SIZE = 500;
function memoizeCapped$1(func) {
  var result = memoize(func, function(key) {
    if (cache2.size === MAX_MEMOIZE_SIZE) {
      cache2.clear();
    }
    return key;
  });
  var cache2 = result.cache;
  return result;
}
var _memoizeCapped = memoizeCapped$1;
var memoizeCapped = _memoizeCapped;
var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;
var reEscapeChar = /\\(\\)?/g;
var stringToPath$1 = memoizeCapped(function(string2) {
  var result = [];
  if (string2.charCodeAt(0) === 46) {
    result.push("");
  }
  string2.replace(rePropName, function(match, number, quote, subString) {
    result.push(quote ? subString.replace(reEscapeChar, "$1") : number || match);
  });
  return result;
});
var _stringToPath = stringToPath$1;
var isArray$d = isArray_1, isKey$2 = _isKey, stringToPath = _stringToPath, toString$2 = toString_1;
function castPath$4(value, object) {
  if (isArray$d(value)) {
    return value;
  }
  return isKey$2(value, object) ? [value] : stringToPath(toString$2(value));
}
var _castPath = castPath$4;
var isSymbol$3 = isSymbol_1;
function toKey$5(value) {
  if (typeof value == "string" || isSymbol$3(value)) {
    return value;
  }
  var result = value + "";
  return result == "0" && 1 / value == -Infinity ? "-0" : result;
}
var _toKey = toKey$5;
var castPath$3 = _castPath, toKey$4 = _toKey;
function baseGet$4(object, path2) {
  path2 = castPath$3(path2, object);
  var index = 0, length = path2.length;
  while (object != null && index < length) {
    object = object[toKey$4(path2[index++])];
  }
  return index && index == length ? object : void 0;
}
var _baseGet = baseGet$4;
var baseGet$3 = _baseGet;
function get$2(object, path2, defaultValue) {
  var result = object == null ? void 0 : baseGet$3(object, path2);
  return result === void 0 ? defaultValue : result;
}
var get_1 = get$2;
var baseKeys = _baseKeys, getTag$2 = _getTag, isArguments$2 = isArguments_1, isArray$c = isArray_1, isArrayLike$5 = isArrayLike_1, isBuffer$3 = isBufferExports, isPrototype$1 = _isPrototype, isTypedArray$4 = isTypedArray_1;
var mapTag$2 = "[object Map]", setTag$2 = "[object Set]";
var objectProto$8 = Object.prototype;
var hasOwnProperty$8 = objectProto$8.hasOwnProperty;
function isEmpty$5(value) {
  if (value == null) {
    return true;
  }
  if (isArrayLike$5(value) && (isArray$c(value) || typeof value == "string" || typeof value.splice == "function" || isBuffer$3(value) || isTypedArray$4(value) || isArguments$2(value))) {
    return !value.length;
  }
  var tag = getTag$2(value);
  if (tag == mapTag$2 || tag == setTag$2) {
    return !value.size;
  }
  if (isPrototype$1(value)) {
    return !baseKeys(value).length;
  }
  for (var key in value) {
    if (hasOwnProperty$8.call(value, key)) {
      return false;
    }
  }
  return true;
}
var isEmpty_1 = isEmpty$5;
var isSymbol$2 = isSymbol_1;
function baseExtremum$1(array, iteratee, comparator) {
  var index = -1, length = array.length;
  while (++index < length) {
    var value = array[index], current = iteratee(value);
    if (current != null && (computed === void 0 ? current === current && !isSymbol$2(current) : comparator(current, computed))) {
      var computed = current, result = value;
    }
  }
  return result;
}
var _baseExtremum = baseExtremum$1;
function baseGt$1(value, other) {
  return value > other;
}
var _baseGt = baseGt$1;
var baseExtremum = _baseExtremum, baseGt = _baseGt, identity$3 = identity_1;
function max$1(array) {
  return array && array.length ? baseExtremum(array, identity$3, baseGt) : void 0;
}
var max_1 = max$1;
function getTableName$3(tableName, schemaName) {
  return schemaName ? `${schemaName}.${tableName}` : tableName;
}
function getTable$2(trxOrKnex, tableName, schemaName) {
  return schemaName ? trxOrKnex(tableName).withSchema(schemaName) : trxOrKnex(tableName);
}
function getLockTableName$2(tableName) {
  return tableName + "_lock";
}
function getLockTableNameWithSchema$1(tableName, schemaName) {
  return schemaName ? schemaName + "." + getLockTableName$2(tableName) : getLockTableName$2(tableName);
}
var tableResolver = {
  getLockTableName: getLockTableName$2,
  getLockTableNameWithSchema: getLockTableNameWithSchema$1,
  getTable: getTable$2,
  getTableName: getTableName$3
};
const {
  getTable: getTable$1,
  getLockTableName: getLockTableName$1,
  getLockTableNameWithSchema,
  getTableName: getTableName$2
} = tableResolver;
function ensureTable$1(tableName, schemaName, trxOrKnex) {
  const lockTable = getLockTableName$1(tableName);
  return getSchemaBuilder$1(trxOrKnex, schemaName).hasTable(tableName).then((exists) => {
    return !exists && _createMigrationTable(tableName, schemaName, trxOrKnex);
  }).then(() => {
    return getSchemaBuilder$1(trxOrKnex, schemaName).hasTable(lockTable);
  }).then((exists) => {
    return !exists && _createMigrationLockTable(lockTable, schemaName, trxOrKnex);
  }).then(() => {
    return getTable$1(trxOrKnex, lockTable, schemaName).select("*");
  }).then((data) => {
    return !data.length && _insertLockRowIfNeeded(tableName, schemaName, trxOrKnex);
  });
}
function _createMigrationTable(tableName, schemaName, trxOrKnex) {
  return getSchemaBuilder$1(trxOrKnex, schemaName).createTable(
    getTableName$2(tableName),
    function(t) {
      t.increments();
      t.string("name");
      t.integer("batch");
      t.timestamp("migration_time");
    }
  );
}
function _createMigrationLockTable(tableName, schemaName, trxOrKnex) {
  return getSchemaBuilder$1(trxOrKnex, schemaName).createTable(
    tableName,
    function(t) {
      t.increments("index").primary();
      t.integer("is_locked");
    }
  );
}
function _insertLockRowIfNeeded(tableName, schemaName, trxOrKnex) {
  const lockTableWithSchema = getLockTableNameWithSchema(tableName, schemaName);
  return trxOrKnex.select("*").from(lockTableWithSchema).then((data) => {
    return !data.length ? trxOrKnex.from(lockTableWithSchema).insert({ is_locked: 0 }) : null;
  });
}
function getSchemaBuilder$1(trxOrKnex, schemaName) {
  return schemaName ? trxOrKnex.schema.withSchema(schemaName) : trxOrKnex.schema;
}
var tableCreator = {
  ensureTable: ensureTable$1,
  getSchemaBuilder: getSchemaBuilder$1
};
const { getTableName: getTableName$1 } = tableResolver;
const { ensureTable } = tableCreator;
function listAll(migrationSource, loadExtensions) {
  return migrationSource.getMigrations(loadExtensions);
}
async function listCompleted(tableName, schemaName, trxOrKnex) {
  await ensureTable(tableName, schemaName, trxOrKnex);
  return await trxOrKnex.from(getTableName$1(tableName, schemaName)).orderBy("id").select("name");
}
function listAllAndCompleted(config, trxOrKnex) {
  return Promise.all([
    listAll(config.migrationSource, config.loadExtensions),
    listCompleted(config.tableName, config.schemaName, trxOrKnex)
  ]);
}
var migrationListResolver$1 = {
  listAll,
  listAllAndCompleted,
  listCompleted
};
var baseRest$2 = _baseRest, isIterateeCall$3 = _isIterateeCall;
function createAssigner$4(assigner) {
  return baseRest$2(function(object, sources) {
    var index = -1, length = sources.length, customizer = length > 1 ? sources[length - 1] : void 0, guard = length > 2 ? sources[2] : void 0;
    customizer = assigner.length > 3 && typeof customizer == "function" ? (length--, customizer) : void 0;
    if (guard && isIterateeCall$3(sources[0], sources[1], guard)) {
      customizer = length < 3 ? void 0 : customizer;
      length = 1;
    }
    object = Object(object);
    while (++index < length) {
      var source = sources[index];
      if (source) {
        assigner(object, source, index, customizer);
      }
    }
    return object;
  });
}
var _createAssigner = createAssigner$4;
var copyObject$3 = _copyObject, createAssigner$3 = _createAssigner, keys$5 = keys_1;
var assignWith$1 = createAssigner$3(function(object, source, srcIndex, customizer) {
  copyObject$3(source, keys$5(source), object, customizer);
});
var assignWith_1 = assignWith$1;
var baseGetTag$2 = _baseGetTag, getPrototype$1 = _getPrototype, isObjectLike$3 = isObjectLike_1;
var objectTag$1 = "[object Object]";
var funcProto = Function.prototype, objectProto$7 = Object.prototype;
var funcToString = funcProto.toString;
var hasOwnProperty$7 = objectProto$7.hasOwnProperty;
var objectCtorString = funcToString.call(Object);
function isPlainObject$6(value) {
  if (!isObjectLike$3(value) || baseGetTag$2(value) != objectTag$1) {
    return false;
  }
  var proto = getPrototype$1(value);
  if (proto === null) {
    return true;
  }
  var Ctor = hasOwnProperty$7.call(proto, "constructor") && proto.constructor;
  return typeof Ctor == "function" && Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString;
}
var isPlainObject_1 = isPlainObject$6;
var baseGetTag$1 = _baseGetTag, isObjectLike$2 = isObjectLike_1, isPlainObject$5 = isPlainObject_1;
var domExcTag = "[object DOMException]", errorTag$1 = "[object Error]";
function isError$2(value) {
  if (!isObjectLike$2(value)) {
    return false;
  }
  var tag = baseGetTag$1(value);
  return tag == errorTag$1 || tag == domExcTag || typeof value.message == "string" && typeof value.name == "string" && !isPlainObject$5(value);
}
var isError_1 = isError$2;
var apply = _apply, baseRest$1 = _baseRest, isError$1 = isError_1;
var attempt$1 = baseRest$1(function(func, args) {
  try {
    return apply(func, void 0, args);
  } catch (e) {
    return isError$1(e) ? e : new Error(e);
  }
});
var attempt_1 = attempt$1;
var arrayMap$3 = _arrayMap;
function baseValues$2(object, props) {
  return arrayMap$3(props, function(key) {
    return object[key];
  });
}
var _baseValues = baseValues$2;
var eq$2 = eq_1;
var objectProto$6 = Object.prototype;
var hasOwnProperty$6 = objectProto$6.hasOwnProperty;
function customDefaultsAssignIn$1(objValue, srcValue, key, object) {
  if (objValue === void 0 || eq$2(objValue, objectProto$6[key]) && !hasOwnProperty$6.call(object, key)) {
    return srcValue;
  }
  return objValue;
}
var _customDefaultsAssignIn = customDefaultsAssignIn$1;
var stringEscapes = {
  "\\": "\\",
  "'": "'",
  "\n": "n",
  "\r": "r",
  "\u2028": "u2028",
  "\u2029": "u2029"
};
function escapeStringChar$1(chr) {
  return "\\" + stringEscapes[chr];
}
var _escapeStringChar = escapeStringChar$1;
var reInterpolate$2 = /<%=([\s\S]+?)%>/g;
var _reInterpolate = reInterpolate$2;
function basePropertyOf$1(object) {
  return function(key) {
    return object == null ? void 0 : object[key];
  };
}
var _basePropertyOf = basePropertyOf$1;
var basePropertyOf = _basePropertyOf;
var htmlEscapes = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};
var escapeHtmlChar$1 = basePropertyOf(htmlEscapes);
var _escapeHtmlChar = escapeHtmlChar$1;
var escapeHtmlChar = _escapeHtmlChar, toString$1 = toString_1;
var reUnescapedHtml = /[&<>"']/g, reHasUnescapedHtml = RegExp(reUnescapedHtml.source);
function escape$1(string2) {
  string2 = toString$1(string2);
  return string2 && reHasUnescapedHtml.test(string2) ? string2.replace(reUnescapedHtml, escapeHtmlChar) : string2;
}
var _escape = escape$1;
var reEscape$1 = /<%-([\s\S]+?)%>/g;
var _reEscape = reEscape$1;
var reEvaluate$1 = /<%([\s\S]+?)%>/g;
var _reEvaluate = reEvaluate$1;
var escape = _escape, reEscape = _reEscape, reEvaluate = _reEvaluate, reInterpolate$1 = _reInterpolate;
var templateSettings$1 = {
  /**
   * Used to detect `data` property values to be HTML-escaped.
   *
   * @memberOf _.templateSettings
   * @type {RegExp}
   */
  "escape": reEscape,
  /**
   * Used to detect code to be evaluated.
   *
   * @memberOf _.templateSettings
   * @type {RegExp}
   */
  "evaluate": reEvaluate,
  /**
   * Used to detect `data` property values to inject.
   *
   * @memberOf _.templateSettings
   * @type {RegExp}
   */
  "interpolate": reInterpolate$1,
  /**
   * Used to reference the data object in the template text.
   *
   * @memberOf _.templateSettings
   * @type {string}
   */
  "variable": "",
  /**
   * Used to import variables into the compiled template.
   *
   * @memberOf _.templateSettings
   * @type {Object}
   */
  "imports": {
    /**
     * A reference to the `lodash` function.
     *
     * @memberOf _.templateSettings.imports
     * @type {Function}
     */
    "_": { "escape": escape }
  }
};
var templateSettings_1 = templateSettings$1;
var arrayEach$2 = _arrayEach, assignWith = assignWith_1, attempt = attempt_1, baseValues$1 = _baseValues, customDefaultsAssignIn = _customDefaultsAssignIn, escapeStringChar = _escapeStringChar, isError = isError_1, isIterateeCall$2 = _isIterateeCall, keys$4 = keys_1, reInterpolate = _reInterpolate, templateSettings = templateSettings_1, toString = toString_1;
var INVALID_TEMPL_VAR_ERROR_TEXT = "Invalid `variable` option passed into `_.template`", INVALID_TEMPL_IMPORTS_ERROR_TEXT = "Invalid `imports` option passed into `_.template`";
var reEmptyStringLeading = /\b__p \+= '';/g, reEmptyStringMiddle = /\b(__p \+=) '' \+/g, reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;
var reForbiddenIdentifierChars = /[()=,{}\[\]\/\s]/;
var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;
var reNoMatch = /($^)/;
var reUnescapedString = /['\n\r\u2028\u2029\\]/g;
var objectProto$5 = Object.prototype;
var hasOwnProperty$5 = objectProto$5.hasOwnProperty;
function template$1(string2, options, guard) {
  var settings = templateSettings.imports._.templateSettings || templateSettings;
  if (guard && isIterateeCall$2(string2, options, guard)) {
    options = void 0;
  }
  string2 = toString(string2);
  options = assignWith({}, options, settings, customDefaultsAssignIn);
  var imports = assignWith({}, options.imports, settings.imports, customDefaultsAssignIn), importsKeys = keys$4(imports), importsValues = baseValues$1(imports, importsKeys);
  arrayEach$2(importsKeys, function(key) {
    if (reForbiddenIdentifierChars.test(key)) {
      throw new Error(INVALID_TEMPL_IMPORTS_ERROR_TEXT);
    }
  });
  var isEscaping, isEvaluating, index = 0, interpolate = options.interpolate || reNoMatch, source = "__p += '";
  var reDelimiters = RegExp(
    (options.escape || reNoMatch).source + "|" + interpolate.source + "|" + (interpolate === reInterpolate ? reEsTemplate : reNoMatch).source + "|" + (options.evaluate || reNoMatch).source + "|$",
    "g"
  );
  var sourceURL = hasOwnProperty$5.call(options, "sourceURL") ? "//# sourceURL=" + (options.sourceURL + "").replace(/\s/g, " ") + "\n" : "";
  string2.replace(reDelimiters, function(match, escapeValue, interpolateValue, esTemplateValue, evaluateValue, offset) {
    interpolateValue || (interpolateValue = esTemplateValue);
    source += string2.slice(index, offset).replace(reUnescapedString, escapeStringChar);
    if (escapeValue) {
      isEscaping = true;
      source += "' +\n__e(" + escapeValue + ") +\n'";
    }
    if (evaluateValue) {
      isEvaluating = true;
      source += "';\n" + evaluateValue + ";\n__p += '";
    }
    if (interpolateValue) {
      source += "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
    }
    index = offset + match.length;
    return match;
  });
  source += "';\n";
  var variable = hasOwnProperty$5.call(options, "variable") && options.variable;
  if (!variable) {
    source = "with (obj) {\n" + source + "\n}\n";
  } else if (reForbiddenIdentifierChars.test(variable)) {
    throw new Error(INVALID_TEMPL_VAR_ERROR_TEXT);
  }
  source = (isEvaluating ? source.replace(reEmptyStringLeading, "") : source).replace(reEmptyStringMiddle, "$1").replace(reEmptyStringTrailing, "$1;");
  source = "function(" + (variable || "obj") + ") {\n" + (variable ? "" : "obj || (obj = {});\n") + "var __t, __p = ''" + (isEscaping ? ", __e = _.escape" : "") + (isEvaluating ? ", __j = Array.prototype.join;\nfunction print() { __p += __j.call(arguments, '') }\n" : ";\n") + source + "return __p\n}";
  var result = attempt(function() {
    return Function(importsKeys, sourceURL + "return " + source).apply(void 0, importsValues);
  });
  result.source = source;
  if (isError(result)) {
    throw result;
  }
  return result;
}
var template_1$1 = template$1;
var baseFlatten$1 = _baseFlatten;
function flatten$3(array) {
  var length = array == null ? 0 : array.length;
  return length ? baseFlatten$1(array, 1) : [];
}
var flatten_1 = flatten$3;
const fs = require$$0$2;
const flatten$2 = flatten_1;
const path$5 = require$$0$3;
const { promisify: promisify$1 } = require$$3;
const stat = promisify$1(fs.stat);
const readFile$1 = promisify$1(fs.readFile);
const writeFile$1 = promisify$1(fs.writeFile);
const readdir$1 = promisify$1(fs.readdir);
const mkdir = promisify$1(fs.mkdir);
function ensureDirectoryExists$2(dir) {
  return stat(dir).catch(() => mkdir(dir, { recursive: true }));
}
async function getFilepathsInFolder$1(dir, recursive = false) {
  const pathsList = await readdir$1(dir);
  return flatten$2(
    await Promise.all(
      pathsList.sort().map(async (currentPath) => {
        const currentFile = path$5.resolve(dir, currentPath);
        const statFile = await stat(currentFile);
        if (statFile && statFile.isDirectory()) {
          if (recursive) {
            return await getFilepathsInFolder$1(currentFile, true);
          }
          return [];
        }
        return [currentFile];
      })
    )
  );
}
var fs_1 = {
  readdir: readdir$1,
  readFile: readFile$1,
  writeFile: writeFile$1,
  ensureDirectoryExists: ensureDirectoryExists$2,
  getFilepathsInFolder: getFilepathsInFolder$1
};
const template = template_1$1;
const { readFile, writeFile } = fs_1;
const jsSourceTemplate = (content, options) => template(content, {
  interpolate: /<%=([\s\S]+?)%>/g,
  ...options
});
const jsFileTemplate = async (filePath, options) => {
  const contentBuffer = await readFile(filePath);
  return jsSourceTemplate(contentBuffer.toString(), options);
};
const writeJsFileUsingTemplate$2 = async (targetFilePath, sourceFilePath, options, variables) => writeFile(
  targetFilePath,
  (await jsFileTemplate(sourceFilePath, options))(variables)
);
var template_1 = {
  writeJsFileUsingTemplate: writeJsFileUsingTemplate$2
};
var _arraySome;
var hasRequired_arraySome;
function require_arraySome() {
  if (hasRequired_arraySome) return _arraySome;
  hasRequired_arraySome = 1;
  function arraySome2(array, predicate) {
    var index = -1, length = array == null ? 0 : array.length;
    while (++index < length) {
      if (predicate(array[index], index, array)) {
        return true;
      }
    }
    return false;
  }
  _arraySome = arraySome2;
  return _arraySome;
}
var SetCache = _SetCache, arraySome = require_arraySome(), cacheHas = _cacheHas;
var COMPARE_PARTIAL_FLAG$5 = 1, COMPARE_UNORDERED_FLAG$3 = 2;
function equalArrays$2(array, other, bitmask, customizer, equalFunc, stack) {
  var isPartial = bitmask & COMPARE_PARTIAL_FLAG$5, arrLength = array.length, othLength = other.length;
  if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
    return false;
  }
  var arrStacked = stack.get(array);
  var othStacked = stack.get(other);
  if (arrStacked && othStacked) {
    return arrStacked == other && othStacked == array;
  }
  var index = -1, result = true, seen = bitmask & COMPARE_UNORDERED_FLAG$3 ? new SetCache() : void 0;
  stack.set(array, other);
  stack.set(other, array);
  while (++index < arrLength) {
    var arrValue = array[index], othValue = other[index];
    if (customizer) {
      var compared = isPartial ? customizer(othValue, arrValue, index, other, array, stack) : customizer(arrValue, othValue, index, array, other, stack);
    }
    if (compared !== void 0) {
      if (compared) {
        continue;
      }
      result = false;
      break;
    }
    if (seen) {
      if (!arraySome(other, function(othValue2, othIndex) {
        if (!cacheHas(seen, othIndex) && (arrValue === othValue2 || equalFunc(arrValue, othValue2, bitmask, customizer, stack))) {
          return seen.push(othIndex);
        }
      })) {
        result = false;
        break;
      }
    } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
      result = false;
      break;
    }
  }
  stack["delete"](array);
  stack["delete"](other);
  return result;
}
var _equalArrays = equalArrays$2;
function mapToArray$2(map2) {
  var index = -1, result = Array(map2.size);
  map2.forEach(function(value, key) {
    result[++index] = [key, value];
  });
  return result;
}
var _mapToArray = mapToArray$2;
function setToArray$2(set) {
  var index = -1, result = Array(set.size);
  set.forEach(function(value) {
    result[++index] = value;
  });
  return result;
}
var _setToArray = setToArray$2;
var Symbol$2 = _Symbol, Uint8Array = _Uint8Array, eq$1 = eq_1, equalArrays$1 = _equalArrays, mapToArray$1 = _mapToArray, setToArray$1 = _setToArray;
var COMPARE_PARTIAL_FLAG$4 = 1, COMPARE_UNORDERED_FLAG$2 = 2;
var boolTag = "[object Boolean]", dateTag = "[object Date]", errorTag = "[object Error]", mapTag$1 = "[object Map]", numberTag = "[object Number]", regexpTag = "[object RegExp]", setTag$1 = "[object Set]", stringTag$1 = "[object String]", symbolTag = "[object Symbol]";
var arrayBufferTag = "[object ArrayBuffer]", dataViewTag = "[object DataView]";
var symbolProto = Symbol$2 ? Symbol$2.prototype : void 0, symbolValueOf = symbolProto ? symbolProto.valueOf : void 0;
function equalByTag$1(object, other, tag, bitmask, customizer, equalFunc, stack) {
  switch (tag) {
    case dataViewTag:
      if (object.byteLength != other.byteLength || object.byteOffset != other.byteOffset) {
        return false;
      }
      object = object.buffer;
      other = other.buffer;
    case arrayBufferTag:
      if (object.byteLength != other.byteLength || !equalFunc(new Uint8Array(object), new Uint8Array(other))) {
        return false;
      }
      return true;
    case boolTag:
    case dateTag:
    case numberTag:
      return eq$1(+object, +other);
    case errorTag:
      return object.name == other.name && object.message == other.message;
    case regexpTag:
    case stringTag$1:
      return object == other + "";
    case mapTag$1:
      var convert = mapToArray$1;
    case setTag$1:
      var isPartial = bitmask & COMPARE_PARTIAL_FLAG$4;
      convert || (convert = setToArray$1);
      if (object.size != other.size && !isPartial) {
        return false;
      }
      var stacked = stack.get(object);
      if (stacked) {
        return stacked == other;
      }
      bitmask |= COMPARE_UNORDERED_FLAG$2;
      stack.set(object, other);
      var result = equalArrays$1(convert(object), convert(other), bitmask, customizer, equalFunc, stack);
      stack["delete"](object);
      return result;
    case symbolTag:
      if (symbolValueOf) {
        return symbolValueOf.call(object) == symbolValueOf.call(other);
      }
  }
  return false;
}
var _equalByTag = equalByTag$1;
var getAllKeys = _getAllKeys;
var COMPARE_PARTIAL_FLAG$3 = 1;
var objectProto$4 = Object.prototype;
var hasOwnProperty$4 = objectProto$4.hasOwnProperty;
function equalObjects$1(object, other, bitmask, customizer, equalFunc, stack) {
  var isPartial = bitmask & COMPARE_PARTIAL_FLAG$3, objProps = getAllKeys(object), objLength = objProps.length, othProps = getAllKeys(other), othLength = othProps.length;
  if (objLength != othLength && !isPartial) {
    return false;
  }
  var index = objLength;
  while (index--) {
    var key = objProps[index];
    if (!(isPartial ? key in other : hasOwnProperty$4.call(other, key))) {
      return false;
    }
  }
  var objStacked = stack.get(object);
  var othStacked = stack.get(other);
  if (objStacked && othStacked) {
    return objStacked == other && othStacked == object;
  }
  var result = true;
  stack.set(object, other);
  stack.set(other, object);
  var skipCtor = isPartial;
  while (++index < objLength) {
    key = objProps[index];
    var objValue = object[key], othValue = other[key];
    if (customizer) {
      var compared = isPartial ? customizer(othValue, objValue, key, other, object, stack) : customizer(objValue, othValue, key, object, other, stack);
    }
    if (!(compared === void 0 ? objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack) : compared)) {
      result = false;
      break;
    }
    skipCtor || (skipCtor = key == "constructor");
  }
  if (result && !skipCtor) {
    var objCtor = object.constructor, othCtor = other.constructor;
    if (objCtor != othCtor && ("constructor" in object && "constructor" in other) && !(typeof objCtor == "function" && objCtor instanceof objCtor && typeof othCtor == "function" && othCtor instanceof othCtor)) {
      result = false;
    }
  }
  stack["delete"](object);
  stack["delete"](other);
  return result;
}
var _equalObjects = equalObjects$1;
var Stack$2 = _Stack, equalArrays = _equalArrays, equalByTag = _equalByTag, equalObjects = _equalObjects, getTag$1 = _getTag, isArray$b = isArray_1, isBuffer$2 = isBufferExports, isTypedArray$3 = isTypedArray_1;
var COMPARE_PARTIAL_FLAG$2 = 1;
var argsTag = "[object Arguments]", arrayTag = "[object Array]", objectTag = "[object Object]";
var objectProto$3 = Object.prototype;
var hasOwnProperty$3 = objectProto$3.hasOwnProperty;
function baseIsEqualDeep$1(object, other, bitmask, customizer, equalFunc, stack) {
  var objIsArr = isArray$b(object), othIsArr = isArray$b(other), objTag = objIsArr ? arrayTag : getTag$1(object), othTag = othIsArr ? arrayTag : getTag$1(other);
  objTag = objTag == argsTag ? objectTag : objTag;
  othTag = othTag == argsTag ? objectTag : othTag;
  var objIsObj = objTag == objectTag, othIsObj = othTag == objectTag, isSameTag = objTag == othTag;
  if (isSameTag && isBuffer$2(object)) {
    if (!isBuffer$2(other)) {
      return false;
    }
    objIsArr = true;
    objIsObj = false;
  }
  if (isSameTag && !objIsObj) {
    stack || (stack = new Stack$2());
    return objIsArr || isTypedArray$3(object) ? equalArrays(object, other, bitmask, customizer, equalFunc, stack) : equalByTag(object, other, objTag, bitmask, customizer, equalFunc, stack);
  }
  if (!(bitmask & COMPARE_PARTIAL_FLAG$2)) {
    var objIsWrapped = objIsObj && hasOwnProperty$3.call(object, "__wrapped__"), othIsWrapped = othIsObj && hasOwnProperty$3.call(other, "__wrapped__");
    if (objIsWrapped || othIsWrapped) {
      var objUnwrapped = objIsWrapped ? object.value() : object, othUnwrapped = othIsWrapped ? other.value() : other;
      stack || (stack = new Stack$2());
      return equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack);
    }
  }
  if (!isSameTag) {
    return false;
  }
  stack || (stack = new Stack$2());
  return equalObjects(object, other, bitmask, customizer, equalFunc, stack);
}
var _baseIsEqualDeep = baseIsEqualDeep$1;
var baseIsEqualDeep = _baseIsEqualDeep, isObjectLike$1 = isObjectLike_1;
function baseIsEqual$2(value, other, bitmask, customizer, stack) {
  if (value === other) {
    return true;
  }
  if (value == null || other == null || !isObjectLike$1(value) && !isObjectLike$1(other)) {
    return value !== value && other !== other;
  }
  return baseIsEqualDeep(value, other, bitmask, customizer, baseIsEqual$2, stack);
}
var _baseIsEqual = baseIsEqual$2;
var Stack$1 = _Stack, baseIsEqual$1 = _baseIsEqual;
var COMPARE_PARTIAL_FLAG$1 = 1, COMPARE_UNORDERED_FLAG$1 = 2;
function baseIsMatch$1(object, source, matchData, customizer) {
  var index = matchData.length, length = index, noCustomizer = !customizer;
  if (object == null) {
    return !length;
  }
  object = Object(object);
  while (index--) {
    var data = matchData[index];
    if (noCustomizer && data[2] ? data[1] !== object[data[0]] : !(data[0] in object)) {
      return false;
    }
  }
  while (++index < length) {
    data = matchData[index];
    var key = data[0], objValue = object[key], srcValue = data[1];
    if (noCustomizer && data[2]) {
      if (objValue === void 0 && !(key in object)) {
        return false;
      }
    } else {
      var stack = new Stack$1();
      if (customizer) {
        var result = customizer(objValue, srcValue, key, object, source, stack);
      }
      if (!(result === void 0 ? baseIsEqual$1(srcValue, objValue, COMPARE_PARTIAL_FLAG$1 | COMPARE_UNORDERED_FLAG$1, customizer, stack) : result)) {
        return false;
      }
    }
  }
  return true;
}
var _baseIsMatch = baseIsMatch$1;
var isObject$b = isObject_1;
function isStrictComparable$2(value) {
  return value === value && !isObject$b(value);
}
var _isStrictComparable = isStrictComparable$2;
var isStrictComparable$1 = _isStrictComparable, keys$3 = keys_1;
function getMatchData$1(object) {
  var result = keys$3(object), length = result.length;
  while (length--) {
    var key = result[length], value = object[key];
    result[length] = [key, value, isStrictComparable$1(value)];
  }
  return result;
}
var _getMatchData = getMatchData$1;
function matchesStrictComparable$2(key, srcValue) {
  return function(object) {
    if (object == null) {
      return false;
    }
    return object[key] === srcValue && (srcValue !== void 0 || key in Object(object));
  };
}
var _matchesStrictComparable = matchesStrictComparable$2;
var baseIsMatch = _baseIsMatch, getMatchData = _getMatchData, matchesStrictComparable$1 = _matchesStrictComparable;
function baseMatches$1(source) {
  var matchData = getMatchData(source);
  if (matchData.length == 1 && matchData[0][2]) {
    return matchesStrictComparable$1(matchData[0][0], matchData[0][1]);
  }
  return function(object) {
    return object === source || baseIsMatch(object, source, matchData);
  };
}
var _baseMatches = baseMatches$1;
function baseHasIn$1(object, key) {
  return object != null && key in Object(object);
}
var _baseHasIn = baseHasIn$1;
var castPath$2 = _castPath, isArguments$1 = isArguments_1, isArray$a = isArray_1, isIndex$1 = _isIndex, isLength = isLength_1, toKey$3 = _toKey;
function hasPath$2(object, path2, hasFunc) {
  path2 = castPath$2(path2, object);
  var index = -1, length = path2.length, result = false;
  while (++index < length) {
    var key = toKey$3(path2[index]);
    if (!(result = object != null && hasFunc(object, key))) {
      break;
    }
    object = object[key];
  }
  if (result || ++index != length) {
    return result;
  }
  length = object == null ? 0 : object.length;
  return !!length && isLength(length) && isIndex$1(key, length) && (isArray$a(object) || isArguments$1(object));
}
var _hasPath = hasPath$2;
var baseHasIn = _baseHasIn, hasPath$1 = _hasPath;
function hasIn$1(object, path2) {
  return object != null && hasPath$1(object, path2, baseHasIn);
}
var hasIn_1 = hasIn$1;
var baseIsEqual = _baseIsEqual, get$1 = get_1, hasIn = hasIn_1, isKey$1 = _isKey, isStrictComparable = _isStrictComparable, matchesStrictComparable = _matchesStrictComparable, toKey$2 = _toKey;
var COMPARE_PARTIAL_FLAG = 1, COMPARE_UNORDERED_FLAG = 2;
function baseMatchesProperty$1(path2, srcValue) {
  if (isKey$1(path2) && isStrictComparable(srcValue)) {
    return matchesStrictComparable(toKey$2(path2), srcValue);
  }
  return function(object) {
    var objValue = get$1(object, path2);
    return objValue === void 0 && objValue === srcValue ? hasIn(object, path2) : baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG);
  };
}
var _baseMatchesProperty = baseMatchesProperty$1;
function baseProperty$1(key) {
  return function(object) {
    return object == null ? void 0 : object[key];
  };
}
var _baseProperty = baseProperty$1;
var baseGet$2 = _baseGet;
function basePropertyDeep$1(path2) {
  return function(object) {
    return baseGet$2(object, path2);
  };
}
var _basePropertyDeep = basePropertyDeep$1;
var baseProperty = _baseProperty, basePropertyDeep = _basePropertyDeep, isKey = _isKey, toKey$1 = _toKey;
function property$1(path2) {
  return isKey(path2) ? baseProperty(toKey$1(path2)) : basePropertyDeep(path2);
}
var property_1 = property$1;
var baseMatches = _baseMatches, baseMatchesProperty = _baseMatchesProperty, identity$2 = identity_1, isArray$9 = isArray_1, property = property_1;
function baseIteratee$8(value) {
  if (typeof value == "function") {
    return value;
  }
  if (value == null) {
    return identity$2;
  }
  if (typeof value == "object") {
    return isArray$9(value) ? baseMatchesProperty(value[0], value[1]) : baseMatches(value);
  }
  return property(value);
}
var _baseIteratee = baseIteratee$8;
function createBaseFor$1(fromRight) {
  return function(object, iteratee, keysFunc) {
    var index = -1, iterable = Object(object), props = keysFunc(object), length = props.length;
    while (length--) {
      var key = props[fromRight ? length : ++index];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object;
  };
}
var _createBaseFor = createBaseFor$1;
var createBaseFor = _createBaseFor;
var baseFor$2 = createBaseFor();
var _baseFor = baseFor$2;
var baseFor$1 = _baseFor, keys$2 = keys_1;
function baseForOwn$2(object, iteratee) {
  return object && baseFor$1(object, iteratee, keys$2);
}
var _baseForOwn = baseForOwn$2;
var isArrayLike$4 = isArrayLike_1;
function createBaseEach$1(eachFunc, fromRight) {
  return function(collection, iteratee) {
    if (collection == null) {
      return collection;
    }
    if (!isArrayLike$4(collection)) {
      return eachFunc(collection, iteratee);
    }
    var length = collection.length, index = fromRight ? length : -1, iterable = Object(collection);
    while (fromRight ? index-- : ++index < length) {
      if (iteratee(iterable[index], index, iterable) === false) {
        break;
      }
    }
    return collection;
  };
}
var _createBaseEach = createBaseEach$1;
var baseForOwn$1 = _baseForOwn, createBaseEach = _createBaseEach;
var baseEach$5 = createBaseEach(baseForOwn$1);
var _baseEach = baseEach$5;
var baseEach$4 = _baseEach, isArrayLike$3 = isArrayLike_1;
function baseMap$2(collection, iteratee) {
  var index = -1, result = isArrayLike$3(collection) ? Array(collection.length) : [];
  baseEach$4(collection, function(value, key, collection2) {
    result[++index] = iteratee(value, key, collection2);
  });
  return result;
}
var _baseMap = baseMap$2;
function baseSortBy$1(array, comparer) {
  var length = array.length;
  array.sort(comparer);
  while (length--) {
    array[length] = array[length].value;
  }
  return array;
}
var _baseSortBy = baseSortBy$1;
var isSymbol$1 = isSymbol_1;
function compareAscending$1(value, other) {
  if (value !== other) {
    var valIsDefined = value !== void 0, valIsNull = value === null, valIsReflexive = value === value, valIsSymbol = isSymbol$1(value);
    var othIsDefined = other !== void 0, othIsNull = other === null, othIsReflexive = other === other, othIsSymbol = isSymbol$1(other);
    if (!othIsNull && !othIsSymbol && !valIsSymbol && value > other || valIsSymbol && othIsDefined && othIsReflexive && !othIsNull && !othIsSymbol || valIsNull && othIsDefined && othIsReflexive || !valIsDefined && othIsReflexive || !valIsReflexive) {
      return 1;
    }
    if (!valIsNull && !valIsSymbol && !othIsSymbol && value < other || othIsSymbol && valIsDefined && valIsReflexive && !valIsNull && !valIsSymbol || othIsNull && valIsDefined && valIsReflexive || !othIsDefined && valIsReflexive || !othIsReflexive) {
      return -1;
    }
  }
  return 0;
}
var _compareAscending = compareAscending$1;
var compareAscending = _compareAscending;
function compareMultiple$1(object, other, orders) {
  var index = -1, objCriteria = object.criteria, othCriteria = other.criteria, length = objCriteria.length, ordersLength = orders.length;
  while (++index < length) {
    var result = compareAscending(objCriteria[index], othCriteria[index]);
    if (result) {
      if (index >= ordersLength) {
        return result;
      }
      var order = orders[index];
      return result * (order == "desc" ? -1 : 1);
    }
  }
  return object.index - other.index;
}
var _compareMultiple = compareMultiple$1;
var arrayMap$2 = _arrayMap, baseGet$1 = _baseGet, baseIteratee$7 = _baseIteratee, baseMap$1 = _baseMap, baseSortBy = _baseSortBy, baseUnary = _baseUnary, compareMultiple = _compareMultiple, identity$1 = identity_1, isArray$8 = isArray_1;
function baseOrderBy$1(collection, iteratees, orders) {
  if (iteratees.length) {
    iteratees = arrayMap$2(iteratees, function(iteratee) {
      if (isArray$8(iteratee)) {
        return function(value) {
          return baseGet$1(value, iteratee.length === 1 ? iteratee[0] : iteratee);
        };
      }
      return iteratee;
    });
  } else {
    iteratees = [identity$1];
  }
  var index = -1;
  iteratees = arrayMap$2(iteratees, baseUnary(baseIteratee$7));
  var result = baseMap$1(collection, function(value, key, collection2) {
    var criteria = arrayMap$2(iteratees, function(iteratee) {
      return iteratee(value);
    });
    return { "criteria": criteria, "index": ++index, "value": value };
  });
  return baseSortBy(result, function(object, other) {
    return compareMultiple(object, other, orders);
  });
}
var _baseOrderBy = baseOrderBy$1;
var baseFlatten = _baseFlatten, baseOrderBy = _baseOrderBy, baseRest = _baseRest, isIterateeCall$1 = _isIterateeCall;
var sortBy$1 = baseRest(function(collection, iteratees) {
  if (collection == null) {
    return [];
  }
  var length = iteratees.length;
  if (length > 1 && isIterateeCall$1(collection, iteratees[0], iteratees[1])) {
    iteratees = [];
  } else if (length > 2 && isIterateeCall$1(iteratees[0], iteratees[1], iteratees[2])) {
    iteratees = [iteratees[0]];
  }
  return baseOrderBy(collection, baseFlatten(iteratees, 1), []);
});
var sortBy_1 = sortBy$1;
function commonjsRequire(path2) {
  throw new Error('Could not dynamically require "' + path2 + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var getPackageType = { exports: {} };
var isNodeModules_1;
var hasRequiredIsNodeModules;
function requireIsNodeModules() {
  if (hasRequiredIsNodeModules) return isNodeModules_1;
  hasRequiredIsNodeModules = 1;
  const path2 = require$$0$3;
  function isNodeModules(directory) {
    let basename = path2.basename(directory);
    if (path2.sep === "\\") {
      basename = basename.toLowerCase();
    }
    return basename === "node_modules";
  }
  isNodeModules_1 = isNodeModules;
  return isNodeModules_1;
}
var cache;
var hasRequiredCache;
function requireCache() {
  if (hasRequiredCache) return cache;
  hasRequiredCache = 1;
  cache = /* @__PURE__ */ new Map();
  return cache;
}
var async;
var hasRequiredAsync;
function requireAsync() {
  if (hasRequiredAsync) return async;
  hasRequiredAsync = 1;
  const path2 = require$$0$3;
  const { promisify: promisify2 } = require$$3;
  const readFile2 = promisify2(require$$0$2.readFile);
  const isNodeModules = requireIsNodeModules();
  const resultsCache = requireCache();
  const promiseCache = /* @__PURE__ */ new Map();
  async function getDirectoryTypeActual(directory) {
    if (isNodeModules(directory)) {
      return "commonjs";
    }
    try {
      return JSON.parse(await readFile2(path2.resolve(directory, "package.json"))).type || "commonjs";
    } catch (_) {
    }
    const parent = path2.dirname(directory);
    if (parent === directory) {
      return "commonjs";
    }
    return getDirectoryType(parent);
  }
  async function getDirectoryType(directory) {
    if (resultsCache.has(directory)) {
      return resultsCache.get(directory);
    }
    if (promiseCache.has(directory)) {
      return promiseCache.get(directory);
    }
    const promise = getDirectoryTypeActual(directory);
    promiseCache.set(directory, promise);
    const result = await promise;
    resultsCache.set(directory, result);
    promiseCache.delete(directory);
    return result;
  }
  function getPackageType2(filename) {
    return getDirectoryType(path2.resolve(path2.dirname(filename)));
  }
  async = getPackageType2;
  return async;
}
var sync;
var hasRequiredSync;
function requireSync() {
  if (hasRequiredSync) return sync;
  hasRequiredSync = 1;
  const path2 = require$$0$3;
  const { readFileSync } = require$$0$2;
  const isNodeModules = requireIsNodeModules();
  const resultsCache = requireCache();
  function getDirectoryTypeActual(directory) {
    if (isNodeModules(directory)) {
      return "commonjs";
    }
    try {
      return JSON.parse(readFileSync(path2.resolve(directory, "package.json"))).type || "commonjs";
    } catch (_) {
    }
    const parent = path2.dirname(directory);
    if (parent === directory) {
      return "commonjs";
    }
    return getDirectoryType(parent);
  }
  function getDirectoryType(directory) {
    if (resultsCache.has(directory)) {
      return resultsCache.get(directory);
    }
    const result = getDirectoryTypeActual(directory);
    resultsCache.set(directory, result);
    return result;
  }
  function getPackageTypeSync(filename) {
    return getDirectoryType(path2.resolve(path2.dirname(filename)));
  }
  sync = getPackageTypeSync;
  return sync;
}
var hasRequiredGetPackageType;
function requireGetPackageType() {
  if (hasRequiredGetPackageType) return getPackageType.exports;
  hasRequiredGetPackageType = 1;
  const getPackageType$1 = requireAsync();
  const getPackageTypeSync = requireSync();
  getPackageType.exports = (filename) => getPackageType$1(filename);
  getPackageType.exports.sync = getPackageTypeSync;
  return getPackageType.exports;
}
var isModuleType;
var hasRequiredIsModuleType;
function requireIsModuleType() {
  if (hasRequiredIsModuleType) return isModuleType;
  hasRequiredIsModuleType = 1;
  const getPackageType2 = requireGetPackageType();
  isModuleType = async function isModuleType2(filepath) {
    return filepath.endsWith(".mjs") || !filepath.endsWith(".cjs") && await getPackageType2(filepath) === "module";
  };
  return isModuleType;
}
var importFile;
var hasRequiredImportFile;
function requireImportFile() {
  if (hasRequiredImportFile) return importFile;
  hasRequiredImportFile = 1;
  const isModuleType2 = requireIsModuleType();
  importFile = async function importFile2(filepath) {
    return await isModuleType2(filepath) ? import(require$$1.pathToFileURL(filepath)) : commonjsRequire(filepath);
  };
  return importFile;
}
const path$4 = require$$0$3;
const DEFAULT_LOAD_EXTENSIONS$2 = Object.freeze([
  ".co",
  ".coffee",
  ".eg",
  ".iced",
  ".js",
  ".cjs",
  ".litcoffee",
  ".ls",
  ".ts"
]);
let AbstractMigrationsLoader$2 = class AbstractMigrationsLoader {
  constructor(migrationDirectories, sortDirsSeparately, loadExtensions) {
    this.sortDirsSeparately = sortDirsSeparately;
    if (!Array.isArray(migrationDirectories)) {
      migrationDirectories = [migrationDirectories];
    }
    this.migrationsPaths = migrationDirectories;
    this.loadExtensions = loadExtensions || DEFAULT_LOAD_EXTENSIONS$2;
  }
  getFile(migrationsInfo) {
    const absoluteDir = path$4.resolve(process.cwd(), migrationsInfo.directory);
    const _path = path$4.join(absoluteDir, migrationsInfo.file);
    const importFile2 = requireImportFile();
    return importFile2(_path);
  }
};
var MigrationsLoader = {
  DEFAULT_LOAD_EXTENSIONS: DEFAULT_LOAD_EXTENSIONS$2,
  AbstractMigrationsLoader: AbstractMigrationsLoader$2
};
const path$3 = require$$0$3;
const sortBy = sortBy_1;
const { readdir } = fs_1;
const { AbstractMigrationsLoader: AbstractMigrationsLoader$1 } = MigrationsLoader;
let FsMigrations$1 = class FsMigrations extends AbstractMigrationsLoader$1 {
  /**
   * Gets the migration names
   * @returns Promise<string[]>
   */
  getMigrations(loadExtensions) {
    const readMigrationsPromises = this.migrationsPaths.map((configDir) => {
      const absoluteDir = path$3.resolve(process.cwd(), configDir);
      return readdir(absoluteDir).then((files) => ({
        files,
        configDir,
        absoluteDir
      }));
    });
    return Promise.all(readMigrationsPromises).then((allMigrations) => {
      const migrations = allMigrations.reduce((acc, migrationDirectory) => {
        if (this.sortDirsSeparately) {
          migrationDirectory.files = migrationDirectory.files.sort();
        }
        migrationDirectory.files.forEach(
          (file) => acc.push({ file, directory: migrationDirectory.configDir })
        );
        return acc;
      }, []);
      if (this.sortDirsSeparately) {
        return filterMigrations(
          this,
          migrations,
          loadExtensions || this.loadExtensions
        );
      }
      return filterMigrations(
        this,
        sortBy(migrations, "file"),
        loadExtensions || this.loadExtensions
      );
    });
  }
  getMigrationName(migration) {
    return migration.file;
  }
  getMigration(migrationInfo) {
    return this.getFile(migrationInfo);
  }
};
function filterMigrations(migrationSource, migrations, loadExtensions) {
  return migrations.filter((migration) => {
    const migrationName = migrationSource.getMigrationName(migration);
    const extension = path$3.extname(migrationName);
    return loadExtensions.includes(extension);
  });
}
var fsMigrations = {
  FsMigrations: FsMigrations$1
};
var colorette = {};
Object.defineProperty(colorette, "__esModule", { value: true });
var tty = require$$0$1;
function _interopNamespace$1(e) {
  if (e && e.__esModule) return e;
  var n = /* @__PURE__ */ Object.create(null);
  if (e) {
    Object.keys(e).forEach(function(k) {
      if (k !== "default") {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function() {
            return e[k];
          }
        });
      }
    });
  }
  n["default"] = e;
  return Object.freeze(n);
}
var tty__namespace = /* @__PURE__ */ _interopNamespace$1(tty);
const {
  env = {},
  argv = [],
  platform = ""
} = typeof process === "undefined" ? {} : process;
const isDisabled = "NO_COLOR" in env || argv.includes("--no-color");
const isForced = "FORCE_COLOR" in env || argv.includes("--color");
const isWindows$1 = platform === "win32";
const isDumbTerminal = env.TERM === "dumb";
const isCompatibleTerminal = tty__namespace && tty__namespace.isatty && tty__namespace.isatty(1) && env.TERM && !isDumbTerminal;
const isCI = "CI" in env && ("GITHUB_ACTIONS" in env || "GITLAB_CI" in env || "CIRCLECI" in env);
const isColorSupported = !isDisabled && (isForced || isWindows$1 && !isDumbTerminal || isCompatibleTerminal || isCI);
const replaceClose = (index, string2, close, replace, head2 = string2.substring(0, index) + replace, tail2 = string2.substring(index + close.length), next = tail2.indexOf(close)) => head2 + (next < 0 ? tail2 : replaceClose(next, tail2, close, replace));
const clearBleed = (index, string2, open, close, replace) => index < 0 ? open + string2 + close : open + replaceClose(index, string2, close, replace) + close;
const filterEmpty = (open, close, replace = open, at = open.length + 1) => (string2) => string2 || !(string2 === "" || string2 === void 0) ? clearBleed(
  ("" + string2).indexOf(close, at),
  string2,
  open,
  close,
  replace
) : "";
const init = (open, close, replace) => filterEmpty(`\x1B[${open}m`, `\x1B[${close}m`, replace);
const colors = {
  reset: init(0, 0),
  bold: init(1, 22, "\x1B[22m\x1B[1m"),
  dim: init(2, 22, "\x1B[22m\x1B[2m"),
  italic: init(3, 23),
  underline: init(4, 24),
  inverse: init(7, 27),
  hidden: init(8, 28),
  strikethrough: init(9, 29),
  black: init(30, 39),
  red: init(31, 39),
  green: init(32, 39),
  yellow: init(33, 39),
  blue: init(34, 39),
  magenta: init(35, 39),
  cyan: init(36, 39),
  white: init(37, 39),
  gray: init(90, 39),
  bgBlack: init(40, 49),
  bgRed: init(41, 49),
  bgGreen: init(42, 49),
  bgYellow: init(43, 49),
  bgBlue: init(44, 49),
  bgMagenta: init(45, 49),
  bgCyan: init(46, 49),
  bgWhite: init(47, 49),
  blackBright: init(90, 39),
  redBright: init(91, 39),
  greenBright: init(92, 39),
  yellowBright: init(93, 39),
  blueBright: init(94, 39),
  magentaBright: init(95, 39),
  cyanBright: init(96, 39),
  whiteBright: init(97, 39),
  bgBlackBright: init(100, 49),
  bgRedBright: init(101, 49),
  bgGreenBright: init(102, 49),
  bgYellowBright: init(103, 49),
  bgBlueBright: init(104, 49),
  bgMagentaBright: init(105, 49),
  bgCyanBright: init(106, 49),
  bgWhiteBright: init(107, 49)
};
const createColors = ({ useColor = isColorSupported } = {}) => useColor ? colors : Object.keys(colors).reduce(
  (colors2, key) => ({ ...colors2, [key]: String }),
  {}
);
const {
  reset,
  bold,
  dim,
  italic,
  underline,
  inverse,
  hidden,
  strikethrough,
  black,
  red,
  green,
  yellow,
  blue,
  magenta,
  cyan,
  white,
  gray,
  bgBlack,
  bgRed,
  bgGreen,
  bgYellow,
  bgBlue,
  bgMagenta,
  bgCyan,
  bgWhite,
  blackBright,
  redBright,
  greenBright,
  yellowBright,
  blueBright,
  magentaBright,
  cyanBright,
  whiteBright,
  bgBlackBright,
  bgRedBright,
  bgGreenBright,
  bgYellowBright,
  bgBlueBright,
  bgMagentaBright,
  bgCyanBright,
  bgWhiteBright
} = createColors();
colorette.bgBlack = bgBlack;
colorette.bgBlackBright = bgBlackBright;
colorette.bgBlue = bgBlue;
colorette.bgBlueBright = bgBlueBright;
colorette.bgCyan = bgCyan;
colorette.bgCyanBright = bgCyanBright;
colorette.bgGreen = bgGreen;
colorette.bgGreenBright = bgGreenBright;
colorette.bgMagenta = bgMagenta;
colorette.bgMagentaBright = bgMagentaBright;
colorette.bgRed = bgRed;
colorette.bgRedBright = bgRedBright;
colorette.bgWhite = bgWhite;
colorette.bgWhiteBright = bgWhiteBright;
colorette.bgYellow = bgYellow;
colorette.bgYellowBright = bgYellowBright;
colorette.black = black;
colorette.blackBright = blackBright;
colorette.blue = blue;
colorette.blueBright = blueBright;
colorette.bold = bold;
colorette.createColors = createColors;
colorette.cyan = cyan;
colorette.cyanBright = cyanBright;
colorette.dim = dim;
colorette.gray = gray;
colorette.green = green;
colorette.greenBright = greenBright;
colorette.hidden = hidden;
colorette.inverse = inverse;
colorette.isColorSupported = isColorSupported;
colorette.italic = italic;
colorette.magenta = magenta;
colorette.magentaBright = magentaBright;
colorette.red = red;
colorette.redBright = redBright;
colorette.reset = reset;
colorette.strikethrough = strikethrough;
colorette.underline = underline;
colorette.white = white;
colorette.whiteBright = whiteBright;
colorette.yellow = yellow;
colorette.yellowBright = yellowBright;
function isString$9(value) {
  return typeof value === "string";
}
function isNumber$3(value) {
  return typeof value === "number";
}
function isBoolean$2(value) {
  return typeof value === "boolean";
}
function isUndefined$1(value) {
  return typeof value === "undefined";
}
function isObject$a(value) {
  return typeof value === "object" && value !== null;
}
function isFunction$7(value) {
  return typeof value === "function";
}
var is = {
  isString: isString$9,
  isNumber: isNumber$3,
  isBoolean: isBoolean$2,
  isUndefined: isUndefined$1,
  isObject: isObject$a,
  isFunction: isFunction$7
};
const color = colorette;
const { inspect } = require$$3;
const { isString: isString$8, isFunction: isFunction$6 } = is;
let Logger$3 = class Logger {
  constructor(config = {}) {
    const {
      log: {
        debug: debug2,
        warn,
        error,
        deprecate,
        inspectionDepth,
        enableColors
      } = {}
    } = config;
    this._inspectionDepth = inspectionDepth || 5;
    this._enableColors = resolveIsEnabledColors(enableColors);
    this._debug = debug2;
    this._warn = warn;
    this._error = error;
    this._deprecate = deprecate;
  }
  _log(message, userFn, colorFn) {
    if (userFn != null && !isFunction$6(userFn)) {
      throw new TypeError("Extensions to knex logger must be functions!");
    }
    if (isFunction$6(userFn)) {
      userFn(message);
      return;
    }
    if (!isString$8(message)) {
      message = inspect(message, {
        depth: this._inspectionDepth,
        colors: this._enableColors
      });
    }
    console.log(colorFn ? colorFn(message) : message);
  }
  debug(message) {
    this._log(message, this._debug);
  }
  warn(message) {
    this._log(message, this._warn, color.yellow);
  }
  error(message) {
    this._log(message, this._error, color.red);
  }
  deprecate(method, alternative) {
    const message = `${method} is deprecated, please use ${alternative}`;
    this._log(message, this._deprecate, color.yellow);
  }
};
function resolveIsEnabledColors(enableColorsParam) {
  if (enableColorsParam != null) {
    return enableColorsParam;
  }
  if (process && process.stdout) {
    return process.stdout.isTTY;
  }
  return false;
}
var logger = Logger$3;
const { FsMigrations: FsMigrations2 } = fsMigrations;
const Logger$2 = logger;
const { DEFAULT_LOAD_EXTENSIONS: DEFAULT_LOAD_EXTENSIONS$1 } = MigrationsLoader;
const defaultLogger$1 = new Logger$2();
const CONFIG_DEFAULT$1 = Object.freeze({
  extension: "js",
  loadExtensions: DEFAULT_LOAD_EXTENSIONS$1,
  tableName: "knex_migrations",
  schemaName: null,
  directory: "./migrations",
  disableTransactions: false,
  disableMigrationsListValidation: false,
  sortDirsSeparately: false
});
function getMergedConfig$4(config, currentConfig, logger2 = defaultLogger$1) {
  const mergedConfig = Object.assign(
    {},
    CONFIG_DEFAULT$1,
    currentConfig || {},
    config
  );
  if (config && // If user specifies any FS related config,
  // clear specified migrationSource to avoid ambiguity
  (config.directory || config.sortDirsSeparately !== void 0 || config.loadExtensions)) {
    if (config.migrationSource) {
      logger2.warn(
        "FS-related option specified for migration configuration. This resets migrationSource to default FsMigrations"
      );
    }
    mergedConfig.migrationSource = null;
  }
  if (!mergedConfig.migrationSource) {
    mergedConfig.migrationSource = new FsMigrations2(
      mergedConfig.directory,
      mergedConfig.sortDirsSeparately,
      mergedConfig.loadExtensions
    );
  }
  return mergedConfig;
}
var migratorConfigurationMerger = {
  getMergedConfig: getMergedConfig$4
};
function yyyymmddhhmmss$2() {
  const now2 = /* @__PURE__ */ new Date();
  return now2.getUTCFullYear().toString() + (now2.getUTCMonth() + 1).toString().padStart(2, "0") + now2.getUTCDate().toString().padStart(2, "0") + now2.getUTCHours().toString().padStart(2, "0") + now2.getUTCMinutes().toString().padStart(2, "0") + now2.getUTCSeconds().toString().padStart(2, "0");
}
var timestamp = { yyyymmddhhmmss: yyyymmddhhmmss$2 };
const path$2 = require$$0$3;
const { writeJsFileUsingTemplate: writeJsFileUsingTemplate$1 } = template_1;
const { getMergedConfig: getMergedConfig$3 } = migratorConfigurationMerger;
const { ensureDirectoryExists: ensureDirectoryExists$1 } = fs_1;
const { yyyymmddhhmmss: yyyymmddhhmmss$1 } = timestamp;
let MigrationGenerator$1 = class MigrationGenerator {
  constructor(migrationConfig, logger2) {
    this.config = getMergedConfig$3(migrationConfig, void 0, logger2);
  }
  // Creates a new migration, with a given name.
  async make(name, config, logger2) {
    this.config = getMergedConfig$3(config, this.config, logger2);
    if (!name) {
      return Promise.reject(
        new Error("A name must be specified for the generated migration")
      );
    }
    await this._ensureFolder();
    const createdMigrationFilePath = await this._writeNewMigration(name);
    return createdMigrationFilePath;
  }
  // Ensures a folder for the migrations exist, dependent on the migration
  // config settings.
  _ensureFolder() {
    const dirs = this._absoluteConfigDirs();
    const promises2 = dirs.map(ensureDirectoryExists$1);
    return Promise.all(promises2);
  }
  _getStubPath() {
    return this.config.stub || path$2.join(__dirname, "stub", this.config.extension + ".stub");
  }
  _getNewMigrationName(name) {
    if (name[0] === "-") name = name.slice(1);
    return yyyymmddhhmmss$1() + "_" + name + "." + this.config.extension.split("-")[0];
  }
  _getNewMigrationPath(name) {
    const fileName = this._getNewMigrationName(name);
    const dirs = this._absoluteConfigDirs();
    const dir = dirs.slice(-1)[0];
    return path$2.join(dir, fileName);
  }
  // Write a new migration to disk, using the config and generated filename,
  // passing any `variables` given in the config to the template.
  async _writeNewMigration(name) {
    const migrationPath = this._getNewMigrationPath(name);
    await writeJsFileUsingTemplate$1(
      migrationPath,
      this._getStubPath(),
      { variable: "d" },
      this.config.variables || {}
    );
    return migrationPath;
  }
  _absoluteConfigDirs() {
    const directories = Array.isArray(this.config.directory) ? this.config.directory : [this.config.directory];
    return directories.map((directory) => {
      if (!directory) {
        console.warn(
          "Failed to resolve config file, knex cannot determine where to generate migrations"
        );
      }
      return path$2.resolve(process.cwd(), directory);
    });
  }
};
var MigrationGenerator_1 = MigrationGenerator$1;
const differenceWith = differenceWith_1;
const get = get_1;
const isEmpty$4 = isEmpty_1;
const max = max_1;
const {
  getLockTableName,
  getTable,
  getTableName
} = tableResolver;
const { getSchemaBuilder } = tableCreator;
const migrationListResolver = migrationListResolver$1;
const MigrationGenerator2 = MigrationGenerator_1;
const { getMergedConfig: getMergedConfig$2 } = migratorConfigurationMerger;
const { isBoolean: isBoolean$1, isFunction: isFunction$5 } = is;
class LockError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "MigrationLocked";
  }
}
let Migrator$1 = class Migrator {
  constructor(knex2) {
    if (isFunction$5(knex2)) {
      if (!knex2.isTransaction) {
        this.knex = knex2.withUserParams({
          ...knex2.userParams
        });
      } else {
        this.knex = knex2;
      }
    } else {
      this.knex = Object.assign({}, knex2);
      this.knex.userParams = this.knex.userParams || {};
    }
    this.config = getMergedConfig$2(
      this.knex.client.config.migrations,
      void 0,
      this.knex.client.logger
    );
    this.generator = new MigrationGenerator2(
      this.knex.client.config.migrations,
      this.knex.client.logger
    );
    this._activeMigration = {
      fileName: null
    };
  }
  // Migrators to the latest configuration.
  async latest(config) {
    this._disableProcessing();
    this.config = getMergedConfig$2(config, this.config, this.knex.client.logger);
    const allAndCompleted = await migrationListResolver.listAllAndCompleted(
      this.config,
      this.knex
    );
    if (!this.config.disableMigrationsListValidation) {
      validateMigrationList(this.config.migrationSource, allAndCompleted);
    }
    const [all, completed] = allAndCompleted;
    const migrations = getNewMigrations(
      this.config.migrationSource,
      all,
      completed
    );
    const transactionForAll = !this.config.disableTransactions && !(await Promise.all(
      migrations.map(async (migration) => {
        const migrationContents = await this.config.migrationSource.getMigration(migration);
        return !this._useTransaction(migrationContents);
      })
    )).some((isTransactionUsed) => isTransactionUsed);
    if (transactionForAll) {
      return this.knex.transaction((trx) => {
        return this._runBatch(migrations, "up", trx);
      });
    } else {
      return this._runBatch(migrations, "up");
    }
  }
  // Runs the next migration that has not yet been run
  async up(config) {
    this._disableProcessing();
    this.config = getMergedConfig$2(config, this.config, this.knex.client.logger);
    const allAndCompleted = await migrationListResolver.listAllAndCompleted(
      this.config,
      this.knex
    );
    if (!this.config.disableMigrationsListValidation) {
      validateMigrationList(this.config.migrationSource, allAndCompleted);
    }
    const [all, completed] = allAndCompleted;
    const newMigrations = getNewMigrations(
      this.config.migrationSource,
      all,
      completed
    );
    let migrationToRun;
    const name = this.config.name;
    if (name) {
      if (!completed.map((m) => m.name).includes(name)) {
        migrationToRun = newMigrations.find((migration) => {
          return this.config.migrationSource.getMigrationName(migration) === name;
        });
        if (!migrationToRun) {
          throw new Error(`Migration "${name}" not found.`);
        }
      }
    } else {
      migrationToRun = newMigrations[0];
    }
    const useTransaction = !migrationToRun || this._useTransaction(
      await this.config.migrationSource.getMigration(migrationToRun)
    );
    const migrationsToRun = [];
    if (migrationToRun) {
      migrationsToRun.push(migrationToRun);
    }
    const transactionForAll = !this.config.disableTransactions && (!migrationToRun || useTransaction);
    if (transactionForAll) {
      return await this.knex.transaction((trx) => {
        return this._runBatch(migrationsToRun, "up", trx);
      });
    } else {
      return await this._runBatch(migrationsToRun, "up");
    }
  }
  // Rollback the last "batch", or all, of migrations that were run.
  rollback(config, all = false) {
    this._disableProcessing();
    return new Promise((resolve, reject2) => {
      try {
        this.config = getMergedConfig$2(
          config,
          this.config,
          this.knex.client.logger
        );
      } catch (e) {
        reject2(e);
      }
      migrationListResolver.listAllAndCompleted(this.config, this.knex).then((value) => {
        if (!this.config.disableMigrationsListValidation) {
          validateMigrationList(this.config.migrationSource, value);
        }
        return value;
      }).then((val) => {
        const [allMigrations, completedMigrations] = val;
        return all ? allMigrations.filter((migration) => {
          return completedMigrations.map((migration2) => migration2.name).includes(
            this.config.migrationSource.getMigrationName(migration)
          );
        }).reverse() : this._getLastBatch(val);
      }).then((migrations) => {
        return this._runBatch(migrations, "down");
      }).then(resolve, reject2);
    });
  }
  down(config) {
    this._disableProcessing();
    this.config = getMergedConfig$2(config, this.config, this.knex.client.logger);
    return migrationListResolver.listAllAndCompleted(this.config, this.knex).then((value) => {
      if (!this.config.disableMigrationsListValidation) {
        validateMigrationList(this.config.migrationSource, value);
      }
      return value;
    }).then(([all, completed]) => {
      const completedMigrations = all.filter((migration) => {
        return completed.map((migration2) => migration2.name).includes(this.config.migrationSource.getMigrationName(migration));
      });
      let migrationToRun;
      const name = this.config.name;
      if (name) {
        migrationToRun = completedMigrations.find((migration) => {
          return this.config.migrationSource.getMigrationName(migration) === name;
        });
        if (!migrationToRun) {
          throw new Error(`Migration "${name}" was not run.`);
        }
      } else {
        migrationToRun = completedMigrations[completedMigrations.length - 1];
      }
      const migrationsToRun = [];
      if (migrationToRun) {
        migrationsToRun.push(migrationToRun);
      }
      return this._runBatch(migrationsToRun, "down");
    });
  }
  // Migrate up to a specific migration (inclusive).
  // Runs all pending migrations up to and including the specified one.
  async to(config) {
    this._disableProcessing();
    this.config = getMergedConfig$2(config, this.config, this.knex.client.logger);
    const name = this.config.name;
    if (!name) {
      throw new Error(
        "A migration name must be specified when using migrate.to()"
      );
    }
    const allAndCompleted = await migrationListResolver.listAllAndCompleted(
      this.config,
      this.knex
    );
    if (!this.config.disableMigrationsListValidation) {
      validateMigrationList(this.config.migrationSource, allAndCompleted);
    }
    const [all, completed] = allAndCompleted;
    const targetIndex = all.findIndex(
      (migration) => this.config.migrationSource.getMigrationName(migration) === name
    );
    if (targetIndex === -1) {
      throw new Error(`Migration "${name}" not found.`);
    }
    const completedNames = completed.map((m) => m.name);
    const migrationsToRun = all.slice(0, targetIndex + 1).filter((migration) => {
      return !completedNames.includes(
        this.config.migrationSource.getMigrationName(migration)
      );
    });
    const transactionForAll = !this.config.disableTransactions && !(await Promise.all(
      migrationsToRun.map(async (migration) => {
        const migrationContents = await this.config.migrationSource.getMigration(migration);
        return !this._useTransaction(migrationContents);
      })
    )).some((isTransactionUsed) => isTransactionUsed);
    if (transactionForAll) {
      return this.knex.transaction((trx) => {
        return this._runBatch(migrationsToRun, "up", trx);
      });
    } else {
      return this._runBatch(migrationsToRun, "up");
    }
  }
  // Migrate up to just before a specific migration (exclusive).
  // Runs all pending migrations before the specified one.
  async before(config) {
    this._disableProcessing();
    this.config = getMergedConfig$2(config, this.config, this.knex.client.logger);
    const name = this.config.name;
    if (!name) {
      throw new Error(
        "A migration name must be specified when using migrate.before()"
      );
    }
    const allAndCompleted = await migrationListResolver.listAllAndCompleted(
      this.config,
      this.knex
    );
    if (!this.config.disableMigrationsListValidation) {
      validateMigrationList(this.config.migrationSource, allAndCompleted);
    }
    const [all, completed] = allAndCompleted;
    const targetIndex = all.findIndex(
      (migration) => this.config.migrationSource.getMigrationName(migration) === name
    );
    if (targetIndex === -1) {
      throw new Error(`Migration "${name}" not found.`);
    }
    if (targetIndex === 0) {
      return [0, []];
    }
    const completedNames = completed.map((m) => m.name);
    const migrationsToRun = all.slice(0, targetIndex).filter((migration) => {
      return !completedNames.includes(
        this.config.migrationSource.getMigrationName(migration)
      );
    });
    const transactionForAll = !this.config.disableTransactions && !(await Promise.all(
      migrationsToRun.map(async (migration) => {
        const migrationContents = await this.config.migrationSource.getMigration(migration);
        return !this._useTransaction(migrationContents);
      })
    )).some((isTransactionUsed) => isTransactionUsed);
    if (transactionForAll) {
      return this.knex.transaction((trx) => {
        return this._runBatch(migrationsToRun, "up", trx);
      });
    } else {
      return this._runBatch(migrationsToRun, "up");
    }
  }
  status(config) {
    this._disableProcessing();
    this.config = getMergedConfig$2(config, this.config, this.knex.client.logger);
    return Promise.all([
      getTable(this.knex, this.config.tableName, this.config.schemaName).select(
        "*"
      ),
      migrationListResolver.listAll(this.config.migrationSource)
    ]).then(([db, code]) => db.length - code.length);
  }
  // Retrieves and returns the current migration version we're on, as a promise.
  // If no migrations have been run yet, return "none".
  currentVersion(config) {
    this._disableProcessing();
    this.config = getMergedConfig$2(config, this.config, this.knex.client.logger);
    return migrationListResolver.listCompleted(this.config.tableName, this.config.schemaName, this.knex).then((completed) => {
      const val = max(completed.map((value) => value.name.split("_")[0]));
      return val === void 0 ? "none" : val;
    });
  }
  // list all migrations
  async list(config) {
    this._disableProcessing();
    this.config = getMergedConfig$2(config, this.config, this.knex.client.logger);
    const [all, completed] = await migrationListResolver.listAllAndCompleted(
      this.config,
      this.knex
    );
    if (!this.config.disableMigrationsListValidation) {
      validateMigrationList(this.config.migrationSource, [all, completed]);
    }
    const newMigrations = getNewMigrations(
      this.config.migrationSource,
      all,
      completed
    );
    return [completed, newMigrations];
  }
  async forceFreeMigrationsLock(config) {
    this._disableProcessing();
    this.config = getMergedConfig$2(config, this.config, this.knex.client.logger);
    const { schemaName, tableName } = this.config;
    const lockTableName = getLockTableName(tableName);
    const { knex: knex2 } = this;
    const getLockTable = () => getTable(knex2, lockTableName, schemaName);
    const tableExists = await getSchemaBuilder(knex2, schemaName).hasTable(
      lockTableName
    );
    if (tableExists) {
      await getLockTable().del();
      await getLockTable().insert({
        is_locked: 0
      });
    }
  }
  // Creates a new migration, with a given name.
  make(name, config) {
    return this.generator.make(name, config, this.knex.client.logger);
  }
  _disableProcessing() {
    if (this.knex.disableProcessing) {
      this.knex.disableProcessing();
    }
  }
  _lockMigrations(trx) {
    const tableName = getLockTableName(this.config.tableName);
    return getTable(this.knex, tableName, this.config.schemaName).transacting(trx).where("is_locked", "=", 0).update({ is_locked: 1 }).then((rowCount) => {
      if (rowCount !== 1) {
        throw new Error("Migration table is already locked");
      }
    });
  }
  _getLock(trx) {
    const transact = trx ? (fn) => fn(trx) : (fn) => this.knex.transaction(fn);
    return transact((trx2) => {
      return this._lockMigrations(trx2);
    }).catch((err) => {
      throw new LockError(err.message);
    });
  }
  _freeLock(trx = this.knex) {
    const tableName = getLockTableName(this.config.tableName);
    return getTable(trx, tableName, this.config.schemaName).update({
      is_locked: 0
    });
  }
  // Run a batch of current migrations, in sequence.
  async _runBatch(migrations, direction2, trx) {
    const canGetLockInTransaction = this.knex.client.driverName !== "cockroachdb";
    try {
      await this._getLock(canGetLockInTransaction ? trx : void 0);
      const completed = trx ? await migrationListResolver.listCompleted(
        this.config.tableName,
        this.config.schemaName,
        trx
      ) : [];
      migrations = getNewMigrations(
        this.config.migrationSource,
        migrations,
        completed
      );
      await Promise.all(
        migrations.map(this._validateMigrationStructure.bind(this))
      );
      let batchNo = await this._latestBatchNumber(trx);
      const beforeAll = this.config.beforeAll || (() => {
      });
      const afterAll = this.config.afterAll || (() => {
      });
      let res = [batchNo, []];
      if (migrations.length > 0) {
        if (direction2 === "up") batchNo++;
        await beforeAll(trx || this.knex, migrations);
        res = await this._waterfallBatch(batchNo, migrations, direction2, trx);
        await afterAll(trx || this.knex, migrations);
      }
      await this._freeLock(canGetLockInTransaction ? trx : void 0);
      return res;
    } catch (error) {
      let cleanupReady = Promise.resolve();
      if (error instanceof LockError) {
        this.knex.client.logger.warn(
          `Can't take lock to run migrations: ${error.message}`
        );
        this.knex.client.logger.warn(
          "If you are sure migrations are not running you can release the lock manually by running 'knex migrate:unlock'"
        );
      } else {
        if (this._activeMigration.fileName) {
          this.knex.client.logger.warn(
            `migration file "${this._activeMigration.fileName}" failed`
          );
        }
        this.knex.client.logger.warn(
          `migration failed with error: ${error.message}`
        );
        cleanupReady = this._freeLock(
          canGetLockInTransaction ? trx : void 0
        );
      }
      try {
        await cleanupReady;
      } catch (e) {
      }
      throw error;
    }
  }
  // Validates some migrations by requiring and checking for an `up` and `down`
  // function.
  async _validateMigrationStructure(migration) {
    const migrationName = this.config.migrationSource.getMigrationName(migration);
    const migrationContent = await this.config.migrationSource.getMigration(
      migration
    );
    if (typeof migrationContent.up !== "function" || typeof migrationContent.down !== "function") {
      throw new Error(
        `Invalid migration: ${migrationName} must have both an up and down function`
      );
    }
    return migration;
  }
  // Get the last batch of migrations, by name, ordered by insert id in reverse
  // order.
  async _getLastBatch([allMigrations]) {
    const { tableName, schemaName } = this.config;
    const migrationNames = await getTable(this.knex, tableName, schemaName).where("batch", function(qb) {
      qb.max("batch").from(getTableName(tableName, schemaName));
    }).orderBy("id", "desc");
    const lastBatchMigrations = migrationNames.map((migration) => {
      return allMigrations.find((entry) => {
        return this.config.migrationSource.getMigrationName(entry) === migration.name;
      });
    });
    return Promise.all(lastBatchMigrations);
  }
  // Returns the latest batch number.
  _latestBatchNumber(trx = this.knex) {
    return trx.from(getTableName(this.config.tableName, this.config.schemaName)).max("batch as max_batch").then((obj) => obj[0].max_batch || 0);
  }
  // If transaction config for a single migration is defined, use that.
  // Otherwise, rely on the common config. This allows enabling/disabling
  // transaction for a single migration at will, regardless of the common
  // config.
  _useTransaction(migrationContent, allTransactionsDisabled) {
    const singleTransactionValue = get(migrationContent, "config.transaction");
    const useTransaction = isBoolean$1(singleTransactionValue) ? singleTransactionValue : !allTransactionsDisabled;
    return useTransaction;
  }
  // Runs a batch of `migrations` in a specified `direction`, saving the
  // appropriate database information as the migrations are run.
  _waterfallBatch(batchNo, migrations, direction2, trx) {
    const trxOrKnex = trx || this.knex;
    const { tableName, schemaName, disableTransactions } = this.config;
    let current = Promise.resolve();
    const log = [];
    migrations.forEach((migration) => {
      const name = this.config.migrationSource.getMigrationName(migration);
      this._activeMigration.fileName = name;
      const migrationContent = this.config.migrationSource.getMigration(migration);
      const beforeEach = this.config.beforeEach || (() => {
      });
      const afterEach = this.config.afterEach || (() => {
      });
      current = current.then(async () => await migrationContent).then(async (migrationContent2) => {
        this._activeMigration.fileName = name;
        if (!trx && this._useTransaction(migrationContent2, disableTransactions)) {
          this.knex.enableProcessing();
          return await this.knex.transaction(async (trx2) => {
            await beforeEach(trx2, [migration]);
            const migrationResult2 = await checkPromise(
              this.knex.client.logger,
              migrationContent2[direction2](trx2),
              name
            );
            await afterEach(trx2, [migration]);
            return migrationResult2;
          });
        }
        trxOrKnex.enableProcessing();
        await beforeEach(trxOrKnex, [migration]);
        const migrationResult = await checkPromise(
          this.knex.client.logger,
          migrationContent2[direction2](trxOrKnex),
          name
        );
        await afterEach(trxOrKnex, [migration]);
        return migrationResult;
      }).then(() => {
        trxOrKnex.disableProcessing();
        this.knex.disableProcessing();
        log.push(name);
        if (direction2 === "up") {
          return trxOrKnex.into(getTableName(tableName, schemaName)).insert({
            name,
            batch: batchNo,
            migration_time: /* @__PURE__ */ new Date()
          });
        }
        if (direction2 === "down") {
          return trxOrKnex.from(getTableName(tableName, schemaName)).where({ name }).del();
        }
      });
    });
    return current.then(() => [batchNo, log]);
  }
  _transaction(knex2, migrationContent, direction2, name) {
    return knex2.transaction((trx) => {
      return checkPromise(
        knex2.client.logger,
        migrationContent[direction2](trx),
        name
      );
    });
  }
};
function validateMigrationList(migrationSource, migrations) {
  const [all, completed] = migrations;
  const diff = getMissingMigrations(migrationSource, completed, all);
  if (!isEmpty$4(diff)) {
    const names = diff.map((d) => d.name);
    throw new Error(
      `The migration directory is corrupt, the following files are missing: ${names.join(
        ", "
      )}`
    );
  }
}
function getMissingMigrations(migrationSource, completed, all) {
  return differenceWith(completed, all, (c, a) => {
    return c.name === migrationSource.getMigrationName(a);
  });
}
function getNewMigrations(migrationSource, all, completed) {
  return differenceWith(all, completed, (a, c) => {
    return c.name === migrationSource.getMigrationName(a);
  });
}
function checkPromise(logger2, migrationPromise, name) {
  if (!migrationPromise || typeof migrationPromise.then !== "function") {
    logger2.warn(`migration ${name} did not return a promise`);
  }
  return migrationPromise;
}
var Migrator_1 = {
  Migrator: Migrator$1
};
var baseGetTag = _baseGetTag, isArray$7 = isArray_1, isObjectLike = isObjectLike_1;
var stringTag = "[object String]";
function isString$7(value) {
  return typeof value == "string" || !isArray$7(value) && isObjectLike(value) && baseGetTag(value) == stringTag;
}
var isString_1 = isString$7;
var reWhitespace = /\s/;
function trimmedEndIndex$1(string2) {
  var index = string2.length;
  while (index-- && reWhitespace.test(string2.charAt(index))) {
  }
  return index;
}
var _trimmedEndIndex = trimmedEndIndex$1;
var trimmedEndIndex = _trimmedEndIndex;
var reTrimStart = /^\s+/;
function baseTrim$1(string2) {
  return string2 ? string2.slice(0, trimmedEndIndex(string2) + 1).replace(reTrimStart, "") : string2;
}
var _baseTrim = baseTrim$1;
var baseTrim = _baseTrim, isObject$9 = isObject_1, isSymbol = isSymbol_1;
var NAN = 0 / 0;
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
var reIsBinary = /^0b[01]+$/i;
var reIsOctal = /^0o[0-7]+$/i;
var freeParseInt = parseInt;
function toNumber$3(value) {
  if (typeof value == "number") {
    return value;
  }
  if (isSymbol(value)) {
    return NAN;
  }
  if (isObject$9(value)) {
    var other = typeof value.valueOf == "function" ? value.valueOf() : value;
    value = isObject$9(other) ? other + "" : other;
  }
  if (typeof value != "string") {
    return value === 0 ? value : +value;
  }
  value = baseTrim(value);
  var isBinary = reIsBinary.test(value);
  return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
}
var toNumber_1 = toNumber$3;
var toNumber$2 = toNumber_1;
var INFINITY = 1 / 0, MAX_INTEGER = 17976931348623157e292;
function toFinite$1(value) {
  if (!value) {
    return value === 0 ? value : 0;
  }
  value = toNumber$2(value);
  if (value === INFINITY || value === -INFINITY) {
    var sign = value < 0 ? -1 : 1;
    return sign * MAX_INTEGER;
  }
  return value === value ? value : 0;
}
var toFinite_1 = toFinite$1;
var toFinite = toFinite_1;
function toInteger$3(value) {
  var result = toFinite(value), remainder = result % 1;
  return result === result ? remainder ? result - remainder : result : 0;
}
var toInteger_1 = toInteger$3;
var baseValues = _baseValues, keys$1 = keys_1;
function values$2(object) {
  return object == null ? [] : baseValues(object, keys$1(object));
}
var values_1 = values$2;
var baseIndexOf$1 = _baseIndexOf, isArrayLike$2 = isArrayLike_1, isString$6 = isString_1, toInteger$2 = toInteger_1, values$1 = values_1;
var nativeMax$2 = Math.max;
function includes$1(collection, value, fromIndex, guard) {
  collection = isArrayLike$2(collection) ? collection : values$1(collection);
  fromIndex = fromIndex && !guard ? toInteger$2(fromIndex) : 0;
  var length = collection.length;
  if (fromIndex < 0) {
    fromIndex = nativeMax$2(length + fromIndex, 0);
  }
  return isString$6(collection) ? fromIndex <= length && collection.indexOf(value, fromIndex) > -1 : !!length && baseIndexOf$1(collection, value, fromIndex) > -1;
}
var includes_1 = includes$1;
const path$1 = require$$0$3;
const flatten$1 = flatten_1;
const includes = includes_1;
const { AbstractMigrationsLoader: AbstractMigrationsLoader2 } = MigrationsLoader;
const { getFilepathsInFolder } = fs_1;
const filterByLoadExtensions = (extensions) => (value) => {
  const extension = path$1.extname(value);
  return includes(extensions, extension);
};
let FsSeeds$1 = class FsSeeds extends AbstractMigrationsLoader2 {
  _getConfigDirectories(logger2) {
    const directories = this.migrationsPaths;
    return directories.map((directory) => {
      if (!directory) {
        logger2.warn(
          "Empty value passed as a directory for Seeder, this is not supported."
        );
      }
      return path$1.resolve(process.cwd(), directory);
    });
  }
  async getSeeds(config) {
    const { loadExtensions, recursive, specific } = config;
    const seeds = flatten$1(
      await Promise.all(
        this._getConfigDirectories(config.logger).map(
          (d) => getFilepathsInFolder(d, recursive)
        )
      )
    );
    let files = seeds.filter(filterByLoadExtensions(loadExtensions));
    if (!this.sortDirsSeparately) {
      files.sort();
    }
    if (specific) {
      files = files.filter((file) => path$1.basename(file) === specific);
      if (files.length === 0) {
        throw new Error(
          `Invalid argument provided: the specific seed "${specific}" does not exist.`
        );
      }
    }
    return files;
  }
  async getSeed(filepath) {
    const importFile2 = requireImportFile();
    const seed2 = await importFile2(filepath);
    return seed2;
  }
};
var fsSeeds = {
  FsSeeds: FsSeeds$1
};
const { FsSeeds: FsSeeds2 } = fsSeeds;
const Logger$1 = logger;
const { DEFAULT_LOAD_EXTENSIONS } = MigrationsLoader;
const defaultLogger = new Logger$1();
const CONFIG_DEFAULT = Object.freeze({
  extension: "js",
  directory: "./seeds",
  loadExtensions: DEFAULT_LOAD_EXTENSIONS,
  specific: null,
  timestampFilenamePrefix: false,
  recursive: false,
  sortDirsSeparately: false
});
function getMergedConfig$1(config, currentConfig, logger2 = defaultLogger) {
  const mergedConfig = Object.assign(
    {},
    CONFIG_DEFAULT,
    currentConfig || {},
    config,
    {
      logger: logger2
    }
  );
  if (config && // If user specifies any FS related config,
  // clear specified migrationSource to avoid ambiguity
  (config.directory || config.sortDirsSeparately !== void 0 || config.loadExtensions)) {
    if (config.seedSource) {
      logger2.warn(
        "FS-related option specified for seed configuration. This resets seedSource to default FsMigrations"
      );
    }
    mergedConfig.seedSource = null;
  }
  if (!mergedConfig.seedSource) {
    mergedConfig.seedSource = new FsSeeds2(
      mergedConfig.directory,
      mergedConfig.sortDirsSeparately,
      mergedConfig.loadExtensions
    );
  }
  return mergedConfig;
}
var seederConfigurationMerger = {
  getMergedConfig: getMergedConfig$1
};
const path = require$$0$3;
const { ensureDirectoryExists } = fs_1;
const { writeJsFileUsingTemplate } = template_1;
const { yyyymmddhhmmss } = timestamp;
const { getMergedConfig } = seederConfigurationMerger;
let Seeder$1 = class Seeder {
  constructor(knex2) {
    this.knex = knex2;
    this.config = this.resolveConfig(knex2.client.config.seeds);
  }
  // Runs seed files for the given environment.
  async run(config) {
    this.config = this.resolveConfig(config);
    const files = await this.config.seedSource.getSeeds(this.config);
    return this._runSeeds(files);
  }
  // Creates a new seed file, with a given name.
  async make(name, config) {
    this.config = this.resolveConfig(config);
    if (!name)
      throw new Error("A name must be specified for the generated seed");
    await this._ensureFolder(config);
    const seedPath = await this._writeNewSeed(name);
    return seedPath;
  }
  // Ensures a folder for the seeds exist, dependent on the
  // seed config settings.
  _ensureFolder() {
    const dirs = this.config.seedSource._getConfigDirectories(
      this.config.logger
    );
    const promises2 = dirs.map(ensureDirectoryExists);
    return Promise.all(promises2);
  }
  // Run seed files, in sequence.
  async _runSeeds(seeds) {
    for (const seed2 of seeds) {
      await this._validateSeedStructure(seed2);
    }
    return this._waterfallBatch(seeds);
  }
  async _validateSeedStructure(filepath) {
    const seed2 = await this.config.seedSource.getSeed(filepath);
    if (typeof seed2.seed !== "function") {
      throw new Error(
        `Invalid seed file: ${filepath} must have a seed function`
      );
    }
    return filepath;
  }
  _getStubPath() {
    return this.config.stub || path.join(__dirname, "stub", this.config.extension + ".stub");
  }
  _getNewStubFileName(name) {
    if (name[0] === "-") name = name.slice(1);
    if (this.config.timestampFilenamePrefix === true) {
      name = `${yyyymmddhhmmss()}_${name}`;
    }
    return `${name}.${this.config.extension}`;
  }
  _getNewStubFilePath(name) {
    const fileName = this._getNewStubFileName(name);
    const dirs = this.config.seedSource._getConfigDirectories(
      this.config.logger
    );
    const dir = dirs.slice(-1)[0];
    return path.join(dir, fileName);
  }
  // Write a new seed to disk, using the config and generated filename,
  // passing any `variables` given in the config to the template.
  async _writeNewSeed(name) {
    const seedPath = this._getNewStubFilePath(name);
    await writeJsFileUsingTemplate(
      seedPath,
      this._getStubPath(),
      { variable: "d" },
      this.config.variables || {}
    );
    return seedPath;
  }
  async _listAll(config) {
    this.config = this.resolveConfig(config);
    return this.config.seedSource.getSeeds(this.config);
  }
  // Runs a batch of seed files.
  async _waterfallBatch(seeds) {
    const { knex: knex2 } = this;
    const log = [];
    for (const seedPath of seeds) {
      const seed2 = await this.config.seedSource.getSeed(seedPath);
      try {
        await seed2.seed(knex2);
        log.push(seedPath);
      } catch (originalError) {
        const error = new Error(
          `Error while executing "${seedPath}" seed: ${originalError.message}`
        );
        error.original = originalError;
        error.stack = error.stack.split("\n").slice(0, 2).join("\n") + "\n" + originalError.stack;
        throw error;
      }
    }
    return [log];
  }
  resolveConfig(config) {
    return getMergedConfig(config, this.config, this.knex.client.logger);
  }
};
var Seeder_1 = Seeder$1;
let FunctionHelper$1 = class FunctionHelper {
  constructor(client2) {
    this.client = client2;
  }
  now(precision) {
    if (typeof precision === "number") {
      return this.client.raw(`CURRENT_TIMESTAMP(${precision})`);
    }
    return this.client.raw("CURRENT_TIMESTAMP");
  }
  uuid() {
    switch (this.client.driverName) {
      case "sqlite3":
      case "better-sqlite3":
        return this.client.raw(
          "(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"
        );
      case "mssql":
        return this.client.raw("(NEWID())");
      case "pg":
      case "pgnative":
      case "cockroachdb":
        return this.client.raw("(gen_random_uuid())");
      case "oracle":
      case "oracledb":
        return this.client.raw("(random_uuid())");
      case "mysql":
      case "mysql2":
      case "mariadb":
        return this.client.raw("(UUID())");
      default:
        throw new Error(
          `${this.client.driverName} does not have a uuid function`
        );
    }
  }
  uuidToBin(uuid, ordered = true) {
    const buf = Buffer.from(uuid.replace(/-/g, ""), "hex");
    return ordered ? Buffer.concat([
      buf.slice(6, 8),
      buf.slice(4, 6),
      buf.slice(0, 4),
      buf.slice(8, 16)
    ]) : Buffer.concat([
      buf.slice(0, 4),
      buf.slice(4, 6),
      buf.slice(6, 8),
      buf.slice(8, 16)
    ]);
  }
  binToUuid(bin, ordered = true) {
    const buf = Buffer.from(bin, "hex");
    return ordered ? [
      buf.toString("hex", 4, 8),
      buf.toString("hex", 2, 4),
      buf.toString("hex", 0, 2),
      buf.toString("hex", 8, 10),
      buf.toString("hex", 10, 16)
    ].join("-") : [
      buf.toString("hex", 0, 4),
      buf.toString("hex", 4, 6),
      buf.toString("hex", 6, 8),
      buf.toString("hex", 8, 10),
      buf.toString("hex", 10, 16)
    ].join("-");
  }
};
var FunctionHelper_1 = FunctionHelper$1;
var methodConstants = [
  "with",
  "withRecursive",
  "withMaterialized",
  "withNotMaterialized",
  "select",
  "as",
  "columns",
  "column",
  "from",
  "fromJS",
  "fromRaw",
  "into",
  "withSchema",
  "table",
  "distinct",
  "join",
  "joinRaw",
  "innerJoin",
  "leftJoin",
  "leftOuterJoin",
  "rightJoin",
  "rightOuterJoin",
  "outerJoin",
  "fullOuterJoin",
  "crossJoin",
  "where",
  "andWhere",
  "orWhere",
  "whereNot",
  "orWhereNot",
  "whereLike",
  "andWhereLike",
  "orWhereLike",
  "whereILike",
  "andWhereILike",
  "orWhereILike",
  "whereRaw",
  "whereWrapped",
  "havingWrapped",
  "orWhereRaw",
  "whereExists",
  "orWhereExists",
  "whereNotExists",
  "orWhereNotExists",
  "whereIn",
  "orWhereIn",
  "whereNotIn",
  "orWhereNotIn",
  "whereNull",
  "orWhereNull",
  "whereNotNull",
  "orWhereNotNull",
  "whereBetween",
  "whereNotBetween",
  "andWhereBetween",
  "andWhereNotBetween",
  "orWhereBetween",
  "orWhereNotBetween",
  "groupBy",
  "groupByRaw",
  "orderBy",
  "orderByRaw",
  "union",
  "unionAll",
  "intersect",
  "except",
  "having",
  "havingRaw",
  "orHaving",
  "orHavingRaw",
  "offset",
  "limit",
  "count",
  "countDistinct",
  "min",
  "max",
  "sum",
  "sumDistinct",
  "avg",
  "avgDistinct",
  "increment",
  "decrement",
  "first",
  "debug",
  "pluck",
  "clearSelect",
  "clearWhere",
  "clearGroup",
  "clearOrder",
  "clearHaving",
  "insert",
  "update",
  "returning",
  "del",
  "delete",
  "truncate",
  "transacting",
  "connection",
  // JSON methods
  // Json manipulation functions
  "jsonExtract",
  "jsonSet",
  "jsonInsert",
  "jsonRemove",
  // Wheres Json
  "whereJsonObject",
  "orWhereJsonObject",
  "andWhereJsonObject",
  "whereNotJsonObject",
  "orWhereNotJsonObject",
  "andWhereNotJsonObject",
  "whereJsonPath",
  "orWhereJsonPath",
  "andWhereJsonPath",
  "whereJsonSupersetOf",
  "orWhereJsonSupersetOf",
  "andWhereJsonSupersetOf",
  "whereJsonNotSupersetOf",
  "orWhereJsonNotSupersetOf",
  "andWhereJsonNotSupersetOf",
  "whereJsonSubsetOf",
  "orWhereJsonSubsetOf",
  "andWhereJsonSubsetOf",
  "whereJsonNotSubsetOf",
  "orWhereJsonNotSubsetOf",
  "andWhereJsonNotSubsetOf"
];
var baseAssignValue$1 = _baseAssignValue, eq = eq_1;
function assignMergeValue$2(object, key, value) {
  if (value !== void 0 && !eq(object[key], value) || value === void 0 && !(key in object)) {
    baseAssignValue$1(object, key, value);
  }
}
var _assignMergeValue = assignMergeValue$2;
function safeGet$2(object, key) {
  if (key === "constructor" && typeof object[key] === "function") {
    return;
  }
  if (key == "__proto__") {
    return;
  }
  return object[key];
}
var _safeGet = safeGet$2;
var copyObject$2 = _copyObject, keysIn$2 = keysIn_1;
function toPlainObject$1(value) {
  return copyObject$2(value, keysIn$2(value));
}
var toPlainObject_1 = toPlainObject$1;
var assignMergeValue$1 = _assignMergeValue, cloneBuffer = _cloneBufferExports, cloneTypedArray = _cloneTypedArray, copyArray$1 = _copyArray, initCloneObject = _initCloneObject, isArguments = isArguments_1, isArray$6 = isArray_1, isArrayLikeObject = isArrayLikeObject_1, isBuffer$1 = isBufferExports, isFunction$4 = isFunction_1, isObject$8 = isObject_1, isPlainObject$4 = isPlainObject_1, isTypedArray$2 = isTypedArray_1, safeGet$1 = _safeGet, toPlainObject = toPlainObject_1;
function baseMergeDeep$1(object, source, key, srcIndex, mergeFunc, customizer, stack) {
  var objValue = safeGet$1(object, key), srcValue = safeGet$1(source, key), stacked = stack.get(srcValue);
  if (stacked) {
    assignMergeValue$1(object, key, stacked);
    return;
  }
  var newValue = customizer ? customizer(objValue, srcValue, key + "", object, source, stack) : void 0;
  var isCommon = newValue === void 0;
  if (isCommon) {
    var isArr = isArray$6(srcValue), isBuff = !isArr && isBuffer$1(srcValue), isTyped = !isArr && !isBuff && isTypedArray$2(srcValue);
    newValue = srcValue;
    if (isArr || isBuff || isTyped) {
      if (isArray$6(objValue)) {
        newValue = objValue;
      } else if (isArrayLikeObject(objValue)) {
        newValue = copyArray$1(objValue);
      } else if (isBuff) {
        isCommon = false;
        newValue = cloneBuffer(srcValue, true);
      } else if (isTyped) {
        isCommon = false;
        newValue = cloneTypedArray(srcValue, true);
      } else {
        newValue = [];
      }
    } else if (isPlainObject$4(srcValue) || isArguments(srcValue)) {
      newValue = objValue;
      if (isArguments(objValue)) {
        newValue = toPlainObject(objValue);
      } else if (!isObject$8(objValue) || isFunction$4(objValue)) {
        newValue = initCloneObject(srcValue);
      }
    } else {
      isCommon = false;
    }
  }
  if (isCommon) {
    stack.set(srcValue, newValue);
    mergeFunc(newValue, srcValue, srcIndex, customizer, stack);
    stack["delete"](srcValue);
  }
  assignMergeValue$1(object, key, newValue);
}
var _baseMergeDeep = baseMergeDeep$1;
var Stack = _Stack, assignMergeValue = _assignMergeValue, baseFor = _baseFor, baseMergeDeep = _baseMergeDeep, isObject$7 = isObject_1, keysIn$1 = keysIn_1, safeGet = _safeGet;
function baseMerge$1(object, source, srcIndex, customizer, stack) {
  if (object === source) {
    return;
  }
  baseFor(source, function(srcValue, key) {
    stack || (stack = new Stack());
    if (isObject$7(srcValue)) {
      baseMergeDeep(object, source, key, srcIndex, baseMerge$1, customizer, stack);
    } else {
      var newValue = customizer ? customizer(safeGet(object, key), srcValue, key + "", object, source, stack) : void 0;
      if (newValue === void 0) {
        newValue = srcValue;
      }
      assignMergeValue(object, key, newValue);
    }
  }, keysIn$1);
}
var _baseMerge = baseMerge$1;
var baseMerge = _baseMerge, createAssigner$2 = _createAssigner;
var merge$1 = createAssigner$2(function(object, source, srcIndex) {
  baseMerge(object, source, srcIndex);
});
var merge_1 = merge$1;
function baseSlice$2(array, start, end) {
  var index = -1, length = array.length;
  if (start < 0) {
    start = -start > length ? 0 : length + start;
  }
  end = end > length ? length : end;
  if (end < 0) {
    end += length;
  }
  length = start > end ? 0 : end - start >>> 0;
  start >>>= 0;
  var result = Array(length);
  while (++index < length) {
    result[index] = array[index + start];
  }
  return result;
}
var _baseSlice = baseSlice$2;
var baseSlice$1 = _baseSlice, isIterateeCall = _isIterateeCall, toInteger$1 = toInteger_1;
var nativeCeil = Math.ceil, nativeMax$1 = Math.max;
function chunk$1(array, size, guard) {
  if (guard ? isIterateeCall(array, size, guard) : size === void 0) {
    size = 1;
  } else {
    size = nativeMax$1(toInteger$1(size), 0);
  }
  var length = array == null ? 0 : array.length;
  if (!length || size < 1) {
    return [];
  }
  var index = 0, resIndex = 0, result = Array(nativeCeil(length / size));
  while (index < length) {
    result[resIndex++] = baseSlice$1(array, index, index += size);
  }
  return result;
}
var chunk_1 = chunk$1;
var delay$1 = (delay2) => new Promise((resolve) => setTimeout(resolve, delay2));
const chunk = chunk_1;
const flatten = flatten_1;
const delay = delay$1;
const { isNumber: isNumber$2 } = is;
function batchInsert$1(client2, tableName, batch, chunkSize = 1e3) {
  let returning = void 0;
  let transaction2 = null;
  if (!isNumber$2(chunkSize) || chunkSize < 1) {
    throw new TypeError(`Invalid chunkSize: ${chunkSize}`);
  }
  if (!Array.isArray(batch)) {
    throw new TypeError(`Invalid batch: Expected array, got ${typeof batch}`);
  }
  const chunks = chunk(batch, chunkSize);
  const runInTransaction = (cb) => {
    if (transaction2) {
      return cb(transaction2);
    }
    return client2.transaction(cb);
  };
  return Object.assign(
    Promise.resolve().then(async () => {
      await delay(1);
      return runInTransaction(async (tr) => {
        const chunksResults = [];
        for (const items of chunks) {
          chunksResults.push(await tr(tableName).insert(items, returning));
        }
        return flatten(chunksResults);
      });
    }),
    {
      returning(columns) {
        returning = columns;
        return this;
      },
      transacting(tr) {
        transaction2 = tr;
        return this;
      }
    }
  );
}
var batchInsert_1 = batchInsert$1;
function setHiddenProperty$2(target, source, propertyName = "password") {
  if (!source) {
    source = target;
  }
  Object.defineProperty(target, propertyName, {
    enumerable: false,
    value: source[propertyName]
  });
}
const hasOwn$1 = /* @__PURE__ */ (() => {
  const hasOwnProperty2 = Object.prototype.hasOwnProperty;
  return (obj, key) => hasOwnProperty2.call(obj, key);
})();
var security = {
  setHiddenProperty: setHiddenProperty$2,
  hasOwn: hasOwn$1
};
const { EventEmitter: EventEmitter$5 } = require$$0;
const { Migrator: Migrator2 } = Migrator_1;
const Seeder2 = Seeder_1;
const FunctionHelper2 = FunctionHelper_1;
const QueryInterface$1 = methodConstants;
const merge = merge_1;
const batchInsert = batchInsert_1;
const { isObject: isObject$6 } = is;
const { setHiddenProperty: setHiddenProperty$1 } = security;
const KNEX_PROPERTY_DEFINITIONS = {
  client: {
    get() {
      return this.context.client;
    },
    set(client2) {
      this.context.client = client2;
    },
    configurable: true
  },
  userParams: {
    get() {
      return this.context.userParams;
    },
    set(userParams) {
      this.context.userParams = userParams;
    },
    configurable: true
  },
  schema: {
    get() {
      return this.client.schemaBuilder();
    },
    configurable: true
  },
  migrate: {
    get() {
      return new Migrator2(this);
    },
    configurable: true
  },
  seed: {
    get() {
      return new Seeder2(this);
    },
    configurable: true
  },
  fn: {
    get() {
      return new FunctionHelper2(this.client);
    },
    configurable: true
  }
};
const CONTEXT_METHODS = [
  "raw",
  "batchInsert",
  "transaction",
  "transactionProvider",
  "initialize",
  "destroy",
  "ref",
  "withUserParams",
  "queryBuilder",
  "disableProcessing",
  "enableProcessing"
];
for (const m of CONTEXT_METHODS) {
  KNEX_PROPERTY_DEFINITIONS[m] = {
    value: function(...args) {
      return this.context[m](...args);
    },
    configurable: true
  };
}
function makeKnex$2(client2) {
  function knex2(tableName, options) {
    return createQueryBuilder(knex2.context, tableName, options);
  }
  redefineProperties(knex2, client2);
  return knex2;
}
function initContext(knexFn) {
  const knexContext = knexFn.context || {};
  Object.assign(knexContext, {
    queryBuilder() {
      return this.client.queryBuilder();
    },
    raw() {
      return this.client.raw.apply(this.client, arguments);
    },
    batchInsert(table, batch, chunkSize = 1e3) {
      return batchInsert(this, table, batch, chunkSize);
    },
    // Creates a new transaction.
    // If container is provided, returns a promise for when the transaction is resolved.
    // If container is not provided, returns a promise with a transaction that is resolved
    // when transaction is ready to be used.
    transaction(container, _config) {
      if (!_config && isObject$6(container)) {
        _config = container;
        container = null;
      }
      const config = Object.assign({}, _config);
      config.userParams = this.userParams || {};
      if (config.doNotRejectOnRollback === void 0) {
        config.doNotRejectOnRollback = true;
      }
      return this._transaction(container, config);
    },
    // Internal method that actually establishes the Transaction.  It makes no assumptions
    // about the `config` or `outerTx`, and expects the caller to handle these details.
    _transaction(container, config, outerTx = null) {
      if (container) {
        const trx = this.client.transaction(container, config, outerTx);
        return trx;
      } else {
        return new Promise((resolve, reject2) => {
          this.client.transaction(resolve, config, outerTx).catch(reject2);
        });
      }
    },
    transactionProvider(config) {
      let trx;
      return () => {
        if (!trx) {
          trx = this.transaction(void 0, config);
        }
        return trx;
      };
    },
    // Typically never needed, initializes the pool for a knex client.
    initialize(config) {
      return this.client.initializePool(config);
    },
    // Convenience method for tearing down the pool.
    destroy(callback) {
      return this.client.destroy(callback);
    },
    ref(ref2) {
      return this.client.ref(ref2);
    },
    // Do not document this as public API until naming and API is improved for general consumption
    // This method exists to disable processing of internal queries in migrations
    disableProcessing() {
      if (this.userParams.isProcessingDisabled) {
        return;
      }
      this.userParams.wrapIdentifier = this.client.config.wrapIdentifier;
      this.userParams.postProcessResponse = this.client.config.postProcessResponse;
      this.client.config.wrapIdentifier = null;
      this.client.config.postProcessResponse = null;
      this.userParams.isProcessingDisabled = true;
    },
    // Do not document this as public API until naming and API is improved for general consumption
    // This method exists to enable execution of non-internal queries with consistent identifier naming in migrations
    enableProcessing() {
      if (!this.userParams.isProcessingDisabled) {
        return;
      }
      this.client.config.wrapIdentifier = this.userParams.wrapIdentifier;
      this.client.config.postProcessResponse = this.userParams.postProcessResponse;
      this.userParams.isProcessingDisabled = false;
    },
    withUserParams(params) {
      const knexClone = shallowCloneFunction(knexFn);
      if (this.client) {
        knexClone.client = Object.create(this.client.constructor.prototype);
        merge(knexClone.client, this.client);
        knexClone.client.config = Object.assign({}, this.client.config);
        if (this.client.config.password) {
          setHiddenProperty$1(knexClone.client.config, this.client.config);
        }
      }
      redefineProperties(knexClone, knexClone.client);
      _copyEventListeners("query", knexFn, knexClone);
      _copyEventListeners("query-error", knexFn, knexClone);
      _copyEventListeners("query-response", knexFn, knexClone);
      _copyEventListeners("start", knexFn, knexClone);
      knexClone.userParams = params;
      return knexClone;
    }
  });
  if (!knexFn.context) {
    knexFn.context = knexContext;
  }
}
function _copyEventListeners(eventName, sourceKnex, targetKnex) {
  const listeners = sourceKnex.listeners(eventName);
  listeners.forEach((listener) => {
    targetKnex.on(eventName, listener);
  });
}
function redefineProperties(knex2, client2) {
  for (let i = 0; i < QueryInterface$1.length; i++) {
    const method = QueryInterface$1[i];
    knex2[method] = function() {
      const builder2 = this.queryBuilder();
      return builder2[method].apply(builder2, arguments);
    };
  }
  Object.defineProperties(knex2, KNEX_PROPERTY_DEFINITIONS);
  initContext(knex2);
  knex2.client = client2;
  knex2.userParams = {};
  const ee = new EventEmitter$5();
  for (const key in ee) {
    knex2[key] = ee[key];
  }
  if (knex2._internalListeners) {
    knex2._internalListeners.forEach(({ eventName, listener }) => {
      knex2.client.removeListener(eventName, listener);
    });
  }
  knex2._internalListeners = [];
  _addInternalListener(knex2, "start", (obj) => {
    knex2.emit("start", obj);
  });
  _addInternalListener(knex2, "query", (obj) => {
    knex2.emit("query", obj);
  });
  _addInternalListener(knex2, "query-error", (err, obj) => {
    knex2.emit("query-error", err, obj);
  });
  _addInternalListener(knex2, "query-response", (response, obj, builder2) => {
    knex2.emit("query-response", response, obj, builder2);
  });
}
function _addInternalListener(knex2, eventName, listener) {
  knex2.client.on(eventName, listener);
  knex2._internalListeners.push({
    eventName,
    listener
  });
}
function createQueryBuilder(knexContext, tableName, options) {
  const qb = knexContext.queryBuilder();
  if (!tableName)
    knexContext.client.logger.warn(
      "calling knex without a tableName is deprecated. Use knex.queryBuilder() instead."
    );
  return tableName ? qb.table(tableName, options) : qb;
}
function shallowCloneFunction(originalFunction) {
  const fnContext = Object.create(
    Object.getPrototypeOf(originalFunction),
    Object.getOwnPropertyDescriptors(originalFunction)
  );
  const knexContext = {};
  const knexFnWrapper = (tableName, options) => {
    return createQueryBuilder(knexContext, tableName, options);
  };
  const clonedFunction = knexFnWrapper.bind(fnContext);
  Object.assign(clonedFunction, originalFunction);
  clonedFunction.context = knexContext;
  return clonedFunction;
}
var makeKnex_1 = makeKnex$2;
var noop$1 = function() {
};
const noop = noop$1;
const finallyMixin$2 = (prototype) => Object.assign(prototype, {
  finally(onFinally) {
    return this.then().finally(onFinally);
  }
});
var finallyMixin_1 = Promise.prototype.finally ? finallyMixin$2 : noop;
const { EventEmitter: EventEmitter$4 } = require$$0;
const Debug = srcExports;
const uniqueId$1 = uniqueId_1;
const { callbackify: callbackify$1 } = require$$3;
const makeKnex$1 = makeKnex_1;
const { timeout, KnexTimeoutError: KnexTimeoutError$2 } = timeout$3;
const finallyMixin$1 = finallyMixin_1;
const debug$3 = Debug("knex:tx");
function DEFAULT_CONFIG() {
  return {
    userParams: {},
    doNotRejectOnRollback: true
  };
}
const validIsolationLevels = [
  // Doesn't really work in postgres, it treats it as read committed
  "read uncommitted",
  "read committed",
  "snapshot",
  // snapshot and repeatable read are basically the same, most "repeatable
  // read" implementations are actually "snapshot" also known as Multi Version
  // Concurrency Control (MVCC). Mssql's repeatable read doesn't stop
  // repeated reads for inserts as it uses a pessimistic locking system so
  // you should probably use 'snapshot' to stop read skew.
  "repeatable read",
  // mysql pretends to have serializable, but it is not
  "serializable"
];
let Transaction$1 = class Transaction extends EventEmitter$4 {
  constructor(client2, container, config = DEFAULT_CONFIG(), outerTx = null) {
    super();
    this.userParams = config.userParams;
    this.doNotRejectOnRollback = config.doNotRejectOnRollback;
    const txid = this.txid = uniqueId$1("trx");
    this.client = client2;
    this.logger = client2.logger;
    this.outerTx = outerTx;
    this.trxClient = void 0;
    this._completed = false;
    this._debug = client2.config && client2.config.debug;
    this.readOnly = config.readOnly;
    if (config.isolationLevel) {
      this.setIsolationLevel(config.isolationLevel);
    }
    debug$3(
      "%s: Starting %s transaction",
      txid,
      outerTx ? "nested" : "top level"
    );
    this._lastChild = Promise.resolve();
    const _previousSibling = outerTx ? outerTx._lastChild : Promise.resolve();
    const basePromise = _previousSibling.then(
      () => this._evaluateContainer(config, container)
    );
    this._promise = basePromise.then((x) => x);
    if (outerTx) {
      outerTx._lastChild = basePromise.catch(() => {
      });
    }
  }
  isCompleted() {
    return this._completed || this.outerTx && this.outerTx.isCompleted() || false;
  }
  begin(conn) {
    const trxMode = [
      this.isolationLevel ? `ISOLATION LEVEL ${this.isolationLevel}` : "",
      this.readOnly ? "READ ONLY" : ""
    ].join(" ").trim();
    if (trxMode.length === 0) {
      return this.query(conn, "BEGIN;");
    }
    return this.query(conn, `SET TRANSACTION ${trxMode};`).then(
      () => this.query(conn, "BEGIN;")
    );
  }
  savepoint(conn) {
    return this.query(conn, `SAVEPOINT ${this.txid};`);
  }
  commit(conn, value) {
    return this.query(conn, "COMMIT;", 1, value);
  }
  release(conn, value) {
    return this.query(conn, `RELEASE SAVEPOINT ${this.txid};`, 1, value);
  }
  setIsolationLevel(isolationLevel) {
    if (!validIsolationLevels.includes(isolationLevel)) {
      throw new Error(
        `Invalid isolationLevel, supported isolation levels are: ${JSON.stringify(
          validIsolationLevels
        )}`
      );
    }
    this.isolationLevel = isolationLevel;
    return this;
  }
  rollback(conn, error) {
    return timeout(this.query(conn, "ROLLBACK", 2, error), 5e3).catch(
      (err) => {
        if (!(err instanceof KnexTimeoutError$2)) {
          return Promise.reject(err);
        }
        this._rejecter(error);
      }
    );
  }
  rollbackTo(conn, error) {
    return timeout(
      this.query(conn, `ROLLBACK TO SAVEPOINT ${this.txid}`, 2, error),
      5e3
    ).catch((err) => {
      if (!(err instanceof KnexTimeoutError$2)) {
        return Promise.reject(err);
      }
      this._rejecter(error);
    });
  }
  query(conn, sql, status, value) {
    const q = this.trxClient.query(conn, sql).catch((err) => {
      status = 2;
      value = err;
      this._completed = true;
      debug$3("%s error running transaction query", this.txid);
    }).then((res) => {
      if (status === 1) {
        this._resolver(value);
      }
      if (status === 2) {
        if (value === void 0) {
          if (this.doNotRejectOnRollback && /^ROLLBACK\b/i.test(sql)) {
            this._resolver();
            return;
          }
          value = new Error(`Transaction rejected with non-error: ${value}`);
        }
        this._rejecter(value);
      }
      return res;
    });
    if (status === 1 || status === 2) {
      this._completed = true;
    }
    return q;
  }
  debug(enabled) {
    this._debug = arguments.length ? enabled : true;
    return this;
  }
  async _onAcquire(container, connection) {
    const trxClient = this.trxClient = makeTxClient(
      this,
      this.client,
      connection
    );
    const init2 = this.client.transacting ? this.savepoint(connection) : this.begin(connection);
    const executionPromise = new Promise((resolver, rejecter) => {
      this._resolver = resolver;
      this._rejecter = rejecter;
    });
    init2.then(() => {
      return makeTransactor(this, connection, trxClient);
    }).then((transactor) => {
      this.transactor = transactor;
      if (this.outerTx) {
        transactor.parentTransaction = this.outerTx.transactor;
      }
      transactor.executionPromise = executionPromise;
      let result;
      try {
        result = container(transactor);
      } catch (err) {
        result = Promise.reject(err);
      }
      if (result && result.then && typeof result.then === "function") {
        result.then((val) => {
          return transactor.commit(val);
        }).catch((err) => {
          return transactor.rollback(err);
        });
      }
      return null;
    }).catch((e) => {
      return this._rejecter(e);
    });
    return executionPromise;
  }
  _evaluateContainer(config, container) {
    return this.acquireConnection(
      config,
      (connection) => this._onAcquire(container, connection)
    );
  }
  // Acquire a connection and create a disposer - either using the one passed
  // via config or getting one off the client. The disposer will be called once
  // the original promise is marked completed.
  async acquireConnection(config, cb) {
    const configConnection = config && config.connection;
    const connection = configConnection || await this.client.acquireConnection();
    try {
      connection.__knexTxId = this.txid;
      return await cb(connection);
    } finally {
      if (!configConnection) {
        debug$3("%s: releasing connection", this.txid);
        delete connection.__knexTxId;
        this.client.releaseConnection(connection);
      } else {
        debug$3("%s: not releasing external connection", this.txid);
      }
    }
  }
  then(onResolve, onReject) {
    return this._promise.then(onResolve, onReject);
  }
  catch(...args) {
    return this._promise.catch(...args);
  }
  asCallback(cb) {
    callbackify$1(() => this._promise)(cb);
    return this._promise;
  }
};
finallyMixin$1(Transaction$1.prototype);
function makeTransactor(trx, connection, trxClient) {
  const transactor = makeKnex$1(trxClient);
  transactor.context.withUserParams = () => {
    throw new Error(
      "Cannot set user params on a transaction - it can only inherit params from main knex instance"
    );
  };
  transactor.isTransaction = true;
  transactor.userParams = trx.userParams || {};
  transactor.context.transaction = function(container, options) {
    if (!options) {
      options = { doNotRejectOnRollback: true };
    } else if (options.doNotRejectOnRollback === void 0) {
      options.doNotRejectOnRollback = true;
    }
    return this._transaction(container, options, trx);
  };
  transactor.savepoint = function(container, options) {
    return transactor.transaction(container, options);
  };
  if (trx.client.transacting) {
    transactor.commit = (value) => trx.release(connection, value);
    transactor.rollback = (error) => trx.rollbackTo(connection, error);
  } else {
    transactor.commit = (value) => trx.commit(connection, value);
    transactor.rollback = (error) => trx.rollback(connection, error);
  }
  transactor.isCompleted = () => trx.isCompleted();
  return transactor;
}
function makeTxClient(trx, client2, connection) {
  const trxClient = Object.create(client2.constructor.prototype);
  trxClient.version = client2.version;
  trxClient.config = client2.config;
  trxClient.driver = client2.driver;
  trxClient.connectionSettings = client2.connectionSettings;
  trxClient.transacting = true;
  trxClient.valueForUndefined = client2.valueForUndefined;
  trxClient.logger = client2.logger;
  trxClient.on("start", function(arg) {
    trx.emit("start", arg);
    client2.emit("start", arg);
  });
  trxClient.on("query", function(arg) {
    trx.emit("query", arg);
    client2.emit("query", arg);
  });
  trxClient.on("query-error", function(err, obj) {
    trx.emit("query-error", err, obj);
    client2.emit("query-error", err, obj);
  });
  trxClient.on("query-response", function(response, obj, builder2) {
    trx.emit("query-response", response, obj, builder2);
    client2.emit("query-response", response, obj, builder2);
  });
  const _query = trxClient.query;
  trxClient.query = function(conn, obj) {
    const completed = trx.isCompleted();
    return new Promise(function(resolve, reject2) {
      try {
        if (conn !== connection)
          throw new Error("Invalid connection for transaction query.");
        if (completed) completedError(trx, obj);
        resolve(_query.call(trxClient, conn, obj));
      } catch (e) {
        reject2(e);
      }
    });
  };
  const _stream = trxClient.stream;
  trxClient.stream = function(conn, obj, stream, options) {
    const completed = trx.isCompleted();
    return new Promise(function(resolve, reject2) {
      try {
        if (conn !== connection)
          throw new Error("Invalid connection for transaction query.");
        if (completed) completedError(trx, obj);
        resolve(_stream.call(trxClient, conn, obj, stream, options));
      } catch (e) {
        reject2(e);
      }
    });
  };
  trxClient.acquireConnection = function() {
    return Promise.resolve(connection);
  };
  trxClient.releaseConnection = function() {
    return Promise.resolve();
  };
  return trxClient;
}
function completedError(trx, obj) {
  const sql = typeof obj === "string" ? obj : obj && obj.sql;
  debug$3("%s: Transaction completed: %s", trx.txid, sql);
  throw new Error(
    "Transaction query already complete, run with DEBUG=knex:tx for more info"
  );
}
var transaction$6 = Transaction$1;
const _debugQuery = srcExports("knex:query");
const debugBindings$2 = srcExports("knex:bindings");
const debugQuery = (sql, txId) => _debugQuery(sql.replace(/%/g, "%%"), txId);
const { isString: isString$5 } = is;
function formatQuery$1(sql, bindings2, timeZone, client2) {
  bindings2 = bindings2 == null ? [] : [].concat(bindings2);
  let index = 0;
  return sql.replace(/\\?\?/g, (match) => {
    if (match === "\\?") {
      return "?";
    }
    if (index === bindings2.length) {
      return match;
    }
    const value = bindings2[index++];
    return client2._escapeBinding(value, { timeZone });
  });
}
function enrichQueryObject$1(connection, queryParam, client2) {
  const queryObject = isString$5(queryParam) ? { sql: queryParam } : queryParam;
  queryObject.bindings = client2.prepBindings(queryObject.bindings);
  queryObject.sql = client2.positionBindings(queryObject.sql);
  const { __knexUid, __knexTxId } = connection;
  client2.emit("query", Object.assign({ __knexUid, __knexTxId }, queryObject));
  debugQuery(queryObject.sql, __knexTxId);
  debugBindings$2(queryObject.bindings, __knexTxId);
  return queryObject;
}
function executeQuery$1(connection, queryObject, client2) {
  return client2._query(connection, queryObject).catch((err) => {
    if (client2.config && client2.config.compileSqlOnError === false) {
      err.message = queryObject.sql + " - " + err.message;
    } else {
      err.message = formatQuery$1(queryObject.sql, queryObject.bindings, void 0, client2) + " - " + err.message;
    }
    client2.emit(
      "query-error",
      err,
      Object.assign(
        { __knexUid: connection.__knexUid, __knexTxId: connection.__knexTxId },
        queryObject
      )
    );
    throw err;
  });
}
var queryExecutioner = {
  enrichQueryObject: enrichQueryObject$1,
  executeQuery: executeQuery$1,
  formatQuery: formatQuery$1
};
var assignValue$1 = _assignValue, copyObject$1 = _copyObject, createAssigner$1 = _createAssigner, isArrayLike$1 = isArrayLike_1, isPrototype = _isPrototype, keys = keys_1;
var objectProto$2 = Object.prototype;
var hasOwnProperty$2 = objectProto$2.hasOwnProperty;
var assign$7 = createAssigner$1(function(object, source) {
  if (isPrototype(source) || isArrayLike$1(source)) {
    copyObject$1(source, keys(source), object);
    return;
  }
  for (var key in source) {
    if (hasOwnProperty$2.call(source, key)) {
      assignValue$1(object, key, source[key]);
    }
  }
});
var assign_1 = assign$7;
var baseClone = _baseClone;
var CLONE_SYMBOLS_FLAG = 4;
function clone$2(value) {
  return baseClone(value, CLONE_SYMBOLS_FLAG);
}
var clone_1 = clone$2;
var identity = identity_1;
function castFunction$1(value) {
  return typeof value == "function" ? value : identity;
}
var _castFunction = castFunction$1;
var arrayEach$1 = _arrayEach, baseEach$3 = _baseEach, castFunction = _castFunction, isArray$5 = isArray_1;
function forEach(collection, iteratee) {
  var func = isArray$5(collection) ? arrayEach$1 : baseEach$3;
  return func(collection, castFunction(iteratee));
}
var forEach_1 = forEach;
var each$2 = forEach_1;
var baseEach$2 = _baseEach;
function baseFilter$1(collection, predicate) {
  var result = [];
  baseEach$2(collection, function(value, index, collection2) {
    if (predicate(value, index, collection2)) {
      result.push(value);
    }
  });
  return result;
}
var _baseFilter = baseFilter$1;
var FUNC_ERROR_TEXT = "Expected a function";
function negate$2(predicate) {
  if (typeof predicate != "function") {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  return function() {
    var args = arguments;
    switch (args.length) {
      case 0:
        return !predicate.call(this);
      case 1:
        return !predicate.call(this, args[0]);
      case 2:
        return !predicate.call(this, args[0], args[1]);
      case 3:
        return !predicate.call(this, args[0], args[1], args[2]);
    }
    return !predicate.apply(this, args);
  };
}
var negate_1 = negate$2;
var arrayFilter = _arrayFilter, baseFilter = _baseFilter, baseIteratee$6 = _baseIteratee, isArray$4 = isArray_1, negate$1 = negate_1;
function reject$1(collection, predicate) {
  var func = isArray$4(collection) ? arrayFilter : baseFilter;
  return func(collection, negate$1(baseIteratee$6(predicate)));
}
var reject_1 = reject$1;
var baseSlice = _baseSlice;
function tail$4(array) {
  var length = array == null ? 0 : array.length;
  return length ? baseSlice(array, 1, length) : [];
}
var tail_1 = tail$4;
function iteratorToArray$1(iterator) {
  var data, result = [];
  while (!(data = iterator.next()).done) {
    result.push(data.value);
  }
  return result;
}
var _iteratorToArray = iteratorToArray$1;
function asciiToArray$1(string2) {
  return string2.split("");
}
var _asciiToArray = asciiToArray$1;
var rsAstralRange$1 = "\\ud800-\\udfff", rsComboMarksRange$1 = "\\u0300-\\u036f", reComboHalfMarksRange$1 = "\\ufe20-\\ufe2f", rsComboSymbolsRange$1 = "\\u20d0-\\u20ff", rsComboRange$1 = rsComboMarksRange$1 + reComboHalfMarksRange$1 + rsComboSymbolsRange$1, rsVarRange$1 = "\\ufe0e\\ufe0f";
var rsZWJ$1 = "\\u200d";
var reHasUnicode = RegExp("[" + rsZWJ$1 + rsAstralRange$1 + rsComboRange$1 + rsVarRange$1 + "]");
function hasUnicode$1(string2) {
  return reHasUnicode.test(string2);
}
var _hasUnicode = hasUnicode$1;
var rsAstralRange = "\\ud800-\\udfff", rsComboMarksRange = "\\u0300-\\u036f", reComboHalfMarksRange = "\\ufe20-\\ufe2f", rsComboSymbolsRange = "\\u20d0-\\u20ff", rsComboRange = rsComboMarksRange + reComboHalfMarksRange + rsComboSymbolsRange, rsVarRange = "\\ufe0e\\ufe0f";
var rsAstral = "[" + rsAstralRange + "]", rsCombo = "[" + rsComboRange + "]", rsFitz = "\\ud83c[\\udffb-\\udfff]", rsModifier = "(?:" + rsCombo + "|" + rsFitz + ")", rsNonAstral = "[^" + rsAstralRange + "]", rsRegional = "(?:\\ud83c[\\udde6-\\uddff]){2}", rsSurrPair = "[\\ud800-\\udbff][\\udc00-\\udfff]", rsZWJ = "\\u200d";
var reOptMod = rsModifier + "?", rsOptVar = "[" + rsVarRange + "]?", rsOptJoin = "(?:" + rsZWJ + "(?:" + [rsNonAstral, rsRegional, rsSurrPair].join("|") + ")" + rsOptVar + reOptMod + ")*", rsSeq = rsOptVar + reOptMod + rsOptJoin, rsSymbol = "(?:" + [rsNonAstral + rsCombo + "?", rsCombo, rsRegional, rsSurrPair, rsAstral].join("|") + ")";
var reUnicode = RegExp(rsFitz + "(?=" + rsFitz + ")|" + rsSymbol + rsSeq, "g");
function unicodeToArray$1(string2) {
  return string2.match(reUnicode) || [];
}
var _unicodeToArray = unicodeToArray$1;
var asciiToArray = _asciiToArray, hasUnicode = _hasUnicode, unicodeToArray = _unicodeToArray;
function stringToArray$1(string2) {
  return hasUnicode(string2) ? unicodeToArray(string2) : asciiToArray(string2);
}
var _stringToArray = stringToArray$1;
var Symbol$1 = _Symbol, copyArray = _copyArray, getTag = _getTag, isArrayLike = isArrayLike_1, isString$4 = isString_1, iteratorToArray = _iteratorToArray, mapToArray = _mapToArray, setToArray = _setToArray, stringToArray = _stringToArray, values = values_1;
var mapTag = "[object Map]", setTag = "[object Set]";
var symIterator = Symbol$1 ? Symbol$1.iterator : void 0;
function toArray$4(value) {
  if (!value) {
    return [];
  }
  if (isArrayLike(value)) {
    return isString$4(value) ? stringToArray(value) : copyArray(value);
  }
  if (symIterator && value[symIterator]) {
    return iteratorToArray(value[symIterator]());
  }
  var tag = getTag(value), func = tag == mapTag ? mapToArray : tag == setTag ? setToArray : values;
  return func(value);
}
var toArray_1 = toArray$4;
const CLIENT_ALIASES$1 = Object.freeze({
  pg: "postgres",
  postgresql: "postgres",
  sqlite: "sqlite3"
});
const SUPPORTED_CLIENTS$1 = Object.freeze(
  [
    "mariadb",
    "mssql",
    "mysql",
    "mysql2",
    "oracledb",
    "postgres",
    "pgnative",
    "redshift",
    "sqlite3",
    "cockroachdb",
    "better-sqlite3"
  ].concat(Object.keys(CLIENT_ALIASES$1))
);
const POOL_CONFIG_OPTIONS$1 = Object.freeze([
  "maxWaitingClients",
  "testOnBorrow",
  "fifo",
  "priorityRange",
  "autostart",
  "evictionRunIntervalMillis",
  "numTestsPerRun",
  "softIdleTimeoutMillis",
  "Promise"
]);
var constants$1 = {
  CLIENT_ALIASES: CLIENT_ALIASES$1,
  SUPPORTED_CLIENTS: SUPPORTED_CLIENTS$1,
  POOL_CONFIG_OPTIONS: POOL_CONFIG_OPTIONS$1
};
const isPlainObject$3 = isPlainObject_1;
const isTypedArray$1 = isTypedArray_1;
const { CLIENT_ALIASES } = constants$1;
const { isFunction: isFunction$3 } = is;
function normalizeArr$2(...args) {
  if (Array.isArray(args[0])) {
    return args[0];
  }
  return args;
}
function containsUndefined(mixed) {
  let argContainsUndefined = false;
  if (isTypedArray$1(mixed)) return false;
  if (mixed && isFunction$3(mixed.toSQL)) {
    return argContainsUndefined;
  }
  if (Array.isArray(mixed)) {
    for (let i = 0; i < mixed.length; i++) {
      if (argContainsUndefined) break;
      argContainsUndefined = containsUndefined(mixed[i]);
    }
  } else if (isPlainObject$3(mixed)) {
    Object.keys(mixed).forEach((key) => {
      if (!argContainsUndefined) {
        argContainsUndefined = containsUndefined(mixed[key]);
      }
    });
  } else {
    argContainsUndefined = mixed === void 0;
  }
  return argContainsUndefined;
}
function getUndefinedIndices(mixed) {
  const indices = [];
  if (Array.isArray(mixed)) {
    mixed.forEach((item, index) => {
      if (containsUndefined(item)) {
        indices.push(index);
      }
    });
  } else if (isPlainObject$3(mixed)) {
    Object.keys(mixed).forEach((key) => {
      if (containsUndefined(mixed[key])) {
        indices.push(key);
      }
    });
  } else {
    indices.push(0);
  }
  return indices;
}
function addQueryContext$3(Target) {
  Target.prototype.queryContext = function(context) {
    if (context === void 0) {
      return this._queryContext;
    }
    this._queryContext = context;
    return this;
  };
}
function resolveClientNameWithAliases$1(clientName) {
  return CLIENT_ALIASES[clientName] || clientName;
}
function toNumber$1(val, fallback) {
  if (val === void 0 || val === null) return fallback;
  const number = parseInt(val, 10);
  return isNaN(number) ? fallback : number;
}
var helpers$7 = {
  addQueryContext: addQueryContext$3,
  containsUndefined,
  getUndefinedIndices,
  normalizeArr: normalizeArr$2,
  resolveClientNameWithAliases: resolveClientNameWithAliases$1,
  toNumber: toNumber$1
};
const assert$2 = require$$0$4;
function getClauseFromArguments(compilerType, bool, first2, operator2, second) {
  if (typeof first2 === "function") {
    return {
      type: "onWrapped",
      value: first2,
      bool
    };
  }
  switch (arguments.length) {
    case 3:
      return { type: "onRaw", value: first2, bool };
    case 4:
      return {
        type: compilerType,
        column: first2,
        operator: "=",
        value: operator2,
        bool
      };
    default:
      return {
        type: compilerType,
        column: first2,
        operator: operator2,
        value: second,
        bool
      };
  }
}
let JoinClause$2 = class JoinClause {
  constructor(table, type, schema) {
    this.schema = schema;
    this.table = table;
    this.joinType = type;
    this.and = this;
    this.clauses = [];
  }
  get or() {
    return this._bool("or");
  }
  // Adds an "on" clause to the current join object.
  on(first2) {
    if (typeof first2 === "object" && typeof first2.toSQL !== "function") {
      const keys2 = Object.keys(first2);
      let i = -1;
      const method = this._bool() === "or" ? "orOn" : "on";
      while (++i < keys2.length) {
        this[method](keys2[i], first2[keys2[i]]);
      }
      return this;
    }
    const data = getClauseFromArguments("onBasic", this._bool(), ...arguments);
    if (data) {
      this.clauses.push(data);
    }
    return this;
  }
  // Adds an "or on" clause to the current join object.
  orOn(first2, operator2, second) {
    return this._bool("or").on.apply(this, arguments);
  }
  onJsonPathEquals(columnFirst, jsonPathFirst, columnSecond, jsonPathSecond) {
    this.clauses.push({
      type: "onJsonPathEquals",
      columnFirst,
      jsonPathFirst,
      columnSecond,
      jsonPathSecond,
      bool: this._bool(),
      not: this._not()
    });
    return this;
  }
  orOnJsonPathEquals(columnFirst, jsonPathFirst, columnSecond, jsonPathSecond) {
    return this._bool("or").onJsonPathEquals.apply(this, arguments);
  }
  // Adds a "using" clause to the current join.
  using(column) {
    return this.clauses.push({ type: "onUsing", column, bool: this._bool() });
  }
  onVal(first2) {
    if (typeof first2 === "object" && typeof first2.toSQL !== "function") {
      const keys2 = Object.keys(first2);
      let i = -1;
      const method = this._bool() === "or" ? "orOnVal" : "onVal";
      while (++i < keys2.length) {
        this[method](keys2[i], first2[keys2[i]]);
      }
      return this;
    }
    const data = getClauseFromArguments("onVal", this._bool(), ...arguments);
    if (data) {
      this.clauses.push(data);
    }
    return this;
  }
  andOnVal() {
    return this.onVal(...arguments);
  }
  orOnVal() {
    return this._bool("or").onVal(...arguments);
  }
  onBetween(column, values2) {
    assert$2(
      Array.isArray(values2),
      "The second argument to onBetween must be an array."
    );
    assert$2(
      values2.length === 2,
      "You must specify 2 values for the onBetween clause"
    );
    this.clauses.push({
      type: "onBetween",
      column,
      value: values2,
      bool: this._bool(),
      not: this._not()
    });
    return this;
  }
  onNotBetween(column, values2) {
    return this._not(true).onBetween(column, values2);
  }
  orOnBetween(column, values2) {
    return this._bool("or").onBetween(column, values2);
  }
  orOnNotBetween(column, values2) {
    return this._bool("or")._not(true).onBetween(column, values2);
  }
  onIn(column, values2) {
    if (Array.isArray(values2) && values2.length === 0) return this.on(1, "=", 0);
    this.clauses.push({
      type: "onIn",
      column,
      value: values2,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  }
  onNotIn(column, values2) {
    return this._not(true).onIn(column, values2);
  }
  orOnIn(column, values2) {
    return this._bool("or").onIn(column, values2);
  }
  orOnNotIn(column, values2) {
    return this._bool("or")._not(true).onIn(column, values2);
  }
  onNull(column) {
    this.clauses.push({
      type: "onNull",
      column,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  }
  orOnNull(callback) {
    return this._bool("or").onNull(callback);
  }
  onNotNull(callback) {
    return this._not(true).onNull(callback);
  }
  orOnNotNull(callback) {
    return this._not(true)._bool("or").onNull(callback);
  }
  onExists(callback) {
    this.clauses.push({
      type: "onExists",
      value: callback,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  }
  orOnExists(callback) {
    return this._bool("or").onExists(callback);
  }
  onNotExists(callback) {
    return this._not(true).onExists(callback);
  }
  orOnNotExists(callback) {
    return this._not(true)._bool("or").onExists(callback);
  }
  // Explicitly set the type of join, useful within a function when creating a grouped join.
  type(type) {
    this.joinType = type;
    return this;
  }
  _bool(bool) {
    if (arguments.length === 1) {
      this._boolFlag = bool;
      return this;
    }
    const ret = this._boolFlag || "and";
    this._boolFlag = "and";
    return ret;
  }
  _not(val) {
    if (arguments.length === 1) {
      this._notFlag = val;
      return this;
    }
    const ret = this._notFlag;
    this._notFlag = false;
    return ret;
  }
};
Object.assign(JoinClause$2.prototype, {
  grouping: "join"
});
JoinClause$2.prototype.andOn = JoinClause$2.prototype.on;
JoinClause$2.prototype.andOnIn = JoinClause$2.prototype.onIn;
JoinClause$2.prototype.andOnNotIn = JoinClause$2.prototype.onNotIn;
JoinClause$2.prototype.andOnNull = JoinClause$2.prototype.onNull;
JoinClause$2.prototype.andOnNotNull = JoinClause$2.prototype.onNotNull;
JoinClause$2.prototype.andOnExists = JoinClause$2.prototype.onExists;
JoinClause$2.prototype.andOnNotExists = JoinClause$2.prototype.onNotExists;
JoinClause$2.prototype.andOnBetween = JoinClause$2.prototype.onBetween;
JoinClause$2.prototype.andOnNotBetween = JoinClause$2.prototype.onNotBetween;
JoinClause$2.prototype.andOnJsonPathEquals = JoinClause$2.prototype.onJsonPathEquals;
var joinclause = JoinClause$2;
const assert$1 = require$$0$4;
let Analytic$1 = class Analytic {
  constructor(method, schema, alias, orderBy, partitions) {
    this.schema = schema;
    this.type = "analytic";
    this.method = method;
    this.order = orderBy || [];
    this.partitions = partitions || [];
    this.alias = alias;
    this.and = this;
    this.grouping = "columns";
  }
  partitionBy(column, direction2) {
    assert$1(
      Array.isArray(column) || typeof column === "string",
      `The argument to an analytic partitionBy function must be either a string
            or an array of string.`
    );
    if (Array.isArray(column)) {
      this.partitions = this.partitions.concat(column);
    } else {
      this.partitions.push({ column, order: direction2 });
    }
    return this;
  }
  orderBy(column, direction2) {
    assert$1(
      Array.isArray(column) || typeof column === "string",
      `The argument to an analytic orderBy function must be either a string
            or an array of string.`
    );
    if (Array.isArray(column)) {
      this.order = this.order.concat(column);
    } else {
      this.order.push({ column, order: direction2 });
    }
    return this;
  }
};
var analytic = Analytic$1;
var saveAsyncStack$3 = function saveAsyncStack(instance, lines) {
  if (instance.client.config.asyncStackTraces) {
    instance._asyncStack = {
      error: new Error(),
      lines
    };
  }
};
var constants = {
  lockMode: {
    forShare: "forShare",
    forUpdate: "forUpdate",
    forNoKeyUpdate: "forNoKeyUpdate",
    forKeyShare: "forKeyShare"
  },
  waitMode: {
    skipLocked: "skipLocked",
    noWait: "noWait"
  }
};
const clone$1 = clone_1;
const isEmpty$3 = isEmpty_1;
const { callbackify } = require$$3;
const finallyMixin = finallyMixin_1;
const { formatQuery } = queryExecutioner;
function augmentWithBuilderInterface$3(Target) {
  Target.prototype.toQuery = function(tz) {
    let data = this.toSQL(this._method, tz);
    if (!Array.isArray(data)) data = [data];
    if (!data.length) {
      return "";
    }
    return data.map((statement) => {
      return formatQuery(statement.sql, statement.bindings, tz, this.client);
    }).reduce((a, c) => a.concat(a.endsWith(";") ? "\n" : ";\n", c));
  };
  Target.prototype.then = function() {
    let result = this.client.runner(this).run();
    if (this.client.config.asyncStackTraces) {
      result = result.catch((err) => {
        err.originalStack = err.stack;
        const firstLine = err.stack.split("\n")[0];
        const { error, lines } = this._asyncStack;
        const stackByLines = error.stack.split("\n");
        const asyncStack = stackByLines.slice(lines);
        asyncStack.unshift(firstLine);
        err.stack = asyncStack.join("\n");
        throw err;
      });
    }
    return result.then.apply(result, arguments);
  };
  Target.prototype.options = function(opts) {
    this._options = this._options || [];
    this._options.push(clone$1(opts) || {});
    return this;
  };
  Target.prototype.connection = function(connection) {
    this._connection = connection;
    this.client.processPassedConnection(connection);
    return this;
  };
  Target.prototype.debug = function(enabled) {
    this._debug = arguments.length ? enabled : true;
    return this;
  };
  Target.prototype.transacting = function(transaction2) {
    if (transaction2 && transaction2.client) {
      if (!transaction2.client.transacting) {
        transaction2.client.logger.warn(
          `Invalid transaction value: ${transaction2.client}`
        );
      } else {
        this.client = transaction2.client;
      }
    }
    if (isEmpty$3(transaction2)) {
      this.client.logger.error(
        "Invalid value on transacting call, potential bug"
      );
      throw Error(
        "Invalid transacting value (null, undefined or empty object)"
      );
    }
    return this;
  };
  Target.prototype.stream = function(options) {
    return this.client.runner(this).stream(options);
  };
  Target.prototype.pipe = function(writable, options) {
    return this.client.runner(this).pipe(writable, options);
  };
  Target.prototype.asCallback = function(cb) {
    const promise = this.then();
    callbackify(() => promise)(cb);
    return promise;
  };
  Target.prototype.catch = function(onReject) {
    return this.then().catch(onReject);
  };
  Object.defineProperty(Target.prototype, Symbol.toStringTag, {
    get: () => "object"
  });
  finallyMixin(Target.prototype);
}
var builderInterfaceAugmenter = {
  augmentWithBuilderInterface: augmentWithBuilderInterface$3
};
const assert = require$$0$4;
const { EventEmitter: EventEmitter$3 } = require$$0;
const assign$6 = assign_1;
const clone = clone_1;
const each$1 = each$2;
const isEmpty$2 = isEmpty_1;
const isPlainObject$2 = isPlainObject_1;
const last = last_1;
const reject = reject_1;
const tail$3 = tail_1;
const toArray$3 = toArray_1;
const { addQueryContext: addQueryContext$2, normalizeArr: normalizeArr$1 } = helpers$7;
const JoinClause$1 = joinclause;
const Analytic2 = analytic;
const saveAsyncStack$2 = saveAsyncStack$3;
const {
  isBoolean,
  isNumber: isNumber$1,
  isObject: isObject$5,
  isString: isString$3,
  isFunction: isFunction$2
} = is;
const { lockMode, waitMode } = constants;
const {
  augmentWithBuilderInterface: augmentWithBuilderInterface$2
} = builderInterfaceAugmenter;
const SELECT_COMMANDS = /* @__PURE__ */ new Set(["pluck", "first", "select"]);
const CLEARABLE_STATEMENTS = /* @__PURE__ */ new Set([
  "with",
  "select",
  "columns",
  "hintComments",
  "where",
  "union",
  "join",
  "group",
  "order",
  "having",
  "limit",
  "offset",
  "counter",
  "counters"
]);
const LOCK_MODES = /* @__PURE__ */ new Set([
  lockMode.forShare,
  lockMode.forUpdate,
  lockMode.forNoKeyUpdate,
  lockMode.forKeyShare
]);
class Builder extends EventEmitter$3 {
  constructor(client2) {
    super();
    this.client = client2;
    this.and = this;
    this._single = {};
    this._comments = [];
    this._statements = [];
    this._method = "select";
    if (client2.config) {
      saveAsyncStack$2(this, 5);
      this._debug = client2.config.debug;
    }
    this._joinFlag = "inner";
    this._boolFlag = "and";
    this._notFlag = false;
    this._asColumnFlag = false;
  }
  toString() {
    return this.toQuery();
  }
  // Convert the current query "toSQL"
  toSQL(method, tz) {
    return this.client.queryCompiler(this).toSQL(method || this._method, tz);
  }
  // Create a shallow clone of the current query builder.
  clone() {
    const cloned = new this.constructor(this.client);
    cloned._method = this._method;
    cloned._single = clone(this._single);
    cloned._comments = clone(this._comments);
    cloned._statements = clone(this._statements);
    cloned._debug = this._debug;
    if (this._options !== void 0) {
      cloned._options = clone(this._options);
    }
    if (this._queryContext !== void 0) {
      cloned._queryContext = clone(this._queryContext);
    }
    if (this._connection !== void 0) {
      cloned._connection = this._connection;
    }
    return cloned;
  }
  timeout(ms2, { cancel } = {}) {
    if (isNumber$1(ms2) && ms2 > 0) {
      this._timeout = ms2;
      if (cancel) {
        this.client.assertCanCancelQuery();
        this._cancelOnTimeout = true;
      }
    }
    return this;
  }
  // With
  // ------
  isValidStatementArg(statement) {
    return typeof statement === "function" || statement instanceof Builder || statement && statement.isRawInstance;
  }
  _validateWithArgs(alias, statementOrColumnList, nothingOrStatement, method) {
    const [query, columnList] = typeof nothingOrStatement === "undefined" ? [statementOrColumnList, void 0] : [nothingOrStatement, statementOrColumnList];
    if (typeof alias !== "string") {
      throw new Error(`${method}() first argument must be a string`);
    }
    if (this.isValidStatementArg(query) && typeof columnList === "undefined") {
      return;
    }
    const isNonEmptyNameList = Array.isArray(columnList) && columnList.length > 0 && columnList.every((it) => typeof it === "string");
    if (!isNonEmptyNameList) {
      throw new Error(
        `${method}() second argument must be a statement or non-empty column name list.`
      );
    }
    if (this.isValidStatementArg(query)) {
      return;
    }
    throw new Error(
      `${method}() third argument must be a function / QueryBuilder or a raw when its second argument is a column name list`
    );
  }
  with(alias, statementOrColumnList, nothingOrStatement) {
    this._validateWithArgs(
      alias,
      statementOrColumnList,
      nothingOrStatement,
      "with"
    );
    return this.withWrapped(alias, statementOrColumnList, nothingOrStatement);
  }
  withMaterialized(alias, statementOrColumnList, nothingOrStatement) {
    throw new Error("With materialized is not supported by this dialect");
  }
  withNotMaterialized(alias, statementOrColumnList, nothingOrStatement) {
    throw new Error("With materialized is not supported by this dialect");
  }
  // Helper for compiling any advanced `with` queries.
  withWrapped(alias, statementOrColumnList, nothingOrStatement, materialized) {
    const [query, columnList] = typeof nothingOrStatement === "undefined" ? [statementOrColumnList, void 0] : [nothingOrStatement, statementOrColumnList];
    const statement = {
      grouping: "with",
      type: "withWrapped",
      alias,
      columnList,
      value: query
    };
    if (materialized !== void 0) {
      statement.materialized = materialized;
    }
    this._statements.push(statement);
    return this;
  }
  // With Recursive
  // ------
  withRecursive(alias, statementOrColumnList, nothingOrStatement) {
    this._validateWithArgs(
      alias,
      statementOrColumnList,
      nothingOrStatement,
      "withRecursive"
    );
    return this.withRecursiveWrapped(
      alias,
      statementOrColumnList,
      nothingOrStatement
    );
  }
  // Helper for compiling any advanced `withRecursive` queries.
  withRecursiveWrapped(alias, statementOrColumnList, nothingOrStatement) {
    this.withWrapped(alias, statementOrColumnList, nothingOrStatement);
    this._statements[this._statements.length - 1].recursive = true;
    return this;
  }
  // Select
  // ------
  // Adds a column or columns to the list of "columns"
  // being selected on the query.
  columns(column) {
    if (!column && column !== 0) return this;
    this._statements.push({
      grouping: "columns",
      value: normalizeArr$1(...arguments)
    });
    return this;
  }
  // Adds a comment to the query
  comment(txt) {
    if (!isString$3(txt)) {
      throw new Error("Comment must be a string");
    }
    const forbiddenChars = ["/*", "*/", "?"];
    if (forbiddenChars.some((chars) => txt.includes(chars))) {
      throw new Error(`Cannot include ${forbiddenChars.join(", ")} in comment`);
    }
    this._comments.push({
      comment: txt
    });
    return this;
  }
  // Allow for a sub-select to be explicitly aliased as a column,
  // without needing to compile the query in a where.
  as(column) {
    this._single.as = column;
    return this;
  }
  // Adds a single hint or an array of hits to the list of "hintComments" on the query.
  hintComment(hints) {
    hints = Array.isArray(hints) ? hints : [hints];
    if (hints.some((hint) => !isString$3(hint))) {
      throw new Error("Hint comment must be a string");
    }
    if (hints.some((hint) => hint.includes("/*") || hint.includes("*/"))) {
      throw new Error('Hint comment cannot include "/*" or "*/"');
    }
    if (hints.some((hint) => hint.includes("?"))) {
      throw new Error('Hint comment cannot include "?"');
    }
    this._statements.push({
      grouping: "hintComments",
      value: hints
    });
    return this;
  }
  // Prepends the `schemaName` on `tableName` defined by `.table` and `.join`.
  withSchema(schemaName) {
    this._single.schema = schemaName;
    return this;
  }
  // Sets the `tableName` on the query.
  // Alias to "from" for select and "into" for insert statements
  // e.g. builder.insert({a: value}).into('tableName')
  // `options`: options object containing keys:
  //   - `only`: whether the query should use SQL's ONLY to not return
  //           inheriting table data. Defaults to false.
  table(tableName, options = {}) {
    this._single.table = tableName;
    this._single.only = options.only === true;
    return this;
  }
  // Adds a `distinct` clause to the query.
  distinct(...args) {
    this._statements.push({
      grouping: "columns",
      value: normalizeArr$1(...args),
      distinct: true
    });
    return this;
  }
  distinctOn(...args) {
    if (isEmpty$2(args)) {
      throw new Error("distinctOn requires at least on argument");
    }
    this._statements.push({
      grouping: "columns",
      value: normalizeArr$1(...args),
      distinctOn: true
    });
    return this;
  }
  // Adds a join clause to the query, allowing for advanced joins
  // with an anonymous function as the second argument.
  join(table, first2, ...args) {
    let join;
    const schema = table instanceof Builder || typeof table === "function" ? void 0 : this._single.schema;
    const joinType = this._joinType();
    if (typeof first2 === "function") {
      join = new JoinClause$1(table, joinType, schema);
      first2.call(join, join);
    } else if (joinType === "raw") {
      join = new JoinClause$1(this.client.raw(table, first2), "raw");
    } else {
      join = new JoinClause$1(table, joinType, schema);
      if (first2) {
        join.on(first2, ...args);
      }
    }
    this._statements.push(join);
    return this;
  }
  using(tables) {
    throw new Error(
      "'using' function is only available in PostgreSQL dialect with Delete statements."
    );
  }
  // JOIN blocks:
  innerJoin(...args) {
    return this._joinType("inner").join(...args);
  }
  leftJoin(...args) {
    return this._joinType("left").join(...args);
  }
  leftOuterJoin(...args) {
    return this._joinType("left outer").join(...args);
  }
  rightJoin(...args) {
    return this._joinType("right").join(...args);
  }
  rightOuterJoin(...args) {
    return this._joinType("right outer").join(...args);
  }
  outerJoin(...args) {
    return this._joinType("outer").join(...args);
  }
  fullOuterJoin(...args) {
    return this._joinType("full outer").join(...args);
  }
  crossJoin(...args) {
    return this._joinType("cross").join(...args);
  }
  joinRaw(...args) {
    return this._joinType("raw").join(...args);
  }
  // Where modifiers:
  get or() {
    return this._bool("or");
  }
  get not() {
    return this._not(true);
  }
  // The where function can be used in several ways:
  // The most basic is `where(key, value)`, which expands to
  // where key = value.
  where(column, operator2, value) {
    const argsLength = arguments.length;
    if (column === false || column === true) {
      return this.where(1, "=", column ? 1 : 0);
    }
    if (typeof column === "function") {
      return this.whereWrapped(column);
    }
    if (isObject$5(column) && !column.isRawInstance)
      return this._objectWhere(column);
    if (column && column.isRawInstance && argsLength === 1)
      return this.whereRaw(column);
    if (argsLength === 2) {
      value = operator2;
      operator2 = "=";
      if (value === null) {
        return this.whereNull(column);
      }
    }
    const checkOperator = `${operator2}`.toLowerCase().trim();
    if (argsLength === 3) {
      if (checkOperator === "in" || checkOperator === "not in") {
        return this._not(checkOperator === "not in").whereIn(column, value);
      }
      if (checkOperator === "between" || checkOperator === "not between") {
        return this._not(checkOperator === "not between").whereBetween(
          column,
          value
        );
      }
    }
    if (value === null) {
      if (checkOperator === "is" || checkOperator === "is not") {
        return this._not(checkOperator === "is not").whereNull(column);
      }
    }
    this._statements.push({
      grouping: "where",
      type: "whereBasic",
      column,
      operator: operator2,
      value,
      not: this._not(),
      bool: this._bool(),
      asColumn: this._asColumnFlag
    });
    return this;
  }
  whereColumn(...args) {
    this._asColumnFlag = true;
    this.where(...args);
    this._asColumnFlag = false;
    return this;
  }
  // Adds an `or where` clause to the query.
  orWhere(column, ...args) {
    this._bool("or");
    const obj = column;
    if (isObject$5(obj) && !obj.isRawInstance) {
      return this.whereWrapped(function() {
        for (const key in obj) {
          this.andWhere(key, obj[key]);
        }
      });
    }
    return this.where(column, ...args);
  }
  orWhereColumn(column, ...args) {
    this._bool("or");
    const obj = column;
    if (isObject$5(obj) && !obj.isRawInstance) {
      return this.whereWrapped(function() {
        for (const key in obj) {
          this.andWhereColumn(key, "=", obj[key]);
        }
      });
    }
    return this.whereColumn(column, ...args);
  }
  // Adds an `not where` clause to the query.
  whereNot(column, ...args) {
    if (args.length >= 2) {
      if (args[0] === "in" || args[0] === "between") {
        this.client.logger.warn(
          'whereNot is not suitable for "in" and "between" type subqueries. You should use "not in" and "not between" instead.'
        );
      }
    }
    return this._not(true).where(column, ...args);
  }
  whereNotColumn(...args) {
    return this._not(true).whereColumn(...args);
  }
  // Adds an `or not where` clause to the query.
  orWhereNot(...args) {
    return this._bool("or").whereNot(...args);
  }
  orWhereNotColumn(...args) {
    return this._bool("or").whereNotColumn(...args);
  }
  // Processes an object literal provided in a "where" clause.
  _objectWhere(obj) {
    const boolVal = this._bool();
    const notVal = this._not() ? "Not" : "";
    for (const key in obj) {
      this[boolVal + "Where" + notVal](key, obj[key]);
    }
    return this;
  }
  // Adds a raw `where` clause to the query.
  whereRaw(sql, bindings2) {
    const raw2 = sql.isRawInstance ? sql : this.client.raw(sql, bindings2);
    this._statements.push({
      grouping: "where",
      type: "whereRaw",
      value: raw2,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  }
  orWhereRaw(sql, bindings2) {
    return this._bool("or").whereRaw(sql, bindings2);
  }
  // Helper for compiling any advanced `where` queries.
  whereWrapped(callback) {
    this._statements.push({
      grouping: "where",
      type: "whereWrapped",
      value: callback,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  }
  // Adds a `where exists` clause to the query.
  whereExists(callback) {
    this._statements.push({
      grouping: "where",
      type: "whereExists",
      value: callback,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  }
  // Adds an `or where exists` clause to the query.
  orWhereExists(callback) {
    return this._bool("or").whereExists(callback);
  }
  // Adds a `where not exists` clause to the query.
  whereNotExists(callback) {
    return this._not(true).whereExists(callback);
  }
  // Adds a `or where not exists` clause to the query.
  orWhereNotExists(callback) {
    return this._bool("or").whereNotExists(callback);
  }
  // Adds a `where in` clause to the query.
  whereIn(column, values2) {
    if (Array.isArray(values2) && isEmpty$2(values2))
      return this.where(this._not());
    this._statements.push({
      grouping: "where",
      type: "whereIn",
      column,
      value: values2,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  }
  // Adds a `or where in` clause to the query.
  orWhereIn(column, values2) {
    return this._bool("or").whereIn(column, values2);
  }
  // Adds a `where not in` clause to the query.
  whereNotIn(column, values2) {
    return this._not(true).whereIn(column, values2);
  }
  // Adds a `or where not in` clause to the query.
  orWhereNotIn(column, values2) {
    return this._bool("or")._not(true).whereIn(column, values2);
  }
  // Adds a `where null` clause to the query.
  whereNull(column) {
    this._statements.push({
      grouping: "where",
      type: "whereNull",
      column,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  }
  // Adds a `or where null` clause to the query.
  orWhereNull(column) {
    return this._bool("or").whereNull(column);
  }
  // Adds a `where not null` clause to the query.
  whereNotNull(column) {
    return this._not(true).whereNull(column);
  }
  // Adds a `or where not null` clause to the query.
  orWhereNotNull(column) {
    return this._bool("or").whereNotNull(column);
  }
  // Adds a `where between` clause to the query.
  whereBetween(column, values2) {
    assert(
      Array.isArray(values2),
      "The second argument to whereBetween must be an array."
    );
    assert(
      values2.length === 2,
      "You must specify 2 values for the whereBetween clause"
    );
    this._statements.push({
      grouping: "where",
      type: "whereBetween",
      column,
      value: values2,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  }
  // Adds a `where not between` clause to the query.
  whereNotBetween(column, values2) {
    return this._not(true).whereBetween(column, values2);
  }
  // Adds a `or where between` clause to the query.
  orWhereBetween(column, values2) {
    return this._bool("or").whereBetween(column, values2);
  }
  // Adds a `or where not between` clause to the query.
  orWhereNotBetween(column, values2) {
    return this._bool("or").whereNotBetween(column, values2);
  }
  _whereLike(type, column, value) {
    this._statements.push({
      grouping: "where",
      type,
      column,
      value,
      not: this._not(),
      bool: this._bool(),
      asColumn: this._asColumnFlag
    });
    return this;
  }
  // Adds a `where like` clause to the query.
  whereLike(column, value) {
    return this._whereLike("whereLike", column, value);
  }
  // Adds a `or where like` clause to the query.
  orWhereLike(column, value) {
    return this._bool("or")._whereLike("whereLike", column, value);
  }
  // Adds a `where ilike` clause to the query.
  whereILike(column, value) {
    return this._whereLike("whereILike", column, value);
  }
  // Adds a `or where ilike` clause to the query.
  orWhereILike(column, value) {
    return this._bool("or")._whereLike("whereILike", column, value);
  }
  // Adds a `group by` clause to the query.
  groupBy(item) {
    if (item && item.isRawInstance) {
      return this.groupByRaw.apply(this, arguments);
    }
    this._statements.push({
      grouping: "group",
      type: "groupByBasic",
      value: normalizeArr$1(...arguments)
    });
    return this;
  }
  // Adds a raw `group by` clause to the query.
  groupByRaw(sql, bindings2) {
    const raw2 = sql.isRawInstance ? sql : this.client.raw(sql, bindings2);
    this._statements.push({
      grouping: "group",
      type: "groupByRaw",
      value: raw2
    });
    return this;
  }
  // Adds a `order by` clause to the query.
  orderBy(column, direction2, nulls = "") {
    if (Array.isArray(column)) {
      return this._orderByArray(column);
    }
    this._statements.push({
      grouping: "order",
      type: "orderByBasic",
      value: column,
      direction: direction2,
      nulls
    });
    return this;
  }
  // Adds a `order by` with multiple columns to the query.
  _orderByArray(columnDefs) {
    for (let i = 0; i < columnDefs.length; i++) {
      const columnInfo = columnDefs[i];
      if (isObject$5(columnInfo)) {
        this._statements.push({
          grouping: "order",
          type: "orderByBasic",
          value: columnInfo["column"],
          direction: columnInfo["order"],
          nulls: columnInfo["nulls"]
        });
      } else if (isString$3(columnInfo) || isNumber$1(columnInfo)) {
        this._statements.push({
          grouping: "order",
          type: "orderByBasic",
          value: columnInfo
        });
      }
    }
    return this;
  }
  // Add a raw `order by` clause to the query.
  orderByRaw(sql, bindings2) {
    const raw2 = sql.isRawInstance ? sql : this.client.raw(sql, bindings2);
    this._statements.push({
      grouping: "order",
      type: "orderByRaw",
      value: raw2
    });
    return this;
  }
  _union(clause, args) {
    let callbacks = args[0];
    let wrap2 = args[1];
    if (args.length === 1 || args.length === 2 && isBoolean(wrap2)) {
      if (!Array.isArray(callbacks)) {
        callbacks = [callbacks];
      }
      for (let i = 0, l = callbacks.length; i < l; i++) {
        this._statements.push({
          grouping: "union",
          clause,
          value: callbacks[i],
          wrap: wrap2 || false
        });
      }
    } else {
      callbacks = toArray$3(args).slice(0, args.length - 1);
      wrap2 = args[args.length - 1];
      if (!isBoolean(wrap2)) {
        callbacks.push(wrap2);
        wrap2 = false;
      }
      this._union(clause, [callbacks, wrap2]);
    }
    return this;
  }
  // Add a union statement to the query.
  union(...args) {
    return this._union("union", args);
  }
  // Adds a union all statement to the query.
  unionAll(...args) {
    return this._union("union all", args);
  }
  intersect(...args) {
    return this._union("intersect", args);
  }
  except(...args) {
    return this._union("except", args);
  }
  // Adds a `having` clause to the query.
  having(column, operator2, value) {
    if (column.isRawInstance && arguments.length === 1) {
      return this.havingRaw(column);
    }
    if (typeof column === "function") {
      return this.havingWrapped(column);
    }
    this._statements.push({
      grouping: "having",
      type: "havingBasic",
      column,
      operator: operator2,
      value,
      bool: this._bool(),
      not: this._not()
    });
    return this;
  }
  orHaving(column, ...args) {
    this._bool("or");
    const obj = column;
    if (isObject$5(obj) && !obj.isRawInstance) {
      return this.havingWrapped(function() {
        for (const key in obj) {
          this.andHaving(key, obj[key]);
        }
      });
    }
    return this.having(column, ...args);
  }
  // Helper for compiling any advanced `having` queries.
  havingWrapped(callback) {
    this._statements.push({
      grouping: "having",
      type: "havingWrapped",
      value: callback,
      bool: this._bool(),
      not: this._not()
    });
    return this;
  }
  havingNull(column) {
    this._statements.push({
      grouping: "having",
      type: "havingNull",
      column,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  }
  orHavingNull(callback) {
    return this._bool("or").havingNull(callback);
  }
  havingNotNull(callback) {
    return this._not(true).havingNull(callback);
  }
  orHavingNotNull(callback) {
    return this._not(true)._bool("or").havingNull(callback);
  }
  havingExists(callback) {
    this._statements.push({
      grouping: "having",
      type: "havingExists",
      value: callback,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  }
  orHavingExists(callback) {
    return this._bool("or").havingExists(callback);
  }
  havingNotExists(callback) {
    return this._not(true).havingExists(callback);
  }
  orHavingNotExists(callback) {
    return this._not(true)._bool("or").havingExists(callback);
  }
  havingBetween(column, values2) {
    assert(
      Array.isArray(values2),
      "The second argument to havingBetween must be an array."
    );
    assert(
      values2.length === 2,
      "You must specify 2 values for the havingBetween clause"
    );
    this._statements.push({
      grouping: "having",
      type: "havingBetween",
      column,
      value: values2,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  }
  orHavingBetween(column, values2) {
    return this._bool("or").havingBetween(column, values2);
  }
  havingNotBetween(column, values2) {
    return this._not(true).havingBetween(column, values2);
  }
  orHavingNotBetween(column, values2) {
    return this._not(true)._bool("or").havingBetween(column, values2);
  }
  havingIn(column, values2) {
    if (Array.isArray(values2) && isEmpty$2(values2))
      return this.where(this._not());
    this._statements.push({
      grouping: "having",
      type: "havingIn",
      column,
      value: values2,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  }
  // Adds a `or where in` clause to the query.
  orHavingIn(column, values2) {
    return this._bool("or").havingIn(column, values2);
  }
  // Adds a `where not in` clause to the query.
  havingNotIn(column, values2) {
    return this._not(true).havingIn(column, values2);
  }
  // Adds a `or where not in` clause to the query.
  orHavingNotIn(column, values2) {
    return this._bool("or")._not(true).havingIn(column, values2);
  }
  // Adds a raw `having` clause to the query.
  havingRaw(sql, bindings2) {
    const raw2 = sql.isRawInstance ? sql : this.client.raw(sql, bindings2);
    this._statements.push({
      grouping: "having",
      type: "havingRaw",
      value: raw2,
      bool: this._bool(),
      not: this._not()
    });
    return this;
  }
  orHavingRaw(sql, bindings2) {
    return this._bool("or").havingRaw(sql, bindings2);
  }
  // set the skip binding parameter (= insert the raw value in the query) for an attribute.
  _setSkipBinding(attribute, options) {
    let skipBinding = options;
    if (isObject$5(options)) {
      skipBinding = options.skipBinding;
    }
    this._single.skipBinding = this._single.skipBinding || {};
    this._single.skipBinding[attribute] = skipBinding;
  }
  // Only allow a single "offset" to be set for the current query.
  offset(value, options) {
    if (value == null || value.isRawInstance || value instanceof Builder) {
      this._single.offset = value;
    } else {
      const val = parseInt(value, 10);
      if (isNaN(val)) {
        this.client.logger.warn("A valid integer must be provided to offset");
      } else if (val < 0) {
        throw new Error(`A non-negative integer must be provided to offset.`);
      } else {
        this._single.offset = val;
      }
    }
    this._setSkipBinding("offset", options);
    return this;
  }
  // Only allow a single "limit" to be set for the current query.
  limit(value, options) {
    const val = parseInt(value, 10);
    if (isNaN(val)) {
      this.client.logger.warn("A valid integer must be provided to limit");
    } else {
      this._single.limit = val;
      this._setSkipBinding("limit", options);
    }
    return this;
  }
  // Retrieve the "count" result of the query.
  count(column, options) {
    return this._aggregate("count", column || "*", options);
  }
  // Retrieve the minimum value of a given column.
  min(column, options) {
    return this._aggregate("min", column, options);
  }
  // Retrieve the maximum value of a given column.
  max(column, options) {
    return this._aggregate("max", column, options);
  }
  // Retrieve the sum of the values of a given column.
  sum(column, options) {
    return this._aggregate("sum", column, options);
  }
  // Retrieve the average of the values of a given column.
  avg(column, options) {
    return this._aggregate("avg", column, options);
  }
  // Retrieve the "count" of the distinct results of the query.
  countDistinct(...columns) {
    let options;
    if (columns.length > 1 && isPlainObject$2(last(columns))) {
      [options] = columns.splice(columns.length - 1, 1);
    }
    if (!columns.length) {
      columns = "*";
    } else if (columns.length === 1) {
      columns = columns[0];
    }
    return this._aggregate("count", columns, { ...options, distinct: true });
  }
  // Retrieve the sum of the distinct values of a given column.
  sumDistinct(column, options) {
    return this._aggregate("sum", column, { ...options, distinct: true });
  }
  // Retrieve the vg of the distinct results of the query.
  avgDistinct(column, options) {
    return this._aggregate("avg", column, { ...options, distinct: true });
  }
  // Increments a column's value by the specified amount.
  increment(column, amount = 1) {
    if (isObject$5(column)) {
      for (const key in column) {
        this._counter(key, column[key]);
      }
      return this;
    }
    return this._counter(column, amount);
  }
  // Decrements a column's value by the specified amount.
  decrement(column, amount = 1) {
    if (isObject$5(column)) {
      for (const key in column) {
        this._counter(key, -column[key]);
      }
      return this;
    }
    return this._counter(column, -amount);
  }
  // Clears increments/decrements
  clearCounters() {
    this._single.counter = {};
    return this;
  }
  // Sets the values for a `select` query, informing that only the first
  // row should be returned (limit 1).
  first(...args) {
    if (this._method && this._method !== "select") {
      throw new Error(`Cannot chain .first() on "${this._method}" query`);
    }
    this.select(normalizeArr$1(...args));
    this._method = "first";
    this.limit(1);
    return this;
  }
  // Use existing connection to execute the query
  // Same value that client.acquireConnection() for an according client returns should be passed
  connection(_connection) {
    this._connection = _connection;
    this.client.processPassedConnection(_connection);
    return this;
  }
  // Pluck a column from a query.
  pluck(column) {
    if (this._method && this._method !== "select") {
      throw new Error(`Cannot chain .pluck() on "${this._method}" query`);
    }
    this._method = "pluck";
    this._single.pluck = column;
    this._statements.push({
      grouping: "columns",
      type: "pluck",
      value: column
    });
    return this;
  }
  // Deprecated. Remove everything from select clause
  clearSelect() {
    this._clearGrouping("columns");
    return this;
  }
  // Deprecated. Remove everything from where clause
  clearWhere() {
    this._clearGrouping("where");
    return this;
  }
  // Deprecated. Remove everything from group clause
  clearGroup() {
    this._clearGrouping("group");
    return this;
  }
  // Deprecated. Remove everything from order clause
  clearOrder() {
    this._clearGrouping("order");
    return this;
  }
  // Deprecated. Remove everything from having clause
  clearHaving() {
    this._clearGrouping("having");
    return this;
  }
  // Remove everything from statement clause
  clear(statement) {
    if (!CLEARABLE_STATEMENTS.has(statement))
      throw new Error(`Knex Error: unknown statement '${statement}'`);
    if (statement.startsWith("counter")) return this.clearCounters();
    if (statement === "select") {
      statement = "columns";
    }
    this._clearGrouping(statement);
    return this;
  }
  // Insert & Update
  // ------
  // Sets the values for an `insert` query.
  insert(values2, returning, options) {
    this._method = "insert";
    if (!isEmpty$2(returning)) this.returning(returning, options);
    this._single.insert = values2;
    return this;
  }
  // Sets the values for an `update`, allowing for both
  // `.update(key, value, [returning])` and `.update(obj, [returning])` syntaxes.
  update(values2, returning, options) {
    let ret;
    const obj = this._single.update || {};
    this._method = "update";
    if (isString$3(values2)) {
      if (isPlainObject$2(returning)) {
        obj[values2] = JSON.stringify(returning);
      } else {
        obj[values2] = returning;
      }
      if (arguments.length > 2) {
        ret = arguments[2];
      }
    } else {
      const keys2 = Object.keys(values2);
      if (this._single.update) {
        this.client.logger.warn("Update called multiple times with objects.");
      }
      let i = -1;
      while (++i < keys2.length) {
        obj[keys2[i]] = values2[keys2[i]];
      }
      ret = arguments[1];
    }
    if (!isEmpty$2(ret)) this.returning(ret, options);
    this._single.update = obj;
    return this;
  }
  // Sets the returning value for the query.
  returning(returning, options) {
    this._single.returning = returning;
    this._single.options = options;
    return this;
  }
  onConflict(columns) {
    if (typeof columns === "string") {
      columns = [columns];
    }
    return new OnConflictBuilder(this, columns || true);
  }
  // Delete
  // ------
  // Executes a delete statement on the query;
  delete(ret, options) {
    this._method = "del";
    if (!isEmpty$2(ret)) this.returning(ret, options);
    return this;
  }
  // Truncates a table, ends the query chain.
  truncate(tableName) {
    this._method = "truncate";
    if (tableName) {
      this._single.table = tableName;
    }
    return this;
  }
  // Retrieves columns for the table specified by `knex(tableName)`
  columnInfo(column) {
    this._method = "columnInfo";
    this._single.columnInfo = column;
    return this;
  }
  // Set a lock for update constraint.
  forUpdate(...tables) {
    this._single.lock = lockMode.forUpdate;
    if (tables.length === 1 && Array.isArray(tables[0])) {
      this._single.lockTables = tables[0];
    } else {
      this._single.lockTables = tables;
    }
    return this;
  }
  // Set a lock for share constraint.
  forShare(...tables) {
    this._single.lock = lockMode.forShare;
    this._single.lockTables = tables;
    return this;
  }
  // Set a lock for no key update constraint.
  forNoKeyUpdate(...tables) {
    this._single.lock = lockMode.forNoKeyUpdate;
    this._single.lockTables = tables;
    return this;
  }
  // Set a lock for key share constraint.
  forKeyShare(...tables) {
    this._single.lock = lockMode.forKeyShare;
    this._single.lockTables = tables;
    return this;
  }
  // Skips locked rows when using a lock constraint.
  skipLocked() {
    if (!this._isSelectQuery()) {
      throw new Error(`Cannot chain .skipLocked() on "${this._method}" query!`);
    }
    if (!this._hasLockMode()) {
      throw new Error(
        ".skipLocked() can only be used after a call to .forShare() or .forUpdate()!"
      );
    }
    if (this._single.waitMode === waitMode.noWait) {
      throw new Error(".skipLocked() cannot be used together with .noWait()!");
    }
    this._single.waitMode = waitMode.skipLocked;
    return this;
  }
  // Causes error when acessing a locked row instead of waiting for it to be released.
  noWait() {
    if (!this._isSelectQuery()) {
      throw new Error(`Cannot chain .noWait() on "${this._method}" query!`);
    }
    if (!this._hasLockMode()) {
      throw new Error(
        ".noWait() can only be used after a call to .forShare() or .forUpdate()!"
      );
    }
    if (this._single.waitMode === waitMode.skipLocked) {
      throw new Error(".noWait() cannot be used together with .skipLocked()!");
    }
    this._single.waitMode = waitMode.noWait;
    return this;
  }
  // Takes a JS object of methods to call and calls them
  fromJS(obj) {
    each$1(obj, (val, key) => {
      if (typeof this[key] !== "function") {
        this.client.logger.warn(`Knex Error: unknown key ${key}`);
      }
      if (Array.isArray(val)) {
        this[key].apply(this, val);
      } else {
        this[key](val);
      }
    });
    return this;
  }
  fromRaw(sql, bindings2) {
    const raw2 = sql.isRawInstance ? sql : this.client.raw(sql, bindings2);
    return this.from(raw2);
  }
  // Passes query to provided callback function, useful for e.g. composing
  // domain-specific helpers
  modify(callback) {
    callback.apply(this, [this].concat(tail$3(arguments)));
    return this;
  }
  upsert(values2, returning, options) {
    throw new Error(
      `Upsert is not yet supported for dialect ${this.client.dialect}`
    );
  }
  // JSON support functions
  _json(nameFunction, params) {
    this._statements.push({
      grouping: "columns",
      type: "json",
      method: nameFunction,
      params
    });
    return this;
  }
  jsonExtract() {
    const column = arguments[0];
    let path2;
    let alias;
    let singleValue = true;
    if (arguments.length >= 2) {
      path2 = arguments[1];
    }
    if (arguments.length >= 3) {
      alias = arguments[2];
    }
    if (arguments.length === 4) {
      singleValue = arguments[3];
    }
    if (arguments.length === 2 && Array.isArray(arguments[0]) && isBoolean(arguments[1])) {
      singleValue = arguments[1];
    }
    return this._json("jsonExtract", {
      column,
      path: path2,
      alias,
      singleValue
      // boolean used only in MSSQL to use function for extract value instead of object/array.
    });
  }
  jsonSet(column, path2, value, alias) {
    return this._json("jsonSet", {
      column,
      path: path2,
      value,
      alias
    });
  }
  jsonInsert(column, path2, value, alias) {
    return this._json("jsonInsert", {
      column,
      path: path2,
      value,
      alias
    });
  }
  jsonRemove(column, path2, alias) {
    return this._json("jsonRemove", {
      column,
      path: path2,
      alias
    });
  }
  // Wheres for JSON
  _isJsonObject(jsonValue) {
    return isObject$5(jsonValue) && !(jsonValue instanceof Builder);
  }
  _whereJsonWrappedValue(type, column, value) {
    const whereJsonClause = {
      grouping: "where",
      type,
      column,
      value,
      not: this._not(),
      bool: this._bool(),
      asColumn: this._asColumnFlag
    };
    if (arguments[3]) {
      whereJsonClause.operator = arguments[3];
    }
    if (arguments[4]) {
      whereJsonClause.jsonPath = arguments[4];
    }
    this._statements.push(whereJsonClause);
  }
  whereJsonObject(column, value) {
    this._whereJsonWrappedValue("whereJsonObject", column, value);
    return this;
  }
  orWhereJsonObject(column, value) {
    return this._bool("or").whereJsonObject(column, value);
  }
  whereNotJsonObject(column, value) {
    return this._not(true).whereJsonObject(column, value);
  }
  orWhereNotJsonObject(column, value) {
    return this._bool("or").whereNotJsonObject(column, value);
  }
  whereJsonPath(column, path2, operator2, value) {
    this._whereJsonWrappedValue("whereJsonPath", column, value, operator2, path2);
    return this;
  }
  orWhereJsonPath(column, path2, operator2, value) {
    return this._bool("or").whereJsonPath(column, path2, operator2, value);
  }
  // Json superset wheres
  whereJsonSupersetOf(column, value) {
    this._whereJsonWrappedValue("whereJsonSupersetOf", column, value);
    return this;
  }
  whereJsonNotSupersetOf(column, value) {
    return this._not(true).whereJsonSupersetOf(column, value);
  }
  orWhereJsonSupersetOf(column, value) {
    return this._bool("or").whereJsonSupersetOf(column, value);
  }
  orWhereJsonNotSupersetOf(column, value) {
    return this._bool("or").whereJsonNotSupersetOf(column, value);
  }
  // Json subset wheres
  whereJsonSubsetOf(column, value) {
    this._whereJsonWrappedValue("whereJsonSubsetOf", column, value);
    return this;
  }
  whereJsonNotSubsetOf(column, value) {
    return this._not(true).whereJsonSubsetOf(column, value);
  }
  orWhereJsonSubsetOf(column, value) {
    return this._bool("or").whereJsonSubsetOf(column, value);
  }
  orWhereJsonNotSubsetOf(column, value) {
    return this._bool("or").whereJsonNotSubsetOf(column, value);
  }
  whereJsonHasNone(column, values2) {
    this._not(true).whereJsonHasAll(column, values2);
    return this;
  }
  // end of wheres for JSON
  _analytic(alias, second, third) {
    let analytic2;
    const { schema } = this._single;
    const method = this._analyticMethod();
    alias = typeof alias === "string" ? alias : null;
    assert(
      typeof second === "function" || second.isRawInstance || Array.isArray(second) || typeof second === "string" || typeof second === "object",
      `The second argument to an analytic function must be either a function, a raw,
       an array of string or object, an object or a single string.`
    );
    if (third) {
      assert(
        Array.isArray(third) || typeof third === "string" || typeof third === "object",
        "The third argument to an analytic function must be either a string, an array of string or object or an object."
      );
    }
    if (isFunction$2(second)) {
      analytic2 = new Analytic2(method, schema, alias);
      second.call(analytic2, analytic2);
    } else if (second.isRawInstance) {
      const raw2 = second;
      analytic2 = {
        grouping: "columns",
        type: "analytic",
        method,
        raw: raw2,
        alias
      };
    } else {
      const order = !Array.isArray(second) ? [second] : second;
      let partitions = third || [];
      partitions = !Array.isArray(partitions) ? [partitions] : partitions;
      analytic2 = {
        grouping: "columns",
        type: "analytic",
        method,
        order,
        alias,
        partitions
      };
    }
    this._statements.push(analytic2);
    return this;
  }
  rank(...args) {
    return this._analyticMethod("rank")._analytic(...args);
  }
  denseRank(...args) {
    return this._analyticMethod("dense_rank")._analytic(...args);
  }
  rowNumber(...args) {
    return this._analyticMethod("row_number")._analytic(...args);
  }
  // ----------------------------------------------------------------------
  // Helper for the incrementing/decrementing queries.
  _counter(column, amount) {
    amount = parseFloat(amount);
    this._method = "update";
    this._single.counter = this._single.counter || {};
    this._single.counter[column] = amount;
    return this;
  }
  // Helper to get or set the "boolFlag" value.
  _bool(val) {
    if (arguments.length === 1) {
      this._boolFlag = val;
      return this;
    }
    const ret = this._boolFlag;
    this._boolFlag = "and";
    return ret;
  }
  // Helper to get or set the "notFlag" value.
  _not(val) {
    if (arguments.length === 1) {
      this._notFlag = val;
      return this;
    }
    const ret = this._notFlag;
    this._notFlag = false;
    return ret;
  }
  // Helper to get or set the "joinFlag" value.
  _joinType(val) {
    if (arguments.length === 1) {
      this._joinFlag = val;
      return this;
    }
    const ret = this._joinFlag || "inner";
    this._joinFlag = "inner";
    return ret;
  }
  _analyticMethod(val) {
    if (arguments.length === 1) {
      this._analyticFlag = val;
      return this;
    }
    return this._analyticFlag || "row_number";
  }
  // Helper for compiling any aggregate queries.
  _aggregate(method, column, options = {}) {
    this._statements.push({
      grouping: "columns",
      type: column.isRawInstance ? "aggregateRaw" : "aggregate",
      method,
      value: column,
      aggregateDistinct: options.distinct || false,
      alias: options.as
    });
    return this;
  }
  // Helper function for clearing or reseting a grouping type from the builder
  _clearGrouping(grouping) {
    if (grouping in this._single) {
      this._single[grouping] = void 0;
    } else {
      this._statements = reject(this._statements, { grouping });
    }
  }
  // Helper function that checks if the builder will emit a select query
  _isSelectQuery() {
    return SELECT_COMMANDS.has(this._method);
  }
  // Helper function that checks if the query has a lock mode set
  _hasLockMode() {
    return LOCK_MODES.has(this._single.lock);
  }
}
Builder.prototype.select = Builder.prototype.columns;
Builder.prototype.column = Builder.prototype.columns;
Builder.prototype.andWhereNot = Builder.prototype.whereNot;
Builder.prototype.andWhereNotColumn = Builder.prototype.whereNotColumn;
Builder.prototype.andWhere = Builder.prototype.where;
Builder.prototype.andWhereColumn = Builder.prototype.whereColumn;
Builder.prototype.andWhereRaw = Builder.prototype.whereRaw;
Builder.prototype.andWhereBetween = Builder.prototype.whereBetween;
Builder.prototype.andWhereNotBetween = Builder.prototype.whereNotBetween;
Builder.prototype.andWhereJsonObject = Builder.prototype.whereJsonObject;
Builder.prototype.andWhereNotJsonObject = Builder.prototype.whereNotJsonObject;
Builder.prototype.andWhereJsonPath = Builder.prototype.whereJsonPath;
Builder.prototype.andWhereLike = Builder.prototype.whereLike;
Builder.prototype.andWhereILike = Builder.prototype.whereILike;
Builder.prototype.andHaving = Builder.prototype.having;
Builder.prototype.andHavingIn = Builder.prototype.havingIn;
Builder.prototype.andHavingNotIn = Builder.prototype.havingNotIn;
Builder.prototype.andHavingNull = Builder.prototype.havingNull;
Builder.prototype.andHavingNotNull = Builder.prototype.havingNotNull;
Builder.prototype.andHavingExists = Builder.prototype.havingExists;
Builder.prototype.andHavingNotExists = Builder.prototype.havingNotExists;
Builder.prototype.andHavingBetween = Builder.prototype.havingBetween;
Builder.prototype.andHavingNotBetween = Builder.prototype.havingNotBetween;
Builder.prototype.from = Builder.prototype.table;
Builder.prototype.into = Builder.prototype.table;
Builder.prototype.del = Builder.prototype.delete;
augmentWithBuilderInterface$2(Builder);
addQueryContext$2(Builder);
Builder.extend = (methodName, fn) => {
  if (Object.prototype.hasOwnProperty.call(Builder.prototype, methodName)) {
    throw new Error(
      `Can't extend QueryBuilder with existing method ('${methodName}').`
    );
  }
  assign$6(Builder.prototype, { [methodName]: fn });
};
class OnConflictBuilder {
  constructor(builder2, columns) {
    this.builder = builder2;
    this._columns = columns;
  }
  // Sets insert query to ignore conflicts
  ignore() {
    this.builder._single.onConflict = this._columns;
    this.builder._single.ignore = true;
    return this.builder;
  }
  // Sets insert query to update on conflict
  merge(updates) {
    this.builder._single.onConflict = this._columns;
    this.builder._single.merge = { updates };
    return this.builder;
  }
  // Prevent
  then() {
    throw new Error(
      "Incomplete onConflict clause. .onConflict() must be directly followed by either .merge() or .ignore()"
    );
  }
}
var querybuilder = Builder;
function arrayReduce$1(array, iteratee, accumulator, initAccum) {
  var index = -1, length = array == null ? 0 : array.length;
  if (initAccum && length) {
    accumulator = array[++index];
  }
  while (++index < length) {
    accumulator = iteratee(accumulator, array[index], index, array);
  }
  return accumulator;
}
var _arrayReduce = arrayReduce$1;
function baseReduce$1(collection, iteratee, accumulator, initAccum, eachFunc) {
  eachFunc(collection, function(value, index, collection2) {
    accumulator = initAccum ? (initAccum = false, value) : iteratee(accumulator, value, index, collection2);
  });
  return accumulator;
}
var _baseReduce = baseReduce$1;
var arrayReduce = _arrayReduce, baseEach$1 = _baseEach, baseIteratee$5 = _baseIteratee, baseReduce = _baseReduce, isArray$3 = isArray_1;
function reduce$2(collection, iteratee, accumulator) {
  var func = isArray$3(collection) ? arrayReduce : baseReduce, initAccum = arguments.length < 3;
  return func(collection, baseIteratee$5(iteratee), accumulator, initAccum, baseEach$1);
}
var reduce_1 = reduce$2;
var arrayEach = _arrayEach, baseCreate = _baseCreate, baseForOwn = _baseForOwn, baseIteratee$4 = _baseIteratee, getPrototype = _getPrototype, isArray$2 = isArray_1, isBuffer = isBufferExports, isFunction$1 = isFunction_1, isObject$4 = isObject_1, isTypedArray = isTypedArray_1;
function transform$1(object, iteratee, accumulator) {
  var isArr = isArray$2(object), isArrLike = isArr || isBuffer(object) || isTypedArray(object);
  iteratee = baseIteratee$4(iteratee);
  if (accumulator == null) {
    var Ctor = object && object.constructor;
    if (isArrLike) {
      accumulator = isArr ? new Ctor() : [];
    } else if (isObject$4(object)) {
      accumulator = isFunction$1(Ctor) ? baseCreate(getPrototype(object)) : {};
    } else {
      accumulator = {};
    }
  }
  (isArrLike ? arrayEach : baseForOwn)(object, function(value, index, object2) {
    return iteratee(accumulator, value, index, object2);
  });
  return accumulator;
}
var transform_1 = transform$1;
const { isObject: isObject$3 } = is;
function compileCallback$2(callback, method, client2, bindingsHolder) {
  const builder2 = client2.queryBuilder();
  callback.call(builder2, builder2);
  const compiler2 = client2.queryCompiler(builder2, bindingsHolder.bindings);
  return compiler2.toSQL(method || builder2._method || "select");
}
function wrapAsIdentifier$1(value, builder2, client2) {
  const queryContext = builder2.queryContext();
  return client2.wrapIdentifier((value || "").trim(), queryContext);
}
function formatDefault$1(value, type, client2) {
  if (value === void 0) {
    return "";
  } else if (value === null) {
    return "null";
  } else if (value && value.isRawInstance) {
    return value.toQuery();
  } else if (type === "bool") {
    if (value === "false") value = 0;
    return `'${value ? 1 : 0}'`;
  } else if ((type === "json" || type === "jsonb") && isObject$3(value)) {
    return `'${JSON.stringify(value)}'`;
  } else {
    return client2._escapeBinding(value.toString());
  }
}
var formatterUtils = {
  compileCallback: compileCallback$2,
  wrapAsIdentifier: wrapAsIdentifier$1,
  formatDefault: formatDefault$1
};
const transform = transform_1;
const QueryBuilder$3 = querybuilder;
const { compileCallback: compileCallback$1, wrapAsIdentifier } = formatterUtils;
const orderBys = ["asc", "desc"];
const operators = transform(
  [
    "=",
    "<",
    ">",
    "<=",
    "<=>",
    ">=",
    "<>",
    "!=",
    "like",
    "not like",
    "between",
    "not between",
    "ilike",
    "not ilike",
    "exists",
    "not exist",
    "rlike",
    "not rlike",
    "regexp",
    "not regexp",
    "match",
    "similar to",
    "not similar to",
    "&",
    "|",
    "^",
    "<<",
    ">>",
    "~",
    "~=",
    "~*",
    "!~",
    "!~*",
    "#",
    "&&",
    "@>",
    "<@",
    "||",
    "&<",
    "&>",
    "-|-",
    "@@",
    "!!",
    ["?", "\\?"],
    ["?|", "\\?|"],
    ["?&", "\\?&"]
  ],
  (result, key) => {
    if (Array.isArray(key)) {
      result[key[0]] = key[1];
    } else {
      result[key] = key;
    }
  },
  {}
);
function columnize$1(target, builder2, client2, bindingHolder) {
  if (!Array.isArray(target)) {
    return wrap(target, void 0, builder2, client2, bindingHolder);
  }
  const columns = target;
  let str = "", i = -1;
  while (++i < columns.length) {
    if (i > 0) str += ", ";
    str += wrap(columns[i], void 0, builder2, client2, bindingHolder);
  }
  return str;
}
function wrap(value, isParameter, builder2, client2, bindingHolder) {
  const raw2 = unwrapRaw$1(value, isParameter, builder2, client2, bindingHolder);
  if (raw2) return raw2;
  switch (typeof value) {
    case "function":
      return outputQuery$1(
        compileCallback$1(value, void 0, client2, bindingHolder),
        true,
        builder2,
        client2
      );
    case "object":
      return parseObject(value, builder2, client2, bindingHolder);
    case "number":
      return value;
    default:
      return wrapString(value + "", builder2, client2);
  }
}
function unwrapRaw$1(value, isParameter, builder2, client2, bindingsHolder) {
  let query;
  if (value instanceof QueryBuilder$3) {
    query = client2.queryCompiler(value).toSQL();
    if (query.bindings) {
      bindingsHolder.bindings.push(...query.bindings);
    }
    return outputQuery$1(query, isParameter, builder2, client2);
  }
  if (value && value.isRawInstance) {
    value.client = client2;
    if (builder2._queryContext) {
      value.queryContext = () => {
        return builder2._queryContext;
      };
    }
    query = value.toSQL();
    if (query.bindings) {
      bindingsHolder.bindings.push(...query.bindings);
    }
    return query.sql;
  }
  if (isParameter) {
    bindingsHolder.bindings.push(value);
  }
}
function operator(value, builder2, client2, bindingsHolder) {
  const raw2 = unwrapRaw$1(value, void 0, builder2, client2, bindingsHolder);
  if (raw2) return raw2;
  const operator2 = operators[(value || "").toLowerCase()];
  if (!operator2) {
    throw new TypeError(`The operator "${value}" is not permitted`);
  }
  return operator2;
}
function getAliasSeparatorIndex(value) {
  let i = -1;
  while ((i = value.indexOf(" ", i + 1)) !== -1) {
    if (i + 3 < value.length && (value.charCodeAt(i + 1) | 32) === 97 && (value.charCodeAt(i + 2) | 32) === 115 && value.charCodeAt(i + 3) === 32) {
      return i;
    }
  }
  return -1;
}
function wrapString(value, builder2, client2) {
  const asIndex = getAliasSeparatorIndex(value);
  if (asIndex !== -1) {
    const first2 = value.slice(0, asIndex);
    const second = value.slice(asIndex + 4);
    return client2.alias(
      wrapString(first2, builder2, client2),
      wrapAsIdentifier(second, builder2, client2)
    );
  }
  let segmentStart = 0;
  let dotIndex = value.indexOf(".");
  if (dotIndex === -1) {
    return wrapAsIdentifier(value, builder2, client2);
  }
  let wrapped = "";
  let i = 0;
  while (dotIndex !== -1) {
    const segment = value.slice(segmentStart, dotIndex);
    if (i > 0) wrapped += ".";
    wrapped += i === 0 ? wrapString((segment || "").trim(), builder2, client2) : wrapAsIdentifier(segment, builder2, client2);
    segmentStart = dotIndex + 1;
    dotIndex = value.indexOf(".", segmentStart);
    i++;
  }
  return `${wrapped}.${wrapAsIdentifier(
    value.slice(segmentStart),
    builder2,
    client2
  )}`;
}
function parseObject(obj, builder2, client2, formatter2) {
  const ret = [];
  for (const alias in obj) {
    const queryOrIdentifier = obj[alias];
    if (typeof queryOrIdentifier === "function") {
      const compiled = compileCallback$1(
        queryOrIdentifier,
        void 0,
        client2,
        formatter2
      );
      compiled.as = alias;
      ret.push(outputQuery$1(compiled, true, builder2, client2));
    } else if (queryOrIdentifier instanceof QueryBuilder$3) {
      ret.push(
        client2.alias(
          `(${wrap(queryOrIdentifier, void 0, builder2, client2, formatter2)})`,
          wrapAsIdentifier(alias, builder2, client2)
        )
      );
    } else {
      ret.push(
        client2.alias(
          wrap(queryOrIdentifier, void 0, builder2, client2, formatter2),
          wrapAsIdentifier(alias, builder2, client2)
        )
      );
    }
  }
  return ret.join(", ");
}
function outputQuery$1(compiled, isParameter, builder2, client2) {
  let sql = compiled.sql || "";
  if (sql) {
    if ((compiled.method === "select" || compiled.method === "first") && (isParameter || compiled.as)) {
      sql = `(${sql})`;
      if (compiled.as)
        return client2.alias(sql, wrapString(compiled.as, builder2, client2));
    }
  }
  return sql;
}
function rawOrFn(value, method, builder2, client2, bindingHolder) {
  if (typeof value === "function") {
    return outputQuery$1(
      compileCallback$1(value, method, client2, bindingHolder),
      void 0,
      builder2,
      client2
    );
  }
  return unwrapRaw$1(value, void 0, builder2, client2, bindingHolder) || "";
}
function direction(value, builder2, client2, bindingsHolder) {
  const raw2 = unwrapRaw$1(value, void 0, builder2, client2, bindingsHolder);
  if (raw2) return raw2;
  return orderBys.indexOf((value || "").toLowerCase()) !== -1 ? value : "asc";
}
var wrappingFormatter = {
  columnize: columnize$1,
  direction,
  operator,
  outputQuery: outputQuery$1,
  rawOrFn,
  unwrapRaw: unwrapRaw$1,
  wrap,
  wrapString
};
const { columnize } = wrappingFormatter;
function replaceRawArrBindings$1(raw2, client2) {
  const bindingsHolder = {
    bindings: []
  };
  const builder2 = raw2;
  const expectedBindings = raw2.bindings.length;
  const values2 = raw2.bindings;
  let index = 0;
  const sql = raw2.sql.replace(/\\?\?\??/g, function(match) {
    if (match === "\\?") {
      return match;
    }
    const value = values2[index++];
    if (match === "??") {
      return columnize(value, builder2, client2, bindingsHolder);
    }
    return client2.parameter(value, builder2, bindingsHolder);
  });
  if (expectedBindings !== index) {
    throw new Error(`Expected ${expectedBindings} bindings, saw ${index}`);
  }
  return {
    method: "raw",
    sql,
    bindings: bindingsHolder.bindings
  };
}
function replaceKeyBindings$1(raw2, client2) {
  const bindingsHolder = {
    bindings: []
  };
  const builder2 = raw2;
  const values2 = raw2.bindings;
  const regex = /\\?(:(\w+):(?=::)|:(\w+):(?!:)|:(\w+))/g;
  const sql = raw2.sql.replace(regex, function(match, p1, p2, p3, p4) {
    if (match !== p1) {
      return p1;
    }
    const part = p2 || p3 || p4;
    const key = match.trim();
    const isIdentifier = key[key.length - 1] === ":";
    const value = values2[part];
    if (value === void 0) {
      if (Object.prototype.hasOwnProperty.call(values2, part)) {
        bindingsHolder.bindings.push(value);
      }
      return match;
    }
    if (isIdentifier) {
      return match.replace(
        p1,
        columnize(value, builder2, client2, bindingsHolder)
      );
    }
    return match.replace(p1, client2.parameter(value, builder2, bindingsHolder));
  });
  return {
    method: "raw",
    sql,
    bindings: bindingsHolder.bindings
  };
}
var rawFormatter = {
  replaceKeyBindings: replaceKeyBindings$1,
  replaceRawArrBindings: replaceRawArrBindings$1
};
const urlAlphabet = "ModuleSymbhasOwnPr-0123456789ABCDEFGHNRVfgctiUvz_KqYTJkLxpZXIjQW";
const numberAlphabet = "0123456789";
function nanoid$2(size = 21) {
  let id = "";
  let i = size;
  while (i--) {
    id += urlAlphabet[Math.random() * 64 | 0];
  }
  return id;
}
function nanonum(size = 21) {
  let id = "";
  let i = size;
  while (i--) {
    id += numberAlphabet[Math.random() * 10 | 0];
  }
  return id;
}
var nanoid_1 = { nanoid: nanoid$2, nanonum };
const { EventEmitter: EventEmitter$2 } = require$$0;
const debug$2 = srcExports;
const assign$5 = assign_1;
const isPlainObject$1 = isPlainObject_1;
const reduce$1 = reduce_1;
const {
  replaceRawArrBindings,
  replaceKeyBindings
} = rawFormatter;
const helpers$6 = helpers$7;
const saveAsyncStack$1 = saveAsyncStack$3;
const { nanoid: nanoid$1 } = nanoid_1;
const { isNumber, isObject: isObject$2 } = is;
const {
  augmentWithBuilderInterface: augmentWithBuilderInterface$1
} = builderInterfaceAugmenter;
const debugBindings$1 = debug$2("knex:bindings");
let Raw$3 = class Raw extends EventEmitter$2 {
  constructor(client2) {
    super();
    this.client = client2;
    this.sql = "";
    this.bindings = [];
    this._wrappedBefore = void 0;
    this._wrappedAfter = void 0;
    if (client2 && client2.config) {
      this._debug = client2.config.debug;
      saveAsyncStack$1(this, 4);
    }
  }
  set(sql, bindings2) {
    this.sql = sql;
    this.bindings = isObject$2(bindings2) && !bindings2.toSQL || bindings2 === void 0 ? bindings2 : [bindings2];
    return this;
  }
  timeout(ms2, { cancel } = {}) {
    if (isNumber(ms2) && ms2 > 0) {
      this._timeout = ms2;
      if (cancel) {
        this.client.assertCanCancelQuery();
        this._cancelOnTimeout = true;
      }
    }
    return this;
  }
  // Wraps the current sql with `before` and `after`.
  wrap(before, after) {
    this._wrappedBefore = before;
    this._wrappedAfter = after;
    return this;
  }
  // Calls `toString` on the Knex object.
  toString() {
    return this.toQuery();
  }
  // Returns the raw sql for the query.
  toSQL(method, tz) {
    let obj;
    if (Array.isArray(this.bindings)) {
      obj = replaceRawArrBindings(this, this.client);
    } else if (this.bindings && isPlainObject$1(this.bindings)) {
      obj = replaceKeyBindings(this, this.client);
    } else {
      obj = {
        method: "raw",
        sql: this.sql,
        bindings: this.bindings === void 0 ? [] : [this.bindings]
      };
    }
    if (this._wrappedBefore) {
      obj.sql = this._wrappedBefore + obj.sql;
    }
    if (this._wrappedAfter) {
      obj.sql = obj.sql + this._wrappedAfter;
    }
    obj.options = reduce$1(this._options, assign$5, {});
    if (this._timeout) {
      obj.timeout = this._timeout;
      if (this._cancelOnTimeout) {
        obj.cancelOnTimeout = this._cancelOnTimeout;
      }
    }
    obj.bindings = obj.bindings || [];
    if (helpers$6.containsUndefined(obj.bindings)) {
      const undefinedBindingIndices = helpers$6.getUndefinedIndices(
        this.bindings
      );
      debugBindings$1(obj.bindings);
      throw new Error(
        `Undefined binding(s) detected for keys [${undefinedBindingIndices}] when compiling RAW query: ${obj.sql}`
      );
    }
    obj.__knexQueryUid = nanoid$1();
    Object.defineProperties(obj, {
      toNative: {
        value: () => ({
          sql: this.client.positionBindings(obj.sql),
          bindings: this.client.prepBindings(obj.bindings)
        }),
        enumerable: false
      }
    });
    return obj;
  }
};
Raw$3.prototype.isRawInstance = true;
augmentWithBuilderInterface$1(Raw$3);
helpers$6.addQueryContext(Raw$3);
var raw = Raw$3;
function compact$1(array) {
  var index = -1, length = array == null ? 0 : array.length, resIndex = 0, result = [];
  while (++index < length) {
    var value = array[index];
    if (value) {
      result[resIndex++] = value;
    }
  }
  return result;
}
var compact_1 = compact$1;
function arrayAggregator$1(array, setter, iteratee, accumulator) {
  var index = -1, length = array == null ? 0 : array.length;
  while (++index < length) {
    var value = array[index];
    setter(accumulator, value, iteratee(value), array);
  }
  return accumulator;
}
var _arrayAggregator = arrayAggregator$1;
var baseEach = _baseEach;
function baseAggregator$1(collection, setter, iteratee, accumulator) {
  baseEach(collection, function(value, key, collection2) {
    setter(accumulator, value, iteratee(value), collection2);
  });
  return accumulator;
}
var _baseAggregator = baseAggregator$1;
var arrayAggregator = _arrayAggregator, baseAggregator = _baseAggregator, baseIteratee$3 = _baseIteratee, isArray$1 = isArray_1;
function createAggregator$1(setter, initializer) {
  return function(collection, iteratee) {
    var func = isArray$1(collection) ? arrayAggregator : baseAggregator, accumulator = initializer ? initializer() : {};
    return func(collection, setter, baseIteratee$3(iteratee), accumulator);
  };
}
var _createAggregator = createAggregator$1;
var baseAssignValue = _baseAssignValue, createAggregator = _createAggregator;
var objectProto$1 = Object.prototype;
var hasOwnProperty$1 = objectProto$1.hasOwnProperty;
var groupBy$4 = createAggregator(function(result, value, key) {
  if (hasOwnProperty$1.call(result, key)) {
    result[key].push(value);
  } else {
    baseAssignValue(result, key, [value]);
  }
});
var groupBy_1 = groupBy$4;
var objectProto = Object.prototype;
var hasOwnProperty = objectProto.hasOwnProperty;
function baseHas$1(object, key) {
  return object != null && hasOwnProperty.call(object, key);
}
var _baseHas = baseHas$1;
var baseHas = _baseHas, hasPath = _hasPath;
function has$2(object, path2) {
  return object != null && hasPath(object, path2, baseHas);
}
var has_1 = has$2;
var arrayMap$1 = _arrayMap, baseIteratee$2 = _baseIteratee, baseMap = _baseMap, isArray = isArray_1;
function map$1(collection, iteratee) {
  var func = isArray(collection) ? arrayMap$1 : baseMap;
  return func(collection, baseIteratee$2(iteratee));
}
var map_1 = map$1;
var assignValue = _assignValue, castPath$1 = _castPath, isIndex = _isIndex, isObject$1 = isObject_1, toKey = _toKey;
function baseSet$1(object, path2, value, customizer) {
  if (!isObject$1(object)) {
    return object;
  }
  path2 = castPath$1(path2, object);
  var index = -1, length = path2.length, lastIndex = length - 1, nested = object;
  while (nested != null && ++index < length) {
    var key = toKey(path2[index]), newValue = value;
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      return object;
    }
    if (index != lastIndex) {
      var objValue = nested[key];
      newValue = customizer ? customizer(objValue, key, nested) : void 0;
      if (newValue === void 0) {
        newValue = isObject$1(objValue) ? objValue : isIndex(path2[index + 1]) ? [] : {};
      }
    }
    assignValue(nested, key, newValue);
    nested = nested[key];
  }
  return object;
}
var _baseSet = baseSet$1;
var baseGet = _baseGet, baseSet = _baseSet, castPath = _castPath;
function basePickBy$1(object, paths, predicate) {
  var index = -1, length = paths.length, result = {};
  while (++index < length) {
    var path2 = paths[index], value = baseGet(object, path2);
    if (predicate(value, path2)) {
      baseSet(result, castPath(path2, object), value);
    }
  }
  return result;
}
var _basePickBy = basePickBy$1;
var arrayMap = _arrayMap, baseIteratee$1 = _baseIteratee, basePickBy = _basePickBy, getAllKeysIn = _getAllKeysIn;
function pickBy$1(object, predicate) {
  if (object == null) {
    return {};
  }
  var props = arrayMap(getAllKeysIn(object), function(prop) {
    return [prop];
  });
  predicate = baseIteratee$1(predicate);
  return basePickBy(object, props, function(value, path2) {
    return predicate(value, path2[0]);
  });
}
var pickBy_1 = pickBy$1;
var baseIteratee = _baseIteratee, negate = negate_1, pickBy = pickBy_1;
function omitBy$1(object, predicate) {
  return pickBy(object, negate(baseIteratee(predicate)));
}
var omitBy_1 = omitBy$1;
const helpers$5 = helpers$7;
const { hasOwn } = security;
const Raw$2 = raw;
const QueryBuilder$2 = querybuilder;
const JoinClause2 = joinclause;
const debug$1 = srcExports;
const assign$4 = assign_1;
const compact = compact_1;
const groupBy$3 = groupBy_1;
const has$1 = has_1;
const isEmpty$1 = isEmpty_1;
const map = map_1;
const omitBy = omitBy_1;
const reduce = reduce_1;
const { nanoid } = nanoid_1;
const { isString: isString$2, isUndefined } = is;
const {
  columnize: columnize_$2,
  direction: direction_,
  operator: operator_$1,
  wrap: wrap_$1,
  unwrapRaw: unwrapRaw_,
  rawOrFn: rawOrFn_
} = wrappingFormatter;
const debugBindings = debug$1("knex:bindings");
const components = [
  "comments",
  "columns",
  "join",
  "where",
  "union",
  "group",
  "having",
  "order",
  "limit",
  "offset",
  "lock",
  "waitMode"
];
const methodAliases = {
  del: "delete",
  first: "select",
  pluck: "select"
};
const defaultInvalidClauses = {
  delete: ["having", "limit"],
  truncate: ["where", "having", "limit"]
};
let QueryCompiler$1 = class QueryCompiler {
  constructor(client2, builder2, bindings2) {
    this.client = client2;
    this.method = builder2._method || "select";
    this.options = builder2._options;
    this.single = builder2._single;
    this.queryComments = builder2._comments;
    this.timeout = builder2._timeout || false;
    this.cancelOnTimeout = builder2._cancelOnTimeout || false;
    this.grouped = groupBy$3(builder2._statements, "grouping");
    this.formatter = client2.formatter(builder2);
    this._emptyInsertValue = "default values";
    this.first = this.select;
    this.bindings = bindings2 || [];
    this.formatter.bindings = this.bindings;
    this.bindingsHolder = this;
    this.builder = this.formatter.builder;
  }
  // Categorically refuse to execute certain queries that have defined certain clause groups.
  // For example, if a "having" clause is defined but we're executing a "delete" query, that
  // is never valid in any of the supported dialects.
  //
  // Dialects override `invalidClauses` on the prototype to adjust which clauses are
  // disallowed for each verb (e.g. MySQL allows `limit` on `delete`).
  _preValidate() {
    const method = this.method;
    const verb = hasOwn(methodAliases, method) ? methodAliases[method] : method;
    const invalid = this.invalidClauses[verb];
    if (!invalid) return;
    for (let i = 0; i < invalid.length; i++) {
      const clause = invalid[i];
      const hasNonEmptyGrouped = hasOwn(this.grouped, clause) && this.grouped[clause].length > 0;
      const hasNonEmptySingle = hasOwn(this.single, clause) && this.single[clause] != null;
      if (hasNonEmptyGrouped || hasNonEmptySingle) {
        throw new Error(
          `Aborted query compilation: \`${clause}\` has no effect on a \`${verb}\` statement`
        );
      }
    }
  }
  // Collapse the builder into a single object
  toSQL(method, tz) {
    this._preValidate();
    this._undefinedInWhereClause = false;
    this.undefinedBindingsInfo = [];
    method = method || this.method;
    const val = this[method]() || "";
    const query = {
      method,
      options: reduce(this.options, assign$4, {}),
      timeout: this.timeout,
      cancelOnTimeout: this.cancelOnTimeout,
      bindings: this.bindingsHolder.bindings || [],
      __knexQueryUid: nanoid()
    };
    Object.defineProperties(query, {
      toNative: {
        value: () => {
          return {
            sql: this.client.positionBindings(query.sql),
            bindings: this.client.prepBindings(query.bindings)
          };
        },
        enumerable: false
      }
    });
    if (isString$2(val)) {
      query.sql = val;
    } else {
      assign$4(query, val);
    }
    if (method === "select" || method === "first") {
      if (this.single.as) {
        query.as = this.single.as;
      }
    }
    if (this._undefinedInWhereClause) {
      debugBindings(query.bindings);
      throw new Error(
        `Undefined binding(s) detected when compiling ${method.toUpperCase()}. Undefined column(s): [${this.undefinedBindingsInfo.join(
          ", "
        )}] query: ${query.sql}`
      );
    }
    return query;
  }
  // Compiles the `select` statement, or nested sub-selects by calling each of
  // the component compilers, trimming out the empties, and returning a
  // generated query string.
  select() {
    let sql = this.with();
    let unionStatement = "";
    const firstStatements = [];
    const endStatements = [];
    components.forEach((component) => {
      const statement = this[component](this);
      switch (component) {
        case "union":
          unionStatement = statement;
          break;
        case "comments":
        case "columns":
        case "join":
        case "where":
          firstStatements.push(statement);
          break;
        default:
          endStatements.push(statement);
          break;
      }
    });
    const wrapMainQuery = this.grouped.union && this.grouped.union.map((u) => u.wrap).some((u) => u);
    if (this.onlyUnions()) {
      const statements = compact(firstStatements.concat(endStatements)).join(
        " "
      );
      sql += unionStatement + (statements ? " " + statements : "");
    } else {
      const allStatements = (wrapMainQuery ? "(" : "") + compact(firstStatements).join(" ") + (wrapMainQuery ? ")" : "");
      const endStat = compact(endStatements).join(" ");
      sql += allStatements + (unionStatement ? " " + unionStatement : "") + (endStat ? " " + endStat : endStat);
    }
    return sql;
  }
  pluck() {
    let toPluck = this.single.pluck;
    if (toPluck.indexOf(".") !== -1) {
      toPluck = toPluck.split(".").slice(-1)[0];
    }
    return {
      sql: this.select(),
      pluck: toPluck
    };
  }
  // Compiles an "insert" query, allowing for multiple
  // inserts using a single query statement.
  insert() {
    const insertValues = this.single.insert || [];
    const sql = this.with() + `insert into ${this.tableName} `;
    const body = this._insertBody(insertValues);
    return body === "" ? "" : sql + body;
  }
  _onConflictClause(columns) {
    return columns instanceof Raw$2 ? this.formatter.wrap(columns) : `(${this.formatter.columnize(columns)})`;
  }
  _buildInsertValues(insertData) {
    let sql = "";
    let i = -1;
    while (++i < insertData.values.length) {
      if (i !== 0) sql += "), (";
      sql += this.client.parameterize(
        insertData.values[i],
        this.client.valueForUndefined,
        this.builder,
        this.bindingsHolder
      );
    }
    return sql;
  }
  _insertBody(insertValues) {
    let sql = "";
    if (Array.isArray(insertValues)) {
      if (insertValues.length === 0) {
        return "";
      }
    } else if (typeof insertValues === "object" && isEmpty$1(insertValues)) {
      return sql + this._emptyInsertValue;
    }
    const insertData = this._prepInsert(insertValues);
    if (typeof insertData === "string") {
      sql += insertData;
    } else {
      if (insertData.columns.length) {
        sql += `(${columnize_$2(
          insertData.columns,
          this.builder,
          this.client,
          this.bindingsHolder
        )}`;
        sql += ") values (" + this._buildInsertValues(insertData) + ")";
      } else if (insertValues.length === 1 && insertValues[0]) {
        sql += this._emptyInsertValue;
      } else {
        sql = "";
      }
    }
    return sql;
  }
  // Compiles the "update" query.
  update() {
    const withSQL = this.with();
    const { tableName } = this;
    const updateData = this._prepUpdate(this.single.update);
    const wheres = this.where();
    return withSQL + `update ${this.single.only ? "only " : ""}${tableName} set ` + updateData.join(", ") + (wheres ? ` ${wheres}` : "");
  }
  _hintComments() {
    let hints = this.grouped.hintComments || [];
    hints = hints.map((hint) => compact(hint.value).join(" "));
    hints = compact(hints).join(" ");
    return hints ? `/*+ ${hints} */ ` : "";
  }
  // Compiles the columns in the query, specifying if an item was distinct.
  columns() {
    let distinctClause = "";
    if (this.onlyUnions()) return "";
    const hints = this._hintComments();
    const columns = this.grouped.columns || [];
    let i = -1, sql = [];
    if (columns) {
      while (++i < columns.length) {
        const stmt = columns[i];
        if (stmt.distinct) distinctClause = "distinct ";
        if (stmt.distinctOn) {
          distinctClause = this.distinctOn(stmt.value);
          continue;
        }
        if (stmt.type === "aggregate") {
          sql.push(...this.aggregate(stmt));
        } else if (stmt.type === "aggregateRaw") {
          sql.push(this.aggregateRaw(stmt));
        } else if (stmt.type === "analytic") {
          sql.push(this.analytic(stmt));
        } else if (stmt.type === "json") {
          sql.push(this.json(stmt));
        } else if (stmt.value && stmt.value.length > 0) {
          sql.push(
            columnize_$2(
              stmt.value,
              this.builder,
              this.client,
              this.bindingsHolder
            )
          );
        }
      }
    }
    if (sql.length === 0) sql = ["*"];
    const select = this.onlyJson() ? "" : "select ";
    return `${select}${hints}${distinctClause}` + sql.join(", ") + (this.tableName ? ` from ${this.single.only ? "only " : ""}${this.tableName}` : "");
  }
  // Add comments to the query
  comments() {
    if (!this.queryComments.length) return "";
    return this.queryComments.map((comment) => `/* ${comment.comment} */`).join(" ");
  }
  _aggregate(stmt, { aliasSeparator = " as ", distinctParentheses } = {}) {
    const value = stmt.value;
    const method = stmt.method;
    const distinct = stmt.aggregateDistinct ? "distinct " : "";
    const wrap2 = (identifier) => wrap_$1(
      identifier,
      void 0,
      this.builder,
      this.client,
      this.bindingsHolder
    );
    const addAlias = (value2, alias2) => {
      if (alias2) {
        return value2 + aliasSeparator + wrap2(alias2);
      }
      return value2;
    };
    const aggregateArray = (value2, alias2) => {
      let columns = value2.map(wrap2).join(", ");
      if (distinct) {
        const openParen = distinctParentheses ? "(" : " ";
        const closeParen = distinctParentheses ? ")" : "";
        columns = distinct.trim() + openParen + columns + closeParen;
      }
      const aggregated = `${method}(${columns})`;
      return addAlias(aggregated, alias2);
    };
    const aggregateString = (value2, alias2) => {
      const aggregated = `${method}(${distinct + wrap2(value2)})`;
      return addAlias(aggregated, alias2);
    };
    if (Array.isArray(value)) {
      return [aggregateArray(value)];
    }
    if (typeof value === "object") {
      if (stmt.alias) {
        throw new Error("When using an object explicit alias can not be used");
      }
      return Object.entries(value).map(([alias2, column2]) => {
        if (Array.isArray(column2)) {
          return aggregateArray(column2, alias2);
        }
        return aggregateString(column2, alias2);
      });
    }
    const splitOn = value.toLowerCase().indexOf(" as ");
    let column = value;
    let { alias } = stmt;
    if (splitOn !== -1) {
      column = value.slice(0, splitOn);
      if (alias) {
        throw new Error(`Found multiple aliases for same column: ${column}`);
      }
      alias = value.slice(splitOn + 4);
    }
    return [aggregateString(column, alias)];
  }
  aggregate(stmt) {
    return this._aggregate(stmt);
  }
  aggregateRaw(stmt) {
    const distinct = stmt.aggregateDistinct ? "distinct " : "";
    return `${stmt.method}(${distinct + unwrapRaw_(
      stmt.value,
      void 0,
      this.builder,
      this.client,
      this.bindingsHolder
    )})`;
  }
  _joinTable(join) {
    return join.schema && !(join.table instanceof Raw$2) ? `${join.schema}.${join.table}` : join.table;
  }
  // Compiles all each of the `join` clauses on the query,
  // including any nested join queries.
  join() {
    let sql = "";
    let i = -1;
    const joins = this.grouped.join;
    if (!joins) return "";
    while (++i < joins.length) {
      const join = joins[i];
      const table = this._joinTable(join);
      if (i > 0) sql += " ";
      if (join.joinType === "raw") {
        sql += unwrapRaw_(
          join.table,
          void 0,
          this.builder,
          this.client,
          this.bindingsHolder
        );
      } else {
        sql += join.joinType + " join " + wrap_$1(
          table,
          void 0,
          this.builder,
          this.client,
          this.bindingsHolder
        );
        let ii = -1;
        while (++ii < join.clauses.length) {
          const clause = join.clauses[ii];
          if (ii > 0) {
            sql += ` ${clause.bool} `;
          } else {
            sql += ` ${clause.type === "onUsing" ? "using" : "on"} `;
          }
          const val = this[clause.type](clause);
          if (val) {
            sql += val;
          }
        }
      }
    }
    return sql;
  }
  onBetween(statement) {
    return wrap_$1(
      statement.column,
      void 0,
      this.builder,
      this.client,
      this.bindingsHolder
    ) + " " + this._not(statement, "between") + " " + statement.value.map(
      (value) => this.client.parameter(value, this.builder, this.bindingsHolder)
    ).join(" and ");
  }
  onNull(statement) {
    return wrap_$1(
      statement.column,
      void 0,
      this.builder,
      this.client,
      this.bindingsHolder
    ) + " is " + this._not(statement, "null");
  }
  onExists(statement) {
    return this._not(statement, "exists") + " (" + rawOrFn_(
      statement.value,
      void 0,
      this.builder,
      this.client,
      this.bindingsHolder
    ) + ")";
  }
  onIn(statement) {
    if (Array.isArray(statement.column)) return this.multiOnIn(statement);
    let values2;
    if (statement.value instanceof Raw$2) {
      values2 = this.client.parameter(
        statement.value,
        this.builder,
        this.formatter
      );
    } else {
      values2 = this.client.parameterize(
        statement.value,
        void 0,
        this.builder,
        this.bindingsHolder
      );
    }
    return wrap_$1(
      statement.column,
      void 0,
      this.builder,
      this.client,
      this.bindingsHolder
    ) + " " + this._not(statement, "in ") + this.wrap(values2);
  }
  multiOnIn(statement) {
    let i = -1, sql = `(${columnize_$2(
      statement.column,
      this.builder,
      this.client,
      this.bindingsHolder
    )}) `;
    sql += this._not(statement, "in ") + "((";
    while (++i < statement.value.length) {
      if (i !== 0) sql += "),(";
      sql += this.client.parameterize(
        statement.value[i],
        void 0,
        this.builder,
        this.bindingsHolder
      );
    }
    return sql + "))";
  }
  // Compiles all `where` statements on the query.
  where() {
    const wheres = this.grouped.where;
    if (!wheres) return;
    const sql = [];
    let i = -1;
    while (++i < wheres.length) {
      const stmt = wheres[i];
      if (Object.prototype.hasOwnProperty.call(stmt, "value") && helpers$5.containsUndefined(stmt.value)) {
        this.undefinedBindingsInfo.push(stmt.column);
        this._undefinedInWhereClause = true;
      }
      const val = this[stmt.type](stmt);
      if (val) {
        if (sql.length === 0) {
          sql[0] = "where";
        } else {
          sql.push(stmt.bool);
        }
        sql.push(val);
      }
    }
    return sql.length > 1 ? sql.join(" ") : "";
  }
  group() {
    return this._groupsOrders("group");
  }
  order() {
    return this._groupsOrders("order");
  }
  // Compiles the `having` statements.
  having() {
    const havings = this.grouped.having;
    if (!havings) return "";
    const sql = ["having"];
    for (let i = 0, l = havings.length; i < l; i++) {
      const s = havings[i];
      const val = this[s.type](s);
      if (val) {
        if (sql.length === 0) {
          sql[0] = "where";
        }
        if (sql.length > 1 || sql.length === 1 && sql[0] !== "having") {
          sql.push(s.bool);
        }
        sql.push(val);
      }
    }
    return sql.length > 1 ? sql.join(" ") : "";
  }
  havingRaw(statement) {
    return this._not(statement, "") + unwrapRaw_(
      statement.value,
      void 0,
      this.builder,
      this.client,
      this.bindingsHolder
    );
  }
  havingWrapped(statement) {
    const val = rawOrFn_(
      statement.value,
      "where",
      this.builder,
      this.client,
      this.bindingsHolder
    );
    return val && this._not(statement, "") + "(" + val.slice(6) + ")" || "";
  }
  havingBasic(statement) {
    return this._not(statement, "") + wrap_$1(
      statement.column,
      void 0,
      this.builder,
      this.client,
      this.bindingsHolder
    ) + " " + operator_$1(
      statement.operator,
      this.builder,
      this.client,
      this.bindingsHolder
    ) + " " + this.client.parameter(statement.value, this.builder, this.bindingsHolder);
  }
  havingNull(statement) {
    return wrap_$1(
      statement.column,
      void 0,
      this.builder,
      this.client,
      this.bindingsHolder
    ) + " is " + this._not(statement, "null");
  }
  havingExists(statement) {
    return this._not(statement, "exists") + " (" + rawOrFn_(
      statement.value,
      void 0,
      this.builder,
      this.client,
      this.bindingsHolder
    ) + ")";
  }
  havingBetween(statement) {
    return wrap_$1(
      statement.column,
      void 0,
      this.builder,
      this.client,
      this.bindingsHolder
    ) + " " + this._not(statement, "between") + " " + statement.value.map(
      (value) => this.client.parameter(value, this.builder, this.bindingsHolder)
    ).join(" and ");
  }
  havingIn(statement) {
    if (Array.isArray(statement.column)) return this.multiHavingIn(statement);
    return wrap_$1(
      statement.column,
      void 0,
      this.builder,
      this.client,
      this.bindingsHolder
    ) + " " + this._not(statement, "in ") + this.wrap(
      this.client.parameterize(
        statement.value,
        void 0,
        this.builder,
        this.bindingsHolder
      )
    );
  }
  multiHavingIn(statement) {
    return this.multiOnIn(statement);
  }
  // Compile the "union" queries attached to the main query.
  union() {
    const onlyUnions = this.onlyUnions();
    const unions = this.grouped.union;
    if (!unions) return "";
    let sql = "";
    for (let i = 0, l = unions.length; i < l; i++) {
      const union = unions[i];
      if (i > 0) sql += " ";
      if (i > 0 || !onlyUnions) sql += union.clause + " ";
      const statement = rawOrFn_(
        union.value,
        void 0,
        this.builder,
        this.client,
        this.bindingsHolder
      );
      if (statement) {
        const wrap2 = union.wrap;
        if (wrap2) sql += "(";
        sql += statement;
        if (wrap2) sql += ")";
      }
    }
    return sql;
  }
  // If we haven't specified any columns or a `tableName`, we're assuming this
  // is only being used for unions.
  onlyUnions() {
    return (!this.grouped.columns || !!this.grouped.columns[0].value) && this.grouped.union && !this.tableName;
  }
  _getValueOrParameterFromAttribute(attribute, rawValue) {
    if (this.single.skipBinding[attribute] === true) {
      return rawValue !== void 0 && rawValue !== null ? rawValue : this.single[attribute];
    }
    return this.client.parameter(
      this.single[attribute],
      this.builder,
      this.bindingsHolder
    );
  }
  onlyJson() {
    return !this.tableName && this.grouped.columns && this.grouped.columns.length === 1 && this.grouped.columns[0].type === "json";
  }
  limit() {
    const noLimit = !this.single.limit && this.single.limit !== 0;
    if (noLimit) return "";
    return `limit ${this._getValueOrParameterFromAttribute("limit")}`;
  }
  offset() {
    if (!this.single.offset) return "";
    return `offset ${this._getValueOrParameterFromAttribute("offset")}`;
  }
  // Compiles a `delete` query.
  del() {
    const { tableName } = this;
    const withSQL = this.with();
    const joins = this.join();
    const wheres = this.where();
    const deleteSelector = joins ? tableName + " " : "";
    return withSQL + `delete ${deleteSelector}from ${this.single.only ? "only " : ""}${tableName}` + (joins ? ` ${joins}` : "") + (wheres ? ` ${wheres}` : "");
  }
  // Compiles a `truncate` query.
  truncate() {
    return `truncate ${this.tableName}`;
  }
  // Compiles the "locks".
  lock() {
    if (this.single.lock) {
      return this[this.single.lock]();
    }
  }
  // Compiles the wait mode on the locks.
  waitMode() {
    if (this.single.waitMode) {
      return this[this.single.waitMode]();
    }
  }
  // Fail on unsupported databases
  skipLocked() {
    throw new Error(
      ".skipLocked() is currently only supported on MySQL 8.0+ and PostgreSQL 9.5+"
    );
  }
  // Fail on unsupported databases
  noWait() {
    throw new Error(
      ".noWait() is currently only supported on MySQL 8.0+, MariaDB 10.3.0+ and PostgreSQL 9.5+"
    );
  }
  distinctOn(value) {
    throw new Error(".distinctOn() is currently only supported on PostgreSQL");
  }
  // On Clause
  // ------
  onWrapped(clause) {
    const self2 = this;
    const wrapJoin = new JoinClause2();
    clause.value.call(wrapJoin, wrapJoin);
    let sql = "";
    for (let ii = 0; ii < wrapJoin.clauses.length; ii++) {
      const wrapClause = wrapJoin.clauses[ii];
      if (ii > 0) {
        sql += ` ${wrapClause.bool} `;
      }
      const val = self2[wrapClause.type](wrapClause);
      if (val) {
        sql += val;
      }
    }
    if (sql.length) {
      return `(${sql})`;
    }
    return "";
  }
  onBasic(clause) {
    const toWrap = clause.value instanceof QueryBuilder$2;
    return wrap_$1(
      clause.column,
      void 0,
      this.builder,
      this.client,
      this.bindingsHolder
    ) + " " + operator_$1(
      clause.operator,
      this.builder,
      this.client,
      this.bindingsHolder
    ) + " " + (toWrap ? "(" : "") + wrap_$1(
      clause.value,
      void 0,
      this.builder,
      this.client,
      this.bindingsHolder
    ) + (toWrap ? ")" : "");
  }
  onVal(clause) {
    return wrap_$1(
      clause.column,
      void 0,
      this.builder,
      this.client,
      this.bindingsHolder
    ) + " " + operator_$1(
      clause.operator,
      this.builder,
      this.client,
      this.bindingsHolder
    ) + " " + this.client.parameter(clause.value, this.builder, this.bindingsHolder);
  }
  onRaw(clause) {
    return unwrapRaw_(
      clause.value,
      void 0,
      this.builder,
      this.client,
      this.bindingsHolder
    );
  }
  onUsing(clause) {
    return "(" + columnize_$2(
      clause.column,
      this.builder,
      this.client,
      this.bindingsHolder
    ) + ")";
  }
  // Where Clause
  // ------
  _valueClause(statement) {
    return statement.asColumn ? wrap_$1(
      statement.value,
      void 0,
      this.builder,
      this.client,
      this.bindingsHolder
    ) : this.client.parameter(
      statement.value,
      this.builder,
      this.bindingsHolder
    );
  }
  _columnClause(statement) {
    let columns;
    if (Array.isArray(statement.column)) {
      columns = `(${columnize_$2(
        statement.column,
        this.builder,
        this.client,
        this.bindingsHolder
      )})`;
    } else {
      columns = wrap_$1(
        statement.column,
        void 0,
        this.builder,
        this.client,
        this.bindingsHolder
      );
    }
    return columns;
  }
  whereIn(statement) {
    const columns = this._columnClause(statement);
    const values2 = this.client.values(
      statement.value,
      this.builder,
      this.bindingsHolder
    );
    return `${columns} ${this._not(statement, "in ")}${values2}`;
  }
  whereLike(statement) {
    return `${this._columnClause(statement)} ${this._not(
      statement,
      "like "
    )}${this._valueClause(statement)}`;
  }
  whereILike(statement) {
    return `${this._columnClause(statement)} ${this._not(
      statement,
      "ilike "
    )}${this._valueClause(statement)}`;
  }
  whereNull(statement) {
    return wrap_$1(
      statement.column,
      void 0,
      this.builder,
      this.client,
      this.bindingsHolder
    ) + " is " + this._not(statement, "null");
  }
  // Compiles a basic "where" clause.
  whereBasic(statement) {
    return this._not(statement, "") + wrap_$1(
      statement.column,
      void 0,
      this.builder,
      this.client,
      this.bindingsHolder
    ) + " " + operator_$1(
      statement.operator,
      this.builder,
      this.client,
      this.bindingsHolder
    ) + " " + this._valueClause(statement);
  }
  whereExists(statement) {
    return this._not(statement, "exists") + " (" + rawOrFn_(
      statement.value,
      void 0,
      this.builder,
      this.client,
      this.bindingsHolder
    ) + ")";
  }
  whereWrapped(statement) {
    const val = rawOrFn_(
      statement.value,
      "where",
      this.builder,
      this.client,
      this.bindingsHolder
    );
    return val && this._not(statement, "") + "(" + val.slice(6) + ")" || "";
  }
  whereBetween(statement) {
    return wrap_$1(
      statement.column,
      void 0,
      this.builder,
      this.client,
      this.bindingsHolder
    ) + " " + this._not(statement, "between") + " " + statement.value.map(
      (value) => this.client.parameter(value, this.builder, this.bindingsHolder)
    ).join(" and ");
  }
  // Compiles a "whereRaw" query.
  whereRaw(statement) {
    return this._not(statement, "") + unwrapRaw_(
      statement.value,
      void 0,
      this.builder,
      this.client,
      this.bindingsHolder
    );
  }
  _jsonWrapValue(jsonValue) {
    if (!this.builder._isJsonObject(jsonValue)) {
      try {
        return JSON.stringify(JSON.parse(jsonValue.replace(/\n|\t/g, "")));
      } catch (e) {
        return jsonValue;
      }
    }
    return JSON.stringify(jsonValue);
  }
  _jsonValueClause(statement) {
    statement.value = this._jsonWrapValue(statement.value);
    return this._valueClause(statement);
  }
  whereJsonObject(statement) {
    return `${this._columnClause(statement)} ${statement.not ? "!=" : "="} ${this._jsonValueClause(statement)}`;
  }
  wrap(str) {
    if (str.charAt(0) !== "(") return `(${str})`;
    return str;
  }
  json(stmt) {
    return this[stmt.method](stmt.params);
  }
  analytic(stmt) {
    let sql = "";
    const self2 = this;
    sql += stmt.method + "() over (";
    if (stmt.raw) {
      sql += stmt.raw;
    } else {
      if (stmt.partitions.length) {
        sql += "partition by ";
        sql += map(stmt.partitions, function(partition) {
          if (isString$2(partition)) {
            return self2.formatter.columnize(partition);
          } else return self2.formatter.columnize(partition.column) + (partition.order ? " " + partition.order : "");
        }).join(", ") + " ";
      }
      sql += "order by ";
      sql += map(stmt.order, function(order) {
        if (isString$2(order)) {
          return self2.formatter.columnize(order);
        } else return self2.formatter.columnize(order.column) + (order.order ? " " + order.order : "");
      }).join(", ");
    }
    sql += ")";
    if (stmt.alias) {
      sql += " as " + self2.formatter.wrap(stmt.alias);
    }
    return sql;
  }
  // Compiles all `with` statements on the query.
  with() {
    if (!this.grouped.with || !this.grouped.with.length) {
      return "";
    }
    const withs = this.grouped.with;
    if (!withs) return;
    const sql = [];
    let i = -1;
    let isRecursive = false;
    while (++i < withs.length) {
      const stmt = withs[i];
      if (stmt.recursive) {
        isRecursive = true;
      }
      const val = this[stmt.type](stmt);
      sql.push(val);
    }
    return `with ${isRecursive ? "recursive " : ""}${sql.join(", ")} `;
  }
  withWrapped(statement) {
    const val = rawOrFn_(
      statement.value,
      void 0,
      this.builder,
      this.client,
      this.bindingsHolder
    );
    const columnList = statement.columnList ? "(" + columnize_$2(
      statement.columnList,
      this.builder,
      this.client,
      this.bindingsHolder
    ) + ")" : "";
    const materialized = statement.materialized === void 0 ? "" : statement.materialized ? "materialized " : "not materialized ";
    return val && columnize_$2(
      statement.alias,
      this.builder,
      this.client,
      this.bindingsHolder
    ) + columnList + " as " + materialized + "(" + val + ")" || "";
  }
  // Determines whether to add a "not" prefix to the where clause.
  _not(statement, str) {
    if (statement.not) return `not ${str}`;
    return str;
  }
  _prepInsert(data) {
    const isRaw = rawOrFn_(
      data,
      void 0,
      this.builder,
      this.client,
      this.bindingsHolder
    );
    if (isRaw) return isRaw;
    let columns = [];
    const values2 = [];
    if (!Array.isArray(data)) data = data ? [data] : [];
    let i = -1;
    while (++i < data.length) {
      if (data[i] == null) break;
      if (i === 0) columns = Object.keys(data[i]).sort();
      const row = new Array(columns.length);
      const keys2 = Object.keys(data[i]);
      let j = -1;
      while (++j < keys2.length) {
        const key = keys2[j];
        let idx = columns.indexOf(key);
        if (idx === -1) {
          columns = columns.concat(key).sort();
          idx = columns.indexOf(key);
          let k = -1;
          while (++k < values2.length) {
            values2[k].splice(idx, 0, void 0);
          }
          row.splice(idx, 0, void 0);
        }
        row[idx] = data[i][key];
      }
      values2.push(row);
    }
    return {
      columns,
      values: values2
    };
  }
  // "Preps" the update.
  _prepUpdate(data = {}) {
    const { counter = {} } = this.single;
    for (const column of Object.keys(counter)) {
      if (has$1(data, column)) {
        this.client.logger.warn(
          `increment/decrement called for a column that has already been specified in main .update() call. Ignoring increment/decrement and using value from .update() call.`
        );
        continue;
      }
      let value = counter[column];
      const symbol = value < 0 ? "-" : "+";
      if (symbol === "-") {
        value = -value;
      }
      data[column] = this.client.raw(`?? ${symbol} ?`, [column, value]);
    }
    data = omitBy(data, isUndefined);
    const vals = [];
    const columns = Object.keys(data);
    let i = -1;
    while (++i < columns.length) {
      vals.push(
        wrap_$1(
          columns[i],
          void 0,
          this.builder,
          this.client,
          this.bindingsHolder
        ) + " = " + this.client.parameter(
          data[columns[i]],
          this.builder,
          this.bindingsHolder
        )
      );
    }
    if (isEmpty$1(vals)) {
      throw new Error(
        [
          "Empty .update() call detected!",
          "Update data does not contain any values to update.",
          "This will result in a faulty query.",
          this.single.table ? `Table: ${this.single.table}.` : "",
          this.single.update ? `Columns: ${Object.keys(this.single.update)}.` : ""
        ].join(" ")
      );
    }
    return vals;
  }
  _formatGroupsItemValue(value, nulls) {
    const { formatter: formatter2 } = this;
    let nullOrder = "";
    if (nulls === "last") {
      nullOrder = " is null";
    } else if (nulls === "first") {
      nullOrder = " is not null";
    }
    let groupOrder;
    if (value instanceof Raw$2) {
      groupOrder = unwrapRaw_(
        value,
        void 0,
        this.builder,
        this.client,
        this.bindingsHolder
      );
    } else if (value instanceof QueryBuilder$2 || nulls) {
      groupOrder = "(" + formatter2.columnize(value) + nullOrder + ")";
    } else {
      groupOrder = formatter2.columnize(value);
    }
    return groupOrder;
  }
  _basicGroupOrder(item, type) {
    const column = this._formatGroupsItemValue(item.value, item.nulls);
    const direction2 = type === "order" && item.type !== "orderByRaw" ? ` ${direction_(
      item.direction,
      this.builder,
      this.client,
      this.bindingsHolder
    )}` : "";
    return column + direction2;
  }
  _groupOrder(item, type) {
    return this._basicGroupOrder(item, type);
  }
  _groupOrderNulls(item, type) {
    const column = this._formatGroupsItemValue(item.value);
    const direction2 = type === "order" && item.type !== "orderByRaw" ? ` ${direction_(
      item.direction,
      this.builder,
      this.client,
      this.bindingsHolder
    )}` : "";
    if (item.nulls && !(item.value instanceof Raw$2)) {
      return `${column}${direction2 ? direction2 : ""} nulls ${item.nulls}`;
    }
    return column + direction2;
  }
  // Compiles the `order by` statements.
  _groupsOrders(type) {
    const items = this.grouped[type];
    if (!items) return "";
    const sql = items.map((item) => {
      return this._groupOrder(item, type);
    });
    return sql.length ? type + " by " + sql.join(", ") : "";
  }
  // Get the table name, wrapping it if necessary.
  // Implemented as a property to prevent ordering issues as described in #704.
  get tableName() {
    if (!this._tableName) {
      let tableName = this.single.table;
      const schemaName = this.single.schema;
      if (tableName && schemaName) {
        const isQueryBuilder = tableName instanceof QueryBuilder$2;
        const isRawQuery = tableName instanceof Raw$2;
        const isFunction2 = typeof tableName === "function";
        if (!isQueryBuilder && !isRawQuery && !isFunction2) {
          tableName = `${schemaName}.${tableName}`;
        }
      }
      this._tableName = tableName ? (
        // Wrap subQuery with parenthesis, #3485
        wrap_$1(
          tableName,
          tableName instanceof QueryBuilder$2,
          this.builder,
          this.client,
          this.bindingsHolder
        )
      ) : "";
    }
    return this._tableName;
  }
  _jsonPathWrap(extraction) {
    return this.client.parameter(
      extraction.path || extraction[1],
      this.builder,
      this.bindingsHolder
    );
  }
  // Json common functions
  _jsonExtract(nameFunction, params) {
    let extractions;
    if (Array.isArray(params.column)) {
      extractions = params.column;
    } else {
      extractions = [params];
    }
    if (!Array.isArray(nameFunction)) {
      nameFunction = [nameFunction];
    }
    return extractions.map((extraction) => {
      let jsonCol = `${columnize_$2(
        extraction.column || extraction[0],
        this.builder,
        this.client,
        this.bindingsHolder
      )}, ${this._jsonPathWrap(extraction)}`;
      nameFunction.forEach((f) => {
        jsonCol = f + "(" + jsonCol + ")";
      });
      const alias = extraction.alias || extraction[2];
      return alias ? this.client.alias(jsonCol, this.formatter.wrap(alias)) : jsonCol;
    }).join(", ");
  }
  _jsonSet(nameFunction, params) {
    const jsonSet = `${nameFunction}(${columnize_$2(
      params.column,
      this.builder,
      this.client,
      this.bindingsHolder
    )}, ${this.client.parameter(
      params.path,
      this.builder,
      this.bindingsHolder
    )}, ${this.client.parameter(
      params.value,
      this.builder,
      this.bindingsHolder
    )})`;
    return params.alias ? this.client.alias(jsonSet, this.formatter.wrap(params.alias)) : jsonSet;
  }
  _whereJsonPath(nameFunction, statement) {
    return `${nameFunction}(${this._columnClause(
      statement
    )}, ${this._jsonPathWrap({ path: statement.jsonPath })}) ${operator_$1(
      statement.operator,
      this.builder,
      this.client,
      this.bindingsHolder
    )} ${this._jsonValueClause(statement)}`;
  }
  _onJsonPathEquals(nameJoinFunction, clause) {
    return nameJoinFunction + "(" + wrap_$1(
      clause.columnFirst,
      void 0,
      this.builder,
      this.client,
      this.bindingsHolder
    ) + ", " + this.client.parameter(
      clause.jsonPathFirst,
      this.builder,
      this.bindingsHolder
    ) + ") = " + nameJoinFunction + "(" + wrap_$1(
      clause.columnSecond,
      void 0,
      this.builder,
      this.client,
      this.bindingsHolder
    ) + ", " + this.client.parameter(
      clause.jsonPathSecond,
      this.builder,
      this.bindingsHolder
    ) + ")";
  }
};
QueryCompiler$1.prototype.invalidClauses = defaultInvalidClauses;
var querycompiler = QueryCompiler$1;
const { EventEmitter: EventEmitter$1 } = require$$0;
const toArray$2 = toArray_1;
const assign$3 = assign_1;
const { addQueryContext: addQueryContext$1 } = helpers$7;
const saveAsyncStack2 = saveAsyncStack$3;
const {
  augmentWithBuilderInterface
} = builderInterfaceAugmenter;
let SchemaBuilder$2 = class SchemaBuilder extends EventEmitter$1 {
  constructor(client2) {
    super();
    this.client = client2;
    this._sequence = [];
    if (client2.config) {
      this._debug = client2.config.debug;
      saveAsyncStack2(this, 4);
    }
  }
  withSchema(schemaName) {
    this._schema = schemaName;
    return this;
  }
  toString() {
    return this.toQuery();
  }
  toSQL() {
    return this.client.schemaCompiler(this).toSQL();
  }
  async generateDdlCommands() {
    return await this.client.schemaCompiler(this).generateDdlCommands();
  }
};
[
  "createTable",
  "createTableIfNotExists",
  "createTableLike",
  "createView",
  "createViewOrReplace",
  "createMaterializedView",
  "refreshMaterializedView",
  "dropView",
  "dropViewIfExists",
  "dropMaterializedView",
  "dropMaterializedViewIfExists",
  "createSchema",
  "createSchemaIfNotExists",
  "dropSchema",
  "dropSchemaIfExists",
  "createExtension",
  "createExtensionIfNotExists",
  "dropExtension",
  "dropExtensionIfExists",
  "table",
  "alterTable",
  "view",
  "alterView",
  "hasTable",
  "hasColumn",
  "dropTable",
  "renameTable",
  "renameView",
  "dropTableIfExists",
  "raw"
].forEach(function(method) {
  SchemaBuilder$2.prototype[method] = function() {
    if (method === "createTableIfNotExists") {
      this.client.logger.warn(
        [
          "Use async .hasTable to check if table exists and then use plain .createTable. Since ",
          '.createTableIfNotExists actually just generates plain "CREATE TABLE IF NOT EXIST..." ',
          "query it will not work correctly if there are any alter table queries generated for ",
          "columns afterwards. To not break old migrations this function is left untouched for now",
          ", but it should not be used when writing new code and it is removed from documentation."
        ].join("")
      );
    }
    if (method === "table") method = "alterTable";
    if (method === "view") method = "alterView";
    this._sequence.push({
      method,
      args: toArray$2(arguments)
    });
    return this;
  };
});
SchemaBuilder$2.extend = (methodName, fn) => {
  if (Object.prototype.hasOwnProperty.call(SchemaBuilder$2.prototype, methodName)) {
    throw new Error(
      `Can't extend SchemaBuilder with existing method ('${methodName}').`
    );
  }
  assign$3(SchemaBuilder$2.prototype, { [methodName]: fn });
};
augmentWithBuilderInterface(SchemaBuilder$2);
addQueryContext$1(SchemaBuilder$2);
var builder = SchemaBuilder$2;
const tail$2 = tail_1;
const { isString: isString$1 } = is;
function pushQuery$3(query) {
  if (!query) return;
  if (isString$1(query)) {
    query = { sql: query };
  }
  if (!query.bindings) {
    query.bindings = this.bindingsHolder.bindings;
  }
  this.sequence.push(query);
  this.formatter = this.client.formatter(this._commonBuilder);
  this.bindings = [];
  this.formatter.bindings = this.bindings;
}
function pushAdditional$2(fn) {
  const child = new this.constructor(
    this.client,
    this.tableCompiler,
    this.columnBuilder
  );
  fn.call(child, tail$2(arguments));
  this.sequence.additional = (this.sequence.additional || []).concat(
    child.sequence
  );
}
function unshiftQuery$2(query) {
  if (!query) return;
  if (isString$1(query)) {
    query = { sql: query };
  }
  if (!query.bindings) {
    query.bindings = this.bindingsHolder.bindings;
  }
  this.sequence.unshift(query);
  this.formatter = this.client.formatter(this._commonBuilder);
  this.bindings = [];
  this.formatter.bindings = this.bindings;
}
var helpers$4 = {
  pushAdditional: pushAdditional$2,
  pushQuery: pushQuery$3,
  unshiftQuery: unshiftQuery$2
};
const {
  pushQuery: pushQuery$2,
  pushAdditional: pushAdditional$1,
  unshiftQuery: unshiftQuery$1
} = helpers$4;
let SchemaCompiler$1 = class SchemaCompiler {
  constructor(client2, builder2) {
    this.builder = builder2;
    this._commonBuilder = this.builder;
    this.client = client2;
    this.schema = builder2._schema;
    this.bindings = [];
    this.bindingsHolder = this;
    this.formatter = client2.formatter(builder2);
    this.formatter.bindings = this.bindings;
    this.sequence = [];
  }
  createSchema() {
    throwOnlyPGError("createSchema");
  }
  createSchemaIfNotExists() {
    throwOnlyPGError("createSchemaIfNotExists");
  }
  dropSchema() {
    throwOnlyPGError("dropSchema");
  }
  dropSchemaIfExists() {
    throwOnlyPGError("dropSchemaIfExists");
  }
  dropTable(tableName) {
    this.pushQuery(
      this.dropTablePrefix + this.formatter.wrap(prefixedTableName(this.schema, tableName))
    );
  }
  dropTableIfExists(tableName) {
    this.pushQuery(
      this.dropTablePrefix + "if exists " + this.formatter.wrap(prefixedTableName(this.schema, tableName))
    );
  }
  dropView(viewName) {
    this._dropView(viewName, false, false);
  }
  dropViewIfExists(viewName) {
    this._dropView(viewName, true, false);
  }
  dropMaterializedView(viewName) {
    throw new Error("materialized views are not supported by this dialect.");
  }
  dropMaterializedViewIfExists(viewName) {
    throw new Error("materialized views are not supported by this dialect.");
  }
  renameView(from, to) {
    throw new Error(
      "rename view is not supported by this dialect (instead drop then create another view)."
    );
  }
  refreshMaterializedView() {
    throw new Error("materialized views are not supported by this dialect.");
  }
  _dropView(viewName, ifExists, materialized) {
    this.pushQuery(
      (materialized ? this.dropMaterializedViewPrefix : this.dropViewPrefix) + (ifExists ? "if exists " : "") + this.formatter.wrap(prefixedTableName(this.schema, viewName))
    );
  }
  raw(sql, bindings2) {
    this.sequence.push(this.client.raw(sql, bindings2).toSQL());
  }
  toSQL() {
    const sequence = this.builder._sequence;
    for (let i = 0, l = sequence.length; i < l; i++) {
      const query = sequence[i];
      this[query.method].apply(this, query.args);
    }
    return this.sequence;
  }
  async generateDdlCommands() {
    const generatedCommands = this.toSQL();
    return {
      pre: [],
      sql: Array.isArray(generatedCommands) ? generatedCommands : [generatedCommands],
      check: null,
      post: []
    };
  }
};
SchemaCompiler$1.prototype.dropTablePrefix = "drop table ";
SchemaCompiler$1.prototype.dropViewPrefix = "drop view ";
SchemaCompiler$1.prototype.dropMaterializedViewPrefix = "drop materialized view ";
SchemaCompiler$1.prototype.alterViewPrefix = "alter view ";
SchemaCompiler$1.prototype.alterTable = buildTable("alter");
SchemaCompiler$1.prototype.createTable = buildTable("create");
SchemaCompiler$1.prototype.createTableIfNotExists = buildTable("createIfNot");
SchemaCompiler$1.prototype.createTableLike = buildTable("createLike");
SchemaCompiler$1.prototype.createView = buildView("create");
SchemaCompiler$1.prototype.createViewOrReplace = buildView("createOrReplace");
SchemaCompiler$1.prototype.createMaterializedView = buildView(
  "createMaterializedView"
);
SchemaCompiler$1.prototype.alterView = buildView("alter");
SchemaCompiler$1.prototype.pushQuery = pushQuery$2;
SchemaCompiler$1.prototype.pushAdditional = pushAdditional$1;
SchemaCompiler$1.prototype.unshiftQuery = unshiftQuery$1;
function build(builder2) {
  const queryContext = this.builder.queryContext();
  if (queryContext !== void 0 && builder2.queryContext() === void 0) {
    builder2.queryContext(queryContext);
  }
  builder2.setSchema(this.schema);
  const sql = builder2.toSQL();
  for (let i = 0, l = sql.length; i < l; i++) {
    this.sequence.push(sql[i]);
  }
}
function buildTable(type) {
  if (type === "createLike") {
    return function(tableName, tableNameLike, fn) {
      const builder2 = this.client.tableBuilder(
        type,
        tableName,
        tableNameLike,
        fn
      );
      build.call(this, builder2);
    };
  } else {
    return function(tableName, fn) {
      const builder2 = this.client.tableBuilder(type, tableName, null, fn);
      build.call(this, builder2);
    };
  }
}
function buildView(type) {
  return function(viewName, fn) {
    const builder2 = this.client.viewBuilder(type, viewName, fn);
    build.call(this, builder2);
  };
}
function prefixedTableName(prefix, table) {
  return prefix ? `${prefix}.${table}` : table;
}
function throwOnlyPGError(operationName) {
  throw new Error(
    `${operationName} is not supported for this dialect (only PostgreSQL supports it currently).`
  );
}
var compiler$1 = SchemaCompiler$1;
var copyObject = _copyObject, createAssigner = _createAssigner, keysIn = keysIn_1;
var assignIn = createAssigner(function(object, source) {
  copyObject(source, keysIn(source), object);
});
var assignIn_1 = assignIn;
var extend$3 = assignIn_1;
const each = each$2;
const extend$2 = extend$3;
const assign$2 = assign_1;
const toArray$1 = toArray_1;
const helpers$3 = helpers$7;
const { isString, isFunction, isObject } = is;
let TableBuilder$2 = class TableBuilder {
  constructor(client2, method, tableName, tableNameLike, fn) {
    this.client = client2;
    this._fn = fn;
    this._method = method;
    this._schemaName = void 0;
    this._tableName = tableName;
    this._tableNameLike = tableNameLike;
    this._statements = [];
    this._single = {};
    if (!tableNameLike && !isFunction(this._fn)) {
      throw new TypeError(
        "A callback function must be supplied to calls against `.createTable` and `.table`"
      );
    }
  }
  setSchema(schemaName) {
    this._schemaName = schemaName;
  }
  // Convert the current tableBuilder object "toSQL"
  // giving us additional methods if we're altering
  // rather than creating the table.
  toSQL() {
    if (this._method === "alter") {
      extend$2(this, AlterMethods$2);
    }
    if (this._fn) {
      this._fn.call(this, this);
    }
    return this.client.tableCompiler(this).toSQL();
  }
  // The "timestamps" call is really just sets the `created_at` and `updated_at` columns.
  timestamps(useTimestamps, defaultToNow, useCamelCase) {
    if (isObject(useTimestamps)) {
      ({ useTimestamps, defaultToNow, useCamelCase } = useTimestamps);
    }
    const method = useTimestamps === true ? "timestamp" : "datetime";
    const createdAt = this[method](useCamelCase ? "createdAt" : "created_at");
    const updatedAt = this[method](useCamelCase ? "updatedAt" : "updated_at");
    if (defaultToNow === true) {
      const now2 = this.client.raw("CURRENT_TIMESTAMP");
      createdAt.notNullable().defaultTo(now2);
      updatedAt.notNullable().defaultTo(now2);
    }
  }
  // Set the comment value for a table, they're only allowed to be called
  // once per table.
  comment(value) {
    if (typeof value !== "string") {
      throw new TypeError("Table comment must be string");
    }
    this._single.comment = value;
  }
  // Set a foreign key on the table, calling
  // `table.foreign('column_name').references('column').on('table').onDelete()...
  // Also called from the ColumnBuilder context when chaining.
  foreign(column, keyName) {
    const foreignData = { column, keyName };
    this._statements.push({
      grouping: "alterTable",
      method: "foreign",
      args: [foreignData]
    });
    let returnObj = {
      references(tableColumn) {
        let pieces;
        if (isString(tableColumn)) {
          pieces = tableColumn.split(".");
        }
        if (!pieces || pieces.length === 1) {
          foreignData.references = pieces ? pieces[0] : tableColumn;
          return {
            on(tableName) {
              if (typeof tableName !== "string") {
                throw new TypeError(
                  `Expected tableName to be a string, got: ${typeof tableName}`
                );
              }
              foreignData.inTable = tableName;
              return returnObj;
            },
            inTable() {
              return this.on.apply(this, arguments);
            }
          };
        }
        foreignData.inTable = pieces[0];
        foreignData.references = pieces[1];
        return returnObj;
      },
      withKeyName(keyName2) {
        foreignData.keyName = keyName2;
        return returnObj;
      },
      onUpdate(statement) {
        foreignData.onUpdate = statement;
        return returnObj;
      },
      onDelete(statement) {
        foreignData.onDelete = statement;
        return returnObj;
      },
      deferrable: (type) => {
        const unSupported = [
          "mysql",
          "mssql",
          "redshift",
          "mysql2",
          "oracledb"
        ];
        if (unSupported.indexOf(this.client.dialect) !== -1) {
          throw new Error(`${this.client.dialect} does not support deferrable`);
        }
        foreignData.deferrable = type;
        return returnObj;
      },
      _columnBuilder(builder2) {
        extend$2(builder2, returnObj);
        returnObj = builder2;
        return builder2;
      }
    };
    return returnObj;
  }
  check(checkPredicate, bindings2, constraintName) {
    this._statements.push({
      grouping: "checks",
      args: [checkPredicate, bindings2, constraintName]
    });
    return this;
  }
};
[
  // Each of the index methods can be called individually, with the
  // column name to be used, e.g. table.unique('column').
  "index",
  "primary",
  "unique",
  // Key specific
  "dropPrimary",
  "dropPrimaryIfExists",
  "dropUnique",
  "dropUniqueIfExists",
  "dropIndex",
  "dropForeign",
  "dropForeignIfExists"
].forEach((method) => {
  TableBuilder$2.prototype[method] = function() {
    this._statements.push({
      grouping: "alterTable",
      method,
      args: toArray$1(arguments)
    });
    return this;
  };
});
const specialMethods = {
  mysql: ["engine", "charset", "collate"],
  postgresql: ["inherits"]
};
each(specialMethods, function(methods, dialect) {
  methods.forEach(function(method) {
    TableBuilder$2.prototype[method] = function(value) {
      if (this.client.dialect !== dialect) {
        throw new Error(
          `Knex only supports ${method} statement with ${dialect}.`
        );
      }
      if (this._method === "alter") {
        throw new Error(
          `Knex does not support altering the ${method} outside of create table, please use knex.raw statement.`
        );
      }
      this._single[method] = value;
    };
  });
});
helpers$3.addQueryContext(TableBuilder$2);
const columnTypes = [
  // Numeric
  "tinyint",
  "smallint",
  "mediumint",
  "int",
  "bigint",
  "decimal",
  "float",
  "double",
  "real",
  "bit",
  "boolean",
  "serial",
  // Date / Time
  "date",
  "datetime",
  "timestamp",
  "time",
  "year",
  // Geometry
  "geometry",
  "geography",
  "point",
  // String
  "char",
  "varchar",
  "tinytext",
  "tinyText",
  "text",
  "mediumtext",
  "mediumText",
  "longtext",
  "longText",
  "binary",
  "varbinary",
  "tinyblob",
  "tinyBlob",
  "mediumblob",
  "mediumBlob",
  "blob",
  "longblob",
  "longBlob",
  "enum",
  "set",
  // Increments, Aliases, and Additional
  "bool",
  "dateTime",
  "increments",
  "bigincrements",
  "bigIncrements",
  "integer",
  "biginteger",
  "bigInteger",
  "string",
  "json",
  "jsonb",
  "uuid",
  "enu",
  "specificType"
];
columnTypes.forEach((type) => {
  TableBuilder$2.prototype[type] = function() {
    const args = toArray$1(arguments);
    const builder2 = this.client.columnBuilder(this, type, args);
    this._statements.push({
      grouping: "columns",
      builder: builder2
    });
    return builder2;
  };
});
const AlterMethods$2 = {
  // Renames the current column `from` the current
  // TODO: this.column(from).rename(to)
  renameColumn(from, to) {
    this._statements.push({
      grouping: "alterTable",
      method: "renameColumn",
      args: [from, to]
    });
    return this;
  },
  dropTimestamps() {
    return this.dropColumns(
      arguments[0] === true ? ["createdAt", "updatedAt"] : ["created_at", "updated_at"]
    );
  },
  setNullable(column) {
    this._statements.push({
      grouping: "alterTable",
      method: "setNullable",
      args: [column]
    });
    return this;
  },
  check(checkPredicate, bindings2, constraintName) {
    this._statements.push({
      grouping: "alterTable",
      method: "check",
      args: [checkPredicate, bindings2, constraintName]
    });
  },
  dropChecks() {
    this._statements.push({
      grouping: "alterTable",
      method: "dropChecks",
      args: toArray$1(arguments)
    });
  },
  dropNullable(column) {
    this._statements.push({
      grouping: "alterTable",
      method: "dropNullable",
      args: [column]
    });
    return this;
  }
  // TODO: changeType
};
AlterMethods$2.dropColumn = AlterMethods$2.dropColumns = function() {
  this._statements.push({
    grouping: "alterTable",
    method: "dropColumn",
    args: toArray$1(arguments)
  });
  return this;
};
TableBuilder$2.extend = (methodName, fn) => {
  if (Object.prototype.hasOwnProperty.call(TableBuilder$2.prototype, methodName)) {
    throw new Error(
      `Can't extend TableBuilder with existing method ('${methodName}').`
    );
  }
  assign$2(TableBuilder$2.prototype, { [methodName]: fn });
};
var tablebuilder = TableBuilder$2;
var baseIndexOf = _baseIndexOf, toInteger = toInteger_1;
var nativeMax = Math.max;
function indexOf$1(array, value, fromIndex) {
  var length = array == null ? 0 : array.length;
  if (!length) {
    return -1;
  }
  var index = fromIndex == null ? 0 : toInteger(fromIndex);
  if (index < 0) {
    index = nativeMax(length + index, 0);
  }
  return baseIndexOf(array, value, index);
}
var indexOf_1 = indexOf$1;
const {
  pushAdditional,
  pushQuery: pushQuery$1,
  unshiftQuery
} = helpers$4;
const helpers$2 = helpers$7;
const groupBy$2 = groupBy_1;
const indexOf = indexOf_1;
const isEmpty = isEmpty_1;
const tail$1 = tail_1;
const { normalizeArr } = helpers$7;
let TableCompiler$1 = class TableCompiler {
  constructor(client2, tableBuilder) {
    this.client = client2;
    this.tableBuilder = tableBuilder;
    this._commonBuilder = this.tableBuilder;
    this.method = tableBuilder._method;
    this.schemaNameRaw = tableBuilder._schemaName;
    this.tableNameRaw = tableBuilder._tableName;
    this.tableNameLikeRaw = tableBuilder._tableNameLike;
    this.single = tableBuilder._single;
    this.grouped = groupBy$2(tableBuilder._statements, "grouping");
    this.formatter = client2.formatter(tableBuilder);
    this.bindings = [];
    this.formatter.bindings = this.bindings;
    this.bindingsHolder = this;
    this.sequence = [];
    this._formatting = client2.config && client2.config.formatting;
    this.checksCount = 0;
  }
  // Convert the tableCompiler toSQL
  toSQL() {
    this[this.method]();
    return this.sequence;
  }
  // Column Compilation
  // -------
  // If this is a table "creation", we need to first run through all
  // of the columns to build them into a single string,
  // and then run through anything else and push it to the query sequence.
  create(ifNot, like) {
    const columnBuilders = this.getColumns();
    const columns = columnBuilders.map((col) => col.toSQL());
    const columnTypes2 = this.getColumnTypes(columns);
    if (this.createAlterTableMethods) {
      this.alterTableForCreate(columnTypes2);
    }
    this.createQuery(columnTypes2, ifNot, like);
    this.columnQueries(columns);
    delete this.single.comment;
    this.alterTable();
  }
  // Only create the table if it doesn't exist.
  createIfNot() {
    this.create(true);
  }
  createLike() {
    this.create(false, true);
  }
  createLikeIfNot() {
    this.create(true, true);
  }
  // If we're altering the table, we need to one-by-one
  // go through and handle each of the queries associated
  // with altering the table's schema.
  alter() {
    const addColBuilders = this.getColumns();
    const addColumns = addColBuilders.map((col) => col.toSQL());
    const alterColBuilders = this.getColumns("alter");
    const alterColumns = alterColBuilders.map((col) => col.toSQL());
    const addColumnTypes = this.getColumnTypes(addColumns);
    const alterColumnTypes = this.getColumnTypes(alterColumns);
    this.addColumns(addColumnTypes);
    this.alterColumns(alterColumnTypes, alterColBuilders);
    this.columnQueries(addColumns);
    this.columnQueries(alterColumns);
    this.alterTable();
  }
  foreign(foreignData) {
    if (foreignData.inTable && foreignData.references) {
      const keyName = foreignData.keyName ? this.formatter.wrap(foreignData.keyName) : this._indexCommand("foreign", this.tableNameRaw, foreignData.column);
      const column = this.formatter.columnize(foreignData.column);
      const references = this.formatter.columnize(foreignData.references);
      const inTable = this.formatter.wrap(foreignData.inTable);
      const onUpdate = foreignData.onUpdate ? (this.lowerCase ? " on update " : " ON UPDATE ") + foreignData.onUpdate : "";
      const onDelete = foreignData.onDelete ? (this.lowerCase ? " on delete " : " ON DELETE ") + foreignData.onDelete : "";
      const deferrable = foreignData.deferrable ? this.lowerCase ? ` deferrable initially ${foreignData.deferrable.toLowerCase()} ` : ` DEFERRABLE INITIALLY ${foreignData.deferrable.toUpperCase()} ` : "";
      if (this.lowerCase) {
        this.pushQuery(
          (!this.forCreate ? `alter table ${this.tableName()} add ` : "") + "constraint " + keyName + " foreign key (" + column + ") references " + inTable + " (" + references + ")" + onUpdate + onDelete + deferrable
        );
      } else {
        this.pushQuery(
          (!this.forCreate ? `ALTER TABLE ${this.tableName()} ADD ` : "") + "CONSTRAINT " + keyName + " FOREIGN KEY (" + column + ") REFERENCES " + inTable + " (" + references + ")" + onUpdate + onDelete + deferrable
        );
      }
    }
  }
  // Get all of the column sql & bindings individually for building the table queries.
  getColumnTypes(columns) {
    return columns.reduce(
      function(memo, columnSQL) {
        const column = columnSQL[0];
        memo.sql.push(column.sql);
        memo.bindings.concat(column.bindings);
        return memo;
      },
      { sql: [], bindings: [] }
    );
  }
  // Adds all of the additional queries from the "column"
  columnQueries(columns) {
    const queries = columns.reduce(function(memo, columnSQL) {
      const column = tail$1(columnSQL);
      if (!isEmpty(column)) return memo.concat(column);
      return memo;
    }, []);
    for (const q of queries) {
      this.pushQuery(q);
    }
  }
  // All of the columns to "add" for the query
  addColumns(columns, prefix) {
    prefix = prefix || this.addColumnsPrefix;
    if (columns.sql.length > 0) {
      const columnSql = columns.sql.map((column) => {
        return prefix + column;
      });
      this.pushQuery({
        sql: (this.lowerCase ? "alter table " : "ALTER TABLE ") + this.tableName() + " " + columnSql.join(", "),
        bindings: columns.bindings
      });
    }
  }
  alterColumns(columns, colBuilders) {
    if (columns.sql.length > 0) {
      this.addColumns(columns, this.alterColumnsPrefix, colBuilders);
    }
  }
  // Compile the columns as needed for the current create or alter table
  getColumns(method) {
    const columns = this.grouped.columns || [];
    method = method || "add";
    const queryContext = this.tableBuilder.queryContext();
    return columns.filter((column) => column.builder._method === method).map((column) => {
      if (queryContext !== void 0 && column.builder.queryContext() === void 0) {
        column.builder.queryContext(queryContext);
      }
      return this.client.columnCompiler(this, column.builder);
    });
  }
  tableName() {
    const name = this.schemaNameRaw ? `${this.schemaNameRaw}.${this.tableNameRaw}` : this.tableNameRaw;
    return this.formatter.wrap(name);
  }
  tableNameLike() {
    const name = this.schemaNameRaw ? `${this.schemaNameRaw}.${this.tableNameLikeRaw}` : this.tableNameLikeRaw;
    return this.formatter.wrap(name);
  }
  // Generate all of the alter column statements necessary for the query.
  alterTable() {
    const alterTable = this.grouped.alterTable || [];
    for (let i = 0, l = alterTable.length; i < l; i++) {
      const statement = alterTable[i];
      if (this[statement.method]) {
        this[statement.method].apply(this, statement.args);
      } else {
        this.client.logger.error(`Debug: ${statement.method} does not exist`);
      }
    }
    for (const item in this.single) {
      if (typeof this[item] === "function") this[item](this.single[item]);
    }
  }
  alterTableForCreate(columnTypes2) {
    this.forCreate = true;
    const savedSequence = this.sequence;
    const alterTable = this.grouped.alterTable || [];
    this.grouped.alterTable = [];
    for (let i = 0, l = alterTable.length; i < l; i++) {
      const statement = alterTable[i];
      if (indexOf(this.createAlterTableMethods, statement.method) < 0) {
        this.grouped.alterTable.push(statement);
        continue;
      }
      if (this[statement.method]) {
        this.sequence = [];
        this[statement.method].apply(this, statement.args);
        columnTypes2.sql.push(this.sequence[0].sql);
      } else {
        this.client.logger.error(`Debug: ${statement.method} does not exist`);
      }
    }
    this.sequence = savedSequence;
    this.forCreate = false;
  }
  // Drop the index on the current table.
  dropIndex(value) {
    this.pushQuery(`drop index${value}`);
  }
  dropUnique() {
    throw new Error("Method implemented in the dialect driver");
  }
  dropUniqueIfExists() {
    throw new Error("Method implemented in the dialect driver");
  }
  dropForeign() {
    throw new Error("Method implemented in the dialect driver");
  }
  dropForeignIfExists() {
    throw new Error("Method implemented in the dialect driver");
  }
  dropPrimaryIfExists() {
    throw new Error("Method implemented in the dialect driver");
  }
  dropColumn() {
    const columns = helpers$2.normalizeArr.apply(null, arguments);
    const drops = (Array.isArray(columns) ? columns : [columns]).map(
      (column) => {
        return this.dropColumnPrefix + this.formatter.wrap(column);
      }
    );
    this.pushQuery(
      (this.lowerCase ? "alter table " : "ALTER TABLE ") + this.tableName() + " " + drops.join(", ")
    );
  }
  //Default implementation of setNullable. Overwrite on dialect-specific tablecompiler when needed
  //(See postgres/mssql for reference)
  _setNullableState(column, nullable) {
    const tableName = this.tableName();
    const columnName = this.formatter.columnize(column);
    const alterColumnPrefix = this.alterColumnsPrefix;
    return this.pushQuery({
      sql: "SELECT 1",
      output: () => {
        return this.client.queryBuilder().withSchema(this.schemaNameRaw).from(this.tableNameRaw).columnInfo(column).then((columnInfo) => {
          if (isEmpty(columnInfo)) {
            throw new Error(
              `.setNullable: Column ${columnName} does not exist in table ${tableName}.`
            );
          }
          const nullableType = nullable ? "null" : "not null";
          const columnType = columnInfo.type + (columnInfo.maxLength ? `(${columnInfo.maxLength})` : "");
          const defaultValue = columnInfo.defaultValue !== null && columnInfo.defaultValue !== void 0 ? `default '${columnInfo.defaultValue}'` : "";
          const sql = `alter table ${tableName} ${alterColumnPrefix} ${columnName} ${columnType} ${nullableType} ${defaultValue}`;
          return this.client.raw(sql);
        });
      }
    });
  }
  setNullable(column) {
    return this._setNullableState(column, true);
  }
  dropNullable(column) {
    return this._setNullableState(column, false);
  }
  dropChecks(checkConstraintNames) {
    if (checkConstraintNames === void 0) return "";
    checkConstraintNames = normalizeArr(checkConstraintNames);
    const tableName = this.tableName();
    const sql = `alter table ${tableName} ${checkConstraintNames.map((constraint) => `drop constraint ${constraint}`).join(", ")}`;
    this.pushQuery(sql);
  }
  check(checkPredicate, bindings2, constraintName) {
    const tableName = this.tableName();
    let checkConstraint = constraintName;
    if (!checkConstraint) {
      this.checksCount++;
      checkConstraint = tableName + "_" + this.checksCount;
    }
    const sql = `alter table ${tableName} add constraint ${checkConstraint} check(${checkPredicate})`;
    this.pushQuery(sql);
  }
  _addChecks() {
    if (this.grouped.checks) {
      return ", " + this.grouped.checks.map((c) => {
        return `${c.args[2] ? "constraint " + c.args[2] + " " : ""}check (${this.client.raw(c.args[0], c.args[1])})`;
      }).join(", ");
    }
    return "";
  }
  // If no name was specified for this index, we will create one using a basic
  // convention of the table name, followed by the columns, followed by an
  // index type, such as primary or index, which makes the index unique.
  _indexCommand(type, tableName, columns) {
    if (!Array.isArray(columns)) columns = columns ? [columns] : [];
    const table = tableName.replace(/\.|-/g, "_");
    const indexName = (table + "_" + columns.join("_") + "_" + type).toLowerCase();
    return this.formatter.wrap(indexName);
  }
  _getPrimaryKeys() {
    return (this.grouped.alterTable || []).filter((a) => a.method === "primary").flatMap((a) => a.args).flat();
  }
  _canBeAddPrimaryKey(options) {
    return options.primaryKey && this._getPrimaryKeys().length === 0;
  }
  _getIncrementsColumnNames() {
    return this.grouped.columns.filter((c) => c.builder._type === "increments").map((c) => c.builder._args[0]);
  }
  _getBigIncrementsColumnNames() {
    return this.grouped.columns.filter((c) => c.builder._type === "bigincrements").map((c) => c.builder._args[0]);
  }
};
TableCompiler$1.prototype.pushQuery = pushQuery$1;
TableCompiler$1.prototype.pushAdditional = pushAdditional;
TableCompiler$1.prototype.unshiftQuery = unshiftQuery;
TableCompiler$1.prototype.lowerCase = true;
TableCompiler$1.prototype.createAlterTableMethods = null;
TableCompiler$1.prototype.addColumnsPrefix = "add column ";
TableCompiler$1.prototype.alterColumnsPrefix = "alter column ";
TableCompiler$1.prototype.modifyColumnPrefix = "modify column ";
TableCompiler$1.prototype.dropColumnPrefix = "drop column ";
var tablecompiler = TableCompiler$1;
const extend$1 = extend$3;
const assign$1 = assign_1;
const toArray = toArray_1;
const { addQueryContext } = helpers$7;
let ColumnBuilder$2 = class ColumnBuilder {
  constructor(client2, tableBuilder, type, args) {
    this.client = client2;
    this._method = "add";
    this._single = {};
    this._modifiers = {};
    this._statements = [];
    this._type = columnAlias[type] || type;
    this._args = args;
    this._tableBuilder = tableBuilder;
    if (tableBuilder._method === "alter") {
      extend$1(this, AlterMethods$1);
    }
  }
  // Specify that the current column "references" a column,
  // which may be tableName.column or just "column"
  references(value) {
    return this._tableBuilder.foreign.call(this._tableBuilder, this._args[0], void 0, this)._columnBuilder(this).references(value);
  }
};
const modifiers = [
  "default",
  "defaultsTo",
  "defaultTo",
  "unsigned",
  "nullable",
  "first",
  "after",
  "comment",
  "collate",
  "check",
  "checkPositive",
  "checkNegative",
  "checkIn",
  "checkNotIn",
  "checkBetween",
  "checkLength",
  "checkRegex"
];
const aliasMethod = {
  default: "defaultTo",
  defaultsTo: "defaultTo"
};
modifiers.forEach(function(method) {
  const key = aliasMethod[method] || method;
  ColumnBuilder$2.prototype[method] = function() {
    this._modifiers[key] = toArray(arguments);
    return this;
  };
});
addQueryContext(ColumnBuilder$2);
ColumnBuilder$2.prototype.notNull = ColumnBuilder$2.prototype.notNullable = function notNullable() {
  return this.nullable(false);
};
["index", "primary", "unique"].forEach(function(method) {
  ColumnBuilder$2.prototype[method] = function() {
    if (this._type.toLowerCase().indexOf("increments") === -1) {
      this._tableBuilder[method].apply(
        this._tableBuilder,
        [this._args[0]].concat(toArray(arguments))
      );
    }
    return this;
  };
});
ColumnBuilder$2.extend = (methodName, fn) => {
  if (Object.prototype.hasOwnProperty.call(ColumnBuilder$2.prototype, methodName)) {
    throw new Error(
      `Can't extend ColumnBuilder with existing method ('${methodName}').`
    );
  }
  assign$1(ColumnBuilder$2.prototype, { [methodName]: fn });
};
const AlterMethods$1 = {};
AlterMethods$1.drop = function() {
  this._single.drop = true;
  return this;
};
AlterMethods$1.alterType = function(type) {
  this._statements.push({
    grouping: "alterType",
    value: type
  });
  return this;
};
AlterMethods$1.alter = function({
  alterNullable = true,
  alterType = true
} = {}) {
  this._method = "alter";
  this.alterNullable = alterNullable;
  this.alterType = alterType;
  return this;
};
const columnAlias = {
  float: "floating",
  enum: "enu",
  boolean: "bool",
  string: "varchar",
  bigint: "bigInteger"
};
var columnbuilder = ColumnBuilder$2;
function head(array) {
  return array && array.length ? array[0] : void 0;
}
var head_1 = head;
var first$1 = head_1;
const helpers$1 = helpers$4;
const groupBy$1 = groupBy_1;
const first = first$1;
const has = has_1;
const tail = tail_1;
const { toNumber } = helpers$7;
const { formatDefault } = formatterUtils;
const { operator: operator_ } = wrappingFormatter;
let ColumnCompiler$1 = class ColumnCompiler {
  constructor(client2, tableCompiler, columnBuilder) {
    this.client = client2;
    this.tableCompiler = tableCompiler;
    this.columnBuilder = columnBuilder;
    this._commonBuilder = this.columnBuilder;
    this.args = columnBuilder._args;
    this.type = columnBuilder._type.toLowerCase();
    this.grouped = groupBy$1(columnBuilder._statements, "grouping");
    this.modified = columnBuilder._modifiers;
    this.isIncrements = this.type.indexOf("increments") !== -1;
    this.formatter = client2.formatter(columnBuilder);
    this.bindings = [];
    this.formatter.bindings = this.bindings;
    this.bindingsHolder = this;
    this.sequence = [];
    this.modifiers = [];
    this.checksCount = 0;
  }
  _addCheckModifiers() {
    this.modifiers.push(
      "check",
      "checkPositive",
      "checkNegative",
      "checkIn",
      "checkNotIn",
      "checkBetween",
      "checkLength",
      "checkRegex"
    );
  }
  defaults(label) {
    if (Object.prototype.hasOwnProperty.call(this._defaultMap, label)) {
      return this._defaultMap[label].bind(this)();
    } else {
      throw new Error(
        `There is no default for the specified identifier ${label}`
      );
    }
  }
  // To convert to sql, we first go through and build the
  // column as it would be in the insert statement
  toSQL() {
    this.pushQuery(this.compileColumn());
    if (this.sequence.additional) {
      this.sequence = this.sequence.concat(this.sequence.additional);
    }
    return this.sequence;
  }
  // Compiles a column.
  compileColumn() {
    return this.formatter.wrap(this.getColumnName()) + " " + this.getColumnType() + this.getModifiers();
  }
  // Assumes the autoincrementing key is named `id` if not otherwise specified.
  getColumnName() {
    const value = first(this.args);
    return value || this.defaults("columnName");
  }
  getColumnType() {
    if (!this._columnType) {
      const type = this[this.type];
      this._columnType = typeof type === "function" ? type.apply(this, tail(this.args)) : type;
    }
    return this._columnType;
  }
  getModifiers() {
    const modifiers2 = [];
    for (let i = 0, l = this.modifiers.length; i < l; i++) {
      const modifier = this.modifiers[i];
      if (!this.isIncrements || this.isIncrements && modifier === "comment") {
        if (has(this.modified, modifier)) {
          const val = this[modifier].apply(this, this.modified[modifier]);
          if (val) modifiers2.push(val);
        }
      }
    }
    return modifiers2.length > 0 ? ` ${modifiers2.join(" ")}` : "";
  }
  // Types
  // ------
  varchar(length) {
    return `varchar(${toNumber(length, 255)})`;
  }
  floating(precision, scale) {
    return `float(${toNumber(precision, 8)}, ${toNumber(scale, 2)})`;
  }
  decimal(precision, scale) {
    if (precision === null) {
      throw new Error(
        "Specifying no precision on decimal columns is not supported for that SQL dialect."
      );
    }
    return `decimal(${toNumber(precision, 8)}, ${toNumber(scale, 2)})`;
  }
  // Used to support custom types
  specifictype(type) {
    return type;
  }
  // Modifiers
  // -------
  nullable(nullable) {
    return nullable === false ? "not null" : "null";
  }
  notNullable() {
    return this.nullable(false);
  }
  defaultTo(value) {
    return `default ${formatDefault(value, this.type, this.client)}`;
  }
  increments(options = { primaryKey: true }) {
    return "integer not null" + (this.tableCompiler._canBeAddPrimaryKey(options) ? " primary key" : "") + " autoincrement";
  }
  bigincrements(options = { primaryKey: true }) {
    return this.increments(options);
  }
  _pushAlterCheckQuery(checkPredicate, constraintName) {
    let checkName = constraintName;
    if (!checkName) {
      this.checksCount++;
      checkName = this.tableCompiler.tableNameRaw + "_" + this.getColumnName() + "_" + this.checksCount;
    }
    this.pushAdditional(function() {
      this.pushQuery(
        `alter table ${this.tableCompiler.tableName()} add constraint ${checkName} check(${checkPredicate})`
      );
    });
  }
  _checkConstraintName(constraintName) {
    return constraintName ? `constraint ${constraintName} ` : "";
  }
  _check(checkPredicate, constraintName) {
    if (this.columnBuilder._method === "alter") {
      this._pushAlterCheckQuery(checkPredicate, constraintName);
      return "";
    }
    return `${this._checkConstraintName(
      constraintName
    )}check (${checkPredicate})`;
  }
  checkPositive(constraintName) {
    return this._check(
      `${this.formatter.wrap(this.getColumnName())} ${operator_(
        ">",
        this.columnBuilder,
        this.bindingsHolder
      )} 0`,
      constraintName
    );
  }
  checkNegative(constraintName) {
    return this._check(
      `${this.formatter.wrap(this.getColumnName())} ${operator_(
        "<",
        this.columnBuilder,
        this.bindingsHolder
      )} 0`,
      constraintName
    );
  }
  _checkIn(values2, constraintName, not) {
    return this._check(
      `${this.formatter.wrap(this.getColumnName())} ${not ? "not " : ""}in (${values2.map((v) => this.client._escapeBinding(v)).join(",")})`,
      constraintName
    );
  }
  checkIn(values2, constraintName) {
    return this._checkIn(values2, constraintName);
  }
  checkNotIn(values2, constraintName) {
    return this._checkIn(values2, constraintName, true);
  }
  checkBetween(intervals, constraintName) {
    if (intervals.length === 2 && !Array.isArray(intervals[0]) && !Array.isArray(intervals[1])) {
      intervals = [intervals];
    }
    const intervalChecks = intervals.map((interval) => {
      return `${this.formatter.wrap(
        this.getColumnName()
      )} between ${this.client._escapeBinding(
        interval[0]
      )} and ${this.client._escapeBinding(interval[1])}`;
    }).join(" or ");
    return this._check(intervalChecks, constraintName);
  }
  checkLength(operator2, length, constraintName) {
    return this._check(
      `length(${this.formatter.wrap(this.getColumnName())}) ${operator_(
        operator2,
        this.columnBuilder,
        this.bindingsHolder
      )} ${toNumber(length)}`,
      constraintName
    );
  }
};
ColumnCompiler$1.prototype.binary = "blob";
ColumnCompiler$1.prototype.bool = "boolean";
ColumnCompiler$1.prototype.date = "date";
ColumnCompiler$1.prototype.datetime = "datetime";
ColumnCompiler$1.prototype.time = "time";
ColumnCompiler$1.prototype.timestamp = "timestamp";
ColumnCompiler$1.prototype.geometry = "geometry";
ColumnCompiler$1.prototype.geography = "geography";
ColumnCompiler$1.prototype.point = "point";
ColumnCompiler$1.prototype.enu = "varchar";
ColumnCompiler$1.prototype.bit = ColumnCompiler$1.prototype.json = "text";
ColumnCompiler$1.prototype.uuid = ({
  useBinaryUuid = false,
  primaryKey = false
} = {}) => useBinaryUuid ? "binary(16)" : "char(36)";
ColumnCompiler$1.prototype.integer = ColumnCompiler$1.prototype.smallint = ColumnCompiler$1.prototype.mediumint = "integer";
ColumnCompiler$1.prototype.biginteger = "bigint";
ColumnCompiler$1.prototype.text = "text";
ColumnCompiler$1.prototype.tinyint = "tinyint";
ColumnCompiler$1.prototype.pushQuery = helpers$1.pushQuery;
ColumnCompiler$1.prototype.pushAdditional = helpers$1.pushAdditional;
ColumnCompiler$1.prototype.unshiftQuery = helpers$1.unshiftQuery;
ColumnCompiler$1.prototype._defaultMap = {
  columnName: function() {
    if (!this.isIncrements) {
      throw new Error(
        `You did not specify a column name for the ${this.type} column.`
      );
    }
    return "id";
  }
};
var columncompiler = ColumnCompiler$1;
const Raw$1 = raw;
let Ref$1 = class Ref extends Raw$1 {
  constructor(client2, ref2) {
    super(client2);
    this.ref = ref2;
    this._schema = null;
    this._alias = null;
  }
  withSchema(schema) {
    this._schema = schema;
    return this;
  }
  as(alias) {
    this._alias = alias;
    return this;
  }
  toSQL() {
    const string2 = this._schema ? `${this._schema}.${this.ref}` : this.ref;
    const formatter2 = this.client.formatter(this);
    const ref2 = formatter2.columnize(string2);
    const sql = this._alias ? `${ref2} as ${formatter2.wrap(this._alias)}` : ref2;
    this.set(sql, []);
    return super.toSQL(...arguments);
  }
};
var ref = Ref$1;
const {
  columnize: columnize_$1,
  wrap: wrap_
} = wrappingFormatter;
let Formatter$1 = class Formatter {
  constructor(client2, builder2) {
    this.client = client2;
    this.builder = builder2;
    this.bindings = [];
  }
  // Accepts a string or array of columns to wrap as appropriate.
  columnize(target) {
    return columnize_$1(target, this.builder, this.client, this);
  }
  // Puts the appropriate wrapper around a value depending on the database
  // engine, unless it's a knex.raw value, in which case it's left alone.
  wrap(value, isParameter) {
    return wrap_(value, isParameter, this.builder, this.client, this);
  }
};
var formatter = Formatter$1;
const helpers = helpers$7;
const extend = extend$3;
const assign = assign_1;
let ViewBuilder$2 = class ViewBuilder {
  constructor(client2, method, viewName, fn) {
    this.client = client2;
    this._method = method;
    this._schemaName = void 0;
    this._columns = void 0;
    this._fn = fn;
    this._viewName = viewName;
    this._statements = [];
    this._single = {};
  }
  setSchema(schemaName) {
    this._schemaName = schemaName;
  }
  columns(columns) {
    this._columns = columns;
  }
  as(selectQuery) {
    this._selectQuery = selectQuery;
  }
  checkOption() {
    throw new Error(
      "check option definition is not supported by this dialect."
    );
  }
  localCheckOption() {
    throw new Error(
      "check option definition is not supported by this dialect."
    );
  }
  cascadedCheckOption() {
    throw new Error(
      "check option definition is not supported by this dialect."
    );
  }
  toSQL() {
    if (this._method === "alter") {
      extend(this, AlterMethods);
    }
    this._fn.call(this, this);
    return this.client.viewCompiler(this).toSQL();
  }
};
const AlterMethods = {
  column(column) {
    const self2 = this;
    return {
      rename: function(newName) {
        self2._statements.push({
          grouping: "alterView",
          method: "renameColumn",
          args: [column, newName]
        });
        return this;
      },
      defaultTo: function(defaultValue) {
        self2._statements.push({
          grouping: "alterView",
          method: "defaultTo",
          args: [column, defaultValue]
        });
        return this;
      }
    };
  }
};
helpers.addQueryContext(ViewBuilder$2);
ViewBuilder$2.extend = (methodName, fn) => {
  if (Object.prototype.hasOwnProperty.call(ViewBuilder$2.prototype, methodName)) {
    throw new Error(
      `Can't extend ViewBuilder with existing method ('${methodName}').`
    );
  }
  assign(ViewBuilder$2.prototype, { [methodName]: fn });
};
var viewbuilder = ViewBuilder$2;
const { pushQuery } = helpers$4;
const groupBy = groupBy_1;
const { columnize: columnize_ } = wrappingFormatter;
let ViewCompiler$1 = class ViewCompiler {
  constructor(client2, viewBuilder) {
    this.client = client2;
    this.viewBuilder = viewBuilder;
    this._commonBuilder = this.viewBuilder;
    this.method = viewBuilder._method;
    this.schemaNameRaw = viewBuilder._schemaName;
    this.viewNameRaw = viewBuilder._viewName;
    this.single = viewBuilder._single;
    this.selectQuery = viewBuilder._selectQuery;
    this.columns = viewBuilder._columns;
    this.grouped = groupBy(viewBuilder._statements, "grouping");
    this.formatter = client2.formatter(viewBuilder);
    this.bindings = [];
    this.formatter.bindings = this.bindings;
    this.bindingsHolder = this;
    this.sequence = [];
  }
  // Convert the tableCompiler toSQL
  toSQL() {
    this[this.method]();
    return this.sequence;
  }
  // Column Compilation
  // -------
  create() {
    this.createQuery(this.columns, this.selectQuery);
  }
  createOrReplace() {
    throw new Error("replace views is not supported by this dialect.");
  }
  createMaterializedView() {
    throw new Error("materialized views are not supported by this dialect.");
  }
  createQuery(columns, selectQuery, materialized, replace) {
    const createStatement = "create " + (materialized ? "materialized " : "") + (replace ? "or replace " : "") + "view ";
    const columnList = columns ? " (" + columnize_(
      columns,
      this.viewBuilder,
      this.client,
      this.bindingsHolder
    ) + ")" : "";
    let sql = createStatement + this.viewName() + columnList;
    sql += " as ";
    sql += selectQuery.toString();
    switch (this.single.checkOption) {
      case "default_option":
        sql += " with check option";
        break;
      case "local":
        sql += " with local check option";
        break;
      case "cascaded":
        sql += " with cascaded check option";
        break;
    }
    this.pushQuery({
      sql
    });
  }
  renameView(from, to) {
    throw new Error(
      "rename view is not supported by this dialect (instead drop, then create another view)."
    );
  }
  refreshMaterializedView() {
    throw new Error("materialized views are not supported by this dialect.");
  }
  alter() {
    this.alterView();
  }
  alterView() {
    const alterView = this.grouped.alterView || [];
    for (let i = 0, l = alterView.length; i < l; i++) {
      const statement = alterView[i];
      if (this[statement.method]) {
        this[statement.method].apply(this, statement.args);
      } else {
        this.client.logger.error(`Debug: ${statement.method} does not exist`);
      }
    }
    for (const item in this.single) {
      if (typeof this[item] === "function") this[item](this.single[item]);
    }
  }
  renameColumn(from, to) {
    throw new Error("rename column of views is not supported by this dialect.");
  }
  defaultTo(column, defaultValue) {
    throw new Error(
      "change default values of views is not supported by this dialect."
    );
  }
  viewName() {
    const name = this.schemaNameRaw ? `${this.schemaNameRaw}.${this.viewNameRaw}` : this.viewNameRaw;
    return this.formatter.wrap(name);
  }
};
ViewCompiler$1.prototype.pushQuery = pushQuery;
var viewcompiler = ViewCompiler$1;
const { TimeoutError: TimeoutError2 } = tarnExports;
const { KnexPool: KnexPool$1, isTarnPool } = pool;
const { EventEmitter } = require$$0;
const { promisify } = require$$3;
const { makeEscape } = string;
const cloneDeepWith = cloneDeepWith_1;
const defaults = defaults_1;
const uniqueId = uniqueId_1;
const Runner2 = runner;
const Transaction2 = transaction$6;
const {
  executeQuery,
  enrichQueryObject
} = queryExecutioner;
const QueryBuilder$1 = querybuilder;
const QueryCompiler2 = querycompiler;
const SchemaBuilder$1 = builder;
const SchemaCompiler2 = compiler$1;
const TableBuilder$1 = tablebuilder;
const TableCompiler2 = tablecompiler;
const ColumnBuilder$1 = columnbuilder;
const ColumnCompiler2 = columncompiler;
const { KnexTimeoutError: KnexTimeoutError$1 } = timeout$3;
const { outputQuery, unwrapRaw } = wrappingFormatter;
const { compileCallback } = formatterUtils;
const Raw2 = raw;
const Ref2 = ref;
const Formatter2 = formatter;
const Logger2 = logger;
const { POOL_CONFIG_OPTIONS } = constants$1;
const ViewBuilder$1 = viewbuilder;
const ViewCompiler2 = viewcompiler;
const isPlainObject = isPlainObject_1;
const { setHiddenProperty } = security;
const debug = srcExports("knex:client");
function preserveClassInstances(value) {
  if (value !== null && typeof value === "object" && !Array.isArray(value) && !isPlainObject(value)) {
    return value;
  }
}
let Client$2 = class Client extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = { ...config };
    if (config.connection && typeof config.connection === "object") {
      this.config.connection = { ...config.connection };
    }
    this.logger = new Logger2(this.config);
    if (this.config.connection && config.connection.password) {
      setHiddenProperty(this.config.connection, config.connection);
    }
    if (this.dialect && !this.config.client) {
      this.logger.warn(
        `Using 'this.dialect' to identify the client is deprecated and support for it will be removed in the future. Please use configuration option 'client' instead.`
      );
    }
    const dbClient = this.config.client || this.dialect;
    if (!dbClient) {
      throw new Error(
        `knex: Required configuration option 'client' is missing.`
      );
    }
    if (config.version) {
      this.version = config.version;
    }
    if (this.config.connection && this.config.connection instanceof Function) {
      this.connectionConfigProvider = this.config.connection;
      this.connectionConfigExpirationChecker = () => true;
    } else {
      this.connectionSettings = cloneDeepWith(
        this.config.connection || {},
        preserveClassInstances
      );
      if (config.connection && config.connection.password) {
        setHiddenProperty(this.connectionSettings, this.config.connection);
      }
      this.connectionConfigExpirationChecker = null;
    }
    if (this.driverName && config.connection) {
      this.initializeDriver();
    }
    const shouldInitPool = this.driverName && (config.connection || config.connectionPool);
    if (shouldInitPool) {
      if (!config.pool || config.pool && config.pool.max !== 0) {
        this.initializePool(this.config);
      }
    }
    this.valueForUndefined = this.raw("DEFAULT");
    if (config.useNullAsDefault) {
      this.valueForUndefined = null;
    }
  }
  formatter(builder2) {
    return new Formatter2(this, builder2);
  }
  queryBuilder() {
    return new QueryBuilder$1(this);
  }
  queryCompiler(builder2, formatter2) {
    return new QueryCompiler2(this, builder2, formatter2);
  }
  schemaBuilder() {
    return new SchemaBuilder$1(this);
  }
  schemaCompiler(builder2) {
    return new SchemaCompiler2(this, builder2);
  }
  tableBuilder(type, tableName, tableNameLike, fn) {
    return new TableBuilder$1(this, type, tableName, tableNameLike, fn);
  }
  viewBuilder(type, viewBuilder, fn) {
    return new ViewBuilder$1(this, type, viewBuilder, fn);
  }
  tableCompiler(tableBuilder) {
    return new TableCompiler2(this, tableBuilder);
  }
  viewCompiler(viewCompiler) {
    return new ViewCompiler2(this, viewCompiler);
  }
  columnBuilder(tableBuilder, type, args) {
    return new ColumnBuilder$1(this, tableBuilder, type, args);
  }
  columnCompiler(tableBuilder, columnBuilder) {
    return new ColumnCompiler2(this, tableBuilder, columnBuilder);
  }
  runner(builder2) {
    return new Runner2(this, builder2);
  }
  transaction(container, config, outerTx) {
    return new Transaction2(this, container, config, outerTx);
  }
  raw() {
    return new Raw2(this).set(...arguments);
  }
  ref() {
    return new Ref2(this, ...arguments);
  }
  query(connection, queryParam) {
    const queryObject = enrichQueryObject(connection, queryParam, this);
    return executeQuery(connection, queryObject, this);
  }
  stream(connection, queryParam, stream, options) {
    const queryObject = enrichQueryObject(connection, queryParam, this);
    return this._stream(connection, queryObject, stream, options);
  }
  prepBindings(bindings2) {
    return bindings2;
  }
  positionBindings(sql) {
    return sql;
  }
  postProcessResponse(resp, queryContext) {
    if (this.config.postProcessResponse) {
      return this.config.postProcessResponse(resp, queryContext);
    }
    return resp;
  }
  wrapIdentifier(value, queryContext) {
    return this.customWrapIdentifier(
      value,
      this.wrapIdentifierImpl,
      queryContext
    );
  }
  customWrapIdentifier(value, origImpl, queryContext) {
    if (this.config.wrapIdentifier) {
      return this.config.wrapIdentifier(value, origImpl, queryContext);
    }
    return origImpl(value);
  }
  wrapIdentifierImpl(value) {
    return value !== "*" ? `"${value.replace(/"/g, '""')}"` : "*";
  }
  initializeDriver() {
    try {
      this.driver = this._driver();
    } catch (e) {
      const packageName = this._packageName || this.driverName;
      const message = `Knex: run
$ npm install ${packageName} --save`;
      this.logger.error(`${message}
${e.message}
${e.stack}`);
      throw new Error(`${message}
${e.message}`);
    }
  }
  poolDefaults() {
    return { min: 2, max: 10, propagateCreateError: true };
  }
  getPoolSettings(poolConfig) {
    const {
      afterCreate: userAfterCreate,
      validate: userValidate,
      maxConnectionLifetimeMillis,
      maxConnectionLifetimeJitterMillis,
      ...tarnOptions
    } = defaults({}, poolConfig, this.poolDefaults());
    POOL_CONFIG_OPTIONS.forEach((option) => {
      if (option in tarnOptions) {
        this.logger.warn(
          [
            `Pool config option "${option}" is no longer supported.`,
            `See https://github.com/Vincit/tarn.js for possible pool config options.`
          ].join(" ")
        );
      }
    });
    const DEFAULT_ACQUIRE_TIMEOUT = 6e4;
    const timeouts = [
      this.config.acquireConnectionTimeout,
      tarnOptions.acquireTimeoutMillis
    ].filter((timeout2) => timeout2 !== void 0);
    if (!timeouts.length) {
      timeouts.push(DEFAULT_ACQUIRE_TIMEOUT);
    }
    const acquireTimeoutMillis = Math.min(...timeouts);
    const hasMaxConnectionLifetime = typeof maxConnectionLifetimeMillis === "number" && Number.isFinite(maxConnectionLifetimeMillis) && maxConnectionLifetimeMillis > 0;
    const generateLifetimeLimit = () => {
      if (!hasMaxConnectionLifetime) {
        return null;
      }
      const jitter = typeof maxConnectionLifetimeJitterMillis === "number" && maxConnectionLifetimeJitterMillis > 0 ? Math.floor(Math.random() * maxConnectionLifetimeJitterMillis) : 0;
      return performance.now() + maxConnectionLifetimeMillis + jitter;
    };
    const updatePoolConnectionSettingsFromProvider = async (forceRefresh = false) => {
      if (!this.connectionConfigProvider) {
        return;
      }
      if (!forceRefresh && (!this.connectionConfigExpirationChecker || !this.connectionConfigExpirationChecker())) {
        return;
      }
      const providerResult = await this.connectionConfigProvider();
      if (providerResult.expirationChecker) {
        this.connectionConfigExpirationChecker = providerResult.expirationChecker;
        delete providerResult.expirationChecker;
      } else {
        this.connectionConfigExpirationChecker = null;
      }
      this.connectionSettings = providerResult;
    };
    const connectionIsDisposed = (connection) => {
      if (connection.__knex__disposed) {
        this.logger.warn(`Connection Error: ${connection.__knex__disposed}`);
        return true;
      }
      return false;
    };
    const connectionIsOverLifetime = (connection) => {
      if (!hasMaxConnectionLifetime) {
        return false;
      }
      if (!connection.__knexLifetimeLimit) {
        connection.__knexLifetimeLimit = generateLifetimeLimit();
      }
      return connection.__knexLifetimeLimit && performance.now() > connection.__knexLifetimeLimit;
    };
    const configWasRefreshed = async () => {
      if (!this.connectionConfigExpirationChecker) {
        return false;
      }
      if (!this.connectionConfigExpirationChecker()) {
        return false;
      }
      await updatePoolConnectionSettingsFromProvider(true);
      if (this.connectionConfigExpirationChecker && this.connectionConfigExpirationChecker()) {
        throw new Error(
          "Connection configuration still reported expired after refresh"
        );
      }
      return true;
    };
    const tarnPoolConfig = {
      ...tarnOptions,
      acquireTimeoutMillis,
      create: async () => {
        await updatePoolConnectionSettingsFromProvider();
        const connection = await this.acquireRawConnection();
        connection.__knexUid = uniqueId("__knexUid");
        if (hasMaxConnectionLifetime) {
          connection.__knexLifetimeLimit = generateLifetimeLimit();
        }
        if (userAfterCreate) {
          await promisify(userAfterCreate)(connection);
        }
        return connection;
      },
      destroy: (connection) => {
        if (connection !== void 0) {
          return this.destroyRawConnection(connection);
        }
      },
      validate: async (connection) => {
        if (connectionIsDisposed(connection)) {
          return false;
        }
        if (connectionIsOverLifetime(connection)) {
          return false;
        }
        if (await configWasRefreshed()) {
          return false;
        }
        if (userValidate) {
          try {
            const validationResult = await userValidate(connection);
            if (!validationResult) {
              return false;
            }
          } catch (validationError) {
            this.logger.warn(
              `Pool validate threw an error: ${validationError.message}`
            );
            return false;
          }
        }
        return this.validateConnection(connection);
      }
    };
    if (tarnPoolConfig.afterCreate) {
      delete tarnPoolConfig.afterCreate;
    }
    return tarnPoolConfig;
  }
  initializePool(config = this.config) {
    if (this.pool) {
      this.logger.warn("The pool has already been initialized");
      return;
    }
    if (config.connectionPool) {
      this.connectionSettings = {};
      this.connectionConfigExpirationChecker = null;
      if (this.driverName) {
        this.initializeDriver();
      }
      this.initializeExternalPool(config.connectionPool);
    } else {
      this.pool = new KnexPool$1(this.getPoolSettings(config.pool));
      this._ownsPool = true;
    }
  }
  // Accept an external pool — either a tarn-compatible pool (KnexPool, tarn Pool)
  // or a native driver pool (pg.Pool, mysql.createPool(), etc.)
  initializeExternalPool(externalPool) {
    if (this.pool) {
      this.logger.warn("The pool has already been initialized");
      return;
    }
    if (isTarnPool(externalPool)) {
      this.pool = externalPool;
    } else {
      this.pool = this.wrapNativePool(externalPool);
    }
    this._ownsPool = false;
  }
  // Override in dialects that support native driver pools.
  // Must return an object with { acquire(), release(), destroy() } matching tarn's interface.
  wrapNativePool(_nativePool) {
    throw new Error(
      `The '${this.driverName || "base"}' dialect does not support native driver pools in 'connectionPool'. Pass a tarn Pool or KnexPool instance instead.`
    );
  }
  validateConnection(connection) {
    return true;
  }
  // Acquire a connection from the pool.
  async acquireConnection() {
    if (!this.pool) {
      throw new Error("Unable to acquire a connection");
    }
    try {
      const connection = await this.pool.acquire().promise;
      debug("acquired connection from pool: %s", connection.__knexUid);
      if (connection.config) {
        if (connection.config.password) {
          setHiddenProperty(connection.config);
        }
        if (connection.config.authentication && connection.config.authentication.options && connection.config.authentication.options.password) {
          setHiddenProperty(connection.config.authentication.options);
        }
      }
      return connection;
    } catch (error) {
      const withStack = error instanceof Error ? error.stack ?? error.message : String(error);
      this.logger.warn(`Acquire connection error: ${withStack}`);
      let convertedError = error;
      if (error instanceof TimeoutError2) {
        convertedError = new KnexTimeoutError$1(
          "Knex: Timeout acquiring a connection. The pool is probably full. Are you missing a .transacting(trx) call?"
        );
        convertedError.cause = error;
      }
      throw convertedError;
    }
  }
  // Releases a connection back to the connection pool,
  // returning a promise resolved when the connection is released.
  releaseConnection(connection) {
    debug("releasing connection to pool: %s", connection.__knexUid);
    const didRelease = this.pool.release(connection);
    if (!didRelease) {
      debug("pool refused connection: %s", connection.__knexUid);
    }
    return Promise.resolve();
  }
  // Destroy the current connection pool for the client.
  // When the pool is externally provided (_ownsPool === false), we only drop
  // our reference — the caller is responsible for tearing it down.
  async destroy(callback) {
    try {
      if (this.pool && this.pool.destroy && this._ownsPool !== false) {
        await this.pool.destroy();
      }
      this.pool = void 0;
      if (typeof callback === "function") {
        callback();
      }
    } catch (err) {
      if (typeof callback === "function") {
        return callback(err);
      }
      throw err;
    }
  }
  // Return the database being used by this client.
  database() {
    return this.connectionSettings.database;
  }
  toString() {
    return "[object KnexClient]";
  }
  assertCanCancelQuery() {
    if (!this.canCancelQuery) {
      throw new Error("Query cancelling not supported for this dialect");
    }
  }
  cancelQuery() {
    throw new Error("Query cancelling not supported for this dialect");
  }
  // Formatter part
  alias(first2, second) {
    return first2 + " as " + second;
  }
  // Checks whether a value is a function... if it is, we compile it
  // otherwise we check whether it's a raw
  parameter(value, builder2, bindingsHolder) {
    if (typeof value === "function") {
      return outputQuery(
        compileCallback(value, void 0, this, bindingsHolder),
        true,
        builder2,
        this
      );
    }
    return unwrapRaw(value, true, builder2, this, bindingsHolder) || "?";
  }
  // Turns a list of values into a list of ?'s, joining them with commas unless
  // a "joining" value is specified (e.g. ' and ')
  parameterize(values2, notSetValue, builder2, bindingsHolder) {
    if (typeof values2 === "function")
      return this.parameter(values2, builder2, bindingsHolder);
    values2 = Array.isArray(values2) ? values2 : [values2];
    let str = "", i = -1;
    while (++i < values2.length) {
      if (i > 0) str += ", ";
      let value = values2[i];
      if (isPlainObject(value)) {
        value = JSON.stringify(value);
      }
      str += this.parameter(
        value === void 0 ? notSetValue : value,
        builder2,
        bindingsHolder
      );
    }
    return str;
  }
  // Formats `values` into a parenthesized list of parameters for a `VALUES`
  // clause.
  //
  // [1, 2]                  -> '(?, ?)'
  // [[1, 2], [3, 4]]        -> '((?, ?), (?, ?))'
  // knex('table')           -> '(select * from "table")'
  // knex.raw('select ?', 1) -> '(select ?)'
  //
  values(values2, builder2, bindingsHolder) {
    if (Array.isArray(values2)) {
      if (Array.isArray(values2[0])) {
        return `(${values2.map(
          (value) => `(${this.parameterize(
            value,
            void 0,
            builder2,
            bindingsHolder
          )})`
        ).join(", ")})`;
      }
      return `(${this.parameterize(
        values2,
        void 0,
        builder2,
        bindingsHolder
      )})`;
    }
    if (values2 && values2.isRawInstance) {
      return `(${this.parameter(values2, builder2, bindingsHolder)})`;
    }
    return this.parameter(values2, builder2, bindingsHolder);
  }
  processPassedConnection(connection) {
  }
  toPathForJson(jsonPath) {
    return jsonPath;
  }
};
Object.assign(Client$2.prototype, {
  _escapeBinding: makeEscape({
    escapeString(str) {
      return `'${str.replace(/'/g, "''")}'`;
    }
  }),
  canCancelQuery: false
});
var client = Client$2;
function parse$1(str) {
  if (str.charAt(0) === "/") {
    const config2 = str.split(" ");
    return { host: config2[0], database: config2[1] };
  }
  const config = {};
  let result;
  let dummyHost = false;
  if (/ |%[^a-f0-9]|%[a-f0-9][^a-f0-9]/i.test(str)) {
    str = encodeURI(str).replace(/\%25(\d\d)/g, "%$1");
  }
  try {
    result = new URL(str, "postgres://base");
  } catch (e) {
    result = new URL(str.replace("@/", "@___DUMMY___/"), "postgres://base");
    dummyHost = true;
  }
  for (const entry of result.searchParams.entries()) {
    config[entry[0]] = entry[1];
  }
  config.user = config.user || decodeURIComponent(result.username);
  config.password = config.password || decodeURIComponent(result.password);
  if (result.protocol == "socket:") {
    config.host = decodeURI(result.pathname);
    config.database = result.searchParams.get("db");
    config.client_encoding = result.searchParams.get("encoding");
    return config;
  }
  const hostname = dummyHost ? "" : result.hostname;
  if (!config.host) {
    config.host = decodeURIComponent(hostname);
  } else if (hostname && /^%2f/i.test(hostname)) {
    result.pathname = hostname + result.pathname;
  }
  if (!config.port) {
    config.port = result.port;
  }
  const pathname = result.pathname.slice(1) || null;
  config.database = pathname ? decodeURI(pathname) : null;
  if (config.ssl === "true" || config.ssl === "1") {
    config.ssl = true;
  }
  if (config.ssl === "0") {
    config.ssl = false;
  }
  if (config.sslcert || config.sslkey || config.sslrootcert || config.sslmode) {
    config.ssl = {};
  }
  const fs2 = config.sslcert || config.sslkey || config.sslrootcert ? require$$0$2 : null;
  if (config.sslcert) {
    config.ssl.cert = fs2.readFileSync(config.sslcert).toString();
  }
  if (config.sslkey) {
    config.ssl.key = fs2.readFileSync(config.sslkey).toString();
  }
  if (config.sslrootcert) {
    config.ssl.ca = fs2.readFileSync(config.sslrootcert).toString();
  }
  switch (config.sslmode) {
    case "disable": {
      config.ssl = false;
      break;
    }
    case "prefer":
    case "require":
    case "verify-ca":
    case "verify-full": {
      break;
    }
    case "no-verify": {
      config.ssl.rejectUnauthorized = false;
      break;
    }
  }
  return config;
}
var pgConnectionString = parse$1;
parse$1.parse = parse$1;
const { parse } = pgConnectionString;
const parsePG = parse;
const isWindows = process && process.platform && process.platform === "win32";
function tryParse(str) {
  try {
    return new URL(str);
  } catch (e) {
    return null;
  }
}
var parseConnection$1 = function parseConnectionString(str) {
  const parsed = tryParse(str);
  const isDriveLetter = isWindows && parsed && parsed.protocol.length === 2;
  if (!parsed || isDriveLetter) {
    return {
      client: "sqlite3",
      connection: {
        filename: str
      }
    };
  }
  let { protocol } = parsed;
  if (protocol.slice(-1) === ":") {
    protocol = protocol.slice(0, -1);
  }
  const isPG = ["postgresql", "postgres"].includes(protocol);
  return {
    client: protocol,
    connection: isPG ? parsePG(str) : connectionObject(parsed)
  };
};
function connectionObject(parsed) {
  const connection = {};
  let db = parsed.pathname;
  if (db[0] === "/") {
    db = db.slice(1);
  }
  connection.database = db;
  if (parsed.hostname) {
    if (parsed.protocol.indexOf("mssql") === 0) {
      connection.server = parsed.hostname;
    } else {
      connection.host = parsed.hostname;
    }
  }
  if (parsed.port) {
    connection.port = parsed.port;
  }
  if (parsed.username || parsed.password) {
    connection.user = decodeURIComponent(parsed.username);
  }
  if (parsed.password) {
    connection.password = decodeURIComponent(parsed.password);
  }
  if (parsed.searchParams) {
    for (const [key, value] of parsed.searchParams.entries()) {
      const isNestedConfigSupported = ["mysql:", "mariadb:", "mssql:"].includes(
        parsed.protocol
      );
      if (isNestedConfigSupported) {
        try {
          connection[key] = JSON.parse(value);
        } catch (err) {
          connection[key] = value;
        }
      } else {
        connection[key] = value;
      }
    }
  }
  return connection;
}
var dialects = {};
var sqliteDdlOperations;
var hasRequiredSqliteDdlOperations;
function requireSqliteDdlOperations() {
  if (hasRequiredSqliteDdlOperations) return sqliteDdlOperations;
  hasRequiredSqliteDdlOperations = 1;
  function copyData(sourceTable, targetTable, columns) {
    return `INSERT INTO "${targetTable}" SELECT ${columns === void 0 ? "*" : columns.map((column) => `"${column}"`).join(", ")} FROM "${sourceTable}";`;
  }
  function dropOriginal(tableName) {
    return `DROP TABLE "${tableName}"`;
  }
  function renameTable(tableName, alteredName) {
    return `ALTER TABLE "${tableName}" RENAME TO "${alteredName}"`;
  }
  function getTableSql(tableName) {
    return `SELECT type, sql FROM sqlite_master WHERE (type='table' OR (type='index' AND sql IS NOT NULL)) AND lower(tbl_name)='${tableName.toLowerCase()}'`;
  }
  function isForeignCheckEnabled() {
    return `PRAGMA foreign_keys`;
  }
  function setForeignCheck(enable) {
    return `PRAGMA foreign_keys = ${enable ? "ON" : "OFF"}`;
  }
  function executeForeignCheck() {
    return `PRAGMA foreign_key_check`;
  }
  sqliteDdlOperations = {
    copyData,
    dropOriginal,
    renameTable,
    getTableSql,
    isForeignCheckEnabled,
    setForeignCheck,
    executeForeignCheck
  };
  return sqliteDdlOperations;
}
var sqliteTransaction;
var hasRequiredSqliteTransaction;
function requireSqliteTransaction() {
  if (hasRequiredSqliteTransaction) return sqliteTransaction;
  hasRequiredSqliteTransaction = 1;
  const Transaction3 = transaction$6;
  const {
    isForeignCheckEnabled,
    setForeignCheck,
    executeForeignCheck
  } = requireSqliteDdlOperations();
  class Transaction_Sqlite extends Transaction3 {
    // Change the `foreign_keys` pragma if it doesn't match what we want it to be.
    // Return what it should be set to (if anything) when the transaction completes.
    async _setForeignCheck(conn, enforce) {
      if (enforce == null) return null;
      const result = await this.client.raw(isForeignCheckEnabled()).connection(conn);
      const isEnabled = result[0].foreign_keys === 1;
      if (enforce === isEnabled) return null;
      await this.client.raw(setForeignCheck(enforce)).connection(conn);
      return isEnabled;
    }
    // When a boolean is supplied, unconditionally set the `foreign_keys` pragma to
    // the given value. Otherwise do nothing.
    async _restoreForeignCheck(conn, enable) {
      if (typeof enable !== "boolean") return;
      await this.client.raw(setForeignCheck(enable)).connection(conn);
    }
    // Override Transaction's behavior. Sqlite3 will not error on a `pragma foreign_keys = <value>` statement
    // inside of a transaction; it will just silently not take effect: https://sqlite.org/pragma.html#pragma_foreign_keys
    // To deal with this, we introduce a config option "enforceForeignCheck". When set to a value, Transaction_Sqlite
    // ensures that the transaction received by the caller has this pragma enabled or disabled, and puts it back
    // when the transaction is done.
    async _evaluateContainer(config, container) {
      const hasOuterTransaction = this.client.transacting;
      const strictForeignKeyPragma = this.client.strictForeignKeyPragma;
      const enforceForeignCheck = config.enforceForeignCheck;
      if (strictForeignKeyPragma === true && enforceForeignCheck === void 0) {
        throw new Error(
          "Refusing to create an unsafe transaction: client.strictForeignKeyPragma is true, but check.enforceForeignCheck is unspecified"
        );
      }
      return this.acquireConnection(config, async (conn) => {
        let restoreForeignCheck = void 0;
        try {
          restoreForeignCheck = await this._setForeignCheck(
            conn,
            enforceForeignCheck
          );
        } catch (e) {
          const error = new Error(
            `Refusing to create transaction: failed to set \`foreign_keys\` pragma to the required value of ${enforceForeignCheck}`
          );
          error.cause = e;
          throw error;
        }
        if (strictForeignKeyPragma && hasOuterTransaction && restoreForeignCheck != null) {
          throw new Error(
            `Refusing to create transaction: unable to change \`foreign_keys\` pragma inside a nested transaction`
          );
        }
        let maybeWrappedContainer = container;
        if (restoreForeignCheck === true) {
          maybeWrappedContainer = async (trx) => {
            const res = await container(trx);
            const foreignViolations = await this.client.raw(executeForeignCheck()).connection(conn);
            if (foreignViolations.length > 0) {
              throw new Error(
                `Transaction concluded with ${foreignViolations.length} foreign key violations`
              );
            }
            return res;
          };
        }
        try {
          return await this._onAcquire(maybeWrappedContainer, conn);
        } finally {
          this._restoreForeignCheck(conn, restoreForeignCheck).catch((e) => {
            this._logAndDispose(
              conn,
              "Failed to restore foreign check to expected state",
              e
            );
          });
        }
      });
    }
    _logAndDispose(conn, message, cause) {
      const error = new Error(message);
      error.cause = cause;
      conn.__knex__disposed = error;
      this.client.logger.warn(
        `Transaction_Sqlite: ${message}:
${cause instanceof Error ? cause.message : String(cause)}`
      );
    }
    begin(conn) {
      if (this.isolationLevel) {
        this.client.logger.warn(
          "sqlite3 only supports serializable transactions, ignoring the isolation level param"
        );
      }
      if (this.readOnly) {
        this.client.logger.warn(
          "sqlite3 implicitly handles read vs write transactions"
        );
      }
      return this.query(conn, "BEGIN;");
    }
  }
  sqliteTransaction = Transaction_Sqlite;
  return sqliteTransaction;
}
var sqliteQuerycompiler;
var hasRequiredSqliteQuerycompiler;
function requireSqliteQuerycompiler() {
  if (hasRequiredSqliteQuerycompiler) return sqliteQuerycompiler;
  hasRequiredSqliteQuerycompiler = 1;
  const constant2 = constant_1;
  const each2 = each$2;
  const identity2 = identity_1;
  const isEmpty2 = isEmpty_1;
  const reduce2 = reduce_1;
  const QueryCompiler3 = querycompiler;
  const noop2 = noop$1;
  const { isString: isString2 } = is;
  const {
    wrapString: wrapString2,
    columnize: columnize_2
  } = wrappingFormatter;
  const emptyStr = constant2("");
  class QueryCompiler_SQLite3 extends QueryCompiler3 {
    constructor(client2, builder2, formatter2) {
      super(client2, builder2, formatter2);
      this.forShare = emptyStr;
      this.forKeyShare = emptyStr;
      this.forUpdate = emptyStr;
      this.forNoKeyUpdate = emptyStr;
    }
    // SQLite requires us to build the multi-row insert as a listing of select with
    // unions joining them together. So we'll build out this list of columns and
    // then join them all together with select unions to complete the queries.
    insert() {
      const insertValues = this.single.insert || [];
      let sql = this.with() + `insert into ${this.tableName} `;
      if (Array.isArray(insertValues)) {
        if (insertValues.length === 0) {
          return "";
        } else if (insertValues.length === 1 && insertValues[0] && isEmpty2(insertValues[0])) {
          sql += this._emptyInsertValue;
          const { returning: returning2 } = this.single;
          if (returning2) sql += this._returning(returning2);
          return { sql, returning: returning2 };
        }
      } else if (typeof insertValues === "object" && isEmpty2(insertValues)) {
        sql += this._emptyInsertValue;
        const { returning: returning2 } = this.single;
        if (returning2) sql += this._returning(returning2);
        return { sql, returning: returning2 };
      }
      const insertData = this._prepInsert(insertValues);
      if (isString2(insertData)) {
        return {
          sql: sql + insertData
        };
      }
      if (insertData.columns.length === 0) {
        return {
          sql: ""
        };
      }
      sql += `(${this.formatter.columnize(insertData.columns)})`;
      if (this.client.valueForUndefined !== null) {
        insertData.values.forEach((bindings2) => {
          each2(bindings2, (binding) => {
            if (binding === void 0)
              throw new TypeError(
                "`sqlite` does not support inserting default values. Specify values explicitly or use the `useNullAsDefault` config flag. (see docs https://knexjs.org/guide/query-builder.html#insert)."
              );
          });
        });
      }
      if (insertData.values.length === 1) {
        const parameters = this.client.parameterize(
          insertData.values[0],
          this.client.valueForUndefined,
          this.builder,
          this.bindingsHolder
        );
        sql += ` values (${parameters})`;
        const { onConflict: onConflict2, ignore: ignore2, merge: merge3 } = this.single;
        if (onConflict2 && ignore2) sql += this._ignore(onConflict2);
        else if (onConflict2 && merge3) {
          sql += this._merge(merge3.updates, onConflict2, insertValues);
          const wheres = this.where();
          if (wheres) sql += ` ${wheres}`;
        }
        const { returning: returning2 } = this.single;
        if (returning2) {
          sql += this._returning(returning2);
        }
        return {
          sql,
          returning: returning2
        };
      }
      const blocks = [];
      let i = -1;
      while (++i < insertData.values.length) {
        let i2 = -1;
        const block = blocks[i] = [];
        let current = insertData.values[i];
        current = current === void 0 ? this.client.valueForUndefined : current;
        while (++i2 < insertData.columns.length) {
          block.push(
            this.client.alias(
              this.client.parameter(
                current[i2],
                this.builder,
                this.bindingsHolder
              ),
              this.formatter.wrap(insertData.columns[i2])
            )
          );
        }
        blocks[i] = block.join(", ");
      }
      sql += " select " + blocks.join(" union all select ");
      const { onConflict, ignore, merge: merge2 } = this.single;
      if (onConflict && ignore) sql += " where true" + this._ignore(onConflict);
      else if (onConflict && merge2) {
        sql += " where true" + this._merge(merge2.updates, onConflict, insertValues);
        const wheres = this.where();
        if (wheres) sql += ` ${wheres}`;
      }
      const { returning } = this.single;
      if (returning) sql += this._returning(returning);
      return {
        sql,
        returning
      };
    }
    // Compiles an `update` query, allowing for a return value.
    update() {
      const withSQL = this.with();
      const updateData = this._prepUpdate(this.single.update);
      const wheres = this.where();
      const { returning } = this.single;
      return {
        sql: withSQL + `update ${this.single.only ? "only " : ""}${this.tableName} set ${updateData.join(", ")}` + (wheres ? ` ${wheres}` : "") + this._returning(returning),
        returning
      };
    }
    _ignore(columns) {
      if (columns === true) {
        return " on conflict do nothing";
      }
      return ` on conflict ${this._onConflictClause(columns)} do nothing`;
    }
    _merge(updates, columns, insert) {
      let sql = ` on conflict ${this._onConflictClause(columns)} do update set `;
      if (updates && Array.isArray(updates)) {
        sql += updates.map(
          (column) => wrapString2(
            column.split(".").pop(),
            this.formatter.builder,
            this.client,
            this.formatter
          )
        ).map((column) => `${column} = excluded.${column}`).join(", ");
        return sql;
      } else if (updates && typeof updates === "object") {
        const updateData = this._prepUpdate(updates);
        if (typeof updateData === "string") {
          sql += updateData;
        } else {
          sql += updateData.join(",");
        }
        return sql;
      } else {
        const insertData = this._prepInsert(insert);
        if (typeof insertData === "string") {
          throw new Error(
            "If using merge with a raw insert query, then updates must be provided"
          );
        }
        sql += insertData.columns.map(
          (column) => wrapString2(column.split(".").pop(), this.builder, this.client)
        ).map((column) => `${column} = excluded.${column}`).join(", ");
        return sql;
      }
    }
    _returning(value) {
      return value ? ` returning ${this.formatter.columnize(value)}` : "";
    }
    // Compile a truncate table statement into SQL.
    truncate() {
      const { table } = this.single;
      return {
        sql: `delete from ${this.tableName}`,
        output() {
          return this.query({
            sql: `delete from sqlite_sequence where name = '${table}'`
          }).catch(noop2);
        }
      };
    }
    // Compiles a `columnInfo` query
    columnInfo() {
      const column = this.single.columnInfo;
      const table = this.client.customWrapIdentifier(this.single.table, identity2);
      return {
        sql: `PRAGMA table_info(\`${table}\`)`,
        output(resp) {
          const maxLengthRegex = /.*\((\d+)\)/;
          const out = reduce2(
            resp,
            function(columns, val) {
              let { type } = val;
              let maxLength = type.match(maxLengthRegex);
              if (maxLength) {
                maxLength = maxLength[1];
              }
              type = maxLength ? type.split("(")[0] : type;
              columns[val.name] = {
                type: type.toLowerCase(),
                maxLength,
                nullable: !val.notnull,
                defaultValue: val.dflt_value
              };
              return columns;
            },
            {}
          );
          return column && out[column] || out;
        }
      };
    }
    limit() {
      const noLimit = !this.single.limit && this.single.limit !== 0;
      if (noLimit && !this.single.offset) return "";
      this.single.limit = noLimit ? -1 : this.single.limit;
      return `limit ${this._getValueOrParameterFromAttribute("limit")}`;
    }
    // Json functions
    jsonExtract(params) {
      return this._jsonExtract("json_extract", params);
    }
    jsonSet(params) {
      return this._jsonSet("json_set", params);
    }
    jsonInsert(params) {
      return this._jsonSet("json_insert", params);
    }
    jsonRemove(params) {
      const jsonCol = `json_remove(${columnize_2(
        params.column,
        this.builder,
        this.client,
        this.bindingsHolder
      )},${this.client.parameter(
        params.path,
        this.builder,
        this.bindingsHolder
      )})`;
      return params.alias ? this.client.alias(jsonCol, this.formatter.wrap(params.alias)) : jsonCol;
    }
    whereJsonPath(statement) {
      return this._whereJsonPath("json_extract", statement);
    }
    whereJsonSupersetOf(statement) {
      throw new Error(
        "Json superset where clause not actually supported by SQLite"
      );
    }
    whereJsonSubsetOf(statement) {
      throw new Error(
        "Json subset where clause not actually supported by SQLite"
      );
    }
    onJsonPathEquals(clause) {
      return this._onJsonPathEquals("json_extract", clause);
    }
    whereILike(statement) {
      return `${this._columnClause(statement)} ${this._not(
        statement,
        "like "
      )}${this._valueClause(statement)}`;
    }
  }
  sqliteQuerycompiler = QueryCompiler_SQLite3;
  return sqliteQuerycompiler;
}
var _baseSome;
var hasRequired_baseSome;
function require_baseSome() {
  if (hasRequired_baseSome) return _baseSome;
  hasRequired_baseSome = 1;
  var baseEach2 = _baseEach;
  function baseSome(collection, predicate) {
    var result;
    baseEach2(collection, function(value, index, collection2) {
      result = predicate(value, index, collection2);
      return !result;
    });
    return !!result;
  }
  _baseSome = baseSome;
  return _baseSome;
}
var some_1;
var hasRequiredSome;
function requireSome() {
  if (hasRequiredSome) return some_1;
  hasRequiredSome = 1;
  var arraySome2 = require_arraySome(), baseIteratee2 = _baseIteratee, baseSome = require_baseSome(), isArray2 = isArray_1, isIterateeCall2 = _isIterateeCall;
  function some(collection, predicate, guard) {
    var func = isArray2(collection) ? arraySome2 : baseSome;
    if (guard && isIterateeCall2(collection, predicate, guard)) {
      predicate = void 0;
    }
    return func(collection, baseIteratee2(predicate));
  }
  some_1 = some;
  return some_1;
}
var sqliteCompiler;
var hasRequiredSqliteCompiler;
function requireSqliteCompiler() {
  if (hasRequiredSqliteCompiler) return sqliteCompiler;
  hasRequiredSqliteCompiler = 1;
  const SchemaCompiler3 = compiler$1;
  const some = requireSome();
  class SchemaCompiler_SQLite3 extends SchemaCompiler3 {
    constructor(client2, builder2) {
      super(client2, builder2);
    }
    // Compile the query to determine if a table exists.
    hasTable(tableName) {
      const sql = `select * from sqlite_master where type = 'table' and name = ${this.client.parameter(
        this.formatter.wrap(tableName).replace(/`/g, ""),
        this.builder,
        this.bindingsHolder
      )}`;
      this.pushQuery({ sql, output: (resp) => resp.length > 0 });
    }
    // Compile the query to determine if a column exists.
    hasColumn(tableName, column) {
      this.pushQuery({
        sql: `PRAGMA table_info(${this.formatter.wrap(tableName)})`,
        output(resp) {
          return some(resp, (col) => {
            return this.client.wrapIdentifier(col.name.toLowerCase()) === this.client.wrapIdentifier(column.toLowerCase());
          });
        }
      });
    }
    // Compile a rename table command.
    renameTable(from, to) {
      this.pushQuery(
        `alter table ${this.formatter.wrap(from)} rename to ${this.formatter.wrap(
          to
        )}`
      );
    }
    async generateDdlCommands() {
      const sequence = this.builder._sequence;
      for (let i = 0, l = sequence.length; i < l; i++) {
        const query = sequence[i];
        this[query.method].apply(this, query.args);
      }
      const commandSources = this.sequence;
      if (commandSources.length === 1 && commandSources[0].statementsProducer) {
        return commandSources[0].statementsProducer();
      } else {
        const result = [];
        for (const commandSource of commandSources) {
          const command = commandSource.sql;
          if (Array.isArray(command)) {
            result.push(...command);
          } else {
            result.push(command);
          }
        }
        return { pre: [], sql: result, check: null, post: [] };
      }
    }
  }
  sqliteCompiler = SchemaCompiler_SQLite3;
  return sqliteCompiler;
}
var sqliteColumncompiler;
var hasRequiredSqliteColumncompiler;
function requireSqliteColumncompiler() {
  if (hasRequiredSqliteColumncompiler) return sqliteColumncompiler;
  hasRequiredSqliteColumncompiler = 1;
  const ColumnCompiler3 = columncompiler;
  class ColumnCompiler_SQLite3 extends ColumnCompiler3 {
    constructor() {
      super(...arguments);
      this.modifiers = ["nullable", "defaultTo"];
      this._addCheckModifiers();
    }
    // Types
    // -------
    enu(allowed) {
      return `text check (${this.formatter.wrap(
        this.args[0]
      )} in ('${allowed.join("', '")}'))`;
    }
    _pushAlterCheckQuery(checkPredicate, constraintName) {
      throw new Error(
        `Alter table with to add constraints is not permitted in SQLite`
      );
    }
    checkRegex(regexes, constraintName) {
      return this._check(
        `${this.formatter.wrap(
          this.getColumnName()
        )} REGEXP ${this.client._escapeBinding(regexes)}`,
        constraintName
      );
    }
  }
  ColumnCompiler_SQLite3.prototype.json = "json";
  ColumnCompiler_SQLite3.prototype.jsonb = "json";
  ColumnCompiler_SQLite3.prototype.double = ColumnCompiler_SQLite3.prototype.decimal = ColumnCompiler_SQLite3.prototype.floating = "float";
  ColumnCompiler_SQLite3.prototype.timestamp = "datetime";
  ColumnCompiler_SQLite3.prototype.increments = ColumnCompiler_SQLite3.prototype.bigincrements = "integer not null primary key autoincrement";
  sqliteColumncompiler = ColumnCompiler_SQLite3;
  return sqliteColumncompiler;
}
var filter_1;
var hasRequiredFilter;
function requireFilter() {
  if (hasRequiredFilter) return filter_1;
  hasRequiredFilter = 1;
  var arrayFilter2 = _arrayFilter, baseFilter2 = _baseFilter, baseIteratee2 = _baseIteratee, isArray2 = isArray_1;
  function filter(collection, predicate) {
    var func = isArray2(collection) ? arrayFilter2 : baseFilter2;
    return func(collection, baseIteratee2(predicate));
  }
  filter_1 = filter;
  return filter_1;
}
var sqliteTablecompiler;
var hasRequiredSqliteTablecompiler;
function requireSqliteTablecompiler() {
  if (hasRequiredSqliteTablecompiler) return sqliteTablecompiler;
  hasRequiredSqliteTablecompiler = 1;
  const filter = requireFilter();
  const identity2 = identity_1;
  const { isObject: isObject2 } = is;
  const { normalizeArr: normalizeArr2 } = helpers$7;
  const TableCompiler3 = tablecompiler;
  const { formatDefault: formatDefault2 } = formatterUtils;
  class TableCompiler_SQLite3 extends TableCompiler3 {
    constructor() {
      super(...arguments);
    }
    // Create a new table.
    createQuery(columns, ifNot, like) {
      const createStatement = ifNot ? "create table if not exists " : "create table ";
      let sql = createStatement + this.tableName();
      if (like && this.tableNameLike()) {
        sql += " as select * from " + this.tableNameLike() + " where 0=1";
      } else {
        sql += " (" + columns.sql.join(", ");
        sql += this.foreignKeys() || "";
        sql += this.primaryKeys() || "";
        sql += this._addChecks();
        sql += ")";
      }
      this.pushQuery(sql);
      if (like) {
        this.addColumns(columns, this.addColumnsPrefix);
      }
    }
    addColumns(columns, prefix, colCompilers) {
      if (prefix === this.alterColumnsPrefix) {
        const compiler2 = this;
        const columnsInfo = colCompilers.map((col) => {
          const name = this.client.customWrapIdentifier(
            col.getColumnName(),
            identity2,
            col.columnBuilder.queryContext()
          );
          const type = col.getColumnType();
          const defaultTo = col.modified["defaultTo"] ? formatDefault2(col.modified["defaultTo"][0], col.type, this.client) : null;
          const notNull = col.modified["nullable"] && col.modified["nullable"][0] === false;
          return { name, type, defaultTo, notNull };
        });
        this.pushQuery({
          sql: `PRAGMA table_info(${this.tableName()})`,
          statementsProducer(pragma, connection) {
            return compiler2.client.ddl(compiler2, pragma, connection).alterColumn(columnsInfo);
          }
        });
      } else {
        for (let i = 0, l = columns.sql.length; i < l; i++) {
          this.pushQuery({
            sql: `alter table ${this.tableName()} add column ${columns.sql[i]}`,
            bindings: columns.bindings[i]
          });
        }
      }
    }
    // Compile a drop unique key command.
    dropUnique(columns, indexName) {
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("unique", this.tableNameRaw, columns);
      this.pushQuery(`drop index ${indexName}`);
    }
    // Compile a drop unique key command if one exists.
    dropUniqueIfExists(columns, indexName) {
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("unique", this.tableNameRaw, columns);
      this.pushQuery(`drop index if exists ${indexName}`);
    }
    // Compile a drop foreign key command.
    dropForeign(columns, indexName) {
      const compiler2 = this;
      columns = Array.isArray(columns) ? columns : [columns];
      columns = columns.map(
        (column) => this.client.customWrapIdentifier(column, identity2)
      );
      indexName = this.client.customWrapIdentifier(indexName, identity2);
      this.pushQuery({
        sql: `PRAGMA table_info(${this.tableName()})`,
        output(pragma) {
          return compiler2.client.ddl(compiler2, pragma, this.connection).dropForeign(columns, indexName);
        }
      });
    }
    dropForeignIfExists() {
      throw new Error(".dropForeignIfExists is not supported for sqlite3");
    }
    // Compile a drop primary key command.
    dropPrimary(constraintName) {
      const compiler2 = this;
      constraintName = this.client.customWrapIdentifier(constraintName, identity2);
      this.pushQuery({
        sql: `PRAGMA table_info(${this.tableName()})`,
        output(pragma) {
          return compiler2.client.ddl(compiler2, pragma, this.connection).dropPrimary(constraintName);
        }
      });
    }
    dropPrimaryIfExists() {
      throw new Error(".dropPrimaryIfExists is not supported for sqlite3");
    }
    dropIndex(columns, indexName) {
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("index", this.tableNameRaw, columns);
      this.pushQuery(`drop index ${indexName}`);
    }
    // Compile a unique key command.
    unique(columns, indexName) {
      let deferrable;
      let predicate;
      if (isObject2(indexName)) {
        ({ indexName, deferrable, predicate } = indexName);
      }
      if (deferrable && deferrable !== "not deferrable") {
        this.client.logger.warn(
          `sqlite3: unique index \`${indexName}\` will not be deferrable ${deferrable} because sqlite3 does not support deferred constraints.`
        );
      }
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("unique", this.tableNameRaw, columns);
      columns = this.formatter.columnize(columns);
      const predicateQuery = predicate ? " " + this.client.queryCompiler(predicate).where() : "";
      this.pushQuery(
        `create unique index ${indexName} on ${this.tableName()} (${columns})${predicateQuery}`
      );
    }
    // Compile a plain index key command.
    index(columns, indexName, options) {
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("index", this.tableNameRaw, columns);
      columns = this.formatter.columnize(columns);
      let predicate;
      if (isObject2(options)) {
        ({ predicate } = options);
      }
      const predicateQuery = predicate ? " " + this.client.queryCompiler(predicate).where() : "";
      this.pushQuery(
        `create index ${indexName} on ${this.tableName()} (${columns})${predicateQuery}`
      );
    }
    /**
     * Add a primary key to an existing table.
     *
     * @NOTE The `createQuery` method above handles table creation. Don't do anything regarding table
     *       creation in this method
     *
     * @param {string | string[]} columns - Column name(s) to assign as primary keys
     * @param {string} [constraintName] - Custom name for the PK constraint
     */
    primary(columns, constraintName) {
      const compiler2 = this;
      columns = Array.isArray(columns) ? columns : [columns];
      columns = columns.map(
        (column) => this.client.customWrapIdentifier(column, identity2)
      );
      let deferrable;
      if (isObject2(constraintName)) {
        ({ constraintName, deferrable } = constraintName);
      }
      if (deferrable && deferrable !== "not deferrable") {
        this.client.logger.warn(
          `sqlite3: primary key constraint \`${constraintName}\` will not be deferrable ${deferrable} because sqlite3 does not support deferred constraints.`
        );
      }
      constraintName = this.client.customWrapIdentifier(constraintName, identity2);
      if (this.method !== "create" && this.method !== "createIfNot") {
        this.pushQuery({
          sql: `PRAGMA table_info(${this.tableName()})`,
          output(pragma) {
            return compiler2.client.ddl(compiler2, pragma, this.connection).primary(columns, constraintName);
          }
        });
      }
    }
    /**
     * Add a foreign key constraint to an existing table
     *
     * @NOTE The `createQuery` method above handles foreign key constraints on table creation. Don't do
     *       anything regarding table creation in this method
     *
     * @param {object} foreignInfo - Information about the current column foreign setup
     * @param {string | string[]} [foreignInfo.column] - Column in the current constraint
     * @param {string | undefined} foreignInfo.keyName - Name of the foreign key constraint
     * @param {string | string[]} foreignInfo.references - What column it references in the other table
     * @param {string} foreignInfo.inTable - What table is referenced in this constraint
     * @param {string} [foreignInfo.onUpdate] - What to do on updates
     * @param {string} [foreignInfo.onDelete] - What to do on deletions
     */
    foreign(foreignInfo) {
      const compiler2 = this;
      if (this.method !== "create" && this.method !== "createIfNot") {
        foreignInfo.column = Array.isArray(foreignInfo.column) ? foreignInfo.column : [foreignInfo.column];
        foreignInfo.column = foreignInfo.column.map(
          (column) => this.client.customWrapIdentifier(column, identity2)
        );
        foreignInfo.inTable = this.client.customWrapIdentifier(
          foreignInfo.inTable,
          identity2
        );
        foreignInfo.references = Array.isArray(foreignInfo.references) ? foreignInfo.references : [foreignInfo.references];
        foreignInfo.references = foreignInfo.references.map(
          (column) => this.client.customWrapIdentifier(column, identity2)
        );
        this.pushQuery({
          sql: `PRAGMA table_info(${this.tableName()})`,
          statementsProducer(pragma, connection) {
            return compiler2.client.ddl(compiler2, pragma, connection).foreign(foreignInfo);
          }
        });
      }
    }
    primaryKeys() {
      const pks = filter(this.grouped.alterTable || [], { method: "primary" });
      if (pks.length > 0 && pks[0].args.length > 0) {
        const columns = pks[0].args[0];
        let constraintName = pks[0].args[1] || "";
        if (constraintName) {
          constraintName = " constraint " + this.formatter.wrap(constraintName);
        }
        const needUniqueCols = this.grouped.columns.filter((t) => t.builder._type === "increments").length > 0;
        return `,${constraintName} ${needUniqueCols ? "unique" : "primary key"} (${this.formatter.columnize(columns)})`;
      }
    }
    foreignKeys() {
      let sql = "";
      const foreignKeys = filter(this.grouped.alterTable || [], {
        method: "foreign"
      });
      for (let i = 0, l = foreignKeys.length; i < l; i++) {
        const foreign = foreignKeys[i].args[0];
        const column = this.formatter.columnize(foreign.column);
        const references = this.formatter.columnize(foreign.references);
        const foreignTable = this.formatter.wrap(foreign.inTable);
        let constraintName = foreign.keyName || "";
        if (constraintName) {
          constraintName = " constraint " + this.formatter.wrap(constraintName);
        }
        sql += `,${constraintName} foreign key(${column}) references ${foreignTable}(${references})`;
        if (foreign.onDelete) sql += ` on delete ${foreign.onDelete}`;
        if (foreign.onUpdate) sql += ` on update ${foreign.onUpdate}`;
      }
      return sql;
    }
    createTableBlock() {
      return this.getColumns().concat().join(",");
    }
    renameColumn(from, to) {
      this.pushQuery({
        sql: `alter table ${this.tableName()} rename ${this.formatter.wrap(
          from
        )} to ${this.formatter.wrap(to)}`
      });
    }
    _setNullableState(column, isNullable) {
      const compiler2 = this;
      this.pushQuery({
        sql: `PRAGMA table_info(${this.tableName()})`,
        statementsProducer(pragma, connection) {
          return compiler2.client.ddl(compiler2, pragma, connection).setNullable(column, isNullable);
        }
      });
    }
    dropColumn() {
      const compiler2 = this;
      const columns = normalizeArr2(...arguments);
      const columnsWrapped = columns.map(
        (column) => this.client.customWrapIdentifier(column, identity2)
      );
      this.pushQuery({
        sql: `PRAGMA table_info(${this.tableName()})`,
        output(pragma) {
          return compiler2.client.ddl(compiler2, pragma, this.connection).dropColumn(columnsWrapped);
        }
      });
    }
  }
  sqliteTablecompiler = TableCompiler_SQLite3;
  return sqliteTablecompiler;
}
var sqliteViewcompiler;
var hasRequiredSqliteViewcompiler;
function requireSqliteViewcompiler() {
  if (hasRequiredSqliteViewcompiler) return sqliteViewcompiler;
  hasRequiredSqliteViewcompiler = 1;
  const ViewCompiler3 = viewcompiler;
  const {
    columnize: columnize_2
  } = wrappingFormatter;
  class ViewCompiler_SQLite3 extends ViewCompiler3 {
    constructor(client2, viewCompiler) {
      super(client2, viewCompiler);
    }
    createOrReplace() {
      const columns = this.columns;
      const selectQuery = this.selectQuery.toString();
      const viewName = this.viewName();
      const columnList = columns ? " (" + columnize_2(
        columns,
        this.viewBuilder,
        this.client,
        this.bindingsHolder
      ) + ")" : "";
      const dropSql = `drop view if exists ${viewName}`;
      const createSql = `create view ${viewName}${columnList} as ${selectQuery}`;
      this.pushQuery({
        sql: dropSql
      });
      this.pushQuery({
        sql: createSql
      });
    }
  }
  sqliteViewcompiler = ViewCompiler_SQLite3;
  return sqliteViewcompiler;
}
var tokenizer;
var hasRequiredTokenizer;
function requireTokenizer() {
  if (hasRequiredTokenizer) return tokenizer;
  hasRequiredTokenizer = 1;
  function tokenize(text, tokens) {
    const compiledRegex = new RegExp(
      Object.entries(tokens).map(([type, regex]) => `(?<${type}>${regex.source})`).join("|"),
      "yi"
    );
    let index = 0;
    const ast = [];
    while (index < text.length) {
      compiledRegex.lastIndex = index;
      const result = text.match(compiledRegex);
      if (result !== null) {
        const [type, text2] = Object.entries(result.groups).find(
          ([name, group]) => group !== void 0
        );
        index += text2.length;
        if (!type.startsWith("_")) {
          ast.push({ type, text: text2 });
        }
      } else {
        throw new Error(
          `No matching tokenizer rule found at: [${text.substring(index)}]`
        );
      }
    }
    return ast;
  }
  tokenizer = {
    tokenize
  };
  return tokenizer;
}
var parserCombinator;
var hasRequiredParserCombinator;
function requireParserCombinator() {
  if (hasRequiredParserCombinator) return parserCombinator;
  hasRequiredParserCombinator = 1;
  function s(sequence, post = (v) => v) {
    return function({ index = 0, input }) {
      let position = index;
      const ast = [];
      for (const parser2 of sequence) {
        const result = parser2({ index: position, input });
        if (result.success) {
          position = result.index;
          ast.push(result.ast);
        } else {
          return result;
        }
      }
      return { success: true, ast: post(ast), index: position, input };
    };
  }
  function a(alternative, post = (v) => v) {
    return function({ index = 0, input }) {
      for (const parser2 of alternative) {
        const result = parser2({ index, input });
        if (result.success) {
          return {
            success: true,
            ast: post(result.ast),
            index: result.index,
            input
          };
        }
      }
      return { success: false, ast: null, index, input };
    };
  }
  function m(many, post = (v) => v) {
    return function({ index = 0, input }) {
      let result = {};
      let position = index;
      const ast = [];
      do {
        result = many({ index: position, input });
        if (result.success) {
          position = result.index;
          ast.push(result.ast);
        }
      } while (result.success);
      if (ast.length > 0) {
        return { success: true, ast: post(ast), index: position, input };
      } else {
        return { success: false, ast: null, index: position, input };
      }
    };
  }
  function o(optional, post = (v) => v) {
    return function({ index = 0, input }) {
      const result = optional({ index, input });
      if (result.success) {
        return {
          success: true,
          ast: post(result.ast),
          index: result.index,
          input
        };
      } else {
        return { success: true, ast: post(null), index, input };
      }
    };
  }
  function l(lookahead, post = (v) => v) {
    return function({ index = 0, input }) {
      const result = lookahead.do({ index, input });
      if (result.success) {
        const resultNext = lookahead.next({ index: result.index, input });
        if (resultNext.success) {
          return {
            success: true,
            ast: post(result.ast),
            index: result.index,
            input
          };
        }
      }
      return { success: false, ast: null, index, input };
    };
  }
  function n(negative, post = (v) => v) {
    return function({ index = 0, input }) {
      const result = negative.do({ index, input });
      if (result.success) {
        const resultNot = negative.not({ index, input });
        if (!resultNot.success) {
          return {
            success: true,
            ast: post(result.ast),
            index: result.index,
            input
          };
        }
      }
      return { success: false, ast: null, index, input };
    };
  }
  function t(token, post = (v) => v.text) {
    return function({ index = 0, input }) {
      const result = input[index];
      if (result !== void 0 && (token.type === void 0 || token.type === result.type) && (token.text === void 0 || token.text.toUpperCase() === result.text.toUpperCase())) {
        return {
          success: true,
          ast: post(result),
          index: index + 1,
          input
        };
      } else {
        return { success: false, ast: null, index, input };
      }
    };
  }
  const e = function({ index = 0, input }) {
    return { success: true, ast: null, index, input };
  };
  const f = function({ index = 0, input }) {
    return { success: index === input.length, ast: null, index, input };
  };
  parserCombinator = { s, a, m, o, l, n, t, e, f };
  return parserCombinator;
}
var parser;
var hasRequiredParser;
function requireParser() {
  if (hasRequiredParser) return parser;
  hasRequiredParser = 1;
  const { tokenize } = requireTokenizer();
  const { s, a, m, o, l, n, t, e, f } = requireParserCombinator();
  const TOKENS = {
    keyword: /(?:ABORT|ACTION|ADD|AFTER|ALL|ALTER|ALWAYS|ANALYZE|AND|AS|ASC|ATTACH|AUTOINCREMENT|BEFORE|BEGIN|BETWEEN|BY|CASCADE|CASE|CAST|CHECK|COLLATE|COLUMN|COMMIT|CONFLICT|CONSTRAINT|CREATE|CROSS|CURRENT|CURRENT_DATE|CURRENT_TIME|CURRENT_TIMESTAMP|DATABASE|DEFAULT|DEFERRED|DEFERRABLE|DELETE|DESC|DETACH|DISTINCT|DO|DROP|END|EACH|ELSE|ESCAPE|EXCEPT|EXCLUSIVE|EXCLUDE|EXISTS|EXPLAIN|FAIL|FILTER|FIRST|FOLLOWING|FOR|FOREIGN|FROM|FULL|GENERATED|GLOB|GROUP|GROUPS|HAVING|IF|IGNORE|IMMEDIATE|IN|INDEX|INDEXED|INITIALLY|INNER|INSERT|INSTEAD|INTERSECT|INTO|IS|ISNULL|JOIN|KEY|LAST|LEFT|LIKE|LIMIT|MATCH|MATERIALIZED|NATURAL|NO|NOT|NOTHING|NOTNULL|NULL|NULLS|OF|OFFSET|ON|OR|ORDER|OTHERS|OUTER|OVER|PARTITION|PLAN|PRAGMA|PRECEDING|PRIMARY|QUERY|RAISE|RANGE|RECURSIVE|REFERENCES|REGEXP|REINDEX|RELEASE|RENAME|REPLACE|RESTRICT|RETURNING|RIGHT|ROLLBACK|ROW|ROWS|SAVEPOINT|SELECT|SET|TABLE|TEMP|TEMPORARY|THEN|TIES|TO|TRANSACTION|TRIGGER|UNBOUNDED|UNION|UNIQUE|UPDATE|USING|VACUUM|VALUES|VIEW|VIRTUAL|WHEN|WHERE|WINDOW|WITH|WITHOUT)(?=\s+|-|\(|\)|;|\+|\*|\/|%|==|=|<=|<>|<<|<|>=|>>|>|!=|,|&|~|\|\||\||\.)/,
    id: /"[^"]*(?:""[^"]*)*"|`[^`]*(?:``[^`]*)*`|\[[^[\]]*\]|[a-z_][a-z0-9_$]*/,
    string: /'[^']*(?:''[^']*)*'/,
    blob: /x'(?:[0-9a-f][0-9a-f])+'/,
    numeric: /(?:\d+(?:\.\d*)?|\.\d+)(?:e(?:\+|-)?\d+)?|0x[0-9a-f]+/,
    variable: /\?\d*|[@$:][a-z0-9_$]+/,
    operator: /-|\(|\)|;|\+|\*|\/|%|==|=|<=|<>|<<|<|>=|>>|>|!=|,|&|~|\|\||\||\./,
    _ws: /\s+/
  };
  function parseCreateTable(sql) {
    const result = createTable({ input: tokenize(sql, TOKENS) });
    if (!result.success) {
      throw new Error(
        `Parsing CREATE TABLE failed at [${result.input.slice(result.index).map((t2) => t2.text).join(" ")}] of "${sql}"`
      );
    }
    return result.ast;
  }
  function parseCreateIndex(sql) {
    const result = createIndex({ input: tokenize(sql, TOKENS) });
    if (!result.success) {
      throw new Error(
        `Parsing CREATE INDEX failed at [${result.input.slice(result.index).map((t2) => t2.text).join(" ")}] of "${sql}"`
      );
    }
    return result.ast;
  }
  function createTable(ctx) {
    return s(
      [
        t({ text: "CREATE" }, (v) => null),
        temporary,
        t({ text: "TABLE" }, (v) => null),
        exists,
        schema,
        table,
        t({ text: "(" }, (v) => null),
        columnDefinitionList,
        tableConstraintList,
        t({ text: ")" }, (v) => null),
        rowid,
        f
      ],
      (v) => Object.assign({}, ...v.filter((x) => x !== null))
    )(ctx);
  }
  function temporary(ctx) {
    return a([t({ text: "TEMP" }), t({ text: "TEMPORARY" }), e], (v) => ({
      temporary: v !== null
    }))(ctx);
  }
  function rowid(ctx) {
    return o(s([t({ text: "WITHOUT" }), t({ text: "ROWID" })]), (v) => ({
      rowid: v !== null
    }))(ctx);
  }
  function columnDefinitionList(ctx) {
    return a([
      s([columnDefinition, t({ text: "," }), columnDefinitionList], (v) => ({
        columns: [v[0]].concat(v[2].columns)
      })),
      s([columnDefinition], (v) => ({ columns: [v[0]] }))
    ])(ctx);
  }
  function columnDefinition(ctx) {
    return s(
      [s([identifier], (v) => ({ name: v[0] })), typeName, columnConstraintList],
      (v) => Object.assign({}, ...v)
    )(ctx);
  }
  function typeName(ctx) {
    return o(
      s(
        [
          m(t({ type: "id" })),
          a([
            s(
              [
                t({ text: "(" }),
                signedNumber,
                t({ text: "," }),
                signedNumber,
                t({ text: ")" })
              ],
              (v) => `(${v[1]}, ${v[3]})`
            ),
            s(
              [t({ text: "(" }), signedNumber, t({ text: ")" })],
              (v) => `(${v[1]})`
            ),
            e
          ])
        ],
        (v) => `${v[0].join(" ")}${v[1] || ""}`
      ),
      (v) => ({ type: v })
    )(ctx);
  }
  function columnConstraintList(ctx) {
    return o(m(columnConstraint), (v) => ({
      constraints: Object.assign(
        {
          primary: null,
          notnull: null,
          null: null,
          unique: null,
          check: null,
          default: null,
          collate: null,
          references: null,
          as: null
        },
        ...v || []
      )
    }))(ctx);
  }
  function columnConstraint(ctx) {
    return a([
      primaryColumnConstraint,
      notnullColumnConstraint,
      nullColumnConstraint,
      uniqueColumnConstraint,
      checkColumnConstraint,
      defaultColumnConstraint,
      collateColumnConstraint,
      referencesColumnConstraint,
      asColumnConstraint
    ])(ctx);
  }
  function primaryColumnConstraint(ctx) {
    return s(
      [
        constraintName,
        t({ text: "PRIMARY" }, (v) => null),
        t({ text: "KEY" }, (v) => null),
        order,
        conflictClause,
        autoincrement
      ],
      (v) => ({ primary: Object.assign({}, ...v.filter((x) => x !== null)) })
    )(ctx);
  }
  function autoincrement(ctx) {
    return o(t({ text: "AUTOINCREMENT" }), (v) => ({
      autoincrement: v !== null
    }))(ctx);
  }
  function notnullColumnConstraint(ctx) {
    return s(
      [
        constraintName,
        t({ text: "NOT" }, (v) => null),
        t({ text: "NULL" }, (v) => null),
        conflictClause
      ],
      (v) => ({ notnull: Object.assign({}, ...v.filter((x) => x !== null)) })
    )(ctx);
  }
  function nullColumnConstraint(ctx) {
    return s(
      [constraintName, t({ text: "NULL" }, (v) => null), conflictClause],
      (v) => ({ null: Object.assign({}, ...v.filter((x) => x !== null)) })
    )(ctx);
  }
  function uniqueColumnConstraint(ctx) {
    return s(
      [constraintName, t({ text: "UNIQUE" }, (v) => null), conflictClause],
      (v) => ({ unique: Object.assign({}, ...v.filter((x) => x !== null)) })
    )(ctx);
  }
  function checkColumnConstraint(ctx) {
    return s(
      [
        constraintName,
        t({ text: "CHECK" }, (v) => null),
        t({ text: "(" }, (v) => null),
        s([expression], (v) => ({ expression: v[0] })),
        t({ text: ")" }, (v) => null)
      ],
      (v) => ({ check: Object.assign({}, ...v.filter((x) => x !== null)) })
    )(ctx);
  }
  function defaultColumnConstraint(ctx) {
    return s(
      [
        constraintName,
        t({ text: "DEFAULT" }, (v) => null),
        a([
          s([t({ text: "(" }), expression, t({ text: ")" })], (v) => ({
            value: v[1],
            expression: true
          })),
          s([literalValue], (v) => ({ value: v[0], expression: false })),
          s([signedNumber], (v) => ({ value: v[0], expression: false }))
        ])
      ],
      (v) => ({ default: Object.assign({}, ...v.filter((x) => x !== null)) })
    )(ctx);
  }
  function collateColumnConstraint(ctx) {
    return s(
      [
        constraintName,
        t({ text: "COLLATE" }, (v) => null),
        t({ type: "id" }, (v) => ({ collation: v.text }))
      ],
      (v) => ({ collate: Object.assign({}, ...v.filter((x) => x !== null)) })
    )(ctx);
  }
  function referencesColumnConstraint(ctx) {
    return s(
      [constraintName, s([foreignKeyClause], (v) => v[0].references)],
      (v) => ({
        references: Object.assign({}, ...v.filter((x) => x !== null))
      })
    )(ctx);
  }
  function asColumnConstraint(ctx) {
    return s(
      [
        constraintName,
        o(s([t({ text: "GENERATED" }), t({ text: "ALWAYS" })]), (v) => ({
          generated: v !== null
        })),
        t({ text: "AS" }, (v) => null),
        t({ text: "(" }, (v) => null),
        s([expression], (v) => ({ expression: v[0] })),
        t({ text: ")" }, (v) => null),
        a([t({ text: "STORED" }), t({ text: "VIRTUAL" }), e], (v) => ({
          mode: v ? v.toUpperCase() : null
        }))
      ],
      (v) => ({ as: Object.assign({}, ...v.filter((x) => x !== null)) })
    )(ctx);
  }
  function tableConstraintList(ctx) {
    return o(m(s([t({ text: "," }), tableConstraint], (v) => v[1])), (v) => ({
      constraints: v || []
    }))(ctx);
  }
  function tableConstraint(ctx) {
    return a([
      primaryTableConstraint,
      uniqueTableConstraint,
      checkTableConstraint,
      foreignTableConstraint
    ])(ctx);
  }
  function primaryTableConstraint(ctx) {
    return s(
      [
        constraintName,
        t({ text: "PRIMARY" }, (v) => null),
        t({ text: "KEY" }, (v) => null),
        t({ text: "(" }, (v) => null),
        indexedColumnList,
        t({ text: ")" }, (v) => null),
        conflictClause
      ],
      (v) => Object.assign({ type: "PRIMARY KEY" }, ...v.filter((x) => x !== null))
    )(ctx);
  }
  function uniqueTableConstraint(ctx) {
    return s(
      [
        constraintName,
        t({ text: "UNIQUE" }, (v) => null),
        t({ text: "(" }, (v) => null),
        indexedColumnList,
        t({ text: ")" }, (v) => null),
        conflictClause
      ],
      (v) => Object.assign({ type: "UNIQUE" }, ...v.filter((x) => x !== null))
    )(ctx);
  }
  function conflictClause(ctx) {
    return o(
      s(
        [
          t({ text: "ON" }),
          t({ text: "CONFLICT" }),
          a([
            t({ text: "ROLLBACK" }),
            t({ text: "ABORT" }),
            t({ text: "FAIL" }),
            t({ text: "IGNORE" }),
            t({ text: "REPLACE" })
          ])
        ],
        (v) => v[2]
      ),
      (v) => ({ conflict: v ? v.toUpperCase() : null })
    )(ctx);
  }
  function checkTableConstraint(ctx) {
    return s(
      [
        constraintName,
        t({ text: "CHECK" }, (v) => null),
        t({ text: "(" }, (v) => null),
        s([expression], (v) => ({ expression: v[0] })),
        t({ text: ")" }, (v) => null)
      ],
      (v) => Object.assign({ type: "CHECK" }, ...v.filter((x) => x !== null))
    )(ctx);
  }
  function foreignTableConstraint(ctx) {
    return s(
      [
        constraintName,
        t({ text: "FOREIGN" }, (v) => null),
        t({ text: "KEY" }, (v) => null),
        t({ text: "(" }, (v) => null),
        columnNameList,
        t({ text: ")" }, (v) => null),
        foreignKeyClause
      ],
      (v) => Object.assign({ type: "FOREIGN KEY" }, ...v.filter((x) => x !== null))
    )(ctx);
  }
  function foreignKeyClause(ctx) {
    return s(
      [
        t({ text: "REFERENCES" }, (v) => null),
        table,
        columnNameListOptional,
        o(
          m(a([deleteReference, updateReference, matchReference])),
          (v) => Object.assign({ delete: null, update: null, match: null }, ...v || [])
        ),
        deferrable
      ],
      (v) => ({ references: Object.assign({}, ...v.filter((x) => x !== null)) })
    )(ctx);
  }
  function columnNameListOptional(ctx) {
    return o(
      s([t({ text: "(" }), columnNameList, t({ text: ")" })], (v) => v[1]),
      (v) => ({ columns: v ? v.columns : [] })
    )(ctx);
  }
  function columnNameList(ctx) {
    return s(
      [
        o(
          m(s([identifier, t({ text: "," })], (v) => v[0])),
          (v) => v !== null ? v : []
        ),
        identifier
      ],
      (v) => ({ columns: v[0].concat([v[1]]) })
    )(ctx);
  }
  function deleteReference(ctx) {
    return s([t({ text: "ON" }), t({ text: "DELETE" }), onAction], (v) => ({
      delete: v[2]
    }))(ctx);
  }
  function updateReference(ctx) {
    return s([t({ text: "ON" }), t({ text: "UPDATE" }), onAction], (v) => ({
      update: v[2]
    }))(ctx);
  }
  function matchReference(ctx) {
    return s(
      [t({ text: "MATCH" }), a([t({ type: "keyword" }), t({ type: "id" })])],
      (v) => ({ match: v[1] })
    )(ctx);
  }
  function deferrable(ctx) {
    return o(
      s([
        o(t({ text: "NOT" })),
        t({ text: "DEFERRABLE" }),
        o(
          s(
            [
              t({ text: "INITIALLY" }),
              a([t({ text: "DEFERRED" }), t({ text: "IMMEDIATE" })])
            ],
            (v) => v[1].toUpperCase()
          )
        )
      ]),
      (v) => ({ deferrable: v ? { not: v[0] !== null, initially: v[2] } : null })
    )(ctx);
  }
  function constraintName(ctx) {
    return o(
      s([t({ text: "CONSTRAINT" }), identifier], (v) => v[1]),
      (v) => ({ name: v })
    )(ctx);
  }
  function createIndex(ctx) {
    return s(
      [
        t({ text: "CREATE" }, (v) => null),
        unique,
        t({ text: "INDEX" }, (v) => null),
        exists,
        schema,
        index,
        t({ text: "ON" }, (v) => null),
        table,
        t({ text: "(" }, (v) => null),
        indexedColumnList,
        t({ text: ")" }, (v) => null),
        where,
        f
      ],
      (v) => Object.assign({}, ...v.filter((x) => x !== null))
    )(ctx);
  }
  function unique(ctx) {
    return o(t({ text: "UNIQUE" }), (v) => ({ unique: v !== null }))(ctx);
  }
  function exists(ctx) {
    return o(
      s([t({ text: "IF" }), t({ text: "NOT" }), t({ text: "EXISTS" })]),
      (v) => ({ exists: v !== null })
    )(ctx);
  }
  function schema(ctx) {
    return o(
      s([identifier, t({ text: "." })], (v) => v[0]),
      (v) => ({ schema: v })
    )(ctx);
  }
  function index(ctx) {
    return s([identifier], (v) => ({ index: v[0] }))(ctx);
  }
  function table(ctx) {
    return s([identifier], (v) => ({ table: v[0] }))(ctx);
  }
  function where(ctx) {
    return o(
      s([t({ text: "WHERE" }), expression], (v) => v[1]),
      (v) => ({ where: v })
    )(ctx);
  }
  function indexedColumnList(ctx) {
    return a([
      s([indexedColumn, t({ text: "," }), indexedColumnList], (v) => ({
        columns: [v[0]].concat(v[2].columns)
      })),
      s([indexedColumnExpression, t({ text: "," }), indexedColumnList], (v) => ({
        columns: [v[0]].concat(v[2].columns)
      })),
      l({ do: indexedColumn, next: t({ text: ")" }) }, (v) => ({
        columns: [v]
      })),
      l({ do: indexedColumnExpression, next: t({ text: ")" }) }, (v) => ({
        columns: [v]
      }))
    ])(ctx);
  }
  function indexedColumn(ctx) {
    return s(
      [
        s([identifier], (v) => ({ name: v[0], expression: false })),
        collation,
        order
      ],
      (v) => Object.assign({}, ...v.filter((x) => x !== null))
    )(ctx);
  }
  function indexedColumnExpression(ctx) {
    return s(
      [
        s([indexedExpression], (v) => ({ name: v[0], expression: true })),
        collation,
        order
      ],
      (v) => Object.assign({}, ...v.filter((x) => x !== null))
    )(ctx);
  }
  function collation(ctx) {
    return o(
      s([t({ text: "COLLATE" }), t({ type: "id" })], (v) => v[1]),
      (v) => ({ collation: v })
    )(ctx);
  }
  function order(ctx) {
    return a([t({ text: "ASC" }), t({ text: "DESC" }), e], (v) => ({
      order: v ? v.toUpperCase() : null
    }))(ctx);
  }
  function indexedExpression(ctx) {
    return m(
      a([
        n({
          do: t({ type: "keyword" }),
          not: a([
            t({ text: "COLLATE" }),
            t({ text: "ASC" }),
            t({ text: "DESC" })
          ])
        }),
        t({ type: "id" }),
        t({ type: "string" }),
        t({ type: "blob" }),
        t({ type: "numeric" }),
        t({ type: "variable" }),
        n({
          do: t({ type: "operator" }),
          not: a([t({ text: "(" }), t({ text: ")" }), t({ text: "," })])
        }),
        s([t({ text: "(" }), o(expression), t({ text: ")" })], (v) => v[1] || [])
      ])
    )(ctx);
  }
  function expression(ctx) {
    return m(
      a([
        t({ type: "keyword" }),
        t({ type: "id" }),
        t({ type: "string" }),
        t({ type: "blob" }),
        t({ type: "numeric" }),
        t({ type: "variable" }),
        n({
          do: t({ type: "operator" }),
          not: a([t({ text: "(" }), t({ text: ")" })])
        }),
        s([t({ text: "(" }), o(expression), t({ text: ")" })], (v) => v[1] || [])
      ])
    )(ctx);
  }
  function identifier(ctx) {
    return a(
      [t({ type: "id" }), t({ type: "string" })],
      (v) => /^["`['][^]*["`\]']$/.test(v) ? v.substring(1, v.length - 1) : v
    )(ctx);
  }
  function onAction(ctx) {
    return a(
      [
        s([t({ text: "SET" }), t({ text: "NULL" })], (v) => `${v[0]} ${v[1]}`),
        s([t({ text: "SET" }), t({ text: "DEFAULT" })], (v) => `${v[0]} ${v[1]}`),
        t({ text: "CASCADE" }),
        t({ text: "RESTRICT" }),
        s([t({ text: "NO" }), t({ text: "ACTION" })], (v) => `${v[0]} ${v[1]}`)
      ],
      (v) => v.toUpperCase()
    )(ctx);
  }
  function literalValue(ctx) {
    return a([
      t({ type: "numeric" }),
      t({ type: "string" }),
      t({ type: "id" }),
      t({ type: "blob" }),
      t({ text: "NULL" }),
      t({ text: "TRUE" }),
      t({ text: "FALSE" }),
      t({ text: "CURRENT_TIME" }),
      t({ text: "CURRENT_DATE" }),
      t({ text: "CURRENT_TIMESTAMP" })
    ])(ctx);
  }
  function signedNumber(ctx) {
    return s(
      [a([t({ text: "+" }), t({ text: "-" }), e]), t({ type: "numeric" })],
      (v) => `${v[0] || ""}${v[1]}`
    )(ctx);
  }
  parser = {
    parseCreateTable,
    parseCreateIndex
  };
  return parser;
}
var compiler;
var hasRequiredCompiler;
function requireCompiler() {
  if (hasRequiredCompiler) return compiler;
  hasRequiredCompiler = 1;
  function compileCreateTable(ast, wrap2 = (v) => v) {
    return createTable(ast, wrap2);
  }
  function compileCreateIndex(ast, wrap2 = (v) => v) {
    return createIndex(ast, wrap2);
  }
  function createTable(ast, wrap2) {
    return `CREATE${temporary(ast)} TABLE${exists(ast)} ${schema(
      ast,
      wrap2
    )}${table(ast, wrap2)} (${columnDefinitionList(
      ast,
      wrap2
    )}${tableConstraintList(ast, wrap2)})${rowid(ast)}`;
  }
  function temporary(ast, wrap2) {
    return ast.temporary ? " TEMP" : "";
  }
  function rowid(ast, wrap2) {
    return ast.rowid ? " WITHOUT ROWID" : "";
  }
  function columnDefinitionList(ast, wrap2) {
    return ast.columns.map((column) => columnDefinition(column, wrap2)).join(", ");
  }
  function columnDefinition(ast, wrap2) {
    return `${identifier(ast.name, wrap2)}${typeName(
      ast
    )}${columnConstraintList(ast.constraints, wrap2)}`;
  }
  function typeName(ast, wrap2) {
    return ast.type !== null ? ` ${ast.type}` : "";
  }
  function columnConstraintList(ast, wrap2) {
    return `${primaryColumnConstraint(ast, wrap2)}${notnullColumnConstraint(
      ast,
      wrap2
    )}${nullColumnConstraint(ast, wrap2)}${uniqueColumnConstraint(
      ast,
      wrap2
    )}${checkColumnConstraint(ast, wrap2)}${defaultColumnConstraint(
      ast,
      wrap2
    )}${collateColumnConstraint(ast, wrap2)}${referencesColumnConstraint(
      ast,
      wrap2
    )}${asColumnConstraint(ast, wrap2)}`;
  }
  function primaryColumnConstraint(ast, wrap2) {
    return ast.primary !== null ? ` ${constraintName(ast.primary, wrap2)}PRIMARY KEY${order(
      ast.primary
    )}${conflictClause(ast.primary)}${autoincrement(ast.primary)}` : "";
  }
  function autoincrement(ast, wrap2) {
    return ast.autoincrement ? " AUTOINCREMENT" : "";
  }
  function notnullColumnConstraint(ast, wrap2) {
    return ast.notnull !== null ? ` ${constraintName(ast.notnull, wrap2)}NOT NULL${conflictClause(
      ast.notnull
    )}` : "";
  }
  function nullColumnConstraint(ast, wrap2) {
    return ast.null !== null ? ` ${constraintName(ast.null, wrap2)}NULL${conflictClause(ast.null)}` : "";
  }
  function uniqueColumnConstraint(ast, wrap2) {
    return ast.unique !== null ? ` ${constraintName(ast.unique, wrap2)}UNIQUE${conflictClause(
      ast.unique
    )}` : "";
  }
  function checkColumnConstraint(ast, wrap2) {
    return ast.check !== null ? ` ${constraintName(ast.check, wrap2)}CHECK (${expression(
      ast.check.expression
    )})` : "";
  }
  function defaultColumnConstraint(ast, wrap2) {
    return ast.default !== null ? ` ${constraintName(ast.default, wrap2)}DEFAULT ${!ast.default.expression ? ast.default.value : `(${expression(ast.default.value)})`}` : "";
  }
  function collateColumnConstraint(ast, wrap2) {
    return ast.collate !== null ? ` ${constraintName(ast.collate, wrap2)}COLLATE ${ast.collate.collation}` : "";
  }
  function referencesColumnConstraint(ast, wrap2) {
    return ast.references !== null ? ` ${constraintName(ast.references, wrap2)}${foreignKeyClause(
      ast.references,
      wrap2
    )}` : "";
  }
  function asColumnConstraint(ast, wrap2) {
    return ast.as !== null ? ` ${constraintName(ast.as, wrap2)}${ast.as.generated ? "GENERATED ALWAYS " : ""}AS (${expression(ast.as.expression)})${ast.as.mode !== null ? ` ${ast.as.mode}` : ""}` : "";
  }
  function tableConstraintList(ast, wrap2) {
    return ast.constraints.reduce(
      (constraintList, constraint) => `${constraintList}, ${tableConstraint(constraint, wrap2)}`,
      ""
    );
  }
  function tableConstraint(ast, wrap2) {
    switch (ast.type) {
      case "PRIMARY KEY":
        return primaryTableConstraint(ast, wrap2);
      case "UNIQUE":
        return uniqueTableConstraint(ast, wrap2);
      case "CHECK":
        return checkTableConstraint(ast, wrap2);
      case "FOREIGN KEY":
        return foreignTableConstraint(ast, wrap2);
    }
  }
  function primaryTableConstraint(ast, wrap2) {
    return `${constraintName(ast, wrap2)}PRIMARY KEY (${indexedColumnList(
      ast,
      wrap2
    )})${conflictClause(ast)}`;
  }
  function uniqueTableConstraint(ast, wrap2) {
    return `${constraintName(ast, wrap2)}UNIQUE (${indexedColumnList(
      ast,
      wrap2
    )})${conflictClause(ast)}`;
  }
  function conflictClause(ast, wrap2) {
    return ast.conflict !== null ? ` ON CONFLICT ${ast.conflict}` : "";
  }
  function checkTableConstraint(ast, wrap2) {
    return `${constraintName(ast, wrap2)}CHECK (${expression(
      ast.expression
    )})`;
  }
  function foreignTableConstraint(ast, wrap2) {
    return `${constraintName(ast, wrap2)}FOREIGN KEY (${columnNameList(
      ast,
      wrap2
    )}) ${foreignKeyClause(ast.references, wrap2)}`;
  }
  function foreignKeyClause(ast, wrap2) {
    return `REFERENCES ${table(ast, wrap2)}${columnNameListOptional(
      ast,
      wrap2
    )}${deleteUpdateMatchList(ast)}${deferrable(ast.deferrable)}`;
  }
  function columnNameListOptional(ast, wrap2) {
    return ast.columns.length > 0 ? ` (${columnNameList(ast, wrap2)})` : "";
  }
  function columnNameList(ast, wrap2) {
    return ast.columns.map((column) => identifier(column, wrap2)).join(", ");
  }
  function deleteUpdateMatchList(ast, wrap2) {
    return `${deleteReference(ast)}${updateReference(
      ast
    )}${matchReference(ast)}`;
  }
  function deleteReference(ast, wrap2) {
    return ast.delete !== null ? ` ON DELETE ${ast.delete}` : "";
  }
  function updateReference(ast, wrap2) {
    return ast.update !== null ? ` ON UPDATE ${ast.update}` : "";
  }
  function matchReference(ast, wrap2) {
    return ast.match !== null ? ` MATCH ${ast.match}` : "";
  }
  function deferrable(ast, wrap2) {
    return ast !== null ? ` ${ast.not ? "NOT " : ""}DEFERRABLE${ast.initially !== null ? ` INITIALLY ${ast.initially}` : ""}` : "";
  }
  function constraintName(ast, wrap2) {
    return ast.name !== null ? `CONSTRAINT ${identifier(ast.name, wrap2)} ` : "";
  }
  function createIndex(ast, wrap2) {
    return `CREATE${unique(ast)} INDEX${exists(ast)} ${schema(
      ast,
      wrap2
    )}${index(ast, wrap2)} on ${table(ast, wrap2)} (${indexedColumnList(
      ast,
      wrap2
    )})${where(ast)}`;
  }
  function unique(ast, wrap2) {
    return ast.unique ? " UNIQUE" : "";
  }
  function exists(ast, wrap2) {
    return ast.exists ? " IF NOT EXISTS" : "";
  }
  function schema(ast, wrap2) {
    return ast.schema !== null ? `${identifier(ast.schema, wrap2)}.` : "";
  }
  function index(ast, wrap2) {
    return identifier(ast.index, wrap2);
  }
  function table(ast, wrap2) {
    return identifier(ast.table, wrap2);
  }
  function where(ast, wrap2) {
    return ast.where !== null ? ` where ${expression(ast.where)}` : "";
  }
  function indexedColumnList(ast, wrap2) {
    return ast.columns.map(
      (column) => !column.expression ? indexedColumn(column, wrap2) : indexedColumnExpression(column)
    ).join(", ");
  }
  function indexedColumn(ast, wrap2) {
    return `${identifier(ast.name, wrap2)}${collation(ast)}${order(
      ast
    )}`;
  }
  function indexedColumnExpression(ast, wrap2) {
    return `${indexedExpression(ast.name)}${collation(ast)}${order(
      ast
    )}`;
  }
  function collation(ast, wrap2) {
    return ast.collation !== null ? ` COLLATE ${ast.collation}` : "";
  }
  function order(ast, wrap2) {
    return ast.order !== null ? ` ${ast.order}` : "";
  }
  function indexedExpression(ast, wrap2) {
    return expression(ast);
  }
  function expression(ast, wrap2) {
    return ast.reduce(
      (expr, e) => Array.isArray(e) ? `${expr}(${expression(e)})` : !expr ? e : `${expr} ${e}`,
      ""
    );
  }
  function identifier(ast, wrap2) {
    return wrap2(ast);
  }
  compiler = {
    compileCreateTable,
    compileCreateIndex
  };
  return compiler;
}
var utils$2;
var hasRequiredUtils$2;
function requireUtils$2() {
  if (hasRequiredUtils$2) return utils$2;
  hasRequiredUtils$2 = 1;
  function isEqualId(first2, second) {
    return first2.toLowerCase() === second.toLowerCase();
  }
  function includesId(list, id) {
    return list.some((item) => isEqualId(item, id));
  }
  utils$2 = {
    isEqualId,
    includesId
  };
  return utils$2;
}
var ddl;
var hasRequiredDdl;
function requireDdl() {
  if (hasRequiredDdl) return ddl;
  hasRequiredDdl = 1;
  const identity2 = identity_1;
  const { nanonum: nanonum2 } = nanoid_1;
  const {
    copyData,
    dropOriginal,
    renameTable,
    getTableSql,
    isForeignCheckEnabled,
    setForeignCheck,
    executeForeignCheck
  } = requireSqliteDdlOperations();
  const { parseCreateTable, parseCreateIndex } = requireParser();
  const {
    compileCreateTable,
    compileCreateIndex
  } = requireCompiler();
  const { isEqualId, includesId } = requireUtils$2();
  class SQLite3_DDL {
    constructor(client2, tableCompiler, pragma, connection) {
      this.client = client2;
      this.tableCompiler = tableCompiler;
      this.pragma = pragma;
      this.tableNameRaw = this.tableCompiler.tableNameRaw;
      this.alteredName = `_knex_temp_alter${nanonum2(3)}`;
      this.connection = connection;
      this.formatter = (value) => this.client.customWrapIdentifier(value, identity2);
      this.wrap = (value) => this.client.wrapIdentifierImpl(value);
    }
    tableName() {
      return this.formatter(this.tableNameRaw);
    }
    getTableSql() {
      const tableName = this.tableName();
      return this.client.transaction(
        async (trx) => {
          trx.disableProcessing();
          const result = await trx.raw(getTableSql(tableName));
          trx.enableProcessing();
          return {
            createTable: result.filter((create) => create.type === "table")[0].sql,
            createIndices: result.filter((create) => create.type === "index").map((create) => create.sql)
          };
        },
        { connection: this.connection, enforceForeignCheck: null }
      );
    }
    async isForeignCheckEnabled() {
      const result = await this.client.raw(isForeignCheckEnabled()).connection(this.connection);
      return result[0].foreign_keys === 1;
    }
    async setForeignCheck(enable) {
      await this.client.raw(setForeignCheck(enable)).connection(this.connection);
    }
    renameTable(trx) {
      return trx.raw(renameTable(this.alteredName, this.tableName()));
    }
    dropOriginal(trx) {
      return trx.raw(dropOriginal(this.tableName()));
    }
    copyData(trx, columns) {
      return trx.raw(copyData(this.tableName(), this.alteredName, columns));
    }
    async alterColumn(columns) {
      const { createTable, createIndices } = await this.getTableSql();
      const parsedTable = parseCreateTable(createTable);
      parsedTable.table = this.alteredName;
      parsedTable.columns = parsedTable.columns.map((column) => {
        const newColumnInfo = columns.find((c) => isEqualId(c.name, column.name));
        if (newColumnInfo) {
          column.type = newColumnInfo.type;
          column.constraints.default = newColumnInfo.defaultTo !== null ? {
            name: null,
            value: newColumnInfo.defaultTo,
            expression: false
          } : null;
          column.constraints.notnull = newColumnInfo.notNull ? { name: null, conflict: null } : null;
          column.constraints.null = newColumnInfo.notNull ? null : column.constraints.null;
        }
        return column;
      });
      const newTable = compileCreateTable(parsedTable, this.wrap);
      return this.generateAlterCommands(newTable, createIndices);
    }
    async dropColumn(columns) {
      const { createTable, createIndices } = await this.getTableSql();
      const parsedTable = parseCreateTable(createTable);
      parsedTable.table = this.alteredName;
      parsedTable.columns = parsedTable.columns.filter(
        (parsedColumn) => parsedColumn.expression || !includesId(columns, parsedColumn.name)
      );
      if (parsedTable.columns.length === 0) {
        throw new Error("Unable to drop last column from table");
      }
      parsedTable.constraints = parsedTable.constraints.filter((constraint) => {
        if (constraint.type === "PRIMARY KEY" || constraint.type === "UNIQUE") {
          return constraint.columns.every(
            (constraintColumn) => constraintColumn.expression || !includesId(columns, constraintColumn.name)
          );
        } else if (constraint.type === "FOREIGN KEY") {
          return constraint.columns.every(
            (constraintColumnName) => !includesId(columns, constraintColumnName)
          ) && (constraint.references.table !== parsedTable.table || constraint.references.columns.every(
            (referenceColumnName) => !includesId(columns, referenceColumnName)
          ));
        } else {
          return true;
        }
      });
      const newColumns = parsedTable.columns.map((column) => column.name);
      const newTable = compileCreateTable(parsedTable, this.wrap);
      const newIndices = [];
      for (const createIndex of createIndices) {
        const parsedIndex = parseCreateIndex(createIndex);
        parsedIndex.columns = parsedIndex.columns.filter(
          (parsedColumn) => parsedColumn.expression || !includesId(columns, parsedColumn.name)
        );
        if (parsedIndex.columns.length > 0) {
          newIndices.push(compileCreateIndex(parsedIndex, this.wrap));
        }
      }
      return this.alter(newTable, newIndices, newColumns);
    }
    async dropForeign(columns, foreignKeyName) {
      const { createTable, createIndices } = await this.getTableSql();
      const parsedTable = parseCreateTable(createTable);
      parsedTable.table = this.alteredName;
      if (!foreignKeyName) {
        parsedTable.columns = parsedTable.columns.map((column) => ({
          ...column,
          references: includesId(columns, column.name) ? null : column.references
        }));
      }
      parsedTable.constraints = parsedTable.constraints.filter((constraint) => {
        if (constraint.type === "FOREIGN KEY") {
          if (foreignKeyName) {
            return !constraint.name || !isEqualId(constraint.name, foreignKeyName);
          }
          return constraint.columns.every(
            (constraintColumnName) => !includesId(columns, constraintColumnName)
          );
        } else {
          return true;
        }
      });
      const newTable = compileCreateTable(parsedTable, this.wrap);
      return this.alter(newTable, createIndices);
    }
    async dropPrimary(constraintName) {
      const { createTable, createIndices } = await this.getTableSql();
      const parsedTable = parseCreateTable(createTable);
      parsedTable.table = this.alteredName;
      parsedTable.columns = parsedTable.columns.map((column) => ({
        ...column,
        primary: null
      }));
      parsedTable.constraints = parsedTable.constraints.filter((constraint) => {
        if (constraint.type === "PRIMARY KEY") {
          if (constraintName) {
            return !constraint.name || !isEqualId(constraint.name, constraintName);
          } else {
            return false;
          }
        } else {
          return true;
        }
      });
      const newTable = compileCreateTable(parsedTable, this.wrap);
      return this.alter(newTable, createIndices);
    }
    async primary(columns, constraintName) {
      const { createTable, createIndices } = await this.getTableSql();
      const parsedTable = parseCreateTable(createTable);
      parsedTable.table = this.alteredName;
      parsedTable.columns = parsedTable.columns.map((column) => ({
        ...column,
        primary: null
      }));
      parsedTable.constraints = parsedTable.constraints.filter(
        (constraint) => constraint.type !== "PRIMARY KEY"
      );
      parsedTable.constraints.push({
        type: "PRIMARY KEY",
        name: constraintName || null,
        columns: columns.map((column) => ({
          name: column,
          expression: false,
          collation: null,
          order: null
        })),
        conflict: null
      });
      const newTable = compileCreateTable(parsedTable, this.wrap);
      return this.alter(newTable, createIndices);
    }
    async foreign(foreignInfo) {
      const { createTable, createIndices } = await this.getTableSql();
      const parsedTable = parseCreateTable(createTable);
      parsedTable.table = this.alteredName;
      parsedTable.constraints.push({
        type: "FOREIGN KEY",
        name: foreignInfo.keyName || null,
        columns: foreignInfo.column,
        references: {
          table: foreignInfo.inTable,
          columns: foreignInfo.references,
          delete: foreignInfo.onDelete || null,
          update: foreignInfo.onUpdate || null,
          match: null,
          deferrable: null
        }
      });
      const newTable = compileCreateTable(parsedTable, this.wrap);
      return this.generateAlterCommands(newTable, createIndices);
    }
    async setNullable(column, isNullable) {
      const { createTable, createIndices } = await this.getTableSql();
      const parsedTable = parseCreateTable(createTable);
      parsedTable.table = this.alteredName;
      const parsedColumn = parsedTable.columns.find(
        (c) => isEqualId(column, c.name)
      );
      if (!parsedColumn) {
        throw new Error(
          `.setNullable: Column ${column} does not exist in table ${this.tableName()}.`
        );
      }
      parsedColumn.constraints.notnull = isNullable ? null : { name: null, conflict: null };
      parsedColumn.constraints.null = isNullable ? parsedColumn.constraints.null : null;
      const newTable = compileCreateTable(parsedTable, this.wrap);
      return this.generateAlterCommands(newTable, createIndices);
    }
    async alter(newSql, createIndices, columns) {
      const enforceForeignCheck = this.client.transacting ? null : false;
      await this.client.transaction(
        async (trx) => {
          await trx.raw(newSql);
          await this.copyData(trx, columns);
          await this.dropOriginal(trx);
          await this.renameTable(trx);
          for (const createIndex of createIndices) {
            await trx.raw(createIndex);
          }
        },
        { connection: this.connection, enforceForeignCheck }
      );
    }
    async generateAlterCommands(newSql, createIndices, columns) {
      const sql = [];
      const pre = [];
      const post = [];
      let check = null;
      sql.push(newSql);
      sql.push(copyData(this.tableName(), this.alteredName, columns));
      sql.push(dropOriginal(this.tableName()));
      sql.push(renameTable(this.alteredName, this.tableName()));
      for (const createIndex of createIndices) {
        sql.push(createIndex);
      }
      const isForeignCheckEnabled2 = await this.isForeignCheckEnabled();
      if (isForeignCheckEnabled2) {
        pre.push(setForeignCheck(false));
        post.push(setForeignCheck(true));
        check = executeForeignCheck();
      }
      return { pre, sql, check, post };
    }
  }
  ddl = SQLite3_DDL;
  return ddl;
}
var sqliteQuerybuilder;
var hasRequiredSqliteQuerybuilder;
function requireSqliteQuerybuilder() {
  if (hasRequiredSqliteQuerybuilder) return sqliteQuerybuilder;
  hasRequiredSqliteQuerybuilder = 1;
  const QueryBuilder2 = querybuilder;
  sqliteQuerybuilder = class QueryBuilder_SQLite3 extends QueryBuilder2 {
    withMaterialized(alias, statementOrColumnList, nothingOrStatement) {
      this._validateWithArgs(
        alias,
        statementOrColumnList,
        nothingOrStatement,
        "with"
      );
      return this.withWrapped(
        alias,
        statementOrColumnList,
        nothingOrStatement,
        true
      );
    }
    withNotMaterialized(alias, statementOrColumnList, nothingOrStatement) {
      this._validateWithArgs(
        alias,
        statementOrColumnList,
        nothingOrStatement,
        "with"
      );
      return this.withWrapped(
        alias,
        statementOrColumnList,
        nothingOrStatement,
        false
      );
    }
  };
  return sqliteQuerybuilder;
}
var sqlite3$1 = { exports: {} };
var bindings = { exports: {} };
var fileUriToPath_1;
var hasRequiredFileUriToPath;
function requireFileUriToPath() {
  if (hasRequiredFileUriToPath) return fileUriToPath_1;
  hasRequiredFileUriToPath = 1;
  var sep = require$$0$3.sep || "/";
  fileUriToPath_1 = fileUriToPath;
  function fileUriToPath(uri) {
    if ("string" != typeof uri || uri.length <= 7 || "file://" != uri.substring(0, 7)) {
      throw new TypeError("must pass in a file:// URI to convert to a file path");
    }
    var rest = decodeURI(uri.substring(7));
    var firstSlash = rest.indexOf("/");
    var host = rest.substring(0, firstSlash);
    var path2 = rest.substring(firstSlash + 1);
    if ("localhost" == host) host = "";
    if (host) {
      host = sep + sep + host;
    }
    path2 = path2.replace(/^(.+)\|/, "$1:");
    if (sep == "\\") {
      path2 = path2.replace(/\//g, "\\");
    }
    if (/^.+\:/.test(path2)) ;
    else {
      path2 = sep + path2;
    }
    return host + path2;
  }
  return fileUriToPath_1;
}
var hasRequiredBindings;
function requireBindings() {
  if (hasRequiredBindings) return bindings.exports;
  hasRequiredBindings = 1;
  (function(module, exports) {
    var fs2 = require$$0$2, path2 = require$$0$3, fileURLToPath = requireFileUriToPath(), join = path2.join, dirname = path2.dirname, exists = fs2.accessSync && function(path22) {
      try {
        fs2.accessSync(path22);
      } catch (e) {
        return false;
      }
      return true;
    } || fs2.existsSync || path2.existsSync, defaults2 = {
      arrow: process.env.NODE_BINDINGS_ARROW || " → ",
      compiled: process.env.NODE_BINDINGS_COMPILED_DIR || "compiled",
      platform: process.platform,
      arch: process.arch,
      nodePreGyp: "node-v" + process.versions.modules + "-" + process.platform + "-" + process.arch,
      version: process.versions.node,
      bindings: "bindings.node",
      try: [
        // node-gyp's linked version in the "build" dir
        ["module_root", "build", "bindings"],
        // node-waf and gyp_addon (a.k.a node-gyp)
        ["module_root", "build", "Debug", "bindings"],
        ["module_root", "build", "Release", "bindings"],
        // Debug files, for development (legacy behavior, remove for node v0.9)
        ["module_root", "out", "Debug", "bindings"],
        ["module_root", "Debug", "bindings"],
        // Release files, but manually compiled (legacy behavior, remove for node v0.9)
        ["module_root", "out", "Release", "bindings"],
        ["module_root", "Release", "bindings"],
        // Legacy from node-waf, node <= 0.4.x
        ["module_root", "build", "default", "bindings"],
        // Production "Release" buildtype binary (meh...)
        ["module_root", "compiled", "version", "platform", "arch", "bindings"],
        // node-qbs builds
        ["module_root", "addon-build", "release", "install-root", "bindings"],
        ["module_root", "addon-build", "debug", "install-root", "bindings"],
        ["module_root", "addon-build", "default", "install-root", "bindings"],
        // node-pre-gyp path ./lib/binding/{node_abi}-{platform}-{arch}
        ["module_root", "lib", "binding", "nodePreGyp", "bindings"]
      ]
    };
    function bindings2(opts) {
      if (typeof opts == "string") {
        opts = { bindings: opts };
      } else if (!opts) {
        opts = {};
      }
      Object.keys(defaults2).map(function(i2) {
        if (!(i2 in opts)) opts[i2] = defaults2[i2];
      });
      if (!opts.module_root) {
        opts.module_root = exports.getRoot(exports.getFileName());
      }
      if (path2.extname(opts.bindings) != ".node") {
        opts.bindings += ".node";
      }
      var requireFunc = typeof __webpack_require__ === "function" ? __non_webpack_require__ : commonjsRequire;
      var tries = [], i = 0, l = opts.try.length, n, b, err;
      for (; i < l; i++) {
        n = join.apply(
          null,
          opts.try[i].map(function(p) {
            return opts[p] || p;
          })
        );
        tries.push(n);
        try {
          b = opts.path ? requireFunc.resolve(n) : requireFunc(n);
          if (!opts.path) {
            b.path = n;
          }
          return b;
        } catch (e) {
          if (e.code !== "MODULE_NOT_FOUND" && e.code !== "QUALIFIED_PATH_RESOLUTION_FAILED" && !/not find/i.test(e.message)) {
            throw e;
          }
        }
      }
      err = new Error(
        "Could not locate the bindings file. Tried:\n" + tries.map(function(a) {
          return opts.arrow + a;
        }).join("\n")
      );
      err.tries = tries;
      throw err;
    }
    module.exports = exports = bindings2;
    exports.getFileName = function getFileName(calling_file) {
      var origPST = Error.prepareStackTrace, origSTL = Error.stackTraceLimit, dummy = {}, fileName;
      Error.stackTraceLimit = 10;
      Error.prepareStackTrace = function(e, st) {
        for (var i = 0, l = st.length; i < l; i++) {
          fileName = st[i].getFileName();
          if (fileName !== __filename) {
            if (calling_file) {
              if (fileName !== calling_file) {
                return;
              }
            } else {
              return;
            }
          }
        }
      };
      Error.captureStackTrace(dummy);
      dummy.stack;
      Error.prepareStackTrace = origPST;
      Error.stackTraceLimit = origSTL;
      var fileSchema = "file://";
      if (fileName.indexOf(fileSchema) === 0) {
        fileName = fileURLToPath(fileName);
      }
      return fileName;
    };
    exports.getRoot = function getRoot(file) {
      var dir = dirname(file), prev;
      while (true) {
        if (dir === ".") {
          dir = process.cwd();
        }
        if (exists(join(dir, "package.json")) || exists(join(dir, "node_modules"))) {
          return dir;
        }
        if (prev === dir) {
          throw new Error(
            'Could not find module root given file: "' + file + '". Do you have a `package.json` file? '
          );
        }
        prev = dir;
        dir = join(dir, "..");
      }
    };
  })(bindings, bindings.exports);
  return bindings.exports;
}
var sqlite3Binding;
var hasRequiredSqlite3Binding;
function requireSqlite3Binding() {
  if (hasRequiredSqlite3Binding) return sqlite3Binding;
  hasRequiredSqlite3Binding = 1;
  sqlite3Binding = requireBindings()("node_sqlite3.node");
  return sqlite3Binding;
}
var trace = {};
var hasRequiredTrace;
function requireTrace() {
  if (hasRequiredTrace) return trace;
  hasRequiredTrace = 1;
  const util = require$$3;
  function extendTrace(object, property2, pos) {
    const old = object[property2];
    object[property2] = function() {
      const error = new Error();
      const name = object.constructor.name + "#" + property2 + "(" + Array.prototype.slice.call(arguments).map(function(el) {
        return util.inspect(el, false, 0);
      }).join(", ") + ")";
      if (typeof pos === "undefined") pos = -1;
      if (pos < 0) pos += arguments.length;
      const cb = arguments[pos];
      if (typeof arguments[pos] === "function") {
        arguments[pos] = function replacement() {
          const err = arguments[0];
          if (err && err.stack && !err.__augmented) {
            err.stack = filter(err).join("\n");
            err.stack += "\n--> in " + name;
            err.stack += "\n" + filter(error).slice(1).join("\n");
            err.__augmented = true;
          }
          return cb.apply(this, arguments);
        };
      }
      return old.apply(this, arguments);
    };
  }
  trace.extendTrace = extendTrace;
  function filter(error) {
    return error.stack.split("\n").filter(function(line) {
      return line.indexOf(__filename) < 0;
    });
  }
  return trace;
}
var hasRequiredSqlite3$1;
function requireSqlite3$1() {
  if (hasRequiredSqlite3$1) return sqlite3$1.exports;
  hasRequiredSqlite3$1 = 1;
  (function(module, exports) {
    const path2 = require$$0$3;
    const sqlite32 = requireSqlite3Binding();
    const EventEmitter2 = require$$0.EventEmitter;
    module.exports = sqlite32;
    function normalizeMethod(fn) {
      return function(sql) {
        let errBack;
        const args = Array.prototype.slice.call(arguments, 1);
        if (typeof args[args.length - 1] === "function") {
          const callback = args[args.length - 1];
          errBack = function(err) {
            if (err) {
              callback(err);
            }
          };
        }
        const statement = new Statement(this, sql, errBack);
        return fn.call(this, statement, args);
      };
    }
    function inherits(target, source) {
      for (const k in source.prototype)
        target.prototype[k] = source.prototype[k];
    }
    sqlite32.cached = {
      Database: function(file, a, b) {
        if (file === "" || file === ":memory:") {
          return new Database(file, a, b);
        }
        let db;
        file = path2.resolve(file);
        if (!sqlite32.cached.objects[file]) {
          db = sqlite32.cached.objects[file] = new Database(file, a, b);
        } else {
          db = sqlite32.cached.objects[file];
          const callback = typeof a === "number" ? b : a;
          if (typeof callback === "function") {
            let cb = function() {
              callback.call(db, null);
            };
            if (db.open) process.nextTick(cb);
            else db.once("open", cb);
          }
        }
        return db;
      },
      objects: {}
    };
    const Database = sqlite32.Database;
    const Statement = sqlite32.Statement;
    const Backup = sqlite32.Backup;
    inherits(Database, EventEmitter2);
    inherits(Statement, EventEmitter2);
    inherits(Backup, EventEmitter2);
    Database.prototype.prepare = normalizeMethod(function(statement, params) {
      return params.length ? statement.bind.apply(statement, params) : statement;
    });
    Database.prototype.run = normalizeMethod(function(statement, params) {
      statement.run.apply(statement, params).finalize();
      return this;
    });
    Database.prototype.get = normalizeMethod(function(statement, params) {
      statement.get.apply(statement, params).finalize();
      return this;
    });
    Database.prototype.all = normalizeMethod(function(statement, params) {
      statement.all.apply(statement, params).finalize();
      return this;
    });
    Database.prototype.each = normalizeMethod(function(statement, params) {
      statement.each.apply(statement, params).finalize();
      return this;
    });
    Database.prototype.map = normalizeMethod(function(statement, params) {
      statement.map.apply(statement, params).finalize();
      return this;
    });
    Database.prototype.backup = function() {
      let backup;
      if (arguments.length <= 2) {
        backup = new Backup(this, arguments[0], "main", "main", true, arguments[1]);
      } else {
        backup = new Backup(this, arguments[0], arguments[1], arguments[2], arguments[3], arguments[4]);
      }
      backup.retryErrors = [sqlite32.BUSY, sqlite32.LOCKED];
      return backup;
    };
    Statement.prototype.map = function() {
      const params = Array.prototype.slice.call(arguments);
      const callback = params.pop();
      params.push(function(err, rows) {
        if (err) return callback(err);
        const result = {};
        if (rows.length) {
          const keys2 = Object.keys(rows[0]);
          const key = keys2[0];
          if (keys2.length > 2) {
            for (let i = 0; i < rows.length; i++) {
              result[rows[i][key]] = rows[i];
            }
          } else {
            const value = keys2[1];
            for (let i = 0; i < rows.length; i++) {
              result[rows[i][key]] = rows[i][value];
            }
          }
        }
        callback(err, result);
      });
      return this.all.apply(this, params);
    };
    let isVerbose = false;
    const supportedEvents = ["trace", "profile", "change"];
    Database.prototype.addListener = Database.prototype.on = function(type) {
      const val = EventEmitter2.prototype.addListener.apply(this, arguments);
      if (supportedEvents.indexOf(type) >= 0) {
        this.configure(type, true);
      }
      return val;
    };
    Database.prototype.removeListener = function(type) {
      const val = EventEmitter2.prototype.removeListener.apply(this, arguments);
      if (supportedEvents.indexOf(type) >= 0 && !this._events[type]) {
        this.configure(type, false);
      }
      return val;
    };
    Database.prototype.removeAllListeners = function(type) {
      const val = EventEmitter2.prototype.removeAllListeners.apply(this, arguments);
      if (supportedEvents.indexOf(type) >= 0) {
        this.configure(type, false);
      }
      return val;
    };
    sqlite32.verbose = function() {
      if (!isVerbose) {
        const trace2 = requireTrace();
        [
          "prepare",
          "get",
          "run",
          "all",
          "each",
          "map",
          "close",
          "exec"
        ].forEach(function(name) {
          trace2.extendTrace(Database.prototype, name);
        });
        [
          "bind",
          "get",
          "run",
          "all",
          "each",
          "map",
          "reset",
          "finalize"
        ].forEach(function(name) {
          trace2.extendTrace(Statement.prototype, name);
        });
        isVerbose = true;
      }
      return sqlite32;
    };
  })(sqlite3$1);
  return sqlite3$1.exports;
}
var sqlite3;
var hasRequiredSqlite3;
function requireSqlite3() {
  if (hasRequiredSqlite3) return sqlite3;
  hasRequiredSqlite3 = 1;
  const defaults2 = defaults_1;
  const map2 = map_1;
  const { promisify: promisify2 } = require$$3;
  const Client3 = client;
  const Raw3 = raw;
  const Transaction_Sqlite = requireSqliteTransaction();
  const SqliteQueryCompiler = requireSqliteQuerycompiler();
  const SchemaCompiler3 = requireSqliteCompiler();
  const ColumnCompiler3 = requireSqliteColumncompiler();
  const TableCompiler3 = requireSqliteTablecompiler();
  const ViewCompiler3 = requireSqliteViewcompiler();
  const SQLite3_DDL = requireDdl();
  const Formatter3 = formatter;
  const QueryBuilder2 = requireSqliteQuerybuilder();
  class Client_SQLite3 extends Client3 {
    constructor(config) {
      super(config);
      if (config.connection && config.connection.filename === void 0) {
        this.logger.warn(
          "Could not find `connection.filename` in config. Please specify the database path and name to avoid errors. (see docs https://knexjs.org/guide/#configuration-options)"
        );
      }
      if (config.useNullAsDefault === void 0) {
        this.logger.warn(
          "sqlite does not support inserting default values. Set the `useNullAsDefault` flag to hide this warning. (see docs https://knexjs.org/guide/query-builder.html#insert)."
        );
      }
      this.strictForeignKeyPragma = false;
    }
    _driver() {
      return requireSqlite3$1();
    }
    /** @returns {Client_SQLite3 & {strictForeignKeyPragma: true}} */
    _strict() {
      const strictClient = Object.create(this);
      strictClient.strictForeignKeyPragma = true;
      strictClient.transaction = strictClient.transaction.bind(strictClient);
      return strictClient;
    }
    schemaCompiler() {
      return new SchemaCompiler3(this, ...arguments);
    }
    transaction() {
      return new Transaction_Sqlite(this, ...arguments);
    }
    queryCompiler(builder2, formatter2) {
      return new SqliteQueryCompiler(this, builder2, formatter2);
    }
    queryBuilder() {
      return new QueryBuilder2(this);
    }
    viewCompiler(builder2, formatter2) {
      return new ViewCompiler3(this, builder2, formatter2);
    }
    columnCompiler() {
      return new ColumnCompiler3(this, ...arguments);
    }
    tableCompiler() {
      return new TableCompiler3(this, ...arguments);
    }
    ddl(compiler2, pragma, connection) {
      return new SQLite3_DDL(this._strict(), compiler2, pragma, connection);
    }
    wrapIdentifierImpl(value) {
      return value !== "*" ? `\`${value.replace(/`/g, "``")}\`` : "*";
    }
    // Get a raw connection from the database, returning a promise with the connection object.
    acquireRawConnection() {
      return new Promise((resolve, reject2) => {
        let flags = this.driver.OPEN_READWRITE | this.driver.OPEN_CREATE;
        if (this.connectionSettings.flags) {
          if (!Array.isArray(this.connectionSettings.flags)) {
            throw new Error(`flags must be an array of strings`);
          }
          this.connectionSettings.flags.forEach((_flag) => {
            if (!_flag.startsWith("OPEN_") || !this.driver[_flag]) {
              throw new Error(`flag ${_flag} not supported by node-sqlite3`);
            }
            flags = flags | this.driver[_flag];
          });
        }
        const db = new this.driver.Database(
          this.connectionSettings.filename,
          flags,
          (err) => {
            if (err) {
              return reject2(err);
            }
            resolve(db);
          }
        );
      });
    }
    // Used to explicitly close a connection, called internally by the pool when
    // a connection times out or the pool is shutdown.
    async destroyRawConnection(connection) {
      const close = promisify2((cb) => connection.close(cb));
      return close();
    }
    // Runs the query on the specified connection, providing the bindings and any
    // other necessary prep work.
    _query(connection, obj) {
      if (!obj.sql) throw new Error("The query is empty");
      const { method } = obj;
      let callMethod;
      switch (method) {
        case "insert":
        case "update":
          callMethod = obj.returning ? "all" : "run";
          break;
        case "counter":
        case "del":
          callMethod = "run";
          break;
        default:
          callMethod = "all";
      }
      return new Promise(function(resolver, rejecter) {
        if (!connection || !connection[callMethod]) {
          return rejecter(
            new Error(`Error calling ${callMethod} on connection.`)
          );
        }
        connection[callMethod](obj.sql, obj.bindings, function(err, response) {
          if (err) return rejecter(err);
          obj.response = response;
          obj.context = this;
          return resolver(obj);
        });
      });
    }
    _stream(connection, obj, stream) {
      if (!obj.sql) throw new Error("The query is empty");
      const client2 = this;
      return new Promise(function(resolver, rejecter) {
        stream.on("error", rejecter);
        stream.on("end", resolver);
        return client2._query(connection, obj).then((obj2) => obj2.response).then((rows) => rows.forEach((row) => stream.write(row))).catch(function(err) {
          stream.emit("error", err);
        }).then(function() {
          stream.end();
        });
      });
    }
    // Ensures the response is returned in the same format as other clients.
    processResponse(obj, runner2) {
      const ctx = obj.context;
      const { response, returning } = obj;
      if (obj.output) return obj.output.call(runner2, response);
      switch (obj.method) {
        case "select":
          return response;
        case "first":
          return response[0];
        case "pluck":
          return map2(response, obj.pluck);
        case "insert": {
          if (returning) {
            if (response) {
              return response;
            }
          }
          return [ctx.lastID];
        }
        case "update": {
          if (returning) {
            if (response) {
              return response;
            }
          }
          return ctx.changes;
        }
        case "del":
        case "counter":
          return ctx.changes;
        default: {
          return response;
        }
      }
    }
    poolDefaults() {
      return defaults2({ min: 1, max: 1 }, super.poolDefaults());
    }
    formatter(builder2) {
      return new Formatter3(this, builder2);
    }
    values(values2, builder2, formatter2) {
      if (Array.isArray(values2)) {
        if (Array.isArray(values2[0])) {
          return `( values ${values2.map(
            (value) => `(${this.parameterize(value, void 0, builder2, formatter2)})`
          ).join(", ")})`;
        }
        return `(${this.parameterize(values2, void 0, builder2, formatter2)})`;
      }
      if (values2 instanceof Raw3) {
        return `(${this.parameter(values2, builder2, formatter2)})`;
      }
      return this.parameter(values2, builder2, formatter2);
    }
  }
  Object.assign(Client_SQLite3.prototype, {
    dialect: "sqlite3",
    driverName: "sqlite3"
  });
  sqlite3 = Client_SQLite3;
  return sqlite3;
}
var betterSqlite3;
var hasRequiredBetterSqlite3;
function requireBetterSqlite3() {
  if (hasRequiredBetterSqlite3) return betterSqlite3;
  hasRequiredBetterSqlite3 = 1;
  const Client_SQLite3 = requireSqlite3();
  class Client_BetterSQLite3 extends Client_SQLite3 {
    _driver() {
      return require$$1$1;
    }
    // Get a raw connection from the database, returning a promise with the connection object.
    async acquireRawConnection() {
      const options = this.connectionSettings.options || {};
      const db = new this.driver(this.connectionSettings.filename, {
        nativeBinding: options.nativeBinding,
        readonly: !!options.readonly
      });
      const safeIntegers = this._optSafeIntegers(options);
      if (safeIntegers !== void 0) {
        db.defaultSafeIntegers(safeIntegers);
      }
      return db;
    }
    // Used to explicitly close a connection, called internally by the pool when
    // a connection times out or the pool is shutdown.
    async destroyRawConnection(connection) {
      return connection.close();
    }
    // Runs the query on the specified connection, providing the bindings and any
    // other necessary prep work.
    async _query(connection, obj) {
      if (!obj.sql) throw new Error("The query is empty");
      if (!connection) {
        throw new Error("No connection provided");
      }
      const statement = connection.prepare(obj.sql);
      const safeIntegers = this._optSafeIntegers(obj.options);
      if (safeIntegers !== void 0) {
        statement.safeIntegers(safeIntegers);
      }
      const bindings2 = this._formatBindings(obj.bindings);
      if (statement.reader) {
        const response2 = await statement.all(bindings2);
        obj.response = response2;
        return obj;
      }
      const response = await statement.run(bindings2);
      obj.response = response;
      obj.context = {
        lastID: response.lastInsertRowid,
        changes: response.changes
      };
      return obj;
    }
    _formatBindings(bindings2) {
      if (!bindings2) {
        return [];
      }
      return bindings2.map((binding) => {
        if (binding instanceof Date) {
          return binding.valueOf();
        }
        if (typeof binding === "boolean") {
          return Number(binding);
        }
        return binding;
      });
    }
    _optSafeIntegers(options) {
      if (options && typeof options === "object" && typeof options.safeIntegers === "boolean") {
        return options.safeIntegers;
      }
      return void 0;
    }
  }
  Object.assign(Client_BetterSQLite3.prototype, {
    // The "dialect", for reference .
    driverName: "better-sqlite3"
  });
  betterSqlite3 = Client_BetterSQLite3;
  return betterSqlite3;
}
var pgTransaction;
var hasRequiredPgTransaction;
function requirePgTransaction() {
  if (hasRequiredPgTransaction) return pgTransaction;
  hasRequiredPgTransaction = 1;
  const Transaction3 = transaction$6;
  class Transaction_PG extends Transaction3 {
    begin(conn) {
      const trxMode = [
        this.isolationLevel ? `ISOLATION LEVEL ${this.isolationLevel}` : "",
        this.readOnly ? "READ ONLY" : ""
      ].join(" ").trim();
      if (trxMode.length === 0) {
        return this.query(conn, "BEGIN;");
      }
      return this.query(conn, `BEGIN TRANSACTION ${trxMode};`);
    }
  }
  pgTransaction = Transaction_PG;
  return pgTransaction;
}
var pgQuerycompiler;
var hasRequiredPgQuerycompiler;
function requirePgQuerycompiler() {
  if (hasRequiredPgQuerycompiler) return pgQuerycompiler;
  hasRequiredPgQuerycompiler = 1;
  const identity2 = identity_1;
  const reduce2 = reduce_1;
  const QueryCompiler3 = querycompiler;
  const {
    wrapString: wrapString2,
    columnize: columnize_2,
    operator: operator_2,
    wrap: wrap_2
  } = wrappingFormatter;
  class QueryCompiler_PG extends QueryCompiler3 {
    constructor(client2, builder2, formatter2) {
      super(client2, builder2, formatter2);
      this._defaultInsertValue = "default";
    }
    // Compiles a truncate query.
    truncate() {
      return `truncate ${this.tableName} restart identity`;
    }
    // is used if the an array with multiple empty values supplied
    // Compiles an `insert` query, allowing for multiple
    // inserts using a single query statement.
    insert() {
      let sql = super.insert();
      if (sql === "") return sql;
      const { returning, onConflict, ignore, merge: merge2, insert } = this.single;
      if (onConflict && ignore) sql += this._ignore(onConflict);
      if (onConflict && merge2) {
        sql += this._merge(merge2.updates, onConflict, insert);
        const wheres = this.where();
        if (wheres) sql += ` ${wheres}`;
      }
      if (returning) sql += this._returning(returning);
      return {
        sql,
        returning
      };
    }
    // Compiles an `update` query, allowing for a return value.
    update() {
      const withSQL = this.with();
      const updateData = this._prepUpdate(this.single.update);
      const { returning, updateFrom } = this.single;
      const updateFromSQL = this._updateFrom(updateFrom);
      const wheres = this.where();
      return {
        sql: withSQL + `update ${this.single.only ? "only " : ""}${this.tableName} set ${updateData.join(", ")}` + updateFromSQL + (wheres ? ` ${wheres}` : "") + this._returning(returning),
        returning
      };
    }
    using() {
      const usingTables = this.single.using;
      if (!usingTables) return;
      let sql = "using ";
      if (Array.isArray(usingTables)) {
        sql += usingTables.map((table) => {
          return this.formatter.wrap(table);
        }).join(",");
      } else {
        sql += this.formatter.wrap(usingTables);
      }
      return sql;
    }
    // Compiles an `delete` query, allowing for a return value.
    del() {
      const { tableName } = this;
      const withSQL = this.with();
      let using = this.using() || "";
      const joins = this.grouped.join;
      const tableJoins = [];
      const joinWhereStatements = [];
      if (Array.isArray(joins)) {
        for (const join of joins) {
          tableJoins.push(
            wrap_2(
              this._joinTable(join),
              void 0,
              this.builder,
              this.client,
              this.bindingsHolder
            )
          );
          for (const clause of join.clauses) {
            joinWhereStatements.push({
              column: clause.column,
              operator: "=",
              value: clause.value,
              asColumn: true
            });
          }
        }
        if (tableJoins.length > 0) {
          using += (using ? "," : "using ") + tableJoins.join(",");
        }
      }
      let wheres = this.where() || "";
      const joinWhereClauses = joinWhereStatements.map(
        (joinWhere) => this.whereBasic(joinWhere)
      );
      if (joinWhereClauses.length > 0) {
        wheres += (wheres ? " and " : "where ") + joinWhereClauses.join(" and ");
      }
      const sql = withSQL + `delete from ${this.single.only ? "only " : ""}${tableName}` + (using ? ` ${using}` : "") + (wheres ? ` ${wheres}` : "");
      const { returning } = this.single;
      return {
        sql: sql + this._returning(returning),
        returning
      };
    }
    aggregate(stmt) {
      return this._aggregate(stmt, { distinctParentheses: true });
    }
    _returning(value) {
      return value ? ` returning ${this.formatter.columnize(value)}` : "";
    }
    _updateFrom(name) {
      return name ? ` from ${this.formatter.wrap(name)}` : "";
    }
    _ignore(columns) {
      if (columns === true) {
        return " on conflict do nothing";
      }
      return ` on conflict ${this._onConflictClause(columns)} do nothing`;
    }
    _merge(updates, columns, insert) {
      let sql = ` on conflict ${this._onConflictClause(columns)} do update set `;
      if (updates && Array.isArray(updates)) {
        sql += updates.map(
          (column) => wrapString2(
            column.split(".").pop(),
            this.formatter.builder,
            this.client,
            this.formatter
          )
        ).map((column) => `${column} = excluded.${column}`).join(", ");
        return sql;
      } else if (updates && typeof updates === "object") {
        const updateData = this._prepUpdate(updates);
        if (typeof updateData === "string") {
          sql += updateData;
        } else {
          sql += updateData.join(",");
        }
        return sql;
      } else {
        const insertData = this._prepInsert(insert);
        if (typeof insertData === "string") {
          throw new Error(
            "If using merge with a raw insert query, then updates must be provided"
          );
        }
        sql += insertData.columns.map(
          (column) => wrapString2(column.split(".").pop(), this.builder, this.client)
        ).map((column) => `${column} = excluded.${column}`).join(", ");
        return sql;
      }
    }
    _lockingClause(lockMode2) {
      const tables = this.single.lockTables || [];
      return lockMode2 + (tables.length ? " of " + tables.filter(Boolean).map((table) => this.formatter.wrap(table)).join(", ") : "");
    }
    _groupOrder(item, type) {
      return super._groupOrderNulls(item, type);
    }
    forUpdate() {
      return this._lockingClause("for update");
    }
    forShare() {
      return this._lockingClause("for share");
    }
    forNoKeyUpdate() {
      return this._lockingClause("for no key update");
    }
    forKeyShare() {
      return this._lockingClause("for key share");
    }
    skipLocked() {
      return "skip locked";
    }
    noWait() {
      return "nowait";
    }
    // Compiles a columnInfo query
    columnInfo() {
      const column = this.single.columnInfo;
      let schema = this.single.schema;
      const table = this.client.customWrapIdentifier(this.single.table, identity2);
      if (schema) {
        schema = this.client.customWrapIdentifier(schema, identity2);
      }
      const sql = "select * from information_schema.columns where table_name = ? and table_catalog = current_database()";
      const bindings2 = [table];
      return this._buildColumnInfoQuery(schema, sql, bindings2, column);
    }
    _buildColumnInfoQuery(schema, sql, bindings2, column) {
      if (schema) {
        sql += " and table_schema = ?";
        bindings2.push(schema);
      } else {
        sql += " and table_schema = current_schema()";
      }
      return {
        sql,
        bindings: bindings2,
        output(resp) {
          const out = reduce2(
            resp.rows,
            function(columns, val) {
              columns[val.column_name] = {
                type: val.data_type,
                maxLength: val.character_maximum_length,
                nullable: val.is_nullable === "YES",
                defaultValue: val.column_default
              };
              return columns;
            },
            {}
          );
          return column && out[column] || out;
        }
      };
    }
    distinctOn(value) {
      return "distinct on (" + this.formatter.columnize(value) + ") ";
    }
    // Json functions
    jsonExtract(params) {
      return this._jsonExtract("jsonb_path_query", params);
    }
    jsonSet(params) {
      return this._jsonSet(
        "jsonb_set",
        Object.assign({}, params, {
          path: this.client.toPathForJson(params.path)
        })
      );
    }
    jsonInsert(params) {
      return this._jsonSet(
        "jsonb_insert",
        Object.assign({}, params, {
          path: this.client.toPathForJson(params.path)
        })
      );
    }
    jsonRemove(params) {
      const jsonCol = `${columnize_2(
        params.column,
        this.builder,
        this.client,
        this.bindingsHolder
      )} #- ${this.client.parameter(
        this.client.toPathForJson(params.path),
        this.builder,
        this.bindingsHolder
      )}`;
      return params.alias ? this.client.alias(jsonCol, this.formatter.wrap(params.alias)) : jsonCol;
    }
    whereJsonPath(statement) {
      let castValue = "";
      if (!isNaN(statement.value) && parseInt(statement.value)) {
        castValue = "::int";
      } else if (!isNaN(statement.value) && parseFloat(statement.value)) {
        castValue = "::float";
      } else {
        castValue = " #>> '{}'";
      }
      return `jsonb_path_query_first(${this._columnClause(
        statement
      )}, ${this.client.parameter(
        statement.jsonPath,
        this.builder,
        this.bindingsHolder
      )})${castValue} ${operator_2(
        statement.operator,
        this.builder,
        this.client,
        this.bindingsHolder
      )} ${this._jsonValueClause(statement)}`;
    }
    whereJsonSupersetOf(statement) {
      return this._not(
        statement,
        `${wrap_2(
          statement.column,
          void 0,
          this.builder,
          this.client,
          this.bindingsHolder
        )} @> ${this._jsonValueClause(statement)}`
      );
    }
    whereJsonSubsetOf(statement) {
      return this._not(
        statement,
        `${columnize_2(
          statement.column,
          this.builder,
          this.client,
          this.bindingsHolder
        )} <@ ${this._jsonValueClause(statement)}`
      );
    }
    onJsonPathEquals(clause) {
      return this._onJsonPathEquals("jsonb_path_query_first", clause);
    }
  }
  pgQuerycompiler = QueryCompiler_PG;
  return pgQuerycompiler;
}
var pgQuerybuilder;
var hasRequiredPgQuerybuilder;
function requirePgQuerybuilder() {
  if (hasRequiredPgQuerybuilder) return pgQuerybuilder;
  hasRequiredPgQuerybuilder = 1;
  const QueryBuilder2 = querybuilder;
  pgQuerybuilder = class QueryBuilder_PostgreSQL extends QueryBuilder2 {
    updateFrom(name) {
      this._single.updateFrom = name;
      return this;
    }
    using(tables) {
      this._single.using = tables;
      return this;
    }
    withMaterialized(alias, statementOrColumnList, nothingOrStatement) {
      this._validateWithArgs(
        alias,
        statementOrColumnList,
        nothingOrStatement,
        "with"
      );
      return this.withWrapped(
        alias,
        statementOrColumnList,
        nothingOrStatement,
        true
      );
    }
    withNotMaterialized(alias, statementOrColumnList, nothingOrStatement) {
      this._validateWithArgs(
        alias,
        statementOrColumnList,
        nothingOrStatement,
        "with"
      );
      return this.withWrapped(
        alias,
        statementOrColumnList,
        nothingOrStatement,
        false
      );
    }
  };
  return pgQuerybuilder;
}
var pgColumncompiler;
var hasRequiredPgColumncompiler;
function requirePgColumncompiler() {
  if (hasRequiredPgColumncompiler) return pgColumncompiler;
  hasRequiredPgColumncompiler = 1;
  const ColumnCompiler3 = columncompiler;
  const { isObject: isObject2, isNumber: isNumber2 } = is;
  const { toNumber: toNumber2 } = helpers$7;
  const commentEscapeRegex = new RegExp("(?<!')'(?!')", "g");
  class ColumnCompiler_PG extends ColumnCompiler3 {
    constructor(client2, tableCompiler, columnBuilder) {
      super(client2, tableCompiler, columnBuilder);
      this.modifiers = ["nullable", "defaultTo", "comment"];
      this._addCheckModifiers();
    }
    // Types
    // ------
    bit(column) {
      return column.length !== false ? `bit(${column.length})` : "bit";
    }
    // Create the column definition for an enum type.
    // Using method "2" here: http://stackoverflow.com/a/10984951/525714
    enu(allowed, options) {
      options = options || {};
      const values2 = options.useNative && options.existingType ? void 0 : allowed.join("', '");
      if (options.useNative) {
        let enumName = "";
        const schemaName = options.schemaName || this.tableCompiler.schemaNameRaw;
        if (schemaName) {
          enumName += `"${schemaName}".`;
        }
        enumName += `"${options.enumName}"`;
        if (!options.existingType) {
          this.tableCompiler.unshiftQuery(
            `create type ${enumName} as enum ('${values2}')`
          );
        }
        return enumName;
      }
      return `text check (${this.formatter.wrap(this.args[0])} in ('${values2}'))`;
    }
    decimal(precision, scale) {
      if (precision === null) return "decimal";
      return `decimal(${toNumber2(precision, 8)}, ${toNumber2(scale, 2)})`;
    }
    json(jsonb) {
      if (jsonb) this.client.logger.deprecate("json(true)", "jsonb()");
      return jsonColumn(this.client, jsonb);
    }
    jsonb() {
      return jsonColumn(this.client, true);
    }
    checkRegex(regex, constraintName) {
      return this._check(
        `${this.formatter.wrap(
          this.getColumnName()
        )} ~ ${this.client._escapeBinding(regex)}`,
        constraintName
      );
    }
    datetime(withoutTz = false, precision) {
      const defaultPrecision = isNumber2(
        this.client.config.defaultDateTimePrecision
      ) ? `(${this.client.config.defaultDateTimePrecision})` : "";
      let useTz;
      if (isObject2(withoutTz)) {
        ({ useTz, precision } = withoutTz);
      } else {
        useTz = !withoutTz;
      }
      useTz = typeof useTz === "boolean" ? useTz : true;
      precision = precision !== void 0 && precision !== null ? "(" + precision + ")" : defaultPrecision;
      return `${useTz ? "timestamptz" : "timestamp"}${precision}`;
    }
    timestamp(withoutTz = false, precision) {
      return this.datetime(withoutTz, precision);
    }
    // Modifiers:
    // ------
    comment(comment) {
      const columnName = this.args[0] || this.defaults("columnName");
      const escapedComment = comment ? `'${comment.replace(commentEscapeRegex, "''")}'` : "NULL";
      this.pushAdditional(function() {
        this.pushQuery(
          `comment on column ${this.tableCompiler.tableName()}.` + this.formatter.wrap(columnName) + ` is ${escapedComment}`
        );
      }, comment);
    }
    increments(options = { primaryKey: true }) {
      return "serial" + (this.tableCompiler._canBeAddPrimaryKey(options) ? " primary key" : "");
    }
    bigincrements(options = { primaryKey: true }) {
      return "bigserial" + (this.tableCompiler._canBeAddPrimaryKey(options) ? " primary key" : "");
    }
    uuid(options = { primaryKey: false }) {
      return "uuid" + (this.tableCompiler._canBeAddPrimaryKey(options) ? " primary key" : "");
    }
  }
  ColumnCompiler_PG.prototype.bigint = "bigint";
  ColumnCompiler_PG.prototype.binary = "bytea";
  ColumnCompiler_PG.prototype.bool = "boolean";
  ColumnCompiler_PG.prototype.double = "double precision";
  ColumnCompiler_PG.prototype.floating = "real";
  ColumnCompiler_PG.prototype.smallint = "smallint";
  ColumnCompiler_PG.prototype.tinyint = "smallint";
  function jsonColumn(client2, jsonb) {
    if (!client2.version || client2.config.client === "cockroachdb" || client2.config.jsonbSupport === true || parseFloat(client2.version) >= 9.2) {
      return jsonb ? "jsonb" : "json";
    }
    return "text";
  }
  pgColumncompiler = ColumnCompiler_PG;
  return pgColumncompiler;
}
var pgTablecompiler;
var hasRequiredPgTablecompiler;
function requirePgTablecompiler() {
  if (hasRequiredPgTablecompiler) return pgTablecompiler;
  hasRequiredPgTablecompiler = 1;
  const has2 = has_1;
  const TableCompiler3 = tablecompiler;
  const { isObject: isObject2, isString: isString2 } = is;
  class TableCompiler_PG extends TableCompiler3 {
    constructor(client2, tableBuilder) {
      super(client2, tableBuilder);
    }
    // Compile a rename column command.
    renameColumn(from, to) {
      return this.pushQuery({
        sql: `alter table ${this.tableName()} rename ${this.formatter.wrap(
          from
        )} to ${this.formatter.wrap(to)}`
      });
    }
    _setNullableState(column, isNullable) {
      const constraintAction = isNullable ? "drop not null" : "set not null";
      const sql = `alter table ${this.tableName()} alter column ${this.formatter.wrap(
        column
      )} ${constraintAction}`;
      return this.pushQuery({
        sql
      });
    }
    compileAdd(builder2) {
      const table = this.formatter.wrap(builder2);
      const columns = this.prefixArray("add column", this.getColumns(builder2));
      return this.pushQuery({
        sql: `alter table ${table} ${columns.join(", ")}`
      });
    }
    // Adds the "create" query to the query sequence.
    createQuery(columns, ifNot, like) {
      const createStatement = ifNot ? "create table if not exists " : "create table ";
      const columnsSql = ` (${columns.sql.join(", ")}${this.primaryKeys() || ""}${this._addChecks()})`;
      let sql = createStatement + this.tableName() + (like && this.tableNameLike() ? " (like " + this.tableNameLike() + " including all" + (columns.sql.length ? ", " + columns.sql.join(", ") : "") + ")" : columnsSql);
      if (this.single.inherits)
        sql += ` inherits (${this.formatter.wrap(this.single.inherits)})`;
      this.pushQuery({
        sql,
        bindings: columns.bindings
      });
      const hasComment = has2(this.single, "comment");
      if (hasComment) this.comment(this.single.comment);
    }
    primaryKeys() {
      const pks = (this.grouped.alterTable || []).filter(
        (k) => k.method === "primary"
      );
      if (pks.length > 0 && pks[0].args.length > 0) {
        const columns = pks[0].args[0];
        let constraintName = pks[0].args[1] || "";
        let deferrable;
        if (isObject2(constraintName)) {
          ({ constraintName, deferrable } = constraintName);
        }
        deferrable = deferrable ? ` deferrable initially ${deferrable}` : "";
        constraintName = constraintName ? this.formatter.wrap(constraintName) : this.formatter.wrap(`${this.tableNameRaw}_pkey`);
        return `, constraint ${constraintName} primary key (${this.formatter.columnize(
          columns
        )})${deferrable}`;
      }
    }
    addColumns(columns, prefix, colCompilers) {
      if (prefix === this.alterColumnsPrefix) {
        for (const col of colCompilers) {
          this._addColumn(col);
        }
      } else {
        super.addColumns(columns, prefix);
      }
    }
    _addColumn(col) {
      const quotedTableName = this.tableName();
      const type = col.getColumnType();
      const colName = this.client.wrapIdentifier(
        col.getColumnName(),
        col.columnBuilder.queryContext()
      );
      const isEnum = col.type === "enu";
      this.pushQuery({
        sql: `alter table ${quotedTableName} alter column ${colName} drop default`,
        bindings: []
      });
      const alterNullable = col.columnBuilder.alterNullable;
      if (alterNullable) {
        this.pushQuery({
          sql: `alter table ${quotedTableName} alter column ${colName} drop not null`,
          bindings: []
        });
      }
      const alterType = col.columnBuilder.alterType;
      if (alterType) {
        this.pushQuery({
          sql: `alter table ${quotedTableName} alter column ${colName} type ${type} using (${colName}${isEnum ? "::text::" : "::"}${type})`,
          bindings: []
        });
      }
      const defaultTo = col.modified["defaultTo"];
      if (defaultTo) {
        const modifier = col.defaultTo.apply(col, defaultTo);
        this.pushQuery({
          sql: `alter table ${quotedTableName} alter column ${colName} set ${modifier}`,
          bindings: []
        });
      }
      if (alterNullable) {
        const nullable = col.modified["nullable"];
        if (nullable && nullable[0] === false) {
          this.pushQuery({
            sql: `alter table ${quotedTableName} alter column ${colName} set not null`,
            bindings: []
          });
        }
      }
    }
    // Compiles the comment on the table.
    comment(comment) {
      this.pushQuery(
        `comment on table ${this.tableName()} is '${this.single.comment}'`
      );
    }
    // Indexes:
    // -------
    primary(columns, constraintName) {
      let deferrable;
      if (isObject2(constraintName)) {
        ({ constraintName, deferrable } = constraintName);
      }
      deferrable = deferrable ? ` deferrable initially ${deferrable}` : "";
      constraintName = constraintName ? this.formatter.wrap(constraintName) : this.formatter.wrap(`${this.tableNameRaw}_pkey`);
      if (this.method !== "create" && this.method !== "createIfNot") {
        this.pushQuery(
          `alter table ${this.tableName()} add constraint ${constraintName} primary key (${this.formatter.columnize(
            columns
          )})${deferrable}`
        );
      }
    }
    unique(columns, indexName) {
      let deferrable;
      let useConstraint = true;
      let predicate;
      if (isObject2(indexName)) {
        ({ indexName, deferrable, useConstraint, predicate } = indexName);
        if (useConstraint === void 0) {
          useConstraint = !!deferrable || !predicate;
        }
      }
      if (!useConstraint && deferrable && deferrable !== "not deferrable") {
        throw new Error("postgres cannot create deferrable index");
      }
      if (useConstraint && predicate) {
        throw new Error("postgres cannot create constraint with predicate");
      }
      deferrable = deferrable ? ` deferrable initially ${deferrable}` : "";
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("unique", this.tableNameRaw, columns);
      if (useConstraint) {
        this.pushQuery(
          `alter table ${this.tableName()} add constraint ${indexName} unique (` + this.formatter.columnize(columns) + ")" + deferrable
        );
      } else {
        const predicateQuery = predicate ? " " + this.client.queryCompiler(predicate).where() : "";
        this.pushQuery(
          `create unique index ${indexName} on ${this.tableName()} (${this.formatter.columnize(
            columns
          )})${predicateQuery}`
        );
      }
    }
    index(columns, indexName, options) {
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("index", this.tableNameRaw, columns);
      let predicate;
      let storageEngineIndexType;
      let indexType;
      if (isString2(options)) {
        storageEngineIndexType = options;
      } else if (isObject2(options)) {
        ({ indexType, storageEngineIndexType, predicate } = options);
      }
      const predicateQuery = predicate ? " " + this.client.queryCompiler(predicate).where() : "";
      this.pushQuery(
        `create${typeof indexType === "string" && indexType.toLowerCase() === "unique" ? " unique" : ""} index ${indexName} on ${this.tableName()}${storageEngineIndexType && ` using ${storageEngineIndexType}` || ""} (` + this.formatter.columnize(columns) + `)${predicateQuery}`
      );
    }
    dropPrimary(constraintName) {
      constraintName = constraintName ? this.formatter.wrap(constraintName) : this.formatter.wrap(this.tableNameRaw + "_pkey");
      this.pushQuery(
        `alter table ${this.tableName()} drop constraint ${constraintName}`
      );
    }
    dropPrimaryIfExists(constraintName) {
      constraintName = constraintName ? this.formatter.wrap(constraintName) : this.formatter.wrap(this.tableNameRaw + "_pkey");
      this.pushQuery(
        `alter table ${this.tableName()} drop constraint if exists ${constraintName}`
      );
    }
    dropIndex(columns, indexName) {
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("index", this.tableNameRaw, columns);
      indexName = this.schemaNameRaw ? `${this.formatter.wrap(this.schemaNameRaw)}.${indexName}` : indexName;
      this.pushQuery(`drop index ${indexName}`);
    }
    dropUnique(columns, indexName) {
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("unique", this.tableNameRaw, columns);
      this.pushQuery(
        `alter table ${this.tableName()} drop constraint ${indexName}`
      );
    }
    dropUniqueIfExists(columns, indexName) {
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("unique", this.tableNameRaw, columns);
      this.pushQuery(
        `alter table ${this.tableName()} drop constraint if exists ${indexName}`
      );
    }
    dropForeign(columns, indexName) {
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("foreign", this.tableNameRaw, columns);
      this.pushQuery(
        `alter table ${this.tableName()} drop constraint ${indexName}`
      );
    }
    dropForeignIfExists(columns, indexName) {
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("foreign", this.tableNameRaw, columns);
      this.pushQuery(
        `alter table ${this.tableName()} drop constraint if exists ${indexName}`
      );
    }
  }
  pgTablecompiler = TableCompiler_PG;
  return pgTablecompiler;
}
var pgViewcompiler;
var hasRequiredPgViewcompiler;
function requirePgViewcompiler() {
  if (hasRequiredPgViewcompiler) return pgViewcompiler;
  hasRequiredPgViewcompiler = 1;
  const ViewCompiler3 = viewcompiler;
  class ViewCompiler_PG extends ViewCompiler3 {
    constructor(client2, viewCompiler) {
      super(client2, viewCompiler);
    }
    renameColumn(from, to) {
      return this.pushQuery({
        sql: `alter view ${this.viewName()} rename ${this.formatter.wrap(
          from
        )} to ${this.formatter.wrap(to)}`
      });
    }
    defaultTo(column, defaultValue) {
      return this.pushQuery({
        sql: `alter view ${this.viewName()} alter ${this.formatter.wrap(
          column
        )} set default ${defaultValue}`
      });
    }
    createOrReplace() {
      this.createQuery(this.columns, this.selectQuery, false, true);
    }
    createMaterializedView() {
      this.createQuery(this.columns, this.selectQuery, true);
    }
  }
  pgViewcompiler = ViewCompiler_PG;
  return pgViewcompiler;
}
var pgViewbuilder;
var hasRequiredPgViewbuilder;
function requirePgViewbuilder() {
  if (hasRequiredPgViewbuilder) return pgViewbuilder;
  hasRequiredPgViewbuilder = 1;
  const ViewBuilder3 = viewbuilder;
  class ViewBuilder_PG extends ViewBuilder3 {
    constructor() {
      super(...arguments);
    }
    checkOption() {
      this._single.checkOption = "default_option";
    }
    localCheckOption() {
      this._single.checkOption = "local";
    }
    cascadedCheckOption() {
      this._single.checkOption = "cascaded";
    }
  }
  pgViewbuilder = ViewBuilder_PG;
  return pgViewbuilder;
}
var pgCompiler;
var hasRequiredPgCompiler;
function requirePgCompiler() {
  if (hasRequiredPgCompiler) return pgCompiler;
  hasRequiredPgCompiler = 1;
  const SchemaCompiler3 = compiler$1;
  class SchemaCompiler_PG extends SchemaCompiler3 {
    constructor(client2, builder2) {
      super(client2, builder2);
    }
    // Check whether the current table
    hasTable(tableName) {
      let sql = "select * from information_schema.tables where table_name = ?";
      const bindings2 = [tableName];
      if (this.schema) {
        sql += " and table_schema = ?";
        bindings2.push(this.schema);
      } else {
        sql += " and table_schema = current_schema()";
      }
      this.pushQuery({
        sql,
        bindings: bindings2,
        output(resp) {
          return resp.rows.length > 0;
        }
      });
    }
    // Compile the query to determine if a column exists in a table.
    hasColumn(tableName, columnName) {
      let sql = "select * from information_schema.columns where table_name = ? and column_name = ?";
      const bindings2 = [tableName, columnName];
      if (this.schema) {
        sql += " and table_schema = ?";
        bindings2.push(this.schema);
      } else {
        sql += " and table_schema = current_schema()";
      }
      this.pushQuery({
        sql,
        bindings: bindings2,
        output(resp) {
          return resp.rows.length > 0;
        }
      });
    }
    qualifiedTableName(tableName) {
      const name = this.schema ? `${this.schema}.${tableName}` : tableName;
      return this.formatter.wrap(name);
    }
    // Compile a rename table command.
    renameTable(from, to) {
      this.pushQuery(
        `alter table ${this.qualifiedTableName(
          from
        )} rename to ${this.formatter.wrap(to)}`
      );
    }
    createSchema(schemaName) {
      this.pushQuery(`create schema ${this.formatter.wrap(schemaName)}`);
    }
    createSchemaIfNotExists(schemaName) {
      this.pushQuery(
        `create schema if not exists ${this.formatter.wrap(schemaName)}`
      );
    }
    dropSchema(schemaName, cascade = false) {
      this.pushQuery(
        `drop schema ${this.formatter.wrap(schemaName)}${cascade ? " cascade" : ""}`
      );
    }
    dropSchemaIfExists(schemaName, cascade = false) {
      this.pushQuery(
        `drop schema if exists ${this.formatter.wrap(schemaName)}${cascade ? " cascade" : ""}`
      );
    }
    dropExtension(extensionName) {
      this.pushQuery(`drop extension ${this.formatter.wrap(extensionName)}`);
    }
    dropExtensionIfExists(extensionName) {
      this.pushQuery(
        `drop extension if exists ${this.formatter.wrap(extensionName)}`
      );
    }
    createExtension(extensionName) {
      this.pushQuery(`create extension ${this.formatter.wrap(extensionName)}`);
    }
    createExtensionIfNotExists(extensionName) {
      this.pushQuery(
        `create extension if not exists ${this.formatter.wrap(extensionName)}`
      );
    }
    renameView(from, to) {
      this.pushQuery(
        this.alterViewPrefix + `${this.formatter.wrap(from)} rename to ${this.formatter.wrap(to)}`
      );
    }
    refreshMaterializedView(viewName, concurrently = false) {
      this.pushQuery({
        sql: `refresh materialized view${concurrently ? " concurrently" : ""} ${this.formatter.wrap(viewName)}`
      });
    }
    dropMaterializedView(viewName) {
      this._dropView(viewName, false, true);
    }
    dropMaterializedViewIfExists(viewName) {
      this._dropView(viewName, true, true);
    }
  }
  pgCompiler = SchemaCompiler_PG;
  return pgCompiler;
}
throw new Error(`Could not resolve "pg-query-stream" imported by "knex". Is it installed?`);
const __viteOptionalPeerDep_pgQueryStream_knex = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null
}, Symbol.toStringTag, { value: "Module" }));
const require$$16 = /* @__PURE__ */ getAugmentedNamespace(__viteOptionalPeerDep_pgQueryStream_knex);
var postgres;
var hasRequiredPostgres;
function requirePostgres() {
  if (hasRequiredPostgres) return postgres;
  hasRequiredPostgres = 1;
  const extend2 = extend$3;
  const map2 = map_1;
  const uniqueId2 = uniqueId_1;
  const { promisify: promisify2 } = require$$3;
  const Client3 = client;
  const Transaction3 = requirePgTransaction();
  const QueryCompiler3 = requirePgQuerycompiler();
  const QueryBuilder2 = requirePgQuerybuilder();
  const ColumnCompiler3 = requirePgColumncompiler();
  const TableCompiler3 = requirePgTablecompiler();
  const ViewCompiler3 = requirePgViewcompiler();
  const ViewBuilder3 = requirePgViewbuilder();
  const SchemaCompiler3 = requirePgCompiler();
  const { makeEscape: makeEscape2 } = string;
  const { isString: isString2 } = is;
  class Client_PG extends Client3 {
    constructor(config) {
      super(config);
      if (config.returning) {
        this.defaultReturning = config.returning;
      }
      if (config.searchPath) {
        this.searchPath = config.searchPath;
      }
    }
    transaction() {
      return new Transaction3(this, ...arguments);
    }
    queryBuilder() {
      return new QueryBuilder2(this);
    }
    queryCompiler(builder2, formatter2) {
      return new QueryCompiler3(this, builder2, formatter2);
    }
    columnCompiler() {
      return new ColumnCompiler3(this, ...arguments);
    }
    schemaCompiler() {
      return new SchemaCompiler3(this, ...arguments);
    }
    tableCompiler() {
      return new TableCompiler3(this, ...arguments);
    }
    viewCompiler() {
      return new ViewCompiler3(this, ...arguments);
    }
    viewBuilder() {
      return new ViewBuilder3(this, ...arguments);
    }
    _driver() {
      return require$$15;
    }
    wrapIdentifierImpl(value) {
      if (value === "*") return value;
      let arrayAccessor = "";
      const arrayAccessorMatch = value.match(/(.*?)(\[[0-9]+\])/);
      if (arrayAccessorMatch) {
        value = arrayAccessorMatch[1];
        arrayAccessor = arrayAccessorMatch[2];
      }
      return `"${value.replace(/"/g, '""')}"${arrayAccessor}`;
    }
    _acquireOnlyConnection() {
      const connection = new this.driver.Client(this.connectionSettings);
      connection.on("error", (err) => {
        connection.__knex__disposed = err;
      });
      connection.on("end", (err) => {
        connection.__knex__disposed = err || "Connection ended unexpectedly";
      });
      return connection.connect().then(() => connection);
    }
    // Get a raw connection, called by the `pool` whenever a new
    // connection needs to be added to the pool.
    acquireRawConnection() {
      const client2 = this;
      return this._acquireOnlyConnection().then(function(connection) {
        if (!client2.version) {
          return client2.checkVersion(connection).then(function(version) {
            client2.version = version;
            return connection;
          });
        }
        return connection;
      }).then(async function setSearchPath(connection) {
        await client2.setSchemaSearchPath(connection);
        return connection;
      });
    }
    // Used to explicitly close a connection, called internally by the pool
    // when a connection times out or the pool is shutdown.
    async destroyRawConnection(connection) {
      const end = promisify2((cb) => connection.end(cb));
      return end();
    }
    // Wraps a native pg.Pool with the interface knex expects from this.pool.
    wrapNativePool(nativePool) {
      const client2 = this;
      return {
        acquire() {
          return {
            promise: nativePool.connect().then(async (connection) => {
              connection.__knexUid = uniqueId2("__knexUid");
              if (!client2.version) {
                try {
                  client2.version = await client2.checkVersion(connection);
                } catch (_e) {
                }
              }
              return connection;
            })
          };
        },
        release(connection) {
          if (typeof connection.release === "function") {
            const shouldDestroy = !!connection.__knex__disposed;
            connection.release(shouldDestroy);
            return true;
          }
          return false;
        },
        destroy() {
          return Promise.resolve();
        }
      };
    }
    // In PostgreSQL, we need to do a version check to do some feature
    // checking on the database.
    checkVersion(connection) {
      return new Promise((resolve, reject2) => {
        connection.query("select version();", (err, resp) => {
          if (err) return reject2(err);
          resolve(this._parseVersion(resp.rows[0].version));
        });
      });
    }
    _parseVersion(versionString) {
      return /^PostgreSQL (.*?)( |$)/.exec(versionString)[1];
    }
    // Position the bindings for the query. The escape sequence for question mark
    // is \? (e.g. knex.raw("\\?") since javascript requires '\' to be escaped too...)
    positionBindings(sql) {
      let questionCount = 0;
      return sql.replace(/(\\*)(\?)/g, function(match, escapes) {
        if (escapes.length % 2) {
          return "?";
        } else {
          questionCount++;
          return `$${questionCount}`;
        }
      });
    }
    setSchemaSearchPath(connection, searchPath) {
      let path2 = searchPath || this.searchPath;
      if (!path2) return Promise.resolve(true);
      if (!Array.isArray(path2) && !isString2(path2)) {
        throw new TypeError(
          `knex: Expected searchPath to be Array/String, got: ${typeof path2}`
        );
      }
      if (isString2(path2)) {
        if (path2.includes(",")) {
          const parts = path2.split(",");
          const arraySyntax = `[${parts.map((searchPath2) => `'${searchPath2}'`).join(", ")}]`;
          this.logger.warn(
            `Detected comma in searchPath "${path2}".If you are trying to specify multiple schemas, use Array syntax: ${arraySyntax}`
          );
        }
        path2 = [path2];
      }
      path2 = path2.map((schemaName) => `"${schemaName.replace(/"/g, '""')}"`).join(",");
      return new Promise(function(resolver, rejecter) {
        connection.query(`set search_path to ${path2}`, function(err) {
          if (err) return rejecter(err);
          resolver(true);
        });
      });
    }
    _stream(connection, obj, stream, options) {
      if (!obj.sql) throw new Error("The query is empty");
      let PGQueryStream;
      if (process.browser) {
        PGQueryStream = void 0;
      } else {
        try {
          PGQueryStream = require$$16;
        } catch (e) {
          if (e instanceof Error && e.code === "MODULE_NOT_FOUND" && e.message.includes("pg-query-stream")) {
            throw new Error(
              "knex PostgreSQL query streaming requires the 'pg-query-stream' package. Please install it (e.g. `npm i pg-query-stream`)."
            );
          }
          throw e;
        }
      }
      const sql = obj.sql;
      return new Promise(function(resolver, rejecter) {
        const queryStream = connection.query(
          new PGQueryStream(sql, obj.bindings, options)
        );
        queryStream.on("error", function(error) {
          rejecter(error);
          stream.emit("error", error);
        });
        queryStream.on("end", resolver);
        queryStream.pipe(stream);
      });
    }
    // Runs the query on the specified connection, providing the bindings
    // and any other necessary prep work.
    _query(connection, obj) {
      if (!obj.sql) throw new Error("The query is empty");
      let queryConfig = {
        text: obj.sql,
        values: obj.bindings || []
      };
      if (obj.options) {
        queryConfig = extend2(queryConfig, obj.options);
      }
      return new Promise(function(resolver, rejecter) {
        connection.query(queryConfig, function(err, response) {
          if (err) return rejecter(err);
          obj.response = response;
          resolver(obj);
        });
      });
    }
    // Ensures the response is returned in the same format as other clients.
    processResponse(obj, runner2) {
      const resp = obj.response;
      if (obj.output) return obj.output.call(runner2, resp);
      if (obj.method === "raw") return resp;
      const { returning } = obj;
      if (resp.command === "SELECT") {
        if (obj.method === "first") return resp.rows[0];
        if (obj.method === "pluck") return map2(resp.rows, obj.pluck);
        return resp.rows;
      }
      if (returning) {
        const returns = [];
        for (let i = 0, l = resp.rows.length; i < l; i++) {
          const row = resp.rows[i];
          returns[i] = row;
        }
        return returns;
      }
      if (resp.command === "UPDATE" || resp.command === "DELETE") {
        return resp.rowCount;
      }
      return resp;
    }
    async cancelQuery(connectionToKill) {
      const conn = await this.acquireRawConnection();
      try {
        return await this._wrappedCancelQueryCall(conn, connectionToKill);
      } finally {
        await this.destroyRawConnection(conn).catch((err) => {
          this.logger.warn(`Connection Error: ${err}`);
        });
      }
    }
    _wrappedCancelQueryCall(conn, connectionToKill) {
      return this._query(conn, {
        sql: "SELECT pg_cancel_backend($1);",
        bindings: [connectionToKill.processID],
        options: {}
      });
    }
    toPathForJson(jsonPath) {
      const PG_PATH_REGEX = /^{.*}$/;
      if (jsonPath.match(PG_PATH_REGEX)) {
        return jsonPath;
      }
      return "{" + jsonPath.replace(/^(\$\.)/, "").replace(".", ",").replace(/\[([0-9]+)]/, ",$1") + // transform [number] to ,number
      "}";
    }
  }
  Object.assign(Client_PG.prototype, {
    dialect: "postgresql",
    driverName: "pg",
    canCancelQuery: true,
    _escapeBinding: makeEscape2({
      escapeArray(val, esc) {
        return esc(arrayString(val, esc));
      },
      escapeString(str) {
        let hasBackslash = false;
        let escaped = "'";
        for (let i = 0; i < str.length; i++) {
          const c = str[i];
          if (c === "'") {
            escaped += c + c;
          } else if (c === "\\") {
            escaped += c + c;
            hasBackslash = true;
          } else {
            escaped += c;
          }
        }
        escaped += "'";
        if (hasBackslash === true) {
          escaped = "E" + escaped;
        }
        return escaped;
      },
      escapeObject(val, prepareValue, timezone, seen = []) {
        if (val && typeof val.toPostgres === "function") {
          seen = seen || [];
          if (seen.indexOf(val) !== -1) {
            throw new Error(
              `circular reference detected while preparing "${val}" for query`
            );
          }
          seen.push(val);
          return prepareValue(val.toPostgres(prepareValue), seen);
        }
        return JSON.stringify(val);
      }
    })
  });
  function arrayString(arr, esc) {
    let result = "{";
    for (let i = 0; i < arr.length; i++) {
      if (i > 0) result += ",";
      const val = arr[i];
      if (val === null || typeof val === "undefined") {
        result += "NULL";
      } else if (Array.isArray(val)) {
        result += arrayString(val, esc);
      } else if (typeof val === "number") {
        result += val;
      } else {
        result += JSON.stringify(typeof val === "string" ? val : esc(val));
      }
    }
    return result + "}";
  }
  postgres = Client_PG;
  return postgres;
}
var crdbQuerycompiler;
var hasRequiredCrdbQuerycompiler;
function requireCrdbQuerycompiler() {
  if (hasRequiredCrdbQuerycompiler) return crdbQuerycompiler;
  hasRequiredCrdbQuerycompiler = 1;
  const QueryCompiler_PG = requirePgQuerycompiler();
  const {
    columnize: columnize_2,
    wrap: wrap_2,
    operator: operator_2
  } = wrappingFormatter;
  class QueryCompiler_CRDB extends QueryCompiler_PG {
    truncate() {
      return `truncate ${this.tableName}`;
    }
    upsert() {
      let sql = this._upsert();
      if (sql === "") return sql;
      const { returning } = this.single;
      if (returning) sql += this._returning(returning);
      return {
        sql,
        returning
      };
    }
    _upsert() {
      const upsertValues = this.single.upsert || [];
      const sql = this.with() + `upsert into ${this.tableName} `;
      const body = this._insertBody(upsertValues);
      return body === "" ? "" : sql + body;
    }
    _groupOrder(item, type) {
      return this._basicGroupOrder(item, type);
    }
    whereJsonPath(statement) {
      let castValue = "";
      if (!isNaN(statement.value) && parseInt(statement.value)) {
        castValue = "::int";
      } else if (!isNaN(statement.value) && parseFloat(statement.value)) {
        castValue = "::float";
      } else {
        castValue = " #>> '{}'";
      }
      return `json_extract_path(${this._columnClause(
        statement
      )}, ${this.client.toArrayPathFromJsonPath(
        statement.jsonPath,
        this.builder,
        this.bindingsHolder
      )})${castValue} ${operator_2(
        statement.operator,
        this.builder,
        this.client,
        this.bindingsHolder
      )} ${this._jsonValueClause(statement)}`;
    }
    // Json common functions
    _jsonExtract(nameFunction, params) {
      let extractions;
      if (Array.isArray(params.column)) {
        extractions = params.column;
      } else {
        extractions = [params];
      }
      return extractions.map((extraction) => {
        const jsonCol = `json_extract_path(${columnize_2(
          extraction.column || extraction[0],
          this.builder,
          this.client,
          this.bindingsHolder
        )}, ${this.client.toArrayPathFromJsonPath(
          extraction.path || extraction[1],
          this.builder,
          this.bindingsHolder
        )})`;
        const alias = extraction.alias || extraction[2];
        return alias ? this.client.alias(jsonCol, this.formatter.wrap(alias)) : jsonCol;
      }).join(", ");
    }
    _onJsonPathEquals(nameJoinFunction, clause) {
      return "json_extract_path(" + wrap_2(
        clause.columnFirst,
        void 0,
        this.builder,
        this.client,
        this.bindingsHolder
      ) + ", " + this.client.toArrayPathFromJsonPath(
        clause.jsonPathFirst,
        this.builder,
        this.bindingsHolder
      ) + ") = json_extract_path(" + wrap_2(
        clause.columnSecond,
        void 0,
        this.builder,
        this.client,
        this.bindingsHolder
      ) + ", " + this.client.toArrayPathFromJsonPath(
        clause.jsonPathSecond,
        this.builder,
        this.bindingsHolder
      ) + ")";
    }
  }
  crdbQuerycompiler = QueryCompiler_CRDB;
  return crdbQuerycompiler;
}
var crdbColumncompiler;
var hasRequiredCrdbColumncompiler;
function requireCrdbColumncompiler() {
  if (hasRequiredCrdbColumncompiler) return crdbColumncompiler;
  hasRequiredCrdbColumncompiler = 1;
  const ColumnCompiler_PG = requirePgColumncompiler();
  class ColumnCompiler_CRDB extends ColumnCompiler_PG {
    uuid(options = { primaryKey: false }) {
      return "uuid" + (this.tableCompiler._canBeAddPrimaryKey(options) ? " primary key default gen_random_uuid()" : "");
    }
  }
  crdbColumncompiler = ColumnCompiler_CRDB;
  return crdbColumncompiler;
}
var crdbTablecompiler;
var hasRequiredCrdbTablecompiler;
function requireCrdbTablecompiler() {
  if (hasRequiredCrdbTablecompiler) return crdbTablecompiler;
  hasRequiredCrdbTablecompiler = 1;
  const TableCompiler3 = requirePgTablecompiler();
  class TableCompiler_CRDB extends TableCompiler3 {
    constructor(client2, tableBuilder) {
      super(client2, tableBuilder);
    }
    addColumns(columns, prefix, colCompilers) {
      if (prefix === this.alterColumnsPrefix) {
        for (const col of colCompilers) {
          this.client.logger.warn(
            "Experimental alter column in use, see issue: https://github.com/cockroachdb/cockroach/issues/49329"
          );
          this.pushQuery({
            sql: "SET enable_experimental_alter_column_type_general = true",
            bindings: []
          });
          super._addColumn(col);
        }
      } else {
        super.addColumns(columns, prefix);
      }
    }
    dropUnique(columns, indexName) {
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("unique", this.tableNameRaw, columns);
      this.pushQuery(`drop index ${this.tableName()}@${indexName} cascade`);
    }
    dropUniqueIfExists(columns, indexName) {
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("unique", this.tableNameRaw, columns);
      this.pushQuery(
        `drop index if exists ${this.tableName()}@${indexName} cascade`
      );
    }
  }
  crdbTablecompiler = TableCompiler_CRDB;
  return crdbTablecompiler;
}
var crdbViewcompiler;
var hasRequiredCrdbViewcompiler;
function requireCrdbViewcompiler() {
  if (hasRequiredCrdbViewcompiler) return crdbViewcompiler;
  hasRequiredCrdbViewcompiler = 1;
  const ViewCompiler_PG = requirePgViewcompiler();
  class ViewCompiler_CRDB extends ViewCompiler_PG {
    renameColumn(from, to) {
      throw new Error("rename column of views is not supported by this dialect.");
    }
    defaultTo(column, defaultValue) {
      throw new Error(
        "change default values of views is not supported by this dialect."
      );
    }
  }
  crdbViewcompiler = ViewCompiler_CRDB;
  return crdbViewcompiler;
}
var crdbQuerybuilder;
var hasRequiredCrdbQuerybuilder;
function requireCrdbQuerybuilder() {
  if (hasRequiredCrdbQuerybuilder) return crdbQuerybuilder;
  hasRequiredCrdbQuerybuilder = 1;
  const QueryBuilder2 = querybuilder;
  const isEmpty2 = isEmpty_1;
  crdbQuerybuilder = class QueryBuilder_CockroachDB extends QueryBuilder2 {
    upsert(values2, returning, options) {
      this._method = "upsert";
      if (!isEmpty2(returning)) this.returning(returning, options);
      this._single.upsert = values2;
      return this;
    }
  };
  return crdbQuerybuilder;
}
var cockroachdb;
var hasRequiredCockroachdb;
function requireCockroachdb() {
  if (hasRequiredCockroachdb) return cockroachdb;
  hasRequiredCockroachdb = 1;
  const Client_PostgreSQL = requirePostgres();
  const Transaction3 = requirePgTransaction();
  const QueryCompiler3 = requireCrdbQuerycompiler();
  const ColumnCompiler3 = requireCrdbColumncompiler();
  const TableCompiler3 = requireCrdbTablecompiler();
  const ViewCompiler3 = requireCrdbViewcompiler();
  const QueryBuilder2 = requireCrdbQuerybuilder();
  class Client_CockroachDB extends Client_PostgreSQL {
    transaction() {
      return new Transaction3(this, ...arguments);
    }
    queryCompiler(builder2, formatter2) {
      return new QueryCompiler3(this, builder2, formatter2);
    }
    columnCompiler() {
      return new ColumnCompiler3(this, ...arguments);
    }
    tableCompiler() {
      return new TableCompiler3(this, ...arguments);
    }
    viewCompiler() {
      return new ViewCompiler3(this, ...arguments);
    }
    queryBuilder() {
      return new QueryBuilder2(this);
    }
    _parseVersion(versionString) {
      return versionString.split(" ")[2];
    }
    async cancelQuery(connectionToKill) {
      try {
        return await this._wrappedCancelQueryCall(null, connectionToKill);
      } catch (err) {
        this.logger.warn(`Connection Error: ${err}`);
        throw err;
      }
    }
    _wrappedCancelQueryCall(emptyConnection, connectionToKill) {
      if (connectionToKill.activeQuery.processID === 0 && connectionToKill.activeQuery.secretKey === 0) {
        return;
      }
      return connectionToKill.cancel(
        connectionToKill,
        connectionToKill.activeQuery
      );
    }
    toArrayPathFromJsonPath(jsonPath, builder2, bindingsHolder) {
      return jsonPath.replace(/^(\$\.)/, "").replace(/\[([0-9]+)]/, ".$1").split(".").map(
        (function(v) {
          return this.parameter(v, builder2, bindingsHolder);
        }).bind(this)
      ).join(", ");
    }
  }
  Object.assign(Client_CockroachDB.prototype, {
    // The "dialect", for reference elsewhere.
    driverName: "cockroachdb"
  });
  cockroachdb = Client_CockroachDB;
  return cockroachdb;
}
var isNil_1;
var hasRequiredIsNil;
function requireIsNil() {
  if (hasRequiredIsNil) return isNil_1;
  hasRequiredIsNil = 1;
  function isNil(value) {
    return value == null;
  }
  isNil_1 = isNil;
  return isNil_1;
}
var mssqlFormatter;
var hasRequiredMssqlFormatter;
function requireMssqlFormatter() {
  if (hasRequiredMssqlFormatter) return mssqlFormatter;
  hasRequiredMssqlFormatter = 1;
  const Formatter3 = formatter;
  class MSSQL_Formatter extends Formatter3 {
    // Accepts a string or array of columns to wrap as appropriate.
    columnizeWithPrefix(prefix, target) {
      const columns = typeof target === "string" ? [target] : target;
      let str = "", i = -1;
      while (++i < columns.length) {
        if (i > 0) str += ", ";
        str += prefix + this.wrap(columns[i]);
      }
      return str;
    }
    /**
     * Returns its argument with single quotes escaped, so it can be included into a single-quoted string.
     *
     * For example, it converts "has'quote" to "has''quote".
     *
     * This assumes QUOTED_IDENTIFIER ON so it is only ' that need escaping,
     * never ", because " cannot be used to quote a string when that's on;
     * otherwise we'd need to be aware of whether the string is quoted with " or '.
     *
     * This assumption is consistent with the SQL Knex generates.
     * @param {string} string
     * @returns {string}
     */
    escapingStringDelimiters(string2) {
      return (string2 || "").replace(/'/g, "''");
    }
  }
  mssqlFormatter = MSSQL_Formatter;
  return mssqlFormatter;
}
var transaction$5;
var hasRequiredTransaction$5;
function requireTransaction$5() {
  if (hasRequiredTransaction$5) return transaction$5;
  hasRequiredTransaction$5 = 1;
  const Transaction3 = transaction$6;
  const debug2 = srcExports("knex:tx");
  class Transaction_MSSQL extends Transaction3 {
    begin(conn) {
      debug2("transaction::begin id=%s", this.txid);
      return new Promise((resolve, reject2) => {
        conn.beginTransaction(
          (err) => {
            if (err) {
              debug2(
                "transaction::begin error id=%s message=%s",
                this.txid,
                err.message
              );
              return reject2(err);
            }
            resolve();
          },
          this.outerTx ? this.txid : void 0,
          nameToIsolationLevelEnum(this.isolationLevel)
        );
      }).then(this._resolver, this._rejecter);
    }
    savepoint(conn) {
      debug2("transaction::savepoint id=%s", this.txid);
      return new Promise((resolve, reject2) => {
        conn.saveTransaction(
          (err) => {
            if (err) {
              debug2(
                "transaction::savepoint id=%s message=%s",
                this.txid,
                err.message
              );
              return reject2(err);
            }
            this.trxClient.emit("query", {
              __knexUid: this.trxClient.__knexUid,
              __knexTxId: this.trxClient.__knexTxId,
              autogenerated: true,
              sql: this.outerTx ? `SAVE TRANSACTION [${this.txid}]` : `SAVE TRANSACTION`
            });
            resolve();
          },
          this.outerTx ? this.txid : void 0
        );
      });
    }
    commit(conn, value) {
      debug2("transaction::commit id=%s", this.txid);
      return new Promise((resolve, reject2) => {
        conn.commitTransaction(
          (err) => {
            if (err) {
              debug2(
                "transaction::commit error id=%s message=%s",
                this.txid,
                err.message
              );
              return reject2(err);
            }
            this._completed = true;
            resolve(value);
          },
          this.outerTx ? this.txid : void 0
        );
      }).then(() => this._resolver(value), this._rejecter);
    }
    release(conn, value) {
      return this._resolver(value);
    }
    rollback(conn, error) {
      this._completed = true;
      debug2("transaction::rollback id=%s", this.txid);
      return new Promise((_resolve, reject2) => {
        if (!conn.inTransaction) {
          return reject2(
            error || new Error("Transaction rejected with non-error: undefined")
          );
        }
        if (conn.state.name !== "LoggedIn") {
          return reject2(
            new Error(
              "Can't rollback transaction. There is a request in progress"
            )
          );
        }
        conn.rollbackTransaction(
          (err) => {
            if (err) {
              debug2(
                "transaction::rollback error id=%s message=%s",
                this.txid,
                err.message
              );
            }
            reject2(
              err || error || new Error("Transaction rejected with non-error: undefined")
            );
          },
          this.outerTx ? this.txid : void 0
        );
      }).catch((err) => {
        if (!error && this.doNotRejectOnRollback) {
          this._resolver();
          return;
        }
        if (error) {
          try {
            err.originalError = error;
          } catch (_err) {
          }
        }
        this._rejecter(err);
      });
    }
    rollbackTo(conn, error) {
      return this.rollback(conn, error).then(
        () => void this.trxClient.emit("query", {
          __knexUid: this.trxClient.__knexUid,
          __knexTxId: this.trxClient.__knexTxId,
          autogenerated: true,
          sql: `ROLLBACK TRANSACTION`
        })
      );
    }
  }
  transaction$5 = Transaction_MSSQL;
  function nameToIsolationLevelEnum(level) {
    if (!level) return;
    level = level.toUpperCase().replace(" ", "_");
    const knownEnum = isolationEnum[level];
    if (!knownEnum) {
      throw new Error(
        `Unknown Isolation level, was expecting one of: ${JSON.stringify(
          humanReadableKeys
        )}`
      );
    }
    return knownEnum;
  }
  const isolationEnum = {
    READ_UNCOMMITTED: 1,
    READ_COMMITTED: 2,
    REPEATABLE_READ: 3,
    SERIALIZABLE: 4,
    SNAPSHOT: 5
  };
  const humanReadableKeys = Object.keys(isolationEnum).map(
    (key) => key.toLowerCase().replace("_", " ")
  );
  return transaction$5;
}
var mssqlQuerycompiler;
var hasRequiredMssqlQuerycompiler;
function requireMssqlQuerycompiler() {
  if (hasRequiredMssqlQuerycompiler) return mssqlQuerycompiler;
  hasRequiredMssqlQuerycompiler = 1;
  const QueryCompiler3 = querycompiler;
  const compact2 = compact_1;
  const identity2 = identity_1;
  const isEmpty2 = isEmpty_1;
  const Raw3 = raw;
  const {
    columnize: columnize_2
  } = wrappingFormatter;
  const components2 = [
    "comments",
    "columns",
    "join",
    "lock",
    "where",
    "union",
    "group",
    "having",
    "order",
    "limit",
    "offset"
  ];
  class QueryCompiler_MSSQL extends QueryCompiler3 {
    constructor(client2, builder2, formatter2) {
      super(client2, builder2, formatter2);
      const { onConflict } = this.single;
      if (onConflict) {
        throw new Error(".onConflict() is not supported for mssql.");
      }
      this._emptyInsertValue = "default values";
    }
    with() {
      const undoList = [];
      if (this.grouped.with) {
        for (const stmt of this.grouped.with) {
          if (stmt.recursive) {
            undoList.push(stmt);
            stmt.recursive = false;
          }
        }
      }
      const result = super.with();
      for (const stmt of undoList) {
        stmt.recursive = true;
      }
      return result;
    }
    select() {
      const sql = this.with();
      const statements = components2.map((component) => this[component](this));
      return sql + compact2(statements).join(" ");
    }
    //#region Insert
    // Compiles an "insert" query, allowing for multiple
    // inserts using a single query statement.
    insert() {
      if (this.single.options && this.single.options.includeTriggerModifications) {
        return this.insertWithTriggers();
      } else {
        return this.standardInsert();
      }
    }
    insertWithTriggers() {
      const insertValues = this.single.insert || [];
      const { returning } = this.single;
      let sql = this.with() + `${this._buildTempTable(returning)}insert into ${this.tableName} `;
      const returningSql = returning ? this._returning("insert", returning, true) + " " : "";
      if (Array.isArray(insertValues)) {
        if (insertValues.length === 0) {
          return "";
        }
      } else if (typeof insertValues === "object" && isEmpty2(insertValues)) {
        return {
          sql: sql + returningSql + this._emptyInsertValue + this._buildReturningSelect(returning),
          returning
        };
      }
      sql += this._buildInsertData(insertValues, returningSql);
      if (returning) {
        sql += this._buildReturningSelect(returning);
      }
      return {
        sql,
        returning
      };
    }
    _buildInsertData(insertValues, returningSql) {
      let sql = "";
      const insertData = this._prepInsert(insertValues);
      if (typeof insertData === "string") {
        sql += insertData;
      } else {
        if (insertData.columns.length) {
          sql += `(${this.formatter.columnize(insertData.columns)}`;
          sql += `) ${returningSql}values (` + this._buildInsertValues(insertData) + ")";
        } else if (insertValues.length === 1 && insertValues[0]) {
          sql += returningSql + this._emptyInsertValue;
        } else {
          return "";
        }
      }
      return sql;
    }
    standardInsert() {
      const insertValues = this.single.insert || [];
      let sql = this.with() + `insert into ${this.tableName} `;
      const { returning } = this.single;
      const returningSql = returning ? this._returning("insert", returning) + " " : "";
      if (Array.isArray(insertValues)) {
        if (insertValues.length === 0) {
          return "";
        }
      } else if (typeof insertValues === "object" && isEmpty2(insertValues)) {
        return {
          sql: sql + returningSql + this._emptyInsertValue,
          returning
        };
      }
      sql += this._buildInsertData(insertValues, returningSql);
      return {
        sql,
        returning
      };
    }
    //#endregion
    //#region Update
    // Compiles an `update` query, allowing for a return value.
    update() {
      if (this.single.options && this.single.options.includeTriggerModifications) {
        return this.updateWithTriggers();
      } else {
        return this.standardUpdate();
      }
    }
    updateWithTriggers() {
      const withSQL = this.with();
      const top = this.top();
      const updates = this._prepUpdate(this.single.update);
      const join = this.join();
      const where = this.where();
      const order = this.order();
      const { returning } = this.single;
      const declaredTemp = this._buildTempTable(returning);
      return {
        sql: withSQL + declaredTemp + `update ${top ? top + " " : ""}${this.tableName} set ` + updates.join(", ") + (returning ? ` ${this._returning("update", returning, true)}` : "") + (join ? ` from ${this.tableName} ${join}` : "") + (where ? ` ${where}` : "") + (order ? ` ${order}` : "") + (!returning ? this._returning("rowcount", "@@rowcount") : this._buildReturningSelect(returning)),
        returning: returning || "@@rowcount"
      };
    }
    _formatGroupsItemValue(value, nulls) {
      const column = super._formatGroupsItemValue(value);
      if (nulls && !(value instanceof Raw3)) {
        const collNulls = `IIF(${column} is null,`;
        if (nulls === "first") {
          return `${collNulls}0,1)`;
        } else if (nulls === "last") {
          return `${collNulls}1,0)`;
        }
      }
      return column;
    }
    standardUpdate() {
      const withSQL = this.with();
      const top = this.top();
      const updates = this._prepUpdate(this.single.update);
      const join = this.join();
      const where = this.where();
      const order = this.order();
      const { returning } = this.single;
      return {
        sql: withSQL + `update ${top ? top + " " : ""}${this.tableName} set ` + updates.join(", ") + (returning ? ` ${this._returning("update", returning)}` : "") + (join ? ` from ${this.tableName} ${join}` : "") + (where ? ` ${where}` : "") + (order ? ` ${order}` : "") + (!returning ? this._returning("rowcount", "@@rowcount") : ""),
        returning: returning || "@@rowcount"
      };
    }
    //#endregion
    //#region Delete
    // Compiles a `delete` query.
    del() {
      if (this.single.options && this.single.options.includeTriggerModifications) {
        return this.deleteWithTriggers();
      } else {
        return this.standardDelete();
      }
    }
    deleteWithTriggers() {
      const withSQL = this.with();
      const { tableName } = this;
      const joins = this.join();
      const wheres = this.where();
      const { returning } = this.single;
      const returningStr = returning ? ` ${this._returning("del", returning, true)}` : "";
      const deleteSelector = joins ? `${tableName}${returningStr} ` : "";
      return {
        sql: withSQL + `${this._buildTempTable(
          returning
        )}delete ${deleteSelector}from ${tableName}` + (!joins ? returningStr : "") + (joins ? ` ${joins}` : "") + (wheres ? ` ${wheres}` : "") + (!returning ? this._returning("rowcount", "@@rowcount") : this._buildReturningSelect(returning)),
        returning: returning || "@@rowcount"
      };
    }
    standardDelete() {
      const withSQL = this.with();
      const { tableName } = this;
      const joins = this.join();
      const wheres = this.where();
      const { returning } = this.single;
      const returningStr = returning ? ` ${this._returning("del", returning)}` : "";
      const deleteSelector = joins ? `${tableName}${returningStr} ` : "";
      return {
        sql: withSQL + `delete ${deleteSelector}from ${tableName}` + (!joins ? returningStr : "") + (joins ? ` ${joins}` : "") + (wheres ? ` ${wheres}` : "") + (!returning ? this._returning("rowcount", "@@rowcount") : ""),
        returning: returning || "@@rowcount"
      };
    }
    //#endregion
    // Compiles the columns in the query, specifying if an item was distinct.
    columns() {
      let distinctClause = "";
      if (this.onlyUnions()) return "";
      const top = this.top();
      const hints = this._hintComments();
      const columns = this.grouped.columns || [];
      let i = -1, sql = [];
      if (columns) {
        while (++i < columns.length) {
          const stmt = columns[i];
          if (stmt.distinct) distinctClause = "distinct ";
          if (stmt.distinctOn) {
            distinctClause = this.distinctOn(stmt.value);
            continue;
          }
          if (stmt.type === "aggregate") {
            sql.push(...this.aggregate(stmt));
          } else if (stmt.type === "aggregateRaw") {
            sql.push(this.aggregateRaw(stmt));
          } else if (stmt.type === "analytic") {
            sql.push(this.analytic(stmt));
          } else if (stmt.type === "json") {
            sql.push(this.json(stmt));
          } else if (stmt.value && stmt.value.length > 0) {
            sql.push(this.formatter.columnize(stmt.value));
          }
        }
      }
      if (sql.length === 0) sql = ["*"];
      const select = this.onlyJson() ? "" : "select ";
      return `${select}${hints}${distinctClause}` + (top ? top + " " : "") + sql.join(", ") + (this.tableName ? ` from ${this.tableName}` : "");
    }
    _returning(method, value, withTrigger) {
      switch (method) {
        case "update":
        case "insert":
          return value ? `output ${this.formatter.columnizeWithPrefix("inserted.", value)}${withTrigger ? " into #out" : ""}` : "";
        case "del":
          return value ? `output ${this.formatter.columnizeWithPrefix("deleted.", value)}${withTrigger ? " into #out" : ""}` : "";
        case "rowcount":
          return value ? ";select @@rowcount" : "";
      }
    }
    _buildTempTable(values2) {
      if (values2 && values2.length > 0) {
        let selections = "";
        if (Array.isArray(values2)) {
          selections = values2.map((value) => `[t].${this.formatter.columnize(value)}`).join(",");
        } else {
          selections = `[t].${this.formatter.columnize(values2)}`;
        }
        let sql = `select top(0) ${selections} into #out `;
        sql += `from ${this.tableName} as t `;
        sql += `left join ${this.tableName} on 0=1;`;
        return sql;
      }
      return "";
    }
    _buildReturningSelect(values2) {
      if (values2 && values2.length > 0) {
        let selections = "";
        if (Array.isArray(values2)) {
          selections = values2.map((value) => `${this.formatter.columnize(value)}`).join(",");
        } else {
          selections = this.formatter.columnize(values2);
        }
        let sql = `; select ${selections} from #out; `;
        sql += `drop table #out;`;
        return sql;
      }
      return "";
    }
    // Compiles a `truncate` query.
    truncate() {
      return `truncate table ${this.tableName}`;
    }
    forUpdate() {
      return "with (UPDLOCK)";
    }
    forShare() {
      return "with (HOLDLOCK)";
    }
    // Compiles a `columnInfo` query.
    columnInfo() {
      const column = this.single.columnInfo;
      let schema = this.single.schema;
      const table = this.client.customWrapIdentifier(this.single.table, identity2);
      if (schema) {
        schema = this.client.customWrapIdentifier(schema, identity2);
      }
      let sql = `select [COLUMN_NAME], [COLUMN_DEFAULT], [DATA_TYPE], [CHARACTER_MAXIMUM_LENGTH], [IS_NULLABLE] from INFORMATION_SCHEMA.COLUMNS where table_name = ? and table_catalog = ?`;
      const bindings2 = [table, this.client.database()];
      if (schema) {
        sql += " and table_schema = ?";
        bindings2.push(schema);
      } else {
        sql += ` and table_schema = 'dbo'`;
      }
      return {
        sql,
        bindings: bindings2,
        output(resp) {
          const out = resp.reduce((columns, val) => {
            columns[val[0].value] = {
              defaultValue: val[1].value,
              type: val[2].value,
              maxLength: val[3].value,
              nullable: val[4].value === "YES"
            };
            return columns;
          }, {});
          return column && out[column] || out;
        }
      };
    }
    top() {
      const noLimit = !this.single.limit && this.single.limit !== 0;
      const noOffset = !this.single.offset;
      if (noLimit || !noOffset) return "";
      return `top (${this._getValueOrParameterFromAttribute("limit")})`;
    }
    limit() {
      return "";
    }
    offset() {
      const noLimit = !this.single.limit && this.single.limit !== 0;
      const noOffset = !this.single.offset;
      if (noOffset) return "";
      let offset = `offset ${noOffset ? "0" : this._getValueOrParameterFromAttribute("offset")} rows`;
      if (!noLimit) {
        offset += ` fetch next ${this._getValueOrParameterFromAttribute(
          "limit"
        )} rows only`;
      }
      return offset;
    }
    whereLike(statement) {
      return `${this._columnClause(
        statement
      )} collate SQL_Latin1_General_CP1_CS_AS ${this._not(
        statement,
        "like "
      )}${this._valueClause(statement)}`;
    }
    whereILike(statement) {
      return `${this._columnClause(
        statement
      )} collate SQL_Latin1_General_CP1_CI_AS ${this._not(
        statement,
        "like "
      )}${this._valueClause(statement)}`;
    }
    jsonExtract(params) {
      return this._jsonExtract(
        params.singleValue ? "JSON_VALUE" : "JSON_QUERY",
        params
      );
    }
    jsonSet(params) {
      return this._jsonSet("JSON_MODIFY", params);
    }
    jsonInsert(params) {
      return this._jsonSet("JSON_MODIFY", params);
    }
    jsonRemove(params) {
      const jsonCol = `JSON_MODIFY(${columnize_2(
        params.column,
        this.builder,
        this.client,
        this.bindingsHolder
      )},${this.client.parameter(
        params.path,
        this.builder,
        this.bindingsHolder
      )}, NULL)`;
      return params.alias ? this.client.alias(jsonCol, this.formatter.wrap(params.alias)) : jsonCol;
    }
    whereJsonPath(statement) {
      return this._whereJsonPath("JSON_VALUE", statement);
    }
    whereJsonSupersetOf(statement) {
      throw new Error(
        "Json superset where clause not actually supported by MSSQL"
      );
    }
    whereJsonSubsetOf(statement) {
      throw new Error("Json subset where clause not actually supported by MSSQL");
    }
    _getExtracts(statement, operator2) {
      const column = columnize_2(
        statement.column,
        this.builder,
        this.client,
        this.bindingsHolder
      );
      return (Array.isArray(statement.values) ? statement.values : [statement.values]).map(function(value) {
        return "JSON_VALUE(" + column + "," + this.client.parameter(value, this.builder, this.bindingsHolder) + ")";
      }, this).join(operator2);
    }
    onJsonPathEquals(clause) {
      return this._onJsonPathEquals("JSON_VALUE", clause);
    }
  }
  mssqlQuerycompiler = QueryCompiler_MSSQL;
  return mssqlQuerycompiler;
}
var mssqlCompiler;
var hasRequiredMssqlCompiler;
function requireMssqlCompiler() {
  if (hasRequiredMssqlCompiler) return mssqlCompiler;
  hasRequiredMssqlCompiler = 1;
  const SchemaCompiler3 = compiler$1;
  class SchemaCompiler_MSSQL extends SchemaCompiler3 {
    constructor(client2, builder2) {
      super(client2, builder2);
    }
    dropTableIfExists(tableName) {
      const name = this.formatter.wrap(prefixedTableName2(this.schema, tableName));
      this.pushQuery(
        `if object_id('${name}', 'U') is not null DROP TABLE ${name}`
      );
    }
    dropViewIfExists(viewName) {
      const name = this.formatter.wrap(prefixedTableName2(this.schema, viewName));
      this.pushQuery(
        `if object_id('${name}', 'V') is not null DROP VIEW ${name}`
      );
    }
    // Rename a table on the schema.
    renameTable(tableName, to) {
      this.pushQuery(
        `exec sp_rename ${this.client.parameter(
          prefixedTableName2(this.schema, tableName),
          this.builder,
          this.bindingsHolder
        )}, ${this.client.parameter(to, this.builder, this.bindingsHolder)}`
      );
    }
    renameView(viewTable, to) {
      this.pushQuery(
        `exec sp_rename ${this.client.parameter(
          prefixedTableName2(this.schema, viewTable),
          this.builder,
          this.bindingsHolder
        )}, ${this.client.parameter(to, this.builder, this.bindingsHolder)}`
      );
    }
    // Check whether a table exists on the query.
    hasTable(tableName) {
      const formattedTable = this.client.parameter(
        prefixedTableName2(this.schema, tableName),
        this.builder,
        this.bindingsHolder
      );
      const bindings2 = [tableName];
      let sql = `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = ${formattedTable}`;
      if (this.schema) {
        sql += " AND TABLE_SCHEMA = ?";
        bindings2.push(this.schema);
      }
      this.pushQuery({ sql, bindings: bindings2, output: (resp) => resp.length > 0 });
    }
    // Check whether a column exists on the schema.
    hasColumn(tableName, column) {
      const formattedColumn = this.client.parameter(
        column,
        this.builder,
        this.bindingsHolder
      );
      const formattedTable = this.client.parameter(
        this.formatter.wrap(prefixedTableName2(this.schema, tableName)),
        this.builder,
        this.bindingsHolder
      );
      const sql = `select object_id from sys.columns where name = ${formattedColumn} and object_id = object_id(${formattedTable})`;
      this.pushQuery({ sql, output: (resp) => resp.length > 0 });
    }
  }
  SchemaCompiler_MSSQL.prototype.dropTablePrefix = "DROP TABLE ";
  function prefixedTableName2(prefix, table) {
    return prefix ? `${prefix}.${table}` : table;
  }
  mssqlCompiler = SchemaCompiler_MSSQL;
  return mssqlCompiler;
}
var mssqlTablecompiler;
var hasRequiredMssqlTablecompiler;
function requireMssqlTablecompiler() {
  if (hasRequiredMssqlTablecompiler) return mssqlTablecompiler;
  hasRequiredMssqlTablecompiler = 1;
  const TableCompiler3 = tablecompiler;
  const helpers2 = helpers$7;
  const { isObject: isObject2 } = is;
  class TableCompiler_MSSQL extends TableCompiler3 {
    constructor(client2, tableBuilder) {
      super(client2, tableBuilder);
    }
    createQuery(columns, ifNot, like) {
      let createStatement = ifNot ? `if object_id('${this.tableName()}', 'U') is null ` : "";
      if (like) {
        createStatement += `SELECT * INTO ${this.tableName()} FROM ${this.tableNameLike()} WHERE 0=1`;
      } else {
        createStatement += "CREATE TABLE " + this.tableName() + (this._formatting ? " (\n    " : " (") + columns.sql.join(this._formatting ? ",\n    " : ", ") + this._addChecks() + ")";
      }
      this.pushQuery(createStatement);
      if (this.single.comment) {
        this.comment(this.single.comment);
      }
      if (like) {
        this.addColumns(columns, this.addColumnsPrefix);
      }
    }
    comment(comment) {
      if (!comment) {
        return;
      }
      if (comment.length > 7500 / 2) {
        this.client.logger.warn(
          "Your comment might be longer than the max comment length for MSSQL of 7,500 bytes."
        );
      }
      const value = this.formatter.escapingStringDelimiters(comment);
      const level0name = this.formatter.escapingStringDelimiters(
        this.schemaNameRaw || "dbo"
      );
      const level1name = this.formatter.escapingStringDelimiters(
        this.tableNameRaw
      );
      const args = `N'MS_Description', N'${value}', N'Schema', N'${level0name}', N'Table', N'${level1name}'`;
      const isAlreadyDefined = `EXISTS(SELECT * FROM sys.fn_listextendedproperty(N'MS_Description', N'Schema', N'${level0name}', N'Table', N'${level1name}', NULL, NULL))`;
      this.pushQuery(
        `IF ${isAlreadyDefined}
  EXEC sys.sp_updateextendedproperty ${args}
ELSE
  EXEC sys.sp_addextendedproperty ${args}`
      );
    }
    // Compiles column add.  Multiple columns need only one ADD clause (not one ADD per column) so core addColumns doesn't work.  #1348
    addColumns(columns, prefix) {
      prefix = prefix || this.addColumnsPrefix;
      if (columns.sql.length > 0) {
        this.pushQuery({
          sql: (this.lowerCase ? "alter table " : "ALTER TABLE ") + this.tableName() + " " + prefix + columns.sql.join(", "),
          bindings: columns.bindings
        });
      }
    }
    alterColumns(columns, colBuilder) {
      for (let i = 0, l = colBuilder.length; i < l; i++) {
        const builder2 = colBuilder[i];
        if (builder2.modified.defaultTo) {
          const schema = this.schemaNameRaw || "dbo";
          const baseQuery = `
              DECLARE @constraint varchar(100) = (SELECT default_constraints.name
                                                  FROM sys.all_columns
                                                  INNER JOIN sys.tables
                                                    ON all_columns.object_id = tables.object_id
                                                  INNER JOIN sys.schemas
                                                    ON tables.schema_id = schemas.schema_id
                                                  INNER JOIN sys.default_constraints
                                                    ON all_columns.default_object_id = default_constraints.object_id
                                                  WHERE schemas.name = '${schema}'
                                                  AND tables.name = '${this.tableNameRaw}'
                                                  AND all_columns.name = '${builder2.getColumnName()}')

              IF @constraint IS NOT NULL EXEC('ALTER TABLE ${this.tableNameRaw} DROP CONSTRAINT ' + @constraint)`;
          this.pushQuery(baseQuery);
        }
      }
      columns.sql.forEach((sql) => {
        this.pushQuery({
          sql: (this.lowerCase ? "alter table " : "ALTER TABLE ") + this.tableName() + " " + (this.lowerCase ? this.alterColumnPrefix.toLowerCase() : this.alterColumnPrefix) + sql,
          bindings: columns.bindings
        });
      });
    }
    // Compiles column drop.  Multiple columns need only one DROP clause (not one DROP per column) so core dropColumn doesn't work.  #1348
    dropColumn() {
      const _this2 = this;
      const columns = helpers2.normalizeArr.apply(null, arguments);
      const columnsArray = Array.isArray(columns) ? columns : [columns];
      const drops = columnsArray.map((column) => _this2.formatter.wrap(column));
      const schema = this.schemaNameRaw || "dbo";
      for (const column of columns) {
        const baseQuery = `
              DECLARE @constraint varchar(100) = (SELECT default_constraints.name
                                                  FROM sys.all_columns
                                                  INNER JOIN sys.tables
                                                    ON all_columns.object_id = tables.object_id
                                                  INNER JOIN sys.schemas
                                                    ON tables.schema_id = schemas.schema_id
                                                  INNER JOIN sys.default_constraints
                                                    ON all_columns.default_object_id = default_constraints.object_id
                                                  WHERE schemas.name = '${schema}'
                                                  AND tables.name = '${this.tableNameRaw}'
                                                  AND all_columns.name = '${column}')

              IF @constraint IS NOT NULL EXEC('ALTER TABLE ${this.tableNameRaw} DROP CONSTRAINT ' + @constraint)`;
        this.pushQuery(baseQuery);
      }
      this.pushQuery(
        (this.lowerCase ? "alter table " : "ALTER TABLE ") + this.tableName() + " " + this.dropColumnPrefix + drops.join(", ")
      );
    }
    changeType() {
    }
    // Renames a column on the table.
    renameColumn(from, to) {
      this.pushQuery(
        `exec sp_rename ${this.client.parameter(
          this.tableName() + "." + from,
          this.tableBuilder,
          this.bindingsHolder
        )}, ${this.client.parameter(
          to,
          this.tableBuilder,
          this.bindingsHolder
        )}, 'COLUMN'`
      );
    }
    dropFKRefs(runner2, refs) {
      const formatter2 = this.client.formatter(this.tableBuilder);
      return Promise.all(
        refs.map(function(ref2) {
          const constraintName = formatter2.wrap(ref2.CONSTRAINT_NAME);
          const tableName = formatter2.wrap(ref2.TABLE_NAME);
          return runner2.query({
            sql: `ALTER TABLE ${tableName} DROP CONSTRAINT ${constraintName}`
          });
        })
      );
    }
    createFKRefs(runner2, refs) {
      const formatter2 = this.client.formatter(this.tableBuilder);
      return Promise.all(
        refs.map(function(ref2) {
          const tableName = formatter2.wrap(ref2.TABLE_NAME);
          const keyName = formatter2.wrap(ref2.CONSTRAINT_NAME);
          const column = formatter2.columnize(ref2.COLUMN_NAME);
          const references = formatter2.columnize(ref2.REFERENCED_COLUMN_NAME);
          const inTable = formatter2.wrap(ref2.REFERENCED_TABLE_NAME);
          const onUpdate = ` ON UPDATE ${ref2.UPDATE_RULE}`;
          const onDelete = ` ON DELETE ${ref2.DELETE_RULE}`;
          return runner2.query({
            sql: `ALTER TABLE ${tableName} ADD CONSTRAINT ${keyName} FOREIGN KEY (` + column + ") REFERENCES " + inTable + " (" + references + ")" + onUpdate + onDelete
          });
        })
      );
    }
    index(columns, indexName, options) {
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("index", this.tableNameRaw, columns);
      let predicate;
      if (isObject2(options)) {
        ({ predicate } = options);
      }
      const predicateQuery = predicate ? " " + this.client.queryCompiler(predicate).where() : "";
      this.pushQuery(
        `CREATE INDEX ${indexName} ON ${this.tableName()} (${this.formatter.columnize(
          columns
        )})${predicateQuery}`
      );
    }
    /**
     * Create a primary key.
     *
     * @param {undefined | string | string[]} columns
     * @param {string | {constraintName: string, deferrable?: 'not deferrable'|'deferred'|'immediate' }} constraintName
     */
    primary(columns, constraintName) {
      let deferrable;
      if (isObject2(constraintName)) {
        ({ constraintName, deferrable } = constraintName);
      }
      if (deferrable && deferrable !== "not deferrable") {
        this.client.logger.warn(
          `mssql: primary key constraint [${constraintName}] will not be deferrable ${deferrable} because mssql does not support deferred constraints.`
        );
      }
      constraintName = constraintName ? this.formatter.wrap(constraintName) : this.formatter.wrap(`${this.tableNameRaw}_pkey`);
      if (!this.forCreate) {
        this.pushQuery(
          `ALTER TABLE ${this.tableName()} ADD CONSTRAINT ${constraintName} PRIMARY KEY (${this.formatter.columnize(
            columns
          )})`
        );
      } else {
        this.pushQuery(
          `CONSTRAINT ${constraintName} PRIMARY KEY (${this.formatter.columnize(
            columns
          )})`
        );
      }
    }
    /**
     * Create a unique index.
     *
     * @param {string | string[]} columns
     * @param {string | {indexName: undefined | string, deferrable?: 'not deferrable'|'deferred'|'immediate', useConstraint?: true|false, predicate?: QueryBuilder }} indexName
     */
    unique(columns, indexName) {
      let deferrable;
      let useConstraint = false;
      let predicate;
      if (isObject2(indexName)) {
        ({ indexName, deferrable, useConstraint, predicate } = indexName);
      }
      if (deferrable && deferrable !== "not deferrable") {
        this.client.logger.warn(
          `mssql: unique index [${indexName}] will not be deferrable ${deferrable} because mssql does not support deferred constraints.`
        );
      }
      if (useConstraint && predicate) {
        throw new Error("mssql cannot create constraint with predicate");
      }
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("unique", this.tableNameRaw, columns);
      if (!Array.isArray(columns)) {
        columns = [columns];
      }
      if (useConstraint) {
        this.pushQuery(
          `ALTER TABLE ${this.tableName()} ADD CONSTRAINT ${indexName} UNIQUE (${this.formatter.columnize(
            columns
          )})`
        );
      } else {
        const predicateQuery = predicate ? " " + this.client.queryCompiler(predicate).where() : " WHERE " + columns.map((column) => this.formatter.columnize(column) + " IS NOT NULL").join(" AND ");
        this.pushQuery(
          `CREATE UNIQUE INDEX ${indexName} ON ${this.tableName()} (${this.formatter.columnize(
            columns
          )})${predicateQuery}`
        );
      }
    }
    // Compile a drop index command.
    dropIndex(columns, indexName) {
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("index", this.tableNameRaw, columns);
      this.pushQuery(`DROP INDEX ${indexName} ON ${this.tableName()}`);
    }
    // Compile a drop foreign key command.
    dropForeign(columns, indexName) {
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("foreign", this.tableNameRaw, columns);
      this.pushQuery(
        `ALTER TABLE ${this.tableName()} DROP CONSTRAINT ${indexName}`
      );
    }
    dropForeignIfExists() {
      throw new Error(".dropForeignIfExists is not supported for mssql.");
    }
    // Compile a drop primary key command.
    dropPrimary(constraintName) {
      constraintName = constraintName ? this.formatter.wrap(constraintName) : this.formatter.wrap(`${this.tableNameRaw}_pkey`);
      this.pushQuery(
        `ALTER TABLE ${this.tableName()} DROP CONSTRAINT ${constraintName}`
      );
    }
    dropPrimaryIfExists() {
      throw new Error(".dropPrimaryIfExists is not supported for mssql.");
    }
    // Compile a drop unique key command.
    dropUnique(column, indexName) {
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("unique", this.tableNameRaw, column);
      this.pushQuery(`DROP INDEX ${indexName} ON ${this.tableName()}`);
    }
    dropUniqueIfExists(column, indexName) {
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("unique", this.tableNameRaw, column);
      this.pushQuery(`DROP INDEX IF EXISTS ${indexName} ON ${this.tableName()}`);
    }
  }
  TableCompiler_MSSQL.prototype.createAlterTableMethods = ["foreign", "primary"];
  TableCompiler_MSSQL.prototype.lowerCase = false;
  TableCompiler_MSSQL.prototype.addColumnsPrefix = "ADD ";
  TableCompiler_MSSQL.prototype.dropColumnPrefix = "DROP COLUMN ";
  TableCompiler_MSSQL.prototype.alterColumnPrefix = "ALTER COLUMN ";
  mssqlTablecompiler = TableCompiler_MSSQL;
  return mssqlTablecompiler;
}
var mssqlViewcompiler;
var hasRequiredMssqlViewcompiler;
function requireMssqlViewcompiler() {
  if (hasRequiredMssqlViewcompiler) return mssqlViewcompiler;
  hasRequiredMssqlViewcompiler = 1;
  const ViewCompiler3 = viewcompiler;
  const {
    columnize: columnize_2
  } = wrappingFormatter;
  class ViewCompiler_MSSQL extends ViewCompiler3 {
    constructor(client2, viewCompiler) {
      super(client2, viewCompiler);
    }
    createQuery(columns, selectQuery, materialized, replace) {
      const createStatement = "CREATE " + (replace ? "OR ALTER " : "") + "VIEW ";
      let sql = createStatement + this.viewName();
      const columnList = columns ? " (" + columnize_2(
        columns,
        this.viewBuilder,
        this.client,
        this.bindingsHolder
      ) + ")" : "";
      sql += columnList;
      sql += " AS ";
      sql += selectQuery.toString();
      this.pushQuery({
        sql
      });
    }
    renameColumn(from, to) {
      this.pushQuery(
        `exec sp_rename ${this.client.parameter(
          this.viewName() + "." + from,
          this.viewBuilder,
          this.bindingsHolder
        )}, ${this.client.parameter(
          to,
          this.viewBuilder,
          this.bindingsHolder
        )}, 'COLUMN'`
      );
    }
    createOrReplace() {
      this.createQuery(this.columns, this.selectQuery, false, true);
    }
  }
  mssqlViewcompiler = ViewCompiler_MSSQL;
  return mssqlViewcompiler;
}
var mssqlColumncompiler;
var hasRequiredMssqlColumncompiler;
function requireMssqlColumncompiler() {
  if (hasRequiredMssqlColumncompiler) return mssqlColumncompiler;
  hasRequiredMssqlColumncompiler = 1;
  const ColumnCompiler3 = columncompiler;
  const { toNumber: toNumber2 } = helpers$7;
  const { formatDefault: formatDefault2 } = formatterUtils;
  const { operator: operator_2 } = wrappingFormatter;
  class ColumnCompiler_MSSQL extends ColumnCompiler3 {
    constructor(client2, tableCompiler, columnBuilder) {
      super(client2, tableCompiler, columnBuilder);
      this.modifiers = ["nullable", "defaultTo", "first", "after", "comment"];
      this._addCheckModifiers();
    }
    // Types
    // ------
    double(precision, scale) {
      return "float";
    }
    floating(precision, scale) {
      return `float`;
    }
    integer() {
      return "int";
    }
    tinyint() {
      return "tinyint";
    }
    varchar(length) {
      return `nvarchar(${toNumber2(length, 255)})`;
    }
    timestamp({ useTz = false } = {}) {
      return useTz ? "datetimeoffset" : "datetime2";
    }
    bit(length) {
      if (length > 1) {
        this.client.logger.warn("Bit field is exactly 1 bit length for MSSQL");
      }
      return "bit";
    }
    binary(length) {
      return length ? `varbinary(${toNumber2(length)})` : "varbinary(max)";
    }
    // Modifiers
    // ------
    first() {
      this.client.logger.warn("Column first modifier not available for MSSQL");
      return "";
    }
    after(column) {
      this.client.logger.warn("Column after modifier not available for MSSQL");
      return "";
    }
    defaultTo(value, { constraintName } = {}) {
      const formattedValue = formatDefault2(value, this.type, this.client);
      constraintName = typeof constraintName !== "undefined" ? constraintName : `${this.tableCompiler.tableNameRaw}_${this.getColumnName()}_default`.toLowerCase();
      if (this.columnBuilder._method === "alter") {
        this.pushAdditional(function() {
          this.pushQuery(
            `ALTER TABLE ${this.tableCompiler.tableName()} ADD CONSTRAINT ${this.formatter.wrap(
              constraintName
            )} DEFAULT ${formattedValue} FOR ${this.formatter.wrap(
              this.getColumnName()
            )}`
          );
        });
        return "";
      }
      if (!constraintName) {
        return `DEFAULT ${formattedValue}`;
      }
      return `CONSTRAINT ${this.formatter.wrap(
        constraintName
      )} DEFAULT ${formattedValue}`;
    }
    comment(comment) {
      if (!comment) {
        return;
      }
      if (comment && comment.length > 7500 / 2) {
        this.client.logger.warn(
          "Your comment might be longer than the max comment length for MSSQL of 7,500 bytes."
        );
      }
      const value = this.formatter.escapingStringDelimiters(comment);
      const level0name = this.tableCompiler.schemaNameRaw || "dbo";
      const level1name = this.formatter.escapingStringDelimiters(
        this.tableCompiler.tableNameRaw
      );
      const level2name = this.formatter.escapingStringDelimiters(
        this.args[0] || this.defaults("columnName")
      );
      const args = `N'MS_Description', N'${value}', N'Schema', N'${level0name}', N'Table', N'${level1name}', N'Column', N'${level2name}'`;
      this.pushAdditional(function() {
        const isAlreadyDefined = `EXISTS(SELECT * FROM sys.fn_listextendedproperty(N'MS_Description', N'Schema', N'${level0name}', N'Table', N'${level1name}', N'Column', N'${level2name}'))`;
        this.pushQuery(
          `IF ${isAlreadyDefined}
  EXEC sys.sp_updateextendedproperty ${args}
ELSE
  EXEC sys.sp_addextendedproperty ${args}`
        );
      });
      return "";
    }
    checkLength(operator2, length, constraintName) {
      return this._check(
        `LEN(${this.formatter.wrap(this.getColumnName())}) ${operator_2(
          operator2,
          this.columnBuilder,
          this.bindingsHolder
        )} ${toNumber2(length)}`,
        constraintName
      );
    }
    checkRegex(regex, constraintName) {
      return this._check(
        `${this.formatter.wrap(
          this.getColumnName()
        )} LIKE ${this.client._escapeBinding("%" + regex + "%")}`,
        constraintName
      );
    }
    increments(options = { primaryKey: true }) {
      return "int identity(1,1) not null" + (this.tableCompiler._canBeAddPrimaryKey(options) ? " primary key" : "");
    }
    bigincrements(options = { primaryKey: true }) {
      return "bigint identity(1,1) not null" + (this.tableCompiler._canBeAddPrimaryKey(options) ? " primary key" : "");
    }
  }
  ColumnCompiler_MSSQL.prototype.bigint = "bigint";
  ColumnCompiler_MSSQL.prototype.mediumint = "int";
  ColumnCompiler_MSSQL.prototype.smallint = "smallint";
  ColumnCompiler_MSSQL.prototype.text = "nvarchar(max)";
  ColumnCompiler_MSSQL.prototype.mediumtext = "nvarchar(max)";
  ColumnCompiler_MSSQL.prototype.longtext = "nvarchar(max)";
  ColumnCompiler_MSSQL.prototype.json = ColumnCompiler_MSSQL.prototype.jsonb = "nvarchar(max)";
  ColumnCompiler_MSSQL.prototype.enu = "nvarchar(100)";
  ColumnCompiler_MSSQL.prototype.uuid = ({ useBinaryUuid = false } = {}) => useBinaryUuid ? "binary(16)" : "uniqueidentifier";
  ColumnCompiler_MSSQL.prototype.datetime = "datetime2";
  ColumnCompiler_MSSQL.prototype.bool = "bit";
  mssqlColumncompiler = ColumnCompiler_MSSQL;
  return mssqlColumncompiler;
}
var mssql;
var hasRequiredMssql;
function requireMssql() {
  if (hasRequiredMssql) return mssql;
  hasRequiredMssql = 1;
  const map2 = map_1;
  const isNil = requireIsNil();
  const Client3 = client;
  const MSSQL_Formatter = requireMssqlFormatter();
  const Transaction3 = requireTransaction$5();
  const QueryCompiler3 = requireMssqlQuerycompiler();
  const SchemaCompiler3 = requireMssqlCompiler();
  const TableCompiler3 = requireMssqlTablecompiler();
  const ViewCompiler3 = requireMssqlViewcompiler();
  const ColumnCompiler3 = requireMssqlColumncompiler();
  const QueryBuilder2 = querybuilder;
  const { setHiddenProperty: setHiddenProperty2 } = security;
  const debug2 = srcExports("knex:mssql");
  const SQL_INT4 = { MIN: -2147483648, MAX: 2147483647 };
  const SQL_BIGINT_SAFE = { MIN: -9007199254740991, MAX: 9007199254740991 };
  class Client_MSSQL extends Client3 {
    constructor(config = {}) {
      super(config);
    }
    /**
     * @param {import('knex').Config} options
     */
    _generateConnection() {
      const settings = this.connectionSettings;
      settings.options = settings.options || {};
      const cfg = {
        authentication: {
          type: settings.type || "default",
          options: {
            userName: settings.userName || settings.user,
            password: settings.password,
            domain: settings.domain,
            token: settings.token,
            clientId: settings.clientId,
            clientSecret: settings.clientSecret,
            tenantId: settings.tenantId,
            msiEndpoint: settings.msiEndpoint,
            credential: settings.credential
          }
        },
        server: settings.server || settings.host,
        options: {
          database: settings.database,
          encrypt: settings.encrypt || false,
          port: settings.port || 1433,
          connectTimeout: settings.connectionTimeout || settings.timeout || 15e3,
          requestTimeout: !isNil(settings.requestTimeout) ? settings.requestTimeout : 15e3,
          rowCollectionOnDone: false,
          rowCollectionOnRequestCompletion: false,
          useColumnNames: false,
          tdsVersion: settings.options.tdsVersion || "7_4",
          appName: settings.options.appName || "knex",
          trustServerCertificate: false,
          ...settings.options
        }
      };
      if (cfg.authentication.options.password) {
        setHiddenProperty2(cfg.authentication.options);
      }
      if (cfg.options.instanceName) delete cfg.options.port;
      if (isNaN(cfg.options.requestTimeout)) cfg.options.requestTimeout = 15e3;
      if (cfg.options.requestTimeout === Infinity) cfg.options.requestTimeout = 0;
      if (cfg.options.requestTimeout < 0) cfg.options.requestTimeout = 0;
      if (settings.debug) {
        cfg.options.debug = {
          packet: true,
          token: true,
          data: true,
          payload: true
        };
      }
      return cfg;
    }
    _driver() {
      const tds = require$$13;
      return tds;
    }
    formatter() {
      return new MSSQL_Formatter(this, ...arguments);
    }
    transaction() {
      return new Transaction3(this, ...arguments);
    }
    queryCompiler() {
      return new QueryCompiler3(this, ...arguments);
    }
    schemaCompiler() {
      return new SchemaCompiler3(this, ...arguments);
    }
    tableCompiler() {
      return new TableCompiler3(this, ...arguments);
    }
    viewCompiler() {
      return new ViewCompiler3(this, ...arguments);
    }
    queryBuilder() {
      const b = new QueryBuilder2(this);
      return b;
    }
    columnCompiler() {
      return new ColumnCompiler3(this, ...arguments);
    }
    wrapIdentifierImpl(value) {
      if (value === "*") {
        return "*";
      }
      return `[${value.replace(/[[\]]+/g, "")}]`;
    }
    // Get a raw connection, called by the `pool` whenever a new
    // connection needs to be added to the pool.
    acquireRawConnection() {
      return new Promise((resolver, rejecter) => {
        debug2("connection::connection new connection requested");
        const Driver = this._driver();
        const settings = Object.assign({}, this._generateConnection());
        const connection = new Driver.Connection(settings);
        connection.connect((err) => {
          if (err) {
            debug2("connection::connect error: %s", err.message);
            return rejecter(err);
          }
          debug2("connection::connect connected to server");
          connection.connected = true;
          connection.on("error", (e) => {
            debug2("connection::error message=%s", e.message);
            connection.__knex__disposed = e;
            connection.connected = false;
          });
          connection.once("end", () => {
            connection.connected = false;
            connection.__knex__disposed = "Connection to server was terminated.";
            debug2("connection::end connection ended.");
          });
          return resolver(connection);
        });
      });
    }
    validateConnection(connection) {
      return connection && connection.connected;
    }
    // Used to explicitly close a connection, called internally by the pool
    // when a connection times out or the pool is shutdown.
    destroyRawConnection(connection) {
      debug2("connection::destroy");
      return new Promise((resolve) => {
        connection.once("end", () => {
          resolve();
        });
        connection.close();
      });
    }
    // Position the bindings for the query.
    positionBindings(sql) {
      let questionCount = -1;
      return sql.replace(/\\?\?/g, (match) => {
        if (match === "\\?") {
          return "?";
        }
        questionCount += 1;
        return `@p${questionCount}`;
      });
    }
    _chomp(connection) {
      if (connection.state.name === "LoggedIn") {
        const nextRequest = this.requestQueue.pop();
        if (nextRequest) {
          debug2(
            "connection::query executing query, %d more in queue",
            this.requestQueue.length
          );
          connection.execSql(nextRequest);
        }
      }
    }
    _enqueueRequest(request, connection) {
      this.requestQueue.push(request);
      this._chomp(connection);
    }
    _makeRequest(query, callback) {
      const Driver = this._driver();
      const sql = typeof query === "string" ? query : query.sql;
      let rowCount = 0;
      if (!sql) throw new Error("The query is empty");
      debug2("request::request sql=%s", sql);
      const request = new Driver.Request(sql, (err, remoteRowCount) => {
        if (err) {
          debug2("request::error message=%s", err.message);
          return callback(err);
        }
        rowCount = remoteRowCount;
        debug2("request::callback rowCount=%d", rowCount);
      });
      request.on("prepared", () => {
        debug2("request %s::request prepared", this.id);
      });
      request.on("done", (rowCount2, more) => {
        debug2("request::done rowCount=%d more=%s", rowCount2, more);
      });
      request.on("doneProc", (rowCount2, more) => {
        debug2(
          "request::doneProc id=%s rowCount=%d more=%s",
          request.id,
          rowCount2,
          more
        );
      });
      request.on("doneInProc", (rowCount2, more) => {
        debug2(
          "request::doneInProc id=%s rowCount=%d more=%s",
          request.id,
          rowCount2,
          more
        );
      });
      request.once("requestCompleted", () => {
        debug2("request::completed id=%s", request.id);
        return callback(null, rowCount);
      });
      request.on("error", (err) => {
        debug2("request::error id=%s message=%s", request.id, err.message);
        return callback(err);
      });
      return request;
    }
    // Grab a connection, run the query via the MSSQL streaming interface,
    // and pass that through to the stream we've sent back to the client.
    _stream(connection, query, stream) {
      return new Promise((resolve, reject2) => {
        const request = this._makeRequest(query, (err) => {
          if (err) {
            stream.emit("error", err);
            return reject2(err);
          }
          resolve();
        });
        request.on("row", (row) => {
          stream.write(
            row.reduce((prev, curr) => {
              prev[curr.metadata.colName] = curr.value;
              return prev;
            }, {})
          );
        });
        request.on("error", (err) => {
          stream.emit("error", err);
          reject2(err);
        });
        request.once("requestCompleted", () => {
          stream.end();
          resolve();
        });
        this._assignBindings(request, query.bindings);
        this._enqueueRequest(request, connection);
      });
    }
    _assignBindings(request, bindings2) {
      if (Array.isArray(bindings2)) {
        for (let i = 0; i < bindings2.length; i++) {
          const binding = bindings2[i];
          this._setReqInput(request, i, binding);
        }
      }
    }
    _scaleForBinding(binding) {
      if (binding % 1 === 0) {
        throw new Error(`The binding value ${binding} must be a decimal number.`);
      }
      return { scale: 10 };
    }
    _typeForBinding(binding) {
      const Driver = this._driver();
      if (this.connectionSettings.options && this.connectionSettings.options.mapBinding) {
        const result = this.connectionSettings.options.mapBinding(binding);
        if (result) {
          return [result.value, result.type];
        }
      }
      switch (typeof binding) {
        case "string":
          return [binding, Driver.TYPES.NVarChar];
        case "boolean":
          return [binding, Driver.TYPES.Bit];
        case "number": {
          if (binding % 1 !== 0) {
            return [binding, Driver.TYPES.Float];
          }
          if (binding < SQL_INT4.MIN || binding > SQL_INT4.MAX) {
            if (binding < SQL_BIGINT_SAFE.MIN || binding > SQL_BIGINT_SAFE.MAX) {
              throw new Error(
                `Bigint must be safe integer or must be passed as string, saw ${binding}`
              );
            }
            return [binding, Driver.TYPES.BigInt];
          }
          return [binding, Driver.TYPES.Int];
        }
        default: {
          if (binding instanceof Date) {
            return [binding, Driver.TYPES.DateTime];
          }
          if (binding instanceof Buffer) {
            return [binding, Driver.TYPES.VarBinary];
          }
          return [binding, Driver.TYPES.NVarChar];
        }
      }
    }
    // Runs the query on the specified connection, providing the bindings
    // and any other necessary prep work.
    _query(connection, query) {
      return new Promise((resolve, reject2) => {
        const rows = [];
        const request = this._makeRequest(query, (err, count) => {
          if (err) {
            return reject2(err);
          }
          query.response = rows;
          process.nextTick(() => this._chomp(connection));
          resolve(query);
        });
        request.on("row", (row) => {
          debug2("request::row");
          rows.push(row);
        });
        this._assignBindings(request, query.bindings);
        this._enqueueRequest(request, connection);
      });
    }
    // sets a request input parameter. Detects bigints and decimals and sets type appropriately.
    _setReqInput(req, i, inputBinding) {
      const [binding, tediousType] = this._typeForBinding(inputBinding);
      const bindingName = "p".concat(i);
      let options;
      if (typeof binding === "number" && binding % 1 !== 0) {
        options = this._scaleForBinding(binding);
      }
      debug2(
        "request::binding pos=%d type=%s value=%s",
        i,
        tediousType.name,
        binding
      );
      if (Buffer.isBuffer(binding)) {
        options = {
          length: "max"
        };
      }
      req.addParameter(bindingName, tediousType, binding, options);
    }
    // Process the response as returned from the query.
    processResponse(query, runner2) {
      if (query == null) return;
      let { response } = query;
      const { method } = query;
      if (query.output) {
        return query.output.call(runner2, response);
      }
      response = response.map(
        (row) => row.reduce((columns, r) => {
          const colName = r.metadata.colName;
          if (columns[colName]) {
            if (!Array.isArray(columns[colName])) {
              columns[colName] = [columns[colName]];
            }
            columns[colName].push(r.value);
          } else {
            columns[colName] = r.value;
          }
          return columns;
        }, {})
      );
      if (query.output) return query.output.call(runner2, response);
      switch (method) {
        case "select":
          return response;
        case "first":
          return response[0];
        case "pluck":
          return map2(response, query.pluck);
        case "insert":
        case "del":
        case "update":
        case "counter":
          if (query.returning) {
            if (query.returning === "@@rowcount") {
              return response[0][""];
            }
          }
          return response;
        default:
          return response;
      }
    }
  }
  Object.assign(Client_MSSQL.prototype, {
    requestQueue: [],
    dialect: "mssql",
    driverName: "mssql",
    _packageName: "tedious"
  });
  mssql = Client_MSSQL;
  return mssql;
}
var _baseDelay;
var hasRequired_baseDelay;
function require_baseDelay() {
  if (hasRequired_baseDelay) return _baseDelay;
  hasRequired_baseDelay = 1;
  var FUNC_ERROR_TEXT2 = "Expected a function";
  function baseDelay(func, wait, args) {
    if (typeof func != "function") {
      throw new TypeError(FUNC_ERROR_TEXT2);
    }
    return setTimeout(function() {
      func.apply(void 0, args);
    }, wait);
  }
  _baseDelay = baseDelay;
  return _baseDelay;
}
var defer_1;
var hasRequiredDefer;
function requireDefer() {
  if (hasRequiredDefer) return defer_1;
  hasRequiredDefer = 1;
  var baseDelay = require_baseDelay(), baseRest2 = _baseRest;
  var defer2 = baseRest2(function(func, args) {
    return baseDelay(func, 1, args);
  });
  defer_1 = defer2;
  return defer_1;
}
var transaction$4;
var hasRequiredTransaction$4;
function requireTransaction$4() {
  if (hasRequiredTransaction$4) return transaction$4;
  hasRequiredTransaction$4 = 1;
  const Transaction3 = transaction$6;
  const Debug2 = srcExports;
  const debug2 = Debug2("knex:tx");
  class Transaction_MySQL extends Transaction3 {
    query(conn, sql, status, value) {
      const t = this;
      const q = this.trxClient.query(conn, sql).catch((err) => {
        if (err.errno === 1305) {
          this.trxClient.logger.warn(
            "Transaction was implicitly committed, do not mix transactions and DDL with MySQL (#805)"
          );
          return;
        }
        status = 2;
        value = err;
        t._completed = true;
        debug2("%s error running transaction query", t.txid);
      }).then(function(res) {
        if (status === 1) t._resolver(value);
        if (status === 2) {
          if (value === void 0) {
            if (t.doNotRejectOnRollback && /^ROLLBACK\b/i.test(sql)) {
              t._resolver();
              return;
            }
            value = new Error(`Transaction rejected with non-error: ${value}`);
          }
          t._rejecter(value);
        }
        return res;
      });
      if (status === 1 || status === 2) {
        t._completed = true;
      }
      return q;
    }
  }
  transaction$4 = Transaction_MySQL;
  return transaction$4;
}
var mysqlQuerybuilder;
var hasRequiredMysqlQuerybuilder;
function requireMysqlQuerybuilder() {
  if (hasRequiredMysqlQuerybuilder) return mysqlQuerybuilder;
  hasRequiredMysqlQuerybuilder = 1;
  const QueryBuilder2 = querybuilder;
  const isEmpty2 = isEmpty_1;
  mysqlQuerybuilder = class QueryBuilder_MySQL extends QueryBuilder2 {
    upsert(values2, returning, options) {
      this._method = "upsert";
      if (!isEmpty2(returning)) {
        this.returning(returning, options);
      }
      this._single.upsert = values2;
      return this;
    }
  };
  return mysqlQuerybuilder;
}
var mysqlQuerycompiler;
var hasRequiredMysqlQuerycompiler;
function requireMysqlQuerycompiler() {
  if (hasRequiredMysqlQuerycompiler) return mysqlQuerycompiler;
  hasRequiredMysqlQuerycompiler = 1;
  const assert2 = require$$0$4;
  const identity2 = identity_1;
  const isPlainObject2 = isPlainObject_1;
  const isEmpty2 = isEmpty_1;
  const QueryCompiler3 = querycompiler;
  const { wrapAsIdentifier: wrapAsIdentifier2 } = formatterUtils;
  const {
    columnize: columnize_2,
    wrap: wrap_2
  } = wrappingFormatter;
  const isPlainObjectOrArray = (value) => isPlainObject2(value) || Array.isArray(value);
  class QueryCompiler_MySQL extends QueryCompiler3 {
    constructor(client2, builder2, formatter2) {
      super(client2, builder2, formatter2);
      this._returningCheck();
      this._emptyInsertValue = "() values ()";
    }
    // Compiles a `delete` query, allowing comments and LIMIT.
    del() {
      const sql = super.del();
      if (sql === "") return sql;
      const comments = this.comments();
      const limit = this.limit();
      return (comments === "" ? "" : comments + " ") + sql + (limit ? ` ${limit}` : "");
    }
    // Compiles an `insert` query, allowing for multiple
    // inserts using a single query statement.
    insert() {
      let sql = super.insert();
      if (sql === "") return sql;
      const comments = this.comments();
      sql = (comments === "" ? "" : comments + " ") + sql;
      const { ignore, merge: merge2, insert } = this.single;
      if (ignore) sql = sql.replace("insert into", "insert ignore into");
      if (merge2) {
        sql += this._merge(merge2.updates, insert);
        const wheres = this.where();
        if (wheres) {
          throw new Error(
            ".onConflict().merge().where() is not supported for mysql"
          );
        }
      }
      return sql;
    }
    upsert() {
      const upsertValues = this.single.upsert || [];
      const sql = this.with() + `replace into ${this.tableName} `;
      const body = this._insertBody(upsertValues);
      return body === "" ? "" : sql + body;
    }
    // Compiles merge for onConflict, allowing for different merge strategies
    _merge(updates, insert) {
      const sql = " on duplicate key update ";
      if (updates && Array.isArray(updates)) {
        return sql + updates.map(
          (column) => wrapAsIdentifier2(column, this.formatter.builder, this.client)
        ).map((column) => `${column} = values(${column})`).join(", ");
      } else if (updates && typeof updates === "object") {
        const updateData = this._prepUpdate(updates);
        return sql + updateData.join(",");
      } else {
        const insertData = this._prepInsert(insert);
        if (typeof insertData === "string") {
          throw new Error(
            "If using merge with a raw insert query, then updates must be provided"
          );
        }
        return sql + insertData.columns.map((column) => wrapAsIdentifier2(column, this.builder, this.client)).map((column) => `${column} = values(${column})`).join(", ");
      }
    }
    // Update method, including joins, wheres, order & limits.
    update() {
      const comments = this.comments();
      const withSQL = this.with();
      const join = this.join();
      const updates = this._prepUpdate(this.single.update);
      const where = this.where();
      const order = this.order();
      const limit = this.limit();
      return (comments === "" ? "" : comments + " ") + withSQL + `update ${this.tableName}` + (join ? ` ${join}` : "") + " set " + updates.join(", ") + (where ? ` ${where}` : "") + (order ? ` ${order}` : "") + (limit ? ` ${limit}` : "");
    }
    forUpdate() {
      return "for update";
    }
    forShare() {
      return "lock in share mode";
    }
    // Only supported on MySQL 8.0+
    skipLocked() {
      return "skip locked";
    }
    // Supported on MySQL 8.0+ and MariaDB 10.3.0+
    noWait() {
      return "nowait";
    }
    // Compiles a `columnInfo` query.
    columnInfo() {
      const column = this.single.columnInfo;
      const table = this.client.customWrapIdentifier(this.single.table, identity2);
      return {
        sql: "select * from information_schema.columns where table_name = ? and table_schema = ?",
        bindings: [table, this.client.database()],
        output(resp) {
          const out = resp.reduce(function(columns, val) {
            columns[val.COLUMN_NAME] = {
              defaultValue: val.COLUMN_DEFAULT === "NULL" ? null : val.COLUMN_DEFAULT,
              type: val.DATA_TYPE,
              maxLength: val.CHARACTER_MAXIMUM_LENGTH,
              nullable: val.IS_NULLABLE === "YES"
            };
            return columns;
          }, {});
          return column && out[column] || out;
        }
      };
    }
    limit() {
      const noLimit = !this.single.limit && this.single.limit !== 0;
      if (noLimit && !this.single.offset) return "";
      const limit = this.single.offset && noLimit ? "18446744073709551615" : this._getValueOrParameterFromAttribute("limit");
      return `limit ${limit}`;
    }
    whereBasic(statement) {
      assert2(
        !isPlainObjectOrArray(statement.value),
        "The values in where clause must not be object or array."
      );
      return super.whereBasic(statement);
    }
    whereRaw(statement) {
      assert2(
        isEmpty2(statement.value.bindings) || !Object.values(statement.value.bindings).some(isPlainObjectOrArray),
        "The values in where clause must not be object or array."
      );
      return super.whereRaw(statement);
    }
    whereLike(statement) {
      return `${this._columnClause(statement)} ${this._not(
        statement,
        "like "
      )}${this._valueClause(statement)} COLLATE utf8_bin`;
    }
    whereILike(statement) {
      return `${this._columnClause(statement)} ${this._not(
        statement,
        "like "
      )}${this._valueClause(statement)}`;
    }
    // Json functions
    jsonExtract(params) {
      return this._jsonExtract(["json_extract", "json_unquote"], params);
    }
    jsonSet(params) {
      return this._jsonSet("json_set", params);
    }
    jsonInsert(params) {
      return this._jsonSet("json_insert", params);
    }
    jsonRemove(params) {
      const jsonCol = `json_remove(${columnize_2(
        params.column,
        this.builder,
        this.client,
        this.bindingsHolder
      )},${this.client.parameter(
        params.path,
        this.builder,
        this.bindingsHolder
      )})`;
      return params.alias ? this.client.alias(jsonCol, this.formatter.wrap(params.alias)) : jsonCol;
    }
    whereJsonObject(statement) {
      return this._not(
        statement,
        `json_contains(${this._columnClause(statement)}, ${this._jsonValueClause(
          statement
        )})`
      );
    }
    whereJsonPath(statement) {
      return this._whereJsonPath("json_extract", statement);
    }
    whereJsonSupersetOf(statement) {
      return this._not(
        statement,
        `json_contains(${wrap_2(
          statement.column,
          void 0,
          this.builder,
          this.client,
          this.bindingsHolder
        )},${this._jsonValueClause(statement)})`
      );
    }
    whereJsonSubsetOf(statement) {
      return this._not(
        statement,
        `json_contains(${this._jsonValueClause(statement)},${wrap_2(
          statement.column,
          void 0,
          this.builder,
          this.client,
          this.bindingsHolder
        )})`
      );
    }
    onJsonPathEquals(clause) {
      return this._onJsonPathEquals("json_extract", clause);
    }
    _returningCheck() {
      const { returning } = this.single;
      if (returning) {
        this.client.logger.warn(
          ".returning() is not supported by mysql and will not have any effect."
        );
      }
    }
  }
  QueryCompiler_MySQL.prototype.invalidClauses = {
    delete: ["having"],
    truncate: ["where", "having", "limit"]
  };
  mysqlQuerycompiler = QueryCompiler_MySQL;
  return mysqlQuerycompiler;
}
var mysqlCompiler;
var hasRequiredMysqlCompiler;
function requireMysqlCompiler() {
  if (hasRequiredMysqlCompiler) return mysqlCompiler;
  hasRequiredMysqlCompiler = 1;
  const SchemaCompiler3 = compiler$1;
  class SchemaCompiler_MySQL extends SchemaCompiler3 {
    constructor(client2, builder2) {
      super(client2, builder2);
    }
    // Rename a table on the schema.
    renameTable(tableName, to) {
      this.pushQuery(
        `rename table ${this.formatter.wrap(tableName)} to ${this.formatter.wrap(
          to
        )}`
      );
    }
    renameView(from, to) {
      this.renameTable(from, to);
    }
    // Check whether a table exists on the query.
    hasTable(tableName) {
      let sql = "select * from information_schema.tables where table_name = ?";
      const bindings2 = [tableName];
      if (this.schema) {
        sql += " and table_schema = ?";
        bindings2.push(this.schema);
      } else {
        sql += " and table_schema = database()";
      }
      this.pushQuery({
        sql,
        bindings: bindings2,
        output: function output(resp) {
          return resp.length > 0;
        }
      });
    }
    // Check whether a column exists on the schema.
    hasColumn(tableName, column) {
      this.pushQuery({
        sql: `show columns from ${this.formatter.wrap(tableName)}`,
        output(resp) {
          return resp.some((row) => {
            return this.client.wrapIdentifier(row.Field.toLowerCase()) === this.client.wrapIdentifier(column.toLowerCase());
          });
        }
      });
    }
  }
  mysqlCompiler = SchemaCompiler_MySQL;
  return mysqlCompiler;
}
var mysqlTablecompiler;
var hasRequiredMysqlTablecompiler;
function requireMysqlTablecompiler() {
  if (hasRequiredMysqlTablecompiler) return mysqlTablecompiler;
  hasRequiredMysqlTablecompiler = 1;
  const TableCompiler3 = tablecompiler;
  const { isObject: isObject2, isString: isString2 } = is;
  class TableCompiler_MySQL extends TableCompiler3 {
    constructor(client2, tableBuilder) {
      super(client2, tableBuilder);
    }
    createQuery(columns, ifNot, like) {
      const createStatement = ifNot ? "create table if not exists " : "create table ";
      const { client: client2 } = this;
      let conn = {};
      let columnsSql = " (" + columns.sql.join(", ");
      columnsSql += this.primaryKeys() || "";
      columnsSql += this._addChecks();
      columnsSql += ")";
      let sql = createStatement + this.tableName() + (like && this.tableNameLike() ? " like " + this.tableNameLike() : columnsSql);
      if (client2.connectionSettings) {
        conn = client2.connectionSettings;
      }
      const charset = this.single.charset || conn.charset || "";
      const collation = this.single.collate || conn.collate || "";
      const engine = this.single.engine || "";
      if (charset && !like) sql += ` default character set ${charset}`;
      if (collation) sql += ` collate ${collation}`;
      if (engine) sql += ` engine = ${engine}`;
      if (this.single.comment) {
        const comment = this.single.comment || "";
        const MAX_COMMENT_LENGTH = 1024;
        if (comment.length > MAX_COMMENT_LENGTH)
          this.client.logger.warn(
            `The max length for a table comment is ${MAX_COMMENT_LENGTH} characters`
          );
        sql += ` comment = '${comment}'`;
      }
      this.pushQuery(sql);
      if (like) {
        this.addColumns(columns, this.addColumnsPrefix);
      }
    }
    // Compiles the comment on the table.
    comment(comment) {
      this.pushQuery(`alter table ${this.tableName()} comment = '${comment}'`);
    }
    changeType() {
    }
    // Renames a column on the table.
    renameColumn(from, to) {
      const compiler2 = this;
      const table = this.tableName();
      const wrapped = this.formatter.wrap(from) + " " + this.formatter.wrap(to);
      this.pushQuery({
        sql: `show full fields from ${table} where field = ` + this.client.parameter(from, this.tableBuilder, this.bindingsHolder),
        output(resp) {
          const column = resp[0];
          const runner2 = this;
          return compiler2.getFKRefs(runner2).then(
            ([refs]) => new Promise((resolve, reject2) => {
              try {
                if (!refs.length) {
                  resolve();
                }
                resolve(compiler2.dropFKRefs(runner2, refs));
              } catch (e) {
                reject2(e);
              }
            }).then(function() {
              let sql = `alter table ${table} change ${wrapped} ${column.Type}`;
              if (String(column.Null).toUpperCase() !== "YES") {
                sql += ` NOT NULL`;
              } else {
                sql += ` NULL`;
              }
              if (column.Default !== void 0 && column.Default !== null) {
                sql += ` DEFAULT '${column.Default}'`;
              }
              if (column.Collation !== void 0 && column.Collation !== null) {
                sql += ` COLLATE '${column.Collation}'`;
              }
              if (column.Extra == "auto_increment") {
                sql += ` AUTO_INCREMENT`;
              }
              return runner2.query({
                sql
              });
            }).then(function() {
              if (!refs.length) {
                return;
              }
              return compiler2.createFKRefs(
                runner2,
                refs.map(function(ref2) {
                  const refColKey = ref2.REFERENCED_COLUMN_NAME !== void 0 ? "REFERENCED_COLUMN_NAME" : "referenced_column_name";
                  const colKey = ref2.COLUMN_NAME !== void 0 ? "COLUMN_NAME" : "column_name";
                  if (ref2[refColKey] === from) {
                    ref2[refColKey] = to;
                  }
                  if (ref2[colKey] === from) {
                    ref2[colKey] = to;
                  }
                  return ref2;
                })
              );
            })
          );
        }
      });
    }
    primaryKeys() {
      const pks = (this.grouped.alterTable || []).filter(
        (k) => k.method === "primary"
      );
      if (pks.length > 0 && pks[0].args.length > 0) {
        const columns = pks[0].args[0];
        let constraintName = pks[0].args[1] || "";
        if (constraintName) {
          constraintName = " constraint " + this.formatter.wrap(constraintName);
        }
        if (this.grouped.columns) {
          const incrementsCols = this._getIncrementsColumnNames();
          if (incrementsCols.length) {
            incrementsCols.forEach((c) => {
              if (!columns.includes(c)) {
                columns.unshift(c);
              }
            });
          }
          const bigIncrementsCols = this._getBigIncrementsColumnNames();
          if (bigIncrementsCols.length) {
            bigIncrementsCols.forEach((c) => {
              if (!columns.includes(c)) {
                columns.unshift(c);
              }
            });
          }
        }
        return `,${constraintName} primary key (${this.formatter.columnize(
          columns
        )})`;
      }
    }
    getFKRefs(runner2) {
      const bindingsHolder = {
        bindings: []
      };
      const sql = "SELECT KCU.CONSTRAINT_NAME, KCU.TABLE_NAME, KCU.COLUMN_NAME,        KCU.REFERENCED_TABLE_NAME, KCU.REFERENCED_COLUMN_NAME,        RC.UPDATE_RULE, RC.DELETE_RULE FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS KCU JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS AS RC        USING(CONSTRAINT_NAME) WHERE KCU.REFERENCED_TABLE_NAME = " + this.client.parameter(
        this.tableNameRaw,
        this.tableBuilder,
        bindingsHolder
      ) + "   AND KCU.CONSTRAINT_SCHEMA = " + this.client.parameter(
        this.client.database(),
        this.tableBuilder,
        bindingsHolder
      ) + "   AND RC.CONSTRAINT_SCHEMA = " + this.client.parameter(
        this.client.database(),
        this.tableBuilder,
        bindingsHolder
      );
      return runner2.query({
        sql,
        bindings: bindingsHolder.bindings
      });
    }
    dropFKRefs(runner2, refs) {
      const formatter2 = this.client.formatter(this.tableBuilder);
      return Promise.all(
        refs.map(function(ref2) {
          const constraintName = formatter2.wrap(
            ref2.CONSTRAINT_NAME || ref2.constraint_name
          );
          const tableName = formatter2.wrap(ref2.TABLE_NAME || ref2.table_name);
          return runner2.query({
            sql: `alter table ${tableName} drop foreign key ${constraintName}`
          });
        })
      );
    }
    createFKRefs(runner2, refs) {
      const formatter2 = this.client.formatter(this.tableBuilder);
      return Promise.all(
        refs.map(function(ref2) {
          const tableName = formatter2.wrap(ref2.TABLE_NAME || ref2.table_name);
          const keyName = formatter2.wrap(
            ref2.CONSTRAINT_NAME || ref2.constraint_name
          );
          const column = formatter2.columnize(ref2.COLUMN_NAME || ref2.column_name);
          const references = formatter2.columnize(
            ref2.REFERENCED_COLUMN_NAME || ref2.referenced_column_name
          );
          const inTable = formatter2.wrap(
            ref2.REFERENCED_TABLE_NAME || ref2.referenced_table_name
          );
          const onUpdate = ` ON UPDATE ${ref2.UPDATE_RULE || ref2.update_rule}`;
          const onDelete = ` ON DELETE ${ref2.DELETE_RULE || ref2.delete_rule}`;
          return runner2.query({
            sql: `alter table ${tableName} add constraint ${keyName} foreign key (` + column + ") references " + inTable + " (" + references + ")" + onUpdate + onDelete
          });
        })
      );
    }
    index(columns, indexName, options) {
      let storageEngineIndexType;
      let indexType;
      if (isString2(options)) {
        indexType = options;
      } else if (isObject2(options)) {
        ({ indexType, storageEngineIndexType } = options);
      }
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("index", this.tableNameRaw, columns);
      storageEngineIndexType = storageEngineIndexType ? ` using ${storageEngineIndexType}` : "";
      this.pushQuery(
        `alter table ${this.tableName()} add${indexType ? ` ${indexType}` : ""} index ${indexName}(${this.formatter.columnize(
          columns
        )})${storageEngineIndexType}`
      );
    }
    primary(columns, constraintName) {
      let deferrable;
      if (isObject2(constraintName)) {
        ({ constraintName, deferrable } = constraintName);
      }
      if (deferrable && deferrable !== "not deferrable") {
        this.client.logger.warn(
          `mysql: primary key constraint \`${constraintName}\` will not be deferrable ${deferrable} because mysql does not support deferred constraints.`
        );
      }
      constraintName = constraintName ? this.formatter.wrap(constraintName) : this.formatter.wrap(`${this.tableNameRaw}_pkey`);
      const primaryCols = columns;
      let incrementsCols = [];
      let bigIncrementsCols = [];
      if (this.grouped.columns) {
        incrementsCols = this._getIncrementsColumnNames();
        if (incrementsCols) {
          incrementsCols.forEach((c) => {
            if (!primaryCols.includes(c)) {
              primaryCols.unshift(c);
            }
          });
        }
        bigIncrementsCols = this._getBigIncrementsColumnNames();
        if (bigIncrementsCols) {
          bigIncrementsCols.forEach((c) => {
            if (!primaryCols.includes(c)) {
              primaryCols.unshift(c);
            }
          });
        }
      }
      if (this.method !== "create" && this.method !== "createIfNot") {
        this.pushQuery(
          `alter table ${this.tableName()} add primary key ${constraintName}(${this.formatter.columnize(
            primaryCols
          )})`
        );
      }
      if (incrementsCols.length) {
        this.pushQuery(
          `alter table ${this.tableName()} modify column ${this.formatter.columnize(
            incrementsCols
          )} int unsigned not null auto_increment`
        );
      }
      if (bigIncrementsCols.length) {
        this.pushQuery(
          `alter table ${this.tableName()} modify column ${this.formatter.columnize(
            bigIncrementsCols
          )} bigint unsigned not null auto_increment`
        );
      }
    }
    unique(columns, indexName) {
      let storageEngineIndexType;
      let deferrable;
      if (isObject2(indexName)) {
        ({ indexName, deferrable, storageEngineIndexType } = indexName);
      }
      if (deferrable && deferrable !== "not deferrable") {
        this.client.logger.warn(
          `mysql: unique index \`${indexName}\` will not be deferrable ${deferrable} because mysql does not support deferred constraints.`
        );
      }
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("unique", this.tableNameRaw, columns);
      storageEngineIndexType = storageEngineIndexType ? ` using ${storageEngineIndexType}` : "";
      this.pushQuery(
        `alter table ${this.tableName()} add unique ${indexName}(${this.formatter.columnize(
          columns
        )})${storageEngineIndexType}`
      );
    }
    // Compile a drop index command.
    dropIndex(columns, indexName) {
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("index", this.tableNameRaw, columns);
      this.pushQuery(`alter table ${this.tableName()} drop index ${indexName}`);
    }
    // Compile a drop foreign key command.
    dropForeign(columns, indexName) {
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("foreign", this.tableNameRaw, columns);
      this.pushQuery(
        `alter table ${this.tableName()} drop foreign key ${indexName}`
      );
    }
    dropForeignIfExists() {
      throw new Error(".dropForeignIfExists is not supported for mysql.");
    }
    // Compile a drop primary key command.
    dropPrimary() {
      this.pushQuery(`alter table ${this.tableName()} drop primary key`);
    }
    dropPrimaryIfExists() {
      throw new Error(".dropPrimaryIfExists is not supported for mysql.");
    }
    // Compile a drop unique key command.
    dropUnique(column, indexName) {
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("unique", this.tableNameRaw, column);
      this.pushQuery(`alter table ${this.tableName()} drop index ${indexName}`);
    }
    dropUniqueIfExists(column, indexName) {
      if (this.client.isMariaDB) {
        indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("unique", this.tableNameRaw, column);
        this.pushQuery(
          `alter table ${this.tableName()} drop index if exists ${indexName}`
        );
        return;
      }
      throw new Error(".dropUniqueIfExists is not supported for mysql.");
    }
  }
  TableCompiler_MySQL.prototype.addColumnsPrefix = "add ";
  TableCompiler_MySQL.prototype.alterColumnsPrefix = "modify ";
  TableCompiler_MySQL.prototype.dropColumnPrefix = "drop ";
  mysqlTablecompiler = TableCompiler_MySQL;
  return mysqlTablecompiler;
}
var mysqlColumncompiler;
var hasRequiredMysqlColumncompiler;
function requireMysqlColumncompiler() {
  if (hasRequiredMysqlColumncompiler) return mysqlColumncompiler;
  hasRequiredMysqlColumncompiler = 1;
  const ColumnCompiler3 = columncompiler;
  const { isObject: isObject2 } = is;
  const { toNumber: toNumber2 } = helpers$7;
  const commentEscapeRegex = new RegExp("(?<!\\\\)'", "g");
  class ColumnCompiler_MySQL extends ColumnCompiler3 {
    constructor(client2, tableCompiler, columnBuilder) {
      super(client2, tableCompiler, columnBuilder);
      this.modifiers = [
        "unsigned",
        "nullable",
        "defaultTo",
        "comment",
        "collate",
        "first",
        "after"
      ];
      this._addCheckModifiers();
    }
    // Types
    // ------
    double(precision, scale) {
      if (!precision) return "double";
      return `double(${toNumber2(precision, 8)}, ${toNumber2(scale, 2)})`;
    }
    integer(length) {
      length = length ? `(${toNumber2(length, 11)})` : "";
      return `int${length}`;
    }
    tinyint(length) {
      length = length ? `(${toNumber2(length, 1)})` : "";
      return `tinyint${length}`;
    }
    text(column) {
      switch (column) {
        case "medium":
        case "mediumtext":
          return "mediumtext";
        case "long":
        case "longtext":
          return "longtext";
        default:
          return "text";
      }
    }
    mediumtext() {
      return this.text("medium");
    }
    longtext() {
      return this.text("long");
    }
    enu(allowed) {
      return `enum('${allowed.join("', '")}')`;
    }
    datetime(precision) {
      if (isObject2(precision)) {
        ({ precision } = precision);
      }
      return typeof precision === "number" ? `datetime(${precision})` : "datetime";
    }
    timestamp(precision) {
      if (isObject2(precision)) {
        ({ precision } = precision);
      }
      return typeof precision === "number" ? `timestamp(${precision})` : "timestamp";
    }
    time(precision) {
      if (isObject2(precision)) {
        ({ precision } = precision);
      }
      return typeof precision === "number" ? `time(${precision})` : "time";
    }
    bit(length) {
      return length ? `bit(${toNumber2(length)})` : "bit";
    }
    binary(length) {
      return length ? `varbinary(${toNumber2(length)})` : "blob";
    }
    json() {
      return "json";
    }
    jsonb() {
      return "json";
    }
    // Modifiers
    // ------
    defaultTo(value) {
      if (value === null || value === void 0) {
        return;
      }
      if ((this.type === "json" || this.type === "jsonb") && isObject2(value)) {
        return `default ('${JSON.stringify(value)}')`;
      }
      const defaultVal = super.defaultTo.apply(this, arguments);
      if (this.type !== "blob" && this.type.indexOf("text") === -1) {
        return defaultVal;
      }
      return "";
    }
    unsigned() {
      return "unsigned";
    }
    comment(comment) {
      if (comment && comment.length > 255) {
        this.client.logger.warn(
          "Your comment is longer than the max comment length for MySQL"
        );
      }
      return comment && `comment '${comment.replace(commentEscapeRegex, "\\'")}'`;
    }
    first() {
      return "first";
    }
    after(column) {
      return `after ${this.formatter.wrap(column)}`;
    }
    collate(collation) {
      return collation && `collate '${collation}'`;
    }
    checkRegex(regex, constraintName) {
      return this._check(
        `${this.formatter.wrap(
          this.getColumnName()
        )} REGEXP ${this.client._escapeBinding(regex)}`,
        constraintName
      );
    }
    increments(options = { primaryKey: true }) {
      return "int unsigned not null" + // In MySQL autoincrement are always a primary key. If you already have a primary key, we
      // initialize this column as classic int column then modify it later in table compiler
      (this.tableCompiler._canBeAddPrimaryKey(options) ? " auto_increment primary key" : "");
    }
    bigincrements(options = { primaryKey: true }) {
      return "bigint unsigned not null" + // In MySQL autoincrement are always a primary key. If you already have a primary key, we
      // initialize this column as classic int column then modify it later in table compiler
      (this.tableCompiler._canBeAddPrimaryKey(options) ? " auto_increment primary key" : "");
    }
  }
  ColumnCompiler_MySQL.prototype.bigint = "bigint";
  ColumnCompiler_MySQL.prototype.mediumint = "mediumint";
  ColumnCompiler_MySQL.prototype.smallint = "smallint";
  mysqlColumncompiler = ColumnCompiler_MySQL;
  return mysqlColumncompiler;
}
var mysqlViewcompiler;
var hasRequiredMysqlViewcompiler;
function requireMysqlViewcompiler() {
  if (hasRequiredMysqlViewcompiler) return mysqlViewcompiler;
  hasRequiredMysqlViewcompiler = 1;
  const ViewCompiler3 = viewcompiler;
  class ViewCompiler_MySQL extends ViewCompiler3 {
    constructor(client2, viewCompiler) {
      super(client2, viewCompiler);
    }
    createOrReplace() {
      this.createQuery(this.columns, this.selectQuery, false, true);
    }
  }
  mysqlViewcompiler = ViewCompiler_MySQL;
  return mysqlViewcompiler;
}
var mysqlViewbuilder;
var hasRequiredMysqlViewbuilder;
function requireMysqlViewbuilder() {
  if (hasRequiredMysqlViewbuilder) return mysqlViewbuilder;
  hasRequiredMysqlViewbuilder = 1;
  const ViewBuilder3 = viewbuilder;
  class ViewBuilder_MySQL extends ViewBuilder3 {
    constructor() {
      super(...arguments);
    }
    checkOption() {
      this._single.checkOption = "default_option";
    }
    localCheckOption() {
      this._single.checkOption = "local";
    }
    cascadedCheckOption() {
      this._single.checkOption = "cascaded";
    }
  }
  mysqlViewbuilder = ViewBuilder_MySQL;
  return mysqlViewbuilder;
}
var mysql;
var hasRequiredMysql;
function requireMysql() {
  if (hasRequiredMysql) return mysql;
  hasRequiredMysql = 1;
  const defer2 = requireDefer();
  const map2 = map_1;
  const uniqueId2 = uniqueId_1;
  const { promisify: promisify2 } = require$$3;
  const Client3 = client;
  const Transaction3 = requireTransaction$4();
  const QueryBuilder2 = requireMysqlQuerybuilder();
  const QueryCompiler3 = requireMysqlQuerycompiler();
  const SchemaCompiler3 = requireMysqlCompiler();
  const TableCompiler3 = requireMysqlTablecompiler();
  const ColumnCompiler3 = requireMysqlColumncompiler();
  const { makeEscape: makeEscape2 } = string;
  const ViewCompiler3 = requireMysqlViewcompiler();
  const ViewBuilder3 = requireMysqlViewbuilder();
  class Client_MySQL extends Client3 {
    _driver() {
      return require$$14;
    }
    queryBuilder() {
      return new QueryBuilder2(this);
    }
    queryCompiler(builder2, formatter2) {
      return new QueryCompiler3(this, builder2, formatter2);
    }
    schemaCompiler() {
      return new SchemaCompiler3(this, ...arguments);
    }
    tableCompiler() {
      return new TableCompiler3(this, ...arguments);
    }
    viewCompiler() {
      return new ViewCompiler3(this, ...arguments);
    }
    viewBuilder() {
      return new ViewBuilder3(this, ...arguments);
    }
    columnCompiler() {
      return new ColumnCompiler3(this, ...arguments);
    }
    transaction() {
      return new Transaction3(this, ...arguments);
    }
    wrapIdentifierImpl(value) {
      return value !== "*" ? `\`${value.replace(/`/g, "``")}\`` : "*";
    }
    // Get a raw connection, called by the `pool` whenever a new
    // connection needs to be added to the pool.
    acquireRawConnection() {
      return new Promise((resolver, rejecter) => {
        const connection = this.driver.createConnection(this.connectionSettings);
        connection.on("error", (err) => {
          connection.__knex__disposed = err;
        });
        connection.connect(async (err) => {
          if (err) {
            connection.removeAllListeners();
            return rejecter(err);
          }
          try {
            await this.checkVersion(connection);
          } catch (versionError) {
            const suffix = (versionError == null ? void 0 : versionError.message) ? ` (${versionError.message})` : "";
            this.logger.warn(
              `Knex: Unable to detect MySQL/MariaDB version${suffix}. Assuming latest version.`
            );
          }
          resolver(connection);
        });
      });
    }
    // Used to explicitly close a connection, called internally by the pool
    // when a connection times out or the pool is shutdown.
    async destroyRawConnection(connection) {
      try {
        const end = promisify2((cb) => connection.end(cb));
        return await end();
      } catch (err) {
        connection.__knex__disposed = err;
      } finally {
        defer2(() => connection.removeAllListeners());
      }
    }
    validateConnection(connection) {
      return connection.state === "connected" || connection.state === "authenticated";
    }
    // Wraps a native mysql pool with the interface knex expects from this.pool.
    /**
     * @param {import('mysql').Pool | import('mysql2').Pool} nativePool
     */
    wrapNativePool(nativePool) {
      return {
        acquire() {
          return {
            promise: new Promise((resolve, reject2) => {
              nativePool.getConnection((err, connection) => {
                if (err) return reject2(err);
                connection.__knexUid = uniqueId2("__knexUid");
                resolve(connection);
              });
            })
          };
        },
        /**
         * @param {import('mysql').Connection | import('mysql2').Connection} connection
         */
        release(connection) {
          if (connection.__knex__disposed) {
            if (typeof connection.destroy === "function") {
              connection.destroy();
            }
            return true;
          }
          if (typeof connection.release === "function") {
            connection.release();
            return true;
          }
          return false;
        },
        destroy() {
          return Promise.resolve();
        }
      };
    }
    // Grab a connection, run the query via the MySQL streaming interface,
    // and pass that through to the stream we've sent back to the client.
    _stream(connection, obj, stream, options) {
      if (!obj.sql) throw new Error("The query is empty");
      options = options || {};
      const queryOptions = Object.assign({ sql: obj.sql }, obj.options);
      return new Promise((resolver, rejecter) => {
        stream.on("error", rejecter);
        stream.on("end", resolver);
        const queryStream = connection.query(queryOptions, obj.bindings).stream(options);
        queryStream.on("error", (err) => {
          rejecter(err);
          stream.emit("error", err);
        });
        queryStream.pipe(stream);
      });
    }
    // Runs the query on the specified connection, providing the bindings
    // and any other necessary prep work.
    _query(connection, obj) {
      if (!obj || typeof obj === "string") obj = { sql: obj };
      if (!obj.sql) throw new Error("The query is empty");
      return new Promise(function(resolver, rejecter) {
        if (!obj.sql) {
          resolver();
          return;
        }
        const queryOptions = Object.assign({ sql: obj.sql }, obj.options);
        connection.query(
          queryOptions,
          obj.bindings,
          function(err, rows, fields) {
            if (err) return rejecter(err);
            obj.response = [rows, fields];
            resolver(obj);
          }
        );
      });
    }
    // Process the response as returned from the query.
    processResponse(obj, runner2) {
      if (obj == null) return;
      const { response } = obj;
      const { method } = obj;
      const rows = response[0];
      const fields = response[1];
      if (obj.output) return obj.output.call(runner2, rows, fields);
      switch (method) {
        case "select":
          return rows;
        case "first":
          return rows[0];
        case "pluck":
          return map2(rows, obj.pluck);
        case "insert":
          return [rows.insertId];
        case "del":
        case "update":
        case "counter":
          return rows.affectedRows;
        default:
          return response;
      }
    }
    async cancelQuery(connectionToKill) {
      const conn = await this.acquireRawConnection();
      try {
        return await this._wrappedCancelQueryCall(conn, connectionToKill);
      } finally {
        await this.destroyRawConnection(conn);
        if (conn.__knex__disposed) {
          this.logger.warn(`Connection Error: ${conn.__knex__disposed}`);
        }
      }
    }
    _wrappedCancelQueryCall(conn, connectionToKill) {
      return this._query(conn, {
        sql: "KILL QUERY ?",
        bindings: [connectionToKill.threadId],
        options: {}
      });
    }
    async checkVersion(connection) {
      if (this._versionCheckPromise) {
        return this._versionCheckPromise;
      }
      this._versionCheckPromise = (async () => {
        var _a;
        if (this.version) {
          return this._resolveConfiguredVersion(this.version);
        }
        try {
          const query = promisify2(connection.query).bind(connection);
          const rows = await query("select version() as version");
          const rawVersion = (_a = rows == null ? void 0 : rows[0]) == null ? void 0 : _a.version;
          if (!rawVersion) {
            return this._assumeLatestVersion({
              reason: "Unable to retrieve MySQL/MariaDB version from server"
            });
          }
          return this._applyParsedVersion(rawVersion, { source: "server" });
        } catch (err) {
          return this._assumeLatestVersion({
            reason: "Unable to retrieve MySQL/MariaDB version from server",
            error: err
          });
        }
      })();
      return this._versionCheckPromise;
    }
    _resolveConfiguredVersion(versionString) {
      if (this._isLatestVersionString(versionString)) {
        return this._assumeLatestVersion({
          reason: "MySQL/MariaDB version set to latest in configuration",
          skipWarning: true
        });
      }
      return this._applyParsedVersion(versionString, { source: "config" });
    }
    _applyParsedVersion(versionString, { source }) {
      const { version, isMariaDB } = this._parseVersion(versionString);
      if (typeof isMariaDB !== "undefined") {
        this.isMariaDB = isMariaDB;
      }
      if (!version) {
        const reason = source === "config" ? `Invalid MySQL/MariaDB version "${versionString}" in configuration` : `Unable to parse MySQL/MariaDB version string "${versionString}"`;
        return this._assumeLatestVersion({ reason });
      }
      if (!this.version || source === "server") {
        this.version = version;
      }
      return this.version;
    }
    _assumeLatestVersion({ reason, error, skipWarning } = {}) {
      if (!skipWarning) {
        const suffix = error && error.message ? ` (${error.message})` : "";
        this.logger.warn(`Knex: ${reason}${suffix}. Assuming latest version.`);
      }
      this.version = null;
      return this.version;
    }
    _isLatestVersionString(versionString) {
      return typeof versionString === "string" && versionString.toLowerCase() === "latest";
    }
    _parseVersion(versionString) {
      const isMariaDB = /mariadb/i.test(versionString);
      let versionMatch;
      if (isMariaDB) {
        const mariaMatch = versionString.match(/(\d+\.\d+\.\d+)(?=[^\d]*mariadb)/i) || versionString.match(/(\d+\.\d+\.\d+)/);
        versionMatch = mariaMatch && mariaMatch[1];
      } else {
        const mysqlMatch = versionString.match(/(\d+\.\d+\.\d+)/);
        versionMatch = mysqlMatch && mysqlMatch[1];
      }
      return { version: versionMatch || null, isMariaDB };
    }
  }
  Object.assign(Client_MySQL.prototype, {
    dialect: "mysql",
    driverName: "mysql",
    _escapeBinding: makeEscape2(),
    canCancelQuery: true
  });
  mysql = Client_MySQL;
  return mysql;
}
var transaction$3;
var hasRequiredTransaction$3;
function requireTransaction$3() {
  if (hasRequiredTransaction$3) return transaction$3;
  hasRequiredTransaction$3 = 1;
  const Transaction3 = transaction$6;
  const debug2 = srcExports("knex:tx");
  class Transaction_MariaDB extends Transaction3 {
    query(conn, sql, status, value) {
      const t = this;
      const q = this.trxClient.query(conn, sql).catch((err) => {
        if (err.code === "ER_SP_DOES_NOT_EXIST") {
          this.trxClient.logger.warn(
            "Transaction was implicitly committed, do not mix transactions and DDL with MySQL (#805)"
          );
          return;
        }
        status = 2;
        value = err;
        t._completed = true;
        debug2("%s error running transaction query", t.txid);
      }).then(function(res) {
        if (status === 1) t._resolver(value);
        if (status === 2) {
          if (value === void 0) {
            if (t.doNotRejectOnRollback && /^ROLLBACK\b/i.test(sql)) {
              t._resolver();
              return;
            }
            value = new Error(`Transaction rejected with non-error: ${value}`);
          }
          t._rejecter(value);
          return res;
        }
      });
      if (status === 1 || status === 2) {
        t._completed = true;
      }
      return q;
    }
  }
  transaction$3 = Transaction_MariaDB;
  return transaction$3;
}
var mariadbQuerycompiler;
var hasRequiredMariadbQuerycompiler;
function requireMariadbQuerycompiler() {
  if (hasRequiredMariadbQuerycompiler) return mariadbQuerycompiler;
  hasRequiredMariadbQuerycompiler = 1;
  const QueryCompiler_MySQL = requireMysqlQuerycompiler();
  const { wrap: wrap_2 } = wrappingFormatter;
  class QueryCompiler_MariaDB extends QueryCompiler_MySQL {
    // On MariaDB, json_extract() yields a quoted JSON scalar (e.g. "cold") whose
    // values do not compare equal with `=`. json_unquote() is required for the
    // comparison to behave like MySQL's native JSON type
    onJsonPathEquals(clause) {
      const extract = (column, path2) => `json_unquote(json_extract(${wrap_2(
        column,
        void 0,
        this.builder,
        this.client,
        this.bindingsHolder
      )}, ${this.client.parameter(path2, this.builder, this.bindingsHolder)}))`;
      return `${extract(clause.columnFirst, clause.jsonPathFirst)} = ${extract(
        clause.columnSecond,
        clause.jsonPathSecond
      )}`;
    }
    insert() {
      const sql = super.insert();
      if (sql === "") return sql;
      const { returning } = this.single;
      if (returning && this._supportsReturning("insert")) {
        return { sql: sql + this._returning(returning), returning };
      }
      return sql;
    }
    update() {
      const sql = super.update();
      if (sql === "") return sql;
      const { returning } = this.single;
      if (returning && this._supportsReturning("update")) {
        return { sql: sql + this._returning(returning), returning };
      }
      return sql;
    }
    del() {
      const sql = super.del();
      if (sql === "") return sql;
      const { returning } = this.single;
      if (returning && this._supportsReturning("del")) {
        return { sql: sql + this._returning(returning), returning };
      }
      return sql;
    }
    _returning(value) {
      return value ? ` returning ${this.formatter.columnize(value)}` : "";
    }
    _supportsReturning(method) {
      const version = parseFloat(this.client.version) ?? 13;
      if (version < 10.5) {
        return false;
      }
      if (method === "update") {
        return version >= 13 && (this.grouped.join || []).length === 0;
      }
      if (method === "del") {
        return (this.grouped.join || []).length === 0;
      }
      return true;
    }
    _returningCheck() {
      const { returning } = this.single;
      if (!returning || this._supportsReturning(this.method)) {
        return;
      }
      let reason;
      const hasJoin = (this.grouped.join || []).length;
      if (this.method === "update") {
        reason = (this.grouped.join || []).length ? "multi-table update statements" : "mariadb versions older than 13.0";
      } else if (this.method === "del" && hasJoin) {
        reason = "multi-table delete statements";
      } else {
        reason = "mariadb versions older than 10.5";
      }
      this.client.logger.warn(
        `.returning() is not supported for ${reason} and will not have any effect.`
      );
    }
  }
  mariadbQuerycompiler = QueryCompiler_MariaDB;
  return mariadbQuerycompiler;
}
var mariadbColumncompiler;
var hasRequiredMariadbColumncompiler;
function requireMariadbColumncompiler() {
  if (hasRequiredMariadbColumncompiler) return mariadbColumncompiler;
  hasRequiredMariadbColumncompiler = 1;
  const ColumnCompiler_MySQL = requireMysqlColumncompiler();
  class ColumnCompiler_MariaDB extends ColumnCompiler_MySQL {
    // MariaDB does not accept a named CHECK constraint inline in a column
    // definition
    _check(checkPredicate, constraintName) {
      if (constraintName && this.columnBuilder._method !== "alter") {
        this._pushAlterCheckQuery(checkPredicate, constraintName);
        return "";
      }
      return super._check(checkPredicate, constraintName);
    }
  }
  mariadbColumncompiler = ColumnCompiler_MariaDB;
  return mariadbColumncompiler;
}
var mariadb;
var hasRequiredMariadb;
function requireMariadb() {
  if (hasRequiredMariadb) return mariadb;
  hasRequiredMariadb = 1;
  const Client_MySQL = requireMysql();
  const Transaction3 = requireTransaction$3();
  const QueryCompiler3 = requireMariadbQuerycompiler();
  const ColumnCompiler3 = requireMariadbColumncompiler();
  class Client_MariaDB extends Client_MySQL {
    transaction() {
      return new Transaction3(this, ...arguments);
    }
    queryCompiler(builder2, formatter2) {
      return new QueryCompiler3(this, builder2, formatter2);
    }
    columnCompiler() {
      return new ColumnCompiler3(this, ...arguments);
    }
    _driver() {
      return require$$4$1;
    }
    processResponse(obj, runner2) {
      if (obj == null) return;
      if (obj.returning) {
        const rows = obj.response[0];
        const fields = obj.response[1];
        if (obj.output) {
          return obj.output.call(runner2, rows, fields);
        }
        return rows;
      }
      return super.processResponse(obj, runner2);
    }
    validateConnection(connection) {
      if (typeof connection.isValid === "function") {
        return connection.isValid();
      }
      return connection && !connection._fatalError && !connection._protocolError && !connection._closing;
    }
  }
  Object.assign(Client_MariaDB.prototype, {
    driverName: "mariadb"
  });
  mariadb = Client_MariaDB;
  return mariadb;
}
var transaction$2;
var hasRequiredTransaction$2;
function requireTransaction$2() {
  if (hasRequiredTransaction$2) return transaction$2;
  hasRequiredTransaction$2 = 1;
  const Transaction3 = transaction$6;
  const debug2 = srcExports("knex:tx");
  class Transaction_MySQL2 extends Transaction3 {
    query(conn, sql, status, value) {
      const t = this;
      const q = this.trxClient.query(conn, sql).catch((err) => {
        if (err.code === "ER_SP_DOES_NOT_EXIST") {
          this.trxClient.logger.warn(
            "Transaction was implicitly committed, do not mix transactions and DDL with MySQL (#805)"
          );
          return;
        }
        status = 2;
        value = err;
        t._completed = true;
        debug2("%s error running transaction query", t.txid);
      }).then(function(res) {
        if (status === 1) t._resolver(value);
        if (status === 2) {
          if (value === void 0) {
            if (t.doNotRejectOnRollback && /^ROLLBACK\b/i.test(sql)) {
              t._resolver();
              return;
            }
            value = new Error(`Transaction rejected with non-error: ${value}`);
          }
          t._rejecter(value);
          return res;
        }
      });
      if (status === 1 || status === 2) {
        t._completed = true;
      }
      return q;
    }
  }
  transaction$2 = Transaction_MySQL2;
  return transaction$2;
}
var mysql2;
var hasRequiredMysql2;
function requireMysql2() {
  if (hasRequiredMysql2) return mysql2;
  hasRequiredMysql2 = 1;
  const Client_MySQL = requireMysql();
  const Transaction3 = requireTransaction$2();
  class Client_MySQL2 extends Client_MySQL {
    transaction() {
      return new Transaction3(this, ...arguments);
    }
    _driver() {
      return require$$2$2;
    }
    initializeDriver() {
      try {
        this.driver = this._driver();
      } catch (e) {
        let message = `Knex: run
$ npm install ${this.driverName}`;
        const nodeMajorVersion = process.version.replace(/^v/, "").split(".")[0];
        if (nodeMajorVersion <= 12) {
          message += `@3.2.0`;
          this.logger.error(
            "Mysql2 version 3.2.0 is the latest version to support Node.js 12 or lower."
          );
        }
        message += ` --save`;
        this.logger.error(`${message}
${e.message}
${e.stack}`);
        throw new Error(`${message}
${e.message}`);
      }
    }
    // Support both mysql2.createPool() and mysql2/promise.createPool().
    // The promise variant wraps a callback pool and exposes it as .pool.
    wrapNativePool(nativePool) {
      const callbackPool = nativePool.pool || nativePool;
      return super.wrapNativePool(callbackPool);
    }
    validateConnection(connection) {
      return connection && !connection._fatalError && !connection._protocolError && !connection._closing && !connection.stream.destroyed;
    }
  }
  Object.assign(Client_MySQL2.prototype, {
    // The "dialect", for reference elsewhere.
    driverName: "mysql2"
  });
  mysql2 = Client_MySQL2;
  return mysql2;
}
var utils$1;
var hasRequiredUtils$1;
function requireUtils$1() {
  if (hasRequiredUtils$1) return utils$1;
  hasRequiredUtils$1 = 1;
  class NameHelper {
    constructor(oracleVersion) {
      this.oracleVersion = oracleVersion;
      const versionParts = oracleVersion.split(".").map((versionPart) => parseInt(versionPart));
      if (versionParts[0] > 12 || versionParts[0] === 12 && versionParts[1] >= 2) {
        this.limit = 128;
      } else {
        this.limit = 30;
      }
    }
    generateCombinedName(logger2, postfix, name, subNames) {
      const crypto = require$$0$5;
      if (!Array.isArray(subNames)) subNames = subNames ? [subNames] : [];
      const table = name.replace(/\.|-/g, "_");
      const subNamesPart = subNames.join("_");
      let result = `${table}_${subNamesPart.length ? subNamesPart + "_" : ""}${postfix}`.toLowerCase();
      if (result.length > this.limit) {
        logger2.warn(
          `Automatically generated name "${result}" exceeds ${this.limit} character limit for Oracle Database ${this.oracleVersion}. Using base64 encoded sha1 of that name instead.`
        );
        result = crypto.createHash("sha1").update(result).digest("base64").replace("=", "");
      }
      return result;
    }
  }
  function wrapSqlWithCatch(sql, errorNumberToCatch) {
    return `begin execute immediate '${sql.replace(/'/g, "''")}'; exception when others then if sqlcode != ${errorNumberToCatch} then raise; end if; end;`;
  }
  function ReturningHelper(columnName) {
    this.columnName = columnName;
  }
  ReturningHelper.prototype.toString = function() {
    return `[object ReturningHelper:${this.columnName}]`;
  };
  function isConnectionError(err) {
    return [
      "DPI-1010",
      // not connected
      "DPI-1080",
      // connection was closed by ORA-%d
      "ORA-03114",
      // not connected to ORACLE
      "ORA-03113",
      // end-of-file on communication channel
      "ORA-03135",
      // connection lost contact
      "ORA-12514",
      // listener does not currently know of service requested in connect descriptor
      "ORA-00022",
      // invalid session ID; access denied
      "ORA-00028",
      // your session has been killed
      "ORA-00031",
      // your session has been marked for kill
      "ORA-00045",
      // your session has been terminated with no replay
      "ORA-00378",
      // buffer pools cannot be created as specified
      "ORA-00602",
      // internal programming exception
      "ORA-00603",
      // ORACLE server session terminated by fatal error
      "ORA-00609",
      // could not attach to incoming connection
      "ORA-01012",
      // not logged on
      "ORA-01041",
      // internal error. hostdef extension doesn't exist
      "ORA-01043",
      // user side memory corruption
      "ORA-01089",
      // immediate shutdown or close in progress
      "ORA-01092",
      // ORACLE instance terminated. Disconnection forced
      "ORA-02396",
      // exceeded maximum idle time, please connect again
      "ORA-03122",
      // attempt to close ORACLE-side window on user side
      "ORA-12153",
      // TNS'not connected
      "ORA-12537",
      // TNS'connection closed
      "ORA-12547",
      // TNS'lost contact
      "ORA-12570",
      // TNS'packet reader failure
      "ORA-12583",
      // TNS'no reader
      "ORA-27146",
      // post/wait initialization failed
      "ORA-28511",
      // lost RPC connection
      "ORA-56600",
      // an illegal OCI function call was issued
      "NJS-024",
      "NJS-003",
      "NJS-500"
    ].some(function(prefix) {
      return err.message.indexOf(prefix) === 0;
    });
  }
  utils$1 = {
    NameHelper,
    isConnectionError,
    wrapSqlWithCatch,
    ReturningHelper
  };
  return utils$1;
}
var trigger;
var hasRequiredTrigger;
function requireTrigger() {
  if (hasRequiredTrigger) return trigger;
  hasRequiredTrigger = 1;
  const { NameHelper } = requireUtils$1();
  class Trigger {
    constructor(oracleVersion) {
      this.nameHelper = new NameHelper(oracleVersion);
    }
    renameColumnTrigger(logger2, tableName, columnName, to) {
      const triggerName = this.nameHelper.generateCombinedName(
        logger2,
        "autoinc_trg",
        tableName
      );
      const sequenceName = this.nameHelper.generateCombinedName(
        logger2,
        "seq",
        tableName
      );
      return `DECLARE PK_NAME VARCHAR(200); IS_AUTOINC NUMBER := 0; BEGIN  EXECUTE IMMEDIATE ('ALTER TABLE "${tableName}" RENAME COLUMN "${columnName}" TO "${to}"');  SELECT COUNT(*) INTO IS_AUTOINC from "USER_TRIGGERS" where trigger_name = '${triggerName}';  IF (IS_AUTOINC > 0) THEN    SELECT cols.column_name INTO PK_NAME    FROM all_constraints cons, all_cons_columns cols    WHERE cons.constraint_type = 'P'    AND cons.constraint_name = cols.constraint_name    AND cons.owner = cols.owner    AND cols.table_name = '${tableName}';    IF ('${to}' = PK_NAME) THEN      EXECUTE IMMEDIATE ('DROP TRIGGER "${triggerName}"');      EXECUTE IMMEDIATE ('create or replace trigger "${triggerName}"      BEFORE INSERT on "${tableName}" for each row        declare        checking number := 1;        begin          if (:new."${to}" is null) then            while checking >= 1 loop              select "${sequenceName}".nextval into :new."${to}" from dual;              select count("${to}") into checking from "${tableName}"              where "${to}" = :new."${to}";            end loop;          end if;        end;');    end if;  end if;END;`;
    }
    createAutoIncrementTrigger(logger2, tableName, schemaName) {
      const tableQuoted = `"${tableName}"`;
      const tableUnquoted = tableName;
      const schemaQuoted = schemaName ? `"${schemaName}".` : "";
      const constraintOwner = schemaName ? `'${schemaName}'` : "cols.owner";
      const triggerName = this.nameHelper.generateCombinedName(
        logger2,
        "autoinc_trg",
        tableName
      );
      const sequenceNameUnquoted = this.nameHelper.generateCombinedName(
        logger2,
        "seq",
        tableName
      );
      const sequenceNameQuoted = `"${sequenceNameUnquoted}"`;
      return `DECLARE PK_NAME VARCHAR(200); BEGIN  EXECUTE IMMEDIATE ('CREATE SEQUENCE ${schemaQuoted}${sequenceNameQuoted}');  SELECT cols.column_name INTO PK_NAME  FROM all_constraints cons, all_cons_columns cols  WHERE cons.constraint_type = 'P'  AND cons.constraint_name = cols.constraint_name  AND cons.owner = ${constraintOwner}  AND cols.table_name = '${tableUnquoted}';  execute immediate ('create or replace trigger ${schemaQuoted}"${triggerName}"  BEFORE INSERT on ${schemaQuoted}${tableQuoted}  for each row  declare  checking number := 1;  begin    if (:new."' || PK_NAME || '" is null) then      while checking >= 1 loop        select ${schemaQuoted}${sequenceNameQuoted}.nextval into :new."' || PK_NAME || '" from dual;        select count("' || PK_NAME || '") into checking from ${schemaQuoted}${tableQuoted}        where "' || PK_NAME || '" = :new."' || PK_NAME || '";      end loop;    end if;  end;'); END;`;
    }
    renameTableAndAutoIncrementTrigger(logger2, tableName, to) {
      const triggerName = this.nameHelper.generateCombinedName(
        logger2,
        "autoinc_trg",
        tableName
      );
      const sequenceName = this.nameHelper.generateCombinedName(
        logger2,
        "seq",
        tableName
      );
      const toTriggerName = this.nameHelper.generateCombinedName(
        logger2,
        "autoinc_trg",
        to
      );
      const toSequenceName = this.nameHelper.generateCombinedName(
        logger2,
        "seq",
        to
      );
      return `DECLARE PK_NAME VARCHAR(200); IS_AUTOINC NUMBER := 0; BEGIN  EXECUTE IMMEDIATE ('RENAME "${tableName}" TO "${to}"');  SELECT COUNT(*) INTO IS_AUTOINC from "USER_TRIGGERS" where trigger_name = '${triggerName}';  IF (IS_AUTOINC > 0) THEN    EXECUTE IMMEDIATE ('DROP TRIGGER "${triggerName}"');    EXECUTE IMMEDIATE ('RENAME "${sequenceName}" TO "${toSequenceName}"');    SELECT cols.column_name INTO PK_NAME    FROM all_constraints cons, all_cons_columns cols    WHERE cons.constraint_type = 'P'    AND cons.constraint_name = cols.constraint_name    AND cons.owner = cols.owner    AND cols.table_name = '${to}';    EXECUTE IMMEDIATE ('create or replace trigger "${toTriggerName}"    BEFORE INSERT on "${to}" for each row      declare      checking number := 1;      begin        if (:new."' || PK_NAME || '" is null) then          while checking >= 1 loop            select "${toSequenceName}".nextval into :new."' || PK_NAME || '" from dual;            select count("' || PK_NAME || '") into checking from "${to}"            where "' || PK_NAME || '" = :new."' || PK_NAME || '";          end loop;        end if;      end;');  end if;END;`;
    }
  }
  trigger = Trigger;
  return trigger;
}
var oracleCompiler;
var hasRequiredOracleCompiler;
function requireOracleCompiler() {
  if (hasRequiredOracleCompiler) return oracleCompiler;
  hasRequiredOracleCompiler = 1;
  const SchemaCompiler3 = compiler$1;
  const utils2 = requireUtils$1();
  const Trigger = requireTrigger();
  class SchemaCompiler_Oracle extends SchemaCompiler3 {
    constructor() {
      super(...arguments);
    }
    // Rename a table on the schema.
    renameTable(tableName, to) {
      const trigger2 = new Trigger(this.client.version);
      const renameTable = trigger2.renameTableAndAutoIncrementTrigger(
        this.client.logger,
        tableName,
        to
      );
      this.pushQuery(renameTable);
    }
    // Check whether a table exists on the query.
    hasTable(tableName) {
      this.pushQuery({
        sql: "select TABLE_NAME from USER_TABLES where TABLE_NAME = " + this.client.parameter(tableName, this.builder, this.bindingsHolder),
        output(resp) {
          return resp.length > 0;
        }
      });
    }
    // Check whether a column exists on the schema.
    hasColumn(tableName, column) {
      const sql = `select COLUMN_NAME from ALL_TAB_COLUMNS where TABLE_NAME = ${this.client.parameter(
        tableName,
        this.builder,
        this.bindingsHolder
      )} and COLUMN_NAME = ${this.client.parameter(
        column,
        this.builder,
        this.bindingsHolder
      )}`;
      this.pushQuery({ sql, output: (resp) => resp.length > 0 });
    }
    dropSequenceIfExists(sequenceName) {
      const prefix = this.schema ? `"${this.schema}".` : "";
      this.pushQuery(
        utils2.wrapSqlWithCatch(
          `drop sequence ${prefix}${this.formatter.wrap(sequenceName)}`,
          -2289
        )
      );
    }
    _dropRelatedSequenceIfExists(tableName) {
      const nameHelper = new utils2.NameHelper(this.client.version);
      const sequenceName = nameHelper.generateCombinedName(
        this.client.logger,
        "seq",
        tableName
      );
      this.dropSequenceIfExists(sequenceName);
    }
    dropTable(tableName) {
      const prefix = this.schema ? `"${this.schema}".` : "";
      this.pushQuery(`drop table ${prefix}${this.formatter.wrap(tableName)}`);
      this._dropRelatedSequenceIfExists(tableName);
    }
    dropTableIfExists(tableName) {
      this.dropObject(tableName, "table");
    }
    dropViewIfExists(viewName) {
      this.dropObject(viewName, "view");
    }
    dropObject(objectName, type) {
      const prefix = this.schema ? `"${this.schema}".` : "";
      let errorCode = -942;
      if (type === "materialized view") {
        errorCode = -12003;
      }
      this.pushQuery(
        utils2.wrapSqlWithCatch(
          `drop ${type} ${prefix}${this.formatter.wrap(objectName)}`,
          errorCode
        )
      );
      this._dropRelatedSequenceIfExists(objectName);
    }
    refreshMaterializedView(viewName) {
      return this.pushQuery({
        sql: `BEGIN DBMS_MVIEW.REFRESH('${this.schemaNameRaw ? this.schemaNameRaw + "." : ""}${viewName}'); END;`
      });
    }
    dropMaterializedView(viewName) {
      this._dropView(viewName, false, true);
    }
    dropMaterializedViewIfExists(viewName) {
      this.dropObject(viewName, "materialized view");
    }
  }
  oracleCompiler = SchemaCompiler_Oracle;
  return oracleCompiler;
}
var oracleColumnbuilder;
var hasRequiredOracleColumnbuilder;
function requireOracleColumnbuilder() {
  if (hasRequiredOracleColumnbuilder) return oracleColumnbuilder;
  hasRequiredOracleColumnbuilder = 1;
  const ColumnBuilder3 = columnbuilder;
  const toArray2 = toArray_1;
  class ColumnBuilder_Oracle extends ColumnBuilder3 {
    constructor() {
      super(...arguments);
    }
    // checkIn added to the builder to allow the column compiler to change the
    // order via the modifiers ("check" must be after "default")
    checkIn() {
      this._modifiers.checkIn = toArray2(arguments);
      return this;
    }
  }
  oracleColumnbuilder = ColumnBuilder_Oracle;
  return oracleColumnbuilder;
}
var noop_1;
var hasRequiredNoop;
function requireNoop() {
  if (hasRequiredNoop) return noop_1;
  hasRequiredNoop = 1;
  function noop2() {
  }
  noop_1 = noop2;
  return noop_1;
}
var _createSet;
var hasRequired_createSet;
function require_createSet() {
  if (hasRequired_createSet) return _createSet;
  hasRequired_createSet = 1;
  var Set2 = _Set, noop2 = requireNoop(), setToArray2 = _setToArray;
  var INFINITY2 = 1 / 0;
  var createSet = !(Set2 && 1 / setToArray2(new Set2([, -0]))[1] == INFINITY2) ? noop2 : function(values2) {
    return new Set2(values2);
  };
  _createSet = createSet;
  return _createSet;
}
var _baseUniq;
var hasRequired_baseUniq;
function require_baseUniq() {
  if (hasRequired_baseUniq) return _baseUniq;
  hasRequired_baseUniq = 1;
  var SetCache2 = _SetCache, arrayIncludes2 = _arrayIncludes, arrayIncludesWith2 = _arrayIncludesWith, cacheHas2 = _cacheHas, createSet = require_createSet(), setToArray2 = _setToArray;
  var LARGE_ARRAY_SIZE2 = 200;
  function baseUniq(array, iteratee, comparator) {
    var index = -1, includes2 = arrayIncludes2, length = array.length, isCommon = true, result = [], seen = result;
    if (comparator) {
      isCommon = false;
      includes2 = arrayIncludesWith2;
    } else if (length >= LARGE_ARRAY_SIZE2) {
      var set = iteratee ? null : createSet(array);
      if (set) {
        return setToArray2(set);
      }
      isCommon = false;
      includes2 = cacheHas2;
      seen = new SetCache2();
    } else {
      seen = iteratee ? [] : result;
    }
    outer:
      while (++index < length) {
        var value = array[index], computed = iteratee ? iteratee(value) : value;
        value = comparator || value !== 0 ? value : 0;
        if (isCommon && computed === computed) {
          var seenIndex = seen.length;
          while (seenIndex--) {
            if (seen[seenIndex] === computed) {
              continue outer;
            }
          }
          if (iteratee) {
            seen.push(computed);
          }
          result.push(value);
        } else if (!includes2(seen, computed, comparator)) {
          if (seen !== result) {
            seen.push(computed);
          }
          result.push(value);
        }
      }
    return result;
  }
  _baseUniq = baseUniq;
  return _baseUniq;
}
var uniq_1;
var hasRequiredUniq;
function requireUniq() {
  if (hasRequiredUniq) return uniq_1;
  hasRequiredUniq = 1;
  var baseUniq = require_baseUniq();
  function uniq(array) {
    return array && array.length ? baseUniq(array) : [];
  }
  uniq_1 = uniq;
  return uniq_1;
}
var incrementUtils;
var hasRequiredIncrementUtils;
function requireIncrementUtils() {
  if (hasRequiredIncrementUtils) return incrementUtils;
  hasRequiredIncrementUtils = 1;
  const Trigger = requireTrigger();
  function createAutoIncrementTriggerAndSequence(columnCompiler) {
    const trigger2 = new Trigger(columnCompiler.client.version);
    columnCompiler.pushAdditional(function() {
      const tableName = this.tableCompiler.tableNameRaw;
      const schemaName = this.tableCompiler.schemaNameRaw;
      const createTriggerSQL = trigger2.createAutoIncrementTrigger(
        this.client.logger,
        tableName,
        schemaName
      );
      this.pushQuery(createTriggerSQL);
    });
  }
  incrementUtils = {
    createAutoIncrementTriggerAndSequence
  };
  return incrementUtils;
}
var oracleColumncompiler;
var hasRequiredOracleColumncompiler;
function requireOracleColumncompiler() {
  if (hasRequiredOracleColumncompiler) return oracleColumncompiler;
  hasRequiredOracleColumncompiler = 1;
  const uniq = requireUniq();
  const Raw3 = raw;
  const ColumnCompiler3 = columncompiler;
  const {
    createAutoIncrementTriggerAndSequence
  } = requireIncrementUtils();
  const { toNumber: toNumber2 } = helpers$7;
  class ColumnCompiler_Oracle extends ColumnCompiler3 {
    constructor() {
      super(...arguments);
      this.modifiers = ["defaultTo", "checkIn", "nullable", "comment"];
    }
    increments(options = { primaryKey: true }) {
      createAutoIncrementTriggerAndSequence(this);
      return "integer not null" + (this.tableCompiler._canBeAddPrimaryKey(options) ? " primary key" : "");
    }
    bigincrements(options = { primaryKey: true }) {
      createAutoIncrementTriggerAndSequence(this);
      return "number(20, 0) not null" + (this.tableCompiler._canBeAddPrimaryKey(options) ? " primary key" : "");
    }
    floating(precision) {
      const parsedPrecision = toNumber2(precision, 0);
      return `float${parsedPrecision ? `(${parsedPrecision})` : ""}`;
    }
    double(precision, scale) {
      return `number(${toNumber2(precision, 8)}, ${toNumber2(scale, 2)})`;
    }
    decimal(precision, scale) {
      if (precision === null) return "decimal";
      return `decimal(${toNumber2(precision, 8)}, ${toNumber2(scale, 2)})`;
    }
    integer(length) {
      return length ? `number(${toNumber2(length, 11)})` : "integer";
    }
    enu(allowed) {
      allowed = uniq(allowed);
      const maxLength = (allowed || []).reduce(
        (maxLength2, name) => Math.max(maxLength2, String(name).length),
        1
      );
      this.columnBuilder._modifiers.checkIn = [allowed];
      return `varchar2(${maxLength})`;
    }
    datetime(without) {
      return without ? "timestamp" : "timestamp with time zone";
    }
    timestamp(without) {
      return without ? "timestamp" : "timestamp with time zone";
    }
    bool() {
      this.columnBuilder._modifiers.checkIn = [[0, 1]];
      return "number(1, 0)";
    }
    varchar(length) {
      return `varchar2(${toNumber2(length, 255)})`;
    }
    // Modifiers
    // ------
    comment(comment) {
      const columnName = this.args[0] || this.defaults("columnName");
      this.pushAdditional(function() {
        this.pushQuery(
          `comment on column ${this.tableCompiler.tableName()}.` + this.formatter.wrap(columnName) + " is '" + (comment || "") + "'"
        );
      }, comment);
    }
    checkIn(value) {
      if (value === void 0) {
        return "";
      } else if (value instanceof Raw3) {
        value = value.toQuery();
      } else if (Array.isArray(value)) {
        value = value.map((v) => `'${v}'`).join(", ");
      } else {
        value = `'${value}'`;
      }
      return `check (${this.formatter.wrap(this.args[0])} in (${value}))`;
    }
  }
  ColumnCompiler_Oracle.prototype.tinyint = "smallint";
  ColumnCompiler_Oracle.prototype.smallint = "smallint";
  ColumnCompiler_Oracle.prototype.mediumint = "integer";
  ColumnCompiler_Oracle.prototype.biginteger = "number(20, 0)";
  ColumnCompiler_Oracle.prototype.text = "clob";
  ColumnCompiler_Oracle.prototype.time = "timestamp with time zone";
  ColumnCompiler_Oracle.prototype.bit = "clob";
  ColumnCompiler_Oracle.prototype.json = "clob";
  oracleColumncompiler = ColumnCompiler_Oracle;
  return oracleColumncompiler;
}
var oracleTablecompiler;
var hasRequiredOracleTablecompiler;
function requireOracleTablecompiler() {
  if (hasRequiredOracleTablecompiler) return oracleTablecompiler;
  hasRequiredOracleTablecompiler = 1;
  const utils2 = requireUtils$1();
  const TableCompiler3 = tablecompiler;
  const helpers2 = helpers$7;
  const Trigger = requireTrigger();
  const { isObject: isObject2 } = is;
  class TableCompiler_Oracle extends TableCompiler3 {
    constructor() {
      super(...arguments);
    }
    addColumns(columns, prefix) {
      if (columns.sql.length > 0) {
        prefix = prefix || this.addColumnsPrefix;
        const columnSql = columns.sql;
        const alter = this.lowerCase ? "alter table " : "ALTER TABLE ";
        let sql = `${alter}${this.tableName()} ${prefix}`;
        if (columns.sql.length > 1) {
          sql += `(${columnSql.join(", ")})`;
        } else {
          sql += columnSql.join(", ");
        }
        this.pushQuery({
          sql,
          bindings: columns.bindings
        });
      }
    }
    // Compile a rename column command.
    renameColumn(from, to) {
      const tableName = this.tableName().slice(1, -1);
      const trigger2 = new Trigger(this.client.version);
      return this.pushQuery(
        trigger2.renameColumnTrigger(this.client.logger, tableName, from, to)
      );
    }
    compileAdd(builder2) {
      const table = this.formatter.wrap(builder2);
      const columns = this.prefixArray("add column", this.getColumns(builder2));
      return this.pushQuery({
        sql: `alter table ${table} ${columns.join(", ")}`
      });
    }
    // Adds the "create" query to the query sequence.
    createQuery(columns, ifNot, like) {
      const columnsSql = like && this.tableNameLike() ? " as (select * from " + this.tableNameLike() + " where 0=1)" : " (" + columns.sql.join(", ") + this._addChecks() + ")";
      const sql = `create table ${this.tableName()}${columnsSql}`;
      this.pushQuery({
        // catch "name is already used by an existing object" for workaround for "if not exists"
        sql: ifNot ? utils2.wrapSqlWithCatch(sql, -955) : sql,
        bindings: columns.bindings
      });
      if (this.single.comment) this.comment(this.single.comment);
      if (like) {
        this.addColumns(columns, this.addColumnsPrefix);
      }
    }
    // Compiles the comment on the table.
    comment(comment) {
      this.pushQuery(`comment on table ${this.tableName()} is '${comment}'`);
    }
    dropColumn() {
      const columns = helpers2.normalizeArr.apply(null, arguments);
      this.pushQuery(
        `alter table ${this.tableName()} drop (${this.formatter.columnize(
          columns
        )})`
      );
    }
    _indexCommand(type, tableName, columns) {
      const nameHelper = new utils2.NameHelper(this.client.version);
      return this.formatter.wrap(
        nameHelper.generateCombinedName(
          this.client.logger,
          type,
          tableName,
          columns
        )
      );
    }
    primary(columns, constraintName) {
      let deferrable;
      if (isObject2(constraintName)) {
        ({ constraintName, deferrable } = constraintName);
      }
      deferrable = deferrable ? ` deferrable initially ${deferrable}` : "";
      constraintName = constraintName ? this.formatter.wrap(constraintName) : this.formatter.wrap(`${this.tableNameRaw}_pkey`);
      const primaryCols = columns;
      let incrementsCols = [];
      if (this.grouped.columns) {
        incrementsCols = this._getIncrementsColumnNames();
        if (incrementsCols) {
          incrementsCols.forEach((c) => {
            if (!primaryCols.includes(c)) {
              primaryCols.unshift(c);
            }
          });
        }
      }
      this.pushQuery(
        `alter table ${this.tableName()} add constraint ${constraintName} primary key (${this.formatter.columnize(
          primaryCols
        )})${deferrable}`
      );
    }
    dropPrimary(constraintName) {
      constraintName = constraintName ? this.formatter.wrap(constraintName) : this.formatter.wrap(this.tableNameRaw + "_pkey");
      this.pushQuery(
        `alter table ${this.tableName()} drop constraint ${constraintName}`
      );
    }
    index(columns, indexName) {
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("index", this.tableNameRaw, columns);
      this.pushQuery(
        `create index ${indexName} on ${this.tableName()} (` + this.formatter.columnize(columns) + ")"
      );
    }
    dropIndex(columns, indexName) {
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("index", this.tableNameRaw, columns);
      this.pushQuery(`drop index ${indexName}`);
    }
    unique(columns, indexName) {
      let deferrable;
      if (isObject2(indexName)) {
        ({ indexName, deferrable } = indexName);
      }
      deferrable = deferrable ? ` deferrable initially ${deferrable}` : "";
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("unique", this.tableNameRaw, columns);
      this.pushQuery(
        `alter table ${this.tableName()} add constraint ${indexName} unique (` + this.formatter.columnize(columns) + ")" + deferrable
      );
    }
    dropUnique(columns, indexName) {
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("unique", this.tableNameRaw, columns);
      this.pushQuery(
        `alter table ${this.tableName()} drop constraint ${indexName}`
      );
    }
    dropUniqueIfExists(columns, indexName) {
      throw new Error(".dropUniqueIfExists() is not supported by oracle");
    }
    dropForeign(columns, indexName) {
      indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand("foreign", this.tableNameRaw, columns);
      this.pushQuery(
        `alter table ${this.tableName()} drop constraint ${indexName}`
      );
    }
    dropForeignIfExists() {
      throw new Error(".dropForeignIfExists() is not supported by oracle");
    }
    dropPrimaryIfExists() {
      throw new Error(".dropPrimaryIfExists() is not supported by oracle");
    }
  }
  TableCompiler_Oracle.prototype.addColumnsPrefix = "add ";
  TableCompiler_Oracle.prototype.alterColumnsPrefix = "modify ";
  oracleTablecompiler = TableCompiler_Oracle;
  return oracleTablecompiler;
}
var oracle;
var hasRequiredOracle;
function requireOracle() {
  if (hasRequiredOracle) return oracle;
  hasRequiredOracle = 1;
  const { ReturningHelper } = requireUtils$1();
  const { isConnectionError } = requireUtils$1();
  const Client3 = client;
  const SchemaCompiler3 = requireOracleCompiler();
  const ColumnBuilder3 = requireOracleColumnbuilder();
  const ColumnCompiler3 = requireOracleColumncompiler();
  const TableCompiler3 = requireOracleTablecompiler();
  class Client_Oracle extends Client3 {
    schemaCompiler() {
      return new SchemaCompiler3(this, ...arguments);
    }
    columnBuilder() {
      return new ColumnBuilder3(this, ...arguments);
    }
    columnCompiler() {
      return new ColumnCompiler3(this, ...arguments);
    }
    tableCompiler() {
      return new TableCompiler3(this, ...arguments);
    }
    // Return the database for the Oracle client.
    database() {
      return this.connectionSettings.database;
    }
    // Position the bindings for the query.
    positionBindings(sql) {
      let questionCount = 0;
      return sql.replace(/\?/g, function() {
        questionCount += 1;
        return `:${questionCount}`;
      });
    }
    _stream(connection, obj, stream, options) {
      if (!obj.sql) throw new Error("The query is empty");
      return new Promise(function(resolver, rejecter) {
        stream.on("error", (err) => {
          if (isConnectionError(err)) {
            connection.__knex__disposed = err;
          }
          rejecter(err);
        });
        stream.on("end", resolver);
        const queryStream = connection.queryStream(
          obj.sql,
          obj.bindings,
          options
        );
        queryStream.pipe(stream);
        queryStream.on("error", function(error) {
          rejecter(error);
          stream.emit("error", error);
        });
      });
    }
    // Formatter part
    alias(first2, second) {
      return first2 + " " + second;
    }
    parameter(value, builder2, formatter2) {
      if (value instanceof ReturningHelper && this.driver) {
        value = new this.driver.OutParam(this.driver.OCCISTRING);
      } else if (typeof value === "boolean") {
        value = value ? 1 : 0;
      }
      return super.parameter(value, builder2, formatter2);
    }
  }
  Object.assign(Client_Oracle.prototype, {
    dialect: "oracle",
    driverName: "oracle"
  });
  oracle = Client_Oracle;
  return oracle;
}
var oracleQuerycompiler;
var hasRequiredOracleQuerycompiler;
function requireOracleQuerycompiler() {
  if (hasRequiredOracleQuerycompiler) return oracleQuerycompiler;
  hasRequiredOracleQuerycompiler = 1;
  const compact2 = compact_1;
  const identity2 = identity_1;
  const isEmpty2 = isEmpty_1;
  const isPlainObject2 = isPlainObject_1;
  const reduce2 = reduce_1;
  const QueryCompiler3 = querycompiler;
  const { ReturningHelper } = requireUtils$1();
  const { isString: isString2 } = is;
  const components2 = [
    "comments",
    "columns",
    "join",
    "where",
    "union",
    "group",
    "having",
    "order",
    "lock"
  ];
  class QueryCompiler_Oracle extends QueryCompiler3 {
    constructor(client2, builder2, formatter2) {
      super(client2, builder2, formatter2);
      const { onConflict } = this.single;
      if (onConflict) {
        throw new Error(".onConflict() is not supported for oracledb.");
      }
      this.first = this.select;
    }
    // Compiles an "insert" query, allowing for multiple
    // inserts using a single query statement.
    insert() {
      let insertValues = this.single.insert || [];
      let { returning } = this.single;
      if (!Array.isArray(insertValues) && isPlainObject2(this.single.insert)) {
        insertValues = [this.single.insert];
      }
      if (returning && !Array.isArray(returning)) {
        returning = [returning];
      }
      if (Array.isArray(insertValues) && insertValues.length === 1 && isEmpty2(insertValues[0])) {
        return this._addReturningToSqlAndConvert(
          `insert into ${this.tableName} (${this.formatter.wrap(
            this.single.returning
          )}) values (default)`,
          returning,
          this.tableName
        );
      }
      if (isEmpty2(this.single.insert) && typeof this.single.insert !== "function") {
        return "";
      }
      const insertData = this._prepInsert(insertValues);
      const sql = {};
      if (isString2(insertData)) {
        return this._addReturningToSqlAndConvert(
          `insert into ${this.tableName} ${insertData}`,
          returning
        );
      }
      if (insertData.values.length === 1) {
        return this._addReturningToSqlAndConvert(
          `insert into ${this.tableName} (${this.formatter.columnize(
            insertData.columns
          )}) values (${this.client.parameterize(
            insertData.values[0],
            void 0,
            this.builder,
            this.bindingsHolder
          )})`,
          returning,
          this.tableName
        );
      }
      const insertDefaultsOnly = insertData.columns.length === 0;
      sql.sql = "begin " + insertData.values.map((value) => {
        let returningHelper;
        const parameterizedValues = !insertDefaultsOnly ? this.client.parameterize(
          value,
          this.client.valueForUndefined,
          this.builder,
          this.bindingsHolder
        ) : "";
        const returningValues = Array.isArray(returning) ? returning : [returning];
        let subSql = `insert into ${this.tableName} `;
        if (returning) {
          returningHelper = new ReturningHelper(returningValues.join(":"));
          sql.outParams = (sql.outParams || []).concat(returningHelper);
        }
        if (insertDefaultsOnly) {
          subSql += `(${this.formatter.wrap(
            this.single.returning
          )}) values (default)`;
        } else {
          subSql += `(${this.formatter.columnize(
            insertData.columns
          )}) values (${parameterizedValues})`;
        }
        subSql += returning ? ` returning ROWID into ${this.client.parameter(
          returningHelper,
          this.builder,
          this.bindingsHolder
        )}` : "";
        subSql = this.formatter.client.positionBindings(subSql);
        const parameterizedValuesWithoutDefault = parameterizedValues.replace("DEFAULT, ", "").replace(", DEFAULT", "");
        return `execute immediate '${subSql.replace(/'/g, "''")}` + (parameterizedValuesWithoutDefault || returning ? "' using " : "") + parameterizedValuesWithoutDefault + (parameterizedValuesWithoutDefault && returning ? ", " : "") + (returning ? "out ?" : "") + ";";
      }).join(" ") + "end;";
      if (returning) {
        sql.returning = returning;
        sql.returningSql = `select ${this.formatter.columnize(returning)} from ` + this.tableName + " where ROWID in (" + sql.outParams.map((v, i) => `:${i + 1}`).join(", ") + ") order by case ROWID " + sql.outParams.map((v, i) => `when CHARTOROWID(:${i + 1}) then ${i}`).join(" ") + " end";
      }
      return sql;
    }
    // Update method, including joins, wheres, order & limits.
    update() {
      const updates = this._prepUpdate(this.single.update);
      const where = this.where();
      let { returning } = this.single;
      const sql = `update ${this.tableName} set ` + updates.join(", ") + (where ? ` ${where}` : "");
      if (!returning) {
        return sql;
      }
      if (!Array.isArray(returning)) {
        returning = [returning];
      }
      return this._addReturningToSqlAndConvert(sql, returning, this.tableName);
    }
    // Compiles a `truncate` query.
    truncate() {
      return `truncate table ${this.tableName}`;
    }
    forUpdate() {
      return "for update";
    }
    forShare() {
      this.client.logger.warn(
        "lock for share is not supported by oracle dialect"
      );
      return "";
    }
    // Compiles a `columnInfo` query.
    columnInfo() {
      const column = this.single.columnInfo;
      const table = this.client.customWrapIdentifier(this.single.table, identity2);
      const sql = `select * from xmltable( '/ROWSET/ROW'
      passing dbms_xmlgen.getXMLType('
      select char_col_decl_length, column_name, data_type, data_default, nullable
      from all_tab_columns where table_name = ''${table}'' ')
      columns
      CHAR_COL_DECL_LENGTH number, COLUMN_NAME varchar2(200), DATA_TYPE varchar2(106),
      DATA_DEFAULT clob, NULLABLE varchar2(1))`;
      return {
        sql,
        output(resp) {
          const out = reduce2(
            resp,
            function(columns, val) {
              columns[val.COLUMN_NAME] = {
                type: val.DATA_TYPE,
                defaultValue: val.DATA_DEFAULT,
                maxLength: val.CHAR_COL_DECL_LENGTH,
                nullable: val.NULLABLE === "Y"
              };
              return columns;
            },
            {}
          );
          return column && out[column] || out;
        }
      };
    }
    select() {
      let query = this.with();
      const statements = components2.map((component) => {
        return this[component]();
      });
      query += compact2(statements).join(" ");
      return this._surroundQueryWithLimitAndOffset(query);
    }
    aggregate(stmt) {
      return this._aggregate(stmt, { aliasSeparator: " " });
    }
    // for single commands only
    _addReturningToSqlAndConvert(sql, returning, tableName) {
      const res = {
        sql
      };
      if (!returning) {
        return res;
      }
      const returningValues = Array.isArray(returning) ? returning : [returning];
      const returningHelper = new ReturningHelper(returningValues.join(":"));
      res.sql = sql + " returning ROWID into " + this.client.parameter(returningHelper, this.builder, this.bindingsHolder);
      res.returningSql = `select ${this.formatter.columnize(
        returning
      )} from ${tableName} where ROWID = :1`;
      res.outParams = [returningHelper];
      res.returning = returning;
      return res;
    }
    _surroundQueryWithLimitAndOffset(query) {
      let { limit } = this.single;
      const { offset } = this.single;
      const hasLimit = limit || limit === 0 || limit === "0";
      limit = +limit;
      if (!hasLimit && !offset) return query;
      query = query || "";
      if (hasLimit && !offset) {
        return `select * from (${query}) where rownum <= ${this._getValueOrParameterFromAttribute(
          "limit",
          limit
        )}`;
      }
      const endRow = +offset + (hasLimit ? limit : 1e13);
      return "select * from (select row_.*, ROWNUM rownum_ from (" + query + ") row_ where rownum <= " + (this.single.skipBinding["offset"] ? endRow : this.client.parameter(endRow, this.builder, this.bindingsHolder)) + ") where rownum_ > " + this._getValueOrParameterFromAttribute("offset", offset);
    }
  }
  oracleQuerycompiler = QueryCompiler_Oracle;
  return oracleQuerycompiler;
}
var utils;
var hasRequiredUtils;
function requireUtils() {
  if (hasRequiredUtils) return utils;
  hasRequiredUtils = 1;
  const Utils = requireUtils$1();
  const { promisify: promisify2 } = require$$3;
  const stream = require$$2;
  function BlobHelper(columnName, value) {
    this.columnName = columnName;
    this.value = value;
    this.returning = false;
  }
  BlobHelper.prototype.toString = function() {
    return "[object BlobHelper:" + this.columnName + "]";
  };
  function readStream(stream2, type) {
    return new Promise((resolve, reject2) => {
      let data = type === "string" ? "" : Buffer.alloc(0);
      stream2.on("error", function(err) {
        reject2(err);
      });
      stream2.on("data", function(chunk2) {
        if (type === "string") {
          data += chunk2;
        } else {
          data = Buffer.concat([data, chunk2]);
        }
      });
      stream2.on("end", function() {
        resolve(data);
      });
    });
  }
  const lobProcessing = function(stream2) {
    const oracledb2 = require$$3$1;
    let type;
    if (stream2.type) {
      if (stream2.type === oracledb2.BLOB) {
        type = "buffer";
      } else if (stream2.type === oracledb2.CLOB) {
        type = "string";
      }
    } else if (stream2.iLob) {
      if (stream2.iLob.type === oracledb2.CLOB) {
        type = "string";
      } else if (stream2.iLob.type === oracledb2.BLOB) {
        type = "buffer";
      }
    } else {
      throw new Error("Unrecognized oracledb lob stream type");
    }
    if (type === "string") {
      stream2.setEncoding("utf-8");
    }
    return readStream(stream2, type);
  };
  function monkeyPatchConnection(connection, client2) {
    if (connection.executeAsync) {
      return;
    }
    connection.commitAsync = function() {
      return new Promise((commitResolve, commitReject) => {
        this.commit(function(err) {
          if (err) {
            return commitReject(err);
          }
          commitResolve();
        });
      });
    };
    connection.rollbackAsync = function() {
      return new Promise((rollbackResolve, rollbackReject) => {
        this.rollback(function(err) {
          if (err) {
            return rollbackReject(err);
          }
          rollbackResolve();
        });
      });
    };
    const fetchAsync = promisify2(function(sql, bindParams, options, cb) {
      options = options || {};
      options.outFormat = client2.driver.OUT_FORMAT_OBJECT || client2.driver.OBJECT;
      if (!options.outFormat) {
        throw new Error("not found oracledb.outFormat constants");
      }
      if (options.resultSet) {
        connection.execute(
          sql,
          bindParams || [],
          options,
          function(err, result) {
            if (err) {
              if (Utils.isConnectionError(err)) {
                connection.close().catch(function(err2) {
                });
                connection.__knex__disposed = err;
              }
              return cb(err);
            }
            const fetchResult = { rows: [], resultSet: result.resultSet };
            const numRows = 100;
            const fetchRowsFromRS = function(connection2, resultSet, numRows2) {
              resultSet.getRows(numRows2, function(err2, rows) {
                if (err2) {
                  if (Utils.isConnectionError(err2)) {
                    connection2.close().catch(function(err3) {
                    });
                    connection2.__knex__disposed = err2;
                  }
                  resultSet.close(function() {
                    return cb(err2);
                  });
                } else if (rows.length === 0) {
                  return cb(null, fetchResult);
                } else if (rows.length > 0) {
                  if (rows.length === numRows2) {
                    fetchResult.rows = fetchResult.rows.concat(rows);
                    fetchRowsFromRS(connection2, resultSet, numRows2);
                  } else {
                    fetchResult.rows = fetchResult.rows.concat(rows);
                    return cb(null, fetchResult);
                  }
                }
              });
            };
            fetchRowsFromRS(connection, result.resultSet, numRows);
          }
        );
      } else {
        connection.execute(
          sql,
          bindParams || [],
          options,
          function(err, result) {
            if (err) {
              if (Utils.isConnectionError(err)) {
                connection.close().catch(function(err2) {
                });
                connection.__knex__disposed = err;
              }
              return cb(err);
            }
            return cb(null, result);
          }
        );
      }
    });
    connection.executeAsync = function(sql, bindParams, options) {
      return fetchAsync(sql, bindParams, options).then(async (results) => {
        const closeResultSet = () => {
          return results.resultSet ? promisify2(results.resultSet.close).call(results.resultSet) : Promise.resolve();
        };
        const lobs = [];
        if (results.rows) {
          if (Array.isArray(results.rows)) {
            for (let i = 0; i < results.rows.length; i++) {
              const row = results.rows[i];
              for (const column in row) {
                if (row[column] instanceof stream.Readable) {
                  lobs.push({ index: i, key: column, stream: row[column] });
                }
              }
            }
          }
        }
        try {
          for (const lob of lobs) {
            results.rows[lob.index][lob.key] = await lobProcessing(lob.stream);
          }
        } catch (e) {
          await closeResultSet().catch(() => {
          });
          throw e;
        }
        await closeResultSet();
        return results;
      });
    };
  }
  Utils.BlobHelper = BlobHelper;
  Utils.monkeyPatchConnection = monkeyPatchConnection;
  utils = Utils;
  return utils;
}
var oracledbQuerycompiler;
var hasRequiredOracledbQuerycompiler;
function requireOracledbQuerycompiler() {
  if (hasRequiredOracledbQuerycompiler) return oracledbQuerycompiler;
  hasRequiredOracledbQuerycompiler = 1;
  const clone2 = clone_1;
  const each2 = each$2;
  const isEmpty2 = isEmpty_1;
  const isPlainObject2 = isPlainObject_1;
  const Oracle_Compiler = requireOracleQuerycompiler();
  const ReturningHelper = requireUtils().ReturningHelper;
  const BlobHelper = requireUtils().BlobHelper;
  const { isString: isString2 } = is;
  const {
    columnize: columnize_2
  } = wrappingFormatter;
  class Oracledb_Compiler extends Oracle_Compiler {
    // Compiles an "insert" query, allowing for multiple
    // inserts using a single query statement.
    insert() {
      const self2 = this;
      const outBindPrep = this._prepOutbindings(
        this.single.insert,
        this.single.returning
      );
      const outBinding = outBindPrep.outBinding;
      const returning = outBindPrep.returning;
      const insertValues = outBindPrep.values;
      if (Array.isArray(insertValues) && insertValues.length === 1 && isEmpty2(insertValues[0])) {
        const returningFragment = this.single.returning ? " (" + this.formatter.wrap(this.single.returning) + ")" : "";
        return this._addReturningToSqlAndConvert(
          "insert into " + this.tableName + returningFragment + " values (default)",
          outBinding[0],
          this.tableName,
          returning
        );
      }
      if (isEmpty2(this.single.insert) && typeof this.single.insert !== "function") {
        return "";
      }
      const insertData = this._prepInsert(insertValues);
      const sql = {};
      if (isString2(insertData)) {
        return this._addReturningToSqlAndConvert(
          "insert into " + this.tableName + " " + insertData,
          outBinding[0],
          this.tableName,
          returning
        );
      }
      if (insertData.values.length === 1) {
        return this._addReturningToSqlAndConvert(
          "insert into " + this.tableName + " (" + this.formatter.columnize(insertData.columns) + ") values (" + this.client.parameterize(
            insertData.values[0],
            void 0,
            this.builder,
            this.bindingsHolder
          ) + ")",
          outBinding[0],
          this.tableName,
          returning
        );
      }
      const insertDefaultsOnly = insertData.columns.length === 0;
      sql.returning = returning;
      sql.sql = "begin " + insertData.values.map(function(value, index) {
        const parameterizedValues = !insertDefaultsOnly ? self2.client.parameterize(
          value,
          self2.client.valueForUndefined,
          self2.builder,
          self2.bindingsHolder
        ) : "";
        let subSql = "insert into " + self2.tableName;
        if (insertDefaultsOnly) {
          subSql += " (" + self2.formatter.wrap(self2.single.returning) + ") values (default)";
        } else {
          subSql += " (" + self2.formatter.columnize(insertData.columns) + ") values (" + parameterizedValues + ")";
        }
        let returningClause = "";
        let intoClause = "";
        let usingClause = "";
        let outClause = "";
        each2(value, function(val) {
          if (!(val instanceof BlobHelper)) {
            usingClause += " ?,";
          }
        });
        usingClause = usingClause.slice(0, -1);
        outBinding[index].forEach(function(ret) {
          const columnName = ret.columnName || ret;
          returningClause += self2.formatter.wrap(columnName) + ",";
          intoClause += " ?,";
          outClause += " out ?,";
          if (ret instanceof BlobHelper) {
            return self2.formatter.bindings.push(ret);
          }
          self2.formatter.bindings.push(new ReturningHelper(columnName));
        });
        returningClause = returningClause.slice(0, -1);
        intoClause = intoClause.slice(0, -1);
        outClause = outClause.slice(0, -1);
        if (returningClause && intoClause) {
          subSql += " returning " + returningClause + " into" + intoClause;
        }
        subSql = self2.formatter.client.positionBindings(subSql);
        const parameterizedValuesWithoutDefaultAndBlob = parameterizedValues.replace(/DEFAULT, /g, "").replace(/, DEFAULT/g, "").replace("EMPTY_BLOB(), ", "").replace(", EMPTY_BLOB()", "");
        return "execute immediate '" + subSql.replace(/'/g, "''") + (parameterizedValuesWithoutDefaultAndBlob || value ? "' using " : "") + parameterizedValuesWithoutDefaultAndBlob + (parameterizedValuesWithoutDefaultAndBlob && outClause ? "," : "") + outClause + ";";
      }).join(" ") + "end;";
      sql.outBinding = outBinding;
      if (returning[0] === "*") {
        sql.returningSql = function() {
          return "select * from " + self2.tableName + " where ROWID in (" + this.outBinding.map(function(v, i) {
            return ":" + (i + 1);
          }).join(", ") + ") order by case ROWID " + this.outBinding.map(function(v, i) {
            return "when CHARTOROWID(:" + (i + 1) + ") then " + i;
          }).join(" ") + " end";
        };
      }
      return sql;
    }
    with() {
      const undoList = [];
      if (this.grouped.with) {
        for (const stmt of this.grouped.with) {
          if (stmt.recursive) {
            undoList.push(stmt);
            stmt.recursive = false;
          }
        }
      }
      const result = super.with();
      for (const stmt of undoList) {
        stmt.recursive = true;
      }
      return result;
    }
    _addReturningToSqlAndConvert(sql, outBinding, tableName, returning) {
      const self2 = this;
      const res = {
        sql
      };
      if (!outBinding) {
        return res;
      }
      const returningValues = Array.isArray(outBinding) ? outBinding : [outBinding];
      let returningClause = "";
      let intoClause = "";
      returningValues.forEach(function(ret) {
        const columnName = ret.columnName || ret;
        returningClause += self2.formatter.wrap(columnName) + ",";
        intoClause += "?,";
        if (ret instanceof BlobHelper) {
          return self2.formatter.bindings.push(ret);
        }
        self2.formatter.bindings.push(new ReturningHelper(columnName));
      });
      res.sql = sql;
      returningClause = returningClause.slice(0, -1);
      intoClause = intoClause.slice(0, -1);
      if (returningClause && intoClause) {
        res.sql += " returning " + returningClause + " into " + intoClause;
      }
      res.outBinding = [outBinding];
      if (returning[0] === "*") {
        res.returningSql = function() {
          return "select * from " + self2.tableName + " where ROWID = :1";
        };
      }
      res.returning = returning;
      return res;
    }
    _prepOutbindings(paramValues, paramReturning) {
      const result = {};
      let params = paramValues || [];
      let returning = paramReturning || [];
      if (!Array.isArray(params) && isPlainObject2(paramValues)) {
        params = [params];
      }
      if (returning && !Array.isArray(returning)) {
        returning = [returning];
      }
      const outBinding = [];
      each2(params, function(values2, index) {
        if (returning[0] === "*") {
          outBinding[index] = ["ROWID"];
        } else {
          outBinding[index] = clone2(returning);
        }
        each2(values2, function(value, key) {
          if (value instanceof Buffer) {
            values2[key] = new BlobHelper(key, value);
            const blobIndex = outBinding[index].indexOf(key);
            if (blobIndex >= 0) {
              outBinding[index].splice(blobIndex, 1);
              values2[key].returning = true;
            }
            outBinding[index].push(values2[key]);
          }
          if (value === void 0) {
            delete params[index][key];
          }
        });
      });
      result.returning = returning;
      result.outBinding = outBinding;
      result.values = params;
      return result;
    }
    _groupOrder(item, type) {
      return super._groupOrderNulls(item, type);
    }
    update() {
      const self2 = this;
      const sql = {};
      const outBindPrep = this._prepOutbindings(
        this.single.update || this.single.counter,
        this.single.returning
      );
      const outBinding = outBindPrep.outBinding;
      const returning = outBindPrep.returning;
      const updates = this._prepUpdate(this.single.update);
      const where = this.where();
      let returningClause = "";
      let intoClause = "";
      if (isEmpty2(updates) && typeof this.single.update !== "function") {
        return "";
      }
      outBinding.forEach(function(out) {
        out.forEach(function(ret) {
          const columnName = ret.columnName || ret;
          returningClause += self2.formatter.wrap(columnName) + ",";
          intoClause += " ?,";
          if (ret instanceof BlobHelper) {
            return self2.formatter.bindings.push(ret);
          }
          self2.formatter.bindings.push(new ReturningHelper(columnName));
        });
      });
      returningClause = returningClause.slice(0, -1);
      intoClause = intoClause.slice(0, -1);
      sql.outBinding = outBinding;
      sql.returning = returning;
      sql.sql = "update " + this.tableName + " set " + updates.join(", ") + (where ? " " + where : "");
      if (outBinding.length && !isEmpty2(outBinding[0])) {
        sql.sql += " returning " + returningClause + " into" + intoClause;
      }
      if (returning[0] === "*") {
        sql.returningSql = function() {
          let sql2 = "select * from " + self2.tableName;
          const modifiedRowsCount = this.rowsAffected.length || this.rowsAffected;
          let returningSqlIn = " where ROWID in (";
          let returningSqlOrderBy = ") order by case ROWID ";
          for (let i = 0; i < modifiedRowsCount; i++) {
            if (this.returning[0] === "*") {
              returningSqlIn += ":" + (i + 1) + ", ";
              returningSqlOrderBy += "when CHARTOROWID(:" + (i + 1) + ") then " + i + " ";
            }
          }
          if (this.returning[0] === "*") {
            this.returning = this.returning.slice(0, -1);
            returningSqlIn = returningSqlIn.slice(0, -2);
            returningSqlOrderBy = returningSqlOrderBy.slice(0, -1);
          }
          return sql2 += returningSqlIn + returningSqlOrderBy + " end";
        };
      }
      return sql;
    }
    _jsonPathWrap(extraction) {
      return `'${extraction.path || extraction[1]}'`;
    }
    // Json functions
    jsonExtract(params) {
      return this._jsonExtract(
        params.singleValue ? "json_value" : "json_query",
        params
      );
    }
    jsonSet(params) {
      return `json_transform(${columnize_2(
        params.column,
        this.builder,
        this.client,
        this.bindingsHolder
      )}, set ${this.client.parameter(
        params.path,
        this.builder,
        this.bindingsHolder
      )} = ${this.client.parameter(
        params.value,
        this.builder,
        this.bindingsHolder
      )})`;
    }
    jsonInsert(params) {
      return `json_transform(${columnize_2(
        params.column,
        this.builder,
        this.client,
        this.bindingsHolder
      )}, insert ${this.client.parameter(
        params.path,
        this.builder,
        this.bindingsHolder
      )} = ${this.client.parameter(
        params.value,
        this.builder,
        this.bindingsHolder
      )})`;
    }
    jsonRemove(params) {
      const jsonCol = `json_transform(${columnize_2(
        params.column,
        this.builder,
        this.client,
        this.bindingsHolder
      )}, remove ${this.client.parameter(
        params.path,
        this.builder,
        this.bindingsHolder
      )})`;
      return params.alias ? this.client.alias(jsonCol, this.formatter.wrap(params.alias)) : jsonCol;
    }
    whereJsonPath(statement) {
      return this._whereJsonPath("json_value", statement);
    }
    whereJsonSupersetOf(statement) {
      throw new Error(
        "Json superset where clause not actually supported by Oracle"
      );
    }
    whereJsonSubsetOf(statement) {
      throw new Error(
        "Json subset where clause not actually supported by Oracle"
      );
    }
    onJsonPathEquals(clause) {
      return this._onJsonPathEquals("json_value", clause);
    }
  }
  oracledbQuerycompiler = Oracledb_Compiler;
  return oracledbQuerycompiler;
}
var oracledbTablecompiler;
var hasRequiredOracledbTablecompiler;
function requireOracledbTablecompiler() {
  if (hasRequiredOracledbTablecompiler) return oracledbTablecompiler;
  hasRequiredOracledbTablecompiler = 1;
  const TableCompiler_Oracle = requireOracleTablecompiler();
  class TableCompiler_Oracledb extends TableCompiler_Oracle {
    constructor(client2, tableBuilder) {
      super(client2, tableBuilder);
    }
    _setNullableState(column, isNullable) {
      const nullability = isNullable ? "NULL" : "NOT NULL";
      const sql = `alter table ${this.tableName()} modify (${this.formatter.wrap(
        column
      )} ${nullability})`;
      return this.pushQuery({
        sql
      });
    }
  }
  oracledbTablecompiler = TableCompiler_Oracledb;
  return oracledbTablecompiler;
}
var oracledbColumncompiler;
var hasRequiredOracledbColumncompiler;
function requireOracledbColumncompiler() {
  if (hasRequiredOracledbColumncompiler) return oracledbColumncompiler;
  hasRequiredOracledbColumncompiler = 1;
  const ColumnCompiler_Oracle = requireOracleColumncompiler();
  const { isObject: isObject2 } = is;
  class ColumnCompiler_Oracledb extends ColumnCompiler_Oracle {
    constructor() {
      super(...arguments);
      this.modifiers = ["defaultTo", "nullable", "comment", "checkJson"];
      this._addCheckModifiers();
    }
    datetime(withoutTz) {
      let useTz;
      if (isObject2(withoutTz)) {
        ({ useTz } = withoutTz);
      } else {
        useTz = !withoutTz;
      }
      return useTz ? "timestamp with local time zone" : "timestamp";
    }
    timestamp(withoutTz) {
      let useTz;
      if (isObject2(withoutTz)) {
        ({ useTz } = withoutTz);
      } else {
        useTz = !withoutTz;
      }
      return useTz ? "timestamp with local time zone" : "timestamp";
    }
    checkRegex(regex, constraintName) {
      return this._check(
        `REGEXP_LIKE(${this.formatter.wrap(
          this.getColumnName()
        )},${this.client._escapeBinding(regex)})`,
        constraintName
      );
    }
    json() {
      this.columnBuilder._modifiers.checkJson = [
        this.formatter.columnize(this.getColumnName())
      ];
      return "varchar2(4000)";
    }
    jsonb() {
      return this.json();
    }
    checkJson(column) {
      return `check (${column} is json)`;
    }
  }
  ColumnCompiler_Oracledb.prototype.time = "timestamp with local time zone";
  ColumnCompiler_Oracledb.prototype.uuid = ({ useBinaryUuid = false } = {}) => useBinaryUuid ? "raw(16)" : "char(36)";
  oracledbColumncompiler = ColumnCompiler_Oracledb;
  return oracledbColumncompiler;
}
var oracledbViewcompiler;
var hasRequiredOracledbViewcompiler;
function requireOracledbViewcompiler() {
  if (hasRequiredOracledbViewcompiler) return oracledbViewcompiler;
  hasRequiredOracledbViewcompiler = 1;
  const ViewCompiler3 = viewcompiler;
  class ViewCompiler_Oracledb extends ViewCompiler3 {
    constructor(client2, viewCompiler) {
      super(client2, viewCompiler);
    }
    createOrReplace() {
      this.createQuery(this.columns, this.selectQuery, false, true);
    }
    createMaterializedView() {
      this.createQuery(this.columns, this.selectQuery, true);
    }
  }
  oracledbViewcompiler = ViewCompiler_Oracledb;
  return oracledbViewcompiler;
}
var oracledbViewbuilder;
var hasRequiredOracledbViewbuilder;
function requireOracledbViewbuilder() {
  if (hasRequiredOracledbViewbuilder) return oracledbViewbuilder;
  hasRequiredOracledbViewbuilder = 1;
  const ViewBuilder3 = viewbuilder;
  class ViewBuilder_Oracledb extends ViewBuilder3 {
    constructor() {
      super(...arguments);
    }
    checkOption() {
      this._single.checkOption = "default_option";
    }
  }
  oracledbViewbuilder = ViewBuilder_Oracledb;
  return oracledbViewbuilder;
}
var transaction$1;
var hasRequiredTransaction$1;
function requireTransaction$1() {
  if (hasRequiredTransaction$1) return transaction$1;
  hasRequiredTransaction$1 = 1;
  const Transaction3 = transaction$6;
  const { timeout: timeout2, KnexTimeoutError: KnexTimeoutError3 } = timeout$3;
  const debugTx = srcExports("knex:tx");
  transaction$1 = class Oracle_Transaction extends Transaction3 {
    // disable autocommit to allow correct behavior (default is true)
    begin(conn) {
      if (this.isolationLevel) {
        {
          this.client.logger.warn(
            "Transaction isolation is not currently supported for Oracle"
          );
        }
      }
      return Promise.resolve();
    }
    async commit(conn, value) {
      this._completed = true;
      try {
        await conn.commitAsync();
        this._resolver(value);
      } catch (err) {
        this._rejecter(err);
      }
    }
    release(conn, value) {
      return this._resolver(value);
    }
    rollback(conn, err) {
      this._completed = true;
      debugTx("%s: rolling back", this.txid);
      return timeout2(conn.rollbackAsync(), 5e3).catch((e) => {
        if (!(e instanceof KnexTimeoutError3)) {
          return Promise.reject(e);
        }
        this._rejecter(e);
      }).then(() => {
        if (err === void 0) {
          if (this.doNotRejectOnRollback) {
            this._resolver();
            return;
          }
          err = new Error(`Transaction rejected with non-error: ${err}`);
        }
        this._rejecter(err);
      });
    }
    savepoint(conn) {
      return this.query(conn, `SAVEPOINT ${this.txid}`);
    }
    async acquireConnection(config, cb) {
      const configConnection = config && config.connection;
      const connection = configConnection || await this.client.acquireConnection();
      try {
        connection.__knexTxId = this.txid;
        connection.isTransaction = true;
        return await cb(connection);
      } finally {
        debugTx("%s: releasing connection", this.txid);
        connection.isTransaction = false;
        try {
          await connection.commitAsync();
        } catch (err) {
          this._rejecter(err);
        } finally {
          if (!configConnection) {
            await this.client.releaseConnection(connection);
          } else {
            debugTx("%s: not releasing external connection", this.txid);
          }
        }
      }
    }
  };
  return transaction$1;
}
var oracledb;
var hasRequiredOracledb;
function requireOracledb() {
  if (hasRequiredOracledb) return oracledb;
  hasRequiredOracledb = 1;
  const each2 = each$2;
  const flatten2 = flatten_1;
  const isEmpty2 = isEmpty_1;
  const map2 = map_1;
  const uniqueId2 = uniqueId_1;
  const Formatter3 = formatter;
  const QueryCompiler3 = requireOracledbQuerycompiler();
  const TableCompiler3 = requireOracledbTablecompiler();
  const ColumnCompiler3 = requireOracledbColumncompiler();
  const {
    BlobHelper,
    ReturningHelper,
    monkeyPatchConnection
  } = requireUtils();
  const ViewCompiler3 = requireOracledbViewcompiler();
  const ViewBuilder3 = requireOracledbViewbuilder();
  const Transaction3 = requireTransaction$1();
  const Client_Oracle = requireOracle();
  const { isString: isString2 } = is;
  const { outputQuery: outputQuery2, unwrapRaw: unwrapRaw2 } = wrappingFormatter;
  const { compileCallback: compileCallback2 } = formatterUtils;
  class Client_Oracledb extends Client_Oracle {
    constructor(config) {
      super(config);
      if (this.version) {
        this.version = parseVersion(this.version);
      }
      if (this.driver) {
        process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || 1;
        process.env.UV_THREADPOOL_SIZE = parseInt(process.env.UV_THREADPOOL_SIZE) + this.driver.poolMax;
      }
    }
    _driver() {
      const client2 = this;
      const oracledb2 = require$$3$1;
      client2.fetchAsString = [];
      if (this.config.fetchAsString && Array.isArray(this.config.fetchAsString)) {
        this.config.fetchAsString.forEach(function(type) {
          if (!isString2(type)) return;
          type = type.toUpperCase();
          if (oracledb2[type]) {
            if (type !== "NUMBER" && type !== "DATE" && type !== "CLOB" && type !== "BUFFER") {
              this.logger.warn(
                'Only "date", "number", "clob" and "buffer" are supported for fetchAsString'
              );
            }
            client2.fetchAsString.push(oracledb2[type]);
          }
        });
      }
      return oracledb2;
    }
    queryCompiler(builder2, formatter2) {
      return new QueryCompiler3(this, builder2, formatter2);
    }
    tableCompiler() {
      return new TableCompiler3(this, ...arguments);
    }
    columnCompiler() {
      return new ColumnCompiler3(this, ...arguments);
    }
    viewBuilder() {
      return new ViewBuilder3(this, ...arguments);
    }
    viewCompiler() {
      return new ViewCompiler3(this, ...arguments);
    }
    formatter(builder2) {
      return new Formatter3(this, builder2);
    }
    transaction() {
      return new Transaction3(this, ...arguments);
    }
    prepBindings(bindings2) {
      return map2(bindings2, (value) => {
        if (value instanceof BlobHelper && this.driver) {
          return { type: this.driver.BLOB, dir: this.driver.BIND_OUT };
        } else if (value instanceof ReturningHelper && this.driver) {
          return { type: this.driver.STRING, dir: this.driver.BIND_OUT };
        } else if (typeof value === "boolean") {
          return value ? 1 : 0;
        }
        return value;
      });
    }
    // Checks whether a value is a function... if it is, we compile it
    // otherwise we check whether it's a raw
    parameter(value, builder2, formatter2) {
      if (typeof value === "function") {
        return outputQuery2(
          compileCallback2(value, void 0, this, formatter2),
          true,
          builder2,
          this
        );
      } else if (value instanceof BlobHelper) {
        formatter2.bindings.push(value.value);
        return "?";
      }
      return unwrapRaw2(value, true, builder2, this, formatter2) || "?";
    }
    // Get a raw connection, called by the `pool` whenever a new
    // connection needs to be added to the pool.
    acquireRawConnection() {
      return new Promise((resolver, rejecter) => {
        const oracleDbConfig = this.connectionSettings.externalAuth ? { externalAuth: this.connectionSettings.externalAuth } : {
          user: this.connectionSettings.user,
          password: this.connectionSettings.password
        };
        oracleDbConfig.connectString = resolveConnectString(
          this.connectionSettings
        );
        if (this.connectionSettings.prefetchRowCount) {
          oracleDbConfig.prefetchRows = this.connectionSettings.prefetchRowCount;
        }
        if (this.connectionSettings.stmtCacheSize !== void 0) {
          oracleDbConfig.stmtCacheSize = this.connectionSettings.stmtCacheSize;
        }
        this.driver.fetchAsString = this.fetchAsString;
        this.driver.getConnection(oracleDbConfig, (err, connection) => {
          if (err) {
            return rejecter(err);
          }
          monkeyPatchConnection(connection, this);
          resolver(connection);
        });
      });
    }
    // Used to explicitly close a connection, called internally by the pool
    // when a connection times out or the pool is shutdown.
    /**
     * @param {import('oracledb').Connection} connection
     */
    destroyRawConnection(connection) {
      return connection.release({ drop: true });
    }
    // Wraps a native oracledb pool with the interface knex expects from this.pool.
    /**
     * @param {import('oracledb').Pool} nativePool
     */
    wrapNativePool(nativePool) {
      const client2 = this;
      return {
        acquire() {
          return {
            promise: nativePool.getConnection().then((connection) => {
              connection.__knexUid = uniqueId2("__knexUid");
              monkeyPatchConnection(connection, client2);
              return connection;
            })
          };
        },
        /**
         * @param {import('oracledb').Connection} connection
         */
        release(connection) {
          if (typeof connection.close === "function") {
            const opts = connection.__knex__disposed ? { drop: true } : {};
            connection.close(opts, (err) => {
              if (err) {
                console.error(`Error closing oracle connection`, err);
              }
            });
            return true;
          }
          return false;
        },
        destroy() {
          return Promise.resolve();
        }
      };
    }
    // Handle oracle version resolution on acquiring connection from pool instead of connection creation.
    // Must do this here since only the client used to create a connection would be updated with version
    // information on creation. Poses a problem when knex instance is cloned since instances share the
    // connection pool while having their own client instances.
    async acquireConnection() {
      const connection = await super.acquireConnection();
      this.checkVersion(connection);
      return connection;
    }
    // In Oracle, we need to check the version to dynamically determine
    // certain limits. If user did not specify a version, get it from the connection.
    checkVersion(connection) {
      if (this.version) {
        return this.version;
      }
      const detectedVersion = parseVersion(connection.oracleServerVersionString);
      if (!detectedVersion) {
        throw new Error(
          this.version === null ? "Invalid Oracledb version number format passed to knex. Unable to successfully auto-detect as fallback. Please specify a valid oracledb version." : "Unable to detect Oracledb version number automatically. Please specify the version in knex configuration."
        );
      }
      this.version = detectedVersion;
      return detectedVersion;
    }
    // Runs the query on the specified connection, providing the bindings
    // and any other necessary prep work.
    _query(connection, obj) {
      if (!obj.sql) throw new Error("The query is empty");
      const options = Object.assign({}, obj.options, { autoCommit: false });
      if (obj.method === "select") {
        options.resultSet = true;
      }
      return connection.executeAsync(obj.sql, obj.bindings, options).then(async function(response) {
        let outBinds = flatten2(response.outBinds);
        obj.response = response.rows || [];
        obj.rowsAffected = response.rows ? response.rows.rowsAffected : response.rowsAffected;
        if (obj.method === "raw" && outBinds.length > 0) {
          return {
            response: outBinds
          };
        }
        if (obj.method === "update") {
          const modifiedRowsCount = obj.rowsAffected.length || obj.rowsAffected;
          const updatedObjOutBinding = [];
          const updatedOutBinds = [];
          const updateOutBinds = (i) => function(value, index) {
            const OutBindsOffset = index * modifiedRowsCount;
            updatedOutBinds.push(outBinds[i + OutBindsOffset]);
          };
          for (let i = 0; i < modifiedRowsCount; i++) {
            updatedObjOutBinding.push(obj.outBinding[0]);
            each2(obj.outBinding[0], updateOutBinds(i));
          }
          outBinds = updatedOutBinds;
          obj.outBinding = updatedObjOutBinding;
        }
        if (!obj.returning && outBinds.length === 0) {
          if (!connection.isTransaction) {
            await connection.commitAsync();
          }
          return obj;
        }
        const rowIds = [];
        let offset = 0;
        for (let line = 0; line < obj.outBinding.length; line++) {
          const ret = obj.outBinding[line];
          offset = offset + (obj.outBinding[line - 1] ? obj.outBinding[line - 1].length : 0);
          for (let index = 0; index < ret.length; index++) {
            const out = ret[index];
            await new Promise(function(bindResolver, bindRejecter) {
              if (out instanceof BlobHelper) {
                const blob = outBinds[index + offset];
                if (out.returning) {
                  obj.response[line] = obj.response[line] || {};
                  obj.response[line][out.columnName] = out.value;
                }
                blob.on("error", function(err) {
                  bindRejecter(err);
                });
                blob.on("finish", function() {
                  bindResolver();
                });
                blob.write(out.value);
                blob.end();
              } else if (obj.outBinding[line][index] === "ROWID") {
                rowIds.push(outBinds[index + offset]);
                bindResolver();
              } else {
                obj.response[line] = obj.response[line] || {};
                obj.response[line][out] = outBinds[index + offset];
                bindResolver();
              }
            });
          }
        }
        if (obj.returningSql) {
          const response2 = await connection.executeAsync(
            obj.returningSql(),
            rowIds,
            { resultSet: true }
          );
          obj.response = response2.rows;
        }
        if (connection.isTransaction) {
          return obj;
        }
        await connection.commitAsync();
        return obj;
      });
    }
    // Process the response as returned from the query.
    processResponse(obj, runner2) {
      const { response } = obj;
      if (obj.output) {
        return obj.output.call(runner2, response);
      }
      switch (obj.method) {
        case "select":
          return response;
        case "first":
          return response[0];
        case "pluck":
          return map2(response, obj.pluck);
        case "insert":
        case "del":
        case "update":
        case "counter":
          if (obj.returning && !isEmpty2(obj.returning) || obj.returningSql) {
            return response;
          } else if (obj.rowsAffected !== void 0) {
            return obj.rowsAffected;
          } else {
            return 1;
          }
        default:
          return response;
      }
    }
    processPassedConnection(connection) {
      this.checkVersion(connection);
      monkeyPatchConnection(connection, this);
    }
  }
  Client_Oracledb.prototype.driverName = "oracledb";
  function parseVersion(versionString) {
    try {
      const versionParts = versionString.split(".").slice(0, 2);
      versionParts.forEach((versionPart, idx) => {
        versionParts[idx] = versionPart.replace(/\D$/, "");
      });
      const version = versionParts.join(".");
      return version.match(/^\d+\.?\d*$/) ? version : null;
    } catch (err) {
      return null;
    }
  }
  function resolveConnectString(connectionSettings) {
    if (connectionSettings.connectString) {
      return connectionSettings.connectString;
    }
    if (!connectionSettings.port) {
      return connectionSettings.host + "/" + connectionSettings.database;
    }
    return connectionSettings.host + ":" + connectionSettings.port + "/" + connectionSettings.database;
  }
  oracledb = Client_Oracledb;
  return oracledb;
}
var pgnative;
var hasRequiredPgnative;
function requirePgnative() {
  if (hasRequiredPgnative) return pgnative;
  hasRequiredPgnative = 1;
  const Client_PG = requirePostgres();
  class Client_PgNative extends Client_PG {
    constructor(...args) {
      super(...args);
      this.driverName = "pgnative";
      this.canCancelQuery = true;
    }
    _driver() {
      return require$$15.native;
    }
    _stream(connection, obj, stream, options) {
      if (!obj.sql) throw new Error("The query is empty");
      const client2 = this;
      return new Promise((resolver, rejecter) => {
        stream.on("error", rejecter);
        stream.on("end", resolver);
        return client2._query(connection, obj).then((obj2) => obj2.response).then(({ rows }) => rows.forEach((row) => stream.write(row))).catch(function(err) {
          stream.emit("error", err);
        }).then(function() {
          stream.end();
        });
      });
    }
    async cancelQuery(connectionToKill) {
      try {
        return await this._wrappedCancelQueryCall(null, connectionToKill);
      } catch (err) {
        this.logger.warn(`Connection Error: ${err}`);
        throw err;
      }
    }
    _wrappedCancelQueryCall(emptyConnection, connectionToKill) {
      return new Promise(function(resolve, reject2) {
        connectionToKill.native.cancel(function(err) {
          if (err) {
            reject2(err);
            return;
          }
          resolve(true);
        });
      });
    }
  }
  pgnative = Client_PgNative;
  return pgnative;
}
var transaction;
var hasRequiredTransaction;
function requireTransaction() {
  if (hasRequiredTransaction) return transaction;
  hasRequiredTransaction = 1;
  const Transaction3 = transaction$6;
  transaction = class Redshift_Transaction extends Transaction3 {
    begin(conn) {
      const trxMode = [
        this.isolationLevel ? `ISOLATION LEVEL ${this.isolationLevel}` : "",
        this.readOnly ? "READ ONLY" : ""
      ].join(" ").trim();
      if (trxMode.length === 0) {
        return this.query(conn, "BEGIN;");
      }
      return this.query(conn, `BEGIN ${trxMode};`);
    }
    savepoint(conn) {
      this.trxClient.logger("Redshift does not support savepoints.");
      return Promise.resolve();
    }
    release(conn, value) {
      this.trxClient.logger("Redshift does not support savepoints.");
      return Promise.resolve();
    }
    rollbackTo(conn, error) {
      this.trxClient.logger("Redshift does not support savepoints.");
      return Promise.resolve();
    }
  };
  return transaction;
}
var redshiftQuerycompiler;
var hasRequiredRedshiftQuerycompiler;
function requireRedshiftQuerycompiler() {
  if (hasRequiredRedshiftQuerycompiler) return redshiftQuerycompiler;
  hasRequiredRedshiftQuerycompiler = 1;
  const QueryCompiler3 = querycompiler;
  const QueryCompiler_PG = requirePgQuerycompiler();
  const identity2 = identity_1;
  const {
    columnize: columnize_2
  } = wrappingFormatter;
  class QueryCompiler_Redshift extends QueryCompiler_PG {
    truncate() {
      return `truncate ${this.tableName.toLowerCase()}`;
    }
    // Compiles an `insert` query, allowing for multiple
    // inserts using a single query statement.
    insert() {
      const sql = QueryCompiler3.prototype.insert.apply(this, arguments);
      if (sql === "") return sql;
      this._slightReturn();
      return {
        sql
      };
    }
    // Compiles an `update` query, warning on unsupported returning
    update() {
      const sql = QueryCompiler3.prototype.update.apply(this, arguments);
      this._slightReturn();
      return {
        sql
      };
    }
    // Compiles an `delete` query, warning on unsupported returning
    del() {
      const sql = QueryCompiler3.prototype.del.apply(this, arguments);
      this._slightReturn();
      return {
        sql
      };
    }
    // simple: if trying to return, warn
    _slightReturn() {
      if (this.single.isReturning) {
        this.client.logger.warn(
          "insert/update/delete returning is not supported by redshift dialect"
        );
      }
    }
    forUpdate() {
      this.client.logger.warn("table lock is not supported by redshift dialect");
      return "";
    }
    forShare() {
      this.client.logger.warn(
        "lock for share is not supported by redshift dialect"
      );
      return "";
    }
    forNoKeyUpdate() {
      this.client.logger.warn("table lock is not supported by redshift dialect");
      return "";
    }
    forKeyShare() {
      this.client.logger.warn(
        "lock for share is not supported by redshift dialect"
      );
      return "";
    }
    // Compiles a columnInfo query
    columnInfo() {
      const column = this.single.columnInfo;
      let schema = this.single.schema;
      const table = this.client.customWrapIdentifier(this.single.table, identity2);
      if (schema) {
        schema = this.client.customWrapIdentifier(schema, identity2);
      }
      const sql = "select * from information_schema.columns where table_name = ? and table_catalog = ?";
      const bindings2 = [
        table.toLowerCase(),
        this.client.database().toLowerCase()
      ];
      return this._buildColumnInfoQuery(schema, sql, bindings2, column);
    }
    jsonExtract(params) {
      let extractions;
      if (Array.isArray(params.column)) {
        extractions = params.column;
      } else {
        extractions = [params];
      }
      return extractions.map((extraction) => {
        const jsonCol = `json_extract_path_text(${columnize_2(
          extraction.column || extraction[0],
          this.builder,
          this.client,
          this.bindingsHolder
        )}, ${this.client.toPathForJson(
          params.path || extraction[1],
          this.builder,
          this.bindingsHolder
        )})`;
        const alias = extraction.alias || extraction[2];
        return alias ? this.client.alias(jsonCol, this.formatter.wrap(alias)) : jsonCol;
      }).join(", ");
    }
    jsonSet(params) {
      throw new Error("Json set is not supported by Redshift");
    }
    jsonInsert(params) {
      throw new Error("Json insert is not supported by Redshift");
    }
    jsonRemove(params) {
      throw new Error("Json remove is not supported by Redshift");
    }
    whereJsonPath(statement) {
      return this._whereJsonPath(
        "json_extract_path_text",
        Object.assign({}, statement, {
          path: this.client.toPathForJson(statement.path)
        })
      );
    }
    whereJsonSupersetOf(statement) {
      throw new Error("Json superset is not supported by Redshift");
    }
    whereJsonSubsetOf(statement) {
      throw new Error("Json subset is not supported by Redshift");
    }
    onJsonPathEquals(clause) {
      return this._onJsonPathEquals("json_extract_path_text", clause);
    }
  }
  redshiftQuerycompiler = QueryCompiler_Redshift;
  return redshiftQuerycompiler;
}
var redshiftColumnbuilder;
var hasRequiredRedshiftColumnbuilder;
function requireRedshiftColumnbuilder() {
  if (hasRequiredRedshiftColumnbuilder) return redshiftColumnbuilder;
  hasRequiredRedshiftColumnbuilder = 1;
  const ColumnBuilder3 = columnbuilder;
  class ColumnBuilder_Redshift extends ColumnBuilder3 {
    constructor() {
      super(...arguments);
    }
    // primary needs to set not null on non-preexisting columns, or fail
    primary() {
      this.notNullable();
      return super.primary(...arguments);
    }
    index() {
      this.client.logger.warn(
        "Redshift does not support the creation of indexes."
      );
      return this;
    }
  }
  redshiftColumnbuilder = ColumnBuilder_Redshift;
  return redshiftColumnbuilder;
}
var redshiftColumncompiler;
var hasRequiredRedshiftColumncompiler;
function requireRedshiftColumncompiler() {
  if (hasRequiredRedshiftColumncompiler) return redshiftColumncompiler;
  hasRequiredRedshiftColumncompiler = 1;
  const ColumnCompiler_PG = requirePgColumncompiler();
  const ColumnCompiler3 = columncompiler;
  class ColumnCompiler_Redshift extends ColumnCompiler_PG {
    constructor() {
      super(...arguments);
    }
    // Types:
    // ------
    bit(column) {
      return column.length !== false ? `char(${column.length})` : "char(1)";
    }
    datetime(without) {
      return without ? "timestamp" : "timestamptz";
    }
    timestamp(without) {
      return without ? "timestamp" : "timestamptz";
    }
    // Modifiers:
    // ------
    comment(comment) {
      this.pushAdditional(function() {
        this.pushQuery(
          `comment on column ${this.tableCompiler.tableName()}.` + this.formatter.wrap(this.args[0]) + " is " + (comment ? `'${comment}'` : "NULL")
        );
      }, comment);
    }
  }
  ColumnCompiler_Redshift.prototype.increments = ({ primaryKey = true } = {}) => "integer identity(1,1)" + (primaryKey ? " primary key" : "") + " not null";
  ColumnCompiler_Redshift.prototype.bigincrements = ({
    primaryKey = true
  } = {}) => "bigint identity(1,1)" + (primaryKey ? " primary key" : "") + " not null";
  ColumnCompiler_Redshift.prototype.binary = "varchar(max)";
  ColumnCompiler_Redshift.prototype.blob = "varchar(max)";
  ColumnCompiler_Redshift.prototype.enu = "varchar(255)";
  ColumnCompiler_Redshift.prototype.enum = "varchar(255)";
  ColumnCompiler_Redshift.prototype.json = "varchar(max)";
  ColumnCompiler_Redshift.prototype.jsonb = "varchar(max)";
  ColumnCompiler_Redshift.prototype.longblob = "varchar(max)";
  ColumnCompiler_Redshift.prototype.mediumblob = "varchar(16777218)";
  ColumnCompiler_Redshift.prototype.set = "text";
  ColumnCompiler_Redshift.prototype.text = "varchar(max)";
  ColumnCompiler_Redshift.prototype.tinyblob = "varchar(256)";
  ColumnCompiler_Redshift.prototype.uuid = ColumnCompiler3.prototype.uuid;
  ColumnCompiler_Redshift.prototype.varbinary = "varchar(max)";
  ColumnCompiler_Redshift.prototype.bigint = "bigint";
  ColumnCompiler_Redshift.prototype.bool = "boolean";
  ColumnCompiler_Redshift.prototype.double = "double precision";
  ColumnCompiler_Redshift.prototype.floating = "real";
  ColumnCompiler_Redshift.prototype.smallint = "smallint";
  ColumnCompiler_Redshift.prototype.tinyint = "smallint";
  redshiftColumncompiler = ColumnCompiler_Redshift;
  return redshiftColumncompiler;
}
var redshiftTablecompiler;
var hasRequiredRedshiftTablecompiler;
function requireRedshiftTablecompiler() {
  if (hasRequiredRedshiftTablecompiler) return redshiftTablecompiler;
  hasRequiredRedshiftTablecompiler = 1;
  const has2 = has_1;
  const TableCompiler_PG = requirePgTablecompiler();
  class TableCompiler_Redshift extends TableCompiler_PG {
    constructor() {
      super(...arguments);
    }
    index(columns, indexName, options) {
      this.client.logger.warn(
        "Redshift does not support the creation of indexes."
      );
    }
    dropIndex(columns, indexName) {
      this.client.logger.warn(
        "Redshift does not support the deletion of indexes."
      );
    }
    dropPrimaryIfExists() {
      throw new Error(".dropPrimaryIfExists() is not supported by redshift");
    }
    dropForeignIfExists() {
      throw new Error(".dropForeignIfExists() is not supported by redshift");
    }
    dropUniqueIfExists() {
      throw new Error(".dropUniqueIfExists() is not supported by redshift");
    }
    // TODO: have to disable setting not null on columns that already exist...
    // Adds the "create" query to the query sequence.
    createQuery(columns, ifNot, like) {
      const createStatement = ifNot ? "create table if not exists " : "create table ";
      const columnsSql = " (" + columns.sql.join(", ") + this._addChecks() + ")";
      let sql = createStatement + this.tableName() + (like && this.tableNameLike() ? " (like " + this.tableNameLike() + ")" : columnsSql);
      if (this.single.inherits)
        sql += ` like (${this.formatter.wrap(this.single.inherits)})`;
      this.pushQuery({
        sql,
        bindings: columns.bindings
      });
      const hasComment = has2(this.single, "comment");
      if (hasComment) this.comment(this.single.comment);
      if (like) {
        this.addColumns(columns, this.addColumnsPrefix);
      }
    }
    primary(columns, constraintName) {
      const self2 = this;
      constraintName = constraintName ? self2.formatter.wrap(constraintName) : self2.formatter.wrap(`${this.tableNameRaw}_pkey`);
      if (columns.constructor !== Array) {
        columns = [columns];
      }
      const thiscolumns = self2.grouped.columns;
      if (thiscolumns) {
        for (let i = 0; i < columns.length; i++) {
          let exists = thiscolumns.find(
            (tcb) => tcb.grouping === "columns" && tcb.builder && tcb.builder._method === "add" && tcb.builder._args && tcb.builder._args.indexOf(columns[i]) > -1
          );
          if (exists) {
            exists = exists.builder;
          }
          const nullable = !(exists && exists._modifiers && exists._modifiers["nullable"] && exists._modifiers["nullable"][0] === false);
          if (nullable) {
            if (exists) {
              return this.client.logger.warn(
                "Redshift does not allow primary keys to contain nullable columns."
              );
            } else {
              return this.client.logger.warn(
                "Redshift does not allow primary keys to contain nonexistent columns."
              );
            }
          }
        }
      }
      return self2.pushQuery(
        `alter table ${self2.tableName()} add constraint ${constraintName} primary key (${self2.formatter.columnize(
          columns
        )})`
      );
    }
    // Compiles column add. Redshift can only add one column per ALTER TABLE, so core addColumns doesn't work.  #2545
    addColumns(columns, prefix, colCompilers) {
      if (prefix === this.alterColumnsPrefix) {
        super.addColumns(columns, prefix, colCompilers);
      } else {
        prefix = prefix || this.addColumnsPrefix;
        colCompilers = colCompilers || this.getColumns();
        for (const col of colCompilers) {
          const quotedTableName = this.tableName();
          const colCompiled = col.compileColumn();
          this.pushQuery({
            sql: `alter table ${quotedTableName} ${prefix}${colCompiled}`,
            bindings: []
          });
        }
      }
    }
  }
  redshiftTablecompiler = TableCompiler_Redshift;
  return redshiftTablecompiler;
}
var redshiftCompiler;
var hasRequiredRedshiftCompiler;
function requireRedshiftCompiler() {
  if (hasRequiredRedshiftCompiler) return redshiftCompiler;
  hasRequiredRedshiftCompiler = 1;
  const SchemaCompiler_PG = requirePgCompiler();
  class SchemaCompiler_Redshift extends SchemaCompiler_PG {
    constructor() {
      super(...arguments);
    }
  }
  redshiftCompiler = SchemaCompiler_Redshift;
  return redshiftCompiler;
}
var redshiftViewcompiler;
var hasRequiredRedshiftViewcompiler;
function requireRedshiftViewcompiler() {
  if (hasRequiredRedshiftViewcompiler) return redshiftViewcompiler;
  hasRequiredRedshiftViewcompiler = 1;
  const ViewCompiler_PG = requirePgViewcompiler();
  class ViewCompiler_Redshift extends ViewCompiler_PG {
    constructor(client2, viewCompiler) {
      super(client2, viewCompiler);
    }
  }
  redshiftViewcompiler = ViewCompiler_Redshift;
  return redshiftViewcompiler;
}
var redshift;
var hasRequiredRedshift;
function requireRedshift() {
  if (hasRequiredRedshift) return redshift;
  hasRequiredRedshift = 1;
  const Client_PG = requirePostgres();
  const map2 = map_1;
  const Transaction3 = requireTransaction();
  const QueryCompiler3 = requireRedshiftQuerycompiler();
  const ColumnBuilder3 = requireRedshiftColumnbuilder();
  const ColumnCompiler3 = requireRedshiftColumncompiler();
  const TableCompiler3 = requireRedshiftTablecompiler();
  const SchemaCompiler3 = requireRedshiftCompiler();
  const ViewCompiler3 = requireRedshiftViewcompiler();
  class Client_Redshift extends Client_PG {
    transaction() {
      return new Transaction3(this, ...arguments);
    }
    queryCompiler(builder2, formatter2) {
      return new QueryCompiler3(this, builder2, formatter2);
    }
    columnBuilder() {
      return new ColumnBuilder3(this, ...arguments);
    }
    columnCompiler() {
      return new ColumnCompiler3(this, ...arguments);
    }
    tableCompiler() {
      return new TableCompiler3(this, ...arguments);
    }
    schemaCompiler() {
      return new SchemaCompiler3(this, ...arguments);
    }
    viewCompiler() {
      return new ViewCompiler3(this, ...arguments);
    }
    _driver() {
      return require$$15;
    }
    // Ensures the response is returned in the same format as other clients.
    processResponse(obj, runner2) {
      const resp = obj.response;
      if (obj.output) return obj.output.call(runner2, resp);
      if (obj.method === "raw") return resp;
      if (resp.command === "SELECT") {
        if (obj.method === "first") return resp.rows[0];
        if (obj.method === "pluck") return map2(resp.rows, obj.pluck);
        return resp.rows;
      }
      if (resp.command === "INSERT" || resp.command === "UPDATE" || resp.command === "DELETE") {
        return resp.rowCount;
      }
      return resp;
    }
    toPathForJson(jsonPath, builder2, bindingsHolder) {
      return jsonPath.replace(/^(\$\.)/, "").split(".").map(
        (function(v) {
          return this.parameter(v, builder2, bindingsHolder);
        }).bind(this)
      ).join(", ");
    }
  }
  Object.assign(Client_Redshift.prototype, {
    dialect: "redshift",
    driverName: "pg-redshift"
  });
  redshift = Client_Redshift;
  return redshift;
}
Object.defineProperty(dialects, "__esModule", { value: true });
dialects.getDialectByNameOrAlias = void 0;
const { resolveClientNameWithAliases } = helpers$7;
const dbNameToDialectLoader = Object.freeze({
  "better-sqlite3": () => requireBetterSqlite3(),
  cockroachdb: () => requireCockroachdb(),
  mssql: () => requireMssql(),
  mysql: () => requireMysql(),
  mariadb: () => requireMariadb(),
  mysql2: () => requireMysql2(),
  oracle: () => requireOracle(),
  oracledb: () => requireOracledb(),
  pgnative: () => requirePgnative(),
  postgres: () => requirePostgres(),
  redshift: () => requireRedshift(),
  sqlite3: () => requireSqlite3()
});
function getDialectByNameOrAlias$1(clientName) {
  const resolvedClientName = resolveClientNameWithAliases(clientName);
  const dialectLoader = dbNameToDialectLoader[resolvedClientName];
  if (!dialectLoader) {
    throw new Error(`Invalid clientName given: ${clientName}`);
  }
  return dialectLoader();
}
dialects.getDialectByNameOrAlias = getDialectByNameOrAlias$1;
const Client$1 = client;
const { SUPPORTED_CLIENTS } = constants$1;
const parseConnection = parseConnection$1;
const { getDialectByNameOrAlias } = dialects;
function resolveConfig$1(config) {
  let Dialect;
  let resolvedConfig;
  const parsedConfig = typeof config === "string" ? Object.assign(parseConnection(config), arguments[2]) : config;
  if (arguments.length === 0 || !parsedConfig.client && !parsedConfig.dialect) {
    Dialect = Client$1;
  } else if (typeof parsedConfig.client === "function") {
    Dialect = parsedConfig.client;
  } else {
    const clientName = parsedConfig.client || parsedConfig.dialect;
    if (!SUPPORTED_CLIENTS.includes(clientName)) {
      throw new Error(
        `knex: Unknown configuration option 'client' value ${clientName}. Note that it is case-sensitive, check documentation for supported values.`
      );
    }
    Dialect = getDialectByNameOrAlias(clientName);
  }
  if (parsedConfig.connectionPool && parsedConfig.connection) {
    throw new Error(
      `knex: 'connectionPool' and 'connection' are mutually exclusive. Use one or the other.`
    );
  }
  if (typeof parsedConfig.connection === "string") {
    resolvedConfig = Object.assign({}, parsedConfig, {
      connection: parseConnection(parsedConfig.connection).connection
    });
  } else {
    resolvedConfig = Object.assign({}, parsedConfig);
  }
  return {
    resolvedConfig,
    Dialect
  };
}
var configResolver = {
  resolveConfig: resolveConfig$1
};
const Client2 = client;
const QueryBuilder = querybuilder;
const QueryInterface = methodConstants;
const makeKnex = makeKnex_1;
const { KnexTimeoutError: KnexTimeoutError2 } = timeout$3;
const { KnexPool: KnexPool2 } = pool;
const { resolveConfig } = configResolver;
const SchemaBuilder2 = builder;
const ViewBuilder2 = viewbuilder;
const ColumnBuilder2 = columnbuilder;
const TableBuilder2 = tablebuilder;
function knex$2(config) {
  const { resolvedConfig, Dialect } = resolveConfig(...arguments);
  const newKnex = makeKnex(new Dialect(resolvedConfig));
  if (resolvedConfig.userParams) {
    newKnex.userParams = resolvedConfig.userParams;
  }
  return newKnex;
}
knex$2.Client = Client2;
knex$2.KnexTimeoutError = KnexTimeoutError2;
knex$2.KnexPool = KnexPool2;
knex$2.QueryBuilder = {
  extend: function(methodName, fn) {
    QueryBuilder.extend(methodName, fn);
    QueryInterface.push(methodName);
  }
};
knex$2.SchemaBuilder = {
  extend: function(methodName, fn) {
    SchemaBuilder2.extend(methodName, fn);
  }
};
knex$2.ViewBuilder = {
  extend: function(methodName, fn) {
    ViewBuilder2.extend(methodName, fn);
  }
};
knex$2.ColumnBuilder = {
  extend: function(methodName, fn) {
    ColumnBuilder2.extend(methodName, fn);
  }
};
knex$2.TableBuilder = {
  extend: function(methodName, fn) {
    TableBuilder2.extend(methodName, fn);
  }
};
var Knex$1 = knex$2;
const Knex = Knex$1;
var lib = Knex;
const knex = lib;
knex.knex = knex;
knex.default = knex;
var knex_1 = knex;
const knex$1 = /* @__PURE__ */ getDefaultExportFromCjs(knex_1);
async function up(knex2) {
  await knex2.schema.createTable("customers", (table) => {
    table.increments("id").primary();
    table.string("name", 100).notNullable();
    table.string("phone", 20);
    table.string("email", 100);
    table.text("address");
    table.decimal("balance", 15, 2).defaultTo(0);
    table.text("notes");
    table.boolean("isActive").defaultTo(true);
    table.timestamps(true, true);
    table.index("phone");
    table.index("isActive");
  });
  await knex2.schema.createTable("suppliers", (table) => {
    table.increments("id").primary();
    table.string("name", 100).notNullable();
    table.string("phone", 20);
    table.string("email", 100);
    table.text("address");
    table.text("notes");
    table.boolean("isActive").defaultTo(true);
    table.timestamps(true, true);
    table.index("phone");
    table.index("isActive");
  });
  await knex2.schema.createTable("products", (table) => {
    table.increments("id").primary();
    table.string("name", 100).notNullable();
    table.string("unit", 20).notNullable();
    table.string("category", 50);
    table.text("description");
    table.boolean("isActive").defaultTo(true);
    table.timestamps(true, true);
    table.index("name");
    table.index("category");
    table.index("isActive");
  });
  await knex2.schema.createTable("stock_batches", (table) => {
    table.increments("id").primary();
    table.integer("product_id").unsigned().notNullable();
    table.integer("supplier_id").unsigned().notNullable();
    table.string("batch_code", 50).unique();
    table.decimal("quantity", 15, 3).notNullable();
    table.decimal("remaining_quantity", 15, 3).notNullable();
    table.decimal("purchase_price", 15, 2).notNullable();
    table.date("received_date").notNullable();
    table.date("expiry_date");
    table.text("notes");
    table.boolean("isActive").defaultTo(true);
    table.timestamps(true, true);
    table.foreign("product_id").references("id").inTable("products").onDelete("RESTRICT");
    table.foreign("supplier_id").references("id").inTable("suppliers").onDelete("RESTRICT");
    table.index("product_id");
    table.index("supplier_id");
    table.index("batch_code");
    table.index("received_date");
    table.index("remaining_quantity");
  });
  await knex2.schema.createTable("purchase_invoices", (table) => {
    table.increments("id").primary();
    table.string("invoice_number", 50).unique().notNullable();
    table.integer("supplier_id").unsigned().notNullable();
    table.date("invoice_date").notNullable();
    table.decimal("subtotal", 15, 2).notNullable().defaultTo(0);
    table.decimal("discount", 15, 2).defaultTo(0);
    table.decimal("tax", 15, 2).defaultTo(0);
    table.decimal("total", 15, 2).notNullable().defaultTo(0);
    table.decimal("paid_amount", 15, 2).defaultTo(0);
    table.enum("status", ["draft", "confirmed", "paid", "cancelled"]).defaultTo("draft");
    table.text("notes");
    table.timestamps(true, true);
    table.foreign("supplier_id").references("id").inTable("suppliers").onDelete("RESTRICT");
    table.index("supplier_id");
    table.index("invoice_number");
    table.index("invoice_date");
    table.index("status");
  });
  await knex2.schema.createTable("purchase_invoice_items", (table) => {
    table.increments("id").primary();
    table.integer("purchase_invoice_id").unsigned().notNullable();
    table.integer("product_id").unsigned().notNullable();
    table.decimal("quantity", 15, 3).notNullable();
    table.decimal("unit_price", 15, 2).notNullable();
    table.decimal("line_total", 15, 2).notNullable();
    table.text("notes");
    table.timestamps(true, true);
    table.foreign("purchase_invoice_id").references("id").inTable("purchase_invoices").onDelete("CASCADE");
    table.foreign("product_id").references("id").inTable("products").onDelete("RESTRICT");
    table.index("purchase_invoice_id");
    table.index("product_id");
  });
  await knex2.schema.createTable("sale_types", (table) => {
    table.increments("id").primary();
    table.string("name", 50).unique().notNullable();
    table.decimal("commission_percentage", 5, 2).defaultTo(0);
    table.text("description");
    table.boolean("isActive").defaultTo(true);
    table.timestamps(true, true);
    table.index("isActive");
  });
  await knex2.schema.createTable("sale_invoices", (table) => {
    table.increments("id").primary();
    table.string("invoice_number", 50).unique().notNullable();
    table.integer("customer_id").unsigned().notNullable();
    table.integer("sale_type_id").unsigned().notNullable();
    table.integer("cashbox_id").unsigned();
    table.date("invoice_date").notNullable();
    table.decimal("subtotal", 15, 2).notNullable().defaultTo(0);
    table.decimal("discount", 15, 2).defaultTo(0);
    table.decimal("commission_percentage", 5, 2).defaultTo(0);
    table.decimal("commission_amount", 15, 2).defaultTo(0);
    table.decimal("tax", 15, 2).defaultTo(0);
    table.decimal("total", 15, 2).notNullable().defaultTo(0);
    table.decimal("paid_amount", 15, 2).defaultTo(0);
    table.enum("status", ["draft", "confirmed", "paid", "cancelled"]).defaultTo("draft");
    table.text("notes");
    table.timestamps(true, true);
    table.foreign("customer_id").references("id").inTable("customers").onDelete("RESTRICT");
    table.foreign("sale_type_id").references("id").inTable("sale_types").onDelete("RESTRICT");
    table.index("customer_id");
    table.index("invoice_number");
    table.index("invoice_date");
    table.index("status");
    table.index("cashbox_id");
  });
  await knex2.schema.createTable("sale_invoice_items", (table) => {
    table.increments("id").primary();
    table.integer("sale_invoice_id").unsigned().notNullable();
    table.integer("stock_batch_id").unsigned().notNullable();
    table.decimal("quantity", 15, 3).notNullable();
    table.decimal("unit_price", 15, 2).notNullable();
    table.decimal("line_total", 15, 2).notNullable();
    table.decimal("cost_price", 15, 2).notNullable();
    table.decimal("profit", 15, 2).defaultTo(0);
    table.text("notes");
    table.timestamps(true, true);
    table.foreign("sale_invoice_id").references("id").inTable("sale_invoices").onDelete("CASCADE");
    table.foreign("stock_batch_id").references("id").inTable("stock_batches").onDelete("RESTRICT");
    table.index("sale_invoice_id");
    table.index("stock_batch_id");
  });
  await knex2.schema.createTable("cashboxes", (table) => {
    table.increments("id").primary();
    table.string("name", 100).notNullable();
    table.integer("parent_id").unsigned().nullable();
    table.decimal("balance", 15, 2).defaultTo(0);
    table.decimal("initial_balance", 15, 2).defaultTo(0);
    table.string("currency", 10).defaultTo("SAR");
    table.boolean("isActive").defaultTo(true);
    table.text("notes");
    table.timestamps(true, true);
    table.foreign("parent_id").references("id").inTable("cashboxes").onDelete("SET NULL");
    table.index("parent_id");
    table.index("isActive");
  });
  await knex2.schema.createTable("cashbox_transactions", (table) => {
    table.increments("id").primary();
    table.integer("cashbox_id").unsigned().notNullable();
    table.enum("reference_type", ["sale", "purchase", "expense", "income", "transfer"]).notNullable();
    table.integer("reference_id").notNullable();
    table.decimal("amount", 15, 2).notNullable();
    table.enum("direction", ["in", "out"]).notNullable();
    table.decimal("balance_before", 15, 2).notNullable();
    table.decimal("balance_after", 15, 2).notNullable();
    table.dateTime("transaction_date").defaultTo(knex2.fn.now());
    table.text("notes");
    table.timestamps(true, true);
    table.foreign("cashbox_id").references("id").inTable("cashboxes").onDelete("RESTRICT");
    table.index("cashbox_id");
    table.index(["reference_type", "reference_id"]);
    table.index("transaction_date");
  });
  await knex2.schema.createTable("transaction_categories", (table) => {
    table.increments("id").primary();
    table.string("name", 100).notNullable();
    table.enum("type", ["expense", "income"]).notNullable();
    table.text("description");
    table.boolean("isActive").defaultTo(true);
    table.timestamps(true, true);
    table.index("type");
    table.index("isActive");
  });
  await knex2.schema.createTable("transactions", (table) => {
    table.increments("id").primary();
    table.integer("category_id").unsigned().notNullable();
    table.integer("cashbox_id").unsigned().notNullable();
    table.decimal("amount", 15, 2).notNullable();
    table.enum("direction", ["expense", "income"]).notNullable();
    table.date("transaction_date").notNullable();
    table.text("description");
    table.string("reference_number", 50);
    table.text("notes");
    table.timestamps(true, true);
    table.foreign("category_id").references("id").inTable("transaction_categories").onDelete("RESTRICT");
    table.foreign("cashbox_id").references("id").inTable("cashboxes").onDelete("RESTRICT");
    table.index("category_id");
    table.index("cashbox_id");
    table.index("transaction_date");
    table.index("direction");
  });
  await knex2.schema.createTable("payments", (table) => {
    table.increments("id").primary();
    table.enum("party_type", ["customer", "supplier"]).notNullable();
    table.integer("party_id").notNullable();
    table.enum("payment_type", ["sale", "purchase"]).notNullable();
    table.integer("invoice_id").notNullable();
    table.integer("cashbox_id").unsigned().notNullable();
    table.decimal("amount", 15, 2).notNullable();
    table.date("payment_date").notNullable();
    table.enum("payment_method", ["cash", "bank", "credit_card", "cheque", "online"]).defaultTo("cash");
    table.string("reference_number", 50);
    table.text("notes");
    table.timestamps(true, true);
    table.foreign("cashbox_id").references("id").inTable("cashboxes").onDelete("RESTRICT");
    table.index(["party_type", "party_id"]);
    table.index(["payment_type", "invoice_id"]);
    table.index("cashbox_id");
    table.index("payment_date");
  });
  await knex2.schema.createTable("users", (table) => {
    table.increments("id").primary();
    table.string("username", 50).unique().notNullable();
    table.string("password_hash", 255).notNullable();
    table.string("full_name", 100).notNullable();
    table.string("email", 100).unique();
    table.string("phone", 20);
    table.enum("role", ["admin", "manager", "cashier", "viewer"]).defaultTo("cashier");
    table.boolean("isActive").defaultTo(true);
    table.dateTime("last_login");
    table.timestamps(true, true);
    table.index("username");
    table.index("email");
    table.index("isActive");
  });
  await knex2.schema.createTable("activity_logs", (table) => {
    table.increments("id").primary();
    table.integer("user_id").unsigned().nullable();
    table.string("action", 100).notNullable();
    table.string("table_name", 50).notNullable();
    table.integer("record_id").notNullable();
    table.json("old_data");
    table.json("new_data");
    table.string("ip_address", 45);
    table.text("user_agent");
    table.timestamps(true, true);
    table.foreign("user_id").references("id").inTable("users").onDelete("SET NULL");
    table.index("user_id");
    table.index("table_name");
    table.index("created_at");
  });
  await knex2.schema.createTable("settings", (table) => {
    table.increments("id").primary();
    table.string("setting_key", 50).unique().notNullable();
    table.text("setting_value");
    table.text("description");
    table.string("category", 50).defaultTo("general");
    table.timestamps(true, true);
    table.index("setting_key");
    table.index("category");
  });
  await knex2.schema.alterTable("sale_invoices", (table) => {
    table.index(["customer_id", "status"]);
    table.index(["invoice_date", "status"]);
  });
  await knex2.schema.alterTable("purchase_invoices", (table) => {
    table.index(["supplier_id", "status"]);
  });
  await knex2.schema.alterTable("stock_batches", (table) => {
    table.index(["product_id", "remaining_quantity"]);
  });
  await knex2.schema.alterTable("cashbox_transactions", (table) => {
    table.index(["cashbox_id", "transaction_date"]);
  });
  await knex2.schema.alterTable("payments", (table) => {
    table.index(["party_type", "party_id", "payment_date"]);
  });
}
async function down(knex2) {
  await knex2.schema.dropTableIfExists("activity_logs");
  await knex2.schema.dropTableIfExists("payments");
  await knex2.schema.dropTableIfExists("transactions");
  await knex2.schema.dropTableIfExists("transaction_categories");
  await knex2.schema.dropTableIfExists("cashbox_transactions");
  await knex2.schema.dropTableIfExists("cashboxes");
  await knex2.schema.dropTableIfExists("sale_invoice_items");
  await knex2.schema.dropTableIfExists("sale_invoices");
  await knex2.schema.dropTableIfExists("sale_types");
  await knex2.schema.dropTableIfExists("purchase_invoice_items");
  await knex2.schema.dropTableIfExists("purchase_invoices");
  await knex2.schema.dropTableIfExists("stock_batches");
  await knex2.schema.dropTableIfExists("products");
  await knex2.schema.dropTableIfExists("suppliers");
  await knex2.schema.dropTableIfExists("customers");
  await knex2.schema.dropTableIfExists("users");
  await knex2.schema.dropTableIfExists("settings");
}
const initialSchema = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  down,
  up
}, Symbol.toStringTag, { value: "Module" }));
async function seed$1(knex2) {
  await knex2("cashboxes").del();
  await knex2("cashboxes").insert([
    {
      name: "الصندوق الرئيسي",
      parent_id: null,
      initial_balance: 0,
      balance: 0,
      currency: "SAR",
      notes: "الصندوق الرئيسي للنظام"
    }
  ]);
}
const cashboxesSeed = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  seed: seed$1
}, Symbol.toStringTag, { value: "Module" }));
var bcrypt$1 = { exports: {} };
var nodeGypBuild$1 = { exports: {} };
var nodeGypBuild;
var hasRequiredNodeGypBuild;
function requireNodeGypBuild() {
  if (hasRequiredNodeGypBuild) return nodeGypBuild;
  hasRequiredNodeGypBuild = 1;
  var fs2 = require$$0$2;
  var path2 = require$$0$3;
  var os = require$$2$1;
  var runtimeRequire2 = typeof __webpack_require__ === "function" ? __non_webpack_require__ : commonjsRequire;
  var vars = process.config && process.config.variables || {};
  var prebuildsOnly = !!process.env.PREBUILDS_ONLY;
  var abi = process.versions.modules;
  var runtime = isElectron() ? "electron" : isNwjs() ? "node-webkit" : "node";
  var arch = process.env.npm_config_arch || os.arch();
  var platform2 = process.env.npm_config_platform || os.platform();
  var libc = process.env.LIBC || (isAlpine(platform2) ? "musl" : "glibc");
  var armv = process.env.ARM_VERSION || (arch === "arm64" ? "8" : vars.arm_version) || "";
  var uv = (process.versions.uv || "").split(".")[0];
  nodeGypBuild = load;
  function load(dir) {
    return runtimeRequire2(load.resolve(dir));
  }
  load.resolve = load.path = function(dir) {
    dir = path2.resolve(dir || ".");
    try {
      var name = runtimeRequire2(path2.join(dir, "package.json")).name.toUpperCase().replace(/-/g, "_");
      if (process.env[name + "_PREBUILD"]) dir = process.env[name + "_PREBUILD"];
    } catch (err) {
    }
    if (!prebuildsOnly) {
      var release = getFirst(path2.join(dir, "build/Release"), matchBuild);
      if (release) return release;
      var debug2 = getFirst(path2.join(dir, "build/Debug"), matchBuild);
      if (debug2) return debug2;
    }
    var prebuild = resolve(dir);
    if (prebuild) return prebuild;
    var nearby = resolve(path2.dirname(process.execPath));
    if (nearby) return nearby;
    var target = [
      "platform=" + platform2,
      "arch=" + arch,
      "runtime=" + runtime,
      "abi=" + abi,
      "uv=" + uv,
      armv ? "armv=" + armv : "",
      "libc=" + libc,
      "node=" + process.versions.node,
      process.versions.electron ? "electron=" + process.versions.electron : "",
      typeof __webpack_require__ === "function" ? "webpack=true" : ""
      // eslint-disable-line
    ].filter(Boolean).join(" ");
    throw new Error("No native build was found for " + target + "\n    loaded from: " + dir + "\n");
    function resolve(dir2) {
      var tuples = readdirSync(path2.join(dir2, "prebuilds")).map(parseTuple);
      var tuple = tuples.filter(matchTuple(platform2, arch)).sort(compareTuples)[0];
      if (!tuple) return;
      var prebuilds = path2.join(dir2, "prebuilds", tuple.name);
      var parsed = readdirSync(prebuilds).map(parseTags);
      var candidates = parsed.filter(matchTags(runtime, abi));
      var winner = candidates.sort(compareTags(runtime))[0];
      if (winner) return path2.join(prebuilds, winner.file);
    }
  };
  function readdirSync(dir) {
    try {
      return fs2.readdirSync(dir);
    } catch (err) {
      return [];
    }
  }
  function getFirst(dir, filter) {
    var files = readdirSync(dir).filter(filter);
    return files[0] && path2.join(dir, files[0]);
  }
  function matchBuild(name) {
    return /\.node$/.test(name);
  }
  function parseTuple(name) {
    var arr = name.split("-");
    if (arr.length !== 2) return;
    var platform22 = arr[0];
    var architectures = arr[1].split("+");
    if (!platform22) return;
    if (!architectures.length) return;
    if (!architectures.every(Boolean)) return;
    return { name, platform: platform22, architectures };
  }
  function matchTuple(platform22, arch2) {
    return function(tuple) {
      if (tuple == null) return false;
      if (tuple.platform !== platform22) return false;
      return tuple.architectures.includes(arch2);
    };
  }
  function compareTuples(a, b) {
    return a.architectures.length - b.architectures.length;
  }
  function parseTags(file) {
    var arr = file.split(".");
    var extension = arr.pop();
    var tags = { file, specificity: 0 };
    if (extension !== "node") return;
    for (var i = 0; i < arr.length; i++) {
      var tag = arr[i];
      if (tag === "node" || tag === "electron" || tag === "node-webkit") {
        tags.runtime = tag;
      } else if (tag === "napi") {
        tags.napi = true;
      } else if (tag.slice(0, 3) === "abi") {
        tags.abi = tag.slice(3);
      } else if (tag.slice(0, 2) === "uv") {
        tags.uv = tag.slice(2);
      } else if (tag.slice(0, 4) === "armv") {
        tags.armv = tag.slice(4);
      } else if (tag === "glibc" || tag === "musl") {
        tags.libc = tag;
      } else {
        continue;
      }
      tags.specificity++;
    }
    return tags;
  }
  function matchTags(runtime2, abi2) {
    return function(tags) {
      if (tags == null) return false;
      if (tags.runtime && tags.runtime !== runtime2 && !runtimeAgnostic(tags)) return false;
      if (tags.abi && tags.abi !== abi2 && !tags.napi) return false;
      if (tags.uv && tags.uv !== uv) return false;
      if (tags.armv && tags.armv !== armv) return false;
      if (tags.libc && tags.libc !== libc) return false;
      return true;
    };
  }
  function runtimeAgnostic(tags) {
    return tags.runtime === "node" && tags.napi;
  }
  function compareTags(runtime2) {
    return function(a, b) {
      if (a.runtime !== b.runtime) {
        return a.runtime === runtime2 ? -1 : 1;
      } else if (a.abi !== b.abi) {
        return a.abi ? -1 : 1;
      } else if (a.specificity !== b.specificity) {
        return a.specificity > b.specificity ? -1 : 1;
      } else {
        return 0;
      }
    };
  }
  function isNwjs() {
    return !!(process.versions && process.versions.nw);
  }
  function isElectron() {
    if (process.versions && process.versions.electron) return true;
    if (process.env.ELECTRON_RUN_AS_NODE) return true;
    return typeof window !== "undefined" && window.process && window.process.type === "renderer";
  }
  function isAlpine(platform22) {
    return platform22 === "linux" && fs2.existsSync("/etc/alpine-release");
  }
  load.parseTags = parseTags;
  load.matchTags = matchTags;
  load.compareTags = compareTags;
  load.parseTuple = parseTuple;
  load.matchTuple = matchTuple;
  load.compareTuples = compareTuples;
  return nodeGypBuild;
}
const runtimeRequire = typeof __webpack_require__ === "function" ? __non_webpack_require__ : commonjsRequire;
if (typeof runtimeRequire.addon === "function") {
  nodeGypBuild$1.exports = runtimeRequire.addon.bind(runtimeRequire);
} else {
  nodeGypBuild$1.exports = requireNodeGypBuild();
}
var nodeGypBuildExports = nodeGypBuild$1.exports;
var promises;
var hasRequiredPromises;
function requirePromises() {
  if (hasRequiredPromises) return promises;
  hasRequiredPromises = 1;
  let Promise2 = commonjsGlobal.Promise;
  function promise(fn, context, args) {
    if (!Array.isArray(args)) {
      args = Array.prototype.slice.call(args);
    }
    if (typeof fn !== "function") {
      return Promise2.reject(new Error("fn must be a function"));
    }
    return new Promise2((resolve, reject3) => {
      args.push((err, data) => {
        if (err) {
          reject3(err);
        } else {
          resolve(data);
        }
      });
      fn.apply(context, args);
    });
  }
  function reject2(err) {
    return Promise2.reject(err);
  }
  function use(promise2) {
    Promise2 = promise2;
  }
  promises = {
    promise,
    reject: reject2,
    use
  };
  return promises;
}
(function(module) {
  const path2 = require$$0$3;
  const bindings2 = nodeGypBuildExports(path2.resolve(__dirname));
  const crypto = require$$0$5;
  const promises2 = requirePromises();
  function genSaltSync(rounds, minor) {
    if (!rounds) {
      rounds = 10;
    } else if (typeof rounds !== "number") {
      throw new Error("rounds must be a number");
    }
    if (!minor) {
      minor = "b";
    } else if (minor !== "b" && minor !== "a") {
      throw new Error('minor must be either "a" or "b"');
    }
    return bindings2.gen_salt_sync(minor, rounds, crypto.randomBytes(16));
  }
  function genSalt(rounds, minor, cb) {
    let error;
    if (typeof arguments[0] === "function") {
      cb = arguments[0];
      rounds = 10;
      minor = "b";
    } else if (typeof arguments[1] === "function") {
      cb = arguments[1];
      minor = "b";
    }
    if (!cb) {
      return promises2.promise(genSalt, this, [rounds, minor]);
    }
    if (!rounds) {
      rounds = 10;
    } else if (typeof rounds !== "number") {
      error = new Error("rounds must be a number");
      return process.nextTick(function() {
        cb(error);
      });
    }
    if (!minor) {
      minor = "b";
    } else if (minor !== "b" && minor !== "a") {
      error = new Error('minor must be either "a" or "b"');
      return process.nextTick(function() {
        cb(error);
      });
    }
    crypto.randomBytes(16, function(error2, randomBytes) {
      if (error2) {
        cb(error2);
        return;
      }
      bindings2.gen_salt(minor, rounds, randomBytes, cb);
    });
  }
  function hashSync(data, salt) {
    if (data == null || salt == null) {
      throw new Error("data and salt arguments required");
    }
    if (!(typeof data === "string" || data instanceof Buffer) || typeof salt !== "string" && typeof salt !== "number") {
      throw new Error("data must be a string or Buffer and salt must either be a salt string or a number of rounds");
    }
    if (typeof salt === "number") {
      salt = module.exports.genSaltSync(salt);
    }
    return bindings2.encrypt_sync(data, salt);
  }
  function hash(data, salt, cb) {
    let error;
    if (typeof data === "function") {
      error = new Error("data must be a string or Buffer and salt must either be a salt string or a number of rounds");
      return process.nextTick(function() {
        data(error);
      });
    }
    if (typeof salt === "function") {
      error = new Error("data must be a string or Buffer and salt must either be a salt string or a number of rounds");
      return process.nextTick(function() {
        salt(error);
      });
    }
    if (cb && typeof cb !== "function") {
      return promises2.reject(new Error("cb must be a function or null to return a Promise"));
    }
    if (!cb) {
      return promises2.promise(hash, this, [data, salt]);
    }
    if (data == null || salt == null) {
      error = new Error("data and salt arguments required");
      return process.nextTick(function() {
        cb(error);
      });
    }
    if (!(typeof data === "string" || data instanceof Buffer) || typeof salt !== "string" && typeof salt !== "number") {
      error = new Error("data must be a string or Buffer and salt must either be a salt string or a number of rounds");
      return process.nextTick(function() {
        cb(error);
      });
    }
    if (typeof salt === "number") {
      return module.exports.genSalt(salt, function(err, salt2) {
        return bindings2.encrypt(data, salt2, cb);
      });
    }
    return bindings2.encrypt(data, salt, cb);
  }
  function compareSync(data, hash2) {
    if (data == null || hash2 == null) {
      throw new Error("data and hash arguments required");
    }
    if (!(typeof data === "string" || data instanceof Buffer) || typeof hash2 !== "string") {
      throw new Error("data must be a string or Buffer and hash must be a string");
    }
    return bindings2.compare_sync(data, hash2);
  }
  function compare(data, hash2, cb) {
    let error;
    if (typeof data === "function") {
      error = new Error("data and hash arguments required");
      return process.nextTick(function() {
        data(error);
      });
    }
    if (typeof hash2 === "function") {
      error = new Error("data and hash arguments required");
      return process.nextTick(function() {
        hash2(error);
      });
    }
    if (cb && typeof cb !== "function") {
      return promises2.reject(new Error("cb must be a function or null to return a Promise"));
    }
    if (!cb) {
      return promises2.promise(compare, this, [data, hash2]);
    }
    if (data == null || hash2 == null) {
      error = new Error("data and hash arguments required");
      return process.nextTick(function() {
        cb(error);
      });
    }
    if (!(typeof data === "string" || data instanceof Buffer) || typeof hash2 !== "string") {
      error = new Error("data and hash must be strings");
      return process.nextTick(function() {
        cb(error);
      });
    }
    return bindings2.compare(data, hash2, cb);
  }
  function getRounds(hash2) {
    if (hash2 == null) {
      throw new Error("hash argument required");
    }
    if (typeof hash2 !== "string") {
      throw new Error("hash must be a string");
    }
    return bindings2.get_rounds(hash2);
  }
  module.exports = {
    genSaltSync,
    genSalt,
    hashSync,
    hash,
    compareSync,
    compare,
    getRounds
  };
})(bcrypt$1);
var bcryptExports = bcrypt$1.exports;
const bcrypt = /* @__PURE__ */ getDefaultExportFromCjs(bcryptExports);
async function seed(knex2) {
  await knex2("users").del();
  const hashedPassword = await bcrypt.hash("password", 10);
  await knex2("users").insert([
    {
      username: "admin",
      password_hash: hashedPassword,
      full_name: "مدير النظام",
      email: "admin@farmersmarket.com",
      role: "admin",
      isActive: true
    }
  ]);
}
const usersSeed = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  seed
}, Symbol.toStringTag, { value: "Module" }));
let knexInstance = null;
class MigrationSource {
  async getMigrations() {
    return Promise.resolve(["20250101000000_initial_schema.ts"]);
  }
  getMigrationName(migration) {
    return migration;
  }
  async getMigration(migration) {
    if (migration === "20250101000000_initial_schema.ts") {
      return initialSchema;
    }
    throw new Error(`Migration ${migration} not found`);
  }
}
class SeedSource {
  async getSeeds() {
    return Promise.resolve(["01_cashboxes.ts", "02_users.ts"]);
  }
  async getSeed(seed2) {
    if (seed2 === "01_cashboxes.ts") return cashboxesSeed;
    if (seed2 === "02_users.ts") return usersSeed;
    throw new Error(`Seed ${seed2} not found`);
  }
}
function getKnex() {
  if (!knexInstance) {
    throw new Error("Knex not initialized. Call initKnex() first.");
  }
  return knexInstance;
}
async function initKnex() {
  const dbPath = require$$0$3.join(app.getPath("userData"), "farmer-market.db");
  knexInstance = knex$1({
    client: "sqlite3",
    connection: {
      filename: dbPath
    },
    useNullAsDefault: true,
    migrations: {
      migrationSource: new MigrationSource(),
      tableName: "knex_migrations"
    },
    seeds: {
      seedSource: new SeedSource()
    },
    pool: {
      afterCreate: (conn, done) => {
        conn.run("PRAGMA foreign_keys = ON", done);
      }
    }
  });
  console.log(`📁 Database location: ${dbPath}`);
}
async function closeKnex() {
  if (knexInstance) {
    await knexInstance.destroy();
    knexInstance = null;
  }
}
let isInitialized = false;
async function initDatabase() {
  if (isInitialized) {
    return;
  }
  try {
    await initKnex();
    await runMigrations();
    await runSeeds();
    isInitialized = true;
    console.log("✅ Database initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize database:", error);
    throw error;
  }
}
function getDatabase() {
  return getKnex();
}
async function closeDatabase() {
  await closeKnex();
  isInitialized = false;
}
async function runMigrations() {
  const knex2 = getKnex();
  try {
    await knex2.migrate.latest();
    console.log("✅ Migrations completed");
  } catch (error) {
    console.error("❌ Migration error:", error);
    throw error;
  }
}
async function runSeeds() {
  const knex2 = getKnex();
  try {
    const usersCount = await knex2("users").count("id as count").first();
    if (usersCount && usersCount.count === 0) {
      await knex2.seed.run();
      console.log("✅ Seeds completed");
    } else {
      console.log("ℹ️ Seeds already exist, skipping...");
    }
  } catch (error) {
    console.error("❌ Seed error:", error);
  }
}
export {
  closeDatabase,
  getDatabase,
  initDatabase
};
