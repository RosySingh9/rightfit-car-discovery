-- 05 · Evaluate the pipeline like a model.
-- (a) Planted issues in feeds A–C: did detection catch them (recall), and was every flag real (precision)?
-- (b) Hold-out feed D: problem variants written AFTER the rules. Did the pipeline still get the right answer?

CREATE OR REPLACE TABLE gt AS SELECT * FROM read_csv('data/eval/ground_truth_issues.csv', header = true);

CREATE OR REPLACE TABLE eval_detection AS
WITH det AS (SELECT * FROM detected_issues WHERE feed IN ('A', 'B', 'C')),
types AS (SELECT DISTINCT issue_type FROM gt UNION SELECT DISTINCT issue_type FROM det)
SELECT t.issue_type,
       (SELECT count(*) FROM gt WHERE gt.issue_type = t.issue_type) AS planted,
       (SELECT count(*) FROM det WHERE det.issue_type = t.issue_type) AS flagged,
       (SELECT count(*) FROM gt JOIN det USING (feed, listing_id, issue_type) WHERE gt.issue_type = t.issue_type) AS caught
FROM types t;

CREATE OR REPLACE TABLE gt_hold AS SELECT * FROM read_csv('data/eval/ground_truth_holdout.csv', header = true);
CREATE OR REPLACE TABLE gt_hold_veh AS SELECT * FROM read_csv('data/eval/ground_truth_holdout_vehicles.csv', header = true);

CREATE OR REPLACE TABLE eval_holdout AS
WITH d AS (
  SELECT listing_id, model, trim, drivetrain, price, miles, year FROM inventory_all WHERE feed = 'D'
),
flags AS (SELECT listing_id, list(issue_type) AS issues FROM detected_issues WHERE feed = 'D' GROUP BY 1)
SELECT h.issue_type, count(*) AS planted,
       count(*) FILTER (WHERE CASE h.issue_type
         WHEN 'model_alias_variant'        THEN d.model = v.model
         WHEN 'drivetrain_in_trim_variant' THEN d.drivetrain = v.drivetrain AND d.trim = v.trim
         WHEN 'price_with_cents'           THEN d.price = v.price
         WHEN 'mileage_in_thousands'       THEN abs(d.miles - v.miles) <= 100
         WHEN 'two_digit_year'             THEN d.year = v.year
         WHEN 'stale_us_date_format'       THEN list_contains(coalesce(f.issues, []), 'stale_listing')
         WHEN 'vin_invalid'                THEN list_contains(coalesce(f.issues, []), 'vin_invalid')
         WHEN 'body_mislabel'              THEN list_contains(coalesce(f.issues, []), 'body_mislabel')
       END) AS handled
FROM gt_hold h JOIN d ON d.listing_id = h.listing_id JOIN gt_hold_veh v ON v.listing_id = h.listing_id
LEFT JOIN flags f ON f.listing_id = d.listing_id
GROUP BY 1;
