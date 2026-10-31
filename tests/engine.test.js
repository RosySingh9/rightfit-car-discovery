// Deterministic tests for the RightFit engine. No model calls, no API key: they run on every push.
// Run locally with: node --test tests/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../site/agent/engine.js");
const cars = E.toCars(require("../site/data/inventory.json"));

const blank = () => ({ price_max: null, price_min: null, monthly_payment_max: null, year_min: null, miles_max: null, hp_min: null,
  tow_min_lbs: null, ev_range_min: null, mpg_min: null, cargo_min_cuft: null, seats_min: null, third_row: null, transmission: null,
  body_types: [], exclude_body_types: [], drivetrains: [], powertrains: [], exclude_powertrains: [], makes: [], exclude_makes: [], models: [], features: [] });
const run = (hard, extra = {}) => E.search(cars, { hard: { ...blank(), ...hard }, sort_by: [], unsupported: [], ...extra });

test("'not a minivan' never returns a minivan (the v0.1 CarMax failure)", () => {
  const out = run({ third_row: true, exclude_body_types: ["minivan"], price_max: 45000 });
  assert.ok(out.count > 0);
  assert.ok(out.results.every((r) => r.car.body_type !== "minivan"));
});

test("every result meets every applied filter", () => {
  const out = run({ body_types: ["pickup"], tow_min_lbs: 7000 });
  assert.ok(out.count > 0);
  assert.ok(out.results.every((r) => r.car.body_type === "pickup" && r.car.tow_lbs >= 7000));
});

test("'why this car' only states facts from the listing", () => {
  const out = run({ body_types: ["pickup"], tow_min_lbs: 7000 });
  for (const r of out.results) assert.match(r.why, new RegExp(`tows ${r.car.tow_lbs.toLocaleString("en-US")} lb`));
});

test("no exact match: loosens, says what it loosened, and still shows cars", () => {
  const out = run({ body_types: ["sedan"], drivetrains: ["AWD"], price_max: 15000 });
  assert.ok(out.relaxed.length > 0);
  assert.ok(out.count > 0);
});

test("a drivetrain filter listing every drivetrain doesn't hide unknown-drivetrain cars", () => {
  const all = run({ powertrains: ["electric"], body_types: ["suv"], ev_range_min: 300 });
  const listed = run({ powertrains: ["electric"], body_types: ["suv"], ev_range_min: 300, drivetrains: ["AWD", "4WD", "FWD", "RWD"] });
  assert.equal(listed.count, all.count);
});

test("removing a filter chip removes exactly that filter", () => {
  const intent = { hard: { ...blank(), price_max: 30000, third_row: true }, sort_by: [] };
  const after = E.withoutConstraint(intent, "price_max");
  assert.equal(after.hard.price_max, null);
  assert.equal(after.hard.third_row, true);
});

test("payment math: the affordability helper and the payment estimate agree", () => {
  E.setFinance(E.DEFAULT_FINANCE);
  for (const m of [250, 400, 650]) assert.ok(Math.abs(E.estPayment(E.maxPriceFor(m)) - m) <= 1);
  E.setFinance({ apr: 0, months: 60, down_pct: 0, trade_in: 0 });
  assert.equal(E.estPayment(30000), 500);
  E.setFinance({ trade_in: 40000 });
  assert.equal(E.estPayment(30000), 0);
  E.setFinance(E.DEFAULT_FINANCE);
});

test("a monthly budget filters on the estimated payment", () => {
  E.setFinance(E.DEFAULT_FINANCE);
  const out = run({ monthly_payment_max: 400 });
  assert.ok(out.count > 0);
  assert.ok(out.results.every((r) => E.estPayment(r.car.price) <= 400));
});

test("budget is never shown as something RightFit 'can't check'", () => {
  const out = run({}, { unsupported: ["budget details", "Bluetooth for calls"] });
  assert.deepEqual(out.unsupported, ["Bluetooth for calls"]);
});

test("'no fancy add-ons' ranks base trims first", () => {
  const out = E.search(cars, { hard: blank(), sort_by: ["base_trim", "price_low"], unsupported: [] });
  assert.equal(out.results[0].car.trim_tier, "base");
});

test("responsible ranking: nothing outside the stated intent changes the order", () => {
  const intent = { hard: { ...blank(), body_types: ["suv"] }, sort_by: ["mpg_high"], unsupported: [] };
  const a = E.search(cars, intent).results.map((r) => r.car.id);
  const withProfile = { ...intent, shopper: { zip: "75093", age: 34, income: 90000 }, dealer_boost: { "Plano Auto Group": 10 } };
  const b = E.search(cars, withProfile).results.map((r) => r.car.id);
  assert.deepEqual(b, a);
  assert.match(E.explainOrder(intent.sort_by), /no paid placement and nothing about you/);
});

test("every held-out buyer search has at least one car in stock that fits", () => {
  for (const g of E.HOLDOUT) assert.ok(cars.some(g.fit), g.id);
});

test("budget trade-off: when loosening is needed, name the cheapest car that keeps everything but the budget", () => {
  E.setFinance(E.DEFAULT_FINANCE);
  const out = run({ year_min: 2023, monthly_payment_max: 400 });
  assert.ok(out.tradeoff, "expected a trade-off");
  assert.ok(out.tradeoff.car.year >= 2023);
  assert.ok(out.tradeoff.payment > 400);
  assert.ok(out.results.every((r) => E.estPayment(r.car.price) <= 400), "results stay within budget");
});

test("'new' read as newest-first within budget names one step up", () => {
  E.setFinance(E.DEFAULT_FINANCE);
  const out = E.search(cars, { hard: { ...blank(), monthly_payment_max: 400 }, sort_by: ["newest"], unsupported: [] });
  assert.ok(out.stretch);
  assert.ok(out.stretch.car.year > out.stretch.newestShown);
});
