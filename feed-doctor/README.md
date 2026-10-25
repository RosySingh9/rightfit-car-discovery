# Feed Doctor (v0.2)

**Question:** Before an AI agent can answer "truck that can tow 7,000 lbs", does the inventory even know each truck's tow rating?

The v0.1 audit showed that many search failures were data failures: wrong body types, and no horsepower, tow rating or range to filter on. Feed Doctor takes messy dealer feeds and turns them into clean, enriched inventory the agent can reason over. It scores the result before and after, and it's evaluated like a model: once on problems it was designed for, and once on a hold-out dealer it has never seen.

All feeds are **synthetic**. Specs in `data/reference/trims.csv` are **illustrative**: close to published figures, but not verified, and not for purchase decisions.

## Results

| | Before (as sent) | After |
|---|---|---|
| Agent-ready listings (every field the agent needs is usable) | **0 of 720** | **454 of 575** shoppable |
| v0.1 audit queries the data can answer | **0** fully (1 partly) | **10 fully, 6 partly**, 4 no |
| Tow rating, horsepower, seats, range on listings | 0% (no feed sends them) | about 99% |
| Body type usable and correct | 62% | 99.8% |
| Drivetrain known | 47% | **82%** |

**Detection on planted issues (feeds A–C): 331 of 333 caught, no false flags.** The 2 misses are VIN typos that happen to keep a valid check digit, a known blind spot of VIN check digits.

**Hold-out dealer (feed D), with problem variants written after the rules: only 32 of 87 handled.** 23 of the 80 hold-out listings that reached the clean inventory had a wrong value. For example, "$34,895.00" became a $3,489,500 price, "13.0k mi" became 130 miles, and stale listings with US-style dates (MM/DD/YYYY) passed as fresh.

## What this says about the product

1. **The rules were 99% right on the problems I planned for, and 37% right on the ones I didn't.** A perfect score on your own test set is a warning sign, not a result. Every new dealer feed needs its own quality gate and monitoring before its listings reach shoppers.
2. **Drivetrain is the blocker.** The aggregator feed doesn't send drivetrain at all, and dealers often bury it in the trim name ("XLE AWD-i", "Symmetrical AWD"). That leaves 4 of the 20 shopper queries unanswerable: AWD sedan, AWD wagon, 4x4 for camping, AWD minivan. The fix is VIN decoding, which reads the drivetrain from the VIN itself, not more text rules.
3. **Some shopper needs aren't in any feed.** Massaging seats, leather, vehicle dimensions ("fits in my garage"), crash-test ratings, finance terms. These need new data sources, not cleaning.
4. **The reference table is the product.** Trim-level specs turned 0% into 99% coverage for tow rating, horsepower and range in one join. Owning and maintaining that table is core work, not a side task.

## Next fixes (v0.2.1 backlog, ranked by shopper impact)

| Fix | Unblocks |
|---|---|
| VIN decode for drivetrain, body and engine | 4 audit queries; drivetrain from 82% toward 100% |
| Sanity gates: price range, miles per year, date-parse failures held back | The 23 bad hold-out listings |
| Broader drivetrain-in-trim patterns ("AWD-i", "Symmetrical AWD", "All Wheel Drive") | Feed D trims |
| Per-dealer onboarding check: run the hold-out style test on every new feed | Future dealers |

## How it works

```
data/feeds/         4 synthetic feeds: dealer DMS CSV (A), dealer website JSON (B),
                    marketplace aggregator CSV (C), hold-out dealer (D)
data/reference/     trim-level specs (illustrative)
data/eval/          planted-issue ground truth, hold-out ground truth, audit-query → field map
sql/01–06           load → normalize → detect issues → enrich and publish → evaluate → scorecard
out/scorecard.md    the results above, regenerated on every run
```

Run it:

```bash
pip install duckdb
python generate_feeds.py   # rebuild the synthetic feeds (seeded, so results repeat)
python run.py              # run the pipeline and write out/scorecard.md
```

## Definitions

- **Usable as sent:** a search filter could use the field exactly as the feed delivered it. Text like "$31,795" or "13,038 mi" doesn't count, and "Sport Utility" isn't a body type a filter recognizes.
- **Shoppable:** a valid VIN, a real price, a recognized model, seen in the last 30 days, and not a duplicate of a dealer's own listing.
- **Agent-ready:** shoppable, and every field the agent filters or explains with is known: model, trim, year, price, miles, body type, drivetrain, seats, third row, transmission, powertrain, horsepower, tow rating, driver-assist features, and fuel economy or EV range.
- **Answerable query:** every field the query needs is usable on at least 95% of listings. "Partly" means the fields exist, but part of the request (such as leather seats) isn't in any feed.
