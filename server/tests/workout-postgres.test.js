const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

// Exercise the production HTTP routes and the real pg parameter encoder.
// The development JSON-file API does not reproduce JSONB serialization bugs.
test('production workouts encode exercise logs as JSONB and keep retries/account history separate', async () => {
  const entry = path.resolve(__dirname, '../src/index.js');
  const serverRequire = createRequire(entry);
  const { prepareValue } = serverRequire('pg/lib/utils');
  const jwt = serverRequire('jsonwebtoken');
  const secret = 'isolated-workout-test-secret-at-least-32-characters';
  const saved = [];
  class TestPool {
    async query(sql, values) {
      if (sql.includes('FROM users u LEFT JOIN gym_members')) {
        return { rows: [{ id: values[0], role: 'user', is_active: true, payment_blocked: false }] };
      }
      if (sql.includes('INSERT INTO workout_sessions')) {
        const exercises = JSON.parse(prepareValue(values[9]));
        assert.ok(Array.isArray(exercises), 'JSONB must contain an array, including empty logs');
        if (saved.some((item) => item.user_id === values[0] && item.client_id === values[1])) return { rows: [] };
        const row = { id: `server-${saved.length}`, user_id: values[0], client_id: values[1],
          routine_id: values[2], name: values[3], started_at: values[4], finished_at: values[5],
          duration_seconds: values[6], total_kcal: values[7], total_volume_kg: values[8], exercises };
        saved.push(row);
        return { rows: [row] };
      }
      if (sql.includes('FROM workout_sessions')) return { rows: saved.filter((item) =>
        item.user_id === values[0] && (values.length < 2 || item.client_id === values[1])) };
      throw new Error(`Unexpected test query: ${sql}`);
    }
  }
  const scope = { exports: {} };
  const source = fs.readFileSync(entry, 'utf8');
  const startup = source.lastIndexOf('\nstart().catch(');
  assert.ok(startup > 0);
  vm.runInNewContext(`${source.slice(0, startup)}\nmodule.exports = app;`, {
    module: scope, exports: scope.exports, console,
    process: { env: { JWT_SECRET: secret } },
    require: (name) => name === 'pg' ? { Pool: TestPool } : serverRequire(name),
  });
  const server = scope.exports.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const headers = (userId) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign({}, secret,
    { subject: userId, issuer: 'personalgim-api', audience: 'personalgim-app' })}` });
  const workout = {
    clientId: 'offline-workout', routineId: 'day', name: 'Pecho',
    startedAt: '2026-10-01T08:00:00.000Z', finishedAt: '2026-10-01T09:00:00.000Z',
    durationSeconds: 3600, totalKcal: 300, totalVolumeKg: 420,
    exercises: [{ id: 'log', exerciseId: 'press', sets: [
      { reps: 8, weightKg: 52.5, isCompleted: true },
    ] }],
  };
  const upload = (userId, body) => fetch(`${origin}/api/workouts`, { method: 'POST', headers: headers(userId), body: JSON.stringify(body) });
  try {
    const first = await upload('user-a', workout);
    assert.equal(first.status, 201, await first.text());
    assert.equal((await upload('user-a', workout)).status, 200);
    const read = await fetch(`${origin}/api/workouts`, { headers: headers('user-a') });
    const { workouts } = await read.json();
    assert.equal(workouts.length, 1);
    assert.deepEqual(workouts[0].exercises, workout.exercises);
    const other = await fetch(`${origin}/api/workouts`, { headers: headers('user-b') });
    assert.deepEqual((await other.json()).workouts, []);
    assert.equal((await upload('user-b', { ...workout, exercises: [] })).status, 201);
    assert.deepEqual(saved[1].exercises, []);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
