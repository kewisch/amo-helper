/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

/* exported createAction, createCommand, findParent */

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

function findParent(node, className) {
  let current = node;
  while (current && !current.classList.contains(className)) {
    current = current.parentNode;
  }
  return current;
}
