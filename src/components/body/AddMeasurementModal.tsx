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
import { useWorkoutStore } from '../../store/workoutStore';

interface AddMeasurementModalProps {
  visible: boolean;
  onClose: () => void;
}

const parseNumber = (value: string): number | undefined => {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const AddMeasurementModal: React.FC<AddMeasurementModalProps> = ({
  visible,
  onClose,
}) => {
  const { addBodyMeasurement, bodyMeasurements } = useWorkoutStore();

  const lastRecord = bodyMeasurements[0];

  const [weightKg, setWeightKg] = useState(lastRecord ? String(lastRecord.weightKg) : '78.5');
  const [bodyFatPct, setBodyFatPct] = useState(lastRecord?.bodyFatPct ? String(lastRecord.bodyFatPct) : '15.0');
  const [chestCm, setChestCm] = useState(lastRecord?.chestCm ? String(lastRecord.chestCm) : '103.0');
  const [armLeftCm, setArmLeftCm] = useState(lastRecord?.armLeftCm ? String(lastRecord.armLeftCm) : '37.5');
  const [armRightCm, setArmRightCm] = useState(lastRecord?.armRightCm ? String(lastRecord.armRightCm) : '38.0');
  const [waistCm, setWaistCm] = useState(lastRecord?.waistCm ? String(lastRecord.waistCm) : '83.5');
  const [hipsCm, setHipsCm] = useState(lastRecord?.hipsCm ? String(lastRecord.hipsCm) : '99.5');
  const [thighLeftCm, setThighLeftCm] = useState(lastRecord?.thighLeftCm ? String(lastRecord.thighLeftCm) : '58.5');
  const [thighRightCm, setThighRightCm] = useState(lastRecord?.thighRightCm ? String(lastRecord.thighRightCm) : '59.0');
  const [calfCm, setCalfCm] = useState(lastRecord?.calfCm ? String(lastRecord.calfCm) : '37.5');
  const [shouldersCm, setShouldersCm] = useState(lastRecord?.shouldersCm ? String(lastRecord.shouldersCm) : '119.0');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    const numWeight = parseNumber(weightKg);
    if (numWeight === undefined || numWeight < 20 || numWeight > 500) {
      alert('Introduce un peso corporal válido entre 20 y 500 kg.');
      return;
    }

    const bodyFat = parseNumber(bodyFatPct);
    if (bodyFatPct.trim() && (bodyFat === undefined || bodyFat < 0 || bodyFat > 100)) {
      alert('El porcentaje de grasa corporal debe estar entre 0 y 100.');
      return;
    }

    const measurements = [
      ['Pecho', chestCm],
      ['Hombros', shouldersCm],
      ['Bíceps izquierdo', armLeftCm],
      ['Bíceps derecho', armRightCm],
      ['Cintura', waistCm],
      ['Cadera', hipsCm],
      ['Muslo izquierdo', thighLeftCm],
      ['Muslo derecho', thighRightCm],
      ['Gemelos', calfCm],
    ] as const;
    for (const [label, value] of measurements) {
      const measurement = parseNumber(value);
      if (value.trim() && (measurement === undefined || measurement <= 0 || measurement > 300)) {
        alert(`${label} debe ser una medida válida entre 0 y 300 cm.`);
        return;
      }
    }

    addBodyMeasurement({
      date: new Date().toISOString(),
      weightKg: numWeight,
      bodyFatPct: bodyFat,
      chestCm: parseNumber(chestCm),
      armLeftCm: parseNumber(armLeftCm),
      armRightCm: parseNumber(armRightCm),
      waistCm: parseNumber(waistCm),
      hipsCm: parseNumber(hipsCm),
      thighLeftCm: parseNumber(thighLeftCm),
      thighRightCm: parseNumber(thighRightCm),
      calfCm: parseNumber(calfCm),
      shouldersCm: parseNumber(shouldersCm),
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.subtitle}>ANTROPOMETRÍA</Text>
              <Text style={styles.title}>Registrar Medidas y Peso</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#A1A1A6" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Primary Metrics: Weight & Fat */}
            <Text style={styles.sectionHeading}>PESO Y COMPOSICIÓN</Text>
            <View style={styles.twoColRow}>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Peso Corporal (kg) *</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="scale-outline" size={18} color={COLORS.primary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={weightKg}
                    onChangeText={setWeightKg}
                    placeholder="78.5"
                    placeholderTextColor="#636366"
                  />
                  <Text style={styles.unitSuffix}>kg</Text>
                </View>
              </View>

              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Grasa Corporal (%)</Text>
                <View style={styles.inputBox}>
                  <MaterialCommunityIcons name="percent-outline" size={18} color="#FF9500" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={bodyFatPct}
                    onChangeText={setBodyFatPct}
                    placeholder="15.0"
                    placeholderTextColor="#636366"
                  />
                  <Text style={styles.unitSuffix}>%</Text>
                </View>
              </View>
            </View>

            {/* Torso & Arms Measurements */}
            <Text style={styles.sectionHeading}>TREN SUPERIOR (CM)</Text>
            <View style={styles.twoColRow}>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Pecho / Pectoral</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={chestCm}
                    onChangeText={setChestCm}
                    placeholder="103.0"
                    placeholderTextColor="#636366"
                  />
                  <Text style={styles.unitSuffix}>cm</Text>
                </View>
              </View>

              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Hombros</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={shouldersCm}
                    onChangeText={setShouldersCm}
                    placeholder="119.0"
                    placeholderTextColor="#636366"
                  />
                  <Text style={styles.unitSuffix}>cm</Text>
                </View>
              </View>
            </View>

            <View style={styles.twoColRow}>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Bíceps Izquierdo</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={armLeftCm}
                    onChangeText={setArmLeftCm}
                    placeholder="37.5"
                    placeholderTextColor="#636366"
                  />
                  <Text style={styles.unitSuffix}>cm</Text>
                </View>
              </View>

              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Bíceps Derecho</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={armRightCm}
                    onChangeText={setArmRightCm}
                    placeholder="38.0"
                    placeholderTextColor="#636366"
                  />
                  <Text style={styles.unitSuffix}>cm</Text>
                </View>
              </View>
            </View>

            {/* Core & Lower Body Measurements */}
            <Text style={styles.sectionHeading}>TREN INFERIOR Y CORE (CM)</Text>
            <View style={styles.twoColRow}>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Cintura (ombligo)</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={waistCm}
                    onChangeText={setWaistCm}
                    placeholder="83.5"
                    placeholderTextColor="#636366"
                  />
                  <Text style={styles.unitSuffix}>cm</Text>
                </View>
              </View>

              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Cadera / Glúteos</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={hipsCm}
                    onChangeText={setHipsCm}
                    placeholder="99.5"
                    placeholderTextColor="#636366"
                  />
                  <Text style={styles.unitSuffix}>cm</Text>
                </View>
              </View>
            </View>

            <View style={styles.twoColRow}>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Muslo Izquierdo</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={thighLeftCm}
                    onChangeText={setThighLeftCm}
                    placeholder="58.5"
                    placeholderTextColor="#636366"
                  />
                  <Text style={styles.unitSuffix}>cm</Text>
                </View>
              </View>

              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Muslo Derecho</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={thighRightCm}
                    onChangeText={setThighRightCm}
                    placeholder="59.0"
                    placeholderTextColor="#636366"
                  />
                  <Text style={styles.unitSuffix}>cm</Text>
                </View>
              </View>
            </View>

            <View style={styles.twoColRow}>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Gemelos / Pantorrillas</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={calfCm}
                    onChangeText={setCalfCm}
                    placeholder="37.5"
                    placeholderTextColor="#636366"
                  />
                  <Text style={styles.unitSuffix}>cm</Text>
                </View>
              </View>
            </View>

            {/* Notes */}
            <Text style={styles.sectionHeading}>NOTAS ADICIONALES</Text>
            <View style={styles.notesBox}>
              <TextInput
                style={styles.notesInput}
                multiline
                numberOfLines={3}
                placeholder="Ej. Medición en ayunas, tras descanso de 8h..."
                placeholderTextColor="#636366"
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Action Button */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>Guardar Medición</Text>
          </TouchableOpacity>
        </View>
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
    marginTop: 14,
    marginBottom: 8,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  inputCol: {
    flex: 1,
  },
  inputLabel: {
    color: '#D1D1D6',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#26262A',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#34343A',
    height: 46,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    padding: 0,
  },
  unitSuffix: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  notesBox: {
    backgroundColor: '#26262A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#34343A',
  },
  notesInput: {
    color: '#FFFFFF',
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
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
});
