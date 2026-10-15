-- Monitoring episodes only. Configuration snapshots stay immutable when a circuit is edited.
CREATE TABLE circuit_valve_alert_cursor (
 circuit_id TEXT NOT NULL REFERENCES irrigation_circuit(circuit_id) ON DELETE CASCADE,
 circuit_revision INTEGER NOT NULL CHECK(circuit_revision>0),
 boot_id UUID,sequence BIGINT,observed_at TIMESTAMPTZ,received_at TIMESTAMPTZ,
 position_healthy INTEGER NOT NULL DEFAULT 0 CHECK(position_healthy BETWEEN 0 AND 1),
 device_healthy INTEGER NOT NULL DEFAULT 0 CHECK(device_healthy BETWEEN 0 AND 1),
 PRIMARY KEY(circuit_id,circuit_revision)
);
CREATE TABLE circuit_valve_alert (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY CHECK(id BETWEEN 1 AND 9007199254740991),
 circuit_id TEXT NOT NULL REFERENCES irrigation_circuit(circuit_id) ON DELETE CASCADE,
 circuit_revision INTEGER NOT NULL CHECK(circuit_revision>0),
 valve_id TEXT NOT NULL,controller_id TEXT NOT NULL,
 type TEXT NOT NULL CHECK(type IN ('POSITION_FAULT','DEVICE_FAULT')),
 circuit_snapshot JSONB NOT NULL CHECK(jsonb_typeof(circuit_snapshot)='object'),
 opened_at TIMESTAMPTZ NOT NULL,opened_source_at TIMESTAMPTZ NOT NULL,
 opened_evidence JSONB NOT NULL CHECK(jsonb_typeof(opened_evidence)='object'),
 cleared_at TIMESTAMPTZ,cleared_source_at TIMESTAMPTZ,cleared_evidence JSONB,
 acknowledged_at TIMESTAMPTZ,acknowledgement_note TEXT CHECK(length(acknowledgement_note)<=500),
 CHECK((cleared_at IS NULL)=(cleared_source_at IS NULL)),
 CHECK((cleared_at IS NULL)=(cleared_evidence IS NULL)),
 CHECK(cleared_at IS NULL OR cleared_at>=opened_at),
 CHECK(cleared_evidence IS NULL OR jsonb_typeof(cleared_evidence)='object'),
 CHECK(acknowledged_at IS NOT NULL OR acknowledgement_note IS NULL)
);
CREATE UNIQUE INDEX circuit_valve_alert_open ON circuit_valve_alert(circuit_id,circuit_revision,type) WHERE cleared_at IS NULL;
CREATE INDEX circuit_valve_alert_recent ON circuit_valve_alert(id DESC);
