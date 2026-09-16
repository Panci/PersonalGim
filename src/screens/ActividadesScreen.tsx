import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useWorkoutStore } from '../store/workoutStore';
import { StatsTimeRange, WorkoutSession } from '../types';
import { WorkoutSessionDetailModal } from '../components/workout/WorkoutSessionDetailModal';
import { formatWorkoutTime, getCompletedRestSeconds } from '../utils/workoutMetrics';

const MUSCLE_DISPLAY: Record<string, { name: string; color: string }> = {
  pectoral: { name: 'Pectorales', color: COLORS.primary },
  biceps: { name: 'Bíceps', color: '#FFA066' },
  hombros: { name: 'Hombros', color: '#34C759' },
  oblicuos: { name: 'Oblicuos', color: '#AF52DE' },
  abdomen: { name: 'Abdomen', color: '#0A84FF' },
  antebrazo: { name: 'Antebrazo', color: '#64D2FF' },
  cuadriceps: { name: 'Cuádriceps', color: '#0A84FF' },
  abductores: { name: 'Abductores', color: '#30D158' },
  adductores: { name: 'Aductores', color: '#30D158' },
  cardio: { name: 'Cardio', color: '#FF9F0A' },
  trapecio: { name: 'Trapecio', color: '#BF5AF2' },
  triceps: { name: 'Tríceps', color: COLORS.primary },
  dorsales: { name: 'Espalda', color: '#0A84FF' },
  lumbares: { name: 'Lumbares', color: '#64D2FF' },
  gluteos: { name: 'Glúteos', color: '#FF375F' },
  isquiotibiales: { name: 'Isquiotibiales', color: '#FF453A' },
  pantorrillas: { name: 'Gemelos', color: '#FFD60A' },
};

const EMPTY_PERSONAL_RECORDS = [
  { id: 'empty-pr-1', exercise: 'Press de banca (barra)' },
  { id: 'empty-pr-2', exercise: 'Sentadilla trasera (barra)' },
  { id: 'empty-pr-3', exercise: 'Peso muerto convencional' },
  { id: 'empty-pr-4', exercise: 'Press militar (barra)' },
  { id: 'empty-pr-5', exercise: 'Hip Thrust con barra' },
];

const formatRelativeDate = (isoDate: string): string => {
  const elapsedDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000),
  );
  if (elapsedDays === 0) return 'Hoy';
  return `Hace ${elapsedDays} ${elapsedDays === 1 ? 'día' : 'días'}`;
};

