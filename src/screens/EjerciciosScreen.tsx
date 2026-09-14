import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { Exercise, MuscleId, EquipmentType } from '../types';
import { useWorkoutStore } from '../store/workoutStore';
import { ExerciseIllustration } from '../components/exercise/ExerciseIllustration';
import { ExerciseCategoryIllustration } from '../components/exercise/ExerciseCategoryIllustration';
import { EXERCISE_CATEGORIES, ExerciseCategory } from '../data/exerciseCategories';

export const EjerciciosScreen: React.FC = () => {
  const {
    exercises,
    searchQuery,
    setSearchQuery,
    selectedMuscleFilter,
    setSelectedMuscleFilter,
    selectedEquipmentFilter,
    setSelectedEquipmentFilter,
    showFavoritesOnly,
    toggleFavoritesFilter,
    toggleFavorite,
    addCustomExercise,
    openOneRmModal,
  } = useWorkoutStore();

  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMuscleModal, setShowMuscleModal] = useState(false);
  const [showCategoryOverview, setShowCategoryOverview] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | null>(null);

  // New exercise form state
  const [newName, setNewName] = useState('');
  const [newMuscle, setNewMuscle] = useState<MuscleId>('pectoral');
  const [newEquipment, setNewEquipment] = useState<EquipmentType>('barra');
  const [newInstructions, setNewInstructions] = useState('');

  // Filter exercises
  const filteredExercises = exercises.filter((ex) => {
    // Search query filter
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchName = ex.name.toLowerCase().includes(q);
      const matchMuscle = ex.primaryMuscle.toLowerCase().includes(q);
      if (!matchName && !matchMuscle) return false;
    }
    // Favorite filter
    if (showFavoritesOnly && !ex.isFavorite) return false;
    // Muscle filter
    if (selectedMuscleFilter && ex.primaryMuscle !== selectedMuscleFilter) return false;
    if (selectedCategory && !selectedCategory.muscleIds.includes(ex.primaryMuscle)) return false;
    // Equipment filter
    if (selectedEquipmentFilter !== 'todos' && ex.equipment !== selectedEquipmentFilter) return false;

    return true;
  });

  const muscleList: { id: MuscleId; label: string }[] = [
    { id: 'pectoral', label: 'Pectoral' },
    { id: 'biceps', label: 'Bíceps' },
    { id: 'triceps', label: 'Tríceps' },
    { id: 'hombros', label: 'Hombros' },
    { id: 'dorsales', label: 'Espalda' },
    { id: 'cuadriceps', label: 'Cuádriceps' },
    { id: 'isquiotibiales', label: 'Femorales' },
    { id: 'gluteos', label: 'Glúteos' },
    { id: 'pantorrillas', label: 'Gemelos' },
    { id: 'antebrazo', label: 'Antebrazo' },
    { id: 'trapecio', label: 'Trapecio' },
    { id: 'lumbares', label: 'Lumbares' },
    { id: 'abdomen', label: 'Abdomen' },
    { id: 'oblicuos', label: 'Oblicuos' },
  ];

  const equipmentList: { id: EquipmentType | 'todos'; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'barra', label: 'Barra' },
    { id: 'mancuerna', label: 'Mancuernas' },
    { id: 'maquina', label: 'Máquinas' },
    { id: 'polea', label: 'Poleas' },
    { id: 'peso_corporal', label: 'Corporal' },
  ];

  const handleCreateExercise = () => {
    if (!newName.trim()) return;
    addCustomExercise({
      name: newName.trim(),
      primaryMuscle: newMuscle,
      secondaryMuscles: [],
      equipment: newEquipment,
      instructions: newInstructions.trim() || 'Ejercicio creado por el usuario.',
      isFavorite: true,
    });
    setNewName('');
    setNewInstructions('');
    setShowCreateModal(false);
  };

  const openCategory = (category: ExerciseCategory) => {
    setSelectedCategory(category);
    setSelectedMuscleFilter(null);
    setSelectedEquipmentFilter('todos');
    if (showFavoritesOnly) toggleFavoritesFilter();
    setSearchQuery('');
    setShowCategoryOverview(false);
  };

  const showAllCategories = () => {
    setSelectedCategory(null);
    setSelectedMuscleFilter(null);
    setSelectedEquipmentFilter('todos');
    setShowCategoryOverview(true);
  };

  return (
    <View style={styles.container}>
      {showCategoryOverview ? (
        <ScrollView style={styles.categoryScroll} contentContainerStyle={styles.categoryContent} showsVerticalScrollIndicator={false}>
          <View style={styles.categoryHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.categoryTitle}>Biblioteca de Ejercicios</Text>
              <Text style={styles.categoryDescription}>
                Explora los grupos musculares y encuentra una guía clara para cada movimiento.
              </Text>
            </View>
            <TouchableOpacity style={styles.oneRmHeaderBtn} onPress={() => openOneRmModal()} activeOpacity={0.7}>
              <MaterialCommunityIcons name="calculator-variant" size={15} color={COLORS.primary} style={{ marginRight: 4 }} />
              <Text style={styles.oneRmHeaderBtnText}>1RM</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.categoryGrid}>
            {EXERCISE_CATEGORIES.map((category) => {
              const count = exercises.filter((exercise) => category.muscleIds.includes(exercise.primaryMuscle)).length;
              return (
                <TouchableOpacity key={category.id} style={styles.categoryCard} onPress={() => openCategory(category)} activeOpacity={0.82}>
                  <View style={styles.categoryArt}>
                    <ExerciseCategoryIllustration category={category} />
                    <View style={[styles.categoryCount, { backgroundColor: `${category.color}22` }]}>
                      <Text style={[styles.categoryCountText, { color: category.color }]}>{count}</Text>
                    </View>
                  </View>
                  <Text style={styles.categoryLabel}>{category.label}</Text>
                  <Text style={styles.categoryMeta}>{count} {count === 1 ? 'ejercicio' : 'ejercicios'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={styles.categoryCreateButton} onPress={() => setShowCreateModal(true)} activeOpacity={0.8}>
            <Ionicons name="add" size={19} color={COLORS.primary} />
            <Text style={styles.categoryCreateText}>Crear ejercicio propio</Text>
          </TouchableOpacity>
          <View style={styles.categoryBottomSpacer} />
        </ScrollView>
      ) : (
      <>
      {/* Top Bar matching IMG_1170.PNG */}
      <View style={styles.header}>
        {selectedCategory && (
          <TouchableOpacity style={styles.categoryBackButton} onPress={showAllCategories} accessibilityLabel="Volver a grupos musculares">
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{selectedCategory?.label || 'Ejercicios'}</Text>
        <TouchableOpacity
          style={styles.oneRmHeaderBtn}
          onPress={() => openOneRmModal()}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="calculator-variant" size={15} color={COLORS.primary} style={{ marginRight: 4 }} />
          <Text style={styles.oneRmHeaderBtnText}>1RM</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar matching IMG_1170.PNG */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar"
          placeholderTextColor="#636366"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color="#8E8E93" />
          </TouchableOpacity>
        )}
      </View>

      {/* Horizontal Filter Chips matching IMG_1170.PNG */}
      <View style={styles.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
          {/* All Filter */}
          <TouchableOpacity
            style={[
              styles.chip,
              !selectedMuscleFilter && selectedEquipmentFilter === 'todos' && !showFavoritesOnly && styles.chipActive,
            ]}
            onPress={() => {
              setSelectedMuscleFilter(null);
              setSelectedEquipmentFilter('todos');
              if (showFavoritesOnly) toggleFavoritesFilter();
            }}
          >
            <Text
              style={[
                styles.chipText,
                !selectedMuscleFilter && selectedEquipmentFilter === 'todos' && !showFavoritesOnly && styles.chipTextActive,
              ]}
            >
              Todos los ejercicios
            </Text>
          </TouchableOpacity>

          {/* Muscle Group Indicator Pill matching IMG_1170.PNG */}
          <TouchableOpacity
            style={[styles.chip, selectedMuscleFilter !== null && styles.chipActive]}
            onPress={() => setShowMuscleModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="body-outline"
              size={13}
              color={selectedMuscleFilter !== null ? '#FFFFFF' : '#8E8E93'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.chipText, selectedMuscleFilter !== null && styles.chipTextActive]}>
              {selectedMuscleFilter
                ? muscleList.find((m) => m.id === selectedMuscleFilter)?.label || 'Grupos musculares'
                : 'Grupos musculares'}
            </Text>
            {selectedMuscleFilter !== null && (
              <View style={styles.filterCountBadge}>
                <Text style={styles.filterCountBadgeText}>1</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Favorites chip */}
          <TouchableOpacity
            style={[styles.chip, showFavoritesOnly && styles.chipActive]}
            onPress={toggleFavoritesFilter}
          >
            <Ionicons
              name={showFavoritesOnly ? 'star' : 'star-outline'}
              size={14}
              color={showFavoritesOnly ? '#FFFFFF' : '#FF9500'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.chipText, showFavoritesOnly && styles.chipTextActive]}>
              Favoritos
            </Text>
          </TouchableOpacity>

          {/* Equipment Pills */}
          {equipmentList.filter((e) => e.id !== 'todos').map((eq) => {
            const isSelected = selectedEquipmentFilter === eq.id;
            return (
              <TouchableOpacity
                key={eq.id}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => setSelectedEquipmentFilter(isSelected ? 'todos' : (eq.id as EquipmentType))}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {eq.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Individual Muscle Chips */}
          {muscleList.map((m) => {
            const isSelected = selectedMuscleFilter === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => setSelectedMuscleFilter(isSelected ? null : m.id)}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Section Subheader matching IMG_1170.PNG ("Ejercicios" on left, "Crear" on right) */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Ejercicios</Text>
        <TouchableOpacity
          onPress={() => setShowCreateModal(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.sectionCrearBtn}>Crear</Text>
        </TouchableOpacity>
      </View>

      {/* 2-Column Grid of Exercises matching IMG_1170.PNG */}
      <FlatList
        data={filteredExercises}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="dumbbell" size={48} color="#333338" />
            <Text style={styles.emptyTitle}>No se encontraron ejercicios</Text>
            <Text style={styles.emptySub}>Prueba con otro término de búsqueda o filtro</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => setSelectedExercise(item)}
            activeOpacity={0.85}
          >
            {/* White Illustration Container matching IMG_1170.PNG */}
            <View style={styles.illustrationContainer}>
              {/* Star Favorite Button in Top-Right Corner */}
              <TouchableOpacity
                style={styles.starBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  toggleFavorite(item.id);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={item.isFavorite ? 'star' : 'star-outline'}
                  size={20}
                  color={item.isFavorite ? '#FF9500' : '#8E8E93'}
                />
              </TouchableOpacity>

              {/* Anatomical Graphic with Active Highlighted Muscle */}
              <ExerciseIllustration exercise={item} height={140} />
            </View>

            {/* Exercise Title and Details matching IMG_1170.PNG */}
            <View style={styles.cardTitleBox}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.name}
              </Text>
              <View style={styles.equipmentBadge}>
                <Text style={styles.equipmentBadgeText}>
                  {item.equipment === 'peso_corporal'
                    ? 'Corporal'
                    : item.equipment.charAt(0).toUpperCase() + item.equipment.slice(1).replace('_', ' ')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
      </>
      )}

      {/* Exercise Detail Sheet Modal */}
      {selectedExercise && (
        <Modal visible={true} transparent animationType="slide" onRequestClose={() => setSelectedExercise(null)}>
          <View style={styles.detailOverlay}>
            <View style={styles.detailSheet}>
              {/* Header */}
              <View style={styles.detailHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailMuscleBadge}>
                    {selectedExercise.primaryMuscle.toUpperCase()}
                  </Text>
                  <Text style={styles.detailTitle}>{selectedExercise.name}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedExercise(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={24} color="#A1A1A6" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>

              {/* White Illustration Container in Modal */}
              <View style={styles.detailIllustrationBox}>
                <TouchableOpacity
                  style={styles.detailStarBtn}
                  onPress={() => toggleFavorite(selectedExercise.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={selectedExercise.isFavorite ? 'star' : 'star-outline'}
                    size={22}
                    color={selectedExercise.isFavorite ? '#FF9500' : '#8E8E93'}
                  />
                </TouchableOpacity>
                <ExerciseIllustration exercise={selectedExercise} height={170} />
              </View>

              {/* Info Badges */}
              <View style={styles.detailPillsRow}>
                <View style={styles.detailPill}>
                  <Ionicons name="barbell-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.detailPillText}>
                    {selectedExercise.equipment.toUpperCase().replace('_', ' ')}
                  </Text>
                </View>
                {selectedExercise.secondaryMuscles.length > 0 && (
                  <View style={styles.detailPill}>
                    <Ionicons name="people-outline" size={14} color="#34C759" />
                    <Text style={styles.detailPillText}>
                      Secundarios: {selectedExercise.secondaryMuscles.join(', ')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Instructions */}
              <Text style={styles.detailSectionTitle}>Instrucciones de Ejecución</Text>
              <Text style={styles.detailInstructions}>
                {selectedExercise.instructions || 'Sin instrucciones adicionales para este ejercicio.'}
              </Text>

              <Text style={styles.detailSectionTitle}>Pasos de ejecución</Text>
              <View style={styles.guidanceList}>
                {(selectedExercise.executionSteps || []).map((step, index) => (
                  <View key={`${selectedExercise.id}-step-${index}`} style={styles.guidanceRow}>
                    <View style={styles.guidanceNumber}><Text style={styles.guidanceNumberText}>{index + 1}</Text></View>
                    <Text style={styles.guidanceText}>{step}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.detailSectionTitle}>Indicaciones y seguridad</Text>
              <View style={styles.guidanceList}>
                {(selectedExercise.indications || []).map((indication, index) => (
                  <View key={`${selectedExercise.id}-indication-${index}`} style={styles.guidanceRow}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#34C759" />
                    <Text style={styles.guidanceText}>{indication}</Text>
                  </View>
                ))}
              </View>

              {/* 1RM Calculator for this exercise */}
              <TouchableOpacity
                style={styles.detailOneRmBtn}
                onPress={() => {
                  const ex = selectedExercise;
                  setSelectedExercise(null);
                  openOneRmModal(ex);
                }}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="calculator-variant" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={styles.detailOneRmBtnText}>Calcular 1RM y Cargas</Text>
              </TouchableOpacity>

              {/* Close Button */}
              <TouchableOpacity
                style={styles.detailActionBtn}
                onPress={() => setSelectedExercise(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.detailActionBtnText}>Entendido</Text>
              </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Create Custom Exercise Modal */}
      <Modal visible={showCreateModal} transparent animationType="fade" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.detailOverlay}>
          <View style={styles.createModalBox}>
            <View style={styles.detailHeader}>
              <Text style={styles.createModalTitle}>Crear Nuevo Ejercicio</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={22} color="#A1A1A6" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>NOMBRE DEL EJERCICIO</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder="Ej. Press inclinado con mancuernas"
              placeholderTextColor="#636366"
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={styles.inputLabel}>MÚSCULO PRINCIPAL</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.muscleScrollRow}>
              {muscleList.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.chip, newMuscle === m.id && styles.chipActive]}
                  onPress={() => setNewMuscle(m.id)}
                >
                  <Text style={[styles.chipText, newMuscle === m.id && styles.chipTextActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>EQUIPAMIENTO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.muscleScrollRow}>
              {(['barra', 'mancuerna', 'maquina', 'polea', 'peso_corporal'] as EquipmentType[]).map((eq) => (
                <TouchableOpacity
                  key={eq}
                  style={[styles.chip, newEquipment === eq && styles.chipActive]}
                  onPress={() => setNewEquipment(eq)}
                >
                  <Text style={[styles.chipText, newEquipment === eq && styles.chipTextActive]}>
                    {eq.toUpperCase().replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.submitCreateBtn} onPress={handleCreateExercise}>
              <Text style={styles.submitCreateText}>Guardar Ejercicio</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Muscle Filter Modal */}
      <Modal
        visible={showMuscleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMuscleModal(false)}
      >
        <View style={styles.detailOverlay}>
          <View style={styles.muscleModalBox}>
            <View style={styles.detailHeader}>
              <View>
                <Text style={styles.createModalTitle}>Grupos Musculares</Text>
                <Text style={styles.muscleModalSubtitle}>Selecciona un músculo para filtrar los ejercicios</Text>
              </View>
              <TouchableOpacity
                style={{ padding: 6, borderRadius: 12, backgroundColor: '#252528' }}
                onPress={() => setShowMuscleModal(false)}
              >
                <Ionicons name="close" size={20} color="#A1A1A6" />
              </TouchableOpacity>
            </View>

            {/* All option */}
            <TouchableOpacity
              style={[styles.muscleSelectRow, selectedMuscleFilter === null && styles.muscleSelectRowActive]}
              onPress={() => {
                setSelectedMuscleFilter(null);
                setShowMuscleModal(false);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.muscleSelectLeft}>
                <View style={[styles.muscleSelectIconBox, selectedMuscleFilter === null && styles.muscleSelectIconBoxActive]}>
                  <Ionicons name="apps" size={18} color={selectedMuscleFilter === null ? '#FFFFFF' : COLORS.primary} />
                </View>
                <View>
                  <Text style={[styles.muscleSelectName, selectedMuscleFilter === null && styles.muscleSelectNameActive]}>
                    Todos los ejercicios
                  </Text>
                  <Text style={styles.muscleSelectCount}>{exercises.length} ejercicios en total</Text>
                </View>
              </View>
              {selectedMuscleFilter === null && (
                <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
              )}
            </TouchableOpacity>

            <ScrollView style={styles.muscleSelectScroll} showsVerticalScrollIndicator={false}>
              {muscleList.map((m) => {
                const count = exercises.filter((e) => e.primaryMuscle === m.id).length;
                const isSelected = selectedMuscleFilter === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.muscleSelectRow, isSelected && styles.muscleSelectRowActive]}
                    onPress={() => {
                      setSelectedMuscleFilter(m.id);
                      setShowMuscleModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.muscleSelectLeft}>
                      <View style={[styles.muscleSelectIconBox, isSelected && styles.muscleSelectIconBoxActive]}>
                        <Ionicons name="body" size={18} color={isSelected ? '#FFFFFF' : COLORS.primary} />
                      </View>
                      <View>
                        <Text style={[styles.muscleSelectName, isSelected && styles.muscleSelectNameActive]}>
                          {m.label}
                        </Text>
                        <Text style={styles.muscleSelectCount}>{count} ejercicios</Text>
                      </View>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  categoryScroll: {
    flex: 1,
  },
  categoryContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 26,
    paddingBottom: 40,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  categoryTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    flex: 1,
  },
  categoryDescription: {
    color: '#8E8E93',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
    maxWidth: 270,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  categoryCard: {
    width: '48.3%',
    backgroundColor: '#151517',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#29292F',
    padding: 8,
    marginBottom: 2,
  },
  categoryArt: {
    height: 118,
    borderRadius: 11,
    backgroundColor: '#202126',
    overflow: 'hidden',
    position: 'relative',
  },
  categoryCount: {
    position: 'absolute',
    right: 6,
    top: 6,
    minWidth: 24,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 7,
    alignItems: 'center',
  },
  categoryCountText: {
    fontSize: 10,
    fontWeight: '800',
  },
  categoryLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 9,
  },
  categoryMeta: {
    color: '#777780',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 4,
  },
  categoryCreateButton: {
    marginTop: 18,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#34343A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  categoryCreateText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  categoryBottomSpacer: {
    height: 100,
  },
  categoryBackButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#26262A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 28,
    paddingBottom: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  oneRmHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#26262A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#383840',
  },
  oneRmHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 106, 0, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 106, 0, 0.3)',
  },
  createBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    marginHorizontal: 20,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    padding: 0,
  },
  filtersWrapper: {
    marginTop: 12,
    marginBottom: 8,
  },
  filterChipsRow: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2C2C32',
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterCountBadge: {
    backgroundColor: '#FFFFFF',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  filterCountBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  sectionCrearBtn: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    width: '48.5%',
    backgroundColor: '#202024',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#2D2D35',
  },
  illustrationContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    height: 146,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  starBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    padding: 3,
  },
  cardTitleBox: {
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  cardTitle: {
    color: '#F2F2F7',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 17,
    minHeight: 34,
  },
  equipmentBadge: {
    backgroundColor: '#26262B',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginTop: 4,
  },
  equipmentBadgeText: {
    color: '#8E8E93',
    fontSize: 10.5,
    fontWeight: '600',
  },
  detailIllustrationBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 16,
    overflow: 'hidden',
  },
  detailStarBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    padding: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySub: {
    color: '#8E8E93',
    fontSize: 13,
    marginTop: 4,
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderTopColor: '#2C2C30',
  },
  detailScroll: {
    flexGrow: 0,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailMuscleBadge: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  detailTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  detailPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  detailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#26262A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  detailPillText: {
    color: '#D1D1D6',
    fontSize: 12,
    fontWeight: '600',
  },
  detailSectionTitle: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  detailInstructions: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  guidanceList: {
    gap: 10,
    marginBottom: 18,
  },
  guidanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  guidanceNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 106, 0, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidanceNumberText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  guidanceText: {
    flex: 1,
    color: '#D1D1D6',
    fontSize: 13,
    lineHeight: 19,
  },
  detailOneRmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 106, 0, 0.4)',
    marginBottom: 10,
  },
  detailOneRmBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  detailActionBtn: {
    backgroundColor: '#2C2C30',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  detailActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  createModalBox: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  createModalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  inputLabel: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 6,
  },
  modalTextInput: {
    backgroundColor: '#26262A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#36363C',
  },
  muscleScrollRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  submitCreateBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  submitCreateText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  muscleModalBox: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  muscleModalSubtitle: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  muscleSelectScroll: {
    maxHeight: 450,
  },
  muscleSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#26262A',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#323238',
  },
  muscleSelectRowActive: {
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
    borderColor: COLORS.primary,
  },
  muscleSelectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  muscleSelectIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#32323A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  muscleSelectIconBoxActive: {
    backgroundColor: COLORS.primary,
  },
  muscleSelectName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  muscleSelectNameActive: {
    color: COLORS.primary,
  },
  muscleSelectCount: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 2,
  },
});
