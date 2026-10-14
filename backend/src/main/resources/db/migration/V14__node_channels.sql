-- Additive inventory: legacy telemetry and PUMP01 command contracts remain intact.
CREATE TABLE iot_node (
 node_id TEXT PRIMARY KEY CHECK(node_id ~ '^[A-Z][A-Z0-9_-]{1,31}$'),
 farm_id TEXT NOT NULL DEFAULT 'FARM001' CHECK(farm_id='FARM001'),
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 80),
 area_id TEXT NOT NULL REFERENCES sensor_area(id),
 node_type TEXT NOT NULL CHECK(node_type IN ('ENVIRONMENT','WATER')),
 telemetry_version INTEGER NOT NULL,
 legacy_sensor_id TEXT UNIQUE REFERENCES sensor_device(device_id) ON DELETE CASCADE,
 CHECK((node_type='ENVIRONMENT' AND telemetry_version=1 AND legacy_sensor_id IS NOT NULL AND legacy_sensor_id=node_id)
    OR (node_type='WATER' AND telemetry_version=2 AND legacy_sensor_id IS NULL))
);
CREATE TABLE iot_channel (
 node_id TEXT NOT NULL REFERENCES iot_node(node_id) ON DELETE CASCADE,
 channel_id TEXT NOT NULL CHECK(channel_id ~ '^[A-Z][A-Z0-9_-]{1,31}$'),
 metric TEXT NOT NULL, unit TEXT NOT NULL,
 calibration_version TEXT CHECK(length(calibration_version) BETWEEN 1 AND 40),
 PRIMARY KEY(node_id,channel_id),
 CHECK((metric='AIR_TEMPERATURE' AND unit='°C') OR (metric='AIR_HUMIDITY' AND unit='%RH')
 OR (metric='SOIL_MOISTURE' AND unit='%') OR (metric='WATER_PRESENT' AND unit='boolean')
 OR (metric='FLOW_RATE' AND unit='L/min') OR (metric='WATER_TEMPERATURE' AND unit='°C')
 OR (metric='WATER_PRESSURE' AND unit='kPa'))
);
CREATE TABLE iot_actuator_binding (
 actuator_id TEXT PRIMARY KEY,
 node_id TEXT NOT NULL REFERENCES iot_node(node_id) ON DELETE CASCADE,
 actuator_type TEXT NOT NULL CHECK(actuator_type='PUMP'),
 command_contract TEXT NOT NULL CHECK(command_contract='PUMP_V1')
);
INSERT INTO iot_node(node_id,name,area_id,node_type,telemetry_version,legacy_sensor_id)
 SELECT device_id,name,area_id,'ENVIRONMENT',1,device_id FROM sensor_device;
INSERT INTO iot_channel(node_id,channel_id,metric,unit)
 SELECT node_id,c.* FROM iot_node CROSS JOIN (VALUES
 ('AIR_TEMP','AIR_TEMPERATURE','°C'),('AIR_HUMIDITY','AIR_HUMIDITY','%RH'),('SOIL','SOIL_MOISTURE','%')) c;
INSERT INTO iot_actuator_binding VALUES('PUMP01','ENV01','PUMP','PUMP_V1');
-- Keep old "add sensor" workflow and new physical inventory synchronized atomically.
CREATE FUNCTION register_legacy_node() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM iot_actuator_binding WHERE actuator_id=NEW.device_id) THEN
  RAISE EXCEPTION USING ERRCODE='23505', MESSAGE='Actuator identity reserved';
 END IF;
 INSERT INTO iot_node(node_id,name,area_id,node_type,telemetry_version,legacy_sensor_id)
 VALUES(NEW.device_id,NEW.name,NEW.area_id,'ENVIRONMENT',1,NEW.device_id);
 INSERT INTO iot_channel(node_id,channel_id,metric,unit) VALUES
 (NEW.device_id,'AIR_TEMP','AIR_TEMPERATURE','°C'),
 (NEW.device_id,'AIR_HUMIDITY','AIR_HUMIDITY','%RH'),
 (NEW.device_id,'SOIL','SOIL_MOISTURE','%');
 RETURN NEW;
END; $$;
CREATE TRIGGER legacy_node_registration AFTER INSERT ON sensor_device
 FOR EACH ROW EXECUTE FUNCTION register_legacy_node();
CREATE TABLE node_sample (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 node_id TEXT NOT NULL REFERENCES iot_node(node_id) ON DELETE CASCADE,
 boot_id UUID NOT NULL, sequence BIGINT NOT NULL CHECK(sequence>=0),
 observed_at TIMESTAMPTZ NOT NULL, received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 uptime_ms BIGINT NOT NULL CHECK(uptime_ms>=0),
 UNIQUE(node_id,boot_id,sequence), UNIQUE(id,node_id)
);
CREATE TABLE channel_sample (
 sample_id BIGINT NOT NULL, node_id TEXT NOT NULL, channel_id TEXT NOT NULL,
 quality TEXT NOT NULL CHECK(quality IN ('VALID','SENSOR_FAULT')),
 number_value DOUBLE PRECISION, boolean_value BOOLEAN,
 calibration_version TEXT CHECK(length(calibration_version) BETWEEN 1 AND 40),
 PRIMARY KEY(sample_id,channel_id),
 FOREIGN KEY(sample_id,node_id) REFERENCES node_sample(id,node_id) ON DELETE CASCADE,
 FOREIGN KEY(node_id,channel_id) REFERENCES iot_channel(node_id,channel_id) ON DELETE CASCADE,
 CHECK((quality='SENSOR_FAULT' AND number_value IS NULL AND boolean_value IS NULL)
 OR (quality='VALID' AND ((number_value IS NOT NULL AND boolean_value IS NULL)
 OR (number_value IS NULL AND boolean_value IS NOT NULL))))
);
CREATE INDEX node_sample_latest ON node_sample(node_id,observed_at DESC,id DESC);
CREATE INDEX channel_sample_latest ON channel_sample(node_id,channel_id,sample_id DESC);
