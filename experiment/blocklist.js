/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2019 */

ChromeUtils.defineModuleGetter(this, "Blocklist", "resource://gre/modules/Blocklist.jsm");

this.blocklist = class extends ExtensionAPI {
  getAPI(context) {
    return {
      blocklist: {
        isBlocklisted: async (id, version="0") => {
          let entry = await Blocklist.getAddonBlocklistEntry({ id, version });
          return !!entry;
        }
      }
    };
  }
};
