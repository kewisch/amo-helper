/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */


createAction("Copy Slug", (event) => {
  let textarea = document.createElement("textarea");
  textarea.value = decodeURIComponent(document.location.href.match(/\/([^/]+)$/)[1]);

  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();

  event.preventDefault();
  event.stopPropagation();
}, "click-feedback");

createAction("Download", (event) => {
  let id = document.querySelector("#addon").getAttribute("data-id");
  browser.runtime.sendMessage({ action: "download", addonid: id, version: "latest" });

  event.preventDefault();
  event.stopPropagation();
}, "click-feedback");
