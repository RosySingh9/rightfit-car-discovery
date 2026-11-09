# PR/FAQ: RightFit, a discovery agent that finds the right car, and a payment that fits, from one sentence

*Working-backwards document, v0.7, revised after building and testing. An independent concept written as if for an automaker's in-house finance company (a "captive lender") that also runs a vehicle shopping experience. Figures marked "measured" come from the RightFit build and its tests; everything else is a hypothesis. The original v0.1 draft, written before any building, is kept unchanged in [`prfaq.md`](prfaq.md).*

> **What the evidence changed since v0.1**
> - **Payment moved to the lead.** 4 of 6 buyers I interviewed couldn't work out a monthly payment or what they could afford online. v0.1 treated payment as a bonus; it's the main reason a lender should build this.
> - **Ask about budget, don't avoid questions.** Tuning to my own test taught the agent to ask fewer questions. Real buyers wanted to be asked about budget, and it asked only 1 time in 4. It now always asks when no budget is given, while still showing results.
> - **Every new data feed needs its own quality check.** The pipeline caught 331 of 333 problems I planted, but handled only 32 of 87 on a dealer feed it had never seen. Per-feed checks and sanity gates are now launch requirements, not nice-to-haves.
> - **Never loosen a filter silently.** When nothing fits, the agent shows the trade-off and lets the shopper choose.

---

## Press release

**Shoppers can now describe their life and their monthly budget, and see the cars that fit, with a payment they can trust**

Most car shoppers don't start with a model name. They start with a situation (a new job, a growing family, a first car) and a monthly number they can live with. Today, they translate that situation into filters themselves, and most sites can't search by payment at all. Shoppers who type the way they talk get the wrong cars: on one major retailer's search, "not a minivan" returned minivans, and "$400 a month" was read as a $400 price.

**RightFit** lets shoppers type what they need in plain language: *"A safe SUV for my family, not a minivan, about $450 a month."* The agent:
- **understands** the request, including what the shopper *doesn't* want and numbers that matter (seats, cargo, tow rating, range)
- **asks about budget** when the shopper hasn't given one, and shows best-guess results while they answer
- **searches inventory** whose data has been cleaned and filled in to the trim level
- **explains each match** from the listing's own facts: "Third row, standard collision braking, about $452 a month"
- **says what it can't check yet**, such as Bluetooth or ride comfort, instead of pretending

Because it's built by the lender, every car shows an **estimated monthly payment, with the assumptions in plain view**. The shopper sets the down payment, trade-in, term and rate, and the shortlist updates. "What can I afford?" turns a monthly payment into a price. There's no credit check to browse, and the agent never asks about or guesses at anyone's income or credit.

> "We kept seeing shoppers leave after a search returned the wrong cars, or no payment at all. RightFit closes the gap between how people talk and how inventory is stored." — *Product lead, discovery (hypothetical)*

> "I want to buy an EV but not sure if I can find within my budget." — *Car buyer, interview, Oct 2026 (real, anonymized)*

RightFit starts in one test market, alongside the existing search, which stays available for shoppers who prefer filters.

---

## Customer FAQ

**Do I have to know what model I want?**
No. Describe your situation, budget and must-haves. You can also name cars you're weighing, or rule some out: "RAV4 or CR-V, never a Kia."

**Is the monthly payment real?**
It's an estimate. The rate, term and down payment it assumes are shown next to it, and you can change them. A real offer needs a credit application, which is separate and only happens if you choose.

**Will it ask about my income or credit?**
No. You choose the payment you're comfortable with. Browsing never needs a credit check.

**Why did it ask me a question?**
Usually it's about budget, because that changes the results more than anything else. You'll see results while you answer.

**Why is this car first?**
Ranking uses only what you asked for and each car's own data. There's no paid placement and no shopper profile. The sort order is printed above the results.

**What if nothing fits everything I asked for?**
It tells you, shows the closest cars and names the trade-off, for example "these are $30 a month over your budget". You decide whether to keep the limit.

**Will it hide cars from me?**
No. Every filter it applies is shown as a chip you can remove, and you can switch to standard search at any time.

---

## Internal FAQ

**What problem are we solving, and how do we know?**
Shoppers describe needs and budgets, but search expects specs. Evidence so far (measured):
- **Shopper language:** 13 of 14 real car-buying letters started from a need, not a model. See [`../research/intent-map.md`](../research/intent-map.md).
- **Today's search:** in a 20-query audit of a major retailer's search, filter-style queries returned fitting results 95% of the time; people-style queries 37%. "Not a minivan" added a minivan filter. See [`../audit/findability-audit.md`](../audit/findability-audit.md).
- **Buyers:** 6 interviews. Affordability was the biggest gap (4 of 6), safety the most common must-have (4 of 6), and "no fancy add-ons" came up 3 times. See [`../research/interview-findings.md`](../research/interview-findings.md).

