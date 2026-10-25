"""Generate three synthetic dealer inventory feeds with realistic, *known* data problems.

Every injected problem is logged in data/eval/ground_truth_issues.csv so the pipeline
can be evaluated like a model: how many of the planted issues does it catch?

All vehicles, VINs, dealers and prices are synthetic. Run: python generate_feeds.py
"""
import csv, json, random, datetime as dt
from pathlib import Path

SEED = 20261025
RUN_DATE = dt.date(2026, 10, 25)
ROOT = Path(__file__).parent
REF = ROOT / "data/reference/trims.csv"
FEEDS = ROOT / "data/feeds"
EVAL = ROOT / "data/eval"
rnd = random.Random(SEED)

# ---------- VINs (synthetic, structurally valid, correct check digit) ----------
TRANS = {**{str(d): d for d in range(10)},
         **dict(zip("ABCDEFGH", range(1, 9))), **dict(zip("JKLMN", range(1, 6))), "P": 7, "R": 9,
         **dict(zip("STUVWXYZ", range(2, 10)))}
WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]
VIN_CHARS = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789"
YEAR_CODE = {2019: "K", 2020: "L", 2021: "M", 2022: "N", 2023: "P", 2024: "R", 2025: "S"}
WMI = {"Toyota": ["JTM", "5TD", "4T1", "2T3"], "Honda": ["5J6", "2HG", "5FN"], "Subaru": ["4S4", "JF2"],
       "Mazda": ["JM3", "JM1"], "Kia": ["5XY"], "Hyundai": ["5NM"], "Ford": ["1FT", "3FM"],
       "Chevrolet": ["3GN", "KL7"], "Tesla": ["7SA"]}

def check_digit(vin16):  # vin with '0' placeholder at position 9
    s = sum(TRANS[c] * w for c, w in zip(vin16, WEIGHTS))
    r = s % 11
    return "X" if r == 10 else str(r)

def make_vin(make, year):
    body = rnd.choice(WMI[make]) + "".join(rnd.choice(VIN_CHARS) for _ in range(5))
    tail = YEAR_CODE[year] + rnd.choice(VIN_CHARS) + "".join(rnd.choice("0123456789") for _ in range(6))
    tmp = body + "0" + tail
    return body + check_digit(tmp) + tail

# ---------- reference ----------
trims = list(csv.DictReader(open(REF)))
DEALERS = [("Plano Auto Group", "75093"), ("Frisco Motors", "75034"), ("Richardson Car Co", "75080"),
           ("Allen Pre-Owned", "75013"), ("McKinney Auto Mall", "75070"), ("Dallas North Autos", "75252")]
COLORS = ["White", "Black", "Silver", "Gray", "Blue", "Red", "Green"]

def price_for(t, year, miles):
    base = 22000 + int(t["hp"]) * 65 + int(t["third_row"]) * 7000 + (4000 if t["powertrain"] != "gas" else 0)
    if t["body_type"] == "pickup": base += 9000
    age = RUN_DATE.year - year
    p = base * (0.92 ** age) - miles * 0.05
    return int(round(max(p, 6000) / 100.0) * 100 - 5)

vehicles = []
for i in range(520):
    t = rnd.choice(trims)
    year = rnd.randint(int(t["year_from"]), int(t["year_to"]))
    drive = rnd.choice(t["drivetrains"].split("|"))
    age = max(RUN_DATE.year - year, 0)
    miles = max(800, int(rnd.gauss(12000, 3500) * max(age, 0.3)))
    first_seen = RUN_DATE - dt.timedelta(days=rnd.randint(1, 40))
    vehicles.append(dict(vid=i, make=t["make"], model=t["model"], trim=t["trim"], year=year, drive=drive,
                         body=t["body_type"], miles=miles, price=price_for(t, year, miles),
                         vin=make_vin(t["make"], year), color=rnd.choice(COLORS),
                         dealer=rnd.choice(DEALERS), first_seen=first_seen,
                         last_seen=RUN_DATE - dt.timedelta(days=rnd.randint(0, 3))))

