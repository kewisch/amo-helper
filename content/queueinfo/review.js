/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

function floatingtime(str, dtonly) {
  try {
    return new Date(str.replace(/\./g, "") + " UTC").toISOString().substr(0, dtonly ? 10 : 19);
  } catch (e) {
    return str;
  }
}

function authorInfo(anchor) {
  return anchor ? {
    name: anchor.getAttribute("title"),
    url: anchor.getAttribute("href")
  } : null;
}

function activityAnnotator(activity) {
  if (activity.state == "More information requested" &&
      activity.comment.includes("provide the original sources")) {
    activity.state = "Sources Requested";
  } else if (activity.state == "Super review requested" &&
             activity.comment.includes("source files attached when submitted")) {
    activity.state = "Sources Attached";
  } else if (activity.state == "Notes for Reviewers" || activity.state == "Version Notes") {
    activity.state = "Submission";
  } else if (activity.state == "More information requested" &&
             activity.comment.includes("Please provide us with detailed information on how to test this add-on")) {
    activity.state = "Testing info requested";
  }

  return activity;
}

function stateHasAuthor(state) {
  switch (state) {
    case "Approved":
    case "Rejected":
    case "More information requested":
    case "Comment":
    case "Super review requested":
    case "Source code uploaded":
    case "Approval notes changed":
    case "Developer Reply":
    case "Reviewer Reply":
    case "Auto-Approval confirmed":
      return true;
  }
  return false;
}

function stateToType(state) {
  return {
    "Submission": "submission",
    "Approved": "status",
    "Rejected": "status",
    "More information requested": "needinfo",
    "Comment": "comment",
    "Super review requested": "superreview"
  }[state] || "unknown";
}

async function retrieveVersion(version, method="GET") {
  let response = await fetch(version.installurl, { method });
  if (response.status == 302) {
    return fetch(response.headers.get("Location"), { method });
  }
  return response;
}

async function unzip(buffer) {
  let zip = await JSZip.loadAsync(buffer);
  let filedata = {};
  let promises = [];

  zip.forEach((relPath, file) => {
    if (file.dir) { // || !file.name.endsWith(".js")) {
      return;
    }

    promises.push(file.async("string").then((content) => {
      filedata[relPath] = content;
    }));
  });

  await Promise.all(promises);
  return filedata;
}

function diffStat(dataA, dataB) {
  let insertions = 0;
  let deletions = 0;
  let files = 0;

  for (let [pathA, contentA] of Object.entries(dataA)) {
    if (!(pathA in dataB)) {
      insertions += contentA.split("\n").length;
      files++;
      continue;
    }
    let changes = JsDiff.diffLines(contentA, dataB[pathA]);
    delete dataB[pathA];

    let changed = false;
    for (let change of changes) {
      if (change.added) {
        insertions += change.count;
      } else if (change.removed) {
        deletions += change.count;
      }
      changed = changed || change.added || change.removed;
    }

    if (changed) {
      files++;
    }
  }

  for (let contentB of Object.values(dataB)) {
    deletions += contentB.split("\n").length;
    files++;
  }

  return { insertions, deletions, files };
}


function determineChanges(versionA, versionB) {
  async function retrieveAndUnzip(version) {
    let resp = await retrieveVersion(version);
    let buffer = await resp.arrayBuffer();
    return unzip(buffer);
  }

  return Promise.all([
    retrieveAndUnzip(versionA),
    retrieveAndUnzip(versionB),
  ]).then(([dataA, dataB]) => diffStat(dataA, dataB));
}

async function determineSize(version) {
  if (!version) {
    return;
  }

  try {
    let response = await retrieveVersion(version, "HEAD");
    version.size = parseInt(response.headers.get("Content-Length"), 10);
  } catch (e) {
    version.size = 0;
  }
}

