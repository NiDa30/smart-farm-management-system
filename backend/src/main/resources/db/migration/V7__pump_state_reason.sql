ALTER TABLE pump_status ADD COLUMN state_reason TEXT;
ALTER TABLE pump_state_history ADD COLUMN state_reason TEXT;
CREATE OR REPLACE FUNCTION record_pump_state_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  INSERT INTO pump_state_history(boot_id,sequence,observed_at,reported_state,safety_lockout,change_type,state_reason)
  VALUES(NEW.boot_id,NEW.sequence,NEW.observed_at,NEW.reported_state,NEW.safety_lockout,'FIRST_STATUS',NEW.state_reason);
 ELSIF NEW.boot_id<>OLD.boot_id OR NEW.reported_state<>OLD.reported_state OR NEW.safety_lockout<>OLD.safety_lockout OR NEW.state_reason IS DISTINCT FROM OLD.state_reason THEN
  INSERT INTO pump_state_history(boot_id,sequence,observed_at,reported_state,safety_lockout,change_type,state_reason)
  VALUES(NEW.boot_id,NEW.sequence,NEW.observed_at,NEW.reported_state,NEW.safety_lockout,
   CASE WHEN NEW.boot_id<>OLD.boot_id THEN 'NEW_BOOT' ELSE 'STATE_CHANGED' END,NEW.state_reason);
 END IF;
 RETURN NEW;
END;
$$;
