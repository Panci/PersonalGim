import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { COLORS } from '../../theme/colors';
import { useWorkoutStore } from '../../store/workoutStore';

export const DigitalPassModal: React.FC = () => {
  const {
    showQrPassModal,
    setShowQrPassModal,
    activeMember,
    gymMembers,
    registerAttendance,
  } = useWorkoutStore();

  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'blocked'>('idle');
  // Default to first member if none selected
  const member = activeMember || gymMembers[0] || {
    id: 'mem-demo',
    fullName: 'Socio PersonalGim',
    email: 'socio@personalgim.com',
    membershipNumber: 'SOC-001',
    enrollmentDate: new Date().toISOString(),
    status: 'activo',
    objective: 'hipertrofia',
    level: 'intermedio',
    completedWorkoutsCount: 24,
    currentWeightKg: 78.5,
  };

  // This is a standards-compliant QR payload. A production turnstile must resolve
  // it against a server and verify a short-lived signed token before granting entry.
  const qrPayload = `personalgim://access/v1?member=${encodeURIComponent(member.id)}&card=${encodeURIComponent(member.membershipNumber)}`;

  const handleSimulateCheckIn = () => {
    if (member.status !== 'activo') {
      setScanStatus('blocked');
      setTimeout(() => setScanStatus('idle'), 2800);
      return;
    }
    registerAttendance(member.id, 'entrada');
    setScanStatus('success');
    setTimeout(() => {
      setScanStatus('idle');
    }, 2800);
  };

  return (
    <Modal
      visible={showQrPassModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowQrPassModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="card" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={styles.headerTitle}>Carnet Digital VIP</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowQrPassModal(false)}
            >
              <Ionicons name="close" size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* VIP Card Container */}
            <View style={styles.cardWrapper}>
              {/* Card Gradient / Glow Header */}
              <View style={styles.cardHeader}>
                <View style={styles.clubLogoRow}>
                  <View style={styles.clubIconBg}>
                    <MaterialCommunityIcons name="dumbbell" size={16} color="#000000" />
                  </View>
                  <View>
                    <Text style={styles.clubBrandName}>PERSONALGIM</Text>
                    <Text style={styles.clubSub}>PASS ACCESO CLUB VIP</Text>
                  </View>
                </View>

                {/* NFC Wireless Icon */}
                <View style={styles.nfcContainer}>
                  <Ionicons name="wifi" size={18} color="rgba(255,255,255,0.7)" style={{ transform: [{ rotate: '90deg' }] }} />
                </View>
              </View>

              {/* Member Profile Row */}
              <View style={styles.memberRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {member.fullName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberMeta}>
                  <Text style={styles.memberName}>{member.fullName}</Text>
                  <Text style={styles.memberEmail}>{member.email}</Text>
                  <View style={styles.codeRow}>
                    <Text style={styles.memberNumberLabel}>SOCIO Nº:</Text>
                    <Text style={styles.memberNumberVal}>{member.membershipNumber}</Text>
                  </View>
                </View>
                <View style={styles.statusBadge}>
                  <View style={[styles.statusDot, { backgroundColor: member.status === 'activo' ? '#34C759' : '#FF453A' }]} />
                  <Text style={[styles.statusText, { color: member.status === 'activo' ? '#34C759' : '#FF453A' }]}>
                    {member.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* High Contrast QR Code Container */}
              <View style={styles.qrContainer}>
                <View style={styles.qrWhiteBox}>
                  <QRCode
                    value={qrPayload}
                    size={176}
                    color="#000000"
                    backgroundColor="#FFFFFF"
                    quietZone={10}
                    ecl="M"
                  />
                </View>
                <Text style={styles.qrInstructions}>
                  Código QR estándar: muestra este pase en el torno o mostrador del club
                </Text>
              </View>

              {/* Barcode & Security Strip */}
              <View style={styles.barcodeStrip}>
                <View style={styles.barcodeLinesRow}>
                  {[3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2].map((w, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.barcodeBar,
                        { width: w * 2, backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#636366' },
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.barcodeText}>* {member.membershipNumber} *</Text>
              </View>
            </View>

            <Text style={styles.securityNote}>
              Demo local: este pase identifica al socio, pero no autoriza un acceso real sin un lector y validación en servidor.
            </Text>

            {/* Simulated action kept clearly labeled until a real reader is integrated. */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                scanStatus === 'success' && styles.actionBtnSuccess,
                scanStatus === 'blocked' && styles.actionBtnBlocked,
              ]}
              onPress={handleSimulateCheckIn}
              activeOpacity={0.8}
            >
              <Ionicons
                name={scanStatus === 'success' ? 'checkmark-circle' : scanStatus === 'blocked' ? 'close-circle' : 'scan-outline'}
                size={20}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.actionBtnText}>
                {scanStatus === 'success'
                  ? '¡Acceso Autorizado! (Torno Abierto)'
                  : scanStatus === 'blocked'
                    ? 'Acceso denegado: membresía no activa'
                  : 'Simular lectura en torno (demo)'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#161618',
    borderRadius: 24,
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#2C2C30',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#252528',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#222226',
  },
  scrollContent: {
    padding: 20,
  },
  cardWrapper: {
    backgroundColor: '#1E1E22',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#35353C',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 12,
  },
  clubLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clubIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubBrandName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  clubSub: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  nfcContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#28282E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#383840',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2A2A30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  memberMeta: {
    flex: 1,
  },
  memberName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  memberEmail: {
    color: '#8E8E93',
    fontSize: 11,
    marginBottom: 4,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberNumberLabel: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '700',
  },
  memberNumberVal: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#121214',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#26262A',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  qrWhiteBox: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 14,
  },
  qrInstructions: {
    color: '#8E8E93',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '500',
  },
  securityNote: {
    color: '#8E8E93',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 14,
  },
  barcodeStrip: {
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  barcodeLinesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
    marginBottom: 4,
  },
  barcodeBar: {
    height: '100%',
    borderRadius: 1,
  },
  barcodeText: {
    color: '#636366',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 16,
  },
  actionBtnSuccess: {
    backgroundColor: '#34C759',
  },
  actionBtnBlocked: {
    backgroundColor: '#FF453A',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
