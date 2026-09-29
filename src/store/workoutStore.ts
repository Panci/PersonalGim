import { create } from 'zustand';
import {
  Exercise,
  MuscleId,
  EquipmentType,
  RoutineCollection,
  RoutineDay,
  WeekDay,
  RoutineExercise,
  ExerciseSet,
  WorkoutSession,
  WorkoutExerciseLog,
  WorkoutStats,
  StatsTimeRange,
  BodySide,
  BodyMeasurementRecord,
  GymMember,
  MemberStatus,
  AttendanceRecord,
  RoutineTemplate,
} from '../types';
import {
  initDatabase,
  getExercisesFromDb,
  toggleFavoriteInDb,
  addCustomExerciseToDb,
  getCollectionsFromDb,
  getRoutineSyncPendingFromDb,
  setRoutineSyncPendingInDb,
  replaceCollectionsInDb,
  getRoutineDayDetailFromDb,
  updateRoutineDayNameInDb,
  updateRoutineDayExerciseSets,
  updateRoutineDayExerciseOrderInDb,
  saveWorkoutLogToDb,
  getWorkoutHistoryFromDb,
  getWorkoutStatsFromDb,
  getBodyMeasurementsFromDb,
  saveBodyMeasurementToDb,
  getTargetWeightFromDb,
  saveTargetWeightToDb,
  saveCustomRoutineToDb,
  updateRoutineCollectionDetailsInDb,
  deleteRoutineFromDb,
  getGymMembersFromDb,
  addGymMemberToDb,
  updateGymMemberRoutineInDb,
  updateGymMemberStatusInDb,
  getAttendanceLogsFromDb,
  registerAttendanceToDb,
} from '../db/database';
import { createId } from '../utils/ids';
import { isMembershipPaymentBlocked } from '../utils/membershipBilling';
import { withExerciseGuidance } from '../data/exerciseGuidance';
import { applyWorkoutToRoutine } from '../utils/routineProgress';
import { getAuthToken } from '../auth/authStorage';
import {
  assignRoutineTemplateRequest,
  createRoutineTemplateRequest,
  getGymMembersRequest,
  getRoutineTemplatesRequest,
  getRoutinesRequest,
  getWorkoutsRequest,
  saveRoutinesRequest,
  saveWorkoutRequest,
} from '../auth/api';

export type MainTab = 'entreno' | 'actividades' | 'ejercicios' | 'cuerpo';
export type EntrenoSegment = 'plan' | 'entreno' | 'rapido';
export type BodyViewMode = 'muscles' | 'metrics';
export type AppRole = 'member' | 'monitor' | 'admin';

const calculateCompletedVolume = (exercises: WorkoutExerciseLog[]): number =>
  exercises.reduce(
    (total, exercise) =>
      total +
      exercise.sets.reduce(
        (exerciseTotal, set) =>
          exerciseTotal +
          (set.isCompleted && Number.isFinite(set.reps) && Number.isFinite(set.weightKg)
            ? Math.max(0, set.reps) * Math.max(0, set.weightKg)
            : 0),
        0
      ),
    0
  );

const isValidSetValue = (value: number, max: number): boolean =>
  Number.isFinite(value) && value >= 0 && value <= max;

// The device copy keeps the app usable offline. When a user has a valid
// session, mirror the whole routine catalogue to their account as well so a
// browser restart, a cleared cache, or another device cannot lose it.
let routineSyncChain: Promise<void> = Promise.resolve();
let workoutSyncInFlight = false;
let workoutSyncQueued = false;
const syncCollectionsToServer = (): void => {
  setRoutineSyncPendingInDb(true);
  useWorkoutStore.setState({ routineSyncStatus: 'syncing' });
  routineSyncChain = routineSyncChain
    .catch(() => undefined)
    .then(async () => {
      const token = await getAuthToken();
      if (!token) throw new Error('Inicia sesión para sincronizar la rutina.');
      const snapshot = getCollectionsFromDb();
      await saveRoutinesRequest(token, snapshot);
      if (JSON.stringify(snapshot) === JSON.stringify(getCollectionsFromDb())) {
        setRoutineSyncPendingInDb(false);
      }
      useWorkoutStore.setState({ routineSyncStatus: getRoutineSyncPendingFromDb() ? 'syncing' : 'idle' });
    });
  void routineSyncChain.catch((error) => {
    console.warn('Unable to sync routines to the server', error);
    useWorkoutStore.setState({ routineSyncStatus: 'error' });
  });
};



interface WorkoutStoreState {
  // Navigation
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  entrenoSegment: EntrenoSegment;
  setEntrenoSegment: (segment: EntrenoSegment) => void;

  // Anatomy
  bodySide: BodySide;
  toggleBodySide: () => void;
  selectMuscle: (muscle: MuscleId) => void;

