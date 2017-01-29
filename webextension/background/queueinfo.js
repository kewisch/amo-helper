let per_page_value = 100;

chrome.webRequest.onBeforeRequest.addListener((details) => {
  let url = new URL(details.url);
  if (!url.search.includes("per_page") && per_page_value != 100) {
    url.search = "?per_page=" + per_page_value;
    return { redirectUrl: url.href };
  }

  return {};
}, { urls: ["https://addons.mozilla.org/en-US/editors/queue/*"] }, ["blocking"]);


chrome.storage.onChanged.addListener((changes, area) => {
  if (area != "local") {
    return;
  }

  for (let [key, { newValue }] of Object.entries(changes)) {
    if (key == "queueinfo-per-page") {
      per_page_value = newValue;
    }
  }
});

chrome.storage.local.get({ "queueinfo-per-page": 100 }, (prefs) => {
  per_page_value = prefs["queueinfo-per-page"];
});

// TODO cleanup reviewInfo
// {
//   "name": "staletime",
//   "title": "Hours to keep information",
//   "description": "Review information older than this amount of hours will get removed",
//   "type": "integer",
//   "value": 24
// },
