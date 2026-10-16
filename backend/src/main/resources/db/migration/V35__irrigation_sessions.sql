-- Operator-confirmed simulator workflow, no automatic command scheduler or replay.
CREATE TABLE irrigation_session (
 session_id UUID PRIMARY KEY,circuit_id TEXT NOT NULL,config_snapshot JSONB NOT NULL,
 pump_boot UUID NOT NULL,valve_boot UUID NOT NULL,duration_seconds INTEGER NOT NULL CHECK(duration_seconds BETWEEN 1 AND 10),
 requested_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 revision BIGINT NOT NULL DEFAULT 1 CHECK(revision BETWEEN 1 AND 9007199254740991),
 phase TEXT NOT NULL CHECK(phase IN ('PREPARED','DISPATCHING_OPEN','WAIT_OPEN','DISPATCHING_ON','WAIT_ON','DISPATCHING_OFF','WAIT_OFF','DISPATCHING_CLOSE','WAIT_CLOSED','RECOVERY_REQUIRED','CLOSED_CONFIRMED')),
 stop_requested BOOLEAN NOT NULL DEFAULT FALSE,reason TEXT NOT NULL,
 open_id UUID,on_id UUID,off_id UUID,close_id UUID,finished_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX irrigation_session_one_active ON irrigation_session((1)) WHERE phase<>'CLOSED_CONFIRMED';
CREATE TABLE irrigation_session_action (
 request_id UUID PRIMARY KEY,session_id UUID NOT NULL REFERENCES irrigation_session(session_id),
 action TEXT NOT NULL CHECK(action IN ('OPEN','ON','OFF','CLOSE','FINISH')),
 definition JSONB NOT NULL,payload JSONB,
 state TEXT NOT NULL CHECK(state IN ('RESERVED','RETURNED','UNRESOLVED')),
 result JSONB,created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX irrigation_session_recent ON irrigation_session(circuit_id,created_at DESC);
