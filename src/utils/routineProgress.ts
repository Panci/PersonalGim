import { ExerciseSet, RoutineCollection, RoutineExercise, WorkoutSession } from '../types';
import { createId } from './ids';

const range = (values: number[]): string => {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  return minimum === maximum ? String(minimum) : `${minimum}-${maximum}`;
};

export const summarizeRoutineSets = (sets: ExerciseSet[]) => ({
  targetRepRange: sets.length ? range(sets.map((set) => set.reps)) : '0',
  targetWeightRange: sets.length ? range(sets.map((set) => set.weightKg)) : '0',
});

// A finished routine becomes the starting point for its next session. Reset
// completion flags but retain every entered rep, weight and set count.
export const applyWorkoutToRoutine = (
  collections: RoutineCollection[],
  workout: WorkoutSession,
): RoutineCollection[] => {
  if (!workout.routineId) return collections;
  return collections.map((collection) => ({
    ...collection,
    days: collection.days.map((day) => {
      if (day.id !== workout.routineId) return day;
      const unusedLogs = [...workout.exercises];
      const exercises = day.exercises.map((routineExercise) => {
        const logIndex = unusedLogs.findIndex((log) => log.routineExerciseId
          ? log.routineExerciseId === routineExercise.id
          : log.exerciseId === routineExercise.exerciseId);
        if (logIndex < 0) return routineExercise;
        const [log] = unusedLogs.splice(logIndex, 1);
        if (!log.sets.length) return routineExercise;
        const defaultSets = log.sets.map((set, index) => ({
          ...set, id: routineExercise.defaultSets[index]?.id || createId('set'),
          setNumber: index + 1, isCompleted: false,
        }));
        return {
          ...routineExercise,
          ...summarizeRoutineSets(defaultSets),
          targetSets: defaultSets.length,
          targetRestSeconds: defaultSets[0]?.restSeconds || routineExercise.targetRestSeconds,
          defaultSets,
        };
      });

      // Exercises added during this workout become part of the routine too.
      const added: RoutineExercise[] = unusedLogs.filter((log) => log.sets.length > 0).map((log, index) => {
        const defaultSets = log.sets.map((set, setIndex) => ({
          ...set, id: createId('set'), setNumber: setIndex + 1, isCompleted: false,
        }));
        return {
          id: createId('routine-ex'), routineId: day.id, exerciseId: log.exerciseId,
          orderIndex: exercises.length + index + 1,
          targetSets: defaultSets.length,
          ...summarizeRoutineSets(defaultSets),
          targetRestSeconds: defaultSets[0]?.restSeconds || 60,
          defaultSets,
        };
      });
      return { ...day, exercises: [...exercises, ...added], exercisesCount: exercises.length + added.length };
    }),
  }));
};
