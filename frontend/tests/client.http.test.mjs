/**
 * End-to-end HTTP test for the real frontend API client (Fix 7).
 *
 * Spawns a real Django server against a throwaway sqlite database, seeds one
 * place, and drives `src/lib/api/client.ts` through a real HTTP session:
 *
 *   1. register   → 201 envelope with data           (parses JSON body)
 *   2. me         → authenticated GET, Bearer token
 *   3. POST save  → 200/201 envelope with data
 *   4. DELETE save → 204 No Content                  (must resolve, not throw)
 *   5. logout     → 200 {"success": true, "data": null, ...} (must resolve, not throw)
 *   6. refresh with the old token → must REJECT 401  (server-side blacklist, Fix 5)
 *
 * No test framework is required: plain Node (v24, native TypeScript type
 * stripping). Run from frontend/ with:
 *
 *   node tests/client.http.test.mjs
 */

import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

const backendDir = resolve(import.meta.dirname, '../../backend')
const python = resolve(backendDir, '.venv/Scripts/python.exe')

const PORT = 8765
const BASE_URL = `http://127.0.0.1:${PORT}`
const tmp = mkdtempSync(join(tmpdir(), 'cc-http-test-'))
const dbPath = join(tmp, 'db.sqlite3')
const seedScript = join(tmp, 'seed.py')

const SEED_PY = `
import os
import sys

sys.path.insert(0, os.environ["CC_BACKEND_DIR"])
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()

from decimal import Decimal

from apps.places.models import Place

place, _ = Place.objects.update_or_create(
    name="HTTP Test PG",
    defaults={
        "category": "pg",
        "description": "Seed place for the client HTTP test.",
        "address": "Test Street, Kakadeo, Kanpur, Uttar Pradesh 208025",
        "latitude": Decimal("26.478000"),
        "longitude": Decimal("80.301000"),
        "phone": "+91 90000 00000",
        "rating": Decimal("4.0"),
        "price_range": {"amount": 5000, "unit": "month"},
        "amenities": ["wifi"],
        "verified": True,
    },
)
print(f"PLACE_ID={place.id}")
`
writeFileSync(seedScript, SEED_PY)

const env = {
  ...process.env,
  DATABASE_URL: `sqlite:///${dbPath.replace(/\\/g, '/')}`,
  DEBUG: 'True',
  ALLOWED_HOSTS: '127.0.0.1,localhost',
  CC_BACKEND_DIR: backendDir,
  VITE_API_BASE_URL: BASE_URL,
}

async function run(args, cwd) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(python, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (err += d))
    child.on('error', rejectRun)
    child.on('close', (code) => {
      if (code === 0) resolveRun(out)
      else rejectRun(new Error(`Command failed (${code}): ${args.join(' ')}\n${err}`))
    })
  })
}

async function waitForHealth(timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs
  let lastError = null
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/api/health/`)
      if (res.ok) return
    } catch (err) {
      lastError = err
    }
    await sleep(500)
  }
  throw new Error(`Server did not become healthy in ${timeoutMs}ms. Last error: ${lastError}`)
}

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

let server = null
let serverLog = ''

try {
  // 1. Schema + seed into the throwaway database.
  const migrateOut = await run(['manage.py', 'migrate', '--noinput'], backendDir)
  assert(migrateOut.length >= 0, 'migrate ran')
  const seedOut = await run([seedScript], backendDir)
  const placeIdMatch = /PLACE_ID=(\S+)/.exec(seedOut)
  assert(placeIdMatch, `seed should print a PLACE_ID. Output: ${seedOut}`)
  const placeId = placeIdMatch[1]

  // 2. Boot the real Django dev server.
  server = spawn(
    python,
    ['manage.py', 'runserver', `127.0.0.1:${PORT}`, '--noreload'],
    { cwd: backendDir, env, stdio: ['ignore', 'pipe', 'pipe'] }
  )
  server.stdout.on('data', (d) => (serverLog += d))
  server.stderr.on('data', (d) => (serverLog += d))

  await waitForHealth()

  // 3. Import the REAL client. The base URL is resolved from process.env
  // (browser builds read import.meta.env / Vite env instead; Node has none).
  process.env.VITE_API_BASE_URL = BASE_URL
  const client = await import('../src/lib/api/client.ts')

  const email = `httptest-${Date.now()}@example.com`
  const auth = await client.registerApi({
    name: 'HTTP Test User',
    email,
    password: 'TestPassword123!',
  })
  assert(auth.access_token, 'register should return an access token')
  assert(auth.refresh_token, 'register should return a refresh token')

  client.setStoredTokens(auth.access_token, auth.refresh_token)

  const me = await client.getMeApi()
  assert(me.email === email, `me should match registered email (got ${me.email})`)

  // 4. POST save → envelope with data.
  const saved = await client.apiRequest(`/api/places/${placeId}/save/`, { method: 'POST' })
  assert(saved && saved.place_id === placeId, 'POST save should return the saved place envelope')

  // 5. DELETE save → 204 No Content, no body. Previously client.ts threw here.
  const deleted = await client.apiRequest(`/api/places/${placeId}/save/`, { method: 'DELETE' })
  assert(deleted === undefined, 'DELETE 204 must resolve to undefined, not throw')

  // 6. Logout → 200 with data:null. Previously client.ts threw here.
  await client.logoutApi(auth.refresh_token)

  // 7. Old refresh token must now be rejected (server-side blacklist, Fix 5).
  let rejected = false
  try {
    await client.refreshApi(auth.refresh_token)
  } catch (err) {
    rejected = true
    assert(err && err.status === 401, `refresh after logout should reject with 401, got ${err?.status}`)
  }
  assert(rejected, 'refresh with a blacklisted token must reject')

  console.log('ALL CLIENT HTTP TESTS PASSED')
} catch (err) {
  console.error(serverLog)
  throw err
} finally {
  if (server && !server.killed) server.kill()
  await sleep(300)
  rmSync(tmp, { recursive: true, force: true })
}
