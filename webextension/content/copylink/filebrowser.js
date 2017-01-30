function onclickln(event) {
  let linelink = $(event.target);
  let filename = $(".file.selected").attr("data-short");
  let line = linelink.attr("data-linenumber");

  let text = filename + " line " + line;
  if (event.metaKey) {
    text = last_copy_data + ", " + text;
  }
  last_copy_data = text;

  let copybox = $("<textarea/>");
  copybox.text(text);
  $("body").append(copybox);
  copybox.select();
  document.execCommand("copy");
  copybox.remove();
  event.preventDefault();
  event.stopPropagation();
}

var last_copy_data = "";
$("#file-viewer-inner").on("click", ".td-line-number a", onclickln);
