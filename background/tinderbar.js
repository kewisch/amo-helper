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
    return { slug: matchCurrentTab ? matchCurrentTab[3] : null, tab: currentTabs[0] };
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
//   let prefs = await browser.storage.local.get({ instance: "addons.mozilla.org" });
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
//       url: REVIEW_URL.replace(/{addon}/, nextaddon).replace(/{instance}/, prefs["instance"]);
//     });
//
//     active = false;
//   }
// }

function tinderStop() {
  tinder_running = false;
  browser.tabs.remove(tinder_current_tabs.map(data => data.tab.id));
}

async function tinderNextTab(currentTab) {
  tinder_running = true;

  // Make sure at least one tab is loaded
  await tinderTabsLoadNext();

  // Now load the rest in the background
  tinderTabsPreload();

  // focus the next tab
  let curTabIndex = tinder_current_tabs.findIndex(data => data.tab.id == currentTab.id);
  let nextTab = tinder_current_tabs[curTabIndex + 1];
  if (nextTab) {
    await browser.tabs.update(nextTab.tab.id, { active: true });
  } else {
    tinder_running = false;
  }
}

async function tinderTabsLoadNext() {
  let prefs = await browser.storage.local.get({ "tinderbar-preload-tabs": 3, "instance": "addons.mozilla.org" });
  if (!tinder_running || tinder_current_tabs.length >= prefs["tinderbar-preload-tabs"]) {
    return;
  }

  let { slug: lastSlug, tab: lastTab } = await getLastTab();
  let { index=-1, addons=[] } = queueByAddon(lastSlug);
  let nextaddon = addons[index + 1];
  if (!nextaddon) {
    tinder_running = false;
    return;
  }

  let [createdPromise, updatedPromise] = createCompleteTab({
    index: lastTab.index + 1,
    active: false,
    url: REVIEW_URL.replace(/{addon}/, nextaddon).replace(/{instance}/, prefs["instance"])
  });

  let tab = await createdPromise;
  tinder_current_tabs.push({ slug: nextaddon, tab: tab });

  await updatedPromise;
}

async function tinderTabsPreload() {
  let prefs = await browser.storage.local.get({ "tinderbar-preload-tabs": 3 });
  while (tinder_running && tinder_current_tabs.length < prefs["tinderbar-preload-tabs"]) {
    await tinderTabsLoadNext();
  }
}

browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
  let tabIndex = tinder_current_tabs.findIndex(data => data.tab.id == tabId);
  if (tabIndex > -1) {
    tinder_current_tabs.splice(tabIndex, 1);
    tinderTabsPreload();
  }
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && !REVIEW_RE.test(changeInfo.url)) {
    let tabIndex = tinder_current_tabs.findIndex(data => data.tab.id == tabId);
    if (tabIndex > -1) {
      tinder_current_tabs.splice(tabIndex, 1);
      tinderTabsPreload();
    }
  }
});

browser.runtime.onMessage.addListener((data, sender) => {
  if (data.action == "tinder" && data.method == "start") {
    tinderStart(sender.tab);
  } else if (data.action == "tinder" && data.method == "next") {
    if (data.result == "stop") {
      tinderStop();
    } else {
      if (data.result == "skip") {
        browser.tabs.remove(sender.tab.id);
      }
      tinderNextTab(sender.tab);
    }
  }
});
