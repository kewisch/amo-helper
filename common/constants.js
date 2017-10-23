/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2017 */

/* exported REVIEW_URL, ADMIN_URL, LISTING_URL, MANAGE_URL, FEED_URL,
 * REVIEW_RE, QUEUE_RE, ADDON_LINKS_RE, FILEBROWSER_RE, USER_RE,
 * REVIEW_PATTERNS, FILEBROWSER_PATTERNS, LISTING_PATTERNS,
 * DEVELOPER_PAGE_PATTERNS, USER_PAGE_PATTERNS, AMO_HOSTS, AMO_EDITORS_PATTERNS
 * AMO_PRIVACY_PAGES, AMO_EULA_PAGES, AMO_QUEUE_PATTERNS, AMO_REVIEW_PATTERNS,
 * ADDON_LINK_PATTERNS */

const REVIEW_URL = "https://reviewers.{instance}/editors/review/{addon}";
const ADMIN_URL = "https://{instance}/admin/addon/manage/{addon}";
const LISTING_URL = "https://{instance}/addon/{addon}";
const MANAGE_URL = "https://{instance}/developers/addon/{addon}/edit";
const FEED_URL = "https://{instance}/developers/feed/{addon}";

const REVIEW_RE = /https:\/\/reviewers\.(addons\.mozilla|addons\.allizom|addons-dev\.allizom)\.org\/([^/]+)\/editors\/review(|-listed|-unlisted)\/(.*)/;
const QUEUE_RE = /https:\/\/reviewers\.(addons\.mozilla|addons\.allizom|addons-dev\.allizom)\.org\/([^/]+)\/editors\/queue\/(.*)/;
const ADDON_LINKS_RE = /https:\/\/(?:reviewers\.)?(addons\.mozilla|addons\.allizom|addons-dev\.allizom)\.org\/([^/]*)\/(editors\/review(|-listed|-unlisted)|admin\/addon\/manage|[^/]*\/addon|developers\/feed)\/([^/#?]*)(\/edit)?/;
const FILEBROWSER_RE = /https:\/\/reviewers\.(addons\.mozilla|addons\.allizom|addons-dev\.allizom)\.org\/([^/]+)\/firefox\/files\/(compare|browse)\/\d+(...\d+)?\/file\/([^#]*)/;
const USER_RE = /https:\/\/(addons\.mozilla|addons\.allizom|addons-dev\.allizom)\.org\/([^/]+)\/firefox\/user\/([^#/]*)/;

const REVIEW_PATTERNS = [
  "https://reviewers.addons.mozilla.org/*/editors/review/{addon}",
  "https://reviewers.addons.allizom.org/*/editors/review/{addon}",
  "https://reviewers.addons-dev.allizom.org/*/editors/review/{addon}"
];

const FILEBROWSER_PATTERNS = [
  "https://reviewers.addons.mozilla.org/*/firefox/files/browse/*",
  "https://reviewers.addons.mozilla.org/*/firefox/files/compare/*",
  "https://reviewers.addons.allizom.org/*/firefox/files/browse/*",
  "https://reviewers.addons.allizom.org/*/firefox/files/compare/*",
  "https://reviewers.addons-dev.allizom.org/*/firefox/files/browse/*",
  "https://reviewers.addons-dev.allizom.org/*/firefox/files/compare/*"
];

// Also happens to cover privacy and eula pages
const LISTING_PATTERNS = [
  "https://addons.mozilla.org/*/firefox/addon/*",
  "https://addons.allizom.org/*/firefox/addon/*",
  "https://addons-dev.allizom.org/*/firefox/addon/*"
];

const DEVELOPER_PAGE_PATTERNS = [
  "https://addons.mozilla.org/*/developers/addon/*",
  "https://addons.allizom.org/*/developers/addon/*",
  "https://addons-dev.allizom.org/*/developers/addon/*"
];

const USER_PAGE_PATTERNS = [
  "https://addons.mozilla.org/*/firefox/user/*",
  "https://addons.allizom.org/*/firefox/user/*",
  "https://addons-dev.allizom.org/*/firefox/user/*"
];

const AMO_HOSTS = [
  "addons.mozilla.org",
  "addons.allizom.org",
  "addons-dev.allizom.org",

  "reviewers.addons.mozilla.org",
  "reviewers.addons.allizom.org",
  "reviewers.addons-dev.allizom.org"
];

const AMO_EDITORS_PATTERNS = [
  "https://reviewers.addons.mozilla.org/*/editors/*",
  "https://reviewers.addons.allizom.org/*/editors/*",
  "https://reviewers.addons-dev.allizom.org/*/editors/*"
];

const AMO_PRIVACY_PAGES = [
  "https://addons.mozilla.org/*/firefox/addon/*/privacy",
  "https://addons.allizom.org/*/firefox/addon/*/privacy",
  "https://addons-dev.allizom.org/*/firefox/addon/*/privacy"
];

const AMO_EULA_PAGES = [
  "https://addons.mozilla.org/*/firefox/addon/*/eula",
  "https://addons.allizom.org/*/firefox/addon/*/eula",
  "https://addons-dev.allizom.org/*/firefox/addon/*/eula"
];

const AMO_QUEUE_PATTERNS = [
  "https://reviewers.addons.mozilla.org/*/editors/queue/*",
  "https://reviewers.addons.allizom.org/*/editors/queue/*",
  "https://reviewers.addons-dev.allizom.org/*/editors/queue/*"
];

const AMO_REVIEW_PATTERNS = [
  "https://reviewers.addons.mozilla.org/*/editors/review/{slug}",
  "https://reviewers.addons.allizom.org/*/editors/review/{slug}",
  "https://reviewers.addons-dev.allizom.org/*/editors/review/{slug}"
];

const ADDON_LINK_PATTERNS = [
  "https://reviewers.addons.mozilla.org/*/editors/review/*",
  "https://reviewers.addons.mozilla.org/*/editors/review-listed/*",
  "https://reviewers.addons.mozilla.org/*/editors/review-unlisted/*",
  "https://addons.mozilla.org/*/admin/manage/*",
  "https://addons.mozilla.org/*/*/addon/*", /* catches listing and manage url */
  "https://addons.mozilla.org/*/developers/feed/*",

  "https://reviewers.addons.allizom.org/*/editors/review/*",
  "https://reviewers.addons.allizom.org/*/editors/review-listed/*",
  "https://reviewers.addons.allizom.org/*/editors/review-unlisted/*",
  "https://addons.allizom.org/*/admin/manage/*",
  "https://addons.allizom.org/*/*/addon/*", /* catches listing and manage url */
  "https://addons.allizom.org/*/developers/feed/*",

  "https://reviewers.addons-dev.allizom.org/*/editors/review/*",
  "https://reviewers.addons-dev.allizom.org/*/editors/review-listed/*",
  "https://reviewers.addons-dev.allizom.org/*/editors/review-unlisted/*",
  "https://addons-dev.allizom.org/*/admin/manage/*",
  "https://addons-dev.allizom.org/*/*/addon/*", /* catches listing and manage url */
  "https://addons-dev.allizom.org/*/developers/feed/*",
];
