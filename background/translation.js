/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

browser.runtime.onMessage.addListener((data, sender) => {
  if (data.action !== "translate") {
    return undefined;
  }

  return translate(data.text);
});

async function translate(text) {
  let key = await getStoragePreference("translation-secret-key");
  if (!key) {
    return { error: "API key not set" };
  }

  let reqHeaders = new Headers({ "Ocp-Apim-Subscription-Key": key });
  let url = `https://api.microsofttranslator.com/V2/Http.svc/Translate?text=${encodeURIComponent(text)}&to=en`;
  let resp;

  try {
    resp = await fetch(url, { method: "GET", headers: reqHeaders });
  } catch (e) {
    return { error: `Request failure, service may be down (${e.message})` };
  }

  if (resp.ok) {
    let translated = await resp.text();
    return { text: translated.replace(/<[^>]*>/g, "") };
  } else {
    return { error: `Request failure, check API key (${resp.status} ${resp.statusText})` };
  }
}
