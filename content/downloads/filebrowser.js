/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

createCommand("amoqueue-download", "Download", null, async () => {
  let version = document.getElementById("metadata").getAttribute("data-version");
  let slug = document.getElementById("metadata").getAttribute("data-slug");

  let prefs = await browser.runtime.sendMessage({ action: "infostorage", op: "get", storage: "slug", keys: ["slugInfo." + slug] });
  let id = prefs["slugInfo." + slug];

  browser.runtime.sendMessage({ action: "download", addonid: id, version: version });
});
