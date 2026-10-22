'use strict';
/**
 * The build manifest: which version of every configuration file went into a page.
 * It is embedded in the page (About tab, exports) and written next to it as manifest.json.
 */
const crypto = require('crypto');

const SEMVER = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

function checkVersion(label, v, warn) {
  if (!v) { warn(`${label}: no "version" set`); return; }
  if (!SEMVER.test(String(v))) warn(`${label}: version "${v}" is not in MAJOR.MINOR.PATCH form`);
}

/** Short, stable fingerprint of everything that determines the page's content. */
function fingerprint(obj) {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 12);
}

function makeManifest({ site, questions, baselineFile, references, built, inputs }) {
  return {
    app: { name: site.title, version: site.version || '' },
    questions: { version: questions.version || '', file: 'config/pillars.json', count: questions.count },
    baseline: { id: baselineFile.id, name: baselineFile.name, version: baselineFile.version || '', asOf: baselineFile.asOf || '', file: baselineFile._file },
    references: references.versions,
    built,
    fingerprint: fingerprint(inputs),
  };
}

module.exports = { checkVersion, makeManifest };
