$("div#arh").remove();

let data = [];

let versions = $(".listing-header");
versions.each(function(versionIndex) {
  let versionMetadata = $(this).text().split("·");
  let number = versionMetadata[0].replace(/^\s*Version/, "").trim();
  let date = versionMetadata[1].trim();
  let files = $(".files .file-info", $(this).next());
  let dataFiles = [];
  files.each(function(filesIndex) {
    let fileItem = $("a.editors-install", $(this));
    dataFiles.push({
      fileLink: fileItem.attr("href"),
      validationLink: fileItem.parent().next().next().attr("href"),
      contentsLink: fileItem.parent().next().next().next().attr("href"),
      platform: fileItem.text(),
      status: fileItem.parent().next().text().trim()
    });
  });
  let sourcesLink = $(this).next().find("strong:contains(Additional sources:)").parent().next().children().first().attr("href");
  data.push({
    versionNumber: number,
    date: date,
    files: dataFiles,
    sourcesLink: sourcesLink
  });
});

let table = $("<table>", { id: "arh_table" });

for (let version of data) {
  let row = $("<tr>");
  let colDate = $("<td>").text(version.date);
  let colVersion = $("<td>").text(version.versionNumber);
  let colSources = $("<td>").append(createCheckboxedLink("sources-" + version.versionNumber, version.sourcesLink, "Sources"));
  row.append(colDate).append(colVersion).append(colSources).append(createFilesColumns(version.files));
  table.append(row);
}

let buttonRow = $("<div>", { id: "arh_button-row" });
buttonRow.append($("<button>", {
  "id": "arh_button_download",
  "class": "button arh_button",
  "type": "button",
  "disabled": "disabled",
  "click": function(event) {
    self.port.emit("download", prepareDownload());
  }
}).text("Download"));

buttonRow.append($("<button>", {
  "id": "arh_button_compare-off",
  "class": "button arh_button",
  "type": "button",
  "disabled": "disabled",
  "click": function(event) {
    self.port.emit("offline-compare", prepareDownload());
  }
}).text("Compare with Client"));

buttonRow.append($("<button>", {
  "id": "arh_button_compare-on",
  "class": "button arh_button",
  "type": "button",
  "disabled": "disabled",
  "click": function(event) {
    let allCheckedCheckboxes = $("#arh_table input:checkbox:checked");
    let fileIds = [];
    allCheckedCheckboxes.each(function(index) {
      fileIds.push($(this).next().prop("href").match(/\/file\/(\d+)\//)[1]);
    });
    let url = `https://${location.host}/firefox/files/compare/${fileIds.reverse().join("...")}/`;
    self.port.emit("openTab", url);
  }
}).text("Compare on AMO"));

let outerDiv = $("<div>", { id: "arh" })
       .append($("<h3>", { text: "Files overview" }))
       .append($("<div>", { id: "arh_inner" }).append(table).append(buttonRow));

let reviewAction = $("#review-files-header").next().next();
reviewAction.before(outerDiv);

$("#arh_table input:checkbox").change(function() { // eslint-disable-line prefer-arrow-callback
  let allCheckedCheckboxes = $("#arh_table input:checkbox:checked");
  if (allCheckedCheckboxes.length == 0) {
    $("button:button[id^='arh_button_']").prop("disabled", true);
  } else {
    $("button:button[id^='arh_button_download']").prop("disabled", false);

    let allCheckedSources = $("#arh_table input:checkbox[value^='sources-']:checked");
    let allCheckedFiles = $("#arh_table input:checkbox[value^='file-']:checked");
    if ((allCheckedSources.length > 0) && (allCheckedFiles.length > 0)) {
      $("button:button[id^='arh_button_compare-']").prop("disabled", true);
    } else {
      if (allCheckedSources.length > 0) {
        $("button:button[id^='arh_button_compare-']").prop("disabled", true);
      }
      if (allCheckedSources.length == 2) {
        $("button:button[id^='arh_button_compare-off']").prop("disabled", false);
      }
      if (allCheckedFiles.length > 0) {
        $("button:button[id^='arh_button_compare-']").prop("disabled", true);
      }
      if (allCheckedFiles.length == 2) {
        $("button:button[id^='arh_button_compare-']").prop("disabled", false);
      }
    }
  }
});

function createFilesColumns(files) {
  let fileNameCol = $("<td>");
  let fileValidationCol = $("<td>");
  let fileContentsCol = $("<td>");
  for (let file of files) {
    let fileLink = createCheckboxedLink(`file-${getSlug(file.fileLink)}`, file.fileLink, file.platform);
    switch (file.status) {
      case "Awaiting Review":
        fileLink.last().addClass("arh_file-pending");
        break;
      case "Rejected":
      case "Rejected or Unreviewed":
        fileLink.last().addClass("arh_file-disabled");
        break;
      case "Approved":
        fileLink.last().addClass("arh_file-approved");
        break;
    }
    fileNameCol.append(fileLink).append("<br>");
    fileValidationCol.append(createLink(file.validationLink, "Validation")).append("<br>");
    fileContentsCol.append(createLink(file.contentsLink, "Contents")).append("<br>");
  }
  return (fileNameCol).add(fileValidationCol).add(fileContentsCol);
}

function createLink(href, text) {
  return !href || !text ? null : $("<a>", {
    href: href,
    text: text,
    click: function(event) {
      self.port.emit("download", [{
        downloadPath: event.target.href,
        filename: createTargetFilename(event.target.href, event.target.previousSibling.getAttribute("value").replace(/sources-/, ""))
      }]);
      event.stopPropagation();
      event.preventDefault();
    }
  });
}

function createCheckboxedLink(name, href, text) {
  return !name || !href || !text ? null : $("<input>", {
    type: "checkbox",
    value: name
  }).add(createLink(href, text));
}

function getSlug(path) {
  return path.split("/").pop().split("?").shift();
}

function createTargetFilename(path, version) {
  let name = "unknown-file";
  if (path.match(/\/downloads\/file\/(\d+)\/?/)) {
    name = getSlug(path);
  }
  if (path.match(/\/downloads\/source\/(\d+)\/?/)) {
    let slug = getSlug(location.pathname);
    name = slug ? `${slug}-${version}-src.zip` : null;
  }
  return name || "unknown-file";
}

function prepareDownload() {
  let allCheckedCheckboxes = $("#arh_table input:checkbox:checked");
  let urls = [];
  allCheckedCheckboxes.each(function(index) {
    let path = $(this).next().prop("href");

    urls.push({
      downloadPath: path,
      filename: createTargetFilename(path, $(this).attr("value").replace(/sources-/, ""))
    });
  });
  return urls;
}
