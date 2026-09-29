/*
 * File-backed API for local development only.
 *
 * Production uses server/src/index.js with PostgreSQL. This server lets the
 * app run without Docker/PostgreSQL and stores local credentials and workouts
 * in server/.local-data/state.json, which is ignored by git.
 */
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { GeminiRoutineError, generateGeminiRoutine } = require('./gemini');
const { isWhatsAppConfigured, sendMembershipReminder } = require('./whatsapp');

const app = express();
const port = Number(process.env.LOCAL_API_PORT || 8082);
const host = process.env.LOCAL_API_HOST || '127.0.0.1';
const jwtSecret = process.env.LOCAL_JWT_SECRET || 'personalgim-local-development-secret-2026';
const settingsCipherKey = crypto.createHash('sha256')
  .update(process.env.LOCAL_SETTINGS_ENCRYPTION_KEY || jwtSecret, 'utf8')
  .digest();
const validRoles = new Set(['admin', 'monitor', 'user']);
const PIN_PATTERN = /^\d{4}$/;
const DEFAULT_LOCAL_ADMIN_PIN = '1234';
const billingTimeZone = process.env.BILLING_TIME_ZONE || 'Europe/Madrid';
const LEGACY_LOCAL_ADMIN_PASSWORD = 'LocalPersonalGim2026!';
const stateDir = process.env.LOCAL_DATA_DIR
  ? path.resolve(process.env.LOCAL_DATA_DIR)
  : path.resolve(__dirname, '..', '.local-data');
const stateFile = path.join(stateDir, 'state.json');

let state = { users: [], workouts: [], routinesByUser: {}, audit: [], members: [], payments: [], reminders: [], routineTemplates: [], aiSettings: null };

const encryptSecret = (value) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', settingsCipherKey, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
};

const decryptSecret = (encryptedValue) => {
  const [ivValue, tagValue, ciphertextValue] = String(encryptedValue || '').split('.');
  if (!ivValue || !tagValue || !ciphertextValue) throw new Error('Credencial cifrada no válida.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', settingsCipherKey, Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, 'base64url')), decipher.final()]).toString('utf8');
};

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  role: user.role,
  isActive: user.isActive,
});

const createToken = (user) => jwt.sign(
  { email: user.email, role: user.role, name: user.fullName },
  jwtSecret,
  { subject: user.id, expiresIn: '12h', issuer: 'personalgim-local-api', audience: 'personalgim-local-app' },
);

const writeState = async () => {
  await fs.mkdir(stateDir, { recursive: true });
  await fs.writeFile(stateFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
};

const isValidDateOnly = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(value + 'T00:00:00.000Z'))
  && new Date(value + 'T00:00:00.000Z').toISOString().slice(0, 10) === value;

const addOneMonthToDateOnly = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const lastDay = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
};

const dateInBillingTimeZone = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: billingTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const addDaysToDateOnly = (value, days) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
};

const isMembershipBlocked = (member, today = dateInBillingTimeZone()) => Boolean(
  member?.monthlyFee
  && isValidDateOnly(member.paymentDueDate)
  && addDaysToDateOnly(member.paymentDueDate, 5) <= today,
);

const formatDateForMember = (value) => {
  const [year, month, day] = String(value || '').slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : '';
};

const readState = async () => {
  await fs.mkdir(stateDir, { recursive: true });
  try {
    const raw = await fs.readFile(stateFile, 'utf8');
    const parsed = JSON.parse(raw);
    state = {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      workouts: Array.isArray(parsed.workouts) ? parsed.workouts : [],
      routinesByUser: parsed.routinesByUser && typeof parsed.routinesByUser === 'object'
        ? parsed.routinesByUser
        : {},
      audit: Array.isArray(parsed.audit) ? parsed.audit : [],
      members: Array.isArray(parsed.members) ? parsed.members : [],
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
      reminders: Array.isArray(parsed.reminders) ? parsed.reminders : [],
      routineTemplates: Array.isArray(parsed.routineTemplates) ? parsed.routineTemplates : [],
      // Local keys are encrypted with a machine-local server secret. The
      // source file is ignored by git and the key is never returned by the API.
      aiSettings: typeof parsed.aiSettings?.encryptedApiKey === 'string' ? {
        encryptedApiKey: parsed.aiSettings.encryptedApiKey,
        updatedAt: parsed.aiSettings.updatedAt || null,
      } : null,
    };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await writeState();
  }
};

