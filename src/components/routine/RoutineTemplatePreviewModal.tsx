import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { EquipmentType, MemberLevel, MemberObjective, RoutineTemplate, WeekDay } from '../../types';
import { useWorkoutStore } from '../../store/workoutStore';
import { COLORS } from '../../theme/colors';

interface RoutineTemplatePreviewModalProps {
  template: RoutineTemplate | null;
  onClose: () => void;
  onEdit?: () => void;
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

const weekdayLabels: Record<WeekDay, string> = {
  lun: 'LUN', mar: 'MAR', mie: 'MIE', jue: 'JUE', vie: 'VIE', sab: 'SAB', dom: 'DOM',
};

export const RoutineTemplatePreviewModal: React.FC<RoutineTemplatePreviewModalProps> = ({ template, onClose, onEdit }) => {
  const { exercises } = useWorkoutStore();

  if (!template) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>PLANTILLA COMPARTIDA</Text>
              <Text style={styles.title}>{template.title}</Text>
              {!!template.subtitle && <Text style={styles.subtitle}>{template.subtitle}</Text>}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="Cerrar detalle de plantilla">
              <Ionicons name="close" size={24} color="#C7C7CC" />
            </TouchableOpacity>
          </View>

          <View style={styles.metadata}>
            <View style={styles.metadataChip}><Text style={styles.metadataText}>{objectiveLabels[template.objective]}</Text></View>
            <View style={styles.metadataChip}><Text style={styles.metadataText}>{levelLabels[template.level]}</Text></View>
            {template.equipment.map((item) => (
              <View key={item} style={styles.metadataChip}><Text style={styles.metadataText}>{equipmentLabels[item]}</Text></View>
            ))}
          </View>

          {onEdit && (
            <TouchableOpacity style={styles.editButton} onPress={onEdit} activeOpacity={0.8} accessibilityLabel={`Editar plantilla ${template.title}`}>
              <Ionicons name="pencil-outline" size={18} color="#FFFFFF" />
              <Text style={styles.editButtonText}>Revisar y modificar plantilla</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.sectionLabel}>SEMANA DE ENTRENAMIENTO</Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {template.routine.days.map((day) => {
              const scheduledDays = day.scheduledDays?.length ? day.scheduledDays : [day.dayBadge];
              return (
                <View key={day.id} style={styles.dayCard}>
                  <View style={styles.dayHeader}>
                    <View style={styles.dayCopy}>
                      <Text style={styles.dayName}>{day.name}</Text>
                      <Text style={styles.dayMeta}>{day.exercises.length} ejercicios · {day.estimatedMinutes} min aprox.</Text>
                    </View>
                    <View style={styles.daysRow}>
                      {scheduledDays.map((weekday) => <Text key={weekday} style={styles.dayBadge}>{weekdayLabels[weekday]}</Text>)}
                    </View>
                  </View>
                  {day.exercises.map((routineExercise, index) => {
                    const exercise = exercises.find((item) => item.id === routineExercise.exerciseId);
                    return (
                      <View key={routineExercise.id} style={styles.exerciseRow}>
                        <Text style={styles.exerciseIndex}>{index + 1}</Text>
                        <View style={styles.exerciseCopy}>
                          <Text style={styles.exerciseName}>{exercise?.name || 'Ejercicio de la biblioteca'}</Text>
                          <Text style={styles.exerciseMeta}>{routineExercise.targetSets} series · {routineExercise.targetRepRange} reps · {routineExercise.targetRestSeconds}s descanso</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
            <View style={styles.notice}>
              <MaterialCommunityIcons name="account-check-outline" size={18} color={COLORS.primary} />
              <Text style={styles.noticeText}>Revísala antes de asignarla y adapta cargas o técnica a cada socio.</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 430, maxHeight: '92%', backgroundColor: '#1C1C1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: '#34343A', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 13 },
  headerCopy: { flex: 1, paddingRight: 10 },
  eyebrow: { color: COLORS.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  title: { color: '#FFFFFF', fontSize: 22, lineHeight: 27, fontWeight: '900', marginTop: 4 },
  subtitle: { color: '#C7C7CC', fontSize: 14, lineHeight: 20, marginTop: 6 },
  closeButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#2A2A2E', alignItems: 'center', justifyContent: 'center' },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 18 },
  metadataChip: { borderWidth: 1, borderColor: 'rgba(255,106,0,0.4)', borderRadius: 9, backgroundColor: 'rgba(255,106,0,0.1)', paddingHorizontal: 9, paddingVertical: 6 },
  metadataText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
  editButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 13, marginBottom: 17 },
  editButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  sectionLabel: { color: '#A1A1A6', fontSize: 11, fontWeight: '800', letterSpacing: 0.7, marginBottom: 9 },
  content: { paddingBottom: 8 },
  dayCard: { backgroundColor: '#26262A', borderWidth: 1, borderColor: '#3A3A40', borderRadius: 16, padding: 13, marginBottom: 10 },
  dayHeader: { flexDirection: 'row', gap: 8, marginBottom: 11 },
  dayCopy: { flex: 1 },
  dayName: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  dayMeta: { color: '#A1A1A6', fontSize: 12, marginTop: 4 },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 4, alignContent: 'flex-start' },
  dayBadge: { color: '#121212', backgroundColor: '#FFC400', overflow: 'hidden', borderRadius: 6, fontSize: 10, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 4 },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#36363B', paddingVertical: 10 },
  exerciseIndex: { width: 25, height: 25, borderRadius: 13, overflow: 'hidden', textAlign: 'center', textAlignVertical: 'center', backgroundColor: 'rgba(255,106,0,0.15)', color: COLORS.primary, fontSize: 12, fontWeight: '900', marginRight: 9 },
  exerciseCopy: { flex: 1 },
  exerciseName: { color: '#FFFFFF', fontSize: 14, lineHeight: 19, fontWeight: '700' },
  exerciseMeta: { color: '#A1A1A6', fontSize: 12, marginTop: 2 },
  notice: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', backgroundColor: 'rgba(255,106,0,0.08)', borderRadius: 12, padding: 12, marginTop: 3 },
  noticeText: { flex: 1, color: '#C7C7CC', fontSize: 13, lineHeight: 18 },
});
