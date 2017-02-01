/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2016 */

const RE_ADDON_LINKS = /https:\/\/addons.mozilla.org\/([^\/]*)\/(editors\/review|admin\/addon\/manage|[^\/]*\/addon|developers\/feed)\/([^\/#?]*)(\/edit)?/;
const MATCH_ADDON_LINKS = [
  "https://addons.mozilla.org/*/editors/review/*",
  "https://addons.mozilla.org/*/admin/manage/*",
  "https://addons.mozilla.org/*/*/addon/*", /* catches listing and manage url */
  "https://addons.mozilla.org/*/developers/feed/*",
];

const REVIEW_URL = "https://addons.mozilla.org/editors/review/$ADDON";
const ADMIN_URL = "https://addons.mozilla.org/admin/addon/manage/$ADDON";
const LISTING_URL = "https://addons.mozilla.org/addon/$ADDON";
const MANAGE_URL = "https://addons.mozilla.org/developers/addon/$ADDON/edit";
const FEED_URL = "https://addons.mozilla.org/en-US/developers/feed/$ADDON";

function toAddonUrl(target, info) {
  let matches = info.linkUrl.match(RE_ADDON_LINKS);
  if (!matches) {
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    let activeTab = tabs[0];
    let targetUrl = target.replace("$ADDON", matches[3]);

    if (info.modifiers && info.modifiers.includes("Ctrl")) {
      // TODO add openerTabId: activeTab.id when supported
      chrome.tabs.create({ url: targetUrl, index: activeTab.index + 1 });
    } else {
      chrome.tabs.update(activeTab.id, { url: targetUrl });
    }
  });
}

function createLinksContextMenu(contextInfo) {
  contextInfo.forEach((entry) => {
    chrome.contextMenus.create({
      type: entry.type || "normal",
      title: entry.title,
      contexts: ["link"],
      targetUrlPatterns: MATCH_ADDON_LINKS,
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
