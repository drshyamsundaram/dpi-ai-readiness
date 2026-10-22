# Changelog

## 1.2.0 (2026-10-22)

- References are now per country: `config/references/<id>.json`, with a shared `common.json`. Includes support `"<set>"`, `"<set>#core"` and `"<set>#annexures"`.
- New United States and China reference sets (official releases and established translations). Both include India's core DPI pre-reads, the DEPA annexure and the global set.
- References tab grouped by set, with a set filter; pre-reads renumbered per build.
- Versions on every config file (questions, baselines, reference sets) and a per-build `manifest.json` with an input fingerprint.
- About tab "Configuration versions" table; versions in the footer and in JSON exports; Group tab warns about question-version or country mismatches.
- Saved answers are keyed by country and question version.

## 1.1.1 (2026-10-22)

- README and in-app ReadMe tab: country baselines are suggestive and meant to be modified for each assessment; new guidance on adapting them (updating evidence, panel medians, narrower scope, target baselines, new countries).

## 1.1.0 (2026-10-22)

- Baselines split out of `pillars.json` into `config/baselines/<country>.json`.
- New baselines: United States and China (illustrative drafts), alongside India.
- Pillar and overall baselines are now factored from item scores at build time.
- Build takes a country: `--country <id|name|alias>`, the `COUNTRY` env var or `defaultCountry`; `--all` builds every country plus a chooser page; `--list` shows baselines.
- Build code split into modules: `scripts/lib/{config,baseline,validate,render}.js`.
- Country-aware wording, per-country saved answers, baseline evidence table and baseline catalogue on the ReadMe tab.

## 1.0.0 (2026-10-22)

- First release: 8 pillars, 40 anchored items, India baseline as of October 2026.
- Tabs: Start, Assess, Results, Group, ReadMe, Instructions, References, License, About.
- References tab built from `config/references.json`: 35 pre-reads plus Annexure A (latest iSPIRT DEPA posts).
- Single-file build with config validation, and a GitHub Actions workflow that publishes to Pages.
