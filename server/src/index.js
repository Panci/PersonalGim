const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const { Pool } = require('pg');
const { GeminiRoutineError, generateGeminiRoutine } = require('./gemini');
const { isWhatsAppConfigured, sendMembershipReminder } = require('./whatsapp');

const app = express();
const port = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET;
const validRoles = new Set(['admin', 'monitor', 'user']);
const PIN_PATTERN = /^\d{4}$/;
const validObjectives = new Set(['hipertrofia', 'fuerza', 'perdida_grasa', 'salud_general']);
const validLevels = new Set(['principiante', 'intermedio', 'avanzado']);
const validEquipment = new Set(['barra', 'mancuerna', 'maquina', 'polea', 'peso_corporal', 'cardio', 'otro']);
const billingTimeZone = process.env.BILLING_TIME_ZONE || 'Europe/Madrid';

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres.');
}

// A dedicated SETTINGS_ENCRYPTION_KEY is preferable in production. Deriving a
// key from JWT_SECRET keeps the first setup simple while still ensuring that a
// database dump alone cannot reveal the Gemini credential.
const settingsCipherKey = crypto.createHash('sha256')
  .update(process.env.SETTINGS_ENCRYPTION_KEY || jwtSecret, 'utf8')
  .digest();

const encryptSecret = (value) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', settingsCipherKey, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
};

const decryptSecret = (encryptedValue) => {
  const [ivValue, tagValue, ciphertextValue] = String(encryptedValue || '').split('.');
  if (!ivValue || !tagValue || !ciphertextValue) throw new Error('Credencial cifrada no válida.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', settingsCipherKey, Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
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

const formatDateForMember = (value) => {
  const [year, month, day] = String(value || '').slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : '';
};

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'personalgim',
  user: process.env.DB_USER || 'personalgim',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: true, ...(process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA } : {}) }
    : undefined,
});

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origen no permitido.'));
  },
}));
app.use(express.json({ limit: '128kb' }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos antes de probar otra vez.' },
});

const aiRoutineLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Has alcanzado el límite temporal de generación. Espera unos minutos.' },
});

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  fullName: user.full_name,
  role: user.role,
  isActive: user.is_active,
});

const createToken = (user) => jwt.sign(
  { email: user.email, role: user.role, name: user.full_name },
  jwtSecret,
  { subject: user.id, expiresIn: '12h', issuer: 'personalgim-api', audience: 'personalgim-app' },
);

const authenticate = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Inicia sesión para continuar.' });

  try {
    const payload = jwt.verify(token, jwtSecret, { issuer: 'personalgim-api', audience: 'personalgim-app' });
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.password_hash, u.role, u.is_active,
              (u.role = 'user' AND m.monthly_fee IS NOT NULL AND m.payment_due_date IS NOT NULL
                AND m.payment_due_date + 5 <= (NOW() AT TIME ZONE $2)::date) AS payment_blocked
         FROM users u LEFT JOIN gym_members m ON m.user_id = u.id
        WHERE u.id = $1`,
      [payload.sub, billingTimeZone],
    );
    const user = rows[0];
    if (!user || !user.is_active) return res.status(401).json({ error: 'La cuenta no está disponible.' });
    if (user.payment_blocked) return res.status(403).json({ error: 'Acceso suspendido por una cuota pendiente desde hace cinco días. Contacta con el gimnasio cuando hayas realizado el pago.' });
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Tu sesión ha caducado. Inicia sesión otra vez.' });
    }
    return next(error);
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'No tienes permiso para esta acción.' });
  next();
};

const writeAuditLog = async (actorUserId, action, targetType, targetId, metadata = {}) => {
  await pool.query(
    'INSERT INTO audit_log (actor_user_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
    [actorUserId, action, targetType, targetId, metadata],
  );
};

const runMigrations = async () => {
  // `001-init.sql` only runs when the PostgreSQL volume is first created.
  // Keep this migration here as well so existing deployments receive routine
  // persistence on their next API restart.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_routines (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      routines JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS client_id TEXT');
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS workout_sessions_user_client_idx ON workout_sessions (user_id, client_id) WHERE client_id IS NOT NULL');
  await pool.query(`
    ALTER TABLE gym_members
      ADD COLUMN IF NOT EXISTS assigned_routine_id TEXT,
      ADD COLUMN IF NOT EXISTS assigned_routine_title TEXT
  `);
  await pool.query(`
    ALTER TABLE gym_members
      ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC(10, 2),
      ADD COLUMN IF NOT EXISTS payment_due_date DATE,
      ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS whatsapp_reminders_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS whatsapp_consent_note TEXT,
      ADD COLUMN IF NOT EXISTS whatsapp_consent_recorded_at TIMESTAMPTZ
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS membership_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
      amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
      covered_due_date DATE NOT NULL,
      paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      recorded_by UUID REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS membership_payments_member_paid_idx ON membership_payments (member_id, paid_at DESC)');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS membership_reminders (
      member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
      covered_due_date DATE NOT NULL,
      reminder_type TEXT NOT NULL DEFAULT 'before_due' CHECK (reminder_type = 'before_due'),
      attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 3),
      next_attempt_at TIMESTAMPTZ,
      last_error TEXT,
      provider_message_id TEXT,
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (member_id, covered_due_date, reminder_type)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS routine_templates (
      id TEXT PRIMARY KEY,
      created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      title TEXT NOT NULL,
      subtitle TEXT,
      objective TEXT NOT NULL CHECK (objective IN ('hipertrofia', 'fuerza', 'perdida_grasa', 'salud_general')),
      level TEXT NOT NULL CHECK (level IN ('principiante', 'intermedio', 'avanzado')),
      equipment JSONB NOT NULL DEFAULT '[]'::jsonb,
      routine JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS routine_templates_goal_level_idx ON routine_templates (objective, level)');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_provider_settings (
      id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
      provider TEXT NOT NULL DEFAULT 'gemini' CHECK (provider = 'gemini'),
      encrypted_api_key TEXT NOT NULL,
      updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  // Existing user accounts become manageable gym members without changing
  // their credentials or profile. The deterministic membership number avoids
  // duplicates on later API restarts.
  await pool.query(`
    INSERT INTO gym_members (user_id, membership_number, objective, level, status)
    SELECT id, 'SOC-' || UPPER(SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 8)), 'salud_general', 'principiante', 'activo'
      FROM users
     WHERE role = 'user'
    ON CONFLICT (user_id) DO NOTHING
  `);
};

