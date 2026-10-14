CREATE TABLE sensor_alert_state (
 device_id TEXT PRIMARY KEY REFERENCES sensor_device(device_id),
 last_observed_at TIMESTAMPTZ,
 low_soil BOOLEAN NOT NULL DEFAULT FALSE,
 high_temperature BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE sensor_alert (
 id BIGSERIAL PRIMARY KEY,
 device_id TEXT NOT NULL REFERENCES sensor_device(device_id),
 type TEXT NOT NULL CHECK(type IN ('LOW_SOIL','HIGH_TEMPERATURE')),
 opened_at TIMESTAMPTZ NOT NULL,
 opened_value DOUBLE PRECISION NOT NULL,
 cleared_at TIMESTAMPTZ,
 cleared_value DOUBLE PRECISION
);
CREATE UNIQUE INDEX sensor_alert_active ON sensor_alert(device_id,type) WHERE cleared_at IS NULL;
