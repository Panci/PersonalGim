import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from './src/theme/colors';
import { useWorkoutStore } from './src/store/workoutStore';
import { BottomTabBar } from './src/components/navigation/BottomTabBar';
import { EntrenoScreen } from './src/screens/EntrenoScreen';
import { EjerciciosScreen } from './src/screens/EjerciciosScreen';
import { CuerpoScreen } from './src/screens/CuerpoScreen';
import { ActividadesScreen } from './src/screens/ActividadesScreen';
import { RoutineDetailScreen } from './src/screens/RoutineDetailScreen';
import { ExerciseConfigModal } from './src/screens/ExerciseConfigModal';
import { ActiveWorkoutModal } from './src/components/workout/ActiveWorkoutModal';
import { AdminDashboard } from './src/components/admin/AdminDashboard';
import { DigitalPassModal } from './src/components/member/DigitalPassModal';
import { OneRepMaxModal } from './src/components/calculator/OneRepMaxModal';

export default function App() {
  const {
    activeTab,
    loadInitialData,
    collections,
    selectedCollection,
    setSelectedCollection,
    selectedDay,
    setSelectedDay,
    exercises,
    currentRole,
  } = useWorkoutStore();


  const [isLoading, setIsLoading] = useState(true);
  const [showRoutineDetail, setShowRoutineDetail] = useState(false);

  // Config modal state
  const [configModal, setConfigModal] = useState<{
    visible: boolean;
    dayId: string;
    routineExerciseId: string;
  }>({
    visible: false,
    dayId: '',
    routineExerciseId: '',
  });

  useEffect(() => {
    const init = async () => {
      try {
        await loadInitialData();
      } catch (err) {
        console.error('Error initializing PersonalGim:', err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Find exercise details for config modal
  const targetDay = selectedCollection?.days.find((d) => d.id === configModal.dayId);
  const targetRoutineEx = targetDay?.exercises.find((re) => re.id === configModal.routineExerciseId);
  const targetExerciseObj = exercises.find((e) => e.id === targetRoutineEx?.exerciseId);

  const renderCurrentTab = () => {
    // If in routine detail view within 'entreno'
    if (activeTab === 'entreno' && showRoutineDetail) {
      return (
        <RoutineDetailScreen
          onBack={() => {
            setShowRoutineDetail(false);
            setSelectedDay(null);
          }}
          onOpenConfigExercise={(dayId, routineExerciseId) => {
            setConfigModal({
              visible: true,
              dayId,
              routineExerciseId,
            });
          }}
        />
      );
    }

    switch (activeTab) {
      case 'entreno':
        return (
          <EntrenoScreen
            onOpenRoutineDetail={() => setShowRoutineDetail(true)}
            onOpenDayWorkout={(collectionId, dayId) => {
              const collection = collections.find((item) => item.id === collectionId);
              const day = collection?.days.find((item) => item.id === dayId);
              if (day) {
                setSelectedCollection(collection ?? null);
                setSelectedDay(day);
                setShowRoutineDetail(true);
              }
            }}
          />
        );
      case 'actividades':
        return <ActividadesScreen />;
      case 'ejercicios':
        return <EjerciciosScreen />;
      case 'cuerpo':
        return <CuerpoScreen />;
      default:
        return <EntrenoScreen onOpenRoutineDetail={() => setShowRoutineDetail(true)} onOpenDayWorkout={() => {}} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {currentRole === 'admin' ? (
        <AdminDashboard />
      ) : (
        <>
          {/* Active Tab Screen */}
          <View style={styles.content}>{renderCurrentTab()}</View>

          {/* Global Bottom Navigation */}
          <BottomTabBar />

          {/* Active Live Workout Tracker Overlay */}
          <ActiveWorkoutModal />

          {/* Exercise Configuration Stepper Modal */}
          {configModal.visible && targetRoutineEx && targetExerciseObj && (
            <ExerciseConfigModal
              visible={configModal.visible}
              dayId={configModal.dayId}
              routineExerciseId={configModal.routineExerciseId}
              exercise={targetExerciseObj}
              initialSets={targetRoutineEx.defaultSets}
              initialRestSeconds={targetRoutineEx.targetRestSeconds}
              onClose={() =>
                setConfigModal({ visible: false, dayId: '', routineExerciseId: '' })
              }
            />
          )}
        </>
      )}

      {/* Global Modals */}
      <DigitalPassModal />
      <OneRepMaxModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
