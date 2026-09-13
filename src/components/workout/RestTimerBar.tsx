import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useWorkoutStore } from '../../store/workoutStore';

const playBeep = (freq = 880, duration = 0.12) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      }
    } catch {}
  }
};

export const RestTimerBar: React.FC = () => {
  const {
    restSecondsLeft,
    totalRestSeconds,
    isRestTimerRunning,
    pauseRestTimer,
    resumeRestTimer,
    adjustRestTimer,
    stopRestTimer,
    tickRestTimer,
  } = useWorkoutStore();

  const [finishedBanner, setFinishedBanner] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRestTimerRunning && restSecondsLeft > 0) {
      interval = setInterval(() => {
        tickRestTimer();
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRestTimerRunning, restSecondsLeft, tickRestTimer]);

  // Audio cue when countdown approaches 0
  useEffect(() => {
    if (isRestTimerRunning) {
      if (restSecondsLeft === 3 || restSecondsLeft === 2 || restSecondsLeft === 1) {
        playBeep(520, 0.08);
      } else if (restSecondsLeft === 0 && totalRestSeconds > 0) {
        playBeep(880, 0.4);
        setFinishedBanner(true);
        const timer = setTimeout(() => {
          setFinishedBanner(false);
        }, 3200);
        return () => clearTimeout(timer);
      }
    }
  }, [restSecondsLeft, isRestTimerRunning, totalRestSeconds]);

  if (finishedBanner) {
    return (
      <View style={[styles.floatingContainer, styles.finishedContainer]}>
        <View style={styles.finishedContent}>
          <Ionicons name="flame" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.finishedText}>¡DESCANSO TERMINADO! A POR LA SERIE 💪</Text>
        </View>
        <TouchableOpacity
          style={styles.closeBannerBtn}
          onPress={() => setFinishedBanner(false)}
        >
          <Ionicons name="close" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  }

  if (restSecondsLeft <= 0 && !isRestTimerRunning) {
    return null;
  }

  const minutes = Math.floor(restSecondsLeft / 60);
  const seconds = restSecondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const progressPct = totalRestSeconds > 0 ? (restSecondsLeft / totalRestSeconds) * 100 : 0;
  const isUrgent = restSecondsLeft <= 5 && restSecondsLeft > 0;

  return (
    <View style={[styles.floatingContainer, isUrgent && styles.urgentContainer]}>
      {/* Progress line */}
      <View style={styles.progressBarBackground}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${progressPct}%`,
              backgroundColor: isUrgent ? '#FF453A' : COLORS.primary,
            },
          ]}
        />
      </View>

      <View style={styles.contentRow}>
        <View style={styles.timerBadge}>
          <Ionicons
            name="timer-outline"
            size={20}
            color={isUrgent ? '#FF453A' : COLORS.primary}
          />
          <Text style={[styles.timerText, isUrgent && styles.timerTextUrgent]}>
            {formattedTime}
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.adjustPill}
            onPress={() => adjustRestTimer(30)}
            activeOpacity={0.7}
          >
            <Text style={styles.adjustPillText}>+30s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={isRestTimerRunning ? pauseRestTimer : resumeRestTimer}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isRestTimerRunning ? 'pause' : 'play'}
              size={18}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, styles.skipBtn]}
            onPress={stopRestTimer}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color="#A1A1A6" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 36,
    left: 16,
    right: 16,
    backgroundColor: '#1E1E22',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#383840',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 99,
  },
  urgentContainer: {
    borderColor: '#FF453A',
    shadowColor: '#FF453A',
  },
  finishedContainer: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  finishedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  finishedText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeBannerBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  progressBarBackground: {
    height: 3,
    backgroundColor: '#2C2C32',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  timerTextUrgent: {
    color: '#FF453A',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adjustPill: {
    backgroundColor: '#2A2A30',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#3A3A42',
  },
  adjustPillText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  controlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#323238',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  skipBtn: {
    backgroundColor: '#25252A',
  },
});
