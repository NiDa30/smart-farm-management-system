-- Optional simulator end stops. Old status rows remain explicitly unverified.
ALTER TABLE irrigation_demo_status ADD COLUMN feedback_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE irrigation_demo_status ADD COLUMN feedback_state TEXT NOT NULL DEFAULT 'UNKNOWN'
 CHECK(feedback_state IN ('UNKNOWN','OPEN','CLOSED','CONFLICT'));
ALTER TABLE irrigation_demo_status ADD COLUMN feedback_fault TEXT
 CHECK(feedback_fault IN ('SWITCH_CONFLICT','OPEN_TIMEOUT','CLOSE_TIMEOUT','POSITION_LOST'));
ALTER TABLE irrigation_demo_status ADD CONSTRAINT valve_feedback_shape CHECK (
 (feedback_enabled OR (feedback_state='UNKNOWN' AND feedback_fault IS NULL))
 AND (feedback_state<>'CONFLICT' OR (feedback_fault IS NOT NULL AND feedback_fault='SWITCH_CONFLICT'))
 AND (feedback_fault IS NULL OR (gpio_state='CLOSED' AND reason='POSITION_FAULT'))
);
