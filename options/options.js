/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

const DEFAULT_DANGEROUS_PERMISSIONS = [
  "cookies",
  "history",
  "logins",
  "nativeMessaging"
].join(", ");

const DEFAULT_DANGEROUS_MESSAGES = [
  "outerHTML",
  "insertAdjacentHTML",
  "innerHTML",
  "eval"
].join(", ");

const DEFAULT_PREFERENCES = {
  "instance": "addons.mozilla.org",
  "is-admin": false,
  "tabclose-other-queue": true,
  "tabclose-review-child": true,
  "queueinfo-use-diff": false,
  "queueinfo-show-weeklines": false,
  "queueinfo-per-page": 200,
  "queueinfo-partner-addons": "",
  "omnibox-enabled": true,
  "browseraction-queue-refresh-period": 60,
  "browseraction-count-moderator": false,
  "canned-use-stock": true,
  "canned-include-body": true,
  "persist-info-storage": false,
  "reviewinfo-dangerous-permissions": DEFAULT_DANGEROUS_PERMISSIONS,
  "reviewinfo-dangerous-messages": DEFAULT_DANGEROUS_MESSAGES,
  "reviewinfo-show-permissions": false,
  "reviewinfo-show-validator": false,
  "reviewtimer-display": true,
  "reviewtimer-notify-interval": 10,
  "translation-secret-key": "",
  "tinderbar-show": false,
  "tinderbar-approve-text": "Thank you for your contribution. This version has been approved using a streamlined review process.",
  "tinderbar-preload-tabs": 3,
  "filewindow-enabled": false
};

const HIDDEN_PREFERENCES = {
  "is-admin": false,
  "filewindow-position": {},
  "queueinfo-business-days": false,
  "canned-responses": [],
  "show-info": "both",
  "show-webext": "both",
  "show-admin": "both",
  "queueinfo-open-compare": false
};

// https://davidwalsh.name/javascript-debounce-function
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    let later = () => {
      timeout = null;
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (!timeout) {
      func.apply(this, args);
    }
  };
}

async function restore_options() {
  let prefs = await browser.storage.local.get(DEFAULT_PREFERENCES);

  document.documentElement.classList.toggle("is-admin", prefs["is-admin"]);
  for (let key of Object.keys(prefs)) {
    let elem = document.getElementById(key);
    if (!elem) {
      continue;
    }

    if (elem.type == "checkbox") {
      elem.checked = prefs[key];
    } else if (elem.getAttribute("type") == "radio") {
      let item = document.querySelector(`input[type='radio'][name='${elem.id}'][value='${prefs[key]}']`);
      item.checked = true;
    } else {
      elem.value = prefs[key];
    }
  }

  await restore_canned_options();
}

function change_options(event) {
  let node = event.target;
  let defaultPrefs = Object.keys(DEFAULT_PREFERENCES);
  let isPreference = defaultPrefs.includes(node.id) || defaultPrefs.includes(node.name);
  if (!node.id || node.localName != "input" || !isPreference) {
    return;
  }

  if (node.getAttribute("type") == "checkbox") {
    browser.storage.local.set({ [node.id]: node.checked });
  } else if (node.getAttribute("type") == "number") {
    browser.storage.local.set({ [node.id]: parseInt(node.value, 10) });
  } else if (node.getAttribute("type") == "text") {
    browser.storage.local.set({ [node.id]: node.value });
  } else if (node.getAttribute("type") == "radio") {
    browser.storage.local.set({ [node.name]: node.value });
  }
}

function setup_listeners() {
  setup_canned_listeners();
  setup_filewindow_listeners();
  setup_import_export_listeners();
}

/* --- canned responses --- */

var save_canned_responses = debounce(() => {
  let select = document.getElementById("canned-select");

  let options = [...select.options];
  options.pop();

  let canned = options.map((option) => ({ label: option.textContent, value: option.value }));
  browser.storage.local.set({ "canned-responses": canned });
}, 500);


function setup_canned_listeners() {
  function copyNewOption() {
    let newOption = document.querySelector("#canned .canned-option-new");
    let clone = newOption.cloneNode(true);
    newOption.className = "";
    select.appendChild(clone);
  }


  let select = document.getElementById("canned-select");
  let label = document.getElementById("canned-label");
  let value = document.getElementById("canned-value");
  let button = document.getElementById("canned-delete");

  select.addEventListener("change", update_canned_state);

  label.addEventListener("keyup", (event) => {
    let selectedItem = select.options[select.selectedIndex];
    if (selectedItem.className == "canned-option-new") {
      copyNewOption();
    }

    selectedItem.textContent = label.value;
    save_canned_responses();
  });

  value.addEventListener("keyup", (event) => {
    let selectedItem = select.options[select.selectedIndex];
    if (selectedItem.className == "canned-option-new") {
      copyNewOption();
    }

    selectedItem.value = value.value;
    save_canned_responses();
  });

  button.addEventListener("click", (event) => {
    let selectedItem = select.options[select.selectedIndex];
    let next = selectedItem.nextElementSibling || selectedItem.previousElementSibling;
    selectedItem.remove();
    select.value = next.value;
    update_canned_state();
    save_canned_responses();
  });
}

