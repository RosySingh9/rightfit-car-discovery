// The intent contract: what the model must return for one shopper message.
// The model only *understands* the request. Filtering, ranking and explanations
// happen in plain code (engine.js), so the model can't invent a car or a spec.

const BODY = ["suv", "sedan", "hatchback", "wagon", "minivan", "pickup"];
const DRIVE = ["AWD", "4WD", "FWD", "RWD"];
const POWER = ["gas", "hybrid", "plug-in hybrid", "electric"];
const FEATURES = ["aeb", "lane_departure", "blind_spot", "adaptive_cruise"];
const SORTS = ["price_low", "miles_low", "newest", "mpg_high", "hp_high", "cargo_high", "tow_high", "range_high", "safety_features"];

const num = { type: ["number", "null"] };
const list = (items) => ({ type: "array", items });

const INTENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["understood", "hard", "sort_by", "unsupported", "needs_clarification", "clarifying_question", "clarify_options"],
  properties: {
    understood: { type: "string", description: "One short sentence restating what the shopper wants, in plain words." },
    hard: {
      type: "object",
      additionalProperties: false,
      required: ["price_max", "price_min", "monthly_payment_max", "year_min", "miles_max", "hp_min", "tow_min_lbs",
                 "ev_range_min", "mpg_min", "cargo_min_cuft", "seats_min", "third_row", "transmission",
                 "body_types", "exclude_body_types", "drivetrains", "powertrains", "exclude_powertrains",
                 "makes", "exclude_makes", "models", "features"],
      properties: {
        price_max: num, price_min: num, monthly_payment_max: num, year_min: num, miles_max: num,
        hp_min: num, tow_min_lbs: num, ev_range_min: num, mpg_min: num, cargo_min_cuft: num, seats_min: num,
        third_row: { type: ["boolean", "null"] },
        transmission: { type: ["string", "null"], enum: ["automatic", "manual", null] },
        body_types: list({ type: "string", enum: BODY }),
        exclude_body_types: list({ type: "string", enum: BODY }),
        drivetrains: list({ type: "string", enum: DRIVE }),
        powertrains: list({ type: "string", enum: POWER }),
        exclude_powertrains: list({ type: "string", enum: POWER }),
        makes: list({ type: "string" }),
        exclude_makes: list({ type: "string" }),
        models: list({ type: "string" }),
        features: list({ type: "string", enum: FEATURES })
      }
    },
    sort_by: list({ type: "string", enum: SORTS }),
    unsupported: list({ type: "string" }),
    needs_clarification: { type: "boolean" },
    clarifying_question: { type: ["string", "null"] },
    clarify_options: list({ type: "string" })
  }
};

function systemPrompt(catalog) {
  return `You turn one car shopper's message into a structured search intent for a used-car inventory.
You only extract intent. You never recommend specific cars and never state specs.

Inventory fields you can filter on: price, monthly payment (estimated), year, miles, body type (${BODY.join(", ")}),
drivetrain (${DRIVE.join(", ")}), powertrain (${POWER.join(", ")}), seats, third row, transmission, horsepower,
tow rating (lbs), cargo space behind 2nd row (cu ft), combined mpg, EV range (miles),
standard driver-assist features (${FEATURES.join(", ")}).

Makes and models in stock (use these exact spellings in "makes" and "models"):
${catalog}

Rules:
- Put only explicit requirements in "hard". Leave a field null or [] when the shopper didn't ask for it.
  Never add a filter the shopper didn't ask for: no fuel type unless they name one (gas, hybrid, electric, eco friendly),
  no drivetrain unless they ask for one, no mpg unless they mention fuel economy, no cargo size unless they mention cargo,
  a stroller, luggage or "room for" a specific item. Never list every value of a field; leave it empty instead.
- Negation goes in the exclude lists: "not a minivan" -> exclude_body_types ["minivan"]. Never put an excluded value in an include list.
- Hybrid versions are separate models: "RAV4 hybrid" -> models ["RAV4 Hybrid"]; "Highlander hybrid or Grand Highlander" -> models ["Highlander Hybrid", "Grand Highlander", "Grand Highlander Hybrid"].
- A model name alone (e.g. "RAV4") means that model only, not its hybrid sibling, unless the shopper says otherwise.
- "AWD", "all-wheel drive", "good in snow" -> drivetrains ["AWD", "4WD"]. "4x4", "four-wheel drive", "off-road" -> drivetrains ["4WD", "AWD"].
- Money: "$45k" = 45000. "under $400 a month" -> monthly_payment_max 400 (not price_max).
- Useful translations: "3 row", "7 seats", "third row" -> third_row true; "good gas mileage", "fuel efficient" -> mpg_min 30;
  "eco friendly" -> powertrains ["hybrid", "plug-in hybrid", "electric"]; "low miles" -> miles_max 50000;
  "tow a small trailer" -> tow_min_lbs 1500; "tow a car" -> tow_min_lbs 3500; "fits a stroller" -> cargo_min_cuft 20;
  "double stroller" or "twins" -> cargo_min_cuft 35; "sports sedan" -> hp_min 250 unless a number is given;
  "room for dogs" or "roomy" -> sort_by cargo_high (not a cargo filter);
  "newer" -> year_min 2023; "automatic emergency braking" or "collision braking" -> features ["aeb"]; "lane departure" -> features ["lane_departure"].
- "safe car" (no specifics) -> features ["aeb", "lane_departure", "blind_spot"].
- Subjective words are never hard filters. They go in sort_by when they map to data ("cheap" -> price_low, "fun", "fast" or "powerful" -> hp_high,
  "roomy" -> cargo_high, "efficient" -> mpg_high, "safe" -> safety_features, "low miles" -> miles_low, "newer" -> newest).
- Anything the shopper asked for that the data can't check (leather, massaging seats, luxury, quiet cabin, reliability ratings,
  crash-test scores, vehicle dimensions or garage fit, easy to park, insurance cost, colors) goes in "unsupported" as a short phrase,
  e.g. "massaging seats". Only things the shopper asked for: never missing details, advice or instructions.
- needs_clarification = true only when the message is too vague to search well: no budget, no body type, no model and no clear use,
  e.g. "safe car for my teenager" or "something reliable". Clear requests ("minivan with AWD", "car under $400 a month",
  "luxury sedan with massaging seats") don't need a question: set needs_clarification false, clarifying_question null, clarify_options []. Still fill in your best-guess constraints so results can be shown,
  and ask ONE short question with 2-4 short answer options in clarify_options.
- "understood" is one plain sentence, e.g. "A 3-row SUV (not a minivan) under $45,000."`;
}

module.exports = { INTENT_SCHEMA, systemPrompt, BODY, DRIVE, POWER, FEATURES, SORTS };
