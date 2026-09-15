import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useWorkoutStore } from '../../store/workoutStore';
import { AddMeasurementModal } from './AddMeasurementModal';
import type { BodyMeasurementRecord } from '../../types';

type WeightComparison = {
  direction: 'up' | 'down' | 'same';
  text: string;
};

const getHistoryMeasurements = (record: BodyMeasurementRecord) => [
  { label: 'Grasa corporal', value: record.bodyFatPct, unit: '%' },
  { label: 'Hombros', value: record.shouldersCm, unit: ' cm' },
  { label: 'Pecho', value: record.chestCm, unit: ' cm' },
  { label: 'Bíceps izq.', value: record.armLeftCm, unit: ' cm' },
  { label: 'Bíceps der.', value: record.armRightCm, unit: ' cm' },
  { label: 'Cintura', value: record.waistCm, unit: ' cm' },
  { label: 'Cadera', value: record.hipsCm, unit: ' cm' },
  { label: 'Muslo izq.', value: record.thighLeftCm, unit: ' cm' },
  { label: 'Muslo der.', value: record.thighRightCm, unit: ' cm' },
  { label: 'Gemelos', value: record.calfCm, unit: ' cm' },
].filter((item) => item.value !== undefined && item.value !== null);

const formatWeightComparison = (current?: number, previous?: number): WeightComparison | null => {
  if (current === undefined || current === null || previous === undefined || previous === null) return null;

  const diff = parseFloat((current - previous).toFixed(1));
  if (!Number.isFinite(diff)) return null;
  if (diff === 0) return { direction: 'same', text: 'Sin cambio' };

  const magnitude = Math.abs(diff);
  return {
    direction: diff > 0 ? 'up' : 'down',
    text: `${diff > 0 ? 'Subió' : 'Bajó'} ${magnitude} kg vs. anterior`,
  };
};

