const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');

test('SQLite keeps routines and pending workouts per account while preserving the previous device database', async () => {
  const databases = new Map();
  const connections = new Map();
  const sqlite = { openDatabaseSync: (name) => {
    if (connections.get(name)?.isOpen()) return connections.get(name);
    if (!databases.has(name)) databases.set(name, new DatabaseSync(':memory:'));
    const database = databases.get(name);
    let closed = false;
    const check = () => { assert.equal(closed, false, 'the active SQLite connection must stay open'); };
    const connection = {
      isOpen: () => !closed,
      closeSync: () => { closed = true; },
      execSync: (sql) => { check(); database.exec(sql); },
      runSync: (sql, params = []) => { check(); return database.prepare(sql).run(...params); },
      getFirstSync: (sql, params = []) => { check(); return database.prepare(sql).get(...params) || null; },
      getAllSync: (sql, params = []) => { check(); return database.prepare(sql).all(...params); },
      withTransactionSync: (callback) => {
        check(); database.exec('BEGIN');
        try { callback(); database.exec('COMMIT'); } catch (error) { database.exec('ROLLBACK'); throw error; }
      },
    };
    connections.set(name, connection);
    return connection;
  } };
  const scope = { exports: {} };
  const warnings = [];
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, 'database.native.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(source, { module: scope, exports: scope.exports,
    console: { warn: (...args) => warnings.push(args) },
    require: (name) => {
      if (name === 'expo-sqlite') return sqlite;
      if (name === './initialData') return { INITIAL_EXERCISES: [] };
      if (name === '../data/exerciseGuidance') return { withExerciseGuidance: (exercise) => exercise };
      if (name === '../utils/routineProgress') return { summarizeRoutineSets: (sets) => ({
        targetRepRange: String(sets[0]?.reps || 0), targetWeightRange: String(sets[0]?.weightKg || 0),
      }) };
      throw new Error(`Unexpected native import: ${name}`);
    },
  });
  const db = scope.exports;
  try {
    await db.initDatabase();
    db.saveCustomRoutineToDb({ id: 'routine', title: 'Pecho', days: [{
      id: 'day', name: 'Pecho', dayBadge: 'lun', estimatedMinutes: 60, estimatedCalories: 300,
      exercises: [{ id: 'planned', routineId: 'day', exerciseId: 'press', orderIndex: 1,
        targetSets: 1, targetRepRange: '10', targetWeightRange: '40', targetRestSeconds: 60,
        defaultSets: [{ id: 'set', setNumber: 1, type: 'normal', reps: 10, weightKg: 40, isCompleted: false }],
      }],
    }] });
    await db.initDatabase('a');
    db.updateRoutineDayExerciseSets('day', 'planned', [
      { id: 'set', setNumber: 1, type: 'normal', reps: 8, weightKg: 52.5, isCompleted: true },
    ], 90);
    db.setRoutineSyncPendingInDb(true);
    db.saveWorkoutLogToDb({ id: 'workout', routineId: 'day', name: 'Pecho', startTime: new Date().toISOString(),
      endTime: new Date().toISOString(), durationSeconds: 60, totalKcal: 80, totalVolumeKg: 420,
      exercises: [], isCompleted: true });
    await db.initDatabase('a');
    assert.equal(db.getRoutineDayDetailFromDb('day').exercises[0].defaultSets[0].weightKg, 52.5);
    await db.initDatabase('b');
    assert.equal(db.getCollectionsFromDb().length, 0);
    assert.equal(db.getWorkoutHistoryFromDb().length, 0);
    assert.equal(db.getRoutineSyncPendingFromDb(), false);
    await db.initDatabase('a');
    const set = db.getRoutineDayDetailFromDb('day').exercises[0].defaultSets[0];
    assert.equal(set.reps, 8);
    assert.equal(set.weightKg, 52.5);
    assert.equal(set.isCompleted, false);
    assert.equal(db.getWorkoutHistoryFromDb().length, 1);
    assert.equal(db.getRoutineSyncPendingFromDb(), true);
    assert.deepEqual(warnings, [], 'SQLite operations must not fall back silently');
  } finally {
    for (const database of databases.values()) database.close();
  }
});
