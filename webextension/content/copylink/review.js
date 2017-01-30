function condenseLines(value) {
  const regex = /([A-Za-z0-9_\.\/]+) line ([0-9, ]+), ([A-Za-z0-9_\.\/]+) line (\d+)/g;
  const regex2 = /([A-Za-z0-9_\.\/]+) line ([0-9, ]+)/g;
  let replaced;

  do {
    replaced = false;
    value = value.replace(regex, (match, file1, line1, file2, line2, ...extra) => {
      console.log(` replaced ${file1} ${line1} / ${file2} ${line2} / ${extra}`);
      if (file2 && file1 != file2) {
        return match;
      }
      let lines = new Set(line1.split(/,\s*/));
      if (file2) {
        lines.add(line2.trim());
      }
      replaced = true;

      return `${file1} line ${[...lines].join(", ")}`;
    });
  } while (replaced);

  // no idea how to get this into the first regex
  value = value.replace(regex2, (match, file, lines) => {
    let lineset = new Set(lines.split(/,\s*/));
    return `${file} line ${[...lineset].join(", ")}`;
  });

  return value;
}

let comments = document.getElementById("id_comments");
comments.addEventListener("paste", (event) => {
  setTimeout(() => {
    comments.value = condenseLines(comments.value);
  }, 0);
});
