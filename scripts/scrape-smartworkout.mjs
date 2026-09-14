import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const sourceBase = 'https://smartworkout.app';
const apiBase = 'https://api.smartworkout.app';
const categories = [
  { slug: 'pecho', label: 'Pecho' },
  { slug: 'espalda', label: 'Espalda' },
  { slug: 'hombros', label: 'Hombros' },
  { slug: 'piernas', label: 'Piernas' },
  { slug: 'gl%C3%BAteos', label: 'Glúteos' },
  { slug: 'b%C3%ADceps', label: 'Bíceps' },
  { slug: 'tr%C3%ADceps', label: 'Tríceps' },
  { slug: 'antebrazos', label: 'Antebrazos' },
  { slug: 'abdominales', label: 'Abdominales' },
];

const outDir = join(projectRoot, 'public', 'exercise-library');
const mediaDir = join(outDir, 'media');
const generatedDataPath = join(projectRoot, 'src', 'data', 'smartWorkoutExercises.ts');
const manifestPath = join(outDir, 'manifest.json');
let existingAssets = new Map();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchText(url, attempt = 1) {
  const response = await fetch(url, { headers: { 'user-agent': 'PersonalGim-research-import/1.0' } });
  if (!response.ok) {
    if (attempt < 3) {
      await sleep(attempt * 500);
      return fetchText(url, attempt + 1);
    }
    throw new Error(`${response.status} ${response.statusText} (${url})`);
  }
  return response.text();
}

function pageProps(html) {
  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
  const raw = scripts.map((match) => match[1]).find((value) => value.includes('"pageProps"'));
  if (!raw) throw new Error('No pageProps payload found');
  return JSON.parse(raw).props.pageProps;
}

function toTextList(value) {
  if (!value) return [];
  if (typeof value === 'string') return value.split(/\s*\.\s+(?=[A-ZÁÉÍÓÚÑ])/).map((item) => item.trim()).filter(Boolean);
  if (Array.isArray(value)) return value.flatMap((item) => toTextList(item));
  if (typeof value === 'object') {
    if (typeof value.text === 'string') return [value.text];
    if (typeof value.es === 'string' || Array.isArray(value.es)) return toTextList(value.es);
    return Object.values(value).flatMap((item) => toTextList(item));
  }
  return [];
}

function localized(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.es !== undefined) {
    return Array.isArray(value.es) ? toTextList(value.es).join(' ') : String(value.es);
  }
  return '';
}

const muscleForKey = (key) => {
  const value = key.toUpperCase();
  if (value.includes('PECTOR') || value.includes('CHEST')) return 'pectoral';
  if (value.includes('BICEP')) return 'biceps';
  if (value.includes('TRICEP')) return 'triceps';
  if (value.includes('SHOULDER') || value.includes('DELTOID')) return 'hombros';
  if (value.includes('LAT') || value.includes('DORSAL') || value.includes('BACK')) return 'dorsales';
  if (value.includes('GLUTE')) return 'gluteos';
  if (value.includes('HAMSTRING') || value.includes('ISCHIO')) return 'isquiotibiales';
  if (value.includes('QUAD')) return 'cuadriceps';
  if (value.includes('CALF') || value.includes('GASTROCNEMIUS') || value.includes('SOLEUS')) return 'pantorrillas';
  if (value.includes('FOREARM')) return 'antebrazo';
  if (value.includes('TRAP')) return 'trapecio';
  if (value.includes('LUMBAR') || value.includes('ERECTOR')) return 'lumbares';
  if (value.includes('OBLIQUE')) return 'oblicuos';
  if (value.includes('ABS') || value.includes('ABDOM')) return 'abdomen';
  return null;
};

function primaryMuscle(categorySlug, exerciseMuscles = {}) {
  const category = decodeURIComponent(categorySlug);
  const categoryDefault = {
    pecho: 'pectoral', espalda: 'dorsales', hombros: 'hombros', glúteos: 'gluteos',
    bíceps: 'biceps', tríceps: 'triceps', antebrazos: 'antebrazo', abdominales: 'abdomen',
  }[category];
  if (categoryDefault) return categoryDefault;
  const candidates = Object.entries(exerciseMuscles)
    .map(([key, score]) => ({ muscle: muscleForKey(key), score: Number(score) || 0 }))
    .filter((item) => item.muscle && ['cuadriceps', 'isquiotibiales', 'gluteos', 'pantorrillas'].includes(item.muscle))
    .sort((a, b) => b.score - a.score);
  return candidates[0]?.muscle || 'cuadriceps';
}

