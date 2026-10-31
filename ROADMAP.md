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

## Done (v0.4–v0.6)
- [x] 6 buyer interviews and a held-out test in their own words
- [x] Budget question, safer "safe", no invented add-ons (v0.4.1)
- [x] Editable payment assumptions and a "what can I afford?" helper (v0.5)
- [x] Trim preference, compare view, fair-order guardrails, automated tests on every push (v0.6)

## If this went to production next
- [ ] Real dealer feeds; VIN decoding (NHTSA vPIC) for drivetrain, body and trim
- [ ] CarPlay and Bluetooth, navigation and EV-charging data
- [ ] Availability at the nearest dealer
- [ ] Rates from an actual lender, with a soft-pull pre-qualification the shopper opts into
- [ ] A fresh set of buyers for the next held-out test
- [ ] Fair-order and evaluation checks on every model or prompt change
