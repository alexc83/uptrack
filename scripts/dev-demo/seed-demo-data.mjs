#!/usr/bin/env node
/**
 * UpTrack local demo-data seeder (development only).
 *
 * Safety rules enforced by this script:
 *  - The API target must be a loopback address (localhost / 127.0.0.1 / ::1).
 *    Any redirect to a non-loopback location aborts the run. Node's fetch
 *    (undici) does not honor HTTP(S)_PROXY, so no proxy can reroute requests.
 *  - Writes go through the backend HTTP API only, so passwords are always
 *    BCrypt-hashed by the backend's own registration endpoint. This script
 *    never writes to the database directly and never inserts password hashes.
 *  - Before any change, the script confirms the API is healthy AND that the
 *    target database is exactly the isolated local `uptrack_migration_test`
 *    (read-only psql probes as role `uptrack_m01`).
 *  - Fully idempotent and additive: existing accounts are logged in with the
 *    supplied demo password (abort if it does not work — no password resets),
 *    and records are only created when missing. Nothing is ever deleted.
 *
 * Usage:
 *   node scripts/dev-demo/seed-demo-data.mjs
 *   API_BASE_URL=http://localhost:8080/api node scripts/dev-demo/seed-demo-data.mjs
 *
 * NEVER point this at a hosted or production backend.
 */

import { execFileSync } from 'node:child_process';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080/api';
const PG = {
  host: process.env.DEMO_SEED_PG_HOST || '127.0.0.1',
  port: process.env.DEMO_SEED_PG_PORT || '5432',
  user: process.env.DEMO_SEED_PG_USER || 'uptrack_m01',
  database: process.env.DEMO_SEED_PG_DATABASE || 'uptrack_migration_test',
};

// ---------------------------------------------------------------------------
// Loopback guard
// ---------------------------------------------------------------------------
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function assertLoopbackUrl(rawUrl, label) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    abort(`${label} is not a valid URL: ${rawUrl}`);
  }
  if (url.protocol !== 'http:') {
    abort(`${label} must use http (local dev only): ${rawUrl}`);
  }
  if (!LOOPBACK_HOSTNAMES.has(url.hostname)) {
    abort(`${label} host "${url.hostname}" is not loopback. Refusing to contact non-local API.`);
  }
  return url;
}

function abort(message) {
  console.error(`\n[seed] ABORT: ${message}`);
  process.exit(1);
}

async function apiFetch(path, { method = 'GET', token, json } = {}) {
  const url = new URL(`${API_BASE_URL.replace(/\/$/, '')}${path}`);
  assertLoopbackUrl(url.toString(), 'request URL');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, {
    method,
    headers,
    body: json === undefined ? undefined : JSON.stringify(json),
    redirect: 'manual', // never follow redirects; a 3xx aborts instead
  });
  // Belt and braces: even with redirect:'manual', confirm the response URL.
  if (response.url) assertLoopbackUrl(response.url, 'response URL');
  if (response.status >= 300 && response.status < 400) {
    abort(`unexpected redirect (${response.status}) from ${url} — refusing to follow.`);
  }
  let body = null;
  const text = await response.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: response.status, body };
}

// ---------------------------------------------------------------------------
// Read-only database confirmation (psql, trust auth on loopback)
// ---------------------------------------------------------------------------
function psqlQuery(sql) {
  try {
    return execFileSync(
      'psql',
      ['-h', PG.host, '-p', PG.port, '-U', PG.user, '-d', PG.database, '-Atc', sql],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    ).trim();
  } catch (error) {
    return null;
  }
}

function confirmDatabaseTarget() {
  console.log(`[seed] confirming isolated DB ${PG.database} as role ${PG.user}@${PG.host}:${PG.port} ...`);
  const marker = psqlQuery(
    "SELECT count(*) FROM users WHERE email IN ('m01-user-a@example.test','m01-user-b@example.test')",
  );
  if (marker === null) {
    abort(`cannot read database ${PG.database} via psql. Target cannot be confirmed.`);
  }
  if (marker !== '2') {
    abort(`expected the 2 known m01 test users in ${PG.database}, found ${marker}. Target cannot be confirmed.`);
  }
  const tables = psqlQuery(
    "SELECT string_agg(table_name, ',' ORDER BY table_name) FROM information_schema.tables WHERE table_schema='public'",
  );
  if (!tables || !['ce_records', 'credentials', 'users'].every((t) => tables.includes(t))) {
    abort(`expected users/credentials/ce_records tables in ${PG.database}, found: ${tables}`);
  }
  console.log('[seed] database target confirmed: uptrack_migration_test with the 2 pre-existing m01 users.');
}

