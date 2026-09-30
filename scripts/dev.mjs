#!/usr/bin/env node
/**
 * One command for local development:  npm run dev:all
 *
 *   1. puts Java 21 on PATH (Homebrew openjdk@21) if `java` isn't found
 *   2. builds Cloud Functions and starts the Firebase Emulator Suite (data kept in .emulator-data/)
 *   3. seeds demo data the first time (marketplaces, accounts, sample events)
 *   4. starts Next.js on http://localhost:3000
 *
 * `--emulators-only` skips step 4 (npm run emulators). Ctrl+C stops everything; emulator data is saved on exit.
 */
import { execSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const PROJECT = 'demo-ticketing';
const DATA_DIR = '.emulator-data';
const children = [];

function log(msg) {
  console.log(`\x1b[35m[dev]\x1b[0m ${msg}`);
}

function ensureJava() {
  try {
    execSync('java -version', { stdio: 'ignore' });
    return;
  } catch {
    const brewJava = '/opt/homebrew/opt/openjdk@21/bin';
    if (existsSync(`${brewJava}/java`)) {
      process.env.PATH = `${brewJava}:${process.env.PATH}`;
      log('Using Java from Homebrew (openjdk@21).');
      return;
    }
  }
  console.error(
    '\nJava 21 is required for the Firebase emulators. Install it with:\n  brew install openjdk@21\n',
  );
  process.exit(1);
}

function run(cmd, args, name) {
  const child = spawn(cmd, args, { stdio: 'inherit', env: process.env });
  child.on('exit', (code) => {
    if (!shuttingDown) {
      log(`${name} exited (code ${code}). Stopping everything.`);
      shutdown(code ?? 1);
    }
  });
  children.push(child);
  return child;
}

// The first emulator start can take a few minutes (Java cold start, downloads).
async function waitFor(url, label, timeoutMs = 300_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`${label} did not start within ${timeoutMs / 1000}s`);
}

async function isSeeded() {
  const res = await fetch(
    `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents/tenants/demo`,
    { headers: { Authorization: 'Bearer owner' } },
  );
  return res.status === 200;
}

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  log('Stopping… (saving emulator data)');
  for (const c of children.reverse()) c.kill('SIGINT');
  setTimeout(() => process.exit(code), 8000).unref();
}
process.on('SIGINT', () => shutdown(0));
// Any startup failure: stop the child processes instead of leaving emulators orphaned.
process.on('unhandledRejection', (err) => {
  console.error(err);
  shutdown(1);
});
process.on('SIGTERM', () => shutdown(0));

ensureJava();

log('Building Cloud Functions…');
execSync('npm --prefix functions run build', { stdio: 'inherit' });

log('Starting Firebase emulators… (the first start can take a couple of minutes)');
const emulatorArgs = ['firebase', 'emulators:start', '--project', PROJECT, `--export-on-exit=${DATA_DIR}`];
if (existsSync(DATA_DIR)) emulatorArgs.push(`--import=${DATA_DIR}`);
run('npx', emulatorArgs, 'Emulators');

await waitFor('http://127.0.0.1:8080/', 'Firestore emulator');
await waitFor('http://127.0.0.1:9099/', 'Auth emulator');
await waitFor('http://127.0.0.1:5001/', 'Functions emulator');

if (!(await isSeeded())) {
  log('First run: seeding demo data…');
  execSync('npm run seed', { stdio: 'inherit' });
}

if (process.argv.includes('--emulators-only')) {
  log('Emulators ready → UI at http://127.0.0.1:4000. Run `npm run dev` in another terminal.');
} else {
  await startNext();
}

async function startNext() {
  const alreadyRunning = await fetch('http://localhost:3000/api/health')
    .then((r) => r.ok)
    .catch(() => false);
  if (alreadyRunning) {
    log('A Next.js dev server is already running on :3000 — reusing it.');
  } else {
    log('Starting Next.js on http://localhost:3000 …');
    run('npx', ['next', 'dev'], 'Next.js');
  }

  await waitFor('http://localhost:3000/api/health', 'Next.js');
  log('Ready → http://localhost:3000  (login page lists the demo accounts)');
  log('Emulator UI → http://127.0.0.1:4000');
}
