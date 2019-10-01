/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

getStoragePreference("filewindow-enabled").then((enabled) => {
  if (!enabled) {
    return;
  }

  $(".file-info a[href*='/browse/'], .file-info a[href*='/compare/']").on("click", (event) => {
    let url = new URL(event.target.href, window.location);
    browser.runtime.sendMessage({ action: "filewindow-open", url: url.href });
    event.preventDefault();
    event.stopPropagation();
  });
});
