/* exported browser, chrome, fetch */

var browser = (function() {
  function generateStorageArea(areaName) {
    function forwardAPI(methodName, items, callback) {
      return new Promise((resolve, reject) => {
        let responseId = Math.random().toString(36).substr(2, 10);
        self.port.once("__sdk_storage_response_" + responseId, (resp) => {
          resolve(resp);
          if (callback) {
            callback(resp);
          }
        });

        self.port.emit("__sdk_storage_request", {
          responseId: responseId,

          area: areaName,
          method: methodName,
          items: items
        });
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
  let messageListeners = new Set();

  self.port.on("__sdk_storage_changed", (changes, area) => {
    changedListeners.forEach(listener => listener(changes, area));
  });

  self.port.on("__sdk_chrometabs_event", (data) => {
    function sendReply(result) {
      if (sendReply.sent) {
        return;
      }
      sendReply.sent = true;
      self.port.emit("__sdk_chrometabs_response", {
        result: result,
        responseId: data.responseId
      });
    }
    messageListeners.forEach(listener => listener(data.message, data.sender, sendReply));
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
        addListener: function(listener) {
          messageListeners.add(listener);
        },
        removeListener: function(listener) {
          messageListeners.delete(listener);
        }
      },

      sendMessage: function(message, responseCallback) {
        if (arguments.length > 2) {
          // extensionId: we only support sending to our own extension
          // options: contains only options we won't support
          throw new Error("Only support passing message and responseCallback");
        }

        return new Promise((resolve) => {
          let responseId = Math.random().toString(36).substr(2, 10);

          self.port.once("__sdk_contentscript_response_" + responseId, (res) => {
            if (responseCallback) {
              responseCallback(res);
            }
            resolve(res);
          });

          self.port.emit("__sdk_contentscript_request", {
            responseId: responseId,
            message: message,
          });
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
var chrome = browser;

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
    if (options._xhr_responseType) {
      // XHR doesn't support setting this after the fact, so we need to
      // introduce a non-standard option.
      xhr.responseType = options._xhr_responseType;
    }
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
          },
          arrayBuffer: function() {
            if (xhr.responseType == "arraybuffer") {
              return Promise.resolve(xhr.response);
            } else {
              return Promise.reject("Missing _xhr_responseType=arraybuffer option");
            }
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