export const ActividadesScreen: React.FC = () => {
  const {
    statsRange,
    setStatsRange,
    stats,
    history,
    setActiveTab,
    startQuickWorkout,
  } = useWorkoutStore();

  const [selectedSessionDetail, setSelectedSessionDetail] = useState<WorkoutSession | null>(null);

  const ranges: { id: StatsTimeRange; label: string }[] = [
    { id: '7d', label: '7 días' },
    { id: '14d', label: '14 días' },
    { id: '28d', label: '28 días' },
  ];

  const latestSession = history[0] ?? null;
  const latestCompletedSets = latestSession
    ? latestSession.exercises.reduce(
        (total, exercise) => total + exercise.sets.filter((set) => set.isCompleted).length,
        0
      )
    : 0;

  const personalRecordsByExercise: Record<string, {
    id: string;
    exercise: string;
    value: string;
    type: string;
    date: string;
    medal: string;
    color: string;
    numericValue: number;
  }> = {};

  history
    .filter((session) => session.isCompleted)
    .forEach((session) => {
      session.exercises.forEach((exercise) => {
        exercise.sets
          .filter((set) => set.isCompleted && Number.isFinite(set.weightKg) && set.weightKg > 0)
          .forEach((set) => {
            const current = personalRecordsByExercise[exercise.exerciseId];
            if (!current || set.weightKg > current.numericValue) {
              personalRecordsByExercise[exercise.exerciseId] = {
                id: `${session.id}-${exercise.id}-${set.id}`,
                exercise: exercise.exerciseName,
                value: `${set.weightKg} kg`,
                type: 'Mejor carga',
                date: formatRelativeDate(session.startTime),
                medal: '🥇',
                color: '#FFD700',
                numericValue: set.weightKg,
              };
            }
          });
      });
    });

  const realPersonalRecords = Object.values(personalRecordsByExercise)
    .sort((first, second) => second.numericValue - first.numericValue);
  const personalRecordsList = realPersonalRecords.length > 0
    ? realPersonalRecords
    : EMPTY_PERSONAL_RECORDS.map((record) => ({
        ...record,
        value: '0 kg',
        type: 'Sin registro',
        date: 'Sin registros',
        medal: '🏅',
        color: '#8E8E93',
        numericValue: 0,
      }));

  const muscleFrequencyEntries = Object.entries(stats.muscleFrequency)
    .filter(([, count]) => Number(count) > 0)
    .map(([muscle, count]) => ({
      ...(MUSCLE_DISPLAY[muscle] || { name: muscle, color: '#8E8E93' }),
      count: Number(count),
    }))
    .sort((first, second) => second.count - first.count);
  const muscleFrequencyTotal = muscleFrequencyEntries.reduce((total, item) => total + item.count, 0);
  const muscleFrequencyList = muscleFrequencyEntries.slice(0, 5).map((item) => ({
    name: item.name,
    color: item.color,
    pct: muscleFrequencyTotal > 0 ? Math.round((item.count / muscleFrequencyTotal) * 100) : 0,
  }));

  const handleRepeatSession = (session: WorkoutSession) => {
    setSelectedSessionDetail(null);
    startQuickWorkout();
    setActiveTab('entreno');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Actividades</Text>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Resumen de la rutina recién terminada */}
        {latestSession && (
          <TouchableOpacity
            style={styles.latestSessionCard}
            onPress={() => setSelectedSessionDetail(latestSession)}
            activeOpacity={0.82}
          >
            <View style={styles.latestSessionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.latestSessionEyebrow}>ÚLTIMO ENTRENAMIENTO</Text>
                <Text style={styles.latestSessionName} numberOfLines={1}>
                  {latestSession.name}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
            </View>
            <Text style={styles.latestSessionDate}>
              {new Date(latestSession.startTime).toLocaleDateString('es-ES', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </Text>
            <View style={styles.latestSessionMetrics}>
              <View style={styles.latestSessionMetric}>
                <Ionicons name="time-outline" size={15} color="#34C759" />
                <Text style={styles.latestSessionMetricValue}>{formatWorkoutTime(latestSession.durationSeconds)}</Text>
                <Text style={styles.latestSessionMetricLabel}>Duración</Text>
              </View>
              <View style={styles.latestSessionMetric}>
                <Ionicons name="hourglass-outline" size={15} color="#AF52DE" />
                <Text style={styles.latestSessionMetricValue}>
                  {formatWorkoutTime(getCompletedRestSeconds(latestSession))}
                </Text>
                <Text style={styles.latestSessionMetricLabel}>Descanso</Text>
              </View>
              <View style={styles.latestSessionMetric}>
                <Ionicons name="flame-outline" size={15} color={COLORS.primary} />
                <Text style={styles.latestSessionMetricValue}>{latestSession.totalKcal} kcal</Text>
                <Text style={styles.latestSessionMetricLabel}>Energía</Text>
              </View>
              <View style={styles.latestSessionMetric}>
                <MaterialCommunityIcons name="weight-kilogram" size={16} color="#0A84FF" />
                <Text style={styles.latestSessionMetricValue}>{latestSession.totalVolumeKg.toLocaleString()} kg</Text>
                <Text style={styles.latestSessionMetricLabel}>Volumen</Text>
              </View>
            </View>
            <View style={styles.latestSessionFooter}>
              <Text style={styles.latestSessionFooterText}>
                {latestSession.exercises.length} ejercicios · {latestCompletedSets} series completadas
              </Text>
              <Text style={styles.latestSessionDetailLink}>Ver detalle</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Segmented Range Filter matching IMG_1172.PNG */}
        <View style={styles.rangeFilterContainer}>
          <View style={styles.rangeCapsule}>
            {ranges.map((r) => {
              const isActive = statsRange === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.rangeBtn, isActive && styles.rangeBtnActive]}
                  onPress={() => setStatsRange(r.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.rangeBtnText, isActive && styles.rangeBtnTextActive]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 3 KPI Sparkline Cards matching IMG_1172.PNG */}
        <View style={styles.kpiContainer}>
          {/* Card 1: Tiempo de entrenamiento */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiTopRow}>
              <Ionicons name="time-outline" size={16} color="#34C759" />
              <Text style={styles.kpiLabel}>Tiempo de entrenamiento</Text>
            </View>
            <Text style={styles.kpiMainValue}>{stats.trainingTimeFormatted}</Text>
            {/* Green Sparkline */}
            <View style={styles.sparklineContainer}>
              <Svg width="100%" height="28" viewBox="0 0 100 28">
                <Path
                  d="M 0 22 Q 25 8, 50 16 T 100 4"
                  fill="none"
                  stroke="#34C759"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </Svg>
            </View>
          </View>

          {/* Card 2: Calorías quemadas */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiTopRow}>
              <Ionicons name="flame-outline" size={16} color={COLORS.primary} />
              <Text style={styles.kpiLabel}>Calorías quemadas</Text>
            </View>
            <Text style={styles.kpiMainValue}>{stats.totalKcal} kcal</Text>
            {/* Orange Sparkline */}
            <View style={styles.sparklineContainer}>
              <Svg width="100%" height="28" viewBox="0 0 100 28">
                <Path
                  d="M 0 24 Q 25 18, 50 10 T 100 6"
                  fill="none"
                  stroke={COLORS.primary}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </Svg>
            </View>
          </View>

          {/* Card 3: Ejercicios realizados */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiTopRow}>
              <MaterialCommunityIcons name="dumbbell" size={16} color="#0A84FF" />
              <Text style={styles.kpiLabel}>Ejercicios realizados</Text>
            </View>
            <Text style={styles.kpiMainValue}>{stats.totalExercises} ejerc.</Text>
            {/* Blue Sparkline */}
            <View style={styles.sparklineContainer}>
              <Svg width="100%" height="28" viewBox="0 0 100 28">
                <Path
                  d="M 0 20 Q 30 24, 60 12 T 100 8"
                  fill="none"
                  stroke="#0A84FF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </Svg>
            </View>
          </View>
        </View>

        {/* 3 Summary Columns matching IMG_1172.PNG */}
        <View style={styles.summaryBarCard}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryColLabel}>Series</Text>
            <Text style={styles.summaryColNum}>{stats.totalSets}</Text>
          </View>
          <View style={styles.summaryColDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryColLabel}>Repeticiones</Text>
            <Text style={styles.summaryColNum}>{stats.totalReps}</Text>
          </View>
          <View style={styles.summaryColDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryColLabel}>Carga total</Text>
            <Text style={styles.summaryColNum}>
              {stats.totalVolumeKg.toLocaleString()} kg
            </Text>
          </View>
        </View>

        {personalRecordsList.length > 0 && (
          <>
            {/* Récords Personales (Hall of Fame) */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🏆 Récords Personales (PRs)</Text>
            </View>

            <View style={styles.prGrid}>
              {personalRecordsList.map((pr) => (
                <View key={pr.id} style={styles.prCard}>
                  <View style={styles.prTopRow}>
                    <Text style={styles.prMedal}>{pr.medal}</Text>
                    <Text style={styles.prDate}>{pr.date}</Text>
                  </View>
                  <Text style={styles.prValueText}>{pr.value}</Text>
                  <Text style={styles.prExerciseName} numberOfLines={2}>
                    {pr.exercise}
                  </Text>
                  <Text style={styles.prTypeText}>{pr.type}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {muscleFrequencyList.length > 0 && (
          <>
            {/* Regiones Más Entrenadas */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Regiones más entrenadas</Text>
            </View>

            <View style={styles.muscleRegionCard}>
              {muscleFrequencyList.map((item) => (
                <View key={item.name} style={styles.muscleRow}>
                  <View style={styles.muscleInfoRow}>
                    <Text style={styles.muscleNameText}>{item.name}</Text>
                    <Text style={styles.musclePctText}>{item.pct}%</Text>
                  </View>
                  <View style={styles.progressBackground}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${item.pct}%`, backgroundColor: item.color },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Historial de Sesiones */}
        {history.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Historial de entrenamientos</Text>
            </View>

            {history.map((h) => (
              <TouchableOpacity
                key={h.id}
                style={styles.historyCard}
                onPress={() => setSelectedSessionDetail(h)}
                activeOpacity={0.8}
              >
                <View style={styles.historyTop}>
                  <Text style={styles.historyName}>{h.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.historyDate}>
                      {new Date(h.startTime).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#8E8E93" style={{ marginLeft: 6 }} />
                  </View>
                </View>
                <View style={styles.historyMetaRow}>
                  <Text style={styles.historyMetaText}>
                    ⏱️ {Math.floor((h.durationSeconds || 3600) / 60)} min
                  </Text>
                  <Text style={styles.historyMetaText}>🔥 {h.totalKcal} kcal</Text>
                  <Text style={styles.historyMetaText}>🏋️ {h.totalVolumeKg.toLocaleString()} kg</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Workout Session Detail Modal */}
      <WorkoutSessionDetailModal
        visible={selectedSessionDetail !== null}
        session={selectedSessionDetail}
        onClose={() => setSelectedSessionDetail(null)}
        onRepeatWorkout={handleRepeatSession}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 18 : 28,
    paddingBottom: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
  },
  rangeFilterContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  rangeCapsule: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    width: '100%',
    maxWidth: 360,
  },
  rangeBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
  },
  rangeBtnActive: {
    backgroundColor: '#2C2C30',
  },
  rangeBtnText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
  },
  rangeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  kpiContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  kpiTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  kpiLabel: {
    color: '#8E8E93',
    fontSize: 9,
    fontWeight: '600',
    flex: 1,
  },
  kpiMainValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  sparklineContainer: {
    height: 28,
    justifyContent: 'center',
    marginTop: 4,
  },
  summaryBarCard: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    marginBottom: 20,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryColLabel: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryColNum: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  summaryColDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#2A2A2E',
    alignSelf: 'center',
  },
  latestSessionCard: {
    backgroundColor: '#202024',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 106, 0, 0.42)',
    marginBottom: 20,
  },
  latestSessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  latestSessionEyebrow: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  latestSessionName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  latestSessionDate: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  latestSessionMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: '#303035',
  },
  latestSessionMetric: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  latestSessionMetricValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  latestSessionMetricLabel: {
    color: '#8E8E93',
    fontSize: 10,
    textAlign: 'center',
  },
  latestSessionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  latestSessionFooterText: {
    color: '#D1D1D6',
    fontSize: 11,
    flex: 1,
  },
  latestSessionDetailLink: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 8,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  prGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 10,
    rowGap: 10,
    marginBottom: 20,
  },
  prCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    width: '48%',
  },
  prTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  prMedal: {
    fontSize: 16,
  },
  prDate: {
    color: '#8E8E93',
    fontSize: 10,
  },
  prValueText: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 2,
  },
  prExerciseName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    height: 32,
  },
  prTypeText: {
    color: '#8E8E93',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  muscleRegionCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    marginBottom: 20,
  },
  muscleRow: {
    marginBottom: 12,
  },
  muscleInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  muscleNameText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  musclePctText: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '700',
  },
  progressBackground: {
    height: 6,
    backgroundColor: '#2A2A2E',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  historyCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    marginBottom: 10,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  historyDate: {
    color: '#8E8E93',
    fontSize: 12,
  },
  historyMetaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  historyMetaText: {
    color: '#D1D1D6',
    fontSize: 12,
    fontWeight: '500',
  },
});
