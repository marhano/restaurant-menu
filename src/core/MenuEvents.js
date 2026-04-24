/**
 * MenuEvents.js
 * Tiny pub/sub used by internal modules to stay decoupled.
 */
var MenuEvents = (function () {
  var _map = {};

  function on(evt, fn) {
    (_map[evt] = _map[evt] || []).push(fn);
  }

  function off(evt, fn) {
    if (!_map[evt]) return;
    if (!fn) { delete _map[evt]; return; }
    _map[evt] = _map[evt].filter(function (f) { return f !== fn; });
  }

  function emit(evt, payload) {
    (_map[evt] || []).slice().forEach(function (fn) {
      try { fn(payload); } catch (e) { if (window.console) console.error(e); }
    });
  }

  function reset() { _map = {}; }

  return { on: on, off: off, emit: emit, reset: reset };
})();