const isRoutineDocument = (routines) => Array.isArray(routines)
  && routines.length <= 100
  && routines.every((routine) => (
    routine
    && typeof routine.id === 'string'
    && routine.id.length <= 160
    && typeof routine.title === 'string'
    && routine.title.length > 0
    && routine.title.length <= 160
    && Array.isArray(routine.days)
    && routine.days.length <= 31
  ));

const bootstrapAdmin = async () => {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const pin = process.env.BOOTSTRAP_ADMIN_PIN;
  if (!email || !pin) {
    console.warn('No se ha creado administrador inicial: define BOOTSTRAP_ADMIN_EMAIL y BOOTSTRAP_ADMIN_PIN.');
    return;
  }
  if (!PIN_PATTERN.test(pin)) throw new Error('BOOTSTRAP_ADMIN_PIN debe tener exactamente 4 dígitos.');

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rowCount) return;

  const hash = await bcrypt.hash(pin, 12);
  await pool.query(
    'INSERT INTO users (email, full_name, password_hash, role) VALUES ($1, $2, $3, $4)',
    [email, 'Administrador', hash, 'admin'],
  );
  console.info(`Administrador inicial creado para ${email}.`);
};

app.get('/health', async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok' });
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const pin = String(req.body?.pin || '');
  if (!email || !PIN_PATTERN.test(pin)) return res.status(400).json({ error: 'Introduce un PIN de exactamente 4 dígitos.' });

  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.password_hash, u.role, u.is_active,
            (u.role = 'user' AND m.monthly_fee IS NOT NULL AND m.payment_due_date IS NOT NULL
              AND m.payment_due_date + 5 <= (NOW() AT TIME ZONE $2)::date) AS payment_blocked
       FROM users u LEFT JOIN gym_members m ON m.user_id = u.id
      WHERE u.email = $1`,
    [email, billingTimeZone],
  );
  const user = rows[0];
  if (!user || !user.is_active || !(await bcrypt.compare(pin, user.password_hash))) {
    return res.status(401).json({ error: 'Correo o PIN incorrectos.' });
  }
  if (user.payment_blocked) {
    return res.status(403).json({ error: 'Acceso suspendido por una cuota pendiente desde hace cinco días. Contacta con el gimnasio cuando hayas realizado el pago.' });
  }

  await writeAuditLog(user.id, 'login', 'user', user.id);
  res.json({ token: createToken(user), user: publicUser(user) });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

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

  const pinMatches = await bcrypt.compare(currentPin, req.user.password_hash);
  if (!pinMatches) return res.status(401).json({ error: 'El PIN actual no es correcto.' });

  try {
    const passwordHash = nextPin ? await bcrypt.hash(nextPin, 12) : null;
    const { rows } = await pool.query(
      `UPDATE users
          SET email = $1,
              password_hash = COALESCE($2, password_hash),
              updated_at = NOW()
        WHERE id = $3
        RETURNING id, email, full_name, role, is_active`,
      [nextEmail, passwordHash, req.user.id],
    );
    const updatedUser = rows[0];
    await writeAuditLog(req.user.id, 'update_account', 'user', req.user.id, {
      emailChanged: nextEmail !== req.user.email,
      pinChanged: Boolean(nextPin),
    });
    res.json({ token: createToken(updatedUser), user: publicUser(updatedUser) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
    throw error;
  }
});

app.get('/api/users', authenticate, authorize('admin'), async (_req, res) => {
  const { rows } = await pool.query(
    'SELECT id, email, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC',
  );
  res.json({ users: rows.map(publicUser) });
});

// Only status is returned: API credentials must never be readable from a
// browser or a mobile application, even by an administrator.
app.get('/api/admin/ai-settings', authenticate, authorize('admin'), async (_req, res) => {
  const { rows } = await pool.query(
    'SELECT provider, updated_at FROM ai_provider_settings WHERE id = TRUE',
  );
  const settings = rows[0];
  res.json({
    provider: 'gemini',
    configured: Boolean(settings),
    updatedAt: settings?.updated_at || null,
  });
});

app.put('/api/admin/ai-settings', authenticate, authorize('admin'), async (req, res) => {
  const apiKey = String(req.body?.apiKey || '').trim();
  if (apiKey.length < 20 || apiKey.length > 512) {
    return res.status(400).json({ error: 'Introduce una clave de Gemini válida.' });
  }

  await pool.query(
    `INSERT INTO ai_provider_settings (id, provider, encrypted_api_key, updated_by, updated_at)
     VALUES (TRUE, 'gemini', $1, $2, NOW())
     ON CONFLICT (id) DO UPDATE
       SET encrypted_api_key = EXCLUDED.encrypted_api_key,
           updated_by = EXCLUDED.updated_by,
           updated_at = NOW()`,
    [encryptSecret(apiKey), req.user.id],
  );
  await writeAuditLog(req.user.id, 'configure', 'ai_provider', 'gemini', { provider: 'gemini' });
  res.json({ provider: 'gemini', configured: true });
});

app.post('/api/ai/routine-generation', authenticate, authorize('admin', 'monitor'), aiRoutineLimiter, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT encrypted_api_key FROM ai_provider_settings WHERE id = TRUE AND provider = $1',
    ['gemini'],
  );
  if (!rows[0]?.encrypted_api_key) {
    return res.status(409).json({ error: 'Un administrador debe configurar primero la clave de Gemini.' });
  }
  try {
    const plan = await generateGeminiRoutine({ apiKey: decryptSecret(rows[0].encrypted_api_key), body: req.body });
    await writeAuditLog(req.user.id, 'generate', 'routine_template', null, { provider: 'gemini' });
    res.json({ plan });
  } catch (error) {
    if (error instanceof GeminiRoutineError) return res.status(422).json({ error: error.message });
    console.error('No se pudo descifrar o usar la configuración de Gemini:', error.message);
    return res.status(500).json({ error: 'No se pudo usar la configuración de Gemini. Vuelve a guardarla.' });
  }
});

app.post('/api/users', authenticate, authorize('admin'), async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const fullName = String(req.body?.fullName || '').trim();
  const pin = String(req.body?.pin || '');
  const role = String(req.body?.role || 'user');
  const memberProfile = req.body?.memberProfile || {};
  if (!email || !fullName || !PIN_PATTERN.test(pin) || !validRoles.has(role)) {
    return res.status(400).json({ error: 'Indica un PIN de exactamente 4 dígitos.' });
  }

  try {
    const hash = await bcrypt.hash(pin, 12);
    const { rows } = await pool.query(
      'INSERT INTO users (email, full_name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role, is_active',
      [email, fullName, hash, role],
    );
    if (role === 'user') {
      const objective = validObjectives.has(String(memberProfile.objective)) ? String(memberProfile.objective) : 'salud_general';
      const level = validLevels.has(String(memberProfile.level)) ? String(memberProfile.level) : 'principiante';
      const phone = String(memberProfile.phone || '').trim() || null;
      await pool.query(
        `INSERT INTO gym_members (user_id, membership_number, phone, objective, level, status)
         VALUES ($1, $2, $3, $4, $5, 'activo')`,
        [rows[0].id, `SOC-${rows[0].id.replaceAll('-', '').slice(0, 8).toUpperCase()}`, phone, objective, level],
      );
    }
    await writeAuditLog(req.user.id, 'create', 'user', rows[0].id, { role });
    res.status(201).json({ user: publicUser(rows[0]) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
    throw error;
  }
});

app.get('/api/members', authenticate, authorize('admin', 'monitor'), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT m.id, m.membership_number, m.phone, m.objective, m.level, m.status,
            m.monthly_fee, m.payment_due_date::text, m.last_payment_at,
            m.whatsapp_reminders_enabled, m.whatsapp_consent_note, m.whatsapp_consent_recorded_at,
            (m.monthly_fee IS NOT NULL AND m.payment_due_date IS NOT NULL
              AND m.payment_due_date + 5 <= (NOW() AT TIME ZONE $1)::date) AS payment_blocked,
            m.assigned_routine_id, m.assigned_routine_title,
            u.id AS user_id, u.full_name, u.email,
            COUNT(w.id)::INTEGER AS completed_workouts_count
       FROM gym_members m
       LEFT JOIN users u ON u.id = m.user_id
       LEFT JOIN workout_sessions w ON w.user_id = m.user_id AND w.finished_at IS NOT NULL
      GROUP BY m.id, u.id
      ORDER BY u.full_name NULLS LAST, m.created_at DESC`,
    [billingTimeZone],
  );
  res.json({ members: rows.map((member) => ({
    id: member.id,
    userId: member.user_id || undefined,
    membershipNumber: member.membership_number || `SOC-${member.id.slice(0, 8).toUpperCase()}`,
    phone: member.phone || undefined,
    objective: member.objective || 'salud_general',
    level: member.level || 'principiante',
    status: member.status,
    assignedRoutineId: member.assigned_routine_id || undefined,
    assignedRoutineTitle: member.assigned_routine_title || undefined,
    fullName: member.full_name || 'Socio sin nombre',
    email: member.email || '',
    completedWorkoutsCount: member.completed_workouts_count || 0,
    monthlyFee: member.monthly_fee === null ? undefined : Number(member.monthly_fee),
    paymentDueDate: member.payment_due_date || undefined,
    lastPaymentAt: member.last_payment_at || undefined,
    whatsappRemindersEnabled: member.whatsapp_reminders_enabled === true,
    whatsappConsentNote: req.user.role === 'admin' ? member.whatsapp_consent_note || undefined : undefined,
    whatsappConsentRecordedAt: req.user.role === 'admin' ? member.whatsapp_consent_recorded_at || undefined : undefined,
    paymentBlocked: member.payment_blocked === true,
    enrollmentDate: new Date().toISOString(),
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
  const memberId = String(req.params.memberId || '').trim();
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
  if (!validObjectives.has(objective) || !validLevels.has(level)) {
    return res.status(400).json({ error: 'El objetivo o nivel de entrenamiento no es válido.' });
  }
  if (newPin && !PIN_PATTERN.test(newPin)) {
    return res.status(400).json({ error: 'El nuevo PIN debe tener exactamente 4 dígitos.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const memberResult = await client.query(
      'SELECT m.id, m.user_id, u.id AS linked_user_id, u.role, u.email, u.full_name '
        + 'FROM gym_members m LEFT JOIN users u ON u.id = m.user_id '
        + 'WHERE m.id = $1 FOR UPDATE OF m',
      [memberId],
    );
    const member = memberResult.rows[0];
    if (!member) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No se encontró el socio.' });
    }
    if (!member.linked_user_id || member.role !== 'user') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Este socio no tiene una cuenta de Usuario asociada.' });
    }

    const passwordHash = newPin ? await bcrypt.hash(newPin, 12) : null;
    await client.query(
      'UPDATE users SET full_name = $1, email = $2, '
        + 'password_hash = COALESCE($3, password_hash), updated_at = NOW() WHERE id = $4',
      [fullName, email, passwordHash, member.linked_user_id],
    );
    await client.query(
      'UPDATE gym_members SET whatsapp_reminders_enabled = CASE WHEN phone IS DISTINCT FROM $1 '
        + 'THEN FALSE ELSE whatsapp_reminders_enabled END, '
        + 'phone = $1, objective = $2, level = $3, updated_at = NOW() WHERE id = $4',
      [phone || null, objective, level, memberId],
    );
    await client.query(
      'INSERT INTO audit_log (actor_user_id, action, target_type, target_id, metadata) '
        + 'VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'update', 'member', memberId, {
        emailChanged: email !== member.email,
        fullNameChanged: fullName !== member.full_name,
        pinChanged: Boolean(newPin),
      }],
    );
    await client.query('COMMIT');
    return res.json({ ok: true });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    if (error.code === '23505') return res.status(409).json({ error: 'Ya existe una cuenta con ese correo electrónico.' });
    throw error;
  } finally {
    client.release();
  }
});

