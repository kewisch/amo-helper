/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

function parseQueueNumbers(doc) {
  let queues = [...doc.querySelectorAll("#main-wrapper .tabnav li a")];
  let countre = /\((\d+)\)/;
  let numbers = {};

  for (let queue of queues) {
    let queueNameParts = queue.getAttribute("href").split("/");
    let queueName = queueNameParts[queueNameParts.length - 1];
    let match = queue.textContent.match(countre);

    if (match) {
      numbers[queueName] = { total: parseInt(match[1], 10) };
    }
  }

  return numbers;
}

function updateQueueNumbers() {
  return fetch("https://addons.mozilla.org/en-US/editors/queue/auto_approved", { mode: "cors", credentials: "include" }).then((response) => {
    return response.text();
  }).then((text) => {
    let parser = new DOMParser();
    let doc = parser.parseFromString(text, "text/html");
    return parseQueueNumbers(doc);
  });
}

function updateBadge(numbers) {
  browser.storage.local.get({ "browseraction-count-moderator": false }, (prefs) => {
    if (!prefs["browseraction-count-moderator"]) {
      delete numbers.reviews;
    }

    let total = Object.values(numbers).reduce((result, queue) => {
      return result + queue.total;
    }, 0);

    browser.browserAction.setBadgeText({ text: total.toString() });
  });
}

function setupQueueRefresh() {
  browser.storage.local.get({ "browseraction-queue-refresh-period": 60 }, (prefs) => {
    browser.alarms.clear("queuelength", () => {
      browser.alarms.create("queuelength", {
        delayInMinutes: 0,
        periodInMinutes: prefs["browseraction-queue-refresh-period"]
      });
    });
  });
}

async function closeAMOTabs() {
  let urls = AMO_EDITORS_PATTERNS.concat(AMO_PRIVACY_PAGES).concat(FILEBROWSER_PATTERNS);
  let results = await browser.tabs.query({ url: urls });

  let tabIds = [].concat(...results).map(tab => tab.id);
  await browser.tabs.remove(tabIds);
}

function switchToReviewPage() {
  browser.tabs.query({ active: true, currentWindow: true }, ([tab, ...rest]) => {
    let match = tab.url.match(ADDON_LINKS_RE);
    if (match) {
      browser.tabs.update(tab.id, { url: REVIEW_URL.replace(/{addon}/, match[4]) });
    }
  });
}

// -- main --

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name == "queuelength") {
    updateQueueNumbers().then(updateBadge);
  }
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area != "local") {
    return;
  }

  for (let key of Object.keys(changes)) {
    if (key == "browseraction-queue-refresh-period") {
      setupQueueRefresh();
      return;
    }
  }
});

browser.runtime.onMessage.addListener((data, sender, sendReply) => {
  if (data.action == "popup-action-refreshcount") {
    updateQueueNumbers().then(updateBadge);
  } else if (data.action == "popup-action-closetabs") {
    closeAMOTabs();
  } else if (data.action == "popup-action-gotoreview") {
    switchToReviewPage();
  } else if (data.action == "update-badge-numbers") {
    updateBadge(data.numbers);
  }
});

setupQueueRefresh();
updateQueueNumbers().then(updateBadge);
