import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../theme/colors';
import { useWorkoutStore, EntrenoSegment } from '../../store/workoutStore';

export const FloatingSegmentCapsule: React.FC = () => {
  const { entrenoSegment, setEntrenoSegment, startQuickWorkout } = useWorkoutStore();

  const segments: { id: EntrenoSegment; label: string }[] = [
    { id: 'plan', label: 'Plan' },
    { id: 'entreno', label: 'Entreno' },
    { id: 'rapido', label: 'Rápido' },
  ];

  const handlePress = (id: EntrenoSegment) => {
    setEntrenoSegment(id);
    if (id === 'rapido') {
      startQuickWorkout();
    }
  };

  return (
    <View style={styles.floatingWrapper} pointerEvents="box-none">
      <View style={styles.capsuleContainer}>
        {segments.map((seg) => {
          const isActive = entrenoSegment === seg.id;
          return (
            <TouchableOpacity
              key={seg.id}
              style={[styles.segmentItem, isActive && styles.activeSegment]}
              onPress={() => handlePress(seg.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, isActive && styles.activeSegmentText]}>
                {seg.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  capsuleContainer: {
    flexDirection: 'row',
    backgroundColor: '#242426',
    borderRadius: 24,
    padding: 3,
    borderWidth: 1,
    borderColor: '#333336',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  segmentItem: {
    paddingVertical: 8,
    paddingHorizontal: 22,
    borderRadius: 20,
  },
  activeSegment: {
    backgroundColor: '#38383C',
  },
  segmentText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
  },
  activeSegmentText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