const bootstrapAdmin = async () => {
  const email = (process.env.LOCAL_BOOTSTRAP_ADMIN_EMAIL || 'admin@local.test').trim().toLowerCase();
  const pin = process.env.LOCAL_BOOTSTRAP_ADMIN_PIN || DEFAULT_LOCAL_ADMIN_PIN;
  if (!PIN_PATTERN.test(pin)) throw new Error('LOCAL_BOOTSTRAP_ADMIN_PIN debe tener exactamente 4 dígitos.');
  const existing = state.users.find((user) => user.email === email);
  if (existing) {
    if (await bcrypt.compare(LEGACY_LOCAL_ADMIN_PASSWORD, existing.passwordHash)) {
      existing.passwordHash = await bcrypt.hash(pin, 12);
      existing.updatedAt = new Date().toISOString();
      await writeState();
      console.log(`PIN local actualizado para ${email}.`);
    }
    return false;
  }

  state.users.push({
    id: crypto.randomUUID(),
    email,
    fullName: 'Administrador local',
    passwordHash: await bcrypt.hash(pin, 12),
    role: 'admin',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await writeState();
  return true;
};

const syncLocalMembers = async () => {
  let changed = false;
  for (const user of state.users.filter((candidate) => candidate.role === 'user')) {
    if (state.members.some((member) => member.userId === user.id)) continue;
    state.members.push({
      id: crypto.randomUUID(), userId: user.id, fullName: user.fullName, email: user.email,
      membershipNumber: `SOC-${user.id.replaceAll('-', '').slice(0, 8).toUpperCase()}`,
      objective: 'salud_general', level: 'principiante', status: 'activo',
      enrollmentDate: user.createdAt, completedWorkoutsCount: 0,
    });
    changed = true;
  }
  if (changed) await writeState();
};

const authenticate = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Inicia sesión para continuar.' });

  try {
    const payload = jwt.verify(token, jwtSecret, {
      issuer: 'personalgim-local-api',
      audience: 'personalgim-local-app',
    });
    const user = state.users.find((candidate) => candidate.id === payload.sub);
    if (!user || !user.isActive) return res.status(401).json({ error: 'La cuenta no está disponible.' });
    const member = state.members.find((candidate) => candidate.userId === user.id);
    if (user.role === 'user' && isMembershipBlocked(member)) {
      return res.status(403).json({ error: 'Acceso suspendido por una cuota pendiente desde hace cinco días. Contacta con el gimnasio cuando hayas realizado el pago.' });
    }
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: 'Tu sesión ha caducado. Inicia sesión otra vez.' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'No tienes permiso para esta acción.' });
  return next();
};

const addAudit = async (actorUserId, action, metadata = {}) => {
  state.audit.push({
    id: crypto.randomUUID(),
    actorUserId,
    action,
    metadata,
    createdAt: new Date().toISOString(),
  });
  await writeState();
};

