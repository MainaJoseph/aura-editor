// ES5 IIFE that overrides console methods and forwards output to the parent
// frame via postMessage. Also captures uncaught errors and unhandled rejections.
export const CONSOLE_BRIDGE_SCRIPT = `(function() {
  var _orig = {
    log: console.log, warn: console.warn, error: console.error,
    info: console.info, debug: console.debug
  };
  ['log','warn','error','info','debug'].forEach(function(level) {
    console[level] = function() {
      _orig[level].apply(console, arguments);
      try {
        var args = [];
        for (var i = 0; i < arguments.length; i++) {
          try { args.push(typeof arguments[i] === 'object' ? JSON.stringify(arguments[i]) : String(arguments[i])); }
          catch(e) { args.push('[Unserializable]'); }
        }
        window.parent.postMessage({ type:'aura:console', level:level, args:args, timestamp:Date.now() }, '*');
      } catch(e) {}
    };
  });
  window.addEventListener('error', function(e) {
    window.parent.postMessage({
      type:'aura:console', level:'error',
      args:[e.message + (e.filename ? ' at ' + e.filename + ':' + e.lineno + ':' + e.colno : '')],
      timestamp:Date.now()
    }, '*');
  });
  window.addEventListener('unhandledrejection', function(e) {
    window.parent.postMessage({
      type:'aura:console', level:'error',
      args:['Unhandled Promise Rejection: ' + String(e.reason)],
      timestamp:Date.now()
    }, '*');
  });
})();`;
