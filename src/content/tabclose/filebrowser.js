/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017-2020 */

waitForElement(document, "a[href*='reviewers/review']").then(reviewlink => {
  reviewlink.addEventListener("click", (event) => {
    let review = event.target.getAttribute("href").match(REVIEW_RE);
    browser.runtime.sendMessage({ action: "tabclose-backtoreview", slug: review[4] });
    event.preventDefault();
    event.stopPropagation();
  });
});
