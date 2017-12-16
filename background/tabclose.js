/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

"use strict";

class TabsToCloseMap extends Map {
  addTab(addon, tabId) {
    let tabs = this.get(addon);
    if (!tabs) {
      tabs = new Set();
      this.set(addon, tabs);
    }

    tabs.add(tabId);
  }

  close(addon, closeTabs) {
    let tabs = this.get(addon);
    if (tabs && closeTabs) {
      browser.tabs.remove([...tabs.values()]);
    }
    this.delete(addon);
  }
}

class ReviewPageMap extends Map {
  constructor(...args) {
    super(...args);
    this.tabsToClose = new TabsToCloseMap();
  }

  addChildTab(reviewTabId, childTabId) {
    let addon = this.get(reviewTabId);
    this.tabsToClose.addTab(addon, childTabId);
  }

  close(tabId, closeTabs) {
    let addon = this.get(tabId);
    this.tabsToClose.close(addon, closeTabs);
    this.delete(tabId);
  }
}

let reviewPages = new ReviewPageMap();

function relevantReviewChild(url) {
  return url.match(ADDON_LINKS_RE) || url.match(FILEBROWSER_RE) || url.match(USER_RE);
}

async function copyScrollPosition(from, to) {
  let code = "({ scrollY: window.scrollY, scrollX: window.scrollX })";
  let position = await browser.tabs.executeScript(from.id, { code: code });

  // Did you know that an attacker can assign a string to window.scrollY?
  position.scrollX = parseInt(position.scrollX, 10);
  position.scrollY = parseInt(position.scrollY, 10);

  code = `window.scrollTo(${position.scrollX}, ${position.scrollY})`;
  await browser.tabs.executeScript(to.id, { code: code });
}

async function removeOtherTabs(tabUrl, keepTab) {
  let findTabUrl = tabUrl.split(/\?|#/)[0] + "*";
  let compareTabs = await browser.tabs.query({ url: findTabUrl });

  let closingActiveTab = null;
  let closeTabs = compareTabs.filter(tab => {
    let shouldClose = tab.windowId != keepTab.windowId || tab.id != keepTab.id;
    if (shouldClose && tab.active) {
      closingActiveTab = tab;
    }
    return shouldClose;
  });

  if (closingActiveTab) {
    await copyScrollPosition(closingActiveTab, keepTab);
    await browser.tabs.update(keepTab.id, { active: true });
  }

  if (closeTabs.length) {
    await browser.tabs.move(keepTab.id, { index: closeTabs[0].index });
  }
  await browser.tabs.remove(closeTabs.map(tab => tab.id));
}

browser.runtime.onMessage.addListener((data, sender) => {
  (async () => {
    if (data.action == "tabclose-backtoreview") {
      let instance = await getStoragePreference("instance");
      let urls = REVIEW_PATTERNS.map(url => {
        return replacePattern(url, { addon: data.slug, instance: instance });
      });
      let [tab, ...rest] = await browser.tabs.query({ url: urls });
      if (tab) {
        await browser.tabs.update(tab.id, { active: true });
        browser.tabs.remove(sender.tab.id);
      } else {
        browser.tabs.update(sender.tab.id, { url: url });
      }
    }
  })();
});

browser.tabs.onUpdated.addListener(async (tabId, { status, url }, tab) => {
  if (!status && !url) {
    // Only care about status and URL changes
    return;
  }
  let isReview = tab.url.match(REVIEW_RE);

  if (isReview) {
    // This is a review page, keep track of it
    reviewPages.set(tabId, isReview[4]);
  } else if (tab.url.match(QUEUE_RE) && status == "complete" &&
             await getStoragePreference("tabclose-other-queue")) {
    // We've loaded a queue page, close other queues if requested
    removeOtherTabs(tab.url, tab);
  } else if (reviewPages.has(tab.openerTabId) && relevantReviewChild(tab.url)) {
    // This is tab opened from a review page, it should be closed with the review page
    reviewPages.addChildTab(tab.openerTabId, tabId);
  } else if (!isReview && status == "complete" && reviewPages.has(tabId)) {
    // The tab navigated to another page, we can remove now
    reviewPages.close(tabId, await getStoragePreference("tabclose-review-child"));
  }
});

browser.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  if (reviewPages.has(tabId)) {
    reviewPages.close(tabId, await getStoragePreference("tabclose-review-child"));
  }
});
