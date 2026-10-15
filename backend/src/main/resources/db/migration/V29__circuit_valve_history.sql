-- Accepted monitor observations only; no synthetic backfill from the V27 latest row.
CREATE TABLE circuit_valve_history (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY CHECK(id BETWEEN 1 AND 9007199254740991),
 circuit_id TEXT NOT NULL REFERENCES irrigation_circuit(circuit_id) ON DELETE CASCADE,
 valve_id TEXT NOT NULL,
 boot_id UUID NOT NULL,
 sequence BIGINT NOT NULL CHECK(sequence BETWEEN 0 AND 9007199254740991),
 observed_at TIMESTAMPTZ NOT NULL,received_at TIMESTAMPTZ NOT NULL,
 position_state TEXT NOT NULL CHECK(position_state IN ('UNKNOWN','OPEN','CLOSED','CONFLICT')),
 has_fault BOOLEAN NOT NULL,
 circuit_snapshot JSONB NOT NULL CHECK(jsonb_typeof(circuit_snapshot)='object'),
 observation JSONB NOT NULL CHECK(jsonb_typeof(observation)='object'),
 UNIQUE(valve_id,boot_id,sequence)
);
CREATE INDEX circuit_valve_history_time ON circuit_valve_history(received_at DESC,id DESC);
CREATE INDEX circuit_valve_history_circuit_time ON circuit_valve_history(circuit_id,received_at DESC,id DESC);
