import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { EquipmentType, MemberLevel, MemberObjective, MuscleId, RoutineCollection, RoutineDay, RoutineExercise, RoutineTemplate, WeekDay } from '../../types';
import { useWorkoutStore } from '../../store/workoutStore';
import { createId } from '../../utils/ids';

interface CreateRoutineModalProps {
  visible: boolean;
  onClose: () => void;
  variant?: 'personal' | 'template';
  onSaveRoutine?: (routine: RoutineCollection, metadata: {
    objective: MemberObjective;
    level: MemberLevel;
    equipment: EquipmentType[];
  }) => Promise<void> | void;
  initialTemplate?: RoutineTemplate | null;
}

const WEEKDAY_OPTIONS: WeekDay[] = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];

const MUSCLE_LABELS: Record<MuscleId, string> = {
  pectoral: 'Pecho',
  biceps: 'Bíceps',
  hombros: 'Hombros',
  oblicuos: 'Oblicuos',
  abdomen: 'Abdomen',
  antebrazo: 'Antebrazo',
  cuadriceps: 'Cuádriceps',
  abductores: 'Abductores',
  adductores: 'Aductores',
  cardio: 'Cardio',
  trapecio: 'Trapecio',
  triceps: 'Tríceps',
  dorsales: 'Espalda',
  lumbares: 'Lumbares',
  gluteos: 'Glúteos',
  isquiotibiales: 'Isquiotibiales',
  pantorrillas: 'Gemelos',
};

const MUSCLE_FILTERS: Array<{ id: MuscleId | 'todos'; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'pectoral', label: MUSCLE_LABELS.pectoral },
  { id: 'dorsales', label: MUSCLE_LABELS.dorsales },
  { id: 'hombros', label: MUSCLE_LABELS.hombros },
  { id: 'biceps', label: MUSCLE_LABELS.biceps },
  { id: 'triceps', label: MUSCLE_LABELS.triceps },
  { id: 'abdomen', label: MUSCLE_LABELS.abdomen },
  { id: 'oblicuos', label: MUSCLE_LABELS.oblicuos },
  { id: 'gluteos', label: MUSCLE_LABELS.gluteos },
  { id: 'cuadriceps', label: MUSCLE_LABELS.cuadriceps },
  { id: 'isquiotibiales', label: MUSCLE_LABELS.isquiotibiales },
  { id: 'pantorrillas', label: MUSCLE_LABELS.pantorrillas },
  { id: 'antebrazo', label: MUSCLE_LABELS.antebrazo },
  { id: 'trapecio', label: MUSCLE_LABELS.trapecio },
  { id: 'lumbares', label: MUSCLE_LABELS.lumbares },
  { id: 'abductores', label: MUSCLE_LABELS.abductores },
  { id: 'adductores', label: MUSCLE_LABELS.adductores },
  { id: 'cardio', label: MUSCLE_LABELS.cardio },
];

const EQUIPMENT_FILTERS: Array<{ id: EquipmentType | 'todos'; label: string }> = [
  { id: 'todos', label: 'Todos los equipamientos' },
  { id: 'maquina', label: 'Máquina' },
  { id: 'barra', label: 'Barra' },
  { id: 'mancuerna', label: 'Mancuernas' },
  { id: 'polea', label: 'Polea' },
  { id: 'peso_corporal', label: 'Peso corporal' },
  { id: 'cardio', label: 'Cardio' },
  { id: 'otro', label: 'Otro' },
];

type RoutineDraftExercise = {
  id?: string;
  exerciseId: string;
  sets: number;
  repRange: string;
  weightRange: string;
  restSeconds: number;
};

type RoutineDraftDay = {
  id: string;
  name: string;
  dayBadge: WeekDay;
  scheduledDays: WeekDay[];
  exercises: RoutineDraftExercise[];
};

