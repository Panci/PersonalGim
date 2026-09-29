const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, 'routineProgress.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const moduleScope = { exports: {} };
let sequence = 0;
vm.runInNewContext(compiled, {
  module: moduleScope, exports: moduleScope.exports,
  require: () => ({ createId: (prefix) => `${prefix}-${++sequence}` }),
});
const { applyWorkoutToRoutine, summarizeRoutineSets } = moduleScope.exports;

test('completed routine uses the entered set values next time', () => {
  const original = [{ id: 'routine', days: [{ id: 'day', exercisesCount: 2, exercises: [
    { id: 'planned-1', routineId: 'day', exerciseId: 'press', targetSets: 2,
      targetRepRange: '10', targetWeightRange: '40', targetRestSeconds: 60,
      defaultSets: [{ id: 'old-1', setNumber: 1, reps: 10, weightKg: 40, isCompleted: false }] },
    { id: 'planned-2', routineId: 'day', exerciseId: 'squat', targetSets: 1,
      targetRepRange: '8', targetWeightRange: '50', targetRestSeconds: 60,
      defaultSets: [{ id: 'old-2', setNumber: 1, reps: 8, weightKg: 50, isCompleted: false }] },
  ] }] }];
  const finished = { routineId: 'day', exercises: [
    { exerciseId: 'press', sets: [
      { id: 'done-1', setNumber: 1, reps: 7, weightKg: 52.5, isCompleted: true, restSeconds: 90 },
      { id: 'done-2', setNumber: 2, reps: 6, weightKg: 55, isCompleted: true, restSeconds: 90 },
    ] },
    { exerciseId: 'curl', sets: [{ id: 'done-3', setNumber: 1, reps: 12, weightKg: 15, isCompleted: true }] },
  ] };
  const next = applyWorkoutToRoutine(original, finished)[0].days[0];
  assert.equal(next.exercisesCount, 3);
  assert.deepEqual(next.exercises[0].defaultSets.map((set) => [set.reps, set.weightKg, set.isCompleted]),
    [[7, 52.5, false], [6, 55, false]]);
  assert.equal(next.exercises[0].targetRepRange, '6-7');
  assert.equal(next.exercises[0].targetWeightRange, '52.5-55');
  assert.equal(next.exercises[0].targetRestSeconds, 90);
  assert.equal(next.exercises[1].defaultSets[0].weightKg, 50);
  assert.equal(next.exercises[2].exerciseId, 'curl');
  assert.equal(next.exercises[2].defaultSets[0].isCompleted, false);
  assert.equal(original[0].days[0].exercises[0].defaultSets[0].weightKg, 40);
});

test('edited set summary reflects the values saved in routine configuration', () => {
  assert.deepEqual({ ...summarizeRoutineSets([
    { reps: 8, weightKg: 30 }, { reps: 10, weightKg: 35 },
  ]) }, { targetRepRange: '8-10', targetWeightRange: '30-35' });
});
