import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { RoutineCollection, RoutineDay, RoutineExercise, WeekDay } from '../../types';
import { useWorkoutStore } from '../../store/workoutStore';
import { createId } from '../../utils/ids';

interface CreateRoutineModalProps {
  visible: boolean;
  onClose: () => void;
}

const WEEKDAY_OPTIONS: WeekDay[] = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];

type RoutineDraftDay = {
  id: string;
  name: string;
  dayBadge: WeekDay;
  exercises: { exerciseId: string; sets: number; repRange: string; weightRange: string; restSeconds: number }[];
};

const createDraftDay = (position: number): RoutineDraftDay => ({
  id: createId('draft-day'),
  name: position === 1 ? 'Día 1 - Torso' : `Día ${position}`,
  dayBadge: WEEKDAY_OPTIONS[(position - 1) % WEEKDAY_OPTIONS.length],
  exercises: [],
});

export const CreateRoutineModal: React.FC<CreateRoutineModalProps> = ({
  visible,
  onClose,
}) => {
  const { exercises, saveNewCustomRoutine } = useWorkoutStore();

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');

  // Draft days list
  const [days, setDays] = useState<RoutineDraftDay[]>(() => [createDraftDay(1)]);

  // Exercise selection submodal state
  const [activeDayIndexForExercise, setActiveDayIndexForExercise] = useState<number | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState('');

  const handleAddDay = () => {
    setDays((currentDays) => [...currentDays, createDraftDay(currentDays.length + 1)]);
  };

  const handleRemoveDay = (index: number) => {
    if (days.length <= 1) return;
    setDays((currentDays) => currentDays.filter((_, i) => i !== index));
  };

  const handleSelectExerciseForDay = (exerciseId: string) => {
    if (activeDayIndexForExercise === null) return;
    setDays((currentDays) =>
      currentDays.map((day, index) =>
        index === activeDayIndexForExercise
          ? {
              ...day,
              exercises: [
                ...day.exercises,
                { exerciseId, sets: 4, repRange: '10-12', weightRange: '40-50', restSeconds: 60 },
              ],
            }
          : day
      )
    );
    setActiveDayIndexForExercise(null);
    setExerciseSearch('');
  };

  const handleRemoveExerciseFromDay = (dayIndex: number, exIndex: number) => {
    setDays((currentDays) =>
      currentDays.map((day, index) =>
        index === dayIndex
          ? { ...day, exercises: day.exercises.filter((_, exerciseIndex) => exerciseIndex !== exIndex) }
          : day
      )
    );
  };

  const handleSaveRoutine = () => {
    if (!title.trim()) {
      alert('Por favor introduce un nombre para tu rutina.');
      return;
    }

    if (days.some((day) => !day.name.trim())) {
      alert('Cada día debe tener un nombre.');
      return;
    }
    if (days.some((day) => day.exercises.length === 0)) {
      alert('Añade al menos un ejercicio a cada día de la rutina.');
      return;
    }

    const collectionId = createId('collection');

    const formattedDays: RoutineDay[] = days.map((d) => {
      const dayId = createId('routine-day');
      const routineExercises: RoutineExercise[] = d.exercises.map((ex, index) => ({
        id: createId('routine-exercise'),
        routineId: dayId,
        exerciseId: ex.exerciseId,
        orderIndex: index + 1,
        targetSets: ex.sets,
        targetRepRange: ex.repRange,
        targetWeightRange: ex.weightRange,
        targetRestSeconds: ex.restSeconds,
        defaultSets: Array.from({ length: ex.sets }, (_, index) => ({
          id: createId('routine-set'),
          setNumber: index + 1,
          type: 'normal',
          reps: 12,
          weightKg: 40,
          isCompleted: false,
        })),
      }));

      return {
        id: dayId,
        name: d.name.trim(),
        dayBadge: d.dayBadge,
        estimatedMinutes: Math.max(30, routineExercises.length * 12),
        estimatedCalories: Math.max(300, routineExercises.length * 90),
        exercisesCount: routineExercises.length,
        exercises: routineExercises,
      };
    });

    const newCollection: RoutineCollection = {
      id: collectionId,
      title: title.trim(),
      subtitle: subtitle.trim() || 'Rutina personalizada por el usuario',
      days: formattedDays,
    };

    saveNewCustomRoutine(newCollection);
    setTitle('');
    setSubtitle('');
    setDays([createDraftDay(1)]);
    onClose();
  };

  const filteredExercisesForPicker = exercises.filter((e) =>
    e.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
    e.primaryMuscle.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.subtitle}>PERSONALIZACIÓN</Text>
              <Text style={styles.title}>Crear Nueva Rutina</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#A1A1A6" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Title & Description */}
            <Text style={styles.sectionHeading}>DATOS DE LA RUTINA</Text>
            <Text style={styles.inputLabel}>Nombre de la Rutina *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej. Torso / Pierna Frecuencia 2"
              placeholderTextColor="#636366"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.inputLabel}>Descripción u Objetivo (opcional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej. Enfoque en hipertrofia de pecho y espalda"
              placeholderTextColor="#636366"
              value={subtitle}
              onChangeText={setSubtitle}
            />

            {/* Days Section */}
            <View style={styles.daysHeaderRow}>
              <Text style={styles.sectionHeading}>DÍAS DE ENTRENAMIENTO ({days.length})</Text>
              <TouchableOpacity style={styles.addDayBtn} onPress={handleAddDay}>
                <Ionicons name="add" size={16} color={COLORS.primary} />
                <Text style={styles.addDayBtnText}>Añadir Día</Text>
              </TouchableOpacity>
            </View>

            {days.map((day, dayIndex) => {
              const badgeColor =
                COLORS.dayBadges[day.dayBadge as keyof typeof COLORS.dayBadges] || COLORS.primary;

              return (
                <View key={day.id} style={styles.dayCardBox}>
                  {/* Day Header */}
                  <View style={styles.dayCardTop}>
                    <View style={[styles.dayBadgePill, { backgroundColor: badgeColor }]}>
                      <Text style={styles.dayBadgeText}>{day.dayBadge.toUpperCase()}</Text>
                    </View>
                    <TextInput
                      style={styles.dayNameInput}
                      value={day.name}
                      onChangeText={(name) =>
                        setDays((currentDays) =>
                          currentDays.map((item, index) =>
                            index === dayIndex ? { ...item, name } : item
                          )
                        )
                      }
                    />
                    {days.length > 1 && (
                      <TouchableOpacity onPress={() => handleRemoveDay(dayIndex)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="trash-outline" size={18} color="#FF453A" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Day Badge Selector Pills */}
                  <View style={styles.weekdayRow}>
                    {WEEKDAY_OPTIONS.map((w) => {
                      const isSel = day.dayBadge === w;
                      const wColor = COLORS.dayBadges[w];
                      return (
                        <TouchableOpacity
                          key={w}
                          style={[
                            styles.weekdayChip,
                            isSel && { backgroundColor: wColor, borderColor: wColor },
                          ]}
                          onPress={() =>
                            setDays((currentDays) =>
                              currentDays.map((item, index) =>
                                index === dayIndex ? { ...item, dayBadge: w } : item
                              )
                            )
                          }
                        >
                          <Text style={[styles.weekdayChipText, isSel && { color: '#FFFFFF', fontWeight: '800' }]}>
                            {w.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Exercises in this Day */}
                  <View style={styles.dayExercisesList}>
                    {day.exercises.map((exItem, exIndex) => {
                      const exObj = exercises.find((e) => e.id === exItem.exerciseId);
                      return (
                        <View key={exIndex} style={styles.exerciseItemRow}>
                          <View style={styles.exerciseBullet} />
                          <Text style={styles.exerciseItemName} numberOfLines={1}>
                            {exObj?.name || 'Ejercicio'}
                          </Text>
                          <Text style={styles.exerciseItemSets}>{exItem.sets} series</Text>
                          <TouchableOpacity onPress={() => handleRemoveExerciseFromDay(dayIndex, exIndex)}>
                            <Ionicons name="close-circle-outline" size={18} color="#8E8E93" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>

                  {/* Add Exercise to Day Button */}
                  <TouchableOpacity
                    style={styles.addExerciseToDayBtn}
                    onPress={() => setActiveDayIndexForExercise(dayIndex)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={16} color={COLORS.primary} />
                    <Text style={styles.addExerciseToDayText}>+ Añadir Ejercicio</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveRoutine} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>Guardar Rutina en Mi Colección</Text>
          </TouchableOpacity>
        </View>

        {/* Submodal to Pick an Exercise */}
        {activeDayIndexForExercise !== null && (
          <Modal visible={true} transparent animationType="fade">
            <View style={styles.pickerOverlay}>
              <View style={styles.pickerBox}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Seleccionar Ejercicio</Text>
                  <TouchableOpacity onPress={() => setActiveDayIndexForExercise(null)}>
                    <Ionicons name="close" size={24} color="#A1A1A6" />
                  </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.pickerSearchBar}>
                  <Ionicons name="search" size={16} color="#8E8E93" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.pickerSearchInput}
                    placeholder="Buscar ejercicio o músculo..."
                    placeholderTextColor="#636366"
                    value={exerciseSearch}
                    onChangeText={setExerciseSearch}
                  />
                </View>

                {/* Exercise List */}
                <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
                  {filteredExercisesForPicker.map((ex) => (
                    <TouchableOpacity
                      key={ex.id}
                      style={styles.pickerItem}
                      onPress={() => handleSelectExerciseForDay(ex.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pickerItemName}>{ex.name}</Text>
                        <Text style={styles.pickerItemMuscle}>
                          {ex.primaryMuscle.toUpperCase()} • {ex.equipment}
                        </Text>
                      </View>
                      <Ionicons name="add-circle" size={22} color={COLORS.primary} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderTopColor: '#2C2C32',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  subtitle: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    maxHeight: 520,
  },
  sectionHeading: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  inputLabel: {
    color: '#D1D1D6',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#26262A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#34343A',
    marginBottom: 10,
  },
  daysHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 10,
  },
  addDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  addDayBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  dayCardBox: {
    backgroundColor: '#26262A',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#34343A',
  },
  dayCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dayBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 10,
  },
  dayBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  dayNameInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    padding: 0,
  },
  weekdayRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  weekdayChip: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1E1E22',
    borderWidth: 1,
    borderColor: '#36363C',
    alignItems: 'center',
  },
  weekdayChipText: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '700',
  },
  dayExercisesList: {
    gap: 6,
    marginBottom: 8,
  },
  exerciseItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E22',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exerciseBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginRight: 8,
  },
  exerciseItemName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  exerciseItemSets: {
    color: '#8E8E93',
    fontSize: 11,
    marginRight: 8,
  },
  addExerciseToDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#3C3C42',
  },
  addExerciseToDayText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerBox: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    padding: 18,
    borderWidth: 1,
    borderColor: '#2C2C32',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  pickerSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#26262A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  pickerSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    padding: 0,
  },
  pickerList: {
    maxHeight: 360,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#28282C',
  },
  pickerItemName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  pickerItemMuscle: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
});
