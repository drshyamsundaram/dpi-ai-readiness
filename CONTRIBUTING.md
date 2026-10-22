# Contributing

Thanks for helping improve the assessment.

## Ways to contribute

- **Update references:** fix a broken link or add a newer version in `config/references.json`, and update `asOf`.
- **Refine questions or anchors** in `config/pillars.json`. Explain the evidence behind any change to an India item score.
- **Add an annexure** by appending an object to `annexures` in `config/references.json`.
- **Improve the app** in `src/` (keep it dependency-free and single-file).

## Workflow

1. Fork the repository and create a branch: `git checkout -b feat/short-description`.
2. Make changes, then run `npm run check` and `npm run build`.
3. Open `dist/index.html` and check every tab in light and dark mode, and at phone width.
4. If you changed questions, bump `version` and `storageKey` in `config/site.json` and add an entry to `CHANGELOG.md`.
5. Open a pull request describing what changed and why.

## Principles

- No external scripts, fonts or trackers. The built file must work offline.
- No data leaves the browser.
- Baseline changes need cited evidence.
