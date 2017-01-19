// Saves options to chrome.storage
function save_options() {
  let closeOtherQueue = document.getElementById("closeOtherQueue").checked;
  let closeReviewChild = document.getElementById("closeReviewChild").checked;

  chrome.storage.local.set({
    closeOtherQueue: closeOtherQueue,
    closeReviewChild: closeReviewChild,
  }, () => {
    // Update status to let user know options were saved.
    let status = document.getElementById("status");
    status.textContent = "Options saved.";
    setTimeout(() => {
      status.textContent = "";
    }, 750);
  });
}

function restore_options() {
  chrome.storage.local.get({
    closeOtherQueue: true,
    closeReviewChild: true,
  }, (items) => {
    document.getElementById("closeOtherQueue").checked = items.closeOtherQueue;
    document.getElementById("closeReviewChild").checked = items.closeReviewChild;
  });
}
document.addEventListener("DOMContentLoaded", restore_options);
document.getElementById("save").addEventListener("click", save_options);
