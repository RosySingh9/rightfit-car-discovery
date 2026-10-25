# Changelog

## v0.2 · Feed Doctor: can the inventory answer the shopper? · 2026-10-25

**Added**
- `feed-doctor/`: a DuckDB SQL pipeline that loads 4 synthetic dealer feeds (DMS CSV, website JSON, marketplace aggregator, and a hold-out dealer), normalizes them, detects 11 kinds of data issue, de-duplicates, and enriches each listing from a trim-level reference table.
- A scorecard (`feed-doctor/out/scorecard.md`): field coverage before and after, agent-ready listings, and which of the 20 v0.1 shopper queries the data can answer.
- An evaluation of the pipeline itself: recall and precision on planted issues, plus a hold-out dealer whose problem variants were written after the rules.
- `research/interview-guide.md`: a guide for 5 interviews with recent car buyers.

**Key findings**
- Agent-ready listings: 0 of 720 as sent; 454 of 575 shoppable listings after cleaning and enrichment.
- v0.1 queries answerable from the data: 0 before; 10 fully and 6 partly after.
- Planted issues caught: 331 of 333, with no false flags. Hold-out dealer: only 32 of 87 problem variants handled, and 23 bad listings reached the clean inventory.
- Drivetrain is the blocker (82% known): it keeps 4 shopper queries unanswerable. VIN decoding, not more text rules, is the fix.

**Known limits**
Synthetic feeds; illustrative specs; rules written by the same person who planted the issues (which is why the hold-out exists).

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
