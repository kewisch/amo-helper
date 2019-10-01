/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

var reviews = {
  nodes: [...document.querySelectorAll("#reviews-flagged .review-flagged:not(.review-saved):not(.disabled)")],
  index: -1,

  get current() {
    return this.nodes[this.index];
  },

  get count() {
    return this.nodes.length;
  },

  next: function() {
    this.goreview(this.index + 1);
  },

  prev: function() {
    this.goreview(this.index - 1);
  },

  goreview: function(index) {
    if (this.current) {
      this.current.classList.remove("amoqueue-review-current");
    }

    if (index <= this.count) {
      this.index = index;
      if (this.current) {
        this.current.classList.add("amoqueue-review-current");
      }
    }

    let flagged = document.querySelector("#reviews-flagged");
    flagged.classList.toggle("amoqueue-finished", this.index >= this.count);
  },

  translate: function() {
    let translateLink = this.current.querySelector(".amoqueue-translate-link");
    if (translateLink) {
      translateLink.click();
    }
  },

  decide: function(value) {
    this.current.querySelector(`input[value="${value}"]`).click();
  },

  keys: ["k", "s", "d", "p", "S", "N", "n", "P", "r", "R", "t"],
  action: function(action) {
    switch (action) {
      case "k": this.decide(-1); break; // keep
      case "s": this.decide(0); break; // skip
      case "d": this.decide(1); break; // delete
      case "p": case "S": case "N": this.prev(); break; // previous
      case "n": case "P": this.next(); break; // next
      case "r": case "R": this.goreview(0); break; // restart
      case "t": this.translate(); break; // translate
    }
    this.updateStats();
  },

  updateStats: function() {
    function getStatNode(type) {
      return document.querySelector(`#reviews-flagged .review-saved .amoqueue-stat-value.${type}`);
    }

    getStatNode("keep").textContent = document.querySelectorAll("input[value='-1']:checked").length;
    getStatNode("skip").textContent = document.querySelectorAll("input[value='0']:checked").length;
    getStatNode("delete").textContent = document.querySelectorAll("input[value='1']:checked").length;
    getStatNode("remain").textContent = this.count - Math.max(0, this.index);
  }
};

function initModeratedReviewLayout() {
  let [topContainer, bottomContainer] = document.querySelectorAll("#reviews-flagged div.review-saved");
  let button = document.querySelector("#reviews-flagged div.review-saved button");

  // Remaining
  let remainlabel = topContainer.insertBefore(document.createElement("span"), button);
  remainlabel.textContent = "Remaining:";
  remainlabel.className = "amoqueue-stat-label";

  let remainvalue = topContainer.insertBefore(document.createElement("span"), button);
  remainvalue.textContent = "0";
  remainvalue.className = "amoqueue-stat-value remain";

  // Keep
  let keeplabel = topContainer.insertBefore(document.createElement("span"), button);
  keeplabel.textContent = "Keep:";
  keeplabel.className = "amoqueue-stat-label";

  let keepvalue = topContainer.insertBefore(document.createElement("span"), button);
  keepvalue.textContent = "0";
  keepvalue.className = "amoqueue-stat-value keep";

  // Skip
  let skiplabel = topContainer.insertBefore(document.createElement("span"), button);
  skiplabel.textContent = "Skip:";
  skiplabel.className = "amoqueue-stat-label";

  let skipvalue = topContainer.insertBefore(document.createElement("span"), button);
  skipvalue.textContent = "0";
  skipvalue.className = "amoqueue-stat-value skip";

  // Delete
  let deletelabel = topContainer.insertBefore(document.createElement("span"), button);
  deletelabel.textContent = "Delete:";
  deletelabel.className = "amoqueue-stat-label";

  let deletevalue = topContainer.insertBefore(document.createElement("span"), button);
  deletevalue.textContent = "0";
  deletevalue.className = "amoqueue-stat-value delete";

  // Finished label
  let bottomButton = bottomContainer.querySelector("button");
  let finishedlabel = bottomContainer.insertBefore(document.createElement("span"), bottomButton);
  finishedlabel.textContent = "All done, click Process Reviews to submit";
  finishedlabel.className = "amoqueue-finished-info";

  // Some re-ordering for reduced movement
  for (let review of document.querySelectorAll("#reviews-flagged .review-flagged:not(.review-saved)")) {
    let reasons = review.querySelector(".reviews-flagged-reasons");
    let actions = review.querySelector(".review-flagged-actions");
    review.insertBefore(reasons, actions);
  }

  // Keyboard shortcut legend
  let gridbottom = bottomContainer.parentNode.appendChild(document.createElement("div"));
  gridbottom.className = "amoqueue-keyboard-legend";
  gridbottom.appendChild(createKeyDescription("s", "Skip"));
  gridbottom.appendChild(createKeyDescription("d", "Delete"));
  gridbottom.appendChild(createKeyDescription("k", "Keep"));
  gridbottom.appendChild(createKeyDescription("n", "Next"));
  gridbottom.appendChild(createKeyDescription("p", "Previous", ["S"]));
  gridbottom.appendChild(createKeyDescription("r", "First", ["R"]));

  getStoragePreference("translation-secret-key").then(found => {
    if (found) {
      gridbottom.appendChild(createKeyDescription("t", "Translate"));
    }
  });
}

function createKeyDescription(key, description, also) {
  let container = document.createElement("span");
  container.className = "amoqueue-command-container";
  container.addEventListener("click", () => reviews.action(key));

  if (also) {
    container.setAttribute("title", "Also: " + also.join(", "));
  }

  let code = container.appendChild(document.createElement("code"));
  code.className = "amoqueue-command-key";
  code.textContent = key;

  let label = container.appendChild(document.createElement("span"));
  label.textContent = description;
  label.className = "amoqueue-command-label";

  return container;
}

(function() {
  let queue = document.location.pathname.split("/").pop();
  if (queue != "reviews") {
    return;
  }

  document.querySelector("#reviews-flagged").addEventListener("click", (event) => {
    if (event.target.localName != "input" && event.target.type != "radio") {
      return;
    }

    setTimeout(() => {
      reviews.next();
      reviews.updateStats();
    }, 100);
  });

  window.addEventListener("keypress", (event) => {
    if (!event.metaKey && !event.ctrlKey && reviews.keys.includes(event.key)) {
      reviews.action(event.key);
      event.preventDefault();
      event.stopPropagation();
    }
  });

  initModeratedReviewLayout();

  reviews.updateStats();
  reviews.next();
})();