rnd.shuffle(vehicles)
feed_a, feed_b, only_c = vehicles[:200], vehicles[200:370], vehicles[370:]
issues = []  # (feed, listing_id, issue_type)
def log(feed, lid, kind): issues.append((feed, lid, kind))

# ---------- Feed A: dealer DMS export (CSV) ----------
MODEL_ALIASES = {"RAV4": ["RAV-4", "Rav4"], "RAV4 Hybrid": ["RAV4 HV", "Rav4 Hybrid"], "CR-V": ["CRV"],
                 "CX-5": ["CX5"], "F-150": ["F150"], "Highlander Hybrid": ["Highlander HV"],
                 "Grand Highlander": ["Grand-Highlander"], "Corolla Cross": ["CorollaCross"]}
BODY_VOCAB = {"suv": ["SUV", "Sport Utility", "4D Sport Utility"], "sedan": ["Sedan", "4D Sedan"],
              "hatchback": ["Hatchback", "5D Hatchback"], "wagon": ["Wagon", "4D Wagon"],
              "minivan": ["Minivan", "Passenger Van"], "pickup": ["Pickup", "Crew Cab Pickup"]}
WRONG_BODY = {"suv": "wagon", "hatchback": "wagon", "sedan": "hatchback", "wagon": "suv",
              "minivan": "suv", "pickup": "suv"}
DRIVE_WORDS = {"AWD": ["AWD", "All-Wheel Drive"], "4WD": ["4WD", "4x4"], "FWD": ["FWD"], "RWD": ["RWD"]}

with open(FEEDS / "dealer_a_dms.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["StockNo", "VIN", "Year", "Make", "Model", "Trim", "BodyStyle", "Drivetrain", "Price",
                "Mileage", "ExteriorColor", "DealerName", "DealerZip", "LastUpdated"])
    for n, v in enumerate(feed_a):
        lid = f"STK{51000 + n}"; v["a_id"] = lid
        model = v["model"]
        if model in MODEL_ALIASES and rnd.random() < 0.35:
            model = rnd.choice(MODEL_ALIASES[model]); log("A", lid, "model_alias")
        trim, drive = v["trim"], v["drive"]
        if rnd.random() < 0.30:
            trim = f'{v["trim"]} {rnd.choice(DRIVE_WORDS[v["drive"]])}'; drive = ""
            log("A", lid, "drivetrain_in_trim")
        body = v["body"]
        if rnd.random() < 0.05:
            body = WRONG_BODY[body]; log("A", lid, "body_mislabel")
        w.writerow([lid, v["vin"], v["year"], v["make"], model, trim,
                    rnd.choice(BODY_VOCAB[body]), drive, f'${v["price"]:,}', f'{v["miles"]:,} mi', v["color"],
                    v["dealer"][0], v["dealer"][1], v["last_seen"].isoformat()])

# ---------- Feed B: dealer website feed (JSON) ----------
FEATURE_NAMES = {"aeb": ["Pre-Collision System", "Automatic Emergency Braking", "Collision Mitigation Braking"],
                 "ldw": ["Lane Departure Alert", "Lane Departure Warning", "Lane Keeping Assist"],
                 "bsm": ["Blind Spot Monitor", "Blind Spot Information"],
                 "acc": ["Adaptive Cruise Control", "Dynamic Radar Cruise Control"]}
