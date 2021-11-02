/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2019 */

let gGatherGuids = new Set();

async function fileBlocklistBug(guid, name, tabIndex) {
  gGatherGuids.push(guid);

  let guids = [...gGatherGuids].join("\n");

  let addfile = await getStoragePreference("blocklist-addfile");

  if (addfile) {
    let tab = await browser.tabs.create({
      url: "http://bugzilla.mozilla.org/form.blocklist",
      index: tabIndex + 1
    });

    await browser.tabs.executeScript(tab.id, {
      code: `
        document.getElementById("blocklist_guids").value = ${JSON.stringify(guids)};
        document.getElementById("blocklist_name").value = ${JSON.stringify(name)};
        document.getElementById("blocklist_reason").focus();
      `
    });
  } else {
    let params = new URLSearchParams({ guids: guids });
    browser.tabs.create({
      url: "https://addons-internal.prod.mozaws.net/en-US/admin/models/blocklist/blocklistsubmission/add/?" + params,
      index: tabIndex + 1
    });
  }

  gGatherGuids = new Set();
}

async function gatherBlocklistBug(guid) {
  if (guid) {
    gGatherGuids.add(guid);
  }
}

browser.runtime.onMessage.addListener((data, sender) => {
  if (data.action != "blocklist") {
    return undefined;
  }

  console.log(data);

  if (data.method == "file") {
    return fileBlocklistBug(data.guid, data.name, sender.tab.index);
  } else if (data.method == "gather") {
    return gatherBlocklistBug(data.guid);
  } else if (data.method == "get") {
    return Promise.resolve([...gGatherGuids]);
  }

  return null;
});
