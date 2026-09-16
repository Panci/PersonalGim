import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useWorkoutStore } from '../store/workoutStore';
import { FloatingSegmentCapsule } from '../components/navigation/FloatingSegmentCapsule';
import { CreateRoutineModal } from '../components/routine/CreateRoutineModal';
import { useAuth } from '../auth/AuthProvider';

interface EntrenoScreenProps {
  onOpenRoutineDetail: () => void;
  onOpenAccountSettings: () => void;
  onOpenDayWorkout: (collectionId: string, dayId: string) => void;
}

export const EntrenoScreen: React.FC<EntrenoScreenProps> = ({ onOpenRoutineDetail, onOpenAccountSettings }) => {
  const { signOut } = useAuth();
  const {
    collections,
    setSelectedCollection,
    showCreateRoutineModal,
    setShowCreateRoutineModal,
  } = useWorkoutStore();
  const [showAllRoutines, setShowAllRoutines] = useState(false);
  const featuredRoutine = collections[0];

  const openCollection = (collection: (typeof collections)[number]) => {
    setSelectedCollection(collection);
    onOpenRoutineDetail();
  };

  const creationModal = (
    <CreateRoutineModal
      visible={showCreateRoutineModal}
      onClose={() => setShowCreateRoutineModal(false)}
    />
  );

  if (showAllRoutines) {
    return (
      <View style={styles.container}>
        <View style={styles.routinesHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowAllRoutines(false)}
            accessibilityLabel="Volver a Mi Entreno"
          >
            <Ionicons name="chevron-back" size={25} color="#FFFFFF" />
          </TouchableOpacity>
          <View>
            <Text style={styles.eyebrow}>ENTRENAMIENTO</Text>
            <Text style={styles.routinesTitle}>Mis Rutinas</Text>
          </View>
        </View>

        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.routinesContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.routinesIntro}>Aquí tienes todas tus rutinas guardadas.</Text>
          {collections.map((collection) => (
            <TouchableOpacity key={collection.id} style={styles.routineRow} onPress={() => openCollection(collection)} activeOpacity={0.8}>
              <View style={styles.routineRowIcon}>
                <MaterialCommunityIcons name="dumbbell" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.routineRowText}>
                <Text style={styles.routineRowTitle} numberOfLines={1}>{collection.title}</Text>
                <Text style={styles.routineRowSubtitle} numberOfLines={1}>
                  {collection.days.length} {collection.days.length === 1 ? 'día' : 'días'} · {collection.subtitle || 'Rutina personalizada'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#707076" />
            </TouchableOpacity>
          ))}

          {collections.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="dumbbell" size={40} color="#636366" />
              <Text style={styles.emptyTitle}>Todavía no tienes rutinas</Text>
              <Text style={styles.emptyText}>Crea la primera para empezar a entrenar.</Text>
            </View>
          )}

          <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateRoutineModal(true)} activeOpacity={0.8}>
            <Ionicons name="add" size={24} color="#C7C7CC" />
            <Text style={styles.createButtonText}>Crear una nueva rutina de ejercicios</Text>
          </TouchableOpacity>
          <View style={styles.bottomSpacer} />
        </ScrollView>
        <FloatingSegmentCapsule />
        {creationModal}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mi Entreno</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerAction, styles.accountAction]}
              onPress={onOpenAccountSettings}
              accessibilityLabel="Mi cuenta"
              hitSlop={6}
            >
              <Ionicons name="person-outline" size={19} color={COLORS.primary} />
              <Text style={styles.headerActionText}>Cuenta</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerAction, styles.logoutAction]}
              onPress={() => void signOut()}
              accessibilityLabel="Cerrar sesión"
              hitSlop={6}
            >
              <Ionicons name="log-out-outline" size={19} color="#FFFFFF" />
              <Text style={styles.headerActionText}>Salir</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Mi Colección</Text>

        {featuredRoutine ? (
          <TouchableOpacity style={styles.featuredCard} onPress={() => openCollection(featuredRoutine)} activeOpacity={0.85}>
            <View style={styles.featuredCopy}>
              <Text style={styles.featuredTitle}>{featuredRoutine.title}</Text>
              <Text style={styles.featuredMeta}>
                {featuredRoutine.days.length} {featuredRoutine.days.length === 1 ? 'día de entrenamiento' : 'días de entrenamiento'}
              </Text>
            </View>
            <View style={styles.featuredGraphic}>
              <Ionicons name="fitness-outline" size={82} color={COLORS.primary} />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.featuredCard}>
            <Text style={styles.featuredTitle}>Tu próxima rutina empieza aquí</Text>
            <View style={styles.featuredGraphic}>
              <Ionicons name="fitness-outline" size={76} color={COLORS.primary} />
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.allRoutinesCard} onPress={() => setShowAllRoutines(true)} activeOpacity={0.85} accessibilityLabel="Ver mis rutinas">
          <View>
            <Text style={styles.allRoutinesTitle}>Mis Rutinas</Text>
            <Text style={styles.allRoutinesSubtitle}>
              {collections.length} {collections.length === 1 ? 'rutina guardada' : 'rutinas guardadas'}
            </Text>
          </View>
          <MaterialCommunityIcons name="dumbbell" size={78} color={COLORS.primary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateRoutineModal(true)} activeOpacity={0.8}>
          <Ionicons name="add" size={24} color="#C7C7CC" />
          <Text style={styles.createButtonText}>Crear una nueva rutina de ejercicios</Text>
        </TouchableOpacity>
        <View style={styles.bottomSpacer} />
      </ScrollView>
      <FloatingSegmentCapsule />
      {creationModal}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scrollArea: { flex: 1 },
  // AppShell already handles the iOS safe-area inset. A compact inner gutter
  // prevents the header from being pushed too far down on an iPhone 15.
  scrollContent: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 18 : 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 42 },
  headerTitle: { color: '#FFFFFF', fontSize: 32, fontWeight: '900', letterSpacing: -0.8, flexShrink: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  headerAction: { minHeight: 40, borderRadius: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1 },
  accountAction: { backgroundColor: '#242426', borderColor: '#383840' },
  logoutAction: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  headerActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  sectionTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginBottom: 16 },
  featuredCard: { minHeight: 154, borderRadius: 26, backgroundColor: '#242426', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingLeft: 24, marginBottom: 18 },
  featuredCopy: { flex: 1, zIndex: 1 },
  featuredTitle: { color: '#FFFFFF', fontSize: 29, lineHeight: 34, fontWeight: '800' },
  featuredMeta: { color: '#B5B5BA', fontSize: 13, fontWeight: '600', marginTop: 10 },
  featuredGraphic: { width: 126, height: 154, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-12deg' }] },
  allRoutinesCard: { minHeight: 132, borderRadius: 26, backgroundColor: '#242426', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 30, overflow: 'hidden' },
  allRoutinesTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
  allRoutinesSubtitle: { color: '#B5B5BA', fontSize: 13, fontWeight: '600', marginTop: 8 },
  createButton: { minHeight: 78, borderRadius: 18, backgroundColor: '#242426', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, gap: 8 },
  createButtonText: { color: '#C7C7CC', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  bottomSpacer: { height: 180 },
  routinesHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 18 : 28, paddingHorizontal: 20, paddingBottom: 22 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#242426', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  eyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  routinesTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginTop: 2 },
  routinesContent: { paddingHorizontal: 20 },
  routinesIntro: { color: '#A1A1A6', fontSize: 14, lineHeight: 20, marginBottom: 18 },
  routineRow: { minHeight: 78, borderRadius: 18, backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#2C2C30', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 10 },
  routineRowIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255, 106, 0, 0.14)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  routineRowText: { flex: 1, marginRight: 8 },
  routineRowTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  routineRowSubtitle: { color: '#8E8E93', fontSize: 12, marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginTop: 12 },
  emptyText: { color: '#8E8E93', fontSize: 13, marginTop: 6, textAlign: 'center' },
});
