/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

browser.runtime.onMessage.addListener(async (data, sender) => {
  if (data.action != "download") {
    return;
  }

  let reviewInfo = await infostorage.review.get({ ["reviewInfo." + data.addonid]: null });
  let prefs = await browser.storage.local.get({ "downloads.basedir": "amo" });

  let info = reviewInfo["reviewInfo." + data.addonid];
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

  browser.downloads.download({
    url: version.installurl,
    filename: filename,
    conflictAction: "overwrite",
    saveAs: false
  });

  if (version.sourceurl) {
    // TODO use correct extension after bug 1245652 is fixed
    let sourcename = `${prefs["downloads.basedir"]}/${info.slug}/${version.version}/sources.zip`;
    browser.downloads.download({
      url: version.sourceurl,
      filename: sourcename,
      conflictAction: "overwrite",
      saveAs: false
    });
  }
});