app.patch('/api/members/:memberId/membership', authenticate, authorize('admin'), async (req, res) => {
  const memberId = String(req.params.memberId || '').trim();
  const monthlyFee = Number(req.body?.monthlyFee);
  const normalizedMonthlyFee = Math.round(monthlyFee * 100) / 100;
  const paymentDueDate = String(req.body?.paymentDueDate || '').trim();
  const whatsappRemindersEnabled = req.body?.whatsappRemindersEnabled === true;
  const whatsappConsentNote = String(req.body?.whatsappConsentNote || '').trim();
  const parsedDueDate = new Date(paymentDueDate + 'T00:00:00.000Z');
  if (!Number.isFinite(monthlyFee) || normalizedMonthlyFee < 0.01 || normalizedMonthlyFee > 10000) {
    return res.status(400).json({ error: 'Introduce una cuota mensual válida (entre 0,01 € y 10.000 €).' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDueDate)
    || Number.isNaN(parsedDueDate.getTime())
    || parsedDueDate.toISOString().slice(0, 10) !== paymentDueDate) {
    return res.status(400).json({ error: 'Introduce una fecha de vencimiento válida.' });
  }
  if (whatsappRemindersEnabled) {
    if (whatsappConsentNote.length < 5 || whatsappConsentNote.length > 200) {
      return res.status(400).json({ error: 'Indica cómo y cuándo autorizó el socio los avisos por WhatsApp (5 a 200 caracteres).' });
    }
    const phoneResult = await pool.query('SELECT phone FROM gym_members WHERE id = $1', [memberId]);
    if (!phoneResult.rowCount) return res.status(404).json({ error: 'No se encontró el socio.' });
    if (!String(phoneResult.rows[0].phone || '').trim()) {
      return res.status(409).json({ error: 'Añade un teléfono al socio antes de activar sus avisos.' });
    }
  }
  const result = await pool.query(
    'UPDATE gym_members SET monthly_fee = $1, payment_due_date = $2, whatsapp_reminders_enabled = $3, '
      + 'whatsapp_consent_note = CASE WHEN $3 THEN $4 ELSE whatsapp_consent_note END, '
      + 'whatsapp_consent_recorded_at = CASE WHEN $3 AND (whatsapp_reminders_enabled IS FALSE OR whatsapp_consent_note IS DISTINCT FROM $4) '
      + 'THEN NOW() ELSE whatsapp_consent_recorded_at END, updated_at = NOW() WHERE id = $5',
    [normalizedMonthlyFee, paymentDueDate, whatsappRemindersEnabled, whatsappConsentNote, memberId],
  );
  if (!result.rowCount) return res.status(404).json({ error: 'No se encontró el socio.' });
  await writeAuditLog(req.user.id, 'update_membership', 'member', memberId, {
    monthlyFee: normalizedMonthlyFee,
    paymentDueDate,
    whatsappRemindersEnabled,
    consentEvidenceRecorded: whatsappRemindersEnabled && Boolean(whatsappConsentNote),
  });
  return res.json({ ok: true });
});

app.get('/api/members/:memberId/payments', authenticate, authorize('admin'), async (req, res) => {
  const memberId = String(req.params.memberId || '').trim();
  const memberResult = await pool.query('SELECT id FROM gym_members WHERE id = $1', [memberId]);
  if (!memberResult.rowCount) return res.status(404).json({ error: 'No se encontró el socio.' });
  const { rows } = await pool.query(
    'SELECT amount, covered_due_date::text AS covered_due_date, paid_at '
      + 'FROM membership_payments WHERE member_id = $1 ORDER BY paid_at DESC LIMIT 24',
    [memberId],
  );
  return res.json({ payments: rows.map((payment) => ({
    amount: Number(payment.amount),
    coveredDueDate: payment.covered_due_date,
    paidAt: payment.paid_at,
  })) });
});

app.post('/api/members/:memberId/payments', authenticate, authorize('admin'), async (req, res) => {
  const memberId = String(req.params.memberId || '').trim();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const memberResult = await client.query(
      'SELECT monthly_fee, payment_due_date::text FROM gym_members WHERE id = $1 FOR UPDATE',
      [memberId],
    );
    const member = memberResult.rows[0];
    if (!member) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No se encontró el socio.' });
    }
    if (!member.monthly_fee || !member.payment_due_date) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Configura primero la cuota mensual y su vencimiento.' });
    }
    const paymentResult = await client.query(
      'INSERT INTO membership_payments (member_id, amount, covered_due_date, recorded_by) '
        + 'VALUES ($1, $2, $3, $4) RETURNING paid_at',
      [memberId, member.monthly_fee, member.payment_due_date, req.user.id],
    );
    const updatedResult = await client.query(
      "UPDATE gym_members SET last_payment_at = NOW(), payment_due_date = (payment_due_date + INTERVAL '1 month')::date, updated_at = NOW() "
        + 'WHERE id = $1 RETURNING payment_due_date::text',
      [memberId],
    );
    await client.query(
      'INSERT INTO audit_log (actor_user_id, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'record_membership_payment', 'member', memberId, {
        amount: Number(member.monthly_fee),
        coveredDueDate: member.payment_due_date,
      }],
    );
    await client.query('COMMIT');
    return res.json({ payment: {
      amount: Number(member.monthly_fee),
      paidAt: paymentResult.rows[0].paid_at,
      paymentDueDate: updatedResult.rows[0].payment_due_date,
    } });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
});

