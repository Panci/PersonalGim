import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { ExerciseSet } from '../../types';

interface SeriesStepperProps {
  sets: ExerciseSet[];
  onUpdateSet: (index: number, reps: number, weightKg: number) => void;
  onAddSet: () => void;
  onRemoveSet?: (index: number) => void;
  readOnly?: boolean;
}

export const SeriesStepper: React.FC<SeriesStepperProps> = ({
  sets,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  readOnly = false,
}) => {
  const [editing, setEditing] = useState<{ index: number; field: 'reps' | 'weight' } | null>(null);
  const [draftValue, setDraftValue] = useState('');

  const beginEdit = (index: number, field: 'reps' | 'weight', value: number) => {
    if (readOnly) return;
    setEditing({ index, field });
    setDraftValue(String(value));
  };

  const commitEdit = () => {
    if (!editing) return;

    const normalized = draftValue.replace(',', '.').replace(/[^0-9.]/g, '');
    const parsed = Number.parseFloat(normalized);
    const current = sets[editing.index];

    if (current && Number.isFinite(parsed)) {
      if (editing.field === 'reps') {
        onUpdateSet(editing.index, Math.max(1, Math.min(1000, Math.round(parsed))), current.weightKg);
      } else {
        onUpdateSet(editing.index, current.reps, Math.max(0, Math.min(2000, parsed)));
      }
    }

    setEditing(null);
    setDraftValue('');
  };

  return (
    <View style={styles.container}>
      {sets.map((set, index) => {
        const isLast = index === sets.length - 1;

        return (
          <View key={set.id || index} style={styles.rowWrapper}>
            {/* Left timeline indicator */}
            <View style={styles.timelineColumn}>
              <View style={styles.circleBadge}>
                <Text style={styles.circleText}>{set.setNumber || index + 1}</Text>
              </View>
              {!isLast && <View style={styles.verticalLine} />}
            </View>

            {/* Content controls for Reps and Weight */}
            <View style={styles.contentRow}>
              {/* Reps Stepper */}
              <View style={styles.stepperPill}>
                {!readOnly && (
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => onUpdateSet(index, Math.max(1, set.reps - 1), set.weightKg)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="remove" size={16} color="#A1A1A6" />
                  </TouchableOpacity>
                )}
                <View style={styles.valueWrap}>
                  <TextInput
                    style={styles.valueInput}
                    value={editing?.index === index && editing.field === 'reps' ? draftValue : String(set.reps)}
                    onFocus={() => beginEdit(index, 'reps', set.reps)}
                    onChangeText={setDraftValue}
                    onBlur={commitEdit}
                    onSubmitEditing={commitEdit}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    returnKeyType="done"
                    selectTextOnFocus
                    showSoftInputOnFocus={!readOnly}
                    autoCorrect={false}
                    selectionColor={COLORS.primary}
                    editable={!readOnly}
                    accessibilityLabel={`Repeticiones de la serie ${set.setNumber || index + 1}. Toca para abrir el teclado numérico.`}
                  />
                  <Text style={styles.unitLabel}>reps</Text>
                </View>
                {!readOnly && (
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => onUpdateSet(index, set.reps + 1, set.weightKg)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="add" size={16} color="#A1A1A6" />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.dotSeparator}>•</Text>

              {/* Weight Stepper */}
              <View style={styles.stepperPill}>
                {!readOnly && (
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => onUpdateSet(index, set.reps, Math.max(0, set.weightKg - 2.5))}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="remove" size={16} color="#A1A1A6" />
                  </TouchableOpacity>
                )}
                <View style={styles.valueWrap}>
                  <TextInput
                    style={styles.valueInput}
                    value={editing?.index === index && editing.field === 'weight' ? draftValue : String(set.weightKg)}
                    onFocus={() => beginEdit(index, 'weight', set.weightKg)}
                    onChangeText={setDraftValue}
                    onBlur={commitEdit}
                    onSubmitEditing={commitEdit}
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                    returnKeyType="done"
                    selectTextOnFocus
                    showSoftInputOnFocus={!readOnly}
                    autoCorrect={false}
                    selectionColor={COLORS.primary}
                    editable={!readOnly}
                    accessibilityLabel={`Peso de la serie ${set.setNumber || index + 1}. Toca para abrir el teclado numérico.`}
                  />
                  <Text style={styles.unitLabel}>kg</Text>
                </View>
                {!readOnly && (
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => onUpdateSet(index, set.reps, set.weightKg + 2.5)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="add" size={16} color="#A1A1A6" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Remove set action */}
              {!readOnly && sets.length > 1 && onRemoveSet && (
                <TouchableOpacity
                  style={styles.trashBtn}
                  onPress={() => onRemoveSet(index)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle-outline" size={20} color="#FF453A" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}

      {/* Add Series Button */}
      {!readOnly && (
        <View style={styles.rowWrapper}>
          <View style={styles.timelineColumn}>
            <View style={[styles.circleBadge, styles.circleBadgeAdd]}>
              <Ionicons name="add" size={16} color="#FF6A00" />
            </View>
          </View>
          <TouchableOpacity style={styles.addSeriesButton} onPress={onAddSet} activeOpacity={0.7}>
            <Text style={styles.addSeriesText}>Agregar serie</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  rowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 62,
  },
  timelineColumn: {
    width: 36,
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'flex-start',
  },
  circleBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2C2C2E',
    borderWidth: 1.5,
    borderColor: '#3A3A3C',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  circleBadgeAdd: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255, 106, 0, 0.1)',
  },
  circleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  verticalLine: {
    position: 'absolute',
    top: 28,
    bottom: -8,
    width: 2,
    backgroundColor: '#2C2C2E',
    zIndex: 1,
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    marginLeft: 8,
  },
  stepperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262628',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 6,
    flexShrink: 1,
  },
  stepBtn: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 6,
    flexShrink: 0,
  },
  valueInput: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    minWidth: 46,
    width: 46,
    flexGrow: 0,
    flexShrink: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    textAlign: 'center',
  },
  unitLabel: {
    color: '#A1A1A6',
    fontSize: 11,
    marginLeft: 3,
    fontWeight: '500',
  },
  dotSeparator: {
    color: '#55555A',
    marginHorizontal: 10,
    fontSize: 16,
    fontWeight: '900',
  },
  trashBtn: {
    marginLeft: 'auto',
    padding: 4,
  },
  addSeriesButton: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#3A3A3E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSeriesText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
