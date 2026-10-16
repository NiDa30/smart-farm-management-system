-- Opt-in LOW float admission, existing circuits keep current behavior.
CREATE TABLE circuit_water_gate (
 circuit_id TEXT PRIMARY KEY REFERENCES irrigation_circuit(circuit_id) ON DELETE CASCADE,
 circuit_revision INTEGER NOT NULL CHECK(circuit_revision>0),
 calibration_version TEXT CHECK(length(calibration_version) BETWEEN 1 AND 40),
 enabled BOOLEAN NOT NULL,
 revision INTEGER NOT NULL CHECK(revision>0)
);
ALTER TABLE pump_command ADD COLUMN water_gate JSONB CHECK(water_gate IS NULL OR jsonb_typeof(water_gate)='object');
