#!/usr/bin/env node
/**
 * One-command production setup for Firebase App Hosting. Safe to re-run: every step checks first and skips
 * what already exists. See docs/deploy.md.
 *
 *   npm run setup:prod -- --project <id>                       first setup (+ first marketplace)
 *   npm run setup:prod -- stripe --project <id>                add Stripe keys (test or live)
 *   npm run setup:prod -- email  --project <id>                add the Resend key and sender address
 *   npm run setup:prod -- domain example.com --project <id>    connect a custom domain to a marketplace
 *
 * Options: --backend <id> (default: the only App Hosting backend), --marketplace <id>, --yes (no questions).
 * Needs: gcloud (logged in as a project owner) and this repo's dependencies (`npm install`).
 */
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';

// ---------- arguments ----------
const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined;
};
const has = (name) => argv.includes(`--${name}`);
const positional = argv.filter((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'));
const command = ['stripe', 'email', 'domain'].includes(positional[0]) ? positional[0] : 'init';
const YES = has('yes');

// ---------- output ----------
const c = (code) => (s) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = c('1');
const green = c('32');
const yellow = c('33');
const red = c('31');
const step = (s) => console.log(`\n${bold('▶ ' + s)}`);
const ok = (s) => console.log(`  ${green('✓')} ${s}`);
const skip = (s) => console.log(`  ${yellow('•')} ${s}`);
function die(msg) {
  console.error(`\n${red('✗ ' + msg)}`);
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
async function ask(question, fallback) {
  if (YES && fallback !== undefined) return fallback;
  const answer = (await rl.question(`  ${question}${fallback ? ` [${fallback}]` : ''}: `)).trim();
  return answer || fallback || '';
}

// ---------- shell ----------
const FIREBASE = existsSync('node_modules/.bin/firebase') ? 'node_modules/.bin/firebase' : 'firebase';
function run(cmd, args, { capture = false, allowFail = false } = {}) {
  const r = spawnSync(cmd, args, {
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  if (r.error)
    die(`${cmd} not found. ${cmd === 'gcloud' ? 'Install it: brew install --cask google-cloud-sdk' : ''}`);
  if (r.status !== 0 && !allowFail) {
    if (capture) console.error(r.stderr || r.stdout);
    die(`Command failed: ${cmd} ${args.join(' ')}`);
  }
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}
function firebaseJson(args) {
  const r = run(FIREBASE, [...args, '--json'], { capture: true, allowFail: true });
  try {
    return JSON.parse(r.out);
  } catch {
    return { status: 'error', error: r.err || r.out };
  }
}

// ---------- Google REST (as the logged-in gcloud user) ----------
let token;
let PROJECT;
async function api(method, url, body) {
  token ??= run('gcloud', ['auth', 'print-access-token'], { capture: true }).out;
  const res = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      'x-goog-user-project': PROJECT,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}
async function apiOk(method, url, body, what) {
  const r = await api(method, url, body);
  if (r.status >= 300)
    die(`${what}: HTTP ${r.status} ${JSON.stringify(r.json.error?.message ?? r.json).slice(0, 400)}`);
  return r.json;
}

// Firestore REST value encoding.
function fsValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fsValue) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fsValue(x)])) } };
}
const FS = () => `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const fsGet = (path) => api('GET', `${FS()}/${path}`);
const fsSet = (path, data, what) =>
  apiOk(
    'PATCH',
    `${FS()}/${path}`,
    { fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, fsValue(v)])) },
    what,
  );

// Secret Manager.
const SM = () => `https://secretmanager.googleapis.com/v1/projects/${PROJECT}/secrets`;
async function secretExists(name) {
  return (await api('GET', `${SM()}/${name}`)).status === 200;
}
async function secretValue(name) {
  const r = await api('GET', `${SM()}/${name}/versions/latest:access`);
  return r.status === 200 ? Buffer.from(r.json.payload.data, 'base64').toString('utf8') : undefined;
}
async function putSecret(name, value) {
  if (!(await secretExists(name)))
    await apiOk(
      'POST',
      `${SM()}?secretId=${name}`,
      { replication: { automatic: {} } },
      `create secret ${name}`,
    );
  await apiOk(
    'POST',
    `${SM()}/${name}:addVersion`,
    { payload: { data: Buffer.from(value, 'utf8').toString('base64') } },
    `store secret ${name}`,
  );
}

