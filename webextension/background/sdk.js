/* exported sdk */

var sdk = (function() {
  let contentPipeline = browser.runtime.connect({ name: "__sdk_contentscript" });
  let chrometabsPipeline = browser.runtime.connect({ name: "__sdk_chrometabs" });
  let storagePipeline = browser.runtime.connect({ name: "__sdk_storage" });

  let sdkMessageListeners = new Set();

  contentPipeline.onMessage.addListener((data) => {
    function sendReply(result) {
      if (sendReply.sent) {
        return;
      }
      sendReply.sent = true;
      contentPipeline.postMessage({
        result: result,
        workerId: data.workerId,
        responseId: data.responseId
      });
    }

    chrome.tabs.get(data.sender.tabId, (tab) => {
      data.sender.tab = tab;
      delete data.sender.tabId;

      sdkMessageListeners.forEach((callback) => {
        callback(data.message, data.sender, sendReply);
      });
    });
  });

  storagePipeline.onMessage.addListener((data) => {
    function sendReply(result) {
      storagePipeline.postMessage({
        action: "result",
        result: result,
        workerId: data.workerId,
        responseId: data.responseId
      });
    }

    if (data.method == "clear") {
      chrome.storage[data.area][data.method](sendReply);
    } else {
      chrome.storage[data.area][data.method](data.items, sendReply);
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    // TODO is postponing this needed? currently makes sure change notification
    // is after reply function.
    setTimeout(() => {
      storagePipeline.postMessage({
        action: "changed",
        changes: changes,
        area: area
      });
    }, 100);
  });

  return {
    runtime: {
      onMessage: {
        addListener: function(listener) {
          sdkMessageListeners.add(listener);
        }
      }
    },
    tabs: {
      sendMessage: function(tabId, message, responseCallback) {
        if (arguments.length == 4) {
          // optional 3rd argument options not implemented
          throw new Error("Not implemented");
        }
        let responseId = Math.random().toString(36).substr(2, 10);

        if (responseCallback) {
          let reply = (data) => {
            if (data.responseId == responseId) {
              chrometabsPipeline.onMessage.removeListener(reply);
              responseCallback(data.result);
            }
          };
          chrometabsPipeline.onMessage.addListener(reply);
        }

        chrometabsPipeline.postMessage({
          responseId: responseId,
          tabId: tabId,
          message: message
        });
      }
    }
  };
})();
