/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

browser.runtime.onMessage.addListener((data, sender, sendReply) => {
  if (data.action == "openPrefs") {
    chrome.runtime.openOptionsPage();
  }
});
