#!/usr/bin/env node
/**
 * Builds a single, self-contained HTML assessment for one country baseline, or for all of them.
 *
 *   node scripts/build.js                       -> dist/india/index.html   (default country)
 *   node scripts/build.js --country us          -> dist/us/index.html
 *   node scripts/build.js --country China       -> dist/china/index.html   (id, name or short name)
 *   node scripts/build.js --all                 -> dist/<id>/index.html for every baseline + dist/index.html chooser
 *   node scripts/build.js --country us --out x.html
 *   node scripts/build.js --check [--all]       -> validate only
 *   node scripts/build.js --list                -> list available baselines
 *
 * The country can also come from the COUNTRY environment variable or site.json "defaultCountry".
 * No dependencies: Node.js 16+ only.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT, ConfigError, readJson, readText } = require('./lib/config');
const { listBaselines, resolveId, loadBaseline, applyBaseline } = require('./lib/baseline');
const { validateSite, validatePillars, validateReferences } = require('./lib/validate');
const { renderPage, renderLanding } = require('./lib/render');

function parseArgs(argv) {
  const o = { all: false, check: false, list: false, country: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--all') o.all = true;
    else if (a === '--check') o.check = true;
    else if (a === '--list') o.list = true;
    else if (a === '--country' || a === '-c') o.country = argv[++i];
    else if (a.startsWith('--country=')) o.country = a.slice(10);
    else if (a === '--out') o.out = argv[++i];
    else if (a === '--help' || a === '-h') { console.log(readText('scripts/build.js').split('*/')[0]); process.exit(0); }
    else throw new ConfigError(`unknown option "${a}" (try --help)`);
  }
  return o;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const warnings = [];
  const warn = (m) => warnings.push(m);

  const site = readJson('config/site.json');
  const pillars = readJson('config/pillars.json');
  const references = readJson('config/references.json');
  const licenseText = readText('LICENSE');

  validateSite(site, warn);
  const pillarIds = validatePillars(pillars);
  validateReferences(references, pillarIds, warn);

  const def = site.defaultCountry || 'india';
  const available = listBaselines().sort((a, b) => (a === def ? -1 : b === def ? 1 : a.localeCompare(b)));
  if (opts.list) {
    available.forEach((id) => { const b = loadBaseline(id); console.log(`${id.padEnd(10)} ${b.name}  (${b.status || 'no status'})`); });
    return;
  }

  const wanted = opts.all ? available
    : [resolveId(opts.country || process.env.COUNTRY || site.defaultCountry || 'india')];
  if (opts.all && opts.out) throw new ConfigError('--out cannot be combined with --all');

  const built = new Date().toISOString().slice(0, 10);
  // Summary of every baseline, so each page can name the others.
  const catalogue = available.map((id) => {
    const r = applyBaseline(pillars, loadBaseline(id), () => {});
    return r.baseline;
  });

  const itemCount = pillars.reduce((s, p) => s + p.items.length, 0);
  const results = wanted.map((id) => {
    const { pillars: merged, baseline } = applyBaseline(pillars, loadBaseline(id), warn);
    const html = renderPage({ site, pillars: merged, baseline, references, licenseText, built, baselines: catalogue });
    const out = opts.out ? path.resolve(opts.out) : path.join(ROOT, 'dist', id, 'index.html');
    return { id, baseline, html, out };
  });

  [...new Set(warnings)].forEach((w) => console.warn(`⚠ ${w}`));
  console.log(`✔ config valid: ${pillars.length} pillars, ${itemCount} items, ${(references.preReads || []).length} pre-reads, ${(references.annexures || []).length} annexure(s), baselines: ${available.join(', ')}`);
  if (opts.check) return;

  results.forEach((r) => {
    fs.mkdirSync(path.dirname(r.out), { recursive: true });
    fs.writeFileSync(r.out, r.html);
    console.log(`✔ ${r.baseline.name.padEnd(14)} overall ${r.baseline.overall.toFixed(1)}  -> ${path.relative(process.cwd(), r.out)} (${(Buffer.byteLength(r.html) / 1024).toFixed(1)} KB)`);
  });

  if (opts.all) {
    const landing = path.join(ROOT, 'dist', 'index.html');
    fs.writeFileSync(landing, renderLanding({ site, entries: results.map((r) => r.baseline), built }));
    console.log(`✔ chooser page   -> ${path.relative(process.cwd(), landing)}`);
  }
}

try { main(); }
catch (e) {
  if (e instanceof ConfigError) { console.error(`✖ ${e.message}`); process.exit(1); }
  throw e;
}
