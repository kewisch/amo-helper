function floatingtime(str, dtonly) {
  try {
    return new Date(str + " UTC").toISOString().substr(0, dtonly ? 10 : 19);
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

function retrieveVersion(version, method="GET", responseType="arraybuffer") {
  return fetch(version.installurl, { method, _xhr_responseType: responseType }).then((response) => {
    if (response.status == 302) {
      return fetch(response.headers.get("Location"), { method });
    }
    return response;
  });
}

function unzip(buffer) {
  return JSZip.loadAsync(buffer).then((zip) => {
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

    return Promise.all(promises).then(() => filedata);
  });
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
  function retrieveAndUnzip(version) {
    return retrieveVersion(version).then(resp => {
      return resp.arrayBuffer();
    }).then(unzip);
  }

  return Promise.all([
    retrieveAndUnzip(versionA),
    retrieveAndUnzip(versionB),
  ]).then(([dataA, dataB]) => diffStat(dataA, dataB));
}

function determineSize(version) {
  if (!version) {
    return Promise.resolve();
  }

  return retrieveVersion(version, "HEAD").then((response) => {
    version.size = parseInt(response.headers.get("Content-Length"), 10);
  }, () => {
    version.size = 0;
  });
}

function getInfo(doc) {
  var lastapproved_idx = null;

  var versions = Array.from(doc.querySelectorAll("#review-files .listing-body")).map((listbody, idx) => {
    let headerparts = listbody.previousElementSibling.firstElementChild.textContent.match(/Version ([^·]+)· ([^·]+)· (.*)/);
    let submissiondate = floatingtime(headerparts[2].trim(), true);

    let activities = Array.from(listbody.querySelectorAll(".activity tr")).reduce((results, activityrow) => {
      let state = activityrow.firstElementChild.textContent.trim();
      let author = stateHasAuthor(state) ? activityrow.querySelector("td > div > a") : null;

      if (state && state != "Not Auto Approved Because" && activityrow.firstElementChild.className != "no-activity") {
        results.push({
          state: state,
          type: stateToType(state),
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

    if (status == "Approved") {
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
    slug: doc.location.pathname.match(/\/([^/]+)$/)[1],
    lastupdate: new Date().toISOString(),

    versions: versions,
    latest_idx: versions.length - 1,
    lastapproved_idx: lastapproved_idx
  };
}

function updateSize(info) {
  return new Promise((resolve) => {
    chrome.storage.local.get({ "queueinfo-use-diff": false }, resolve);
  }).then((prefs) => {
    if (prefs["queueinfo-use-diff"] && info.lastapproved_idx !== null) {
      let prev = info.versions[info.lastapproved_idx];
      let cur = info.versions[info.latest_idx];
      return determineChanges(prev, cur).then((stats) => {
        info.diffinfo = stats;
      });
    } else {
      return Promise.all([
        determineSize(info.versions[info.latest_idx]),
        determineSize(info.versions[info.lastapproved_idx])
      ]).then(() => {
        delete info.diffinfo;
      });
    }
  }).then(() => {
    return info;
  });
}

function findParent(node, className) {
  let current = node;
  while (current && !current.classList.contains(className)) {
    current = current.parentNode;
  }
  return current;
}

// -- main --
(function() {
  // Make file info links open in a new tab
  document.querySelectorAll(".file-info a").forEach((link) => {
    link.setAttribute("target", "_blank");
  });

  // Make editors install link trigger a download
  // TODO move this to content/downloads
  document.getElementById("review-files").addEventListener("click", (event) => {
    if (event.target.classList.contains("editors-install")) {
      let listbody = findParent(event.target, "listing-body");
      let headerparts = listbody.previousElementSibling.firstElementChild.textContent.match(/Version ([^·]+)· ([^·]+)· (.*)/);
      let version = headerparts[1].trim();
      let id = document.querySelector("#addon").getAttribute("data-id");
      chrome.runtime.sendMessage({ action: "download", addonid: id, version: version });

      event.preventDefault();
      event.stopPropagation();
    }
  });

  // Open compare link if options enabled
  chrome.storage.local.get({ "queueinfo-open-compare": false }, (prefs) => {
    if (prefs["queueinfo-open-compare"]) {
      document.querySelector(".listing-body:last-child .file-info a.compare").click();
    }
  });

  // Collect review info and set in storage
  let info = getInfo(document);
  chrome.storage.local.set({ ["slugInfo." + info.slug]: info.id }, () => {
    chrome.storage.local.set({ ["reviewInfo." + info.id]: info }, () => {
      updateSize(info).then(() => {
        chrome.storage.local.set({ ["reviewInfo." + info.id]: info });
      });
    });
  });
})();
