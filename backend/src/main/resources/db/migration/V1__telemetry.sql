CREATE TABLE telemetry (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    farm_id TEXT NOT NULL CHECK (farm_id = 'FARM001'),
    device_id TEXT NOT NULL CHECK (device_id = 'ENV01'),
    schema_version INTEGER NOT NULL CHECK (schema_version = 1),
    boot_id UUID NOT NULL,
    sequence BIGINT NOT NULL CHECK (sequence >= 0),
    observed_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    temperature DOUBLE PRECISION NOT NULL CHECK (temperature BETWEEN -40 AND 80),
    humidity DOUBLE PRECISION NOT NULL CHECK (humidity BETWEEN 0 AND 100),
    soil_moisture DOUBLE PRECISION NOT NULL CHECK (soil_moisture BETWEEN 0 AND 100),
    uptime_ms BIGINT NOT NULL CHECK (uptime_ms >= 0),
    CONSTRAINT telemetry_message_identity UNIQUE (device_id, boot_id, sequence)
);
CREATE INDEX telemetry_device_time ON telemetry (device_id, observed_at DESC, id DESC);
