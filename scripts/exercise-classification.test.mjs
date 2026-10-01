import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { classifyExercise, muscleForKey } from './exercise-classification.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const manifest = JSON.parse(readFileSync(new URL('../public/exercise-library/manifest.json', import.meta.url)));
function loadTs(relative) {
  const scope = { exports: {} };
  const js = ts.transpileModule(readFileSync(new URL(relative, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(js, { module: scope, exports: scope.exports });
  return scope.exports;
}
const { EXERCISE_CATEGORIES, MUSCLE_OPTIONS } = loadTs('../src/data/exerciseCategories.ts');
const { SMARTWORKOUT_EXERCISES } = loadTs('../src/data/smartWorkoutExercises.ts');

test('anatomical keys do not confuse hamstrings, triceps, trapezius or obliques', () => {
  assert.equal(muscleForKey('BICEPS_FEMORIS'), 'isquiotibiales');
  assert.equal(muscleForKey('TRICEPS_LATERAL_HEAD'), 'triceps');
  assert.equal(muscleForKey('BACK_TRAPEZIUS_MIDDLE'), 'trapecio');
  assert.equal(muscleForKey('ABS_OBLIQUES'), 'oblicuos');
  assert.equal(muscleForKey('ADDUCTOR_MAGNUS'), 'adductores');
  assert.equal(muscleForKey('GLUTEUS_MEDIUS'), 'abductores');
  assert.throws(() => muscleForKey('UNKNOWN_MUSCLE'), /Unreviewed/);
});

test('source emphasis uses the strongest head instead of biasing groups with more anatomical keys', () => {
  const result = classifyExercise({ id: 'test', bodyPart: 'ABS', exerciseMuscles: { ABS_UPPER: 50, ABS_LOWER: 50, ABS_OBLIQUES: 100 } });
  assert.equal(result.primaryMuscle, 'oblicuos');
  assert.deepEqual(result.secondaryMuscles, ['abdomen']);
});

test('the complete catalogue is reproducible, selectable, and consistent with generated app data', () => {
  assert.equal(manifest.exercises.length, 812);
  assert.equal(SMARTWORKOUT_EXERCISES.length, 812);
  const ids = new Set();
  const selectable = new Set(MUSCLE_OPTIONS.map((option) => option.id));
  for (const [index, exercise] of manifest.exercises.entries()) {
    assert.ok(!ids.has(exercise.sourceId), `Duplicate id: ${exercise.sourceId}`);
    ids.add(exercise.sourceId);
    assert.deepEqual(classifyExercise(exercise), { primaryMuscle: exercise.primaryMuscle, secondaryMuscles: exercise.secondaryMuscles }, exercise.name);
    assert.ok(selectable.has(exercise.primaryMuscle), exercise.name);
    assert.ok(EXERCISE_CATEGORIES.some((category) => category.muscleIds.includes(exercise.primaryMuscle)), exercise.name);
    assert.ok(!exercise.secondaryMuscles.includes(exercise.primaryMuscle), exercise.name);
    assert.equal(new Set(exercise.secondaryMuscles).size, exercise.secondaryMuscles.length, exercise.name);
    for (const muscle of exercise.secondaryMuscles) assert.ok(selectable.has(muscle), exercise.name);
    const app = SMARTWORKOUT_EXERCISES[index];
    assert.equal(app.id, `smartworkout-${exercise.sourceId}`);
    assert.equal(app.primaryMuscle, exercise.primaryMuscle, exercise.name);
    assert.deepEqual(Array.from(app.secondaryMuscles), exercise.secondaryMuscles, exercise.name);
    assert.equal(app.localImagePath, exercise.localImagePath);
    assert.equal(app.localVideoPath, exercise.localVideoPath);
  }
  for (const muscle of selectable) assert.ok(manifest.exercises.some((exercise) => exercise.primaryMuscle === muscle), `Empty muscle: ${muscle}`);
});

test('reviewed examples stay in their correct groups, including ambiguous exercise names', () => {
  const examples = {
    'Aducción de Cadera Sentado': 'adductores', 'Abducción de Cadera Sentado': 'abductores',
    'Curl de Piernas Sentado': 'isquiotibiales', 'Curl nórdico de isquiotibiales': 'isquiotibiales',
    'Sentadilla Sissy de Rodillas': 'cuadriceps', 'Peso Muerto Rumano': 'isquiotibiales',
    'Peso Muerto con Piernas Rectas con Barra': 'isquiotibiales',
    'Encogimientos de Hombros con Mancuernas': 'trapecio', 'Extensión de Espalda': 'lumbares',
    'Plancha lateral': 'oblicuos', 'Plancha Serrucho': 'abdomen',
    'Almeja de Pecho Sentada': 'pectoral', 'Laterales Poliquin': 'hombros',
    'Prensa de piernas a 45 grados con postura estrecha': 'cuadriceps',
    'Trineo Prowler': 'cuadriceps', 'Dominadas con Peso': 'dorsales',
    'Bicicleta estática': 'cardio', 'Bicicleta de aire': 'oblicuos',
  };
  for (const [name, muscle] of Object.entries(examples)) assert.equal(manifest.exercises.find((exercise) => exercise.name === name)?.primaryMuscle, muscle, name);
});
