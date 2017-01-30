// import { getInfoWithSize } from "./review-common"

const OVERDUE_SOURCES = 7;
const IS_ADMIN = !!document.getElementById("unlisted-queues");

function initPageLayout() {
  // TODO async/await enabled starting Firefox 52
  let header = document.querySelector("#addon-queue > thead > .listing-header");

  return Promise.resolve().then(() => {
    // Last update column
    let column = document.createElement("th");
    column.className = "amoqueue-helper-lastupdate";
    column.textContent = "Last Update";
    header.appendChild(column);

    // Info column
    column = document.createElement("th");
    column.className ="amoqueue-helper-info-column";
    column.textContent = "Last Action";
    header.appendChild(column);

    // Size column
    if (IS_ADMIN) {
      column = document.createElement("th");
      column.className ="amoqueue-helper-size-column";
      column.textContent = "Size";
      header.appendChild(column);
    }

    let rows = document.querySelectorAll(".addon-row");
    for (let row of rows) {
      // Last Update column
      // reuse the last column because there is an extra column on AMO
      let cell = row.lastElementChild; // document.createElement("td");
      cell.className = "amoqueue-helper-cell amoqueue-helper-lastupdate-cell";
      row.appendChild(cell);

      // Info column
      cell = document.createElement("td");
      cell.className = "amoqueue-helper-cell amoqueue-helper-info-cell";
      row.appendChild(cell);

      // Size column
      if (IS_ADMIN) {
        cell = document.createElement("td");
        cell.className = "amoqueue-helper-cell amoqueue-helper-size-cell";
        row.appendChild(cell);
      }

      // Add css classes for app icons. Should probably add this in product.
      for (let icon of row.querySelectorAll(".app-icon")) {
        let match = icon.className.match(/ed-sprite-([^ ]*)/);
        if (match) {
          row.classList.add("amoqueue-helper-iconclass-" + match[1]);
        }
      }

      // Add classes for review time categories. Probably best in product
      let daycell = row.querySelector("td:nth-of-type(4)");
      daycell.classList.add("amoqueue-helper-waitcell");
      let parts = row.querySelector("td:nth-of-type(4)").textContent.split(" ");
      let days = parts[1] == "days" ? parseInt(parts[0], 10) : 0;
      if (days < 5) {
        row.classList.add("amoqueue-helper-reviewtime-low");
      } else if (days < 11) {
        row.classList.add("amoqueue-helper-reviewtime-medium");
      } else {
        row.classList.add("amoqueue-helper-reviewtime-high");
      }

      // Remove type column, don't see the need for it.
      row.querySelector("td:nth-of-type(3)").remove();
    }

    // Remove header for type column
    header.children[2].remove();


    // Search box enhancements
    return addSearchRadio("Show Information requests", "show-info", "both", ["Both", "Only", "None"], (state) => {
      document.querySelectorAll("#addon-queue .addon-row").forEach((row) => {
        let needinfo = row.classList.contains("amoqueue-helper-iconclass-info");
        if (state == "both") {
          hideBecause(row, "info", false);
        } else if (state == "only") {
          hideBecause(row, "info", !needinfo);
        } else if (state == "none") {
          hideBecause(row, "info", needinfo);
        }
      });
    });
  }).then(() => {
    if (IS_ADMIN) {
      return addSearchRadio("Show Reviews", "show-admin", "both", ["Both", "Admin", "Regular"], (state) => {
        document.querySelectorAll("#addon-queue .addon-row").forEach((row) => {
          let isadmin = row.classList.contains("amoqueue-helper-iconclass-admin-review");
          if (state == "both") {
            hideBecause(row, "adminstate", false);
          } else if (state == "admin") {
            hideBecause(row, "adminstate", !isadmin);
          } else if (state == "regular") {
            hideBecause(row, "adminstate", isadmin);
          }
        });
      });
    }
    return null;
  }).then(() => {
    return addSearchCheckbox("Automatically open compare tab when showing review pages", "queueinfo-open-compare", false);
  }).then(() => {
    // Autocomplete "no results" row
    let queueBody = document.querySelector("#addon-queue > tbody");

    let noResultsRow = document.createElement("tr");
    noResultsRow.id = "amoqueue-helper-autocomplete-noresults";
    noResultsRow.style.display = "none";

    let noResultsCell = document.createElement("td");
    noResultsCell.setAttribute("colspan", header.children.length);
    noResultsCell.style.textAlign = "center";
    noResultsCell.textContent = "no results";

    noResultsRow.appendChild(noResultsCell);
    queueBody.appendChild(noResultsRow);

    // Queue buttons container
    let searchbox = document.querySelector("div.queue-search");
    let queueButtons = document.createElement("div");
    queueButtons.className = "amoqueue-queue-buttons";
    searchbox.appendChild(queueButtons);

    /* TODO disabled this feature since XHR doesn't do cookies correctly.
    if (IS_ADMIN) {
      // Load button
      let loadButton = document.createElement("button");
      loadButton.id = "amoqueue-load-button";
      loadButton.className = "amoqueue-queue-button";
      loadButton.appendChild(document.createElement("span")).className = "image";

      let loadLabel = loadButton.appendChild(document.createElement("span"));
      loadLabel.textContent = "Load";
      loadLabel.className = "label";

      loadButton.addEventListener("click", () => {
        chrome.storage.local.get("addons-per-load", (prefs) => {
          let noinfo = Array.from(document.querySelectorAll("#addon-queue .addon-row:not(.amoqueue-has-info)"))
                            .slice(0, prefs["addons-per-load"])
                            .map((row) => row.getAttribute("data-addon"));
          loadButton.setAttribute("disabled", "true");
          window.localStorage["dont_poll"] = true;

          downloadReviewInfo(noinfo).then(() => {
            delete window.localStorage["dont_poll"];
            loadButton.removeAttribute("disabled");
          });
        });
      }, false);
      queueButtons.appendChild(loadButton);
    }
    */

    // Clear button
    let clearButton = document.createElement("button");
    clearButton.className = "amoqueue-queue-button";
    clearButton.textContent = "Clear";
    clearButton.addEventListener("click", clearReviews, false);
    queueButtons.appendChild(clearButton);
  });
}

