/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

let timerNode = null;
let timerTimeout = null;
let timerStart = null;
let timerPause = null;
let timerNotifyInterval = 10;

let addonName = document.title.split(" :: ")[0];
let addonSlug = document.location.pathname.match(/\/([^/]+)$/)[1];

async function initLayout() {
  let prefs = await browser.storage.local.get({ "reviewtimer-display": true, "reviewtimer-notify-interval": 10 });
  if (prefs["reviewtimer-display"]) {
    timerNode = document.body.appendChild(document.createElement("button"));
    timerNode.id = "amoqueue-timer";
    timerNotifyInterval = prefs["reviewtimer-notify-interval"];

    timerNode.addEventListener("click", togglePause);


    if (document.hidden) {
      let continueSetup = () => {
        window.removeEventListener("focus", continueSetup);
        startTimer();
      };
      window.addEventListener("focus", continueSetup);
    } else {
      startTimer();
    }
  }
}


function togglePause() {
  let now = new Date().getTime();
  if (timerPause) {
    timerStart += now - timerPause;
    timerPause = null;
    startTimer(false);
  } else {
    clearTimeout(timerTimeout);
    timerTimeout = null;
    timerPause = now;

    let pauseSpan = timerNode.insertBefore(document.createElement("span"), timerNode.firstChild);
    pauseSpan.textContent = "\u2161";
  }
}

function startTimer(reset=true) {
  function timercall() {
    let now = new Date().getTime();
    let diff = ((now - timerStart) / 1000) | 0;
    let seconds = diff % 60;
    let minutes = (diff / 60) | 0;

    if (timerNotifyInterval != 0 && seconds == 0 && minutes != 0 && (minutes % timerNotifyInterval) == 0) {
      browser.runtime.sendMessage({ action: "reviewtimer-notify", slug: addonSlug, seconds: diff, name: addonName });
    }

    timerNode.textContent = minutes.toString().padStart(2, "0") + ":" + seconds.toString().padStart(2, "0");
    timerTimeout = setTimeout(() => requestAnimationFrame(timercall), 1000 - (now % 1000));
  }

  if (reset) {
    timerStart = new Date().getTime();
    timerNode.textContent = "00:00";
  }
  requestAnimationFrame(timercall);
}

initLayout();
