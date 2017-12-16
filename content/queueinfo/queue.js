/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

// import { getInfoWithSize } from "./review-common"

const OVERDUE_SOURCES = 7;
const QUEUE = document.location.pathname.split("/").pop();

async function initPageLayout() {
  let header = document.querySelector("#addon-queue > thead > .listing-header");

  let weeklines = await getStoragePreference("queueinfo-show-weeklines");
  let isAdmin = await getStoragePreference("is-admin");

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
  if (isAdmin) {
    column = document.createElement("th");
    column.className ="amoqueue-helper-size-column";
    column.textContent = "Size";
    header.appendChild(column);
  }

  let rows = document.querySelectorAll(".addon-row");
  let now = new Date();
  let bizdayCache = {};
  let relweekCache = {};
  let lastRelWeek = -1;

  let hasTypeColumn = document.querySelector(".listing-header > th > a[href$='addon_type_id']");
  let hasWaitingColumn = document.querySelector(".listing-header > th > a[href$='waiting_time_min']");

  for (let row of rows) {
    let slug = row.querySelector("a").getAttribute("href").split("/").pop();

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
    if (isAdmin) {
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

    // Various cases on waiting time, only for queues that actually show it
    if (hasWaitingColumn) {
      // Add classes for review time categories. Probably best in product
      let daycell = row.querySelector("td:nth-of-type(4)");
      daycell.classList.add("amoqueue-helper-waitcell");
      let parts = row.querySelector("td:nth-of-type(4)").textContent.split(" ");
      let unit = parts[1];
      let size = parseInt(parts[0], 10);
      let days = unit.startsWith("day") ? size : 0;
      updateReviewTimeClass(row, days);

      // Business day waiting time
      if (!(days in bizdayCache)) {
        let submission = new Date(now);
        submission.setDate(submission.getDate() - days);
        bizdayCache[days] = workingDaysBetweenDates(submission, now);
        relweekCache[days] = relweek(submission, now);
      }
      daycell.dataset.businessDays = bizdayCache[days];
      daycell.dataset.fullText = daycell.textContent;
      daycell.dataset.fullDays = days;
      daycell.dataset.fullUnit = unit;
      daycell.dataset.fullMinutes = toMinutes(size, unit);
      daycell.dataset.businessMinutes = unit.startsWith("day") ? toMinutes(bizdayCache[days], unit) : daycell.dataset.fullMinutes;

      if (weeklines && (lastRelWeek == -1 || relweekCache[days] != lastRelWeek)) {
        row.classList.add("amoqueue-new-week");
        lastRelWeek = relweekCache[days];
      }
    }

    // Partner addon status
    if (isPartnerAddon(slug)) {
      row.classList.add("amoqueue-is-partner");
    }

    if (hasTypeColumn) {
      // Remove type column, don't see the need for it.
      row.querySelector("td:nth-of-type(3)").remove();
    }
  }

  // Remove header for type column
  if (hasTypeColumn) {
    hasTypeColumn.parentNode.remove();
  }

  // Counting filtered results requires the pagination node to always be around
  let filterCountContainerTop = document.querySelector(".data-grid-content.data-grid-top");
  let numResults = document.querySelector(".data-grid-content.data-grid-top .num-results");
  if (filterCountContainerTop) {
    filterCountContainerTop.querySelector(".num-results strong:nth-of-type(1)").className = "amoqueue-results-pagestart";
    filterCountContainerTop.querySelector(".num-results strong:nth-of-type(2)").className = "amoqueue-results-pageend";
    filterCountContainerTop.querySelector(".num-results strong:nth-of-type(3)").className = "amoqueue-results-total";
    numResults.id = "amoqueue-num-results";
  } else {
    let addonQueue = document.getElementById("addon-queue");
    filterCountContainerTop = document.createElement("div");
    filterCountContainerTop.className = "data-grid-content data-grid-top";
    addonQueue.before(filterCountContainerTop);

    numResults = document.createElement("div");
    numResults.className = "num-results";
    numResults.id = "amoqueue-num-results";
    numResults.innerHTML = "Results <strong class='amoqueue-results-pagestart'>1</strong>" +
                           "–<strong class='amoqueue-results-pageend'></strong> of " +
                           "<strong class='amoqueue-results-total'></strong>";

    let numRows = document.querySelectorAll("#addon-queue .addon-row").length;
    numResults.querySelector(".amoqueue-results-pageend").textContent = numRows;
    numResults.querySelector(".amoqueue-results-total").textContent = numRows;

    filterCountContainerTop.appendChild(numResults);
  }

  let filteredSpan = document.createElement("span");
  filteredSpan.id = "amoqueue-filtered-results";
  filteredSpan.className = "amoqueue-hide";
  filteredSpan.innerHTML = " (filtered <strong id='amoqueue-filtered-count'>1</strong>)";
  numResults.appendChild(filteredSpan);

  // Search box enhancements
  let searchbox = document.querySelector("div.queue-search");
  if (!searchbox) {
    // auto-approval queue does not have a searchbox
    searchbox = document.createElement("div");
    searchbox.className = "queue-search";

    let queue = document.getElementById("addon-queue");
    document.querySelector(".queue-inner").insertBefore(searchbox, queue);
  }


  await addSearchRadio("Show Information requests", "show-info", ["Both", "Only", "None"], (state) => {
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
    updateQueueRows();
  });

  if (QUEUE != "auto_approved") {
    await addSearchRadio("Show Add-ons", "show-webext", ["Both", "WebExtensions", "Legacy"], (state) => {
      document.querySelectorAll("#addon-queue .addon-row").forEach((row) => {
        let iswebext = row.classList.contains("amoqueue-helper-iconclass-webextension");
        if (state == "both") {
          hideBecause(row, "webextension", false);
        } else if (state == "webextensions") {
          hideBecause(row, "webextension", !iswebext);
        } else if (state == "legacy") {
          hideBecause(row, "webextension", iswebext);
        }
      });
      updateQueueRows();
    });
  }

  if (isAdmin) {
    await addSearchRadio("Show Reviews", "show-admin", ["Both", "Admin", "Regular"], (state) => {
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
      updateQueueRows();
    });
  }

  await addSearchCheckbox("Automatically open compare tab when showing review pages", "queueinfo-open-compare");

  if (QUEUE != "auto_approved") {
    await addSearchCheckbox("Show waiting time in business days", "queueinfo-business-days", (checked) => {
      let addonRows = [...document.querySelectorAll(".addon-row")];
      for (let row of addonRows) {
        let cell = row.querySelector(".amoqueue-helper-waitcell");
        let days;
        if (checked && cell.dataset.fullUnit.startsWith("day")) {
          cell.textContent = cell.dataset.businessDays + " business days";
          days = cell.dataset.businessDays;
        } else {
          cell.textContent = cell.dataset.fullText;
          days = cell.dataset.fullDays;
        }
        updateReviewTimeClass(row, days);
      }

      isSortedByBusinessDays.yep = checked;
      updateSort(addonRows);
    });
  }

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
  let queueButtons = document.createElement("div");
  queueButtons.className = "amoqueue-queue-buttons";
  searchbox.appendChild(queueButtons);

  /* TODO disabled this feature since XHR doesn't do cookies correctly.
  if (isAdmin) {
    // Load button
    let loadButton = document.createElement("button");
    loadButton.id = "amoqueue-load-button";
    loadButton.className = "amoqueue-queue-button";
    loadButton.appendChild(document.createElement("span")).className = "image";

    let loadLabel = loadButton.appendChild(document.createElement("span"));
    loadLabel.textContent = "Load";
    loadLabel.className = "label";

    loadButton.addEventListener("click", async () => {
      let perLoad = await getStoragePreference("addons-per-load");
      let noinfo = Array.from(document.querySelectorAll("#addon-queue .addon-row:not(.amoqueue-has-info)"))
                        .slice(0, perLoad)
                        .map((row) => row.getAttribute("data-addon"));
      loadButton.setAttribute("disabled", "true");
      window.localStorage["dont_poll"] = true;

      await downloadReviewInfo(noinfo);
      delete window.localStorage["dont_poll"];
      loadButton.removeAttribute("disabled");
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
}

async function initPartnerAddons() {
  let partnerAddons = await getStoragePreference("queueinfo-partner-addons");
  initPartnerAddons.addons = new Set(partnerAddons.split(/,\s*/));
}
function isPartnerAddon(slug) {
  let addons = initPartnerAddons.addons || new Set();
  return addons.has(slug);
}

