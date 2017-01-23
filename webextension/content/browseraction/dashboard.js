function parseQueueNumbers(doc) {
  let queues = [...doc.querySelectorAll("#editors-stats-charts .editor-stats-table .editor-waiting")];
  let countre = /::\s*(\d+) add-ons/;
  let numbers = {};

  for (let queueName of ["new", "updates"]) {
    let parent = queues.shift();

    numbers[queueName] = {
      low: parseInt(parent.querySelector(".waiting_new").getAttribute("title").match(countre)[1], 10),
      med: parseInt(parent.querySelector(".waiting_med").getAttribute("title").match(countre)[1], 10),
      high: parseInt(parent.querySelector(".waiting_old").getAttribute("title").match(countre)[1], 10),
      url: "https://addons.mozilla.org/en-US/editors/queue/" + queueName
    };
    numbers[queueName].total = numbers[queueName]["low"] + numbers[queueName]["med"] + numbers[queueName]["high"];
  }


  let reviewsQueue = doc.querySelector("#editors_main .listing-header a[href='/en-US/editors/queue/reviews']");
  let match = reviewsQueue.textContent.match(/\((\d+)\)/);
  if (match) {
    numbers.reviews = { low: 0, med: 0, high: 0, total: parseInt(match[1], 10) };
  }

  return numbers;
}


chrome.runtime.sendMessage({ action: "update-badge-numbers", numbers: parseQueueNumbers(document), totalonly: false });
