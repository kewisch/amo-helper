/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

async function translate(textNode, clickedNode) {
  let data = await browser.runtime.sendMessage({
    action: "translate",
    text: textNode.text(),
    from: "translate"
  });

  if (data.error) {
    clickedNode.text("Error : Key not set. See addon's options page.");
  } else {
    clickedNode.remove();
    textNode.text(data.text);
  }
}

window.addEventListener("load", () => {
  // Moderated reviews
  $(".review-flagged p:not(.description)").each(function() {
    var reviewNode = $(this);
    reviewNode.append(
      $("<a />").text(" translate").click(function() {
        translate(reviewNode.next(), $(this));
      })
    );
  });

  // Listed/Unlisted reviews
  $("#addon-summary").prepend(
    $("<a />").text("(Translate summary)").click(function() {
      translate($("#addon-summary p:not(.addon-rating)"), $(this));
    })
  );

  $(".article").prepend(
    $("<a />").text("(Translate description)").click(function() {
      translate($(".article p"), $(this));
    })
  );
});
