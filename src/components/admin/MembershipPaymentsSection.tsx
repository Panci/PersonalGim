import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../auth/AuthProvider';
import {
  getMemberPaymentsRequest,
  getWhatsAppReminderSettingsRequest,
  MembershipPaymentRecord,
  recordMemberPaymentRequest,
  updateMemberMembershipRequest,
} from '../../auth/api';
import { COLORS } from '../../theme/colors';
import { GymMember } from '../../types';
import { useWorkoutStore } from '../../store/workoutStore';
import { isMembershipPaymentBlocked } from '../../utils/membershipBilling';

type PaymentFilter = 'todos' | 'pendientes' | 'vencidas' | 'sin-configurar';
type PaymentState = 'sin-configurar' | 'vencida' | 'hoy' | 'proxima' | 'al-dia';

interface MemberPaymentStatus {
  member: GymMember;
  state: PaymentState;
  daysUntilDue?: number;
}

const getMadridToday = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const getPaymentState = (member: GymMember): MemberPaymentStatus => {
  if (!member.monthlyFee || !member.paymentDueDate) return { member, state: 'sin-configurar' };
  const [year, month, day] = member.paymentDueDate.split('-').map(Number);
  const dueDate = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(dueDate.getTime())) return { member, state: 'sin-configurar' };
  const today = new Date(`${getMadridToday()}T00:00:00.000Z`);
  const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
  if (daysUntilDue < 0) return { member, state: 'vencida', daysUntilDue };
  if (daysUntilDue === 0) return { member, state: 'hoy', daysUntilDue };
  if (daysUntilDue <= 7) return { member, state: 'proxima', daysUntilDue };
  return { member, state: 'al-dia', daysUntilDue };
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  const dateOnly = value.slice(0, 10);
  const parts = dateOnly.split('-');
  if (parts.length !== 3) return '—';
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es-ES');
};

const formatMoney = (value?: number) => typeof value === 'number'
  ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
  : 'Sin configurar';

const paymentStateLabel = (item: MemberPaymentStatus) => {
  switch (item.state) {
    case 'sin-configurar': return 'Cuota sin configurar';
    case 'vencida': return `Vencida hace ${Math.abs(item.daysUntilDue || 0)} días`;
    case 'hoy': return 'Vence hoy';
    case 'proxima': return `Vence en ${item.daysUntilDue} días`;
    default: return 'Al día';
  }
};

const stateColor = (state: PaymentState) => {
  if (state === 'vencida') return '#FF453A';
  if (state === 'hoy' || state === 'proxima') return '#FF9F0A';
  if (state === 'sin-configurar') return '#8E8E93';
  return COLORS.primary;
};

const normalizePhoneForWhatsApp = (phone?: string) => {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 9) digits = `34${digits}`;
  return digits;
};

