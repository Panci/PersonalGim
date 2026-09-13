import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useWorkoutStore, MainTab } from '../../store/workoutStore';

export const BottomTabBar: React.FC = () => {
  const { activeTab, setActiveTab } = useWorkoutStore();

  const tabs: {
    id: MainTab;
    label: string;
    iconFamily: 'ionicons' | 'material';
    iconName: string;
    activeIconName: string;
  }[] = [
    {
      id: 'entreno',
      label: 'Entreno',
      iconFamily: 'ionicons',
      iconName: 'grid-outline',
      activeIconName: 'grid',
    },
    {
      id: 'actividades',
      label: 'Actividades',
      iconFamily: 'ionicons',
      iconName: 'stats-chart-outline',
      activeIconName: 'stats-chart',
    },
    {
      id: 'ejercicios',
      label: 'Ejercicios',
      iconFamily: 'material',
      iconName: 'dumbbell',
      activeIconName: 'dumbbell',
    },
    {
      id: 'cuerpo',
      label: 'Cuerpo',
      iconFamily: 'ionicons',
      iconName: 'body-outline',
      activeIconName: 'body',
    },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const color = isActive ? COLORS.primary : COLORS.textMuted;

        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabButton}
            onPress={() => setActiveTab(tab.id)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
          >
            <View style={styles.iconContainer}>
              {tab.iconFamily === 'ionicons' ? (
                <Ionicons
                  name={(isActive ? tab.activeIconName : tab.iconName) as any}
                  size={24}
                  color={color}
                />
              ) : (
                <MaterialCommunityIcons
                  name={(isActive ? tab.activeIconName : tab.iconName) as any}
                  size={24}
                  color={color}
                />
              )}
              {isActive && <View style={styles.activeDot} />}
            </View>
            <Text style={[styles.tabLabel, { color }]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1C',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 4,
  },
  iconContainer: {
    alignItems: 'center',
    position: 'relative',
    height: 28,
    justifyContent: 'center',
  },
  activeDot: {
    position: 'absolute',
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.2,
  },
});
