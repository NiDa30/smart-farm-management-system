CREATE TABLE pump_state_history (
 id BIGSERIAL PRIMARY KEY,
 boot_id UUID NOT NULL,
 sequence BIGINT NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL,
 received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 reported_state TEXT NOT NULL,
 safety_lockout BOOLEAN NOT NULL,
 change_type TEXT NOT NULL
);
CREATE FUNCTION record_pump_state_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  INSERT INTO pump_state_history(boot_id,sequence,observed_at,reported_state,safety_lockout,change_type)
  VALUES(NEW.boot_id,NEW.sequence,NEW.observed_at,NEW.reported_state,NEW.safety_lockout,'FIRST_STATUS');
 ELSIF NEW.boot_id<>OLD.boot_id OR NEW.reported_state<>OLD.reported_state OR NEW.safety_lockout<>OLD.safety_lockout THEN
  INSERT INTO pump_state_history(boot_id,sequence,observed_at,reported_state,safety_lockout,change_type)
  VALUES(NEW.boot_id,NEW.sequence,NEW.observed_at,NEW.reported_state,NEW.safety_lockout,
   CASE WHEN NEW.boot_id<>OLD.boot_id THEN 'NEW_BOOT' ELSE 'STATE_CHANGED' END);
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER pump_state_change AFTER INSERT OR UPDATE ON pump_status
FOR EACH ROW EXECUTE FUNCTION record_pump_state_change();
