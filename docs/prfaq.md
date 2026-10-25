# PR/FAQ: RightFit, a discovery agent that finds the right car from one sentence

*Working-backwards draft, v0.1. An independent concept written as if for an automaker's in-house finance company (a "captive lender") that also runs a vehicle shopping experience. Every figure below is a hypothesis to test; none of them are results.*

---

## Press release

**Shoppers can now describe their life, not a spec sheet, and see the cars that fit, with a payment they can trust**

Most car shoppers don't start with a model name. They start with a situation: twins on the way, a new job with a long commute, a teenager getting a license. Today, they have to translate that situation into filters themselves. Shoppers who don't know that "fits a double stroller" means "a midsize SUV with 40+ cubic feet of cargo space" get zero results, or the wrong ones.

**RightFit** lets shoppers type what they need in plain language: *"Something safe for my 16-year-old, under $25k, that won't cost a fortune to insure."* The agent:
- **understands** the request, including what the shopper *doesn't* want and any numbers that matter (tow rating, range, horsepower)
- **asks one question** when the intent is unclear, instead of returning nothing
- **searches live inventory** whose data has been cleaned and enriched to the trim level
- **explains each match** in one line: "Top safety rating, standard collision braking, 5 miles from you"

Because it's built by the lender, every car can show an **estimated monthly payment, with the assumptions in plain view**. The shopper can change the down payment, trade-in or term and watch the shortlist update. There's no credit check to browse, and the agent never guesses at anyone's credit.

> "We kept seeing shoppers leave after a search returned nothing, or after we showed them minivans they'd told us they didn't want. RightFit closes the gap between how people talk and how inventory is stored." — *Product lead, discovery (hypothetical)*

> "I typed 'three rows, not a minivan, under $45k, has to merge onto I-25 without drama.' The first five were all SUVs I'd actually consider, and it told me why." — *Shopper in usability testing (hypothetical)*

RightFit starts with new and certified pre-owned inventory in one test market, alongside the existing search, which stays available for shoppers who prefer filters.

---

## Customer FAQ

**Do I have to know what model I want?**
No. Describe your situation, budget and must-haves. You can also start from a car you know: "like my RAV4 but with a third row."

**Is the monthly payment real?**
It's an estimate. The rate, term and down payment it assumes are shown next to it, and you can change them. A real offer needs a credit application, which is separate and only happens if you choose.

**Why did it ask me a question instead of showing results?**
When a request could mean very different cars ("something safe"), one quick question gets you better results than a page of guesses.

**Will it hide cars from me?**
No. Every filter it applies is shown as a chip you can remove, and you can switch to standard search at any time.

---

## Internal FAQ

**What problem are we solving, and how do we know?**
Shoppers describe needs, but search expects specs. In a pilot read of 14 real shopper letters, 13 started from a need rather than a model, and 11 described a use case ("tow my track car") rather than a spec. In a 20-query audit of a major retailer's free-text search, spec-style queries returned fitting results 95% of the time; need-style queries 37%, with 2 zero-result searches and negation reversed ("not a minivan" *added* a minivan filter). See [`../research/intent-map.md`](../research/intent-map.md) and [`../audit/findability-audit.md`](../audit/findability-audit.md).

**Why the lender, and not a dealer group or a marketplace?**
Payment is how most people actually budget, and the lender is the one party that can show an honest, explained payment estimate next to every result. It also has a reason to care about trust and compliance from the start.

**What has to be true about the data?**
The agent is only as good as the inventory it reasons over. Before launch, every listing needs, at the trim or VIN level:
- correct body type
- drivetrain, transmission and seating
- tow rating and cargo volume
- EV range and fuel economy
- driver-assist features
- price and freshness

That means an ingestion and enrichment pipeline that normalizes dealer and third-party feeds (trim names, option codes, duplicates, stale listings) and scores data quality per feed. Many of the audit failures were data failures, not language failures.

**How does the agent work?**
1. **Understand:** an LLM turns the message into a structured intent (hard constraints, exclusions, soft preferences, context), using a fixed schema.
2. **Clarify:** if the intent is too vague, or would return zero or thousands of results, ask one question.
3. **Retrieve:** structured filters first, then semantic matching for soft preferences ("quiet", "fun").
4. **Rank:** match to stated constraints first, then preferences, distance and price.
5. **Explain:** one line per car, built only from facts in the listing. It never invents a spec.

**How will we measure success?**

| Type | Metric |
|---|---|
| North star | **Findability rate:** share of discovery sessions that reach a vehicle detail page matching every hard constraint the shopper stated |
| Leading | Zero-result rate · rephrase rate · clarifying questions per session · time to first relevant result |
| Quality (offline evals) | Constraints-honored rate, negation accuracy, top-5 precision on a gold set of real queries; rate of invented specs in explanations (target: 0) |
| Business | Detail-page views to lead, and to credit application, compared against a control group on standard search |
| Data | Attribute completeness and accuracy per feed, listing freshness, body-type error rate |

**What are the guardrails?**
- **Fair lending:** ranking and payment estimates never use protected characteristics or proxies for them. The agent doesn't infer creditworthiness from anything a shopper types.
- **Explainable:** every result shows why it matched, and every applied filter is visible.
- **No invented facts:** explanations come only from listing data, and evals check this before each release.
- **A human owns the release:** quality thresholds are agreed with the business owner, and the launch waits until they're met.

**What's out of scope for v1?**
Credit applications inside the agent, dealer negotiation, trade-in appraisal, and voice.

**What are the biggest risks?**
- **Data quality across feeds:** mitigated by measuring quality per feed and falling back to fewer filters when data is missing.
- **Over-inference** (adding filters the shopper didn't ask for): mitigated by showing every filter as a removable chip and checking it in evals.
- **Cost and speed:** mitigated by a small model for parsing, caching, and structured search before any semantic step.

**How do we roll it out?**
Offline eval on a gold set → internal dogfood → one test market at 10% of traffic against a control → expand by market, using data readiness as the gate.
