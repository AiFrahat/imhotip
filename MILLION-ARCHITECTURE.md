# iMHOTiP architecture for one million terms

## Decision

The current runtime must not be enlarged from 10,000 to 1,000,000 terms by adding more objects to `expansion.js`. The one-million release should keep the HTML, CSS, and application shell small; load a narrow search shard after the user types; and load the complete record only after a result is opened.

The prototype in `prototype-million/` demonstrates this split without changing production files.

## Current baseline and failure point

The current 10,000-term release loads one 11.8 MB JavaScript file, creates every term object, and builds a full in-memory text corpus before search begins. A local Node baseline measured:

| Measurement | 10,000 terms | Linear one-million projection |
| --- | ---: | ---: |
| Data evaluation | 245 ms | about 24.5 s |
| Search-index construction | 136 ms | about 13.6 s |
| Heap after index | 58 MB | about 5.8 GB |
| Full scan per query | 1.5–6.5 ms | about 150–650 ms |

The projection is directional rather than a browser benchmark, but it is sufficient to reject a single global array and full scan.

## Target runtime

```text
index.html + app shell (cached)
        |
        v
versioned manifest (counts, routes, hashes)
        |
        +--> prefix/name shard ----> first 30 result summaries
        |
        +--> token posting shards --> ranked result IDs
                                      |
                                      v
                               detail shard on open
```

### 1. Small boot manifest

`data/manifest.json` should remain below roughly 50 KB and contain:

- release version and creation date;
- total and category counts;
- URL templates for name, token, detail, category, and popular shards;
- shard counts, checksums, and schema version;
- feature flags and the minimum compatible app version.

Use immutable release paths such as `/data/v17/...`. Publish all `v17` files first and replace the small manifest last. A failed upload then leaves users on the complete previous release.

### 2. Search summaries

Search shards contain compact arrays, not full objects. A result needs only:

```text
[id, English term, canonical Arabic term, Egyptian aliases, category, detailShard, reviewStatus, rank]
```

Recommended routes:

- canonical Latin names: normalized first two characters;
- canonical Arabic names and Egyptian aliases: normalized first Arabic character, then a second-level split for large buckets;
- acronyms and symbols: dedicated buckets;
- source IDs such as CWE and RFC: dedicated namespace buckets.

Each compressed response should target 100–300 KB. Split any shard that exceeds 500 KB compressed.

### 3. Token index for multiword and fuzzy search

Build an inverted index from normalized terms, aliases, important keywords, and a short definition. Hash each normalized token to one of 256 or 512 posting shards. Each posting list stores delta-encoded numeric term IDs plus a small field-weight bitmask.

At query time:

1. normalize Arabic and Latin text;
2. route exact name/prefix lookup immediately;
3. fetch posting shards for the query tokens in parallel;
4. intersect or union posting lists inside a Web Worker;
5. rank exact term, acronym, Arabic alias, prefix, and definition matches;
6. return at most 30 summaries to the main thread.

Fuzzy spelling should run only after exact and token results are insufficient. Use deletion keys or a compact trigram index for terms and aliases only; do not fuzzy-index full definitions.

### 4. Detail shards

Store full records in shards of 500–1,500 entries. Every result summary carries its detail shard. Opening a term fetches one shard and caches it for the session.

The full record can contain:

- canonical English and Modern Standard Arabic names;
- Egyptian display explanation and examples;
- aliases in both scripts;
- source links and license attribution;
- related IDs;
- content tier and review status;
- source update date and editorial review date.

Canonical Arabic terminology should remain available even when the interface and explanation use Egyptian Arabic. Scientific names, standards, protocol names, commands, and code must not be colloquialized. Egyptian equivalents belong in `aliases.eg` and explanatory fields.

### 5. Category and discovery pages

Do not calculate category counts or browse lists by scanning a million records in the browser. Generate category manifests and paginated summary shards during the build. Popular and recently updated lists should be separate small files.

### 6. Caching

- Cache the app shell and current manifest with a service worker.
- Cache immutable versioned shards with a long lifetime.
- Keep an in-memory least-recently-used cache of 10–20 fetched shards.
- Do not pre-cache the full corpus.
- On a new manifest, retain the previous release until the new app shell is ready.

## GitHub Pages delivery

GitHub Pages can serve the static shell and versioned shards, but repository size and update cost must be measured at 100,000 terms before committing to the complete million-term corpus there.

Practical plan:

