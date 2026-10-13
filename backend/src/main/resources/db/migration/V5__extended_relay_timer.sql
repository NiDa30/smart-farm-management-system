-- Retain bounded runtime, expand Wokwi timer to one hour.
ALTER TABLE pump_command DROP CONSTRAINT pump_command_check;
ALTER TABLE pump_command ADD CONSTRAINT pump_command_duration_check
CHECK ((action='ON' AND duration_seconds IS NOT NULL AND duration_seconds BETWEEN 1 AND 3600)
 OR (action<>'ON' AND duration_seconds IS NULL));
