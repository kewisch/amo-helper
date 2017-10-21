/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2016-2017 */

function toAddonUrl(target, info) {
  let matches = info.linkUrl.match(ADDON_LINKS_RE);
  if (!matches) {
    return;
  }

  browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    let activeTab = tabs[0];
    let targetUrl = target.replace(/{addon}/, matches[4]).replace(/{instance}/, matches[1]);

    if (info.modifiers && (info.modifiers.includes("Command") || info.modifiers.includes("Ctrl"))) {
      // TODO add openerTabId: activeTab.id when supported
      browser.tabs.create({ url: targetUrl, index: activeTab.index + 1 });
    } else {
      browser.tabs.update(activeTab.id, { url: targetUrl });
    }
  });
}

function createLinksContextMenu(contextInfo) {
  contextInfo.forEach((entry) => {
    browser.menus.create({
      type: entry.type || "normal",
      title: entry.title,
      contexts: ["link"],
      targetUrlPatterns: ADDON_LINK_PATTERNS,
      onclick: toAddonUrl.bind(undefined, entry.url)
    });
  });
}

/* eslint-disable object-curly-newline */
createLinksContextMenu([{
  title: "Open Add-on Listing",
  url: LISTING_URL,
}, {
  title: "Edit Add-on",
  url: MANAGE_URL,
}, {
  title: "Review Add-on",
  url: REVIEW_URL,
}, {
  title: "Admin Add-on",
  url: ADMIN_URL,
}, {
  title: "Open Add-on Activity",
  url: FEED_URL,
}]);

browser.menus.create({
  type: "normal",
  title: "Copy file path",
  contexts: ["link"],
  targetUrlPatterns: FILEBROWSER_PATTERNS,
  documentUrlPatterns: FILEBROWSER_PATTERNS,
  onclick: (info, tab) => {
    let match = info.linkUrl.match(FILEBROWSER_RE);
    let code = `
      var node = document.createElement('textarea');
      node.setAttribute('style', 'position: fixed; top: 0; left: -1000px; z-index: -1;');
      node.value = ${JSON.stringify(match[5])};
      document.body.appendChild(node);
      node.select();
      document.execCommand('copy');
      document.body.removeChild(node);
    `;
    browser.tabs.executeScript(tab.id, { code: code });
  }
});
