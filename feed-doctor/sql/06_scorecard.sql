-- 06 · Scorecard. "Before" asks: could a search filter use this field exactly as the feed sent it?
-- "After" asks the same of the cleaned, enriched inventory the agent will search.

CREATE OR REPLACE TABLE before_fields AS
SELECT s.feed, s.listing_id,
  vin_check_ok(s.vin)                                                            AS vin,
  s.year IS NOT NULL AND s.year > 1990                                           AS year,
  s.make IN (SELECT make FROM ref_trims)                                         AS make,
  s.model_raw IN (SELECT model FROM ref_trims WHERE make = s.make)               AS model,
  s.trim_raw IN (SELECT trim FROM ref_trims WHERE make = s.make)                 AS trim,
  TRY_CAST(CASE WHEN s.feed = 'B' THEN CAST(r.price_usd AS VARCHAR) ELSE coalesce(ra.Price, rc.price) END AS INT) >= 1000 AS price,
  CASE WHEN s.feed = 'B' THEN r.odometer.unit = 'mi' ELSE TRY_CAST(coalesce(ra.Mileage, rc.miles) AS INT) IS NOT NULL END AS miles,
  s.last_seen >= DATE '2026-10-25' - INTERVAL 30 DAY                             AS fresh,
  lower(s.body_raw) IN ('suv', 'sedan', 'hatchback', 'wagon', 'minivan', 'pickup')
    AND lower(s.body_raw) = n.body_ref                                           AS body_type,
  s.drive_raw IS NOT NULL                                                        AS drivetrain,
  list_has_any(s.features_raw, ['Pre-Collision System', 'Automatic Emergency Braking', 'Collision Mitigation Braking']) AS aeb_std,
  list_has_any(s.features_raw, ['Lane Departure Alert', 'Lane Departure Warning', 'Lane Keeping Assist']) AS lane_departure_std,
  list_has_any(s.features_raw, ['Blind Spot Monitor', 'Blind Spot Information']) AS blind_spot_std,
  false AS third_row, false AS seats, false AS transmission, false AS powertrain, false AS hp,
  false AS tow_lbs, false AS cargo_cuft, false AS mpg_or_range
FROM stg_listings s
LEFT JOIN (SELECT n.feed, n.listing_id, r.body_type AS body_ref FROM norm_listings n
           LEFT JOIN ref_trims r ON r.make = n.make AND r.model = n.model AND r.trim = n.trim
            AND n.year BETWEEN CAST(r.year_from AS INT) AND CAST(r.year_to AS INT)) n USING (feed, listing_id)
LEFT JOIN raw_a ra ON s.feed IN ('A', 'D') AND ra.StockNo = s.listing_id
LEFT JOIN raw_b r  ON s.feed = 'B' AND r.listing_id = s.listing_id
LEFT JOIN raw_c rc ON s.feed = 'C' AND rc.source_listing_id = s.listing_id;

CREATE OR REPLACE TABLE after_fields AS
SELECT feed, listing_id, true AS vin, year IS NOT NULL AS year, make IS NOT NULL AS make, model IS NOT NULL AS model,
  trim IS NOT NULL AS trim, price >= 1000 AS price, miles IS NOT NULL AS miles, true AS fresh,
  body_type IS NOT NULL AS body_type, drivetrain IS NOT NULL AS drivetrain,
  aeb_std IS NOT NULL AS aeb_std, lane_departure_std IS NOT NULL AS lane_departure_std, blind_spot_std IS NOT NULL AS blind_spot_std,
  third_row IS NOT NULL AS third_row, seats IS NOT NULL AS seats, transmission IS NOT NULL AS transmission,
  powertrain IS NOT NULL AS powertrain, hp IS NOT NULL AS hp, tow_lbs IS NOT NULL AS tow_lbs,
  (cargo_cuft IS NOT NULL OR body_type = 'pickup') AS cargo_cuft,
  (CASE WHEN powertrain = 'electric' THEN ev_range_mi ELSE mpg_combined END) IS NOT NULL AS mpg_or_range
