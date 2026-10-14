CREATE TABLE watering_calendar (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),
 mode TEXT NOT NULL DEFAULT 'ANY_TIME' CHECK(mode IN ('ANY_TIME','TIME_WINDOWS')),
 zone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh' CHECK(zone='Asia/Ho_Chi_Minh'),
 revision BIGINT NOT NULL DEFAULT 1 CHECK(revision>0),
 windows JSONB NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(windows)='array')
);
INSERT INTO watering_calendar(singleton) VALUES(1);
-- Legacy runs have no recorded calendar; do not invent one for them.
ALTER TABLE watering_run
 ADD COLUMN calendar_revision BIGINT,
 ADD COLUMN calendar_mode TEXT,
 ADD COLUMN window_start TIMESTAMPTZ,
 ADD COLUMN window_end TIMESTAMPTZ;
