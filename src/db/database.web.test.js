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
const loadDatabase = (initialExercises = []) => {
  const scope = { exports: {} };
  vm.runInNewContext(compile(path.resolve(__dirname, 'database.web.ts')), {
    module: scope, exports: scope.exports, localStorage: storage,
    require: (name) => {
      if (name === './initialData') return { INITIAL_EXERCISES: initialExercises };
      if (name === '../data/exerciseGuidance') return { withExerciseGuidance: (exercise) => exercise };
      if (name === '../utils/routineProgress') return progressScope.exports;
      throw new Error(`Unexpected module: ${name}`);
    },
  });
  return scope.exports;
};

test('catalogue classification updates preserve web favorites, custom exercises and routine links', async () => {
  saved.clear();
  const oldExercise = { id: 'curl', name: 'Curl', primaryMuscle: 'pantorrillas', secondaryMuscles: [], equipment: 'maquina', isFavorite: false, isCustom: false };
  const old = loadDatabase([oldExercise]);
  await old.initDatabase();
  old.toggleFavoriteInDb('curl');
  old.addCustomExerciseToDb({ ...oldExercise, id: 'custom', isCustom: true });
  old.saveCustomRoutineToDb({ id: 'routine', title: 'Mis piernas', days: [] });
  const updated = loadDatabase([{ ...oldExercise, primaryMuscle: 'isquiotibiales', secondaryMuscles: ['pantorrillas'] }]);
  await updated.initDatabase();
  const exercises = updated.getExercisesFromDb();
  assert.equal(exercises.find((exercise) => exercise.id === 'curl').primaryMuscle, 'isquiotibiales');
  assert.equal(exercises.find((exercise) => exercise.id === 'curl').isFavorite, true);
  assert.equal(exercises.find((exercise) => exercise.id === 'custom').primaryMuscle, 'pantorrillas');
  assert.equal(updated.getCollectionsFromDb()[0].title, 'Mis piernas');
});

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

test('account migration compacts the bundled catalogue while preserving favourites, custom exercises and pending data', async () => {
  saved.clear();
  const catalogue = [{ id: 'press', name: 'Press', instructions: 'x'.repeat(3_000_000), isFavorite: false, isCustom: false }];
  const old = loadDatabase(catalogue);
  await old.initDatabase();
  old.toggleFavoriteInDb('press');
  old.addCustomExerciseToDb({ id: 'custom', name: 'Personalizado', instructions: 'Mi técnica', isCustom: true, isFavorite: false });
  old.saveCustomRoutineToDb({ id: 'routine', title: 'Pecho', days: [] });
  old.setRoutineSyncPendingInDb(true);
  // Simulate an older build which persisted full built-in exercise documents.
  const legacy = JSON.parse(saved.get('personalgim.local-data.v3'));
  legacy.exercises = [{ ...catalogue[0], isFavorite: true }, legacy.exercises.find((exercise) => exercise.id === 'custom')];
  saved.set('personalgim.local-data.v3', JSON.stringify(legacy));
  const reopened = loadDatabase(catalogue);
  await reopened.initDatabase('user-a');
  assert.ok(saved.get('personalgim.local-data.v3').length < 1000);
  assert.ok(saved.get('personalgim.local-data.v3.user.user-a').length < 1000);
  const press = reopened.getExercisesFromDb().find((exercise) => exercise.id === 'press');
  assert.equal(press.name, 'Press');
  assert.equal(press.instructions.length, 3_000_000);
  assert.equal(press.isFavorite, true);
  assert.equal(reopened.getExercisesFromDb().find((exercise) => exercise.id === 'custom').instructions, 'Mi técnica');
  assert.equal(reopened.getRoutineSyncPendingFromDb(), true);
  await reopened.initDatabase('user-b');
  assert.equal(reopened.getCollectionsFromDb().length, 0);
  assert.equal(reopened.getExercisesFromDb().find((exercise) => exercise.id === 'press').isFavorite, false);
});