ref_by_key = {(t["make"], t["model"], t["trim"]): t for t in trims}
out = []
for n, v in enumerate(feed_b):
    lid = f"B{n:04d}"; v["b_id"] = lid
    t = ref_by_key[(v["make"], v["model"], v["trim"])]
    drive = v["drive"] if v["drive"] != "4WD" else rnd.choice(["4WD", "4x4"])
    if rnd.random() < 0.25:
        drive = None; log("B", lid, "drivetrain_missing")
    odo = {"value": v["miles"], "unit": "mi"}
    if rnd.random() < 0.08:
        odo = {"value": int(v["miles"] * 1.609), "unit": "km"}; log("B", lid, "odometer_km")
    price = v["price"]
    if rnd.random() < 0.04:
        price = rnd.choice([0, 1]); log("B", lid, "price_placeholder")
    feats = [rnd.choice(FEATURE_NAMES[k]) for k, col in
             [("aeb", "aeb_std"), ("ldw", "lane_departure_std"), ("bsm", "blind_spot_std"), ("acc", "adaptive_cruise_std")]
             if t[col] == "1" and rnd.random() < 0.7]  # dealers list only some features
    body = {"suv": rnd.choice(["suv", "crossover"]), "pickup": "truck"}.get(v["body"], v["body"])
    out.append({"listing_id": lid, "vehicle": {"vin": v["vin"], "ymm": f'{v["year"]} {v["make"]} {v["model"]}',
                "trim": v["trim"].lower()}, "drive": drive, "body": body, "price_usd": price, "odometer": odo,
                "features": feats, "dealer": {"name": v["dealer"][0], "zip": v["dealer"][1]},
                "updated_at": v["last_seen"].isoformat() + "T08:00:00Z"})
json.dump(out, open(FEEDS / "dealer_b_site.json", "w"), indent=1)

# ---------- Feed C: third-party marketplace aggregator (CSV) ----------
TYPOS = {"Highlander": "Highlnader", "Telluride": "Teluride", "Outback": "Outbak", "Sienna": "Siena", "Tacoma": "Tacomma"}
rows = []
dupes = rnd.sample(feed_a + feed_b, 110)
for v in only_c + dupes:
    rows.append(v)
rnd.shuffle(rows)
with open(FEEDS / "aggregator_c.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["source_listing_id", "vin", "year", "make", "model", "trim", "body_type", "price", "miles",
                "seller", "first_seen", "last_seen"])
    for n, v in enumerate(rows):
        lid = f"C{n:04d}"
        is_dupe = "a_id" in v or "b_id" in v
        vin, model, trim, body, price = v["vin"], v["model"], v["trim"], v["body"], v["price"]
        last_seen = v["last_seen"]
        if is_dupe:
            price = v["price"] + rnd.choice([-1000, -500, 0, 500, 750]); log("C", lid, "duplicate_vin")
        if not is_dupe and rnd.random() < 0.12:
            last_seen = RUN_DATE - dt.timedelta(days=rnd.randint(46, 120)); log("C", lid, "stale_listing")
        if rnd.random() < 0.10:
            trim = ""; log("C", lid, "trim_missing")
        if not is_dupe and rnd.random() < 0.05:
            pos = rnd.choice([3, 5, 12, 14]); repl = rnd.choice([c for c in "ABCDEFGHJKLMNPRSTUVWXYZ" if c != vin[pos]])
            vin = vin[:pos] + repl + vin[pos+1:]; log("C", lid, "vin_invalid")
        if rnd.random() < 0.06:
            body = WRONG_BODY[body]; log("C", lid, "body_mislabel")
        if model in TYPOS and rnd.random() < 0.25:
            model = TYPOS[model]; log("C", lid, "model_typo")
        w.writerow([lid, vin, v["year"], v["make"], model, trim, body.title(), price, v["miles"],
                    v["dealer"][0], v["first_seen"].isoformat(), last_seen.isoformat()])

with open(EVAL / "ground_truth_issues.csv", "w", newline="") as f:
    w = csv.writer(f); w.writerow(["feed", "listing_id", "issue_type"]); w.writerows(issues)
with open(EVAL / "ground_truth_vehicles.csv", "w", newline="") as f:
    w = csv.writer(f); w.writerow(["vin", "make", "model", "trim", "year", "drivetrain", "body_type", "miles", "price"])
    for v in vehicles:
        w.writerow([v["vin"], v["make"], v["model"], v["trim"], v["year"], v["drive"], v["body"], v["miles"], v["price"]])

from collections import Counter
print("A", len(feed_a), "B", len(feed_b), "C", len(rows), "unique vehicles", len(vehicles))
print(Counter(k for _, _, k in issues))

