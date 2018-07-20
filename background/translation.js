/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

browser.runtime.onMessage.addListener((data, sender) => {
  if (data.action !== "translate") {
    return undefined;
  }

  return translate(data.text, data.format || "plain");
});

async function translate(text, format="plain") {
  let key = await getStoragePreference("translation-secret-key");
  if (!key) {
    return { error: "API key not set" };
  }

  let reqHeaders = new Headers({
    "Ocp-Apim-Subscription-Key": key,
    "Content-Type": "application/json; charset=utf-8"
  });
  let url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=en&textType=${format}`;
  let body = [{ "Text": text }];

  let resp;

  try {
    resp = await fetch(url, { method: "POST", headers: reqHeaders, body: JSON.stringify(body) });
  } catch (e) {
    return { error: `Request failure, service may be down (${e.message})` };
  }

  if (resp.ok) {
    let translated = await resp.json();
    if (translated && translated.length && translated[0] && translated[0].translations.length) {
      return { text: translated[0].translations[0].text };
    } else {
      return { error: "Invalid response: " + JSON.stringify(translated) };
    }
  } else {
    return { error: `Request failure, check API key (${resp.status} ${resp.statusText})` };
  }
}
