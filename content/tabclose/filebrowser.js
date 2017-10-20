/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

document.querySelector("a.command[href*='editors/review']").addEventListener("click", (event) => {
  let slug = event.target.getAttribute("href").split("/")[4];

  chrome.runtime.sendMessage({ action: "tabclose-backtoreview", slug: slug });
  event.preventDefault();
  event.stopPropagation();
});
