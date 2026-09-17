import * as SQLite from 'expo-sqlite';
import {
  Exercise, MuscleId, EquipmentType, RoutineCollection, RoutineDay, ExerciseSet,
  WorkoutSession, WorkoutStats, StatsTimeRange, BodyMeasurementRecord, GymMember,
  MemberStatus, AttendanceRecord, RoutineExercise, WorkoutExerciseLog,
} from '../types';
import {
  INITIAL_EXERCISES,
} from './initialData';
import { withExerciseGuidance } from '../data/exerciseGuidance';

let db: SQLite.SQLiteDatabase | null = null;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
let fallbackExercises: Exercise[] = clone(INITIAL_EXERCISES);
let fallbackCollections: RoutineCollection[] = [];
let fallbackWorkouts: WorkoutSession[] = [];
let fallbackBodyMeasurements: BodyMeasurementRecord[] = [];
let fallbackTargetWeightKg: number | null = null;
let fallbackGymMembers: GymMember[] = [];
let fallbackAttendanceLogs: AttendanceRecord[] = [];

export const getDb = (): SQLite.SQLiteDatabase | null => {
  if (!db) {
    try { db = SQLite.openDatabaseSync('personalgim.db'); } catch (error) { console.warn('Unable to open local database', error); }
  }
  return db;
};

const setStorageId = (parentId: string, set: ExerciseSet) => `${parentId}:${set.id}`;
const nullable = <T,>(value: T | undefined): T | null => value === undefined ? null : value;
const serializeList = (value: string[] | undefined): string | null => value?.length ? JSON.stringify(value) : null;
const parseList = (value: string | null | undefined): string[] | undefined => {
  if (!value) return undefined;
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : undefined; } catch { return undefined; }
};