app.get('/api/routine-templates', authenticate, authorize('admin', 'monitor'), async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, title, subtitle, objective, level, equipment, routine, created_at, updated_at
       FROM routine_templates
      ORDER BY updated_at DESC`,
  );
  res.json({ templates: rows.map((template) => ({
    id: template.id,
    title: template.title,
    subtitle: template.subtitle || undefined,
    objective: template.objective,
    level: template.level,
    equipment: Array.isArray(template.equipment) ? template.equipment : [],
    routine: template.routine,
    createdAt: template.created_at,
    updatedAt: template.updated_at,
  })) });
});

app.post('/api/routine-templates', authenticate, authorize('admin', 'monitor'), async (req, res) => {
  const body = req.body || {};
  const id = String(body.id || '').trim();
  const title = String(body.title || '').trim();
  const subtitle = String(body.subtitle || '').trim();
  const objective = String(body.objective || '');
  const level = String(body.level || '');
  const equipment = Array.isArray(body.equipment) ? [...new Set(body.equipment.map(String))] : [];
  const routine = body.routine;
  if (!id || id.length > 160 || !title || title.length > 160 || !validObjectives.has(objective)
    || !validLevels.has(level) || !equipment.every((item) => validEquipment.has(item))
    || !isRoutineDocument([routine]) || routine.id !== id) {
    return res.status(400).json({ error: 'La plantilla de rutina no es válida.' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO routine_templates (id, created_by, title, subtitle, objective, level, equipment, routine)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         subtitle = EXCLUDED.subtitle,
         objective = EXCLUDED.objective,
         level = EXCLUDED.level,
         equipment = EXCLUDED.equipment,
         routine = EXCLUDED.routine,
         updated_at = NOW()
       RETURNING id, title, subtitle, objective, level, equipment, routine, created_at, updated_at`,
      [id, req.user.id, title, subtitle || null, objective, level, JSON.stringify(equipment), JSON.stringify(routine)],
    );
    const template = rows[0];
    await writeAuditLog(req.user.id, 'upsert', 'routine_template', id, { objective, level });
    res.json({ template: {
      id: template.id, title: template.title, subtitle: template.subtitle || undefined,
      objective: template.objective, level: template.level,
      equipment: Array.isArray(template.equipment) ? template.equipment : [], routine: template.routine,
      createdAt: template.created_at, updatedAt: template.updated_at,
    } });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Ya existe una plantilla con ese identificador.' });
    throw error;
  }
});

