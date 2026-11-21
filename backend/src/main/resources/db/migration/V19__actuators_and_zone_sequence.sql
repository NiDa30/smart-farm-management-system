-- Contract v3 actuators on ENV01 (zone valves, fan, grow light, misting) and a sequential
-- zone irrigation run that shares PUMP01. PUMP01 keeps contract v1 and its own tables.
ALTER TABLE iot_actuator_binding DROP CONSTRAINT iot_actuator_binding_actuator_type_check;
ALTER TABLE iot_actuator_binding DROP CONSTRAINT iot_actuator_binding_command_contract_check;
ALTER TABLE iot_actuator_binding ADD CONSTRAINT iot_actuator_binding_contract CHECK(
 (actuator_type='PUMP' AND command_contract='PUMP_V1')
 OR (actuator_type IN ('VALVE','FAN','LIGHT','MIST') AND command_contract='ACTUATOR_V3'));
-- Hard cap per ON command; must not exceed the firmware's FARM_*_MAX_SECONDS.
ALTER TABLE iot_actuator_binding ADD COLUMN max_seconds INT CHECK(max_seconds BETWEEN 1 AND 14400);
ALTER TABLE iot_actuator_binding ADD COLUMN zone_name TEXT CHECK(length(zone_name) BETWEEN 1 AND 60);
ALTER TABLE iot_actuator_binding ADD CONSTRAINT iot_actuator_binding_zone CHECK((actuator_type='VALVE')=(zone_name IS NOT NULL));
UPDATE iot_actuator_binding SET max_seconds=3600 WHERE actuator_id='PUMP01';
ALTER TABLE iot_actuator_binding ALTER COLUMN max_seconds SET NOT NULL;
INSERT INTO iot_actuator_binding(actuator_id,node_id,actuator_type,command_contract,max_seconds,zone_name)
SELECT v.* FROM (VALUES
 ('VALVE01','ENV01','VALVE','ACTUATOR_V3',3600,'Zone 1'),
 ('VALVE02','ENV01','VALVE','ACTUATOR_V3',3600,'Zone 2'),
 ('VALVE03','ENV01','VALVE','ACTUATOR_V3',3600,'Zone 3'),
 ('VALVE04','ENV01','VALVE','ACTUATOR_V3',3600,'Zone 4'),
 ('FAN01','ENV01','FAN','ACTUATOR_V3',14400,NULL),
 ('LIGHT01','ENV01','LIGHT','ACTUATOR_V3',14400,NULL),
 ('MIST01','ENV01','MIST','ACTUATOR_V3',600,NULL)) AS v(actuator_id,node_id,actuator_type,command_contract,max_seconds,zone_name)
WHERE EXISTS(SELECT 1 FROM iot_node WHERE node_id='ENV01');

CREATE TABLE actuator_status (
 actuator_id TEXT PRIMARY KEY REFERENCES iot_actuator_binding(actuator_id) ON DELETE CASCADE,
 boot_id UUID NOT NULL,
 sequence BIGINT NOT NULL CHECK(sequence>=0),
 observed_at TIMESTAMPTZ NOT NULL,
 received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 reported_state TEXT NOT NULL CHECK(reported_state IN ('ON','OFF')),
 safety_lockout BOOLEAN NOT NULL,
 state_reason TEXT NOT NULL CHECK(state_reason IN ('BOOT','COMMAND_ON','COMMAND_OFF','LOCKOUT_RESET','TIMER_EXPIRED','CONNECTION_LOST','DEVICE_FAULT','WATER_LOW'))
);

CREATE TABLE actuator_command (
 command_id UUID PRIMARY KEY,
 actuator_id TEXT NOT NULL REFERENCES iot_actuator_binding(actuator_id),
 action TEXT NOT NULL CHECK(action IN ('ON','OFF','RESET_LOCKOUT')),
 duration_seconds INT CHECK(duration_seconds BETWEEN 1 AND 14400),
 issued_at TIMESTAMPTZ NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('PENDING','SENT','PUBLISH_UNCERTAIN','EXECUTED','FAILED','TIMED_OUT')),
 reported_state TEXT CHECK(reported_state IN ('ON','OFF')),
 error_code TEXT CHECK(length(error_code) BETWEEN 1 AND 80),
 acknowledged_at TIMESTAMPTZ,
 ack_boot_id UUID,
 ack_sequence BIGINT,
 source TEXT NOT NULL CHECK(source IN ('MANUAL','SEQUENCE')),
 CHECK((action='ON')=(duration_seconds IS NOT NULL)),
 CHECK(expires_at>issued_at)
);
CREATE INDEX actuator_command_recent ON actuator_command(actuator_id,issued_at DESC);
CREATE INDEX actuator_command_unresolved ON actuator_command(actuator_id) WHERE state IN ('PENDING','SENT','PUBLISH_UNCERTAIN');

CREATE TABLE irrigation_sequence (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 state TEXT NOT NULL CHECK(state IN ('RUNNING','COMPLETED','ABORTED')),
 finished_at TIMESTAMPTZ,
 result TEXT CHECK(length(result) BETWEEN 1 AND 120),
 current_step INT NOT NULL DEFAULT 1,
 CHECK((state='RUNNING')=(finished_at IS NULL))
);
-- At most one sequence drives the shared pump.
CREATE UNIQUE INDEX irrigation_sequence_one_running ON irrigation_sequence((true)) WHERE state='RUNNING';

CREATE TABLE irrigation_sequence_step (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 sequence_id BIGINT NOT NULL REFERENCES irrigation_sequence(id) ON DELETE CASCADE,
 step_no INT NOT NULL CHECK(step_no BETWEEN 1 AND 4),
 valve_id TEXT NOT NULL REFERENCES iot_actuator_binding(actuator_id),
 pump_seconds INT NOT NULL CHECK(pump_seconds BETWEEN 1 AND 1800),
 phase TEXT NOT NULL DEFAULT 'WAITING'
  CHECK(phase IN ('WAITING','OPENING_VALVE','STARTING_PUMP','WATERING','CLOSING_VALVE','DONE','FAILED','SKIPPED')),
 phase_started_at TIMESTAMPTZ,
 valve_command UUID,
 pump_command UUID,
 close_command UUID,
 result TEXT CHECK(length(result) BETWEEN 1 AND 120),
 UNIQUE(sequence_id,step_no),
 UNIQUE(sequence_id,valve_id)
);
