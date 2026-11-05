-- V1__phase1_certificate_assets.sql — Phase 1 (issue #24) additive schema changes.
--
-- GOVERNANCE (D01-W01 / issue #43): this file is a reviewable SQL artifact only. Phase 1 does NOT
-- introduce Flyway/Liquibase and does NOT change `spring.jpa.hibernate.ddl-auto` (still `update`),
-- which applies these additive changes in deployed environments; tests use `create-drop`.
-- When D01-W01 is separately authorized, this file is adopted into the migration tool's history
-- (baseline/cut-over decisions belong to #43). Do NOT execute this manually against production
-- without explicit owner approval, and never run the ce_records backfill automatically:
-- historical rows must be classified LEGACY_UNVERIFIED / EXTERNAL_LINK by an owner-approved
-- one-time step, never auto-verified (Phase 1 safeguard 2).
--
-- Dialect: portable PostgreSQL / H2-compatible SQL.

CREATE TABLE IF NOT EXISTS certificate_assets (
    id                        UUID PRIMARY KEY,
    user_id                   UUID NOT NULL,
    ce_record_id              UUID NULL,
    public_id                 VARCHAR(255) NOT NULL,
    resource_type             VARCHAR(16)  NOT NULL,
    delivery_type             VARCHAR(32)  NOT NULL DEFAULT 'upload',
    cloud_name                VARCHAR(128) NOT NULL,
    status                    VARCHAR(32)  NOT NULL,
    uploaded_at               TIMESTAMP WITH TIME ZONE NOT NULL,
    attached_at               TIMESTAMP WITH TIME ZONE NULL,
    updated_at                TIMESTAMP WITH TIME ZONE NOT NULL,
    cleanup_attempts          INTEGER NOT NULL DEFAULT 0,
    next_retry_at             TIMESTAMP WITH TIME ZONE NULL,
    last_failure_class        VARCHAR(64) NULL,
    locked_by                 VARCHAR(64) NULL,
    locked_at                 TIMESTAMP WITH TIME ZONE NULL,
    lease_expires_at          TIMESTAMP WITH TIME ZONE NULL,
    lease_token               UUID NULL,
    migrated_from_asset_id    UUID NULL,
    superseded_by_asset_id    UUID NULL,
    migrated_from_public_id   VARCHAR(255) NULL,
    migrated_from_resource_type VARCHAR(16) NULL,
    delivery_url              VARCHAR(500) NULL,
    original_filename         VARCHAR(255) NULL,
    CONSTRAINT uk_certificate_assets_cloud_identity UNIQUE (cloud_name, resource_type, public_id),
    CONSTRAINT ck_certificate_assets_resource_type CHECK (resource_type IN ('raw', 'image')),
    CONSTRAINT ck_certificate_assets_status CHECK (status IN (
        'RESERVED', 'PENDING', 'ATTACHED', 'SUPERSEDED', 'PENDING_DELETION',
        'DELETED', 'UPLOAD_FAILED', 'CLEANUP_FAILED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_certificate_assets_ce_record ON certificate_assets (ce_record_id);
CREATE INDEX IF NOT EXISTS ix_certificate_assets_status_retry ON certificate_assets (status, next_retry_at, lease_expires_at);
CREATE INDEX IF NOT EXISTS ix_certificate_assets_user ON certificate_assets (user_id);

-- Additive columns on ce_records (existing certificate_* columns are kept for compatibility
-- until Phase 3; the registry becomes authoritative for managed assets).
ALTER TABLE ce_records ADD COLUMN IF NOT EXISTS certificate_asset_id UUID NULL;
ALTER TABLE ce_records ADD COLUMN IF NOT EXISTS certificate_classification VARCHAR(32) NULL;
