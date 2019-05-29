/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */


function getWindow(id) {
  return id ? browser.windows.get(id).catch(() => null) : Promise.resolve(null);
}

async function openFileBrowser(url) {
  let win = await getWindow(openFileBrowser.lastWindowId);

  if (win) {
    await browser.tabs.create({
      url: url,
      windowId: win.id
    });

    await browser.windows.update(win.id, { focused: true });
  } else {
    let params = await getStoragePreference("filewindow-position");
    params.url = url;

    // Blocked by bug 1380169 and bug 1331906
    // params.type = "popup";

    openFileBrowser.opening = true;
    win = await browser.windows.create(params);
    openFileBrowser.opening = false;
    openFileBrowser.lastWindowId = win.id;
  }
}

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  let fileWindowId = openFileBrowser.lastWindowId;
  let changedUrl = changeInfo && changeInfo.url;
  let exclusive = await getStoragePreference("filewindow-exclusive");
  if (exclusive &&
      openFileBrowser.lastFocusedWindow &&
      tab.windowId == fileWindowId && changedUrl &&
      changedUrl != "about:blank" && !changedUrl.match(FILEBROWSER_RE)) {
    await browser.tabs.move(tabId, { windowId: openFileBrowser.lastFocusedWindow, index: -1 });
    browser.tabs.update(tabId, { active: true });
    browser.windows.update(openFileBrowser.lastFocusedWindow, { focused: true });
  }
});

browser.windows.onFocusChanged.addListener((windowId) => {
  if (windowId != -1 && windowId != openFileBrowser.lastWindowId && !openFileBrowser.opening) {
    openFileBrowser.lastFocusedWindow = windowId;
  }
});

async function saveWindowPosition(windowId) {
  let win = await browser.windows.get(windowId);

  let position = { top: win.top, left: win.left, width: win.width, height: win.height };
  await browser.storage.local.set({ "filewindow-position": position });
}

browser.runtime.onMessage.addListener((data, sender) => {
  let rv;

  if (data.action == "filewindow-open" && AMO_HOSTS.includes((new URL(data.url)).hostname)) {
    openFileBrowser(data.url);
  } else if (data.action == "filewindow-position") {
    saveWindowPosition(sender.tab.windowId);
  } else if (data.action == "filewindow-isfilewindow") {
    rv = Promise.resolve(openFileBrowser.lastWindowId == sender.tab.windowId);
  }

  return rv;
});
