/* exported sdk */

var sdk = (function() {
  let contentPipeline = browser.runtime.connect({ name: "__sdk_contentscript" });
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

    sdkMessageListeners.forEach((callback) => {
      callback(data.message, data.sender, sendReply);
    });
  });

  storagePipeline.onMessage.addListener((data) => {
    function sendReply(result) {
      storagePipeline.postMessage({
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
  // TODO onChanged

  return {
    runtime: {
      onMessage: {
        addListener: function(listener) {
          sdkMessageListeners.add(listener);
        }
      }
    }
  };
})();
