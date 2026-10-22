# Contributing

Thanks for helping improve the assessment.

## Ways to contribute

- **Update references:** fix a broken link or add a newer source in `config/references/<country>.json` (or `common.json` for cross-country sources); update `asOf` and bump that file's `version`.
- **Refine questions or anchors** in `config/pillars.json`. Explain the evidence behind any change to an India item score.
- **Add an annexure** by appending an object to `annexures` in the relevant reference set.
- **Change a baseline** in `config/baselines/<country>.json`, and bump its `version`.
- **Improve the app** in `src/` (keep it dependency-free and single-file).

## Workflow

1. Fork the repository and create a branch: `git checkout -b feat/short-description`.
2. Make changes, then run `npm run check` and `npm run build`.
3. Run `npm run build:all`, open `dist/index.html` and each country page, and check every tab in light and dark mode, and at phone width.
4. Bump the `version` of every config file you changed (see "Configuration versions" in the README) and add an entry to `CHANGELOG.md`. Check `dist/<id>/manifest.json` shows the new versions.
5. Open a pull request describing what changed and why.

## Principles

- No external scripts, fonts or trackers. The built file must work offline.
- No data leaves the browser.
- Baseline changes need cited evidence.
