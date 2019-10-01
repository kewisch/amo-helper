/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

async function initLayout() {
  if (!await getStoragePreference("tinderbar-show")) {
    return;
  }

  let bar = document.body.appendChild(document.createElement("div"));
  bar.id = "tinderbar";

  let stop = bar.appendChild(document.createElement("a"));
  let skip = bar.appendChild(document.createElement("a"));
  let accept = bar.appendChild(document.createElement("a"));
  let noresponse = bar.appendChild(document.createElement("a"));

  stop.className = "amoqueue-tinderbar-stop";
  stop.textContent = "×";
  stop.href = "#";

  skip.className = "amoqueue-tinderbar-skip";
  skip.textContent = "Skip";
  skip.href = "#";

  accept.className = "amoqueue-tinderbar-accept";
  accept.textContent = "Accept";
  accept.href = "#";

  noresponse.className = "amoqueue-tinderbar-noresponse";
  noresponse.textContent = "Reject for no response";
  noresponse.href = "#";

  bar.addEventListener("click", actionHandler);

  if (await getStoragePreference("tinderbar-running")) {
    document.body.classList.add("amoqueue-tinderbar-running");
  }

  document.querySelector(".review-form").addEventListener("submit", manualSubmit);
}

async function actionHandler(event) {
  event.preventDefault();
  event.stopPropagation();

  let action = event.target.className.replace("amoqueue-tinderbar-", "");
  let text = await getStoragePreference("tinderbar-approve-text");

  await browser.runtime.sendMessage({ action: "tinder", method: "next", result: action });

  if (action == "accept") {
    document.getElementById("id_action_0").click();
    if (document.getElementById("id_action_0").value != "confirm_auto_approved") {
      document.getElementById("id_comments").value = text;
    }
    document.querySelector("form[action='#review-actions']").submit();
  } else if (action == "noresponse") {
    document.getElementById("id_action_1").click();
    document.getElementById("id_comments").value = "Rejecting due to lack of response. Please get back to us with the requested information before uploading a new version.";

    for (let option of document.getElementById("id_versions").options) {
      option.selected = true;
    }
    document.querySelector("form[action='#review-actions']").submit();
  }
}

function manualSubmit() {
  browser.runtime.sendMessage({ action: "tinder", method: "next", result: "manual" });
}

createAction("Enable QuickReview", (event) => {
  browser.runtime.sendMessage({ action: "tinder", method: "start" });

  event.preventDefault();
  event.stopPropagation();
}, "amoqueue-enable-tinderbar");

browser.storage.onChanged.addListener(async (changes, area) => {
  if (area != "local" || !changes["tinderbar-running"]) {
    return;
  }

  let running = changes["tinderbar-running"].newValue;
  document.body.classList.toggle("amoqueue-tinderbar-running", running);
});


initLayout();