let localReminderRunActive = false;
const processLocalMembershipReminders = async () => {
  if (!isWhatsAppConfigured() || localReminderRunActive) return;
  localReminderRunActive = true;
  const dueDate = addDaysToDateOnly(dateInBillingTimeZone(), 2);
  try {
    const members = state.members.filter((member) => (
      member.whatsappRemindersEnabled === true
      && Boolean(String(member.whatsappConsentNote || '').trim())
      && Boolean(member.whatsappConsentRecordedAt)
      && Boolean(String(member.phone || '').trim())
      && Boolean(member.monthlyFee)
      && state.users.some((user) => user.id === member.userId && user.isActive)
      && member.paymentDueDate === dueDate
      && member.status === 'activo'
    ));
    for (const member of members) {
      let reminder = state.reminders.find((item) => item.memberId === member.id
        && item.coveredDueDate === member.paymentDueDate && item.reminderType === 'before_due');
      if (reminder?.sentAt || (reminder && reminder.attemptCount >= 3)) continue;
      if (reminder?.nextAttemptAt && new Date(reminder.nextAttemptAt).getTime() > Date.now()) continue;
      if (!reminder) {
        reminder = {
          memberId: member.id,
          coveredDueDate: member.paymentDueDate,
          reminderType: 'before_due',
          attemptCount: 0,
          nextAttemptAt: null,
          sentAt: null,
        };
        state.reminders.push(reminder);
      }
      reminder.attemptCount += 1;
      reminder.nextAttemptAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      reminder.lastError = null;
      await writeState();
      try {
        reminder.providerMessageId = await sendMembershipReminder({
          phone: member.phone,
          fullName: member.fullName,
          monthlyFee: Number(member.monthlyFee),
          dueDate: formatDateForMember(member.paymentDueDate),
        });
        reminder.sentAt = new Date().toISOString();
        reminder.nextAttemptAt = null;
        await writeState();
      } catch (error) {
        reminder.lastError = String(error instanceof Error ? error.message : 'Error de envío').slice(0, 500);
        reminder.nextAttemptAt = reminder.attemptCount < 3
          ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
          : null;
        await writeState();
        console.warn(`No se pudo enviar recordatorio de cuota al socio ${member.id}: ${reminder.lastError}`);
      }
    }
  } catch (error) {
    console.error('No se pudieron procesar los recordatorios de cuotas locales:', error);
  } finally {
    localReminderRunActive = false;
  }
};

app.use(cors({ origin: true }));
app.use(express.json({ limit: '128kb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok', environment: 'local' }));

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const pin = String(req.body?.pin || '');
  if (!email || !PIN_PATTERN.test(pin)) return res.status(400).json({ error: 'Introduce un PIN de exactamente 4 dígitos.' });

  const user = state.users.find((candidate) => candidate.email === email);
  if (!user || !user.isActive || !(await bcrypt.compare(pin, user.passwordHash))) {
    return res.status(401).json({ error: 'Correo o PIN incorrectos.' });
  }
  const member = state.members.find((candidate) => candidate.userId === user.id);
  if (user.role === 'user' && isMembershipBlocked(member)) {
    return res.status(403).json({ error: 'Acceso suspendido por una cuota pendiente desde hace cinco días. Contacta con el gimnasio cuando hayas realizado el pago.' });
  }
  await addAudit(user.id, 'login');
  return res.json({ token: createToken(user), user: publicUser(user) });
});

app.get('/api/auth/me', authenticate, (req, res) => res.json({ user: publicUser(req.user) }));

app.patch('/api/auth/account', authenticate, async (req, res) => {
  const currentPin = String(req.body?.currentPin || '');
  const nextEmail = String(req.body?.email || '').trim().toLowerCase();
  const nextPin = String(req.body?.newPin || '');
  if (!PIN_PATTERN.test(currentPin)) return res.status(400).json({ error: 'Introduce tu PIN actual de 4 dígitos.' });
  if (!nextEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
    return res.status(400).json({ error: 'Introduce un correo electrónico válido.' });
  }
  if (nextPin && !PIN_PATTERN.test(nextPin)) {
    return res.status(400).json({ error: 'El nuevo PIN debe tener exactamente 4 dígitos.' });
  }
  if (state.users.some((user) => user.id !== req.user.id && user.email === nextEmail)) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
  }
  if (!(await bcrypt.compare(currentPin, req.user.passwordHash))) {
    return res.status(401).json({ error: 'El PIN actual no es correcto.' });
  }

  const previousEmail = req.user.email;
  req.user.email = nextEmail;
  if (nextPin) req.user.passwordHash = await bcrypt.hash(nextPin, 12);
  req.user.updatedAt = new Date().toISOString();
  await addAudit(req.user.id, 'update_account', {
    emailChanged: previousEmail !== nextEmail,
    pinChanged: Boolean(nextPin),
  });
  return res.json({ token: createToken(req.user), user: publicUser(req.user) });
});

