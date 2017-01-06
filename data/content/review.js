function floatingtime(str, dtonly) {
  try {
    return new Date(str + " UTC").toISOString().substr(0, dtonly ? 10 : 19);
  } catch (e) {
    return str;
  }
}

function authorInfo(anchor) {
  return !anchor ? null : {
    name: anchor.getAttribute("title"),
    url: anchor.getAttribute("href")
  };
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
    activity.state = "Testing info requested"
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
};


// --- main ---



var versions = Array.from(document.querySelectorAll("#review-files .listing-body")).map((listbody) => {
  let headerparts = listbody.previousElementSibling.firstElementChild.textContent.match(/Version ([^·]+)· ([^·]+)· (.*)/);
  let submissiondate = floatingtime(headerparts[2].trim(), true);

  let activities = Array.from(listbody.querySelectorAll(".activity tr")).reduce((results, activityrow) => {
    let state = activityrow.firstElementChild.textContent.trim();
    if (!state) {
      // empty row, not much use.
      return results;
    }
    let author = stateHasAuthor(state) ? activityrow.querySelector("td > div > a") : null;

    if (activityrow.firstElementChild.className == "no-activity") {
      let listingauthor = document.querySelector("#scroll_sidebar ul:nth-of-type(3) > li > a");
      results.push({
        state: "Submission",
        type: stateToType("Submission"),
        author: authorInfo(listingauthor),
        date: submissiondate,
        comment: ""
      });
    } else {
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

  let installanchor = listbody.querySelector(".editors-install");

  return {
    version: headerparts[1].trim(),
    date: submissiondate, 
    status: headerparts[3].trim().split(",")[0],

    installurl: installanchor ? installanchor.getAttribute("href") : null,

    activities: activities
  };
});

var info = {
  id: document.querySelector("#addon").getAttribute("data-id"),
  slug: document.location.href.match(/\/([^\/]+)$/)[1],
  lastupdate: new Date().toISOString(),
  
  versions: versions
};

unsafeWindow.amoqueue_info = cloneInto(info, unsafeWindow);
self.port.emit("review-info-received", info);
