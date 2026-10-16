-- No enabled policy is seeded. FLOW is a station measurement, not branch delivery proof.
CREATE TABLE circuit_flow_guard (
 circuit_id TEXT PRIMARY KEY REFERENCES irrigation_circuit(circuit_id) ON DELETE CASCADE,
 circuit_revision INTEGER NOT NULL CHECK(circuit_revision>0),
 calibration_version TEXT CHECK(length(calibration_version) BETWEEN 1 AND 40),
 enabled BOOLEAN NOT NULL,
 minimum_lpm DOUBLE PRECISION NOT NULL CHECK(minimum_lpm>0 AND minimum_lpm<=1000),
 grace_seconds INTEGER NOT NULL CHECK(grace_seconds BETWEEN 1 AND 8),
 revision INTEGER NOT NULL CHECK(revision>0)
);
CREATE TABLE irrigation_flow_stop (
 session_id UUID PRIMARY KEY REFERENCES irrigation_session(session_id),
 request_id UUID UNIQUE NOT NULL REFERENCES irrigation_session_action(request_id),
 circuit_id TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 evidence JSONB NOT NULL CHECK(jsonb_typeof(evidence)='object')
);
CREATE INDEX irrigation_flow_stop_circuit ON irrigation_flow_stop(circuit_id,created_at DESC,session_id);
