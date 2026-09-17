const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const port = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET;
const validRoles = new Set(['admin', 'monitor', 'user']);
const PIN_PATTERN = /^\d{4}$/;

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres.');
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'personalgim',
  user: process.env.DB_USER || 'personalgim',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
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
      'SELECT id, email, full_name, password_hash, role, is_active FROM users WHERE id = $1',
      [payload.sub],
    );
    const user = rows[0];
    if (!user || !user.is_active) return res.status(401).json({ error: 'La cuenta no está disponible.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Tu sesión ha caducado. Inicia sesión otra vez.' });
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
    'SELECT id, email, full_name, password_hash, role, is_active FROM users WHERE email = $1',
    [email],
  );
  const user = rows[0];
  if (!user || !user.is_active || !(await bcrypt.compare(pin, user.password_hash))) {
    return res.status(401).json({ error: 'Correo o PIN incorrectos.' });
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

app.post('/api/users', authenticate, authorize('admin'), async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const fullName = String(req.body?.fullName || '').trim();
  const pin = String(req.body?.pin || '');
  const role = String(req.body?.role || 'user');
  if (!email || !fullName || !PIN_PATTERN.test(pin) || !validRoles.has(role)) {
    return res.status(400).json({ error: 'Indica un PIN de exactamente 4 dígitos.' });
  }

  try {
    const hash = await bcrypt.hash(pin, 12);
    const { rows } = await pool.query(
      'INSERT INTO users (email, full_name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role, is_active',
      [email, fullName, hash, role],
    );
    await writeAuditLog(req.user.id, 'create', 'user', rows[0].id, { role });
    res.status(201).json({ user: publicUser(rows[0]) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
    throw error;
  }
});

app.get('/api/members', authenticate, authorize('admin', 'monitor'), async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT m.id, m.membership_number, m.phone, m.objective, m.level, m.status,
            u.id AS user_id, u.full_name, u.email
       FROM gym_members m
       LEFT JOIN users u ON u.id = m.user_id
       ORDER BY u.full_name NULLS LAST, m.created_at DESC`,
  );
  res.json({ members: rows });
});

app.get('/api/workouts', authenticate, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM workout_sessions WHERE user_id = $1 ORDER BY started_at DESC LIMIT 100',
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
  const name = String(body.name || '').trim();
  const startedAt = new Date(body.startedAt);
  if (!name || Number.isNaN(startedAt.getTime())) return res.status(400).json({ error: 'Entrenamiento no válido.' });

  const { rows } = await pool.query(
    `INSERT INTO workout_sessions
      (user_id, routine_id, name, started_at, finished_at, duration_seconds, total_kcal, total_volume_kg, exercises)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      req.user.id,
      body.routineId || null,
      name,
      startedAt.toISOString(),
      body.finishedAt ? new Date(body.finishedAt).toISOString() : null,
      Math.max(0, Number(body.durationSeconds) || 0),
      Math.max(0, Number(body.totalKcal) || 0),
      Math.max(0, Number(body.totalVolumeKg) || 0),
      Array.isArray(body.exercises) ? body.exercises : [],
    ],
  );
  res.status(201).json({ workout: rows[0] });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

const start = async () => {
  await pool.query('SELECT 1');
  await runMigrations();
  await bootstrapAdmin();
  app.listen(port, () => console.log(`PersonalGim API escuchando en el puerto ${port}`));
};

start().catch((error) => {
  console.error('No se pudo iniciar PersonalGim API:', error);
  process.exit(1);
});