// ---------- shared lookups ----------
async function preflight() {
  PROJECT = flag('project') || die('Pass --project <firebase-project-id>');
  if (PROJECT.startsWith('demo-')) die('demo-* projects are the local emulator; use your real project id.');
  const account = run('gcloud', ['auth', 'list', '--filter=status:ACTIVE', '--format=value(account)'], {
    capture: true,
  }).out;
  if (!account) die('Log in first: gcloud auth login');
  ok(`gcloud: ${account}`);
  const billing = run(
    'gcloud',
    ['billing', 'projects', 'describe', PROJECT, '--format=value(billingEnabled)'],
    {
      capture: true,
      allowFail: true,
    },
  );
  if (!billing.ok) die(`Can't read project ${PROJECT}. Check the id and that ${account} is an owner.`);
  if (billing.out.toLowerCase() !== 'true') die('Billing is off. Firebase console → Upgrade → Blaze plan.');
  ok(`project ${PROJECT} (Blaze)`);
  const fb = run(FIREBASE, ['projects:list', '--json'], { capture: true, allowFail: true });
  if (!fb.ok || !fb.out.includes(`"${PROJECT}"`)) die('Log in to the Firebase CLI too: npx firebase login');
  ok('Firebase CLI logged in');
}

async function backend() {
  const list = firebaseJson(['apphosting:backends:list', '--project', PROJECT]);
  const all = Array.isArray(list.result) ? list.result : [];
  const wanted = flag('backend');
  const b = wanted
    ? all.find((x) => x.name?.endsWith(`/backends/${wanted}`))
    : all.length === 1
      ? all[0]
      : undefined;
  if (!b) {
    if (all.length > 1)
      die(
        `Several App Hosting backends — pass --backend <id> (${all.map((x) => x.name.split('/').pop()).join(', ')})`,
      );
    die(
      'No App Hosting backend yet. Firebase console → App Hosting → Get started → connect the GitHub repo ' +
        '(branch main, root /), then run this again.',
    );
  }
  const id = b.name.split('/').pop();
  const host = String(b.uri ?? '')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  if (!host) die(`Backend ${id} has no URL yet — wait for its first rollout to start, then run this again.`);
  return { id, host, appId: b.appId };
}

async function webAppId(preferred) {
  if (preferred) return preferred;
  const apps = firebaseJson(['apps:list', 'WEB', '--project', PROJECT]).result ?? [];
  if (!apps.length) die('No Firebase web app. Firebase console → Project settings → Add app → Web.');
  return apps[0].appId;
}

async function marketplaceId() {
  const wanted = flag('marketplace');
  if (wanted) return wanted;
  const r = await api('GET', `${FS()}/tenants?pageSize=10&mask.fieldPaths=name`);
  const ids = (r.json.documents ?? []).map((d) => d.name.split('/').pop());
  if (ids.length === 1) return ids[0];
  if (!ids.length)
    die('No marketplace yet — run the first setup: npm run setup:prod -- --project ' + PROJECT);
  return die(`Several marketplaces — pass --marketplace <id> (${ids.join(', ')})`);
}

