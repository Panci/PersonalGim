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

  const muscleFrequencyList = [
    { name: 'Tríceps', pct: 35, color: COLORS.primary },
    { name: 'Pectorales', pct: 30, color: '#FF8533' },
    { name: 'Bíceps', pct: 20, color: '#FFA066' },
    { name: 'Hombros', pct: 10, color: '#34C759' },
    { name: 'Cuádriceps', pct: 5, color: '#0A84FF' },
  ];

  const personalRecordsList = [
    {
      id: 'pr-1',
      exercise: 'Press de banca (barra)',
      value: '100 kg',
      type: '1RM Máximo',
      date: 'Hace 4 días',
      medal: '🥇',
      color: '#FFD700',
    },
    {
      id: 'pr-2',
      exercise: 'Sentadilla trasera (barra)',
      value: '135 kg',
      type: '1RM Máximo',
      date: 'Hace 8 días',
      medal: '🥇',
      color: '#FFD700',
    },
    {
      id: 'pr-3',
      exercise: 'Peso muerto convencional',
      value: '170 kg',
      type: '1RM Máximo',
      date: 'Hace 12 días',
      medal: '🥇',
      color: '#FFD700',
    },
    {
      id: 'pr-4',
      exercise: 'Press militar (barra)',
      value: '65 kg',
      type: '1RM Máximo',
      date: 'Hace 14 días',
      medal: '🥇',
      color: '#FFD700',
    },
    {
      id: 'pr-5',
      exercise: 'Hip Thrust con barra',
      value: '150 kg',
      type: '1RM Máximo',
      date: 'Hace 18 días',
      medal: '🥇',
      color: '#FFD700',
    },
  ];

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

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

        {/* Récords Personales (Hall of Fame) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🏆 Récords Personales (PRs)</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.prScrollRow}>
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
        </ScrollView>

        {/* Regiones Más Entrenadas matching IMG_1172.PNG */}
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

        {/* Historial de Sesiones */}
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
    paddingTop: Platform.OS === 'ios' ? 56 : 28,
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
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  prScrollRow: {
    marginBottom: 20,
  },
  prCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    width: 150,
    marginRight: 10,
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
