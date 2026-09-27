#!/usr/bin/env node
/**
 * copy-schema.mjs
 *
 * Copies server/src/db/schema.sql into the compiled dist directory so that the
 * PostgresAdapter's  path.join(__dirname, 'schema.sql')  resolves correctly at
 * runtime without any shell-specific copy commands.
 *
 * Works cross-platform (Windows + Linux + macOS).
 *
 * Expected call:  node scripts/copy-schema.mjs
 * Called from:    server/package.json  "build": "tsc && node scripts/copy-schema.mjs"
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths relative to this script (server/)
const SERVER_ROOT = path.resolve(__dirname, '..');
const SRC_SQL = path.join(SERVER_ROOT, 'src', 'db', 'schema.sql');

// The TypeScript compiler output for dist lives at:
//   server/dist/server/src/...   (because rootDir = ".." = workspace root)
const DEST_DIR = path.join(SERVER_ROOT, 'dist', 'server', 'src', 'db');
const DEST_SQL = path.join(DEST_DIR, 'schema.sql');

// ── 1. Verify the source exists ──────────────────────────────────────────────
if (!fs.existsSync(SRC_SQL)) {
  console.error(`[copy-schema] ERROR: source file not found: ${SRC_SQL}`);
  process.exit(1);
}

// ── 2. Ensure destination directory exists ───────────────────────────────────
fs.mkdirSync(DEST_DIR, { recursive: true });

// ── 3. Copy ───────────────────────────────────────────────────────────────────
fs.copyFileSync(SRC_SQL, DEST_SQL);

// ── 4. Verify the copy ────────────────────────────────────────────────────────
if (!fs.existsSync(DEST_SQL)) {
  console.error(`[copy-schema] ERROR: destination file was not created: ${DEST_SQL}`);
  process.exit(1);
}

const srcSize = fs.statSync(SRC_SQL).size;
const destSize = fs.statSync(DEST_SQL).size;
if (srcSize !== destSize) {
  console.error(`[copy-schema] ERROR: size mismatch (src=${srcSize} dest=${destSize})`);
  process.exit(1);
}

console.log(`[copy-schema] ✓  schema.sql copied (${destSize} bytes)`);
console.log(`  src:  ${SRC_SQL}`);
console.log(`  dest: ${DEST_SQL}`);
