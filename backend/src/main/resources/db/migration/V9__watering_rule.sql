CREATE TABLE watering_rule (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),
 enabled BOOLEAN NOT NULL DEFAULT FALSE,
 last_sample_at TIMESTAMPTZ,
 low_count INTEGER NOT NULL DEFAULT 0,
 active_command UUID REFERENCES pump_command(command_id),
 stop_command UUID REFERENCES pump_command(command_id),
 stop_attempted BOOLEAN NOT NULL DEFAULT FALSE,
 stop_requested BOOLEAN NOT NULL DEFAULT FALSE,
 cooldown_until TIMESTAMPTZ,
 last_result TEXT NOT NULL DEFAULT 'DISABLED'
);
INSERT INTO watering_rule(singleton) VALUES(1);
CREATE TABLE watering_run (
 id BIGSERIAL PRIMARY KEY,
 started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 command_id UUID REFERENCES pump_command(command_id),
 result TEXT NOT NULL
);
