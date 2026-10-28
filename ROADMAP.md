# Roadmap

Each item becomes a GitHub issue labeled `now`, `next` or `later`. Priorities come from the v0.1 audit: fix what breaks most often for real shoppers.

## Done (v0.2: data foundation)
- [x] Feed Doctor: synthetic multi-dealer feeds with realistic problems
- [x] Normalization, enrichment, data quality scorecard, SQL in the repo
- [x] Hold-out dealer evaluation
- [x] Buyer interview guide

## Done (v0.2.1 and v0.3)
- [x] Sanity gates and parsing fixes from the hold-out dealer
- [x] Intent extraction to a fixed schema; clarifying question; loosening with a notice
- [x] Facets from aggregations; ranking; "why this car" from listing facts
- [x] Live evaluation page on the 20 v0.1 queries

## Now (v0.4: prove it)
- [ ] Publish the first evaluation run on the page
- [ ] Held-out query set written by someone else (buyer interviews)
- [ ] Fresh hold-out dealer feed (feed E)
- [ ] Evaluation on every change (GitHub Actions) and a scoreboard by version
- [ ] Run 5 buyer interviews; update the intent map
- [ ] VIN decode for drivetrain once real VINs are available (NHTSA vPIC)

## Later (v0.5–v0.6: finance and trust)
- [ ] Search by monthly payment with visible, editable assumptions
- [ ] Responsible-ranking guardrails and an explainability panel
- [ ] Re-run the audit across more sites and markets