const createDraftDay = (position: number): RoutineDraftDay => {
  const dayBadge = WEEKDAY_OPTIONS[(position - 1) % WEEKDAY_OPTIONS.length];
  return {
    id: createId('draft-day'),
    name: '',
    dayBadge,
    scheduledDays: [dayBadge],
    exercises: [],
  };
};

const templateToDraftDays = (template: RoutineTemplate): RoutineDraftDay[] => template.routine.days.map((day) => ({
  id: day.id,
  name: day.name,
  dayBadge: day.dayBadge,
  scheduledDays: day.scheduledDays?.length ? day.scheduledDays : [day.dayBadge],
  exercises: day.exercises.map((exercise) => ({
    id: exercise.id,
    exerciseId: exercise.exerciseId,
    sets: exercise.targetSets,
    repRange: exercise.targetRepRange,
    weightRange: exercise.targetWeightRange,
    restSeconds: exercise.targetRestSeconds,
  })),
}));

export const CreateRoutineModal: React.FC<CreateRoutineModalProps> = ({
  visible,
  onClose,
  variant = 'personal',
  onSaveRoutine,
  initialTemplate = null,
}) => {
  const { exercises, saveNewCustomRoutine } = useWorkoutStore();

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [objective, setObjective] = useState<MemberObjective>('hipertrofia');
  const [level, setLevel] = useState<MemberLevel>('principiante');
  const [equipment, setEquipment] = useState<EquipmentType[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Draft days list
  const [days, setDays] = useState<RoutineDraftDay[]>(() => [createDraftDay(1)]);

  // Exercise selection submodal state
  const [activeDayIndexForExercise, setActiveDayIndexForExercise] = useState<number | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState<MuscleId | 'todos'>('todos');
  const [isMuscleFilterOpen, setIsMuscleFilterOpen] = useState(false);
  const [selectedEquipmentFilter, setSelectedEquipmentFilter] = useState<EquipmentType | 'todos'>('todos');
  const [isEquipmentFilterOpen, setIsEquipmentFilterOpen] = useState(false);
  const [editingExerciseTarget, setEditingExerciseTarget] = useState<{ dayIndex: number; exerciseIndex: number } | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (initialTemplate) {
      setTitle(initialTemplate.title);
      setSubtitle(initialTemplate.subtitle || '');
      setObjective(initialTemplate.objective);
      setLevel(initialTemplate.level);
      setEquipment(initialTemplate.equipment);
      setDays(templateToDraftDays(initialTemplate));
    } else {
      setTitle('');
      setSubtitle('');
      setObjective('hipertrofia');
      setLevel('principiante');
      setEquipment([]);
      setDays([createDraftDay(1)]);
    }
    setEditingExerciseTarget(null);
    setActiveDayIndexForExercise(null);
    setExerciseSearch('');
    setSelectedMuscleFilter('todos');
    setSelectedEquipmentFilter('todos');
    setIsMuscleFilterOpen(false);
    setIsEquipmentFilterOpen(false);
  }, [visible, initialTemplate]);

  const closeExercisePicker = () => {
    setActiveDayIndexForExercise(null);
    setExerciseSearch('');
    setSelectedMuscleFilter('todos');
    setIsMuscleFilterOpen(false);
    setSelectedEquipmentFilter('todos');
    setIsEquipmentFilterOpen(false);
  };

  const handleAddDay = () => {
    setDays((currentDays) => [...currentDays, createDraftDay(currentDays.length + 1)]);
  };

  const handleRemoveDay = (index: number) => {
    if (days.length <= 1) return;
    setDays((currentDays) => currentDays.filter((_, i) => i !== index));
  };

  const toggleScheduledDay = (dayIndex: number, weekday: WeekDay) => {
    setDays((currentDays) => currentDays.map((day, index) => {
      if (index !== dayIndex) return day;
      const currentSchedule = day.scheduledDays.length ? day.scheduledDays : [day.dayBadge];
      // A block must remain assigned to at least one weekday.
      if (currentSchedule.includes(weekday) && currentSchedule.length === 1) return day;
      const nextSchedule = currentSchedule.includes(weekday)
        ? currentSchedule.filter((item) => item !== weekday)
        : WEEKDAY_OPTIONS.filter((item) => [...currentSchedule, weekday].includes(item));
      return { ...day, scheduledDays: nextSchedule, dayBadge: nextSchedule[0] };
    }));
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
    closeExercisePicker();
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

  const updateDraftExercise = (dayIndex: number, exerciseIndex: number, patch: Partial<RoutineDraftExercise>) => {
    setDays((currentDays) => currentDays.map((day, currentDayIndex) => {
      if (currentDayIndex !== dayIndex) return day;
      return {
        ...day,
        exercises: day.exercises.map((exercise, currentExerciseIndex) => (
          currentExerciseIndex === exerciseIndex ? { ...exercise, ...patch } : exercise
        )),
      };
    }));
  };

  const handleSaveRoutine = async () => {
    if (isSaving) return;
    if (!title.trim()) {
      alert('Por favor introduce un nombre para tu rutina.');
      return;
    }

    if (days.some((day) => !day.name.trim())) {
      alert('Describe cada rutina semanal para que el socio sepa qué debe entrenar.');
      return;
    }
    if (days.some((day) => day.exercises.length === 0)) {
      alert('Añade al menos un ejercicio a cada día de la rutina.');
      return;
    }

    const collectionId = initialTemplate?.id || createId('collection');

    const formattedDays: RoutineDay[] = days.map((d) => {
      const dayId = d.id || createId('routine-day');
      const routineExercises: RoutineExercise[] = d.exercises.map((ex, index) => ({
        id: ex.id || createId('routine-exercise'),
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
          reps: Number.parseInt(ex.repRange, 10) || 12,
          weightKg: Number.parseFloat(ex.weightRange) || 0,
          isCompleted: false,
        })),
      }));

      return {
        id: dayId,
        name: d.name.trim(),
        dayBadge: d.dayBadge,
        scheduledDays: d.scheduledDays.length ? d.scheduledDays : [d.dayBadge],
        estimatedMinutes: Math.max(30, routineExercises.length * 12),
        estimatedCalories: Math.max(300, routineExercises.length * 90),
        exercisesCount: routineExercises.length,
        exercises: routineExercises,
      };
    });

    const newCollection: RoutineCollection = {
      id: collectionId,
      title: title.trim(),
      subtitle: subtitle.trim() || 'Plan semanal creado por el monitor',
      days: formattedDays,
    };

    try {
      setIsSaving(true);
      if (onSaveRoutine) {
        await onSaveRoutine(newCollection, { objective, level, equipment });
      } else {
        saveNewCustomRoutine(newCollection);
      }
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo guardar la rutina.');
    } finally {
      setIsSaving(false);
    }
  };

  const normalizedExerciseSearch = exerciseSearch.trim().toLowerCase();
  const filteredExercisesForPicker = exercises.filter((e) => {
    const matchesMuscle =
      selectedMuscleFilter === 'todos' || e.primaryMuscle === selectedMuscleFilter;
    const matchesEquipment =
      selectedEquipmentFilter === 'todos' || e.equipment === selectedEquipmentFilter;
    const searchableMuscles = [e.primaryMuscle, ...e.secondaryMuscles]
      .map((muscle) => `${muscle} ${MUSCLE_LABELS[muscle] || muscle}`.toLowerCase())
      .join(' ');
    const matchesSearch =
      !normalizedExerciseSearch ||
      e.name.toLowerCase().includes(normalizedExerciseSearch) ||
      searchableMuscles.includes(normalizedExerciseSearch);

    return matchesMuscle && matchesEquipment && matchesSearch;
  });
  const selectedMuscleLabel =
    selectedMuscleFilter === 'todos' ? 'Todos los grupos' : MUSCLE_LABELS[selectedMuscleFilter];
  const selectedEquipmentLabel =
    EQUIPMENT_FILTERS.find((filter) => filter.id === selectedEquipmentFilter)?.label
    ?? 'Todos los equipamientos';
  const editingExercise = editingExerciseTarget
    ? days[editingExerciseTarget.dayIndex]?.exercises[editingExerciseTarget.exerciseIndex]
    : null;
  const editingExerciseInfo = editingExercise
    ? exercises.find((exercise) => exercise.id === editingExercise.exerciseId)
    : undefined;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.subtitle}>{variant === 'template' ? 'BIBLIOTECA DEL GIMNASIO' : 'PERSONALIZACIÓN'}</Text>
              <Text style={styles.title}>{initialTemplate ? 'Revisar y editar plantilla' : variant === 'template' ? 'Crear Plantilla Manual' : 'Crear Nueva Rutina'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#A1A1A6" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Title & Description */}
            <Text style={styles.sectionHeading}>PLAN SEMANAL</Text>
            <Text style={styles.inputLabel}>Nombre del plan semanal *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej. Semana 1 · Hipertrofia"
              placeholderTextColor="#636366"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.inputLabel}>Indicaciones del monitor (opcional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej. Alternar días y dejar un día de descanso si hay fatiga"
              placeholderTextColor="#636366"
              value={subtitle}
              onChangeText={setSubtitle}
            />

            {variant === 'template' && (
              <View style={styles.templateMetadata}>
                <Text style={styles.sectionHeading}>PERFIL DE LA PLANTILLA</Text>
                <Text style={styles.inputLabel}>Objetivo</Text>
                <View style={styles.templateChipRow}>
                  {([
                    ['hipertrofia', 'Hipertrofia'], ['fuerza', 'Fuerza'],
                    ['perdida_grasa', 'Pérdida grasa'], ['salud_general', 'Salud'],
                  ] as Array<[MemberObjective, string]>).map(([id, label]) => (
                    <TouchableOpacity key={id} onPress={() => setObjective(id)} style={[styles.templateChip, objective === id && styles.templateChipActive]}>
                      <Text style={[styles.templateChipText, objective === id && styles.templateChipTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.inputLabel}>Nivel</Text>
                <View style={styles.templateChipRow}>
                  {([
                    ['principiante', 'Principiante'], ['intermedio', 'Intermedio'], ['avanzado', 'Avanzado'],
                  ] as Array<[MemberLevel, string]>).map(([id, label]) => (
                    <TouchableOpacity key={id} onPress={() => setLevel(id)} style={[styles.templateChip, level === id && styles.templateChipActive]}>
                      <Text style={[styles.templateChipText, level === id && styles.templateChipTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.inputLabel}>Material disponible (opcional)</Text>
                <View style={styles.templateChipRow}>
                  {EQUIPMENT_FILTERS.filter((item) => item.id !== 'todos').map((item) => {
                    const id = item.id as EquipmentType;
                    const selected = equipment.includes(id);
                    return (
                      <TouchableOpacity key={id} onPress={() => setEquipment((current) => selected ? current.filter((value) => value !== id) : [...current, id])} style={[styles.templateChip, selected && styles.templateChipActive]}>
                        <Text style={[styles.templateChipText, selected && styles.templateChipTextActive]}>{item.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Each block is a different workout that can be scheduled on one or more weekdays. */}
            <View style={styles.daysHeaderRow}>
              <Text style={styles.sectionHeading}>RUTINAS DE LA SEMANA ({days.length})</Text>
              <TouchableOpacity style={styles.addDayBtn} onPress={handleAddDay}>
                <Ionicons name="add" size={16} color={COLORS.primary} />
                <Text style={styles.addDayBtnText}>Añadir rutina</Text>
              </TouchableOpacity>
            </View>

            {days.map((day, dayIndex) => {
              return (
                <View key={day.id} style={styles.dayCardBox}>
                  <View style={styles.dayCardTop}>
                    <TextInput
                      style={styles.dayNameInput}
                      value={day.name}
                      placeholder="Ej. Torso y core"
                      placeholderTextColor="#7C7C82"
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

                  <Text style={styles.weekdayLabel}>DÍAS EN LOS QUE SE REALIZA ESTA RUTINA</Text>
                  <View style={styles.weekdayRow}>
                    {WEEKDAY_OPTIONS.map((w) => {
                      const isSel = day.scheduledDays.includes(w);
                      const wColor = COLORS.dayBadges[w];
                      return (
                        <TouchableOpacity
                          key={w}
                          style={[
                            styles.weekdayChip,
                            isSel && { backgroundColor: wColor, borderColor: wColor },
                          ]}
                          onPress={() => toggleScheduledDay(dayIndex, w)}
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
                        <View key={exItem.id || exIndex} style={styles.exerciseItemRow}>
                          <View style={styles.exerciseBullet} />
                          <TouchableOpacity style={styles.exerciseItemEdit} onPress={() => setEditingExerciseTarget({ dayIndex, exerciseIndex: exIndex })} accessibilityLabel={`Editar ${exObj?.name || 'ejercicio'}`}>
                            <Text style={styles.exerciseItemName} numberOfLines={1}>{exObj?.name || 'Ejercicio'}</Text>
                            <Text style={styles.exerciseItemSets}>{exItem.sets} series · {exItem.repRange} reps · {exItem.restSeconds}s</Text>
                          </TouchableOpacity>
                          <Ionicons name="pencil-outline" size={16} color={COLORS.primary} style={styles.exerciseEditIcon} />
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
          <TouchableOpacity style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]} onPress={() => void handleSaveRoutine()} activeOpacity={0.85} disabled={isSaving}>
            <Text style={styles.saveBtnText}>{isSaving ? 'Guardando…' : initialTemplate ? 'Guardar cambios en la Biblioteca' : variant === 'template' ? 'Guardar en la Biblioteca' : 'Guardar Rutina en Mi Colección'}</Text>
          </TouchableOpacity>
        </View>

        {/* Submodal to Pick an Exercise */}
        {activeDayIndexForExercise !== null && (
          <Modal visible={true} transparent animationType="fade">
            <View style={styles.pickerOverlay}>
              <View style={styles.pickerBox}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Seleccionar Ejercicio</Text>
                  <TouchableOpacity onPress={closeExercisePicker}>
                    <Ionicons name="close" size={24} color="#A1A1A6" />
                  </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.pickerSearchBar}>
                  <Ionicons name="search" size={16} color="#8E8E93" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.pickerSearchInput}
                    placeholder="Buscar ejercicio o grupo muscular..."
                    placeholderTextColor="#636366"
                    value={exerciseSearch}
                    onChangeText={setExerciseSearch}
                  />
                </View>

                {/* Muscle group dropdown */}
                <TouchableOpacity
                  style={styles.muscleDropdownButton}
                  onPress={() => {
                    setIsMuscleFilterOpen((isOpen) => !isOpen);
                    setIsEquipmentFilterOpen(false);
                  }}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`Grupo muscular: ${selectedMuscleLabel}`}
                  accessibilityState={{ expanded: isMuscleFilterOpen }}
                >
                  <View style={styles.muscleDropdownButtonCopy}>
                    <Ionicons name="body-outline" size={17} color={COLORS.primary} />
                    <Text style={styles.muscleDropdownLabel}>Grupo muscular</Text>
                    <Text style={styles.muscleDropdownValue} numberOfLines={1}>{selectedMuscleLabel}</Text>
                  </View>
                  <Ionicons
                    name={isMuscleFilterOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#A1A1A6"
                  />
                </TouchableOpacity>

                {isMuscleFilterOpen && (
                  <View style={styles.muscleDropdownMenu}>
                    <ScrollView
                      style={styles.muscleDropdownList}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled
                    >
                      {MUSCLE_FILTERS.map((filter) => {
                        const isSelected = selectedMuscleFilter === filter.id;
                        return (
                          <TouchableOpacity
                            key={filter.id}
                            style={[styles.muscleDropdownOption, isSelected && styles.muscleDropdownOptionSelected]}
                            onPress={() => {
                              setSelectedMuscleFilter(filter.id);
                              setIsMuscleFilterOpen(false);
                            }}
                            activeOpacity={0.75}
                          >
                            <Text
                              style={[
                                styles.muscleDropdownOptionText,
                                isSelected && styles.muscleDropdownOptionTextSelected,
                              ]}
                            >
                              {filter.label}
                            </Text>
                            {isSelected && <Ionicons name="checkmark" size={17} color={COLORS.primary} />}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Equipment dropdown */}
                <TouchableOpacity
                  style={styles.muscleDropdownButton}
                  onPress={() => {
                    setIsEquipmentFilterOpen((isOpen) => !isOpen);
                    setIsMuscleFilterOpen(false);
                  }}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`Equipamiento: ${selectedEquipmentLabel}`}
                  accessibilityState={{ expanded: isEquipmentFilterOpen }}
                >
                  <View style={styles.muscleDropdownButtonCopy}>
                    <MaterialCommunityIcons name="dumbbell" size={17} color={COLORS.primary} />
                    <Text style={styles.muscleDropdownLabel}>Equipamiento</Text>
                    <Text style={styles.muscleDropdownValue} numberOfLines={1}>{selectedEquipmentLabel}</Text>
                  </View>
                  <Ionicons
                    name={isEquipmentFilterOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#A1A1A6"
                  />
                </TouchableOpacity>

                {isEquipmentFilterOpen && (
                  <View style={styles.muscleDropdownMenu}>
                    <ScrollView
                      style={styles.muscleDropdownList}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled
                    >
                      {EQUIPMENT_FILTERS.map((filter) => {
                        const isSelected = selectedEquipmentFilter === filter.id;
                        return (
                          <TouchableOpacity
                            key={filter.id}
                            style={[styles.muscleDropdownOption, isSelected && styles.muscleDropdownOptionSelected]}
                            onPress={() => {
                              setSelectedEquipmentFilter(filter.id);
                              setIsEquipmentFilterOpen(false);
                            }}
                            activeOpacity={0.75}
                          >
                            <Text
                              style={[
                                styles.muscleDropdownOptionText,
                                isSelected && styles.muscleDropdownOptionTextSelected,
                              ]}
                            >
                              {filter.label}
                            </Text>
                            {isSelected && <Ionicons name="checkmark" size={17} color={COLORS.primary} />}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                <Text style={styles.pickerResultCount}>
                  {filteredExercisesForPicker.length === 1
                    ? '1 ejercicio disponible'
                    : `${filteredExercisesForPicker.length} ejercicios disponibles`}
                </Text>

                {/* Exercise List */}
                <ScrollView
                  style={[
                    styles.pickerList,
                    (isMuscleFilterOpen || isEquipmentFilterOpen) && styles.pickerListWithDropdown,
                  ]}
                  showsVerticalScrollIndicator={false}
                >
                  {filteredExercisesForPicker.map((ex) => (
                    <TouchableOpacity
                      key={ex.id}
                      style={styles.pickerItem}
                      onPress={() => handleSelectExerciseForDay(ex.id)}
                    >
                      <View style={styles.pickerItemImage}>
                        {(() => {
                          const thumbnailUri =
                            (Platform.OS === 'web' && ex.localImagePath
                              ? ex.localImagePath
                              : ex.imageUrl || ex.localImagePath) || '';

                          if (!thumbnailUri) {
                            return <MaterialCommunityIcons name="dumbbell" size={28} color="#8E8E93" />;
                          }

                          // On web use a native lazy image so opening the picker does not
                          // download the whole exercise library at once.
                          if (Platform.OS === 'web') {
                            return React.createElement('img', {
                              src: thumbnailUri,
                              loading: 'lazy',
                              alt: `Imagen de ${ex.name}`,
                              style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
                            });
                          }

                          return (
                            <Image
                              source={{ uri: thumbnailUri }}
                              resizeMode="cover"
                              style={styles.pickerItemImageContent}
                              accessibilityLabel={`Imagen de ${ex.name}`}
                            />
                          );
                        })()}
                      </View>
                      <View style={styles.pickerItemCopy}>
                        <Text style={styles.pickerItemName} numberOfLines={2}>{ex.name}</Text>
                        <Text style={styles.pickerItemMuscle}>
                          {MUSCLE_LABELS[ex.primaryMuscle] || ex.primaryMuscle} • {ex.equipment}
                        </Text>
                      </View>
                      <Ionicons name="add-circle" size={22} color={COLORS.primary} />
                    </TouchableOpacity>
                  ))}
                  {filteredExercisesForPicker.length === 0 && (
                    <View style={styles.pickerEmptyState}>
                      <Ionicons name="search-outline" size={26} color="#8E8E93" />
                      <Text style={styles.pickerEmptyTitle}>No hay ejercicios</Text>
                      <Text style={styles.pickerEmptyText}>Prueba con otro nombre, grupo muscular o equipamiento.</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}

        {editingExerciseTarget && editingExercise && (
          <Modal visible transparent animationType="fade" onRequestClose={() => setEditingExerciseTarget(null)}>
            <View style={styles.pickerOverlay}>
              <View style={styles.exerciseSettingsBox}>
                <View style={styles.pickerHeader}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.pickerTitle}>Ajustar ejercicio</Text>
                    <Text style={styles.exerciseSettingsName}>{editingExerciseInfo?.name || 'Ejercicio'}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setEditingExerciseTarget(null)} accessibilityLabel="Cerrar ajuste de ejercicio">
                    <Ionicons name="close" size={24} color="#A1A1A6" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.exerciseSettingsHint}>Modifica la propuesta antes de guardarla en la biblioteca.</Text>
                <View style={styles.exerciseSettingsGrid}>
                  <View style={styles.exerciseSettingField}>
                    <Text style={styles.exerciseSettingLabel}>SERIES</Text>
                    <TextInput style={styles.exerciseSettingInput} value={String(editingExercise.sets)} keyboardType="number-pad" onChangeText={(value) => updateDraftExercise(editingExerciseTarget.dayIndex, editingExerciseTarget.exerciseIndex, { sets: Math.max(1, Math.min(8, Number.parseInt(value, 10) || 1)) })} />
                  </View>
                  <View style={styles.exerciseSettingField}>
                    <Text style={styles.exerciseSettingLabel}>REPETICIONES</Text>
                    <TextInput style={styles.exerciseSettingInput} value={editingExercise.repRange} onChangeText={(value) => updateDraftExercise(editingExerciseTarget.dayIndex, editingExerciseTarget.exerciseIndex, { repRange: value.slice(0, 30) })} />
                  </View>
                  <View style={styles.exerciseSettingField}>
                    <Text style={styles.exerciseSettingLabel}>DESCANSO (S)</Text>
                    <TextInput style={styles.exerciseSettingInput} value={String(editingExercise.restSeconds)} keyboardType="number-pad" onChangeText={(value) => updateDraftExercise(editingExerciseTarget.dayIndex, editingExerciseTarget.exerciseIndex, { restSeconds: Math.max(20, Math.min(300, Number.parseInt(value, 10) || 20)) })} />
                  </View>
                  <View style={styles.exerciseSettingField}>
                    <Text style={styles.exerciseSettingLabel}>CARGA GUÍA (KG)</Text>
                    <TextInput style={styles.exerciseSettingInput} value={editingExercise.weightRange} keyboardType="decimal-pad" onChangeText={(value) => updateDraftExercise(editingExerciseTarget.dayIndex, editingExerciseTarget.exerciseIndex, { weightRange: value.slice(0, 30) })} />
                  </View>
                </View>
                <TouchableOpacity style={styles.exerciseSettingsDone} onPress={() => setEditingExerciseTarget(null)}>
                  <Text style={styles.exerciseSettingsDoneText}>Guardar ajuste</Text>
                </TouchableOpacity>
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
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
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
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  inputLabel: {
    color: '#D1D1D6',
    fontSize: 13,
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
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#34343A',
    marginBottom: 10,
  },
  templateMetadata: {
    marginBottom: 4,
  },
  templateChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 4,
  },
  templateChip: {
    borderWidth: 1,
    borderColor: '#3A3A40',
    backgroundColor: '#26262A',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  templateChipActive: {
    backgroundColor: 'rgba(22, 201, 91, 0.15)',
    borderColor: COLORS.primary,
  },
  templateChipText: {
    color: '#B5B5BB',
    fontSize: 12,
    fontWeight: '700',
  },
  templateChipTextActive: {
    color: COLORS.primary,
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
    backgroundColor: 'rgba(22, 201, 91, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  addDayBtnText: {
    color: COLORS.primary,
    fontSize: 13,
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
    fontSize: 12,
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
  weekdayLabel: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 12,
    marginBottom: 7,
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
    fontSize: 11,
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
  exerciseItemEdit: {
    flex: 1,
    minHeight: 34,
    justifyContent: 'center',
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
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseItemSets: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 2,
  },
  exerciseEditIcon: {
    marginHorizontal: 8,
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
    fontSize: 13,
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
  saveBtnDisabled: {
    opacity: 0.65,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  exerciseSettingsBox: {
    width: '90%',
    maxWidth: 390,
    backgroundColor: '#242428',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#3A3A40',
  },
  exerciseSettingsName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  exerciseSettingsHint: {
    color: '#A1A1A6',
    fontSize: 13,
    lineHeight: 18,
    marginTop: -3,
    marginBottom: 15,
  },
  exerciseSettingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  exerciseSettingField: {
    width: '47%',
  },
  exerciseSettingLabel: {
    color: '#A1A1A6',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  exerciseSettingInput: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#3A3A40',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  exerciseSettingsDone: {
    marginTop: 18,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    paddingVertical: 13,
  },
  exerciseSettingsDoneText: {
    color: '#FFFFFF',
    fontSize: 15,
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
    maxWidth: 430,
    maxHeight: '88%',
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
    fontSize: 15,
    padding: 0,
  },
  muscleDropdownButton: {
    minHeight: 44,
    backgroundColor: '#26262A',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#3A3A40',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  muscleDropdownButtonCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  muscleDropdownLabel: {
    color: '#A1A1A6',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
    marginRight: 6,
  },
  muscleDropdownValue: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  muscleDropdownMenu: {
    backgroundColor: '#242428',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#3A3A40',
    marginBottom: 8,
    overflow: 'hidden',
  },
  muscleDropdownList: {
    maxHeight: 170,
  },
  muscleDropdownOption: {
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#303036',
  },
  muscleDropdownOptionSelected: {
    backgroundColor: 'rgba(22, 201, 91, 0.12)',
  },
  muscleDropdownOptionText: {
    color: '#D1D1D6',
    fontSize: 14,
    fontWeight: '600',
  },
  muscleDropdownOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  pickerResultCount: {
    color: '#8E8E93',
    fontSize: 12,
    marginBottom: 4,
  },
  pickerList: {
    maxHeight: 360,
  },
  pickerListWithDropdown: {
    maxHeight: 220,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 82,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#28282C',
  },
  pickerItemImage: {
    width: 72,
    height: 68,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#26262A',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerItemImageContent: {
    width: '100%',
    height: '100%',
  },
  pickerItemCopy: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  pickerItemName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  pickerItemMuscle: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  pickerEmptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  pickerEmptyTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  pickerEmptyText: {
    color: '#8E8E93',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
