// TODO this is also used in the content script, too bad es6 imports don't work
// as expected.
function parseQueueNumbers(doc) {
  let queues = [...doc.querySelectorAll("#editors-stats-charts .editor-stats-table .editor-waiting")];
  let countre = /::\s*(\d+) add-ons/;
  let numbers = {};

  for (let queueName of ["new", "updates"]) {
    let parent = queues.shift();

    numbers[queueName] = {
      low: parseInt(parent.querySelector(".waiting_new").getAttribute("title").match(countre)[1], 10),
      med: parseInt(parent.querySelector(".waiting_med").getAttribute("title").match(countre)[1], 10),
      high: parseInt(parent.querySelector(".waiting_old").getAttribute("title").match(countre)[1], 10),
      url: "https://addons.mozilla.org/en-US/editors/queue/" + queueName
    };
    numbers[queueName].total = numbers[queueName]["low"] + numbers[queueName]["med"] + numbers[queueName]["high"];
  }


  let reviewsQueue = doc.querySelector("#editors_main .listing-header a[href='/en-US/editors/queue/reviews']");
  let match = reviewsQueue.textContent.match(/\((\d+)\)/);
  if (match) {
    numbers.reviews = { low: 0, med: 0, high: 0, total: parseInt(match[1], 10) };
  }

  return numbers;
}

function updateQueueNumbers() {
  return fetch("https://addons.mozilla.org/en-US/editors/", { mode: "cors", credentials: "include" }).then((response) => {
    return response.text();
  }).then((text) => {
    let parser = new DOMParser();
    let doc = parser.parseFromString(text, "text/html");
    return parseQueueNumbers(doc);
  });
}

function updateBadge(numbers, totalOnly=false) {
  chrome.storage.local.get({ "browseraction-count-moderator": false }, (prefs) => {
    if (!prefs["browseraction-count-moderator"]) {
      delete numbers.reviews;
    }

    let totalnumbers = Object.values(numbers).reduce((result, queue) => {
      result.low += queue.low;
      result.med += queue.med;
      result.high += queue.high;
      result.total += queue.total;
      return result;
    }, { low: 0, med: 0, high: 0, total: 0 });

    chrome.browserAction.setBadgeText({ text: totalnumbers.total.toString() });

    if (!totalOnly) {
      if (totalnumbers.high > 0) {
        chrome.browserAction.setBadgeBackgroundColor({ color: "red" }); // #ffd3d3
      } else if (totalnumbers.med > 0) {
        chrome.browserAction.setBadgeBackgroundColor({ color: "yellow" }); // #ffffb4
      } else if (totalnumbers.low > 0) {
        chrome.browserAction.setBadgeBackgroundColor({ color: "green" }); // #b8e6b8
      } else {
        // like this will ever happen. Not sure what the color was.
        chrome.browserAction.setBadgeBackgroundColor({ color: "gray" });
      }
    }
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

function switchToReviewPage() {
  let RE_ADDON_LINKS = /https:\/\/addons.mozilla.org\/([^\/]*)\/(editors\/review|admin\/addon\/manage|[^\/]*\/addon|developers\/feed)\/([^\/#?]*)(\/edit)?/;
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab, ...rest]) => {
    let match = tab.url.match(RE_ADDON_LINKS);
    if (match) {
      chrome.tabs.update(tab.id, { url: "https://addons.mozilla.org/en-US/editors/review/" + match[3] });
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

chrome.runtime.onMessage.addListener((data, sender, sendReply) => {
  if (data.action == "popup-action-refreshcount") {
    updateQueueNumbers().then(updateBadge);
  } else if (data.action == "popup-action-gotoreview") {
    switchToReviewPage();
  }
});

sdk.runtime.onMessage.addListener((data, sender, sendReply) => {
  if (data.action == "update-badge-numbers") {
    updateBadge(data.numbers, data.totalonly);
  }
});

setupQueueRefresh();
updateQueueNumbers().then(updateBadge);