  // Exercises & Filters
  exercises: Exercise[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedMuscleFilter: MuscleId | null;
  setSelectedMuscleFilter: (muscle: MuscleId | null) => void;
  selectedEquipmentFilter: EquipmentType | 'todos';
  setSelectedEquipmentFilter: (eq: EquipmentType | 'todos') => void;
  showFavoritesOnly: boolean;
  toggleFavoritesFilter: () => void;
  toggleFavorite: (exerciseId: string) => void;
  addCustomExercise: (ex: Omit<Exercise, 'id' | 'isCustom'>) => void;

  // Routine & Collection
  collections: RoutineCollection[];
  selectedCollection: RoutineCollection | null;
  setSelectedCollection: (col: RoutineCollection | null) => void;
  selectedDay: RoutineDay | null;
  selectedWeekday: WeekDay | null;
  setSelectedDay: (day: RoutineDay | null, weekday?: WeekDay) => void;
  editingExercise: { dayId: string; routineExerciseId: string; exercise: Exercise; sets: ExerciseSet[]; restSeconds: number } | null;
  setEditingExercise: (item: { dayId: string; routineExerciseId: string; exercise: Exercise; sets: ExerciseSet[]; restSeconds: number } | null) => void;
  updateRoutineDayName: (dayId: string, name: string) => void;
  updateExerciseSets: (dayId: string, routineExerciseId: string, sets: ExerciseSet[], restSeconds: number) => void;
  addExerciseToRoutineDay: (dayId: string, exerciseId: string) => void;
  removeExerciseFromRoutineDay: (dayId: string, routineExerciseId: string) => void;
  moveExerciseInRoutineDay: (dayId: string, routineExerciseId: string, direction: -1 | 1) => void;
  showCreateRoutineModal: boolean;
  setShowCreateRoutineModal: (show: boolean) => void;
  saveNewCustomRoutine: (routine: RoutineCollection) => void;
  syncRoutines: () => Promise<void>;
  routineSyncStatus: 'idle' | 'syncing' | 'error';
  updateRoutineCollectionDetails: (routineId: string, title: string, subtitle?: string) => void;
  deleteCustomRoutine: (routineId: string) => void;
  routineTemplates: RoutineTemplate[];
  loadSharedGymData: () => Promise<void>;
  createRoutineTemplate: (template: Omit<RoutineTemplate, 'createdAt' | 'updatedAt'>) => Promise<void>;
  assignRoutineTemplateToMember: (memberId: string, templateId: string) => Promise<void>;

  // Body & Measurements
  bodyViewMode: BodyViewMode;
  setBodyViewMode: (mode: BodyViewMode) => void;
  bodyMeasurements: BodyMeasurementRecord[];
  addBodyMeasurement: (record: Omit<BodyMeasurementRecord, 'id'>) => void;
  targetWeightKg: number | null;
  setTargetWeightKg: (targetWeightKg: number | null) => void;

  // Gym Admin & Members Management
  currentRole: AppRole;
  setCurrentRole: (role: AppRole) => void;
  activeMember: GymMember | null;
  setActiveMember: (member: GymMember | null) => void;
  gymMembers: GymMember[];
  selectedMemberForDetail: GymMember | null;
  setSelectedMemberForDetail: (member: GymMember | null) => void;
  addGymMember: (data: {
    userId?: string;
    fullName: string;
    email: string;
    phone?: string;
    objective: GymMember['objective'];
    level: GymMember['level'];
    assignedRoutineId?: string;
    assignedRoutineTitle?: string;
    currentWeightKg?: number;
  }) => void;
  assignRoutineToMember: (memberId: string, routineId: string, routineTitle: string) => void;
  toggleMemberStatus: (memberId: string) => void;
  attendanceLogs: AttendanceRecord[];
  registerAttendance: (memberId: string, type?: 'entrada' | 'salida') => void;

  // Digital Pass / QR Modal
  showQrPassModal: boolean;
  setShowQrPassModal: (show: boolean) => void;

  // 1RM Calculator Modal
  showOneRmModal: boolean;
  setShowOneRmModal: (show: boolean) => void;
  targetOneRmExercise: Exercise | null;
  openOneRmModal: (exercise?: Exercise) => void;

  // Active Workout Session
  activeWorkout: WorkoutSession | null;
  isWorkoutActive: boolean;
  startWorkoutFromDay: (day: RoutineDay) => void;
  startQuickWorkout: () => void;
  toggleCompleteSet: (exerciseIndex: number, setIndex: number) => void;
  updateSetValues: (exerciseIndex: number, setIndex: number, reps: number, weightKg: number) => void;
  addExerciseToActiveWorkout: (exerciseId: string) => void;
  removeExerciseFromActiveWorkout: (exerciseIndex: number) => void;
  addSetToExercise: (exerciseIndex: number) => void;
  removeSetFromExercise: (exerciseIndex: number, setIndex: number) => void;
  finishActiveWorkout: () => void;
  cancelActiveWorkout: () => void;

  // Rest Timer
  restSecondsLeft: number;
  totalRestSeconds: number;
  isRestTimerRunning: boolean;
  startRestTimer: (seconds?: number) => void;
  pauseRestTimer: () => void;
  resumeRestTimer: () => void;
  adjustRestTimer: (diff: number) => void;
  stopRestTimer: () => void;
  tickRestTimer: () => void;

  // Activities & Stats
  statsRange: StatsTimeRange;
  setStatsRange: (range: StatsTimeRange) => void;
  stats: WorkoutStats;
  history: WorkoutSession[];
  workoutSyncStatus: 'idle' | 'syncing' | 'error';
  syncWorkouts: () => Promise<void>;
  loadInitialData: () => Promise<void>;
}

export const useWorkoutStore = create<WorkoutStoreState>((set, get) => ({
  // Navigation
  activeTab: 'entreno',
  setActiveTab: (tab) => set({ activeTab: tab }),
  entrenoSegment: 'entreno',
  setEntrenoSegment: (segment) => set({ entrenoSegment: segment }),

  // Anatomy
  bodySide: 'frente',
  toggleBodySide: () => set((state) => ({ bodySide: state.bodySide === 'frente' ? 'espalda' : 'frente' })),
  selectMuscle: (muscle) => {
    set({
      selectedMuscleFilter: muscle,
      searchQuery: '',
      selectedEquipmentFilter: 'todos',
      showFavoritesOnly: false,
      activeTab: 'ejercicios',
    });
  },

  // Exercises
  exercises: [],
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectedMuscleFilter: null,
  setSelectedMuscleFilter: (muscle) => set({ selectedMuscleFilter: muscle }),
  selectedEquipmentFilter: 'todos',
  setSelectedEquipmentFilter: (eq) => set({ selectedEquipmentFilter: eq }),
  showFavoritesOnly: false,
  toggleFavoritesFilter: () => set((s) => ({ showFavoritesOnly: !s.showFavoritesOnly })),
  toggleFavorite: (exerciseId) => {
    const isFav = toggleFavoriteInDb(exerciseId);
    set((s) => ({
      exercises: s.exercises.map((e) => (e.id === exerciseId ? { ...e, isFavorite: isFav } : e)),
    }));
  },
  addCustomExercise: (exData) => {
    const newEx: Exercise = withExerciseGuidance({
      ...exData,
      id: createId('custom'),
      isCustom: true,
    });
    addCustomExerciseToDb(newEx);
    set((s) => ({ exercises: [newEx, ...s.exercises] }));
  },

  // Routines
  collections: [],
  selectedCollection: null,
  setSelectedCollection: (col) =>
    set((state) => {
      const selectedDay = state.selectedDay && col?.days.some((day) => day.id === state.selectedDay?.id)
        ? state.selectedDay
        : null;
      return {
        selectedCollection: col,
        selectedDay,
        selectedWeekday: selectedDay ? state.selectedWeekday : null,
      };
    }),
  selectedDay: null,
  selectedWeekday: null,
  setSelectedDay: (day, weekday) => set({ selectedDay: day, selectedWeekday: day ? (weekday ?? day.dayBadge) : null }),
  editingExercise: null,
  setEditingExercise: (item) => set({ editingExercise: item }),
  updateRoutineDayName: (dayId, name) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    updateRoutineDayNameInDb(dayId, trimmedName);
    const updatedCollections = getCollectionsFromDb();
    const updatedCollection = updatedCollections.find((collection) =>
      collection.days.some((day) => day.id === dayId)
    );
    const updatedDay = updatedCollection?.days.find((day) => day.id === dayId) ?? null;
    set({
      collections: [...updatedCollections],
      selectedCollection: updatedCollection ?? get().selectedCollection,
      selectedDay: updatedDay,
    });
    syncCollectionsToServer();
  },
  updateExerciseSets: (dayId, routineExerciseId, sets, restSeconds) => {
    updateRoutineDayExerciseSets(dayId, routineExerciseId, sets, restSeconds);
    const updatedCollections = getCollectionsFromDb();
    const updatedDay = getRoutineDayDetailFromDb(dayId);
    const updatedCollection = updatedCollections.find((collection) =>
      collection.days.some((day) => day.id === dayId)
    );
    set({
      collections: [...updatedCollections],
      selectedDay: updatedDay,
      selectedCollection: updatedCollection ?? get().selectedCollection,
      editingExercise: null,
    });
    syncCollectionsToServer();
  },
  addExerciseToRoutineDay: (dayId, exerciseId) => {
    const collection = get().collections.find((item) => item.days.some((day) => day.id === dayId));
    const exercise = get().exercises.find((item) => item.id === exerciseId);
    if (!collection || !exercise) return;

    const newRoutineExercise: RoutineExercise = {
      id: createId('routine-ex'),
      routineId: dayId,
      exerciseId: exercise.id,
      orderIndex: 0,
      targetSets: 1,
      targetRepRange: '10',
      targetWeightRange: '0',
      targetRestSeconds: 60,
      defaultSets: [
        {
          id: createId('set'),
          setNumber: 1,
          type: 'normal',
          reps: 10,
          weightKg: 0,
          isCompleted: false,
          restSeconds: 60,
        },
      ],
    };

    const updatedCollection: RoutineCollection = {
      ...collection,
      days: collection.days.map((day) => {
        if (day.id !== dayId) return day;
        const updatedExercises = [
          ...day.exercises,
          { ...newRoutineExercise, orderIndex: day.exercises.length + 1 },
        ];
        return { ...day, exercises: updatedExercises, exercisesCount: updatedExercises.length };
      }),
    };

    saveCustomRoutineToDb(updatedCollection);
    const updatedCollections = getCollectionsFromDb();
    const persistedCollection = updatedCollections.find((item) => item.id === collection.id);
    set({
      collections: [...updatedCollections],
      selectedCollection: persistedCollection ?? get().selectedCollection,
      selectedDay: persistedCollection?.days.find((day) => day.id === dayId) ?? get().selectedDay,
    });
    syncCollectionsToServer();
  },
  removeExerciseFromRoutineDay: (dayId, routineExerciseId) => {
    const collection = get().collections.find((item) => item.days.some((day) => day.id === dayId));
    if (!collection) return;

    const updatedCollection: RoutineCollection = {
      ...collection,
      days: collection.days.map((day) => {
        if (day.id !== dayId) return day;
        const updatedExercises = day.exercises
          .filter((exercise) => exercise.id !== routineExerciseId)
          .map((exercise, index) => ({ ...exercise, orderIndex: index + 1 }));
        return { ...day, exercises: updatedExercises, exercisesCount: updatedExercises.length };
      }),
    };

    saveCustomRoutineToDb(updatedCollection);
    const updatedCollections = getCollectionsFromDb();
    const persistedCollection = updatedCollections.find((item) => item.id === collection.id);
    set({
      collections: [...updatedCollections],
      selectedCollection: persistedCollection ?? get().selectedCollection,
      selectedDay: persistedCollection?.days.find((day) => day.id === dayId) ?? get().selectedDay,
    });
    syncCollectionsToServer();
  },
  moveExerciseInRoutineDay: (dayId, routineExerciseId, direction) => {
    const collection = get().collections.find(item => item.days.some(day => day.id === dayId));
    const day = collection?.days.find(item => item.id === dayId);
    if (!collection || !day) return;
    const exerciseIndex = day.exercises.findIndex(item => item.id === routineExerciseId);
    const targetIndex = exerciseIndex + direction;
    if (exerciseIndex < 0 || targetIndex < 0 || targetIndex >= day.exercises.length) return;
    const orderedExerciseIds = day.exercises.map(item => item.id);
    [orderedExerciseIds[exerciseIndex], orderedExerciseIds[targetIndex]] =
      [orderedExerciseIds[targetIndex], orderedExerciseIds[exerciseIndex]];
    if (!updateRoutineDayExerciseOrderInDb(dayId, orderedExerciseIds)) return;
    const updatedCollections = getCollectionsFromDb();
    const updatedCollection = updatedCollections.find(item => item.id === collection.id);
    set({
      collections: updatedCollections,
      selectedCollection: updatedCollection ?? get().selectedCollection,
      selectedDay: updatedCollection?.days.find(item => item.id === dayId) ?? get().selectedDay,
    });
    syncCollectionsToServer();
  },
  showCreateRoutineModal: false,
  setShowCreateRoutineModal: (show) => set({ showCreateRoutineModal: show }),
  saveNewCustomRoutine: (routine) => {
    saveCustomRoutineToDb(routine);
    const updatedCollections = getCollectionsFromDb();
    const savedRoutine = updatedCollections.find((collection) => collection.id === routine.id);
    set({
      collections: [...updatedCollections],
      selectedCollection: savedRoutine ?? get().selectedCollection,
      showCreateRoutineModal: false,
    });
    syncCollectionsToServer();
  },
  updateRoutineCollectionDetails: (routineId, title, subtitle) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    updateRoutineCollectionDetailsInDb(routineId, trimmedTitle, subtitle?.trim());
    const updatedCollections = getCollectionsFromDb();
    const selected = updatedCollections.find((collection) => collection.id === routineId);
    set({
      collections: [...updatedCollections],
      selectedCollection: selected ?? get().selectedCollection,
    });
    syncCollectionsToServer();
  },
  deleteCustomRoutine: (routineId) => {
    deleteRoutineFromDb(routineId);
    const updatedCollections = getCollectionsFromDb();
    const selected = get().selectedCollection;
    set({
      collections: [...updatedCollections],
      selectedCollection: selected?.id === routineId ? null : selected,
      selectedDay: selected?.id === routineId ? null : get().selectedDay,
      selectedWeekday: selected?.id === routineId ? null : get().selectedWeekday,
    });
    syncCollectionsToServer();
  },
  routineTemplates: [],
  routineSyncStatus: 'idle',
  loadSharedGymData: async () => {
    const token = await getAuthToken();
    if (!token) return;
    const [members, templates] = await Promise.all([
      getGymMembersRequest(token),
      getRoutineTemplatesRequest(token),
    ]);
    set({ gymMembers: members, routineTemplates: templates });
  },
  createRoutineTemplate: async (template) => {
    const token = await getAuthToken();
    if (!token) throw new Error('La sesión ha caducado. Vuelve a iniciar sesión.');
    const created = await createRoutineTemplateRequest(token, template);
    set((state) => ({
      routineTemplates: [created, ...state.routineTemplates.filter((item) => item.id !== created.id)],
    }));
  },
  assignRoutineTemplateToMember: async (memberId, templateId) => {
    const token = await getAuthToken();
    if (!token) throw new Error('La sesión ha caducado. Vuelve a iniciar sesión.');
    const assigned = await assignRoutineTemplateRequest(token, memberId, templateId);
    const updateMember = (member: GymMember) => member.id === memberId
      ? { ...member, assignedRoutineId: assigned.assignedRoutineId, assignedRoutineTitle: assigned.assignedRoutineTitle }
      : member;
    set((state) => ({
      gymMembers: state.gymMembers.map(updateMember),
      selectedMemberForDetail: state.selectedMemberForDetail && updateMember(state.selectedMemberForDetail),
      activeMember: state.activeMember && updateMember(state.activeMember),
    }));
  },
  syncRoutines: async () => {
    set({ routineSyncStatus: 'syncing' });
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Inicia sesión para sincronizar las rutinas.');
      await routineSyncChain.catch(() => undefined);
      const remoteCollections = await getRoutinesRequest(token);
      const localCollections = getCollectionsFromDb();
      if (getRoutineSyncPendingFromDb()) {
        await saveRoutinesRequest(token, localCollections);
        setRoutineSyncPendingInDb(false);
        set({ collections: localCollections, routineSyncStatus: 'idle' });
        return;
      }
      if (remoteCollections.length === 0) {
        if (localCollections.length > 0) await saveRoutinesRequest(token, localCollections);
        set({ routineSyncStatus: 'idle' });
        return;
      }
      replaceCollectionsInDb(remoteCollections);
      set({ collections: getCollectionsFromDb(), routineSyncStatus: 'idle' });
    } catch (error) {
      set({ routineSyncStatus: 'error' });
      throw error;
    }
  },

