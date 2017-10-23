/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

createCommand("amoqueue-hide-delete", "Toggle deleted lines", "+", () => {
  document.body.classList.toggle("amoqueue-hide-delete");
});

createCommand("amoqueue-hide-delete", "Toggle comment lines", "*", () => {
  if (!document.querySelector("tr[amoqueue-comment-only]")) {
    for (let row of document.querySelectorAll(".tr-line")) {
      let linecode = row.querySelector(".line-code");

      // This is for file diffs, where the structure is slightly different
      if (linecode.firstElementChild && linecode.firstElementChild.className == "plain") {
        linecode = linecode.firstElementChild;
      }

      if (linecode.children.length == 2 && linecode.children[0].classList.contains("spaces") && linecode.children[1].classList.contains("comments")) {
        // full line comments with some weird spaces up front
        row.classList.add("amoqueue-comment-only");
      } else if (linecode.children.length == 1 && linecode.children[0].classList.contains("comments")) {
        // full line comments without spacing
        row.classList.add("amoqueue-comment-only");
      }
    }
  }

  let content = document.getElementById("content") || document.getElementById("diff");
  let tablepos = content.querySelector(":scope > div > table").getBoundingClientRect();
  let toprow = document.elementFromPoint(tablepos.x, Math.max(0, tablepos.y));

  document.body.classList.toggle("amoqueue-hide-comments");
  toprow.scrollIntoView(true);
});

createCommand("amoqueue-copy-slug", "Copy Slug", null, () => {
  let slug = document.querySelector("a.command[href*='editors/review']").getAttribute("href").split("/")[4];

  let textarea = document.createElement("textarea");
  textarea.value = decodeURIComponent(slug);

  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
});
