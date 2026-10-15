-- Command-backed ownership, serialized by pump_dispatch_gate. No time-based lease release.
ALTER TABLE pump_command ADD COLUMN control_source TEXT NOT NULL DEFAULT 'LEGACY'
 CHECK(control_source IN ('LEGACY','MANUAL','AUTOMATION'));
ALTER TABLE pump_command ADD COLUMN owner_command_id UUID;
ALTER TABLE pump_command ADD COLUMN owner_released_at TIMESTAMPTZ;
ALTER TABLE pump_command ADD CONSTRAINT pump_owner_release CHECK(owner_released_at IS NULL OR action='ON');
CREATE INDEX pump_open_owner ON pump_command(fence_ordinal) WHERE action='ON' AND fence_ordinal IS NOT NULL AND owner_released_at IS NULL;
ALTER TABLE watering_rule ADD COLUMN execution_epoch BIGINT NOT NULL DEFAULT 1 CHECK(execution_epoch>0);
