'use strict';
/**
 * Baselines are per-country score sets kept apart from the questions.
 *
 *   config/baselines/<id>.json
 *   {
 *     "id": "india", "name": "India", "asOf": "October 2026", "status": "...",
 *     "defaultSpread": 0.4,                    // half-width of the plausible range
 *     "pillars": {
 *       "P1": { "items": [5,5,5,4,4],          // one 1–5 score per question, in order
 *               "lo": 4.3, "hi": 4.8,          // optional; else base ± spread
 *               "spread": 0.3,                 // optional per-pillar override
 *               "confidence": "High", "evidence": "...", "assumption": "..." }
 *     }
 *   }
 *
 * The pillar baseline is FACTORED from the item scores (their mean), so the two can never disagree.
 */
const { ConfigError, readJson, list } = require('./config');

const DIR = 'config/baselines';
const round1 = (v) => Math.round(v * 10) / 10;
const clamp = (v) => Math.min(5, Math.max(1, v));

/** Ids of every baseline file, e.g. ['china', 'india', 'us']. */
function listBaselines() {
  return list(DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort();
}

/** Accepts an id, a country name or a short name, case-insensitively. */
function resolveId(input) {
  const ids = listBaselines();
  if (!ids.length) throw new ConfigError(`no baselines found in ${DIR}/`);
  const want = String(input || '').trim().toLowerCase();
  if (ids.includes(want)) return want;
  for (const id of ids) {
    const b = readJson(`${DIR}/${id}.json`);
    const names = [b.id, b.name, b.short, ...(b.aliases || [])].filter(Boolean).map((s) => String(s).toLowerCase());
    if (names.includes(want)) return id;
  }
  throw new ConfigError(`unknown country "${input}". Available: ${ids.join(', ')}`);
}

function loadBaseline(id) {
  const rel = `${DIR}/${id}.json`;
  const b = readJson(rel);
  if (!b.name) throw new ConfigError(`${rel}: "name" is required`);
  if (!b.pillars || typeof b.pillars !== 'object') throw new ConfigError(`${rel}: "pillars" object is required`);
  b.id = b.id || id;
  b._file = rel;
  return b;
}

/**
 * Merges a baseline onto the question set. Returns new pillar objects that carry
 * base/lo/hi and per-item `base`, plus a summary for the page.
 */
function applyBaseline(pillars, b, warn) {
  const rel = b._file;
  const ids = new Set(pillars.map((p) => p.id));
  Object.keys(b.pillars).forEach((k) => { if (!ids.has(k)) warn(`${rel}: pillar "${k}" is not in pillars.json and was ignored`); });

  const merged = pillars.map((p) => {
    const bp = b.pillars[p.id];
    if (!bp) throw new ConfigError(`${rel}: no scores for pillar ${p.id}`);
    if (!Array.isArray(bp.items) || bp.items.length !== p.items.length) {
      throw new ConfigError(`${rel}: ${p.id} needs ${p.items.length} item scores, found ${Array.isArray(bp.items) ? bp.items.length : 0}`);
    }
    bp.items.forEach((s, j) => {
      if (![1, 2, 3, 4, 5].includes(s)) throw new ConfigError(`${rel}: ${p.id} item ${j + 1} score must be an integer 1–5 (got ${JSON.stringify(s)})`);
    });
    const base = round1(bp.items.reduce((s, v) => s + v, 0) / bp.items.length);
    const spread = typeof bp.spread === 'number' ? bp.spread : (typeof b.defaultSpread === 'number' ? b.defaultSpread : 0.4);
    const lo = typeof bp.lo === 'number' ? bp.lo : round1(clamp(base - spread));
    const hi = typeof bp.hi === 'number' ? bp.hi : round1(clamp(base + spread));
    if (!(lo <= base && base <= hi)) throw new ConfigError(`${rel}: ${p.id} range ${lo}–${hi} must contain the factored baseline ${base}`);
    return {
      ...p,
      base, lo, hi,
      confidence: bp.confidence || '',
      evidence: bp.evidence || '',
      assumption: bp.assumption || '',
      items: p.items.map((it, j) => ({ ...it, base: bp.items[j] })),
    };
  });

  const overall = round1(merged.reduce((s, p) => s + p.base, 0) / merged.length);
  const meta = {
    id: b.id, name: b.name, short: b.short || b.name,
    possessive: b.possessive || `${b.name}'s`,
    inSentence: b.inSentence || b.short || b.name,
    asOf: b.asOf || '', status: b.status || '', summary: b.summary || '', method: b.method || '',
    overall,
  };
  return { pillars: merged, baseline: meta };
}

module.exports = { listBaselines, resolveId, loadBaseline, applyBaseline };
