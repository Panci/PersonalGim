import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import Svg, {
  Path,
  G,
  Circle,
  Line,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { MuscleId, BodySide } from '../../types';
import { useWorkoutStore } from '../../store/workoutStore';

const { width } = Dimensions.get('window');
const SVG_WIDTH = Math.min(width - 32, 380);
const SVG_HEIGHT = 490;

interface CalloutItem {
  muscleId: MuscleId;
  label: string;
  side: 'left' | 'right';
  targetX: number;
  targetY: number;
  labelY: number;
}

export const AnatomyModel: React.FC = () => {
  const { bodySide, toggleBodySide, selectMuscle, selectedMuscleFilter } = useWorkoutStore();

  const isFront = bodySide === 'frente';

  // Front Callouts matching IMG_1168.PNG
  const frontCallouts: CalloutItem[] = [
    { muscleId: 'pectoral', label: 'Pectorales', side: 'left', targetX: 165, targetY: 145, labelY: 125 },
    { muscleId: 'biceps', label: 'Bíceps', side: 'left', targetX: 130, targetY: 175, labelY: 175 },
    { muscleId: 'cuadriceps', label: 'Cuádriceps', side: 'left', targetX: 160, targetY: 300, labelY: 285 },
    { muscleId: 'abductores', label: 'Abductores', side: 'left', targetX: 145, targetY: 340, labelY: 345 },
    { muscleId: 'hombros', label: 'Hombros', side: 'right', targetX: 250, targetY: 135, labelY: 125 },
    { muscleId: 'antebrazo', label: 'Antebrazo', side: 'right', targetX: 275, targetY: 220, labelY: 175 },
    { muscleId: 'abdomen', label: 'Abdomen', side: 'right', targetX: 200, targetY: 200, labelY: 215 },
    { muscleId: 'oblicuos', label: 'Oblicuos', side: 'right', targetX: 225, targetY: 225, labelY: 255 },
    { muscleId: 'adductores', label: 'Adductores', side: 'right', targetX: 205, targetY: 310, labelY: 315 },
  ];

  // Back Callouts matching IMG_1169.PNG
  const backCallouts: CalloutItem[] = [
    { muscleId: 'trapecio', label: 'Trapecio', side: 'left', targetX: 175, targetY: 120, labelY: 110 },
    { muscleId: 'triceps', label: 'Tríceps', side: 'left', targetX: 130, targetY: 165, labelY: 165 },
    { muscleId: 'lumbares', label: 'Lumbares', side: 'left', targetX: 180, targetY: 220, labelY: 220 },
    { muscleId: 'pantorrillas', label: 'Pantorrillas', side: 'left', targetX: 165, targetY: 410, labelY: 400 },
    { muscleId: 'dorsales', label: 'Dorsales', side: 'right', targetX: 235, targetY: 175, labelY: 155 },
    { muscleId: 'gluteos', label: 'Glúteos', side: 'right', targetX: 225, targetY: 275, labelY: 265 },
    { muscleId: 'isquiotibiales', label: 'Isquiotibiales', side: 'right', targetX: 230, targetY: 340, labelY: 335 },
  ];

  const currentCallouts = isFront ? frontCallouts : backCallouts;

  const handleMuscleClick = (mId: MuscleId) => {
    selectMuscle(mId);
  };

  return (
    <View style={styles.container}>
      {/* Title & View Indicator */}
      <View style={styles.header}>
        <Text style={styles.title}>Cuerpo</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {isFront ? 'Vista Frontal' : 'Vista Posterior'}
          </Text>
        </View>
      </View>

      {/* SVG Canvas with Anatomy Silhouette and Leader Lines */}
      <View style={styles.canvasContainer}>
        <Svg width={SVG_WIDTH} height={SVG_HEIGHT} viewBox="0 0 380 490">
          <Defs>
            <LinearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#303035" />
              <Stop offset="100%" stopColor="#1E1E22" />
            </LinearGradient>
            <LinearGradient id="highlightGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#FF7A1A" />
              <Stop offset="100%" stopColor="#FF4500" />
            </LinearGradient>
          </Defs>

          {/* Base Anatomical Silhouette */}
          <G id="baseBody">
            {/* Head & Neck */}
            <Circle cx="190" cy="55" r="24" fill="url(#bodyGrad)" stroke="#44444C" strokeWidth="1.5" />
            <Path d="M 180 77 L 180 95 L 200 95 L 200 77 Z" fill="url(#bodyGrad)" />

            {/* Torso & Shoulder structure */}
            <Path
              d="M 140 110 C 145 95, 175 92, 190 92 C 205 92, 235 95, 240 110 L 255 125 L 245 230 L 225 260 L 155 260 L 135 230 L 125 125 Z"
              fill="url(#bodyGrad)"
              stroke="#3A3A40"
              strokeWidth="1.5"
            />

            {/* Left Arm */}
            <Path
              d="M 125 125 C 115 145, 115 180, 110 215 C 105 240, 100 270, 95 285 L 105 287 C 115 270, 125 235, 130 205 L 135 150 Z"
              fill="url(#bodyGrad)"
              stroke="#3A3A40"
              strokeWidth="1.2"
            />

            {/* Right Arm */}
            <Path
              d="M 255 125 C 265 145, 265 180, 270 215 C 275 240, 280 270, 285 285 L 275 287 C 265 270, 255 235, 250 205 L 245 150 Z"
              fill="url(#bodyGrad)"
              stroke="#3A3A40"
              strokeWidth="1.2"
            />

            {/* Pelvis & Legs */}
            {/* Left Leg */}
            <Path
              d="M 155 260 C 150 280, 145 320, 145 350 C 145 375, 150 420, 150 460 L 165 460 C 170 420, 175 375, 175 340 C 180 300, 185 275, 185 260 Z"
              fill="url(#bodyGrad)"
              stroke="#3A3A40"
              strokeWidth="1.5"
            />
            {/* Right Leg */}
            <Path
              d="M 225 260 C 230 280, 235 320, 235 350 C 235 375, 230 420, 230 460 L 215 460 C 210 420, 205 375, 205 340 C 200 300, 195 275, 195 260 Z"
              fill="url(#bodyGrad)"
              stroke="#3A3A40"
              strokeWidth="1.5"
            />
          </G>

          {/* Front Specific Muscle Regions */}
          {isFront && (
            <G id="frontMuscles">
              {/* Pectorals */}
              <Path
                d="M 148 120 C 160 115, 185 115, 188 128 L 188 160 C 175 165, 145 158, 142 140 Z"
                fill={selectedMuscleFilter === 'pectoral' ? 'url(#highlightGrad)' : '#4A4A52'}
                stroke={COLORS.primary}
                strokeWidth={selectedMuscleFilter === 'pectoral' ? '2' : '0.5'}
              />
              <Path
                d="M 232 120 C 220 115, 195 115, 192 128 L 192 160 C 205 165, 235 158, 238 140 Z"
                fill={selectedMuscleFilter === 'pectoral' ? 'url(#highlightGrad)' : '#4A4A52'}
                stroke={COLORS.primary}
                strokeWidth={selectedMuscleFilter === 'pectoral' ? '2' : '0.5'}
              />

              {/* Biceps */}
              <Path
                d="M 120 160 C 115 170, 115 190, 122 195 C 130 195, 133 175, 130 160 Z"
                fill={selectedMuscleFilter === 'biceps' ? 'url(#highlightGrad)' : '#46464E'}
                stroke={COLORS.primary}
                strokeWidth={selectedMuscleFilter === 'biceps' ? '2' : '0.5'}
              />
              <Path
                d="M 260 160 C 265 170, 265 190, 258 195 C 250 195, 247 175, 250 160 Z"
                fill={selectedMuscleFilter === 'biceps' ? 'url(#highlightGrad)' : '#46464E'}
                stroke={COLORS.primary}
                strokeWidth={selectedMuscleFilter === 'biceps' ? '2' : '0.5'}
              />

              {/* Abdomen */}
              <Path
                d="M 175 168 L 205 168 L 203 245 L 177 245 Z"
                fill={selectedMuscleFilter === 'abdomen' ? 'url(#highlightGrad)' : '#3E3E46'}
                stroke="#FF6A00"
                strokeWidth={selectedMuscleFilter === 'abdomen' ? '2' : '0.5'}
              />

              {/* Quadriceps */}
              <Path
                d="M 152 275 C 148 300, 150 340, 160 360 C 172 360, 178 320, 180 275 Z"
                fill={selectedMuscleFilter === 'cuadriceps' ? 'url(#highlightGrad)' : '#46464E'}
                stroke={COLORS.primary}
                strokeWidth={selectedMuscleFilter === 'cuadriceps' ? '2' : '0.5'}
              />
              <Path
                d="M 228 275 C 232 300, 230 340, 220 360 C 208 360, 202 320, 200 275 Z"
                fill={selectedMuscleFilter === 'cuadriceps' ? 'url(#highlightGrad)' : '#46464E'}
                stroke={COLORS.primary}
                strokeWidth={selectedMuscleFilter === 'cuadriceps' ? '2' : '0.5'}
              />
            </G>
          )}

          {/* Back Specific Muscle Regions */}
          {!isFront && (
            <G id="backMuscles">
              {/* Trapezius */}
              <Path
                d="M 160 98 L 190 120 L 220 98 L 205 85 L 175 85 Z"
                fill={selectedMuscleFilter === 'trapecio' ? 'url(#highlightGrad)' : '#4A4A52'}
                stroke={COLORS.primary}
                strokeWidth={selectedMuscleFilter === 'trapecio' ? '2' : '0.5'}
              />

              {/* Latissimus Dorsi */}
              <Path
                d="M 148 140 C 160 170, 170 210, 185 220 L 195 220 C 210 210, 220 170, 232 140 L 242 165 C 235 210, 215 240, 190 245 C 165 240, 145 210, 138 165 Z"
                fill={selectedMuscleFilter === 'dorsales' ? 'url(#highlightGrad)' : '#46464E'}
                stroke={COLORS.primary}
                strokeWidth={selectedMuscleFilter === 'dorsales' ? '2' : '0.5'}
              />

              {/* Triceps */}
              <Path
                d="M 118 135 C 112 155, 114 185, 122 195 L 128 175 Z"
                fill={selectedMuscleFilter === 'triceps' ? 'url(#highlightGrad)' : '#46464E'}
                stroke={COLORS.primary}
                strokeWidth={selectedMuscleFilter === 'triceps' ? '2' : '0.5'}
              />
              <Path
                d="M 262 135 C 268 155, 266 185, 258 195 L 252 175 Z"
                fill={selectedMuscleFilter === 'triceps' ? 'url(#highlightGrad)' : '#46464E'}
                stroke={COLORS.primary}
                strokeWidth={selectedMuscleFilter === 'triceps' ? '2' : '0.5'}
              />

              {/* Glutes */}
              <Path
                d="M 152 255 C 150 280, 160 305, 188 305 L 188 255 Z"
                fill={selectedMuscleFilter === 'gluteos' ? 'url(#highlightGrad)' : '#4A4A52'}
                stroke={COLORS.primary}
                strokeWidth={selectedMuscleFilter === 'gluteos' ? '2' : '0.5'}
              />
              <Path
                d="M 228 255 C 230 280, 220 305, 192 305 L 192 255 Z"
                fill={selectedMuscleFilter === 'gluteos' ? 'url(#highlightGrad)' : '#4A4A52'}
                stroke={COLORS.primary}
                strokeWidth={selectedMuscleFilter === 'gluteos' ? '2' : '0.5'}
              />

              {/* Hamstrings (Isquiotibiales) */}
              <Path
                d="M 155 310 C 150 340, 155 375, 165 385 C 175 375, 180 340, 185 310 Z"
                fill={selectedMuscleFilter === 'isquiotibiales' ? 'url(#highlightGrad)' : '#46464E'}
                stroke={COLORS.primary}
                strokeWidth={selectedMuscleFilter === 'isquiotibiales' ? '2' : '0.5'}
              />
              <Path
                d="M 225 310 C 230 340, 225 375, 215 385 C 205 375, 200 340, 195 310 Z"
                fill={selectedMuscleFilter === 'isquiotibiales' ? 'url(#highlightGrad)' : '#46464E'}
                stroke={COLORS.primary}
                strokeWidth={selectedMuscleFilter === 'isquiotibiales' ? '2' : '0.5'}
              />

              {/* Calves (Pantorrillas) */}
              <Path
                d="M 152 395 C 148 415, 155 440, 165 445 C 172 440, 175 415, 172 395 Z"
                fill={selectedMuscleFilter === 'pantorrillas' ? 'url(#highlightGrad)' : '#46464E'}
                stroke={COLORS.primary}
                strokeWidth={selectedMuscleFilter === 'pantorrillas' ? '2' : '0.5'}
              />
              <Path
                d="M 228 395 C 232 415, 225 440, 215 445 C 208 440, 205 415, 208 395 Z"
                fill={selectedMuscleFilter === 'pantorrillas' ? 'url(#highlightGrad)' : '#46464E'}
                stroke={COLORS.primary}
                strokeWidth={selectedMuscleFilter === 'pantorrillas' ? '2' : '0.5'}
              />
            </G>
          )}

          {/* Callout Leader Lines */}
          {currentCallouts.map((item) => {
            const isLeft = item.side === 'left';
            const labelX = isLeft ? 65 : 315;
            const isSelected = selectedMuscleFilter === item.muscleId;

            return (
              <G key={item.muscleId}>
                <Line
                  x1={labelX}
                  y1={item.labelY}
                  x2={item.targetX}
                  y2={item.targetY}
                  stroke={isSelected ? COLORS.primary : '#5A5A62'}
                  strokeWidth={isSelected ? '1.5' : '1'}
                  strokeDasharray={isSelected ? undefined : '2,2'}
                />
                <Circle
                  cx={item.targetX}
                  cy={item.targetY}
                  r={isSelected ? 4 : 2.5}
                  fill={isSelected ? COLORS.primary : '#A1A1A6'}
                />
              </G>
            );
          })}
        </Svg>

        {/* Interactive Text Badges for Callouts */}
        {currentCallouts.map((item) => {
          const isLeft = item.side === 'left';
          const isSelected = selectedMuscleFilter === item.muscleId;

          return (
            <TouchableOpacity
              key={item.muscleId}
              style={[
                styles.calloutBadge,
                isLeft ? { left: 8 } : { right: 8 },
                { top: item.labelY - 14 },
                isSelected && styles.calloutBadgeActive,
              ]}
              onPress={() => handleMuscleClick(item.muscleId)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.calloutText,
                  isSelected && styles.calloutTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Floating Orange "Girar" Button (from IMG_1168.PNG & IMG_1169.PNG) */}
      <TouchableOpacity
        style={styles.rotateButton}
        onPress={toggleBodySide}
        activeOpacity={0.8}
      >
        <Ionicons name="refresh" size={26} color="#FFFFFF" />
        <Text style={styles.rotateButtonText}>Girar</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    paddingTop: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  badge: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  badgeText: {
    color: '#A1A1A6',
    fontSize: 12,
    fontWeight: '600',
  },
  canvasContainer: {
    position: 'relative',
    width: SVG_WIDTH,
    height: SVG_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  calloutBadge: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(28, 28, 30, 0.85)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38383E',
  },
  calloutBadgeActive: {
    backgroundColor: COLORS.primary,
    borderColor: '#FFA04D',
  },
  calloutText: {
    color: '#D1D1D6',
    fontSize: 11,
    fontWeight: '600',
  },
  calloutTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  rotateButton: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: COLORS.primary,
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  rotateButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
