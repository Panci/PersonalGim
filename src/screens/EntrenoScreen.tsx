import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ImageBackground,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useWorkoutStore } from '../store/workoutStore';
import { FloatingSegmentCapsule } from '../components/navigation/FloatingSegmentCapsule';
import { CreateRoutineModal } from '../components/routine/CreateRoutineModal';

interface EntrenoScreenProps {
  onOpenRoutineDetail: () => void;
  onOpenDayWorkout: (collectionId: string, dayId: string) => void;
}

export const EntrenoScreen: React.FC<EntrenoScreenProps> = ({
  onOpenRoutineDetail,
  onOpenDayWorkout,
}) => {
  const { width } = useWindowDimensions();
  const isCompact = width < 400;
  const {
    collections,
    setSelectedCollection,
    startQuickWorkout,
    history,
    entrenoSegment,
    showCreateRoutineModal,
    setShowCreateRoutineModal,
    setCurrentRole,
    setShowQrPassModal,
  } = useWorkoutStore();

  const handleSelectCollection = (col: typeof collections[0]) => {
    setSelectedCollection(col);
    onOpenRoutineDetail();
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, isCompact && styles.headerCompact]}>
        <View>
          <Text style={styles.headerSubtitle}>ENTRENAMIENTO</Text>
          <Text style={[styles.headerTitle, isCompact && styles.headerTitleCompact]}>Mi Entreno</Text>
        </View>

        <View style={styles.headerRightRow}>
          {/* Digital Member Pass QR button */}
          <TouchableOpacity
            style={styles.qrPassPill}
            onPress={() => setShowQrPassModal(true)}
            activeOpacity={0.8}
            accessibilityLabel="Abrir pase QR"
          >
            <Ionicons name="qr-code" size={15} color={COLORS.primary} style={{ marginRight: 4 }} />
            <Text style={styles.qrPassText}>{isCompact ? 'QR' : 'Pase QR'}</Text>
          </TouchableOpacity>

          {/* Switch to Gym Admin Panel Button */}
          <TouchableOpacity
            style={styles.adminTogglePill}
            onPress={() => setCurrentRole('admin')}
            activeOpacity={0.8}
            accessibilityLabel="Abrir panel de gimnasio"
          >
            <Ionicons name="shield-checkmark" size={15} color={COLORS.primary} style={{ marginRight: 4 }} />
            <Text style={styles.adminToggleText}>{isCompact ? 'Panel' : 'Panel Gimnasio'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section: Mi Colección (from IMG_1167.PNG) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mi Colección</Text>
          <TouchableOpacity onPress={() => collections[0] && handleSelectCollection(collections[0])}>
            <Text style={styles.sectionAction}>Ver todo</Text>
          </TouchableOpacity>
        </View>

        {/* Collections Cards */}
        {collections.map((col, cIdx) => (
          <TouchableOpacity
            key={col.id}
            style={styles.heroCard}
            onPress={() => handleSelectCollection(col)}
            activeOpacity={0.85}
          >
            <View style={styles.heroOverlay}>
              <View style={styles.badgeRow}>
                <View style={styles.orangeTag}>
                  <Text style={styles.orangeTagText}>
                    {cIdx === 0 ? 'RUTINA ACTIVA' : 'RUTINA PERSONAL'}
                  </Text>
                </View>
                <View style={styles.daysCountTag}>
                  <Text style={styles.daysCountText}>{col.days.length} DÍAS</Text>
                </View>
              </View>

              <Text style={styles.heroTitle}>{col.title}</Text>
              <Text style={styles.heroSubtitle}>
                {col.subtitle || 'Plan de hipertrofia y definición muscular'}
              </Text>

              {/* Day Pills Preview */}
              <View style={styles.weekPillsRow}>
                {col.days.map((d) => {
                  const badgeColor =
                    COLORS.dayBadges[d.dayBadge as keyof typeof COLORS.dayBadges] || COLORS.primary;
                  return (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.dayPill, { backgroundColor: badgeColor }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        setSelectedCollection(col);
                        onOpenDayWorkout(col.id, d.id);
                      }}
                    >
                      <Text style={styles.dayPillText}>
                        {d.dayBadge.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* Create Routine Card (from IMG_1167.PNG) */}
        <TouchableOpacity
          style={styles.createCard}
          onPress={() => setShowCreateRoutineModal(true)}
          activeOpacity={0.7}
        >
          <View style={styles.createIconCircle}>
            <Ionicons name="add" size={28} color={COLORS.primary} />
          </View>
          <View style={styles.createTextContainer}>
            <Text style={styles.createTitle}>Crear una nueva rutina</Text>
            <Text style={styles.createSubtitle}>Diseña tus propios días, series y repeticiones</Text>
          </View>
        </TouchableOpacity>

        {/* Quick Workout Launcher */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Entrenamiento Libre</Text>
        </View>

        <TouchableOpacity
          style={styles.quickStartCard}
          onPress={startQuickWorkout}
          activeOpacity={0.8}
        >
          <View style={styles.quickStartLeft}>
            <View style={styles.quickIconBox}>
              <MaterialCommunityIcons name="lightning-bolt" size={26} color="#FF6A00" />
            </View>
            <View>
              <Text style={styles.quickStartTitle}>Comenzar Sesión Libre</Text>
              <Text style={styles.quickStartSub}>Registra series sobre la marcha sin rutina fija</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#636366" />
        </TouchableOpacity>

        {/* Recent Workouts Summary if any */}
        {history.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Última actividad</Text>
            <View style={styles.recentCard}>
              <View style={styles.recentRow}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.recentName}>{history[0].name}</Text>
              </View>
              <Text style={styles.recentMeta}>
                {Math.floor((history[0].durationSeconds || 3600) / 60)} min • {history[0].totalKcal || 450} kcal • {history[0].totalVolumeKg || 2400} kg
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Floating Segment Capsule (Plan | Entreno | Rápido) */}
      <FloatingSegmentCapsule />

      {/* Create Custom Routine Modal */}
      <CreateRoutineModal
        visible={showCreateRoutineModal}
        onClose={() => setShowCreateRoutineModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 28,
    paddingBottom: 16,
  },
  headerCompact: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerSubtitle: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.2,
    marginTop: 2,
  },
  headerTitleCompact: {
    fontSize: 25,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qrPassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
    paddingHorizontal: 10,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 106, 0, 0.35)',
  },
  qrPassText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  adminTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E22',
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#34343A',
  },
  adminToggleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  profileBtn: {
    padding: 4,
  },

  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  sectionAction: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  heroCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C30',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  heroOverlay: {
    padding: 20,
    backgroundColor: 'rgba(30, 30, 34, 0.95)',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  orangeTag: {
    backgroundColor: 'rgba(255, 106, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 106, 0, 0.4)',
  },
  orangeTagText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  daysCountTag: {
    backgroundColor: '#2A2A2E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  daysCountText: {
    color: '#A1A1A6',
    fontSize: 10,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroSubtitle: {
    color: '#8E8E93',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  weekPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dayPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  createCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161618',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#333338',
    marginBottom: 20,
  },
  createIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 106, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  createTextContainer: {
    flex: 1,
  },
  createTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  createSubtitle: {
    color: '#8E8E93',
    fontSize: 12,
  },
  quickStartCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    marginBottom: 20,
  },
  quickStartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  quickIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  quickStartTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  quickStartSub: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 2,
  },
  recentSection: {
    marginTop: 8,
  },
  recentCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  recentName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  recentMeta: {
    color: '#8E8E93',
    fontSize: 12,
    marginLeft: 28,
  },
});
