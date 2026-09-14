import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkoutStore } from '../../store/workoutStore';
import { COLORS } from '../../theme/colors';

export const MonitorDashboard: React.FC = () => {
  const { signOut, session } = useAuth();
  const { gymMembers, attendanceLogs, history } = useWorkoutStore();
  const activeMembers = gymMembers.filter((member) => member.status === 'activo').length;
  const currentlyTraining = useMemo(() => new Set(
    attendanceLogs
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .filter((log, index, all) => all.findIndex((candidate) => candidate.memberId === log.memberId) === index)
      .filter((log) => log.type === 'entrada')
      .map((log) => log.memberId),
  ), [attendanceLogs]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>PANEL MONITOR</Text>
            <Text style={styles.title}>Buenos entrenos, {session?.user.fullName.split(' ')[0] || 'monitor'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={() => void signOut()} accessibilityLabel="Cerrar sesión">
            <Ionicons name="log-out-outline" size={21} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.metrics}>
          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="account-group" size={22} color={COLORS.primary} />
            <Text style={styles.metricNumber}>{activeMembers}</Text>
            <Text style={styles.metricLabel}>Socios activos</Text>
          </View>
          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="door-open" size={22} color="#34C759" />
            <Text style={styles.metricNumber}>{currentlyTraining.size}</Text>
            <Text style={styles.metricLabel}>En sala ahora</Text>
          </View>
          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="dumbbell" size={22} color="#0A84FF" />
            <Text style={styles.metricNumber}>{history.length}</Text>
            <Text style={styles.metricLabel}>Sesiones vistas</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Socios activos</Text>
        {gymMembers.filter((member) => member.status === 'activo').slice(0, 12).map((member) => (
          <View key={member.id} style={styles.memberRow}>
            <View style={styles.memberAvatar}><Text style={styles.memberInitial}>{member.fullName.charAt(0)}</Text></View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.fullName}</Text>
              <Text style={styles.memberDetail}>{member.assignedRoutineTitle || 'Sin rutina asignada'}</Text>
            </View>
            {currentlyTraining.has(member.id) && <View style={styles.inGymBadge}><Text style={styles.inGymText}>EN SALA</Text></View>}
          </View>
        ))}
        {gymMembers.length === 0 && <Text style={styles.emptyText}>Los socios aparecerán aquí cuando se sincronicen desde el servidor.</Text>}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  content: { padding: 20, paddingTop: 46, paddingBottom: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  eyebrow: { color: COLORS.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.9 },
  title: { color: '#FFFFFF', fontSize: 25, fontWeight: '900', maxWidth: 275, marginTop: 5, lineHeight: 31 },
  logoutButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#28282C', alignItems: 'center', justifyContent: 'center' },
  metrics: { flexDirection: 'row', gap: 9, marginBottom: 28 },
  metricCard: { flex: 1, minHeight: 116, borderRadius: 17, padding: 12, backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#303036' },
  metricNumber: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', marginTop: 10 },
  metricLabel: { color: '#A1A1A6', fontSize: 11, fontWeight: '600', marginTop: 3, lineHeight: 14 },
  sectionTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 12 },
  memberRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 9, backgroundColor: '#1C1C1E', borderRadius: 16, borderWidth: 1, borderColor: '#2C2C30' },
  memberAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,106,0,0.18)', alignItems: 'center', justifyContent: 'center' },
  memberInitial: { color: COLORS.primary, fontSize: 17, fontWeight: '800' },
  memberInfo: { flex: 1, marginLeft: 11 },
  memberName: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  memberDetail: { color: '#8E8E93', fontSize: 11, marginTop: 3 },
  inGymBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7, backgroundColor: 'rgba(52,199,89,0.16)' },
  inGymText: { color: '#34C759', fontSize: 9, fontWeight: '800' },
  emptyText: { color: '#8E8E93', fontSize: 14, lineHeight: 20, paddingTop: 10 },
});
