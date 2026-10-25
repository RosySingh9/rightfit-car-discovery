# Findability audit (v0.1)

**Question:** When a shopper types what they want in their own words, does vehicle search understand it and return the right cars?

**Run on:** October 25, 2026 · **Main site tested:** CarMax used-inventory search (free-text box), 20 queries · **Spot checks:** Carvana (1 query), Toyota.com new-inventory search (entry point only)

## Headline

**Search works when shoppers talk in filters, and breaks when they talk like people.**

| Query style | Queries | Constraints applied | Top-5 results that fit |
|---|---|---|---|
| Spec-style ("RAV4 hybrid under $30k", "minivan with AWD") | 4 | **11 / 11** | **19 / 20 (95%)** |
| Need, number, feature or negation ("safe car for my teenager", "truck that can tow 7000 lbs", "not a minivan") | 16 | **30 / 49 (61%)** | **26 / 70 (37%)** |

The intent map found that 13 of 14 real shoppers start from a need, not a model. That's the second row.

## What broke, and why

| Failure mode | Example | What happened |
|---|---|---|
| **Zero results** (2 of 20) | "safe car for my teenager" | The whole sentence was matched as one keyword. 0 cars. |
| **Negation inverted** | "3 row SUV under $45k not a minivan" | CarMax *added* a Minivans filter. Carvana's top results were all minivans. |
| **Numeric thresholds dropped** | "sports sedan 300 hp", "truck that can tow 7000 lbs", "300 miles of range" | Horsepower, tow rating and range weren't applied. Top 5 included a Camry LE, a Dodge Challenger and EVs rated under 300 miles. |
| **Relative terms dropped** | "...low miles under $20k" | "Low miles" ignored; top 5 had 87K–125K miles. |
| **Features dropped** | "massaging seats", "automatic" | Not applied. |
| **Modifier lost in a comparison** | "Highlander hybrid or Grand Highlander" | "Hybrid" dropped; 4 of the top 5 were gas Highlanders. |
| **Over-inference** | "easy to park" | Turned into 4 equipment filters (power locks, power mirrors, power windows, rear camera) that quietly narrow the results. |
| **Catalog data errors** | "AWD sedan", "luxury sedan", "AWD wagon" | A Mazda CX-3 and an Audi Q3 (crossovers) returned as sedans; Impreza, Rogue Sport and HR-V returned as wagons. |
| **Hidden finance assumption** | "car under $400 a month" | Silently became "price under $24,000". Term, rate and down payment weren't shown or asked. |

## Two lessons for an AI discovery agent

1. **Many of the failures are data, not language.** Horsepower, tow rating, EV range, driver-assist features and body type have to exist, be correct and be filterable at the VIN or trim level before any agent can use them. Understanding the query is useless if the inventory can't answer it. That's why the role owns both the agent and the inventory data foundation.
2. **The rest is intent: negation, comparison, thresholds, vague needs.** That's exactly where an LLM-based agent adds value over keyword-to-filter mapping. It should also *ask* when intent is vague ("Is your teen's priority safety ratings, size, or cost to insure?") instead of returning 0 results.

## The finance angle

"Under $400 a month" is a lender's question. The site converted it into a sticker price using assumptions the shopper never saw. A finance-aware discovery agent can:
- ask for down payment, trade-in and term, or state the assumptions it used
- show the payment range next to each car
- never infer or guess at the shopper's credit

## Toyota.com observation

On Toyota.com's public new-inventory search (checked October 25, 2026, Plano zip code), the entry point is a grid of models. No free-text box appeared on that page. That works for the 1 in 14 shoppers who already know their model. It gives no front door to the other 13.

This is one observation of one public page. It doesn't describe any internal or upcoming Toyota Financial Services product.

## Method

- **Queries:** [`queries.json`](queries.json). 12 condensed from real shopper letters (see the intent map), 8 common query shapes.
- **Run:** each query typed into the site's search exactly as written, using the browser in the Claude desktop app. The applied filters, result count and top 5 results were recorded. Raw results: [`carmax_results.json`](carmax_results.json).
- **Scoring:** [`scoring.csv`](scoring.csv).
  - *Constraints applied:* hard constraints in the query that became filters, out of those stated. An inverted filter doesn't count.
  - *Top-5 fit:* how many of the top 5 results meet every hard constraint, judged by the author against public specs. Two queries where the result couldn't be verified (transmission, payment terms) are left out of the fit score.

## Limits

- One main site, 20 queries, one day, one location. Results depend on inventory at that moment.
- Relevance was judged by one person. v0.4 replaces this with an automated eval set.
- Cars.com showed a bot check and wasn't tested. Carvana's search keeps state between searches, so only one result was recorded with confidence; a fuller Carvana run is planned.
- No sign-ins, no forms, no scraping beyond typing a query into each public search box.

*Independent concept by Rosy Singh. Not affiliated with or endorsed by Toyota, Toyota Financial Services, CarMax or Carvana.*
