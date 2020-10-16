/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */


async function translate(textNode, event) {
  event.preventDefault();
  event.stopPropagation();

  let anchor = event.currentTarget;

  if (anchor.getAttribute("loading") == "true") {
    return;
  }

  if (anchor.getAttribute("error") == "true") {
    browser.runtime.sendMessage({ action: "openPrefs" });
    return;
  }

  anchor.setAttribute("loading", "true");

  let data = await browser.runtime.sendMessage({
    action: "translate",
    format: "html",
    text: textNode.innerHTML
  });

  anchor.removeAttribute("loading");

  if (data.error) {
    anchor.textContent = data.error;
    anchor.setAttribute("error", "true");
  } else {
    anchor.remove();
    textNode.classList.add("translated");
    textNode.innerHTML = DOMPurify.sanitize(data.text);
  }
}

function createTranslateLink(textNode) {
  let anchor = document.createElement("a");
  anchor.href = "#";
  anchor.className = "amoqueue-translate-link";
  anchor.addEventListener("click", translate.bind(null, textNode));

  let loading = document.createElement("span");
  loading.className = "amoqueue-translate-link-loading";

  let text = document.createElement("span");
  text.textContent = "translate";
  text.className = "amoqueue-translate-link-text";

  anchor.appendChild(loading);
  anchor.appendChild(text);

  return anchor;
}

function initRatingsLayout() {
  // Moderated reviews pages
  for (let node of document.querySelectorAll(".review-flagged p:not(.description)")) {
    let anchor = createTranslateLink(node.nextElementSibling);
    anchor.classList.add("amoqueue-translate-moderated-review");
    node.appendChild(anchor);
  }
}

function initReviewsLayout() {
  // Summary on review pages
  let summary = document.querySelector("#addon .addon-info");

  let div = document.createElement("div");
  div.className = "amoqueue-summary-caption";

  let span = document.createElement("span");
  span.className = "amoqueue-summary-caption-label";
  span.textContent = "Summary";

  let textNode = document.querySelector("#addon .addon-info > p");
  let anchor = createTranslateLink(textNode);
  anchor.id = "amoqueue-translate-summary";

  div.appendChild(span);
  div.appendChild(anchor);

  summary.insertBefore(div, summary.firstElementChild);

  // Description on review pages
  let description = document.querySelector("#addon .article");
  textNode = document.querySelector("#addon .article > p");
  anchor = createTranslateLink(textNode);
  anchor.id = "amoqueue-translate-description";
  description.parentNode.insertBefore(anchor, description);

  // Notes for reviewers
  for (let node of document.querySelectorAll(".history-notes")) {
    anchor = createTranslateLink(node);
    anchor.classList.add("amoqueue-translate-history-notes");

    let th = node.parentNode.previousElementSibling;
    th.appendChild(anchor);
  }
}

(async () => {
  let hasKey = await getStoragePreference("translation-secret-key");
  if (!hasKey) {
    return;
  }

  let queue = document.location.href.match(QUEUE_RE)?.[3];

  if (queue == "reviews") {
    initRatingsLayout();
  } else if (!queue) {
    initReviewsLayout();
  }
})();