app.get('/api/users', authenticate, authorize('admin'), (_req, res) => {
  res.json({ users: state.users.map(publicUser) });
});

app.post('/api/users', authenticate, authorize('admin'), async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const fullName = String(req.body?.fullName || '').trim();
  const pin = String(req.body?.pin || '');
  const role = String(req.body?.role || 'user');
  if (!email || !fullName || !PIN_PATTERN.test(pin) || !validRoles.has(role)) {
    return res.status(400).json({ error: 'Indica un PIN de exactamente 4 dígitos.' });
  }
  if (state.users.some((user) => user.email === email)) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
  }

  const user = {
    id: crypto.randomUUID(),
    email,
    fullName,
    passwordHash: await bcrypt.hash(pin, 12),
    role,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  state.users.push(user);
  if (role === 'user') {
    const profile = req.body?.memberProfile || {};
    state.members.push({
      id: crypto.randomUUID(), userId: user.id, fullName: user.fullName, email: user.email,
      membershipNumber: `SOC-${user.id.replaceAll('-', '').slice(0, 8).toUpperCase()}`,
      phone: String(profile.phone || '').trim() || undefined,
      objective: ['hipertrofia', 'fuerza', 'perdida_grasa', 'salud_general'].includes(profile.objective) ? profile.objective : 'salud_general',
      level: ['principiante', 'intermedio', 'avanzado'].includes(profile.level) ? profile.level : 'principiante',
      status: 'activo', enrollmentDate: user.createdAt, completedWorkoutsCount: 0,
    });
  }
  await addAudit(req.user.id, 'create', { role });
  return res.status(201).json({ user: publicUser(user) });
});

app.get('/api/members', authenticate, authorize('admin', 'monitor'), (req, res) => {
  res.json({ members: state.members.map((member) => ({
    ...member,
    whatsappConsentNote: req.user.role === 'admin' ? member.whatsappConsentNote : undefined,
    whatsappConsentRecordedAt: req.user.role === 'admin' ? member.whatsappConsentRecordedAt : undefined,
    paymentBlocked: isMembershipBlocked(member),
  })) });
});

app.get('/api/admin/whatsapp-settings', authenticate, authorize('admin'), (_req, res) => {
  const configured = isWhatsAppConfigured();
  return res.json({
    configured,
    templateName: configured ? process.env.WHATSAPP_TEMPLATE_NAME : null,
  });
});

