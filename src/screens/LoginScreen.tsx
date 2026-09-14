import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthProvider';
import { COLORS } from '../theme/colors';

const roles = [
  { role: 'Administrador', description: 'Gestiona usuarios, rutinas y analítica.', icon: 'shield-account' },
  { role: 'Monitor', description: 'Consulta socios y acompaña sus entrenamientos.', icon: 'whistle' },
  { role: 'Usuario', description: 'Accede a sus rutinas, registro y progreso.', icon: 'account-heart' },
];

export const LoginScreen: React.FC = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSignIn = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError('Introduce tu correo y contraseña.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await signIn(normalizedEmail, password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.hero}>
        <View style={styles.logoMark}>
          <MaterialCommunityIcons name="dumbbell" size={36} color="#FFFFFF" />
        </View>
        <Text style={styles.brand}>PersonalGim</Text>
        <Text style={styles.tagline}>Entrena, acompaña y gestiona desde un solo lugar.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Acceder</Text>
        <Text style={styles.cardSubtitle}>Usa la cuenta creada por tu administrador.</Text>

        <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="nombre@centro.com"
          placeholderTextColor="#6E6E73"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!submitting}
        />

        <Text style={styles.label}>CONTRASEÑA</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
            placeholder="Tu contraseña"
            placeholderTextColor="#6E6E73"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            editable={!submitting}
            onSubmitEditing={handleSignIn}
          />
          <TouchableOpacity
            style={styles.showPasswordButton}
            onPress={() => setShowPassword((value) => !value)}
            accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color="#A1A1A6" />
          </TouchableOpacity>
        </View>

        {error !== '' && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSignIn}
          activeOpacity={0.8}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Entrar</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.rolesBlock}>
        <Text style={styles.rolesTitle}>ACCESOS SEGÚN TU FUNCIÓN</Text>
        {roles.map((item) => (
          <View key={item.role} style={styles.roleRow}>
            <MaterialCommunityIcons name={item.icon as any} size={21} color={COLORS.primary} />
            <View style={styles.roleCopy}>
              <Text style={styles.roleName}>{item.role}</Text>
              <Text style={styles.roleDescription}>{item.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', paddingHorizontal: 20, justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: 28 },
  logoMark: { width: 68, height: 68, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  brand: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', letterSpacing: -0.6 },
  tagline: { color: '#A1A1A6', fontSize: 14, textAlign: 'center', marginTop: 7, lineHeight: 20 },
  card: { backgroundColor: '#1C1C1E', borderRadius: 22, padding: 20, borderWidth: 1, borderColor: '#2E2E32' },
  cardTitle: { color: '#FFFFFF', fontSize: 23, fontWeight: '800' },
  cardSubtitle: { color: '#A1A1A6', fontSize: 13, marginTop: 5, marginBottom: 20 },
  label: { color: '#8E8E93', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 7, marginTop: 13 },
  input: { height: 48, borderRadius: 12, backgroundColor: '#28282C', color: '#FFFFFF', paddingHorizontal: 14, fontSize: 15, borderWidth: 1, borderColor: '#34343A' },
  passwordRow: { height: 48, borderRadius: 12, backgroundColor: '#28282C', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#34343A' },
  passwordInput: { flex: 1, height: '100%', color: '#FFFFFF', paddingHorizontal: 14, fontSize: 15 },
  showPasswordButton: { width: 48, height: '100%', alignItems: 'center', justifyContent: 'center' },
  error: { color: '#FF6961', fontSize: 13, lineHeight: 18, marginTop: 12 },
  submitButton: { height: 52, marginTop: 20, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
  submitButtonDisabled: { opacity: 0.65 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  rolesBlock: { marginTop: 24, paddingHorizontal: 4 },
  rolesTitle: { color: '#6E6E73', fontSize: 10, fontWeight: '800', letterSpacing: 0.9, marginBottom: 10 },
  roleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  roleCopy: { flex: 1, marginLeft: 11 },
  roleName: { color: '#F2F2F7', fontSize: 13, fontWeight: '700' },
  roleDescription: { color: '#8E8E93', fontSize: 12, marginTop: 2, lineHeight: 16 },
});
