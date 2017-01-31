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

function restore_options() {
  chrome.storage.local.get({
    "tabclose-other-queue": true,
    "tabclose-review-child": true,
    "queueinfo-use-diff": false,
    "queueinfo-per-page": 100,
    "browseraction-queue-refresh-period": 60,
    "canned-use-stock": true
  }, (prefs) => {
    document.getElementById("tabclose-other-queue").checked = prefs["tabclose-other-queue"];
    document.getElementById("tabclose-review-child").checked = prefs["tabclose-review-child"];
    document.getElementById("queueinfo-use-diff").checked = prefs["queueinfo-use-diff"];
    document.getElementById("queueinfo-per-page").value = prefs["queueinfo-per-page"];
    document.getElementById("browseraction-queue-refresh-period").value = prefs["browseraction-queue-refresh-period"];
    document.getElementById("canned-use-stock").checked = prefs["canned-use-stock"];
  });
}

function change_options(event) {
  let node = event.target;
  if (!node.id) {
    return;
  }

  if (node.getAttribute("type") == "checkbox") {
    chrome.storage.local.set({ [node.id]: node.checked });
  } else if (node.getAttribute("type") == "number") {
    chrome.storage.local.set({ [node.id]: parseInt(node.value, 10) });
  } else if (node.localName == "input") {
    chrome.storage.local.set({ [node.id]: node.value });
  }
}

var save_canned_responses = debounce(() => {
  let select = document.getElementById("canned-select");

  let options = [...select.options];
  options.pop();

  let canned = options.map((option) => ({ label: option.textContent, value: option.value }));
  chrome.storage.local.set({ "canned-responses": canned });
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

  select.addEventListener("change", (event) => {
    let selectedItem = select.options[select.selectedIndex];
    if (selectedItem.className == "canned-option-new") {
      value.value = "";
      label.value = "";
      label.setAttribute("placeholder", selectedItem.textContent);
    } else {
      value.value = selectedItem.value;
      label.value = selectedItem.textContent;
      label.removeAttribute("placeholder");
    }
  });

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

  chrome.storage.local.get({ "canned-responses": [] }, (prefs) => {
    let newOption = document.querySelector("#canned .canned-option-new");
    for (let optionData of prefs["canned-responses"]) {
      let option = document.createElement("option");
      option.textContent = optionData.label;
      option.value = optionData.value;
      select.insertBefore(option, newOption);
    }
  });
}

document.addEventListener("DOMContentLoaded", restore_options);
document.addEventListener("DOMContentLoaded", setup_canned_listeners);
document.body.addEventListener("change", change_options);