function secondaryMuscles(primary, exerciseMuscles = {}) {
  const totals = new Map();
  for (const [key, score] of Object.entries(exerciseMuscles)) {
    const muscle = muscleForKey(key);
    if (muscle && muscle !== primary) totals.set(muscle, (totals.get(muscle) || 0) + (Number(score) || 0));
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([muscle]) => muscle);
}

function equipmentFor(exercise) {
  const text = `${exercise.equipments || ''} ${exercise.weightType || ''} ${exercise.translations?.es || ''}`.toUpperCase();
  if (text.includes('BARBELL') || text.includes('BAR')) return 'barra';
  if (text.includes('DUMBBELL') || text.includes('MANCUERNA')) return 'mancuerna';
  if (text.includes('CABLE') || text.includes('POLEA')) return 'polea';
  if (text.includes('MACHINE') || text.includes('MÁQUINA') || text.includes('MAQUINA')) return 'maquina';
  if (text.includes('BODYWEIGHT') || text.includes('BODY WEIGHT')) return 'peso_corporal';
  if (text.includes('CARDIO')) return 'cardio';
  return 'otro';
}

function movementFor(tags = []) {
  const text = tags.join(' ').toUpperCase();
  if (text.includes('PULL') || text.includes('ROW')) return 'traccion';
  if (text.includes('HINGE') || text.includes('DEADLIFT')) return 'bisagra';
  if (text.includes('SQUAT') || text.includes('LUNGE')) return 'sentadilla';
  if (text.includes('PUSH')) return 'empuje';
  return 'aislamiento';
}

function mediaUrls(exercise) {
  const entries = [
    ['image', exercise.image?.uri],
    ['thumbnail-1', exercise.thumbnail1?.uri],
    ['thumbnail-2', exercise.thumbnail2?.uri],
    ['video', exercise.videoDarkUrl || exercise.videoLightUrl],
  ].filter(([, url]) => typeof url === 'string' && url.startsWith('http'));
  return [...new Map(entries.map(([kind, url]) => [url, { kind, url }])).values()];
}

function normalizedExercise(exercise, categorySlug, detailUrl) {
  const primary = primaryMuscle(categorySlug, exercise.exerciseMuscles);
  const instructions = toTextList(exercise.instructions?.es ?? exercise.instructions);
  const tips = toTextList(exercise.tips?.es ?? exercise.tips);
  const commonMistakes = toTextList(exercise.commonMistakes?.es ?? exercise.commonMistakes);
  const tags = Array.isArray(exercise.tags) ? exercise.tags : String(exercise.tags || '').split(/\s+/).filter(Boolean);
  return {
    sourceId: exercise.id,
    sourceUrl: detailUrl,
    sourceProvider: 'SmartWorkout',
    name: localized(exercise.translations) || exercise.name || 'Ejercicio sin nombre',
    englishName: exercise.translations?.en || undefined,
    primaryMuscle: primary,
    secondaryMuscles: secondaryMuscles(primary, exercise.exerciseMuscles),
    equipment: equipmentFor(exercise),
    description: localized(exercise.descriptions),
    instructions,
    tips,
    commonMistakes,
    movementPattern: movementFor(tags),
    tags,
    laterality: exercise.laterality || undefined,
    mechanics: exercise.mechanics || undefined,
    bodyPart: exercise.bodyPart || undefined,
    media: mediaUrls(exercise),
    isFavorite: false,
    isCustom: false,
  };
}

async function collectLinks() {
  const all = [];
  for (const category of categories) {
    const url = `${sourceBase}/es/biblioteca-ejercicios/${category.slug}`;
    const html = await fetchText(url);
    const pattern = new RegExp(`href="(/es/biblioteca-ejercicios/${category.slug}/[^"#?]+)"`, 'g');
    const links = [...html.matchAll(pattern)].map((match) => match[1]);
    for (const path of [...new Set(links)]) all.push({ category, url: `${sourceBase}${path}` });
    console.log(`[links] ${category.label}: ${new Set(links).size}`);
  }
  return [...new Map(all.map((item) => [item.url, item])).values()];
}

async function mapWithConcurrency(items, concurrency, worker) {
  const output = new Array(items.length);
  let cursor = 0;
  async function runner() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      output[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, runner));
  return output;
}

