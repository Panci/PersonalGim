import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testRoot = path.resolve(projectRoot, 'server', '.local-data');
await mkdir(testRoot, { recursive: true });
const stateDir = await mkdtemp(path.join(testRoot, 'verification-'));
const freePort = await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    server.close(() => resolve(address.port));
  });
});
const baseUrl = `http://127.0.0.1:${freePort}`;
const child = spawn(process.execPath, [path.join(projectRoot, 'server', 'src', 'local-dev.js')], {
  cwd: projectRoot,
  env: {
    ...process.env,
    LOCAL_API_PORT: String(freePort),
    LOCAL_API_HOST: '127.0.0.1',
    LOCAL_DATA_DIR: stateDir,
    LOCAL_BOOTSTRAP_ADMIN_EMAIL: 'verification-admin@local.test',
    LOCAL_BOOTSTRAP_ADMIN_PIN: '1234',
    WHATSAPP_ACCESS_TOKEN: '',
    WHATSAPP_PHONE_NUMBER_ID: '',
    WHATSAPP_TEMPLATE_NAME: '',
    WHATSAPP_GRAPH_API_VERSION: '',
  },
  stdio: 'ignore',
});

const request = async (url, { token, method = 'GET', body } = {}) => {
  const response = await fetch(`${baseUrl}${url}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, data: await response.json() };
};
const login = (email, pin = '1234') => request('/api/auth/login', { method: 'POST', body: { email, pin } });
const madridToday = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};
const minusDays = (value, count) => {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - count);
  return date.toISOString().slice(0, 10);
};

try {
  let ready = false;
  for (let i = 0; i < 100; i += 1) {
    if (child.exitCode !== null) throw new Error('La API local terminó antes de iniciar.');
    try {
      const response = await request('/health');
      if (response.status === 200) { ready = true; break; }
    } catch { /* Wait for startup. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal(ready, true, 'La API local no arrancó.');
  assert.equal((await request('/api/members')).status, 401);

  const adminLogin = await login('verification-admin@local.test');
  assert.equal(adminLogin.status, 200);
  const adminToken = adminLogin.data.token;
  assert.equal((await request('/api/admin/whatsapp-settings', { token: adminToken })).data.configured, false);

  const userEmail = 'verification-member@local.test';
  const created = await request('/api/users', {
    method: 'POST', token: adminToken,
    body: { email: userEmail, fullName: 'Socio Verificación', pin: '1234', role: 'user',
      memberProfile: { phone: '600123456', objective: 'salud_general', level: 'principiante' } },
  });
  assert.equal(created.status, 201);
  const member = (await request('/api/members', { token: adminToken })).data.members
    .find((item) => item.email === userEmail);
  assert.ok(member?.id);
  const memberLogin = await login(userEmail);
  assert.equal(memberLogin.status, 200);
  const memberToken = memberLogin.data.token;
  const membershipUrl = `/api/members/${member.id}/membership`;
  const dueDate = minusDays(madridToday(), 5);
  const payload = { monthlyFee: 35, paymentDueDate: dueDate, whatsappRemindersEnabled: true };

  assert.equal((await request(membershipUrl, { method: 'PATCH', token: adminToken, body: payload })).status, 400);
  assert.equal((await request(membershipUrl, { method: 'PATCH', token: memberToken, body: payload })).status, 403);
  assert.equal((await request(membershipUrl, { method: 'PATCH', token: adminToken,
    body: { ...payload, whatsappRemindersEnabled: false } })).status, 200);
  assert.equal((await login(userEmail)).status, 403);
  assert.equal((await request('/api/auth/me', { token: memberToken })).status, 403);
  const blockedMember = (await request('/api/members', { token: adminToken })).data.members
    .find((item) => item.id === member.id);
  assert.equal(blockedMember.paymentBlocked, true);

  const consentNote = 'Formulario firmado el 24/09/2026';
  assert.equal((await request(membershipUrl, { method: 'PATCH', token: adminToken,
    body: { ...payload, whatsappConsentNote: consentNote } })).status, 200);
  const consentMember = (await request('/api/members', { token: adminToken })).data.members
    .find((item) => item.id === member.id);
  assert.equal(consentMember.whatsappConsentNote, consentNote);
  assert.ok(consentMember.whatsappConsentRecordedAt);

  const paid = await request(`/api/members/${member.id}/payments`, { method: 'POST', token: adminToken });
  assert.equal(paid.status, 200);
  assert.equal(paid.data.payment.amount, 35);
  assert.equal((await login(userEmail)).status, 200);
  const payments = await request(`/api/members/${member.id}/payments`, { token: adminToken });
  assert.equal(payments.data.payments.length, 1);

  const phoneChange = await request(`/api/members/${member.id}`, { method: 'PATCH', token: adminToken,
    body: { fullName: 'Socio Verificación', email: userEmail,
      memberProfile: { phone: '600654321', objective: 'salud_general', level: 'principiante' } } });
  assert.equal(phoneChange.status, 200);
  const changedMember = (await request('/api/members', { token: adminToken })).data.members
    .find((item) => item.id === member.id);
  assert.equal(changedMember.whatsappRemindersEnabled, false);

  const monitor = await request('/api/users', { method: 'POST', token: adminToken,
    body: { email: 'verification-monitor@local.test', fullName: 'Monitor Verificación', pin: '1234', role: 'monitor' } });
  assert.equal(monitor.status, 201);
  const monitorToken = (await login('verification-monitor@local.test')).data.token;
  const monitorMember = (await request('/api/members', { token: monitorToken })).data.members
    .find((item) => item.id === member.id);
  assert.equal(monitorMember.whatsappConsentNote, undefined);
  assert.equal((await request(`/api/members/${member.id}/payments`, { token: monitorToken })).status, 403);

  process.stdout.write('Verificación API local: accesos, cuota, consentimiento, cambio de teléfono, bloqueo, pago y permisos correctos.\n');
} finally {
  child.kill();
  if (child.exitCode === null) await once(child, 'exit');
  const resolved = path.resolve(stateDir);
  if (resolved.startsWith(`${testRoot}${path.sep}`) && path.basename(resolved).startsWith('verification-')) {
    await rm(resolved, { recursive: true, force: true });
  }
}
