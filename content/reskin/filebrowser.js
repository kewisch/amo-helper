/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

// Move the add-on title into the file list container so it stays on screen always
let finner = document.getElementById("files-inner");
let title = document.querySelector("#main-wrapper > .section > h3");
finner.insertBefore(title, finner.firstChild);
