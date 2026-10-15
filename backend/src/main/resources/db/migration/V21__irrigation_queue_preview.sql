-- Planning ledger only. No relationship grants ownership of PUMP01 or VALVE01.
CREATE TABLE irrigation_queue_state (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),
 revision BIGINT NOT NULL DEFAULT 1 CHECK(revision BETWEEN 1 AND 9007199254740991)
);
INSERT INTO irrigation_queue_state(singleton) VALUES(1);

CREATE TABLE irrigation_queue_request (
 request_id UUID PRIMARY KEY,
 ticket BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE CHECK(ticket BETWEEN 1 AND 9007199254740991),
 zone_id TEXT NOT NULL REFERENCES irrigation_zone(zone_id),
 zone_revision INTEGER NOT NULL CHECK(zone_revision>0),
 zone_snapshot JSONB NOT NULL CHECK(jsonb_typeof(zone_snapshot)='object'),
 duration_seconds INTEGER NOT NULL CHECK(duration_seconds BETWEEN 1 AND 30),
 requested_at TIMESTAMPTZ NOT NULL,
 enqueued_at TIMESTAMPTZ NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL CHECK(expires_at=enqueued_at + INTERVAL '5 minutes'),
 state TEXT NOT NULL CHECK(state IN ('QUEUED','REHEARSING','REHEARSED','CANCELLED','EXPIRED','INVALIDATED','INTERRUPTED')),
 started_at TIMESTAMPTZ,
 planned_end_at TIMESTAMPTZ,
 finished_at TIMESTAMPTZ,
 reason TEXT NOT NULL CHECK(reason IN ('WAITING','PREVIEW_STARTED','PREVIEW_FINISHED','USER_CANCELLED','WAIT_EXPIRED','ZONE_CHANGED','BACKEND_RESTARTED')),
 CHECK((started_at IS NULL)=(planned_end_at IS NULL)),
 CHECK(planned_end_at IS NULL OR planned_end_at=started_at+duration_seconds*INTERVAL '1 second'),
 CHECK((state IN ('QUEUED','REHEARSING'))=(finished_at IS NULL)),
 CHECK(state NOT IN ('REHEARSING','REHEARSED','INTERRUPTED') OR started_at IS NOT NULL)
);
CREATE UNIQUE INDEX irrigation_queue_one_rehearsal ON irrigation_queue_request((1)) WHERE state='REHEARSING';
CREATE INDEX irrigation_queue_waiting ON irrigation_queue_request(ticket) WHERE state='QUEUED';
