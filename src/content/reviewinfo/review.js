/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

const SKIP_MESSAGES = new Set([
  "We allow and encourage an upgrade but you cannot reverse this process. Once your users have" +
  " the WebExtension installed, they will not be able to install a legacy add-on."
]);

async function initLayout() {
  addScrollToButtons();
  addBlocklistButton();
  markVIP();

  Promise.all([
    // Put latest permissions at top.
    initTopPermissions(),

    // Load validation report
    retrieveValidation()
  ]).finally(() => {
    // Scroll to the end of the header.
    window.scroll(0, document.querySelector(".addon").offsetTop - 10);
  });
}

function markVIP() {
  let privboard = document.getElementById("id_whiteboard-private");
  let hasMozillaAuthor = !!document.querySelector("#scroll_sidebar li a[href$='/firefox/user/4757633/']");

  let match = privboard.textContent.match(/\[vip\]\s*([^\n]*)/);

  if (match || hasMozillaAuthor) {
    let history = document.getElementById("versions-history");
    let bar = history.parentNode.insertBefore(document.createElement("p"), history.nextElementSibling);
    bar.className = "is_recommendable amoqueue-vip";

    let descr = bar.appendChild(document.createElement("div"));
    descr.textContent = "This is a VIP add-on. Please contact an admin before rejecting or sending an information request.";

    if (match && match[1]) {
      let reason = bar.appendChild(document.createElement("div"));
      reason.textContent = "Details: " + match[1];
    } else if (hasMozillaAuthor) {
      let reason = bar.appendChild(document.createElement("div"));
      reason.textContent = "Details: This is an official Mozilla extension.";
    }
  }
}

