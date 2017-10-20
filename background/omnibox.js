/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

const allSuggestions = {
  "": {
    content: "%s",
    description: "Editor Review for %s",
    url: "https://addons.mozilla.org/editors/review/%s"
  },
  "addon": {
    content: "addon %s",
    description: "Add-on Listing for %s",
    url: "https://addons.mozilla.org/addon/%s"
  },
  "devhub": {
    content: "devhub %s",
    description: "Developer Hub for %s",
    url: "https://addons.mozilla.org/developers/addon/%s/edit"
  },
  "versions": {
    content: "versions %s",
    description: "Developer Versions for %s",
    url: "https://addons.mozilla.org/developers/addon/%s/versions"
  },
  "admin": {
    content: "admin %s",
    description: "Admin Page for %s",
    url: "https://addons.mozilla.org/admin/addon/manage/%s"
  },
  "feed": {
    content: "feed %s",
    description: "Activity Log for %s",
    url: "https://addons.mozilla.org/developers/feed/%s"
  },
  "stats": {
    content: "stats %s",
    description: "Statistics Dashboard for %s",
    url: "https://addons.mozilla.org/firefox/addon/%s/statistics/"
  }
};

function resetDefaultSuggestion() {
  browser.omnibox.setDefaultSuggestion({ description: "Visit addons.mozilla.org" });
}

function inputChangedListener(text, suggest) {
  browser.omnibox.setDefaultSuggestion({ description: allSuggestions[""].description.replace("%s", text) });

  suggest(Object.values(allSuggestions).map(({ content, description }) => {
    return {
      content: content.replace("%s", text),
      description: description.replace("%s", text)
    };
  }));
}

function inputEnteredListener(text, disposition) {
  resetDefaultSuggestion();

  let [action, slug, ...rest] = text.split(/\W+/);
  if (!slug) {
    slug = action;
    action = "";
  }

  let data = allSuggestions[action];
  if (!data) {
    return;
  }

  let url = data.url.replace("%s", slug);

  if (disposition == "currentTab") {
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      browser.tabs.update(tabs[0].id, { url: url });
    });
  } else {
    browser.tabs.create({ url: url, active: disposition == "newForegroundTab" });
  }
}

function setupListeners() {
  browser.storage.local.get({ "omnibox-enabled": true }, (prefs) => {
    browser.omnibox.onInputChanged.removeListener(inputChangedListener);
    browser.omnibox.onInputEntered.removeListener(inputEnteredListener);
    browser.omnibox.onInputCancelled.removeListener(resetDefaultSuggestion);

    if (prefs["omnibox-enabled"]) {
      browser.omnibox.onInputChanged.addListener(inputChangedListener);
      browser.omnibox.onInputEntered.addListener(inputEnteredListener);
      browser.omnibox.onInputCancelled.addListener(resetDefaultSuggestion);
    }
  });
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
