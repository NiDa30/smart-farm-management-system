CREATE TABLE sensor_area (
    id TEXT PRIMARY KEY CHECK (id ~ '^[A-Z][A-Z0-9_-]{1,31}$'),
    farm_id TEXT NOT NULL DEFAULT 'FARM001' CHECK (farm_id = 'FARM001'),
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
    UNIQUE (farm_id, name)
);
CREATE TABLE sensor_device (
    device_id TEXT PRIMARY KEY CHECK (device_id ~ '^[A-Z][A-Z0-9_-]{1,31}$'),
    farm_id TEXT NOT NULL DEFAULT 'FARM001' CHECK (farm_id = 'FARM001'),
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
    area_id TEXT NOT NULL REFERENCES sensor_area(id),
    sensor_type TEXT NOT NULL DEFAULT 'ENVIRONMENT' CHECK (sensor_type = 'ENVIRONMENT'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (farm_id, device_id)
);
INSERT INTO sensor_area (id, name) VALUES ('AREA001', 'Khu vực mặc định');
INSERT INTO sensor_device (device_id, name, area_id) VALUES ('ENV01', 'Cảm biến ENV01', 'AREA001');
ALTER TABLE telemetry DROP CONSTRAINT telemetry_device_id_check;
ALTER TABLE telemetry ADD CONSTRAINT telemetry_registered_device
    FOREIGN KEY (farm_id, device_id) REFERENCES sensor_device(farm_id, device_id);
CREATE INDEX sensor_device_area ON sensor_device(area_id);
