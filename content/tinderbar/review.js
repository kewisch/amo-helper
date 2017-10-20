/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

const DEFAULT_ACCEPT_MESSAGE = "Thank you for your contribution. This version has been approved using a streamlined review process.";
const IS_ADMIN = !!document.getElementById("unlisted-queues");

async function initLayout() {
  let prefs = await browser.storage.local.get({ "tinderbar-show": false });
  if (!IS_ADMIN || !prefs["tinderbar-show"]) {
    // This quick review feature only makes sense for admins, sorry
    return;
  }

  let bar = document.body.appendChild(document.createElement("div"));
  bar.id = "tinderbar";

  let stop = bar.appendChild(document.createElement("a"));
  // let reject = bar.appendChild(document.createElement("a"));
  let skip = bar.appendChild(document.createElement("a"));
  let accept = bar.appendChild(document.createElement("a"));

  stop.className = "amoqueue-tinderbar-stop";
  stop.textContent = "×";
  stop.href = "#";

  // reject.className = "amoqueue-tinderbar-reject";
  // reject.textContent = "Reject";
  // reject.href = "#";

  skip.className = "amoqueue-tinderbar-skip";
  skip.textContent = "Skip";
  skip.href = "#";

  accept.className = "amoqueue-tinderbar-accept";
  accept.textContent = "Accept";
  accept.href = "#";

  bar.addEventListener("click", actionHandler);
}

function actionHandler(event) {
  event.preventDefault();
  event.stopPropagation();

  let action = event.target.className.replace("amoqueue-tinderbar-", "");
  browser.runtime.sendMessage({ action: "tinder", method: "next", result: action });

  console.log(event.target.className + " - " + action);

  switch (action) {
    case "accept":
      document.getElementById("id_action_0").click();
      browser.storage.local.get({ "tinderbar-approve-text": DEFAULT_ACCEPT_MESSAGE }).then((prefs) => {
        document.getElementById("id_comments").value = prefs["tinderbar-approve-text"];
        document.querySelector("form[action='#review-actions']").submit();
      });
      break;
    case "reject":
      // Not sure if this should be implemented, need a comment anyway
      document.getElementById("id_action_1").click();
      break;
    case "stop":
      window.close();
      break;
  }
}

initLayout();
