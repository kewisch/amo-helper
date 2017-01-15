const QUEUE_URL = "https://addons.mozilla.org/en-US/editors/queue/";
const REVIEW_URL = "https://addons.mozilla.org/en-US/editors/review/";

var XMLHttpRequest = require("sdk/net/xhr").XMLHttpRequest;
var pageMod = require("sdk/page-mod");
var pageWorker = require("sdk/page-worker");
var prefs = require("sdk/simple-prefs");
var storage = (function() {
  let data = require("sdk/simple-storage").storage;
  // let data = {};

  if (!data.reviewinfo) {
    data.reviewinfo = {};
  }
  return data;
})();
var queueWorkers = new Set();

function processReviewInfo(ids) {
  let now = new Date();
  let timelimit = prefs.prefs["staletime"] * 3600000;
  if (timelimit == 0) {
    // If we really use a timelimit of infinite, the storage will keep on growing
    // In two weeks the reviewer will have forgotten about the time limit :-)
    timelimit = 336;
  }

  // Should probably move this somewhere else or use a better data
  // structure for performance, but otoh there are only two queue pages the
  // user should hav open.
  for (let id of Object.keys(storage.reviewinfo)) {
    if (timelimit != 0 && now - new Date(storage.reviewinfo[id].lastupdate) > timelimit) {
      delete storage.reviewinfo[id];
    }
  }

  return ids.reduce((results, id) => {
    if (id in storage.reviewinfo) {
      results.push(storage.reviewinfo[id]);
    }
    return results;
  }, []);
}

function determineSize(version) {
  function sendxhr(url) {
    return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.open("HEAD", url, true);
      xhr.onload = (event) => {
        if (xhr.readyState == 4) {
          resolve(xhr);
        }
      };
      xhr.onerror = (event) => {
        reject(xhr);
      };

      xhr.send(null);
    });
  }

  if (!version.installurl.startsWith("https://addons.mozilla.org/firefox/downloads")) {
    version.size = 0;
    return Promise.resolve();
  }

  return sendxhr(version.installurl).then((xhr) => {
    if (xhr.status == 302) {
      return sendxhr(xhr.getResponseHeader("location"));
    }
    return xhr;
  }).then((xhr) => {
    version.size = parseInt(xhr.getResponseHeader("content-length"), 10);
  }, () => {
    version.size = 0;
  });
}

function updateSizes(data) {
  if (!prefs.prefs["is-admin"]) {
    return Promise.resolve();
  }
  return determineSize(data.versions[data.versions.length - 1]).then(() => {
    // Determine the size of the last approved version, if it exists
    if (data.lastapproved_idx) {
      return determineSize(data.versions[data.lastapproved_idx]);
    }
    return null;
  });
}

function reviewOnAttach(worker) {
  return new Promise((resolve, reject) => {
    worker.port.on("review-info-received", (data) => {
      updateSizes(data).then(() => {
        storage.reviewinfo[data.id] = data;
        queueWorkers.forEach((qworker) => qworker.port.emit("receive-review-info", [data]));
      }).then(resolve, reject);
    });
  });
}

function downloadReviewInfo(id) {
  return new Promise((resolve, reject) => {
    let worker = pageWorker.Page({
      contentScriptFile: "./queueinfo/review.js",
      contentScriptOptions: { background: true },
      contentScriptWhen: "ready",
      attachTo: ["top"],
      contentURL: REVIEW_URL + id
    });
    reviewOnAttach(worker).catch(() => {}).then(() => {
      worker.destroy();
      worker.dispose();
    }).then(resolve, reject);
  });
}

exports.startup = function() {
  pageMod.PageMod({
    include: QUEUE_URL + "*",
    contentScriptWhen: "start",
    contentScriptFile: "./queueinfo/queue_redirect.js",
    onAttach: function(worker) {
      worker.port.emit("per_page", prefs.prefs["per-page"]);
    }
  });

  pageMod.PageMod({
    include: QUEUE_URL + "*",
    contentScriptFile: ["./lib/moment.min.js", "./queueinfo/queue.js"],
    contentStyleFile: "./queueinfo/queue.css",
    contentScriptWhen: "ready",
    attachTo: ["top"],
    onAttach: function(worker) {
      queueWorkers.add(worker);

      // Review info requests from the queue page
      worker.port.on("request-review-info", (ids) => {
        worker.port.emit("receive-review-info", processReviewInfo(ids));
      });

      // Clear all review data
      worker.port.on("clear-review-info", () => {
        storage.reviewinfo = {};
        queueWorkers.forEach((qworker) => qworker.port.emit("clear-review-info"));
      });

      // Load review data
      worker.port.on("download-review-info", (ids) => {
        Promise.all(ids.map(downloadReviewInfo)).then(() => {
          worker.port.emit("download-review-info-completed");
        });
      });

      // Preferences
      worker.port.on("change-pref", (key, value) => {
        prefs.prefs[key] = value;
      });

      let onPrefChange = (prefName) => {
        worker.port.emit("change-pref", prefName, prefs.prefs[prefName]);
      };
      prefs.on("", onPrefChange);
      worker.port.emit("receive-prefs", prefs.prefs);

      // Cleanup
      worker.on("detach", () => {
        prefs.removeListener("", onPrefChange);
        queueWorkers.delete(worker);
      });
    }
  });

  pageMod.PageMod({
    include: REVIEW_URL + "*",
    contentScriptFile: "./queueinfo/review.js",
    contentScriptOptions: {},
    contentScriptWhen: "ready",
    onAttach: reviewOnAttach
  });
};
