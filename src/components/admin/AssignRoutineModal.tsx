import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { GymMember } from '../../types';
import { useWorkoutStore } from '../../store/workoutStore';

interface AssignRoutineModalProps {
  visible: boolean;
  member: GymMember | null;
  onClose: () => void;
  onOpenLibrary?: () => void;
}

export const AssignRoutineModal: React.FC<AssignRoutineModalProps> = ({
  visible,
  member,
  onClose,
  onOpenLibrary,
}) => {
  const { routineTemplates, assignRoutineTemplateToMember } = useWorkoutStore();
  const [selectedId, setSelectedId] = useState(member?.assignedRoutineId || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!member) return null;

  const handleConfirm = async () => {
    if (!selectedId || saving) return;
    setSaving(true);
    setError('');
    try {
      await assignRoutineTemplateToMember(member.id, selectedId);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo asignar la rutina.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.subtitle}>ASIGNAR PLAN AL SOCIO</Text>
              <Text style={styles.title}>{member.fullName}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#A1A1A6" />
            </TouchableOpacity>
          </View>

          <Text style={styles.instruction}>
            Selecciona una plantilla del gimnasio. Se copiará al plan de este socio sin modificar la original.
          </Text>

          <ScrollView style={styles.listArea}>
            {routineTemplates.map((template) => {
              const isSelected = selectedId === template.id;
              return (
                <TouchableOpacity
                  key={template.id}
                  style={[styles.routineItem, isSelected && styles.routineItemActive]}
                  onPress={() => setSelectedId(template.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routineTitle}>{template.title}</Text>
                    <Text style={styles.routineMeta}>
                      {template.routine.days.length} días · {template.objective.replace('_', ' ')} · {template.level}
                    </Text>
                  </View>
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={isSelected ? COLORS.primary : '#636366'}
                  />
                </TouchableOpacity>
              );
            })}
            {routineTemplates.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No hay plantillas compartidas todavía.</Text>
                {onOpenLibrary && <TouchableOpacity onPress={onOpenLibrary}><Text style={styles.emptyAction}>Crear plantilla manual</Text></TouchableOpacity>}
              </View>
            )}
          </ScrollView>

          {error !== '' && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity style={[styles.confirmBtn, (!selectedId || saving) && styles.confirmBtnDisabled]} onPress={() => void handleConfirm()} activeOpacity={0.85} disabled={!selectedId || saving}>
            <Text style={styles.confirmBtnText}>{saving ? 'Asignando…' : 'Asignar Rutina'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2C2C32',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  subtitle: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  instruction: {
    color: '#8E8E93',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  listArea: {
    maxHeight: 280,
    marginBottom: 16,
  },
  routineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#26262A',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#34343A',
  },
  routineItemActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255, 106, 0, 0.1)',
  },
  routineTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  routineMeta: {
    color: '#8E8E93',
    fontSize: 12,
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  confirmBtnDisabled: { opacity: 0.55 },
  emptyState: { paddingVertical: 18, alignItems: 'center' },
  emptyText: { color: '#A1A1A6', fontSize: 13, textAlign: 'center' },
  emptyAction: { color: COLORS.primary, fontSize: 13, fontWeight: '800', marginTop: 10 },
  error: { color: '#FF6961', fontSize: 12, lineHeight: 17, marginBottom: 8 },
});
