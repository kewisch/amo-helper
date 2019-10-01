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
  let slug = document.querySelector("a.command[href*='reviewers/review']").getAttribute("href").split("/")[4];

  let textarea = document.createElement("textarea");
  textarea.value = decodeURIComponent(slug);

  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
});

function updateContentWrapper() {
  let para = document.querySelector("#content-wrapper > div > p");
  let match = para.childNodes[para.childNodes.length - 1].textContent.match(/Mimetype: ([^/]+)\/(.*)/);
  if (match && match[1] == "image") {
    let content = document.querySelector("#content-wrapper");
    let download = document.querySelector("#content-wrapper > div > p > a");

    let image = document.createElement("img");
    image.className = "amoqueue-content-image";
    image.src = download.href;

    content.insertBefore(image, content.firstChild);
  }
}

function setupManifestHover() {
  if (document.querySelector("a.file.selected").dataset.short != "manifest.json") {
    return;
  }

  let baseLocation = document.location.pathname.replace("manifest.json", "").replace("/file/", "/file-redirect/");
  let content = document.querySelector("#content");
  let manifest;
  try {
    manifest = JSON.parse(content.dataset.content.replace(/^\ufeff/, ""));
  } catch (e) {
    return;
  }
  let icons = [];
  if (manifest.icons) {
    icons.push(...Object.values(manifest.icons));
  }
  if (manifest.browser_action && manifest.browser_action.default_icon) {
    icons.push(...Object.values(manifest.browser_action.default_icon));
  }
  if (manifest.page_action && manifest.page_action.default_icon) {
    icons.push(...Object.values(manifest.page_action.default_icon));
  }
  if (manifest.sidebar_action && manifest.sidebar_action.default_icon) {
    icons.push(...Object.values(manifest.sidebar_action.default_icon));
  }

  if (manifest.theme && manifest.theme.images) {
    icons.push(manifest.theme.images.headerURL);
    icons.push(manifest.theme.images.theme_frame);
    icons.push(...(manifest.theme.additional_backgrounds || []));
  }

  let iconSet = new Set(icons);

  for (let iconpath of iconSet.values()) {
    let nodes = document.evaluate(
      `//code[text()='"${iconpath}"']`,
      content,
      null,
      XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE
    );

    for (let i = 0; i < nodes.snapshotLength; i++) {
      let codeNode = nodes.snapshotItem(i);
      let hover = document.createElement("span");
      hover.className = "amoqueue-image-hover";
      let image = document.createElement("img");
      image.src = baseLocation + "/" + iconpath;
      hover.appendChild(image);
      codeNode.appendChild(hover);
      codeNode.classList.add("amoqueue-image-hover-container");
    }
  }
}

function setupContentObserver() {
  let observer = new MutationObserver((mutations) => {
    for (let { addedNodes } of mutations) {
      if (addedNodes.length && addedNodes[0].id == "content-wrapper") {
        updateContentWrapper();
        setupManifestHover();
        break;
      }
    }
  });
  observer.observe(document.querySelector("#file-viewer-inner"), { childList: true });
  updateContentWrapper();
}

(function() {
  setupContentObserver();
  setupManifestHover();
})();
