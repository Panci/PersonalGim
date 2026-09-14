import {
  Exercise, RoutineCollection, RoutineDay, ExerciseSet, WorkoutSession, WorkoutStats,
  StatsTimeRange, BodyMeasurementRecord, GymMember, MemberStatus, AttendanceRecord,
} from '../types';
import {
  INITIAL_EXERCISES, INITIAL_COLLECTION, INITIAL_WORKOUT_HISTORY,
  INITIAL_BODY_MEASUREMENTS, INITIAL_GYM_MEMBERS, INITIAL_ATTENDANCE_LOGS,
} from './initialData';
import { withExerciseGuidance } from '../data/exerciseGuidance';

type LocalState = {
  version: 1;
  exercises: Exercise[];
  collections: RoutineCollection[];
  workouts: WorkoutSession[];
  measurements: BodyMeasurementRecord[];
  members: GymMember[];
  attendance: AttendanceRecord[];
};

const STORAGE_KEY = 'personalgim.local-data.v1';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const defaults = (): LocalState => ({
  version: 1,
  exercises: clone(INITIAL_EXERCISES),
  collections: [clone(INITIAL_COLLECTION)],
  workouts: clone(INITIAL_WORKOUT_HISTORY),
  measurements: clone(INITIAL_BODY_MEASUREMENTS),
  members: clone(INITIAL_GYM_MEMBERS),
  attendance: clone(INITIAL_ATTENDANCE_LOGS),
});

let state: LocalState = defaults();
let loaded = false;
const storageAvailable = (): boolean => typeof localStorage !== 'undefined';
const validState = (value: unknown): value is LocalState => {
  const candidate = value as Partial<LocalState> | null;
  return Boolean(candidate && candidate.version === 1 && Array.isArray(candidate.exercises) &&
    Array.isArray(candidate.collections) && Array.isArray(candidate.workouts) &&
    Array.isArray(candidate.measurements) && Array.isArray(candidate.members) &&
    Array.isArray(candidate.attendance));
};
const load = (): void => {
  if (loaded) return;
  loaded = true;
  if (!storageAvailable()) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    if (validState(parsed)) {
      const existingIds = new Set(parsed.exercises.map((exercise) => exercise.id));
      const missingExercises = INITIAL_EXERCISES.filter((exercise) => !existingIds.has(exercise.id));
      state = {
        ...parsed,
        exercises: [...parsed.exercises.map(withExerciseGuidance), ...missingExercises],
      };
      if (missingExercises.length > 0) persist();
    }
    else console.warn('Ignoring invalid saved PersonalGim data');
  } catch (error) { console.warn('Unable to load local PersonalGim data', error); }
};
const persist = (): void => {
  if (!storageAvailable()) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (error) { console.warn('Unable to persist local PersonalGim data', error); }
};
const replaceById = <T extends { id: string }>(items: T[], value: T): T[] => [clone(value), ...items.filter(item => item.id !== value.id)];

export const initDatabase = async (): Promise<void> => { load(); persist(); };
export const getExercisesFromDb = (): Exercise[] => { load(); return clone(state.exercises.map(withExerciseGuidance)); };
export const toggleFavoriteInDb = (exerciseId: string): boolean => {
  load(); const exercise = state.exercises.find(item => item.id === exerciseId);
  if (!exercise) return false;
  exercise.isFavorite = !exercise.isFavorite; persist(); return exercise.isFavorite;
};
export const addCustomExerciseToDb = (exercise: Exercise): void => { load(); state.exercises = replaceById(state.exercises, exercise); persist(); };

export const getCollectionsFromDb = (): RoutineCollection[] => { load(); return clone(state.collections); };
export const getRoutineDayDetailFromDb = (dayId: string): RoutineDay | null => {
  load(); const day = state.collections.flatMap(collection => collection.days).find(item => item.id === dayId);
  return day ? clone(day) : null;
};
export const updateRoutineDayNameInDb = (dayId: string, name: string): void => {
  load();
  const day = state.collections.flatMap(collection => collection.days).find(item => item.id === dayId);
  if (!day) { console.warn('Unknown routine day'); return; }
  day.name = name;
  persist();
};
export const updateRoutineDayExerciseSets = (dayId: string, routineExerciseId: string, newSets: ExerciseSet[], restSeconds: number): void => {
  load();
  const day = state.collections.flatMap(collection => collection.days).find(item => item.id === dayId);
  const exercise = day?.exercises.find(item => item.id === routineExerciseId);
  if (!exercise) { console.warn('Routine exercise does not belong to the provided day'); return; }
  exercise.defaultSets = clone(newSets); exercise.targetSets = newSets.length; exercise.targetRestSeconds = restSeconds;
  persist();
};

