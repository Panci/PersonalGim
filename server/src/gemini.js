const WEEKDAYS = new Set(['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom']);
const OBJECTIVES = new Set(['hipertrofia', 'fuerza', 'perdida_grasa', 'salud_general']);
const LEVELS = new Set(['principiante', 'intermedio', 'avanzado']);
const EQUIPMENT = new Set(['barra', 'mancuerna', 'maquina', 'polea', 'peso_corporal', 'cardio', 'otro']);
const SEXES = new Set(['mujer', 'hombre', 'no_especificado']);
const WEEKLY_STRUCTURES = new Set(['repetir_bloques', 'dias_distintos']);

class GeminiRoutineError extends Error {}

const cleanText = (value, limit) => String(value || '').trim().slice(0, limit);

const normalizeRequest = (body = {}) => {
  const sex = cleanText(body.sex, 30);
  const objective = cleanText(body.objective, 40);
  const level = cleanText(body.level, 30);
  const equipment = [...new Set(Array.isArray(body.equipment) ? body.equipment.map((item) => cleanText(item, 30)) : [])];
  const trainingDays = [...new Set(Array.isArray(body.trainingDays) ? body.trainingDays.map((item) => cleanText(item, 10)) : [])];
  const weeklyStructure = cleanText(body.weeklyStructure, 30) || 'repetir_bloques';
  const focus = cleanText(body.focus, 400);
  const catalogSource = Array.isArray(body.exerciseCatalog) ? body.exerciseCatalog : [];
  const exerciseCatalog = [];
  const knownIds = new Set();
  for (const item of catalogSource) {
    if (exerciseCatalog.length >= 300) break;
    const id = cleanText(item?.id, 160);
    const name = cleanText(item?.name, 120);
    const muscle = cleanText(item?.primaryMuscle, 40);
    const itemEquipment = cleanText(item?.equipment, 30);
    if (!id || !name || !EQUIPMENT.has(itemEquipment) || knownIds.has(id)) continue;
    knownIds.add(id);
    exerciseCatalog.push({ id, name, muscle, equipment: itemEquipment });
  }

  if (!SEXES.has(sex) || !OBJECTIVES.has(objective) || !LEVELS.has(level) || !WEEKLY_STRUCTURES.has(weeklyStructure)
    || !equipment.length || !equipment.every((item) => EQUIPMENT.has(item))
    || !trainingDays.length || !trainingDays.every((item) => WEEKDAYS.has(item))
    || exerciseCatalog.length < 8) {
    throw new GeminiRoutineError('Completa sexo, objetivo, nivel, material, días de entrenamiento y al menos ocho ejercicios disponibles.');
  }
  return { sex, objective, level, equipment, trainingDays, weeklyStructure, focus, exerciseCatalog };
};

// Keep the API schema compact. The exercise catalogue can contain hundreds of
// IDs; enforcing all of them as schema enums makes Gemini reject otherwise
// valid requests. `validatePlan` below remains the authoritative allow-list.
const routineSchema = () => ({
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    subtitle: { type: 'STRING' },
    blocks: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          scheduledDays: { type: 'ARRAY', items: { type: 'STRING' } },
          exercises: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                exerciseId: { type: 'STRING' },
                sets: { type: 'INTEGER' },
                repRange: { type: 'STRING' },
                restSeconds: { type: 'INTEGER' },
              },
              required: ['exerciseId', 'sets', 'repRange', 'restSeconds'],
            },
          },
        },
        required: ['name', 'scheduledDays', 'exercises'],
      },
    },
  },
  required: ['title', 'subtitle', 'blocks'],
});

const extractOutputText = (response) => {
  if (typeof response?.output_text === 'string') return response.output_text;
  if (typeof response?.outputText === 'string') return response.outputText;
  for (const step of response?.steps || []) {
    if (step?.type !== 'model_output') continue;
    const text = (step.content || []).filter((item) => item?.type === 'text').map((item) => item.text).join('');
    if (text) return text;
  }
  for (const output of response?.outputs || []) {
    if (typeof output?.text === 'string') return output.text;
    const text = (output?.content || []).filter((item) => item?.type === 'text').map((item) => item.text).join('');
    if (text) return text;
  }
  for (const candidate of response?.candidates || []) {
    const text = (candidate?.content?.parts || []).map((part) => part?.text || '').join('');
    if (text) return text;
  }
  return '';
};

