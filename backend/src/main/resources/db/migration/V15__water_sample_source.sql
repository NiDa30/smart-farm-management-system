-- Per-message provenance is device-declared, not hardware attestation.
ALTER TABLE node_sample ADD COLUMN data_source TEXT NOT NULL DEFAULT 'UNSPECIFIED'
 CHECK(data_source IN ('UNSPECIFIED','SIMULATOR','PHYSICAL'));