const parseSpanishDate = (value: string) => {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const MembershipPaymentsSection: React.FC = () => {
  const { gymMembers } = useWorkoutStore();
  const { session } = useAuth();
  const [filter, setFilter] = useState<PaymentFilter>('todos');
  const [search, setSearch] = useState('');
  const [editingMember, setEditingMember] = useState<GymMember | null>(null);
  const [monthlyFee, setMonthlyFee] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [whatsappRemindersEnabled, setWhatsappRemindersEnabled] = useState(false);
  const [whatsappConsentNote, setWhatsappConsentNote] = useState('');
  const [whatsappConfigured, setWhatsappConfigured] = useState(false);
  const [whatsappTemplateName, setWhatsappTemplateName] = useState<string | null>(null);
  const [billingTick, setBillingTick] = useState(0);
  const [saving, setSaving] = useState(false);
  const [payingMemberId, setPayingMemberId] = useState<string | null>(null);
  const [historyOpenFor, setHistoryOpenFor] = useState<string | null>(null);
  const [historyLoadingFor, setHistoryLoadingFor] = useState<string | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<Record<string, MembershipPaymentRecord[]>>({});
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!session) return;
    void getWhatsAppReminderSettingsRequest(session.token)
      .then((settings) => {
        setWhatsappConfigured(settings.configured);
        setWhatsappTemplateName(settings.templateName);
      })
      .catch(() => setWhatsappConfigured(false));
  }, [session?.token]);

  useEffect(() => {
    const timer = setInterval(() => setBillingTick((tick) => tick + 1), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const statuses = useMemo(() => gymMembers.map(getPaymentState), [gymMembers, billingTick]);
  const counts = useMemo(() => ({
    overdue: statuses.filter((item) => item.state === 'vencida').length,
    soon: statuses.filter((item) => item.state === 'hoy' || item.state === 'proxima').length,
    configured: statuses.filter((item) => item.state !== 'sin-configurar').length,
    totalMonthly: gymMembers.reduce((total, item) => total + (item.monthlyFee || 0), 0),
  }), [gymMembers, statuses]);

  const visibleMembers = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('es');
    const stateRank: Record<PaymentState, number> = {
      vencida: 0, hoy: 1, proxima: 2, 'al-dia': 3, 'sin-configurar': 4,
    };
    return statuses
      .filter((item) => {
        if (filter === 'vencidas' && item.state !== 'vencida') return false;
        if (filter === 'pendientes' && !['vencida', 'hoy', 'proxima'].includes(item.state)) return false;
        if (filter === 'sin-configurar' && item.state !== 'sin-configurar') return false;
        if (!normalizedSearch) return true;
        return `${item.member.fullName} ${item.member.email} ${item.member.membershipNumber}`
          .toLocaleLowerCase('es').includes(normalizedSearch);
      })
      .sort((a, b) => stateRank[a.state] - stateRank[b.state]
        || String(a.member.paymentDueDate || '').localeCompare(String(b.member.paymentDueDate || ''))
        || a.member.fullName.localeCompare(b.member.fullName, 'es'));
  }, [filter, search, statuses]);

  const openEditor = (member: GymMember) => {
    setEditingMember(member);
    setMonthlyFee(member.monthlyFee ? String(member.monthlyFee).replace('.', ',') : '');
    setPaymentDueDate(member.paymentDueDate ? formatDate(member.paymentDueDate) : '');
    setWhatsappRemindersEnabled(member.whatsappRemindersEnabled === true);
    setWhatsappConsentNote(member.whatsappConsentNote || '');
    setFeedback('');
  };

  const updateLocalMember = (memberId: string, updates: Partial<GymMember>) => {
    useWorkoutStore.setState((state) => {
      const update = (member: GymMember | null) => member?.id === memberId ? { ...member, ...updates } : member;
      return {
        gymMembers: state.gymMembers.map((member) => member.id === memberId ? { ...member, ...updates } : member),
        selectedMemberForDetail: update(state.selectedMemberForDetail),
        activeMember: update(state.activeMember),
      };
    });
  };

  const saveMembership = async () => {
    if (!editingMember || !session || saving) return;
    const fee = Number(monthlyFee.trim().replace(',', '.'));
    const dueDate = parseSpanishDate(paymentDueDate);
    if (!Number.isFinite(fee) || fee <= 0 || fee > 10000) {
      setFeedback('Introduce una cuota válida, mayor que 0 € y hasta 10.000 €.');
      return;
    }
    if (!dueDate) {
      setFeedback('Escribe una fecha válida con formato DD/MM/AAAA.');
      return;
    }
    if (whatsappRemindersEnabled && (whatsappConsentNote.trim().length < 5 || whatsappConsentNote.trim().length > 200)) {
      setFeedback('Indica cómo y cuándo autorizó el socio los avisos por WhatsApp (5 a 200 caracteres).');
      return;
    }
    setSaving(true);
    setFeedback('');
    try {
      await updateMemberMembershipRequest(session.token, editingMember.id, {
        monthlyFee: Math.round(fee * 100) / 100,
        paymentDueDate: dueDate,
        whatsappRemindersEnabled,
        whatsappConsentNote: whatsappConsentNote.trim(),
      });
      updateLocalMember(editingMember.id, {
        monthlyFee: Math.round(fee * 100) / 100,
        paymentDueDate: dueDate,
        whatsappRemindersEnabled,
        whatsappConsentNote: whatsappRemindersEnabled ? whatsappConsentNote.trim() : editingMember.whatsappConsentNote,
      });
      setEditingMember(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo guardar la cuota.');
    } finally {
      setSaving(false);
    }
  };

  const recordPayment = async (member: GymMember) => {
    if (!session || payingMemberId) return;
    setPayingMemberId(member.id);
    setFeedback('');
    try {
      const result = await recordMemberPaymentRequest(session.token, member.id);
      updateLocalMember(member.id, {
        lastPaymentAt: result.payment.paidAt,
        paymentDueDate: result.payment.paymentDueDate,
      });
      setPaymentHistory((history) => {
        const next = { ...history };
        delete next[member.id];
        return next;
      });
      setHistoryOpenFor((openId) => openId === member.id ? null : openId);
      setFeedback(`Pago registrado para ${member.fullName}.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo registrar el pago.');
    } finally {
      setPayingMemberId(null);
    }
  };

  const togglePaymentHistory = async (memberId: string) => {
    if (historyOpenFor === memberId) {
      setHistoryOpenFor(null);
      return;
    }
    setHistoryOpenFor(memberId);
    if (paymentHistory[memberId] || !session) return;
    setHistoryLoadingFor(memberId);
    setFeedback('');
    try {
      const payments = await getMemberPaymentsRequest(session.token, memberId);
      setPaymentHistory((history) => ({ ...history, [memberId]: payments }));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo cargar el historial de pagos.');
      setHistoryOpenFor(null);
    } finally {
      setHistoryLoadingFor(null);
    }
  };

  const openReminder = async (item: MemberPaymentStatus) => {
    const phone = normalizePhoneForWhatsApp(item.member.phone);
    if (!phone || !item.member.paymentDueDate || !item.member.monthlyFee
      || !item.member.whatsappRemindersEnabled || !item.member.whatsappConsentNote) return;
    const message = item.state === 'vencida'
      ? `Hola ${item.member.fullName}, te recordamos que tienes pendiente la cuota del gimnasio de ${formatMoney(item.member.monthlyFee)}. Si ya la has abonado, puedes ignorar este mensaje. ¡Gracias!`
      : `Hola ${item.member.fullName}, te recordamos que la cuota del gimnasio de ${formatMoney(item.member.monthlyFee)} vence el ${formatDate(item.member.paymentDueDate)}. ¡Gracias!`;
    try {
      await Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
    } catch {
      setFeedback('No se pudo abrir WhatsApp. Comprueba que el teléfono del socio sea correcto.');
    }
  };

  return (
    <View>
      <Text style={styles.sectionHeading}>CUOTAS Y PAGOS</Text>
      <Text style={styles.introText}>Asigna y edita la cuota de cada socio, activa avisos dos días antes y controla los bloqueos por impago.</Text>

      <View style={[styles.whatsappBanner, whatsappConfigured ? styles.whatsappReady : styles.whatsappPending]}>
        <Ionicons name={whatsappConfigured ? 'logo-whatsapp' : 'information-circle-outline'} size={19} color={whatsappConfigured ? COLORS.success : '#FF9F0A'} />
        <View style={styles.whatsappBannerText}>
          <Text style={styles.whatsappBannerTitle}>{whatsappConfigured ? 'Configuración de WhatsApp detectada' : 'WhatsApp automático pendiente de conexión'}</Text>
          <Text style={styles.whatsappBannerBody}>
            {whatsappConfigured
              ? `Comprueba que la plantilla ${whatsappTemplateName || ''} esté aprobada y realiza un envío de prueba antes de usarla.`
              : 'Añade las credenciales de WhatsApp Business y una plantilla aprobada para activar los envíos.'}
          </Text>
        </View>
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: '#FF453A' }]}>{counts.overdue}</Text>
          <Text style={styles.summaryLabel}>Vencidas</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: '#FF9F0A' }]}>{counts.soon}</Text>
          <Text style={styles.summaryLabel}>Próximas (7 días)</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: COLORS.primary }]}>{counts.configured}/{gymMembers.length}</Text>
          <Text style={styles.summaryLabel}>Cuotas configuradas</Text>
        </View>
      </View>

      <View style={styles.monthlyTotal}>
        <Ionicons name="wallet-outline" size={18} color={COLORS.primary} />
        <Text style={styles.monthlyTotalLabel}>Cuotas mensuales configuradas</Text>
        <Text style={styles.monthlyTotalValue}>{formatMoney(counts.totalMonthly)}</Text>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color="#8E8E93" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar socio por nombre, código o email"
          placeholderTextColor="#77777C"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filters}>
        {([
          ['todos', 'Todos'],
          ['pendientes', 'Pendientes'],
          ['vencidas', 'Vencidas'],
          ['sin-configurar', 'Sin configurar'],
        ] as const).map(([id, label]) => (
          <TouchableOpacity
            key={id}
            onPress={() => setFilter(id)}
            style={[styles.filterChip, filter === id && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === id && styles.filterTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!!feedback && !editingMember && <Text style={styles.feedbackText}>{feedback}</Text>}

      {visibleMembers.map((item) => {
        const color = stateColor(item.state);
        const isPaying = payingMemberId === item.member.id;
        const canRemind = Boolean(item.member.phone && item.member.paymentDueDate && item.member.monthlyFee
          && item.member.whatsappRemindersEnabled && item.member.whatsappConsentNote);
        return (
          <View key={item.member.id} style={styles.memberCard}>
            <View style={styles.memberTopRow}>
              <View style={styles.memberIdentity}>
                <Text style={styles.memberName} numberOfLines={1}>{item.member.fullName}</Text>
                <Text style={styles.memberMeta}>{item.member.membershipNumber} · {item.member.email || 'Sin correo'}</Text>
                {item.member.whatsappRemindersEnabled && (
                  <Text style={styles.reminderEnabledText}>
                    {!item.member.whatsappConsentNote ? 'Falta documentar autorización de WhatsApp'
                      : whatsappConfigured ? 'Aviso WhatsApp configurado' : 'Aviso guardado · falta conectar WhatsApp'}
                  </Text>
                )}
              </View>
            <View style={[styles.statusBadge, { borderColor: `${color}66`, backgroundColor: `${color}1A` }]}>
              <View style={[styles.statusDot, { backgroundColor: color }]} />
              <Text style={[styles.statusText, { color }]}>{paymentStateLabel(item)}</Text>
            </View>
          </View>

          {isMembershipPaymentBlocked(item.member) && (
            <View style={styles.blockedNotice}>
              <Ionicons name="lock-closed" size={13} color="#FF453A" />
              <Text style={styles.blockedNoticeText}>Acceso bloqueado por impago tras 5 días de cortesía</Text>
            </View>
          )}

          <View style={styles.paymentInfoRow}>
              <View style={styles.paymentInfoBlock}>
                <Text style={styles.infoLabel}>CUOTA MENSUAL</Text>
                <Text style={styles.infoValue}>{formatMoney(item.member.monthlyFee)}</Text>
              </View>
              <View style={styles.paymentInfoBlock}>
                <Text style={styles.infoLabel}>PRÓXIMO VENCIMIENTO</Text>
                <Text style={styles.infoValue}>{formatDate(item.member.paymentDueDate)}</Text>
              </View>
              <View style={styles.paymentInfoBlock}>
                <Text style={styles.infoLabel}>ÚLTIMO PAGO</Text>
                <Text style={styles.infoValue}>{formatDateTime(item.member.lastPaymentAt)}</Text>
              </View>
            </View>

            <View style={styles.memberActions}>
              <TouchableOpacity style={styles.configureButton} onPress={() => openEditor(item.member)}>
                <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                <Text style={styles.configureButtonText}>{item.state === 'sin-configurar' ? 'Configurar cuota' : 'Editar cuota'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reminderButton, !canRemind && styles.disabledButton]}
                disabled={!canRemind}
                onPress={() => void openReminder(item)}
              >
                <Ionicons name="logo-whatsapp" size={15} color={canRemind ? '#FFFFFF' : '#77777C'} />
                <Text style={[styles.reminderButtonText, !canRemind && styles.disabledButtonText]}>Recordar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.paidButton, (!item.member.monthlyFee || !item.member.paymentDueDate || Boolean(payingMemberId)) && styles.disabledButton]}
                disabled={!item.member.monthlyFee || !item.member.paymentDueDate || Boolean(payingMemberId)}
                onPress={() => void recordPayment(item.member)}
              >
                {isPaying ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />}
                <Text style={styles.paidButtonText}>{isPaying ? 'Guardando' : 'Marcar pagada'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.historyButton} onPress={() => void togglePaymentHistory(item.member.id)}>
                <Ionicons name="time-outline" size={15} color="#C7C7CC" />
                <Text style={styles.historyButtonText}>{historyOpenFor === item.member.id ? 'Ocultar historial' : 'Historial'}</Text>
              </TouchableOpacity>
            </View>

            {historyOpenFor === item.member.id && (
              <View style={styles.historyPanel}>
                <Text style={styles.historyTitle}>Últimos pagos</Text>
                {historyLoadingFor === item.member.id ? (
                  <ActivityIndicator size="small" color={COLORS.primary} style={{ alignSelf: 'flex-start', marginTop: 8 }} />
                ) : paymentHistory[item.member.id]?.length ? paymentHistory[item.member.id].map((payment, index) => (
                  <View key={`${payment.paidAt}-${index}`} style={styles.historyRow}>
                    <Text style={styles.historyDate}>{formatDate(payment.coveredDueDate)}</Text>
                    <Text style={styles.historyDate}>{formatDateTime(payment.paidAt)}</Text>
                    <Text style={styles.historyAmount}>{formatMoney(payment.amount)}</Text>
                  </View>
                )) : (
                  <Text style={styles.historyEmpty}>Todavía no hay pagos registrados.</Text>
                )}
              </View>
            )}
          </View>
        );
      })}

      {visibleMembers.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={28} color="#77777C" />
          <Text style={styles.emptyStateText}>No hay socios que coincidan con este filtro.</Text>
        </View>
      )}

      <Modal visible={Boolean(editingMember)} transparent animationType="slide" onRequestClose={() => setEditingMember(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Configurar cuota</Text>
                  <Text style={styles.modalSubtitle}>{editingMember?.fullName}</Text>
                </View>
                <TouchableOpacity onPress={() => setEditingMember(null)} style={styles.closeButton} accessibilityLabel="Cerrar">
                  <Ionicons name="close" size={21} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>CUOTA MENSUAL (€)</Text>
              <TextInput
                style={styles.input}
                value={monthlyFee}
                onChangeText={setMonthlyFee}
                placeholder="Ej. 35,00"
                placeholderTextColor="#77777C"
                keyboardType="decimal-pad"
              />

              <Text style={styles.inputLabel}>PRÓXIMO VENCIMIENTO</Text>
              <TextInput
                style={styles.input}
                value={paymentDueDate}
                onChangeText={setPaymentDueDate}
                placeholder="DD/MM/AAAA"
                placeholderTextColor="#77777C"
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
              <Text style={styles.helperText}>Al registrar un pago, el vencimiento avanzará un mes.</Text>

              <View style={styles.reminderToggleRow}>
                <View style={styles.reminderToggleCopy}>
                  <Text style={styles.reminderToggleTitle}>Aviso automático por WhatsApp</Text>
                  <Text style={styles.helperText}>Se programará dos días antes. Requiere teléfono, consentimiento del socio y conexión con WhatsApp Business.</Text>
                </View>
                <Switch
                  value={whatsappRemindersEnabled}
                  onValueChange={setWhatsappRemindersEnabled}
                  disabled={!editingMember?.phone && !whatsappRemindersEnabled}
                  trackColor={{ false: '#48484A', true: COLORS.primaryTint(0.55) }}
                  thumbColor={whatsappRemindersEnabled ? COLORS.primary : '#E5E5EA'}
                />
              </View>
              {!editingMember?.phone && <Text style={styles.modalFeedback}>Añade un teléfono en los datos del socio para activar el aviso.</Text>}
              {whatsappRemindersEnabled && (
                <>
                  <Text style={styles.inputLabel}>CONSTANCIA DE AUTORIZACIÓN DE WHATSAPP</Text>
                  <TextInput
                    style={styles.input}
                    value={whatsappConsentNote}
                    onChangeText={setWhatsappConsentNote}
                    placeholder="Ej. Formulario firmado el 24/09/2026"
                    placeholderTextColor="#77777C"
                    maxLength={200}
                  />
                  <Text style={styles.helperText}>Anota dónde consta la autorización del socio. No incluyas datos bancarios ni de salud.</Text>
                </>
              )}

              {!!feedback && <Text style={styles.modalFeedback}>{feedback}</Text>}
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setEditingMember(null)} disabled={saving}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={() => void saveMembership()} disabled={saving}>
                  {saving && <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 7 }} />}
                  <Text style={styles.saveButtonText}>{saving ? 'Guardando…' : 'Guardar'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionHeading: { color: '#8E8E93', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 7 },
  introText: { color: '#A1A1A6', fontSize: 13, lineHeight: 19, marginBottom: 14 },
  whatsappBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, marginBottom: 14, borderRadius: 12, borderWidth: 1 },
  whatsappReady: { backgroundColor: COLORS.successTint(0.08), borderColor: COLORS.successTint(0.28) },
  whatsappPending: { backgroundColor: 'rgba(255, 159, 10, 0.08)', borderColor: 'rgba(255, 159, 10, 0.28)' },
  whatsappBannerText: { flex: 1 },
  whatsappBannerTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  whatsappBannerBody: { color: '#A1A1A6', fontSize: 11, lineHeight: 15, marginTop: 3 },
  summaryGrid: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  summaryCard: { flex: 1, minWidth: 0, minHeight: 72, alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 12, backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#2A2A2E' },
  summaryValue: { fontSize: 19, fontWeight: '800' },
  summaryLabel: { color: '#A1A1A6', fontSize: 10, textAlign: 'center', marginTop: 3 },
  monthlyTotal: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginBottom: 12, borderRadius: 12, backgroundColor: COLORS.primaryTint(0.08), borderWidth: 1, borderColor: COLORS.primaryTint(0.24) },
  monthlyTotalLabel: { flex: 1, color: '#C7C7CC', fontSize: 12 },
  monthlyTotalValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  searchBar: { flexDirection: 'row', alignItems: 'center', height: 44, paddingHorizontal: 12, marginBottom: 10, borderRadius: 12, backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#2A2A2E' },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 13, padding: 0 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 },
  filterChip: { paddingVertical: 7, paddingHorizontal: 11, borderRadius: 18, backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#333337' },
  filterChipActive: { backgroundColor: COLORS.primaryTint(0.16), borderColor: COLORS.primary },
  filterText: { color: '#A1A1A6', fontSize: 11, fontWeight: '700' },
  filterTextActive: { color: '#FFFFFF' },
  feedbackText: { color: COLORS.primary, fontSize: 12, marginBottom: 10 },
  memberCard: { padding: 13, marginBottom: 9, borderRadius: 14, backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#2E2E32' },
  memberTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 13 },
  memberIdentity: { flex: 1, minWidth: 0 },
  memberName: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  memberMeta: { color: '#8E8E93', fontSize: 10, marginTop: 3 },
  reminderEnabledText: { color: COLORS.success, fontSize: 9, fontWeight: '700', marginTop: 3 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '54%', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { flexShrink: 1, fontSize: 10, fontWeight: '700' },
  blockedNotice: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 9, marginTop: -5, marginBottom: 7, borderRadius: 8, backgroundColor: 'rgba(255, 69, 58, 0.1)' },
  blockedNoticeText: { color: '#FF6961', fontSize: 10, fontWeight: '700' },
  paymentInfoRow: { flexDirection: 'row', gap: 8, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#303034' },
  paymentInfoBlock: { flex: 1, minWidth: 0 },
  infoLabel: { color: '#77777C', fontSize: 8, fontWeight: '800', letterSpacing: 0.3, marginBottom: 4 },
  infoValue: { color: '#F2F2F7', fontSize: 11, fontWeight: '700' },
  memberActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  configureButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 34, paddingHorizontal: 10, borderRadius: 9, backgroundColor: COLORS.primaryTint(0.1), borderWidth: 1, borderColor: COLORS.primaryTint(0.3) },
  configureButtonText: { color: COLORS.primary, fontSize: 11, fontWeight: '700' },
  reminderButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 34, paddingHorizontal: 10, borderRadius: 9, backgroundColor: '#187A43' },
  reminderButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  paidButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 34, paddingHorizontal: 10, borderRadius: 9, backgroundColor: COLORS.primary },
  paidButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  historyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 34, paddingHorizontal: 10, borderRadius: 9, backgroundColor: '#303034' },
  historyButtonText: { color: '#D1D1D6', fontSize: 11, fontWeight: '700' },
  disabledButton: { backgroundColor: '#303034', opacity: 0.72 },
  disabledButtonText: { color: '#77777C' },
  historyPanel: { padding: 10, marginTop: 10, borderRadius: 10, backgroundColor: '#111113', borderWidth: 1, borderColor: '#303034' },
  historyTitle: { color: '#F2F2F7', fontSize: 12, fontWeight: '800', marginBottom: 3 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderTopWidth: 1, borderColor: '#303034' },
  historyDate: { flex: 1, color: '#A1A1A6', fontSize: 10 },
  historyAmount: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  historyEmpty: { color: '#8E8E93', fontSize: 11, marginTop: 5 },
  emptyState: { alignItems: 'center', padding: 28, gap: 8, borderRadius: 14, backgroundColor: '#1C1C1E' },
  emptyStateText: { color: '#A1A1A6', fontSize: 13, textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 18, backgroundColor: 'rgba(0,0,0,0.72)' },
  modalCard: { width: '100%', maxWidth: 440, maxHeight: '90%', padding: 19, borderRadius: 18, backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#3A3A3E' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  modalSubtitle: { color: '#A1A1A6', fontSize: 13, marginTop: 3 },
  closeButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#303034' },
  inputLabel: { color: '#A1A1A6', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 7, marginTop: 8 },
  input: { height: 46, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#111113', borderWidth: 1, borderColor: '#3A3A3E', color: '#FFFFFF', fontSize: 15 },
  helperText: { color: '#8E8E93', fontSize: 11, lineHeight: 16, marginTop: 8 },
  reminderToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, marginTop: 16, borderRadius: 10, backgroundColor: '#111113', borderWidth: 1, borderColor: '#303034' },
  reminderToggleCopy: { flex: 1 },
  reminderToggleTitle: { color: '#F2F2F7', fontSize: 12, fontWeight: '800' },
  modalFeedback: { color: '#FF9F0A', fontSize: 12, marginTop: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, marginTop: 20, marginBottom: 2 },
  cancelButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 15, borderRadius: 10, backgroundColor: '#303034' },
  cancelButtonText: { color: '#E5E5EA', fontWeight: '700' },
  saveButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 17, borderRadius: 10, backgroundColor: COLORS.primary },
  saveButtonText: { color: '#FFFFFF', fontWeight: '800' },
});
