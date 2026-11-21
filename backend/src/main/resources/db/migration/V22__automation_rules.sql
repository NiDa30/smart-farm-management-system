-- General automation rules: condition tree (ALL/ANY) over sensors, time windows and actuator
-- states; actions on v3 actuators or a zone sequence (the only way a rule can run the pump).
CREATE TABLE automation_rule (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 name TEXT NOT NULL UNIQUE CHECK(length(name) BETWEEN 1 AND 80),
 enabled BOOLEAN NOT NULL DEFAULT false,
 definition JSONB NOT NULL,
 revision BIGINT NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 last_evaluated_at TIMESTAMPTZ,
 last_outcome TEXT CHECK(last_outcome IN ('TRUE','FALSE','UNKNOWN')),
 last_skip TEXT CHECK(length(last_skip) BETWEEN 1 AND 120),
 last_fired_at TIMESTAMPTZ
);

CREATE TABLE automation_rule_run (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 rule_id BIGINT NOT NULL REFERENCES automation_rule(id) ON DELETE CASCADE,
 rule_revision BIGINT NOT NULL,
 fired_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 result TEXT NOT NULL CHECK(result IN ('FIRED','PARTIAL','FAILED')),
 detail TEXT NOT NULL CHECK(length(detail) BETWEEN 1 AND 500),
 command_ids UUID[] NOT NULL DEFAULT '{}',
 sequence_id BIGINT
);
CREATE INDEX automation_rule_run_recent ON automation_rule_run(rule_id,fired_at DESC);

-- Rule-issued actuator commands are distinguishable from manual and sequence ones.
ALTER TABLE actuator_command DROP CONSTRAINT actuator_command_source_check;
ALTER TABLE actuator_command ADD CONSTRAINT actuator_command_source_check CHECK(source IN ('MANUAL','SEQUENCE','RULE'));