function isSortedByBusinessDays() {
  return isSortedByBusinessDays.yep;
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
    row.classList.remove("amoqueue-hidden-row");
  } else {
    row.classList.add("amoqueue-hidden-row");
  }
}

async function addSearchRadio(labelText, prefName, optionLabels, stateUpdater=() => {}) {
  let searchbox = document.querySelector("div.queue-search");

  let fieldset = document.createElement("fieldset");
  let initial = await getStoragePreference(prefName);
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
    browser.storage.local.set({ [prefName]: event.target.value });
    stateUpdater(event.target.value);
  });

  stateUpdater(initial);
}

async function addSearchCheckbox(labelText, prefName, stateUpdater=() => {}) {
  let searchbox = document.querySelector("div.queue-search");
  let initial = await getStoragePreference(prefName);
  let label = document.createElement("label");
  let checkbox = document.createElement("input");
  checkbox.setAttribute("type", "checkbox");
  label.className = "amoqueue-search-checkbox-label";
  label.appendChild(checkbox);
  label.appendChild(document.createTextNode(labelText));
  checkbox.checked = initial;
  searchbox.appendChild(label);

  checkbox.addEventListener("change", (event) => {
    browser.storage.local.set({ [prefName]: event.target.checked });
    stateUpdater(event.target.checked);
  });

  stateUpdater(initial);
}

