-- State history for contract v3 actuators (same shape as pump_state_history) and the rated
-- power used to ESTIMATE energy from device-reported ON time. No energy meter exists yet.
CREATE TABLE actuator_state_history (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actuator_id TEXT NOT NULL REFERENCES iot_actuator_binding(actuator_id) ON DELETE CASCADE,
 boot_id UUID NOT NULL,
 sequence BIGINT NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL,
 received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 reported_state TEXT NOT NULL CHECK(reported_state IN ('ON','OFF')),
 safety_lockout BOOLEAN NOT NULL,
 state_reason TEXT NOT NULL,
 change_type TEXT NOT NULL CHECK(change_type IN ('FIRST_STATUS','NEW_BOOT','STATE_CHANGED'))
);
CREATE INDEX actuator_state_history_time ON actuator_state_history(actuator_id,observed_at);

CREATE FUNCTION record_actuator_state_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' OR NEW.boot_id<>OLD.boot_id OR NEW.reported_state<>OLD.reported_state
    OR NEW.safety_lockout<>OLD.safety_lockout OR NEW.state_reason<>OLD.state_reason THEN
  INSERT INTO actuator_state_history(actuator_id,boot_id,sequence,observed_at,reported_state,safety_lockout,state_reason,change_type)
  VALUES(NEW.actuator_id,NEW.boot_id,NEW.sequence,NEW.observed_at,NEW.reported_state,NEW.safety_lockout,NEW.state_reason,
   CASE WHEN TG_OP='INSERT' THEN 'FIRST_STATUS' WHEN NEW.boot_id<>OLD.boot_id THEN 'NEW_BOOT' ELSE 'STATE_CHANGED' END);
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER actuator_state_history_trigger AFTER INSERT OR UPDATE ON actuator_status
 FOR EACH ROW EXECUTE FUNCTION record_actuator_state_change();

-- Nameplate power in watts, set by the operator; NULL = unknown, excluded from estimates.
ALTER TABLE iot_actuator_binding ADD COLUMN rated_watts INT CHECK(rated_watts BETWEEN 1 AND 20000);
