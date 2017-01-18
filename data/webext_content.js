/* exported chrome */

var chrome = (function() {
  function generateStorageArea(areaName) {
    function forwardAPI(methodName, items, callback) {
      let responseId = Math.random().toString(36).substr(2, 10);
      self.port.once("__sdk_storageapi_response_" + responseId, callback);

      self.port.emit("__sdk_storageapi_request", {
        resposeId: responseId,

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

  return {
    extension: {
      getURL: function() {

      },

      get inIncognitoContext() {

      },

      get lastError() {

      }
      // not supporting onRequest/sendRequest
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
        return `moz-extension://${self.options.uuid}/${url}`;
      },

      get id() {
        return self.options.uuid; // TODO is this actually self.id ?
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
        addListener: function() {
          // Foo
        }
      }
    },

    i18n: { /* Not implemented, since methods are mostly synchronous */ }
  };
})();
