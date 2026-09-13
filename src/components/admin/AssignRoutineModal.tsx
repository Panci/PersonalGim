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
}

export const AssignRoutineModal: React.FC<AssignRoutineModalProps> = ({
  visible,
  member,
  onClose,
}) => {
  const { collections, assignRoutineToMember } = useWorkoutStore();
  const [selectedId, setSelectedId] = useState(member?.assignedRoutineId || '');

  if (!member) return null;

  const handleConfirm = () => {
    const targetCol = collections.find((c) => c.id === selectedId);
    if (targetCol) {
      assignRoutineToMember(member.id, targetCol.id, targetCol.title);
    }
    onClose();
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
            Selecciona la rutina del gimnasio que quieres asignar a este socio. La verá de inmediato en su app:
          </Text>

          <ScrollView style={styles.listArea}>
            {collections.map((col) => {
              const isSelected = selectedId === col.id;
              return (
                <TouchableOpacity
                  key={col.id}
                  style={[styles.routineItem, isSelected && styles.routineItemActive]}
                  onPress={() => setSelectedId(col.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routineTitle}>{col.title}</Text>
                    <Text style={styles.routineMeta}>
                      {col.days.length} días estructurados • {col.subtitle || 'Hipertrofia y fuerza'}
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
          </ScrollView>

          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
            <Text style={styles.confirmBtnText}>Asignar Rutina</Text>
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
});
