/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

function createCommand(id, text, key, func) {
  let backToReview = document.querySelector("#commands tr:last-child");
  let tr = backToReview.parentNode.insertBefore(document.createElement("tr"), backToReview);
  tr.id = id;

  let th = tr.appendChild(document.createElement("th"));
  let td = tr.appendChild(document.createElement("td"));

  if (key) {
    let code = document.createElement("code");
    code.textContent = key;
    code.setAttribute("title", text);
    th.appendChild(code);
  } else {
    tr.className = "amoqueue-no-key";
  }

  let anchor = document.createElement("a");
  anchor.className = "command";
  anchor.setAttribute("href", "#");
  anchor.textContent = text;
  td.appendChild(anchor);

  anchor.addEventListener("click", (event) => {
    func(event);
    event.preventDefault();
    event.stopPropagation();
  });

  if (key) {
    window.addEventListener("keypress", (event) => {
      if (event.key == key) {
        func(event);
        event.preventDefault();
        event.stopPropagation();
      }
    });
  }
}


// TODO move this to beautify when there is a simple import mechanism
createCommand("amoqueue-beautify", "Toggle Beautify", "o", () => {
  function prettyPrepare(node, attr) {
    let ucfAttr = attr[0].toUpperCase() + attr.substr(1);
    if (node.dataset[attr] && !node.dataset["amoqueuePretty" + ucfAttr]) {
      node.dataset["amoqueueOrig" + ucfAttr] = node.dataset[attr] || "";

      let pretty = prettyFast(node.dataset[attr], {
        url: document.location.href,
        indent: "    "
      });
      node.dataset["amoqueuePretty" + ucfAttr] = pretty.code || "";
    }

    let prettyContent = node.dataset["amoqueuePretty" + ucfAttr];
    let origContent = node.dataset["amoqueueOrig" + ucfAttr];
    let targetContent;

    if (node.dataset.amoqueueMode == "pretty") {
      node.dataset[attr] = targetContent = origContent || "";
    } else {
      node.dataset[attr] = targetContent = prettyContent || "";
    }

    return { prettyContent, origContent, targetContent };
  }

  function prettyRevert(node, attr, { prettyContent, origContent, targetContent }) {
    let ucfAttr = attr[0].toUpperCase() + attr.substr(1);

    // The highlighter removes the content and style attributes
    node.dataset["amoqueueOrig" + ucfAttr] = origContent || "";
    node.dataset["amoqueuePretty" + ucfAttr] = prettyContent || "";
    node.dataset[attr] = targetContent || "";
  }

  let amownd = window.wrappedJSObject;


  let node = document.getElementById("content") || document.getElementById("diff");
  let previousMode = node.dataset.amoqueueMode;
  let brush = node.dataset.brush;

  if (document.getElementById("content")) {
    let content = prettyPrepare(node, "content");
    amownd.Highlighter.highlight(amownd.$("#content"));
    prettyRevert(node, "content", content);
  } else if (document.getElementById("diff")) {
    let left = prettyPrepare(node, "left");
    let right = prettyPrepare(node, "right");

    amownd.Highlighter.highlight(amownd.$("#diff"));

    prettyRevert(node, "left", left);
    prettyRevert(node, "right", right);
  }

  node.dataset.amoqueueMode = previousMode == "pretty" ? "orig" : "pretty";
  node.dataset.brush = brush;
  node.style.MozTabSize = 4;

  for (let msg of document.querySelector("#content-wrapper > div > .notification-box")) {
    msg.remove();
  }
  amownd.viewer.compute_messages(amownd.$("#content-wrapper"));
});

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

// TODO move this to downloads when there is a simple import mechanism
createCommand("amoqueue-download", "Download", null, async () => {
  let version = document.getElementById("metadata").getAttribute("data-version");
  let slug = document.getElementById("metadata").getAttribute("data-slug");

  let prefs = await browser.runtime.sendMessage({ action: "infostorage", op: "get", storage: "slug", keys: ["slugInfo." + slug] });
  let id = prefs["slugInfo." + slug];

  chrome.runtime.sendMessage({ action: "download", addonid: id, version: version });
});

// TODO move this to filewindow when there is a simple import mechanism
Promise.all([
  browser.storage.local.get({ "filewindow-enabled": false }),
  browser.runtime.sendMessage({ action: "filewindow-isfilewindow" })
]).then(([prefs, isfilewindow]) => {
  if (!prefs["filewindow-enabled"] || !isfilewindow) {
    return;
  }

  createCommand("amoqueue-filewindow-savepos", "Save Window Position", null, () => {
    chrome.runtime.sendMessage({ action: "filewindow-position" });
  });
});