async function authorizeDomain(host) {
  const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT}/config`;
  const cfg = await apiOk('GET', url, undefined, 'read Authentication settings');
  const domains = cfg.authorizedDomains ?? [];
  if (domains.includes(host)) return skip(`${host} already an authorized sign-in domain`);
  await apiOk(
    'PATCH',
    `${url}?updateMask=authorizedDomains`,
    { authorizedDomains: [...domains, host] },
    'add authorized domain',
  );
  ok(`${host} added to authorized sign-in domains`);
}

async function rollout(backendId) {
  step('Deploy the website (App Hosting rollout from GitHub main)');
  run(FIREBASE, [
    'apphosting:rollouts:create',
    backendId,
    '--git-branch',
    'main',
    '--project',
    PROJECT,
    '--force',
  ]);
  ok('rollout started — follow it in Firebase console → App Hosting');
}

// ---------- commands ----------
async function init() {
  step('Checks');
  await preflight();
  const db = await api('GET', `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)`);
  if (db.status !== 200)
    die('No Firestore database. Firebase console → Firestore → Create database (Native mode).');
  ok(`Firestore (${db.json.locationId})`);
  const be = await backend();
  ok(`App Hosting backend "${be.id}" → https://${be.host}`);
  const appId = await webAppId(be.appId);
  const sdk = firebaseJson(['apps:sdkconfig', 'WEB', appId, '--project', PROJECT]);
  const bucket = sdk.result?.sdkConfig?.storageBucket ?? sdk.result?.storageBucket;
  if (!bucket) die('No Storage bucket. Firebase console → Storage → Get started.');
  ok(`web app ${appId}, bucket ${bucket}`);

  step('Turn on Google APIs');
  run('gcloud', [
    'services',
    'enable',
    'secretmanager.googleapis.com',
    'recaptchaenterprise.googleapis.com',
    'firebaseappcheck.googleapis.com',
    'identitytoolkit.googleapis.com',
    'iamcredentials.googleapis.com',
    'cloudscheduler.googleapis.com',
    '--project',
    PROJECT,
  ]);
  ok('APIs enabled');

  step('Security rules, indexes, cleanup and backups');
  run(FIREBASE, [
    'deploy',
    '--only',
    'firestore:rules,firestore:indexes,storage',
    '--project',
    PROJECT,
    '--non-interactive',
  ]);
  ok('rules and indexes deployed (indexes finish building in a few minutes)');
  const ttl = await api(
    'PATCH',
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/collectionGroups/rateLimits/fields/expiresAt?updateMask=ttlConfig`,
    { ttlConfig: {} },
  );
  if (ttl.status < 300) ok('old rate-limit counters are deleted automatically (TTL)');
  else skip(`TTL: ${ttl.json.error?.message}`);
  const sched = await api(
    'GET',
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/backupSchedules`,
  );
  if ((sched.json.backupSchedules ?? []).length) skip('daily backup already scheduled');
  else {
    await apiOk(
      'POST',
      `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/backupSchedules`,
      { retention: `${14 * 86400}s`, dailyRecurrence: {} },
      'schedule backups',
    );
    ok('daily backup, kept 14 days');
  }

  step('Secrets (Google Secret Manager)');
  const defaults = {
    QR_SIGNING_SECRET: () => randomBytes(48).toString('base64url'),
    RESEND_API_KEY: () => 'dev', // emails are stored, not sent, until `setup:prod email`
    STRIPE_SECRET_KEY: () => 'unset', // until `setup:prod stripe`
    STRIPE_WEBHOOK_SECRET: () => 'unset',
  };
  for (const [name, make] of Object.entries(defaults)) {
    if (await secretExists(name)) skip(`${name} exists`);
    else {
      await putSecret(name, make());
      ok(`${name} created`);
    }
  }

  step('App Check (reCAPTCHA Enterprise)');
  let siteKey = await secretValue('RECAPTCHA_SITE_KEY');
  if (siteKey) skip(`site key exists (${siteKey})`);
  else {
    const key = await apiOk(
      'POST',
      `https://recaptchaenterprise.googleapis.com/v1/projects/${PROJECT}/keys`,
      {
        displayName: 'Marketplace web',
        webSettings: { allowedDomains: [be.host], integrationType: 'SCORE' },
      },
      'create reCAPTCHA key',
    );
    siteKey = key.name.split('/').pop();
    await putSecret('RECAPTCHA_SITE_KEY', siteKey);
    ok(`reCAPTCHA key ${siteKey}`);
  }
  await apiOk(
    'PATCH',
    `https://firebaseappcheck.googleapis.com/v1/projects/${PROJECT}/apps/${appId}/recaptchaEnterpriseConfig?updateMask=siteKey`,
    { siteKey },
    'register App Check',
  );
  ok('web app registered with App Check (not enforced yet — see docs/deploy.md)');

  step('Give the website access');
  run(FIREBASE, [
    'apphosting:secrets:grantaccess',
    'QR_SIGNING_SECRET,STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET,RECAPTCHA_SITE_KEY',
    '--backend',
    be.id,
    '--project',
    PROJECT,
  ]);
  const sa = `firebase-app-hosting-compute@${PROJECT}.iam.gserviceaccount.com`;
  // createCustomToken (image uploads, scanner sign-in) signs as the backend's own account.
  run(
    'gcloud',
    [
      'iam',
      'service-accounts',
      'add-iam-policy-binding',
      sa,
      `--member=serviceAccount:${sa}`,
      '--role=roles/iam.serviceAccountTokenCreator',
      '--project',
      PROJECT,
      '--quiet',
    ],
    { capture: true },
  );
  // Storing image URLs updates object metadata.
  run(
    'gcloud',
    [
      'projects',
      'add-iam-policy-binding',
      PROJECT,
      `--member=serviceAccount:${sa}`,
      '--role=roles/storage.objectAdmin',
      '--condition=None',
      '--quiet',
    ],
    { capture: true },
  );
  ok('secrets, token signing and image access granted');

  step('Accounts: Identity Platform multi-tenancy');
  const cfgUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT}/config`;
  const cfg = await api('GET', cfgUrl);
  if (cfg.status !== 200)
    die(
      'Identity Platform is not on. Firebase console → Authentication → Settings → Upgrade to Identity Platform.',
    );
  if (cfg.json.multiTenant?.allowTenants) skip('multi-tenancy already on');
  else {
    await apiOk(
      'PATCH',
      `${cfgUrl}?updateMask=multiTenant.allowTenants`,
      { multiTenant: { allowTenants: true } },
      'turn on multi-tenancy',
    );
    ok('multi-tenancy on');
  }
  await authorizeDomain(be.host);

  step('Cloud Functions (sign-up hook, roles, check-in, emails, scheduled jobs)');
  run('npm', ['--prefix', 'functions', 'install', '--silent']);
  run(FIREBASE, ['deploy', '--only', 'functions', '--project', PROJECT, '--non-interactive']);
  ok('functions deployed; the sign-up hook is registered with Authentication automatically');

  step('First marketplace');
  const id = (await ask('Marketplace id (letters, digits, hyphens)', 'ticketexpert')).toLowerCase();
  if (!/^[a-z][a-z0-9-]{2,30}$/.test(id))
    die('Use 3–31 lowercase letters, digits or hyphens, starting with a letter.');
  const existing = await fsGet(`tenants/${id}`);
  let authTenantId;
  if (existing.status === 200) {
    authTenantId = existing.json.fields?.authTenantId?.stringValue;
    skip(`marketplace "${id}" exists (pool ${authTenantId})`);
  } else {
    const name = await ask('Marketplace name', 'TicketExpert');
    const timezone = await ask('Timezone (IANA)', 'Asia/Dhaka');
    const currency = (await ask('Currency (3 letters, must be supported by Stripe)', 'USD')).toUpperCase();
    const pool = await apiOk(
      'POST',
      `https://identitytoolkit.googleapis.com/v2/projects/${PROJECT}/tenants`,
      { displayName: id.replace(/-/g, '').slice(0, 20).padEnd(4, 'x'), allowPasswordSignup: true },
      'create user pool',
    );
    authTenantId = pool.name.split('/').pop();
    ok(`user pool ${authTenantId} (email + password; add Google in Authentication → Tenants if wanted)`);
    await fsSet(
      `tenants/${id}`,
      {
        name,
        status: 'active',
        authTenantId,
        domains: [be.host],
        timezone,
        currency,
        commissionRate: 0.035,
        footerTagline: '',
        socialLinks: {},
        paymentConfig: { provider: 'stripe', chargesEnabled: false },
        branding: { name, primaryColor: '#5B2EE0', accentColor: '#FF6B4A', logo: null },
      },
      'create marketplace',
    );
    await fsSet(`tenantDomains/${be.host}`, { tenantId: id }, 'map domain');
    ok(`marketplace "${name}" on https://${be.host}`);
  }

  const email = (await ask('Admin email (you)', flag('admin-email'))).toLowerCase();
  if (!email.includes('@')) die('Enter a valid email.');
  const IT = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}`;
  const found = await apiOk(
    'POST',
    `${IT}/accounts:lookup`,
    { email: [email], tenantId: authTenantId },
    'look up admin',
  );
  let uid = found.users?.[0]?.localId;
  if (uid) skip(`account ${email} exists`);
  else {
    const created = await apiOk(
      'POST',
      `${IT}/tenants/${authTenantId}/accounts`,
      { email, password: randomBytes(24).toString('base64url'), displayName: 'Admin', emailVerified: false },
      'create admin account',
    );
    uid = created.localId;
    await fsSet(
      `users/${uid}`,
      { tenantId: id, displayName: 'Admin', email, createdAt: new Date() },
      'create user profile',
    );
    ok(`account ${email} created`);
  }
  await apiOk(
    'POST',
    `${IT}/accounts:update`,
    {
      localId: uid,
      tenantId: authTenantId,
      customAttributes: JSON.stringify({ role: 'tenant_admin', tenantId: id }),
    },
    'make admin',
  );
  ok(`${email} is the marketplace admin`);
  const link = await apiOk(
    'POST',
    `${IT}/accounts:sendOobCode`,
    {
      requestType: 'PASSWORD_RESET',
      email,
      tenantId: authTenantId,
      returnOobLink: true,
      continueUrl: `https://${be.host}/login?next=/admin`,
    },
    'create set-password link',
  );

  await rollout(be.id);

  console.log(`
${bold(green('Done.'))}
  Website:  https://${be.host}   (ready when the rollout finishes, ~5 min)
  Admin:    open this link to set your password, then log in → /admin
            ${link.oobLink}

  Next (when you need them):
    Stripe payments   npm run setup:prod -- stripe --project ${PROJECT}
    Real emails       npm run setup:prod -- email --project ${PROJECT}
    Own domain        npm run setup:prod -- domain your-domain.com --project ${PROJECT}
  Then: check https://${be.host}/api/health → "yourIp" should be your public IP; enforce App Check (docs/deploy.md).
`);
}

