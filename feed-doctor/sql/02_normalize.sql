-- 02 · Normalize: canonical model, trim, drivetrain, body vocabulary, miles.

-- Models the reference knows, with a match key that ignores case, spaces and punctuation.
CREATE OR REPLACE TABLE ref_models AS
SELECT DISTINCT make, model, lower(regexp_replace(model, '[^A-Za-z0-9]', '', 'g')) AS model_key FROM ref_trims;

CREATE OR REPLACE TABLE norm_model AS
WITH s AS (
  SELECT feed, listing_id, make, model_raw,
         lower(regexp_replace(regexp_replace(model_raw, '(?i)\b(HV|Hyb)\b', 'Hybrid', 'g'), '[^A-Za-z0-9]', '', 'g')) AS raw_key
  FROM stg_listings
), exact AS (
  SELECT s.feed, s.listing_id, r.model, 'exact' AS how
  FROM s JOIN ref_models r ON r.make = s.make AND r.model_key = s.raw_key
), fuzzy AS (  -- typo tolerance: best Jaro-Winkler match within the same make, only if very close
  SELECT feed, listing_id, model, 'fuzzy' AS how FROM (
    SELECT s.feed, s.listing_id, r.model,
           jaro_winkler_similarity(s.raw_key, r.model_key) AS sim,
           row_number() OVER (PARTITION BY s.feed, s.listing_id ORDER BY jaro_winkler_similarity(s.raw_key, r.model_key) DESC) AS rk
    FROM s JOIN ref_models r ON r.make = s.make
    WHERE (s.feed, s.listing_id) NOT IN (SELECT feed, listing_id FROM exact)
  ) WHERE rk = 1 AND sim >= 0.92
)
SELECT s.feed, s.listing_id, s.model_raw, m.model AS model, m.how AS model_match
FROM s LEFT JOIN (SELECT * FROM exact UNION ALL SELECT * FROM fuzzy) m USING (feed, listing_id);

CREATE OR REPLACE TABLE norm_listings AS
WITH base AS (
  SELECT l.*, nm.model, nm.model_match,
         -- drivetrain words found inside the trim text, e.g. "XLE All-Wheel Drive"
         -- v0.2.1: also "All Wheel Drive", "AWD-i", "Symmetrical AWD", "Four Wheel Drive"
         CASE WHEN regexp_matches(l.trim_raw, '(?i)all[- ]wheel drive|\bawd\b') THEN 'AWD'
              WHEN regexp_matches(l.trim_raw, '(?i)four[- ]wheel drive|\b4wd\b|\b4x4\b') THEN '4WD'
              WHEN regexp_matches(l.trim_raw, '(?i)\bfwd\b') THEN 'FWD'
              WHEN regexp_matches(l.trim_raw, '(?i)\brwd\b') THEN 'RWD' END AS drive_from_trim,
         trim(regexp_replace(l.trim_raw, '(?i)\s*(symmetrical\s+)?(all[- ]wheel drive|four[- ]wheel drive|awd(-i)?|4wd|4x4|fwd|rwd)\s*$', '')) AS trim_clean
  FROM stg_listings l JOIN norm_model nm USING (feed, listing_id)
), trim_match AS (
  SELECT b.feed, b.listing_id, r.trim AS trim
  FROM base b JOIN ref_trims r
    ON r.make = b.make AND r.model = b.model AND lower(r.trim) = lower(b.trim_clean)
   AND b.year BETWEEN CAST(r.year_from AS INT) AND CAST(r.year_to AS INT)
), single_trim AS (  -- trim missing, but the reference has only one trim for that model-year: safe to infer
  SELECT b.feed, b.listing_id, any_value(r.trim) AS trim
  FROM base b JOIN ref_trims r
    ON r.make = b.make AND r.model = b.model AND b.year BETWEEN CAST(r.year_from AS INT) AND CAST(r.year_to AS INT)
  WHERE b.trim_raw IS NULL
  GROUP BY ALL HAVING count(*) = 1
)
SELECT b.*,
       coalesce(tm.trim, st.trim) AS trim,
       CASE WHEN tm.trim IS NOT NULL THEN 'exact' WHEN st.trim IS NOT NULL THEN 'inferred' END AS trim_match,
       CASE upper(b.drive_raw) WHEN '4X4' THEN '4WD' ELSE upper(b.drive_raw) END AS drive_feed,
       CASE
         WHEN regexp_matches(lower(b.body_raw), 'sport utility|suv|crossover') THEN 'suv'
         WHEN regexp_matches(lower(b.body_raw), 'pickup|truck') THEN 'pickup'
         WHEN regexp_matches(lower(b.body_raw), 'minivan|passenger van') THEN 'minivan'
         WHEN regexp_matches(lower(b.body_raw), 'wagon') THEN 'wagon'
         WHEN regexp_matches(lower(b.body_raw), 'hatchback') THEN 'hatchback'
         WHEN regexp_matches(lower(b.body_raw), 'sedan') THEN 'sedan'
       END AS body_feed,
       CASE WHEN b.odometer_unit = 'km' THEN CAST(round(b.odometer_value / 1.609344) AS INT) ELSE b.odometer_value END AS miles
FROM base b
LEFT JOIN trim_match tm USING (feed, listing_id)
LEFT JOIN single_trim st USING (feed, listing_id);
