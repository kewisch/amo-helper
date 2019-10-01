/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

function showIf(id, value) {
  let node = document.getElementById(id);
  if (value) {
    node.removeAttribute("hidden");
  } else {
    node.setAttribute("hidden", "true");
  }
}

function setupMenuClick() {
  let menu = document.getElementById("menu");
  menu.addEventListener("click", (event) => {
    if (event.target.localName != "a") {
      return;
    }

    (async () => {
      let href = event.target.getAttribute("href");
      if (href.startsWith("#!AMO")) {
        let instance = await getStoragePreference("instance");
        let url = `https://${instance}/en-US/${href.substr(6)}`;
        await browser.tabs.create({ url: url });
      } else if (href.startsWith("#")) {
        await browser.runtime.sendMessage({ action: "popup-action-" + href.substr(1) });
      } else {
        await browser.tabs.create({ url: href });
      }

      window.close();
    })();

    event.preventDefault();
  });
}

async function setupMenuState() {
  // set up switch action
  let [tab, ...rest] = await browser.tabs.query({ active: true, currentWindow: true });
  showIf("page-action-gotocontent", tab.url.match(REVIEW_RE) && !tab.url.match(CONTENT_REVIEW_RE));
  showIf("page-action-gototechnical", tab.url.match(CONTENT_REVIEW_RE) || (
    tab.url.match(ADDON_LINKS_RE) && !tab.url.match(REVIEW_RE)
  ));
  showIf("page-action-showuseraddons", tab.url.match(USER_EDIT_RE));
}

window.addEventListener("DOMContentLoaded", () => {
  setupMenuClick();
  setupMenuState();
});
