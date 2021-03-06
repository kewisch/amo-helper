/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

const allSuggestions = {
  "": {
    content: "{keyword}",
    description: "Editor Review for {keyword}",
    url: "https://{instance}/reviewers/review/{keyword}"
  },
  "addon": {
    content: "addon {keyword}",
    description: "Add-on Listing for {keyword}",
    url: "https://{instance}/addon/{keyword}"
  },
  "devhub": {
    content: "devhub {keyword}",
    description: "Developer Hub for {keyword}",
    url: "https://{instance}/developers/addon/{keyword}/edit"
  },
  "versions": {
    content: "versions {keyword}",
    description: "Developer Versions for {keyword}",
    url: "https://{instance}/developers/addon/{keyword}/versions"
  },
  "admin": {
    content: "admin {keyword}",
    description: "Admin Page for {keyword}",
    url: "https://{instance}/admin/addon/manage/{keyword}"
  },
  "feed": {
    content: "feed {keyword}",
    description: "Activity Log for {keyword}",
    url: "https://{instance}/developers/feed/{keyword}"
  },
  "stats": {
    content: "stats {keyword}",
    description: "Statistics Dashboard for {keyword}",
    url: "https://{instance}/firefox/addon/{keyword}/statistics/"
  }
};

async function resetDefaultSuggestion() {
  let instance = await getStoragePreference("instance");
  browser.omnibox.setDefaultSuggestion({ description: "Visit " + instance });
}

function inputChangedListener(text, suggest) {
  let descriptionText = replacePattern(allSuggestions[""].description, { keyword: text });
  browser.omnibox.setDefaultSuggestion({ description: descriptionText });

  suggest(Object.values(allSuggestions).map(({ content, description }) => {
    return {
      content: replacePattern(content, { keyword: text }),
      description: replacePattern(description, { keyword: text }),
    };
  }));
}

async function inputEnteredListener(text, disposition) {
  await resetDefaultSuggestion();

  let [action, slug, ...rest] = text.split(/\W+/);
  if (!slug) {
    slug = action;
    action = "";
  }

  let data = allSuggestions[action];
  if (!data) {
    return;
  }

  let instance = await getStoragePreference("instance");
  let url = replacePattern(data.url, { keyword: slug, instance: instance });

  if (disposition == "currentTab") {
    let tabs = await browser.tabs.query({ active: true, currentWindow: true });
    await browser.tabs.update(tabs[0].id, { url: url });
  } else {
    await browser.tabs.create({ url: url, active: disposition == "newForegroundTab" });
  }
}

async function setupListeners() {
  browser.omnibox.onInputChanged.removeListener(inputChangedListener);
  browser.omnibox.onInputEntered.removeListener(inputEnteredListener);
  browser.omnibox.onInputCancelled.removeListener(resetDefaultSuggestion);

  if (await getStoragePreference("omnibox-enabled")) {
    browser.omnibox.onInputChanged.addListener(inputChangedListener);
    browser.omnibox.onInputEntered.addListener(inputEnteredListener);
    browser.omnibox.onInputCancelled.addListener(resetDefaultSuggestion);
  }
}

browser.storage.onChanged.addListener((changes, area) => {
  if (area != "local") {
    return;
  }

  for (let key of Object.keys(changes)) {
    if (key == "omnibox-enabled") {
      setupListeners();
      return;
    }
  }
});

// -- main --

setupListeners();
resetDefaultSuggestion();
