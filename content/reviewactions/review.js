/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

function createAction(label, funcOrDest, className="") {
  let actions = document.getElementById("actions-addon");
  let dest = typeof funcOrDest == "string" ? funcOrDest : "#";
  let func = typeof funcOrDest == "string" ? null : funcOrDest;

  let item = actions.appendChild(document.createElement("li"));
  let link = item.appendChild(document.createElement("a"));

  link.setAttribute("href", dest);
  link.textContent = label;
  link.className = "amoqueue-action-link " + className;

  if (func) {
    link.addEventListener("click", func);
  }
}

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
  chrome.runtime.sendMessage({ action: "download", addonid: id, version: "latest" });

  event.preventDefault();
  event.stopPropagation();
}, "click-feedback");