function confirmUserRowInTargetDb(email) {
  const row = psqlQuery(
    `SELECT left(password, 4) || ':' || length(password) FROM users WHERE email = '${email.replace(/'/g, "''")}'`,
  );
  if (!row) abort(`API registered ${email} but the row is NOT in ${PG.database}. Aborting.`);
  const [prefix, len] = row.split(':');
  if (!prefix.startsWith('$2') || len !== '60') {
    abort(`password hash for ${email} is not a 60-char BCrypt hash (${prefix}/${len}). Aborting.`);
  }
  return row;
}

// ---------------------------------------------------------------------------
// Demo data definition (synthetic, throwaway — never for production)
// ---------------------------------------------------------------------------
function daysFromNow(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const DEMO_ACCOUNTS = [
  {
    name: 'Demo Main',
    email: 'demo-main@example.test',
    password: 'DemoMain-2026!dev',
    credentials: [
      { name: 'RN License — Texas', type: 'LICENSE', issuingOrganization: 'Texas Board of Nursing', expirationDate: daysFromNow(365), renewalCycleMonths: 24, requiredCEHours: 20 },
      { name: 'ACLS Certification', type: 'CERTIFICATION', issuingOrganization: 'American Heart Association', expirationDate: daysFromNow(30), renewalCycleMonths: 24, requiredCEHours: 8 },
      { name: 'BLS Certification', type: 'CERTIFICATION', issuingOrganization: 'American Heart Association', expirationDate: daysFromNow(-10), renewalCycleMonths: 24, requiredCEHours: 4 },
      { name: 'NRP Certification', type: 'CERTIFICATION', issuingOrganization: 'American Academy of Pediatrics', expirationDate: daysFromNow(200), renewalCycleMonths: 24, requiredCEHours: 0 },
    ],
    ceRecords: [
      { credentialName: 'RN License — Texas', title: 'Sepsis Management', provider: 'AACN', hours: 5, dateCompleted: daysFromNow(-60), certificateUrl: 'https://example.com/demo/sepsis.pdf' },
      { credentialName: 'RN License — Texas', title: 'Ventilator Basics', provider: 'Hospital LMS', hours: 4, dateCompleted: daysFromNow(-45) },
      { credentialName: 'RN License — Texas', title: 'Critical Care Pharmacology', provider: 'AACN', hours: 6.5, dateCompleted: daysFromNow(-30), certificateUrl: 'https://example.com/demo/pharmacology.pdf' },
      { credentialName: 'ACLS Certification', title: 'ACLS Renewal Course', provider: 'AHA', hours: 4, dateCompleted: daysFromNow(-20), certificateUrl: 'https://example.com/demo/acls.pdf' },
      { credentialName: 'BLS Certification', title: 'BLS Training', provider: 'AHA', hours: 4, dateCompleted: daysFromNow(-200) },
      { credentialName: 'NRP Certification', title: 'Neonatal Resuscitation Program', provider: 'AAP', hours: 3, dateCompleted: daysFromNow(-15), certificateUrl: 'https://example.com/demo/nrp.pdf' },
    ],
  },
  {
    name: 'Demo Second',
    email: 'demo-second@example.test',
    password: 'DemoSecond-2026!dev',
    credentials: [
      { name: 'RRT License', type: 'LICENSE', issuingOrganization: 'NBRC', expirationDate: daysFromNow(120), renewalCycleMonths: 24, requiredCEHours: 15 },
    ],
    ceRecords: [
      { credentialName: 'RRT License', title: 'Respiratory Care Update', provider: 'NBRC', hours: 7, dateCompleted: daysFromNow(-25), certificateUrl: 'https://example.com/demo/rrt-update.pdf' },
      { credentialName: 'RRT License', title: 'Advanced Ventilation Strategies', provider: 'NBRC', hours: 5, dateCompleted: daysFromNow(-10) },
    ],
  },
  {
    name: 'Demo Empty',
    email: 'demo-empty@example.test',
    password: 'DemoEmpty-2026!dev',
    credentials: [],
    ceRecords: [],
  },
];

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------
async function login(email, password) {
  return apiFetch('/auth/login', { method: 'POST', json: { email, password } });
}

async function ensureAccount(account) {
  // 1. Try the supplied demo password first. If the account already exists and
  //    this works, we reuse it untouched.
  let res = await login(account.email, account.password);
  if (res.status === 200 && res.body?.token) {
    console.log(`[seed] ${account.email}: login with supplied demo password OK (existing account).`);
    return res.body.token;
  }
  if (res.status !== 401) {
    abort(`login for ${account.email} returned unexpected status ${res.status}: ${JSON.stringify(res.body)}`);
  }
  // 2. Not authenticated yet. Try to register through the backend's own
  //    registration endpoint (BCrypt hashing happens server-side).
  res = await apiFetch('/auth/register', {
    method: 'POST',
    json: { name: account.name, email: account.email, password: account.password },
  });
  if (res.status === 201 && res.body?.token) {
    confirmUserRowInTargetDb(account.email);
    console.log(`[seed] ${account.email}: registered via POST /api/auth/register (BCrypt hash verified in ${PG.database}).`);
    return res.body.token;
  }
  if (res.status === 400) {
    // Account exists but the supplied password did not work. STOP — never reset.
    abort(`account ${account.email} already exists but the supplied demo password failed. Refusing to modify or reset it.`);
  }
  abort(`register for ${account.email} returned unexpected status ${res.status}: ${JSON.stringify(res.body)}`);
}

async function seedAccount(account, token) {
  const auth = { token };
  const created = { credentials: 0, ceRecords: 0 };

  let res = await apiFetch('/credentials', auth);
  if (res.status !== 200) abort(`GET /credentials failed (${res.status}) for ${account.email}`);
  const existingCredentials = new Map(res.body.map((c) => [c.name, c]));

  for (const cred of account.credentials) {
    if (existingCredentials.has(cred.name)) {
      console.log(`[seed] ${account.email}: credential "${cred.name}" already present, skipping.`);
      continue;
    }
    res = await apiFetch('/credentials', { ...auth, method: 'POST', json: cred });
    if (res.status !== 201) abort(`create credential "${cred.name}" failed (${res.status}): ${JSON.stringify(res.body)}`);
    created.credentials += 1;
    console.log(`[seed] ${account.email}: created credential "${cred.name}" (expires ${cred.expirationDate}).`);
  }

  // Re-fetch to map credential names to IDs (covers both existing and new rows).
  res = await apiFetch('/credentials', auth);
  if (res.status !== 200) abort(`GET /credentials (refresh) failed for ${account.email}`);
  const credentialsByName = new Map(res.body.map((c) => [c.name, c]));

  res = await apiFetch('/ce-records', auth);
  if (res.status !== 200) abort(`GET /ce-records failed (${res.status}) for ${account.email}`);
  // The list endpoint is scoped to the authenticated user and its response DTO
  // carries no credentialId, so CE records are matched by title within this
  // account (demo titles are unique per account).
  const existingCE = new Set(res.body.map((r) => r.title));

  for (const rec of account.ceRecords) {
    const credential = credentialsByName.get(rec.credentialName);
    if (!credential) abort(`credential "${rec.credentialName}" for CE record "${rec.title}" not found for ${account.email}`);
    if (existingCE.has(rec.title)) {
      console.log(`[seed] ${account.email}: CE record "${rec.title}" already present, skipping.`);
      continue;
    }
    const payload = {
      title: rec.title,
      provider: rec.provider,
      hours: rec.hours,
      dateCompleted: rec.dateCompleted,
      credentialId: credential.id,
      ...(rec.certificateUrl ? { certificateUrl: rec.certificateUrl } : {}),
    };
    res = await apiFetch('/ce-records', { ...auth, method: 'POST', json: payload });
    if (res.status !== 201) abort(`create CE record "${rec.title}" failed (${res.status}): ${JSON.stringify(res.body)}`);
    created.ceRecords += 1;
    console.log(`[seed] ${account.email}: created CE record "${rec.title}" (${rec.hours}h, ${rec.dateCompleted}).`);
  }

  const summary = {
    email: account.email,
    credentialsTotal: credentialsByName.size,
    ceRecordsTotal: (await apiFetch('/ce-records', auth)).body.length,
    created,
  };
  console.log(`[seed] ${account.email}: summary ${JSON.stringify(summary)}`);
  return summary;
}

async function main() {
  console.log(`[seed] API target: ${API_BASE_URL}`);
  assertLoopbackUrl(API_BASE_URL, 'API_BASE_URL');

  // Pre-change gate 1: API healthy on loopback.
  const health = await apiFetch('/health');
  if (health.status !== 200 || health.body?.status !== 'ok') {
    abort(`API health check failed at ${API_BASE_URL}/health (status ${health.status}). Is the local backend running?`);
  }
  console.log('[seed] API health OK.');

  // Pre-change gate 2: database target confirmed as the isolated local test DB.
  confirmDatabaseTarget();

  const results = [];
  for (const account of DEMO_ACCOUNTS) {
    const token = await ensureAccount(account);
    results.push(await seedAccount(account, token));
  }

  console.log('\n[seed] DONE. Per-account totals:');
  for (const r of results) console.log(`  ${r.email}: ${r.credentialsTotal} credentials, ${r.ceRecordsTotal} CE records (created this run: ${r.created.credentials} credentials, ${r.created.ceRecords} CE records)`);
}

main().catch((error) => {
  if (error?.message?.includes('ABORT')) process.exit(1);
  abort(`unexpected error: ${error?.stack || error}`);
});
