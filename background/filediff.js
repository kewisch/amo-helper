/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

// The reviewers page only allows images from reviewers.addons.mozilla.org, but the filebrowser
// images are from addons.mozilla.org. We want to inline images from the filebrowser, so we'll need
// to add this to the CSP. This should be safe since it is from the same general domain.
browser.webRequest.onHeadersReceived.addListener(({ responseHeaders }) => {
  for (let header of responseHeaders) {
    if (header.name.toLowerCase() != "content-security-policy") {
      continue;
    }

    header.value = header.value.replace(/img-src/, "img-src https://addons.mozilla.org");
  }

  return { responseHeaders };
}, { urls: FILEBROWSER_PATTERNS, types: ["main_frame"] }, ["blocking", "responseHeaders"]);
