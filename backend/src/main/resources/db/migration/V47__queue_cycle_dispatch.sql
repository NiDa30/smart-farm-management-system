-- Explicit future-request authorization. Startup always disables it; no seeded authority.
CREATE TABLE irrigation_queue_dispatch_state (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),
 revision BIGINT NOT NULL CHECK(revision BETWEEN 1 AND 9007199254740991),
 enabled BOOLEAN NOT NULL DEFAULT FALSE,
 definition JSONB CHECK(definition IS NULL OR jsonb_typeof(definition)='object'),
 after_ticket BIGINT NOT NULL DEFAULT 0,
 after_pump_ordinal BIGINT NOT NULL DEFAULT 0,
 after_valve_ordinal BIGINT NOT NULL DEFAULT 0,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 last_tick_at TIMESTAMPTZ,
 result TEXT NOT NULL,
 CHECK(NOT enabled OR (definition IS NOT NULL AND last_tick_at IS NOT NULL))
);
INSERT INTO irrigation_queue_dispatch_state(singleton,revision,result) VALUES(1,1,'DISABLED');
CREATE TABLE irrigation_queue_dispatch_link (
 request_id UUID PRIMARY KEY REFERENCES irrigation_queue_handoff(request_id),
 policy_revision BIGINT NOT NULL,
 policy_definition JSONB NOT NULL CHECK(jsonb_typeof(policy_definition)='object'),
 session_id UUID UNIQUE NOT NULL REFERENCES irrigation_session_cycle(session_id),
 arm_id UUID UNIQUE NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