function getInfo(doc) {
  let lastapproved_idx = null;

  let versions = Array.from(doc.querySelectorAll("#review-files .listing-body")).map((listbody, idx) => {
    let headerparts = listbody.previousElementSibling.firstElementChild.textContent.match(/Version ([^·]+)· ([^·]+)· (.*)/);
    let submissiondate = floatingtime(headerparts[2].trim(), true);
    let hasAutoApproval = false;
    let hasConfirmApproval = false;

    let activities = Array.from(listbody.querySelectorAll(".activity tr")).reduce((results, activityrow) => {
      let state = activityrow.firstElementChild.textContent.trim();
      let author = stateHasAuthor(state) ? activityrow.querySelector("td > div > a") : null;

      if (state == "Approved" && author && author.getAttribute("href").endsWith("mozilla/")) {
        // This is an auto-approval, mark it for later.
        hasAutoApproval = true;
      }

      if (state == "Auto-Approval confirmed") {
        // ...and the approval was confirmed
        hasConfirmApproval = true;
      }

      if (state && state != "Not Auto Approved Because" && activityrow.firstElementChild.className != "no-activity") {
        results.push({
          state: state,
          type: stateToType(state),
          automatic: author && author.getAttribute("href").endsWith("mozilla/"),
          author: authorInfo(author),
          date: author ? floatingtime(author.nextSibling.textContent.replace(" on ", "")) : submissiondate,
          comment: activityrow.lastElementChild.textContent.trim()
        });
      }
      return results;
    }, []).map(activityAnnotator);

    if (!activities.length) {
      let listingauthor = doc.querySelector("#scroll_sidebar ul:nth-of-type(3) > li > a");
      activities.push(activityAnnotator({
        state: "Submission",
        type: stateToType("Submission"),
        author: authorInfo(listingauthor),
        date: submissiondate,
        comment: ""
      }));
    }

    let installanchor = listbody.querySelector(".editors-install");
    let sourceanchor = listbody.querySelector("a[href^='/firefox/downloads/source']");
    let status = headerparts[3].trim().split(",")[0];
    let permissions = listbody.querySelector(".file-info div strong");
    if (permissions) {
      permissions = permissions.nextSibling.textContent.trim().split(", ");
    }

    // Only the last manual approval
    if (status == "Approved" && (!hasAutoApproval || hasConfirmApproval)) {
      lastapproved_idx = idx;
    }

    return {
      version: headerparts[1].trim(),
      date: submissiondate,
      status: status,

      installurl: installanchor ? (new URL(installanchor.getAttribute("href"), location.href)).href : null,
      sourceurl: sourceanchor ? (new URL(sourceanchor.getAttribute("href"), location.href)).href : null,

      activities: activities,
      permissions: permissions
    };
  });

  return {
    id: doc.querySelector("#addon").getAttribute("data-id"),
    guid: doc.querySelector(".addon-guid > td").textContent,
    slug: doc.location.pathname.match(/\/([^/]+)$/)[1],
    lastupdate: new Date().toISOString(),

    versions: versions,
    latest_idx: versions.length - 1,
    lastapproved_idx: lastapproved_idx
  };
}

async function updateSize(info) {
  if (await getStoragePreference("queueinfo-use-diff") && info.lastapproved_idx !== null) {
    let prev = info.versions[info.lastapproved_idx];
    let cur = info.versions[info.latest_idx];
    info.diffinfo = await determineChanges(prev, cur);
  } else {
    await Promise.all([
      determineSize(info.versions[info.latest_idx]),
      determineSize(info.versions[info.lastapproved_idx])
    ]);
    delete info.diffinfo;
  }
  return info;
}

// -- main --
(async function() {
  // Make file info links open in a new tab
  document.querySelectorAll(".file-info a").forEach((link) => {
    link.setAttribute("target", "_blank");
  });


  // Open compare link if options enabled
  if (await getStoragePreference("queueinfo-open-compare")) {
    document.querySelector(".listing-body:last-child .file-info a.compare").click();
  }

  // Collect review info and set in storage
  let info = getInfo(document);

  // Check the blocklist
  let lastVersion = info.versions[info.latest_idx];
  if (await browser.runtime.sendMessage({ action: "queueinfo", method: "blocklisted", guid: info.guid, version: lastVersion ? lastVersion.version : "0" })) {
    document.getElementById("main-wrapper").classList.add("amoqueue-blocklisted");
  }

  await browser.runtime.sendMessage({ action: "infostorage", op: "set", storage: "slug", keys: { ["slugInfo." + info.slug]: info.id } });
  await browser.runtime.sendMessage({ action: "infostorage", op: "set", storage: "review", keys: { ["reviewInfo." + info.id]: info } });

  // Update the size (takes longer) and update storage again
  await updateSize(info);
  await browser.runtime.sendMessage({ action: "infostorage", op: "set", storage: "review", keys: { ["reviewInfo." + info.id]: info } });
})();
