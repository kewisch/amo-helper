const QUEUE_URL = "https://addons.mozilla.org/en-US/editors/queue/";

var Services = require("resource://gre/modules/Services.jsm").Services;
var { Ci } = require("chrome");

var self = require("sdk/self");
var pageMod = require("sdk/page-mod");
var prefs = require('sdk/simple-prefs');
var events = require('sdk/system/events');
var storage = (function() {
    let data = require("sdk/simple-storage").storage;
    //let data = {};
    
    if (!data.reviewinfo) {
        data.reviewinfo = {};
    }
    return data;
})();
var queueWorkers = new Set();

events.on('http-on-modify-request', function(event) {
  let channel = event.subject.QueryInterface(Ci.nsIHttpChannel);
  let url = channel.URI.spec;
  let perPage = prefs.prefs['per-page'];

  if (url.startsWith(QUEUE_URL) && !url.includes("per_page") && perPage != 100) {
    let newUrl = url.replace(/(#.*$)|$/, `?per_page=${perPage}$1`)
    channel.redirectTo(Services.io.newURI(newUrl, null, null));
  }
});

function processReviewInfo(ids) {
  let now = new Date();
  let timelimit = prefs.prefs['staletime'] * 3600000;
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

pageMod.PageMod({
  include: QUEUE_URL + "*",
  contentScriptFile: [ "./lib/moment.min.js", "./content/queue.js"],
  contentStyleFile: "./css/queue.css",
  contentScriptWhen: "ready",
  onAttach: function(worker) {
    queueWorkers.add(worker);

    // Review info requests from the queue page
    worker.port.on("request-review-info", function(ids) {
      worker.port.emit("receive-review-info", processReviewInfo(ids));
    });

    // Preferences
    worker.port.on("change-pref", function(key, value) {
        prefs.prefs[key] = value;
    });

    let onPrefChange = (prefName) => {
      worker.port.emit("change-pref", prefName, prefs.prefs[prefName]);
    };
    prefs.on("", onPrefChange);
    worker.port.emit("receive-prefs", prefs.prefs);

    // Cleanup
    worker.on("detach", function() {
      prefs.removeListener("", onPrefChange);
      queueWorkers.delete(worker);
    });
  }
});

pageMod.PageMod({
  include: "https://addons.mozilla.org/en-US/editors/review/*",
  contentScriptFile: "./content/review.js",
  contentScriptWhen: "ready",
  onAttach: function(worker) {
    worker.port.on("review-info-received", function(data) {
      storage.reviewinfo[data.id] = data;
      queueWorkers.forEach((w) => w.port.emit("receive-review-info", [data]));
    });
  }
});
