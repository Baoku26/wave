// MessageChannel-based setImmediate polyfill.
// Replaces the YuzuJS postMessage version bundled by Next.js.
// The postMessage version sends "setImmediate$..." strings via window.postMessage("*")
// which Xverse's inpage.js intercepts and tries to JSON.parse, crashing the extension.
(function (global) {
  if (global.setImmediate) return;

  var channel  = new global.MessageChannel();
  var cbs      = {};
  var idCounter = 0;

  channel.port1.onmessage = function (e) {
    var cb = cbs[e.data];
    if (cb) {
      delete cbs[e.data];
      cb();
    }
  };

  function setImmediate(fn) {
    var args = Array.prototype.slice.call(arguments, 1);
    var id   = ++idCounter;
    cbs[id]  = function () {
      if (typeof fn === 'function') fn.apply(null, args);
      else new Function('' + fn)();
    };
    channel.port2.postMessage(id);
    return id;
  }

  function clearImmediate(id) {
    delete cbs[id];
  }

  global.setImmediate  = setImmediate;
  global.clearImmediate = clearImmediate;
}(typeof self === 'undefined' ? typeof global === 'undefined' ? this : global : self));
