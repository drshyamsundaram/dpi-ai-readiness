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
 *   node scripts/build.js --list                -> list baselines with their baseline and reference versions
 *
 * The country can also come from the COUNTRY environment variable or site.json "defaultCountry".
 * No dependencies: Node.js 16+ only.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT, ConfigError, readJson, readText } = require('./lib/config');
const { listBaselines, resolveId, loadBaseline, applyBaseline } = require('./lib/baseline');
const { validateSite, validatePillars } = require('./lib/validate');
const { buildReferences } = require('./lib/references');
const { checkVersion, makeManifest } = require('./lib/manifest');
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
  const qcfg = readJson('config/pillars.json');
  const pillars = Array.isArray(qcfg) ? qcfg : qcfg.pillars;
  const questions = { version: Array.isArray(qcfg) ? '' : qcfg.version, count: 0 };
  const licenseText = readText('LICENSE');

  validateSite(site, warn);
  const pillarIds = validatePillars(pillars);
  questions.count = pillars.reduce((s, p) => s + p.items.length, 0);
  checkVersion('site.json', site.version, warn);
  checkVersion('pillars.json', questions.version, warn);

  const def = site.defaultCountry || 'india';
  const available = listBaselines().sort((a, b) => (a === def ? -1 : b === def ? 1 : a.localeCompare(b)));
  if (opts.list) {
    available.forEach((id) => {
      const b = loadBaseline(id);
      const refs = buildReferences(b.references || id, pillarIds, () => {});
      console.log(`${id.padEnd(8)} ${b.name.padEnd(15)} baseline v${b.version || '?'}  references ${refs.versions.map((v) => `${v.id} v${v.version || '?'}`).join(', ')}  (${b.status || 'no status'})`);
    });
    return;
  }

  const wanted = opts.all ? available
    : [resolveId(opts.country || process.env.COUNTRY || site.defaultCountry || 'india')];
  if (opts.all && opts.out) throw new ConfigError('--out cannot be combined with --all');

  const built = new Date().toISOString().slice(0, 10);
  // Summary of every baseline, so each page can name the others.
  const catalogue = available.map((id) => {
    const bf = loadBaseline(id);
    const r = applyBaseline(pillars, bf, () => {});
    return { ...r.baseline, version: bf.version || '' };
  });

  const results = (opts.check ? available : wanted).map((id) => {
    const baselineFile = loadBaseline(id);
    checkVersion(baselineFile._file, baselineFile.version, warn);
    const { pillars: merged, baseline } = applyBaseline(pillars, baselineFile, warn);
    baseline.version = baselineFile.version || '';
    const refSetId = baselineFile.references || id;
    let references;
    try { references = buildReferences(refSetId, pillarIds, warn); }
    catch (e) {
      if (e instanceof ConfigError && /not found/.test(e.message) && refSetId !== 'common') {
        warn(`${baselineFile._file}: ${e.message}; using "common" only`);
        references = buildReferences('common', pillarIds, warn);
      } else throw e;
    }
    references.versions.forEach((v) => checkVersion(v.file, v.version, warn));
    const manifest = makeManifest({
      site, questions, baselineFile, references, built,
      inputs: { site, qcfg, baselineFile, references, licenseText, app: readText('src/app.js'), css: readText('src/styles.css'), tpl: readText('src/template.html') },
    });
    const html = renderPage({ site, pillars: merged, baseline, references, licenseText, built, baselines: catalogue, manifest, questions });
    const out = opts.out ? path.resolve(opts.out) : path.join(ROOT, 'dist', id, 'index.html');
    return { id, baseline, references, manifest, html, out };
  });

  [...new Set(warnings)].forEach((w) => console.warn(`⚠ ${w}`));
  console.log(`✔ config valid: questions v${questions.version || '?'} (${pillars.length} pillars, ${questions.count} items), baselines: ${available.join(', ')}`);
  if (opts.check) {
    results.forEach((r) => console.log(`  ${r.baseline.name.padEnd(14)} baseline v${r.baseline.version || '?'} · ${r.references.preReads.length} pre-reads, ${r.references.annexures.length} annexure(s) · refs ${r.references.versions.map((v) => `${v.id} v${v.version}`).join(', ')}`));
    return;
  }

  results.forEach((r) => {
    fs.mkdirSync(path.dirname(r.out), { recursive: true });
    fs.writeFileSync(r.out, r.html);
    const mf = opts.out ? r.out.replace(/\.html?$/i, '') + '.manifest.json' : path.join(path.dirname(r.out), 'manifest.json');
    fs.writeFileSync(mf, JSON.stringify(r.manifest, null, 2) + '\n');
    console.log(`✔ ${r.baseline.name.padEnd(14)} overall ${r.baseline.overall.toFixed(1)} · baseline v${r.baseline.version || '?'} · ${String(r.references.preReads.length).padStart(2)} refs (${r.references.versions.map((v) => `${v.id} v${v.version}`).join(', ')}) · ${r.manifest.fingerprint}`);
    console.log(`    -> ${path.relative(process.cwd(), r.out)} (${(Buffer.byteLength(r.html) / 1024).toFixed(1)} KB) + ${path.relative(process.cwd(), mf)}`);
  });

  if (opts.all) {
    const landing = path.join(ROOT, 'dist', 'index.html');
    fs.writeFileSync(landing, renderLanding({ site, entries: results.map((r) => ({ ...r.baseline, manifest: r.manifest, refCount: r.references.preReads.length })), built }));
    fs.writeFileSync(path.join(ROOT, 'dist', 'manifest.json'), JSON.stringify({ built, app: site.version, questions: questions.version, builds: results.map((r) => ({ id: r.id, path: `${r.id}/index.html`, ...r.manifest })) }, null, 2) + '\n');
    console.log(`✔ chooser page   -> ${path.relative(process.cwd(), landing)} + dist/manifest.json`);
  }
}

try { main(); }
catch (e) {
  if (e instanceof ConfigError) { console.error(`✖ ${e.message}`); process.exit(1); }
  throw e;
}
