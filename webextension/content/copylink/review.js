function condenseLines(value) {
  const regex = /([A-Za-z0-9_./]+) line ([0-9, ]+), ([A-Za-z0-9_./]+) line (\d+)/g;
  const regex2 = /([A-Za-z0-9_./]+) line ([0-9, ]+)/g;
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

function renumber(value) {
  let comment = 0;
  return value.replace(/^[0-9]+\) /mg, val => ++comment + ") ");
}

function changeComments(action) {
  let actionCanned = {
    "public": "Thank you for your contribution.\n\n",
    "reject": "This version didn't pass review because of the following problems:\n\n1) ",
    "info": "The following information is needed to complete your review:\n\n1) "
  };

  let commentValue = comments.value || "";
  let replaceValue = actionCanned[action] || "";
  let replaced = false;

  for (let existing of Object.values(actionCanned)) {
    commentValue = commentValue.replace(existing, () => {
      replaced = true;
      return replaceValue;
    });
  }

  if (!replaced) {
    commentValue = replaceValue + commentValue;
  }

  comments.value = commentValue;
}

let comments = document.getElementById("id_comments");
comments.addEventListener("paste", (event) => {
  setTimeout(() => {
    comments.value = renumber(condenseLines(comments.value));
  }, 0);
});

let actions = document.getElementById("id_action");
actions.addEventListener("click", (event) => {
  changeComments(event.target.value);
  comments.focus();
});
