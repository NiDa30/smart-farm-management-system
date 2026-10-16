-- Independent monitor-only weather nodes; no device, binding or sample is created.
ALTER TABLE iot_node DROP CONSTRAINT iot_node_node_type_check;
ALTER TABLE iot_node DROP CONSTRAINT iot_node_check;
ALTER TABLE iot_node ADD CONSTRAINT iot_node_node_type_check
 CHECK (node_type IN ('ENVIRONMENT','WATER','SOIL','WEATHER'));
ALTER TABLE iot_node ADD CONSTRAINT iot_node_check CHECK (
 (node_type='ENVIRONMENT' AND telemetry_version=1 AND legacy_sensor_id IS NOT NULL AND legacy_sensor_id=node_id)
 OR (node_type IN ('WATER','SOIL','WEATHER') AND telemetry_version=2 AND legacy_sensor_id IS NULL));
ALTER TABLE iot_channel DROP CONSTRAINT iot_channel_check;
ALTER TABLE iot_channel ADD CONSTRAINT iot_channel_check CHECK (
 (metric='AIR_TEMPERATURE' AND unit='°C') OR (metric='AIR_HUMIDITY' AND unit='%RH')
 OR (metric='SOIL_MOISTURE' AND unit='%') OR (metric='WATER_PRESENT' AND unit='boolean')
 OR (metric='FLOW_RATE' AND unit='L/min') OR (metric='WATER_TEMPERATURE' AND unit='°C')
 OR (metric='WATER_PRESSURE' AND unit='kPa') OR (metric='RAIN_DETECTED' AND unit='boolean')
 OR (metric='LIGHT_ILLUMINANCE' AND unit='lux'));
