# iMHOTiP content roadmap: 10,000 terms

The public counter must always equal the number of complete, validated entries. The collection grows through reviewed releases at 1,000, 2,500, 5,000, and 10,000 entries.

## Definition of a publishable entry

Every term must have a stable unique ID, canonical English term, Arabic name, clear Arabic definition, matching English definition, a concrete example in both languages, a real usage context, category and level, related valid terms, aliases where useful, and at least one consulted primary source for new entries.

Spelling variants, abbreviations, product versions, and translations are aliases rather than extra counted entries. Closely overlapping concepts must be merged or clearly distinguished. The site never displays a planned count as if it were already published.

## Target coverage

| Category | Goal |
| --- | ---: |
| Programming | 1,600 |
| Cybersecurity | 1,000 |
| Data and databases | 950 |
| Artificial intelligence | 900 |
| Web and internet | 900 |
| Networking | 850 |
| Hardware | 850 |
| Cloud | 750 |
| Applications | 750 |
| Development and operations | 750 |
| Digital business | 700 |
| **Total** | **10,000** |

## Release workflow

1. Propose a batch with its scope and authoritative sources.
2. Check proposed canonical names and aliases against the full collection before writing definitions.
3. Write and review Arabic and English copy together.
4. Add related links only after all targets exist.
5. Run the build, validation, audit, and browser checks.
6. Publish only when the release count in `content/manifest.json` matches the complete validated corpus.

The next release target is 1,000 terms: 500 additional entries distributed across the categories with the largest coverage gaps. At 2,500 entries, the frontend should move from one generated JavaScript corpus to category chunks and a compact search index. Before 5,000 entries, generate individual static term pages and sitemap indexes instead of embedding the complete no-JavaScript corpus in the home page.
