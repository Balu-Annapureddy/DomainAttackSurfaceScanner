import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import type { DomainScan, HistoryScanItem, User } from '../../../shared/types';
import { config } from '../config';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface QuotaRecord {
  identityKey: string;
  scanCount: number;
  windowStart: number;
}

export interface DatabaseAdapter {
  init(): Promise<void>;
  close(): Promise<void>;
  createUser(email: string, passwordHash: string): Promise<User>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<User | null>;
  createSession(userId: string, ipAddress?: string, userAgent?: string): Promise<SessionRecord>;
  getSession(sessionId: string): Promise<{ session: SessionRecord; user: User } | null>;
  deleteSession(sessionId: string): Promise<void>;
  deleteExpiredSessions(): Promise<void>;
  saveScan(scan: DomainScan, userId?: string | null, isSaved?: boolean): Promise<void>;
  getScan(scanId: string): Promise<{ scan: DomainScan; userId: string | null } | null>;
  getUserScans(userId: string): Promise<HistoryScanItem[]>;
  deleteScan(scanId: string, userId: string): Promise<boolean>;
  getQuota(identityKey: string, windowMs: number): Promise<QuotaRecord>;
  incrementQuota(identityKey: string, windowMs: number): Promise<number>;
}

// ─────────────────────────────────────────────────────────────
// 1. In-Memory / File-Backed Adapter (Dev & Test Fallback)
// ─────────────────────────────────────────────────────────────
class LocalJsonAdapter implements DatabaseAdapter {
  private filePath: string;
  private data: {
    users: Record<string, UserRecord>;
    sessions: Record<string, SessionRecord>;
    scans: Record<string, { scan: DomainScan; userId: string | null; isSaved: boolean }>;
    quotas: Record<string, QuotaRecord>;
  };
  private persistDebounceTimer: NodeJS.Timeout | null = null;

