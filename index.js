var self = require("sdk/self");
var pageMod = require("sdk/page-mod");
var prefs = require('sdk/simple-prefs');
var storage = (function() {
    let data = require("sdk/simple-storage").storage;
    //let data = {};
    
    if (!data.reviewinfo) {
        data.reviewinfo = {};
    }
    return data;
})();


pageMod.PageMod({
  include: "https://addons.mozilla.org/en-US/editors/queue/*",
  contentScriptFile: [ "./lib/moment.min.js", "./content/queue.js"],
  contentStyleFile: "./css/queue.css",
  contentScriptWhen: "ready",
  onAttach: function(worker) {
    worker.port.on("request-review-info", function(ids) {
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
        
      let info = ids.reduce((results, id) => {
        if (id in storage.reviewinfo) {
          results.push(storage.reviewinfo[id]);
        }
        return results;
      }, []);
          
      worker.port.emit("receive-review-info", info);
    });

    worker.port.on("change-pref", function(key, value) {
        prefs.prefs[key] = value;
    });

    let onPrefChange = (prefName) => {
      worker.port.emit("change-pref", prefName, prefs.prefs[prefName]);
    };
    prefs.on("", onPrefChange);
    worker.on("detach", function() {
      prefs.removeListener("", onPrefChange);
    });

    worker.port.emit("receive-prefs", prefs.prefs);
  }
});

pageMod.PageMod({
  include: "https://addons.mozilla.org/en-US/editors/review/*",
  contentScriptFile: "./content/review.js",
  contentScriptWhen: "ready",
  onAttach: function(worker) {
    worker.port.on("review-info-received", function(data) {
      storage.reviewinfo[data.id] = data;
    });
  }
});
