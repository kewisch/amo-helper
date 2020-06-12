/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* exported debounce, replacePattern, waitForElement */

// https://davidwalsh.name/javascript-debounce-function
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    let later = () => {
      timeout = null;
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (!timeout) {
      func.apply(this, args);
    }
  };
}

function replacePattern(str, replacements) {
  return str.replace(/{([a-z]+)}/g, (match, key) => replacements[key] || "");
}

// I mainly need this for waiting for elements to appear in react. I'm not a fan of this code, but I
// haven't found out if there are any DOM events when the react app has finished rendering.
async function waitForElement(document, selector, timeout=0, max=Infinity) {
  for (;max > 0; max--) {
    let elem = document.querySelector(selector);
    if (elem) {
      return elem;
    }

    await new Promise(resolve => setTimeout(resolve, timeout));
  }

  return null;
}
