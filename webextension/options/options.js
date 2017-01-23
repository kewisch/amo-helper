function restore_options() {
  chrome.storage.local.get({
    "tabclose-other-queue": true,
    "tabclose-review-child": true,
    "browseraction-queue-refresh-period": 60
  }, (prefs) => {
    document.getElementById("tabclose-other-queue").checked = prefs["tabclose-other-queue"];
    document.getElementById("tabclose-review-child").checked = prefs["tabclose-review-child"];
    document.getElementById("browseraction-queue-refresh-period").value = prefs["browseraction-queue-refresh-period"];
  });
}

function change_options(event) {
  let node = event.target;
  if (!node.id) {
    return;
  }

  if (node.getAttribute("type") == "checkbox") {
    chrome.storage.local.set({ [node.id]: node.checked });
  } else if (node.localName == "input") {
    chrome.storage.local.set({ [node.id]: node.value });
  }
}

document.addEventListener("DOMContentLoaded", restore_options);
document.body.addEventListener("change", change_options);