# iMHOTiP — 100,000-record milestone plan

## Current build evidence

- Verified corpus: 100,000 unique records; release QA is complete.
- Bundled base: 10,000 records.
- Sharded NVD CPE layer: 90,000 active, unique-title records.
- Raw NVD pages now cover the required range through index `117,999`.
- Current CPE acceptance yield is about 83% after deprecated records and duplicate titles are removed.

## Completed acquisition range

The 100,000 milestone needed 90,000 accepted CPE records in addition to the 10,000 bundled base. The following 70,000-record buffer was downloaded and produced the required accepted count after exclusions:

| Page | `startIndex` | `resultsPerPage` | Expected file |
|---:|---:|---:|---|
| 1 | 48,000 | 10,000 | `content/nvd-cpe-48000.json` |
| 2 | 58,000 | 10,000 | `content/nvd-cpe-58000.json` |
| 3 | 68,000 | 10,000 | `content/nvd-cpe-68000.json` |
| 4 | 78,000 | 10,000 | `content/nvd-cpe-78000.json` |
| 5 | 88,000 | 10,000 | `content/nvd-cpe-88000.json` |
| 6 | 98,000 | 10,000 | `content/nvd-cpe-98000.json` |
| 7 | 108,000 | 10,000 | `content/nvd-cpe-108000.json` |

Preview without network access:

```powershell
node fetch-nvd-cpe-pages.mjs --start 48000 --pages 7 --page-size 10000 --out content --dry-run
```

Download with the unauthenticated NVD-safe seven-second interval:

```powershell
node fetch-nvd-cpe-pages.mjs --start 48000 --pages 7 --page-size 10000 --out content --delay-ms 7000
```

The downloader validates an existing file before skipping it, so the same command safely resumes. `--force` is reserved for a known corrupt or obsolete page. If `NVD_API_KEY` is present, the script sends it without printing it.

## Applied build state

1. The sharded target is 90,000 accepted CPE records.
2. Keep base entries ahead of CPE inputs in duplicate-title decisions.
3. Preserve the current deterministic order: input filename, API order, then first accepted title.
4. Detail shards remain at 500 records, producing exactly 180 detail shards.
5. Search data is split into 8 compact shards and ranking runs in the production Web Worker, so typing does not scan 100,000 objects on the main thread.
6. Write the release manifest last, only after all validation and QA gates pass.

## Non-negotiable deduplication rules

- Reject deprecated CPE records.
- Reject duplicate `cpeNameId` values.
- Reject case-insensitive duplicate display titles across both the 10,000 base and all accepted CPE records.
- Never synthesize titles, versions, identifiers, or records to reach the target.
- Preserve the official `cpeName`, UUID, source URL, created date, and modified date in detail data.
- A shortfall is a failed build that requires another official page; it is not permission to relax deduplication.

## Required validation evidence

- `validate.mjs`: exactly 10,000 bundled records.
- `validate-sharded-corpus.mjs`: exactly 100,000 total, 90,000 sharded, no duplicate IDs or titles, all detail routes present.
- CPE Egyptian audit: 90,000 structured-Egyptian records, deterministic 400-record sample, zero missing sources or damaged product identifiers.
- Content audit: exact counts for `egyptian-reviewed`, `egyptian-structured`, and `machine-assisted`.
- Browser QA at 1280×900 and 390×900: count, search, filters, direct links, lazy details, Arabic/English, and zero horizontal overflow.
- Search p95 below 150 ms after warm cache; cold shard load below 800 ms on the agreed representative connection.
- Simulated missing/corrupt shard must show a recoverable error and must not corrupt the 10,000-record base experience.

## Release decision

The corpus, manifest, public counters, Worker search, and validators agree on 100,000. HTTP browser QA passes 63/63 at desktop and mobile widths; a blocked-shard simulation passes 4/4 recovery checks while preserving the searchable 10,000-record base. This milestone is verified for release.
