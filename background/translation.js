/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */


let gAuthToken;
let tokenttl = 1000*60*10;
let tokenTimeout = 0;

browser.runtime.onMessage.addListener((data, sender) => {
  if (data.action !== "translate") {
    return undefined;
  }

  return (async () => {
    let key = await getStoragePreference("translation-secret-key");
    if (!key) {
      return { error: "Secret key not set" };
    }

    if (tokenTimeout < Date.now()) {
      let reqHeaders = new Headers({ "Ocp-Apim-Subscription-Key": key });
      let url = "https://api.cognitive.microsoft.com/sts/v1.0/issueToken";
      gAuthToken = await fetch(url, { method: "POST", headers: reqHeaders }).then(resp => resp.text());
      tokenTimeout = Date.now() + tokenttl;
    }
    return translate(data.text);
  })();
});

async function translate(text) {
  let reqHeaders = new Headers({ Authorization: "Bearer " + gAuthToken });
  let url = `https://api.microsofttranslator.com/V2/Http.svc/Translate?text=${encodeURIComponent(text)}&to=en`;
  let translated = await fetch(url, { method: "GET", headers: reqHeaders }).then(resp => resp.text());
  return translated.replace(/<[^>]*>/g, "");
}