async function stripe() {
  step('Stripe');
  await preflight();
  const be = await backend();
  console.log(`  Stripe dashboard → Developers → API keys (test mode first: sk_test_…).
  Webhook: Developers → Webhooks → Add endpoint → https://${be.host}/api/webhooks/stripe
    "Listen to events on Connected accounts": checkout.session.completed, checkout.session.async_payment_succeeded,
    checkout.session.expired, checkout.session.async_payment_failed → copy its signing secret (whsec_…).`);
  const sk = await ask('Secret key (sk_test_… or sk_live_…)');
  const wh = await ask('Webhook signing secret (whsec_…)');
  if (!/^sk_(test|live)_/.test(sk) || !/^whsec_/.test(wh)) die('Those don’t look like Stripe keys.');
  await putSecret('STRIPE_SECRET_KEY', sk);
  await putSecret('STRIPE_WEBHOOK_SECRET', wh);
  ok('Stripe keys stored in Secret Manager');
  await rollout(be.id);
  console.log(`\n  Then: /admin → Settings → Payments → Connect Stripe. Test card 4242 4242 4242 4242.`);
}

async function email() {
  step('Email (Resend)');
  await preflight();
  console.log('  Resend → Domains → add and verify your domain; Resend → API Keys → create a key (re_…).');
  const key = await ask('Resend API key');
  const from = await ask('Sender, e.g. Tickets <tickets@your-domain.com>');
  if (!/^re_/.test(key) || !from.includes('@')) die('Check the key and the sender address.');
  await putSecret('RESEND_API_KEY', key);
  const envFile = `functions/.env.${PROJECT}`;
  const lines = existsSync(envFile)
    ? readFileSync(envFile, 'utf8')
        .split('\n')
        .filter((l) => l && !l.startsWith('EMAIL_FROM='))
    : [];
  writeFileSync(envFile, [...lines, `EMAIL_FROM=${JSON.stringify(from)}`].join('\n') + '\n');
  ok(`key stored; sender saved in ${envFile}`);
  run(FIREBASE, ['deploy', '--only', 'functions', '--project', PROJECT, '--non-interactive']);
  ok('functions redeployed — emails are now sent');
}

