var pageMod = require("sdk/page-mod");

exports.startup = function() {
  pageMod.PageMod({
    include: [
      "https://addons.mozilla.org/en-US/firefox/files/browse/*",
      "https://addons.mozilla.org/en-US/firefox/files/compare/*"
    ],
    contentScriptFile: ["./copylink/copylink.js"],
    contentScriptWhen: "ready",
    contentStyleFile: "./copylink/filebrowser.css"
  });
};
