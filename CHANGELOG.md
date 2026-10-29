# Changelog

## v0.3.1 · What a perfect score hid · 2026-10-29

**First evaluation run (v0.3, live, GPT-4o-mini):** 100% top-5 fit on the 20 v0.1 shopper searches (58 of 58 need-style slots, 15 of 15 spec-style), versus CarMax's 37% and 95%. When nothing in stock fit, it said so 3 of 3 times. It flagged both unsupported requests (massaging seats, leather). Raw results: `site/data/eval-runs/v0.3-2026-10-29.json`.

**Why that isn't the headline:** I wrote the agent, the tests and the inventory, so a top-5 score mostly measures parsing. Reading every row found:
- Filters nobody asked for in 6 of 20 searches ("fun" became 250+ hp; "Gas" added twice). For the AWD sedan search, that left zero cars even after loosening.
- Unneeded clarifying questions on 3 clear searches.
- Missed matching cars twice (3 EVs hidden by a filter listing every drivetrain; RAV4 Primes).
- Two "can't check" notes that weren't real requests.

**Fixed**
- Prompt rules: never add an unasked filter; subjective words only re-rank; "unsupported" lists only what the shopper asked for; ask questions only when the request is truly vague.
- Code guards: ignore a drivetrain filter that lists every drivetrain; loosen an inferred fuel type last if nothing matches.
- The evaluation now flags unasked filters, unneeded questions and missed matching cars on every row.

## v0.3 · The agent · 2026-10-28

**Added**
- Live search on the project page: one sentence in, ranked cars out, each with a "why this car" line built only from listing data.
- `site/api/search.js`: a Vercel function that asks GPT-4o-mini to fill a strict intent schema (constraints, exclusions, preferences, unsupported asks, a clarifying question).
- `site/agent/engine.js`: filtering, loosening when nothing matches, ranking, explanations, facets and an illustrative payment estimate. Plain code, so results are checkable.
- Removable filter chips, clickable facets, a clarifying question for vague requests, and honest notices for loosened constraints, unsupported asks and unknown drivetrains.
- `site/eval.html`: runs the 20 v0.1 shopper queries live and scores them the same way as the CarMax audit.
- `docs/agent.md`: how the agent works and why.

**Included: v0.2.1 pipeline fixes**
- Parsing: prices with cents, "13.0k mi", two-digit years, US-format dates, more drivetrain-in-trim patterns ("AWD-i", "Symmetrical AWD", "All Wheel Drive").
- Sanity gates hold back listings with an impossible price, year, mileage or date.
- Hold-out dealer: 85 of 87 problems handled (was 32), 0 bad listings published (was 23). That dealer has now been seen, so v0.4 tests against a fresh one.
- Trade-off: the mileage gate also held back one genuine listing, a 2024 Telluride with 800 miles. In production, gated listings should go to a review queue rather than disappear.

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
