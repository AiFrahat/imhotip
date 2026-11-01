# iMHOTiP — Tech Dictionary

**افهم لغة التكنولوجيا ببساطة. · Technology explained simply.**

A free Arabic and English technology dictionary with an **exactly 1,000,000-record validated corpus across 11 categories**. The editorial core includes detailed explanations and examples, while the extended catalogs add official NVD CPE product records and valid NVD CVE vulnerability records. The million-record release passes its data, provenance, uniqueness, routing, detail, performance, desktop/mobile, direct-file, and failure-recovery gates.

[Visit iMHOTiP](https://imhotip.com)

## Features

- Search Arabic names, English names, expanded acronyms, explanations, and common aliases such as JS, ML, and K8s.
- Filter by category or first letter; share terms using stable URL fragments such as `#api` or `#c-plus-plus`.
- Switch between Arabic and English, light and dark themes.
- Use the responsive page on desktop or mobile. Dictionary data is local, with no runtime API dependency.
- Read a professionally Egyptian-Arabic editorial core of 500 terms marked `egyptian-reviewed`. The 593,000 CPE product records and 397,000 CVE records use deterministic Egyptian explanations built only from official metadata and are marked `egyptian-structured`. The remaining 9,500 legacy reference records stay English-first until review, so an unsafe machine translation is never presented as verified content.

The collection is an editorial selection of useful technology concepts and sourced technical records, not a statistical ranking of worldwide usage. All counters are calculated from actual unique entries. The 1,000,000-record goal is complete; see `MILLION-MASTER-PLAN.md` and `MILLION-ARCHITECTURE.md` for the corpus and scalable-search design.

## Content

The original 45 entries are in `data.js`, with English copy in `en.js`. The first 455 expanded entries are authored in focused `content/*.json` files. Another 9,500 reference entries are compiled into `expansion.js`. The extended layer contains 593,000 NVD CPE records and 397,000 valid NVD CVE records. Search shards load only for the matching prefix; CPE and CVE details load only when a record is opened. Ranking and filtering run in `search-worker.js`, keeping the interface responsive without loading the million rows into memory.

The current largest search shard is 921,598 bytes. The unified manifest routes 593,000 CPE and 397,000 CVE records while keeping the 10,000-row editorial/reference base available immediately. Exact-count validation reports 1,000,000 unique records and zero errors. HTTP browser QA passes 66/66 at both 1280px and 390px, direct-file fallback passes 57/57 at both widths, and extended-corpus failure recovery passes 4/4.

| Source | Entries |
| --- | ---: |
| `initial-expansion.json` | 55 |
| `ai-data.json` | 100 |
| `web-programming.json` | 100 |
| `security-networks.json` | 100 |
| `platform-hardware-apps.json` | 40 |
| `platform-cloud-devops-business.json` | 60 |

Edit the JSON sources rather than the generated `expansion.js`. Preserve existing IDs so shared links keep working. Acronyms and spelling variants belong in `aliases`, rather than duplicate entries. Source review notes are alongside the content files.

After an edit, run:

```sh
node build-content.mjs
node generate-fallback.mjs
node validate.mjs
node audit-content.mjs
node audit-egyptian-arabic.mjs
node build-cpe-shards.mjs
node build-cve-shards.mjs
node build-release-manifest.mjs
node validate-sharded-corpus.mjs
node validate-cve-corpus.mjs
node validate-release.mjs
```

The base build checks exactly 10,000 bundled entries, while the corpus validators check the complete 1,000,000-record release, including search/detail shards, identifiers, source URLs, review states, and duplicate terms. The Arabic audit rejects any entry marked `egyptian-reviewed` when it has no detectable Egyptian wording. Automated checks support editorial review; they cannot establish factual correctness on their own.

## Local preview and checks

Open `index.html` directly, or serve this folder with `python -m http.server 8000` and open `http://localhost:8000`.

```sh
node qa-browser.mjs 1280
node qa-browser.mjs 390
node qa-browser.mjs 1280 --http
```

Browser checks exercise search and aliases, Arabic/English switching, new term details and source links, filters, navigation, themes, publisher images, and overflow. Chrome is required; set `CHROME_PATH` if needed. No dependency install is needed for the site.

## GitHub Pages

Publish the repository root from `main`. `CNAME` contains `imhotip.com`; the HTML, scripts, stylesheet, and `assets/` must remain at their expected relative paths. The generated files run directly on GitHub Pages without a server-side build.

The founder images were supplied by the publisher. The website uses no trackers or external application scripts.
