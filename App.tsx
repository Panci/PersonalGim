import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { AuthProvider, useAuth } from './src/auth/AuthProvider';
import { LoginScreen } from './src/screens/LoginScreen';
import { MonitorDashboard } from './src/components/monitor/MonitorDashboard';
import { AccountSettingsModal } from './src/components/account/AccountSettingsModal';

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

function AppShell() {
  const {
    activeTab,
    loadInitialData,
    syncRoutines,
    collections,
    selectedCollection,
    setSelectedCollection,
    selectedDay,
    setSelectedDay,
    exercises,
    currentRole,
    setCurrentRole,
    isWorkoutActive,
    loadSharedGymData,
  } = useWorkoutStore();
  const { session, isRestoring } = useAuth();


  const [isLoading, setIsLoading] = useState(true);
  const [showRoutineDetail, setShowRoutineDetail] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);

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

  useEffect(() => {
    if (!session) return;
    setCurrentRole(session.user.role === 'user' ? 'member' : session.user.role);
    void syncRoutines().catch((error) => console.warn('Error synchronizing routines:', error));
    if (session.user.role === 'admin' || session.user.role === 'monitor') {
      void loadSharedGymData().catch((error) => console.warn('Error loading shared gym data:', error));
    }
  }, [session, setCurrentRole, syncRoutines, loadSharedGymData]);

  if (isLoading || isRestoring) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!session) {
    return <LoginScreen />;
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
            onOpenAccountSettings={() => setShowAccountSettings(true)}
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
        return (
          <EntrenoScreen
            onOpenRoutineDetail={() => setShowRoutineDetail(true)}
            onOpenAccountSettings={() => setShowAccountSettings(true)}
            onOpenDayWorkout={() => {}}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {session && currentRole === 'member' && (activeTab !== 'entreno' || showRoutineDetail) && !isWorkoutActive && (
        <TouchableOpacity
          style={styles.accountButton}
          onPress={() => setShowAccountSettings(true)}
          accessibilityLabel="Mi cuenta"
        >
          <Ionicons name="person-circle-outline" size={25} color="#FF6A00" />
        </TouchableOpacity>
      )}

      {/* Active screen. Reserve space so it is never hidden by the fixed tabs. */}
      <View style={styles.content}>
        {currentRole === 'admin' ? <AdminDashboard /> : currentRole === 'monitor' ? <MonitorDashboard /> : renderCurrentTab()}
      </View>

      {/* Keep navigation available everywhere except while tracking a live routine. */}
      {currentRole === 'member' && !isWorkoutActive && <BottomTabBar />}

      {/* Active Live Workout Tracker Overlay */}
      {currentRole === 'member' && <ActiveWorkoutModal />}

      {/* Exercise Configuration Stepper Modal */}
      {currentRole === 'member' && configModal.visible && targetRoutineEx && targetExerciseObj && (
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

      {/* Global Modals */}
      {currentRole === 'member' && <DigitalPassModal />}
      {currentRole === 'member' && <OneRepMaxModal />}
      <AccountSettingsModal
        visible={showAccountSettings}
        onClose={() => setShowAccountSettings(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    ...Platform.select({
      web: {
        minHeight: '100vh' as any,
        // Keep the web preview at a phone-sized layout. Native apps continue
        // to use the full device width, while the browser stays representative
        // of the compact experience we design for.
        width: '100%' as any,
        // iPhone 15 is 393pt wide; keep the browser preview phone-sized
        // without unnecessarily shrinking native layouts.
        maxWidth: 430,
        marginHorizontal: 'auto' as any,
      },
    }),
  },
  content: {
    flex: 1,
    // Keep the last controls clear of the fixed bottom navigation on phones.
    paddingBottom: Platform.OS === 'ios' ? 94 : 76,
  },
  accountButton: {
    position: 'absolute',
    top: 10,
    right: 12,
    zIndex: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(28,28,30,0.92)',
    borderWidth: 1,
    borderColor: '#3A3A40',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
