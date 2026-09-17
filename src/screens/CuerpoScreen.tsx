import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { BodyMetricsView } from '../components/body/BodyMetricsView';
import { useWorkoutStore } from '../store/workoutStore';

export const CuerpoScreen: React.FC = () => {
  const { setShowQrPassModal } = useWorkoutStore();

  return (
    <View style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Medidas y Peso</Text>
        <TouchableOpacity
          style={styles.qrPassPill}
          onPress={() => setShowQrPassModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="card-outline" size={16} color={COLORS.primary} style={{ marginRight: 4 }} />
          <Text style={styles.qrPassPillText}>Carnet</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <BodyMetricsView />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  qrPassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(22, 201, 91, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(22, 201, 91, 0.35)',
  },
  qrPassPillText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
});