app.post('/api/members/:memberId/assign-routine', authenticate, authorize('admin', 'monitor'), async (req, res) => {
  const memberId = String(req.params.memberId || '');
  const templateId = String(req.body?.templateId || '');
  const memberResult = await pool.query(
    'SELECT id, user_id, assigned_routine_id FROM gym_members WHERE id = $1',
    [memberId],
  );
  const member = memberResult.rows[0];
  if (!member?.user_id) return res.status(404).json({ error: 'No se encontró una cuenta de usuario para este socio.' });
  const templateResult = await pool.query(
    'SELECT id, title, routine FROM routine_templates WHERE id = $1',
    [templateId],
  );
  const template = templateResult.rows[0];
  if (!template) return res.status(404).json({ error: 'No se encontró la plantilla seleccionada.' });

  const existing = await pool.query('SELECT routines FROM user_routines WHERE user_id = $1', [member.user_id]);
  const routines = Array.isArray(existing.rows[0]?.routines) ? existing.rows[0].routines : [];
  const nextRoutines = [...routines.filter((routine) => routine.id !== member.assigned_routine_id && routine.id !== template.id), template.routine];
  await pool.query(
    `INSERT INTO user_routines (user_id, routines, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (user_id) DO UPDATE SET routines = EXCLUDED.routines, updated_at = NOW()`,
    [member.user_id, JSON.stringify(nextRoutines)],
  );
  await pool.query(
    'UPDATE gym_members SET assigned_routine_id = $1, assigned_routine_title = $2, updated_at = NOW() WHERE id = $3',
    [template.id, template.title, member.id],
  );
  await writeAuditLog(req.user.id, 'assign', 'routine_template', template.id, { memberId: member.id });
  res.json({ assignedRoutineId: template.id, assignedRoutineTitle: template.title });
});

