# AI and data editorial batch

- Exactly 100 new entries: 55 AI and machine-learning terms, 45 data/database/analytics terms.
- Every entry has an Arabic title, original concise Arabic definition, concrete example and use context, plus matching English definition/example/context.
- All source URLs in `ai-data.json` were opened through the web tool during preparation. Sources are official documentation or explanatory material published by Google, TensorFlow, Keras, PostgreSQL, Microsoft, IBM, AWS, Elastic, Databricks, and scikit-learn.
- Selection prioritizes concepts useful in ordinary technical reading, model use and development, database work, and reporting. It is an editorial selection, not a measured frequency ranking.
- Related-term references target the existing 100 entries or entries in this batch. No references require another agent's new entries.
- Automated validation passed: exact category counts, required nonempty fields, three English fields per entry, HTTPS source URLs, no duplicate slugs against the existing 100, and all related-term references resolved.

## Editorial boundaries

- Short explanations intentionally omit advanced edge cases; each entry links to an authoritative source for further reading.
- Few-shot and zero-shot entries distinguish their broader machine-learning use from examples supplied within a language-model prompt.
- Context-window limits are described as often including both input and output because service accounting differs.
- Database schema distinguishes structural design from the namespace meaning used by some database products.
- Replication acknowledges asynchronous delay. It does not promise instantaneous consistency or substitute for backups.
- Metrics define precision, recall, and F1 distinctly. Accuracy notes that class imbalance can make the number misleading.

## Verification command result

`{ "count": 100, "categories": { "ai": 55, "data": 45 }, "baseCount": 100, "errors": [] }`
