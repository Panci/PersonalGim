import { MuscleId } from '../types';

export const MUSCLE_LABELS: Record<MuscleId, string> = {
  pectoral: 'Pectoral', biceps: 'Bíceps', triceps: 'Tríceps', hombros: 'Hombros',
  dorsales: 'Dorsales', cuadriceps: 'Cuádriceps', isquiotibiales: 'Isquiotibiales',
  gluteos: 'Glúteos', pantorrillas: 'Gemelos', antebrazo: 'Antebrazo',
  trapecio: 'Trapecio', lumbares: 'Lumbares', abdomen: 'Abdomen', oblicuos: 'Oblicuos',
  abductores: 'Abductores', adductores: 'Aductores', cardio: 'Cardio',
};

export const MUSCLE_OPTIONS = (Object.keys(MUSCLE_LABELS) as MuscleId[])
  .map((id) => ({ id, label: MUSCLE_LABELS[id] }));

export interface ExerciseCategory {
  id: string;
  label: string;
  description: string;
  muscleIds: MuscleId[];
  color: string;
  side: 'front' | 'back';
}

export const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  { id: 'pecho', label: 'Pecho', description: 'Empuje y apertura del torso', muscleIds: ['pectoral'], color: '#FF8A3D', side: 'front' },
  { id: 'espalda', label: 'Espalda', description: 'Dorsales, trapecio y lumbar', muscleIds: ['dorsales', 'trapecio', 'lumbares'], color: '#5BD6C8', side: 'back' },
  { id: 'hombros', label: 'Hombros', description: 'Deltoides y estabilidad superior', muscleIds: ['hombros'], color: '#B294FF', side: 'front' },
  { id: 'piernas', label: 'Piernas', description: 'Fuerza y control del tren inferior', muscleIds: ['cuadriceps', 'isquiotibiales', 'pantorrillas', 'abductores', 'adductores'], color: '#F6C453', side: 'front' },
  { id: 'gluteos', label: 'Glúteos', description: 'Extensión y estabilidad de cadera', muscleIds: ['gluteos'], color: '#FF6FAE', side: 'back' },
  { id: 'biceps', label: 'Bíceps', description: 'Flexión y control del codo', muscleIds: ['biceps'], color: '#65A8FF', side: 'front' },
  { id: 'triceps', label: 'Tríceps', description: 'Extensión y fuerza de empuje', muscleIds: ['triceps'], color: '#A6E66B', side: 'back' },
  { id: 'antebrazos', label: 'Antebrazos', description: 'Agarre y fuerza de muñeca', muscleIds: ['antebrazo'], color: '#FF9BC8', side: 'front' },
  { id: 'abdominales', label: 'Abdominales', description: 'Core, control y transferencia', muscleIds: ['abdomen', 'oblicuos'], color: '#C78BFF', side: 'front' },
  { id: 'cardio', label: 'Cardio', description: 'Resistencia cardiovascular', muscleIds: ['cardio'], color: '#FF8A3D', side: 'front' },
];
