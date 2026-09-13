import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useWorkoutStore } from '../../store/workoutStore';
import { RestTimerBar } from './RestTimerBar';
import { PlateCalculatorModal } from './PlateCalculatorModal';

export const ActiveWorkoutModal: React.FC = () => {
  const {
    isWorkoutActive,
    activeWorkout,
    toggleCompleteSet,
    updateSetValues,
    addSetToExercise,
    finishActiveWorkout,
    cancelActiveWorkout,
  } = useWorkoutStore();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showPlateCalc, setShowPlateCalc] = useState(false);
  const [calcWeight, setCalcWeight] = useState(60);

  // Live timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isWorkoutActive) {
      timer = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isWorkoutActive]);

  if (!isWorkoutActive || !activeWorkout) {
    return null;
  }

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleFinish = () => {
    finishActiveWorkout();
  };

  const handleCancel = () => {
    cancelActiveWorkout();
  };

  // Epley 1RM estimation
  const calculate1RM = (weight: number, reps: number) => {
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30));
  };

  return (
    <Modal visible={isWorkoutActive} animationType="slide" onRequestClose={handleCancel}>
      <View style={styles.container}>
        {/* Floating Rest Timer Bar */}
        <RestTimerBar />

        {/* Top Workout Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.cancelText}>Descartar</Text>
          </TouchableOpacity>

          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {activeWorkout.name}
            </Text>
            <View style={styles.timerBadge}>
              <Ionicons name="time" size={14} color={COLORS.primary} />
              <Text style={styles.timerText}>{formatTimer(elapsedSeconds)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.calcTriggerBtn}
            onPress={() => setShowPlateCalc(true)}
          >
            <MaterialCommunityIcons name="calculator-variant" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Live Metrics Ribbon */}
        <View style={styles.metricsBar}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>VOLUMEN TOTAL</Text>
            <Text style={styles.metricValue}>
              {activeWorkout.totalVolumeKg || 0} <Text style={styles.metricUnit}>kg</Text>
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>CALORÍAS EST.</Text>
            <Text style={styles.metricValue}>
              {Math.min(activeWorkout.totalKcal, Math.max(80, Math.floor(elapsedSeconds * 0.15)))}{' '}
              <Text style={styles.metricUnit}>kcal</Text>
            </Text>
          </View>
        </View>

        {/* Exercises & Sets Scroll */}
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          {activeWorkout.exercises.map((ex, exIndex) => (
            <View key={ex.id} style={styles.exerciseCard}>
              {/* Exercise Header */}
              <View style={styles.exerciseCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exerciseMuscleBadge}>
                    {ex.primaryMuscle.toUpperCase()}
                  </Text>
                  <Text style={styles.exerciseName}>{ex.exerciseName}</Text>
                </View>

                <TouchableOpacity
                  style={styles.plateMiniBtn}
                  onPress={() => {
                    const firstSetWeight = ex.sets[0]?.weightKg || 60;
                    setCalcWeight(firstSetWeight);
                    setShowPlateCalc(true);
                  }}
                >
                  <MaterialCommunityIcons name="weight-kilogram" size={16} color="#A1A1A6" />
                  <Text style={styles.plateMiniBtnText}>Discos</Text>
                </TouchableOpacity>
              </View>

              {/* Table Column Labels */}
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.colLabel, { width: 36, textAlign: 'center' }]}>SERIE</Text>
                <Text style={[styles.colLabel, { flex: 1, textAlign: 'center' }]}>PESO (KG)</Text>
                <Text style={[styles.colLabel, { flex: 1, textAlign: 'center' }]}>REPETICIONES</Text>
                <Text style={[styles.colLabel, { width: 44, textAlign: 'center' }]}>EST. 1RM</Text>
                <Text style={[styles.colLabel, { width: 48, textAlign: 'center' }]}>LISTO</Text>
              </View>

              {/* Sets Rows */}
              {ex.sets.map((s, sIndex) => {
                const est1RM = calculate1RM(s.weightKg, s.reps);

                return (
                  <View
                    key={s.id}
                    style={[styles.setRow, s.isCompleted && styles.setRowCompleted]}
                  >
                    {/* Set Number */}
                    <View style={styles.setNumBadge}>
                      <Text style={styles.setNumText}>{s.setNumber}</Text>
                    </View>

                    {/* Weight Stepper */}
                    <View style={styles.miniStepper}>
                      <TouchableOpacity
                        style={styles.miniStepBtn}
                        onPress={() => updateSetValues(exIndex, sIndex, s.reps, Math.max(0, s.weightKg - 2.5))}
                      >
                        <Ionicons name="remove" size={14} color="#8E8E93" />
                      </TouchableOpacity>
                      <Text style={styles.miniValueText}>{s.weightKg}</Text>
                      <TouchableOpacity
                        style={styles.miniStepBtn}
                        onPress={() => updateSetValues(exIndex, sIndex, s.reps, s.weightKg + 2.5)}
                      >
                        <Ionicons name="add" size={14} color="#8E8E93" />
                      </TouchableOpacity>
                    </View>

                    {/* Reps Stepper */}
                    <View style={styles.miniStepper}>
                      <TouchableOpacity
                        style={styles.miniStepBtn}
                        onPress={() => updateSetValues(exIndex, sIndex, Math.max(1, s.reps - 1), s.weightKg)}
                      >
                        <Ionicons name="remove" size={14} color="#8E8E93" />
                      </TouchableOpacity>
                      <Text style={styles.miniValueText}>{s.reps}</Text>
                      <TouchableOpacity
                        style={styles.miniStepBtn}
                        onPress={() => updateSetValues(exIndex, sIndex, s.reps + 1, s.weightKg)}
                      >
                        <Ionicons name="add" size={14} color="#8E8E93" />
                      </TouchableOpacity>
                    </View>

                    {/* Estimated 1RM */}
                    <View style={{ width: 44, alignItems: 'center' }}>
                      <Text style={styles.est1RMText}>{est1RM}</Text>
                    </View>

                    {/* Complete Checkbox */}
                    <TouchableOpacity
                      style={[styles.checkbox, s.isCompleted && styles.checkboxCompleted]}
                      onPress={() => toggleCompleteSet(exIndex, sIndex)}
                      activeOpacity={0.7}
                    >
                      {s.isCompleted && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
                    </TouchableOpacity>
                  </View>
                );
              })}

              {/* Add Set Button */}
              <TouchableOpacity
                style={styles.addSetRowBtn}
                onPress={() => addSetToExercise(exIndex)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={16} color={COLORS.primary} />
                <Text style={styles.addSetRowText}>Agregar Serie</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom Finish Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.finishBtn}
            onPress={handleFinish}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-done" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.finishBtnText}>Finalizar Entrenamiento</Text>
          </TouchableOpacity>
        </View>

        {/* Plate Calculator Modal */}
        <PlateCalculatorModal
          visible={showPlateCalc}
          initialWeight={calcWeight}
          onClose={() => setShowPlateCalc(false)}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1E',
  },
  cancelButton: {
    padding: 6,
  },
  cancelText: {
    color: '#FF453A',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitleBox: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  timerText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  calcTriggerBtn: {
    padding: 6,
    backgroundColor: '#1E1E22',
    borderRadius: 8,
  },
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#161618',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#242428',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  metricUnit: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#2A2A2E',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  exerciseCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  exerciseMuscleBadge: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  exerciseName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },
  plateMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#26262A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  plateMiniBtnText: {
    color: '#A1A1A6',
    fontSize: 11,
    fontWeight: '600',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#28282C',
    marginBottom: 6,
  },
  colLabel: {
    color: '#636366',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222226',
  },
  setRowCompleted: {
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
    borderRadius: 10,
  },
  setNumBadge: {
    width: 36,
    alignItems: 'center',
  },
  setNumText: {
    color: '#A1A1A6',
    fontSize: 14,
    fontWeight: '700',
  },
  miniStepper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#242428',
    borderRadius: 8,
    marginHorizontal: 4,
    paddingVertical: 4,
  },
  miniStepBtn: {
    padding: 4,
  },
  miniValueText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'center',
  },
  est1RMText: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
  },
  checkbox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#3E3E44',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  checkboxCompleted: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  addSetRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#333338',
  },
  addSetRowText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    paddingTop: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1E',
  },
  finishBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  finishBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
