/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

let per_page_value = 200;
let last_queue_page = {};

/* exported getLastQueue, queueByAddon */

function getLastQueue(queue) {
  return last_queue_page[queue] || [];
}
function queueByAddon(slug, queue) {
  if (queue) {
    // Not great performance, this can be optimized later
    for (let [curqueue, addons] of Object.entries(last_queue_page)) {
      let index = addons.findIndex(addon => addon == slug);
      if (index > -1) {
        return { index: index, queue: curqueue, addons: addons };
      }
    }
  } else {
    let addons = last_queue_page[queueName];
    let index = addons.findIndex(addon => addon == slug);
    if (index > -1) {
      return { index: index, queue: queue, addons: addons };
    }
  }

  return { index: -1, queue: null, addons: [] };
}

browser.webRequest.onBeforeRequest.addListener((details) => {
  let url = new URL(details.url);
  if (!url.search.includes("per_page") && per_page_value != DEFAULT_PREFERENCES["queueinfo-per-page"]) {
    url.search = "?per_page=" + per_page_value;
    return { redirectUrl: url.href };
  }

  return {};
}, { urls: AMO_QUEUE_PATTERNS }, ["blocking"]);


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
