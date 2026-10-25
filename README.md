# RightFit

**An AI agent that finds the right car from one sentence.**

A product I'm building in public, release by release: an AI discovery agent that understands how shoppers describe what they need, reasons over messy inventory data, and proves it's getting better.

*By Rosy Singh, Senior AI Product Manager. An independent concept using public and synthetic data only. Not affiliated with any automaker, lender or retailer.*

---

## The problem

Shoppers describe **needs**: "twins on the way", "tow my track car", "not a minivan". Search expects **specs**: body type, drivetrain, price.

| What I found (v0.1) | |
|---|---|
| Real shoppers who started from a need rather than a model | **13 of 14** |
| Fitting top-5 results when the query is phrased like filters | **95%** |
| Fitting top-5 results when the query is phrased like a person | **37%** |
| "not a minivan" | Added a **minivan** filter |

→ [Shopper intent map](research/intent-map.md) · [Findability audit](audit/findability-audit.md) · [PR/FAQ](docs/prfaq.md)

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
| v0.2 | Feed Doctor: inventory data quality scorecard + SQL | Next |
| v0.3 | Discovery agent: intent → filters and facets → ranked results with "why this car" | Planned |
| v0.4 | Evals run on every change (GitHub Actions) + scoreboard | Planned |
| v0.5 | Search by monthly payment | Planned |
| v0.6 | Responsible-ranking guardrails | Planned |

See [CHANGELOG.md](CHANGELOG.md) and [ROADMAP.md](ROADMAP.md).

## Repo map

```
research/   shopper letters (coded) and the intent map
audit/      test queries, raw results, scoring, findability report
docs/       PR/FAQ and product decisions
```

## Principles

- Start from how shoppers talk, not how the database is shaped.
- A perfect score is a warning sign; measure with an independent judge.
- Show every assumption: applied filters, payment terms, why a car ranked where it did.
- Public and synthetic data only.
