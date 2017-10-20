/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

function onclickln(event) {
  let linelink = $(event.target);
  let filename = $(".file.selected").attr("data-short");
  let line = linelink.attr("data-linenumber");

  let text = filename + " line " + line;
  if (event.metaKey) {
    text = last_copy_data + ", " + text;
  }
  last_copy_data = text;

  let copybox = $("<textarea/>");
  copybox.text(text);
  $("body").append(copybox);
  copybox.select();
  document.execCommand("copy");
  copybox.remove();
  event.preventDefault();
  event.stopPropagation();
}

var last_copy_data = "";
$("#file-viewer-inner").on("click", ".td-line-number a", onclickln);

window.addEventListener("load", () => {
  document.querySelectorAll("#files-tree .directory.closed.diff").forEach(node => {
    if (node.getAttribute("href").endsWith("/file/_locales")) {
      return;
    }

    let children = node.parentNode.nextElementSibling;

    node.classList.remove("closed");
    node.classList.add("open");
    children.style.display = "block";
  });
});
