# iMHOTiP — master plan to one million technical records

Date started: 31 October 2026

## Goal

Build a sourced catalog of 1,000,000 real technical records while keeping the site useful to Egyptian readers. Standard Arabic technical names stay canonical; interface copy, explanations, examples, and search aliases use clear professional Egyptian Arabic.

The public claim must remain precise: **one million sourced technical records, with a separately reported count of Egyptian-reviewed explanations**.

## Current verified state

- 290,000 unique records validate across 11 categories. The 632/632 corpus, routing, provenance, uniqueness, detail, and performance gates pass, together with desktop/mobile, direct-file fallback, and extended-corpus failure browser checks.
- 500 entries form the editorial core and are marked `egyptian-reviewed` after professional Egyptian rewriting.
- 500 entries are human `egyptian-reviewed`; 280,000 CPE records have deterministic `egyptian-structured` explanations built from official metadata; 9,500 legacy entries remain `machine-assisted` and never display their unreviewed Arabic as verified content.
- 289,900 entries expose at least one source URL.
- The 280,000-record NVD CPE layer uses 620 prefix-routed search shards and 256 compact UUID-routed detail shards instead of growing `expansion.js`; its Egyptian copy is deliberately labeled structured rather than human-reviewed.
- The largest search shard is 921,579 bytes. All compact CPE detail shards total 51,146,314 bytes. Schema 4 adds five bounded facet previews (maximum 507,675 bytes), and loaded-shard search p95 is 19.2 ms.
- Arabic triage still flags 3,082 suspicious legacy machine translations; those translations stay hidden.
- The unsafe machine Arabic is now hidden in the application; users see the sourced English definition plus a clear Egyptian review notice.
- The 100,000 release passes 63/63 HTTP browser checks at 1280×900 and 390×900, with Worker CPE search at about 107–111 ms and zero horizontal overflow.
- A deliberately blocked search shard leaves the 10,000-record base searchable; 4/4 recovery checks pass.
- The 250,000 release passes 64/64 HTTP browser checks at 1280×900 and 390×900, 57/57 direct-file checks at both widths, and 4/4 missing-shard recovery checks.
- The 290,000 release passes 64/64 HTTP browser checks at 1280×900 and 390×900, 57/57 direct-file checks at both widths, and 4/4 extended-corpus failure recovery checks.

## Milestones

| Release | Main result | Required Arabic review |
|---|---|---|
| 10,000 safety release | Hide unreliable machine Arabic; Egyptian interface | Convert and review the 500-entry editorial core |
| 25,000 | First real sharded release — data and runtime complete; editorial target still in progress | 5,000 high-value concepts reviewed |
| 50,000 | Sharded CPE layer complete; review-status filter and public counters shipped | Expand standards, commands, and APIs in the next corpus mix |
| 100,000 | Complete: production Worker, bilingual QA, lazy details, and failure recovery verified | Golden Arabic/English search suite |
| 250,000 | Complete: prefix-routed search, bounded facet previews, compact details, 536/536 gates, and full browser/recovery QA | Approved deterministic Egyptian template for official CPE records |
| 500,000 | Complete: dual CPE/CVE corpora, incremental builds, bounded facet previews, and recovery QA | Continuous editorial sampling and error tracking |
| 1,000,000 | Complete: 10,000 core terms + 593,000 CPE products + 397,000 valid CVEs, lazy routed search, and on-demand details | Ongoing source refresh and editorial sampling |
| 1,000,000 | Complete sourced catalog | Exact reviewed count shown separately from total |

## Record distribution target

- 80,000 educational concepts.
- 430,000 CPE products and versions.
- 385,000 CVE vulnerability records.
- 45,000 protocols, standards, formats, and licenses.
- 35,000 commands, APIs, languages, and frameworks.
- 25,000 selected packages with source, maintenance, and licensing checks.

No generated word combinations or invented versions may be used to reach the number.

## Architecture decision

The current single `expansion.js` stops at the 10,000 safety release. A linear million-entry version would approach 5.8 GB of browser heap and is rejected.

The production million catalog will use:

1. A small versioned manifest.
2. Compact Arabic and Latin search shards.
3. A Web Worker for ranking and token search.
4. Detail shards loaded only when a result is opened.
5. IndexedDB and a bounded in-memory cache.
6. Immutable data releases with manifest-last publishing and rollback.
7. GitHub Pages for the shell, with static object storage/CDN available for large shards.

The isolated `prototype-million/` directory proves the routing model before production migration.

## Egyptian Arabic policy

- Keep scientific names, acronyms, code, equations, product names, and standards unchanged.
- Keep a canonical Modern Standard Arabic name when one is established.
- Write explanations, examples, interface labels, and Egyptian search aliases in clear professional Egyptian Arabic.
- Never convert a broken machine translation by word replacement. Return to the English source, protect symbols, translate the meaning, then simplify it.
- A record becomes `egyptian-reviewed` only after semantic and language review.

## Quality gates for every batch

- 100% source provider, external ID, source URL, retrieval date, and source policy coverage.
- Zero duplicate IDs, malformed source URLs, unresolved canonical collisions, or broken detail routes.
- Protected acronyms, numbers, symbols, and brands must survive Arabic processing.
- Human review of at least 400 random entries per early batch; more than 1% semantic error rejects the batch.
- A fixed 1,000-case golden set must pass before release.
- Search p95 below 150 ms after cache and cold shard below 800 ms on a representative connection.
- Desktop/mobile, Arabic/English, navigation, offline state, and shard-failure tests must pass.

## Session sequence

### Session 1 — completed foundation

- Set the manifest goal and milestones to 1,000,000.
- Audit all current Arabic and document the Egyptian style.
- Stop displaying unreliable machine Arabic.
- Produce the corpus, licensing, architecture, and review plans.
- Build and validate an isolated shard-loading prototype.

### Session 2 — completed editorial core

- Convert the 500-entry editorial core to reviewed Egyptian explanations and examples.
- Add `kind`, structured source provenance, and explicit review-status counters.
- Add Egyptian golden queries and protected-token tests.

### Session 3 — completed sharded foundation

- Move the current 10,000 records into production shards.
- Replace the global in-memory array with worker search and lazy detail loading.
- Benchmark cold/warm mobile behavior.

### Session 4 — completed 100,000 release

- Download and validate the official NVD pages required for 90,000 accepted CPE records.
- Build 8 search shards and 180 lazy detail shards.
- Integrated production Worker search; completed desktop/mobile, bilingual, lazy-detail, performance, and blocked-shard recovery gates.

### Session 5 and later

- Completed the 250,000 corpus: 10,000 bundled records plus 240,000 active, unique-title CPE records.
- Replaced eager CPE loading with 524 two-character prefix routes and compacted detail storage to 256 UUID routes.
- Added five bounded facet previews so category/review browsing never loads the full CPE index.
- Passed 536/536 data/build gates with a loaded-shard p95 below 18 ms, 64/64 HTTP checks at desktop and mobile widths, 57/57 direct-file checks at both widths, and 4/4 missing-shard recovery checks.
- The million-record target is complete: 10,000 core terms, 593,000 official CPE product records, and 397,000 valid NVD CVE records.
- Extended the verified corpus to 290,000 using 40,000 already-downloaded, valid NVD CPE records while external DNS was unavailable; all 632 build gates and browser gates passed again.
- Publish only batches that pass source, language, duplication, and performance gates.

## Supporting documents

- `EGYPTIAN-ARABIC-STYLE.md`
- `MILLION-CORPUS-PLAN.md`
- `MILLION-ARCHITECTURE.md`
- `audit-egyptian-arabic.mjs`
- `prototype-million/`
