/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

"use strict";

let tabsToClose = {};
let reviewPages = {};

function removeTabsFor(tabId, addonid, closeTabs) {
  if (tabsToClose[addonid]) {
    if (closeTabs) {
      browser.tabs.remove(Object.keys(tabsToClose[addonid]).map(Number));
    }
    delete tabsToClose[addonid];
  }

  delete reviewPages[tabId];

  /* It would be so simple if openerTabId was supported
  // The closing tab is a review, find all opening tabs
  browser.tabs.query({ url: [FILEBROWSER_MATCH, COMPARE_MATCH] }, (compareTabs) => {
    let tabsToClose = compareTabs.filter(tab => tab.openerTabId == tabId);
    browser.tabs.remove(tabsToClose.map(tab => tab.id));
  });
  */
}

async function copyScrollPosition(from, to) {
  let data = await browser.tabs.sendMessage(from.id, { action: "getScrollPosition" });
  data.action = "setScrollPosition";
  await browser.tabs.sendMessage(to.id, data);
}

function removeOtherTabs(tabUrl, keepTab) {
  let findTabUrl = tabUrl.split(/\?|#/)[0] + "*";
  browser.tabs.query({ url: findTabUrl }, (compareTabs) => {
    let closingActiveTab = null;
    let closeTabs = compareTabs.filter(tab => {
      let shouldClose = tab.id != keepTab.id;
      if (shouldClose && tab.active) {
        closingActiveTab = tab;
      }
      return shouldClose;
    });

    let promise = Promise.resolve();
    if (closingActiveTab) {
      promise = copyScrollPosition(closingActiveTab, keepTab).then(() => {
        browser.tabs.update(keepTab.id, { active: true });
      });
    }
    promise.then(() => {
      if (closeTabs.length) {
        browser.tabs.move(keepTab.id, { index: closeTabs[0].index });
      }
      browser.tabs.remove(closeTabs.map(tab => tab.id));
    });
  });
}

browser.runtime.onMessage.addListener((data, sender, sendReply) => {
  if (data.action == "addonid") {
    browser.storage.local.get({ "tabclose-review-child": true }, (prefs) => {
      if (!(data.addonid in tabsToClose)) {
        tabsToClose[data.addonid] = {};
      }
      tabsToClose[data.addonid][sender.tab.id] = true;
      reviewPages[sender.tab.id] = data.addonid;
    });
  } else if (data.action == "tabclose-backtoreview") {
    let urls = REVIEW_PATTERNS.map(url => url.replace(/{addon}/, data.slug));
    browser.tabs.query({ url: urls }, ([tab, ...rest]) => {
      if (tab) {
        browser.tabs.update(tab.id, { active: true }, () => {
          browser.tabs.remove(sender.tab.id);
        });
      } else {
        browser.tabs.update(sender.tab.id, { url: url });
      }
    });
  }
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  browser.storage.local.get({
    "tabclose-other-queue": true,
    "tabclose-review-child": true
  }, (prefs) => {
    let isReview = tab.url.match(REVIEW_RE);
    let isQueue = tab.url.match(QUEUE_RE);

    if (isReview) {
      reviewPages[tabId] = isReview[4];
    } else if (isQueue) {
      if (tabId in reviewPages) {
        removeTabsFor(tabId, reviewPages[tabId], prefs["tabclose-review-child"]);
      }

      if (changeInfo.status == "complete" && prefs["tabclose-other-queue"]) {
        removeOtherTabs(tab.url, tab);
      }
    }
  });
});

browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
  let slug = reviewPages[tabId];
  delete reviewPages[tabId];

  browser.storage.local.get({ "tabclose-review-child": true }, (prefs) => {
    if (slug) {
      removeTabsFor(tabId, slug, prefs["tabclose-review-child"]);
    }
  });
});
