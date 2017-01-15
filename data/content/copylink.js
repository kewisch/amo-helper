function onclickln(event) {
  let linelink = $(event.target);
  let filename = $(".file.selected").attr("data-short");
  let line = linelink.attr("data-linenumber");

  let copybox = $("<textarea/>");
  copybox.text(filename + " line " + line);
  $("body").append(copybox);
  copybox.select();
  pagedoc.execCommand("copy");
  copybox.remove();
  event.preventDefault();
  event.stopPropagation();
}

var $ = unsafeWindow.$;
var pagedoc = unsafeWindow.document;
$(pagedoc).on("click", ".td-line-number a", onclickln);