function hideBecause(row, reason, state) {
  if (!row.amoqueue_helper_hidebecause) {
    row.amoqueue_helper_hidebecause = new Set();
  }

  if (state) {
    row.amoqueue_helper_hidebecause.add(reason);
  } else {
    row.amoqueue_helper_hidebecause.delete(reason);
  }

  if (row.amoqueue_helper_hidebecause.size == 0) {
    row.style.display = "";
  } else {
    row.style.display = "none";
  }
}

function addSearchRadio(labelText, prefName, defaultValue, optionLabels, stateUpdater=() => {}) {
  return new Promise((resolve, reject) => {
    let searchbox = document.querySelector("div.queue-search");
    let fieldset = document.createElement("fieldset");
    chrome.storage.local.get({ [prefName]: defaultValue }, (prefs) => {
      let initial = prefs[prefName];
      let legend = document.createElement("legend");
      legend.textContent = labelText;
      fieldset.appendChild(legend);

      for (let option of optionLabels) {
        let label = document.createElement("label");
        let radio = document.createElement("input");
        let value = option.toLowerCase();
        radio.setAttribute("type", "radio");
        radio.setAttribute("name", prefName);
        radio.setAttribute("value", value);
        if (value == initial) {
          radio.setAttribute("checked", "checked");
        }
        label.appendChild(radio);
        label.appendChild(document.createTextNode(option));
        fieldset.appendChild(label);
      }
      searchbox.appendChild(fieldset);

      fieldset.addEventListener("change", (event) => {
        chrome.storage.local.set({ [prefName]: event.target.value });
        stateUpdater(event.target.value);
      }, false);

      stateUpdater(initial);
      resolve();
    });
  });
}

function addSearchCheckbox(labelText, prefName, defaultValue, stateUpdater=() => {}) {
  return new Promise((resolve, reject) => {
    let searchbox = document.querySelector("div.queue-search");
    chrome.storage.local.get({ [prefName]: defaultValue }, (prefs) => {
      let initial = prefs[prefName];
      let label = document.createElement("label");
      let checkbox = document.createElement("input");
      checkbox.setAttribute("type", "checkbox");
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(labelText));
      checkbox.checked = initial;
      searchbox.appendChild(label);

      checkbox.addEventListener("change", (event) => {
        chrome.storage.local.set({ [prefName]: event.target.checked });
        stateUpdater(event.target.checked);
      }, false);

      stateUpdater(initial);
      resolve();
    });
  });
}

function updateQueueInfo() {
  let ids = Array.from(document.querySelectorAll("#addon-queue .addon-row"))
                 .map((row) => "reviewInfo." + row.getAttribute("data-addon"));

  chrome.storage.local.get(ids, (data) => {
    for (let reviewInfo of Object.values(data)) {
      updateReviewInfoDisplay(reviewInfo.id, reviewInfo);
    }
  });
}

function clearReviews() {
  chrome.storage.local.get(null, (data) => {
    let keys = Object.keys(data).filter(key => key.startsWith("reviewInfo."));
    chrome.storage.local.remove(keys);
  });
}

