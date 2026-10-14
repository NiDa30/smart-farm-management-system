-- Add SOIL/v2 declarations while retaining every legacy and water sample.
ALTER TABLE iot_node DROP CONSTRAINT iot_node_node_type_check;
ALTER TABLE iot_node DROP CONSTRAINT iot_node_check;
ALTER TABLE iot_node ADD CONSTRAINT iot_node_node_type_check CHECK(node_type IN ('ENVIRONMENT','WATER','SOIL'));
ALTER TABLE iot_node ADD CONSTRAINT iot_node_check CHECK(
 (node_type='ENVIRONMENT' AND telemetry_version=1 AND legacy_sensor_id IS NOT NULL AND legacy_sensor_id=node_id)
 OR (node_type IN ('WATER','SOIL') AND telemetry_version=2 AND legacy_sensor_id IS NULL));
-- SOIL_MOISTURE/% already belongs to the channel metric contract in V14.
