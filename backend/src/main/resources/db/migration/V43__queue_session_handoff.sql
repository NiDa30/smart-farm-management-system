-- Explicit preparation only. No queued request is dispatched automatically.
ALTER TABLE irrigation_queue_request DROP CONSTRAINT irrigation_queue_request_state_check;
ALTER TABLE irrigation_queue_request ADD CONSTRAINT irrigation_queue_request_state_check CHECK(state IN ('QUEUED','REHEARSING','REHEARSED','CANCELLED','EXPIRED','INVALIDATED','INTERRUPTED','HANDED_OFF'));
ALTER TABLE irrigation_queue_request DROP CONSTRAINT irrigation_queue_request_reason_check;
ALTER TABLE irrigation_queue_request ADD CONSTRAINT irrigation_queue_request_reason_check CHECK(reason IN ('WAITING','PREVIEW_STARTED','PREVIEW_FINISHED','USER_CANCELLED','WAIT_EXPIRED','ZONE_CHANGED','BACKEND_RESTARTED','CIRCUIT_CHANGED','OPERATOR_SESSION_PREPARED'));
ALTER TABLE irrigation_queue_request ADD CONSTRAINT queue_handoff_reason CHECK((state='HANDED_OFF')=(reason='OPERATOR_SESSION_PREPARED'));
ALTER TABLE irrigation_queue_request ADD CONSTRAINT queue_handoff_shape CHECK(state<>'HANDED_OFF' OR (circuit_snapshot IS NOT NULL AND duration_seconds<=10 AND started_at IS NULL));
CREATE TABLE irrigation_queue_handoff (
 request_id UUID PRIMARY KEY REFERENCES irrigation_queue_request(request_id),
 session_id UUID UNIQUE NOT NULL REFERENCES irrigation_session(session_id),
 definition JSONB NOT NULL CHECK(jsonb_typeof(definition)='object'),
 prepared_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