app.get('/api/workouts', authenticate, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM workout_sessions WHERE user_id = $1 ORDER BY started_at DESC',
    [req.user.id],
  );
  res.json({ workouts: rows });
});

app.get('/api/routines', authenticate, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT routines FROM user_routines WHERE user_id = $1',
    [req.user.id],
  );
  res.json({ routines: Array.isArray(rows[0]?.routines) ? rows[0].routines : [] });
});

app.put('/api/routines', authenticate, async (req, res) => {
  const routines = req.body?.routines;
  if (!isRoutineDocument(routines)) {
    return res.status(400).json({ error: 'Las rutinas recibidas no son válidas.' });
  }

  await pool.query(
    `INSERT INTO user_routines (user_id, routines, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET routines = EXCLUDED.routines, updated_at = NOW()`,
    [req.user.id, JSON.stringify(routines)],
  );
  res.json({ routines });
});

app.post('/api/workouts', authenticate, async (req, res) => {
  const body = req.body || {};
  const clientId = typeof body.clientId === 'string' ? body.clientId.trim() : '';
  if (clientId.length > 200) return res.status(400).json({ error: 'Identificador de entrenamiento no válido.' });
  const name = String(body.name || '').trim();
  const startedAt = new Date(body.startedAt);
  if (!name || Number.isNaN(startedAt.getTime())) return res.status(400).json({ error: 'Entrenamiento no válido.' });

  const { rows } = await pool.query(
    `INSERT INTO workout_sessions
      (user_id, client_id, routine_id, name, started_at, finished_at, duration_seconds, total_kcal, total_volume_kg, exercises)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
     ON CONFLICT (user_id, client_id) WHERE client_id IS NOT NULL DO NOTHING
     RETURNING *`,
    [
      req.user.id,
      clientId || null,
      body.routineId || null,
      name,
      startedAt.toISOString(),
      body.finishedAt ? new Date(body.finishedAt).toISOString() : null,
      Math.max(0, Number(body.durationSeconds) || 0),
      Math.max(0, Number(body.totalKcal) || 0),
      Math.max(0, Number(body.totalVolumeKg) || 0),
      // node-postgres encodes JS arrays as PostgreSQL arrays, not JSON.
      // Serialize explicitly so JSONB receives the complete exercise logs.
      JSON.stringify(Array.isArray(body.exercises) ? body.exercises : []),
    ],
  );
  if (rows[0]) return res.status(201).json({ workout: rows[0] });
  const existing = await pool.query(
    'SELECT * FROM workout_sessions WHERE user_id = $1 AND client_id = $2',
    [req.user.id, clientId],
  );
  res.json({ workout: existing.rows[0] });
});

