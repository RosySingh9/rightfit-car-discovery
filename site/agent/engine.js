/* RightFit engine: intent in, ranked and explained cars out.
   Plain code on purpose: every result and every "why" line comes from listing data, never from the model.
   Works in the browser (window.RightFit) and in Node (require). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RightFit = factory();
})(typeof self !== "undefined" ? self : this, function () {

  // Illustrative financing assumptions, always shown next to any payment.
  const FINANCE = { down_pct: 0.10, apr: 0.079, months: 60 };
  function estPayment(price) {
    const P = price * (1 - FINANCE.down_pct), r = FINANCE.apr / 12, n = FINANCE.months;
    return Math.round(P * r / (1 - Math.pow(1 + r, -n)));
  }

  function toCars(inv) {
    return inv.rows.map((row) => Object.fromEntries(inv.cols.map((c, i) => [c, row[i]])));
  }

  const lower = (a) => (a || []).map((x) => String(x).toLowerCase());

  // Each hard constraint: a label for the chip, and a test. A missing value never passes.
  function constraintList(h) {
    const out = [];
    const add = (key, label, test) => out.push({ key, label, test });
    const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
    if (h.price_max != null) add("price_max", `Under ${money(h.price_max)}`, (c) => c.price <= h.price_max);
    if (h.price_min != null) add("price_min", `Over ${money(h.price_min)}`, (c) => c.price >= h.price_min);
    if (h.monthly_payment_max != null) add("monthly_payment_max", `About ${money(h.monthly_payment_max)}/mo or less`, (c) => estPayment(c.price) <= h.monthly_payment_max);
    if (h.year_min != null) add("year_min", `${h.year_min} or newer`, (c) => c.year >= h.year_min);
    if (h.miles_max != null) add("miles_max", `Under ${Math.round(h.miles_max).toLocaleString("en-US")} miles`, (c) => c.miles <= h.miles_max);
    if (h.hp_min != null) add("hp_min", `${h.hp_min}+ hp`, (c) => c.hp != null && c.hp >= h.hp_min);
    if (h.tow_min_lbs != null) add("tow_min_lbs", `Tows ${Math.round(h.tow_min_lbs).toLocaleString("en-US")}+ lb`, (c) => c.tow_lbs != null && c.tow_lbs >= h.tow_min_lbs);
    if (h.ev_range_min != null) add("ev_range_min", `${h.ev_range_min}+ mile range`, (c) => c.ev_range != null && c.ev_range >= h.ev_range_min);
    if (h.mpg_min != null) add("mpg_min", `${h.mpg_min}+ mpg`, (c) => (c.mpg != null && c.mpg >= h.mpg_min) || c.powertrain === "electric");
    if (h.cargo_min_cuft != null) add("cargo_min_cuft", `${h.cargo_min_cuft}+ cu ft cargo`, (c) => c.cargo_cuft != null && c.cargo_cuft >= h.cargo_min_cuft);
    if (h.seats_min != null) add("seats_min", `${h.seats_min}+ seats`, (c) => c.seats != null && c.seats >= h.seats_min);
    if (h.third_row === true) add("third_row", "Third row", (c) => c.third_row === 1);
    if (h.third_row === false) add("third_row", "No third row", (c) => c.third_row === 0);
    if (h.transmission) add("transmission", h.transmission === "manual" ? "Manual" : "Automatic", (c) => c.transmission === h.transmission);
    if ((h.body_types || []).length) add("body_types", h.body_types.map(cap).join(" or "), (c) => lower(h.body_types).includes(c.body_type));
    if ((h.exclude_body_types || []).length) add("exclude_body_types", "Not " + h.exclude_body_types.map(cap).join(" or "), (c) => c.body_type && !lower(h.exclude_body_types).includes(c.body_type));
    if ((h.drivetrains || []).length) add("drivetrains", h.drivetrains.join(" or "), (c) => c.drivetrain != null && h.drivetrains.includes(c.drivetrain));
    if ((h.powertrains || []).length) add("powertrains", h.powertrains.map(cap).join(" or "), (c) => h.powertrains.includes(c.powertrain));
    if ((h.exclude_powertrains || []).length) add("exclude_powertrains", "Not " + h.exclude_powertrains.join(" or "), (c) => !h.exclude_powertrains.includes(c.powertrain));
    if ((h.makes || []).length) add("makes", h.makes.join(" or "), (c) => lower(h.makes).includes(c.make.toLowerCase()));
    if ((h.exclude_makes || []).length) add("exclude_makes", "Not " + h.exclude_makes.join(" or "), (c) => !lower(h.exclude_makes).includes(c.make.toLowerCase()));
    if ((h.models || []).length) add("models", h.models.join(" or "), (c) => lower(h.models).includes(c.model.toLowerCase()));
    const F = { aeb: "Collision braking", lane_departure: "Lane departure", blind_spot: "Blind-spot monitor", adaptive_cruise: "Adaptive cruise" };
    for (const f of h.features || []) add("feature:" + f, F[f] || f, (c) => c[f] === 1);
    return out;
  }
  function cap(s) { return s === "suv" ? "SUV" : s.charAt(0).toUpperCase() + s.slice(1); }

  // When nothing matches, loosen the least important constraints one at a time and say so.
  const RELAX = ["miles_max", "year_min", "mpg_min", "cargo_min_cuft", "price_max", "monthly_payment_max", "hp_min", "feature:blind_spot", "feature:adaptive_cruise", "powertrains"];

  const SORT_FNS = {
    price_low: (c) => c.price, miles_low: (c) => c.miles, newest: (c) => -c.year,
    mpg_high: (c) => -(c.powertrain === "electric" ? 100 : (c.mpg || 0)), hp_high: (c) => -(c.hp || 0),
    cargo_high: (c) => -(c.cargo_cuft || 0), tow_high: (c) => -(c.tow_lbs || 0), range_high: (c) => -(c.ev_range || 0),
    safety_features: (c) => -((c.aeb || 0) + (c.lane_departure || 0) + (c.blind_spot || 0) + (c.adaptive_cruise || 0))
  };

  function rank(cars, sortBy) {
    const keys = [...(sortBy || []).filter((k) => SORT_FNS[k]), "price_low", "miles_low"];
    return cars.slice().sort((a, b) => {
      for (const k of keys) { const d = SORT_FNS[k](a) - SORT_FNS[k](b); if (d) return d; }
      return 0;
    });
  }

  function why(c, h, sortBy) {
    const bits = [];
    const fmt = (n) => Math.round(n).toLocaleString("en-US");
    if (h.third_row || (h.seats_min != null)) bits.push(`${c.seats} seats`);
    if ((h.drivetrains || []).length && c.drivetrain) bits.push(c.drivetrain);
    if (h.tow_min_lbs != null || (sortBy || []).includes("tow_high")) bits.push(`tows ${fmt(c.tow_lbs)} lb`);
    if (h.hp_min != null || (sortBy || []).includes("hp_high")) bits.push(`${c.hp} hp`);
    if (c.powertrain === "electric" && (h.ev_range_min != null || (h.powertrains || []).includes("electric"))) bits.push(`${c.ev_range}-mile range`);
    if (c.powertrain !== "electric" && (h.mpg_min != null || (sortBy || []).includes("mpg_high") || (h.powertrains || []).length)) bits.push(`${c.mpg} mpg`);
    if (h.cargo_min_cuft != null || (sortBy || []).includes("cargo_high")) bits.push(`${c.cargo_cuft} cu ft cargo`);
    if ((h.features || []).includes("aeb") || (sortBy || []).includes("safety_features")) bits.push("collision braking standard");
    if ((h.features || []).includes("lane_departure")) bits.push("lane departure standard");
    if ((h.features || []).includes("blind_spot")) bits.push("blind-spot monitor standard");
    if (h.monthly_payment_max != null) bits.push(`about $${fmt(estPayment(c.price))}/mo*`);
    if (h.miles_max != null || (sortBy || []).includes("miles_low")) bits.push(`${fmt(c.miles)} miles`);
    if (!bits.length) bits.push(`${fmt(c.miles)} miles`, c.powertrain);
    return bits.join(" · ");
  }

  function facets(cars) {
    const count = (fn) => { const m = {}; for (const c of cars) { const k = fn(c); if (k != null) m[k] = (m[k] || 0) + 1; } return Object.entries(m).sort((a, b) => b[1] - a[1]); };
    const band = (p) => p < 20000 ? "Under $20k" : p < 30000 ? "$20–30k" : p < 40000 ? "$30–40k" : "$40k+";
    return {
      body_type: count((c) => c.body_type ? cap(c.body_type) : null),
      drivetrain: count((c) => c.drivetrain || "Unknown"),
      powertrain: count((c) => cap(c.powertrain)),
      price: count((c) => band(c.price))
    };
  }

  function search(cars, intent) {
    const h = JSON.parse(JSON.stringify(intent.hard || {}));
    // v0.3.1 guard: a drivetrain filter that lists every drivetrain only hides listings with unknown drivetrain.
    if ((h.drivetrains || []).length >= 4) h.drivetrains = [];
    let cons = constraintList(h);
    let matches = cars.filter((c) => cons.every((k) => k.test(c)));
    const relaxed = [];
    if (!matches.length && cons.length) {
      for (const key of RELAX) {
        if (!cons.some((k) => k.key === key)) continue;
        const dropped = cons.find((k) => k.key === key);
        const trial = cons.filter((k) => k.key !== key);
        const m = cars.filter((c) => trial.every((k) => k.test(c)));
        relaxed.push(dropped.label);
        cons = trial;
        if (m.length) { matches = m; break; }
      }
    }
    // Drivetrain is unknown on some listings: say how many we couldn't check.
    let unknownDrive = 0;
    if ((h.drivetrains || []).length) {
      const others = constraintList(h).filter((k) => k.key !== "drivetrains");
      unknownDrive = cars.filter((c) => c.drivetrain == null && others.every((k) => k.test(c))).length;
    }
    const ranked = rank(matches, intent.sort_by);
    return {
      constraints: constraintList(h).map(({ key, label }) => ({ key, label })),
      relaxed,
      count: ranked.length,
      results: ranked.map((c) => ({ car: c, why: why(c, h, intent.sort_by), payment: estPayment(c.price) })),
      facets: facets(ranked),
      unknownDrive
    };
  }

  // Remove one constraint (when a shopper clicks the x on a chip) without calling the model again.
  function withoutConstraint(intent, key) {
    const i = JSON.parse(JSON.stringify(intent)), h = i.hard;
    if (key.startsWith("feature:")) h.features = h.features.filter((f) => "feature:" + f !== key);
    else if (Array.isArray(h[key])) h[key] = [];
    else h[key] = null;
    return i;
  }

  // ---------- Gold set: the 20 v0.1 audit queries, each with a test written independently of the model ----------
  // A car "fits" when it meets every hard constraint the shopper stated. Same definition used to score CarMax in v0.1.
  const GOLD = [
    { id: "Q01", style: "need", allowed: ["price_max", "third_row", "body_types", "exclude_body_types", "seats_min"], q: "3 row SUV under $45k not a minivan", fit: (c) => c.body_type === "suv" && c.third_row === 1 && c.price <= 45000 },
    { id: "Q02", style: "spec", allowed: ["body_types", "drivetrains", "price_max"], q: "fun AWD sedan for snowy commute under $25k", fit: (c) => c.body_type === "sedan" && c.drivetrain === "AWD" && c.price <= 25000 },
    { id: "Q03", style: "need", allowed: ["feature:aeb", "feature:lane_departure", "price_max"], q: "first car for teen with automatic emergency braking and lane departure warning under $20k", fit: (c) => c.aeb === 1 && c.lane_departure === 1 && c.price <= 20000 },
    { id: "Q04", style: "need", allowed: ["body_types", "hp_min", "price_max", "year_min"], q: "sports sedan 300 hp under $30k 2022 or newer", fit: (c) => c.body_type === "sedan" && c.hp >= 300 && c.price <= 30000 && c.year >= 2022 },
    { id: "Q05", style: "need", allowed: ["body_types"], q: "quiet luxury sedan with massaging seats", fit: null, note: "Massaging seats aren't in any feed: scored on whether RightFit says so." , expectUnsupported: /massag/i },
    { id: "Q06", style: "need", allowed: ["drivetrains", "body_types", "tow_min_lbs", "price_max"], q: "reliable AWD wagon that can tow a small trailer under $20k", fit: (c) => c.body_type === "wagon" && c.drivetrain === "AWD" && c.tow_lbs >= 1500 && c.price <= 20000 },
    { id: "Q07", style: "need", allowed: ["mpg_min", "miles_max", "price_max"], q: "reliable car good gas mileage leather seats low miles under $20k", fit: (c) => c.mpg >= 30 && c.miles <= 50000 && c.price <= 20000, expectUnsupported: /leather/i },
    { id: "Q08", style: "need", allowed: ["body_types", "tow_min_lbs", "price_max"], q: "SUV that can tow a car and fits in a garage under $20k", fit: (c) => c.body_type === "suv" && c.tow_lbs >= 3500 && c.price <= 20000 },
    { id: "Q09", style: "need", allowed: ["drivetrains", "tow_min_lbs", "price_max", "body_types"], q: "4x4 for camping that can tow a trailer under $40k", fit: (c) => ["4WD", "AWD"].includes(c.drivetrain) && c.tow_lbs >= 3500 && c.price <= 40000 },
    { id: "Q10", style: "need", allowed: ["transmission", "body_types", "price_max"], q: "reliable automatic hatchback under $20k room for 2 dogs", fit: (c) => c.body_type === "hatchback" && c.transmission === "automatic" && c.price <= 20000 },
    { id: "Q11", style: "need", allowed: ["powertrains", "cargo_min_cuft", "price_max", "exclude_body_types", "body_types"], q: "quiet hybrid that fits a stroller and is easy to park under $50k", fit: (c) => ["hybrid", "plug-in hybrid"].includes(c.powertrain) && c.cargo_cuft >= 20 && !["pickup", "minivan"].includes(c.body_type) && c.price <= 50000 },
    { id: "Q12", style: "need", allowed: ["powertrains", "cargo_min_cuft", "third_row", "price_max", "seats_min"], q: "eco friendly family car for twins and a double stroller under $25k", fit: (c) => ["hybrid", "plug-in hybrid", "electric"].includes(c.powertrain) && (c.third_row === 1 || c.cargo_cuft >= 35) && c.price <= 25000 },
    { id: "Q13", style: "spec", allowed: ["models", "makes", "powertrains", "price_max"], q: "RAV4 hybrid under $30k", fit: (c) => ["RAV4 Hybrid", "RAV4 Prime"].includes(c.model) && c.price <= 30000 },
    { id: "Q14", style: "need", allowed: ["models", "makes", "powertrains"], q: "Highlander hybrid or Grand Highlander", fit: (c) => ["Highlander Hybrid", "Grand Highlander", "Grand Highlander Hybrid"].includes(c.model) },
    { id: "Q15", style: "need", allowed: ["monthly_payment_max"], q: "car under $400 a month", fit: (c) => estPayment(c.price) <= 400, note: "Scored on the stated finance assumptions (10% down, 60 months, 7.9% APR)." },
    { id: "Q16", style: "need", expectClarify: true, allowed: ["feature:aeb", "feature:lane_departure", "feature:blind_spot", "feature:adaptive_cruise"], q: "safe car for my teenager", fit: (c) => c.aeb === 1 && c.lane_departure === 1 && c.blind_spot === 1 },
    { id: "Q17", style: "need", allowed: ["body_types", "tow_min_lbs"], q: "truck that can tow 7000 lbs", fit: (c) => c.body_type === "pickup" && c.tow_lbs >= 7000 },
    { id: "Q18", style: "need", allowed: ["powertrains", "body_types", "ev_range_min"], q: "electric SUV with 300 miles of range", fit: (c) => c.powertrain === "electric" && c.body_type === "suv" && c.ev_range >= 300 },
    { id: "Q19", style: "spec", allowed: ["body_types", "drivetrains"], q: "minivan with AWD", fit: (c) => c.body_type === "minivan" && c.drivetrain === "AWD" },
    { id: "Q20", style: "spec", allowed: ["makes", "third_row", "mpg_min", "powertrains"], q: "Toyota with third row and good gas mileage", fit: (c) => c.make === "Toyota" && c.third_row === 1 && c.mpg >= 30 }
  ];


  // ---------- Held-out set (v0.4): 6 buyer interviews. Searches in the buyer's words; answer keys from what THEY said. ----------
  // Never used to tune the prompt. Run once and publish whatever comes back.
  const BUDGET_Q = /budget|month|afford|spend|price|payment/i;
  const HOLDOUT = [
    { id: "H1", style: "buyer", q: "need a car that takes me to work and do groceries, good bluetooth for calls, no fancy add-ons",
      fit: (c) => ["sedan", "suv", "hatchback"].includes(c.body_type), named: ["RAV4", "RAV4 Hybrid", "Camry", "Pilot"],
      expectAsk: BUDGET_Q, expectUnsupported: /bluetooth|carplay|phone|call/i },
    { id: "H2", style: "buyer", q: "car for family plus my own use, smooth ride, safe for kids, big enough for family but small enough to drive to work",
      fit: (c) => c.body_type !== "pickup" && c.aeb === 1, never: (c) => c.body_type === "pickup",
      expectAsk: /family|people|kids|seat|how many/i, expectUnsupported: /ride|smooth|comfort/i },
    { id: "H3", style: "buyer", q: "a small van to bring the whole family on trips, at least 8 seats",
      fit: (c) => c.body_type === "minivan" && c.seats >= 8 },
    { id: "H4", style: "buyer", q: "my first car, easy to drive and navigate new routes, safe and comfortable, affordable",
      fit: (c) => c.aeb === 1 && c.lane_departure === 1 && c.body_type !== "pickup",
      expectAsk: BUDGET_Q, expectUnsupported: /navigat/i },
    { id: "H5", style: "buyer", q: "I want something under 20k, safe and low maintenance, Toyota Honda or Tesla, not a Kia",
      fit: (c) => c.price <= 20000 && ["Toyota", "Honda", "Tesla"].includes(c.make) && c.aeb === 1, never: (c) => c.make === "Kia",
      expectUnsupported: /maint|reliab/i },
    { id: "H6", style: "buyer", q: "I want to buy an EV, extremely safe, not sure it fits my budget",
      fit: (c) => c.powertrain === "electric" && c.aeb === 1, expectAsk: BUDGET_Q }
  ];

  // Score one query: of the top 5 results, how many fit? If the inventory holds fewer than 5 fitting cars, the bar is that number.
  function scoreQuery(gold, cars, out, intent) {
    const row = { id: gold.id, style: gold.style, q: gold.q, results: out.count, relaxed: out.relaxed.length > 0 };
    // v0.3.1: stricter checks the top-5 score can't see
    row.extraFilters = gold.allowed ? out.constraints.filter((c) => !gold.allowed.includes(c.key)).map((c) => c.label) : [];
    // v0.4.1: buyers said budget is the question they want asked, so a question is "unneeded" only when the shopper already gave a budget.
    const hb = intent.hard || {};
    const gaveBudget = hb.price_max != null || hb.monthly_payment_max != null;
    row.unneededQuestion = !!intent.needs_clarification && !gold.expectClarify && !gold.expectAsk && gaveBudget;
    if (gold.expectUnsupported) row.flaggedUnsupported = (intent.unsupported || []).some((u) => gold.expectUnsupported.test(u));
    if (gold.expectAsk) row.askedRight = !!intent.needs_clarification && gold.expectAsk.test((intent.clarifying_question || "") + " " + (intent.clarify_options || []).join(" "));
    if (gold.never) row.respectedNever = !out.results.slice(0, 5).some((r) => gold.never(r.car));
    if (gold.named) row.showedNamed = out.results.slice(0, 5).some((r) => gold.named.includes(r.car.model));
    if (!gold.fit) { row.scored = false; return row; }
    const available = cars.filter(gold.fit).length;
    const top = out.results.slice(0, 5).map((r) => r.car);
    row.available = available;
    if (!row.relaxed && available) row.recall = out.results.filter((r) => gold.fit(r.car)).length / available;
    row.slots = Math.min(5, available);
    row.fit = top.filter(gold.fit).length;
    row.scored = row.slots > 0;
    return row;
  }

  return { FINANCE, estPayment, toCars, search, rank, facets, constraintList, withoutConstraint, GOLD, HOLDOUT, scoreQuery };
});
