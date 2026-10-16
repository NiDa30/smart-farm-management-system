-- Explicit one-shot post-OFF automation, no OPEN/ON or replay authorization.
CREATE TABLE irrigation_session_closure (
 session_id UUID PRIMARY KEY REFERENCES irrigation_session(session_id),
 arm_id UUID UNIQUE NOT NULL,
 definition JSONB NOT NULL CHECK(jsonb_typeof(definition)='object'),
 off_id UUID NOT NULL,
 close_id UUID UNIQUE NOT NULL,
 finish_id UUID UNIQUE NOT NULL,
 armed_at TIMESTAMPTZ NOT NULL,
 deadline TIMESTAMPTZ NOT NULL CHECK(deadline=armed_at+INTERVAL '15 seconds'),
 state TEXT NOT NULL CHECK(state IN ('ARMED','CLOSE_RESERVED','WAIT_CLOSED','COMPLETE','PAUSED','EXPIRED','INTERRUPTED','UNRESOLVED')),
 reason TEXT NOT NULL,
 finished_at TIMESTAMPTZ,
 CHECK((state IN ('ARMED','CLOSE_RESERVED','WAIT_CLOSED'))=(finished_at IS NULL))
);