# ---------- Feed D: HOLD-OUT dealer, written after the pipeline rules ----------
# Same DMS export format as Feed A, but with problem *variants* the rules were not written for.
# It tests whether the pipeline generalizes; its issues are logged separately.
rnd2 = random.Random(SEED + 1)
hold = []
def hlog(lid, kind): hold.append(("D", lid, kind))
HOLD_ALIASES = {"RAV4 Hybrid": "Rav4 Hyb", "Highlander": "Hilander", "CR-V": "CR V", "Grand Highlander": "Grand Highlandr",
                "Outback": "OUTBACK Wilderness", "Model Y": "Model-Y", "F-150": "F 150"}
HOLD_DRIVE = {"AWD": ["AWD-i", "Symmetrical AWD", "All Wheel Drive"], "4WD": ["4X4", "Four Wheel Drive"]}
vehicles_d = []
for i in range(90):
    t = rnd2.choice(trims)
    year = rnd2.randint(int(t["year_from"]), int(t["year_to"]))
    drive = rnd2.choice(t["drivetrains"].split("|"))
    miles = max(800, int(rnd2.gauss(12000, 3500) * max(RUN_DATE.year - year, 0.3)))
    vehicles_d.append(dict(make=t["make"], model=t["model"], trim=t["trim"], year=year, drive=drive, body=t["body_type"],
                           miles=miles, price=price_for(t, year, miles), vin=None))
with open(FEEDS / "dealer_d_dms.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["StockNo", "VIN", "Year", "Make", "Model", "Trim", "BodyStyle", "Drivetrain", "Price",
                "Mileage", "ExteriorColor", "DealerName", "DealerZip", "LastUpdated"])
    for n, v in enumerate(vehicles_d):
        lid = f"STK{72000 + n}"
        rnd.seed(SEED + 100 + n); vin = make_vin(v["make"], v["year"])
        year, model, trim, drive, body = str(v["year"]), v["model"], v["trim"], v["drive"], v["body"]
        price, miles, updated = f'${v["price"]:,}', f'{v["miles"]:,} mi', (RUN_DATE - dt.timedelta(days=1)).isoformat()
        roll = rnd2.random()
        if model in HOLD_ALIASES and roll < 0.5:
            model = HOLD_ALIASES[model]; hlog(lid, "model_alias_variant")
        if drive in HOLD_DRIVE and rnd2.random() < 0.4:
            trim = f'{trim} {rnd2.choice(HOLD_DRIVE[drive])}'; drive = ""; hlog(lid, "drivetrain_in_trim_variant")
        r = rnd2.random()
        if r < 0.07:
            price = f'${v["price"]:,}.00'; hlog(lid, "price_with_cents")
        elif r < 0.12:
            miles = f'{v["miles"]/1000:.1f}k mi'; hlog(lid, "mileage_in_thousands")
        elif r < 0.17:
            year = year[-2:]; hlog(lid, "two_digit_year")
        elif r < 0.24:
            updated = (RUN_DATE - dt.timedelta(days=rnd2.randint(40, 90))).strftime("%m/%d/%Y"); hlog(lid, "stale_us_date_format")
        elif r < 0.28:
            vin = vin.replace("0", "O", 1) if "0" in vin else vin[:-1] + "O"; hlog(lid, "vin_invalid")
        if rnd2.random() < 0.06:
            body = WRONG_BODY[body]; hlog(lid, "body_mislabel")
        w.writerow([lid, vin, year, v["make"], model, trim,
                    rnd2.choice(BODY_VOCAB[body]), drive, price, miles, rnd2.choice(COLORS),
                    "Garland Auto Outlet", "75040", updated])
with open(EVAL / "ground_truth_holdout_vehicles.csv", "w", newline="") as f:
    w = csv.writer(f); w.writerow(["listing_id", "make", "model", "trim", "year", "drivetrain", "body_type", "miles", "price"])
    for n, v in enumerate(vehicles_d):
        w.writerow([f"STK{72000 + n}", v["make"], v["model"], v["trim"], v["year"], v["drive"], v["body"], v["miles"], v["price"]])
with open(EVAL / "ground_truth_holdout.csv", "w", newline="") as f:
    w = csv.writer(f); w.writerow(["feed", "listing_id", "issue_type"]); w.writerows(hold)
print("holdout D", len(vehicles_d), Counter(k for _, _, k in hold))
