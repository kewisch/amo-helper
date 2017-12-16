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

  stop.className = "amoqueue-tinderbar-stop";
  stop.textContent = "×";
  stop.href = "#";

  skip.className = "amoqueue-tinderbar-skip";
  skip.textContent = "Skip";
  skip.href = "#";

  accept.className = "amoqueue-tinderbar-accept";
  accept.textContent = "Accept";
  accept.href = "#";

  bar.addEventListener("click", actionHandler);
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
  }
}

initLayout();
