/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */


function getWindow(id) {
  return id ? browser.windows.get(id).catch(() => null) : Promise.resolve(null);
}

async function openFileBrowser(url, openerTabId) {
  let win = await getWindow(openFileBrowser.lastWindowId);

  if (win) {
    await browser.tabs.create({
      url: url,
      windowId: win.id,
      openerTabId: openerTabId
    });
  } else {
    let params = await getStoragePreference("filewindow-position");
    params.url = url;

    // Blocked by bug 1380169 and bug 1331906
    // params.type = "popup";

    win = await browser.windows.create(params);
    openFileBrowser.lastWindowId = win.id;
  }
}

async function saveWindowPosition(windowId) {
  let win = await browser.windows.get(windowId);

  let position = { top: win.top, left: win.left, width: win.width, height: win.height };
  await browser.storage.local.set({ "filewindow-position": position });
}

browser.runtime.onMessage.addListener((data, sender) => {
  let rv;

  if (data.action == "filewindow-open" && AMO_HOSTS.includes((new URL(data.url)).hostname)) {
    openFileBrowser(data.url, sender.tab.id);
  } else if (data.action == "filewindow-position") {
    saveWindowPosition(sender.tab.windowId);
  } else if (data.action == "filewindow-isfilewindow") {
    rv = Promise.resolve(openFileBrowser.lastWindowId == sender.tab.windowId);
  }

  return rv;
});
