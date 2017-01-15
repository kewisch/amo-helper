const REVIEW_RE = /https:\/\/addons.mozilla.org\/([^\/]+)\/editors\/review\/(.*)/;
const QUEUE_RE = /https:\/\/addons.mozilla.org\/([^\/]+)\/editors\/queue\/(.*)/;

var pageMod = require("sdk/page-mod");
var tabs = require("sdk/tabs");
var prefs = require("sdk/simple-prefs");

var tabsToClose = {};
var reviewPages = {};

function removeTabsFor(tabId, addonid, closeTabs) {
  console.log(`Removing tabs for ${tabId} / ${addonid}`);
  if (tabsToClose[addonid]) {
    if (closeTabs) {
      for (let tab of Object.values(tabsToClose[addonid])) {
        tab.close();
      }
    }
    delete tabsToClose[addonid];
  }

  delete reviewPages[tabId];
}

function removeOtherTabs(tabUrl, keepTab) {
  let closingActiveTab = false;
  let findTabUrl = tabUrl.split(/\?|#/)[0];

  for (let tab of tabs) {
    if (!tab.url.startsWith(findTabUrl)) {
      continue;
    }

    let shouldClose = tab.id != keepTab.id;
    let isActive = tab.id == tabs.activeTab.id;
    if (shouldClose && isActive) {
      closingActiveTab = true;
    }

    if (shouldClose) {
      tab.close();
    }
  }

  if (closingActiveTab) {
    keepTab.activate();
  }
}

function tabReady(tab) {
  let isReview = tab.url.match(REVIEW_RE);
  let isQueue = tab.url.match(QUEUE_RE);

  if (isReview) {
    reviewPages[tab.id] = isReview[2];
  } else if (isQueue) {
    if (tab.id in reviewPages) {
      removeTabsFor(tab.id, reviewPages[tab.id], prefs.prefs["tabclose-review-children"]);
    }

    if (tab.readyState == "complete" && prefs.prefs["tabclose-other-queue"]) {
      removeOtherTabs(tab.url, tab);
    }
  }
}

function tabClose(tab) {
  if (!prefs.prefs["tabclose-review-children"]) {
    return;
  }

  let matches = tab.url.match(REVIEW_RE);
  if (matches) {
    removeTabsFor(tab.id, matches[2], prefs.prefs["tabclose-review-children"]);
  }
}

exports.startup = function() {
  tabs.on("ready", tabReady);
  tabs.on("close", tabClose);

  pageMod.PageMod({
    include: [
      "https://addons.mozilla.org/en-US/firefox/files/browse/*",
      "https://addons.mozilla.org/en-US/firefox/files/compare/*",
      "https://addons.mozilla.org/en-US/developers/addon/*"
    ],
    contentScriptWhen: "ready",
    contentScriptFile: "./tabclose/find_addonid.js",
    onAttach: function(worker) {
      worker.port.on("addon-id", (data) => {
        if (!(data.addonid in tabsToClose)) {
          tabsToClose[data.addonid] = {};
        }

        tabsToClose[data.addonid][worker.tab.id] = worker.tab;
      });
    }
  });
};
