import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { EquipmentType, MemberLevel, MemberObjective, RoutineCollection, RoutineTemplate } from '../../types';
import { useWorkoutStore } from '../../store/workoutStore';
import { COLORS } from '../../theme/colors';
import { CreateRoutineModal } from './CreateRoutineModal';
import { AiRoutineGeneratorModal } from './AiRoutineGeneratorModal';
import { RoutineTemplatePreviewModal } from './RoutineTemplatePreviewModal';

interface RoutineTemplateLibraryModalProps {
  visible: boolean;
  onClose: () => void;
}

const objectiveLabels: Record<MemberObjective, string> = {
  hipertrofia: 'Hipertrofia',
  fuerza: 'Fuerza',
  perdida_grasa: 'Pérdida grasa',
  salud_general: 'Salud general',
};

const levelLabels: Record<MemberLevel, string> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};

const equipmentLabels: Record<EquipmentType, string> = {
  barra: 'Barra',
  mancuerna: 'Mancuernas',
  maquina: 'Máquinas',
  polea: 'Poleas',
  peso_corporal: 'Corporal',
  cardio: 'Cardio',
  otro: 'Otro',
};

export const RoutineTemplateLibraryModal: React.FC<RoutineTemplateLibraryModalProps> = ({ visible, onClose }) => {
  const { routineTemplates, createRoutineTemplate } = useWorkoutStore();
  const [objective, setObjective] = useState<MemberObjective | 'todos'>('todos');
  const [level, setLevel] = useState<MemberLevel | 'todos'>('todos');
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentType | 'todos'>('todos');
  const [showCreator, setShowCreator] = useState(false);
  const [showAiGenerator, setShowAiGenerator] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<RoutineTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<RoutineTemplate | null>(null);

  const filteredTemplates = useMemo(() => routineTemplates.filter((template) => (
    (objective === 'todos' || template.objective === objective)
    && (level === 'todos' || template.level === level)
    && (equipmentFilter === 'todos' || template.equipment.length === 0 || template.equipment.includes(equipmentFilter))
  )), [routineTemplates, objective, level, equipmentFilter]);

  const saveTemplate = async (
    routine: RoutineCollection,
    metadata: { objective: MemberObjective; level: MemberLevel; equipment: EquipmentType[] },
  ) => {
    await createRoutineTemplate({
      id: routine.id,
      title: routine.title,
      subtitle: routine.subtitle,
      routine,
      ...metadata,
    });
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>BIBLIOTECA DEL GIMNASIO</Text>
                <Text style={styles.title}>Plantillas de rutina</Text>
                <Text style={styles.helper}>Crea una vez y asigna la rutina adecuada a cada socio.</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="Cerrar biblioteca">
                <Ionicons name="close" size={23} color="#A1A1A6" />
              </TouchableOpacity>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.createButton} onPress={() => setShowCreator(true)} activeOpacity={0.8}>
                <Ionicons name="add-circle-outline" size={19} color="#FFFFFF" />
                <Text style={styles.createButtonText}>Crear manual</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.aiButton}
                onPress={() => setShowAiGenerator(true)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="creation-outline" size={19} color={COLORS.primary} />
                <Text style={styles.aiButtonText}>Crear con IA</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.filterLabel}>FILTRAR POR OBJETIVO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {(['todos', 'hipertrofia', 'fuerza', 'perdida_grasa', 'salud_general'] as Array<MemberObjective | 'todos'>).map((item) => (
                <TouchableOpacity key={item} onPress={() => setObjective(item)} style={[styles.chip, objective === item && styles.chipActive]}>
                  <Text style={[styles.chipText, objective === item && styles.chipTextActive]}>{item === 'todos' ? 'Todos' : objectiveLabels[item]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.filterLabel}>NIVEL</Text>
            <View style={styles.levelRow}>
              {(['todos', 'principiante', 'intermedio', 'avanzado'] as Array<MemberLevel | 'todos'>).map((item) => (
                <TouchableOpacity key={item} onPress={() => setLevel(item)} style={[styles.chip, level === item && styles.chipActive]}>
                  <Text style={[styles.chipText, level === item && styles.chipTextActive]}>{item === 'todos' ? 'Todos' : levelLabels[item]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.filterLabel}>MATERIAL</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {(['todos', 'maquina', 'barra', 'mancuerna', 'polea', 'peso_corporal', 'cardio'] as Array<EquipmentType | 'todos'>).map((item) => (
                <TouchableOpacity key={item} onPress={() => setEquipmentFilter(item)} style={[styles.chip, equipmentFilter === item && styles.chipActive]}>
                  <Text style={[styles.chipText, equipmentFilter === item && styles.chipTextActive]}>{item === 'todos' ? 'Todo material' : equipmentLabels[item]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {filteredTemplates.map((template) => (
                <TouchableOpacity
                  key={template.id}
                  style={styles.templateCard}
                  onPress={() => setSelectedTemplate(template)}
                  activeOpacity={0.78}
                  accessibilityLabel={`Ver detalles de ${template.title}`}
                >
                  <View style={styles.templateIcon}><MaterialCommunityIcons name="clipboard-text-outline" size={22} color={COLORS.primary} /></View>
                  <View style={styles.templateCopy}>
                    <Text style={styles.templateTitle}>{template.title}</Text>
                    <Text style={styles.templateDetail}>{template.routine.days.length} rutinas semanales · {objectiveLabels[template.objective]} · {levelLabels[template.level]}</Text>
                    {template.equipment.length > 0 && <Text style={styles.templateEquipment}>{template.equipment.map((item) => equipmentLabels[item]).join(' · ')}</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              ))}
              {filteredTemplates.length === 0 && (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="clipboard-plus-outline" size={30} color="#8E8E93" />
                  <Text style={styles.emptyTitle}>No hay plantillas todavía</Text>
                  <Text style={styles.emptyText}>Crea una manualmente con los ejercicios de la biblioteca y quedará disponible para todos los monitores.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CreateRoutineModal
        visible={showCreator || editingTemplate !== null}
        onClose={() => {
          setShowCreator(false);
          setEditingTemplate(null);
        }}
        variant="template"
        onSaveRoutine={saveTemplate}
        initialTemplate={editingTemplate}
      />
      <AiRoutineGeneratorModal visible={showAiGenerator} onClose={() => setShowAiGenerator(false)} />
      <RoutineTemplatePreviewModal
        template={selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
        onEdit={() => {
          if (!selectedTemplate) return;
          setEditingTemplate(selectedTemplate);
          setSelectedTemplate(null);
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 430, maxHeight: '92%', backgroundColor: '#1C1C1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderTopWidth: 1, borderTopColor: '#34343A' },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  headerCopy: { flex: 1, paddingRight: 12 },
  eyebrow: { color: COLORS.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginTop: 3 },
  helper: { color: '#A1A1A6', fontSize: 13, lineHeight: 18, marginTop: 5 },
  closeButton: { padding: 4 },
  actions: { flexDirection: 'row', gap: 9, marginBottom: 16 },
  createButton: { flex: 1, height: 47, borderRadius: 13, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  createButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  aiButton: { flex: 1, height: 47, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,106,0,0.45)', backgroundColor: 'rgba(255,106,0,0.08)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  aiButtonText: { color: COLORS.primary, fontSize: 14, fontWeight: '800' },
  filterLabel: { color: '#8E8E93', fontSize: 10, fontWeight: '800', letterSpacing: 0.7, marginBottom: 7 },
  chipRow: { gap: 7, paddingBottom: 12 },
  levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 },
  chip: { borderWidth: 1, borderColor: '#3A3A40', backgroundColor: '#26262A', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  chipActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(255,106,0,0.14)' },
  chipText: { color: '#B5B5BB', fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: COLORS.primary },
  list: { flexGrow: 0 },
  templateCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#26262A', borderWidth: 1, borderColor: '#34343A', borderRadius: 15, padding: 13, marginBottom: 9 },
  templateIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,106,0,0.13)', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  templateCopy: { flex: 1 },
  templateTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  templateDetail: { color: '#C7C7CC', fontSize: 12, lineHeight: 17, marginTop: 3 },
  templateEquipment: { color: COLORS.primary, fontSize: 11, fontWeight: '700', marginTop: 2 },
  emptyState: { alignItems: 'center', paddingHorizontal: 22, paddingVertical: 32 },
  emptyTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginTop: 10 },
  emptyText: { color: '#A1A1A6', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 5 },
});
