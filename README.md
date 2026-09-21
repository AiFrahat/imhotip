# iMHOTiP

Static, single-page Arabic technology dictionary. No build step or runtime dependencies.

## Local development

Open `index.html` directly, or run `python -m http.server 8000` in this directory and open `http://localhost:8000`.

## Validation

Run `node generate-fallback.mjs` and then `node validate.mjs` after editing terms. The canonical term data is in `data.js`; matching English explanations, examples, and usage notes are in `en.js`. Each term row contains the English term and expansion, Arabic name, simple definition, category, level, example, where it appears, related slugs, and optional alternate meanings. Add categories to `CATEGORIES` before using them. Do not change an existing slug without considering shared `#slug` links. The AR/EN control stores the selected interface language locally. The generated `noscript` index keeps terms available without JavaScript and in the HTML source.

## Browser checks

Run `node qa-browser.mjs 1280` for the desktop file-open experience and `node qa-browser.mjs 500` for the mobile layout. With a local server on port 8000, run `node qa-browser.mjs 1280 --http` as well. Set `CHROME_PATH` if Chrome is installed elsewhere. The checks exercise search, filters, direct and related links, browser history, themes, languages, images, and overflow.

## Deployment

The repository root is directly deployable to GitHub Pages. In repository Settings → Pages, select the branch and root directory. Add `imhotip.com` as the custom domain and configure DNS as instructed by GitHub. `CNAME` is included. Point the domain to this root; no repository subpath is assumed. `robots.txt`, `sitemap.xml`, and metadata use the production origin.

The founder image is supplied by the publisher. Search and theme controls run locally; there are no trackers or external scripts.

The theme button switches between light and dark on each click. Shift-click returns to the system setting.
