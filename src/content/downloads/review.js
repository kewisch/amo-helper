/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

// Make editors install link trigger a download
document.querySelector(".review-files, #review-files").addEventListener("click", (event) => {
  if (event.target.classList.contains("editors-install")) {
    let listbody = findParent(event.target, "listing-body");
    let headerparts = listbody.previousElementSibling.firstElementChild.textContent.match(/Version ([^·]+)· ([^·]+)· (.*)/);
    let version = headerparts[1].trim();
    let id = document.querySelector("#addon").getAttribute("data-id");
    browser.runtime.sendMessage({ action: "download", addonid: id, version: version });

    event.preventDefault();
    event.stopPropagation();
  }
});