async function updateQueueInfo() {
  let prefs = [];
  for (let row of document.querySelectorAll("#addon-queue .addon-row")) {
    prefs.push("reviewInfo." + row.getAttribute("data-addon"));
  }

  let data = await browser.runtime.sendMessage({ action: "infostorage", op: "get", storage: "review", keys: prefs });
  for (let reviewInfo of Object.values(data || {})) {
    updateReviewInfoDisplay(reviewInfo.id, reviewInfo);
  }

  updateQueueRows();
}

function updateQueueRows() {
  let slugs = [];
  let showing = 0;
  let rows = [...document.querySelectorAll("#addon-queue .addon-row")];
  for (let row of rows) {
    if (row.amoqueue_helper_hidebecause && row.amoqueue_helper_hidebecause.size == 0) {
      slugs.push(row.querySelector("a").getAttribute("href").split("/").pop());
      showing++;
    }
  }

  if (showing == rows.length) {
    document.querySelector("#amoqueue-filtered-results").classList.add("amoqueue-hide");
  } else {
    document.querySelector("#amoqueue-filtered-count").textContent = showing;
    document.querySelector("#amoqueue-filtered-results").classList.remove("amoqueue-hide");
  }

  // Save current queue page in background
  let queue = document.querySelector(".tabnav > li.selected > a").getAttribute("href").split("/").pop();
  browser.runtime.sendMessage({
    action: "queueinfo",
    method: "set",
    queue: queue,
    addons: slugs
  });
}

function clearReviews() {
  browser.runtime.sendMessage({ action: "infostorage", op: "clear", storage: "review" });
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
    updateQueueRows();
  });

  let noResults = document.getElementById("amoqueue-helper-autocomplete-noresults");
  noResults.style.display = foundsome ? "none" : "";
}

function updateSort(rows=null) {
  function sortByWaitTime(a, b) {
    let wca = a.querySelector(".amoqueue-helper-waitcell");
    let wcb = b.querySelector(".amoqueue-helper-waitcell");

    if (isSortedByBusinessDays()) {
      let bizA = wca.dataset.businessMinutes;
      let bizB = wcb.dataset.businessMinutes;
      return bizB - bizA;
    } else {
      let fullA = wca.dataset.fullMinutes;
      let fullB = wcb.dataset.fullMinutes;
      return fullB - fullA;
    }
  }

  function sortByWeight(a, b) {
    let wca = a.querySelector("td:nth-of-type(5)");
    let wcb = b.querySelector("td:nth-of-type(5)");
    return parseInt(wcb.textContent, 10) - parseInt(wca.textContent, 10);
  }

  function sortByPartner(a, b) {
    let partnerA = isPartnerAddon(a.querySelector("a").getAttribute("href").split("/").pop());
    let partnerB = isPartnerAddon(b.querySelector("a").getAttribute("href").split("/").pop());
    return (partnerA < partnerB) - (partnerB < partnerA);
  }

  if (!rows) {
    rows = [...document.querySelectorAll(".addon-row")];
  }

  let usesWaitTime = document.querySelector(".amoqueue-helper-waitcell");
  rows.sort((a, b) => {
    let partner = sortByPartner(a, b);
    if (partner != 0) {
      return partner;
    }

    if (usesWaitTime) {
      return sortByWaitTime(a, b);
    } else {
      return sortByWeight(a, b);
    }
  });

  let rowparent = rows[0].parentNode;
  for (let row of rows) {
    rowparent.appendChild(row);
  }
}

