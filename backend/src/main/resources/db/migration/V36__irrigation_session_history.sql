-- Pagination identities only. Preserve all V35 session/action content and state.
ALTER TABLE irrigation_session ADD COLUMN history_id BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE
    CHECK (history_id BETWEEN 1 AND 9007199254740991);
ALTER TABLE irrigation_session_action ADD COLUMN history_id BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE
    CHECK (history_id BETWEEN 1 AND 9007199254740991);
CREATE INDEX irrigation_session_history_window ON irrigation_session(created_at DESC, history_id DESC);
CREATE INDEX irrigation_session_action_history ON irrigation_session_action(session_id, history_id DESC);
