/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

// Move screenshots to header area
let screencontainer = document.querySelector("#addon .secondary");

for (let shot of document.querySelectorAll("#addon .article .screenshot")) {
  screencontainer.appendChild(shot);
}

// Move description under header area
let summarycontainer = document.querySelector("#addon-summary");

summarycontainer.appendChild(document.querySelector("#more-about"));
summarycontainer.appendChild(document.createTextNode(" "));
summarycontainer.appendChild(document.querySelector("#addon .article"));
