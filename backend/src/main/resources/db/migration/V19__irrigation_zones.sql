-- Monitoring bindings only: no actuator, run, queue or command is created.
CREATE TABLE irrigation_zone (
 zone_id TEXT PRIMARY KEY CHECK(zone_id ~ '^[A-Z][A-Z0-9_-]{1,31}$'),
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 80),
 area_id TEXT NOT NULL REFERENCES sensor_area(id),
 soil_node_id TEXT NOT NULL REFERENCES iot_node(node_id),
 expected_source TEXT NOT NULL CHECK(expected_source IN ('SIMULATOR','PHYSICAL')),
 dry_threshold INTEGER NOT NULL CHECK(dry_threshold BETWEEN 0 AND 95),
 wet_threshold INTEGER NOT NULL CHECK(wet_threshold BETWEEN 5 AND 100 AND wet_threshold>=dry_threshold+5),
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 UNIQUE(zone_id,soil_node_id)
);
CREATE TABLE irrigation_zone_channel (
 zone_id TEXT NOT NULL, node_id TEXT NOT NULL, channel_id TEXT NOT NULL,
 position INTEGER NOT NULL CHECK(position BETWEEN 0 AND 2),
 PRIMARY KEY(zone_id,position),
 UNIQUE(node_id,channel_id),
 FOREIGN KEY(zone_id,node_id) REFERENCES irrigation_zone(zone_id,soil_node_id) ON DELETE CASCADE,
 FOREIGN KEY(node_id,channel_id) REFERENCES iot_channel(node_id,channel_id)
);
