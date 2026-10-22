-- Explicit one-shot simulator cycle, never a queue dispatcher or restart authorization.
CREATE TABLE irrigation_session_cycle (
 session_id UUID PRIMARY KEY REFERENCES irrigation_session(session_id),arm_id UUID UNIQUE NOT NULL,
 definition JSONB NOT NULL CHECK(jsonb_typeof(definition)='object'),
 open_id UUID UNIQUE NOT NULL,on_id UUID UNIQUE NOT NULL,off_id UUID UNIQUE NOT NULL,
 close_id UUID UNIQUE NOT NULL,finish_id UUID UNIQUE NOT NULL,
 armed_at TIMESTAMPTZ NOT NULL,deadline TIMESTAMPTZ NOT NULL CHECK(deadline=armed_at+INTERVAL '30 seconds'),
 step_deadline TIMESTAMPTZ,stop_at TIMESTAMPTZ,stop_reason TEXT,
 state TEXT NOT NULL CHECK(state IN ('ARMED','OPEN_RESERVED','WAIT_OPEN','ON_RESERVED','WAIT_ON','RUNNING','OFF_RESERVED','WAIT_OFF','CLOSE_RESERVED','WAIT_CLOSED','COMPLETE','PAUSED','EXPIRED','INTERRUPTED','UNRESOLVED')),
 reason TEXT NOT NULL,finished_at TIMESTAMPTZ,
 CHECK((state IN ('COMPLETE','PAUSED','EXPIRED','INTERRUPTED','UNRESOLVED'))=(finished_at IS NOT NULL))
);
