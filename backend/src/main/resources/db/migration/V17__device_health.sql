-- Backend-observed device health episodes. Monitoring only: an episode never dispatches a
-- command and is never evaluated while the backend's own MQTT session is not connected.
CREATE TABLE device_health_alert (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 device_id TEXT NOT NULL CHECK(device_id ~ '^[A-Z][A-Z0-9_-]{1,31}$'),
 type TEXT NOT NULL CHECK(type IN ('DEVICE_OFFLINE','STUCK_VALUE','PUMP_NO_FLOW')),
 channel_key TEXT NOT NULL DEFAULT '',
 opened_at TIMESTAMPTZ NOT NULL,
 opened_detail TEXT NOT NULL CHECK(length(opened_detail) BETWEEN 1 AND 200),
 cleared_at TIMESTAMPTZ,
 acknowledged_at TIMESTAMPTZ,
 acknowledgement_note TEXT CHECK(length(acknowledgement_note)<=500),
 CHECK(acknowledged_at IS NOT NULL OR acknowledgement_note IS NULL),
 CHECK(cleared_at IS NULL OR cleared_at>=opened_at),
 CHECK((type='STUCK_VALUE' AND channel_key ~ '^[A-Z][A-Z0-9_-]{1,31}$')
    OR (type<>'STUCK_VALUE' AND channel_key=''))
);
CREATE UNIQUE INDEX device_health_alert_open ON device_health_alert(device_id,type,channel_key) WHERE cleared_at IS NULL;
CREATE INDEX device_health_alert_recent ON device_health_alert(id DESC);
-- Last-receipt lookups run every evaluation; keep them off full-table scans.
CREATE INDEX telemetry_device_received ON telemetry(device_id,received_at DESC);
CREATE INDEX node_sample_received ON node_sample(node_id,received_at DESC);
