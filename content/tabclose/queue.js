chrome.runtime.onMessage.addListener((data, sender, sendReply) => {
  if (data.action == "getScrollPosition") {
    sendReply({ scrollY: window.scrollY, scrollX: window.scrollX });
  } else if (data.action == "setScrollPosition") {
    window.scrollTo(data.scrollX, data.scrollY);
    sendReply("ok");
  }
});