function updateReviewInfoDisplay(id, info) {
  let row = document.getElementById("addon-" + id);
  if (!row) {
    return;
  }

  if (Object.keys(info).length) {
    row.classList.add("amoqueue-has-info");
    // unsafeWindow.document.getElementById("addon-" + id).amoqueue_info = cloneInto(info, unsafeWindow);
  } else {
    row.classList.remove("amoqueue-has-info");
    // delete unsafeWindow.document.getElementById("addon-" + id).amoqueue_info;
  }

  let lastversion = info.versions && info.versions[info.versions.length - 1];
  let lastapprovedversion = info.versions && info.lastapproved_idx !== null && info.versions[info.lastapproved_idx];
  let lastactivity = lastversion ? lastversion.activities[lastversion.activities.length - 1] : {};

  if (lastactivity.type == "needinfo" &&
      lastactivity.date && moment().diff(lastactivity.date, "days") > OVERDUE_SOURCES) {
    row.classList.add("amoqueue-helper-overdue");
  } else {
    row.classList.remove("amoqueue-helper-overdue");
  }

  row.className = row.className.replace(/amoqueue-helper-type-[^ ]*/g, "");
  if (lastactivity.type) {
    row.classList.add("amoqueue-helper-type-" + lastactivity.type);
  }

  // Last update cell
  let changedcell = row.querySelector(".amoqueue-helper-lastupdate-cell");
  if (changedcell) {
    changedcell.textContent = lastactivity.date ? moment(lastactivity.date).fromNow() : "";
    if (lastactivity.author) {
      changedcell.setAttribute("title", `by ${lastactivity.author.name || "unknown"}`);
    }
  }

  // Info cell
  let infocell = row.querySelector(".amoqueue-helper-info-cell");
  if (infocell) {
    infocell.textContent = lastactivity.state || "";
    if (lastactivity.comment) {
      infocell.setAttribute("title", `Last Comment:\n\n ${lastactivity.comment}`);
    }
  }

  // Size cell
  let sizecell = row.querySelector(".amoqueue-helper-size-cell");
  if (sizecell) {
    if (info.diffinfo) {
      sizecell.textContent = `+${info.diffinfo.insertions}/-${info.diffinfo.deletions}`;
    } else if (lastversion && lastversion.size && lastapprovedversion && lastapprovedversion.size) {
      let size = lastversion.size - lastapprovedversion.size;
      sizecell.textContent = displaySize(size, true);
    } else if (lastversion && lastversion.size) {
      sizecell.textContent = displaySize(lastversion.size);
    } else {
      sizecell.textContent = "";
    }
  }
}

function updateAutocomplete() {
  let textquery = document.getElementById("id_text_query");
  let value = textquery.value.toLowerCase();
  let foundsome = false;
  document.querySelectorAll("#addon-queue .addon-row").forEach((row) => {
    let name = row.querySelector("td:nth-of-type(2) > a ").textContent.toLowerCase();
    let hide = textquery.value && !name.includes(value);
    hideBecause(row, "search", hide);
    if (!hide) {
      foundsome = true;
    }
  });

  let noResults = document.getElementById("amoqueue-helper-autocomplete-noresults");
  noResults.style.display = foundsome ? "none" : "";
}

/* Unfortunately this does not work due to cookies not being set on the XHR request
function downloadReviewInfo(ids) {

  let id = ids[0]; // temporary
  return fetch("https://addons.mozilla.org/en-US/editors/review/" + id).then((response) => {
    return response.text();
  }).then((responseText) => {
    let parser = new DOMParser();
    let doc = parser.parseFromString(responseText, "text/html");
    return getInfoWithSize(doc);
  }).then((info) => {
    chrome.storage.local.set({ ["reviewInfo." + info.id]: info });
  }, (err) => {
    return err;
  });
}
*/

function displaySize(size, relative=false) {
  let prefix = size < 0 ? "-" : (relative ? "+" : "");
  let asize = Math.abs(size);
  let i = Math.floor(Math.log(asize) / Math.log(1024));
  return prefix + Number((asize / Math.pow(1024, i)).toFixed(2)) + " " + ["B", "kB", "MB", "GB", "TB"][i];
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area != "local") {
    return;
  }

  for (let [key, { newValue: reviewInfo }] of Object.entries(changes)) {
    if (key.startsWith("reviewInfo.")) {
      updateReviewInfoDisplay(key.substr(11), reviewInfo || {});
    }
  }
});

(function() {
  initPageLayout().then(() => {
    document.getElementById("id_text_query")
            .addEventListener("keyup", updateAutocomplete, false);

    window.addEventListener("pageshow", updateQueueInfo, false);
    updateQueueInfo();

    window.addEventListener("pageshow", updateAutocomplete, false);
    updateAutocomplete();
  });
})();
