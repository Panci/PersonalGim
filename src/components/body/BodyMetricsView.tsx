import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useWorkoutStore } from '../../store/workoutStore';
import { AddMeasurementModal } from './AddMeasurementModal';

export const BodyMetricsView: React.FC = () => {
  const { bodyMeasurements } = useWorkoutStore();
  const [showAddModal, setShowAddModal] = useState(false);

  const latest = bodyMeasurements[0];
  const previous = bodyMeasurements[1] || bodyMeasurements[0];

  // Helper to format delta
  const formatDelta = (current?: number, prev?: number, unit = 'cm') => {
    if (current === undefined || prev === undefined) return null;
    const diff = parseFloat((current - prev).toFixed(1));
    if (diff === 0) return { text: 'Sin cambio', positive: false, isZero: true };
    const sign = diff > 0 ? '+' : '';
    return {
      text: `${sign}${diff} ${unit}`,
      positive: diff > 0,
      isZero: false,
    };
  };

  const weightDelta = formatDelta(latest?.weightKg, previous?.weightKg, 'kg');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Weight Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroTag}>
            <Text style={styles.heroTagText}>PESO ACTUAL</Text>
          </View>
          <Text style={styles.heroDate}>
            {latest
              ? new Date(latest.date).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Sin registros'}
          </Text>
        </View>

        <View style={styles.weightRow}>
          <Text style={styles.weightNumber}>{latest?.weightKg || '--'}</Text>
          <Text style={styles.weightUnit}>kg</Text>

          {weightDelta && !weightDelta.isZero && (
            <View style={[styles.deltaBadge, weightDelta.positive ? styles.deltaUp : styles.deltaDown]}>
              <Ionicons
                name={weightDelta.positive ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={weightDelta.positive ? '#34C759' : '#0A84FF'}
              />
              <Text style={[styles.deltaText, { color: weightDelta.positive ? '#34C759' : '#0A84FF' }]}>
                {weightDelta.text}
              </Text>
            </View>
          )}
        </View>

        {latest?.bodyFatPct && (
          <Text style={styles.fatSubtext}>
            Grasa corporal estimada: <Text style={styles.fatValue}>{latest.bodyFatPct}%</Text>
          </Text>
        )}

        <TouchableOpacity
          style={styles.addMeasureBtn}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.addMeasureBtnText}>Nuevo Registro de Medidas</Text>
        </TouchableOpacity>
      </View>

      {/* Key Hypertrophy Metrics 2x2 Grid */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Puntos Clave de Hipertrofia</Text>
      </View>

      <View style={styles.gridContainer}>
        {/* Card 1: Bíceps */}
        <View style={styles.gridCard}>
          <View style={styles.cardTopRow}>
            <MaterialCommunityIcons name="arm-flex" size={22} color={COLORS.primary} />
            <Text style={styles.cardLabel}>Bíceps (Der.)</Text>
          </View>
          <Text style={styles.cardValue}>{latest?.armRightCm || '--'} <Text style={styles.cardUnit}>cm</Text></Text>
          {(() => {
            const d = formatDelta(latest?.armRightCm, previous?.armRightCm);
            return d ? (
              <Text style={[styles.cardDelta, { color: d.positive ? '#34C759' : '#8E8E93' }]}>
                {d.isZero ? 'Estable' : `${d.text} últ. toma`}
              </Text>
            ) : null;
          })()}
        </View>

        {/* Card 2: Pecho */}
        <View style={styles.gridCard}>
          <View style={styles.cardTopRow}>
            <MaterialCommunityIcons name="human" size={22} color="#FF8533" />
            <Text style={styles.cardLabel}>Pecho</Text>
          </View>
          <Text style={styles.cardValue}>{latest?.chestCm || '--'} <Text style={styles.cardUnit}>cm</Text></Text>
          {(() => {
            const d = formatDelta(latest?.chestCm, previous?.chestCm);
            return d ? (
              <Text style={[styles.cardDelta, { color: d.positive ? '#34C759' : '#8E8E93' }]}>
                {d.isZero ? 'Estable' : `${d.text} últ. toma`}
              </Text>
            ) : null;
          })()}
        </View>

        {/* Card 3: Cintura */}
        <View style={styles.gridCard}>
          <View style={styles.cardTopRow}>
            <MaterialCommunityIcons name="tape-measure" size={22} color="#FFCC00" />
            <Text style={styles.cardLabel}>Cintura</Text>
          </View>
          <Text style={styles.cardValue}>{latest?.waistCm || '--'} <Text style={styles.cardUnit}>cm</Text></Text>
          {(() => {
            const d = formatDelta(latest?.waistCm, previous?.waistCm);
            return d ? (
              <Text style={[styles.cardDelta, { color: !d.positive ? '#34C759' : '#FF9500' }]}>
                {d.isZero ? 'Estable' : `${d.text} últ. toma`}
              </Text>
            ) : null;
          })()}
        </View>

        {/* Card 4: Muslo */}
        <View style={styles.gridCard}>
          <View style={styles.cardTopRow}>
            <MaterialCommunityIcons name="run" size={22} color="#0A84FF" />
            <Text style={styles.cardLabel}>Muslo (Der.)</Text>
          </View>
          <Text style={styles.cardValue}>{latest?.thighRightCm || '--'} <Text style={styles.cardUnit}>cm</Text></Text>
          {(() => {
            const d = formatDelta(latest?.thighRightCm, previous?.thighRightCm);
            return d ? (
              <Text style={[styles.cardDelta, { color: d.positive ? '#34C759' : '#8E8E93' }]}>
                {d.isZero ? 'Estable' : `${d.text} últ. toma`}
              </Text>
            ) : null;
          })()}
        </View>
      </View>

      {/* Full Body Breakdown Table */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Todas las Medidas</Text>
      </View>

      <View style={styles.tableCard}>
        {[
          { label: 'Hombros', val: latest?.shouldersCm },
          { label: 'Pecho / Pectoral', val: latest?.chestCm },
          { label: 'Bíceps Izquierdo', val: latest?.armLeftCm },
          { label: 'Bíceps Derecho', val: latest?.armRightCm },
          { label: 'Cintura (ombligo)', val: latest?.waistCm },
          { label: 'Cadera / Glúteos', val: latest?.hipsCm },
          { label: 'Muslo Izquierdo', val: latest?.thighLeftCm },
          { label: 'Muslo Derecho', val: latest?.thighRightCm },
          { label: 'Gemelos / Pantorrillas', val: latest?.calfCm },
        ].map((item, idx, arr) => (
          <View
            key={item.label}
            style={[styles.tableRow, idx === arr.length - 1 && { borderBottomWidth: 0 }]}
          >
            <Text style={styles.tableLabel}>{item.label}</Text>
            <Text style={styles.tableValue}>{item.val ? `${item.val} cm` : '--'}</Text>
          </View>
        ))}
      </View>

      {/* Measurement History Log */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Historial de Registros</Text>
      </View>

      {bodyMeasurements.map((rec) => (
        <View key={rec.id} style={styles.historyItemCard}>
          <View style={styles.historyItemTop}>
            <View style={styles.historyDateBox}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
              <Text style={styles.historyDateText}>
                {new Date(rec.date).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <Text style={styles.historyWeightText}>{rec.weightKg} kg</Text>
          </View>

          {rec.notes && <Text style={styles.historyNotes}>"{rec.notes}"</Text>}

          <View style={styles.historyChipsRow}>
            {rec.chestCm && <Text style={styles.historyChip}>Pecho: {rec.chestCm}cm</Text>}
            {rec.armRightCm && <Text style={styles.historyChip}>Bíceps: {rec.armRightCm}cm</Text>}
            {rec.waistCm && <Text style={styles.historyChip}>Cintura: {rec.waistCm}cm</Text>}
            {rec.thighRightCm && <Text style={styles.historyChip}>Muslo: {rec.thighRightCm}cm</Text>}
          </View>
        </View>
      ))}

      <View style={{ height: 100 }} />

      {/* Add Modal */}
      <AddMeasurementModal visible={showAddModal} onClose={() => setShowAddModal(false)} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroTag: {
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  heroTagText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroDate: {
    color: '#8E8E93',
    fontSize: 12,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  weightNumber: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  weightUnit: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 4,
    marginRight: 14,
  },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  deltaUp: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
  },
  deltaDown: {
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
  },
  deltaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  fatSubtext: {
    color: '#8E8E93',
    fontSize: 13,
    marginBottom: 16,
  },
  fatValue: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  addMeasureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 14,
  },
  addMeasureBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardLabel: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
  },
  cardValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardUnit: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  cardDelta: {
    fontSize: 11,
    fontWeight: '600',
  },
  tableCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    marginBottom: 24,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#28282C',
  },
  tableLabel: {
    color: '#D1D1D6',
    fontSize: 14,
  },
  tableValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  historyItemCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    marginBottom: 10,
  },
  historyItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyDateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyDateText: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
  },
  historyWeightText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  historyNotes: {
    color: '#A1A1A6',
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  historyChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  historyChip: {
    backgroundColor: '#26262A',
    color: '#D1D1D6',
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
});
