ALTER TABLE watering_rule
 ADD COLUMN dry_threshold INTEGER NOT NULL DEFAULT 30 CHECK(dry_threshold BETWEEN 1 AND 90),
 ADD COLUMN wet_threshold INTEGER NOT NULL DEFAULT 35 CHECK(wet_threshold BETWEEN 6 AND 100),
 ADD COLUMN duration_seconds INTEGER NOT NULL DEFAULT 20 CHECK(duration_seconds BETWEEN 1 AND 30),
 ADD COLUMN cooldown_seconds INTEGER NOT NULL DEFAULT 60 CHECK(cooldown_seconds BETWEEN 60 AND 3600),
 ADD COLUMN settings_revision BIGINT NOT NULL DEFAULT 1 CHECK(settings_revision>0),
 ADD CONSTRAINT watering_threshold_gap CHECK(wet_threshold>=dry_threshold+5);
-- Do not invent settings for historical runs that did not record them.
ALTER TABLE watering_run
 ADD COLUMN dry_threshold INTEGER,
 ADD COLUMN wet_threshold INTEGER,
 ADD COLUMN duration_seconds INTEGER,
 ADD COLUMN cooldown_seconds INTEGER,
 ADD COLUMN settings_revision BIGINT;
