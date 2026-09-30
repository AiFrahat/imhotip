# 10,000-term release review

Reviewed on 2026-09-30. The release contains exactly 10,000 distinct technology terms across 11 categories.

## Composition

- 500 editorial entries with detailed Arabic and English explanations, examples, usage contexts, aliases, and related terms.
- 9,500 extended reference entries derived from official NIST, MITRE CWE, and IANA source records.
- 9,900 entries expose at least one source link.
- Machine-assisted Arabic text in the extended reference catalog is identified inside the term view and remains queued for editorial improvement.

## Automated checks

- Content build: 9,955 expansion entries plus 45 original entries, exactly 10,000 total.
- Schema and link validation: passed with no missing bilingual fields, malformed URLs, duplicate IDs, duplicate canonical names, or broken related-term links.
- Deep audit: passed with no blocking errors. Equivalent official reference definitions are counted separately because standards frequently publish both an acronym and its expanded name.
- Static HTML fallback: intentionally limited to the 500 editorial entries so the initial document stays compact.
- Browser QA: 55/55 checks passed at desktop width 1280px and mobile width 390px.
- Search QA includes editorial terms, Arabic phrases, NIST terminology, MITRE CWE records, and IANA media types.
- Slowest measured in-browser search during the final run: 32.6 ms on desktop and 29.0 ms on mobile.
- No horizontal overflow or browser script errors were detected.

## Delivery size

- `expansion.js`: about 11.8 MB uncompressed and 1.3 MB with gzip compression.
- `index.html`: about 209 KB uncompressed and 53 KB with gzip compression.

## Editorial note

Automated checks establish structural integrity and working behavior. The original 500 entries remain the reviewed editorial core. The extended catalog preserves source links and clearly labels machine-assisted translation so it can be improved incrementally without hiding its review status.
