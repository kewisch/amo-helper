function setupLayout(cannedData, includeBody) {
  let container = document.querySelector("#review-actions-form .review-actions-canned");
  let comments = document.getElementById("id_comments");
  container.textContent = "";

  let input = document.createElement("input");
  input.id = "amoqueue-canned-input";
  input.setAttribute("type", "text");
  if (navigator.platform.includes("Mac")) {
    input.setAttribute("placeholder", "⌘+Shift+O for Canned Response");
  } else {
    input.setAttribute("placeholder", "Alt+Shift+O for Canned Response");
  }
  container.appendChild(input);

  $(input).autocomplete({
    appendTo: "#review-actions-form .review-actions-canned",
    autoFocus: true,
    delay: 0,
    source: (request, response) => {
      let matcher = new RegExp($.ui.autocomplete.escapeRegex(request.term), "i");

      response($.grep(cannedData, (value) => {
        return matcher.test(value.label) ||
               (includeBody && matcher.test(value.value));
      }));
    },
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
    if ((event.metaKey || event.altKey) && event.shiftKey && event.key.toLowerCase() == "o") {
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
  "canned-use-stock": true,
  "canned-include-body": true
}, (prefs) => {
  let cannedData = [];
  if (prefs["canned-use-stock"]) {
    let skip = new Set(["Choose a canned response...", "Approved for Public", "Rejected"]);
    let options = document.getElementById("id_canned_response").options;

    cannedData = [...options].reduce((results, elem) => {
      if (!skip.has(elem.textContent)) {
        results.push({ label: elem.textContent, value: elem.value });
      }
      skip.add(elem.textContent);
      return results;
    }, []);
  }

  cannedData = cannedData.concat(prefs["canned-responses"]);
  setupLayout(cannedData, prefs["canned-include-body"]);
});
