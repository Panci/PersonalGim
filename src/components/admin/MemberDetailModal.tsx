import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { GymMember } from '../../types';
import { useWorkoutStore } from '../../store/workoutStore';
import { AssignRoutineModal } from './AssignRoutineModal';

interface MemberDetailModalProps {
  visible: boolean;
  member: GymMember | null;
  onClose: () => void;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  visible,
  member,
  onClose,
}) => {
  const { toggleMemberStatus } = useWorkoutStore();
  const [showAssignModal, setShowAssignModal] = useState(false);

  if (!member) return null;

  const isActive = member.status === 'activo';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.codeRow}>
                <Text style={styles.codeBadge}>{member.membershipNumber}</Text>
                <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
                  <Text style={[styles.statusText, { color: isActive ? '#34C759' : '#FF453A' }]}>
                    {member.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.name}>{member.fullName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#A1A1A6" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* KPI Cards */}
            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <Ionicons name="barbell-outline" size={20} color={COLORS.primary} />
                <Text style={styles.kpiNum}>{member.completedWorkoutsCount}</Text>
                <Text style={styles.kpiLabel}>Sesiones</Text>
              </View>

              <View style={styles.kpiCard}>
                <Ionicons name="scale-outline" size={20} color="#FF9500" />
                <Text style={styles.kpiNum}>{member.currentWeightKg || '--'} kg</Text>
                <Text style={styles.kpiLabel}>Peso Actual</Text>
              </View>

              <View style={styles.kpiCard}>
                <Ionicons name="calendar-outline" size={20} color="#34C759" />
                <Text style={styles.kpiNum}>
                  {new Date(member.enrollmentDate).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })}
                </Text>
                <Text style={styles.kpiLabel}>Alta</Text>
              </View>
            </View>

            {/* Contact Details */}
            <Text style={styles.sectionHeading}>DATOS DE CONTACTO</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={16} color="#8E8E93" style={styles.infoIcon} />
                <Text style={styles.infoText}>{member.email}</Text>
              </View>
              {member.phone && (
                <View style={[styles.infoRow, { marginTop: 10 }]}>
                  <Ionicons name="call-outline" size={16} color="#8E8E93" style={styles.infoIcon} />
                  <Text style={styles.infoText}>{member.phone}</Text>
                </View>
              )}
            </View>

            {/* Profile & Goals */}
            <Text style={styles.sectionHeading}>PERFIL DE ENTRENAMIENTO</Text>
            <View style={styles.infoCard}>
              <View style={styles.twoCols}>
                <View>
                  <Text style={styles.metaLabel}>OBJETIVO</Text>
                  <Text style={styles.metaValue}>
                    {member.objective.charAt(0).toUpperCase() + member.objective.slice(1).replace('_', ' ')}
                  </Text>
                </View>
                <View>
                  <Text style={styles.metaLabel}>NIVEL</Text>
                  <Text style={styles.metaValue}>
                    {member.level.charAt(0).toUpperCase() + member.level.slice(1)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Assigned Routine Card */}
            <Text style={styles.sectionHeading}>RUTINA DEL GIMNASIO ASIGNADA</Text>
            <View style={styles.assignedRoutineCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.assignedRoutineTitle}>
                  {member.assignedRoutineTitle || 'Sin rutina asignada'}
                </Text>
                <Text style={styles.assignedRoutineSub}>
                  {member.lastWorkoutDate
                    ? `Último entreno: ${new Date(member.lastWorkoutDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`
                    : 'Aún no ha iniciado su primer entrenamiento'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.changeRoutineBtn}
                onPress={() => setShowAssignModal(true)}
              >
                <Text style={styles.changeRoutineBtnText}>Cambiar</Text>
              </TouchableOpacity>
            </View>

            {/* Member Action: Toggle Active Status */}
            <TouchableOpacity
              style={[styles.statusToggleBtn, isActive ? styles.btnDanger : styles.btnSuccess]}
              onPress={() => toggleMemberStatus(member.id)}
            >
              <Ionicons
                name={isActive ? 'pause-circle-outline' : 'checkmark-circle-outline'}
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.statusToggleBtnText}>
                {isActive ? 'Suspender / Desactivar Socio' : 'Activar Membresía'}
              </Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Submodal to change routine */}
          <AssignRoutineModal
            visible={showAssignModal}
            member={member}
            onClose={() => setShowAssignModal(false)}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderTopColor: '#2C2C32',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  codeBadge: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
    backgroundColor: 'rgba(22, 201, 91, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
  },
  statusInactive: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    maxHeight: 500,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#26262A',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#34343A',
  },
  kpiNum: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 2,
  },
  kpiLabel: {
    color: '#8E8E93',
    fontSize: 11,
  },
  sectionHeading: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginTop: 12,
    marginBottom: 8,
  },
  infoCard: {
    backgroundColor: '#26262A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#34343A',
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 10,
  },
  infoText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  twoCols: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  metaValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  assignedRoutineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#26262A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#34343A',
    marginBottom: 16,
  },
  assignedRoutineTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  assignedRoutineSub: {
    color: '#8E8E93',
    fontSize: 12,
  },
  changeRoutineBtn: {
    backgroundColor: 'rgba(22, 201, 91, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(22, 201, 91, 0.3)',
  },
  changeRoutineBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  statusToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  btnDanger: {
    backgroundColor: '#2C1A1D',
    borderWidth: 1,
    borderColor: '#FF453A',
  },
  btnSuccess: {
    backgroundColor: '#172C1E',
    borderWidth: 1,
    borderColor: '#34C759',
  },
  statusToggleBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