app.patch('/api/members/:memberId', authenticate, authorize('admin'), async (req, res) => {
  const member = state.members.find((item) => item.id === req.params.memberId);
  if (!member) return res.status(404).json({ error: 'No se encontró el socio.' });
  const user = state.users.find((item) => item.id === member.userId && item.role === 'user');
  if (!user) return res.status(409).json({ error: 'Este socio no tiene una cuenta de Usuario asociada.' });

  const fullName = String(req.body?.fullName || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const phone = String(req.body?.memberProfile?.phone || '').trim();
  const objective = String(req.body?.memberProfile?.objective || '');
  const level = String(req.body?.memberProfile?.level || '');
  const newPin = String(req.body?.newPin || '');
  const phoneDigits = phone.replace(/\D/g, '');
  if (!fullName || fullName.length > 120) return res.status(400).json({ error: 'Introduce un nombre válido (máximo 120 caracteres).' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Introduce un correo electrónico válido.' });
  }
  if (phone && (phoneDigits.length < 6 || phoneDigits.length > 15)) {
    return res.status(400).json({ error: 'Introduce un teléfono válido o déjalo vacío.' });
  }
  if (!['hipertrofia', 'fuerza', 'perdida_grasa', 'salud_general'].includes(objective)
    || !['principiante', 'intermedio', 'avanzado'].includes(level)) {
    return res.status(400).json({ error: 'El objetivo o nivel de entrenamiento no es válido.' });
  }
  if (newPin && !PIN_PATTERN.test(newPin)) {
    return res.status(400).json({ error: 'El nuevo PIN debe tener exactamente 4 dígitos.' });
  }
  if (state.users.some((item) => item.id !== user.id && item.email === email)) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese correo electrónico.' });
  }

  const previousEmail = user.email;
  const previousName = user.fullName;
  const previousPhone = String(member.phone || '').trim();
  user.fullName = fullName;
  user.email = email;
  if (newPin) user.passwordHash = await bcrypt.hash(newPin, 12);
  user.updatedAt = new Date().toISOString();
  Object.assign(member, {
    fullName,
    email,
    phone: phone || undefined,
    objective,
    level,
  });
  if (previousPhone !== phone) member.whatsappRemindersEnabled = false;
  await addAudit(req.user.id, 'update_member', {
    memberId: member.id,
    emailChanged: previousEmail !== email,
    fullNameChanged: previousName !== fullName,
    pinChanged: Boolean(newPin),
  });
  await writeState();
  return res.json({ ok: true });
});

app.patch('/api/members/:memberId/membership', authenticate, authorize('admin'), async (req, res) => {
  const member = state.members.find((item) => item.id === req.params.memberId);
  if (!member) return res.status(404).json({ error: 'No se encontró el socio.' });
  const monthlyFee = Number(req.body?.monthlyFee);
  const normalizedMonthlyFee = Math.round(monthlyFee * 100) / 100;
  const paymentDueDate = String(req.body?.paymentDueDate || '').trim();
  const whatsappRemindersEnabled = req.body?.whatsappRemindersEnabled === true;
  const whatsappConsentNote = String(req.body?.whatsappConsentNote || '').trim();
  if (!Number.isFinite(monthlyFee) || normalizedMonthlyFee < 0.01 || normalizedMonthlyFee > 10000) {
    return res.status(400).json({ error: 'Introduce una cuota mensual válida (entre 0,01 € y 10.000 €).' });
  }
  if (!isValidDateOnly(paymentDueDate)) {
    return res.status(400).json({ error: 'Introduce una fecha de vencimiento válida.' });
  }
  if (whatsappRemindersEnabled && !String(member.phone || '').trim()) {
    return res.status(409).json({ error: 'Añade un teléfono al socio antes de activar sus avisos.' });
  }
  if (whatsappRemindersEnabled && (whatsappConsentNote.length < 5 || whatsappConsentNote.length > 200)) {
    return res.status(400).json({ error: 'Indica cómo y cuándo autorizó el socio los avisos por WhatsApp (5 a 200 caracteres).' });
  }
  if (whatsappRemindersEnabled && (!member.whatsappRemindersEnabled || member.whatsappConsentNote !== whatsappConsentNote)) {
    member.whatsappConsentRecordedAt = new Date().toISOString();
  }
  if (whatsappRemindersEnabled) member.whatsappConsentNote = whatsappConsentNote;
  member.monthlyFee = normalizedMonthlyFee;
  member.paymentDueDate = paymentDueDate;
  member.whatsappRemindersEnabled = whatsappRemindersEnabled;
  await addAudit(req.user.id, 'update_membership', {
    memberId: member.id,
    monthlyFee: member.monthlyFee,
    paymentDueDate,
    whatsappRemindersEnabled,
    consentEvidenceRecorded: whatsappRemindersEnabled && Boolean(whatsappConsentNote),
  });
  return res.json({ ok: true });
});

app.get('/api/members/:memberId/payments', authenticate, authorize('admin'), (req, res) => {
  const member = state.members.find((item) => item.id === req.params.memberId);
  if (!member) return res.status(404).json({ error: 'No se encontró el socio.' });
  const payments = state.payments
    .filter((payment) => payment.memberId === member.id)
    .sort((a, b) => String(b.paidAt).localeCompare(String(a.paidAt)))
    .slice(0, 24)
    .map((payment) => ({
      amount: payment.amount,
      coveredDueDate: payment.coveredDueDate,
      paidAt: payment.paidAt,
    }));
  return res.json({ payments });
});

app.post('/api/members/:memberId/payments', authenticate, authorize('admin'), async (req, res) => {
  const member = state.members.find((item) => item.id === req.params.memberId);
  if (!member) return res.status(404).json({ error: 'No se encontró el socio.' });
  if (!member.monthlyFee || !member.paymentDueDate || !isValidDateOnly(member.paymentDueDate)) {
    return res.status(409).json({ error: 'Configura primero la cuota mensual y su vencimiento.' });
  }
  const payment = {
    id: crypto.randomUUID(),
    memberId: member.id,
    amount: member.monthlyFee,
    coveredDueDate: member.paymentDueDate,
    paidAt: new Date().toISOString(),
    recordedBy: req.user.id,
  };
  state.payments.push(payment);
  member.lastPaymentAt = payment.paidAt;
  member.paymentDueDate = addOneMonthToDateOnly(member.paymentDueDate);
  await addAudit(req.user.id, 'record_membership_payment', {
    memberId: member.id,
    amount: payment.amount,
    coveredDueDate: payment.coveredDueDate,
  });
  return res.json({ payment: {
    amount: payment.amount,
    paidAt: payment.paidAt,
    paymentDueDate: member.paymentDueDate,
  } });
});

app.get('/api/admin/ai-settings', authenticate, authorize('admin'), (_req, res) => {
  res.json({
    provider: 'gemini',
    configured: Boolean(process.env.GEMINI_API_KEY || state.aiSettings?.encryptedApiKey),
    updatedAt: state.aiSettings?.updatedAt || null,
  });
});

app.put('/api/admin/ai-settings', authenticate, authorize('admin'), async (req, res) => {
  const apiKey = String(req.body?.apiKey || '').trim();
  if (apiKey.length < 20 || apiKey.length > 512) {
    return res.status(400).json({ error: 'Introduce una clave de Gemini válida.' });
  }
  state.aiSettings = { encryptedApiKey: encryptSecret(apiKey), updatedAt: new Date().toISOString() };
  await addAudit(req.user.id, 'configure_ai', { provider: 'gemini' });
  return res.json({ provider: 'gemini', configured: true });
});

app.post('/api/ai/routine-generation', authenticate, authorize('admin', 'monitor'), async (req, res) => {
  const encryptedApiKey = state.aiSettings?.encryptedApiKey;
  if (!process.env.GEMINI_API_KEY && !encryptedApiKey) {
    return res.status(409).json({ error: 'Un administrador debe configurar primero la clave de Gemini.' });
  }
  try {
    const apiKey = process.env.GEMINI_API_KEY || decryptSecret(encryptedApiKey);
    const plan = await generateGeminiRoutine({ apiKey, body: req.body });
    await addAudit(req.user.id, 'generate_ai_routine', { provider: 'gemini' });
    return res.json({ plan });
  } catch (error) {
    if (error instanceof GeminiRoutineError) return res.status(422).json({ error: error.message });
    return res.status(500).json({ error: 'No se pudo usar la configuración de Gemini. Vuelve a guardarla.' });
  }
});

app.get('/api/routine-templates', authenticate, authorize('admin', 'monitor'), (_req, res) => {
  res.json({ templates: state.routineTemplates });
});

app.post('/api/routine-templates', authenticate, authorize('admin', 'monitor'), async (req, res) => {
  const body = req.body || {};
  if (!body.id || !body.title || !body.routine || body.routine.id !== body.id) {
    return res.status(400).json({ error: 'La plantilla de rutina no es válida.' });
  }
  const existingTemplate = state.routineTemplates.find((item) => item.id === body.id);
  const template = {
    id: body.id, title: body.title, subtitle: body.subtitle || undefined,
    objective: body.objective, level: body.level,
    equipment: Array.isArray(body.equipment) ? body.equipment : [], routine: body.routine,
    createdAt: existingTemplate?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  state.routineTemplates = [template, ...state.routineTemplates.filter((item) => item.id !== template.id)];
  await writeState();
  return res.status(201).json({ template });
});

app.post('/api/members/:memberId/assign-routine', authenticate, authorize('admin', 'monitor'), async (req, res) => {
  const member = state.members.find((item) => item.id === req.params.memberId);
  const template = state.routineTemplates.find((item) => item.id === req.body?.templateId);
  if (!member?.userId || !template) return res.status(404).json({ error: 'No se encontró el socio o la plantilla.' });
  const routines = Array.isArray(state.routinesByUser[member.userId]) ? state.routinesByUser[member.userId] : [];
  state.routinesByUser[member.userId] = [...routines.filter((item) => item.id !== member.assignedRoutineId && item.id !== template.id), template.routine];
  member.assignedRoutineId = template.id;
  member.assignedRoutineTitle = template.title;
  await writeState();
  return res.json({ assignedRoutineId: template.id, assignedRoutineTitle: template.title });
});

app.get('/api/routines', authenticate, (req, res) => {
  const routines = state.routinesByUser[req.user.id];
  res.json({ routines: Array.isArray(routines) ? routines : [] });
});

app.put('/api/routines', authenticate, async (req, res) => {
  const routines = req.body?.routines;
  if (!Array.isArray(routines)) return res.status(400).json({ error: 'Las rutinas recibidas no son válidas.' });
  state.routinesByUser[req.user.id] = routines;
  await writeState();
  return res.json({ routines });
});

app.get('/api/workouts', authenticate, (req, res) => {
  const workouts = state.workouts
    .filter((workout) => workout.userId === req.user.id)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  res.json({ workouts });
});

app.post('/api/workouts', authenticate, async (req, res) => {
  const body = req.body || {};
  const clientId = typeof body.clientId === 'string' ? body.clientId.trim() : '';
  if (clientId.length > 200) return res.status(400).json({ error: 'Identificador de entrenamiento no válido.' });
  const existing = clientId && state.workouts.find((workout) => workout.userId === req.user.id && workout.clientId === clientId);
  if (existing) return res.json({ workout: existing });
  const name = String(body.name || '').trim();
  const startedAt = new Date(body.startedAt);
  if (!name || Number.isNaN(startedAt.getTime())) return res.status(400).json({ error: 'Entrenamiento no válido.' });

  const workout = {
    id: crypto.randomUUID(),
    userId: req.user.id,
    clientId: clientId || null,
    routineId: body.routineId || null,
    name,
    startedAt: startedAt.toISOString(),
    finishedAt: body.finishedAt ? new Date(body.finishedAt).toISOString() : null,
    durationSeconds: Math.max(0, Number(body.durationSeconds) || 0),
    totalKcal: Math.max(0, Number(body.totalKcal) || 0),
    totalVolumeKg: Math.max(0, Number(body.totalVolumeKg) || 0),
    exercises: Array.isArray(body.exercises) ? body.exercises : [],
  };
  state.workouts.push(workout);
  await writeState();
  return res.status(201).json({ workout });
});

const start = async () => {
  await readState();
  const created = await bootstrapAdmin();
  await syncLocalMembers();
  app.listen(port, host, () => {
    console.log(`PersonalGim API local escuchando en http://${host}:${port}`);
    if (created) console.log('Cuenta local inicial: admin@local.test / PIN 1234');
    if (!isWhatsAppConfigured()) console.info('Avisos de cuota por WhatsApp desactivados: falta la configuración de WhatsApp Cloud API.');
  });
  const reminderTimer = setInterval(() => void processLocalMembershipReminders(), 15 * 60 * 1000);
  reminderTimer.unref?.();
  void processLocalMembershipReminders();
};

start().catch((error) => {
  console.error('No se pudo iniciar PersonalGim API local:', error);
  process.exit(1);
});
