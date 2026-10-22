# Changelog

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
