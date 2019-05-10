/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2016-2017 */


async function toAddonUrl(target, info) {
  let matches = info.linkUrl.match(ADDON_LINKS_RE);
  if (!matches) {
    return;
  }

  let [activeTab, ...rest] = await browser.tabs.query({ active: true, currentWindow: true });
  let targetUrl = replacePattern(target, {
    addon: matches[4],
    instance: matches[1]
  });

  if (info.modifiers && (info.modifiers.includes("Command") || info.modifiers.includes("Ctrl"))) {
    await browser.tabs.create({ url: targetUrl, index: activeTab.index + 1, openerTabId: activeTab.id });
  } else {
    await browser.tabs.update(activeTab.id, { url: targetUrl });
  }
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
      node.value = ${JSON.stringify(match[6])};
      document.body.appendChild(node);
      node.select();
      document.execCommand('copy');
      document.body.removeChild(node);
    `;
    browser.tabs.executeScript(tab.id, { code: code });
  }
});

browser.menus.create({
  type: "normal",
  title: "Open Review Page for ID/GUID/Slug",
  contexts: ["selection"],
  onclick: async (info, tab) => {
    async function apifetch(path) {
      return fetch(replacePattern(API_BASE_URL, { instance, path }), {
        credentials: "include",
        headers: {
          Authorization: "Bearer " + cookie.value
        }
      }).then(resp => resp.json(), () => null);
    }

    let instance = await getStoragePreference("instance");
    let cookie = await browser.cookies.get({ url: `https://${instance}`, name: "frontend_auth_token" });

    let lookup = encodeURIComponent(info.selectionText.trim());
    let type = "";

    let addon = await apifetch(`addons/addon/${lookup}/`);
    if (addon) {
      let isAdmin = await getStoragePreference("is-admin");

      let filter = isAdmin ? "all_with_unlisted" : "all_without_unlisted";
      let versions = await apifetch(`addons/addon/${lookup}/versions/?filter=${filter}`);

      // Above request may fail for permissions, which is ok because we fall through to using the
      // default URL without a type and looking up the raw selection text
      if (versions && versions.results) {
        let listed = versions.results.some(version => version.channel == "listed");
        type = listed ? "-listed" : "-unlisted";
        lookup = addon.id;
      }
    }

    await browser.tabs.create({ url: replacePattern(REVIEW_URL, { instance, type, addon: lookup }) });
  }
});


var compareVersion = null;

browser.menus.create({
  id: "amoqueue-compare-versions",
  type: "normal",
  title: "Compare this file…",
  contexts: ["link"],
  documentUrlPatterns: REVIEW_PATTERNS.map(pattern => replacePattern(pattern, { addon: "*" })),
  targetUrlPatterns: FILEBROWSER_PATTERNS,
  onclick: async (info, tab) => {
    let match = info.linkUrl.match(FILEBROWSER_RE);
    if (!match) {
      return;
    }

    if (compareVersion) {
      let instance = await getStoragePreference("instance");
      let url = replacePattern(FILEBROWSER_URL, {
        instance,
        product: instance.includes("thunderbird") ? "thunderbird" : "firefox",
        action: "compare",
        versions: `${compareVersion}...${match[4]}`
      });

      browser.tabs.create({ url });
      browser.menus.update("amoqueue-compare-versions", { title: "Compare this file…" });
      browser.menus.update("amoqueue-compare-reset", { enabled: false });
    } else {
      compareVersion = match[4];
      browser.menus.update("amoqueue-compare-versions", { title: "Compare this file to " + compareVersion });
      browser.menus.update("amoqueue-compare-reset", { enabled: true });
    }
  }
});

browser.menus.create({
  id: "amoqueue-compare-reset",
  type: "normal",
  title: "Reset file compare",
  enabled: false,
  contexts: ["page"],
  documentUrlPatterns: REVIEW_PATTERNS.map(pattern => replacePattern(pattern, { addon: "*" })),
  onclick: async (info, tab) => {
    browser.menus.update("amoqueue-compare-versions", { title: "Compare this file…" });
    browser.menus.update("amoqueue-compare-reset", { enabled: false });
    compareVersion = null;
  }
});
