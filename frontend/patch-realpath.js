const fs = require('fs');

const originalRealpathSync = fs.realpathSync;
fs.realpathSync = function (path, options) {
  let resolved = originalRealpathSync(path, options);
  if (typeof resolved === 'string') {
    let normalized = resolved.replace(/\\/g, '/');
    const target = 'C:/Users/Swami/Documents/minor/code_yodhas_datathon';
    if (normalized.toLowerCase().startsWith(target.toLowerCase())) {
      resolved = 'Y:' + resolved.substring(target.length);
    }
  }
  return resolved;
};

if (fs.realpathSync.native) {
  const originalNative = fs.realpathSync.native;
  fs.realpathSync.native = function (path, options) {
    let resolved = originalNative(path, options);
    if (typeof resolved === 'string') {
      let normalized = resolved.replace(/\\/g, '/');
      const target = 'C:/Users/Swami/Documents/minor/code_yodhas_datathon';
      if (normalized.toLowerCase().startsWith(target.toLowerCase())) {
        resolved = 'Y:' + resolved.substring(target.length);
      }
    }
    return resolved;
  };
}

const originalRealpath = fs.realpath;
fs.realpath = function (path, options, callback) {
  let cb = callback;
  let opts = options;
  if (typeof options === 'function') {
    cb = options;
    opts = undefined;
  }
  originalRealpath(path, opts, (err, resolved) => {
    if (err) {
      if (cb) cb(err);
      return;
    }
    if (typeof resolved === 'string') {
      let normalized = resolved.replace(/\\/g, '/');
      const target = 'C:/Users/Swami/Documents/minor/code_yodhas_datathon';
      if (normalized.toLowerCase().startsWith(target.toLowerCase())) {
        resolved = 'Y:' + resolved.substring(target.length);
      }
    }
    if (cb) cb(null, resolved);
  });
};

if (fs.realpath.native) {
  const originalRealpathNative = fs.realpath.native;
  fs.realpath.native = function (path, options, callback) {
    let cb = callback;
    let opts = options;
    if (typeof options === 'function') {
      cb = options;
      opts = undefined;
    }
    originalRealpathNative(path, opts, (err, resolved) => {
      if (err) {
        if (cb) cb(err);
        return;
      }
      if (typeof resolved === 'string') {
        let normalized = resolved.replace(/\\/g, '/');
        const target = 'C:/Users/Swami/Documents/minor/code_yodhas_datathon';
        if (normalized.toLowerCase().startsWith(target.toLowerCase())) {
          resolved = 'Y:' + resolved.substring(target.length);
        }
      }
      if (cb) cb(null, resolved);
    });
  };
}
