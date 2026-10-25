# Roadmap

Each item becomes a GitHub issue labeled `now`, `next` or `later`. Priorities come from the v0.1 audit: fix what breaks most often for real shoppers.

## Now (v0.2: data foundation)
- [ ] **Feed Doctor:** synthetic multi-dealer feed with realistic mess (trim spellings, duplicate VINs, stale listings, missing tow and range fields, wrong body types)
- [ ] Normalization and enrichment rules; a data quality scorecard per feed (completeness, accuracy, freshness)
- [ ] SQL for every metric, in the repo
- [ ] 5 short interviews with recent car buyers; update the intent map

## Next (v0.3–v0.4: agent and evals)
- [ ] Intent extraction to a fixed schema (constraints, exclusions, preferences, context)
- [ ] Clarifying question when intent is vague or results would be empty
- [ ] Facets from aggregations; ranking; one-line "why this car" built only from listing facts
- [ ] Gold set: the 20 audit queries plus new ones, with expected filters
- [ ] Evals on every push: constraints honored, negation accuracy, zero-result rate, top-5 precision, invented facts
- [ ] Public scoreboard by version

## Later (v0.5–v0.6: finance and trust)
- [ ] Search by monthly payment with visible, editable assumptions
- [ ] Responsible-ranking guardrails and an explainability panel
- [ ] Re-run the audit across more sites and markets
