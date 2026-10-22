'use strict';
/** Structural checks for site, questions and references. Throws ConfigError; pushes soft issues to warn(). */
const { ConfigError } = require('./config');

const isUrl = (u) => /^https?:\/\//.test(u || '');

function validateSite(site, warn) {
  if (!site.title) throw new ConfigError('site.json: "title" is required');
  if (!Array.isArray(site.bands) || !site.bands.length) throw new ConfigError('site.json: "bands" must be a non-empty array');
  const a = site.author || {};
  if (/REPLACE-WITH/i.test(a.linkedin || '') || /REPLACE-WITH/i.test(a.github || '')) warn('site.json: author.linkedin / author.github are still placeholders');
}

function validatePillars(pillars) {
  if (!Array.isArray(pillars) || !pillars.length) throw new ConfigError('pillars.json: must be a non-empty array');
  const ids = new Set();
  pillars.forEach((p, i) => {
    const where = `pillars.json[${i}] (${p.id || '?'})`;
    ['id', 'name', 'tests'].forEach((k) => { if (!p[k]) throw new ConfigError(`${where}: "${k}" is required`); });
    if (ids.has(p.id)) throw new ConfigError(`${where}: duplicate id`);
    ids.add(p.id);
    if (!Array.isArray(p.items) || !p.items.length) throw new ConfigError(`${where}: "items" must be a non-empty array`);
    p.items.forEach((it, j) => {
      ['q', 'a1', 'a3', 'a5'].forEach((k) => { if (!it[k]) throw new ConfigError(`${where} item ${j + 1}: "${k}" is required`); });
      if ('india' in it || 'base' in it) throw new ConfigError(`${where} item ${j + 1}: scores belong in config/baselines/*.json, not pillars.json`);
    });
  });
  return ids;
}

function validateReferences(references, pillarIds, warn) {
  (references.preReads || []).forEach((r, i) => {
    if (!r.title) throw new ConfigError(`references.json preReads[${i}]: "title" is required`);
    (r.links || []).forEach((l) => { if (!isUrl(l.url)) throw new ConfigError(`references.json preReads[${i}]: bad url "${l.url}"`); });
    (r.pillars || []).forEach((p) => { if (p !== 'All' && !pillarIds.has(p)) warn(`pre-read ${r.n}: unknown pillar "${p}"`); });
  });
  (references.annexures || []).forEach((a) => (a.items || []).forEach((it) => {
    if (!isUrl(it.url)) throw new ConfigError(`annexure ${a.id}: bad url "${it.url}"`);
  }));
}

module.exports = { validateSite, validatePillars, validateReferences };
