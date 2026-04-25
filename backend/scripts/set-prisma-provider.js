#!/usr/bin/env node
/**
 * Flips prisma/schema.prisma `datasource.provider` to match the
 * DATABASE_PROVIDER env var (or the `DATABASE_URL` prefix as a fallback).
 *
 * Prisma does not accept env() for the provider field — only for `url`.
 * This tiny pre-hook lets the same schema file target sqlite locally and
 * postgresql in Docker/production without manual edits.
 *
 * Allowed values: sqlite | postgresql | mysql | sqlserver | cockroachdb
 * Default: sqlite (preserves the existing dev workflow).
 *
 * Invoked automatically via the `prisma:*` npm scripts; also safe to run
 * standalone: `DATABASE_PROVIDER=postgresql node scripts/set-prisma-provider.js`
 */
const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.resolve(__dirname, '..', '..', 'prisma', 'schema.prisma');
const ALLOWED = new Set(['sqlite', 'postgresql', 'mysql', 'sqlserver', 'cockroachdb']);

function inferFromUrl(url) {
  if (!url) return null;
  if (url.startsWith('file:')) return 'sqlite';
  if (url.startsWith('postgresql://') || url.startsWith('postgres://')) return 'postgresql';
  if (url.startsWith('mysql://')) return 'mysql';
  if (url.startsWith('sqlserver://')) return 'sqlserver';
  return null;
}

const provider =
  process.env.DATABASE_PROVIDER ||
  inferFromUrl(process.env.DATABASE_URL) ||
  'sqlite';

if (!ALLOWED.has(provider)) {
  console.error(`[set-prisma-provider] unknown provider: ${provider}`);
  process.exit(1);
}

const src = fs.readFileSync(SCHEMA_PATH, 'utf8');
const updated = src.replace(
  /(datasource\s+db\s*\{[^}]*?provider\s*=\s*")([^"]+)(")/s,
  `$1${provider}$3`
);

if (updated === src) {
  console.log(`[set-prisma-provider] already set to ${provider}`);
} else {
  fs.writeFileSync(SCHEMA_PATH, updated);
  console.log(`[set-prisma-provider] switched provider → ${provider}`);
}