const processMembershipReminders = async () => {
  if (!isWhatsAppConfigured()) return;
  const dueDate = addDaysToDateOnly(dateInBillingTimeZone(), 2);
  const client = await pool.connect();
  let hasAdvisoryLock = false;
  try {
    const lockResult = await client.query('SELECT pg_try_advisory_lock(1279701098, 2) AS locked');
    hasAdvisoryLock = lockResult.rows[0]?.locked === true;
    if (!hasAdvisoryLock) return;

    const { rows } = await client.query(
      "SELECT m.id, m.phone, m.monthly_fee, m.payment_due_date::text AS due_date, COALESCE(u.full_name, 'socio') AS full_name "
        + 'FROM gym_members m LEFT JOIN users u ON u.id = m.user_id '
        + 'WHERE m.whatsapp_reminders_enabled IS TRUE AND m.whatsapp_consent_recorded_at IS NOT NULL '
        + 'AND NULLIF(BTRIM(m.whatsapp_consent_note), $1) IS NOT NULL '
        + 'AND m.phone IS NOT NULL AND m.phone <> $1 AND u.is_active IS TRUE '
        + "AND m.payment_due_date = $2::date AND m.monthly_fee IS NOT NULL AND m.status = 'activo'",
      ['', dueDate],
    );

    for (const member of rows) {
      try {
        await client.query('BEGIN');
        const currentResult = await client.query(
          'SELECT phone, monthly_fee, payment_due_date::text AS due_date, whatsapp_reminders_enabled, '
            + 'whatsapp_consent_note, whatsapp_consent_recorded_at, status, full_name, users.is_active '
            + 'FROM gym_members LEFT JOIN users ON users.id = gym_members.user_id '
            + 'WHERE gym_members.id = $1 FOR UPDATE OF gym_members',
          [member.id],
        );
        const currentMember = currentResult.rows[0];
        if (!currentMember
          || currentMember.due_date !== member.due_date
          || currentMember.whatsapp_reminders_enabled !== true
          || !String(currentMember.whatsapp_consent_note || '').trim()
          || !currentMember.whatsapp_consent_recorded_at
          || !String(currentMember.phone || '').trim()
          || currentMember.is_active !== true
          || currentMember.status !== 'activo') {
          await client.query('ROLLBACK');
          continue;
        }

        const attemptResult = await client.query(
          `INSERT INTO membership_reminders
             (member_id, covered_due_date, reminder_type, attempt_count, next_attempt_at)
           VALUES ($1, $2::date, 'before_due', 1, NOW() + INTERVAL '15 minutes')
           ON CONFLICT (member_id, covered_due_date, reminder_type) DO UPDATE
             SET attempt_count = membership_reminders.attempt_count + 1,
                 next_attempt_at = NOW() + INTERVAL '15 minutes',
                 last_error = NULL
           WHERE membership_reminders.sent_at IS NULL
             AND membership_reminders.attempt_count < 3
             AND (membership_reminders.next_attempt_at IS NULL OR membership_reminders.next_attempt_at <= NOW())
           RETURNING attempt_count`,
          [member.id, member.due_date],
        );
        if (!attemptResult.rowCount) {
          await client.query('ROLLBACK');
          continue;
        }

        try {
          const providerMessageId = await sendMembershipReminder({
            phone: currentMember.phone,
            fullName: currentMember.full_name || 'socio',
            monthlyFee: Number(currentMember.monthly_fee),
            dueDate: formatDateForMember(currentMember.due_date),
          });
          await client.query(
            'UPDATE membership_reminders SET sent_at = NOW(), provider_message_id = $3, next_attempt_at = NULL, last_error = NULL '
              + 'WHERE member_id = $1 AND covered_due_date = $2::date AND reminder_type = $4',
            [member.id, member.due_date, providerMessageId, 'before_due'],
          );
          await client.query('COMMIT');
        } catch (error) {
          const message = String(error instanceof Error ? error.message : 'Error de envío').slice(0, 500);
          await client.query(
            'UPDATE membership_reminders '
              + 'SET last_error = $3, next_attempt_at = CASE WHEN attempt_count < 3 THEN NOW() + INTERVAL \'15 minutes\' ELSE NULL END '
              + 'WHERE member_id = $1 AND covered_due_date = $2::date AND reminder_type = $4',
            [member.id, member.due_date, message, 'before_due'],
          );
          await client.query('COMMIT');
          console.warn(`No se pudo enviar recordatorio de cuota al socio ${member.id}: ${message}`);
        }
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        console.error(`No se pudo procesar el recordatorio del socio ${member.id}:`, error);
      }
    }
  } catch (error) {
    console.error('No se pudieron procesar los recordatorios de cuotas:', error);
  } finally {
    if (hasAdvisoryLock) await client.query('SELECT pg_advisory_unlock(1279701098, 2)').catch(() => undefined);
    client.release();
  }
};

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

const start = async () => {
  await pool.query('SELECT 1');
  await runMigrations();
  await bootstrapAdmin();
  if (!isWhatsAppConfigured()) {
    console.info('Avisos de cuota por WhatsApp desactivados: falta configurar WhatsApp Cloud API y su plantilla.');
  }
  app.listen(port, () => console.log(`PersonalGim API escuchando en el puerto ${port}`));
  const reminderTimer = setInterval(() => void processMembershipReminders(), 15 * 60 * 1000);
  reminderTimer.unref?.();
  void processMembershipReminders();
};

start().catch((error) => {
  console.error('No se pudo iniciar PersonalGim API:', error);
  process.exit(1);
});