  // Body & Measurements
  bodyViewMode: 'muscles',
  setBodyViewMode: (mode) => set({ bodyViewMode: mode }),
  bodyMeasurements: [],
  addBodyMeasurement: (recData) => {
    const optionalValues = [
      recData.bodyFatPct,
      recData.chestCm,
      recData.armLeftCm,
      recData.armRightCm,
      recData.waistCm,
      recData.hipsCm,
      recData.thighLeftCm,
      recData.thighRightCm,
      recData.calfCm,
      recData.shouldersCm,
    ];
    if (
      !Number.isFinite(recData.weightKg) ||
      recData.weightKg < 20 ||
      recData.weightKg > 500 ||
      optionalValues.some((value) => value !== undefined && !Number.isFinite(value))
    ) {
      return;
    }
    const newRecord: BodyMeasurementRecord = {
      ...recData,
      id: createId('bm'),
    };
    saveBodyMeasurementToDb(newRecord);
    const updated = getBodyMeasurementsFromDb();
    set({ bodyMeasurements: [...updated] });
  },
  targetWeightKg: null,
  setTargetWeightKg: (targetWeightKg) => {
    if (
      targetWeightKg !== null &&
      (!Number.isFinite(targetWeightKg) || targetWeightKg < 20 || targetWeightKg > 500)
    ) {
      return;
    }
    saveTargetWeightToDb(targetWeightKg);
    set({ targetWeightKg });
  },

