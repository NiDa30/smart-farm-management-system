-- Opt-in gate for starting route-bound irrigation. No policy or command is seeded.
CREATE TABLE zone_rain_gate (
 zone_id TEXT PRIMARY KEY REFERENCES irrigation_zone(zone_id) ON DELETE CASCADE,
 zone_revision INTEGER NOT NULL CHECK(zone_revision>0),
 node_id TEXT NOT NULL CHECK(node_id ~ '^[A-Z][A-Z0-9_-]{1,31}$'),
 channel_id TEXT NOT NULL CHECK(channel_id ~ '^[A-Z][A-Z0-9_-]{1,31}$'),
 expected_source TEXT NOT NULL CHECK(expected_source IN ('SIMULATOR','PHYSICAL')),
 calibration_version TEXT CHECK(length(calibration_version) BETWEEN 1 AND 40),
 enabled BOOLEAN NOT NULL,
 revision INTEGER NOT NULL CHECK(revision>0)
);
ALTER TABLE pump_command ADD COLUMN weather_gate JSONB
 CHECK(weather_gate IS NULL OR jsonb_typeof(weather_gate)='object');
