document.querySelector("a.command[href*='editors/review']").addEventListener("click", (event) => {
  let slug = event.target.getAttribute("href").split("/")[4];

  chrome.runtime.sendMessage({ action: "tabclose-backtoreview", slug: slug });
  event.preventDefault();
  event.stopPropagation();
});
