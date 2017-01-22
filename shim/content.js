/* exported chrome, fetch */

var chrome = (function() {
  function generateStorageArea(areaName) {
    function forwardAPI(methodName, items, callback) {
      let responseId = Math.random().toString(36).substr(2, 10);
      if (callback) {
        self.port.once("__sdk_storage_response_" + responseId, callback);
      }

      self.port.emit("__sdk_storage_request", {
        responseId: responseId,

        area: areaName,
        method: methodName,
        items: items
      });
    }

    return {
      get: forwardAPI.bind(null, "get"),
      getBytesInUse: forwardAPI.bind(null, "getBytesInUse"),
      set: forwardAPI.bind(null, "set"),
      remove: forwardAPI.bind(null, "remove"),
      clear: forwardAPI.bind(null, "clear"),
    };
  }

  let changedListeners = new Set();

  self.port.on("__sdk_storage_changed", (changes, area) => {
    changedListeners.forEach(listener => listener(changes, area));
  });

  return {
    extension: {
      getURL: function(path) {
        return `moz-extension://${self.options.uuid}/${path}`;
      },

      get inIncognitoContext() {
        return false;
      },

      get lastError() {
        throw new Error("Not implemented");
      }
    },

    runtime: {
      connect: function(extensionId, connectInfo) {
        // https://developer.chrome.com/extensions/runtime#method-connect
        throw new Error("Not implemented");
      },

      getManifest: function() {
        return self.options.manifest;
      },

      getURL: function(path) {
        return `moz-extension://${self.options.uuid}/${path}`;
      },

      get id() {
        return self.id;
      },

      onConnect: {
        addListener: function(callback) {
          throw new Error("Not implemented");
        }
      },

      onMessage: {
        addListener: function(callback) {
          throw new Error("Not implemented");
        }
      },

      sendMessage: function(message, responseCallback) {
        if (arguments.length > 2) {
          // extensionId: we only support sending to our own extension
          // options: contains only options we won't support
          throw new Error("Only support passing message and responseCallback");
        }

        let responseId = Math.random().toString(36).substr(2, 10);

        if (responseCallback) {
          self.port.once("__sdk_contentscript_response_" + responseId, responseCallback);
        }

        self.port.emit("__sdk_contentscript_request", {
          responseId: responseId,
          message: message,
        });
      }
    },

    storage: {
      sync: generateStorageArea("sync"),
      local: generateStorageArea("local"),
      managed: generateStorageArea("managed"),

      onChanged: {
        addListener: function(listener) {
          changedListeners.add(listener);
        },
        removeListener: function(listener) {
          changedListeners.delete(listener);
        }
      }
    },

    i18n: { /* Not implemented, since methods are mostly synchronous */ }
  };
})();

/**
 * The add-on SDK does not handle CORS for fetch, so minimally shim this via XHR.
 * Some code taken from https://github.com/github/fetch
 */
function fetch(url, options={}) {
  function parseHeaders(rawHeaders) {
    let headers = new Map();
    rawHeaders.split(/\r?\n/).forEach((line) => {
      let parts = line.split(":");
      let key = parts.shift().trim();
      if (key) {
        let value = parts.join(":").trim();
        headers.set(key.toLowerCase(), value);
      }
    });

    return {
      get: function(value) {
        return headers.get(value.toLowerCase());
      }
    };
  }

  if (options.headers || options.mode || options.credentials || options.cache ||
      options.redirect || options.referrer || options.integrity) {
    throw new Error("Not implemented");
  }
  return new Promise((resolve, reject) => {
    var xhr = new XMLHttpRequest();
    xhr.open(options.method || "GET", url, true);
    xhr.onload = (event) => {
      if (xhr.readyState == 4) {
        resolve({
          // eslint-disable-next-line id-length
          ok: Math.floor(xhr.status / 100) <= 3,
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders() || ""),
          text: function() {
            return Promise.resolve(xhr.responseText);
          },
          json: function() {
            return Promise.resolve(JSON.parse(xhr.responseText));
          }
        });
      }
    };
    xhr.onerror = (event) => {
      reject(xhr);
    };

    xhr.send(options.body || null);
  });
}