FROM inventory_clean;

CREATE OR REPLACE TABLE score_fields AS
WITH b AS (UNPIVOT before_fields ON COLUMNS(* EXCLUDE (feed, listing_id)) INTO NAME field VALUE ok),
     a AS (UNPIVOT after_fields  ON COLUMNS(* EXCLUDE (feed, listing_id)) INTO NAME field VALUE ok)
SELECT field,
       round(100.0 * (SELECT avg(CAST(ok AS INT)) FROM b WHERE b.field = f.field), 1) AS before_pct,
       round(100.0 * (SELECT avg(CAST(ok AS INT)) FROM a WHERE a.field = f.field), 1) AS after_pct
FROM (SELECT DISTINCT field FROM b) f;

-- A listing is agent-ready when every field the agent filters or explains with is usable.
CREATE OR REPLACE TABLE score_ready AS
SELECT 'before' AS stage, count(*) AS listings,
       count(*) FILTER (WHERE vin AND year AND make AND model AND trim AND price AND miles AND fresh AND body_type AND drivetrain
                        AND seats AND third_row AND transmission AND powertrain AND hp AND tow_lbs AND aeb_std
                        AND lane_departure_std AND mpg_or_range) AS agent_ready
FROM before_fields
UNION ALL
SELECT 'after', count(*),
       count(*) FILTER (WHERE vin AND year AND make AND model AND trim AND price AND miles AND fresh AND body_type AND drivetrain
                        AND seats AND third_row AND transmission AND powertrain AND hp AND tow_lbs AND aeb_std
                        AND lane_departure_std AND mpg_or_range)
FROM after_fields;

CREATE OR REPLACE TABLE score_feeds AS
SELECT s.feed,
       count(*) AS received,
       count(*) FILTER (WHERE i.shoppable) AS shoppable,
       (SELECT count(*) FROM detected_issues d WHERE d.feed = s.feed) AS issues_flagged,
       round(100.0 * avg(CAST(b.model AND b.trim AND b.body_type AND b.drivetrain AND b.price AND b.miles AS INT)), 1) AS core_fields_usable_as_sent_pct
FROM stg_listings s JOIN inventory_all i USING (feed, listing_id) JOIN before_fields b USING (feed, listing_id)
GROUP BY 1 ORDER BY 1;

-- Could the 20 audit queries from v0.1 be answered from this data?
CREATE OR REPLACE TABLE score_queries AS
WITH q AS (SELECT * FROM read_csv('data/eval/audit_query_fields.csv', header = true, all_varchar = true)),
qf AS (SELECT query_id, unnest(string_split(fields, '|')) AS field FROM q),
cov AS (
  SELECT qf.query_id,
         min(CASE WHEN sf.field IS NULL THEN 100 ELSE sf.before_pct END) AS min_before,
         min(CASE WHEN sf.field IS NULL THEN 100 ELSE sf.after_pct END) AS min_after,
         string_agg(CASE WHEN coalesce(sf.before_pct, 100) < 95 THEN qf.field END, ', ') AS missing_before
  FROM qf LEFT JOIN score_fields sf
    ON sf.field = CASE WHEN qf.field IN ('mpg_combined', 'ev_range_mi') THEN 'mpg_or_range' ELSE qf.field END
  GROUP BY 1
)
SELECT q.query_id, q.query,
       CASE WHEN cov.min_before >= 95 THEN (CASE WHEN q.not_modeled IS NULL THEN 'yes' ELSE 'partly' END) ELSE 'no' END AS answerable_before,
       CASE WHEN cov.min_after  >= 95 THEN (CASE WHEN q.not_modeled IS NULL THEN 'yes' ELSE 'partly' END) ELSE 'no' END AS answerable_after,
       cov.missing_before, q.not_modeled
FROM q JOIN cov USING (query_id) ORDER BY q.query_id;
