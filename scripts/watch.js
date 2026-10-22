#!/usr/bin/env node
// Rebuilds dist/index.html whenever a file in config/, content/, src/ or LICENSE changes.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const build = () => {
  try { execFileSync(process.execPath, [path.join(__dirname, 'build.js'), ...process.argv.slice(2)], { stdio: 'inherit' }); }
  catch (e) { /* build already printed the error */ }
};
let timer;
const schedule = () => { clearTimeout(timer); timer = setTimeout(build, 150); };

build();
['config', 'config/baselines', 'content', 'src'].forEach((d) => fs.watch(path.join(ROOT, d), schedule));
fs.watch(path.join(ROOT, 'LICENSE'), schedule);
console.log('Watching config/, content/, src/ and LICENSE ... (Ctrl+C to stop)');
