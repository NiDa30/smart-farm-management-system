-- Existing LOW policies keep admission-only behavior.
ALTER TABLE circuit_water_gate ADD COLUMN stop_on_unavailable BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE circuit_water_gate ADD CONSTRAINT circuit_water_stop_requires_enabled CHECK(NOT stop_on_unavailable OR enabled);
CREATE TABLE irrigation_water_stop (
 session_id UUID PRIMARY KEY REFERENCES irrigation_session(session_id),
 request_id UUID UNIQUE NOT NULL REFERENCES irrigation_session_action(request_id),
 circuit_id TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 evidence JSONB NOT NULL CHECK(jsonb_typeof(evidence)='object')
);
CREATE INDEX irrigation_water_stop_circuit ON irrigation_water_stop(circuit_id,created_at DESC,session_id);
