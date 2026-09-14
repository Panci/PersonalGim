import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Exercise } from '../../types';
import { COLORS } from '../../theme/colors';

const movementLabels: Record<NonNullable<Exercise['movementPattern']>, string> = {
  empuje: 'Empuja y regresa con control',
  traccion: 'Tira hacia el cuerpo y vuelve despacio',
  bisagra: 'Lleva la cadera atrás y extiende',
  sentadilla: 'Baja estable y empuja el suelo',
  aislamiento: 'Aísla el músculo durante todo el recorrido',
  estabilidad: 'Mantén el tronco firme y respira',
};

const movementSpecs: Record<NonNullable<Exercise['movementPattern']>, {
  x: [number, number];
  y: [number, number];
  scale: [number, number];
  rotate: [string, string];
}> = {
  empuje: { x: [0, 0], y: [8, -8], scale: [0.96, 1.04], rotate: ['-1deg', '1deg'] },
  traccion: { x: [0, 0], y: [-8, 8], scale: [1.04, 0.96], rotate: ['1deg', '-1deg'] },
  bisagra: { x: [-5, 5], y: [4, -4], scale: [1, 1], rotate: ['-3deg', '3deg'] },
  sentadilla: { x: [0, 0], y: [6, -2], scale: [1.02, 0.9], rotate: ['0deg', '0deg'] },
  aislamiento: { x: [-8, 8], y: [0, 0], scale: [0.98, 1.02], rotate: ['-2deg', '2deg'] },
  estabilidad: { x: [-3, 3], y: [1, -1], scale: [1, 1.02], rotate: ['-1deg', '1deg'] },
};

export const ExerciseMotionPreview: React.FC<{ exercise: Exercise }> = ({ exercise }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(progress, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [progress]);

  const pattern = exercise.movementPattern || 'aislamiento';
  const spec = movementSpecs[pattern];
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: spec.x });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: spec.y });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: spec.scale });
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: spec.rotate });
  const ghostOpacity = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 0.08, 0.35] });
  const trackX = progress.interpolate({ inputRange: [0, 1], outputRange: [-16, 16] });

  return (
    <View style={styles.container} accessibilityLabel="Vista previa del movimiento">
      <Animated.Image
        source={require('../../../assets/exercise-library/original-motion-cover.png')}
        style={[styles.image, { transform: [{ translateX }, { translateY }, { scale }, { rotate }] }]}
        resizeMode="cover"
      />
      <Animated.View style={[styles.motionGhost, { opacity: ghostOpacity, transform: [{ translateX: trackX }] }]} />
      <View style={styles.overlay}>
        <View style={styles.movementBadge}>
          <Ionicons name="pulse-outline" size={14} color={COLORS.primary} />
          <Text style={styles.movementLabel}>ANIMACIÓN ACTIVA</Text>
        </View>
        <Animated.View style={[styles.motionArrow, { transform: [{ translateX: trackX }, { translateY }] }]}>
          <Ionicons name={pattern === 'traccion' ? 'arrow-down' : 'arrow-up'} size={24} color={COLORS.primary} />
        </Animated.View>
        <View style={styles.motionTrack}>
          <Animated.View style={[styles.motionTrackDot, { transform: [{ translateX: trackX }] }]} />
        </View>
        <Text style={styles.caption}>{movementLabels[pattern]}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { height: 94, borderRadius: 14, overflow: 'hidden', backgroundColor: '#242426', marginBottom: 14 },
  image: { ...StyleSheet.absoluteFill, width: '100%', height: '100%', opacity: 0.42 },
  motionGhost: { position: 'absolute', width: 38, height: 60, right: 38, top: 20, borderRadius: 18, borderWidth: 2, borderColor: COLORS.primary },
  overlay: { flex: 1, paddingHorizontal: 14, paddingVertical: 10 },
  movementBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  movementLabel: { color: '#D1D1D6', fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
  motionArrow: { position: 'absolute', right: 20, top: 26 },
  motionTrack: { position: 'absolute', right: 20, top: 58, width: 34, height: 2, borderRadius: 1, backgroundColor: '#5A3A24' },
  motionTrackDot: { width: 8, height: 8, marginTop: -3, marginLeft: 13, borderRadius: 4, backgroundColor: COLORS.primary },
  caption: { position: 'absolute', left: 14, right: 56, bottom: 10, color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
