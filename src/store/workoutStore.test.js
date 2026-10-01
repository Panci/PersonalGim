const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const clone = (value) => JSON.parse(JSON.stringify(value));
const fixture = () => ({ id: 'collection', title: 'Rutina', days: [{
  id: 'day', name: 'Pecho', dayBadge: 'lun', exercisesCount: 1,
  estimatedMinutes: 60, estimatedCalories: 300, exercises: [{
    id: 'planned', routineId: 'day', exerciseId: 'press', orderIndex: 1,
    targetSets: 1, targetRepRange: '10', targetWeightRange: '40', targetRestSeconds: 60,
    defaultSets: [{ id: 'set', setNumber: 1, type: 'normal', reps: 10, weightKg: 40, isCompleted: false }],
  }],
}] });
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};
const harness = (saved = new Map(), remote = new Map()) => {
  let user = 'a';
  let sequence = 0;
  let offline = false;
  let saveGate;
  let readGate;
  const scheduled = new Map();
  let timerSequence = 0;
  const remoteFor = (token) => {
    if (!remote.has(token)) remote.set(token, { routines: [], workouts: [] });
    return remote.get(token);
  };
  const importTs = (relative, requireModule, extra = {}) => {
    const scope = { exports: {} };
    const compiled = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, relative), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText;
    vm.runInNewContext(compiled, { module: scope, exports: scope.exports, require: requireModule,
      console: { warn: () => {} }, setTimeout: (fn) => { scheduled.set(++timerSequence, fn); return timerSequence; },
      clearTimeout: (id) => scheduled.delete(id), ...extra });
    return scope.exports;
  };
  const ids = { createId: (prefix) => `${prefix}-${++sequence}` };
  const progress = importTs('../utils/routineProgress.ts', () => ids);
  const db = importTs('../db/database.web.ts', (name) => {
    if (name === './initialData') return { INITIAL_EXERCISES: [
      { id: 'press', name: 'Press', primaryMuscle: 'pectoral', isCustom: false },
    ] };
    if (name === '../data/exerciseGuidance') return { withExerciseGuidance: (exercise) => exercise };
    if (name === '../utils/routineProgress') return progress;
    throw new Error(`Unexpected database import: ${name}`);
  }, { localStorage: { getItem: (key) => saved.get(key) || null,
    setItem: (key, value) => saved.set(key, value), removeItem: (key) => saved.delete(key) } });
  const api = {
    getRoutinesRequest: async (token) => {
      const snapshot = clone(remoteFor(token).routines);
      if (readGate) { const gate = readGate; readGate = undefined; gate.started.resolve(); await gate.release.promise; }
      return snapshot;
    },
    saveRoutinesRequest: async (token, routines) => {
      if (saveGate) { const gate = saveGate; saveGate = undefined; gate.started.resolve(); await gate.release.promise; }
      if (offline) throw new Error('offline');
      remoteFor(token).routines = clone(routines);
    },
    getWorkoutsRequest: async (token) => {
      if (offline) throw new Error('offline');
      return clone(remoteFor(token).workouts);
    },
    saveWorkoutRequest: async (token, workout) => {
      if (offline) throw new Error('offline');
      const workouts = remoteFor(token).workouts;
      if (!workouts.some((item) => item.id === workout.id)) workouts.push(clone(workout));
    },
  };
  const { useWorkoutStore: store } = importTs('workoutStore.ts', (name) => {
    if (name === 'zustand') return require('zustand');
    if (name === '../db/database') return db;
    if (name === '../utils/ids') return ids;
    if (name === '../utils/routineProgress') return progress;
    if (name === '../utils/membershipBilling') return { isMembershipPaymentBlocked: () => false };
    if (name === '../data/exerciseGuidance') return { withExerciseGuidance: (exercise) => exercise };
    if (name === '../auth/authStorage') return { getAuthToken: async () => user };
    if (name === '../auth/api') return api;
    throw new Error(`Unexpected store import: ${name}`);
  });
  return { store, db, remote, saved, setOffline: (value) => { offline = value; },
    flushEdits: () => { const callbacks = [...scheduled.values()]; scheduled.clear(); callbacks.forEach((callback) => callback()); },
    load: async (id = 'a') => { user = id; await store.getState().loadInitialData(id); },
    gateSave: () => (saveGate = { started: deferred(), release: deferred() }),
    gateRead: () => (readGate = { started: deferred(), release: deferred() }),
  };
};
const seed = (h) => { h.db.saveCustomRoutineToDb(fixture()); h.store.getState().startWorkoutFromDay(fixture().days[0]); };

