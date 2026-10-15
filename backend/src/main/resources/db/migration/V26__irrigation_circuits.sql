-- Planning configuration only. No MQTT identities, leases or device provisioning are created.
CREATE TABLE irrigation_circuit_state(singleton INTEGER PRIMARY KEY CHECK(singleton=1),revision BIGINT NOT NULL DEFAULT 1 CHECK(revision BETWEEN 1 AND 9007199254740991));
INSERT INTO irrigation_circuit_state(singleton) VALUES(1);
CREATE TABLE irrigation_circuit (
 circuit_id TEXT PRIMARY KEY CHECK(circuit_id ~ '^[A-Z][A-Z0-9_-]{1,31}$'),
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 80),
 zone_id TEXT NOT NULL UNIQUE REFERENCES irrigation_zone(zone_id),zone_revision INTEGER NOT NULL CHECK(zone_revision>0),
 controller_id TEXT NOT NULL CHECK(controller_id ~ '^IRRIGATION(0[1-9]|[1-9][0-9])$'),
 valve_id TEXT NOT NULL UNIQUE CHECK(valve_id ~ '^VALVE(0[1-9]|[1-9][0-9])$'),
 pump_id TEXT NOT NULL CHECK(pump_id='PUMP01'),
 water_node_id TEXT NOT NULL REFERENCES iot_node(node_id),
 low_channel_id TEXT NOT NULL,flow_channel_id TEXT NOT NULL,
 expected_source TEXT NOT NULL CHECK(expected_source IN ('SIMULATOR','PHYSICAL')),
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 FOREIGN KEY(water_node_id,low_channel_id) REFERENCES iot_channel(node_id,channel_id),
 FOREIGN KEY(water_node_id,flow_channel_id) REFERENCES iot_channel(node_id,channel_id),
 CHECK(low_channel_id<>flow_channel_id)
);
ALTER TABLE irrigation_queue_request ADD COLUMN circuit_snapshot JSONB;
ALTER TABLE irrigation_queue_request ADD CONSTRAINT queue_circuit_object CHECK(circuit_snapshot IS NULL OR jsonb_typeof(circuit_snapshot)='object');
ALTER TABLE irrigation_queue_request DROP CONSTRAINT irrigation_queue_request_reason_check;
ALTER TABLE irrigation_queue_request ADD CONSTRAINT irrigation_queue_request_reason_check CHECK(reason IN ('WAITING','PREVIEW_STARTED','PREVIEW_FINISHED','USER_CANCELLED','WAIT_EXPIRED','ZONE_CHANGED','BACKEND_RESTARTED','CIRCUIT_CHANGED'));