const parseWeight = (value: string): number | null => {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatWeight = (value: number): string => Number.isInteger(value) ? String(value) : value.toFixed(1);

export const BodyMetricsView: React.FC = () => {
  const { bodyMeasurements, targetWeightKg, setTargetWeightKg } = useWorkoutStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(targetWeightKg === null ? '' : String(targetWeightKg));

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

  const oldest = bodyMeasurements[bodyMeasurements.length - 1];
  const targetDifference = latest && targetWeightKg !== null
    ? parseFloat((latest.weightKg - targetWeightKg).toFixed(1))
    : null;
  const targetStatus = targetDifference === null
    ? null
    : targetDifference === 0
      ? 'Objetivo alcanzado'
      : targetDifference > 0
        ? `Bajar ${formatWeight(Math.abs(targetDifference))} kg`
        : `Subir ${formatWeight(Math.abs(targetDifference))} kg`;
  const evolutionDifference = latest && oldest && latest.id !== oldest.id
    ? parseFloat((latest.weightKg - oldest.weightKg).toFixed(1))
    : null;
  const evolutionText = evolutionDifference === null
    ? null
    : evolutionDifference === 0
      ? 'Sin cambios desde el primer registro'
      : `${evolutionDifference < 0 ? 'Bajaste' : 'Subiste'} ${formatWeight(Math.abs(evolutionDifference))} kg desde el primer registro`;
  const targetProgress = latest && oldest && targetWeightKg !== null
    ? targetWeightKg === oldest.weightKg
      ? latest.weightKg === targetWeightKg ? 100 : 0
      : Math.max(0, Math.min(100, ((latest.weightKg - oldest.weightKg) / (targetWeightKg - oldest.weightKg)) * 100))
    : null;

  const handleSaveTarget = () => {
    const parsed = parseWeight(targetInput);
    if (parsed === null || parsed < 20 || parsed > 500) {
      alert('Introduce un objetivo de peso válido entre 20 y 500 kg.');
      return;
    }
    setTargetWeightKg(parseFloat(parsed.toFixed(1)));
    setTargetInput(formatWeight(parsed));
    setIsEditingTarget(false);
  };

  const handleClearTarget = () => {
    setTargetWeightKg(null);
    setTargetInput('');
    setIsEditingTarget(false);
  };

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

        <View style={styles.targetCard}>
          <View style={styles.targetHeader}>
            <View style={styles.targetLabelRow}>
              <Ionicons name="flag-outline" size={16} color={COLORS.primary} />
              <Text style={styles.targetLabel}>OBJETIVO DE PESO</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setTargetInput(targetWeightKg === null ? '' : String(targetWeightKg));
                setIsEditingTarget((editing) => !editing);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.targetEditText}>{isEditingTarget ? 'Cancelar' : targetWeightKg === null ? 'Añadir' : 'Editar'}</Text>
            </TouchableOpacity>
          </View>

          {isEditingTarget ? (
            <View style={styles.targetEditRow}>
              <View style={styles.targetInputBox}>
                <TextInput
                  style={styles.targetInput}
                  keyboardType="decimal-pad"
                  value={targetInput}
                  onChangeText={setTargetInput}
                  placeholder="70"
                  placeholderTextColor="#636366"
                  autoFocus
                />
                <Text style={styles.targetUnit}>kg</Text>
              </View>
              <TouchableOpacity style={styles.targetSaveButton} onPress={handleSaveTarget} activeOpacity={0.85}>
                <Text style={styles.targetSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          ) : targetWeightKg !== null ? (
            <>
              <View style={styles.targetValueRow}>
                <Text style={styles.targetValue}>{formatWeight(targetWeightKg)} kg</Text>
                <Text style={[styles.targetStatus, targetDifference === 0 ? styles.targetReached : undefined]}>
                  {targetStatus}
                </Text>
              </View>
              {targetProgress !== null && (
                <View style={styles.targetProgressTrack}>
                  <View style={[styles.targetProgressFill, { width: `${targetProgress}%` }]} />
                </View>
              )}
              {evolutionText && <Text style={styles.evolutionText}>{evolutionText}</Text>}
              <TouchableOpacity onPress={handleClearTarget} activeOpacity={0.8}>
                <Text style={styles.clearTargetText}>Quitar objetivo</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => setIsEditingTarget(true)} activeOpacity={0.8}>
              <Text style={styles.targetEmptyText}>Define un peso deseado para seguir tu evolución</Text>
            </TouchableOpacity>
          )}
        </View>

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
      <View style={[styles.sectionHeader, styles.historySectionHeader]}>
        <Text style={styles.sectionTitle}>Historial de Registros</Text>
        <Text style={styles.historyCount}>
          {bodyMeasurements.length} {bodyMeasurements.length === 1 ? 'registro' : 'registros'}
        </Text>
      </View>

      {bodyMeasurements.map((rec, index) => {
        // Records are sorted newest first, so the next item is the prior reading.
        const comparison = formatWeightComparison(rec.weightKg, bodyMeasurements[index + 1]?.weightKg);
        const measurements = getHistoryMeasurements(rec);
        const comparisonColor = comparison?.direction === 'up'
          ? '#FF9500'
          : comparison?.direction === 'down'
            ? '#34C759'
            : '#8E8E93';

        return (
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

              <View style={styles.historyWeightBlock}>
                <Text style={styles.historyWeightText}>{rec.weightKg} kg</Text>
                {comparison ? (
                  <View
                    style={[
                      styles.historyDelta,
                      comparison.direction === 'up'
                        ? styles.historyDeltaUp
                        : comparison.direction === 'down'
                          ? styles.historyDeltaDown
                          : styles.historyDeltaSame,
                    ]}
                  >
                    <Ionicons
                      name={comparison.direction === 'up' ? 'arrow-up' : comparison.direction === 'down' ? 'arrow-down' : 'remove'}
                      size={11}
                      color={comparisonColor}
                    />
                    <Text style={[styles.historyDeltaText, { color: comparisonColor }]}>{comparison.text}</Text>
                  </View>
                ) : (
                  <Text style={styles.historyInitialText}>Registro inicial</Text>
                )}
              </View>
            </View>

            {rec.notes && <Text style={styles.historyNotes}>&quot;{rec.notes}&quot;</Text>}

            {measurements.length > 0 ? (
              <View style={styles.historyChipsRow}>
                {measurements.map((item) => (
                  <Text key={item.label} style={styles.historyChip}>
                    {item.label}: {item.value}{item.unit}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.historyNoMeasurements}>Sin medidas corporales adicionales</Text>
            )}
          </View>
        );
      })}

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
  targetCard: {
    backgroundColor: '#26262A',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#34343A',
  },
  targetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  targetLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  targetLabel: {
    color: '#A1A1A6',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  targetEditText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  targetValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
  },
  targetValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  targetStatus: {
    color: '#FF9500',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  targetReached: {
    color: '#34C759',
  },
  targetProgressTrack: {
    height: 6,
    backgroundColor: '#3A3A40',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 10,
  },
  targetProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  evolutionText: {
    color: '#D1D1D6',
    fontSize: 11,
    marginTop: 8,
  },
  clearTargetText: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
  },
  targetEmptyText: {
    color: '#D1D1D6',
    fontSize: 12,
    lineHeight: 17,
  },
  targetEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  targetInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#45454C',
    paddingHorizontal: 10,
    height: 40,
  },
  targetInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    padding: 0,
  },
  targetUnit: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 5,
  },
  targetSaveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    justifyContent: 'center',
  },
  targetSaveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
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
  historySectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  historyCount: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
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
    flex: 1,
    minWidth: 0,
  },
  historyDateText: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  historyWeightBlock: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  historyDelta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  historyDeltaUp: {
    backgroundColor: 'rgba(255, 149, 0, 0.14)',
  },
  historyDeltaDown: {
    backgroundColor: 'rgba(52, 199, 89, 0.14)',
  },
  historyDeltaSame: {
    backgroundColor: 'rgba(142, 142, 147, 0.14)',
  },
  historyDeltaText: {
    fontSize: 10,
    fontWeight: '700',
  },
  historyInitialText: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
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
  historyNoMeasurements: {
    color: '#8E8E93',
    fontSize: 11,
  },
});
