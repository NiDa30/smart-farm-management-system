-- Stop always supersedes a pending enable revision, including while already disabled.
-- A repeated exact stop identity only reconciles and cannot stop a later authorization.
ALTER TABLE irrigation_queue_dispatch_state ADD COLUMN last_stop_id UUID;