1. keep source datasets and build intermediates outside the Pages branch;
2. publish only compact generated shards and attribution files;
3. keep each generated file comfortably below GitHub's individual-file limits;
4. use a dedicated deployment branch or deployment repository;
5. measure clone size, Pages deployment time, CDN compression, and monthly bandwidth at every milestone;
6. preserve the same manifest API so large data shards can move to object storage/CDN later without rewriting the site.

If compressed production data grows beyond a practical Pages repository, host the shell on Pages and versioned shards on a CORS-enabled static object store. This is an operational change, not an application redesign.

## Build pipeline

Use a streaming build with SQLite or DuckDB as the intermediate store:

1. ingest each licensed source with a source namespace and immutable external ID;
2. normalize Unicode while preserving the original spelling;
3. detect exact aliases, normalized duplicates, and probable semantic duplicates;
4. assign stable internal numeric IDs and stable public slugs;
5. attach provenance and license data to every record;
6. create Egyptian drafts only for fields allowed by the language policy;
7. run terminology and profanity checks;
8. compile compact search summaries, postings, and detail shards;
9. validate all foreign keys and shard routes;
10. emit hashes, counts, audit reports, and the release manifest.

Never rebuild public IDs from array position. Use `sourceNamespace:externalId`, or a deterministic digest when the source has no stable ID.

## Quality tiers

One million entries cannot honestly be described as manually reviewed at launch. Make the state visible:

| Tier | Meaning |
| --- | --- |
| `source-only` | Imported, validated, and linked to its source; no Arabic draft yet |
| `machine-draft` | Egyptian explanation created automatically and passed structural checks |
| `editor-reviewed` | Checked by a qualified Arabic technical editor |
| `community-reviewed` | Accepted after documented community review, with reviewer and date |

The site counter can show the full reference count and a separate reviewed count. Search filters should allow users to restrict results to reviewed content.

## SEO

Generating one million HTML files in the Pages repository is not a safe first design. Use three levels:

- static HTML pages for the editorial and highest-demand terms;
- crawlable paginated category and alphabet pages for discovery;
- client-rendered detail routes for the long tail.

Generate sitemap indexes only for real, stable, crawlable URLs. Split each sitemap below protocol limits. Add canonical URLs, structured `DefinedTerm` data, Arabic and English metadata, and source attribution to pre-rendered term pages. Expand pre-rendering according to actual traffic rather than creating a million pages blindly.

## Performance budgets

Acceptance budgets for a mid-range mobile device on a cold load:

- app shell JavaScript: under 150 KB compressed;
- boot manifest: under 50 KB compressed;
- first searchable interaction: under 2.5 s on a throttled mobile connection;
- keystroke-to-results after shard cache: under 100 ms at p95;
- cold shard query: under 600 ms at p95, excluding a severely degraded network;
- detail open from cached shard: under 100 ms;
- detail open from network: under 600 ms at p95;
- main-thread task: no task longer than 50 ms during typing;
- memory after a normal search session: under 150 MB;
- no initial request for full corpus data.

## Required tests

### Build integrity

- exact release count and per-source count;
- stable IDs across rebuilds;
- no duplicate canonical term within a namespace/language policy;
- alias collisions reported with deterministic winners;
- every result summary resolves to one detail record;
- every related ID and source URL validates;
- manifest hashes match deployed bytes;
- license and attribution coverage is 100%.

### Search relevance

- golden queries for Arabic, Egyptian variants, English, acronyms, commands, symbols, CWE/RFC IDs, and misspellings;
- no regression of the existing 500 editorial terms;
- exact canonical or alias match must outrank definition-only matches;
- reviewed records should outrank machine drafts when relevance is otherwise equal;
- zero-result and offline states have clear Egyptian copy.

### Browser performance

Run desktop and mobile tests for 10k, 100k, 250k, 500k, and 1m generated entries. Record cold and warm timing, bytes transferred, heap, long tasks, and p50/p95 search latency. Test slow 4G, offline cached use, back/forward navigation, language switching, and shard failure recovery.

## Delivery stages

1. **Language and schema foundation:** define Egyptian style, canonical Arabic preservation, provenance, license, and review-status fields.
2. **100,000-term technical proof:** implement shards, Web Worker search, detail lazy loading, and real browser performance gates.
3. **250,000 terms:** add semantic duplicate review and category pagination; measure Pages repository and deployment behavior.
4. **500,000 terms:** add incremental builds, immutable releases, rollback, and traffic-based pre-rendering.
5. **1,000,000 terms:** publish only after source/license coverage, shard integrity, relevance evaluation, and performance budgets pass.

Each stage should be a releasable version. Do not advertise a milestone until the generated manifest, validation report, browser QA, and review-status counts agree.

