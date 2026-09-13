import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { WorkoutSession } from '../../types';

interface WorkoutSessionDetailModalProps {
  visible: boolean;
  session: WorkoutSession | null;
  onClose: () => void;
  onRepeatWorkout?: (session: WorkoutSession) => void;
}

export const WorkoutSessionDetailModal: React.FC<WorkoutSessionDetailModalProps> = ({
  visible,
  session,
  onClose,
  onRepeatWorkout,
}) => {
  if (!session) return null;

  const hours = Math.floor(session.durationSeconds / 3600);
  const minutes = Math.floor((session.durationSeconds % 3600) / 60);
  const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;

  const dateStr = new Date(session.startTime).toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateLabel}>{dateStr.toUpperCase()}</Text>
              <Text style={styles.title}>{session.name}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* KPI Ribbon */}
            <View style={styles.kpiRibbon}>
              <View style={styles.kpiItem}>
                <Ionicons name="time-outline" size={16} color="#34C759" />
                <Text style={styles.kpiVal}>{durationStr}</Text>
                <Text style={styles.kpiLabel}>Duración</Text>
              </View>
              <View style={styles.kpiDivider} />
              <View style={styles.kpiItem}>
                <Ionicons name="flame-outline" size={16} color={COLORS.primary} />
                <Text style={styles.kpiVal}>{session.totalKcal} kcal</Text>
                <Text style={styles.kpiLabel}>Energía</Text>
              </View>
              <View style={styles.kpiDivider} />
              <View style={styles.kpiItem}>
                <MaterialCommunityIcons name="weight-kilogram" size={18} color="#0A84FF" />
                <Text style={styles.kpiVal}>{session.totalVolumeKg.toLocaleString()} kg</Text>
                <Text style={styles.kpiLabel}>Carga Total</Text>
              </View>
            </View>

            {/* Exercises List */}
            <Text style={styles.sectionHeading}>
              EJERCICIOS COMPLETADOS ({session.exercises.length})
            </Text>

            {session.exercises.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No hay ejercicios detallados para esta sesión.</Text>
              </View>
            ) : (
              session.exercises.map((ex, exIdx) => {
                const exVolume = ex.sets.reduce(
                  (acc, s) => acc + (s.isCompleted ? s.reps * s.weightKg : 0),
                  0
                );

                return (
                  <View key={ex.id || exIdx} style={styles.exerciseCard}>
                    <View style={styles.exerciseHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.exerciseName}>{ex.exerciseName}</Text>
                        <Text style={styles.muscleLabel}>
                          {ex.primaryMuscle.toUpperCase()} • {exVolume.toLocaleString()} kg volumen
                        </Text>
                      </View>
                    </View>

                    {/* Sets Table */}
                    <View style={styles.setsTable}>
                      <View style={styles.setsTableHeader}>
                        <Text style={[styles.setsTableHeadCol, { width: 36 }]}>SET</Text>
                        <Text style={[styles.setsTableHeadCol, { flex: 1 }]}>ANTERIOR</Text>
                        <Text style={[styles.setsTableHeadCol, { width: 70, textAlign: 'center' }]}>KG</Text>
                        <Text style={[styles.setsTableHeadCol, { width: 60, textAlign: 'center' }]}>REPS</Text>
                        <Text style={[styles.setsTableHeadCol, { width: 36, textAlign: 'right' }]}>EST.</Text>
                      </View>

                      {ex.sets.map((set, sIdx) => (
                        <View key={set.id || sIdx} style={styles.setRow}>
                          <View style={styles.setNumPill}>
                            <Text style={styles.setNumText}>{set.setNumber}</Text>
                          </View>
                          <Text style={styles.prevText} numberOfLines={1}>
                            {set.weightKg} kg × {set.reps}
                          </Text>
                          <Text style={styles.setKgText}>{set.weightKg}</Text>
                          <Text style={styles.setRepsText}>{set.reps}</Text>
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color="#34C759"
                            style={{ alignSelf: 'center' }}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })
            )}

            {/* Repeat Workout CTA */}
            {onRepeatWorkout && (
              <TouchableOpacity
                style={styles.repeatBtn}
                onPress={() => onRepeatWorkout(session)}
                activeOpacity={0.8}
              >
                <Ionicons name="repeat" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.repeatBtnText}>Repetir Este Entrenamiento</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#161618',
    borderRadius: 24,
    width: '100%',
    maxWidth: 440,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: '#2C2C30',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#252528',
  },
  dateLabel: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#222226',
  },
  scrollContent: {
    padding: 20,
  },
  kpiRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    marginBottom: 20,
  },
  kpiItem: {
    alignItems: 'center',
  },
  kpiVal: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  kpiLabel: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  kpiDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#2A2A2E',
  },
  sectionHeading: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 13,
  },
  exerciseCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  exerciseName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  muscleLabel: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  setsTable: {
    backgroundColor: '#141416',
    borderRadius: 10,
    padding: 8,
  },
  setsTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  setsTableHeadCol: {
    color: '#636366',
    fontSize: 10,
    fontWeight: '700',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#1E1E22',
  },
  setNumPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#26262A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  setNumText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  prevText: {
    flex: 1,
    color: '#8E8E93',
    fontSize: 12,
  },
  setKgText: {
    width: 70,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  setRepsText: {
    width: 60,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  repeatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 10,
    marginBottom: 10,
  },
  repeatBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
