import { WorkoutSession } from '../types';

/**
 * Each completed set starts the configured rest timer, so its restSeconds
 * value represents one rest period in the completed workout summary.
 */
export const getCompletedRestSeconds = (session: WorkoutSession): number =>
  session.exercises.reduce(
    (total, exercise) =>
      total +
      exercise.sets.reduce(
        (exerciseTotal, set) =>
          exerciseTotal + (set.isCompleted ? Math.max(0, set.restSeconds || 0) : 0),
        0
      ),
    0
  );

export const formatWorkoutTime = (seconds: number): string => {
  const safeSeconds = Math.max(0, seconds || 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
};