export const saveWorkoutLogToDb = (workout: WorkoutSession): void => { load(); state.workouts = replaceById(state.workouts, workout); persist(); };
export const getWorkoutHistoryFromDb = (): WorkoutSession[] => { load(); return clone(state.workouts).sort((a, b) => b.startTime.localeCompare(a.startTime)); };
export const getWorkoutStatsFromDb = (range: StatsTimeRange): WorkoutStats => {
  const days = range === '7d' ? 7 : range === '14d' ? 14 : 28;
  const cutoff = Date.now() - days * 86400000;
  const workouts = getWorkoutHistoryFromDb().filter(item => item.isCompleted && new Date(item.startTime).getTime() >= cutoff);
  const exercises = workouts.flatMap(item => item.exercises);
  const sets = exercises.flatMap(item => item.sets).filter(item => item.isCompleted);
  const muscleFrequency: WorkoutStats['muscleFrequency'] = {};
  for (const exercise of exercises) muscleFrequency[exercise.primaryMuscle] = (muscleFrequency[exercise.primaryMuscle] || 0) + exercise.sets.filter(set => set.isCompleted).length;
  const trainingTimeSeconds = workouts.reduce((sum, item) => sum + item.durationSeconds, 0);
  const hours = Math.floor(trainingTimeSeconds / 3600);
  const minutes = Math.floor((trainingTimeSeconds % 3600) / 60);
  return {
    trainingTimeFormatted: `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`,
    trainingTimeSeconds,
    totalKcal: workouts.reduce((sum, item) => sum + item.totalKcal, 0),
    totalExercises: exercises.length,
    totalSets: sets.length,
    totalReps: sets.reduce((sum, item) => sum + item.reps, 0),
    totalVolumeKg: workouts.reduce((sum, item) => sum + item.totalVolumeKg, 0),
    completedWorkoutsCount: workouts.length,
    muscleFrequency,
  };
};

export const saveCustomRoutineToDb = (collection: RoutineCollection): void => { load(); state.collections = replaceById(state.collections, collection); persist(); };
export const updateRoutineCollectionDetailsInDb = (collectionId: string, title: string, subtitle?: string): void => {
  load();
  const collection = state.collections.find(item => item.id === collectionId);
  if (!collection) { console.warn('Unknown routine collection'); return; }
  collection.title = title;
  collection.subtitle = subtitle || undefined;
  persist();
};
export const deleteRoutineFromDb = (collectionId: string): void => { load(); state.collections = state.collections.filter(item => item.id !== collectionId); persist(); };
export const getBodyMeasurementsFromDb = (): BodyMeasurementRecord[] => { load(); return clone(state.measurements).sort((a, b) => b.date.localeCompare(a.date)); };
export const saveBodyMeasurementToDb = (record: BodyMeasurementRecord): void => { load(); state.measurements = replaceById(state.measurements, record); persist(); };
export const getGymMembersFromDb = (): GymMember[] => { load(); return clone(state.members).sort((a, b) => b.enrollmentDate.localeCompare(a.enrollmentDate)); };
export const addGymMemberToDb = (member: GymMember): void => { load(); state.members = replaceById(state.members, member); persist(); };
export const updateGymMemberRoutineInDb = (memberId: string, routineId: string, routineTitle: string): void => {
  load(); const member = state.members.find(item => item.id === memberId);
  if (!member) { console.warn('Unknown gym member'); return; }
  member.assignedRoutineId = routineId; member.assignedRoutineTitle = routineTitle; persist();
};
export const updateGymMemberStatusInDb = (memberId: string, status: MemberStatus): void => {
  load(); const member = state.members.find(item => item.id === memberId);
  if (!member) { console.warn('Unknown gym member'); return; }
  member.status = status; persist();
};
export const getAttendanceLogsFromDb = (): AttendanceRecord[] => { load(); return clone(state.attendance).sort((a, b) => b.timestamp.localeCompare(a.timestamp)); };
export const registerAttendanceToDb = (record: AttendanceRecord): void => { load(); state.attendance = replaceById(state.attendance, record); persist(); };