test('committed weights/reps persist through interruption, restart and account changes', async () => {
  const h = harness();
  await h.load(); seed(h);
  h.store.getState().updateSetValues(0, 0, 8, 52.5);
  h.store.getState().cancelActiveWorkout();
  assert.equal(h.db.getWorkoutHistoryFromDb().length, 0, 'discarding a session must not create a history entry');
  await h.load('b');
  assert.equal(h.db.getCollectionsFromDb().length, 0);
  await h.store.getState().syncWorkouts();
  assert.equal(h.remote.get('b').workouts.length, 0);
  const reopened = harness(h.saved, h.remote);
  await reopened.load('a');
  reopened.store.getState().startWorkoutFromDay(fixture().days[0]);
  const set = reopened.store.getState().activeWorkout.exercises[0].sets[0];
  assert.equal(set.reps, 8);
  assert.equal(set.weightKg, 52.5);
  assert.equal(set.isCompleted, false);
});

test('finished offline workout retries once and a fresh device retrieves its history and routine values', async () => {
  const h = harness();
  await h.load(); seed(h);
  h.setOffline(true);
  h.store.getState().updateSetValues(0, 0, 8, 52.5);
  h.store.getState().toggleCompleteSet(0, 0);
  h.store.getState().finishActiveWorkout();
  // Drain the sync initiated by finish, then retry explicitly.
  await new Promise(setImmediate);
  assert.equal(h.store.getState().workoutSyncStatus, 'error');
  assert.equal(h.store.getState().history.length, 1);
  h.setOffline(false);
  await h.store.getState().syncRoutines();
  await h.store.getState().syncWorkouts();
  await h.store.getState().syncWorkouts();
  assert.equal(h.remote.get('a').workouts.length, 1);
  const fresh = harness(new Map(), h.remote);
  await fresh.load();
  await fresh.store.getState().syncRoutines();
  await fresh.store.getState().syncWorkouts();
  assert.equal(fresh.store.getState().history.length, 1);
  assert.equal(fresh.store.getState().stats.totalVolumeKg, 420);
  fresh.store.getState().startWorkoutFromDay(fixture().days[0]);
  assert.equal(fresh.store.getState().activeWorkout.exercises[0].sets[0].weightKg, 52.5);
  assert.equal(fresh.store.getState().activeWorkout.exercises[0].sets[0].reps, 8);
});

test('an edit during routine upload stays pending and is not replaced by the older server copy', async () => {
  const h = harness();
  await h.load(); seed(h);
  h.store.getState().updateSetValues(0, 0, 8, 52.5);
  const gate = h.gateSave();
  const sync = h.store.getState().syncRoutines();
  await gate.started.promise;
  h.store.getState().updateSetValues(0, 0, 6, 55);
  gate.release.resolve();
  await sync;
  assert.equal(h.db.getRoutineSyncPendingFromDb(), true);
  await h.store.getState().syncRoutines();
  assert.equal(h.remote.get('a').routines[0].days[0].exercises[0].defaultSets[0].weightKg, 55);
  assert.equal(h.db.getRoutineSyncPendingFromDb(), false);
});

test('a delayed response for the previous account cannot replace the new account routines', async () => {
  const h = harness();
  await h.load();
  h.remote.set('a', { routines: [fixture()], workouts: [] });
  const gate = h.gateRead();
  const sync = h.store.getState().syncRoutines();
  await gate.started.promise;
  await h.load('b');
  gate.release.resolve();
  await sync;
  assert.equal(h.db.getCollectionsFromDb().length, 0);
  assert.equal(h.store.getState().collections.length, 0);
});

test('background edits and manual sync serialize uploads so a slow old request cannot overwrite newer values', async () => {
  const h = harness();
  await h.load(); seed(h);
  h.store.getState().updateSetValues(0, 0, 8, 52.5);
  const gate = h.gateSave();
  const sync = h.store.getState().syncRoutines();
  await gate.started.promise;
  h.store.getState().updateSetValues(0, 0, 6, 55);
  h.flushEdits();
  await new Promise(setImmediate);
  assert.equal(h.remote.get('a').routines.length, 0, 'new uploads must wait for the first request');
  gate.release.resolve();
  await sync;
  await h.store.getState().syncRoutines();
  assert.equal(h.remote.get('a').routines[0].days[0].exercises[0].defaultSets[0].weightKg, 55);
  assert.equal(h.db.getRoutineSyncPendingFromDb(), false);
});
