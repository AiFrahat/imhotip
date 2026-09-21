# iMHOTiP — Tech Dictionary

**افهم لغة التكنولوجيا ببساطة. · Technology explained simply.**

A free Arabic and English technology dictionary with **500 distinct terms across 11 categories**. Each entry includes a clear explanation, a practical example, a usage context, and related concepts.

[Visit iMHOTiP](https://imhotip.com)

## Features

- Search Arabic names, English names, expanded acronyms, explanations, and common aliases such as JS, ML, and K8s.
- Filter by category or first letter; share terms using stable URL fragments such as `#api` or `#c-plus-plus`.
- Switch between Arabic and English, light and dark themes.
- Use the responsive page on desktop or mobile. Dictionary data is local, with no runtime API dependency.
- Read 400 newly added entries with links to primary references. The original 100 entries currently have no individual reference links.

The collection is an editorial selection of useful technology concepts, not a statistical ranking of worldwide usage. All counters are calculated from actual entries.

## Content

The original 45 entries are in `data.js`, with English copy in `en.js`. The other 455 entries are authored in `content/*.json` and compiled into `expansion.js`:

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
```

The build currently checks for exactly 500 entries. When intentionally expanding the corpus, update the batch counts and release-count checks. Validation checks required bilingual fields, duplicate IDs and names, conflicting aliases, source URL formats, related links, and the generated HTML fallback. These automated checks support editorial review; they cannot establish factual correctness on their own.

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
