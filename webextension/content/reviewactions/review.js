function createAction(label, funcOrDest, className) {
  let actions = document.getElementById("actions-addon");
  let dest = typeof funcOrDest == "string" ? funcOrDest : "#";
  let func = typeof funcOrDest == "string" ? null : funcOrDest;

  let item = actions.appendChild(document.createElement("li"));
  let link = item.appendChild(document.createElement("a"));

  link.setAttribute("href", dest);
  link.textContent = label;
  link.className = "amoqueue-action-link " + className;

  if (func) {
    link.addEventListener("click", func);
  }
}

createAction("Copy Slug", (event) => {
  let textarea = document.createElement("textarea");
  textarea.value = decodeURIComponent(document.location.href.match(/\/([^\/]+)$/)[1]);

  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();

  event.preventDefault();
  event.stopPropagation();
}, "click-feedback");
