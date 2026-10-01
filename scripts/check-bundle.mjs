/**
 * Fails if anything secret ended up in the browser bundle. Run after `next build`:
 *   npm run check:bundle            (scans .next/static, or $NEXT_DIST_DIR/static)
 * Looks for secret-shaped strings, the names of server-only secrets (a sign that server code was bundled for
 * the client), and the actual values of any secrets present in the environment / .env.local.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.env.NEXT_DIST_DIR || '.next', 'static');
if (!existsSync(dir)) {
  console.error(`No build output at ${dir}. Run \`next build\` first.`);
  process.exit(2);
}

const SECRET_NAMES = [
  'QR_SIGNING_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'TEST_PAYMENT_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'GCP_SERVICE_ACCOUNT_EMAIL',
];
const PATTERNS = [
  [/sk_(live|test)_[A-Za-z0-9]{8,}/, 'Stripe secret key'],
  [/rk_(live|test)_[A-Za-z0-9]{8,}/, 'Stripe restricted key'],
  [/whsec_[A-Za-z0-9]{8,}/, 'Stripe webhook secret'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/"private_key_id"\s*:/, 'service account key'],
  [/firebase-admin|server-only/, 'server-only module in client bundle'],
];

// Values from the environment and .env.local (if present), so a leaked real value is caught too.
const values = new Map();
for (const name of SECRET_NAMES) if (process.env[name]?.length >= 8) values.set(name, process.env[name]);
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = /^([A-Z_]+)=(.+)$/.exec(line.trim());
    if (m && SECRET_NAMES.includes(m[1]) && m[2].length >= 8) values.set(m[1], m[2]);
  }
}

const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|mjs|css|json|html|map)$/.test(f)) files.push(p);
  }
})(dir);

const findings = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const [re, label] of PATTERNS) if (re.test(text)) findings.push(`${file}: ${label}`);
  for (const name of SECRET_NAMES) if (text.includes(name)) findings.push(`${file}: mentions ${name}`);
  for (const [name, value] of values)
    if (text.includes(value)) findings.push(`${file}: contains the value of ${name}`);
}

if (findings.length) {
  console.error(`✗ Secrets or server code in the client bundle:\n  ${findings.join('\n  ')}`);
  process.exit(1);
}
console.log(
  `✓ ${files.length} client files checked, no secrets found (${values.size} secret values compared).`,
);
