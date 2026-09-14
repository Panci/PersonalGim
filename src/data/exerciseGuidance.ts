import { Exercise, MuscleId } from '../types';

type Guidance = Pick<Exercise, 'executionSteps' | 'indications' | 'movementPattern'>;

const muscleCues: Record<MuscleId, { focus: string; avoid: string; pattern: NonNullable<Exercise['movementPattern']> }> = {
  pectoral: { focus: 'mantén el pecho alto y las escápulas estables', avoid: 'subir los hombros hacia las orejas', pattern: 'empuje' },
  dorsales: { focus: 'lleva los codos hacia la cadera y junta las escápulas', avoid: 'tirar solo con los brazos', pattern: 'traccion' },
  hombros: { focus: 'mantén el cuello largo y el core firme', avoid: 'impulsarte con la zona lumbar', pattern: 'empuje' },
  biceps: { focus: 'conserva los codos quietos junto al torso', avoid: 'balancear el cuerpo', pattern: 'aislamiento' },
  triceps: { focus: 'extiende desde el codo sin abrir los brazos', avoid: 'mover los hombros para ganar recorrido', pattern: 'aislamiento' },
  antebrazo: { focus: 'mueve la muñeca de forma suave y controlada', avoid: 'usar rebotes o dolor articular', pattern: 'aislamiento' },
  trapecio: { focus: 'eleva y desciende los hombros de forma vertical', avoid: 'hacer círculos con los hombros', pattern: 'aislamiento' },
  lumbares: { focus: 'conserva la columna neutra y el abdomen activo', avoid: 'redondear la espalda', pattern: 'bisagra' },
  abdomen: { focus: 'acerca costillas y pelvis con control', avoid: 'tirar del cuello', pattern: 'estabilidad' },
  oblicuos: { focus: 'rota el tronco desde las costillas manteniendo la pelvis estable', avoid: 'girar con impulso', pattern: 'estabilidad' },
  cuadriceps: { focus: 'empuja el suelo con todo el pie y sigue la línea de los pies', avoid: 'dejar que las rodillas colapsen hacia dentro', pattern: 'sentadilla' },
  isquiotibiales: { focus: 'lleva la cadera atrás manteniendo la espalda larga', avoid: 'perder la tensión de la cadena posterior', pattern: 'bisagra' },
  gluteos: { focus: 'empuja con los talones y bloquea la cadera al final', avoid: 'hiperextender la zona lumbar', pattern: 'bisagra' },
  pantorrillas: { focus: 'recorre desde un estiramiento cómodo hasta la punta de los pies', avoid: 'rebotar en la parte baja', pattern: 'aislamiento' },
  abductores: { focus: 'mantén la pelvis estable durante todo el recorrido', avoid: 'usar impulso con el tronco', pattern: 'aislamiento' },
  adductores: { focus: 'cierra las piernas de forma controlada', avoid: 'golpear los topes de la máquina', pattern: 'aislamiento' },
  cardio: { focus: 'mantén una respiración constante y un ritmo sostenible', avoid: 'aumentar la intensidad de golpe', pattern: 'estabilidad' },
};

const equipmentSetup: Record<Exercise['equipment'], string> = {
  barra: 'Ajusta la carga y el agarre antes de iniciar la serie.',
  mancuerna: 'Elige una carga que permita controlar ambas fases por igual.',
  maquina: 'Regula el asiento y los apoyos para alinear las articulaciones con el eje de la máquina.',
  polea: 'Comprueba la altura de la polea y adopta una postura estable antes de tensar el cable.',
  peso_corporal: 'Colócate con apoyos firmes y crea tensión corporal antes de moverte.',
  cardio: 'Selecciona una resistencia que puedas mantener con técnica limpia.',
  otro: 'Prepara el material y prueba el recorrido sin carga antes de la serie.',
};

export const withExerciseGuidance = (exercise: Exercise): Exercise => {
  if (exercise.executionSteps?.length && exercise.indications?.length && exercise.movementPattern) return exercise;

  const cue = muscleCues[exercise.primaryMuscle] || {
    focus: 'mantén una postura estable y controla cada repetición',
    avoid: 'usar impulso o compensaciones',
    pattern: 'aislamiento' as const,
  };
  return {
    ...exercise,
    movementPattern: cue.pattern,
    executionSteps: [
      equipmentSetup[exercise.equipment],
      `Inicia el recorrido con control: ${cue.focus}.`,
      'Haz una pausa breve al final del movimiento y vuelve despacio a la posición inicial.',
    ],
    indications: [
      'Usa un rango de movimiento cómodo, sin dolor ni compensaciones.',
      `Prioriza la técnica; evita ${cue.avoid}.`,
      'Exhala en la fase de esfuerzo e inhala de forma controlada al regresar.',
    ],
  };
};
