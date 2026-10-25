# Changelog

## v0.1 · Research: how shoppers talk vs. how search listens · 2026-10-25

**Added**
- `research/intent-map.md`: 14 public shopper letters coded on 10 signals, plus a proposed intent schema for the agent.
- `audit/`: 20 test queries, raw results from a major used-car retailer's free-text search, a scoring sheet, and the findability report.
- `docs/prfaq.md`: working-backwards PR/FAQ for a finance-aware discovery agent.

**Key findings**
- 13 of 14 shoppers started from a need, not a model.
- Spec-style queries: 95% of top-5 results fit. Need-style queries: 37%.
- Negation inverted ("not a minivan" added a minivan filter); 2 of 20 queries returned zero results.
- Many failures were inventory data issues (body type mislabeled; horsepower, tow rating and range not filterable), not language issues.

**Known limits**
Small samples (14 letters, 20 queries, one main site, one day); relevance judged by one person. v0.2 adds interviews, and v0.4 replaces manual judging with automated evals.
