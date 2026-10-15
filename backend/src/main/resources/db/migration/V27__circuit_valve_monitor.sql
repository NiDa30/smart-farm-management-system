-- Read-only simulator observations. No command/claim/dispatch table is changed.
CREATE TABLE circuit_valve_status (
 valve_id TEXT PRIMARY KEY CHECK(valve_id ~ '^VALVE(0[2-9]|[1-9][0-9])$'),
 controller_id TEXT NOT NULL CHECK(controller_id ~ '^IRRIGATION(0[2-9]|[1-9][0-9])$'),
 circuit_id TEXT NOT NULL REFERENCES irrigation_circuit(circuit_id) ON DELETE CASCADE,
 circuit_revision INTEGER NOT NULL CHECK(circuit_revision>0),
 zone_id TEXT NOT NULL,zone_revision INTEGER NOT NULL CHECK(zone_revision>0),
 boot_id UUID NOT NULL,sequence BIGINT NOT NULL CHECK(sequence BETWEEN 0 AND 9007199254740991),
 observed_at TIMESTAMPTZ NOT NULL,received_at TIMESTAMPTZ NOT NULL,
 reason TEXT NOT NULL CHECK(reason IN ('BOOT','CONNECTION_LOST','DEVICE_FAULT','POSITION_FAULT')),
 feedback_state TEXT NOT NULL CHECK(feedback_state IN ('UNKNOWN','OPEN','CLOSED','CONFLICT')),
 feedback_enabled BOOLEAN NOT NULL,
 feedback_fault TEXT CHECK(feedback_fault IN ('SWITCH_CONFLICT','OPEN_TIMEOUT','CLOSE_TIMEOUT','POSITION_LOST'))
);
CREATE TABLE circuit_valve_boot (
 valve_id TEXT NOT NULL REFERENCES circuit_valve_status(valve_id) ON DELETE CASCADE,
 boot_id UUID NOT NULL,retired BOOLEAN NOT NULL DEFAULT false,
 PRIMARY KEY(valve_id,boot_id)
);