function update_canned_state() {
  let select = document.getElementById("canned-select");
  let label = document.getElementById("canned-label");
  let value = document.getElementById("canned-value");
  let button = document.getElementById("canned-delete");

  let selectedItem = select.options[select.selectedIndex];
  let isNewItem = selectedItem.className == "canned-option-new";

  button.disabled = isNewItem;

  if (isNewItem) {
    value.value = "";
    label.value = "";
    label.setAttribute("placeholder", selectedItem.textContent);
  } else {
    value.value = selectedItem.value;
    label.value = selectedItem.textContent;
    label.removeAttribute("placeholder");
  }
}

async function restore_canned_options() {
  let select = document.getElementById("canned-select");

  let prefs = await browser.storage.local.get({ "canned-responses": [] });
  let previousOptions = document.querySelectorAll("#canned option:not(.canned-option-new)");
  for (let option of previousOptions) {
    option.remove();
  }

  let newOption = document.querySelector("#canned .canned-option-new");
  for (let optionData of prefs["canned-responses"]) {
    let option = document.createElement("option");
    option.textContent = optionData.label;
    option.value = optionData.value;
    select.insertBefore(option, newOption);
  }

  select.selectedIndex = 0;
  update_canned_state();
}

/* --- filewindow position --- */

function setup_filewindow_listeners() {
  let resetButton = document.getElementById("filewindow-position-reset");

  resetButton.addEventListener("click", (event) => {
    browser.storage.local.set({ "filewindow-position": {} });
    resetButton.disabled = true;
  });
}

/* --- import export --- */

function setup_import_export_listeners() {
  let importButton = document.getElementById("import-button");
  let exportButton = document.getElementById("export-button");
  let importFile = document.getElementById("import-file");

  exportButton.addEventListener("click", async (event) => {
    let prefs = await browser.storage.local.get(null);

    let deleteKeys = Object.keys(prefs).filter(key => {
      if (key.startsWith("reviewInfo.") || key.startsWith("slugInfo.")) {
        return true;
      }

      if (DEFAULT_PREFERENCES.hasOwnProperty(key) && prefs[key] == DEFAULT_PREFERENCES[key]) {
        // Filter out prefs that have not been changed from the default
        return true;
      }

      if (HIDDEN_PREFERENCES.hasOwnProperty(key) && prefs[key] == HIDDEN_PREFERENCES[key]) {
        // Filter out prefs that have not been changed from the default
        return true;
      }

      return false;
    });

    deleteKeys.forEach(key => delete prefs[key]);

    let url = URL.createObjectURL(new Blob([JSON.stringify(prefs, null, 2)], { type: "application/json" }));

    let downloadId = null;
    let completeListener = (delta) => {
      if (delta.id != downloadId) {
        return;
      }

      if (delta.state.current == "complete") {
        URL.revokeObjectURL(url);
        browser.downloads.onChanged.removeListener(completeListener);
      }
    };
    browser.downloads.onChanged.addListener(completeListener);

    downloadId = await browser.downloads.download({
      url: url,
      filename: "amoqueue.json",
      saveAs: true
    });
  });

  importFile.addEventListener("change", (event) => {
    let file = importFile.files[0];

    let reader = new FileReader();
    reader.addEventListener("loadend", async () => {
      let newPrefs = JSON.parse(reader.result);

      let safePrefs = {};
      for (let key of Object.keys(DEFAULT_PREFERENCES)) {
        if (newPrefs.hasOwnProperty(key) && typeof newPrefs[key] == typeof DEFAULT_PREFERENCES[key]) {
          safePrefs[key] = newPrefs[key];
        }
      }
      for (let key of Object.keys(HIDDEN_PREFERENCES)) {
        if (newPrefs.hasOwnProperty(key) && typeof newPrefs[key] == typeof HIDDEN_PREFERENCES[key]) {
          safePrefs[key] = newPrefs[key];
        }
      }

      let clearStorage = document.getElementById("import-clear-storage");
      if (clearStorage.checked) {
        await browser.storage.local.clear();
        clearStorage.checked = false;
      }

      await browser.storage.local.set(safePrefs);
      await restore_options();
    });
    reader.readAsText(file);
  });

  importButton.addEventListener("click", (event) => {
    importFile.click();
    event.preventDefault();
  });
}

document.addEventListener("DOMContentLoaded", setup_listeners);
document.addEventListener("DOMContentLoaded", restore_options);
document.body.addEventListener("change", change_options);
