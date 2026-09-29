const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');

const freePort = () => new Promise((resolve, reject) => {
  const socket = net.createServer();
  socket.once('error', reject);
  socket.listen(0, '127.0.0.1', () => {
    const { port } = socket.address();
    socket.close(() => resolve(port));
  });
});

test('completed workouts survive retrieval and duplicate uploads', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'personalgim-workouts-'));
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, [path.resolve(__dirname, '../src/local-dev.js')], {
    env: { ...process.env, LOCAL_DATA_DIR: dataDir, LOCAL_API_PORT: String(port) },
    stdio: 'ignore',
  });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      try {
        const response = await fetch(`${origin}/health`);
        if (response.ok) { ready = true; break; }
      } catch { /* Still starting. */ }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(ready, 'local API did not start');

    const login = await fetch(`${origin}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@local.test', pin: '1234' }),
    });
    assert.equal(login.status, 200);
    const { token } = await login.json();
    const workout = {
      clientId: 'workout-test-1', name: 'Sesión de prueba',
      startedAt: '2026-09-28T10:00:00.000Z', finishedAt: '2026-09-28T10:30:00.000Z',
      durationSeconds: 1800, totalKcal: 200, totalVolumeKg: 300,
      exercises: [{ id: 'exercise-log-1', exerciseId: 'press', exerciseName: 'Press', primaryMuscle: 'pectoral', sets: [] }],
    };
    const send = () => fetch(`${origin}/api/workouts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(workout),
    });
    assert.equal((await send()).status, 201);
    assert.equal((await send()).status, 200);
    const history = await fetch(`${origin}/api/workouts`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(history.status, 200);
    const { workouts } = await history.json();
    assert.equal(workouts.length, 1);
    assert.equal(workouts[0].clientId, workout.clientId);
    assert.deepEqual(workouts[0].exercises, workout.exercises);
  } finally {
    server.kill();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
