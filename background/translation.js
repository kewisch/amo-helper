/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

var authToken;
var tokenttl = 1000*60*10;
var tokenTimeout = 0;

browser.runtime.onMessage.addListener((data, sender, sendReply) => {
  if (data.action !== "translate") {
    return;
  }

  chrome.storage.local.get({ "translation-secret-key": "" }, (prefs) => {
    if (!prefs["translation-secret-key"]) {
      sendReply({ error: "Secret key not set" });
      return;
    }

    if (tokenTimeout < Date.now()) {
      var reqHeaders = new Headers({ "Ocp-Apim-Subscription-Key": prefs["translation-secret-key"] });
      fetch("https://api.cognitive.microsoft.com/sts/v1.0/issueToken", { method: "POST", headers: reqHeaders }).then((resp) => resp.text()).then((response) => {
        authToken = response;
        tokenTimeout = Date.now() + tokenttl;
        translate(data.text, sendReply);
      });
    } else {
      translate(data.text, sendReply);
    }
  });
});

function translate(text, callback) {
  var reqHeaders = new Headers({ Authorization: "Bearer " + authToken });
  fetch("https://api.microsofttranslator.com/V2/Http.svc/Translate?text=" + encodeURIComponent(text) + "&to=en", { method: "GET", headers: reqHeaders }).then((resp) => resp.text()).then((response) => {
    var translatedText = response;
    callback({ text: translatedText.replace(/<[^>]*>/g, "") });
  });
}
