-- Optional route on a dispatched pump command. Legacy rows remain unbound.
ALTER TABLE pump_command ADD COLUMN circuit_route JSONB
 CHECK(circuit_route IS NULL OR jsonb_typeof(circuit_route)='object');