const validatePlan = (plan, input) => {
  const title = cleanText(plan?.title, 100);
  const subtitle = cleanText(plan?.subtitle, 240);
  if (!title || !Array.isArray(plan?.blocks) || plan.blocks.length < 1 || plan.blocks.length > 7) {
    throw new GeminiRoutineError('Gemini no ha devuelto un plan semanal válido. Vuelve a generarlo.');
  }
  const catalogIds = new Set(input.exerciseCatalog.map((item) => item.id));
  const blocks = plan.blocks.map((block) => {
    const name = cleanText(block?.name, 100);
    const scheduledDays = [...new Set(Array.isArray(block?.scheduledDays) ? block.scheduledDays.map((item) => cleanText(item, 10).toLowerCase()) : [])];
    if (!name || !scheduledDays.length || !scheduledDays.every((item) => input.trainingDays.includes(item))) {
      throw new GeminiRoutineError('Gemini ha devuelto días que no pertenecen al plan solicitado. Vuelve a generarlo.');
    }
    const usedExerciseIds = new Set();
    const exercises = (Array.isArray(block?.exercises) ? block.exercises : []).map((exercise) => {
      const exerciseId = cleanText(exercise?.exerciseId, 160);
      const sets = Math.round(Number(exercise?.sets));
      const repRange = cleanText(exercise?.repRange, 30);
      const restSeconds = Math.round(Number(exercise?.restSeconds));
      if (!catalogIds.has(exerciseId) || usedExerciseIds.has(exerciseId) || !Number.isInteger(sets) || sets < 1 || sets > 6
        || !repRange || !Number.isInteger(restSeconds) || restSeconds < 20 || restSeconds > 300) {
        throw new GeminiRoutineError('Gemini ha propuesto un ejercicio o una configuración no válida. Vuelve a generarlo.');
      }
      usedExerciseIds.add(exerciseId);
      return { exerciseId, sets, repRange, restSeconds };
    });
    if (exercises.length < 2 || exercises.length > 10) {
      throw new GeminiRoutineError('Cada rutina propuesta debe tener entre 2 y 10 ejercicios. Vuelve a generarlo.');
    }
    return { name, scheduledDays, exercises };
  });
  const coveredDays = new Set(blocks.flatMap((block) => block.scheduledDays));
  if (input.trainingDays.some((day) => !coveredDays.has(day))) {
    throw new GeminiRoutineError('Gemini no ha cubierto todos los días de entrenamiento solicitados. Vuelve a generarlo.');
  }
  if (input.weeklyStructure === 'dias_distintos') {
    if (blocks.length !== input.trainingDays.length || blocks.some((block) => block.scheduledDays.length !== 1)) {
      throw new GeminiRoutineError('Se solicitó una rutina distinta para cada día y Gemini no ha respetado esa estructura. Vuelve a generarlo.');
    }
    const allExerciseIds = blocks.flatMap((block) => block.exercises.map((exercise) => exercise.exerciseId));
    if (new Set(allExerciseIds).size !== allExerciseIds.length) {
      throw new GeminiRoutineError('Se solicitó usar ejercicios distintos cada día y Gemini ha repetido alguno. Vuelve a generarlo.');
    }
    const muscleByExerciseId = new Map(input.exerciseCatalog.map((exercise) => [exercise.id, exercise.muscle]));
    const muscleSignatures = blocks.map((block) => [...new Set(block.exercises.map((exercise) => muscleByExerciseId.get(exercise.exerciseId)))].sort().join('|'));
    if (new Set(muscleSignatures).size !== muscleSignatures.length) {
      throw new GeminiRoutineError('Se solicitó alternar los grupos musculares y Gemini ha repetido la misma distribución. Vuelve a generarlo.');
    }
  }
  return { title, subtitle: subtitle || 'Plan semanal generado con Gemini y revisable por el monitor.', blocks };
};

const buildPrompt = (input) => `
Eres un asistente para un monitor de gimnasio. Genera una propuesta de plan semanal general y conservadora, no una recomendación médica. El monitor la revisará antes de asignarla. No des consejos para lesiones, embarazo, patologías ni dolor: limita la respuesta a entrenamiento de fuerza general.

Perfil: sexo ${input.sex}; objetivo ${input.objective}; nivel ${input.level}.
Material disponible: ${input.equipment.join(', ')}.
Días de entrenamiento posibles: ${input.trainingDays.join(', ')}.
Organización solicitada: ${input.weeklyStructure === 'dias_distintos'
  ? 'un bloque distinto para CADA día. Cada bloque debe tener exactamente un día asignado; no repitas ejercicios entre bloques y alterna los grupos musculares principales para que los días no tengan la misma distribución.'
  : 'puedes repetir un mismo bloque en varios días cuando sea apropiado.'}
Prioridad indicada por el monitor: ${input.focus || 'ninguna'}.

Organiza el plan en uno o varios bloques de ejercicios. Usa únicamente los IDs de ejercicios del catálogo, exactamente como aparecen. Ajusta volumen y complejidad al nivel. No prescribas kilos: solo series, rango de repeticiones y descansos. Incluye todos los días de entrenamiento solicitados al menos una vez entre los bloques.

Catálogo permitido (id | nombre | músculo principal | material):
${input.exerciseCatalog.map((item) => `${item.id} | ${item.name} | ${item.muscle} | ${item.equipment}`).join('\n')}
`;

// This uses the broadly available generateContent API. A deployment may
// override GEMINI_MODEL with another model enabled for its API key.
const generateGeminiRoutine = async ({ apiKey, body, model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite' }) => {
  const input = normalizeRequest(body);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000);
  let response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(input) }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 3500,
          responseMimeType: 'application/json',
          responseSchema: routineSchema(),
        },
      }),
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw new GeminiRoutineError('Gemini ha tardado demasiado. Inténtalo de nuevo.');
    throw new GeminiRoutineError('No se pudo conectar con Gemini. Inténtalo de nuevo.');
  } finally {
    clearTimeout(timeout);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Gemini's status text is safe to show to the authorised administrator and
    // makes setup issues actionable. It never contains the stored API key.
    const remoteMessage = cleanText(payload?.error?.message, 300);
    if (response.status === 401 || response.status === 403) throw new GeminiRoutineError('La clave de Gemini no es válida o no tiene permiso para este modelo.');
    if (response.status === 429) throw new GeminiRoutineError('Gemini ha alcanzado su límite temporal. Espera unos minutos.');
    const suffix = remoteMessage ? ` (${remoteMessage})` : '';
    throw new GeminiRoutineError(`Gemini no pudo generar la rutina. Inténtalo de nuevo.${suffix}`);
  }
  try {
    const rawText = extractOutputText(payload).replace(/^```json\s*|\s*```$/g, '').trim();
    return validatePlan(JSON.parse(rawText), input);
  } catch (error) {
    if (error instanceof GeminiRoutineError) throw error;
    throw new GeminiRoutineError('Gemini ha devuelto una respuesta no válida. Inténtalo de nuevo.');
  }
};

module.exports = { GeminiRoutineError, generateGeminiRoutine };
