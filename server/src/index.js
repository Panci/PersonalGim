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

const bootstrapAdmin = async () => {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn('No se ha creado administrador inicial: define BOOTSTRAP_ADMIN_EMAIL y BOOTSTRAP_ADMIN_PASSWORD.');
    return;
  }
  if (password.length < 12) throw new Error('BOOTSTRAP_ADMIN_PASSWORD debe tener al menos 12 caracteres.');

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rowCount) return;

  const hash = await bcrypt.hash(password, 12);
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
  const password = String(req.body?.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Introduce tu correo y contraseña.' });

  const { rows } = await pool.query(
    'SELECT id, email, full_name, password_hash, role, is_active FROM users WHERE email = $1',
    [email],
  );
  const user = rows[0];
  if (!user || !user.is_active || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }

  await writeAuditLog(user.id, 'login', 'user', user.id);
  res.json({ token: createToken(user), user: publicUser(user) });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.patch('/api/auth/account', authenticate, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '');
  const nextEmail = String(req.body?.email || '').trim().toLowerCase();
  const nextPassword = String(req.body?.newPassword || '');

  if (!currentPassword) return res.status(400).json({ error: 'Introduce tu contraseña actual.' });
  if (!nextEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
    return res.status(400).json({ error: 'Introduce un correo electrónico válido.' });
  }
  if (nextPassword && nextPassword.length < 12) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 12 caracteres.' });
  }

  const passwordMatches = await bcrypt.compare(currentPassword, req.user.password_hash);
  if (!passwordMatches) return res.status(401).json({ error: 'La contraseña actual no es correcta.' });

  try {
    const passwordHash = nextPassword ? await bcrypt.hash(nextPassword, 12) : null;
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
      passwordChanged: Boolean(nextPassword),
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
  const password = String(req.body?.password || '');
  const role = String(req.body?.role || 'user');
  if (!email || !fullName || password.length < 12 || !validRoles.has(role)) {
    return res.status(400).json({ error: 'Datos de usuario no válidos.' });
  }

  try {
    const hash = await bcrypt.hash(password, 12);
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
  await bootstrapAdmin();
  app.listen(port, () => console.log(`PersonalGim API escuchando en el puerto ${port}`));
};

start().catch((error) => {
  console.error('No se pudo iniciar PersonalGim API:', error);
  process.exit(1);
});
