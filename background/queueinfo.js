/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

let per_page_value = 200;
let last_queue_page = {};
let last_queue_name = null;

/* exported getLastQueue, queueByAddon, getLastVisitedQueue */

function getLastQueue(queue) {
  return last_queue_page[queue] || [];
}

function getLastVisitedQueue() {
  return last_queue_name;
}

function queueByAddon(slug, queue=last_queue_name) {
  let addons = last_queue_page[queue] || [];
  let index = addons.findIndex(addon => addon == slug);
  return { index, queue, addons };
}

browser.webRequest.onBeforeRequest.addListener((details) => {
  let url = new URL(details.url);
  if (!url.search.includes("per_page") && per_page_value != DEFAULT_PREFERENCES["queueinfo-per-page"]) {
    url.search = "?per_page=" + per_page_value;
    return { redirectUrl: url.href };
  }

  return {};
}, { urls: AMO_QUEUE_PATTERNS }, ["blocking"]);

browser.tabs.onUpdated.addListener((tabId, { url, status }, tab) => {
  if (tab && tab.url) {
    let match = tab.url.match(QUEUE_RE);
    if (match) {
      last_queue_name = match[3];
    }
  }
});


browser.storage.onChanged.addListener((changes, area) => {
  if (area != "local") {
    return;
  }

  for (let [key, { newValue }] of Object.entries(changes)) {
    if (key == "queueinfo-per-page") {
      per_page_value = newValue;
    }
  }
});

getStoragePreference("queueinfo-per-page").then((perPage) => {
  per_page_value = perPage;
});

browser.runtime.onMessage.addListener((data, sender) => {
  if (data.action != "queueinfo") {
    return undefined;
  }

  let rv;

  if (data.method == "set") {
    last_queue_page[data.queue] = data.addons;
    rv = null;
  } else if (data.method == "get") {
    rv = { queue: data.queue, addons: last_queue_page[data.queue] };
  }
  return rv;
});

// TODO cleanup reviewInfo
// {
//   "name": "staletime",
//   "title": "Hours to keep information",
//   "description": "Review information older than this amount of hours will get removed",
//   "type": "integer",
//   "value": 24
// },
