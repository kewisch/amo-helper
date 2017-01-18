function onclickln(event) {
  let linelink = $(event.target);
  let filename = $(".file.selected").attr("data-short");
  let line = linelink.attr("data-linenumber");

  let copybox = $("<textarea/>");
  copybox.text(filename + " line " + line);
  $("body").append(copybox);
  copybox.select();
  document.execCommand("copy");
  copybox.remove();
  event.preventDefault();
  event.stopPropagation();
}

$("#file-viewer-inner").on("click", ".td-line-number a", onclickln);
