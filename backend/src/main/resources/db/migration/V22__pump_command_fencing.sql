-- Opt-in MQTT fencing. Does not enable control or bind the preview queue to PUMP01.
CREATE SEQUENCE pump_fence_ordinal_seq MAXVALUE 9007199254740991 NO CYCLE;
CREATE TABLE pump_dispatch_gate(singleton INTEGER PRIMARY KEY CHECK(singleton=1));
INSERT INTO pump_dispatch_gate(singleton) VALUES(1);
ALTER TABLE pump_command ADD COLUMN fence_ordinal BIGINT UNIQUE CHECK(fence_ordinal BETWEEN 1 AND 9007199254740991);
ALTER TABLE pump_command ADD COLUMN target_boot_id UUID;
ALTER TABLE pump_command ADD CONSTRAINT pump_command_fence_pair CHECK((fence_ordinal IS NULL)=(target_boot_id IS NULL));
ALTER TABLE pump_status ADD COLUMN fence_version INTEGER CHECK(fence_version=1);
ALTER TABLE pump_status ADD COLUMN last_fence_ordinal BIGINT CHECK(last_fence_ordinal BETWEEN 0 AND 9007199254740991);
ALTER TABLE pump_status ADD CONSTRAINT pump_status_fence_pair CHECK((fence_version IS NULL)=(last_fence_ordinal IS NULL));
ALTER TABLE pump_status ADD COLUMN fence_restart_required BOOLEAN NOT NULL DEFAULT false;
