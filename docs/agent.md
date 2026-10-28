# The RightFit agent (v0.3)

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
- **Payment is a lender's question.** "Under $400 a month" filters on an estimated payment, with the assumptions printed on the page (10% down, 60 months, 7.9% APR; illustrative, not a credit offer). v0.5 makes them editable.
- **Unknown data stays unknown.** Listings with no drivetrain aren't guessed into AWD results. The page says how many might match.

## Evaluation

`site/eval.html` runs the 20 v0.1 shopper queries live and scores them like the CarMax audit: *of the top 5 results, how many meet every constraint the shopper stated?* Each query's test (`GOLD` in `engine.js`) is code written independently of the model.

Known limits: the inventory (567 synthetic cars) is much smaller than CarMax's, so some queries have no fitting car in stock. Those are scored on whether the agent says so. I wrote both the agent and the tests, so v0.4 adds a held-out query set and runs the evaluation on every change.

## Cost and safety
- About 600 tokens per search on GPT-4o-mini: a fraction of a cent.
- A per-visitor limit (40 searches per 10 minutes, per server instance), a 300-character cap and a 15-second timeout, plus a monthly budget set in the OpenAI account.
- The key lives only in Vercel's environment variables (`OPENAI_API_KEY`).
