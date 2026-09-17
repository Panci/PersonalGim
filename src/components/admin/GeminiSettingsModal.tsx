import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getAiProviderSettingsRequest, saveGeminiApiKeyRequest } from '../../auth/api';
import { useAuth } from '../../auth/AuthProvider';
import { COLORS } from '../../theme/colors';

interface GeminiSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const GeminiSettingsModal: React.FC<GeminiSettingsModalProps> = ({ visible, onClose }) => {
  const { session } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible || !session) return;
    let mounted = true;
    setLoading(true);
    setError('');
    void getAiProviderSettingsRequest(session.token)
      .then((settings) => {
        if (mounted) setConfigured(settings.configured);
      })
      .catch((reason) => {
        if (mounted) setError(reason instanceof Error ? reason.message : 'No se pudo consultar la configuración.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [visible, session]);

  const closeAndReset = () => {
    setApiKey('');
    setError('');
    onClose();
  };

  const save = async () => {
    if (!session) return;
    if (!apiKey.trim()) {
      setError('Pega una clave de API de Gemini para guardarla.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await saveGeminiApiKeyRequest(session.token, apiKey.trim());
      setConfigured(true);
      setApiKey('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar la clave.');
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
              <Text style={styles.eyebrow}>ADMINISTRACIÓN</Text>
              <Text style={styles.title}>Configuración de IA</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={closeAndReset} accessibilityLabel="Cerrar configuración de IA">
              <Ionicons name="close" size={22} color="#A1A1A6" />
            </TouchableOpacity>
          </View>

          <View style={styles.providerCard}>
            <View style={styles.providerIcon}><MaterialCommunityIcons name="google" size={22} color="#FFFFFF" /></View>
            <View style={styles.providerCopy}>
              <Text style={styles.providerName}>Gemini</Text>
              <Text style={styles.providerDetail}>Proveedor de generación de rutinas</Text>
            </View>
            {loading ? <ActivityIndicator size="small" color={COLORS.primary} /> : (
              <View style={[styles.statusBadge, configured ? styles.statusReady : styles.statusPending]}>
                <Text style={[styles.statusText, configured ? styles.statusReadyText : styles.statusPendingText]}>{configured ? 'Configurada' : 'Pendiente'}</Text>
              </View>
            )}
          </View>

          <Text style={styles.info}>La clave se envía al servidor cifrada. Por seguridad no podrá volver a verse; para sustituirla, pega una nueva.</Text>
          <Text style={styles.label}>{configured ? 'SUSTITUIR CLAVE DE GEMINI' : 'CLAVE DE API DE GEMINI'}</Text>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="Pega aquí la clave"
            placeholderTextColor="#6E6E73"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!saving}
          />
          <Text style={styles.caption}>La clave nunca se guarda en el teléfono ni se incluye en la app publicada.</Text>
          {error !== '' && <Text style={styles.error}>{error}</Text>}
          {configured && !apiKey && error === '' && <Text style={styles.success}>La conexión con Gemini está preparada para cuando activemos «Crear con IA».</Text>}

          <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={() => void save()} disabled={saving || loading}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <><Ionicons name="lock-closed-outline" size={18} color="#FFFFFF" /><Text style={styles.saveText}>Guardar clave de Gemini</Text></>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.68)' },
  sheet: { width: '100%', maxWidth: 430, alignSelf: 'center', backgroundColor: '#1C1C1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderWidth: 1, borderColor: '#333338' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  eyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  title: { color: '#FFFFFF', fontSize: 23, fontWeight: '900', marginTop: 4 },
  closeButton: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#29292D' },
  providerCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: '#3A3A40', backgroundColor: '#252529', padding: 13 },
  providerIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#4285F4', alignItems: 'center', justifyContent: 'center' },
  providerCopy: { flex: 1, marginLeft: 11 },
  providerName: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  providerDetail: { color: '#A1A1A6', fontSize: 11, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  statusReady: { backgroundColor: 'rgba(52,199,89,0.16)' },
  statusPending: { backgroundColor: 'rgba(255,149,0,0.16)' },
  statusText: { fontSize: 10, fontWeight: '800' },
  statusReadyText: { color: '#34C759' },
  statusPendingText: { color: '#FF9500' },
  info: { color: '#D1D1D6', fontSize: 13, lineHeight: 19, marginTop: 16 },
  label: { color: '#8E8E93', fontSize: 10, fontWeight: '800', letterSpacing: 0.7, marginTop: 16, marginBottom: 6 },
  input: { height: 48, borderRadius: 11, backgroundColor: '#28282C', borderWidth: 1, borderColor: '#37373D', color: '#FFFFFF', paddingHorizontal: 13, fontSize: 15 },
  caption: { color: '#8E8E93', fontSize: 11, lineHeight: 16, marginTop: 7 },
  error: { color: '#FF6961', fontSize: 12, lineHeight: 17, marginTop: 10 },
  success: { color: '#34C759', fontSize: 12, lineHeight: 17, marginTop: 10 },
  saveButton: { height: 50, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 17, marginBottom: 4 },
  saveButtonDisabled: { opacity: 0.65 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
