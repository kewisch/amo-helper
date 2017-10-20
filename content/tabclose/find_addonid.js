/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

// /en-US/editors/review/<slug>
let link = document.querySelector("#main-wrapper > .section > h3 > a");
if (link) {
  let parts = link.getAttribute("href").split("/");
  let slug = parts[parts.length - 1];
  browser.runtime.sendMessage({ action: "addonid", addonid: slug, from: "codeviewer" });
}

// /en-US/developers/addon/<slug>/file/<filenumber>/validation/annotate
link = document.querySelector("#addon-validator-suite");
if (link) {
  let parts = link.getAttribute("data-annotate-url").split("/");
  let slug = parts[4];
  browser.runtime.sendMessage({ action: "addonid", addonid: slug, from: "validation" });
}
