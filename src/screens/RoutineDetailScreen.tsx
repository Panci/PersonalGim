import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { RoutineDay, RoutineExercise } from '../types';
import { useWorkoutStore } from '../store/workoutStore';

interface RoutineDetailScreenProps {
  onBack: () => void;
  onOpenConfigExercise: (dayId: string, routineExerciseId: string) => void;
}

export const RoutineDetailScreen: React.FC<RoutineDetailScreenProps> = ({
  onBack,
  onOpenConfigExercise,
}) => {
  const {
    selectedCollection,
    selectedDay,
    setSelectedDay,
    startWorkoutFromDay,
    exercises,
    updateRoutineCollectionDetails,
    updateRoutineDayName,
    addExerciseToRoutineDay,
    removeExerciseFromRoutineDay,
  } = useWorkoutStore();

  const collection = selectedCollection;
  const [isEditingRoutine, setIsEditingRoutine] = useState(false);
  const [routineTitle, setRoutineTitle] = useState('');
  const [routineSubtitle, setRoutineSubtitle] = useState('');
  const [isEditingDay, setIsEditingDay] = useState(false);
  const [dayName, setDayName] = useState('');
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [exerciseQuery, setExerciseQuery] = useState('');

  const openRoutineEditor = () => {
    setRoutineTitle(collection?.title || '');
    setRoutineSubtitle(collection?.subtitle || '');
    setIsEditingRoutine(true);
  };

  const saveRoutineDetails = () => {
    if (!collection || !routineTitle.trim()) return;
    updateRoutineCollectionDetails(collection.id, routineTitle, routineSubtitle);
    setIsEditingRoutine(false);
  };

  const openDayEditor = (name: string) => {
    setDayName(name);
    setIsEditingDay(true);
  };

  const saveDayName = () => {
    if (!selectedDay || !dayName.trim()) return;
    updateRoutineDayName(selectedDay.id, dayName);
    setIsEditingDay(false);
  };

  const selectableExercises = exercises.filter((exercise) => {
    const query = exerciseQuery.trim().toLowerCase();
    return !query || exercise.name.toLowerCase().includes(query) || exercise.primaryMuscle.includes(query);
  });

  // If a day is selected, show Day Workout Detail (IMG_1173.PNG)
  if (selectedDay) {
    const badgeColor =
      COLORS.dayBadges[selectedDay.dayBadge as keyof typeof COLORS.dayBadges] || COLORS.primary;

    const totalEstimatedWeight = selectedDay.exercises.reduce((acc, curr) => {
      const avgWeight = curr.defaultSets.reduce((sAcc, s) => sAcc + s.weightKg, 0);
      return acc + avgWeight;
    }, 0);

    return (
      <View style={styles.container}>
        {/* Top Navigation */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedDay(null)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            <Text style={styles.backLabel}>Rutina</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => openDayEditor(selectedDay.name)}
            accessibilityLabel="Editar nombre del día"
          >
            <Ionicons name="pencil" size={19} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.dayScrollContent}>
          {/* Day Title & Badge */}
          <View style={styles.dayTitleRow}>
            <View style={[styles.dayBadgePill, { backgroundColor: badgeColor }]}>
              <Text style={styles.dayBadgeText}>{selectedDay.dayBadge.toUpperCase()}</Text>
            </View>
            <Text style={styles.dayHeaderTitle}>{selectedDay.name}</Text>
          </View>

          {/* Summary Ribbon matching IMG_1173.PNG */}
          <View style={styles.summaryRibbon}>
            <View style={styles.ribbonItem}>
              <Ionicons name="time-outline" size={18} color="#FF9500" />
              <Text style={styles.ribbonValue}>{selectedDay.estimatedMinutes} min</Text>
            </View>
            <View style={styles.ribbonDivider} />
            <View style={styles.ribbonItem}>
              <Ionicons name="flame-outline" size={18} color="#FF3B30" />
              <Text style={styles.ribbonValue}>{selectedDay.estimatedCalories} kcal</Text>
            </View>
            <View style={styles.ribbonDivider} />
            <View style={styles.ribbonItem}>
              <MaterialCommunityIcons name="weight-kilogram" size={18} color="#0A84FF" />
              <Text style={styles.ribbonValue}>{totalEstimatedWeight * 3} kg</Text>
            </View>
          </View>

          {/* Exercises Header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Ejercicios ({selectedDay.exercises.length})
            </Text>
            <TouchableOpacity
              style={styles.addExerciseButton}
              onPress={() => setShowExercisePicker(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.addExerciseText}>Añadir</Text>
            </TouchableOpacity>
          </View>

          {/* Exercises List matching IMG_1173.PNG */}
          {selectedDay.exercises.map((re, index) => {
            const exInfo = exercises.find((e) => e.id === re.exerciseId);
            const setsCount = re.defaultSets.length || re.targetSets || 4;

            return (
              <View
                key={re.id}
                style={styles.exerciseRowCard}
              >
                <View style={styles.exerciseIndexBox}>
                  <Text style={styles.exerciseIndexText}>{index + 1}</Text>
                </View>

                <TouchableOpacity
                  style={styles.exerciseInfoColumn}
                  onPress={() => onOpenConfigExercise(selectedDay.id, re.id)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.exerciseRowName}>
                    {exInfo?.name || 'Ejercicio'}
                  </Text>
                  <Text style={styles.exerciseRowMeta}>
                    {setsCount} series • {re.targetRepRange} reps • {re.targetWeightRange} kg
                  </Text>
                </TouchableOpacity>

                {/* Edit / Config Action button */}
                <TouchableOpacity
                  style={styles.configExerciseBtn}
                  onPress={() => onOpenConfigExercise(selectedDay.id, re.id)}
                >
                  <Ionicons name="settings-outline" size={18} color="#8E8E93" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeExerciseButton}
                  onPress={() => removeExerciseFromRoutineDay(selectedDay.id, re.id)}
                  accessibilityLabel={`Eliminar ${exInfo?.name || 'ejercicio'}`}
                >
                  <Ionicons name="trash-outline" size={18} color="#FF6961" />
                </TouchableOpacity>
              </View>
            );
          })}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Big Orange "Iniciar Entrenamiento" CTA Button (from IMG_1173.PNG) */}
        <View style={styles.bottomCtaContainer}>
          <TouchableOpacity
            style={styles.startWorkoutButton}
            onPress={() => startWorkoutFromDay(selectedDay)}
            activeOpacity={0.85}
          >
            <Ionicons name="play" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.startWorkoutText}>Iniciar Entrenamiento</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={isEditingDay} transparent animationType="fade" onRequestClose={() => setIsEditingDay(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.editModal}>
              <View style={styles.editHeader}>
                <Text style={styles.editTitle}>Editar día de entrenamiento</Text>
                <TouchableOpacity onPress={() => setIsEditingDay(false)} accessibilityLabel="Cerrar edición del día">
                  <Ionicons name="close" size={24} color="#A1A1A6" />
                </TouchableOpacity>
              </View>
              <Text style={styles.inputLabel}>Nombre del día</Text>
              <TextInput
                style={styles.textInput}
                value={dayName}
                onChangeText={setDayName}
                maxLength={80}
                placeholder="Ej. Día 1 - Empuje"
                placeholderTextColor="#636366"
                autoFocus
              />
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.cancelEditButton} onPress={() => setIsEditingDay(false)}>
                  <Text style={styles.cancelEditText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveEditButton, !dayName.trim() && styles.saveEditButtonDisabled]}
                  onPress={saveDayName}
                  disabled={!dayName.trim()}
                >
                  <Text style={styles.saveEditText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showExercisePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowExercisePicker(false)}
        >
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerSheet}>
              <View style={styles.editHeader}>
                <View>
                  <Text style={styles.editTitle}>Añadir ejercicio</Text>
                  <Text style={styles.pickerHint}>Se añadirá con una serie editable.</Text>
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
                    onPress={() => {
                      addExerciseToRoutineDay(selectedDay.id, exercise.id);
                      setExerciseQuery('');
                      setShowExercisePicker(false);
                    }}
                  >
                    <View style={styles.pickerIcon}>
                      <MaterialCommunityIcons name="dumbbell" size={18} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerOptionName}>{exercise.name}</Text>
                      <Text style={styles.pickerOptionMeta}>{exercise.primaryMuscle.toUpperCase()} · {exercise.equipment}</Text>
                    </View>
                    <Ionicons name="add-circle" size={22} color={COLORS.primary} />
                  </TouchableOpacity>
                ))}
                {selectableExercises.length === 0 && (
                  <Text style={styles.noResultsText}>No se encontraron ejercicios.</Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Days List Screen (IMG_1171.PNG)
  return (
    <View style={styles.container}>
      {/* Top Navigation */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          <Text style={styles.backLabel}>Colección</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuButton} onPress={openRoutineEditor} accessibilityLabel="Editar nombre de rutina">
          <Ionicons name="pencil" size={19} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* Collection Title */}
        <Text style={styles.collectionTitle}>
          {collection?.title || 'Brazos Fuertes y Torneados'}
        </Text>
        <Text style={styles.collectionSub}>
          {collection?.subtitle || 'Programa estructurado de hipertrofia muscular'}
        </Text>

        {/* Days List matching IMG_1171.PNG */}
        <View style={styles.daysList}>
          {collection?.days.map((day) => {
            const badgeColor =
              COLORS.dayBadges[day.dayBadge as keyof typeof COLORS.dayBadges] || COLORS.primary;

            return (
              <TouchableOpacity
                key={day.id}
                style={styles.dayCard}
                onPress={() => setSelectedDay(day)}
                activeOpacity={0.8}
              >
                {/* Weekday Badge */}
                <View style={[styles.dayCardBadge, { backgroundColor: badgeColor }]}>
                  <Text style={styles.dayCardBadgeText}>
                    {day.dayBadge.toUpperCase()}
                  </Text>
                </View>

                {/* Day Info */}
                <View style={styles.dayCardInfo}>
                  <Text style={styles.dayCardName}>{day.name}</Text>
                  <Text style={styles.dayCardMeta}>
                    {day.estimatedMinutes} min • {day.estimatedCalories} kcal • {day.exercises.length} ejerc.
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color="#636366" />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={isEditingRoutine} transparent animationType="fade" onRequestClose={() => setIsEditingRoutine(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.editModal}>
            <View style={styles.editHeader}>
              <Text style={styles.editTitle}>Editar rutina</Text>
              <TouchableOpacity onPress={() => setIsEditingRoutine(false)} accessibilityLabel="Cerrar edición">
                <Ionicons name="close" size={24} color="#A1A1A6" />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Nombre de la rutina</Text>
            <TextInput
              style={styles.textInput}
              value={routineTitle}
              onChangeText={setRoutineTitle}
              maxLength={80}
              placeholder="Ej. Fuerza - septiembre"
              placeholderTextColor="#636366"
              autoFocus
            />
            <Text style={styles.inputLabel}>Descripción (opcional)</Text>
            <TextInput
              style={[styles.textInput, styles.descriptionInput]}
              value={routineSubtitle}
              onChangeText={setRoutineSubtitle}
              maxLength={180}
              placeholder="Objetivo de la rutina"
              placeholderTextColor="#636366"
              multiline
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelEditButton} onPress={() => setIsEditingRoutine(false)}>
                <Text style={styles.cancelEditText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveEditButton, !routineTitle.trim() && styles.saveEditButtonDisabled]}
                onPress={saveRoutineDetails}
                disabled={!routineTitle.trim()}
              >
                <Text style={styles.saveEditText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 18 : 26,
    paddingBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  menuButton: {
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editModal: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#34343A',
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  editTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
  },
  inputLabel: {
    color: '#D1D1D6',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#26262A',
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#3A3A40',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    marginBottom: 14,
  },
  descriptionInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  cancelEditButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelEditText: {
    color: '#D1D1D6',
    fontSize: 14,
    fontWeight: '700',
  },
  saveEditButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveEditButtonDisabled: {
    backgroundColor: '#55555B',
  },
  saveEditText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  dayScrollContent: {
    paddingHorizontal: 20,
    // The start-workout CTA is pinned to the bottom of the screen; leave
    // enough scroll room so the final exercise is never hidden behind it.
    paddingBottom: 132,
  },
  collectionTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 8,
    marginBottom: 4,
  },
  collectionSub: {
    color: '#8E8E93',
    fontSize: 15,
    marginBottom: 24,
  },
  daysList: {
    gap: 12,
  },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  dayCardBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  dayCardBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  dayCardInfo: {
    flex: 1,
  },
  dayCardName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  dayCardMeta: {
    color: '#8E8E93',
    fontSize: 13,
  },
  dayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  dayBadgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 12,
  },
  dayBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  dayHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    flex: 1,
  },
  summaryRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  ribbonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ribbonValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  ribbonDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#2C2C32',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addExerciseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  exerciseRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  exerciseIndexBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#26262A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exerciseIndexText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  exerciseInfoColumn: {
    flex: 1,
  },
  exerciseRowName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  exerciseRowMeta: {
    color: '#8E8E93',
    fontSize: 13,
  },
  configExerciseBtn: {
    padding: 6,
  },
  removeExerciseButton: {
    padding: 6,
    marginLeft: 4,
  },
  bottomCtaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    paddingTop: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1E',
  },
  startWorkoutButton: {
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
  startWorkoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  pickerSheet: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    maxHeight: '82%',
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  pickerHint: {
    color: '#8E8E93',
    fontSize: 13,
    marginTop: 3,
  },
  pickerSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#26262A',
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
  pickerIcon: {
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
  pickerOptionMeta: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
  noResultsText: {
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: 28,
  },
});
