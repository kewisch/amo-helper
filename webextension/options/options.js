function restore_options() {
  chrome.storage.local.get({
    "tabclose-other-queue": true,
    "tabclose-review-child": true
  }, (prefs) => {
    document.getElementById("tabclose-other-queue").checked = prefs["tabclose-other-queue"];
    document.getElementById("tabclose-review-child").checked = prefs["tabclose-review-child"];
  });
}

function change_options(event) {
  let node = event.target;

  if (node.getAttribute("type") == "checkbox" && node.id) {
    chrome.storage.local.set({ [node.id]: node.checked });
  }
}

document.addEventListener("DOMContentLoaded", restore_options);
document.body.addEventListener("change", change_options);
