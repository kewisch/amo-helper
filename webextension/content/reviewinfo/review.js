const DEFAULT_DANGEROUS_PERMISSIONS = "webRequest, cookies, history, logins, nativeMessaging";

function initLayout() {
  // Put latest permissions at top.
  initTopPermissions();

  // Scroll to the end of the header.
  window.scroll(0, document.querySelector(".addon").offsetTop - 10);
}

async function initTopPermissions() {
  // Lets assume people don't use different permissions per platform and just get one
  let permissionsNode = document.querySelector("#review-files .listing-body:last-child .file-info div strong");
  if (!permissionsNode) {
    return;
  }

  let prefs = await browser.storage.local.get({ "reviewinfo-dangerous-permissions": DEFAULT_DANGEROUS_PERMISSIONS });
  let dangerous = new Set(prefs["reviewinfo-dangerous-permissions"].split(/,\s*/));

  let permissions = permissionsNode.nextSibling.textContent.trim().split(", ");
  permissions.sort((a, b) => {
    let isHostA = a.includes("://"), isHostB = b.includes("://");
    let dangerousA = dangerous.has(a), dangerousB = dangerous.has(b);

    if (dangerousA && !dangerousB) {
      return -1;
    } else if (dangerousB && !dangerousA) {
      return 1;
    } else if (isHostA && !isHostB) {
      return 1;
    } else if (isHostB && !isHostA) {
      return -1;
    } else {
      return (a > b) - (b > a);
    }
  });

  let tbody = document.querySelector("#addon-summary table tbody");
  let row = tbody.appendChild(document.createElement("tr"));
  let label = row.appendChild(document.createElement("th"));
  let value = row.appendChild(document.createElement("td"));

  label.textContent = "Latest Permissions";
  let list = value.appendChild(document.createElement("ul"));
  list.className = "amoqueue-permissions-list";
  for (let permission of permissions) {
    let item = list.appendChild(document.createElement("li"));
    item.textContent = permission;
    if (dangerous.has(permission)) {
      item.setAttribute("dangerous", "true");
    }
  }
}

initLayout();
