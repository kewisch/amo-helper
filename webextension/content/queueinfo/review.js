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

function determineSize(version) {
  if (!version) {
    return Promise.resolve();
  }

  return fetch(version.installurl, { method: "HEAD" }).then((response) => {
    if (response.status == 302) {
      return fetch(response.headers.get("Location"), { method: "HEAD" });
    }
    return response;
  }).then((response) => {
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

      if (state && activityrow.firstElementChild.className != "no-activity") {
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
    let status = headerparts[3].trim().split(",")[0];

    if (status == "Approved") {
      lastapproved_idx = idx;
    }

    return {
      version: headerparts[1].trim(),
      date: submissiondate,
      status: status,

      installurl: installanchor ? installanchor.getAttribute("href") : null,

      activities: activities
    };
  });

  return {
    id: doc.querySelector("#addon").getAttribute("data-id"),
    slug: doc.location.href.match(/\/([^\/]+)$/)[1],
    lastupdate: new Date().toISOString(),

    versions: versions,
    latest_idx: versions.length - 1,
    lastapproved_idx: lastapproved_idx
  };
}

function getInfoWithSize(doc) {
  let info = getInfo(doc);
  // unsafeWindow.amoqueue_info = cloneInto(info, unsafeWindow);

  return Promise.all([
    determineSize(info.versions[info.latest_idx]),
    determineSize(info.versions[info.lastapproved_idx])
  ]).then(() => {
    return info;
  });
}

// -- main --

getInfoWithSize(document).then((info) => {
  // unsafeWindow.amoqueue_info = cloneInto(info, unsafeWindow);
  chrome.storage.local.set({ ["reviewInfo." + info.id]: info });
});
