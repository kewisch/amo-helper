window.addEventListener("DOMContentLoaded", () => {
  let menu = document.getElementById("menu");

  menu.addEventListener("click", (event) => {
    if (event.target.localName != "a") {
      return;
    }

    let href = event.target.getAttribute("href");
    let promise = Promise.resolve();

    if (href.startsWith("#")) {
      promise = browser.runtime.sendMessage({ action: "popup-action-" + href.substr(1) });
    } else {
      promise = browser.tabs.create({ url: event.target.getAttribute("href") });
    }

    promise.then(() => window.close());
  });
});
