/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

let tinder_current_tabs = [];
let tinder_running = false;

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


// async function tinderstart(addons, preload=TABS_PRELOAD) {
//   let tabs = await browser.tabs.query({ active: true, currentWindow: true });
//   let instance = await getStoragePreference("instance");
//   let tabIndex = tabs[0].index;
//   let active = true;
//
//   // Create the first few tabs, making the first one active
//   for (let i = 0; i < preload; i++) {
//     let curaddon = addons.shift();
//     if (!curaddon) {
//       break;
//     }
//
//     browser.tabs.create({
//       index: ++tabIndex,
//       active: active,
//       url: REVIEW_URL.replace(/{addon}/, nextaddon).replace(/{instance}/, instance).replace(/{type}/, '');
//     });
//
//     active = false;
//   }
// }

function tinderStop() {
  tinder_running = false;
  browser.tabs.remove(tinder_current_tabs.map(data => data.tabId));
}

async function tinderNextTab(currentTab) {
  tinder_running = true;

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
    tinder_running = false;
  }
}

async function tinderTabsLoadNext() {
  let prefs = await getStoragePreference(["tinderbar-preload-tabs", "instance"]);
  if (!tinder_running || tinder_current_tabs.length >= prefs["tinderbar-preload-tabs"]) {
    return;
  }

  let { slug: lastSlug, tabId: lastTabId, isContent } = await getLastTab();
  let { index=-1, addons=[] } = queueByAddon(lastSlug, isContent && "content_review");
  let nextaddon = addons[index + 1];
  if (!nextaddon) {
    tinder_running = false;
    return;
  }

  let lastTab = await browser.tabs.get(lastTabId);
  let url = REVIEW_URL.replace(/{addon}/, nextaddon).replace(/{instance}/, prefs["instance"]).replace(/{type}/, isContent ? "-content" : "");

  let [createdPromise, updatedPromise] = createCompleteTab({
    index: lastTab.index + 1,
    active: false,
    url: url
  });

  let tab = await createdPromise;
  tinder_current_tabs.push({ slug: nextaddon, tabId: tab.id, isContent: isContent });

  await updatedPromise;
}

async function tinderTabsPreload() {
  let preload = await getStoragePreference("tinderbar-preload-tabs");
  while (tinder_running && tinder_current_tabs.length < preload) {
    await tinderTabsLoadNext();
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
      tinderStart(sender.tab);
    } else if (data.method == "next") {
      if (data.result == "stop") {
        tinderStop();
      } else {
        await tinderNextTab(sender.tab);
        if (data.result == "skip") {
          await browser.tabs.remove(sender.tab.id);
        }
      }
    }
  })();
});
