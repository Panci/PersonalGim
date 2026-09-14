import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { useWorkoutStore } from '../../store/workoutStore';

let webAudioContext: AudioContext | null = null;

const getWebAudioContext = (): AudioContext | null => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    webAudioContext = webAudioContext || new AudioContextClass();
    return webAudioContext;
  } catch {
    return null;
  }
};

// Mobile browsers only allow audio after a user gesture. Call this from the
// first workout interaction so the later timer callbacks can play normally.
export const primeRestTimerAudio = (): void => {
  const ctx = getWebAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.01);
    if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
  } catch {}
};

const playBeep = (freq = 880, duration = 0.12, delay = 0) => {
  const ctx = getWebAudioContext();
  if (!ctx) return;

  try {
    const scheduleTone = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const startAt = ctx.currentTime + delay;
      osc.frequency.setValueAtTime(freq, startAt);
      gain.gain.setValueAtTime(0.2, startAt);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + duration);
    };

    if (ctx.state === 'suspended') {
      void ctx.resume().then(scheduleTone).catch(() => undefined);
    } else {
      scheduleTone();
    }
  } catch {}
};

const playFinishAlert = () => {
  // A three-tone signal is easier to hear on a phone than one long beep.
  playBeep(880, 0.18, 0);
  playBeep(1_100, 0.18, 0.24);
  playBeep(880, 0.4, 0.48);

  // Add haptic feedback where the browser or native runtime exposes it.
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try { window.navigator.vibrate?.([180, 80, 260]); } catch {}
  } else {
    try { Vibration.vibrate([0, 180, 80, 260]); } catch {}
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
  const previousSecondsRef = useRef(restSecondsLeft);
  const skippedTimerRef = useRef(false);
  const lastBeepedSecondRef = useRef<number | null>(null);

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

  // Sound every second in the final five seconds, followed by one long tone
  // only when the countdown naturally reaches zero.
  useEffect(() => {
    const previousSeconds = previousSecondsRef.current;
    previousSecondsRef.current = restSecondsLeft;

    // Starting/restarting a timer creates a new countdown cycle. This also
    // prevents a pause/resume from replaying the same second repeatedly.
    if (previousSeconds === 0 && restSecondsLeft > 0) {
      lastBeepedSecondRef.current = null;
    }

    if (restSecondsLeft > 5) {
      lastBeepedSecondRef.current = null;
    }

    if (
      isRestTimerRunning &&
      restSecondsLeft > 0 &&
      restSecondsLeft <= 5 &&
      lastBeepedSecondRef.current !== restSecondsLeft
    ) {
      lastBeepedSecondRef.current = restSecondsLeft;
      playBeep(restSecondsLeft === 1 ? 760 : 560, 0.12);
    }

    if (previousSeconds === 1 && restSecondsLeft === 0 && !skippedTimerRef.current) {
      playFinishAlert();
      setFinishedBanner(true);
      const timer = setTimeout(() => {
        setFinishedBanner(false);
      }, 3200);
      return () => clearTimeout(timer);
    }

    if (restSecondsLeft > 0) skippedTimerRef.current = false;
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
            size={30}
            color={isUrgent ? '#FF453A' : COLORS.primary}
          />
          <View>
            <Text style={styles.timerLabel}>DESCANSO</Text>
            <Text style={[styles.timerText, isUrgent && styles.timerTextUrgent]}>
              {formattedTime}
            </Text>
          </View>
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
            onPress={() => {
              skippedTimerRef.current = true;
              stopRestTimer();
            }}
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
    height: 5,
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
    paddingVertical: 14,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    marginLeft: 8,
    letterSpacing: 1,
  },
  timerLabel: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginLeft: 8,
    marginBottom: -3,
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
    paddingVertical: 9,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#323238',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  skipBtn: {
    backgroundColor: '#25252A',
  },
});
