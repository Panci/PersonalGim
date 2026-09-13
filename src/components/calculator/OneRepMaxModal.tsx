import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useWorkoutStore } from '../../store/workoutStore';
import { Exercise, MuscleId } from '../../types';
import { PlateCalculatorModal } from '../workout/PlateCalculatorModal';

const MUSCLE_FILTER_OPTIONS: { id: MuscleId | 'todos'; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'pectoral', label: 'Pectoral' },
  { id: 'biceps', label: 'Bíceps' },
  { id: 'triceps', label: 'Tríceps' },
  { id: 'hombros', label: 'Hombros' },
  { id: 'dorsales', label: 'Espalda' },
  { id: 'cuadriceps', label: 'Cuádriceps' },
  { id: 'isquiotibiales', label: 'Femorales' },
  { id: 'gluteos', label: 'Glúteos' },
  { id: 'pantorrillas', label: 'Gemelos' },
  { id: 'antebrazo', label: 'Antebrazo' },
  { id: 'trapecio', label: 'Trapecio' },
  { id: 'lumbares', label: 'Lumbares' },
  { id: 'abdomen', label: 'Abdomen' },
  { id: 'oblicuos', label: 'Oblicuos' },
];

export const OneRepMaxModal: React.FC = () => {
  const {
    showOneRmModal,
    setShowOneRmModal,
    targetOneRmExercise,
    exercises,
  } = useWorkoutStore();

  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [weightKg, setWeightKg] = useState<number>(80);
  const [reps, setReps] = useState<number>(6);
  const [selectedFormula, setSelectedFormula] = useState<'epley' | 'brzycki' | 'lombardi' | 'media'>('media');
  const [plateCalcWeight, setPlateCalcWeight] = useState<number | null>(null);

  // Exercise & Muscle Picker State
  const [showExercisePicker, setShowExercisePicker] = useState<boolean>(false);
  const [pickerSearch, setPickerSearch] = useState<string>('');
  const [pickerMuscle, setPickerMuscle] = useState<MuscleId | 'todos'>('todos');

  useEffect(() => {
    if (targetOneRmExercise) {
      setSelectedExerciseId(targetOneRmExercise.id);
    } else if (exercises.length > 0 && !selectedExerciseId) {
      setSelectedExerciseId(exercises[0].id);
    }
  }, [targetOneRmExercise, exercises]);

  const currentExercise = exercises.find((e) => e.id === selectedExerciseId);

  // Filter exercises in picker
  const pickerExercises = exercises.filter((ex) => {
    if (pickerMuscle !== 'todos' && ex.primaryMuscle !== pickerMuscle) return false;
    if (pickerSearch.trim().length > 0) {
      const q = pickerSearch.toLowerCase();
      return ex.name.toLowerCase().includes(q) || ex.primaryMuscle.toLowerCase().includes(q);
    }
    return true;
  });

  // Formulas
  const epley = reps === 1 ? weightKg : weightKg * (1 + reps / 30);
  const brzycki = reps === 1 ? weightKg : weightKg * (36 / (37 - Math.min(reps, 36)));
  const lombardi = reps === 1 ? weightKg : weightKg * Math.pow(reps, 0.1);
  const media = (epley + brzycki + lombardi) / 3;

  const getCalculated1RM = (): number => {
    let val = media;
    if (selectedFormula === 'epley') val = epley;
    else if (selectedFormula === 'brzycki') val = brzycki;
    else if (selectedFormula === 'lombardi') val = lombardi;
    return Math.round(val * 2) / 2; // Round to nearest 0.5kg
  };

  const calculated1RM = getCalculated1RM();

  const percentageTable = [
    { pct: 100, reps: '1', label: 'Fuerza Máxima (1RM)', color: '#FF453A' },
    { pct: 95, reps: '2', label: 'Potencia y Fuerza', color: '#FF6A00' },
    { pct: 90, reps: '3-4', label: 'Fuerza Neural', color: '#FF9500' },
    { pct: 85, reps: '5-6', label: 'Fuerza / Hipertrofia Miofibrilar', color: '#FFCC00' },
    { pct: 80, reps: '7-8', label: 'Hipertrofia Rango Pesado', color: '#34C759' },
    { pct: 75, reps: '9-10', label: 'Hipertrofia Óptima Estándar', color: '#30D158' },
    { pct: 70, reps: '11-12', label: 'Volumen y Tensión Mecánica', color: '#0A84FF' },
    { pct: 65, reps: '13-15', label: 'Resistencia a la Fuerza / Bombeo', color: '#5E5CE6' },
    { pct: 60, reps: '16-20', label: 'Capilarización y Recuperación', color: '#BF5AF2' },
  ];

  const adjustWeight = (delta: number) => {
    setWeightKg((prev) => Math.max(2.5, Math.round((prev + delta) * 2) / 2));
  };

  const adjustReps = (delta: number) => {
    setReps((prev) => Math.min(30, Math.max(1, prev + delta)));
  };

  return (
    <Modal
      visible={showOneRmModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        if (showExercisePicker) {
          setShowExercisePicker(false);
        } else {
          setShowOneRmModal(false);
        }
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {showExercisePicker ? (
            /* ======================================================== */
            /* Exercise & Muscle Selector View                          */
            /* ======================================================== */
            <View style={styles.pickerContainer}>
              {/* Picker Header */}
              <View style={styles.pickerHeader}>
                <TouchableOpacity
                  style={styles.pickerBackBtn}
                  onPress={() => setShowExercisePicker(false)}
                >
                  <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.pickerTitle}>Cambiar Ejercicio y Músculo</Text>
                  <Text style={styles.pickerSub}>
                    {pickerExercises.length} ejercicios encontrados
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setShowExercisePicker(false)}
                >
                  <Ionicons name="close" size={20} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={styles.pickerSearchContainer}>
                <Ionicons name="search" size={18} color="#8E8E93" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.pickerSearchInput}
                  placeholder="Buscar por nombre o músculo..."
                  placeholderTextColor="#636366"
                  value={pickerSearch}
                  onChangeText={setPickerSearch}
                />
                {pickerSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setPickerSearch('')}>
                    <Ionicons name="close-circle" size={16} color="#8E8E93" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Muscle Filter Horizontal Chips */}
              <View style={styles.pickerChipsWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerChipsRow}>
                  {MUSCLE_FILTER_OPTIONS.map((m) => {
                    const isSel = pickerMuscle === m.id;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.pickerChip, isSel && styles.pickerChipActive]}
                        onPress={() => setPickerMuscle(m.id)}
                      >
                        <Text style={[styles.pickerChipText, isSel && styles.pickerChipTextActive]}>
                          {m.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Exercises List */}
              <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
                {pickerExercises.length === 0 ? (
                  <View style={styles.emptyPickerContainer}>
                    <Ionicons name="search-outline" size={36} color="#636366" style={{ marginBottom: 8 }} />
                    <Text style={styles.emptyPickerText}>No se encontraron ejercicios</Text>
                    <Text style={styles.emptyPickerSub}>Prueba con otro término de búsqueda o grupo muscular</Text>
                  </View>
                ) : (
                  pickerExercises.map((ex) => {
                    const isSelected = ex.id === selectedExerciseId;
                    return (
                      <TouchableOpacity
                        key={ex.id}
                        style={[styles.pickerExerciseItem, isSelected && styles.pickerExerciseItemActive]}
                        onPress={() => {
                          setSelectedExerciseId(ex.id);
                          setShowExercisePicker(false);
                          setPickerSearch('');
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.pickerExLeft}>
                          <View style={[styles.pickerExIconCircle, isSelected && styles.pickerExIconCircleActive]}>
                            <Ionicons
                              name="barbell"
                              size={16}
                              color={isSelected ? '#FFFFFF' : COLORS.primary}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.pickerExName, isSelected && styles.pickerExNameActive]}>
                              {ex.name}
                            </Text>
                            <View style={styles.pickerExMetaRow}>
                              <View style={styles.pickerExMuscleBadge}>
                                <Text style={styles.pickerExMuscleBadgeText}>
                                  {ex.primaryMuscle.toUpperCase()}
                                </Text>
                              </View>
                              <Text style={styles.pickerExEquipText}>
                                {ex.equipment.replace('_', ' ')}
                              </Text>
                            </View>
                          </View>
                        </View>
                        {isSelected ? (
                          <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                        ) : (
                          <Ionicons name="chevron-forward" size={16} color="#48484A" />
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>
          ) : (
            /* ======================================================== */
            /* Standard 1RM Calculator View                             */
            /* ======================================================== */
            <>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <MaterialCommunityIcons name="calculator-variant" size={22} color={COLORS.primary} style={{ marginRight: 8 }} />
                  <View>
                    <Text style={styles.headerTitle}>Calculadora 1RM</Text>
                    <Text style={styles.headerSub}>Fuerza Máxima y Progresión de Cargas</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setShowOneRmModal(false)}
                >
                  <Ionicons name="close" size={20} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Target Exercise Badge (Interactive - Tap to change!) */}
                {currentExercise && (
                  <TouchableOpacity
                    style={styles.exerciseBadgeCard}
                    onPress={() => setShowExercisePicker(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.exerciseBadgeLeft}>
                      <Ionicons name="swap-horizontal" size={18} color={COLORS.primary} style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.exerciseBadgeName} numberOfLines={1}>
                          {currentExercise.name}
                        </Text>
                        <Text style={styles.exerciseBadgeTapHint}>Toca para cambiar de ejercicio o músculo</Text>
                      </View>
                    </View>
                    <View style={styles.exerciseBadgeRight}>
                      <View style={styles.musclePill}>
                        <Text style={styles.musclePillText}>{currentExercise.primaryMuscle.toUpperCase()}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#8E8E93" style={{ marginLeft: 6 }} />
                    </View>
                  </TouchableOpacity>
                )}

                {/* Inputs: Weight & Reps */}
                <View style={styles.inputsRow}>
                  {/* Weight Card */}
                  <View style={styles.inputCard}>
                    <Text style={styles.inputCardLabel}>PESO LEVANTADO</Text>
                    <View style={styles.valueRow}>
                      <Text style={styles.inputValueLarge}>{weightKg}</Text>
                      <Text style={styles.inputUnit}>kg</Text>
                    </View>
                    <View style={styles.stepperRow}>
                      <TouchableOpacity style={styles.stepBtn} onPress={() => adjustWeight(-5)}>
                        <Text style={styles.stepBtnText}>-5</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.stepBtn} onPress={() => adjustWeight(-1)}>
                        <Text style={styles.stepBtnText}>-1</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.stepBtn} onPress={() => adjustWeight(1)}>
                        <Text style={styles.stepBtnText}>+1</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.stepBtn} onPress={() => adjustWeight(5)}>
                        <Text style={styles.stepBtnText}>+5</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Reps Card */}
                  <View style={styles.inputCard}>
                    <Text style={styles.inputCardLabel}>REPETICIONES</Text>
                    <View style={styles.valueRow}>
                      <Text style={styles.inputValueLarge}>{reps}</Text>
                      <Text style={styles.inputUnit}>reps</Text>
                    </View>
                    <View style={styles.stepperRow}>
                      <TouchableOpacity style={styles.stepBtn} onPress={() => adjustReps(-2)}>
                        <Text style={styles.stepBtnText}>-2</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.stepBtn} onPress={() => adjustReps(-1)}>
                        <Text style={styles.stepBtnText}>-1</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.stepBtn} onPress={() => adjustReps(1)}>
                        <Text style={styles.stepBtnText}>+1</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.stepBtn} onPress={() => adjustReps(2)}>
                        <Text style={styles.stepBtnText}>+2</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* 1RM Result Hero Display */}
                <View style={styles.heroResultCard}>
                  <View style={styles.heroTopRow}>
                    <View>
                      <Text style={styles.heroLabel}>TU 1RM TEÓRICO ESTIMADO</Text>
                      <View style={styles.heroValueRow}>
                        <Text style={styles.heroValue}>{calculated1RM}</Text>
                        <Text style={styles.heroUnit}>kg</Text>
                      </View>
                    </View>
                    <View style={styles.ratioCircle}>
                      <Ionicons name="trophy" size={24} color={COLORS.primary} />
                      <Text style={styles.ratioText}>100%</Text>
                    </View>
                  </View>

                  {/* Formula Selectors */}
                  <View style={styles.formulaRow}>
                    {[
                      { id: 'media', label: 'Media de Fórmulas' },
                      { id: 'epley', label: 'Epley' },
                      { id: 'brzycki', label: 'Brzycki' },
                      { id: 'lombardi', label: 'Lombardi' },
                    ].map((f) => {
                      const isSel = selectedFormula === f.id;
                      return (
                        <TouchableOpacity
                          key={f.id}
                          style={[styles.formulaChip, isSel && styles.formulaChipActive]}
                          onPress={() => setSelectedFormula(f.id as any)}
                        >
                          <Text style={[styles.formulaChipText, isSel && styles.formulaChipTextActive]}>
                            {f.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Percentage Breakdown Table */}
                <View style={styles.tableHeadingRow}>
                  <Text style={styles.sectionHeading}>TABLA DE PORCENTAJES Y ZONAS</Text>
                  <Text style={styles.tableSubHint}>Toca para ver discos en barra 🏋️</Text>
                </View>
                <View style={styles.tableCard}>
                  {percentageTable.map((item, idx) => {
                    const targetKg = Math.round((calculated1RM * (item.pct / 100)) * 2) / 2;
                    return (
                      <TouchableOpacity
                        key={item.pct}
                        style={[
                          styles.tableRow,
                          idx === percentageTable.length - 1 && { borderBottomWidth: 0 },
                        ]}
                        onPress={() => setPlateCalcWeight(targetKg)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.pctBadge, { backgroundColor: `${item.color}22` }]}>
                          <Text style={[styles.pctBadgeText, { color: item.color }]}>{item.pct}%</Text>
                        </View>

                        <View style={styles.tableMiddleCol}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.targetWeightText}>{targetKg} kg</Text>
                            <MaterialCommunityIcons name="disc-alert" size={14} color="#8E8E93" />
                          </View>
                          <Text style={styles.targetZoneText}>{item.label}</Text>
                        </View>

                        <View style={styles.tableRepsBadge}>
                          <Text style={styles.tableRepsNumber}>{item.reps}</Text>
                          <Text style={styles.tableRepsLabel}>reps</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={() => setShowOneRmModal(false)}
                >
                  <Text style={styles.confirmBtnText}>Cerrar Calculadora</Text>
                </TouchableOpacity>
              </ScrollView>
            </>
          )}

          {/* Plate Calculator Overlay when tapping any weight */}
          {plateCalcWeight !== null && (
            <PlateCalculatorModal
              visible={plateCalcWeight !== null}
              initialWeight={plateCalcWeight}
              onClose={() => setPlateCalcWeight(null)}
            />
          )}
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
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#2C2C30',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#252528',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSub: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#222226',
  },
  scrollContent: {
    padding: 20,
  },
  exerciseBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E22',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    marginBottom: 16,
  },
  exerciseBadgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  exerciseBadgeRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseBadgeName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  exerciseBadgeTapHint: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  musclePill: {
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  musclePillText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputCard: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    alignItems: 'center',
  },
  inputCardLabel: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginVertical: 6,
  },
  inputValueLarge: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
  },
  inputUnit: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '600',
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 4,
    width: '100%',
    justifyContent: 'center',
  },
  stepBtn: {
    backgroundColor: '#26262A',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38383E',
  },
  stepBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  heroResultCard: {
    backgroundColor: 'rgba(255, 106, 0, 0.08)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 106, 0, 0.3)',
    marginBottom: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroLabel: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  heroValue: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '900',
  },
  heroUnit: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '800',
  },
  ratioCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 106, 0, 0.4)',
  },
  ratioText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  formulaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  formulaChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#26262A',
    borderWidth: 1,
    borderColor: '#35353A',
  },
  formulaChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  formulaChipText: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '600',
  },
  formulaChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tableHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeading: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  tableSubHint: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  tableCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    overflow: 'hidden',
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#26262A',
  },
  pctBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    width: 52,
    alignItems: 'center',
    marginRight: 12,
  },
  pctBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  tableMiddleCol: {
    flex: 1,
  },
  targetWeightText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  targetZoneText: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 2,
  },
  tableRepsBadge: {
    alignItems: 'center',
    backgroundColor: '#26262A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tableRepsNumber: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  tableRepsLabel: {
    color: '#8E8E93',
    fontSize: 9,
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  // Picker Styles
  pickerContainer: {
    maxHeight: 560,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#252528',
  },
  pickerBackBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#252528',
  },
  pickerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  pickerSub: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  pickerSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E22',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  pickerSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    padding: 0,
  },
  pickerChipsWrapper: {
    paddingVertical: 10,
  },
  pickerChipsRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pickerChip: {
    backgroundColor: '#222226',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#303036',
  },
  pickerChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pickerChipText: {
    color: '#A1A1A6',
    fontSize: 12,
    fontWeight: '600',
  },
  pickerChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  pickerList: {
    maxHeight: 380,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  pickerExerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1F',
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#26262B',
  },
  pickerExerciseItemActive: {
    backgroundColor: 'rgba(255, 106, 0, 0.12)',
    borderColor: COLORS.primary,
  },
  pickerExLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  pickerExIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#26262C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  pickerExIconCircleActive: {
    backgroundColor: COLORS.primary,
  },
  pickerExName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  pickerExNameActive: {
    color: COLORS.primary,
  },
  pickerExMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pickerExMuscleBadge: {
    backgroundColor: 'rgba(255, 106, 0, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pickerExMuscleBadgeText: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: '800',
  },
  pickerExEquipText: {
    color: '#8E8E93',
    fontSize: 10,
    textTransform: 'capitalize',
  },
  emptyPickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyPickerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyPickerSub: {
    color: '#8E8E93',
    fontSize: 12,
    textAlign: 'center',
  },
});