const saveRoutine = (database: SQLite.SQLiteDatabase, collection: RoutineCollection) => {
  database.runSync('INSERT INTO routine_collections (id, title, subtitle, imageUrl) VALUES (?, ?, ?, ?)', [collection.id, collection.title, nullable(collection.subtitle), nullable(collection.imageUrl)]);
  for (const day of collection.days) {
    database.runSync('INSERT INTO routine_days (id, collectionId, name, dayBadge, estimatedMinutes, estimatedCalories) VALUES (?, ?, ?, ?, ?, ?)', [day.id, collection.id, day.name, day.dayBadge, day.estimatedMinutes, day.estimatedCalories]);
    for (const item of day.exercises) {
      database.runSync('INSERT INTO routine_exercises (id, routineDayId, exerciseId, orderIndex, targetSets, targetRepRange, targetWeightRange, targetRestSeconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [item.id, day.id, item.exerciseId, item.orderIndex, item.targetSets, item.targetRepRange, item.targetWeightRange, item.targetRestSeconds]);
      for (const set of item.defaultSets) {
        database.runSync('INSERT INTO routine_exercise_sets (id, routineExerciseId, sourceSetId, setNumber, type, reps, weightKg, rpe, isCompleted, restSeconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [setStorageId(item.id, set), item.id, set.id, set.setNumber, set.type, set.reps, set.weightKg, nullable(set.rpe), set.isCompleted ? 1 : 0, nullable(set.restSeconds)]);
      }
    }
  }
};

// Older builds could leave a partly-seeded routine after a duplicated set id.
// This repair only fills missing records; it never overwrites an edited routine.
const seedRoutine = (database: SQLite.SQLiteDatabase, collection: RoutineCollection) => {
  database.runSync('INSERT OR IGNORE INTO routine_collections (id, title, subtitle, imageUrl) VALUES (?, ?, ?, ?)', [collection.id, collection.title, nullable(collection.subtitle), nullable(collection.imageUrl)]);
  for (const day of collection.days) {
    database.runSync('INSERT OR IGNORE INTO routine_days (id, collectionId, name, dayBadge, estimatedMinutes, estimatedCalories) VALUES (?, ?, ?, ?, ?, ?)', [day.id, collection.id, day.name, day.dayBadge, day.estimatedMinutes, day.estimatedCalories]);
    for (const item of day.exercises) {
      database.runSync('INSERT OR IGNORE INTO routine_exercises (id, routineDayId, exerciseId, orderIndex, targetSets, targetRepRange, targetWeightRange, targetRestSeconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [item.id, day.id, item.exerciseId, item.orderIndex, item.targetSets, item.targetRepRange, item.targetWeightRange, item.targetRestSeconds]);
      const existingSets = database.getFirstSync<{ count: number }>('SELECT COUNT(*) AS count FROM routine_exercise_sets WHERE routineExerciseId = ?', [item.id])?.count ?? 0;
      if (existingSets === 0) for (const set of item.defaultSets) database.runSync('INSERT OR IGNORE INTO routine_exercise_sets (id, routineExerciseId, sourceSetId, setNumber, type, reps, weightKg, rpe, isCompleted, restSeconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [setStorageId(item.id, set), item.id, set.id, set.setNumber, set.type, set.reps, set.weightKg, nullable(set.rpe), set.isCompleted ? 1 : 0, nullable(set.restSeconds)]);
    }
  }
};

const saveWorkout = (database: SQLite.SQLiteDatabase, workout: WorkoutSession) => {
  database.runSync('INSERT INTO workout_logs (id, routineDayId, name, startTime, endTime, durationSeconds, totalKcal, totalVolumeKg, isCompleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [workout.id, nullable(workout.routineId), workout.name, workout.startTime, nullable(workout.endTime), workout.durationSeconds, workout.totalKcal, workout.totalVolumeKg, workout.isCompleted ? 1 : 0]);
  saveWorkoutDetails(database, workout);
};
const saveWorkoutDetails = (database: SQLite.SQLiteDatabase, workout: WorkoutSession) => {
  for (const exercise of workout.exercises) {
    database.runSync('INSERT INTO workout_exercises (id, workoutId, exerciseId, exerciseName, primaryMuscle, orderIndex, notes) VALUES (?, ?, ?, ?, ?, ?, ?)', [exercise.id, workout.id, exercise.exerciseId, exercise.exerciseName, exercise.primaryMuscle, exercise.orderIndex, nullable(exercise.notes)]);
    for (const set of exercise.sets) {
      database.runSync('INSERT INTO workout_exercise_sets (id, workoutExerciseId, sourceSetId, setNumber, type, reps, weightKg, rpe, isCompleted, restSeconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [setStorageId(exercise.id, set), exercise.id, set.id, set.setNumber, set.type, set.reps, set.weightKg, nullable(set.rpe), set.isCompleted ? 1 : 0, nullable(set.restSeconds)]);
    }
  }
};

const seedWorkout = (database: SQLite.SQLiteDatabase, workout: WorkoutSession) => {
  database.runSync('INSERT OR IGNORE INTO workout_logs (id, routineDayId, name, startTime, endTime, durationSeconds, totalKcal, totalVolumeKg, isCompleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [workout.id, nullable(workout.routineId), workout.name, workout.startTime, nullable(workout.endTime), workout.durationSeconds, workout.totalKcal, workout.totalVolumeKg, workout.isCompleted ? 1 : 0]);
  const exerciseCount = database.getFirstSync<{ count: number }>('SELECT COUNT(*) AS count FROM workout_exercises WHERE workoutId = ?', [workout.id])?.count ?? 0;
  if (exerciseCount === 0) saveWorkoutDetails(database, workout);
};

const saveMeasurement = (database: SQLite.SQLiteDatabase, record: BodyMeasurementRecord) => database.runSync('INSERT OR REPLACE INTO body_measurements (id, date, weightKg, bodyFatPct, chestCm, armLeftCm, armRightCm, waistCm, hipsCm, thighLeftCm, thighRightCm, calfCm, shouldersCm, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [record.id, record.date, record.weightKg, nullable(record.bodyFatPct), nullable(record.chestCm), nullable(record.armLeftCm), nullable(record.armRightCm), nullable(record.waistCm), nullable(record.hipsCm), nullable(record.thighLeftCm), nullable(record.thighRightCm), nullable(record.calfCm), nullable(record.shouldersCm), nullable(record.notes)]);
const saveMember = (database: SQLite.SQLiteDatabase, member: GymMember) => database.runSync('INSERT OR REPLACE INTO gym_members (id, fullName, email, phone, membershipNumber, enrollmentDate, status, objective, level, assignedRoutineId, assignedRoutineTitle, lastWorkoutDate, completedWorkoutsCount, currentWeightKg, avatarUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [member.id, member.fullName, member.email, nullable(member.phone), member.membershipNumber, member.enrollmentDate, member.status, member.objective, member.level, nullable(member.assignedRoutineId), nullable(member.assignedRoutineTitle), nullable(member.lastWorkoutDate), member.completedWorkoutsCount, nullable(member.currentWeightKg), nullable(member.avatarUrl)]);
const saveAttendance = (database: SQLite.SQLiteDatabase, record: AttendanceRecord) => database.runSync('INSERT OR REPLACE INTO attendance_logs (id, member_id, member_name, membership_number, timestamp, type) VALUES (?, ?, ?, ?, ?, ?)', [record.id, record.memberId, record.memberName, record.membershipNumber, record.timestamp, record.type]);

export const initDatabase = async (): Promise<void> => {
  const database = getDb();
  if (!database) return;
  try {
    database.execSync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS exercises (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, primaryMuscle TEXT NOT NULL, secondaryMuscles TEXT NOT NULL, equipment TEXT NOT NULL, instructions TEXT, imageUrl TEXT, isFavorite INTEGER NOT NULL DEFAULT 0, isCustom INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS routine_collections (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, subtitle TEXT, imageUrl TEXT);
      CREATE TABLE IF NOT EXISTS routine_days (id TEXT PRIMARY KEY NOT NULL, collectionId TEXT NOT NULL, name TEXT NOT NULL, dayBadge TEXT NOT NULL, estimatedMinutes INTEGER NOT NULL DEFAULT 45, estimatedCalories INTEGER NOT NULL DEFAULT 400);
      CREATE TABLE IF NOT EXISTS routine_exercises (id TEXT PRIMARY KEY NOT NULL, routineDayId TEXT NOT NULL, exerciseId TEXT NOT NULL, orderIndex INTEGER NOT NULL, targetSets INTEGER NOT NULL DEFAULT 4, targetRepRange TEXT NOT NULL DEFAULT '10-15', targetWeightRange TEXT NOT NULL DEFAULT '40-50', targetRestSeconds INTEGER NOT NULL DEFAULT 60);
      CREATE TABLE IF NOT EXISTS routine_exercise_sets (id TEXT PRIMARY KEY NOT NULL, routineExerciseId TEXT NOT NULL, sourceSetId TEXT, setNumber INTEGER NOT NULL, type TEXT NOT NULL DEFAULT 'normal', reps INTEGER NOT NULL, weightKg REAL NOT NULL, rpe REAL, isCompleted INTEGER NOT NULL DEFAULT 0, restSeconds INTEGER);
      CREATE TABLE IF NOT EXISTS workout_logs (id TEXT PRIMARY KEY NOT NULL, routineDayId TEXT, name TEXT NOT NULL, startTime TEXT NOT NULL, endTime TEXT, durationSeconds INTEGER NOT NULL DEFAULT 0, totalKcal INTEGER NOT NULL DEFAULT 0, totalVolumeKg REAL NOT NULL DEFAULT 0, isCompleted INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS workout_exercises (id TEXT PRIMARY KEY NOT NULL, workoutId TEXT NOT NULL, exerciseId TEXT NOT NULL, exerciseName TEXT NOT NULL, primaryMuscle TEXT NOT NULL, orderIndex INTEGER NOT NULL, notes TEXT);
      CREATE TABLE IF NOT EXISTS workout_exercise_sets (id TEXT PRIMARY KEY NOT NULL, workoutExerciseId TEXT NOT NULL, sourceSetId TEXT, setNumber INTEGER NOT NULL, type TEXT NOT NULL DEFAULT 'normal', reps INTEGER NOT NULL, weightKg REAL NOT NULL, rpe REAL, isCompleted INTEGER NOT NULL DEFAULT 0, restSeconds INTEGER);
      CREATE TABLE IF NOT EXISTS body_measurements (id TEXT PRIMARY KEY NOT NULL, date TEXT NOT NULL, weightKg REAL NOT NULL, bodyFatPct REAL, chestCm REAL, armLeftCm REAL, armRightCm REAL, waistCm REAL, hipsCm REAL, thighLeftCm REAL, thighRightCm REAL, calfCm REAL, shouldersCm REAL, notes TEXT);
      CREATE TABLE IF NOT EXISTS user_preferences (key TEXT PRIMARY KEY NOT NULL, value TEXT);
      CREATE TABLE IF NOT EXISTS gym_members (id TEXT PRIMARY KEY NOT NULL, fullName TEXT NOT NULL, email TEXT NOT NULL, phone TEXT, membershipNumber TEXT NOT NULL, enrollmentDate TEXT NOT NULL, status TEXT NOT NULL, objective TEXT NOT NULL, level TEXT NOT NULL, assignedRoutineId TEXT, assignedRoutineTitle TEXT, lastWorkoutDate TEXT, completedWorkoutsCount INTEGER NOT NULL DEFAULT 0, currentWeightKg REAL, avatarUrl TEXT);
      CREATE TABLE IF NOT EXISTS attendance_logs (id TEXT PRIMARY KEY NOT NULL, member_id TEXT NOT NULL, member_name TEXT NOT NULL, membership_number TEXT NOT NULL, timestamp TEXT NOT NULL, type TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_routine_days_collection ON routine_days(collectionId);
      CREATE INDEX IF NOT EXISTS idx_routine_exercises_day ON routine_exercises(routineDayId);
      CREATE INDEX IF NOT EXISTS idx_routine_sets_exercise ON routine_exercise_sets(routineExerciseId);
      CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON workout_exercises(workoutId);
      CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON workout_exercise_sets(workoutExerciseId);
      CREATE INDEX IF NOT EXISTS idx_workout_logs_start ON workout_logs(startTime);
      CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance_logs(timestamp);
    `);
    for (const statement of [
      'ALTER TABLE routine_exercise_sets ADD COLUMN sourceSetId TEXT', "ALTER TABLE routine_exercise_sets ADD COLUMN type TEXT NOT NULL DEFAULT 'normal'", 'ALTER TABLE routine_exercise_sets ADD COLUMN rpe REAL', 'ALTER TABLE routine_exercise_sets ADD COLUMN isCompleted INTEGER NOT NULL DEFAULT 0', 'ALTER TABLE routine_exercise_sets ADD COLUMN restSeconds INTEGER', 'ALTER TABLE routine_collections ADD COLUMN imageUrl TEXT',
      'ALTER TABLE exercises ADD COLUMN description TEXT', 'ALTER TABLE exercises ADD COLUMN executionSteps TEXT', 'ALTER TABLE exercises ADD COLUMN indications TEXT', 'ALTER TABLE exercises ADD COLUMN tips TEXT', 'ALTER TABLE exercises ADD COLUMN commonMistakes TEXT', 'ALTER TABLE exercises ADD COLUMN videoUrl TEXT', 'ALTER TABLE exercises ADD COLUMN localImagePath TEXT', 'ALTER TABLE exercises ADD COLUMN localVideoPath TEXT', 'ALTER TABLE exercises ADD COLUMN sourceUrl TEXT', 'ALTER TABLE exercises ADD COLUMN sourceProvider TEXT',
    ]) { try { database.execSync(statement); } catch { /* already migrated */ } }
    database.withTransactionSync(() => {
      const currentIds = new Set(INITIAL_EXERCISES.map((exercise) => exercise.id));
      const storedExercises = database.getAllSync<{ id: string; isCustom: number }>('SELECT id, isCustom FROM exercises');
      for (const storedExercise of storedExercises) {
        if (!storedExercise.isCustom && !currentIds.has(storedExercise.id)) {
          database.runSync('DELETE FROM exercises WHERE id = ?', [storedExercise.id]);
        }
      }
      for (const ex of INITIAL_EXERCISES) database.runSync('INSERT OR IGNORE INTO exercises (id, name, primaryMuscle, secondaryMuscles, equipment, instructions, imageUrl, isFavorite, isCustom, description, executionSteps, indications, tips, commonMistakes, videoUrl, localImagePath, localVideoPath, sourceUrl, sourceProvider) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [ex.id, ex.name, ex.primaryMuscle, JSON.stringify(ex.secondaryMuscles), ex.equipment, nullable(ex.instructions), nullable(ex.imageUrl), ex.isFavorite ? 1 : 0, ex.isCustom ? 1 : 0, nullable(ex.description), serializeList(ex.executionSteps), serializeList(ex.indications), serializeList(ex.tips), serializeList(ex.commonMistakes), nullable(ex.videoUrl), nullable(ex.localImagePath), nullable(ex.localVideoPath), nullable(ex.sourceUrl), nullable(ex.sourceProvider)]);
    });
  } catch (error) { console.warn('Unable to initialise local database', error); }
};

export const getExercisesFromDb = (): Exercise[] => {
    const database = getDb(); if (!database) return clone(fallbackExercises).map(withExerciseGuidance);
    try { return database.getAllSync<any>('SELECT * FROM exercises ORDER BY name COLLATE NOCASE').map(row => withExerciseGuidance({ id: row.id, name: row.name, primaryMuscle: row.primaryMuscle as MuscleId, secondaryMuscles: JSON.parse(row.secondaryMuscles || '[]') as MuscleId[], equipment: row.equipment as EquipmentType, instructions: row.instructions || undefined, description: row.description || undefined, executionSteps: parseList(row.executionSteps), indications: parseList(row.indications), tips: parseList(row.tips), commonMistakes: parseList(row.commonMistakes), videoUrl: row.videoUrl || undefined, localImagePath: row.localImagePath || undefined, localVideoPath: row.localVideoPath || undefined, sourceUrl: row.sourceUrl || undefined, sourceProvider: row.sourceProvider || undefined, imageUrl: row.imageUrl || undefined, isFavorite: Boolean(row.isFavorite), isCustom: Boolean(row.isCustom) })); } catch (error) { console.warn('Unable to read exercises', error); return []; }
};
export const toggleFavoriteInDb = (exerciseId: string): boolean => {
  const database = getDb();
  if (!database) { const exercise = fallbackExercises.find(item => item.id === exerciseId); if (!exercise) return false; exercise.isFavorite = !exercise.isFavorite; return exercise.isFavorite; }
  try { const row = database.getFirstSync<{ isFavorite: number }>('SELECT isFavorite FROM exercises WHERE id = ?', [exerciseId]); if (!row) return false; const isFavorite = !Boolean(row.isFavorite); database.runSync('UPDATE exercises SET isFavorite = ? WHERE id = ?', [isFavorite ? 1 : 0, exerciseId]); return isFavorite; } catch (error) { console.warn('Unable to update favorite', error); return false; }
};
export const addCustomExerciseToDb = (exercise: Exercise): void => {
  const database = getDb();
  if (!database) { fallbackExercises = [clone(exercise), ...fallbackExercises.filter(item => item.id !== exercise.id)]; return; }
  try { database.runSync('INSERT OR REPLACE INTO exercises (id, name, primaryMuscle, secondaryMuscles, equipment, instructions, imageUrl, isFavorite, isCustom, description, executionSteps, indications, tips, commonMistakes, videoUrl, localImagePath, localVideoPath, sourceUrl, sourceProvider) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [exercise.id, exercise.name, exercise.primaryMuscle, JSON.stringify(exercise.secondaryMuscles), exercise.equipment, nullable(exercise.instructions), nullable(exercise.imageUrl), exercise.isFavorite ? 1 : 0, nullable(exercise.description), serializeList(exercise.executionSteps), serializeList(exercise.indications), serializeList(exercise.tips), serializeList(exercise.commonMistakes), nullable(exercise.videoUrl), nullable(exercise.localImagePath), nullable(exercise.localVideoPath), nullable(exercise.sourceUrl), nullable(exercise.sourceProvider)]); } catch (error) { console.warn('Unable to save exercise', error); }
};

const readRoutineDay = (database: SQLite.SQLiteDatabase, row: any): RoutineDay => {
  const exercises = database.getAllSync<any>('SELECT * FROM routine_exercises WHERE routineDayId = ? ORDER BY orderIndex', [row.id]).map((item): RoutineExercise => ({ id: item.id, routineId: row.id, exerciseId: item.exerciseId, orderIndex: item.orderIndex, targetSets: item.targetSets, targetRepRange: item.targetRepRange, targetWeightRange: item.targetWeightRange, targetRestSeconds: item.targetRestSeconds, defaultSets: database.getAllSync<any>('SELECT * FROM routine_exercise_sets WHERE routineExerciseId = ? ORDER BY setNumber', [item.id]).map(set => ({ id: set.sourceSetId || set.id, setNumber: set.setNumber, type: set.type || 'normal', reps: set.reps, weightKg: set.weightKg, rpe: set.rpe ?? undefined, isCompleted: Boolean(set.isCompleted), restSeconds: set.restSeconds ?? undefined })) }));
  return { id: row.id, name: row.name, dayBadge: row.dayBadge, estimatedMinutes: row.estimatedMinutes, estimatedCalories: row.estimatedCalories, exercisesCount: exercises.length, exercises };
};
export const getCollectionsFromDb = (): RoutineCollection[] => {
  const database = getDb(); if (!database) return clone(fallbackCollections);
  try { return database.getAllSync<any>('SELECT * FROM routine_collections ORDER BY rowid DESC').map(row => ({ id: row.id, title: row.title, subtitle: row.subtitle || undefined, imageUrl: row.imageUrl || undefined, days: database.getAllSync<any>('SELECT * FROM routine_days WHERE collectionId = ? ORDER BY rowid', [row.id]).map(day => readRoutineDay(database, day)) })); } catch (error) { console.warn('Unable to read routines', error); return []; }
};
export const replaceCollectionsInDb = (collections: RoutineCollection[]): void => {
  const database = getDb();
  if (!database) { fallbackCollections = clone(collections); return; }
  try {
    database.withTransactionSync(() => {
      const collectionIds = database.getAllSync<{ id: string }>('SELECT id FROM routine_collections').map((row) => row.id);
      for (const collectionId of collectionIds) {
        const dayIds = database.getAllSync<{ id: string }>('SELECT id FROM routine_days WHERE collectionId = ?', [collectionId]).map((row) => row.id);
        for (const dayId of dayIds) {
          const exerciseIds = database.getAllSync<{ id: string }>('SELECT id FROM routine_exercises WHERE routineDayId = ?', [dayId]).map((row) => row.id);
          for (const exerciseId of exerciseIds) database.runSync('DELETE FROM routine_exercise_sets WHERE routineExerciseId = ?', [exerciseId]);
          database.runSync('DELETE FROM routine_exercises WHERE routineDayId = ?', [dayId]);
        }
        database.runSync('DELETE FROM routine_days WHERE collectionId = ?', [collectionId]);
      }
      database.runSync('DELETE FROM routine_collections');
      for (const collection of collections) saveRoutine(database, collection);
    });
  } catch (error) { console.warn('Unable to replace routines', error); }
};
export const getRoutineDayDetailFromDb = (dayId: string): RoutineDay | null => {
  const database = getDb(); if (!database) return clone(fallbackCollections.flatMap(collection => collection.days).find(day => day.id === dayId) || null);
  try { const row = database.getFirstSync<any>('SELECT * FROM routine_days WHERE id = ?', [dayId]); return row ? readRoutineDay(database, row) : null; } catch (error) { console.warn('Unable to read routine detail', error); return null; }
};
export const updateRoutineDayNameInDb = (dayId: string, name: string): void => {
  const database = getDb();
  if (!database) {
    const day = fallbackCollections.flatMap(collection => collection.days).find(item => item.id === dayId);
    if (day) day.name = name;
    return;
  }
  try { database.runSync('UPDATE routine_days SET name = ? WHERE id = ?', [name, dayId]); }
  catch (error) { console.warn('Unable to update routine day name', error); }
};
export const updateRoutineDayExerciseSets = (dayId: string, routineExerciseId: string, newSets: ExerciseSet[], restSeconds: number): void => {
  const database = getDb();
  if (!database) { for (const collection of fallbackCollections) { const item = collection.days.find(day => day.id === dayId)?.exercises.find(exercise => exercise.id === routineExerciseId); if (item) { item.defaultSets = clone(newSets); item.targetSets = newSets.length; item.targetRestSeconds = restSeconds; } } return; }
  try { database.withTransactionSync(() => { const found = database.getFirstSync<{ id: string }>('SELECT id FROM routine_exercises WHERE id = ? AND routineDayId = ?', [routineExerciseId, dayId]); if (!found) throw new Error('Routine exercise does not belong to day'); database.runSync('UPDATE routine_exercises SET targetSets = ?, targetRestSeconds = ? WHERE id = ?', [newSets.length, restSeconds, routineExerciseId]); database.runSync('DELETE FROM routine_exercise_sets WHERE routineExerciseId = ?', [routineExerciseId]); for (const set of newSets) database.runSync('INSERT INTO routine_exercise_sets (id, routineExerciseId, sourceSetId, setNumber, type, reps, weightKg, rpe, isCompleted, restSeconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [setStorageId(routineExerciseId, set), routineExerciseId, set.id, set.setNumber, set.type, set.reps, set.weightKg, nullable(set.rpe), set.isCompleted ? 1 : 0, nullable(set.restSeconds)]); }); } catch (error) { console.warn('Unable to update routine sets', error); }
};

export const saveWorkoutLogToDb = (workout: WorkoutSession): void => { const database = getDb(); if (!database) { fallbackWorkouts = [clone(workout), ...fallbackWorkouts.filter(item => item.id !== workout.id)]; return; } try { database.withTransactionSync(() => saveWorkout(database, workout)); } catch (error) { console.warn('Unable to save workout', error); } };
const readWorkouts = (database: SQLite.SQLiteDatabase): WorkoutSession[] => database.getAllSync<any>('SELECT * FROM workout_logs ORDER BY startTime DESC').map(workout => ({ id: workout.id, routineId: workout.routineDayId || undefined, name: workout.name, startTime: workout.startTime, endTime: workout.endTime || undefined, durationSeconds: workout.durationSeconds, totalKcal: workout.totalKcal, totalVolumeKg: workout.totalVolumeKg, isCompleted: Boolean(workout.isCompleted), exercises: database.getAllSync<any>('SELECT * FROM workout_exercises WHERE workoutId = ? ORDER BY orderIndex', [workout.id]).map((exercise): WorkoutExerciseLog => ({ id: exercise.id, workoutId: workout.id, exerciseId: exercise.exerciseId, exerciseName: exercise.exerciseName, primaryMuscle: exercise.primaryMuscle as MuscleId, orderIndex: exercise.orderIndex, notes: exercise.notes || undefined, sets: database.getAllSync<any>('SELECT * FROM workout_exercise_sets WHERE workoutExerciseId = ? ORDER BY setNumber', [exercise.id]).map(set => ({ id: set.sourceSetId || set.id, setNumber: set.setNumber, type: set.type || 'normal', reps: set.reps, weightKg: set.weightKg, rpe: set.rpe ?? undefined, isCompleted: Boolean(set.isCompleted), restSeconds: set.restSeconds ?? undefined })) })) }));
export const getWorkoutHistoryFromDb = (): WorkoutSession[] => { const database = getDb(); if (!database) return clone(fallbackWorkouts); try { return readWorkouts(database); } catch (error) { console.warn('Unable to read workout history', error); return []; } };
export const getWorkoutStatsFromDb = (range: StatsTimeRange): WorkoutStats => {
  const days = range === '7d' ? 7 : range === '14d' ? 14 : 28; const cutoff = Date.now() - days * 86400000;
  const workouts = getWorkoutHistoryFromDb().filter(item => item.isCompleted && new Date(item.startTime).getTime() >= cutoff);
  const totalTimeSeconds = workouts.reduce((sum, item) => sum + item.durationSeconds, 0); const totalKcal = workouts.reduce((sum, item) => sum + item.totalKcal, 0); const totalVolumeKg = workouts.reduce((sum, item) => sum + item.totalVolumeKg, 0);
  const exercises = workouts.flatMap(item => item.exercises); const sets = exercises.flatMap(item => item.sets).filter(set => set.isCompleted); const muscleFrequency: WorkoutStats['muscleFrequency'] = {};
  for (const exercise of exercises) muscleFrequency[exercise.primaryMuscle] = (muscleFrequency[exercise.primaryMuscle] || 0) + exercise.sets.filter(set => set.isCompleted).length;
  const hours = Math.floor(totalTimeSeconds / 3600); const minutes = Math.floor((totalTimeSeconds % 3600) / 60);
  return { trainingTimeFormatted: `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`, trainingTimeSeconds: totalTimeSeconds, totalKcal, totalExercises: exercises.length, totalSets: sets.length, totalReps: sets.reduce((sum, set) => sum + set.reps, 0), totalVolumeKg, completedWorkoutsCount: workouts.length, muscleFrequency };
};

export const saveCustomRoutineToDb = (collection: RoutineCollection): void => { const database = getDb(); if (!database) { fallbackCollections = [clone(collection), ...fallbackCollections.filter(item => item.id !== collection.id)]; return; } try { database.withTransactionSync(() => saveRoutine(database, collection)); } catch (error) { console.warn('Unable to save routine', error); } };
export const updateRoutineCollectionDetailsInDb = (collectionId: string, title: string, subtitle?: string): void => {
  const database = getDb();
  if (!database) {
    const collection = fallbackCollections.find(item => item.id === collectionId);
    if (collection) { collection.title = title; collection.subtitle = subtitle || undefined; }
    return;
  }
  try { database.runSync('UPDATE routine_collections SET title = ?, subtitle = ? WHERE id = ?', [title, nullable(subtitle), collectionId]); }
  catch (error) { console.warn('Unable to update routine details', error); }
};
export const deleteRoutineFromDb = (collectionId: string): void => { const database = getDb(); if (!database) { fallbackCollections = fallbackCollections.filter(item => item.id !== collectionId); return; } try { database.withTransactionSync(() => { const dayIds = database.getAllSync<{ id: string }>('SELECT id FROM routine_days WHERE collectionId = ?', [collectionId]).map(row => row.id); for (const dayId of dayIds) { const exerciseIds = database.getAllSync<{ id: string }>('SELECT id FROM routine_exercises WHERE routineDayId = ?', [dayId]).map(row => row.id); for (const exerciseId of exerciseIds) database.runSync('DELETE FROM routine_exercise_sets WHERE routineExerciseId = ?', [exerciseId]); database.runSync('DELETE FROM routine_exercises WHERE routineDayId = ?', [dayId]); } database.runSync('DELETE FROM routine_days WHERE collectionId = ?', [collectionId]); database.runSync('DELETE FROM routine_collections WHERE id = ?', [collectionId]); }); } catch (error) { console.warn('Unable to delete routine', error); } };

export const getBodyMeasurementsFromDb = (): BodyMeasurementRecord[] => { const database = getDb(); if (!database) return clone(fallbackBodyMeasurements).sort((a, b) => b.date.localeCompare(a.date)); try { return database.getAllSync<BodyMeasurementRecord>('SELECT * FROM body_measurements ORDER BY date DESC'); } catch (error) { console.warn('Unable to read body measurements', error); return []; } };
export const saveBodyMeasurementToDb = (record: BodyMeasurementRecord): void => { const database = getDb(); if (!database) { fallbackBodyMeasurements = [clone(record), ...fallbackBodyMeasurements.filter(item => item.id !== record.id)]; return; } try { saveMeasurement(database, record); } catch (error) { console.warn('Unable to save body measurement', error); } };
export const getTargetWeightFromDb = (): number | null => {
  const database = getDb();
  if (!database) return fallbackTargetWeightKg;
  try {
    const row = database.getFirstSync<{ value: string | null }>('SELECT value FROM user_preferences WHERE key = ?', ['targetWeightKg']);
    if (!row?.value) return null;
    const parsed = Number(row.value);
    return Number.isFinite(parsed) ? parsed : null;
  } catch (error) { console.warn('Unable to read target weight', error); return null; }
};
export const saveTargetWeightToDb = (targetWeightKg: number | null): void => {
  const database = getDb();
  if (!database) { fallbackTargetWeightKg = targetWeightKg; return; }
  try { database.runSync('INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)', ['targetWeightKg', targetWeightKg === null ? null : String(targetWeightKg)]); }
  catch (error) { console.warn('Unable to save target weight', error); }
};
export const getGymMembersFromDb = (): GymMember[] => { const database = getDb(); if (!database) return clone(fallbackGymMembers); try { return database.getAllSync<GymMember>('SELECT * FROM gym_members ORDER BY enrollmentDate DESC'); } catch (error) { console.warn('Unable to read gym members', error); return []; } };
export const addGymMemberToDb = (member: GymMember): void => { const database = getDb(); if (!database) { fallbackGymMembers = [clone(member), ...fallbackGymMembers.filter(item => item.id !== member.id)]; return; } try { saveMember(database, member); } catch (error) { console.warn('Unable to save gym member', error); } };
export const updateGymMemberRoutineInDb = (memberId: string, routineId: string, routineTitle: string): void => { const database = getDb(); if (!database) { const member = fallbackGymMembers.find(item => item.id === memberId); if (member) { member.assignedRoutineId = routineId; member.assignedRoutineTitle = routineTitle; } return; } try { database.runSync('UPDATE gym_members SET assignedRoutineId = ?, assignedRoutineTitle = ? WHERE id = ?', [routineId, routineTitle, memberId]); } catch (error) { console.warn('Unable to assign member routine', error); } };
export const updateGymMemberStatusInDb = (memberId: string, status: MemberStatus): void => { const database = getDb(); if (!database) { const member = fallbackGymMembers.find(item => item.id === memberId); if (member) member.status = status; return; } try { database.runSync('UPDATE gym_members SET status = ? WHERE id = ?', [status, memberId]); } catch (error) { console.warn('Unable to update member status', error); } };
export const getAttendanceLogsFromDb = (): AttendanceRecord[] => { const database = getDb(); if (!database) return clone(fallbackAttendanceLogs).sort((a, b) => b.timestamp.localeCompare(a.timestamp)); try { return database.getAllSync<any>('SELECT * FROM attendance_logs ORDER BY timestamp DESC').map(row => ({ id: row.id, memberId: row.member_id, memberName: row.member_name, membershipNumber: row.membership_number, timestamp: row.timestamp, type: row.type })); } catch (error) { console.warn('Unable to read attendance', error); return []; } };
export const registerAttendanceToDb = (record: AttendanceRecord): void => { const database = getDb(); if (!database) { fallbackAttendanceLogs = [clone(record), ...fallbackAttendanceLogs.filter(item => item.id !== record.id)]; return; } try { saveAttendance(database, record); } catch (error) { console.warn('Unable to save attendance', error); } };
