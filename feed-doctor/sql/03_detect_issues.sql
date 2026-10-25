-- 03 · Detect data issues per listing. One row per (feed, listing_id, issue_type).
-- Issue names match data/eval/ground_truth_issues.csv so detection can be scored.

CREATE OR REPLACE TABLE ref_by_trim AS
SELECT make, model, trim, CAST(year_from AS INT) AS year_from, CAST(year_to AS INT) AS year_to, body_type, drivetrains
FROM ref_trims;

CREATE OR REPLACE TABLE detected_issues AS
WITH n AS (
  SELECT n.*, r.body_type AS body_ref, r.drivetrains AS drive_options
  FROM norm_listings n
  LEFT JOIN ref_by_trim r ON r.make = n.make AND r.model = n.model AND r.trim = n.trim
                         AND n.year BETWEEN r.year_from AND r.year_to
), dup AS (  -- same VIN listed more than once: keep the dealer's own listing, flag the re-list
  SELECT feed, listing_id FROM (
    SELECT feed, listing_id, row_number() OVER (PARTITION BY vin ORDER BY source_priority, last_seen DESC, feed) AS rk
    FROM n WHERE vin_check_ok(vin)
  ) WHERE rk > 1
)
SELECT feed, listing_id, 'model_alias' AS issue_type FROM n WHERE model_match = 'exact' AND model_raw <> model
UNION ALL SELECT feed, listing_id, 'model_typo'          FROM n WHERE model_match = 'fuzzy'
UNION ALL SELECT feed, listing_id, 'model_unmatched'     FROM n WHERE model IS NULL
UNION ALL SELECT feed, listing_id, 'drivetrain_in_trim'  FROM n WHERE drive_raw IS NULL AND drive_from_trim IS NOT NULL
UNION ALL SELECT feed, listing_id, 'drivetrain_missing'  FROM n WHERE feed = 'B' AND drive_raw IS NULL AND drive_from_trim IS NULL
UNION ALL SELECT feed, listing_id, 'trim_missing'        FROM n WHERE trim_raw IS NULL
UNION ALL SELECT feed, listing_id, 'trim_unmatched'      FROM n WHERE trim_raw IS NOT NULL AND trim IS NULL
UNION ALL SELECT feed, listing_id, 'body_mislabel'       FROM n WHERE body_feed IS NOT NULL AND body_ref IS NOT NULL AND body_feed <> body_ref
UNION ALL SELECT feed, listing_id, 'odometer_km'         FROM n WHERE odometer_unit = 'km'
UNION ALL SELECT feed, listing_id, 'price_placeholder'   FROM n WHERE price IS NULL OR price < 1000
UNION ALL SELECT feed, listing_id, 'stale_listing'       FROM n WHERE last_seen < DATE '2026-10-25' - INTERVAL 30 DAY
UNION ALL SELECT feed, listing_id, 'vin_invalid'         FROM n WHERE NOT vin_check_ok(vin)
UNION ALL SELECT feed, listing_id, 'duplicate_vin'       FROM dup;