/* Unfortunately this does not work due to cookies not being set on the XHR request
async function downloadReviewInfo(ids) {
  let instance = await getStoragePreference("instance");
  let id = ids[0]; // temporary
  let response = await fetch(replacePattern(REVIEW_URL, { addon: id, instance: instance }));
  let responseText = await response.text();

  let parser = new DOMParser();
  let doc = parser.parseFromString(responseText, "text/html");
  let info = await getInfoWithSize(doc);

  await browser.storage.local.set({ ["reviewInfo." + info.id]: info });
}
*/


function updateReviewTimeClass(row, days) {
  row.className = row.className.replace(/amoqueue-helper-reviewtime-\w+/g, "");

  if (days < 5) {
    row.classList.add("amoqueue-helper-reviewtime-low");
  } else if (days < 11) {
    row.classList.add("amoqueue-helper-reviewtime-medium");
  } else if (days < 20) {
    row.classList.add("amoqueue-helper-reviewtime-high");
  } else if (days < 30) {
    row.classList.add("amoqueue-helper-reviewtime-higher");
  } else if (days < 40) {
    row.classList.add("amoqueue-helper-reviewtime-higher2");
  } else if (days < 50) {
    row.classList.add("amoqueue-helper-reviewtime-higher3");
  } else if (days < 60) {
    row.classList.add("amoqueue-helper-reviewtime-higher4");
  } else if (days < 70) {
    row.classList.add("amoqueue-helper-reviewtime-higher5");
  } else {
    row.classList.add("amoqueue-helper-reviewtime-highest");
  }
}


// https://stackoverflow.com/questions/37069186/calculate-working-days-between-two-dates-in-javascript-excepts-holidays
function workingDaysBetweenDates(startDate, endDate) {
  // Validate input
  if (endDate < startDate) {
    return 0;
  }

  // Calculate days between dates
  let days = Math.ceil((endDate - startDate) / 86400000);

  // Subtract two weekend days for every week in between
  days -= Math.floor(days / 7) * 2;

  // Handle special cases
  let startDay = startDate.getDay();
  let endDay = endDate.getDay();

  // Remove weekend not previously removed.
  if (startDay - endDay > 1) {
    days -= 2;
  }
  // Remove start day if span starts on Sunday but ends before Saturday
  if (startDay == 0 && endDay != 6) {
    days--;
  }
  // Remove end day if span ends on Saturday but starts after Sunday
  if (endDay == 6 && startDay != 0) {
    days--;
  }

  return days;
}

function relweek(startDate, endDate) {
  let sow = new Date(endDate);
  sow.setDate(sow.getDate() - sow.getDay() - 1);
  sow.setHours(0, 0, 0, 0);
  let days = Math.ceil((sow - startDate) / 86400000);

  if (startDate > sow) {
    return 0;
  } else {
    return Math.ceil(days / 7);
  }
}

function displaySize(size, relative=false) {
  let prefix = size < 0 ? "-" : (relative ? "+" : "");
  let asize = Math.abs(size);
  let i = asize ? Math.floor(Math.log(asize) / Math.log(1024)) : 0;
  return prefix + Number((asize / Math.pow(1024, i)).toFixed(2)) + " " + ["B", "kB", "MB", "GB", "TB"][i];
}

function toMinutes(size, unit) {
  switch (unit) {
    case "day":
    case "days":
      return size * 24 * 60;
    case "hour":
    case "hours":
      return size * 60;
    case "minute":
    case "minutes":
      return size;
    default:
      return 0;
  }
}

browser.storage.onChanged.addListener(async (changes, area) => {
  if (area != "local" || !changes["notify-infostorage"]) {
    return;
  }

  let notification = changes["notify-infostorage"].newValue;
  if (notification.storage != "review") {
    return;
  }

  for (let [key, reviewInfo] of Object.entries(notification.keys)) {
    updateReviewInfoDisplay(key.substr(11), reviewInfo || {});
  }
});

(async function() {
  await initPartnerAddons();
  await initPageLayout();

  let textquery = document.getElementById("id_text_query");
  if (textquery) {
    textquery.addEventListener("keyup", updateAutocomplete, false);
    window.addEventListener("pageshow", updateAutocomplete, false);
    updateAutocomplete();
  }

  window.addEventListener("pageshow", updateQueueInfo, false);
  updateQueueInfo();

  updateSort();
})();