async function domain() {
  const host = String(positional[1] ?? '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host))
    die('Usage: npm run setup:prod -- domain your-domain.com --project <id>');
  step(`Domain ${host}`);
  await preflight();
  const id = await marketplaceId();
  const owner = await fsGet(`tenantDomains/${host}`);
  if (owner.status === 200 && owner.json.fields?.tenantId?.stringValue !== id)
    die(`${host} already belongs to another marketplace.`);
  await fsSet(`tenantDomains/${host}`, { tenantId: id }, 'map domain');
  const t = await fsGet(`tenants/${id}`);
  const domains = (t.json.fields?.domains?.arrayValue?.values ?? []).map((v) => v.stringValue);
  if (!domains.includes(host)) {
    await apiOk(
      'PATCH',
      `${FS()}/tenants/${id}?updateMask.fieldPaths=domains`,
      { fields: { domains: fsValue([...domains, host]) } },
      'update marketplace domains',
    );
  }
  ok(`${host} → marketplace "${id}"`);
  await authorizeDomain(host);
  const siteKey = await secretValue('RECAPTCHA_SITE_KEY');
  if (siteKey) {
    const keyUrl = `https://recaptchaenterprise.googleapis.com/v1/projects/${PROJECT}/keys/${siteKey}`;
    const key = await apiOk('GET', keyUrl, undefined, 'read reCAPTCHA key');
    const allowed = key.webSettings?.allowedDomains ?? [];
    if (!allowed.includes(host)) {
      await apiOk(
        'PATCH',
        `${keyUrl}?updateMask=webSettings.allowedDomains`,
        { webSettings: { ...key.webSettings, allowedDomains: [...allowed, host] } },
        'update reCAPTCHA domains',
      );
    }
    ok('App Check key allows the domain');
  }
  console.log(`
  Last step (DNS): Firebase console → App Hosting → your backend → Settings → Domains → Add custom domain → ${host},
  then add the DNS records it shows at your domain registrar. HTTPS is issued automatically.
  If Stripe is connected, change the webhook URL to https://${host}/api/webhooks/stripe`);
}

try {
  if (command === 'init') await init();
  else if (command === 'stripe') await stripe();
  else if (command === 'email') await email();
  else await domain();
} finally {
  rl.close();
}
