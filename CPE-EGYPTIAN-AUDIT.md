# CPE Egyptian structured-copy audit

Audit date: 1 November 2026  
Command: `node audit-cpe-egyptian.mjs`

## Result

- 280,000 of 280,000 active CPE records checked.
- 620 prefix-routed search shards checked against their manifest counts.
- 256 compact UUID-routed detail shards checked.
- 280,000 unique internal IDs and 280,000 unique product titles.
- 280,000 records use the explicit `egyptian-structured` status.
- 280,000 records generate an exact NVD CPE API URL derived from their UUID.
- Zero audit errors.

## What the audit proves

The deterministic Egyptian copy is tied to official record fields instead of translating product names. For every record, the audit verifies that:

1. The original product/version title is preserved exactly in `term`, `arabicName`, the Egyptian definition, and the example.
2. The CPE 2.3 identifier is preserved in the compact detail shard and expands correctly at runtime.
3. The Egyptian definition is generated deterministically from the preserved official title.
4. The explanation, example, and usage contain clear Egyptian markers such as `ده`, `بيساعد`, `ممكن`, `علشان`, and `هتقابله`.
5. The detail record has a complete three-field English fallback.
6. The source URL UUID agrees with the internal record ID, and the detail source is identical.
7. NVD creation and modification timestamps parse as valid dates.
8. There are no orphan details, duplicate IDs, or duplicate visible titles.

## Deterministic sample

The script selects up to 1,000 records by a stable FNV-1a hash of the record ID. This sample is reproducible after every build and spans the corpus independently of file order. All 1,000 sampled records pass the same structural, language-marker, title-preservation, source, and detail-route checks.

## Interpretation

`egyptian-structured` means that the Egyptian explanation was produced from a fixed, audited template populated only with official NVD metadata. It is useful and safe to display, but it stays separate from `egyptian-reviewed`, which is reserved for individually edited educational explanations. This distinction prevents an automated template from being misrepresented as human editorial review.
