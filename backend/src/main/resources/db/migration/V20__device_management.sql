-- Remote configuration (with ACK) and signed OTA for ENV01 (contract v4).
CREATE TABLE device_config_request (
 config_id UUID PRIMARY KEY,
 device_id TEXT NOT NULL CHECK(device_id='ENV01'),
 revision BIGINT NOT NULL UNIQUE CHECK(revision BETWEEN 1 AND 4294967295),
 settings JSONB NOT NULL,
 issued_at TIMESTAMPTZ NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('PENDING','SENT','PUBLISH_UNCERTAIN','APPLIED','REJECTED','TIMED_OUT')),
 error_code TEXT CHECK(length(error_code) BETWEEN 1 AND 80),
 applied_revision BIGINT,
 acknowledged_at TIMESTAMPTZ,
 CHECK(expires_at>issued_at)
);
CREATE INDEX device_config_request_recent ON device_config_request(issued_at DESC);

-- What the device reports it is running: applied settings, firmware, partition.
CREATE TABLE device_config_state (
 device_id TEXT PRIMARY KEY CHECK(device_id='ENV01'),
 boot_id UUID NOT NULL,
 sequence BIGINT NOT NULL CHECK(sequence>=0),
 observed_at TIMESTAMPTZ NOT NULL,
 received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 revision BIGINT NOT NULL CHECK(revision>=0),
 settings JSONB NOT NULL,
 firmware_version TEXT NOT NULL CHECK(length(firmware_version) BETWEEN 5 AND 23),
 partition TEXT NOT NULL CHECK(length(partition) BETWEEN 1 AND 16),
 ota_trial BOOLEAN NOT NULL
);

CREATE TABLE firmware_release (
 version TEXT PRIMARY KEY CHECK(version ~ '^[0-9]+\.[0-9]+\.[0-9]+(-[a-z0-9]{1,8})?$' AND length(version)<=23),
 size INT NOT NULL CHECK(size BETWEEN 1024 AND 1310720),
 sha256 TEXT NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),
 signature TEXT NOT NULL CHECK(length(signature) BETWEEN 80 AND 200),
 url TEXT NOT NULL CHECK(url ~ '^https://' AND length(url)<=1024),
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ota_job (
 ota_id UUID PRIMARY KEY,
 version TEXT NOT NULL REFERENCES firmware_release(version),
 from_version TEXT,
 issued_at TIMESTAMPTZ NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('SENT','PUBLISH_UNCERTAIN','RECEIVED','DOWNLOADING','REBOOTING',
   'REJECTED','FAILED','CONFIRMED','ROLLED_BACK','TIMED_OUT')),
 progress INT CHECK(progress BETWEEN 0 AND 100),
 error_code TEXT CHECK(length(error_code) BETWEEN 1 AND 80),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(expires_at>issued_at)
);
CREATE INDEX ota_job_recent ON ota_job(issued_at DESC);
-- One OTA in flight per farm (single controller).
CREATE UNIQUE INDEX ota_job_one_active ON ota_job((true)) WHERE state IN ('SENT','PUBLISH_UNCERTAIN','RECEIVED','DOWNLOADING','REBOOTING');
