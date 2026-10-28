-- 04 · Enrich from trim-level reference specs and publish one clean, shoppable row per vehicle.
-- Listings with an invalid VIN, a placeholder price or a stale date are held back, not deleted.

-- Model-year level specs, used only when every trim of that model-year agrees (safe fallback when trim is unknown).
CREATE OR REPLACE TABLE ref_model_year AS
SELECT make, model, y AS year,
       CASE WHEN count(DISTINCT body_type) = 1 THEN any_value(body_type) END AS body_type,
       CASE WHEN count(DISTINCT seats) = 1 THEN any_value(seats) END AS seats,
       CASE WHEN count(DISTINCT third_row) = 1 THEN any_value(third_row) END AS third_row,
       CASE WHEN count(DISTINCT transmission) = 1 THEN any_value(transmission) END AS transmission,
       CASE WHEN count(DISTINCT powertrain) = 1 THEN any_value(powertrain) END AS powertrain,
       CASE WHEN count(DISTINCT hp) = 1 THEN any_value(hp) END AS hp,
       CASE WHEN count(DISTINCT tow_lbs) = 1 THEN any_value(tow_lbs) END AS tow_lbs,
       CASE WHEN count(DISTINCT cargo_cuft) = 1 THEN any_value(cargo_cuft) END AS cargo_cuft,
       CASE WHEN count(DISTINCT mpg_combined) = 1 THEN any_value(mpg_combined) END AS mpg_combined,
       CASE WHEN count(DISTINCT ev_range_mi) = 1 THEN any_value(ev_range_mi) END AS ev_range_mi,
       CASE WHEN count(DISTINCT aeb_std) = 1 THEN any_value(aeb_std) END AS aeb_std,
       CASE WHEN count(DISTINCT lane_departure_std) = 1 THEN any_value(lane_departure_std) END AS lane_departure_std,
       CASE WHEN count(DISTINCT blind_spot_std) = 1 THEN any_value(blind_spot_std) END AS blind_spot_std,
       CASE WHEN count(DISTINCT adaptive_cruise_std) = 1 THEN any_value(adaptive_cruise_std) END AS adaptive_cruise_std,
       CASE WHEN count(DISTINCT drivetrains) = 1 THEN any_value(drivetrains) END AS drivetrains
FROM ref_trims, range(CAST(year_from AS INT), CAST(year_to AS INT) + 1) t(y)
GROUP BY ALL;

CREATE OR REPLACE TABLE inventory_all AS
SELECT n.feed, n.listing_id, n.vin, n.year, n.make, n.model, n.trim, n.trim_match, n.price, n.miles, n.last_seen, n.seller,
       coalesce(r.body_type, my.body_type) AS body_type,
       -- drivetrain: feed value, else words in trim, else the only option the trim comes with
       coalesce(n.drive_feed, n.drive_from_trim,
                CASE WHEN NOT contains(coalesce(r.drivetrains, my.drivetrains), '|') THEN coalesce(r.drivetrains, my.drivetrains) END) AS drivetrain,
       CAST(coalesce(r.seats, my.seats) AS INT) AS seats,
       CAST(coalesce(r.third_row, my.third_row) AS INT) AS third_row,
       coalesce(r.transmission, my.transmission) AS transmission,
       coalesce(r.powertrain, my.powertrain) AS powertrain,
       CAST(coalesce(r.hp, my.hp) AS INT) AS hp,
       CAST(coalesce(r.tow_lbs, my.tow_lbs) AS INT) AS tow_lbs,
       TRY_CAST(coalesce(r.cargo_cuft, my.cargo_cuft) AS DOUBLE) AS cargo_cuft,
       TRY_CAST(coalesce(r.mpg_combined, my.mpg_combined) AS INT) AS mpg_combined,
       TRY_CAST(coalesce(r.ev_range_mi, my.ev_range_mi) AS INT) AS ev_range_mi,
       CAST(coalesce(r.aeb_std, my.aeb_std) AS INT) AS aeb_std,
       CAST(coalesce(r.lane_departure_std, my.lane_departure_std) AS INT) AS lane_departure_std,
       CAST(coalesce(r.blind_spot_std, my.blind_spot_std) AS INT) AS blind_spot_std,
       CAST(coalesce(r.adaptive_cruise_std, my.adaptive_cruise_std) AS INT) AS adaptive_cruise_std,
       NOT EXISTS (SELECT 1 FROM detected_issues d WHERE d.feed = n.feed AND d.listing_id = n.listing_id
                   AND d.issue_type IN ('vin_invalid', 'price_placeholder', 'stale_listing', 'duplicate_vin', 'model_unmatched',
                                       'price_out_of_range', 'year_invalid', 'mileage_implausible', 'date_unparseable')) AS shoppable
FROM norm_listings n
LEFT JOIN ref_trims r ON r.make = n.make AND r.model = n.model AND r.trim = n.trim
                     AND n.year BETWEEN CAST(r.year_from AS INT) AND CAST(r.year_to AS INT)
LEFT JOIN ref_model_year my ON my.make = n.make AND my.model = n.model AND my.year = n.year;

-- The table the discovery agent will search.
CREATE OR REPLACE TABLE inventory_clean AS
SELECT * EXCLUDE (shoppable) FROM inventory_all WHERE shoppable;
