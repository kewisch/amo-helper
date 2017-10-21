/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

function hideElement(node, value=true) {
  if (value) {
    node.setAttribute("hidden", "true");
  } else {
    node.removeAttribute("hidden");
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
        let prefs = await browser.storage.local.get({ instance: "addons.mozilla.org" });
        let url = `https://${prefs["instance"]}/en-US/${href.substr(6)}`;
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
  hideElement(document.getElementById("page-action-gotoreview"), !tab.url.match(ADDON_LINKS_RE));
}

window.addEventListener("DOMContentLoaded", () => {
  setupMenuClick();
  setupMenuState();
});
