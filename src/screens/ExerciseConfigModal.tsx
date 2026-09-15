import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { ExerciseSet, Exercise } from '../types';
import { SeriesStepper } from '../components/workout/SeriesStepper';
import { useWorkoutStore } from '../store/workoutStore';
import { ExerciseMovementPreview } from '../components/exercise/ExerciseMovementPreview';

interface ExerciseConfigModalProps {
  visible: boolean;
  dayId: string;
  routineExerciseId: string;
  exercise: Exercise;
  initialSets: ExerciseSet[];
  initialRestSeconds?: number;
  onClose: () => void;
}

export const ExerciseConfigModal: React.FC<ExerciseConfigModalProps> = ({
  visible,
  dayId,
  routineExerciseId,
  exercise,
  initialSets,
  initialRestSeconds = 60,
  onClose,
}) => {
  const { updateExerciseSets } = useWorkoutStore();

  const [sets, setSets] = useState<ExerciseSet[]>([...initialSets]);
  const [restSeconds, setRestSeconds] = useState<number>(initialRestSeconds);

  const handleUpdateSet = (index: number, reps: number, weightKg: number) => {
    const updated = [...sets];
    if (updated[index]) {
      updated[index] = {
        ...updated[index],
        reps,
        weightKg,
      };
      setSets(updated);
    }
  };

  const handleAddSet = () => {
    const lastSet = sets[sets.length - 1];
    const newSetNum = sets.length + 1;
    setSets([
      ...sets,
      {
        id: `set-${Date.now()}-${newSetNum}`,
        setNumber: newSetNum,
        type: 'normal',
        reps: lastSet ? lastSet.reps : 12,
        weightKg: lastSet ? lastSet.weightKg : 40,
        isCompleted: false,
        restSeconds,
      },
    ]);
  };

  const handleRemoveSet = (index: number) => {
    if (sets.length <= 1) return;
    const updated = sets.filter((_, i) => i !== index).map((s, idx) => ({ ...s, setNumber: idx + 1 }));
    setSets(updated);
  };

  const handleSave = () => {
    updateExerciseSets(dayId, routineExerciseId, sets, restSeconds);
    onClose();
  };

  const restOptions = [30, 45, 60, 90, 120];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header matching IMG_1174.PNG */}
          <View style={styles.header}>
            <View style={styles.exerciseHeading}>
              <ExerciseMovementPreview exercise={exercise} width={106} height={86} />
              <View style={styles.exerciseHeadingText}>
                <Text style={styles.muscleSubheader}>
                  {exercise.primaryMuscle.toUpperCase()}
                </Text>
                <Text style={styles.title}>{exercise.name}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#A1A1A6" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Section label */}
            <Text style={styles.sectionHeading}>SERIES Y REPETICIONES</Text>

            {/* Vertical Timeline Stepper */}
            <SeriesStepper
              sets={sets}
              onUpdateSet={handleUpdateSet}
              onAddSet={handleAddSet}
              onRemoveSet={handleRemoveSet}
            />

            {/* Rest Timer Selector matching IMG_1174.PNG */}
            <View style={styles.restConfigBox}>
              <View style={styles.restTitleRow}>
                <Ionicons name="timer-outline" size={18} color={COLORS.primary} />
                <Text style={styles.restHeading}>Descanso entre series</Text>
                <Text style={styles.restActiveValue}>
                  ⏱️ {Math.floor(restSeconds / 60)}:
                  {String(restSeconds % 60).padStart(2, '0')}
                </Text>
              </View>

              <View style={styles.restOptionsRow}>
                {restOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.restChip, restSeconds === opt && styles.restChipActive]}
                    onPress={() => setRestSeconds(opt)}
                  >
                    <Text style={[styles.restChipText, restSeconds === opt && styles.restChipTextActive]}>
                      {opt}s
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Action Save Button */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>Guardar Cambios</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderTopColor: '#2C2C32',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  exerciseHeading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  exerciseHeadingText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },
  muscleSubheader: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    maxHeight: 480,
  },
  sectionHeading: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  restConfigBox: {
    backgroundColor: '#26262A',
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#34343A',
  },
  restTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  restHeading: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  restActiveValue: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  restOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  restChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#36363C',
  },
  restChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  restChipText: {
    color: '#A1A1A6',
    fontSize: 12,
    fontWeight: '600',
  },
  restChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 14,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