**Why the lender, and not a dealer group or a marketplace?**
Payment is how most people actually budget, and the lender is the one party that can show an honest, explained payment next to every result. It also has the strongest reason to get fairness and trust right from the start.

**What has to be true about the data?**
The agent is only as good as the inventory it reasons over. Every listing needs, at the trim or VIN level: correct body type; drivetrain, transmission and seating; tow rating and cargo volume; EV range and fuel economy; driver-assist features; trim level; price and freshness.
- **Measured:** none of 720 synthetic dealer listings had all of this as sent; 467 did after the cleaning pipeline.
- **Requirement:** every new feed passes its own quality check before it goes live, because rules that work on known feeds fail on new ones (32 of 87 problems handled on an unseen dealer, 85 of 87 after fixes).
- **Requirement:** sanity gates hold back impossible prices, years and mileages. Held listings go to a review queue, because the gates also catch the odd real car.
- **Gap:** drivetrain was known for only 82% of listings from text alone. Production needs VIN decoding.

**How does the agent work?**
1. **Understand:** a small language model turns the message into a structured intent (hard constraints, exclusions, preferences, phrases it can't check) using a fixed schema. This is the only AI step.
2. **Clarify:** if no budget is given, ask about it; if family size matters and is unknown, ask that. Always show results meanwhile.
3. **Find:** plain code filters on hard constraints. If nothing fits, it loosens the least important one and says so, or shows the budget trade-off.
4. **Rank:** by the shopper's stated preferences ("cheapest", "newest", "most cargo", "base trim") and each car's data only.
5. **Explain:** one line per car, built only from listing facts. It can't invent a car or a spec.

**How will we measure success?**

| Type | Metric |
|---|---|
| North star | **Findability rate:** share of discovery sessions that reach a vehicle detail page matching every hard constraint the shopper stated |
| Leading | Zero-result rate · rephrase rate · time to first relevant result · share of sessions that set a payment |
| Quality (offline evaluations) | Top-5 fit on a held-out set of **real buyers' searches** (not only our own test set); asked the question the buyer wanted; filters nobody asked for (target: 0); invented specs (target: 0); "never consider" respected |
| Business | Detail-page views to lead, and to credit application, against a control group on standard search |
| Data | Attribute completeness and accuracy per feed, listing freshness, problems handled on each new feed |

**What are the guardrails?**
- **Fair lending:** ranking and payments never use protected characteristics or proxies for them. The agent never asks about or infers income or credit. An automated test checks that adding a shopper profile or a dealer boost changes nothing.
- **Explainable:** every result shows why it matched, every applied filter is visible, and the sort order is printed.
- **No invented facts:** explanations come only from listing data, and tests check this on every change (14 automated tests in the build).
- **A human owns the release:** quality thresholds are agreed with the business owner, and launch waits until they're met.

**What's out of scope for v1?**
- Credit applications inside the agent, dealer negotiation, trade-in appraisal, and voice.
- **An income-based "what can I afford?" check.** One buyer asked for it. A lender's search shouldn't collect or infer income before the shopper chooses to apply; real rates come later, through an opt-in soft credit check.

**What are the biggest risks?**
- **Data quality across feeds:** mitigated by a quality check per new feed, sanity gates and a review queue.
- **Trusting our own tests:** the agent once scored 100% on a test set I wrote while hiding filters nobody asked for; reading every result dropped it to 91%. Mitigated by a held-out set of real buyers, refreshed with new buyers, and by reading results, not just scores.
- **Over-correcting:** a fix for one problem can overshoot (fewer questions meant the budget question went missing). Mitigated by checking every fix against the held-out set before release.
- **Filters nobody asked for:** mitigated by removable filter chips and a 0 target in evaluations.
- **Missing data shoppers care about:** Bluetooth and CarPlay, navigation, ride comfort, EV charging, availability nearby. Mitigated by saying "can't check yet" instead of guessing, and adding the data in priority order.
- **Cost and speed:** a small model for parsing only (a fraction of a cent per search), and structured search everywhere else.

**How do we roll it out?**
Offline evaluation on a held-out set of real buyers → internal testing → one test market at 10% of traffic against a control → expand by market, with each market's data quality as the gate.
