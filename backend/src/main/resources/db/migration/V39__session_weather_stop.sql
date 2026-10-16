-- Explicit opt-in; existing rain gates keep admission-only behavior.
ALTER TABLE zone_rain_gate ADD COLUMN stop_on_rain BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE zone_rain_gate ADD CONSTRAINT zone_rain_stop_requires_enabled CHECK (NOT stop_on_rain OR enabled);
CREATE TABLE irrigation_weather_stop (
 session_id UUID PRIMARY KEY REFERENCES irrigation_session(session_id),
 request_id UUID UNIQUE NOT NULL REFERENCES irrigation_session_action(request_id),
 zone_id TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 evidence JSONB NOT NULL CHECK (jsonb_typeof(evidence)='object')
);
CREATE INDEX irrigation_weather_stop_zone ON irrigation_weather_stop(zone_id,created_at DESC,session_id);