function addBlocklistButton() {
  let area = document.querySelector("#extra-review-actions > .more-actions-inner > ul");
  if (!area) {
    // This doesn't exist on delete add-ons pages
    let addon = document.querySelector("#addon");
    let form = addon.appendChild(document.createElement("form"));
    form.id = "extra-review-actions";

    let para = form.appendChild(document.createElement("p"));
    let strong = para.appendChild(document.createElement("strong"));
    strong.textContent = "More Actions";

    let div = form.appendChild(document.createElement("div"));
    div.className = "more-inner-actions";

    area = div.appendChild(document.createElement("ul"));
  }

  let button = document.createElement("button");
  button.id = "amoqueue_blocklist_addon";
  button.type = "button";
  button.textContent = "File Blocklisting Bug";

  button.addEventListener("click", (event) => {
    browser.runtime.sendMessage({
      action: "blocklist",
      method: event.ctrlKey || event.metaKey ? "gather" : "file",
      guid: document.querySelector(".addon-guid > td").textContent,
      name: document.title.split(" :: ")[0],
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key == "Control" || event.key == "Meta") {
      button.textContent = "Gather ID for Blocklisting";
    }
  });
  document.addEventListener("keyup", (event) => {
    if (event.key == "Control" || event.key == "Meta") {
      button.textContent = "File Blocklisting Bug";
    }
  });

  area.appendChild(button);
}

function addScrollToButtons() {
  // Scroll to latest version
  let scrollToBottom = document.createElement("button");
  document.querySelector("#addon .addon-previews").appendChild(scrollToBottom);

  scrollToBottom.className = "amoqueue-scroll-to-bottom";
  scrollToBottom.textContent = "Scroll to last version";
  scrollToBottom.type = "button";
  scrollToBottom.addEventListener("click", (event) => {
    document.querySelector(".listing-header:nth-last-child(2)").scrollIntoView();
  });

  // Scroll to metadata
  let scrollToTop = document.createElement("button");
  let scrollToTopContainer = document.createElement("div");
  scrollToTopContainer.appendChild(scrollToTop);

  let actions = document.querySelector("#review-actions");
  actions.parentNode.insertBefore(scrollToTopContainer, actions);

  scrollToTopContainer.className = "amoqueue-scroll-to-top-container";

  scrollToTop.className = "amoqueue-scroll-to-top";
  scrollToTop.textContent = "Scroll to metadata";
  scrollToTop.type = "button";
  scrollToTop.addEventListener("click", (event) => {
    document.querySelector("#addon .addon-info-and-previews").scrollIntoView();
    event.preventDefault();
  });

  let extraSaveButton = document.createElement("input");
  extraSaveButton.className = "amoqueue-extra-save";
  extraSaveButton.type = "submit";
  extraSaveButton.value = "Save";
  scrollToTopContainer.appendChild(extraSaveButton);
}

async function initTopPermissions() {
  // Lets assume people don't use different permissions per platform and just get one
  let prefs = await getStoragePreference([
    "reviewinfo-dangerous-permissions",
    "reviewinfo-show-permissions",
    "reviewinfo-dontshow-content"
  ]);

  let reviewFiles = document.querySelector(".review-files, #review-files"); // ATN compatibility
  let permissionsNode = reviewFiles.querySelector(".listing-body:last-child .file-info div strong");
  let skipContent = document.location.href.match(CONTENT_REVIEW_RE) && prefs["reviewinfo-dontshow-content"];
  if (!permissionsNode || !prefs["reviewinfo-show-permissions"] || skipContent) {
    return;
  }

  let dangerous = new Set(prefs["reviewinfo-dangerous-permissions"].split(/,\s*/));

  let permissions = permissionsNode.nextSibling.textContent.trim().split(", ");
  permissions.sort((a, b) => {
    let isHostA = a.includes("://"), isHostB = b.includes("://");
    let dangerousA = dangerous.has(a), dangerousB = dangerous.has(b);

    if (dangerousA && !dangerousB) {
      return -1;
    } else if (dangerousB && !dangerousA) {
      return 1;
    } else if (isHostA && !isHostB) {
      return 1;
    } else if (isHostB && !isHostA) {
      return -1;
    } else {
      return (a > b) - (b > a);
    }
  });

  createSummaryRow("amoqueue-permissions-list", "Latest Permissions", permissions, (value) => {
    return dangerous.has(value);
  });
}


async function retrieveValidation() {
  let prefs = await getStoragePreference([
    "reviewinfo-dangerous-messages",
    "reviewinfo-show-validator",
    "reviewinfo-dontshow-content"
  ]);
  let skipContent = document.location.href.match(CONTENT_REVIEW_RE) && prefs["reviewinfo-dontshow-content"];

  if (!prefs["reviewinfo-show-validator"] || skipContent) {
    return;
  }

  let validationNode = document.querySelector(".review-files .listing-body:last-child .file-info a[href$='validation']");
  let validationUrl = new URL(validationNode.getAttribute("href") + ".json", document.location);
  let dangerous = new Set(prefs["reviewinfo-dangerous-messages"].split(/,\s*/));

  let response = await fetch(validationUrl.href);
  let data = await response.json();

  let messageMap = new Map();

  for (let msg of data.validation.messages) {
    if (msg.type == "notice" || SKIP_MESSAGES.has(msg.message)) {
      continue;
    }

    let container = messageMap.get(msg.message);
    if (!container) {
      container = document.createElement("div");
      container.message = msg.message;
      let label = container.appendChild(document.createElement("div"));
      let message = msg.message.replace(/&#34;/g, '"');
      label.textContent = message;
      label.className = "amoqueue-message";

      container.files = new Set();
      messageMap.set(message, container);
    }

    if (!container.files.has(msg.file)) {
      container.files.add(msg.file);
      let locspan = document.createElement("span");
      locspan.className = "amoqueue-file";
      locspan.textContent = msg.file || "<all>";
      container.appendChild(locspan);
    }
  }

  let messages = [...messageMap.values()];
  messages.sort((a, b) => {
    let dangerousA = a.getAttribute("dangerous") == "true", dangerousB = b.getAttribute("dangerous") == "true";

    if (dangerousA && !dangerousB) {
      return -1;
    } else if (dangerousB && !dangerousA) {
      return 1;
    } else {
      return (a.message > b.message) - (b.message > a.message);
    }
  });

  createSummaryRow("amoqueue-validator-list", "Validator Messages Summary", messages, (value) => {
    return setHasSubstring(dangerous, value.textContent);
  });
}

function setHasSubstring(set, value) {
  for (let item of set) {
    if (value.includes(item)) {
      return true;
    }
  }
  return false;
}

function createSummaryRow(className, label, values, isDangerous=null) {
  let tbody = document.querySelector("#addon .addon-info table tbody");
  let row = tbody.appendChild(document.createElement("tr"));
  let head = row.appendChild(document.createElement("th"));
  let cell = row.appendChild(document.createElement("td"));

  head.textContent = label;
  let list = cell.appendChild(document.createElement("ul"));
  list.className = className;
  for (let value of values) {
    let listitem = list.appendChild(document.createElement("li"));
    if (typeof value == "string") {
      listitem.textContent = value;
    } else {
      listitem.appendChild(value);
    }

    if (isDangerous && isDangerous(value)) {
      listitem.setAttribute("dangerous", "true");
    }
  }
}

initLayout();
