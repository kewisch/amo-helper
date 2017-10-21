/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

function createInfoStorage(prefix, storageName) {
  return {
    _storage: {},

    async get(keys) {
      let prefs = await browser.storage.local.get({ "persist-info-storage": false });
      if (prefs["persist-info-storage"]) {
        return browser.storage.local.get(keys);
      } else {
        let res = {};
        let iter = Array.isArray(keys) ? keys : Object.keys(keys);
        for (let key of iter) {
          if (this._storage.hasOwnProperty(key)) {
            res[key] = this._storage[key];
          }
        }

        return res;
      }
    },

    async set(keys) {
      let prefs = await browser.storage.local.get({ "persist-info-storage": false });
      if (prefs["persist-info-storage"]) {
        await browser.storage.local.set(keys);
      } else {
        for (let key of Object.keys(keys)) {
          this._storage[key] = keys[key];
        }
      }
      browser.storage.local.set({ "notify-infostorage": { storage: storageName, keys: keys } });
    },

    async clear() {
      let prefs = await browser.storage.local.get({ "persist-info-storage": false });
      if (prefs["persist-info-storage"]) {
        let data = await browser.storage.local.get(null);
        let keys = Object.keys(data).filter(key => key.startsWith(prefix + "."));
        await browser.storage.local.remove(keys);
      } else {
        this._storage = {};
      }
    }
  };
}

var infostorage = {
  slug: createInfoStorage("slugInfo", "slug"),
  review: createInfoStorage("reviewInfo", "review")
};

browser.runtime.onMessage.addListener(async (data, sender) => {
  if (data.action != "infostorage") {
    return undefined;
  }

  return infostorage[data.storage][data.op](data.keys);
});
