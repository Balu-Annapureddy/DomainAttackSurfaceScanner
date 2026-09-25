-- ============================================================
-- DOMAIN ATTACK SURFACE SCANNER — PRODUCTION DATABASE SCHEMA
-- PostgreSQL 14+ DDL
-- ============================================================

-- Enable pgcrypto if needed for UUIDs, or use application-generated UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. Users ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ─── 2. Sessions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address VARCHAR(64),
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ─── 3. Scans ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scans (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'running',
  score INTEGER,
  score_label VARCHAR(64) DEFAULT 'External Hygiene Score',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_saved BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_domain ON scans(domain);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at);

-- ─── 4. Scan Results (Detailed JSON payloads) ───────────────
CREATE TABLE IF NOT EXISTS scan_results (
  scan_id VARCHAR(64) PRIMARY KEY REFERENCES scans(id) ON DELETE CASCADE,
  categories JSONB NOT NULL,
  assets JSONB NOT NULL,
  relationships JSONB NOT NULL,
  findings JSONB NOT NULL,
  warnings JSONB NOT NULL,
  completeness VARCHAR(32),
  completeness_details JSONB
);

-- ─── 5. Quota Tracking ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotas (
  identity_key VARCHAR(128) PRIMARY KEY,
  scan_count INTEGER NOT NULL DEFAULT 0,
  window_start BIGINT NOT NULL
);
