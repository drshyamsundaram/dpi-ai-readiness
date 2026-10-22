'use strict';
/** Assembles the single-file page and the multi-country landing page. */
const { readText } = require('./config');

const escAttr = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const escHtml = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// JSON safe to embed inside <script>
const safeJson = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

/** Replaces {{COUNTRY}}, {{COUNTRY_POSS}} and {{COUNTRY_SHORT}} in text. */
function countryText(text, b) {
  return String(text || '')
    .replace(/\{\{COUNTRY_POSS\}\}/g, b.possessive)
    .replace(/\{\{COUNTRY_SHORT\}\}/g, b.short)
    .replace(/\{\{COUNTRY\}\}/g, b.name);
}

function deepCountry(obj, b) {
  if (typeof obj === 'string') return countryText(obj, b);
  if (Array.isArray(obj)) return obj.map((v) => deepCountry(v, b));
  if (obj && typeof obj === 'object') { const o = {}; Object.keys(obj).forEach((k) => { o[k] = deepCountry(obj[k], b); }); return o; }
  return obj;
}

function renderPage({ site, pillars, baseline, references, licenseText, built, baselines }) {
  const s = deepCountry(site, baseline);
  s.storageKey = `${site.storageKey || 'ai-readiness-assessment-v1'}-${baseline.id}`;
  const config = { site: s, pillars, baseline, baselines, references, licenseText, built };
  const replacements = {
    TITLE: escAttr(`${s.title} · ${baseline.short} baseline`),
    DESCRIPTION: escAttr(s.description),
    AUTHOR: escAttr((s.author || {}).name),
    VERSION: escAttr(s.version),
    BUILT: built,
    STYLES: readText('src/styles.css'),
    README: countryText(readText('content/readme.html'), baseline),
    INSTRUCTIONS: countryText(readText('content/instructions.html'), baseline),
    CONFIG: safeJson(config),
    SCRIPT: readText('src/app.js'),
  };
  const template = countryText(readText('src/template.html'), baseline);
  // Single pass so content containing {{...}} is never re-expanded.
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in replacements ? replacements[k] : m));
}

function renderLanding({ site, entries, built }) {
  const css = readText('src/styles.css');
  const cards = entries.map((e) => `
      <a class="card pad land" href="${escAttr(e.id)}/index.html">
        <div class="tiny" style="text-transform:uppercase;letter-spacing:.08em;font-weight:700">Baseline</div>
        <h2>${escHtml(e.name)}</h2>
        <div class="val">${e.overall.toFixed(1)}<span class="small muted"> / 5</span></div>
        <p class="small muted">${escHtml(e.summary)}</p>
        <p class="tiny">${escHtml(e.status)} · as of ${escHtml(e.asOf)}</p>
      </a>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHtml(site.title)}: choose a baseline</title>
<style>${css}
.land{display:block;text-decoration:none;color:var(--text)} .land:hover{border-color:var(--accent)} .land .val{font-size:30px;font-weight:700;margin:6px 0}
</style></head>
<body><main class="wrap" style="padding-top:48px">
<h1>${escHtml(site.title)}</h1>
<p class="lead">Choose the country baseline to compare your answers against. Each version has the same 40 questions; only the reference scores differ. Baselines are suggestive starting points and can be adjusted for your assessment.</p>
<div class="grid g3">${cards}</div>
<p class="tiny" style="margin-top:24px">Built ${escHtml(built)} · v${escHtml(site.version)} · ${escHtml((site.license || {}).name || 'MIT')} License</p>
</main></body></html>`;
}

module.exports = { renderPage, renderLanding };
