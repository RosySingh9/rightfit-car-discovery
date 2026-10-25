# Shopper intent map (v0.1 pilot)

**Question:** When people describe the car they want in their own words, what do they say, and how much of it could a search box understand?

**Sample:** 14 public reader letters from Jalopnik's "What Car Should I Buy?" column, where shoppers describe their situation, budget, needs and dislikes in free text. Each letter is coded in [`letters_coded.csv`](letters_coded.csv), with a link to the source.

**Note on wording:** phrases in quotes are condensed from the letters; follow the source links for exact wording.

**Caveats:** This is a small sample, and it skews toward car enthusiasts who write to a car blog. Treat the numbers as directional. v0.2 adds 5 short interviews with recent buyers and a larger corpus.

## What shoppers actually say

| Signal in the letter | Letters | What it means for search |
|---|---|---|
| A budget | **14 / 14** | Price is the one constraint every search box already handles |
| At least one subjective word ("reliable", "quiet", "fun", "upscale", "pleasant") | **14 / 14** | Needs data a filter doesn't have: reliability ratings, cabin noise, reviews |
| A life event behind the purchase (baby, new job, a move, a first license, a breakdown) | **12 / 14** | The "why now" tells the agent which trade-offs matter |
| A use case instead of a spec ("fit a double stroller", "tow my track car", "sleep in it", "get through snow") | **11 / 14** | Has to be translated into specs: cargo volume, tow rating, drivetrain, seat layout |
| Something they *don't* want, in their own words (no minivan, no more German sedans, nothing too big) | **8 / 14** | Negation has to work; in the audit, "not a minivan" added a minivan filter |
| Another decision-maker (spouse, parents, employer rule) | **7 / 14** | Shopping is often shared; a shareable shortlist matters |
| A reference car (likes their Passat wagon; must fit where the Outback parks) | **7 / 14** | "Like X but Y" is a natural query shape to support |
| Trade-in or plan to resell | **4 / 14** | Discovery and financing are linked from the first message |
| A non-price number (age, horsepower) | **3 / 14** | Numeric thresholds need clean, enriched inventory data |
| **A specific model they want to buy** | **1 / 14** | **Almost nobody starts from a model** |

## The finding that shapes the product

**13 of 14 shoppers started from a need, not a model.** A search experience that begins with "pick a model", or that only works when the shopper types filter words, serves the minority who already know what they want.

## Intent schema for the discovery agent

What the agent should extract from one message, and what inventory data each field needs:

| Intent field | Example from the letters | Data the inventory needs |
|---|---|---|
| Budget (price or monthly) | "$45k or less" | Price; finance terms for monthly payment |
| Hard constraints | AWD, third row, automatic | Drivetrain, seating, transmission per VIN |
| Use-case capabilities | "tow a small trailer", "double stroller" | Tow rating, cargo volume, rear-seat dimensions (trim-level enrichment) |
| Exclusions | "not a minivan" | Body-type taxonomy that's actually correct |
| Soft preferences | "quiet", "reliable", "fun" | Ratings, reviews, cabin noise data, or ranking signals |
| Safety and features | collision braking, lane departure | Driver-assist features decoded per trim |
| Reference car | "like my Q5" | Similar-vehicle model (size, class, price band) |
| Context | new baby, first car, snowy commute | Used for ranking and for the agent's explanation, never as a hard filter |

## Inputs for the audit

The 20 test queries in [`../audit/queries.json`](../audit/queries.json): 12 are condensed from these letters, and 8 cover common query shapes (model + budget, comparison, payment-first, vague need, capability).
