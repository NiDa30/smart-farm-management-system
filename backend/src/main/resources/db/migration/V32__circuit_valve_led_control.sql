-- Explicit simulator control, separate from read-only circuit monitor evidence.
CREATE TABLE circuit_demo_gate (
 valve_id TEXT PRIMARY KEY CHECK(valve_id ~ '^VALVE(0[2-9]|[1-9][0-9])$'),
 close_fence_at TIMESTAMPTZ
);
CREATE TABLE circuit_demo_command (
 command_id UUID PRIMARY KEY,
 ordinal BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE CHECK(ordinal BETWEEN 1 AND 9007199254740991),
 circuit_id TEXT NOT NULL, valve_id TEXT NOT NULL,
 config_snapshot JSONB NOT NULL CHECK(jsonb_typeof(config_snapshot)='object'),
 boot_id UUID NOT NULL,action TEXT NOT NULL CHECK(action IN ('OPEN','CLOSE')),duration_seconds INTEGER,
 requested_at TIMESTAMPTZ NOT NULL,issued_at TIMESTAMPTZ NOT NULL,expires_at TIMESTAMPTZ NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('PENDING','SENT','PUBLISH_UNCERTAIN','EXECUTED','REJECTED')),
 error_code TEXT,ack_sequence BIGINT,
 CHECK((action='OPEN' AND duration_seconds BETWEEN 1 AND 30 AND duration_seconds IS NOT NULL) OR (action='CLOSE' AND duration_seconds IS NULL)),
 CHECK(expires_at>issued_at AND expires_at<=issued_at+INTERVAL '15 seconds')
);
CREATE INDEX circuit_demo_command_valve ON circuit_demo_command(valve_id,ordinal DESC);
CREATE TABLE circuit_demo_status (
 valve_id TEXT PRIMARY KEY,circuit_id TEXT NOT NULL,config_snapshot JSONB NOT NULL CHECK(jsonb_typeof(config_snapshot)='object'),
 boot_id UUID NOT NULL,sequence BIGINT NOT NULL CHECK(sequence BETWEEN 0 AND 9007199254740991),
 observed_at TIMESTAMPTZ NOT NULL,received_at TIMESTAMPTZ NOT NULL,
 gpio_state TEXT NOT NULL CHECK(gpio_state IN ('OPEN','CLOSED')),reason TEXT NOT NULL,demo_enabled BOOLEAN NOT NULL,
 last_ordinal BIGINT NOT NULL CHECK(last_ordinal BETWEEN 0 AND 9007199254740991),
 position_feedback JSONB NOT NULL CHECK(jsonb_typeof(position_feedback)='object')
);
CREATE TABLE circuit_demo_boot (
 valve_id TEXT NOT NULL,boot_id UUID NOT NULL,retired BOOLEAN NOT NULL DEFAULT false,PRIMARY KEY(valve_id,boot_id)
);