  // Gym Admin & Members Management
  currentRole: 'member',
  setCurrentRole: (role) => set({ currentRole: role }),
  activeMember: null,
  setActiveMember: (member) => set({ activeMember: member }),
  gymMembers: [],
  selectedMemberForDetail: null,
  setSelectedMemberForDetail: (member) => set({ selectedMemberForDetail: member }),
  addGymMember: (data) => {
    const email = data.email.trim().toLowerCase();
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      (data.currentWeightKg !== undefined &&
        (!Number.isFinite(data.currentWeightKg) || data.currentWeightKg < 20 || data.currentWeightKg > 500))
    ) {
      return;
    }
    const highestMemberNumber = get().gymMembers.reduce((highest, member) => {
      const matched = /^SOC-(\d+)$/.exec(member.membershipNumber);
      return Math.max(highest, matched ? Number(matched[1]) : 0);
    }, 0);
    const newMem: GymMember = {
      id: createId('mem'),
      userId: data.userId,
      membershipNumber: `SOC-${String(highestMemberNumber + 1).padStart(3, '0')}`,
      fullName: data.fullName,
      email,
      phone: data.phone,
      enrollmentDate: new Date().toISOString(),
      status: 'activo',
      objective: data.objective,
      level: data.level,
      assignedRoutineId: data.assignedRoutineId,
      assignedRoutineTitle: data.assignedRoutineTitle,
      currentWeightKg: data.currentWeightKg,
      completedWorkoutsCount: 0,
    };
    addGymMemberToDb(newMem);
    const updated = getGymMembersFromDb();
    set({ gymMembers: [...updated] });
  },
  assignRoutineToMember: (memberId, routineId, routineTitle) => {
    updateGymMemberRoutineInDb(memberId, routineId, routineTitle);
    const updated = getGymMembersFromDb();
    const sel = get().selectedMemberForDetail;
    const active = get().activeMember;
    set({
      gymMembers: [...updated],
      selectedMemberForDetail: sel && sel.id === memberId ? { ...sel, assignedRoutineId: routineId, assignedRoutineTitle: routineTitle } : sel,
      activeMember: active && active.id === memberId ? { ...active, assignedRoutineId: routineId, assignedRoutineTitle: routineTitle } : active,
    });
  },
  toggleMemberStatus: (memberId) => {
    const mem = get().gymMembers.find((m) => m.id === memberId);
    if (!mem) return;
    const newStatus: MemberStatus = mem.status === 'activo' ? 'inactivo' : 'activo';
    updateGymMemberStatusInDb(memberId, newStatus);
    const updated = getGymMembersFromDb();
    const sel = get().selectedMemberForDetail;
    const active = get().activeMember;
    set({
      gymMembers: [...updated],
      selectedMemberForDetail: sel && sel.id === memberId ? { ...sel, status: newStatus } : sel,
      activeMember: active && active.id === memberId ? { ...active, status: newStatus } : active,
    });
  },
  attendanceLogs: [],
  registerAttendance: (memberId, type = 'entrada') => {
    const mem = get().gymMembers.find((m) => m.id === memberId);
    if (!mem) return;
    if (type === 'entrada' && isMembershipPaymentBlocked(mem)) return;
    const newRecord: AttendanceRecord = {
      id: createId('att'),
      memberId: mem.id,
      memberName: mem.fullName,
      membershipNumber: mem.membershipNumber,
      timestamp: new Date().toISOString(),
      type,
    };
    registerAttendanceToDb(newRecord);
    const updatedLogs = getAttendanceLogsFromDb();
    set({ attendanceLogs: [...updatedLogs] });
  },

  // Digital Pass / QR Modal
  showQrPassModal: false,
  setShowQrPassModal: (show) => set({ showQrPassModal: show }),

  // 1RM Calculator Modal
  showOneRmModal: false,
  setShowOneRmModal: (show) => set({ showOneRmModal: show }),
  targetOneRmExercise: null,
  openOneRmModal: (exercise) => set({ showOneRmModal: true, targetOneRmExercise: exercise || null }),

  // Active Workout Session
  activeWorkout: null,
  isWorkoutActive: false,
  startWorkoutFromDay: (day) => {
    const routineDay = getRoutineDayDetailFromDb(day.id) || day;
    const exercisesList = get().exercises;
    const workoutId = createId('workout');
    const workoutExercises: WorkoutExerciseLog[] = routineDay.exercises.map((re, idx) => {
      const exObj = exercisesList.find((e) => e.id === re.exerciseId);
      return {
        id: createId('w-log'),
        workoutId,
        exerciseId: re.exerciseId,
        exerciseName: exObj ? exObj.name : 'Ejercicio',
        primaryMuscle: exObj ? exObj.primaryMuscle : 'pectoral',
        orderIndex: idx + 1,
        sets: re.defaultSets.map((s) => ({
          id: createId('set'),
          setNumber: s.setNumber,
          type: s.type,
          reps: s.reps,
          weightKg: s.weightKg,
          isCompleted: false,
          restSeconds: re.targetRestSeconds || 60,
        })),
      };
    });

    const session: WorkoutSession = {
      id: workoutId,
      routineId: routineDay.id,
      name: routineDay.name,
      startTime: new Date().toISOString(),
      durationSeconds: 0,
      totalKcal: routineDay.estimatedCalories || 400,
      totalVolumeKg: 0,
      exercises: workoutExercises,
      isCompleted: false,
    };

    set({
      activeWorkout: session,
      isWorkoutActive: true,
      selectedDay: null,
      selectedWeekday: null,
    });
  },
  startQuickWorkout: () => {
    const session: WorkoutSession = {
      id: createId('workout-quick'),
      name: 'Entrenamiento Rápido',
      startTime: new Date().toISOString(),
      durationSeconds: 0,
      totalKcal: 350,
      totalVolumeKg: 0,
      exercises: [],
      isCompleted: false,
    };

    set({
      activeWorkout: session,
      isWorkoutActive: true,
    });
  },
  toggleCompleteSet: (exerciseIndex, setIndex) => {
    const active = get().activeWorkout;
    if (!active) return;

    const targetEx = active.exercises[exerciseIndex];
    if (!targetEx) return;

    const targetSet = targetEx.sets[setIndex];
    if (!targetSet) return;

    const newCompleted = !targetSet.isCompleted;
    const updatedExercises = active.exercises.map((exercise, currentExerciseIndex) =>
      currentExerciseIndex !== exerciseIndex
        ? exercise
        : {
            ...exercise,
            sets: exercise.sets.map((set, currentSetIndex) =>
              currentSetIndex === setIndex ? { ...set, isCompleted: newCompleted } : set
            ),
          }
    );

    set({
      activeWorkout: {
        ...active,
        exercises: updatedExercises,
        totalVolumeKg: calculateCompletedVolume(updatedExercises),
      },
    });

    // If marked completed, auto-trigger rest timer!
    if (newCompleted) {
      const restDuration = targetSet.restSeconds || 60;
      get().startRestTimer(restDuration);
    }
  },
  updateSetValues: (exerciseIndex, setIndex, reps, weightKg) => {
    const active = get().activeWorkout;
    if (!active) return;
    if (!isValidSetValue(reps, 1_000) || reps < 1 || !isValidSetValue(weightKg, 2_000)) return;

    if (!active.exercises[exerciseIndex]?.sets[setIndex]) return;
    const updatedExercises = active.exercises.map((exercise, currentExerciseIndex) =>
      currentExerciseIndex !== exerciseIndex
        ? exercise
        : {
            ...exercise,
            sets: exercise.sets.map((set, currentSetIndex) =>
              currentSetIndex === setIndex ? { ...set, reps, weightKg } : set
            ),
          }
    );
    set({
      activeWorkout: {
        ...active,
        exercises: updatedExercises,
        totalVolumeKg: calculateCompletedVolume(updatedExercises),
      },
    });
  },
  addExerciseToActiveWorkout: (exerciseId) => {
    const active = get().activeWorkout;
    const exercise = get().exercises.find((item) => item.id === exerciseId);
    if (!active || !exercise) return;

    const newExercise: WorkoutExerciseLog = {
      id: createId('w-log'),
      workoutId: active.id,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      primaryMuscle: exercise.primaryMuscle,
      orderIndex: active.exercises.length + 1,
      sets: [
        {
          id: createId('set'),
          setNumber: 1,
          type: 'normal',
          reps: 10,
          weightKg: 0,
          isCompleted: false,
          restSeconds: 60,
        },
      ],
    };

    set({
      activeWorkout: {
        ...active,
        exercises: [...active.exercises, newExercise],
      },
    });
  },
  removeExerciseFromActiveWorkout: (exerciseIndex) => {
    const active = get().activeWorkout;
    if (!active || !active.exercises[exerciseIndex]) return;

    const updatedExercises = active.exercises
      .filter((_, index) => index !== exerciseIndex)
      .map((exercise, index) => ({ ...exercise, orderIndex: index + 1 }));

    set({
      activeWorkout: {
        ...active,
        exercises: updatedExercises,
        totalVolumeKg: calculateCompletedVolume(updatedExercises),
      },
    });
  },
  addSetToExercise: (exerciseIndex) => {
    const active = get().activeWorkout;
    if (!active) return;

    const targetEx = active.exercises[exerciseIndex];
    if (targetEx) {
      const lastSet = targetEx.sets[targetEx.sets.length - 1];
      const newSetNum = targetEx.sets.length + 1;
      const newSet: ExerciseSet = {
        id: createId('set'),
        setNumber: newSetNum,
        type: 'normal',
        reps: lastSet ? lastSet.reps : 12,
        weightKg: lastSet ? lastSet.weightKg : 40,
        isCompleted: false,
        restSeconds: lastSet?.restSeconds || 60,
      };
      const updatedExercises = active.exercises.map((exercise, index) =>
        index === exerciseIndex ? { ...exercise, sets: [...exercise.sets, newSet] } : exercise
      );

      set({
        activeWorkout: {
          ...active,
          exercises: updatedExercises,
        },
      });
    }
  },
  removeSetFromExercise: (exerciseIndex, setIndex) => {
    const active = get().activeWorkout;
    const targetExercise = active?.exercises[exerciseIndex];
    if (!active || !targetExercise?.sets[setIndex]) return;

    const updatedExercises = active.exercises.map((exercise, index) => {
      if (index !== exerciseIndex) return exercise;
      const sets = exercise.sets
        .filter((_, currentSetIndex) => currentSetIndex !== setIndex)
        .map((set, currentSetIndex) => ({ ...set, setNumber: currentSetIndex + 1 }));
      return { ...exercise, sets };
    });

    set({
      activeWorkout: {
        ...active,
        exercises: updatedExercises,
        totalVolumeKg: calculateCompletedVolume(updatedExercises),
      },
    });
  },
  finishActiveWorkout: () => {
    const active = get().activeWorkout;
    if (!active) return;

    const completedSession: WorkoutSession = {
      ...active,
      endTime: new Date().toISOString(),
      isCompleted: true,
      durationSeconds: Math.max(
        60,
        Math.floor((Date.now() - new Date(active.startTime).getTime()) / 1000)
      ),
    };

    saveWorkoutLogToDb(completedSession);
    const collectionsBefore = getCollectionsFromDb();
    if (collectionsBefore.some((collection) => collection.days.some((day) => day.id === completedSession.routineId))) {
      const nextCollections = applyWorkoutToRoutine(collectionsBefore, completedSession);
      replaceCollectionsInDb(nextCollections);
      const savedCollections = getCollectionsFromDb();
      const selectedId = get().selectedCollection?.id;
      set({
        collections: savedCollections,
        selectedCollection: savedCollections.find((collection) => collection.id === selectedId) || null,
      });
      syncCollectionsToServer();
    }
    const updatedStats = getWorkoutStatsFromDb(get().statsRange);
    const updatedHistory = getWorkoutHistoryFromDb();

    set({
      activeWorkout: null,
      isWorkoutActive: false,
      stats: updatedStats,
      history: updatedHistory,
      activeTab: 'actividades',
    });
    get().stopRestTimer();
    void get().syncWorkouts();
  },
  cancelActiveWorkout: () => {
    set({
      activeWorkout: null,
      isWorkoutActive: false,
    });
    get().stopRestTimer();
  },

  // Rest Timer
  restSecondsLeft: 0,
  totalRestSeconds: 60,
  isRestTimerRunning: false,
  startRestTimer: (seconds = 60) => {
    const safeSeconds = Number.isFinite(seconds) ? Math.min(7_200, Math.max(0, Math.round(seconds))) : 60;
    set({
      restSecondsLeft: safeSeconds,
      totalRestSeconds: safeSeconds,
      isRestTimerRunning: safeSeconds > 0,
    });
  },
  pauseRestTimer: () => set({ isRestTimerRunning: false }),
  resumeRestTimer: () => set((state) => ({ isRestTimerRunning: state.restSecondsLeft > 0 })),
  adjustRestTimer: (diff) => {
    if (!Number.isFinite(diff)) return;
    set((s) => {
      const nextVal = Math.max(0, s.restSecondsLeft + diff);
      return {
        restSecondsLeft: nextVal,
        totalRestSeconds: Math.max(s.totalRestSeconds, nextVal),
      };
    });
  },
  stopRestTimer: () => set({ restSecondsLeft: 0, isRestTimerRunning: false }),
  tickRestTimer: () => {
    const { restSecondsLeft, isRestTimerRunning } = get();
    if (!isRestTimerRunning) return;

    if (restSecondsLeft <= 1) {
      set({ restSecondsLeft: 0, isRestTimerRunning: false });
    } else {
      set({ restSecondsLeft: restSecondsLeft - 1 });
    }
  },

  // Activities & Stats
  statsRange: '7d',
  setStatsRange: (range) => {
    const newStats = getWorkoutStatsFromDb(range);
    set({ statsRange: range, stats: newStats });
  },
  stats: getWorkoutStatsFromDb('7d'),
  history: [],
  workoutSyncStatus: 'idle',
  syncWorkouts: async () => {
    if (workoutSyncInFlight) {
      workoutSyncQueued = true;
      return;
    }
    workoutSyncInFlight = true;
    set({ workoutSyncStatus: 'syncing' });
    try {
      const token = await getAuthToken();
      if (!token) {
        set({ workoutSyncStatus: 'idle' });
        return;
      }
      const remote = await getWorkoutsRequest(token);
      const local = getWorkoutHistoryFromDb().filter((workout) => workout.isCompleted);
      const sameWorkout = (first: WorkoutSession, second: WorkoutSession) =>
        first.id === second.id || (first.startTime === second.startTime && first.name === second.name);

      // A completed workout may have been kept only on this device while it was
      // offline. Upload it before importing the server history.
      for (const workout of local) {
        if (!remote.some((item) => sameWorkout(item, workout))) {
          await saveWorkoutRequest(token, workout);
        }
      }
      const synced = await getWorkoutsRequest(token);
      const currentLocal = getWorkoutHistoryFromDb();
      for (const workout of synced) {
        if (!currentLocal.some((item) => sameWorkout(item, workout))) {
          saveWorkoutLogToDb(workout);
        }
      }
      set({
        history: getWorkoutHistoryFromDb(),
        stats: getWorkoutStatsFromDb(get().statsRange),
        workoutSyncStatus: 'idle',
      });
    } catch (error) {
      console.warn('No se pudo sincronizar el historial de entrenamientos.', error);
      set({ workoutSyncStatus: 'error' });
    } finally {
      workoutSyncInFlight = false;
      if (workoutSyncQueued) {
        workoutSyncQueued = false;
        void get().syncWorkouts();
      }
    }
  },

  // Initial loader
  loadInitialData: async () => {
    await initDatabase();
    const exs = getExercisesFromDb();
    const cols = getCollectionsFromDb();
    const hist = getWorkoutHistoryFromDb();
    const st = getWorkoutStatsFromDb('7d');
    const bms = getBodyMeasurementsFromDb();
    const targetWeightKg = getTargetWeightFromDb();
    const mems = getGymMembersFromDb();
    const atts = getAttendanceLogsFromDb();

    set({
      exercises: exs,
      collections: cols,
      history: hist,
      stats: st,
      bodyMeasurements: bms,
      targetWeightKg,
      gymMembers: mems,
      activeMember: mems.length > 0 ? mems[0] : null,
      attendanceLogs: atts,
    });
  },
}));
