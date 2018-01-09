/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

let tinder_current_tabs = [];
browser.storage.local.set({ "tinderbar-running": false });

async function getLastTab() {
  let len = tinder_current_tabs.length;
  if (len == 0) {
    let currentTabs = await browser.tabs.query({ active: true, currentWindow: true });
    let matchCurrentTab = currentTabs[0].url.match(REVIEW_RE);
    return {
      slug: matchCurrentTab ? matchCurrentTab[4] : null,
      tabId: currentTabs[0].id,
      isContent: matchCurrentTab ? matchCurrentTab[3] == "-content" : false
    };
  } else {
    return tinder_current_tabs[tinder_current_tabs.length - 1];
  }
}

function createCompleteTab(createOptions) {
  let expectTab = null;
  let updatePromise = new Promise((resolve, reject) => {
    let updater = (tabId, changeInfo, tab) => {
      if (changeInfo.url && expectTab && expectTab.id == tabId) {
        browser.tabs.onUpdated.removeListener(updater);
        resolve(tab);
      }
    };

    browser.tabs.onUpdated.addListener(updater);
  });

  let createPromise = browser.tabs.create(createOptions).then(tab => {
    expectTab = tab;
    return tab;
  });

  return [createPromise, updatePromise];
}


async function tinderStop() {
  await browser.storage.local.set({ "tinderbar-running": false });
  await browser.tabs.remove(tinder_current_tabs.map(data => data.tabId));
  tinder_current_tabs = [];
}

async function tinderStart(tab) {
  let matchCurrentTab = tab.url.match(REVIEW_RE);
  let isContent = matchCurrentTab ? matchCurrentTab[3] == "-content" : false;
  let slug = matchCurrentTab ? matchCurrentTab[4] : null;
  tinder_current_tabs.push({ slug: slug, tabId: tab.id, isContent: isContent });

  await browser.storage.local.set({ "tinderbar-running": true });
  tinderTabsPreload();
}

async function tinderNextTab(currentTab) {
  await browser.storage.local.set({ "tinderbar-running": true });

  // Make sure at least one tab is loaded
  await tinderTabsLoadNext();

  // Now load the rest in the background
  tinderTabsPreload();

  // focus the next tab
  let curTabIndex = tinder_current_tabs.findIndex(data => data.tabId == currentTab.id);
  let nextTab = tinder_current_tabs[curTabIndex + 1];
  if (nextTab) {
    await browser.tabs.update(nextTab.tabId, { active: true });
  } else {
    await browser.storage.local.set({ "tinderbar-running": false });
  }
}

async function tinderTabsLoadNext() {
  let prefs = await getStoragePreference(["tinderbar-preload-tabs", "instance", "tinderbar-running"]);
  if (!prefs["tinderbar-running"] || tinder_current_tabs.length >= prefs["tinderbar-preload-tabs"]) {
    return;
  }

  let { slug: lastSlug, tabId: lastTabId, isContent } = await getLastTab();
  let { index=-1, addons=[] } = queueByAddon(lastSlug, isContent && "content_review");
  let nextaddon = addons[index + 1];
  if (!nextaddon) {
    await browser.storage.local.set({ "tinderbar-running": false });
    return;
  }

  let lastTab = await browser.tabs.get(lastTabId);

  let [createdPromise, updatedPromise] = createCompleteTab({
    index: lastTab.index + 1,
    active: false,
    url: replacePattern(REVIEW_URL, {
      addon: nextaddon,
      instance: prefs["instance"],
      type: isContent ? "-content" : ""
    })
  });

  let tab = await createdPromise;
  tinder_current_tabs.push({ slug: nextaddon, tabId: tab.id, isContent: isContent });

  await updatedPromise;
}

async function tinderTabsPreload() {
  let preload = await getStoragePreference("tinderbar-preload-tabs");
  let running = await getStoragePreference("tinderbar-running");
  while (running && tinder_current_tabs.length < preload) {
    await tinderTabsLoadNext();
    running = await getStoragePreference("tinderbar-running");
  }
}

browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
  let tabIndex = tinder_current_tabs.findIndex(data => data.tabId == tabId);
  if (tabIndex > -1) {
    tinder_current_tabs.splice(tabIndex, 1);
    tinderTabsPreload();
  }
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && !REVIEW_RE.test(changeInfo.url)) {
    let tabIndex = tinder_current_tabs.findIndex(data => data.tabId == tabId);
    if (tabIndex > -1) {
      tinder_current_tabs.splice(tabIndex, 1);
      tinderTabsPreload();
    }
  }
});

browser.runtime.onMessage.addListener((data, sender) => {
  if (data.action != "tinder") {
    return undefined;
  }

  return (async function() {
    if (data.method == "start") {
      await tinderStart(sender.tab);
    } else if (data.method == "next") {
      if (data.result == "stop") {
        tinderStop();
      } else if (data.result == "manual") {
        // On a manual click, only load next tabs if we are in tinder mode
        if (await getStoragePreference("tinderbar-running")) {
          await tinderNextTab(sender.tab);
        }
      } else {
        await tinderNextTab(sender.tab);
        if (data.result == "skip") {
          await browser.tabs.remove(sender.tab.id);
        }
      }
    }
  })();
});
