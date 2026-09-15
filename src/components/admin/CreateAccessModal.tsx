import React, { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createUserRequest } from '../../auth/api';
import { useAuth } from '../../auth/AuthProvider';
import { UserRole } from '../../auth/types';
import { COLORS } from '../../theme/colors';

interface CreateAccessModalProps {
  visible: boolean;
  onClose: () => void;
}

const roleOptions: { id: UserRole; label: string; detail: string }[] = [
  { id: 'user', label: 'Usuario', detail: 'Rutinas, sesiones y progreso propios.' },
  { id: 'monitor', label: 'Monitor', detail: 'Consulta socios, asigna rutinas y acompaña en sala.' },
  { id: 'admin', label: 'Administrador', detail: 'Gestión completa del centro.' },
];

export const CreateAccessModal: React.FC<CreateAccessModalProps> = ({ visible, onClose }) => {
  const { session } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const closeAndReset = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('user');
    setError('');
    onClose();
  };

  const createAccess = async () => {
    if (!session) return;
    if (!fullName.trim() || !email.trim() || password.length < 12) {
      setError('Indica nombre, correo y una contraseña de al menos 12 caracteres.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createUserRequest(session.token, {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });
      closeAndReset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo crear el acceso.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={closeAndReset}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>CONTROL DE ACCESOS</Text>
              <Text style={styles.title}>Crear cuenta</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={closeAndReset} accessibilityLabel="Cerrar">
              <Ionicons name="close" size={22} color="#A1A1A6" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>NOMBRE COMPLETO</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Nombre y apellidos" placeholderTextColor="#6E6E73" />
          <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="correo@centro.com" placeholderTextColor="#6E6E73" autoCapitalize="none" keyboardType="email-address" />
          <Text style={styles.label}>CONTRASEÑA INICIAL</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Mínimo 12 caracteres" placeholderTextColor="#6E6E73" secureTextEntry autoCapitalize="none" />

          <Text style={styles.label}>ROL</Text>
          {roleOptions.map((option) => (
            <TouchableOpacity key={option.id} style={[styles.roleOption, role === option.id && styles.roleOptionSelected]} onPress={() => setRole(option.id)}>
              <View style={[styles.radio, role === option.id && styles.radioSelected]}>{role === option.id && <View style={styles.radioDot} />}</View>
              <View style={styles.roleCopy}>
                <Text style={styles.roleName}>{option.label}</Text>
                <Text style={styles.roleDetail}>{option.detail}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {error !== '' && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={createAccess} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Crear acceso</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.68)' },
  sheet: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderWidth: 1, borderColor: '#333338' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  eyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  title: { color: '#FFFFFF', fontSize: 23, fontWeight: '900', marginTop: 4 },
  closeButton: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#29292D' },
  label: { color: '#8E8E93', fontSize: 10, fontWeight: '800', letterSpacing: 0.7, marginTop: 12, marginBottom: 6 },
  input: { height: 46, borderRadius: 11, backgroundColor: '#28282C', borderWidth: 1, borderColor: '#37373D', color: '#FFFFFF', paddingHorizontal: 13, fontSize: 14 },
  roleOption: { flexDirection: 'row', padding: 11, borderRadius: 12, borderWidth: 1, borderColor: '#333338', marginBottom: 7, backgroundColor: '#242428' },
  roleOptionSelected: { borderColor: COLORS.primary, backgroundColor: 'rgba(255,106,0,0.1)' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#74747A', marginTop: 1, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: COLORS.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  roleCopy: { flex: 1, marginLeft: 10 },
  roleName: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  roleDetail: { color: '#A1A1A6', fontSize: 11, marginTop: 2, lineHeight: 15 },
  error: { color: '#FF6961', fontSize: 12, marginTop: 4, lineHeight: 17 },
  saveButton: { backgroundColor: COLORS.primary, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 14, marginBottom: 6 },
  saveButtonDisabled: { opacity: 0.7 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
