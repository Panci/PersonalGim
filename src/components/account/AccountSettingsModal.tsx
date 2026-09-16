import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../auth/AuthProvider';
import { isValidPin, normalizePin, PIN_LENGTH } from '../../auth/pin';
import { COLORS } from '../../theme/colors';

interface AccountSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({ visible, onClose }) => {
  const { session, updateAccount } = useAuth();
  const [email, setEmail] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setEmail(session?.user.email || '');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setError('');
  }, [visible, session?.user.email]);

  const close = () => {
    if (saving) return;
    setError('');
    onClose();
  };

  const save = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Introduce un correo electrónico válido.');
      return;
    }
    if (!isValidPin(currentPin)) {
      setError('El PIN actual debe tener exactamente 4 dígitos.');
      return;
    }
    if (newPin && !isValidPin(newPin)) {
      setError('El nuevo PIN debe tener exactamente 4 dígitos.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('Los nuevos PIN no coinciden.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await updateAccount({
        currentPin,
        email: normalizedEmail,
        ...(newPin ? { newPin } : {}),
      });
      close();
      Alert.alert('Cuenta actualizada', 'Tus datos de acceso se han actualizado correctamente.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudieron actualizar los datos.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>SEGURIDAD</Text>
              <Text style={styles.title}>Mi cuenta</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={close} accessibilityLabel="Cerrar">
              <Ionicons name="close" size={22} color="#A1A1A6" />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.helper}>Actualiza el correo y el PIN que usas para entrar.</Text>

            <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="correo@centro.com"
              placeholderTextColor="#6E6E73"
            />

            <Text style={styles.label}>PIN ACTUAL *</Text>
            <TextInput
              style={styles.input}
              value={currentPin}
              onChangeText={(value) => setCurrentPin(normalizePin(value))}
              secureTextEntry
              keyboardType="numeric"
              maxLength={PIN_LENGTH}
              placeholder="Necesario para confirmar"
              placeholderTextColor="#6E6E73"
            />

            <Text style={styles.label}>NUEVO PIN (OPCIONAL)</Text>
            <TextInput
              style={styles.input}
              value={newPin}
              onChangeText={(value) => setNewPin(normalizePin(value))}
              secureTextEntry
              keyboardType="numeric"
              maxLength={PIN_LENGTH}
              placeholder="0000"
              placeholderTextColor="#6E6E73"
            />

            <Text style={styles.label}>REPETIR NUEVO PIN</Text>
            <TextInput
              style={styles.input}
              value={confirmPin}
              onChangeText={(value) => setConfirmPin(normalizePin(value))}
              secureTextEntry
              keyboardType="numeric"
              maxLength={PIN_LENGTH}
              placeholder="Repite el nuevo PIN"
              placeholderTextColor="#6E6E73"
            />

            {error !== '' && <Text style={styles.error}>{error}</Text>}
          </ScrollView>

          <TouchableOpacity style={[styles.saveButton, saving && styles.disabled]} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Guardar cambios</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.72)' },
  sheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#333338',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    maxHeight: '92%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  eyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  title: { color: '#FFFFFF', fontSize: 23, fontWeight: '900', marginTop: 4 },
  closeButton: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#29292D' },
  helper: { color: '#A1A1A6', fontSize: 13, lineHeight: 18, marginBottom: 4 },
  label: { color: '#8E8E93', fontSize: 10, fontWeight: '800', letterSpacing: 0.7, marginTop: 14, marginBottom: 6 },
  input: { height: 46, borderRadius: 11, backgroundColor: '#28282C', borderWidth: 1, borderColor: '#37373D', color: '#FFFFFF', paddingHorizontal: 13, fontSize: 14 },
  error: { color: '#FF6961', fontSize: 12, lineHeight: 17, marginTop: 12 },
  saveButton: { backgroundColor: COLORS.primary, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  disabled: { opacity: 0.7 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
