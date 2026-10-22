# National AI-Readiness Assessment

A config-driven generator for a **single, self-contained HTML** self-assessment of national AI readiness, benchmarked on India's digital public infrastructure (DPI) journey. You choose the **country baseline** (India, United States or China, or add your own) at build time.

Built for the session **"Preparing a country for AI scale"**, which explores digital public infrastructure, trusted data ecosystems, identity and consent frameworks, compute, talent, regulatory readiness and the public-private collaboration an AI-ready nation needs.

> The generated page runs entirely in the browser. It needs no server and has no external dependencies, and it never sends data anywhere.

> [!IMPORTANT]
> **The country baselines are suggestive, not definitive.** The India, United States and China scores are starting points for discussion, not official or authoritative ratings. Change them to suit the assessment you are running; see [Country baselines are suggestive](#country-baselines-are-suggestive).

---

## Features

| Tab | What it does |
| --- | --- |
| **Start** | Respondent profile, how to answer, overview of the eight pillars, reset |
| **Assess** | 40 items with written anchors (1 / 3 / 5), 2 and 4 in between, a DK option, an evidence box per item, and an optional India-baseline overlay |
| **Results** | Overall score, readiness band, binding constraint, evidence coverage, radar chart against India, pillar gaps, largest item gaps, session prompts; export to JSON or CSV; print to PDF |
| **Group** | Drop in many JSON exports to see median, IQR spread, gap to India, contested pillars; export group CSV |
| **ReadMe** | Method, baseline assumptions, scoring rules, data handling |
| **Instructions** | Step-by-step guidance for respondents and facilitators |
| **References** | All 35 pre-reads plus annexures, with search, pillar filter and a core-set filter (from `config/references.json`) |
| **License** | MIT license text (read from `LICENSE` at build time) |
| **About** | Author, LinkedIn and GitHub links, project metadata |

The page also has light and dark themes, a layout that works on phones, autosave to the browser's local storage, and print styles.

## Country baselines are suggestive

The baselines in `config/baselines/` show what a reference score set looks like. **They are meant to be reviewed, adjusted or replaced** for each assessment.

| Baseline | Basis | Treat as |
| --- | --- | --- |
| India | Author's judgement from the public evidence in the pre-reads, as of October 2026 | A considered starting point; still one person's view |
| United States | Author's judgement from general public knowledge; not yet evidence-reviewed | An illustrative draft |
| China | Author's judgement from general public knowledge; not yet evidence-reviewed | An illustrative draft |

None of them is a survey result, an official government position, or an endorsement or criticism of any country. Scores go out of date as policies, programmes and infrastructure change.

### Adapting a baseline to your assessment

Change the baseline to fit the purpose, audience and evidence you have. For example:

- **Update the evidence.** Re-score items against current sources and refresh `evidence`, `assumption`, `confidence` and `asOf`.
- **Use your own panel.** Replace the item scores with the median scores from an expert panel or an earlier round of this assessment. Then set `status` to say so, for example `"Median of 12-member expert panel, March 2027"`.
- **Narrow the scope.** Score a single state, sector or city instead of the whole nation. Say so in `name`, `summary` and `method`.
- **Set a target instead of a peer.** Create a baseline such as `target-2030.json` that holds the scores you aim to reach, so gaps read as distance to a goal.
- **Add any country.** Copy an existing file to `config/baselines/<id>.json` and edit it. It appears in `npm run list` and builds with `npm run build -- --country <id>`.
- **Adjust the questions.** If an assessment needs different questions, edit `config/pillars.json`. Every baseline must then have one score per question; the build tells you which ones don't.

### Keep changes honest

- Set `status` to describe where the scores came from. The page shows it on the ReadMe tab, the chooser page and, for drafts, the Results tab. Any `status` containing "draft" or "illustrative" triggers the Results-tab notice.
- Record your reasoning in `evidence` and `assumption` for each pillar, so respondents can see why a score was chosen.
- Use `lo`/`hi` or `spread` to show uncertainty. A wide range is more honest than false precision.
- After changing questions or scores, bump `version` (and `storageKey`, if questions changed) in `config/site.json` and note the change in `CHANGELOG.md`.

## Quick start

```bash
git clone https://github.com/REPLACE-WITH-YOUR-USERNAME/ai-readiness-assessment.git
cd ai-readiness-assessment
npm run build                      # default country (site.json "defaultCountry") -> dist/india/index.html
npm run build -- --country us      # -> dist/us/index.html
npm run build:all                  # every baseline + dist/index.html chooser page
```

Open the generated `index.html` in any browser, or share the file. Requires Node.js 16 or later; there is nothing to `npm install`.

| Command | Purpose |
| --- | --- |
| `npm run build` | Build the default country |
| `npm run build -- --country <id or name>` | Build one country. Accepts an id, name or alias: `us`, `USA`, `"United States"`, `china`, `PRC`, `india`, `bharat` |
| `npm run build:india` / `build:us` / `build:china` | Shortcuts |
| `npm run build:all` | Build every baseline into `dist/<id>/index.html`, plus a chooser page at `dist/index.html` |
| `npm run list` | List available baselines and their status |
| `npm run check` | Validate all config and every baseline without writing files |
| `npm run watch -- --country us` | Rebuild on every change |
| `npm run serve` | Serve `dist/` on http://localhost:8080 |
| `node scripts/build.js --country us --out us.html` | Write to a custom path |

You can also set the country with an environment variable: `COUNTRY=china npm run build` (on Windows PowerShell, `$env:COUNTRY="china"; npm run build`).

## Project structure

```
ai-readiness-assessment/
├── config/
│   ├── site.json          # title, version, author + links, license, readiness bands
│   ├── pillars.json       # 8 pillars × 5 items: questions and anchors only (no scores)
│   ├── references.json    # pre-reads and annexures shown on the References tab
│   └── baselines/         # one file per country: item scores, ranges, evidence
│       ├── india.json
│       ├── us.json
│       └── china.json
├── content/
│   ├── readme.html        # ReadMe tab (HTML fragment; data-slot placeholders filled at runtime)
│   └── instructions.html  # Instructions tab
├── src/
│   ├── template.html      # page shell with {{PLACEHOLDERS}}
│   ├── styles.css         # design tokens, light/dark themes, print styles
│   └── app.js             # assessment, scoring, charts, group pooling, tabs
├── scripts/
│   ├── build.js           # CLI: --country, --all, --check, --list, --out
│   ├── watch.js           # rebuild on change
│   └── lib/
│       ├── config.js      # file + JSON loading with line-pointing errors
│       ├── baseline.js    # list, resolve, load and apply (factor) baselines
│       ├── validate.js    # site, question and reference checks
│       └── render.js      # page assembly, country tokens, chooser page
├── .github/workflows/build.yml   # CI: validate, build, publish to GitHub Pages
├── dist/                  # build output (git-ignored)
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

## Configuration

### `config/site.json`

```json
{
  "title": "National AI-Readiness Assessment",
  "version": "1.0.0",
  "defaultCountry": "india",
  "storageKey": "ai-readiness-assessment-v1",
  "author": {
    "name": "Dr Shyam Sundaram",
    "linkedin": "https://www.linkedin.com/in/<your-profile>",
    "github": "https://github.com/<your-username>"
  },
  "repository": "https://github.com/<your-username>/ai-readiness-assessment",
  "license": { "name": "MIT", "year": "2026", "holder": "Dr Shyam Sundaram" },
  "bands": [ { "min": 0, "max": 2, "name": "Foundational", "text": "..." } ]
}
```

Change `storageKey` whenever the questions change, so old saved answers don't get mapped onto new items.

### `config/pillars.json`

This file holds questions only. Scores live in the baselines.

```json
{
  "id": "P4", "name": "Compute and models", "short": "Compute & models",
  "tests": "Affordable compute and sovereign or open models",
  "items": [ { "q": "Question text", "a1": "Anchor for 1", "a3": "Anchor for 3", "a5": "Anchor for 5" } ]
}
```

### `config/baselines/<id>.json`: country baselines

```json
{
  "id": "us",
  "aliases": ["usa", "united states of america"],
  "name": "United States", "short": "US", "inSentence": "the US", "possessive": "the US's",
  "asOf": "October 2026",
  "status": "Illustrative draft: ...",
  "summary": "Strongest on ...; weakest on ...",
  "method": "How the scores were reached",
  "defaultSpread": 0.5,
  "pillars": {
    "P1": { "items": [2, 3, 3, 3, 2], "confidence": "Medium",
            "evidence": "...", "assumption": "...",
            "spread": 0.4, "lo": 2.1, "hi": 3.1 }
  }
}
```

- **Factored scores.** Each pillar's baseline is the mean of its `items`, computed at build time. The overall baseline is the mean of the pillars. There is no separate pillar score to keep in sync.
- **Range.** Uses `lo`/`hi` if given; otherwise baseline ± `spread` (per pillar), or ± `defaultSpread`, clamped to 1–5.
- **Validation.** The build fails if a pillar is missing, if the number of `items` doesn't match the questions, if a score isn't an integer from 1 to 5, or if a range doesn't contain the baseline.
- **Country tokens.** `{{COUNTRY}}`, `{{COUNTRY_SHORT}}` and `{{COUNTRY_POSS}}` in `site.json`, `src/template.html` and `content/*.html` are replaced with the chosen baseline's wording.
- **Separate saved answers.** Each country build saves answers in the browser under its own key, so the three versions don't overwrite each other.

**To add a country**, copy `config/baselines/india.json` to `config/baselines/<id>.json`, edit it, then run `npm run check` and `npm run build -- --country <id>`. No code changes are needed.

> All three baselines are **suggestive**. India's comes from the evidence in the pre-reads; the United States and China baselines are **illustrative drafts** from general public knowledge. Review and change them to fit your assessment before using them in a session; see [Country baselines are suggestive](#country-baselines-are-suggestive).

### `config/references.json`

```json
{
  "asOf": "22 October 2026",
  "preReads": [
    { "n": 7, "star": true, "title": "...", "links": [{ "label": "PDF", "url": "https://..." }],
      "source": "NITI Aayog, 2020", "pillars": ["P2", "P3"], "why": "..." }
  ],
  "annexures": [
    { "id": "A", "title": "Latest DEPA references (iSPIRT blog)", "intro": "...",
      "items": [{ "date": "5 May 2026", "title": "...", "url": "https://...", "adds": "...",
                  "code": { "label": "depa-inferencing", "url": "https://github.com/..." } }],
      "more": [{ "label": "...", "url": "https://..." }] }
  ]
}
```

To add a new annexure (for example, Annexure B), add another object to `annexures`.

## Method

- **Pillar score** = mean of non-DK items. A pillar with two or more DK answers is reported as having *insufficient evidence*.
- **Overall score** = mean of pillar scores. **Gap** = score − chosen country baseline.
- **Group score** = median across respondents. **Spread** = interquartile range. A spread above 1.0 marks a contested pillar.
- **Bands:** Foundational < 2.0 ≤ Emerging < 3.0 ≤ Scaling < 4.0 ≤ AI-ready.

Baselines are suggestive expert judgements made against the same anchors respondents use, as of each file's `asOf` date. They are not survey results, and they are meant to be modified for each assessment. Each page's ReadMe tab shows the evidence, assumptions and confidence for every pillar.

## Deploying

A push to `main` runs `.github/workflows/build.yml`, which validates the config, builds every baseline and publishes `dist/` (chooser page plus one page per country) to GitHub Pages. To turn this on, go to **Settings → Pages → Source: GitHub Actions**. Each run also attaches the built HTML as a downloadable artifact.

## Privacy

Answers live only in the respondent's own browser (local storage). Group pooling reads the JSON files locally, with no uploads. The only network requests are the links people choose to click.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © 2026 Dr Shyam Sundaram
