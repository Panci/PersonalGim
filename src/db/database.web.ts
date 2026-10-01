import {
  Exercise, RoutineCollection, RoutineDay, ExerciseSet, WorkoutSession, WorkoutStats,
  StatsTimeRange, BodyMeasurementRecord, GymMember, MemberStatus, AttendanceRecord,
} from '../types';
import {
  INITIAL_EXERCISES,
} from './initialData';
import { withExerciseGuidance } from '../data/exerciseGuidance';
import { summarizeRoutineSets } from '../utils/routineProgress';

type LocalState = {
  version: 2 | 3;
  exercises: Exercise[];
  collections: RoutineCollection[];
  routineSyncPending?: boolean;
  workouts: WorkoutSession[];
  measurements: BodyMeasurementRecord[];
  targetWeightKg: number | null;
  members: GymMember[];
  attendance: AttendanceRecord[];
};

// Version 3 intentionally starts with an empty operational workspace. The
// exercise catalog remains available, while demo members, attendance,
// workouts, measurements and routines are not seeded into new web sessions.
const STORAGE_KEY = 'personalgim.local-data.v3';
const LEGACY_OWNER_KEY = `${STORAGE_KEY}.owner`;
let accountStorageKey = STORAGE_KEY;
const LEGACY_STORAGE_KEY = 'personalgim.local-data.v2';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const defaults = (): LocalState => ({
  version: 3,
  exercises: clone(INITIAL_EXERCISES),
  collections: [],
  routineSyncPending: false,
  workouts: [],
  measurements: [],
  targetWeightKg: null,
  members: [],
  attendance: [],
});

let state: LocalState = defaults();
let loaded = false;
const storageAvailable = (): boolean => typeof localStorage !== 'undefined';
const validState = (value: unknown): value is LocalState => {
  const candidate = value as Partial<LocalState> | null;
  return Boolean(candidate && (candidate.version === 2 || candidate.version === 3) && Array.isArray(candidate.exercises) &&
    Array.isArray(candidate.collections) && Array.isArray(candidate.workouts) &&
    Array.isArray(candidate.measurements) && Array.isArray(candidate.members) &&
    Array.isArray(candidate.attendance));
};
// The bundled catalogue (including descriptions and guidance) is several MB.
// Store only custom exercises and favourite flags; reconstruct built-ins from
// the bundle so account-specific data does not exhaust localStorage's quota.
const storageState = (value: LocalState) => ({
  ...value,
  exercises: value.exercises.filter((exercise) => exercise.isCustom || exercise.isFavorite)
    .map((exercise) => exercise.isCustom ? exercise : { id: exercise.id, isFavorite: true, isCustom: false }),
});
const load = (): void => {
  if (loaded) return;
  loaded = true;
  if (!storageAvailable()) return;
  try {
    const currentRaw = localStorage.getItem(accountStorageKey);
    const raw = currentRaw || (accountStorageKey === STORAGE_KEY ? localStorage.getItem(LEGACY_STORAGE_KEY) : null);
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    if (validState(parsed)) {
      // The previous local build contained development data. Start this
      // workspace clean while keeping the built-in exercise catalogue.
      if (!currentRaw) {
        state = defaults();
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        persist();
        return;
      }
      const savedExercises = new Map(parsed.exercises.map((exercise) => [exercise.id, exercise]));
      const exercises = [
        ...INITIAL_EXERCISES.map((exercise) => withExerciseGuidance({
          ...exercise, isFavorite: savedExercises.get(exercise.id)?.isFavorite ?? exercise.isFavorite,
        })),
        ...parsed.exercises.filter((exercise) => exercise.isCustom).map(withExerciseGuidance),
      ];
      const targetWeightKg = typeof parsed.targetWeightKg === 'number' && Number.isFinite(parsed.targetWeightKg)
        ? parsed.targetWeightKg
        : null;
      state = {
        ...parsed,
        version: 3,
        targetWeightKg,
        exercises,
      };
      if (
        parsed.version !== 3 ||
        parsed.targetWeightKg !== targetWeightKg
      ) persist();
    }
    else console.warn('Ignoring invalid saved PersonalGim data');
  } catch (error) { console.warn('Unable to load local PersonalGim data', error); }
};
const persist = (): void => {
  if (!storageAvailable()) return;
  try { localStorage.setItem(accountStorageKey, JSON.stringify(storageState(state))); }
  catch (error) { console.warn('Unable to persist local PersonalGim data', error); }
};
const replaceById = <T extends { id: string }>(items: T[], value: T): T[] => [clone(value), ...items.filter(item => item.id !== value.id)];

