import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { AnatomyModel } from '../components/anatomy/AnatomyModel';
import { BodyMetricsView } from '../components/body/BodyMetricsView';
import { useWorkoutStore } from '../store/workoutStore';

export const CuerpoScreen: React.FC = () => {
  const { bodyViewMode, setBodyViewMode, setShowQrPassModal } = useWorkoutStore();

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top View Mode Switcher + QR Pass Button */}
        <View style={styles.segmentedContainer}>
          <View style={styles.segmentedCapsule}>
            <TouchableOpacity
              style={[styles.segmentBtn, bodyViewMode === 'muscles' && styles.segmentBtnActive]}
              onPress={() => setBodyViewMode('muscles')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="body"
                size={14}
                color={bodyViewMode === 'muscles' ? '#FFFFFF' : '#8E8E93'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.segmentText,
                  bodyViewMode === 'muscles' && styles.segmentTextActive,
                ]}
              >
                Silueta Muscular
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, bodyViewMode === 'metrics' && styles.segmentBtnActive]}
              onPress={() => setBodyViewMode('metrics')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="tape-measure"
                size={16}
                color={bodyViewMode === 'metrics' ? '#FFFFFF' : '#8E8E93'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.segmentText,
                  bodyViewMode === 'metrics' && styles.segmentTextActive,
                ]}
              >
                Medidas y Peso
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.qrPassPill}
            onPress={() => setShowQrPassModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="card-outline" size={16} color={COLORS.primary} style={{ marginRight: 4 }} />
            <Text style={styles.qrPassPillText}>Carnet</Text>
          </TouchableOpacity>
        </View>

        {/* Content according to selected view mode */}
        <View style={styles.content}>
          {bodyViewMode === 'muscles' ? <AnatomyModel /> : <BodyMetricsView />}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
  segmentedContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  segmentedCapsule: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  qrPassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 106, 0, 0.35)',
  },
  qrPassPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 17,
  },
  segmentBtnActive: {
    backgroundColor: '#2C2C30',
  },
  segmentText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  content: {
    flex: 1,
  },
});
