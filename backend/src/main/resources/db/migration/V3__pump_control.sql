CREATE TABLE pump_command (
  command_id UUID PRIMARY KEY,
  action TEXT NOT NULL CHECK (action IN ('ON','OFF','RESET_LOCKOUT')),
  duration_seconds INTEGER,
  issued_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('PENDING','SENT','EXECUTED','FAILED','TIMED_OUT','PUBLISH_UNCERTAIN')),
  reported_state TEXT,
  error_code TEXT,
  acknowledged_at TIMESTAMPTZ,
  CHECK ((action='ON' AND duration_seconds IS NOT NULL AND duration_seconds BETWEEN 1 AND 30) OR (action<>'ON' AND duration_seconds IS NULL))
);
CREATE TABLE pump_status (
  singleton INTEGER PRIMARY KEY CHECK(singleton=1),
  boot_id UUID NOT NULL, sequence BIGINT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL, received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reported_state TEXT NOT NULL CHECK(reported_state IN ('ON','OFF')),
  safety_lockout BOOLEAN NOT NULL
);
