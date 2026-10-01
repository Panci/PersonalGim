import React, { useEffect, useState } from 'react';
import {
  Alert,
  View,
  Text,
  TextInput,
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
import { useAuth } from '../../auth/AuthProvider';
import { updateGymMemberRequest } from '../../auth/api';

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
  const { toggleMemberStatus, loadSharedGymData } = useWorkoutStore();
  const { session } = useAuth();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [objective, setObjective] = useState<GymMember['objective']>('hipertrofia');
  const [level, setLevel] = useState<GymMember['level']>('principiante');
  const [newPin, setNewPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);

  useEffect(() => {
    if (!visible || !member) {
      setNewPin('');
      setShowNewPin(false);
      setIsEditing(false);
      return;
    }
    setFullName(member.fullName);
    setEmail(member.email);
    setPhone(member.phone || '');
    setObjective(member.objective);
    setLevel(member.level);
    setNewPin('');
    setShowNewPin(false);
    setIsEditing(false);
    setSaving(false);
  }, [member?.id, visible]);

  if (!member) return null;

  const isActive = member.status === 'activo';
  const beginEditing = () => {
    setFullName(member.fullName);
    setEmail(member.email);
    setPhone(member.phone || '');
    setObjective(member.objective);
    setLevel(member.level);
    setNewPin('');
    setShowNewPin(false);
    setIsEditing(true);
  };
  const saveMemberChanges = async () => {
    if (saving) return;
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = fullName.trim();
    const normalizedPhone = phone.trim();
    const phoneDigits = normalizedPhone.replace(/\D/g, '');
    if (!normalizedName) {
      Alert.alert('Falta el nombre', 'Introduce el nombre y apellidos del socio.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      Alert.alert('Correo no válido', 'Introduce un correo electrónico válido.');
      return;
    }
    if (normalizedPhone && (phoneDigits.length < 6 || phoneDigits.length > 15)) {
      Alert.alert('Teléfono no válido', 'Introduce un teléfono válido o déjalo vacío.');
      return;
    }
    if (newPin && !/^\d{4}$/.test(newPin)) {
      Alert.alert('PIN no válido', 'El nuevo PIN debe tener exactamente 4 cifras.');
      return;
    }
    if (!session) {
      Alert.alert('Sesión caducada', 'Vuelve a iniciar sesión para editar los datos del socio.');
      return;
    }

    setSaving(true);
    const pinChanged = Boolean(newPin);
    try {
      await updateGymMemberRequest(session.token, member.id, {
        fullName: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        objective,
        level,
        newPin: newPin || undefined,
      });
      const updatedMember: GymMember = {
        ...member,
        fullName: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone || undefined,
        objective,
        level,
      };
      useWorkoutStore.setState((state) => ({
        gymMembers: state.gymMembers.map((item) => item.id === member.id ? updatedMember : item),
        selectedMemberForDetail: updatedMember,
      }));
      void loadSharedGymData().catch(() => undefined);
      setNewPin('');
      setShowNewPin(false);
      setIsEditing(false);
      Alert.alert('Cambios guardados', pinChanged
        ? 'Se han actualizado los datos y el nuevo PIN de acceso.'
        : 'Se han actualizado los datos del socio.');
    } catch (error) {
      Alert.alert('No se pudieron guardar los cambios', error instanceof Error ? error.message : 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

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
                  <Text style={[styles.statusText, { color: isActive ? COLORS.success : '#FF453A' }]}>
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
                <Ionicons name="calendar-outline" size={20} color={COLORS.success} />
                <Text style={styles.kpiNum}>
                  {new Date(member.enrollmentDate).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })}
                </Text>
                <Text style={styles.kpiLabel}>Alta</Text>
              </View>
            </View>

            {isEditing ? (
              <>
                <Text style={styles.sectionHeading}>EDITAR DATOS DEL SOCIO</Text>
                <View style={styles.infoCard}>
                  <Text style={styles.inputLabel}>Nombre y apellidos</Text>
                  <TextInput
                    style={styles.textInput}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Nombre completo"
                    placeholderTextColor="#636366"
                    maxLength={120}
                  />

                  <Text style={styles.inputLabel}>Correo electrónico</Text>
                  <TextInput
                    style={styles.textInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="correo@ejemplo.com"
                    placeholderTextColor="#636366"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    maxLength={254}
                  />

                  <Text style={styles.inputLabel}>Teléfono</Text>
                  <TextInput
                    style={styles.textInput}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Opcional"
                    placeholderTextColor="#636366"
                    keyboardType="phone-pad"
                    maxLength={32}
                  />

                  <Text style={styles.inputLabel}>Objetivo</Text>
                  <View style={styles.chipsRow}>
                    {([
                      { id: 'hipertrofia', label: 'Hipertrofia' },
                      { id: 'fuerza', label: 'Fuerza' },
                      { id: 'perdida_grasa', label: 'Pérdida de grasa' },
                      { id: 'salud_general', label: 'Salud general' },
                    ] as const).map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.chip, objective === item.id && styles.chipActive]}
                        onPress={() => setObjective(item.id)}
                      >
                        <Text style={[styles.chipText, objective === item.id && styles.chipTextActive]}>{item.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>Nivel</Text>
                  <View style={styles.chipsRow}>
                    {([
                      { id: 'principiante', label: 'Principiante' },
                      { id: 'intermedio', label: 'Intermedio' },
                      { id: 'avanzado', label: 'Avanzado' },
                    ] as const).map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.chip, level === item.id && styles.chipActive]}
                        onPress={() => setLevel(item.id)}
                      >
                        <Text style={[styles.chipText, level === item.id && styles.chipTextActive]}>{item.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>Nuevo PIN de acceso (opcional)</Text>
                  <View style={styles.pinInputRow}>
                    <TextInput
                      style={[styles.textInput, styles.pinTextInput]}
                      value={newPin}
                      onChangeText={(value) => setNewPin(value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="••••"
                      placeholderTextColor="#636366"
                      keyboardType="number-pad"
                      secureTextEntry={!showNewPin}
                      maxLength={4}
                    />
                    <TouchableOpacity
                      style={styles.pinVisibilityButton}
                      onPress={() => setShowNewPin((shown) => !shown)}
                      accessibilityRole="button"
                      accessibilityLabel={showNewPin ? 'Ocultar nuevo PIN' : 'Mostrar nuevo PIN'}
                    >
                      <Ionicons name={showNewPin ? 'eye-off-outline' : 'eye-outline'} size={19} color="#A1A1A6" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.helperText}>El PIN actual no se puede consultar. Escribe 4 cifras para asignar otro; déjalo vacío para mantenerlo.</Text>

                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={styles.cancelEditBtn}
                      onPress={() => {
                        setNewPin('');
                        setShowNewPin(false);
                        setIsEditing(false);
                      }}
                      disabled={saving}
                    >
                      <Text style={styles.cancelEditText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.saveEditBtn, saving && styles.saveEditBtnDisabled]} onPress={() => void saveMemberChanges()} disabled={saving}>
                      <Text style={styles.saveEditText}>{saving ? 'Guardando…' : 'Guardar cambios'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.sectionRow}>
                  <Text style={[styles.sectionHeading, { marginBottom: 0 }]}>DATOS DEL SOCIO</Text>
                  {member.userId ? (
                    <TouchableOpacity
                      style={styles.editMemberBtn}
                      onPress={beginEditing}
                      accessibilityLabel="Editar datos y PIN del socio"
                      accessibilityRole="button"
                    >
                      <Ionicons name="create-outline" size={15} color={COLORS.primary} />
                      <Text style={styles.editMemberBtnText}>Editar</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.noAccountText}>Sin acceso asociado</Text>
                  )}
                </View>
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
                  <View style={[styles.twoCols, { marginTop: 14 }]}>
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
              </>
            )}

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
    backgroundColor: COLORS.primaryTint(0.15),
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
    backgroundColor: COLORS.successTint(0.15),
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
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
  },
  editMemberBtn: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: COLORS.primaryTint(0.12),
    borderWidth: 1,
    borderColor: COLORS.primaryTint(0.28),
  },
  editMemberBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  noAccountText: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '600',
  },
  inputLabel: {
    color: '#D1D1D6',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 5,
  },
  textInput: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3A3A40',
    backgroundColor: '#1C1C1E',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  pinInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinTextInput: {
    flex: 1,
    marginBottom: 12,
    paddingRight: 46,
  },
  pinVisibilityButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -48,
    marginTop: -12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#3A3A40',
  },
  chipActive: {
    backgroundColor: COLORS.primaryTint(0.17),
    borderColor: COLORS.primary,
  },
  chipText: {
    color: '#A1A1A6',
    fontSize: 11,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  helperText: {
    color: '#8E8E93',
    fontSize: 11,
    lineHeight: 16,
    marginTop: -6,
    marginBottom: 10,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  cancelEditBtn: {
    minHeight: 42,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#303036',
  },
  cancelEditText: {
    color: '#D1D1D6',
    fontSize: 13,
    fontWeight: '700',
  },
  saveEditBtn: {
    minHeight: 42,
    flex: 1.35,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: COLORS.primary,
  },
  saveEditBtnDisabled: {
    opacity: 0.65,
  },
  saveEditText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
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
    backgroundColor: COLORS.primaryTint(0.15),
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primaryTint(0.3),
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
    borderColor: COLORS.success,
  },
  statusToggleBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
