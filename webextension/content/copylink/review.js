function condenseLines(value) {
  const regex = /([A-Za-z0-9_\.\/]+) line ([0-9, ]+), ([A-Za-z0-9_\.\/]+) line (\d+)/g;
  return value.replace(regex, (match, file1, line1, file2, line2) => {
    if (file1 != file2) {
      return match;
    }
    let lines = new Set(line1.split(/,\s*/));
    lines.add(line2.trim());

    return `${file1} line ${[...lines].join(", ")}`;
  });
}

let comments = document.getElementById("id_comments");
comments.addEventListener("paste", (event) => {
  setTimeout(() => {
    comments.value = condenseLines(comments.value);
  }, 0);
});