  constructor() {
    const dataDir = path.resolve(process.cwd(), '.data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {
        // ignore
      }
    }
    this.filePath = path.join(dataDir, 'dass_db.json');
    this.data = {
      users: {},
      sessions: {},
      scans: {},
      quotas: {},
    };
  }

  async init(): Promise<void> {
    if (config.nodeEnv === 'test') {
      return; // Keep purely in-memory during unit tests
    }
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        this.data = JSON.parse(raw);
      }
    } catch {
      // Start fresh if file was corrupted
    }
  }

  private schedulePersist() {
    if (config.nodeEnv === 'test') return;
    if (this.persistDebounceTimer) clearTimeout(this.persistDebounceTimer);
    this.persistDebounceTimer = setTimeout(() => {
      try {
        fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
      } catch {
        // ignore write failures in read-only setups
      }
    }, 500);
  }

  async close(): Promise<void> {
    if (this.persistDebounceTimer) {
      clearTimeout(this.persistDebounceTimer);
    }
  }

  async createUser(email: string, passwordHash: string): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.findUserByEmail(normalizedEmail);
    if (existing) {
      throw new Error('An account with this email already exists');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const user: UserRecord = {
      id,
      email: normalizedEmail,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    this.data.users[id] = user;
    this.schedulePersist();
    return { id: user.id, email: user.email, createdAt: user.createdAt };
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const normalizedEmail = email.trim().toLowerCase();
    for (const user of Object.values(this.data.users)) {
      if (user.email === normalizedEmail) {
        return user;
      }
    }
    return null;
  }

  async findUserById(id: string): Promise<User | null> {
    const user = this.data.users[id];
    if (!user) return null;
    return { id: user.id, email: user.email, createdAt: user.createdAt };
  }

  async createSession(userId: string, ipAddress?: string, userAgent?: string): Promise<SessionRecord> {
    const id = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const session: SessionRecord = {
      id,
      userId,
      createdAt: new Date(now).toISOString(),
      expiresAt,
      ipAddress,
      userAgent,
    };

    this.data.sessions[id] = session;
    this.schedulePersist();
    return session;
  }

  async getSession(sessionId: string): Promise<{ session: SessionRecord; user: User } | null> {
    const session = this.data.sessions[sessionId];
    if (!session) return null;

    if (Date.now() > Date.parse(session.expiresAt)) {
      delete this.data.sessions[sessionId];
      this.schedulePersist();
      return null;
    }

    const user = await this.findUserById(session.userId);
    if (!user) return null;

    return { session, user };
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (this.data.sessions[sessionId]) {
      delete this.data.sessions[sessionId];
      this.schedulePersist();
    }
  }

  async deleteExpiredSessions(): Promise<void> {
    const now = Date.now();
    let modified = false;
    for (const [id, session] of Object.entries(this.data.sessions)) {
      if (now > Date.parse(session.expiresAt)) {
        delete this.data.sessions[id];
        modified = true;
      }
    }
    if (modified) this.schedulePersist();
  }

  async saveScan(scan: DomainScan, userId?: string | null, isSaved = false): Promise<void> {
    this.data.scans[scan.scanId] = {
      scan: { ...scan, userId: userId ?? null, isSaved },
      userId: userId ?? null,
      isSaved,
    };
    this.schedulePersist();
  }

  async getScan(scanId: string): Promise<{ scan: DomainScan; userId: string | null } | null> {
    const record = this.data.scans[scanId];
    if (!record) return null;
    return { scan: record.scan, userId: record.userId };
  }

  async getUserScans(userId: string): Promise<HistoryScanItem[]> {
    const results: HistoryScanItem[] = [];
    for (const record of Object.values(this.data.scans)) {
      if (record.userId === userId) {
        results.push({
          scanId: record.scan.scanId,
          domain: record.scan.domain,
          createdAt: record.scan.createdAt,
          status: record.scan.status,
          score: record.scan.score,
          assetCount: record.scan.assets.length,
          findingCount: record.scan.findings.length,
          isSaved: record.isSaved,
        });
      }
    }
    // Order by createdAt descending
    return results.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  async deleteScan(scanId: string, userId: string): Promise<boolean> {
    const record = this.data.scans[scanId];
    if (!record) return false;
    if (record.userId !== userId) {
      return false; // Authorization failure: user does not own scan
    }
    delete this.data.scans[scanId];
    this.schedulePersist();
    return true;
  }

  async getQuota(identityKey: string, windowMs: number): Promise<QuotaRecord> {
    const now = Date.now();
    const record = this.data.quotas[identityKey];

    if (!record || now - record.windowStart >= windowMs) {
      const freshRecord: QuotaRecord = {
        identityKey,
        scanCount: 0,
        windowStart: now,
      };
      this.data.quotas[identityKey] = freshRecord;
      return freshRecord;
    }

    return record;
  }

  async incrementQuota(identityKey: string, windowMs: number): Promise<number> {
    const current = await this.getQuota(identityKey, windowMs);
    current.scanCount += 1;
    this.data.quotas[identityKey] = current;
    this.schedulePersist();
    return current.scanCount;
  }
}

// ─────────────────────────────────────────────────────────────
// 2. PostgreSQL Adapter (Production Deployment)
// ─────────────────────────────────────────────────────────────
class PostgresAdapter implements DatabaseAdapter {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({
      connectionString,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
  }

  async init(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Auto-migrate schema tables if not present
      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const ddl = fs.readFileSync(schemaPath, 'utf8');
        await client.query(ddl);
      }
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async createUser(email: string, passwordHash: string): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase();
    const id = crypto.randomUUID();
    const query = `
      INSERT INTO users (id, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, email, created_at
    `;
    try {
      const res = await this.pool.query(query, [id, normalizedEmail, passwordHash]);
      const row = res.rows[0];
      return { id: row.id, email: row.email, createdAt: row.created_at.toISOString() };
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && err.code === '23505') {
        throw new Error('An account with this email already exists');
      }
      throw err;
    }
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const query = `SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = $1`;
    const res = await this.pool.query(query, [normalizedEmail]);
    if (!res.rows.length) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  async findUserById(id: string): Promise<User | null> {
    const query = `SELECT id, email, created_at FROM users WHERE id = $1`;
    const res = await this.pool.query(query, [id]);
    if (!res.rows.length) return null;
    const row = res.rows[0];
    return { id: row.id, email: row.email, createdAt: row.created_at.toISOString() };
  }

  async createSession(userId: string, ipAddress?: string, userAgent?: string): Promise<SessionRecord> {
    const id = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000);
    const query = `
      INSERT INTO sessions (id, user_id, expires_at, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, user_id, created_at, expires_at, ip_address, user_agent
    `;
    const res = await this.pool.query(query, [id, userId, expiresAt, ipAddress || null, userAgent || null]);
    const row = res.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      createdAt: row.created_at.toISOString(),
      expiresAt: row.expires_at.toISOString(),
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
    };
  }

  async getSession(sessionId: string): Promise<{ session: SessionRecord; user: User } | null> {
    const query = `
      SELECT s.id, s.user_id, s.created_at as session_created_at, s.expires_at, s.ip_address, s.user_agent,
             u.email, u.created_at as user_created_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = $1
    `;
    const res = await this.pool.query(query, [sessionId]);
    if (!res.rows.length) return null;
    const row = res.rows[0];

    if (Date.now() > row.expires_at.getTime()) {
      await this.deleteSession(sessionId);
      return null;
    }

    return {
      session: {
        id: row.id,
        userId: row.user_id,
        createdAt: row.session_created_at.toISOString(),
        expiresAt: row.expires_at.toISOString(),
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
      },
      user: {
        id: row.user_id,
        email: row.email,
        createdAt: row.user_created_at.toISOString(),
      },
    };
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.pool.query(`DELETE FROM sessions WHERE id = $1`, [sessionId]);
  }

  async deleteExpiredSessions(): Promise<void> {
    await this.pool.query(`DELETE FROM sessions WHERE expires_at < NOW()`);
  }

  async saveScan(scan: DomainScan, userId?: string | null, isSaved = false): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const scanQuery = `
        INSERT INTO scans (id, user_id, domain, status, score, score_label, created_at, expires_at, is_saved)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          score = EXCLUDED.score,
          is_saved = EXCLUDED.is_saved
      `;
      await client.query(scanQuery, [
        scan.scanId,
        userId ?? null,
        scan.domain,
        scan.status,
        scan.score ?? null,
        scan.scoreLabel ?? 'External Hygiene Score',
        scan.createdAt,
        scan.expiresAt,
        isSaved,
      ]);

      const resultQuery = `
        INSERT INTO scan_results (scan_id, categories, assets, relationships, findings, warnings, completeness, completeness_details)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (scan_id) DO UPDATE SET
          categories = EXCLUDED.categories,
          assets = EXCLUDED.assets,
          relationships = EXCLUDED.relationships,
          findings = EXCLUDED.findings,
          warnings = EXCLUDED.warnings,
          completeness = EXCLUDED.completeness,
          completeness_details = EXCLUDED.completeness_details
      `;
      await client.query(resultQuery, [
        scan.scanId,
        JSON.stringify(scan.categories),
        JSON.stringify(scan.assets),
        JSON.stringify(scan.relationships),
        JSON.stringify(scan.findings),
        JSON.stringify(scan.warnings),
        scan.completeness ?? null,
        JSON.stringify(scan.completenessDetails ?? null),
      ]);

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getScan(scanId: string): Promise<{ scan: DomainScan; userId: string | null } | null> {
    const query = `
      SELECT s.id, s.user_id, s.domain, s.status, s.score, s.score_label, s.created_at, s.expires_at, s.is_saved,
             r.categories, r.assets, r.relationships, r.findings, r.warnings, r.completeness, r.completeness_details
      FROM scans s
      LEFT JOIN scan_results r ON s.id = r.scan_id
      WHERE s.id = $1
    `;
    const res = await this.pool.query(query, [scanId]);
    if (!res.rows.length) return null;
    const row = res.rows[0];

    const scan: DomainScan = {
      scanId: row.id,
      domain: row.domain,
      createdAt: row.created_at.toISOString(),
      expiresAt: row.expires_at.toISOString(),
      status: row.status,
      score: row.score,
      scoreLabel: row.score_label,
      isSaved: row.is_saved,
      userId: row.user_id,
      categories: row.categories || {},
      assets: row.assets || [],
      relationships: row.relationships || [],
      findings: row.findings || [],
      warnings: row.warnings || [],
      completeness: row.completeness,
      completenessDetails: row.completeness_details,
    };

    return { scan, userId: row.user_id };
  }

  async getUserScans(userId: string): Promise<HistoryScanItem[]> {
    const query = `
      SELECT s.id, s.domain, s.created_at, s.status, s.score, s.is_saved,
             jsonb_array_length(COALESCE(r.assets, '[]'::jsonb)) as asset_count,
             jsonb_array_length(COALESCE(r.findings, '[]'::jsonb)) as finding_count
      FROM scans s
      LEFT JOIN scan_results r ON s.id = r.scan_id
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC
    `;
    const res = await this.pool.query(query, [userId]);
    return res.rows.map((row) => ({
      scanId: row.id,
      domain: row.domain,
      createdAt: row.created_at.toISOString(),
      status: row.status,
      score: row.score,
      assetCount: Number(row.asset_count),
      findingCount: Number(row.finding_count),
      isSaved: row.is_saved,
    }));
  }

  async deleteScan(scanId: string, userId: string): Promise<boolean> {
    const query = `DELETE FROM scans WHERE id = $1 AND user_id = $2`;
    const res = await this.pool.query(query, [scanId, userId]);
    return (res.rowCount ?? 0) > 0;
  }

  async getQuota(identityKey: string, windowMs: number): Promise<QuotaRecord> {
    const now = Date.now();
    const query = `SELECT identity_key, scan_count, window_start FROM quotas WHERE identity_key = $1`;
    const res = await this.pool.query(query, [identityKey]);

    if (!res.rows.length || now - Number(res.rows[0].window_start) >= windowMs) {
      const upsert = `
        INSERT INTO quotas (identity_key, scan_count, window_start)
        VALUES ($1, 0, $2)
        ON CONFLICT (identity_key) DO UPDATE SET
          scan_count = 0,
          window_start = EXCLUDED.window_start
        RETURNING identity_key, scan_count, window_start
      `;
      const freshRes = await this.pool.query(upsert, [identityKey, now]);
      const row = freshRes.rows[0];
      return {
        identityKey: row.identity_key,
        scanCount: Number(row.scan_count),
        windowStart: Number(row.window_start),
      };
    }

    const row = res.rows[0];
    return {
      identityKey: row.identity_key,
      scanCount: Number(row.scan_count),
      windowStart: Number(row.window_start),
    };
  }

  async incrementQuota(identityKey: string, windowMs: number): Promise<number> {
    const now = Date.now();
    const quota = await this.getQuota(identityKey, windowMs);
    const updatedCount = quota.scanCount + 1;
    const query = `
      INSERT INTO quotas (identity_key, scan_count, window_start)
      VALUES ($1, $2, $3)
      ON CONFLICT (identity_key) DO UPDATE SET
        scan_count = quotas.scan_count + 1
      RETURNING scan_count
    `;
    const res = await this.pool.query(query, [identityKey, updatedCount, quota.windowStart || now]);
    return Number(res.rows[0].scan_count);
  }
}

// ─────────────────────────────────────────────────────────────
// 3. Factory & Export
// ─────────────────────────────────────────────────────────────
const databaseUrl = process.env.DATABASE_URL?.trim();
export const db: DatabaseAdapter = databaseUrl
  ? new PostgresAdapter(databaseUrl)
  : new LocalJsonAdapter();

// Initialize the database connection asynchronously
void db.init().catch((err) => {
  console.error('[database] Initialization warning:', err instanceof Error ? err.message : err);
});
