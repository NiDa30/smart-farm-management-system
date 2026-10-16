-- New accepted route-bound reports only. Do not backfill a historical sample from latest.
-- No FK to mutable inventory/command tables: an old declaration remains a historical fact.
CREATE TABLE pump_circuit_history (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY CHECK(id BETWEEN 1 AND 9007199254740991),
 circuit_id TEXT NOT NULL,
 circuit_route JSONB NOT NULL CHECK(jsonb_typeof(circuit_route)='object'),
 boot_id UUID NOT NULL,sequence BIGINT NOT NULL CHECK(sequence BETWEEN 0 AND 9007199254740991),
 observed_at TIMESTAMPTZ NOT NULL,received_at TIMESTAMPTZ NOT NULL,
 reported_state TEXT NOT NULL CHECK(reported_state IN ('ON','OFF')),
 safety_lockout BOOLEAN NOT NULL,state_reason TEXT,
 last_ordinal BIGINT NOT NULL,command_id UUID,
 valve_interlock JSONB NOT NULL,durable_safety JSONB,
 UNIQUE(boot_id,sequence)
);
CREATE INDEX pump_circuit_history_time ON pump_circuit_history(received_at DESC,id DESC);
CREATE INDEX pump_circuit_history_route_time ON pump_circuit_history(circuit_id,received_at DESC,id DESC);
CREATE FUNCTION record_pump_circuit_history() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.valve_interlock->'route' IS NOT NULL AND NEW.fence_version=1 THEN
  -- The singleton pump_status row serializes accepted inserts/updates through commit,
  -- so a page ceiling cannot skip an earlier allocated, still-uncommitted sample ID.
  INSERT INTO pump_circuit_history(circuit_id,circuit_route,boot_id,sequence,observed_at,received_at,
    reported_state,safety_lockout,state_reason,last_ordinal,command_id,valve_interlock,durable_safety)
   VALUES(NEW.valve_interlock->'route'->>'circuitId',NEW.valve_interlock->'route',NEW.boot_id,NEW.sequence,
    NEW.observed_at,NEW.received_at,NEW.reported_state,NEW.safety_lockout,NEW.state_reason,NEW.last_fence_ordinal,
    (SELECT command_id FROM pump_command WHERE fence_ordinal=NEW.last_fence_ordinal AND (target_boot_id=NEW.boot_id OR action='OFF') LIMIT 1),
    NEW.valve_interlock,NEW.durable_safety)
   ON CONFLICT(boot_id,sequence) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER pump_circuit_history_report AFTER INSERT OR UPDATE ON pump_status
 FOR EACH ROW EXECUTE FUNCTION record_pump_circuit_history();
