-- Optional extra conditions for the single watering rule. NULL means "not checked", so the
-- rule behaves exactly as before until an operator saves guards (rule disabled, no active run).
ALTER TABLE watering_rule
 ADD COLUMN guard_min_air_temperature DOUBLE PRECISION CHECK(guard_min_air_temperature BETWEEN -40 AND 80),
 ADD COLUMN guard_max_air_temperature DOUBLE PRECISION CHECK(guard_max_air_temperature BETWEEN -40 AND 80),
 ADD COLUMN guard_max_air_humidity DOUBLE PRECISION CHECK(guard_max_air_humidity BETWEEN 1 AND 100),
 ADD COLUMN guard_water_node TEXT,
 ADD COLUMN guard_water_channel TEXT,
 ADD COLUMN guard_max_runs_per_day INTEGER CHECK(guard_max_runs_per_day BETWEEN 1 AND 200),
 ADD COLUMN guard_revision BIGINT NOT NULL DEFAULT 1 CHECK(guard_revision>0),
 ADD CONSTRAINT watering_guard_temperature_order CHECK(guard_min_air_temperature IS NULL OR guard_max_air_temperature IS NULL
   OR guard_min_air_temperature<guard_max_air_temperature),
 ADD CONSTRAINT watering_guard_water_pair CHECK((guard_water_node IS NULL)=(guard_water_channel IS NULL)),
 ADD CONSTRAINT watering_guard_water_channel FOREIGN KEY(guard_water_node,guard_water_channel)
   REFERENCES iot_channel(node_id,channel_id) ON DELETE RESTRICT;
-- Runs record which guard revision they passed; older runs stay NULL rather than invented.
ALTER TABLE watering_run ADD COLUMN guard_revision BIGINT;
