let per_page_value = 100;

chrome.webRequest.onBeforeRequest.addListener((details) => {
  let url = new URL(details.url);
  if (!url.search.includes("per_page") && per_page_value != 100) {
    url.search = "?per_page=" + perPage;
    return { redirectUrl: url };
  }

  return {};
}, { urls: ["https://addons.mozilla.org/en-US/editors/queue/*"] }, ["blocking"]);


chrome.storage.onChanged.addListener((changes, area) => {
  if (area != "local") {
    return;
  }

  for (let [key, { newValue }] of Object.entries(changes)) {
    if (key == "queuePerPage") {
      per_page_value = newValue;
    }
  }
});

chrome.storage.local.get({ queuePerPage: 100 }, (values) => {
  per_page_value = values.queuePerPage;
});

// TODO cleanup reviewInfo
// {
//   "name": "staletime",
//   "title": "Hours to keep information",
//   "description": "Review information older than this amount of hours will get removed",
//   "type": "integer",
//   "value": 24
// },
