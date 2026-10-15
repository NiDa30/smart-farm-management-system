-- Fixed simulator controller. Does not bind a pump or change ENV01/PUMP01.
-- Fail on pre-existing reserved IDs rather than silently hijacking a monitor.
ALTER TABLE iot_node ADD CONSTRAINT irrigation_reserved_node CHECK(node_id NOT IN ('IRRIGATION01','VALVE01'));
ALTER TABLE sensor_device ADD CONSTRAINT irrigation_reserved_sensor CHECK(device_id NOT IN ('IRRIGATION01','VALVE01'));
ALTER TABLE iot_actuator_binding ADD CONSTRAINT irrigation_reserved_actuator CHECK(actuator_id NOT IN ('IRRIGATION01','VALVE01'));
CREATE TABLE irrigation_demo_binding (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),
 zone_id TEXT REFERENCES irrigation_zone(zone_id), zone_revision INTEGER, close_fence_at TIMESTAMPTZ,
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 CHECK((zone_id IS NULL AND zone_revision IS NULL) OR (zone_id IS NOT NULL AND zone_revision>0))
);
INSERT INTO irrigation_demo_binding(singleton) VALUES(1);
CREATE TABLE irrigation_demo_command (
 command_id UUID PRIMARY KEY, ordinal BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE CHECK(ordinal BETWEEN 1 AND 9007199254740991),
 zone_id TEXT NOT NULL REFERENCES irrigation_zone(zone_id), binding_revision INTEGER NOT NULL,
 boot_id UUID NOT NULL, action TEXT NOT NULL CHECK(action IN ('OPEN','CLOSE')),
 duration_seconds INTEGER, requested_at TIMESTAMPTZ NOT NULL, issued_at TIMESTAMPTZ NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('PENDING','SENT','PUBLISH_UNCERTAIN','EXECUTED','REJECTED')),
 ack_sequence BIGINT, ack_boot_id UUID, error_code TEXT,
 CHECK((action='OPEN' AND duration_seconds IS NOT NULL AND duration_seconds BETWEEN 1 AND 30) OR (action='CLOSE' AND duration_seconds IS NULL))
);
CREATE TABLE irrigation_demo_status (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),zone_id TEXT NOT NULL,
 boot_id UUID NOT NULL,sequence BIGINT NOT NULL CHECK(sequence BETWEEN 0 AND 9007199254740991),
 observed_at TIMESTAMPTZ NOT NULL,received_at TIMESTAMPTZ NOT NULL,
 gpio_state TEXT NOT NULL CHECK(gpio_state IN ('OPEN','CLOSED')),reason TEXT NOT NULL,
 demo_enabled BOOLEAN NOT NULL,last_ordinal BIGINT NOT NULL CHECK(last_ordinal BETWEEN 0 AND 9007199254740991)
);
