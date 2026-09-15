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

const app = express();
const port = Number(process.env.LOCAL_API_PORT || 8082);
const host = process.env.LOCAL_API_HOST || '127.0.0.1';
const jwtSecret = process.env.LOCAL_JWT_SECRET || 'personalgim-local-development-secret-2026';
const validRoles = new Set(['admin', 'monitor', 'user']);
const stateDir = path.resolve(__dirname, '..', '.local-data');
const stateFile = path.join(stateDir, 'state.json');

let state = { users: [], workouts: [], audit: [] };

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

const readState = async () => {
  await fs.mkdir(stateDir, { recursive: true });
  try {
    const raw = await fs.readFile(stateFile, 'utf8');
    const parsed = JSON.parse(raw);
    state = {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      workouts: Array.isArray(parsed.workouts) ? parsed.workouts : [],
      audit: Array.isArray(parsed.audit) ? parsed.audit : [],
    };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await writeState();
  }
};

const bootstrapAdmin = async () => {
  const email = (process.env.LOCAL_BOOTSTRAP_ADMIN_EMAIL || 'admin@local.test').trim().toLowerCase();
  const password = process.env.LOCAL_BOOTSTRAP_ADMIN_PASSWORD || 'LocalPersonalGim2026!';
  if (password.length < 12) throw new Error('LOCAL_BOOTSTRAP_ADMIN_PASSWORD debe tener al menos 12 caracteres.');
  if (state.users.some((user) => user.email === email)) return false;

  state.users.push({
    id: crypto.randomUUID(),
    email,
    fullName: 'Administrador local',
    passwordHash: await bcrypt.hash(password, 12),
    role: 'admin',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await writeState();
  return true;
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

app.use(cors({ origin: true }));
app.use(express.json({ limit: '128kb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok', environment: 'local' }));

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Introduce tu correo y contraseña.' });

  const user = state.users.find((candidate) => candidate.email === email);
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }
  await addAudit(user.id, 'login');
  return res.json({ token: createToken(user), user: publicUser(user) });
});

app.get('/api/auth/me', authenticate, (req, res) => res.json({ user: publicUser(req.user) }));

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
  if (state.users.some((user) => user.id !== req.user.id && user.email === nextEmail)) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
  }
  if (!(await bcrypt.compare(currentPassword, req.user.passwordHash))) {
    return res.status(401).json({ error: 'La contraseña actual no es correcta.' });
  }

  const previousEmail = req.user.email;
  req.user.email = nextEmail;
  if (nextPassword) req.user.passwordHash = await bcrypt.hash(nextPassword, 12);
  req.user.updatedAt = new Date().toISOString();
  await addAudit(req.user.id, 'update_account', {
    emailChanged: previousEmail !== nextEmail,
    passwordChanged: Boolean(nextPassword),
  });
  return res.json({ token: createToken(req.user), user: publicUser(req.user) });
});

app.get('/api/users', authenticate, authorize('admin'), (_req, res) => {
  res.json({ users: state.users.map(publicUser) });
});

app.post('/api/users', authenticate, authorize('admin'), async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const fullName = String(req.body?.fullName || '').trim();
  const password = String(req.body?.password || '');
  const role = String(req.body?.role || 'user');
  if (!email || !fullName || password.length < 12 || !validRoles.has(role)) {
    return res.status(400).json({ error: 'Datos de usuario no válidos.' });
  }
  if (state.users.some((user) => user.email === email)) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
  }

  const user = {
    id: crypto.randomUUID(),
    email,
    fullName,
    passwordHash: await bcrypt.hash(password, 12),
    role,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  state.users.push(user);
  await addAudit(req.user.id, 'create', { role });
  return res.status(201).json({ user: publicUser(user) });
});

// Member/routine data remains in the app's local SQLite store. These routes
// keep the API shape compatible with the production server when needed.
app.get('/api/members', authenticate, authorize('admin', 'monitor'), (_req, res) => {
  res.json({ members: [] });
});

app.get('/api/workouts', authenticate, (req, res) => {
  const workouts = state.workouts
    .filter((workout) => workout.userId === req.user.id)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 100);
  res.json({ workouts });
});

app.post('/api/workouts', authenticate, async (req, res) => {
  const body = req.body || {};
  const name = String(body.name || '').trim();
  const startedAt = new Date(body.startedAt);
  if (!name || Number.isNaN(startedAt.getTime())) return res.status(400).json({ error: 'Entrenamiento no válido.' });

  const workout = {
    id: crypto.randomUUID(),
    userId: req.user.id,
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
  app.listen(port, host, () => {
    console.log(`PersonalGim API local escuchando en http://${host}:${port}`);
    if (created) console.log('Cuenta local inicial: admin@local.test / LocalPersonalGim2026!');
  });
};

start().catch((error) => {
  console.error('No se pudo iniciar PersonalGim API local:', error);
  process.exit(1);
});
