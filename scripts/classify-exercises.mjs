import { readFile, writeFile } from 'node:fs/promises';
import { classifyExercise } from './exercise-classification.mjs';
import { writeExerciseData } from './exercise-catalogue.mjs';

const manifestPath = new URL('../public/exercise-library/manifest.json', import.meta.url);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
let changed = 0;
for (const exercise of manifest.exercises) {
  const classification = classifyExercise(exercise);
  if (exercise.primaryMuscle !== classification.primaryMuscle) changed++;
  Object.assign(exercise, classification);
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
await writeExerciseData(new URL('../src/data/smartWorkoutExercises.ts', import.meta.url), manifest.exercises);
console.log(`Clasificados ${manifest.exercises.length} ejercicios; ${changed} cambios de grupo principal. No se han modificado imágenes ni vídeos.`);
