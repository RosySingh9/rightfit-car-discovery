# RightFit

**An AI agent that finds the right car from one sentence.**

A product I'm building in public, release by release: an AI discovery agent that understands how shoppers describe what they need, reasons over messy inventory data, and proves it's getting better.

*By Rosy Singh, Senior AI Product Manager. An independent concept using public and synthetic data only. Not affiliated with any automaker, lender or retailer.*

---

## The problem

Shoppers describe **needs**: "twins on the way", "tow my track car", "not a minivan". Search expects **specs**: body type, drivetrain, price.

| What I found | |
|---|---|
| Real shoppers who started from a need rather than a model | **13 of 14** |
| Fitting top-5 results when the query is phrased like filters | **95%** |
| Fitting top-5 results when the query is phrased like a person | **37%** |
| "not a minivan" | Added a **minivan** filter |
| Listings that arrive from dealer feeds ready for an AI agent (v0.2) | **0 of 720**; after cleaning and enrichment, **454 of 575** |
| Cleaning rules on problems they were designed for, vs a dealer they had never seen (v0.2) | **99%** vs **37%** |

→ **[Try the agent](https://rightfit-car-discovery-site.vercel.app/)** · [How the agent works](docs/agent.md) · [Shopper intent map](research/intent-map.md) · [Findability audit](audit/findability-audit.md) · [PR/FAQ](docs/prfaq.md) · [Feed Doctor](feed-doctor/README.md) · [Buyer interviews](research/interview-findings.md)

## What I'm building

1. **Understand.** Turn one message into a structured intent: constraints, exclusions, preferences, context.
2. **Clean the data.** Normalize and enrich inventory feeds so the agent has facts to reason over (body type, tow rating, range, driver-assist features).
3. **Find and explain.** Filters, then ranking, then a one-line "why this car" built only from listing facts.
4. **Prove it.** A gold set of real shopper queries, scored on every change, published as a scoreboard.
5. **Finance-aware and responsible.** Search by monthly payment with visible assumptions; ranking that never uses protected characteristics.

## Releases

| Version | What ships | Status |
|---|---|---|
| **v0.1** | Shopper intent map, findability audit (20 queries), PR/FAQ | ✅ Shipped |
| **v0.2** | Feed Doctor: messy dealer feeds → clean, enriched inventory; data quality scorecard in SQL; hold-out evaluation | ✅ Shipped |
| **v0.2.1** | Parsing fixes and sanity gates from the hold-out dealer | ✅ Shipped |
| **v0.3** | Discovery agent: one sentence → filters and facets → ranked results with "why this car"; live evaluation page | ✅ Shipped |
| **v0.4** | 6 buyer interviews; held-out test in their own words; fixes in v0.4.1 | ✅ Shipped |
| v0.5 | Search by monthly payment; "what can I afford?" helper | Next |
| v0.6 | Trim preference, compare view, responsible ranking | Planned |

See [CHANGELOG.md](CHANGELOG.md) and [ROADMAP.md](ROADMAP.md).

## Repo map

```
research/     shopper letters (coded), intent map, buyer interview guide
audit/        test queries, raw results, scoring, findability report
docs/         PR/FAQ, agent design
feed-doctor/  inventory pipeline (DuckDB SQL), synthetic feeds, evals, scorecard
site/         the project page, the agent (api/, agent/), evaluation and SQL explorer pages
```

## Principles

- Start from how shoppers talk, not how the database is shaped.
- A perfect score is a warning sign; measure with an independent judge.
- Show every assumption: applied filters, payment terms, why a car ranked where it did.
- Public and synthetic data only.
