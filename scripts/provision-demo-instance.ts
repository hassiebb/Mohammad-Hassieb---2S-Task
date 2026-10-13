/**
 * Explicit Provisioning & Configuration Script for Odoo Demo Instance.
 *
 * Use this script ONLY when deliberately setting up or refreshing the pinned
 * demo instance for a development session.
 *
 * Saves non-secret configuration (EXPO_PUBLIC_ODOO_URL and EXPO_PUBLIC_ODOO_DB)
 * to .env so both the mobile app and test suites stay locked to the same instance.
 *
 * Usage:
 *   npx tsx scripts/provision-demo-instance.ts
 */

declare const require: any;
declare const __dirname: string;
const fs = require('fs');
const path = require('path');

interface BootstrapResult {
  host: string;
  database: string;
  username: string;
  password: string;
}

async function requestDemoBootstrap(): Promise<BootstrapResult> {
  const startXml = `<?xml version="1.0"?><methodCall><methodName>start</methodName><params></params></methodCall>`;
  const res = await fetch('https://demo.odoo.com/start', {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml' },
    body: startXml,
  });

  if (!res.ok) {
    throw new Error(`Failed to contact demo.odoo.com/start (HTTP ${res.status})`);
  }

  const text = await res.text();
  const hostMatch = text.match(/<name>host<\/name>\s*<value><string>([^<]+)<\/string>/);
  const dbMatch = text.match(/<name>database<\/name>\s*<value><string>([^<]+)<\/string>/);
  const userMatch = text.match(/<name>user<\/name>\s*<value><string>([^<]+)<\/string>/);
  const pwdMatch = text.match(/<name>password<\/name>\s*<value><string>([^<]+)<\/string>/);

  if (!hostMatch || !dbMatch || !userMatch || !pwdMatch) {
    throw new Error('Unable to parse demo credentials from XML-RPC response.');
  }

  return {
    host: hostMatch[1].trim(),
    database: dbMatch[1].trim(),
    username: userMatch[1].trim(),
    password: pwdMatch[1].trim(),
  };
}

async function verifyInstance(host: string, db: string, user: string, pass: string): Promise<boolean> {
  // 1. Version check
  const versionRes = await fetch(`${host}/web/webclient/version_info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: {} }),
  });
  if (!versionRes.ok) return false;

  // 2. Auth check
  const authRes = await fetch(`${host}/web/session/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: { db, login: user, password: pass },
    }),
  });
  if (!authRes.ok) return false;
  const authData: any = await authRes.json();
  return Boolean(authData.result?.uid);
}

async function main() {
  console.log('====================================================');
  console.log('Explicit Odoo Demo Instance Provisioning');
  console.log('====================================================\n');

  console.log('[INFO] Requesting demo instance from official bootstrap endpoint...');

  let demo: BootstrapResult | null = null;
  let attempts = 0;
  const targetHost = 'https://demo1.odoo.com';

  // Attempt to target demo1.odoo.com if possible, up to 4 attempts
  while (attempts < 5) {
    attempts++;
    const res = await requestDemoBootstrap();
    console.log(`[INFO] Attempt ${attempts}: received ${res.host} (database: ${res.database})`);
    if (res.host === targetHost) {
      demo = res;
      break;
    }
    // If last attempt, accept whatever instance was returned
    if (attempts === 5) {
      demo = res;
    }
  }

  if (!demo) {
    throw new Error('Failed to obtain a valid demo instance.');
  }

  console.log('\n[INFO] Verifying instance credentials and connectivity...');
  const isHealthy = await verifyInstance(demo.host, demo.database, demo.username, demo.password);
  if (!isHealthy) {
    throw new Error(`Instance verification failed on ${demo.host} for database ${demo.database}`);
  }
  console.log('  ✓ PASS: Instance verified healthy and accessible.');

  // Save non-secret config to .env
  const envPath = path.resolve(__dirname, '../.env');
  const envContent = [
    `# Pinned Odoo Configuration (Generated: ${new Date().toISOString()})`,
    `EXPO_PUBLIC_SERVICE_MODE=odoo`,
    `EXPO_PUBLIC_ODOO_URL=${demo.host}`,
    `EXPO_PUBLIC_ODOO_DB=${demo.database}`,
    '',
  ].join('\n');

  fs.writeFileSync(envPath, envContent, 'utf-8');
  console.log(`[INFO] Saved non-secret configuration to ${envPath}`);

  console.log('\n====================================================');
  console.log('PINNED INSTANCE READY');
  console.log('====================================================');
  console.log(`Host:     ${demo.host}`);
  console.log(`Database: ${demo.database}`);
  console.log(`User:     ${demo.username}`);
  console.log(`Password: [REDACTED, length: ${demo.password.length}]`);
  console.log('\nDirect Browser Verification Link:');
  console.log(`  ${demo.host}/web/login?db=${demo.database}`);
  console.log(`  ${demo.host}/odoo?db=${demo.database}`);
  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('[ERROR] Provisioning failed:', err.message);
  process.exit(1);
});
