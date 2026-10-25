-- 01 · Load three feeds as received and map them onto one staging schema.
-- Nothing is cleaned here: this is "what the dealers actually sent".

CREATE OR REPLACE TABLE ref_trims AS
SELECT * FROM read_csv('data/reference/trims.csv', header = true, all_varchar = true);

-- Every dealer on the same DMS export format (dealer_a, and the hold-out dealer_d) loads through one mapping.
CREATE OR REPLACE TABLE raw_a AS
SELECT *, upper(regexp_extract(filename, 'dealer_([a-z])_dms', 1)) AS feed_letter
FROM read_csv('data/feeds/dealer_*_dms.csv', header = true, all_varchar = true, filename = true);
CREATE OR REPLACE TABLE raw_b AS SELECT * FROM read_json('data/feeds/dealer_b_site.json');
CREATE OR REPLACE TABLE raw_c AS SELECT * FROM read_csv('data/feeds/aggregator_c.csv', header = true, all_varchar = true);

CREATE OR REPLACE TABLE stg_listings AS
-- Feeds A and D: dealer DMS export. Price "$31,795", mileage "13,038 mi", drivetrain sometimes inside Trim.
SELECT feed_letter AS feed, 1 AS source_priority,
       StockNo AS listing_id, VIN AS vin, TRY_CAST(Year AS INT) AS year, Make AS make,
       Model AS model_raw, Trim AS trim_raw, BodyStyle AS body_raw, NULLIF(Drivetrain, '') AS drive_raw,
       TRY_CAST(regexp_replace(Price, '[^0-9]', '', 'g') AS INT) AS price,
       TRY_CAST(regexp_replace(Mileage, '[^0-9]', '', 'g') AS INT) AS odometer_value, 'mi' AS odometer_unit,
       []::VARCHAR[] AS features_raw, TRY_CAST(LastUpdated AS DATE) AS last_seen, DealerName AS seller
FROM raw_a
UNION ALL
-- Feed B: dealer website JSON. "ymm" packs year + make + model; odometer may be in km.
SELECT 'B', 1,
       listing_id, vehicle.vin, TRY_CAST(split_part(vehicle.ymm, ' ', 1) AS INT), split_part(vehicle.ymm, ' ', 2),
       array_to_string(string_split(vehicle.ymm, ' ')[3:], ' '), vehicle.trim, body, drive,
       price_usd, odometer.value, odometer.unit,
       features, CAST(CAST(updated_at AS TIMESTAMP) AS DATE), dealer.name
FROM raw_b
UNION ALL
-- Feed C: third-party aggregator. Re-lists dealer cars (duplicates), keeps stale listings.
SELECT 'C', 2,
       source_listing_id, vin, TRY_CAST(year AS INT), make,
       model, NULLIF(trim, ''), body_type, NULL,
       TRY_CAST(price AS INT), TRY_CAST(miles AS INT), 'mi',
       []::VARCHAR[], CAST(last_seen AS DATE), seller
FROM raw_c;