async function downloadAsset(item, index, total) {
  const assetId = item.url.split('/').pop();
  const existingName = existingAssets.get(assetId);
  if (existingName) return { ...item, filename: existingName, localPath: `/exercise-library/media/${existingName}` };
  const response = await fetch(item.url, { headers: { 'user-agent': 'PersonalGim-research-import/1.0' } });
  if (!response.ok) throw new Error(`${response.status} ${item.url}`);
  const contentType = response.headers.get('content-type') || '';
  const extension = contentType.includes('mp4') ? 'mp4' : contentType.includes('webp') ? 'webp' : contentType.includes('png') ? 'png' : 'jpg';
  const filename = `${assetId}.${extension}`;
  await writeFile(join(mediaDir, filename), Buffer.from(await response.arrayBuffer()));
  existingAssets.set(assetId, filename);
  if (index % 50 === 0 || index === total - 1) console.log(`[media] ${index + 1}/${total}`);
  return { ...item, filename, localPath: `/exercise-library/media/${filename}` };
}

async function main() {
  await mkdir(mediaDir, { recursive: true });
  existingAssets = new Map((await readdir(mediaDir)).map((filename) => [filename.split('.')[0], filename]));
  const links = await collectLinks();
  console.log(`[details] downloading ${links.length} exercise pages`);
  const recordsWithDuplicates = (await mapWithConcurrency(links, 8, async ({ category, url }, index) => {
    try {
      const props = pageProps(await fetchText(url));
      const record = normalizedExercise(props.exercise, category.slug, url);
      if (index % 25 === 0 || index === links.length - 1) console.log(`[details] ${index + 1}/${links.length}`);
      return record;
    } catch (error) {
      console.warn(`[details] skipped ${url}: ${error.message}`);
      return null;
    }
  })).filter(Boolean);
  const records = [...new Map(recordsWithDuplicates.map((record) => [record.sourceId, record])).values()];

  const assets = [...new Map(records.flatMap((record) => record.media).map((asset) => [asset.url, asset])).values()];
  console.log(`[media] downloading ${assets.length} unique assets`);
  const downloaded = (await mapWithConcurrency(assets, 8, async (asset, index) => {
    try {
      return await downloadAsset(asset, index, assets.length);
    } catch (error) {
      console.warn(`[media] skipped ${asset.url}: ${error.message}`);
      return null;
    }
  })).filter(Boolean);
  const assetMap = new Map(downloaded.map((asset) => [asset.url, asset]));
  for (const record of records) {
    record.media = record.media.map((asset) => assetMap.get(asset.url) || asset);
    record.imageUrl = record.media.find((asset) => asset.kind === 'image')?.url;
    record.videoUrl = record.media.find((asset) => asset.kind === 'video')?.url;
    record.localImagePath = record.media.find((asset) => asset.kind === 'image')?.localPath;
    record.localVideoPath = record.media.find((asset) => asset.kind === 'video')?.localPath;
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: sourceBase,
    attribution: 'Contenido descargado con autorización del autor para trabajo de investigación.',
    categories,
    exerciseCount: records.length,
    assetCount: downloaded.length,
    exercises: records,
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const tsRecords = records.map((record) => ({
    id: `smartworkout-${record.sourceId}`,
    name: record.name,
    primaryMuscle: record.primaryMuscle,
    secondaryMuscles: record.secondaryMuscles,
    equipment: record.equipment,
    instructions: record.instructions.join(' '),
    description: record.description,
    executionSteps: record.instructions,
    indications: record.tips,
    tips: record.tips,
    commonMistakes: record.commonMistakes,
    movementPattern: record.movementPattern,
    imageUrl: record.imageUrl,
    videoUrl: record.videoUrl,
    localImagePath: record.localImagePath,
    localVideoPath: record.localVideoPath,
    sourceUrl: record.sourceUrl,
    sourceProvider: record.sourceProvider,
    isFavorite: false,
    isCustom: false,
  }));
  await writeFile(generatedDataPath, `import { Exercise } from '../types';\n\n// Generated by scripts/scrape-smartworkout.mjs. Source: ${sourceBase}\nexport const SMARTWORKOUT_EXERCISES: Exercise[] = ${JSON.stringify(tsRecords, null, 2)};\n`, 'utf8');
  console.log(`[done] ${records.length} exercises and ${downloaded.length} assets written to ${outDir}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
