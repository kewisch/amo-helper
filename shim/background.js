var LegacyExtensionsUtils = require("resource://gre/modules/LegacyExtensionsUtils.jsm").LegacyExtensionsUtils;
var manifest = require("../webextension/manifest.json");
var self = require("sdk/self"); // eslint-disable-line consistent-this
var pageMod = require("sdk/page-mod");
var { defer } = require("sdk/core/promise");
var { viewFor } = require("sdk/view/core");

var { Management: { global: { TabManager } } } = require("resource://gre/modules/Extension.jsm");

var contentPipeline = defer();
var storagePipeline = defer();
var chrometabsPipeline = defer();

const runAtMap = {
  document_start: "start",
  document_end: "ready",
  document_idle: "end"
};

function convertWebExtensionUrls(urls) {
  return urls ? urls.map(url => `resource://${self.id}/webextension/${url}`) : undefined;
}

function pageModAttach(worker) {
  let workerId = Math.random().toString(36).substr(2, 10);

  storagePipeline.promise.then((pipeline) => {
    let pipelineListener = (data) => {
      if (data.action == "result" && data.workerId == workerId) {
        worker.port.emit("__sdk_storage_response_" + data.responseId, data.result);
      } else if (data.action == "changed") {
        worker.port.emit("__sdk_storage_changed", data.changes, data.area);
      }
    };

    pipeline.onMessage.addListener(pipelineListener);
    worker.on("detach", () => {
      if (pipeline) {
        pipeline.onMessage.removeListener(pipelineListener);
      }
    });

    worker.port.on("__sdk_storage_request", (data) => {
      data.workerId = workerId;
      pipeline.postMessage(data);
    });

    pipeline.onDisconnect.addListener(() => {
      pipeline = null;
    });
  });

  contentPipeline.promise.then((pipeline) => {
    let pipelineListener = (data) => {
      if (data.workerId == workerId) {
        worker.port.emit("__sdk_contentscript_response_" + data.responseId, data.result);
      }
    };

    pipeline.onMessage.addListener(pipelineListener);
    worker.on("detach", () => {
      if (pipeline) {
        pipeline.onMessage.removeListener(pipelineListener);
      }
    });

    worker.port.on("__sdk_contentscript_request", (data) => {
      data.workerId = workerId;
      data.sender = {
        url: worker.tab.url,
        tabId: TabManager.getId(viewFor(worker.tab))
      };
      pipeline.postMessage(data);
    });

    pipeline.onDisconnect.addListener(() => {
      pipeline = null;
    });
  });

  chrometabsPipeline.promise.then((pipeline) => {
    let pipelineListener = (data) => {
      let workerTabId = TabManager.getId(viewFor(worker.tab));

      if (data.tabId == workerTabId) {
        data.sender = {
          url: worker.tab.url,
          tabId: workerTabId
        };
        worker.port.emit("__sdk_chrometabs_event", data);
      }
    };

    pipeline.onMessage.addListener(pipelineListener);
    worker.on("detach", () => {
      if (pipeline) {
        pipeline.onMessage.removeListener(pipelineListener);
      }
    });

    worker.port.on("__sdk_chrometabs_response", (data) => {
      pipeline.postMessage(data);
    });

    pipeline.onDisconnect.addListener(() => {
      pipeline = null;
    });
  });
}

require("sdk/webextension").startup().then((api) => {
  const { browser } = api;

  browser.runtime.onConnect.addListener((port) => {
    if (port.name == "__sdk_storage") {
      storagePipeline.resolve(port);
    } else if (port.name == "__sdk_contentscript") {
      contentPipeline.resolve(port);
    } else if (port.name == "__sdk_chrometabs") {
      chrometabsPipeline.resolve(port);
    }
  });

  let webExtension = LegacyExtensionsUtils.getEmbeddedExtensionFor({ id: self.id });

  for (let contentScript of manifest.sdk_content_scripts) {
    let matchesAboutBlank = contentScript.match_about_blank ? ["about:blank"] : [];
    let scriptFiles = convertWebExtensionUrls(contentScript.js);

    let options = { include: contentScript.matches.concat(matchesAboutBlank) };

    if (contentScript.css) {
      options.contentStyleFile = convertWebExtensionUrls(contentScript.css);
    }

    if (contentScript.js) {
      Object.assign(options, {
        contentScriptFile: [`resource://${self.id}/shim/content.js`].concat(scriptFiles),
        contentScriptWhen: runAtMap[contentScript.run_at] || "end",
        contentScriptOptions: {
          uuid: webExtension.extension.uuid,
          manifest: manifest
        },
        attachTo: contentScript.all_frames ? ["top", "frame"] : ["top"],
        // not supporting include/exclude_globs
        onAttach: pageModAttach
      });
    }

    pageMod.PageMod(options);
  }
});
