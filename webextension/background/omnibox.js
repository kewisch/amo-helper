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
  chrome.omnibox.setDefaultSuggestion({ description: "Visit addons.mozilla.org" });
}

function setupListeners() {
  chrome.omnibox.onInputChanged.addListener((text, suggest) => {
    chrome.omnibox.setDefaultSuggestion({ description: allSuggestions[""].description.replace("%s", text) });

    suggest(Object.values(allSuggestions).map(({ content, description }) => {
      return {
        content: content.replace("%s", text),
        description: description.replace("%s", text)
      };
    }));
  });

  chrome.omnibox.onInputEntered.addListener((text, disposition) => {
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
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.update(tabs[0].id, { url: url });
      });
    } else {
      chrome.tabs.create({ url: url, active: disposition == "newForegroundTab" });
    }
  });

  chrome.omnibox.onInputCancelled.addListener(resetDefaultSuggestion);
}

// -- main --

setupListeners();
resetDefaultSuggestion();
