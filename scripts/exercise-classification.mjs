import { readFileSync } from 'node:fs';

const overrides = JSON.parse(readFileSync(new URL('../src/data/exerciseClassificationOverrides.json', import.meta.url), 'utf8'));

// Exact anatomical keys: BICEPS_FEMORIS is a hamstring, and TRICEPS_LATERAL
// must never match the dorsal's LAT substring. Scores describe the source's
// emphasis, not measured activation percentages.
export function muscleForKey(key) {
  if (key === 'BICEPS_FEMORIS' || ['SEMIMEMBRANOSUS', 'SEMITENDINOSUS'].includes(key)) return 'isquiotibiales';
  if (key.startsWith('BICEPS_')) return 'biceps';
  if (key.startsWith('TRICEPS_')) return 'triceps';
  if (key.startsWith('CHEST_')) return 'pectoral';
  if (key.startsWith('SHOULDERS_') || ['BACK_INFRASPINATUS', 'BACK_TERES_MINOR'].includes(key)) return 'hombros';
  if (['BACK_LATS', 'BACK_TERES_MAJOR'].includes(key)) return 'dorsales';
  if (key.startsWith('BACK_TRAPEZIUS_')) return 'trapecio';
  if (key === 'ERECTOR_SPINAE') return 'lumbares';
  if (key === 'GLUTEUS_MAXIMUS') return 'gluteos';
  if (key === 'GLUTEUS_MEDIUS') return 'abductores';
  if (key.startsWith('ADDUCTOR_') || ['GRACILIS', 'PECTINEUS'].includes(key)) return 'adductores';
  if (key.startsWith('QUADRICEPS_')) return 'cuadriceps';
  if (key.startsWith('CLAVES_')) return 'pantorrillas';
  if (key.startsWith('FOREARM_') || key === 'BRACHIORADIALIS') return 'antebrazo';
  if (key === 'ABS_OBLIQUES') return 'oblicuos';
  if (['ABS_UPPER', 'ABS_LOWER'].includes(key)) return 'abdomen';
  // These hip flexors have no dedicated selector in the app. Retain their raw
  // source data without falsely labelling them as quads or abdominals.
  if (['ILIOPSOAS', 'SARTORIUS'].includes(key)) return null;
  throw new Error(`Unreviewed source muscle: ${key}`);
}

const tiePreference = {
  CHEST: ['pectoral'], BACK: ['dorsales', 'trapecio', 'lumbares'],
  SHOULDERS: ['hombros'], BICEPS: ['biceps'], TRICEPS: ['triceps'],
  FOREARMS: ['antebrazo'], ABS: ['abdomen', 'oblicuos'],
  LEGS: ['cuadriceps', 'isquiotibiales', 'adductores', 'abductores', 'pantorrillas', 'gluteos'],
  GLUTEUS: ['gluteos', 'abductores', 'isquiotibiales'],
};

export function classifyExercise(exercise) {
  const sourceMuscles = exercise.sourceMuscles || exercise.exerciseMuscles;
  if (!sourceMuscles) throw new Error(`Missing source muscles: ${exercise.sourceId || exercise.id}`);
  const scores = new Map();
  for (const [key, rawScore] of Object.entries(sourceMuscles)) {
    const muscle = muscleForKey(key);
    const score = Number(rawScore);
    if (!Number.isFinite(score) || score < 0) throw new Error(`Invalid muscle score: ${key}`);
    if (muscle && score > 0) scores.set(muscle, Math.max(scores.get(muscle) || 0, score));
  }
  const preferred = tiePreference[exercise.bodyPart] || [];
  const priority = (muscle) => preferred.includes(muscle) ? preferred.indexOf(muscle) : preferred.length;
  const ranked = [...scores].sort((a, b) => b[1] - a[1] || priority(a[0]) - priority(b[0]) || a[0].localeCompare(b[0]));
  const override = overrides[exercise.sourceId || exercise.id];
  const primaryMuscle = override?.primaryMuscle || ranked[0]?.[0];
  if (!primaryMuscle) throw new Error(`No classified target: ${exercise.sourceId || exercise.id}`);
  const secondaryMuscles = ranked.map(([muscle]) => muscle).filter((muscle) => muscle !== primaryMuscle);
  // Gluteus medius is an abductor and also part of the gluteal region.
  if (sourceMuscles.GLUTEUS_MEDIUS > 0 && primaryMuscle !== 'gluteos' && !secondaryMuscles.includes('gluteos')) secondaryMuscles.push('gluteos');
  return { primaryMuscle, secondaryMuscles };
}
