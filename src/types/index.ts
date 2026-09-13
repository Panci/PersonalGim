export type MuscleId =
  // Front Muscles
  | 'pectoral'
  | 'biceps'
  | 'hombros'
  | 'oblicuos'
  | 'abdomen'
  | 'antebrazo'
  | 'cuadriceps'
  | 'abductores'
  | 'adductores'
  | 'cardio'
  // Back Muscles
  | 'trapecio'
  | 'triceps'
  | 'dorsales'
  | 'lumbares'
  | 'gluteos'
  | 'isquiotibiales'
  | 'pantorrillas';

export type BodySide = 'frente' | 'espalda';

export interface MuscleInfo {
  id: MuscleId;
  name: string;
  side: BodySide;
  x: number;
  y: number;
}

export type EquipmentType =
  | 'barra'
  | 'mancuerna'
  | 'maquina'
  | 'polea'
  | 'peso_corporal'
  | 'cardio'
  | 'otro';

export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: MuscleId;
  secondaryMuscles: MuscleId[];
  equipment: EquipmentType;
  instructions?: string;
  imageUrl?: string;
  isFavorite: boolean;
  isCustom: boolean;
}

export type SetType = 'normal' | 'warmup' | 'drop' | 'failure';

export interface ExerciseSet {
  id: string;
  setNumber: number;
  type: SetType;
  reps: number;
  weightKg: number;
  rpe?: number;
  isCompleted: boolean;
  restSeconds?: number;
}

export interface RoutineExercise {
  id: string;
  routineId: string;
  exerciseId: string;
  orderIndex: number;
  targetSets: number;
  targetRepRange: string;
  targetWeightRange: string;
  targetRestSeconds: number;
  defaultSets: ExerciseSet[];
}

export type WeekDay = 'lun' | 'mar' | 'mie' | 'jue' | 'vie' | 'sab' | 'dom';

export interface RoutineDay {
  id: string;
  name: string;
  dayBadge: WeekDay;
  estimatedMinutes: number;
  estimatedCalories: number;
  exercisesCount: number;
  exercises: RoutineExercise[];
}

export interface RoutineCollection {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  days: RoutineDay[];
}

export interface WorkoutExerciseLog {
  id: string;
  workoutId: string;
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: MuscleId;
  orderIndex: number;
  sets: ExerciseSet[];
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  routineId?: string;
  name: string;
  startTime: string; // ISO 8601
  endTime?: string;
  durationSeconds: number;
  totalKcal: number;
  totalVolumeKg: number;
  exercises: WorkoutExerciseLog[];
  isCompleted: boolean;
}

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  type: 'max_weight' | 'max_volume' | 'max_reps' | 'est_1rm';
  value: number;
  achievedAt: string;
  workoutId: string;
}

export type StatsTimeRange = '7d' | '14d' | '28d';

export interface WorkoutStats {
  trainingTimeFormatted: string;
  trainingTimeSeconds: number;
  totalKcal: number;
  totalExercises: number;
  totalSets: number;
  totalReps: number;
  totalVolumeKg: number;
  completedWorkoutsCount: number;
  muscleFrequency: { [key in MuscleId]?: number };
}

export interface BodyMeasurementRecord {
  id: string;
  date: string; // ISO 8601
  weightKg: number;
  bodyFatPct?: number;
  chestCm?: number;
  armLeftCm?: number;
  armRightCm?: number;
  waistCm?: number;
  hipsCm?: number;
  thighLeftCm?: number;
  thighRightCm?: number;
  calfCm?: number;
  shouldersCm?: number;
  notes?: string;
}

export type MemberStatus = 'activo' | 'inactivo' | 'pendiente';
export type MemberObjective = 'hipertrofia' | 'fuerza' | 'perdida_grasa' | 'salud_general';
export type MemberLevel = 'principiante' | 'intermedio' | 'avanzado';

export interface GymMember {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  membershipNumber: string; // e.g. "SOC-042"
  enrollmentDate: string; // ISO 8601
  status: MemberStatus;
  objective: MemberObjective;
  level: MemberLevel;
  assignedRoutineId?: string;
  assignedRoutineTitle?: string;
  lastWorkoutDate?: string;
  completedWorkoutsCount: number;
  currentWeightKg?: number;
  avatarUrl?: string;
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  membershipNumber: string;
  timestamp: string; // ISO 8601
  type: 'entrada' | 'salida';
}
