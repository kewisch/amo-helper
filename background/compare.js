var pageMod = require("sdk/page-mod");
var tabs = require("sdk/tabs");
var child_process = require("sdk/system/child_process");
var prefs = require("sdk/simple-prefs");
var notifications = require("sdk/notifications");
var manifest = require("../package.json");

var { Cu } = require("chrome");
var { Downloads } = Cu.import("resource://gre/modules/Downloads.jsm");
var { Task } = Cu.import("resource://gre/modules/Task.jsm");
var { OS } = Cu.import("resource://gre/modules/osfile.jsm");

var installedPageMods = [];

function* getValidFilename(folder, filename) {
  let increment = 0;
  // Filter platform invalid filename characters
  filename = filename.replace(/[*:?<>|\/"\\]/g, "-");
  let fullPath = OS.Path.join(folder, filename);
  while (yield OS.File.exists(fullPath)) {
    let filenames = filename.split(".");
    filenames[filenames.length - 2] = `${filenames[filenames.length - 2]}_${++increment}`;
    fullPath = OS.Path.join(folder, filenames.join("."));
  }
  return fullPath;
}

function triggerDownload(downloadsArray, callback) {
  let downloadFolder = prefs.prefs["compare-download-folder"];
  if (!downloadFolder) {
    notifications.notify({
      title: manifest.title,
      text: "Please set a download directory in the preferences.",
    });
    return;
  }

  Promise.all(downloadsArray.map(Task.async(function* (value, index, array) {
    let finalDest = yield getValidFilename(downloadFolder, value.filename);
    console.log(`Downloading ${value.downloadPath} to ${finalDest}.`);

    let list = yield Downloads.getList(Downloads.ALL);
    let download = yield Downloads.createDownload({
      source: value.downloadPath,
      target: finalDest
    });
    list.add(download);

    try {
      yield download.start();
    } finally {
      yield download.finalize(true);
    }

    console.log(`${finalDest} has been downloaded`);
    return finalDest;
  }))).then((files) => {
    if (callback) {
      callback(files);
    }
  }, Cu.reportError);
}

function installContent() {
  installedPageMods.push(pageMod.PageMod({
    include: /^https?:\/\/addons(?:-dev)?\.(?:mozilla|allizom)\.org\/(?:[a-z]{2}(?:\-[a-z]{2})?\/)?editors\/review\/(?:[^\/]+)(?:\/)?/i,
    attachTo: ["existing", "top"],
    contentScriptFile: ["./lib/jquery-3.1.1.min.js", "./compare/content.js"],
    contentStyleFile: "./compare/style.css",
    onAttach: function(worker) {
      worker.port.on("download", (downloadsArray) => {
        triggerDownload(downloadsArray, null);
      });
      worker.port.on("openTab", (url) => {
        tabs.open(url);
      });
      worker.port.on("offline-compare", (downloadsArray) => {
        triggerDownload(downloadsArray, (files) => {
          console.log(`Comparing ${files.join(", ")}`);
          let cmd = prefs.prefs["compare-command"];
          let cmdargs = prefs.prefs["compare-command-args"];

          if (cmd && cmdargs.includes("$1") && cmdargs.includes("$2")) {
            let args = cmdargs.match(/(?:[^\s"']+|["']{1}[^'"]*["']{1})+/g);
            args[args.indexOf("$1")] = files[0];
            args[args.indexOf("$2")] = files[1];
            child_process.spawn(cmd, args);
          } else {
            notifications.notify({
              title: manifest.title,
              text: "Please set a client compare tool and arguments in the preferences.",
            });
          }
        });
      });
    }
  }));
}

exports.startup = function() {
  function compareEnableChange() {
    installedPageMods.forEach(mod => mod.destroy());
    if (prefs.prefs["compare-enable"]) {
      installContent();
    }
  }

  prefs.on("compare-enable", compareEnableChange);
  compareEnableChange();
};
