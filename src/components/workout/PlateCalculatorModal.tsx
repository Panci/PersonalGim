import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';

interface PlateCalculatorModalProps {
  visible: boolean;
  onClose: () => void;
  initialWeight?: number;
}

const AVAILABLE_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

export const PlateCalculatorModal: React.FC<PlateCalculatorModalProps> = ({
  visible,
  onClose,
  initialWeight = 60,
}) => {
  const [targetWeight, setTargetWeight] = useState<number>(initialWeight);
  const [barWeight, setBarWeight] = useState<number>(20); // standard 20kg bar

  // Calculate plates per side
  const weightToDistribute = Math.max(0, targetWeight - barWeight);
  const weightPerSide = weightToDistribute / 2;

  const calculatePlates = () => {
    let remaining = weightPerSide;
    const result: { plate: number; count: number }[] = [];

    for (const p of AVAILABLE_PLATES) {
      if (remaining >= p) {
        const count = Math.floor(remaining / p);
        result.push({ plate: p, count });
        remaining = parseFloat((remaining - count * p).toFixed(2));
      }
    }
    return result;
  };

  const plates = calculatePlates();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Calculadora de Discos</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color="#A1A1A6" />
            </TouchableOpacity>
          </View>

          {/* Target Weight Selector */}
          <View style={styles.weightDisplayCard}>
            <Text style={styles.label}>PESO TOTAL OBJETIVO</Text>
            <View style={styles.targetRow}>
              <TouchableOpacity
                style={styles.adjustBtn}
                onPress={() => setTargetWeight((w) => Math.max(barWeight, w - 2.5))}
              >
                <Ionicons name="remove" size={22} color="#FFFFFF" />
              </TouchableOpacity>

              <Text style={styles.targetWeightNum}>{targetWeight} <Text style={styles.targetUnit}>kg</Text></Text>

              <TouchableOpacity
                style={styles.adjustBtn}
                onPress={() => setTargetWeight((w) => w + 2.5)}
              >
                <Ionicons name="add" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Quick chips */}
            <View style={styles.quickChipsRow}>
              {[40, 60, 80, 100, 120].map((w) => (
                <TouchableOpacity
                  key={w}
                  style={[styles.quickChip, targetWeight === w && styles.quickChipActive]}
                  onPress={() => setTargetWeight(w)}
                >
                  <Text style={[styles.quickChipText, targetWeight === w && styles.quickChipTextActive]}>
                    {w} kg
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bar weight toggle */}
          <View style={styles.barWeightRow}>
            <Text style={styles.barLabel}>Peso de la barra:</Text>
            <View style={styles.barToggles}>
              {[20, 15, 10].map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[styles.barToggleBtn, barWeight === b && styles.barToggleBtnActive]}
                  onPress={() => setBarWeight(b)}
                >
                  <Text style={[styles.barToggleText, barWeight === b && styles.barToggleTextActive]}>
                    {b} kg
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Plates per side result */}
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>
              Discos por cada lado ({weightPerSide.toFixed(1)} kg):
            </Text>

            {plates.length === 0 ? (
              <Text style={styles.emptyText}>Solo la barra vacía ({barWeight} kg)</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.platesScroll}>
                {plates.map((item, idx) => (
                  <View key={idx} style={styles.plateItem}>
                    <View style={[styles.plateCircle, item.plate >= 20 ? styles.plateLarge : item.plate >= 10 ? styles.plateMedium : styles.plateSmall]}>
                      <Text style={styles.plateNum}>{item.plate}</Text>
                      <Text style={styles.plateUnit}>kg</Text>
                    </View>
                    <Text style={styles.plateCountBadge}>× {item.count}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Close button */}
          <TouchableOpacity style={styles.doneButton} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.doneButtonText}>Listo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2C2C30',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  weightDisplayCard: {
    backgroundColor: '#26262A',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  adjustBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#323238',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetWeightNum: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    marginHorizontal: 24,
  },
  targetUnit: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '600',
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#1E1E22',
    borderWidth: 1,
    borderColor: '#36363C',
  },
  quickChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quickChipText: {
    color: '#A1A1A6',
    fontSize: 12,
    fontWeight: '600',
  },
  quickChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  barWeightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  barLabel: {
    color: '#D1D1D6',
    fontSize: 14,
  },
  barToggles: {
    flexDirection: 'row',
    gap: 6,
  },
  barToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#26262A',
    borderWidth: 1,
    borderColor: '#36363C',
  },
  barToggleBtnActive: {
    backgroundColor: '#3A3A40',
    borderColor: COLORS.primary,
  },
  barToggleText: {
    color: '#A1A1A6',
    fontSize: 12,
    fontWeight: '600',
  },
  barToggleTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  resultContainer: {
    backgroundColor: '#242428',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  resultTitle: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyText: {
    color: '#A1A1A6',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  platesScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  plateItem: {
    alignItems: 'center',
  },
  plateCircle: {
    borderRadius: 40,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: '#1E1E22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateLarge: {
    width: 60,
    height: 60,
    borderColor: '#FF3B30',
  },
  plateMedium: {
    width: 52,
    height: 52,
    borderColor: '#34C759',
  },
  plateSmall: {
    width: 44,
    height: 44,
    borderColor: '#0A84FF',
  },
  plateNum: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  plateUnit: {
    color: '#8E8E93',
    fontSize: 9,
    fontWeight: '600',
  },
  plateCountBadge: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  doneButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
