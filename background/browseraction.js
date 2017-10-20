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
  chrome.storage.local.get({ "browseraction-count-moderator": false }, (prefs) => {
    if (!prefs["browseraction-count-moderator"]) {
      delete numbers.reviews;
    }

    let total = Object.values(numbers).reduce((result, queue) => {
      return result + queue.total;
    }, 0);

    chrome.browserAction.setBadgeText({ text: total.toString() });
  });
}

function setupQueueRefresh() {
  chrome.storage.local.get({ "browseraction-queue-refresh-period": 60 }, (prefs) => {
    chrome.alarms.clear("queuelength", () => {
      chrome.alarms.create("queuelength", {
        delayInMinutes: 0,
        periodInMinutes: prefs["browseraction-queue-refresh-period"]
      });
    });
  });
}

async function closeAMOTabs() {
  let results = await Promise.all([
    // Editor pages
    browser.tabs.query({ url: "https://addons.mozilla.org/en-US/editors/*" }),
    browser.tabs.query({ url: "https://addons.mozilla.org/en-US/firefox/addon/*/privacy/" }),

    // File browsers
    browser.tabs.query({ url: "https://addons.mozilla.org/en-US/firefox/files/*" })
  ]);

  let tabIds = [].concat(...results).map(tab => tab.id);
  await browser.tabs.remove(tabIds);
}

function switchToReviewPage() {
  let RE_ADDON_LINKS = /https:\/\/addons.mozilla.org\/([^/]*)\/(editors\/review(|-listed|-unlisted)|admin\/addon\/manage|[^/]*\/addon|developers\/feed)\/([^/#?]*)(\/edit)?/;
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab, ...rest]) => {
    let match = tab.url.match(RE_ADDON_LINKS);
    if (match) {
      chrome.tabs.update(tab.id, { url: "https://addons.mozilla.org/en-US/editors/review/" + match[4] });
    }
  });
}

// -- main --

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name == "queuelength") {
    updateQueueNumbers().then(updateBadge);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
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
