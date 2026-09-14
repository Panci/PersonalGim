import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { GymMember, MemberStatus } from '../../types';
import { useWorkoutStore } from '../../store/workoutStore';
import { NewMemberModal } from './NewMemberModal';
import { MemberDetailModal } from './MemberDetailModal';
import { exportCsvFile } from './csvExport';
import { useAuth } from '../../auth/AuthProvider';
import { CreateAccessModal } from './CreateAccessModal';

type AdminTab = 'socios' | 'accesos' | 'rutinas' | 'analitica';

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value);
  // Excel/LibreOffice may evaluate a cell that starts with one of these characters.
  const formulaSafeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${formulaSafeText.replace(/"/g, '""')}"`;
};

const toCsv = (headers: string[], rows: unknown[][]) =>
  `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`;

export const AdminDashboard: React.FC = () => {
  const { signOut } = useAuth();
  const {
    gymMembers,
    setCurrentRole,
    collections,
    selectedMemberForDetail,
    setSelectedMemberForDetail,
    setShowCreateRoutineModal,
    attendanceLogs,
    registerAttendance,
    history,
    setActiveMember,
    setShowQrPassModal,
  } = useWorkoutStore();

  const [activeTab, setActiveTab] = useState<AdminTab>('socios');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | MemberStatus>('todos');
  const [showNewMemberModal, setShowNewMemberModal] = useState(false);
  const [showCreateAccessModal, setShowCreateAccessModal] = useState(false);
  const [selectedMemberForCheckIn, setSelectedMemberForCheckIn] = useState<string>('');
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string>('');
  const activeMembersCount = gymMembers.filter((m) => m.status === 'activo').length;
  const totalWorkoutsMonth = gymMembers.reduce((acc, m) => acc + m.completedWorkoutsCount, 0);

  const getLatestAttendanceForMember = (memberId: string) => attendanceLogs
    .filter((log) => log.memberId === memberId)
    .reduce<typeof attendanceLogs[number] | null>(
      (latest, log) => !latest || new Date(log.timestamp).getTime() > new Date(latest.timestamp).getTime() ? log : latest,
      null,
    );

  // Compute who is currently in gym from the actual most recent attendance event.
  const membersCurrentlyInGym = gymMembers.filter((m) => {
    return getLatestAttendanceForMember(m.id)?.type === 'entrada';
  });

  const currentOccupancy = membersCurrentlyInGym.length;
  const maxRoomCapacity = 60;
  const occupancyPercentage = Math.min(100, Math.round((currentOccupancy / maxRoomCapacity) * 100));
  const todayAttendanceLogs = attendanceLogs.filter((log) => {
    const now = new Date();
    const date = new Date(log.timestamp);
    return date.getFullYear() === now.getFullYear()
      && date.getMonth() === now.getMonth()
      && date.getDate() === now.getDate();
  });
  const objectiveBreakdown = useMemo(() => {
    const labels = {
      hipertrofia: { name: 'Hipertrofia Muscular', color: COLORS.primary },
      fuerza: { name: 'Fuerza Máxima', color: '#34C759' },
      perdida_grasa: { name: 'Pérdida de Grasa', color: '#FF9500' },
      salud_general: { name: 'Salud y Readaptación', color: '#0A84FF' },
    } as const;
    return Object.entries(labels).map(([objective, config]) => {
      const count = gymMembers.filter((member) => member.objective === objective).length;
      return { ...config, count, pct: gymMembers.length ? Math.round((count / gymMembers.length) * 100) : 0 };
    });
  }, [gymMembers]);

  // Filter members
  const filteredMembers = gymMembers.filter((m) => {
    if (statusFilter !== 'todos' && m.status !== statusFilter) return false;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchName = m.fullName.toLowerCase().includes(q);
      const matchCode = m.membershipNumber.toLowerCase().includes(q);
      const matchEmail = m.email.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchEmail) return false;
    }
    return true;
  });

  const showExportMessage = (message: string) => {
    setDownloadSuccessMsg(message);
    setTimeout(() => setDownloadSuccessMsg(''), 3500);
  };

  const downloadFile = async (content: string, filename: string, mime = 'text/csv') => {
    try {
      showExportMessage(await exportCsvFile(content, filename, mime));
    } catch {
      showExportMessage(`No se pudo exportar ${filename}. Revisa el almacenamiento y las opciones de compartir.`);
    }
  };

  // CSV Exports
  const handleExportMembersCsv = () => {
    const headers = [
      'ID',
      'Numero_Socio',
      'Nombre_Completo',
      'Email',
      'Telefono',
      'Estado',
      'Objetivo',
      'Nivel',
      'Rutina_Asignada',
      'Peso_Kg',
      'Entrenamientos_Completados',
      'Fecha_Alta',
    ];
    const rows = gymMembers.map((m) => [
      m.id,
      m.membershipNumber,
      m.fullName,
      m.email,
      m.phone || '',
      m.status,
      m.objective,
      m.level,
      m.assignedRoutineTitle || 'Sin rutina',
      m.currentWeightKg || '',
      m.completedWorkoutsCount,
      m.enrollmentDate,
    ]);
    const csvContent = toCsv(headers, rows);
    downloadFile(csvContent, 'socios_personalgim.csv');
  };

  const handleExportAttendanceCsv = () => {
    const headers = ['ID', 'ID_Socio', 'Numero_Socio', 'Nombre_Socio', 'Tipo_Evento', 'Fecha_Hora'];
    const rows = attendanceLogs.map((a) => [
      a.id,
      a.memberId,
      a.membershipNumber,
      a.memberName,
      a.type,
      a.timestamp,
    ]);
    const csvContent = toCsv(headers, rows);
    downloadFile(csvContent, 'asistencias_tornos_personalgim.csv');
  };

  const handleExportWorkoutsCsv = () => {
    const headers = ['ID', 'Nombre_Sesion', 'Fecha_Inicio', 'Duracion_Segundos', 'Kcal', 'Volumen_Total_Kg'];
    const rows = history.map((w) => [
      w.id,
      w.name,
      w.startTime,
      w.durationSeconds,
      w.totalKcal,
      w.totalVolumeKg,
    ]);
    const csvContent = toCsv(headers, rows);
    downloadFile(csvContent, 'historial_entrenamientos.csv');
  };

  const handleQuickCheckIn = (memberId: string, type: 'entrada' | 'salida') => {
    registerAttendance(memberId, type);
    setSelectedMemberForCheckIn('');
  };

  return (
    <View style={styles.container}>
      {/* Top Admin Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.badgeRow}>
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>PANEL ADMINISTRADOR</Text>
            </View>
            <Text style={styles.capacityBadge}>{gymMembers.length} / 100 socios</Text>
          </View>
          <Text style={styles.title}>Gestión del Gimnasio</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.switchRoleBtn}
            onPress={() => setCurrentRole('member')}
            activeOpacity={0.8}
          >
            <Ionicons name="barbell" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.switchRoleText}>Modo Entreno</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => void signOut()} accessibilityLabel="Cerrar sesión">
            <Ionicons name="log-out-outline" size={19} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.createAccessBtn} onPress={() => setShowCreateAccessModal(true)} accessibilityLabel="Crear cuenta">
            <Ionicons name="person-add-outline" size={19} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Success Notification for Downloads */}
      {downloadSuccessMsg !== '' && (
        <View style={styles.downloadToast}>
          <Ionicons name="checkmark-circle" size={16} color="#34C759" style={{ marginRight: 6 }} />
          <Text style={styles.downloadToastText}>{downloadSuccessMsg}</Text>
        </View>
      )}

      {/* KPI Ribbon */}
      <View style={styles.kpiRibbon}>
        <View style={styles.kpiItem}>
          <Text style={styles.kpiNum}>{gymMembers.length}</Text>
          <Text style={styles.kpiLabel}>Total Socios</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiItem}>
          <Text style={[styles.kpiNum, { color: '#34C759' }]}>{activeMembersCount}</Text>
          <Text style={styles.kpiLabel}>Activos</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiItem}>
          <Text style={[styles.kpiNum, { color: COLORS.primary }]}>{currentOccupancy}</Text>
          <Text style={styles.kpiLabel}>En Sala Ahora</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiItem}>
          <Text style={[styles.kpiNum, { color: '#0A84FF' }]}>{totalWorkoutsMonth}</Text>
          <Text style={styles.kpiLabel}>Sesiones Club</Text>
        </View>
      </View>

      {/* Admin Tabs */}
      <View style={styles.tabsRow}>
        {[
          { id: 'socios', label: 'Socios', icon: 'people' },
          { id: 'accesos', label: 'Tornos y Aforo', icon: 'qr-code' },
          { id: 'rutinas', label: 'Plantillas Rutina', icon: 'clipboard' },
          { id: 'analitica', label: 'Analítica y CSV', icon: 'bar-chart' },
        ].map((t) => {
          const isSel = activeTab === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.tabBtn, isSel && styles.tabBtnActive]}
              onPress={() => setActiveTab(t.id as AdminTab)}
            >
              <Ionicons
                name={t.icon as any}
                size={14}
                color={isSel ? COLORS.primary : '#8E8E93'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabText, isSel && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Tab 1: Socios */}
        {activeTab === 'socios' && (
          <View>
            {/* Search and Add Member */}
            <View style={styles.actionRow}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={16} color="#8E8E93" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar por nombre, código o email..."
                  placeholderTextColor="#636366"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <TouchableOpacity
                style={styles.addMemberBtn}
                onPress={() => setShowNewMemberModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="person-add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.addMemberBtnText}>Alta Socio</Text>
              </TouchableOpacity>
            </View>

            {/* Status Filter Chips */}
            <View style={styles.filterChipsRow}>
              {(['todos', 'activo', 'inactivo', 'pendiente'] as const).map((st) => {
                const isSel = statusFilter === st;
                return (
                  <TouchableOpacity
                    key={st}
                    style={[styles.statusChip, isSel && styles.statusChipActive]}
                    onPress={() => setStatusFilter(st)}
                  >
                    <Text style={[styles.statusChipText, isSel && styles.statusChipTextActive]}>
                      {st.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Members List */}
            <View style={styles.membersList}>
              {filteredMembers.map((member) => {
                const isActive = member.status === 'activo';
                const isInside = membersCurrentlyInGym.some((m) => m.id === member.id);
                return (
                  <TouchableOpacity
                    key={member.id}
                    style={styles.memberCard}
                    onPress={() => setSelectedMemberForDetail(member)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.memberAvatar}>
                      <Text style={styles.avatarText}>
                        {member.fullName.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.memberInfo}>
                      <View style={styles.nameCodeRow}>
                        <Text style={styles.memberName}>{member.fullName}</Text>
                        <Text style={styles.memberCode}>{member.membershipNumber}</Text>
                        {isInside && (
                          <View style={styles.insideGymBadge}>
                            <Text style={styles.insideGymText}>EN SALA</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.memberEmail}>{member.email}</Text>

                      <View style={styles.routineAssignedRow}>
                        <Ionicons name="barbell-outline" size={13} color={COLORS.primary} />
                        <Text style={styles.routineAssignedText} numberOfLines={1}>
                          {member.assignedRoutineTitle || 'Sin rutina asignada'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.memberActionBtns}>
                      {/* Fast QR Pass Opener */}
                      <TouchableOpacity
                        style={styles.qrPassIconBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          setActiveMember(member);
                          setShowQrPassModal(true);
                        }}
                      >
                        <Ionicons name="qr-code" size={16} color={COLORS.primary} />
                      </TouchableOpacity>

                      <View style={styles.memberStatusCol}>
                        <View style={[styles.statusDot, { backgroundColor: isActive ? '#34C759' : '#FF453A' }]} />
                        <Text style={[styles.statusLabel, { color: isActive ? '#34C759' : '#FF453A' }]}>
                          {member.status}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Tab 2: Control de Accesos, Tornos y Aforo */}
        {activeTab === 'accesos' && (
          <View>
            <Text style={styles.sectionHeading}>AFORO Y TORNO DE ACCESO EN TIEMPO REAL</Text>

            {/* Occupancy Hero Card */}
            <View style={styles.occupancyHeroCard}>
              <View style={styles.occupancyTopRow}>
                <View>
                  <Text style={styles.occupancyTitle}>OCUPACIÓN EN SALA</Text>
                  <View style={styles.occupancyCountRow}>
                    <Text style={styles.occupancyBigNum}>{currentOccupancy}</Text>
                    <Text style={styles.occupancyMaxNum}>/ {maxRoomCapacity} personas</Text>
                  </View>
                </View>

                <View style={[
                  styles.occupancyStatusPill,
                  occupancyPercentage > 75 ? styles.occupancyPillRed : occupancyPercentage > 40 ? styles.occupancyPillOrange : styles.occupancyPillGreen
                ]}>
                  <View style={[
                    styles.pulseDot,
                    { backgroundColor: occupancyPercentage > 75 ? '#FF453A' : occupancyPercentage > 40 ? '#FF9500' : '#34C759' }
                  ]} />
                  <Text style={[
                    styles.occupancyStatusText,
                    { color: occupancyPercentage > 75 ? '#FF453A' : occupancyPercentage > 40 ? '#FF9500' : '#34C759' }
                  ]}>
                    {occupancyPercentage > 75 ? 'AFORO ALTO' : occupancyPercentage > 40 ? 'AFORO MEDIO' : 'AFORO TRANQUILO'}
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.occupancyBarContainer}>
                <View style={[
                  styles.occupancyBarProgress,
                  {
                    width: `${occupancyPercentage}%`,
                    backgroundColor: occupancyPercentage > 75 ? '#FF453A' : occupancyPercentage > 40 ? '#FF9500' : '#34C759',
                  },
                ]} />
              </View>
              <Text style={styles.occupancySubNote}>
                {maxRoomCapacity - currentOccupancy} plazas libres restantes en la instalación.
              </Text>
            </View>

            {/* Manual Fast Check-in Registrar */}
            <Text style={styles.sectionHeading}>REGISTRO RÁPIDO DE TORNO / MOSTRADOR</Text>
            <View style={styles.fastCheckInCard}>
              <Text style={styles.fastCheckInLabel}>Seleccionar socio que pasa por torno:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberChipsScroll}>
                {gymMembers.map((m) => {
                  const isInside = membersCurrentlyInGym.some((inM) => inM.id === m.id);
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        styles.quickMemberChip,
                        selectedMemberForCheckIn === m.id && styles.quickMemberChipSelected,
                      ]}
                      onPress={() => setSelectedMemberForCheckIn(m.id)}
                    >
                      <View style={[styles.miniStatusDot, { backgroundColor: isInside ? '#34C759' : '#8E8E93' }]} />
                      <Text style={styles.quickMemberName}>{m.fullName}</Text>
                      <Text style={styles.quickMemberCode}>({m.membershipNumber})</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {selectedMemberForCheckIn !== '' && (
                <View style={styles.checkInActionButtonsRow}>
                  <TouchableOpacity
                    style={[styles.checkInBtn, { backgroundColor: '#34C759' }]}
                    onPress={() => handleQuickCheckIn(selectedMemberForCheckIn, 'entrada')}
                  >
                    <Ionicons name="log-in" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.checkInBtnText}>Registrar Entrada (Abrir Torno)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.checkInBtn, { backgroundColor: '#FF453A' }]}
                    onPress={() => handleQuickCheckIn(selectedMemberForCheckIn, 'salida')}
                  >
                    <Ionicons name="log-out" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.checkInBtnText}>Registrar Salida</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Live Feed of Attendance Logs */}
            <Text style={styles.sectionHeading}>REGISTRO DE PASOS DE HOY ({todayAttendanceLogs.length})</Text>
            <View style={styles.attendanceLogsList}>
              {todayAttendanceLogs.map((log) => {
                const isEntry = log.type === 'entrada';
                const isLatestEntry = getLatestAttendanceForMember(log.memberId)?.id === log.id && isEntry;
                const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <View key={log.id} style={styles.attendanceLogItem}>
                    <View style={[styles.logTypeIcon, { backgroundColor: isEntry ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 69, 58, 0.15)' }]}>
                      <Ionicons
                        name={isEntry ? 'enter-outline' : 'exit-outline'}
                        size={18}
                        color={isEntry ? '#34C759' : '#FF453A'}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.logMemberName}>{log.memberName}</Text>
                      <Text style={styles.logSubInfo}>Socio {log.membershipNumber} • {isEntry ? 'Entrada autorizada' : 'Salida registrada'}</Text>
                    </View>

                    <View style={styles.logTimeCol}>
                      <Text style={styles.logTimeText}>{timeStr}</Text>
                      {isLatestEntry && (
                        <TouchableOpacity
                          style={styles.markExitBtn}
                          onPress={() => registerAttendance(log.memberId, 'salida')}
                        >
                          <Text style={styles.markExitBtnText}>Marcar Salida</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Tab 3: Plantillas de Rutina */}
        {activeTab === 'rutinas' && (
          <View>
            <View style={styles.routineHeaderRow}>
              <Text style={styles.sectionHeading}>PROGRAMAS DEL GIMNASIO</Text>
              <TouchableOpacity
                style={styles.addRoutineBtn}
                onPress={() => setShowCreateRoutineModal(true)}
              >
                <Ionicons name="add" size={16} color={COLORS.primary} />
                <Text style={styles.addRoutineBtnText}>Crear Plantilla</Text>
              </TouchableOpacity>
            </View>

            {collections.map((col) => {
              const membersWithThisRoutine = gymMembers.filter(
                (m) => m.assignedRoutineId === col.id
              ).length;

              return (
                <View key={col.id} style={styles.routineAdminCard}>
                  <View style={styles.routineAdminTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.routineAdminTitle}>{col.title}</Text>
                      <Text style={styles.routineAdminSub}>{col.subtitle}</Text>
                    </View>
                    <View style={styles.memberCounterBadge}>
                      <Ionicons name="people" size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
                      <Text style={styles.memberCounterText}>{membersWithThisRoutine} socios</Text>
                    </View>
                  </View>

                  <View style={styles.routineDaysList}>
                    {col.days.map((d) => (
                      <View key={d.id} style={styles.miniDayPill}>
                        <Text style={styles.miniDayPillText}>{d.dayBadge.toUpperCase()}: {d.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Tab 4: Analítica y Exportación CSV */}
        {activeTab === 'analitica' && (
          <View>
            <Text style={styles.sectionHeading}>EXPORTACIÓN DE DATOS DEL GIMNASIO</Text>
            <View style={styles.csvExportCard}>
              <Text style={styles.csvTitle}>Descarga de Informes en CSV</Text>
              <Text style={styles.csvDesc}>
                Exporta listados completos compatibles con Excel y sistemas de contabilidad.
              </Text>

              <View style={styles.csvButtonsGrid}>
                <TouchableOpacity
                  style={styles.csvBtn}
                  onPress={handleExportMembersCsv}
                  activeOpacity={0.8}
                >
                  <Ionicons name="download-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.csvBtnText}>Socios (CSV)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.csvBtn}
                  onPress={handleExportAttendanceCsv}
                  activeOpacity={0.8}
                >
                  <Ionicons name="download-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.csvBtnText}>Asistencias (CSV)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.csvBtn}
                  onPress={handleExportWorkoutsCsv}
                  activeOpacity={0.8}
                >
                  <Ionicons name="download-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.csvBtnText}>Entrenamientos (CSV)</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.sectionHeading}>MÉTRICAS Y RENDIMIENTO DEL CLUB</Text>

            <View style={styles.analyticsCard}>
              <Text style={styles.cardTitle}>Capacidad del Club (Límite: 100 socios)</Text>
              <View style={styles.capacityBarBack}>
                <View style={[styles.capacityBarFill, { width: `${(gymMembers.length / 100) * 100}%` }]} />
              </View>
              <Text style={styles.capacitySubtext}>
                {gymMembers.length}% de ocupación ({100 - gymMembers.length} plazas disponibles)
              </Text>
            </View>

            <View style={styles.analyticsCard}>
              <Text style={styles.cardTitle}>Objetivos de los Socios</Text>
              {objectiveBreakdown.map((item) => (
                <View key={item.name} style={styles.statRow}>
                  <View style={styles.statInfoRow}>
                    <Text style={styles.statName}>{item.name}</Text>
                    <Text style={styles.statPct}>{item.pct}% ({item.count})</Text>
                  </View>
                  <View style={styles.statBarBack}>
                    <View style={[styles.statBarFill, { width: `${item.pct}%`, backgroundColor: item.color }]} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modals */}
      <NewMemberModal
        visible={showNewMemberModal}
        onClose={() => setShowNewMemberModal(false)}
      />

      <MemberDetailModal
        visible={selectedMemberForDetail !== null}
        member={selectedMemberForDetail}
        onClose={() => setSelectedMemberForDetail(null)}
      />
      <CreateAccessModal visible={showCreateAccessModal} onClose={() => setShowCreateAccessModal(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  accessGate: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessGateCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1E1E22',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#35353C',
  },
  accessGateTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 12,
  },
  accessGateText: {
    color: '#AEAEB2',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  pinInput: {
    width: '100%',
    color: '#FFFFFF',
    backgroundColor: '#121214',
    borderWidth: 1,
    borderColor: '#383840',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 3,
    marginBottom: 10,
  },
  pinError: {
    color: '#FF453A',
    fontSize: 12,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  unlockBtn: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 2,
  },
  unlockBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  accessGateNotice: {
    color: '#8E8E93',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 18,
  },
  backToTrainingBtn: {
    paddingVertical: 12,
    marginTop: 8,
  },
  backToTrainingText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 28,
    paddingBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  adminBadge: {
    backgroundColor: 'rgba(255, 106, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 106, 0, 0.4)',
  },
  adminBadgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  capacityBadge: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchRoleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#26262A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#383840',
  },
  switchRoleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#26262A',
    borderWidth: 1,
    borderColor: '#383840',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createAccessBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2C1E',
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#34C759',
  },
  downloadToastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  kpiRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#1C1C1E',
    marginHorizontal: 20,
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    marginBottom: 12,
  },
  kpiItem: {
    alignItems: 'center',
  },
  kpiNum: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  kpiLabel: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  kpiDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#2A2A2E',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  tabBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255, 106, 0, 0.1)',
  },
  tabText: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    padding: 0,
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
  },
  addMemberBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  statusChipActive: {
    backgroundColor: '#2E2E32',
    borderColor: COLORS.primary,
  },
  statusChipText: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '700',
  },
  statusChipTextActive: {
    color: '#FFFFFF',
  },
  membersList: {
    gap: 10,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#28282C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#38383E',
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  memberInfo: {
    flex: 1,
  },
  nameCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  memberName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  memberCode: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    backgroundColor: 'rgba(255, 106, 0, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  insideGymBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.4)',
  },
  insideGymText: {
    color: '#34C759',
    fontSize: 9,
    fontWeight: '800',
  },
  memberEmail: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 2,
  },
  routineAssignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  routineAssignedText: {
    color: '#D1D1D6',
    fontSize: 12,
    fontWeight: '500',
  },
  memberActionBtns: {
    alignItems: 'flex-end',
    gap: 8,
    marginLeft: 8,
  },
  qrPassIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 106, 0, 0.3)',
  },
  memberStatusCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  sectionHeading: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 6,
  },
  occupancyHeroCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    marginBottom: 16,
  },
  occupancyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  occupancyTitle: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  occupancyCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  occupancyBigNum: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
  },
  occupancyMaxNum: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '600',
  },
  occupancyStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  occupancyPillGreen: {
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    borderColor: 'rgba(52, 199, 89, 0.4)',
  },
  occupancyPillOrange: {
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
    borderColor: 'rgba(255, 149, 0, 0.4)',
  },
  occupancyPillRed: {
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    borderColor: 'rgba(255, 69, 58, 0.4)',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  occupancyStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  occupancyBarContainer: {
    height: 8,
    backgroundColor: '#28282C',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  occupancyBarProgress: {
    height: '100%',
    borderRadius: 4,
  },
  occupancySubNote: {
    color: '#8E8E93',
    fontSize: 11,
  },
  fastCheckInCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    marginBottom: 16,
  },
  fastCheckInLabel: {
    color: '#D1D1D6',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  memberChipsScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  quickMemberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#26262A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#35353A',
  },
  quickMemberChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  miniStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  quickMemberName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  quickMemberCode: {
    color: '#8E8E93',
    fontSize: 10,
  },
  checkInActionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  checkInBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  checkInBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  attendanceLogsList: {
    gap: 8,
  },
  attendanceLogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#26262A',
  },
  logTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logMemberName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  logSubInfo: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 2,
  },
  logTimeCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  logTimeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  markExitBtn: {
    backgroundColor: '#2A2A2E',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  markExitBtnText: {
    color: '#FF453A',
    fontSize: 10,
    fontWeight: '700',
  },
  csvExportCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    marginBottom: 16,
  },
  csvTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  csvDesc: {
    color: '#8E8E93',
    fontSize: 12,
    marginBottom: 14,
  },
  csvButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  csvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#26262A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38383E',
  },
  csvBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  routineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addRoutineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addRoutineBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  routineAdminCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    marginBottom: 12,
  },
  routineAdminTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  routineAdminTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  routineAdminSub: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 2,
  },
  memberCounterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 106, 0, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  memberCounterText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  routineDaysList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  miniDayPill: {
    backgroundColor: '#26262A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  miniDayPillText: {
    color: '#D1D1D6',
    fontSize: 11,
  },
  analyticsCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    marginBottom: 14,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  capacityBarBack: {
    height: 10,
    backgroundColor: '#28282C',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  capacityBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 5,
  },
  capacitySubtext: {
    color: '#8E8E93',
    fontSize: 12,
  },
  statRow: {
    marginBottom: 12,
  },
  statInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statName: {
    color: '#D1D1D6',
    fontSize: 13,
  },
  statPct: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  statBarBack: {
    height: 6,
    backgroundColor: '#28282C',
    borderRadius: 3,
    overflow: 'hidden',
  },
  statBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
