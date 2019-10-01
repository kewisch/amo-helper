/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2018 */

// addons.thunderbird.net doesn't redirect to reviewers.addons.thunderbird.net because we haven't
// gotten around to it and the instances are set up differently. Install a webRequest listener to
// handle the redirect client side.
browser.webRequest.onHeadersReceived.addListener(({ url }) => {
  return { redirectUrl: url.replace(/^https:\/\/addons\.thunderbird\.net\//, "https://reviewers.addons.thunderbird.net/") };
}, { urls: ["https://addons.thunderbird.net/*/reviewers/*"], types: ["main_frame"] }, ["blocking"]);
