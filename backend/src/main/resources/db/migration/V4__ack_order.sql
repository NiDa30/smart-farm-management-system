ALTER TABLE pump_command ADD COLUMN ack_boot_id UUID;
ALTER TABLE pump_command ADD COLUMN ack_sequence BIGINT CHECK (ack_sequence >= 0);
