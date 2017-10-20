browser.runtime.onMessage.addListener((data, sender, sendReply) => {
  if (data.action == "openPrefs") {
    chrome.runtime.openOptionsPage();
  }
});
