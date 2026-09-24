import { RoutineCollection, RoutineDay, WeekDay } from '../types';

const WEEKDAY_ORDER: WeekDay[] = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];

export interface ScheduledRoutineDay {
  day: RoutineDay;
  weekday: WeekDay;
}

export const getWeeklyRoutineSchedule = (collection: RoutineCollection): ScheduledRoutineDay[] =>
  collection.days
    .flatMap((day) => {
      const weekdays = day.scheduledDays?.length ? day.scheduledDays : [day.dayBadge];
      return [...new Set(weekdays)].map((weekday) => ({ day, weekday }));
    })
    .sort((a, b) => WEEKDAY_ORDER.indexOf(a.weekday) - WEEKDAY_ORDER.indexOf(b.weekday));

export const countScheduledTrainingDays = (collection: RoutineCollection): number =>
  new Set(getWeeklyRoutineSchedule(collection).map(({ weekday }) => weekday)).size;
