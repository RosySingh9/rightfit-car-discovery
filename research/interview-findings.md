# Buyer interviews (v0.4 research)

**Who:** 6 people who are shopping for a car or recently bought one (B1–B6). They include first-time, family, used-car and EV buyers, and at least four are financing. Notes are anonymized; the raw notes stay private.

**Caveat:** 6 people is a strong signal for a side project, not a statistic. Counts below are "of 6".

## What they said, in their words

| | Trigger | First description | Must-haves | Had a model or brand in mind? | Where search failed them | The question a tool should ask |
|---|---|---|---|---|---|---|
| **B1** | Moved to a new city | "need a car that takes me to work and do groceries" | Good Bluetooth for calls; no fancy add-ons | No (considering RAV4, Pilot, Camry) | Working out which car fits their needs | Monthly budget (car payment) |
| **B2** | Moved countries | "need a car for family plus own use" | Smooth ride, safe for kids; no fancy add-ons | Yes (RAV4, "any Toyota") | Availability | How many in the family |
| **B3** | Needed a bigger car for family trips | "a small van to bring together the whole family on trips" | 8+ seats; no TVs or extras | Yes (Toyota van vs. Honda van) | No way to compare the shortlist | Availability at the nearest dealer |
| **B4** | First-time buyer | "need a car that is easy to drive and navigate new routes" | Safe, comfortable | Yes (Camry) | Can't tell what's affordable on their salary and savings | Their monthly income |
| **B5** | Changed cities and jobs | "I want something under 20k cost" | Safe, no maintenance; never a Kia | No (only looked at Toyota, Honda, Tesla) | Only knew to look at 3 brands | Where should I look? |
| **B6** | "Electric vehicle craze" | "i want to buy an EV" | Extremely safe | No | How Tesla compares with the bZ4X and others | What else I need to run an EV |

Decisions were mostly the buyer's own, discussed with family. 4 of 6 were financing (B1, B2, B4, B6).

Quotes worth keeping:
- "need a car where I can take calls easily while driving" (B1)
- "big enough for family, yet small enough to maneuver to work" (B2)
- "give me all data for comparison across some of the selected models so I can make a decision" (B3)
- "i want an affordable and safe car" (B4)
- "I want something under 20k since I am starting out in this city" (B5)
- "I want to buy an EV but not sure if I can find within my budget" (B6)

## Findings

1. **Affordability is the biggest gap: 4 of 6.** B1 couldn't get a payment until visiting the dealer, B3 found payment answers "hard to find", B4 can't tell what's affordable on their salary, and B6 isn't sure an EV fits their budget. This is the clearest case yet for a lender-built discovery experience.
2. **Safety is the most common must-have: 4 of 6** (B2, B4, B5, B6). RightFit can already filter on standard driver-assist features.
3. **A life change started 5 of 6 searches**, matching the blog letters (12 of 14).
4. **Models and brands matter more than the letters suggested.** 4 of 6 had a model or brand in mind, against 1 of 14 letters. The agent has to handle "like my Camry", "any Toyota" and "never a Kia" well.
5. **"No fancy add-ons": 3 of 6.** Shoppers want base or mid trims. RightFit can't express that yet.
6. **Comparison is a gap: 2 of 6.** After narrowing down, B3 and B6 wanted models side by side.
7. **Needs RightFit has no data for:** Bluetooth or phone calls, navigation, ride comfort, maintenance cost, EV charging, availability near me.

## What it means for the roadmap
- **Move payment and affordability up.** v0.5 (search by monthly payment with editable assumptions) becomes the top priority, plus a "what can I afford?" helper. The shopper enters their own numbers; the agent never infers income or credit.
- **Ask the questions buyers asked for:** budget first, then family size, instead of the generic safety question.
- **Add trim preference** ("no fancy add-ons" → base and mid trims first) and **a compare view** for 2–3 cars.
- **Add data:** CarPlay and Android Auto, built-in navigation, and an EV charging guide.

## Held-out test searches (v0.4)
Written from each buyer's own words. The answer key comes from what *they* said they'd consider, not from me, and these searches were never used to tune the agent.

| ID | Search | A good answer… |
|---|---|---|
| H1 | "need a car that takes me to work and do groceries, good bluetooth for calls, no fancy add-ons" | asks about monthly budget; says it can't check Bluetooth; shows cars like the RAV4, Camry or Pilot |
| H2 | "car for family plus my own use, smooth ride, safe for kids, big enough for family but small enough to drive to work" | no pickups ("never a big truck"); standard collision braking; asks family size; says it can't check ride comfort |
| H3 | "a small van to bring the whole family on trips, at least 8 seats" | only minivans with 8+ seats |
| H4 | "my first car, easy to drive and navigate new routes, safe and comfortable, affordable" | standard collision braking and lane departure; no pickups; asks about budget; says it can't check navigation |
| H5 | "I want something under 20k, safe and low maintenance, Toyota Honda or Tesla, not a Kia" | under $20,000; only Toyota, Honda or Tesla; never a Kia; says it can't check maintenance |
| H6 | "I want to buy an EV, extremely safe, not sure it fits my budget" | only EVs with standard collision braking; asks about budget |
