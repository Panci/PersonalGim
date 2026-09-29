const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const compile = (file) => ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

const progressScope = { exports: {} };
vm.runInNewContext(compile(path.resolve(__dirname, '../utils/routineProgress.ts')), {
  module: progressScope, exports: progressScope.exports,
  require: () => ({ createId: () => 'new-id' }),
});

const saved = new Map();
const storage = {
  getItem: (key) => saved.get(key) || null,
  setItem: (key, value) => saved.set(key, value),
  removeItem: (key) => saved.delete(key),
};
const loadDatabase = () => {
  const scope = { exports: {} };
  vm.runInNewContext(compile(path.resolve(__dirname, 'database.web.ts')), {
    module: scope, exports: scope.exports, localStorage: storage,
    require: (name) => {
      if (name === './initialData') return { INITIAL_EXERCISES: [] };
      if (name === '../data/exerciseGuidance') return { withExerciseGuidance: (exercise) => exercise };
      if (name === '../utils/routineProgress') return progressScope.exports;
      throw new Error(`Unexpected module: ${name}`);
    },
  });
  return scope.exports;
};

test('routine exercise edits persist after a web app restart', async () => {
  const first = loadDatabase();
  await first.initDatabase();
  first.saveCustomRoutineToDb({ id: 'routine', title: 'Fuerza', days: [{
    id: 'day', name: 'Lunes', dayBadge: 'lun', estimatedMinutes: 60, estimatedCalories: 300,
    exercisesCount: 1, exercises: [{
      id: 'routine-ex', routineId: 'day', exerciseId: 'press', orderIndex: 1,
      targetSets: 1, targetRepRange: '10', targetWeightRange: '40', targetRestSeconds: 60,
      defaultSets: [{ id: 'set-1', setNumber: 1, type: 'normal', reps: 10, weightKg: 40, isCompleted: false }],
    }],
  }] });
  first.updateRoutineDayExerciseSets('day', 'routine-ex', [
    { id: 'set-1', setNumber: 1, type: 'normal', reps: 8, weightKg: 52.5, isCompleted: false },
    { id: 'set-2', setNumber: 2, type: 'normal', reps: 6, weightKg: 55, isCompleted: false },
  ], 90);
  const reopened = loadDatabase();
  await reopened.initDatabase();
  const exercise = reopened.getRoutineDayDetailFromDb('day').exercises[0];
  assert.equal(exercise.targetSets, 2);
  assert.equal(exercise.targetRepRange, '6-8');
  assert.equal(exercise.targetWeightRange, '52.5-55');
  assert.equal(exercise.targetRestSeconds, 90);
  assert.deepEqual(Array.from(exercise.defaultSets, (set) => [set.reps, set.weightKg]), [[8, 52.5], [6, 55]]);
});
