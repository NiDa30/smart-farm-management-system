-- Monitoring only. Episodes never dispatch commands or imply pump safety permission.
CREATE TABLE soil_alert_cursor (
 node_id TEXT PRIMARY KEY REFERENCES iot_node(node_id) ON DELETE CASCADE,
 observed_at TIMESTAMPTZ, boot_id UUID, sequence BIGINT
);
CREATE TABLE soil_alert_state (
 node_id TEXT NOT NULL REFERENCES iot_node(node_id) ON DELETE CASCADE,
 data_source TEXT NOT NULL CHECK(data_source IN ('UNSPECIFIED','SIMULATOR','PHYSICAL')),
 type TEXT NOT NULL CHECK(type IN ('DRY_SOIL','SENSOR_FAULT')),
 channel_key TEXT NOT NULL,
 active BOOLEAN NOT NULL DEFAULT false,
 candidate BOOLEAN, consecutive INTEGER NOT NULL DEFAULT 0 CHECK(consecutive BETWEEN 0 AND 1),
 PRIMARY KEY(node_id,data_source,type,channel_key)
);
CREATE TABLE soil_alert (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 node_id TEXT NOT NULL REFERENCES iot_node(node_id) ON DELETE CASCADE,
 data_source TEXT NOT NULL CHECK(data_source IN ('UNSPECIFIED','SIMULATOR','PHYSICAL')),
 type TEXT NOT NULL CHECK(type IN ('DRY_SOIL','SENSOR_FAULT')),
 channel_key TEXT NOT NULL,
 opened_sample_id BIGINT NOT NULL,
 cleared_sample_id BIGINT,
 acknowledged_at TIMESTAMPTZ, acknowledgement_note TEXT CHECK(length(acknowledgement_note)<=500),
 CHECK(acknowledged_at IS NOT NULL OR acknowledgement_note IS NULL),
 CHECK(channel_key ~ '^[A-Z][A-Z0-9_-]{1,31}$'),
 FOREIGN KEY(node_id,channel_key) REFERENCES iot_channel(node_id,channel_id) ON DELETE CASCADE,
 FOREIGN KEY(opened_sample_id,node_id) REFERENCES node_sample(id,node_id) ON DELETE CASCADE,
 FOREIGN KEY(cleared_sample_id,node_id) REFERENCES node_sample(id,node_id)
);
CREATE UNIQUE INDEX soil_alert_open ON soil_alert(node_id,data_source,type,channel_key) WHERE cleared_sample_id IS NULL;
CREATE INDEX soil_alert_recent ON soil_alert(id DESC);
