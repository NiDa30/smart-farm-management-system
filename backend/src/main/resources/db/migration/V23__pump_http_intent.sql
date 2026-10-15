-- HTTP request identity is separate from MQTT ordinal and physical execution.
ALTER TABLE pump_dispatch_gate ADD COLUMN intent_revision BIGINT NOT NULL DEFAULT 1 CHECK(intent_revision BETWEEN 1 AND 9007199254740991);
ALTER TABLE pump_command ADD COLUMN http_intent_revision BIGINT CHECK(http_intent_revision BETWEEN 1 AND 9007199254740991);
ALTER TABLE pump_command ADD COLUMN http_expected_boot UUID;
ALTER TABLE pump_command ADD COLUMN http_reviewed_at TIMESTAMPTZ;
ALTER TABLE pump_command ADD CONSTRAINT pump_http_identity CHECK (
 (http_intent_revision IS NULL AND http_expected_boot IS NULL AND http_reviewed_at IS NULL)
 OR (http_intent_revision IS NOT NULL AND http_reviewed_at IS NOT NULL AND (action='OFF' OR http_expected_boot IS NOT NULL))
);
