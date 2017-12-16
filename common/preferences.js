/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

/* exported DEFAULT_PREFERENCES, HIDDEN_PREFERENCES, ALL_PREFERENCES,
 * DEFAULT_DANGEROUS_MESSAGES, DEFAULT_DANGEROUS_PERMISSIONS,
 * getStoragePreference */

const DEFAULT_DANGEROUS_PERMISSIONS = [
  "cookies",
  "history",
  "logins",
  "nativeMessaging"
].join(", ");

const DEFAULT_DANGEROUS_MESSAGES = [
  "outerHTML",
  "insertAdjacentHTML",
  "innerHTML",
  "eval"
].join(", ");

const DEFAULT_PREFERENCES = {
  "instance": "addons.mozilla.org",
  "is-admin": false,
  "tabclose-other-queue": true,
  "tabclose-review-child": true,
  "queueinfo-use-diff": false,
  "queueinfo-show-weeklines": false,
  "queueinfo-per-page": 200,
  "queueinfo-partner-addons": "",
  "omnibox-enabled": true,
  "browseraction-queue-refresh-period": 60,
  "browseraction-count-legacy": true,
  "browseraction-count-moderator": false,
  "browseraction-count-autoapproval": true,
  "browseraction-count-content": false,
  "canned-use-stock": true,
  "canned-include-body": true,
  "persist-info-storage": false,
  "reviewinfo-dangerous-permissions": DEFAULT_DANGEROUS_PERMISSIONS,
  "reviewinfo-dangerous-messages": DEFAULT_DANGEROUS_MESSAGES,
  "reviewinfo-show-permissions": false,
  "reviewinfo-show-validator": false,
  "reviewtimer-display": true,
  "reviewtimer-notify-interval": 10,
  "translation-secret-key": "",
  "tinderbar-show": false,
  "tinderbar-approve-text": "",
  "tinderbar-preload-tabs": 3,
  "filewindow-enabled": false
};

const HIDDEN_PREFERENCES = {
  "is-admin": false,
  "filewindow-position": {},
  "queueinfo-business-days": false,
  "canned-responses": [],
  "show-info": "both",
  "show-webext": "both",
  "show-admin": "both",
  "queueinfo-open-compare": false,
  "downloads.basedir": "amo"
};

const ALL_PREFERENCES = Object.assign({}, DEFAULT_PREFERENCES, HIDDEN_PREFERENCES);

async function getStoragePreference(thing) {
  if (typeof thing == "string") {
    let prefs = await browser.storage.local.get({ [thing]: ALL_PREFERENCES[thing] });
    return prefs[thing];
  } else if (Array.isArray(thing)) {
    return browser.storage.local.get(thing.reduce((res, val) => {
      res[val] = ALL_PREFERENCES[val];
      return res;
    }, {}));
  } else {
    return browser.storage.local.get(thing || null);
  }
}
