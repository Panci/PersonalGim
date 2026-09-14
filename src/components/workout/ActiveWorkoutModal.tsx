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
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { COLORS } from '../../theme/colors';
import { useWorkoutStore } from '../../store/workoutStore';
import { RestTimerBar } from './RestTimerBar';
import { PlateCalculatorModal } from './PlateCalculatorModal';

const KEEP_AWAKE_TAG = 'personal-gym-active-workout';

export const ActiveWorkoutModal: React.FC = () => {
  const {
    isWorkoutActive,
    activeWorkout,
    toggleCompleteSet,
    updateSetValues,
    exercises,
    addExerciseToActiveWorkout,
    removeExerciseFromActiveWorkout,
    addSetToExercise,
    removeSetFromExercise,
    finishActiveWorkout,
    cancelActiveWorkout,
  } = useWorkoutStore();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showPlateCalc, setShowPlateCalc] = useState(false);
  const [calcWeight, setCalcWeight] = useState(60);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [exerciseQuery, setExerciseQuery] = useState('');
  const [editingCell, setEditingCell] = useState<{
    exerciseIndex: number;
    setIndex: number;
    field: 'reps' | 'weight';
  } | null>(null);
  const [draftCellValue, setDraftCellValue] = useState('');

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

  // Keep the phone awake for the whole workout, and release the lock as soon
  // as the session is finished or discarded.
  useEffect(() => {
    if (!isWorkoutActive) return;

    let disposed = false;
    const enableKeepAwake = async () => {
      try {
        await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
        if (disposed) await deactivateKeepAwake(KEEP_AWAKE_TAG);
      } catch {
        // Some browsers do not expose Screen Wake Lock; the workout still works.
      }
    };

    void enableKeepAwake();

    return () => {
      disposed = true;
      void deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
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

  const handleAddExercise = (exerciseId: string) => {
    addExerciseToActiveWorkout(exerciseId);
    setExerciseQuery('');
    setShowExercisePicker(false);
  };

  const beginCellEdit = (
    exerciseIndex: number,
    setIndex: number,
    field: 'reps' | 'weight',
    value: number,
  ) => {
    setEditingCell({ exerciseIndex, setIndex, field });
    setDraftCellValue(String(value));
  };

  const commitCellEdit = () => {
    if (!editingCell) return;

    const normalized = draftCellValue.replace(',', '.').replace(/[^0-9.]/g, '');
    const parsed = Number.parseFloat(normalized);
    const current = activeWorkout?.exercises[editingCell.exerciseIndex]?.sets[editingCell.setIndex];

    if (current && Number.isFinite(parsed)) {
      if (editingCell.field === 'reps') {
        updateSetValues(
          editingCell.exerciseIndex,
          editingCell.setIndex,
          Math.max(1, Math.min(1000, Math.round(parsed))),
          current.weightKg,
        );
      } else {
        updateSetValues(
          editingCell.exerciseIndex,
          editingCell.setIndex,
          current.reps,
          Math.max(0, Math.min(2000, parsed)),
        );
      }
    }

    setEditingCell(null);
    setDraftCellValue('');
  };

  // Epley 1RM estimation
  const calculate1RM = (weight: number, reps: number) => {
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30));
  };

  const selectableExercises = exercises.filter((exercise) => {
    const query = exerciseQuery.trim().toLowerCase();
    return !query || exercise.name.toLowerCase().includes(query) || exercise.primaryMuscle.includes(query);
  });

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
          {activeWorkout.exercises.length === 0 && (
            <View style={styles.emptyExercises}>
              <MaterialCommunityIcons name="dumbbell" size={40} color="#636366" />
              <Text style={styles.emptyExercisesTitle}>Añade el primer ejercicio</Text>
              <Text style={styles.emptyExercisesText}>Después podrás indicar sus series, peso y repeticiones.</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.addExerciseBtn}
            onPress={() => setShowExercisePicker(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.addExerciseBtnText}>Añadir ejercicio</Text>
          </TouchableOpacity>

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

                <View style={styles.exerciseActions}>
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
                  <TouchableOpacity
                    style={styles.deleteExerciseBtn}
                    onPress={() => removeExerciseFromActiveWorkout(exIndex)}
                    accessibilityLabel={`Eliminar ${ex.exerciseName}`}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF6961" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Table Column Labels */}
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.colLabel, { width: 36, textAlign: 'center' }]}>SERIE</Text>
                <Text style={[styles.colLabel, { flex: 1, textAlign: 'center' }]}>PESO (KG)</Text>
                <Text style={[styles.colLabel, { flex: 1, textAlign: 'center' }]}>REPETICIONES</Text>
                <Text style={[styles.colLabel, { width: 44, textAlign: 'center' }]}>EST. 1RM</Text>
                <Text style={[styles.colLabel, { width: 48, textAlign: 'center' }]}>LISTO</Text>
                <View style={{ width: 28 }} />
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
                      <TextInput
                        style={styles.miniValueInput}
                        value={
                          editingCell?.exerciseIndex === exIndex &&
                          editingCell.setIndex === sIndex &&
                          editingCell.field === 'weight'
                            ? draftCellValue
                            : String(s.weightKg)
                        }
                        onFocus={() => beginCellEdit(exIndex, sIndex, 'weight', s.weightKg)}
                        onChangeText={setDraftCellValue}
                        onBlur={commitCellEdit}
                        onSubmitEditing={commitCellEdit}
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                        selectTextOnFocus
                        accessibilityLabel={`Peso de la serie ${s.setNumber}`}
                      />
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
                      <TextInput
                        style={styles.miniValueInput}
                        value={
                          editingCell?.exerciseIndex === exIndex &&
                          editingCell.setIndex === sIndex &&
                          editingCell.field === 'reps'
                            ? draftCellValue
                            : String(s.reps)
                        }
                        onFocus={() => beginCellEdit(exIndex, sIndex, 'reps', s.reps)}
                        onChangeText={setDraftCellValue}
                        onBlur={commitCellEdit}
                        onSubmitEditing={commitCellEdit}
                        keyboardType="numeric"
                        returnKeyType="done"
                        selectTextOnFocus
                        accessibilityLabel={`Repeticiones de la serie ${s.setNumber}`}
                      />
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
                      accessibilityLabel={s.isCompleted ? `Serie ${s.setNumber} realizada` : `Marcar serie ${s.setNumber} como realizada`}
                    >
                      <Ionicons
                        name={s.isCompleted ? 'checkmark' : 'checkmark-circle-outline'}
                        size={17}
                        color={s.isCompleted ? '#FFFFFF' : '#A1A1A6'}
                      />
                      <Text style={[styles.checkboxLabel, s.isCompleted && styles.checkboxLabelCompleted]}>
                        {s.isCompleted ? 'Realizada' : 'Realizar'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteSetBtn}
                      onPress={() => removeSetFromExercise(exIndex, sIndex)}
                      accessibilityLabel={`Eliminar serie ${s.setNumber} de ${ex.exerciseName}`}
                    >
                      <Ionicons name="remove-circle-outline" size={18} color="#FF6961" />
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

        {/* Exercise picker */}
        <Modal
          visible={showExercisePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowExercisePicker(false)}
        >
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHeader}>
                <View>
                  <Text style={styles.pickerTitle}>Añadir ejercicio</Text>
                  <Text style={styles.pickerSubtitle}>Elige un ejercicio para esta sesión</Text>
                </View>
                <TouchableOpacity onPress={() => setShowExercisePicker(false)} accessibilityLabel="Cerrar selector">
                  <Ionicons name="close-circle" size={28} color="#8E8E93" />
                </TouchableOpacity>
              </View>
              <View style={styles.pickerSearch}>
                <Ionicons name="search" size={18} color="#8E8E93" />
                <TextInput
                  style={styles.pickerSearchInput}
                  value={exerciseQuery}
                  onChangeText={setExerciseQuery}
                  placeholder="Buscar ejercicio"
                  placeholderTextColor="#636366"
                  autoFocus
                />
              </View>
              <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled">
                {selectableExercises.map((exercise) => (
                  <TouchableOpacity
                    key={exercise.id}
                    style={styles.pickerOption}
                    onPress={() => handleAddExercise(exercise.id)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.pickerOptionIcon}>
                      <MaterialCommunityIcons name="dumbbell" size={18} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerOptionName}>{exercise.name}</Text>
                      <Text style={styles.pickerOptionDetail}>{exercise.primaryMuscle.toUpperCase()} · {exercise.equipment}</Text>
                    </View>
                    <Ionicons name="add-circle" size={22} color={COLORS.primary} />
                  </TouchableOpacity>
                ))}
                {selectableExercises.length === 0 && (
                  <Text style={styles.noExerciseText}>No se encontraron ejercicios.</Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

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
    width: '100%',
    maxWidth: 390,
    alignSelf: 'center',
    backgroundColor: '#000000',
    overflow: 'hidden',
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
    paddingBottom: 112,
  },
  emptyExercises: {
    alignItems: 'center',
    paddingVertical: 42,
    paddingHorizontal: 24,
  },
  emptyExercisesTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
  },
  emptyExercisesText: {
    color: '#8E8E93',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6,
  },
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 13,
    marginBottom: 16,
  },
  addExerciseBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
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
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  deleteExerciseBtn: {
    padding: 7,
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    borderRadius: 8,
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
    paddingVertical: 6,
  },
  miniStepBtn: {
    padding: 4,
  },
  miniValueInput: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    minWidth: 42,
    paddingVertical: 0,
    paddingHorizontal: 0,
    textAlign: 'center',
  },
  est1RMText: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
  },
  checkbox: {
    width: 82,
    height: 40,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3E3E44',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginHorizontal: 4,
  },
  checkboxCompleted: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  checkboxLabel: {
    color: '#A1A1A6',
    fontSize: 10,
    fontWeight: '700',
  },
  checkboxLabelCompleted: {
    color: '#FFFFFF',
  },
  deleteSetBtn: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
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
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
  pickerSheet: {
    maxHeight: '82%',
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 32 : 22,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pickerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  pickerSubtitle: {
    color: '#8E8E93',
    fontSize: 13,
    marginTop: 3,
  },
  pickerSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  pickerSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    paddingVertical: 12,
  },
  pickerList: {
    flexGrow: 0,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2E',
  },
  pickerOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
  },
  pickerOptionName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pickerOptionDetail: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
  noExerciseText: {
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: 28,
  },
});
