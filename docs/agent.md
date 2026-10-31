# The RightFit agent (v0.3–v0.6)

**Job:** turn one shopper sentence into the right cars, and be honest about what it can't do.

## How it works

```
shopper sentence ──► /api/search ──► structured intent (JSON) ──► engine.js in the browser
                     GPT-4o-mini       hard constraints,             filter → loosen if empty
                     strict schema     exclusions, preferences,      → rank → "why this car"
                                       unsupported asks, question    → facets
```

| Step | Who does it | Why |
|---|---|---|
| **Understand** the sentence | Language model (`site/api/search.js`; prompt and schema in `site/agent/prompt.js`) | Language is the hard part: negation, comparisons, "good in snow", "under $400 a month" |
| **Find** matching cars | Plain code (`site/agent/engine.js`) over the v0.2 clean inventory | Fast, cheap and checkable. The model never picks a car |
| **Explain** each result | Plain code, from the listing's own fields | It can't invent a spec, by construction |
| **Admit limits** | The model lists unsupported asks; the code reports loosened constraints and unknown drivetrains | Trust: say what you couldn't do instead of quietly showing the wrong cars |

## Product decisions

- **The model parses; it doesn't answer.** A fixed JSON schema (OpenAI structured outputs, temperature 0) limits it to filling fields. It's the same trust pattern as the human review step in my Toyota IAM agent: put the model where it's strong, and keep the decisions checkable.
- **Every filter is visible and removable.** v0.1 showed search silently adding the wrong filter ("not a minivan" became *minivans*). Here each applied filter is a chip with an ×, and removing it re-runs the search without another model call.
- **No exact match? Say so.** The engine loosens the least important constraint first (miles, year, mpg, cargo, then price) and names what it loosened.
- **Ask, don't guess, when the request is vague.** "Safe car for my teenager" gets a short question and best-guess results at the same time, never zero results.
- **Payment is a lender's question.** "Under $400 a month" filters on an estimated payment, with the assumptions printed on the page (10% down, 60 months, 7.9% APR to start; illustrative, not a credit offer). The shopper can edit them since v0.5.
- **Unknown data stays unknown.** Listings with no drivetrain aren't guessed into AWD results. The page says how many might match.

## Payments (v0.5)
- Every car shows an estimated monthly payment from assumptions the shopper controls: down payment, trade-in, term and APR. The same assumptions apply to every car.
- "What can I afford?" turns a monthly payment the shopper picks into the price it covers, then filters on it. A monthly budget replaces any sticker-price limit so the two never conflict.
- **Deliberately not built:** an income-based affordability check. One buyer asked for it, but a lender's search shouldn't ask about or infer income or credit before the shopper chooses to apply. The page says estimates aren't a credit offer.

## Trims, compare and a fair order (v0.6)
- Each listing carries a trim level (base, mid, top) from the reference specs. "No fancy add-ons" ranks base and mid trims first.
- Shoppers can compare up to 3 cars side by side; the best value in each row is marked.
- **Fair order:** ranking uses only the shopper's stated preferences and each car's own data. There's no paid placement, no shopper profile and nothing inferred. The sort order is printed above the results, and an automated test checks that adding a shopper profile or a dealer boost to the request changes nothing.

## Tests on every change
`tests/engine.test.js` runs 14 deterministic checks with no model calls, through a GitHub Action on every push: "not a minivan" never returns a minivan, every result meets every applied filter, "why this car" only states listing facts, loosening says what it loosened, payment math is consistent, budget is never a "can't check" note, base trims rank first for "no add-ons", and nothing outside the stated intent changes the order. The model-facing evaluation (`site/eval.html`) still runs live, because it needs the API key.

## Evaluation

`site/eval.html` runs the 20 v0.1 shopper queries live and scores them like the CarMax audit: *of the top 5 results, how many meet every constraint the shopper stated?* Each query's test (`GOLD` in `engine.js`) is code written independently of the model.

Known limits: the inventory (567 synthetic cars) is much smaller than CarMax's, so some queries have no fitting car in stock. Those are scored on whether the agent says so. I wrote both the agent and these 20 tests, so v0.4 added a held-out set of 6 searches from real buyer interviews, with answer keys from what each buyer said they'd consider.

## Cost and safety
- About 600 tokens per search on GPT-4o-mini: a fraction of a cent.
- A per-visitor limit (40 searches per 10 minutes, per server instance), a 300-character cap and a 15-second timeout, plus a monthly budget set in the OpenAI account.
- The key lives only in Vercel's environment variables (`OPENAI_API_KEY`).
