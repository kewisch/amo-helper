sdk.runtime.onMessage.addListener((data, sender, sendReply) => {
  if (data.action != "download") {
    return;
  }

  chrome.storage.local.get({
    ["reviewInfo." + data.addonid]: null,
    "downloads.basedir": "amo"
  }, (prefs) => {
    let info = prefs["reviewInfo." + data.addonid];
    let version;

    if (data.version == "latest") {
      version = info.versions[info.latest_idx];
    } else {
      version = info.versions.find(ver => ver.version == data.version);
    }

    if (!version) {
      return;
    }

    let filename = `${prefs["downloads.basedir"]}/${info.slug}/${version.version}/addon.xpi`;

    chrome.downloads.download({
      url: version.installurl,
      filename: filename,
      conflictAction: "overwrite",
      saveAs: false
    });

    if (version.sourceurl) {
      // TODO use correct extension after bug 1245652 is fixed
      let sourcename = `${prefs["downloads.basedir"]}/${info.slug}/${version.version}/sources.zip`;
      chrome.downloads.download({
        url: version.sourceurl,
        filename: sourcename,
        conflictAction: "overwrite",
        saveAs: false
      });
    }
  });
});
