ALTER TABLE sensor_alert
 ADD COLUMN acknowledged_at TIMESTAMPTZ,
 ADD COLUMN acknowledgement_note TEXT,
 ADD CONSTRAINT alert_acknowledgement_note_length CHECK (char_length(acknowledgement_note) <= 500),
 ADD CONSTRAINT alert_acknowledgement_note_requires_time CHECK (acknowledged_at IS NOT NULL OR acknowledgement_note IS NULL);
