-- Weekly planning only: never dispatch a device command or replay missed occurrences.
CREATE TABLE irrigation_queue_schedule (
 zone_id TEXT PRIMARY KEY REFERENCES irrigation_zone(zone_id),
 revision BIGINT NOT NULL CHECK(revision BETWEEN 1 AND 9007199254740991),
 definition JSONB NOT NULL CHECK(jsonb_typeof(definition)='object'),
 zone_snapshot JSONB NOT NULL CHECK(jsonb_typeof(zone_snapshot)='object'),
 circuit_snapshot JSONB CHECK(circuit_snapshot IS NULL OR jsonb_typeof(circuit_snapshot)='object'),
 updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE irrigation_queue_schedule_state (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),last_tick_at TIMESTAMPTZ,
 last_result TEXT NOT NULL CHECK(last_result IN ('DISABLED','STARTUP_SKIPPED','EVALUATED','GAP_SKIPPED'))
);
INSERT INTO irrigation_queue_schedule_state(singleton,last_result) VALUES(1,'DISABLED');
CREATE TABLE irrigation_queue_schedule_occurrence (
 zone_id TEXT NOT NULL REFERENCES irrigation_queue_schedule(zone_id),due_at TIMESTAMPTZ NOT NULL,
 schedule_revision BIGINT NOT NULL,schedule_definition JSONB NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('QUEUED','SKIPPED')),
 reason TEXT NOT NULL CHECK(reason IN ('REQUEST_CREATED','CONFIG_CHANGED','ZONE_ALREADY_WAITING','QUEUE_FULL')),
 request_id UUID UNIQUE REFERENCES irrigation_queue_request(request_id),evaluated_at TIMESTAMPTZ NOT NULL,
 PRIMARY KEY(zone_id,due_at),CHECK((state='QUEUED')=(request_id IS NOT NULL)),
 CHECK((state='QUEUED')=(reason='REQUEST_CREATED'))
);
