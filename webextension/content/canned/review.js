function setupLayout(cannedData) {
  let container = document.querySelector("#review-actions-form .review-actions-canned");
  let comments = document.getElementById("id_comments");
  container.textContent = "";

  let input = document.createElement("input");
  input.id = "amoqueue-canned-input";
  input.setAttribute("type", "text");
  if (navigator.platform.includes("Mac")) {
    input.setAttribute("placeholder", "⌘+Shift+O for Canned Response");
  } else {
    input.setAttribute("placeholder", "Ctrl+Shift+O for Canned Response");
  }
  container.appendChild(input);

  $(input).autocomplete({
    appendTo: "#review-actions-form .review-actions-canned",
    autoFocus: true,
    delay: 0,
    source: cannedData,
    select: (event, { item }) => {
      let commentValue = comments.value.substr(0, comments.selectionStart) +
                         item.value +
                         comments.value.substr(comments.selectionEnd);

      comments.value = commentValue;
      input.value = "";
      comments.focus();
      event.preventDefault();
    }
  });

  let button = document.createElement("button");
  button.id = "amoqueue-canned-button";
  button.className = "ui-icon ui-icon-gear";
  container.appendChild(button);
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    chrome.runtime.sendMessage({ action: "openPrefs" });
  });


  window.addEventListener("keypress", (event) => {
    if (event.metaKey && event.shiftKey && event.key == "o") {
      if (document.activeElement == input) {
        comments.focus();
      } else {
        input.focus();
      }
    } else if (document.activeElement == input && (event.key == "Escape" || event.key == "Enter")) {
      input.value = "";
      comments.focus();
    } else {
      // not a handled key code
      return;
    }

    event.stopPropagation();
    event.preventDefault();
  });
}

// -- main --

chrome.storage.local.get({
  "canned-responses": [],
  "canned-use-stock": true
}, (prefs) => {
  let cannedData = [];
  if (prefs["canned-use-stock"]) {
    let skip = new Set(["Choose a canned response...", "Approved for Public", "Rejected"]);
    let options = document.getElementById("id_canned_response").options;
    cannedData = [...options].map(elem => ({ label: elem.textContent, value: elem.value }))
                             .filter(option => !skip.has(option.label));
  }

  cannedData = cannedData.concat(prefs["canned-responses"]);
  setupLayout(cannedData);
});
