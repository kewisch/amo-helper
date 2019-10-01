/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

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
