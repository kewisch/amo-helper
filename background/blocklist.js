/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2019 */

let gBlocklist = [];
let gGatherGuids = [];

/**
 * This is taken from addons-server and should be rewritten to be pretty and accurate
 * Copyright (c) 2010 - 2019, Mozilla Corporation
 * All rights reserved.
 */
/* eslint-disable */
var VersionCompare = {
  /**
   * Mozilla-style version numbers comparison in Javascript
   * (JS-translated version of PHP versioncompare component)
   * @return -1: a<b, 0: a==b, 1: a>b
   */
  compareVersions: function(a, b) {
    var al = a.split("."),
        bl = b.split("."),
        ap, bp, r, i;
    for (i=0; i<al.length || i<bl.length; i++) {
      ap = (i<al.length ? al[i] : null);
      bp = (i<bl.length ? bl[i] : null);
      r = this.compareVersionParts(ap,bp);
      if (r !== 0) {
        return r;
      }
    }
    return 0;
  },

  /**
   * helper function: compare a single version part
   */
  compareVersionParts: function(ap,bp) {
    var avp = this.parseVersionPart(ap),
        bvp = this.parseVersionPart(bp),
        r = this.cmp(avp["numA"], bvp["numA"]);
    if (r) {
      return r;
    }
    r = this.strcmp(avp["strB"], bvp["strB"]);
    if (r) {
      return r;
    }
    r = this.cmp(avp["numC"], bvp["numC"]);
    if (r) {
      return r;
    }
    return this.strcmp(avp["extraD"], bvp["extraD"]);
  },

  /**
   * helper function: parse a version part
   */
  parseVersionPart: function(p) {
    if (p == "*") {
      return {
        "numA": Number.MAX_VALUE,
        "strB": "",
        "numC": 0,
        "extraD": ""
      };
    }
    let pattern = /^([-\d]*)([^-\d]*)([-\d]*)(.*)$/,
        m = pattern.exec(p),
        r = {
        "numA"  : parseInt(m[1], 10),
        "strB"   : m[2],
        "numC"   : parseInt(m[3], 10),
        "extraD" : m[4]
        };
    if (r["strB"] == "+") {
      r["numA"]++;
      r["strB"] = "pre";
    }
    return r;
  },

  /**
   * helper function: compare numeric version parts
   */
  cmp: function(an, bn) {
    if (isNaN(an)) an = 0;
    if (isNaN(bn)) bn = 0;
    if (an < bn) {
      return -1;
    }
    if (an > bn) {
      return 1;
    }
    return 0;
  },

  /**
   * helper function: compare string version parts
   */
  strcmp: function(as,bs) {
    if (as == bs) {
      return 0;
    }
    // any string comes *before* the empty string
    if (as === "") {
      return 1;
    }
    if (bs === "") {
      return -1;
    }
    // normal string comparison for non-empty strings (like strcmp)
    if (as < bs) {
        return -1;
    } else if(as > bs) {
        return 1;
    } else {
        return 0;
    }
  }
};
/* eslint-enable */

async function checkBlocklist(guid, version) {
  function verifyVersionRange(entry) {
    for (let range of entry.versionRange) {
      if (VersionCompare.compareVersions(version, range.minVersion) > 0 &&
          (range.maxVersion == "*" || VersionCompare.compareVersions(version, range.maxVersion) < 0)) {
        return { severity: range.severity == 3 ? "hard" : "soft" };
      }
    }

    return null;
  }


  for (let entry of gBlocklist) {
    let found = null;
    if (entry.guid.startsWith("/")) {
      let re = new RegExp(entry.guid.substring(1, entry.guid.length - 1));
      if (re.test(guid)) {
        found = entry;
      }
    } else if (entry.guid == guid) {
      found = entry;
    }

    if (found) {
      let result = verifyVersionRange(entry);
      if (result) {
        result.id = entry.id;
        result.bug = entry.details.bug;
        result.created = entry.details.created || new Date(entry.last_modified).toISOString();
        result.reason = entry.details.why;
        return result;
      }
    }
  }

  return null;
}

async function downloadBlocklist() {
  let resp = await fetch("https://firefox.settings.services.mozilla.com/v1/buckets/blocklists/collections/addons/records");
  let json = await resp.json();

  if (json && json.data && Array.isArray(json.data)) {
    gBlocklist = json.data;
  } else {
    console.error("Error loading blocklist");
  }
}

async function fileBlocklistBug(guid, name) {
  gGatherGuids.push(guid);

  let guids = [...new Set(gGatherGuids.filter(Boolean))].join("\n");
  let tab = await browser.tabs.create({ url: "http://bugzilla.mozilla.org/form.blocklist" });

  await browser.tabs.executeScript(tab.id, {
    code: `
      document.getElementById("blocklist_guids").value = ${JSON.stringify(guids)};
      document.getElementById("blocklist_name").value = ${JSON.stringify(name)};
      document.getElementById("blocklist_reason").focus();
    `
  });

  gGatherGuids = [];
}

async function gatherBlocklistBug(guid) {
  gGatherGuids.push(guid);
}

browser.alarms.create("blocklist", { periodInMinutes: 720 });

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name != "blocklist") {
    return;
  }
  downloadBlocklist();
});

browser.runtime.onMessage.addListener((data, sender) => {
  if (data.action != "blocklist") {
    return undefined;
  }

  if (data.method == "check") {
    return checkBlocklist(data.guid, data.version);
  } else if (data.method == "refresh") {
    return downloadBlocklist();
  } else if (data.method == "file") {
    return fileBlocklistBug(data.guid, data.name);
  } else if (data.method == "gather") {
    return gatherBlocklistBug(data.guid);
  }

  return null;
});

// Initial download
downloadBlocklist();
