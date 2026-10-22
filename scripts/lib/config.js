'use strict';
/** Reading files and JSON with errors that point at the broken line. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

class ConfigError extends Error {}

const readText = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^﻿/, '');

function readJson(rel) {
  const text = readText(rel);
  try { return JSON.parse(text); }
  catch (e) {
    let line = null, col = null;
    const lc = /line (\d+) column (\d+)/.exec(e.message);
    if (lc) { line = +lc[1]; col = +lc[2]; }
    else {
      const pos = /position (\d+)/.exec(e.message);
      if (pos) { const before = text.slice(0, +pos[1]).split(/\r?\n/); line = before.length; col = before[before.length - 1].length + 1; }
    }
    let detail = '';
    if (line) {
      const lines = text.split(/\r?\n/);
      for (let i = Math.max(1, line - 2); i <= line; i++) detail += `\n  ${String(i).padStart(4)} | ${lines[i - 1]}`;
      detail += `\n       | ${' '.repeat(Math.max(0, col - 1))}^`;
    }
    const hint = /property name|Unexpected token [}\]]/.test(e.message)
      ? '\n  Hint: usually a trailing comma after the last item before } or ], or a missing quote around a key.'
      : /Unexpected token|Bad control|Unterminated/.test(e.message)
        ? '\n  Hint: check for a missing comma, a missing closing quote, or smart quotes (“ ”) instead of straight quotes (").'
        : '';
    throw new ConfigError(`${rel}: invalid JSON (${e.message})${detail}${hint}`);
  }
}

const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const list = (rel) => (exists(rel) ? fs.readdirSync(path.join(ROOT, rel)) : []);

module.exports = { ROOT, ConfigError, readText, readJson, exists, list };
