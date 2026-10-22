'use strict';
/**
 * Country-specific reference sets.
 *
 *   config/references/<id>.json
 *   {
 *     "id": "us", "version": "1.0.0", "asOf": "22 October 2026",
 *     "title": "United States: ...", "description": "...",
 *     "include": ["india#core", "common"],      // other sets to append, in order
 *     "includeTitles": { "india#core": "..." }, // optional section titles for includes
 *     "preReads": [ { "id": "...", "star": true, "title": "...", "links": [...], "source": "...", "pillars": ["P1"], "why": "..." } ],
 *     "annexures": [ ... ]
 *   }
 *
 * Include syntax:  "<set>"        every pre-read in that set (and its annexures)
 *                  "<set>#core"   only its starred (core) pre-reads, no annexures
 *                  "<set>#annexures"  only its annexures
 * Includes are resolved one level deep per set, recursively, with cycle protection.
 * Pre-reads are numbered 1..N in the order they appear in the built page.
 */
const { ConfigError, readJson, exists } = require('./config');

const DIR = 'config/references';
const isUrl = (u) => /^https?:\/\//.test(u || '');

function loadSet(id) {
  const rel = `${DIR}/${id}.json`;
  if (!exists(rel)) throw new ConfigError(`reference set "${id}" not found (expected ${rel})`);
  const s = readJson(rel);
  s.id = s.id || id;
  s._file = rel;
  return s;
}

function validateSet(s, pillarIds, warn) {
  if (!s.title) throw new ConfigError(`${s._file}: "title" is required`);
  if (!s.version) warn(`${s._file}: no "version"`);
  const seen = new Set();
  (s.preReads || []).forEach((r, i) => {
    const where = `${s._file} preReads[${i}]`;
    if (!r.title) throw new ConfigError(`${where}: "title" is required`);
    if (r.id) { if (seen.has(r.id)) throw new ConfigError(`${where}: duplicate id "${r.id}"`); seen.add(r.id); }
    (r.links || []).forEach((l) => { if (!isUrl(l.url)) throw new ConfigError(`${where}: bad url "${l.url}"`); });
    (r.pillars || []).forEach((p) => { if (p !== 'All' && !pillarIds.has(p)) warn(`${where}: unknown pillar "${p}"`); });
  });
  (s.annexures || []).forEach((a) => (a.items || []).forEach((it) => {
    if (!isUrl(it.url)) throw new ConfigError(`${s._file} annexure ${a.id}: bad url "${it.url}"`);
  }));
}

/**
 * Resolves a reference set and its includes into page-ready sections.
 * Returns { id, title, asOf, note, sections:[{id,title,description,version,items}], annexures, preReads, versions }
 */
function buildReferences(rootId, pillarIds, warn) {
  const sections = [];
  const annexures = [];
  const versions = [];
  const seenItems = new Set();
  const visited = new Set();

  function addSet(spec, titleOverride, depth) {
    const [id, filter] = String(spec).split('#');
    const key = `${id}#${filter || ''}`;
    if (visited.has(key)) return;
    visited.add(key);
    if (depth > 4) throw new ConfigError(`reference includes nest too deeply at "${spec}"`);
    const s = loadSet(id);
    validateSet(s, pillarIds, warn);
    if (!versions.find((v) => v.id === s.id)) versions.push({ id: s.id, version: s.version || '', asOf: s.asOf || '', file: s._file });

    let items = s.preReads || [];
    if (filter === 'core') items = items.filter((r) => r.star);
    else if (filter === 'annexures') items = [];
    else if (filter) throw new ConfigError(`unknown include filter "#${filter}" in "${spec}" (use #core or #annexures)`);
    items = items.filter((r) => {
      const k = r.id || r.title;
      if (seenItems.has(k)) return false;
      seenItems.add(k);
      return true;
    });
    if (items.length) {
      sections.push({
        id: filter ? `${s.id}-${filter}` : s.id,
        title: titleOverride || s.title,
        description: filter === 'core' ? `The starred core pre-reads from "${s.title}".` : (s.description || ''),
        version: s.version || '',
        items,
      });
    }
    if (!filter || filter === 'annexures') (s.annexures || []).forEach((a) => { if (!annexures.find((x) => x.title === a.title)) annexures.push({ ...a, set: s.id }); });
    // Includes of this set come after its own items.
    if (!filter) (s.include || []).forEach((inc) => addSet(inc, (s.includeTitles || {})[inc], depth + 1));
  }

  const root = loadSet(rootId);
  addSet(rootId, null, 0);

  // Number pre-reads 1..N across sections, in page order.
  let n = 0;
  const preReads = [];
  sections.forEach((sec) => {
    sec.items = sec.items.map((r) => {
      const item = { ...r, n: ++n, section: sec.id };
      preReads.push(item);
      return item;
    });
  });

  // Letter annexures A, B, C... in order.
  annexures.forEach((a, i) => { a.id = String.fromCharCode(65 + i); });

  return {
    id: root.id,
    title: root.title,
    asOf: root.asOf || '',
    note: root.note || 'Links point to official, publisher or established translation pages. Policies change often; check for the latest versions before circulating.',
    sections, annexures, preReads, versions,
  };
}

function listSets() {
  const { list } = require('./config');
  return list(DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort();
}

module.exports = { buildReferences, listSets };