export const initDatabase = async (userId?: string): Promise<void> => {
  const nextKey = userId ? `${STORAGE_KEY}.user.${userId}` : STORAGE_KEY;
  if (userId && storageAvailable() && !localStorage.getItem(LEGACY_OWNER_KEY)) {
    // Claim the previous device copy once, preserving unsynced workouts.
    // A later account starts in its own workspace rather than importing it.
    const legacy = localStorage.getItem(STORAGE_KEY);
    if (legacy && !localStorage.getItem(nextKey)) {
      const parsed: unknown = JSON.parse(legacy);
      if (validState(parsed)) {
        const compact = JSON.stringify(storageState(parsed));
        // Compact the existing key first to make room for the account copy.
        localStorage.setItem(STORAGE_KEY, compact);
        localStorage.setItem(nextKey, compact);
      }
    }
    localStorage.setItem(LEGACY_OWNER_KEY, userId);
  }
  if (nextKey !== accountStorageKey) {
    accountStorageKey = nextKey;
    state = defaults();
    loaded = false;
  }
  load(); persist();
};
export const getExercisesFromDb = (): Exercise[] => { load(); return clone(state.exercises.map(withExerciseGuidance)); };
export const toggleFavoriteInDb = (exerciseId: string): boolean => {
  load(); const exercise = state.exercises.find(item => item.id === exerciseId);
  if (!exercise) return false;
  exercise.isFavorite = !exercise.isFavorite; persist(); return exercise.isFavorite;
};
export const addCustomExerciseToDb = (exercise: Exercise): void => { load(); state.exercises = replaceById(state.exercises, exercise); persist(); };

export const getCollectionsFromDb = (): RoutineCollection[] => { load(); return clone(state.collections); };
export const getRoutineSyncPendingFromDb = (): boolean => { load(); return state.routineSyncPending === true; };
export const setRoutineSyncPendingInDb = (pending: boolean): void => { load(); state.routineSyncPending = pending; persist(); };
export const replaceCollectionsInDb = (collections: RoutineCollection[]): void => {
  load();
  state.collections = clone(collections);
  persist();
};
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
  exercise.defaultSets = clone(newSets.map((set) => ({ ...set, isCompleted: false })));
  exercise.targetSets = newSets.length;
  Object.assign(exercise, summarizeRoutineSets(newSets));
  exercise.targetRestSeconds = restSeconds;
  persist();
};

export const updateRoutineDayExerciseOrderInDb = (dayId: string, orderedExerciseIds: string[]): boolean => {
  load();
  const day = state.collections.flatMap(collection => collection.days).find(item => item.id === dayId);
  if (!day || day.exercises.length !== orderedExerciseIds.length) return false;
  const exercisesById = new Map(day.exercises.map(exercise => [exercise.id, exercise]));
  if (new Set(orderedExerciseIds).size !== orderedExerciseIds.length || orderedExerciseIds.some(id => !exercisesById.has(id))) return false;
  day.exercises = orderedExerciseIds.map((id, index) => ({ ...exercisesById.get(id)!, orderIndex: index + 1 }));
  persist();
  return true;
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
export const getTargetWeightFromDb = (): number | null => { load(); return state.targetWeightKg; };
export const saveTargetWeightToDb = (targetWeightKg: number | null): void => { load(); state.targetWeightKg = targetWeightKg; persist(); };
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
