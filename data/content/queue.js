"use strict";

const OVERDUE_SOURCES = 7;
var prefs = {};

function initPageLayout() {
  let header = document.querySelector("#addon-queue > thead > .listing-header");
  let column = document.createElement("th");
  column.className = "amoqueue-helper-lastupdate";
  column.textContent = "Last Update";
  header.appendChild(column);
  
  column = document.createElement("th");
  column.className ="amoqueue-helper-info-column";
  column.textContent = "Last Action";
  header.appendChild(column);

  let rows = document.querySelectorAll(".addon-row");
  for (let row of rows) {
    // reuse the last column because there is an extra column on AMO
    let cell = row.lastElementChild; // document.createElement("td");
    cell.className = "amoqueue-helper-cell amoqueue-helper-lastupdate-cell";
    row.appendChild(cell);

    cell = document.createElement("td");
    cell.className = "amoqueue-helper-cell amoqueue-helper-info-cell";
    row.appendChild(cell);


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
  addSearchRadio("Show Information requests", "show-info", ["Both", "Only", "None"], (state) => {
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

  if (document.querySelector(".app-icon.ed-sprite-admin-review")) {
    addSearchRadio("Show Reviews", "show-admin", ["Both", "Admin", "Regular"], (state) => {
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

function addSearchRadio(labelText, prefName, optionLabels, stateUpdater) {
  let searchbox = document.querySelector("div.queue-search");
  let fieldset = document.createElement("fieldset");
  let initial = prefs[prefName];

  let legend = document.createElement("legend");
  legend.textContent = labelText;
  fieldset.appendChild(legend);

  for (let option of optionLabels) { 
      let label = document.createElement("label");
      let radio = document.createElement("input")
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

  fieldset.addEventListener("change", function(event) {
    self.port.emit("change-pref", prefName, event.target.value);
    stateUpdater(event.target.value);
  }, false);

  stateUpdater(initial);
}

function addSearchCheckbox(labelText, prefName, stateUpdater) {
  let searchbox = document.querySelector("div.queue-search");
  let label = document.createElement("label");
  let checkbox = document.createElement("input")
  checkbox.setAttribute("type", "checkbox");
  label.appendChild(checkbox);
  label.appendChild(document.createTextNode("Hide information requests"));
  searchbox.appendChild(label);

  checkbox.addEventListener("change", function(event) {
    self.port.emit("change-pref", prefName, event.target.checked);
    stateUpdater(event.target.checked);
  }, false);

  checkbox.checked = prefs[prefName];
  stateUpdater(checkbox.checked);
}

function updateQueueInfo() {
  let ids = Array.from(document.querySelectorAll("#addon-queue .addon-row")).map((row) => row.getAttribute("data-addon"));
  self.port.emit("request-review-info", ids);
}

function destroyLayout() {
  document.querySelector(".amoqueue-helper-info-column").remove();
  for (let cell of document.querySelectorAll(".amoqueue-helper-info-cell")) {
    cell.remove();
  }
}

function updateReviewInfoDisplay(id, info) {
  let row = document.getElementById("addon-" + id);
  unsafeWindow.document.getElementById("addon-" + id).amoqueue_info = cloneInto(info, unsafeWindow);

  let lastversion = info.versions[info.versions.length - 1];
  let lastactivity = lastversion.activities[lastversion.activities.length - 1];
  if (!lastactivity) {
    return;
  }

  if (lastactivity.type == "needinfo" &&
      lastactivity.date && moment().diff(lastactivity.date, "days") > OVERDUE_SOURCES) {
    row.classList.add("amoqueue-helper-overdue");
  }

  row.className = row.className.replace(/amoqueue-helper-type-[^ ]*/g, "");
  row.classList.add("amoqueue-helper-type-" + lastactivity.type);

  let changedcell = row.querySelector(".amoqueue-helper-lastupdate-cell");
  if (changedcell) {
    changedcell.textContent = lastactivity.date ? moment(lastactivity.date).fromNow() : "";
    if (lastactivity.author) {
      changedcell.setAttribute("title", `by ${lastactivity.author.name || "unknown"}`);
    }
  }

  let infocell = row.querySelector(".amoqueue-helper-info-cell");
  if (infocell) {
    infocell.textContent = lastactivity.state;
    infocell.setAttribute("title", `Last Comment:\n\n ${lastactivity.comment}`);
  }
}

function main() {
    initPageLayout();

    self.port.on("receive-review-info", function(data) {
      for (let reviewinfo of data) {
        updateReviewInfoDisplay(reviewinfo.id, reviewinfo);
      }
    });

    window.addEventListener("pageshow", updateQueueInfo, false);
    updateQueueInfo();
}
// --- main ---

self.port.on("change-pref", function(key, value) {
  prefs[key] = value;
});
self.port.on("receive-prefs", function(prefdata) {
  prefs = prefdata;
  main();
});
