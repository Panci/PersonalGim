import React, { useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { MemberObjective, MemberLevel } from '../../types';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuth } from '../../auth/AuthProvider';
import { createUserRequest } from '../../auth/api';

interface NewMemberModalProps {
  visible: boolean;
  onClose: () => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const parseWeight = (value: string): number | undefined => {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const generateTemporaryPin = (): string => {
  return String(Math.floor(1000 + Math.random() * 9000));
};

const normalizeWhatsappPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (value.trim().startsWith('+')) return digits;
  if (digits.length === 9) return `34${digits}`;
  return digits;
};

const getAppUrl = (): string => {
  const configuredUrl = process.env.EXPO_PUBLIC_APP_URL?.trim();
  if (configuredUrl) return configuredUrl;
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  return 'la aplicación PersonalGim';
};

export const NewMemberModal: React.FC<NewMemberModalProps> = ({
  visible,
  onClose,
}) => {
  const { addGymMember, collections, gymMembers } = useWorkoutStore();
  const { session } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [objective, setObjective] = useState<MemberObjective>('hipertrofia');
  const [level, setLevel] = useState<MemberLevel>('principiante');
  const [weightKg, setWeightKg] = useState('75.0');
  const [inviteViaWhatsApp, setInviteViaWhatsApp] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>(
    collections[0]?.id || ''
  );

  const objectives: { id: MemberObjective; label: string }[] = [
    { id: 'hipertrofia', label: 'Hipertrofia' },
    { id: 'fuerza', label: 'Fuerza' },
    { id: 'perdida_grasa', label: 'Pérdida de Grasa' },
    { id: 'salud_general', label: 'Salud General' },
  ];

  const levels: { id: MemberLevel; label: string }[] = [
    { id: 'principiante', label: 'Principiante' },
    { id: 'intermedio', label: 'Intermedio' },
    { id: 'avanzado', label: 'Avanzado' },
  ];

  const handleSave = async () => {
    if (saving) return;
    if (!fullName.trim()) {
      Alert.alert('Datos incompletos', 'Por favor introduce el nombre y apellidos del socio.');
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      Alert.alert('Datos incompletos', 'Introduce un correo electrónico válido.');
      return;
    }
    if (gymMembers.some((member) => member.email.trim().toLowerCase() === normalizedEmail)) {
      Alert.alert('Correo duplicado', 'Ya existe un socio con ese correo electrónico.');
      return;
    }

    const normalizedPhone = phone.trim();
    const phoneDigits = normalizedPhone.replace(/\D/g, '');
    if (normalizedPhone && (phoneDigits.length < 6 || phoneDigits.length > 15)) {
      Alert.alert('Teléfono no válido', 'Introduce un teléfono válido o déjalo vacío.');
      return;
    }
    if (inviteViaWhatsApp && !normalizeWhatsappPhone(normalizedPhone)) {
      Alert.alert('Falta el teléfono', 'Para enviar la invitación por WhatsApp necesitas indicar el teléfono del socio.');
      return;
    }

    const parsedWeight = parseWeight(weightKg);
    if (weightKg.trim() && (parsedWeight === undefined || parsedWeight < 20 || parsedWeight > 500)) {
      Alert.alert('Peso no válido', 'El peso inicial debe estar entre 20 y 500 kg.');
      return;
    }

    const assignedCol = collections.find((c) => c.id === selectedRoutineId);

    setSaving(true);
    try {
      const temporaryPin = generateTemporaryPin();
      if (!session) throw new Error('La sesión de administrador ha caducado. Vuelve a iniciar sesión.');
      const createdUser = await createUserRequest(session.token, {
        fullName: fullName.trim(),
        email: normalizedEmail,
        pin: temporaryPin,
        role: 'user',
      });

      addGymMember({
        userId: createdUser.id,
        fullName: fullName.trim(),
        email: normalizedEmail,
        phone: normalizedPhone || undefined,
        objective,
        level,
        assignedRoutineId: assignedCol?.id,
        assignedRoutineTitle: assignedCol?.title,
        currentWeightKg: parsedWeight,
      });

      setFullName('');
      setEmail('');
      setPhone('');
      setInviteViaWhatsApp(true);
      onClose();

      if (inviteViaWhatsApp) {
        const appUrl = getAppUrl();
        const message = [
          `Hola ${fullName.trim()}, ya tienes acceso a PersonalGim.`,
          '',
          `Accede desde: ${appUrl}`,
          `Email: ${normalizedEmail}`,
          `PIN temporal: ${temporaryPin}`,
          '',
          'Cuando entres, cambia el PIN y podrás crear tus rutinas.',
        ].join('\n');
        const whatsappUrl = `https://wa.me/${normalizeWhatsappPhone(normalizedPhone)}?text=${encodeURIComponent(message)}`;
        try {
          await Linking.openURL(whatsappUrl);
        } catch {
          Alert.alert('Cuenta creada', `No se pudo abrir WhatsApp. Comparte manualmente la invitación con ${normalizedEmail}.`);
        }
      } else {
        Alert.alert('Socio creado', 'Se ha creado también su acceso como Usuario.');
      }
    } catch (error) {
      Alert.alert('No se pudo dar de alta', error instanceof Error ? error.message : 'Inténtalo de nuevo.');
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
            <View>
              <Text style={styles.subtitle}>GESTIÓN DE SOCIOS</Text>
              <Text style={styles.title}>Dar de Alta Nuevo Socio</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#A1A1A6" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Personal info */}
            <Text style={styles.sectionHeading}>DATOS PERSONALES</Text>

            <Text style={styles.inputLabel}>Nombre y Apellidos *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej. Juan Pérez Gómez"
              placeholderTextColor="#636366"
              value={fullName}
              onChangeText={setFullName}
            />

            <Text style={styles.inputLabel}>Correo Electrónico *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="juan.perez@email.com"
              placeholderTextColor="#636366"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.inputLabel}>Teléfono (opcional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="+34 600 000 000"
              placeholderTextColor="#636366"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <TouchableOpacity
              style={styles.inviteRow}
              onPress={() => setInviteViaWhatsApp((current) => !current)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: inviteViaWhatsApp }}
            >
              <View style={[styles.checkbox, inviteViaWhatsApp && styles.checkboxActive]}>
                {inviteViaWhatsApp && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}
              </View>
              <View style={styles.inviteCopy}>
                <Text style={styles.inviteTitle}>Crear acceso e invitar por WhatsApp</Text>
                <Text style={styles.inviteDetail}>Se generará un PIN temporal de 4 dígitos para el rol Usuario.</Text>
              </View>
            </TouchableOpacity>

            {/* Objective */}
            <Text style={styles.sectionHeading}>OBJETIVO PRINCIPAL</Text>
            <View style={styles.chipsRow}>
              {objectives.map((obj) => {
                const isSelected = objective === obj.id;
                return (
                  <TouchableOpacity
                    key={obj.id}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setObjective(obj.id)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {obj.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Level */}
            <Text style={styles.sectionHeading}>NIVEL DE EXPERIENCIA</Text>
            <View style={styles.chipsRow}>
              {levels.map((lvl) => {
                const isSelected = level === lvl.id;
                return (
                  <TouchableOpacity
                    key={lvl.id}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setLevel(lvl.id)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {lvl.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Initial Weight */}
            <Text style={styles.sectionHeading}>PESO CORPORAL INICIAL (KG)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="75.0"
              placeholderTextColor="#636366"
              keyboardType="numeric"
              value={weightKg}
              onChangeText={setWeightKg}
            />

            {/* Assign Initial Routine */}
            <Text style={styles.sectionHeading}>RUTINA ASIGNADA DEL GIMNASIO</Text>
            <View style={styles.routinesList}>
              {collections.map((col) => {
                const isSelected = selectedRoutineId === col.id;
                return (
                  <TouchableOpacity
                    key={col.id}
                    style={[styles.routineCard, isSelected && styles.routineCardActive]}
                    onPress={() => setSelectedRoutineId(col.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.routineTitle}>{col.title}</Text>
                      <Text style={styles.routineSub}>{col.days.length} días de entrenamiento</Text>
                    </View>
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={isSelected ? COLORS.primary : '#636366'}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Save Button */}
          <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} activeOpacity={0.85} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Registrar y Dar de Alta Socio</Text>}
          </TouchableOpacity>
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
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderTopColor: '#2C2C32',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  subtitle: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    maxHeight: 520,
  },
  sectionHeading: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginTop: 14,
    marginBottom: 8,
  },
  inputLabel: {
    color: '#D1D1D6',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#26262A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#34343A',
    marginBottom: 10,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#26262A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#34343A',
    padding: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#636366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#25D366',
    borderColor: '#25D366',
  },
  inviteCopy: {
    flex: 1,
    marginLeft: 10,
  },
  inviteTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  inviteDetail: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 3,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#26262A',
    borderWidth: 1,
    borderColor: '#36363C',
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
    fontWeight: '800',
  },
  routinesList: {
    gap: 8,
  },
  routineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#26262A',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#34343A',
  },
  routineCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255, 106, 0, 0.08)',
  },
  routineTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  routineSub: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
});
