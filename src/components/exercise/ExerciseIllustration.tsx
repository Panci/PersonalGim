import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Rect,
  Circle,
  G,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Ellipse,
} from 'react-native-svg';
import { Exercise } from '../../types';

interface ExerciseIllustrationProps {
  exercise: Exercise;
  width?: number | string;
  height?: number;
}

// Visual palette matching the reference app (IMG_1170.PNG):
// - Active target muscle: Bright fiery red-orange
const HIGHLIGHT_COLOR = '#FF381E';
const HIGHLIGHT_GRAD_START = '#FF6340';
const HIGHLIGHT_STROKE = '#D32F2F';

// - Anatomical body: Athletic grey tones with muscular definition
const BODY_SKIN_LIGHT = '#D8D8E4';
const BODY_SKIN_MID = '#B0B0BF';
const BODY_SKIN_SHADOW = '#828292';
const BODY_DEEP = '#585866';
const BODY_CONTOUR = '#343440';

// - Gym apparatus: Steel, cushions, weights
const STEEL_FRAME = '#C8C8D4';
const STEEL_DARK = '#50505C';
const BENCH_PAD = '#222228';
const WEIGHT_PLATE_DARK = '#18181D';
const WEIGHT_PLATE_MID = '#363640';
const CABLE_TOWER = '#A0A0B0';

const HANDLED_SCENES = new Set([
  'flat_bench_barbell',
  'pec_deck',
  'incline_bench_dumbbell',
  'flat_bench_dumbbell',
  'incline_bench_barbell',
  'cable_crossover',
  'squat_barbell',
  'leg_press_machine',
  'lat_pulldown',
  'pullups',
  'barbell_row',
  'military_press_barbell',
  'lateral_raise',
  'bicep_curl_barbell',
  'bicep_curl_dumbbell',
  'preacher_curl',
  'incline_bicep_curl',
  'concentration_curl',
  'tricep_pushdown',
  'tricep_skullcrusher',
  'tricep_overhead',
  'seated_cable_row',
  'dumbbell_row',
  'dumbbell_shoulder_press',
  'face_pull',
  'leg_extension_machine',
  'leg_curl_machine',
  'bulgarian_split_squat',
  'deadlift_barbell',
  'romanian_deadlift',
  'hip_thrust_barbell',
  'calf_raise_standing',
  'hanging_leg_raise',
  'ab_crunch',
  'chest_dips',
  'pushups',
  'plank',
  'hyperextensions',
  'shrugs',
  'wrist_curl',
]);

export const ExerciseIllustration: React.FC<ExerciseIllustrationProps> = ({
  exercise,
  width = '100%',
  height = 140,
}) => {
  const { id, primaryMuscle, equipment, name } = exercise;
  const nameLower = name.toLowerCase();

  const getSceneType = (): string => {
    // 1. PECTORAL (Chest)
    if (primaryMuscle === 'pectoral') {
      if (id.includes('pec-deck') || nameLower.includes('cristos') || nameLower.includes('mariposa')) {
        return 'pec_deck';
      }
      if (id.includes('incline-bench') || nameLower.includes('inclinado (barra)')) {
        return 'incline_bench_barbell';
      }
      if (id.includes('incline') || nameLower.includes('inclinad')) {
        return 'incline_bench_dumbbell';
      }
      if (id.includes('crossover') || nameLower.includes('cruce') || nameLower.includes('poleas')) {
        return 'cable_crossover';
      }
      if (id.includes('dips') || nameLower.includes('fondos')) {
        return 'chest_dips';
      }
      if (id.includes('pushup') || nameLower.includes('flexion')) {
        return 'pushups';
      }
      if (equipment === 'mancuerna') return 'flat_bench_dumbbell';
      if (equipment === 'maquina') return 'pec_deck';
      return 'flat_bench_barbell';
    }

    // 2. BICEPS
    if (primaryMuscle === 'biceps') {
      if (
        id.includes('preacher') ||
        id.includes('scott') ||
        nameLower.includes('scott') ||
        nameLower.includes('predicador') ||
        nameLower.includes('spider')
      ) {
        return 'preacher_curl';
      }
      if (nameLower.includes('inclinado') || id.includes('incline')) {
        return 'incline_bicep_curl';
      }
      if (nameLower.includes('concentrado') || id.includes('concentration')) {
        return 'concentration_curl';
      }
      if (equipment === 'barra' || nameLower.includes('barra')) {
        return 'bicep_curl_barbell';
      }
      return 'bicep_curl_dumbbell';
    }

    // 3. TRICEPS
    if (primaryMuscle === 'triceps') {
      if (id.includes('overhead') || nameLower.includes('sobre la cabeza') || nameLower.includes('cabeza')) {
        return 'tricep_overhead';
      }
      if (id.includes('skullcrusher') || nameLower.includes('francés') || nameLower.includes('frances')) {
        return 'tricep_skullcrusher';
      }
      if (nameLower.includes('fondos') || id.includes('dips')) {
        return 'chest_dips';
      }
      if (nameLower.includes('flexion') || id.includes('pushup')) {
        return 'pushups';
      }
      if (nameLower.includes('patada') || id.includes('kickback')) {
        return 'dumbbell_row';
      }
      if (equipment === 'barra') {
        return 'flat_bench_barbell'; // Press cerrado
      }
      return 'tricep_pushdown';
    }

    // 4. DORSALES (Lats & Back)
    if (primaryMuscle === 'dorsales') {
      if (id.includes('pulldown') || nameLower.includes('jalón') || nameLower.includes('jalon') || nameLower.includes('pullover')) {
        return 'lat_pulldown';
      }
      if (id.includes('pullup') || id.includes('chinup') || nameLower.includes('dominada') || nameLower.includes('invertido')) {
        return 'pullups';
      }
      if (id.includes('cable-row') || nameLower.includes('gironda') || nameLower.includes('remo sentado') || equipment === 'maquina') {
        return 'seated_cable_row';
      }
      if (id.includes('dumbbell-row') || nameLower.includes('unilateral') || nameLower.includes('serrucho') || equipment === 'mancuerna') {
        return 'dumbbell_row';
      }
      return 'barbell_row';
    }

    // 5. HOMBROS (Shoulders)
    if (primaryMuscle === 'hombros') {
      if (
        id.includes('face-pull') ||
        nameLower.includes('face pull') ||
        nameLower.includes('pájaros') ||
        nameLower.includes('pajaros') ||
        nameLower.includes('posterior') ||
        nameLower.includes('invertida')
      ) {
        return 'face_pull';
      }
      if (nameLower.includes('lateral') || nameLower.includes('laterales') || nameLower.includes('frontal') || nameLower.includes('frontales')) {
        return 'lateral_raise';
      }
      if (nameLower.includes('militar') || (equipment === 'barra' && nameLower.includes('press'))) {
        return 'military_press_barbell';
      }
      if (nameLower.includes('press') || equipment === 'mancuerna' || equipment === 'maquina') {
        return 'dumbbell_shoulder_press';
      }
      if (nameLower.includes('flexion') || id.includes('pike')) {
        return 'pushups';
      }
      return 'lateral_raise';
    }

    // 6. CUADRICEPS
    if (primaryMuscle === 'cuadriceps') {
      if (nameLower.includes('prensa') || id.includes('press') || nameLower.includes('hack')) {
        return 'leg_press_machine';
      }
      if (nameLower.includes('extension') || nameLower.includes('extensión') || id.includes('extension')) {
        return 'leg_extension_machine';
      }
      if (
        nameLower.includes('búlgara') ||
        nameLower.includes('bulgara') ||
        nameLower.includes('zancada') ||
        nameLower.includes('pistola') ||
        id.includes('bulgarian') ||
        id.includes('lunge')
      ) {
        return 'bulgarian_split_squat';
      }
      return 'squat_barbell';
    }

    // 7. ISQUIOTIBIALES (Hamstrings)
    if (primaryMuscle === 'isquiotibiales') {
      if (nameLower.includes('curl') || equipment === 'maquina' || id.includes('curl')) {
        return 'leg_curl_machine';
      }
      return 'romanian_deadlift';
    }

    // 8. GLUTEOS
    if (primaryMuscle === 'gluteos') {
      if (nameLower.includes('patinador') || nameLower.includes('zancada')) {
        return 'bulgarian_split_squat';
      }
      if (nameLower.includes('sumo') || id.includes('sumo')) {
        return 'deadlift_barbell';
      }
      return 'hip_thrust_barbell';
    }

    // 9. PANTORRILLAS
    if (primaryMuscle === 'pantorrillas') {
      return 'calf_raise_standing';
    }

    // 10. ABDOMEN & OBLICUOS
    if (primaryMuscle === 'abdomen' || primaryMuscle === 'oblicuos') {
      if (nameLower.includes('colgado') || id.includes('hanging')) {
        return 'hanging_leg_raise';
      }
      if (nameLower.includes('plancha') || nameLower.includes('rueda') || id.includes('plank') || id.includes('roller')) {
        return 'plank';
      }
      return 'ab_crunch';
    }

    // 11. TRAPECIO
    if (primaryMuscle === 'trapecio') {
      return 'shrugs';
    }

    // 12. LUMBARES
    if (primaryMuscle === 'lumbares') {
      if (nameLower.includes('peso muerto') || id.includes('deadlift')) {
        return 'deadlift_barbell';
      }
      return 'hyperextensions';
    }

    // 13. ANTEBRAZO
    if (primaryMuscle === 'antebrazo') {
      if (nameLower.includes('granjero')) return 'shrugs';
      if (nameLower.includes('colgado')) return 'pullups';
      return 'wrist_curl';
    }

    return 'default_figure';
  };

  const scene = getSceneType();
  const isCustomScene = HANDLED_SCENES.has(scene);

  return (
    <View style={[styles.container, { height }]}>
      <Svg width={width} height={height} viewBox="0 0 200 150">
        <Defs>
          {/* Active Highlight Muscle Gradient */}
          <LinearGradient id="activeMuscle" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={HIGHLIGHT_GRAD_START} />
            <Stop offset="100%" stopColor={HIGHLIGHT_COLOR} />
          </LinearGradient>

          {/* Olympic Barbell Metallic Steel */}
          <LinearGradient id="steelBar" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="40%" stopColor="#A8A8B6" />
            <Stop offset="100%" stopColor="#303038" />
          </LinearGradient>

          {/* Cast Iron Plates */}
          <LinearGradient id="castIronPlate" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={WEIGHT_PLATE_MID} />
            <Stop offset="50%" stopColor={WEIGHT_PLATE_DARK} />
            <Stop offset="100%" stopColor="#0E0E12" />
          </LinearGradient>

          {/* Athletic Flesh Gradient */}
          <LinearGradient id="athleteFlesh" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={BODY_SKIN_LIGHT} />
            <Stop offset="70%" stopColor={BODY_SKIN_MID} />
            <Stop offset="100%" stopColor={BODY_SKIN_SHADOW} />
          </LinearGradient>
        </Defs>

        {/* Floor Shadow */}
        <Ellipse cx="100" cy="132" rx="72" ry="4" fill="rgba(0, 0, 0, 0.05)" />

        {/* ======================================================== */}
        {/* 1. Flat Bench Press Barbell                              */}
        {/* ======================================================== */}
        {scene === 'flat_bench_barbell' && (
          <G id="flatBenchPress">
            <Rect x="44" y="90" width="7" height="32" rx="1" fill={STEEL_FRAME} />
            <Rect x="116" y="90" width="7" height="32" rx="1" fill={STEEL_FRAME} />
            <Line x1="40" y1="122" x2="124" y2="122" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Rect x="34" y="85" width="100" height="9" rx="3" fill={BENCH_PAD} />
            <Rect x="128" y="44" width="6" height="78" rx="1" fill={STEEL_FRAME} />
            <Rect x="125" y="60" width="12" height="4" rx="1" fill={STEEL_DARK} />
            <Circle cx="122" cy="79" r="7.5" fill="url(#athleteFlesh)" />
            <Rect x="114" y="81" width="6" height="4" fill={BODY_SKIN_MID} />
            <Path d="M 58 84 Q 72 80 88 84 L 88 89 L 58 89 Z" fill={BODY_SKIN_SHADOW} />
            <Path d="M 58 86 Q 46 96 42 121 L 37 121 Q 42 94 54 84 Z" fill={BODY_DEEP} />
            <Path d="M 64 86 Q 56 102 54 121 L 49 121 Q 51 98 60 84 Z" fill="url(#athleteFlesh)" />
            <Rect x="35" y="120" width="10" height="4" rx="1.5" fill={BODY_CONTOUR} />
            <Rect x="47" y="120" width="10" height="4" rx="1.5" fill={BODY_CONTOUR} />
            <Path d="M 88 84 Q 102 75 116 83 L 114 89 L 88 89 Z" fill={BODY_SKIN_MID} />
            {/* ACTIVE MUSCLE: PECTORAL */}
            <Path
              d="M 94 81 C 97 74, 108 73, 114 77 C 117 81, 112 85, 105 85 C 98 85, 93 84, 94 81 Z"
              fill="url(#activeMuscle)"
              stroke={HIGHLIGHT_STROKE}
              strokeWidth="1"
            />
            <Path d="M 98 80 Q 96 61 106 46 L 112 48 Q 104 62 106 80 Z" fill="url(#athleteFlesh)" />
            <Path d="M 112 80 Q 114 61 116 46 L 122 48 Q 120 62 118 80 Z" fill={BODY_SKIN_SHADOW} />
            <Circle cx="108" cy="45" r="4.5" fill={BODY_CONTOUR} />
            <Circle cx="118" cy="45" r="4.5" fill={BODY_CONTOUR} />
            <Line x1="66" y1="45" x2="155" y2="45" stroke="url(#steelBar)" strokeWidth="4" strokeLinecap="round" />
            <Rect x="74" y="20" width="8" height="50" rx="3" fill="url(#castIronPlate)" stroke="#111" strokeWidth="1" />
            <Circle cx="78" cy="45" r="3.5" fill="#8E8E98" />
            <Rect x="144" y="20" width="8" height="50" rx="3" fill="url(#castIronPlate)" stroke="#111" strokeWidth="1" />
            <Circle cx="148" cy="45" r="3.5" fill="#8E8E98" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 2. Pec Deck / Butterfly Machine                          */}
        {/* ======================================================== */}
        {scene === 'pec_deck' && (
          <G id="pecDeckMachine">
            <Line x1="32" y1="126" x2="168" y2="126" stroke={STEEL_DARK} strokeWidth="3.5" strokeLinecap="round" />
            <Rect x="64" y="26" width="7" height="100" rx="1" fill={STEEL_FRAME} />
            <Rect x="128" y="26" width="7" height="100" rx="1" fill={STEEL_FRAME} />
            <Rect x="60" y="24" width="76" height="6" rx="2" fill={STEEL_FRAME} />
            <Rect x="44" y="52" width="16" height="54" rx="2" fill="url(#castIronPlate)" />
            <Line x1="52" y1="30" x2="52" y2="108" stroke="#E4E4EE" strokeWidth="1.5" />
            <Rect x="93" y="44" width="12" height="50" rx="3" fill={BENCH_PAD} />
            <Rect x="86" y="94" width="28" height="7" rx="2" fill={BENCH_PAD} />
            <Rect x="97" y="101" width="6" height="24" fill={STEEL_FRAME} />
            <Path d="M 68 30 L 80 56 L 82 82" stroke={STEEL_FRAME} strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <Path d="M 132 30 L 120 56 L 118 82" stroke={STEEL_FRAME} strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <Rect x="80" y="62" width="4" height="18" rx="1.5" fill={BENCH_PAD} />
            <Rect x="116" y="62" width="4" height="18" rx="1.5" fill={BENCH_PAD} />
            <Circle cx="99" cy="38" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 92 46 L 106 46 L 104 94 L 94 94 Z" fill="url(#athleteFlesh)" />
            {/* ACTIVE MUSCLE: PECTORALS */}
            <Path
              d="M 93 48 C 96 46, 102 46, 105 48 C 106 57, 102 63, 99 64 C 96 63, 92 57, 93 48 Z"
              fill="url(#activeMuscle)"
              stroke={HIGHLIGHT_STROKE}
              strokeWidth="1"
            />
            <Line x1="95" y1="67" x2="103" y2="67" stroke={BODY_CONTOUR} strokeWidth="1" strokeLinecap="round" />
            <Line x1="96" y1="73" x2="102" y2="73" stroke={BODY_CONTOUR} strokeWidth="1" strokeLinecap="round" />
            <Line x1="96" y1="79" x2="102" y2="79" stroke={BODY_CONTOUR} strokeWidth="1" strokeLinecap="round" />
            <Path d="M 93 50 Q 82 55 82 72" stroke="url(#athleteFlesh)" strokeWidth="6.5" strokeLinecap="round" fill="none" />
            <Path d="M 105 50 Q 116 55 116 72" stroke={BODY_SKIN_SHADOW} strokeWidth="6.5" strokeLinecap="round" fill="none" />
            <Path d="M 95 94 L 86 108 L 86 126" stroke={BODY_DEEP} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Path d="M 103 94 L 112 108 L 112 126" stroke={BODY_SKIN_SHADOW} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Rect x="80" y="124" width="12" height="4" rx="1.5" fill={BODY_CONTOUR} />
            <Rect x="110" y="124" width="12" height="4" rx="1.5" fill={BODY_CONTOUR} />
          </G>
        )}

        {/* ======================================================== */}
        {/* 3. Incline Dumbbell Press                                */}
        {/* ======================================================== */}
        {scene === 'incline_bench_dumbbell' && (
          <G id="inclineDumbbell">
            <Line x1="28" y1="126" x2="152" y2="126" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Line x1="58" y1="126" x2="58" y2="105" stroke={STEEL_FRAME} strokeWidth="6" strokeLinecap="round" />
            <Line x1="122" y1="126" x2="104" y2="92" stroke={STEEL_FRAME} strokeWidth="6" strokeLinecap="round" />
            <Line x1="56" y1="102" x2="114" y2="60" stroke={BENCH_PAD} strokeWidth="8.5" strokeLinecap="round" />
            <Line x1="50" y1="106" x2="68" y2="104" stroke={BENCH_PAD} strokeWidth="7" strokeLinecap="round" />
            <Circle cx="116" cy="54" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 62 100 L 74 102 L 110 62 L 100 58 Z" fill={BODY_SKIN_SHADOW} />
            {/* ACTIVE MUSCLE: Clavicular Upper Chest */}
            <Path
              d="M 92 65 C 97 59, 107 61, 109 67 C 106 71, 96 73, 91 69 Z"
              fill="url(#activeMuscle)"
              stroke={HIGHLIGHT_STROKE}
              strokeWidth="1"
            />
            <Path d="M 62 102 L 48 114 L 44 126" stroke={BODY_DEEP} strokeWidth="6" strokeLinecap="round" fill="none" />
            <Path d="M 70 104 L 60 116 L 58 126" stroke="url(#athleteFlesh)" strokeWidth="6" strokeLinecap="round" fill="none" />
            <Path d="M 93 64 L 83 44 L 80 32" stroke="url(#athleteFlesh)" strokeWidth="6" strokeLinecap="round" fill="none" />
            <Path d="M 102 63 L 98 43 L 96 32" stroke={BODY_SKIN_SHADOW} strokeWidth="6" strokeLinecap="round" fill="none" />
            <Rect x="70" y="28" width="20" height="4" rx="1.5" fill="url(#steelBar)" />
            <Rect x="70" y="20" width="5" height="20" rx="2" fill="url(#castIronPlate)" stroke="#111" strokeWidth="0.8" />
            <Rect x="85" y="20" width="5" height="20" rx="2" fill="url(#castIronPlate)" stroke="#111" strokeWidth="0.8" />
            <Rect x="88" y="26" width="20" height="4" rx="1.5" fill="url(#steelBar)" />
            <Rect x="88" y="18" width="5" height="20" rx="2" fill="url(#castIronPlate)" stroke="#111" strokeWidth="0.8" />
            <Rect x="103" y="18" width="5" height="20" rx="2" fill="url(#castIronPlate)" stroke="#111" strokeWidth="0.8" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 4. Flat Bench Dumbbell Press                             */}
        {/* ======================================================== */}
        {scene === 'flat_bench_dumbbell' && (
          <G id="flatBenchDumbbell">
            <Line x1="28" y1="124" x2="152" y2="124" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Rect x="48" y="94" width="7" height="28" rx="1" fill={STEEL_FRAME} />
            <Rect x="116" y="94" width="7" height="28" rx="1" fill={STEEL_FRAME} />
            <Rect x="38" y="90" width="94" height="8.5" rx="3" fill={BENCH_PAD} />
            <Circle cx="124" cy="86" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 62 88 Q 73 85 88 88 L 88 93 L 62 93 Z" fill={BODY_SKIN_SHADOW} />
            <Path d="M 62 90 Q 50 100 46 122" stroke={BODY_DEEP} strokeWidth="6" strokeLinecap="round" fill="none" />
            <Path d="M 70 90 Q 60 102 58 122" stroke="url(#athleteFlesh)" strokeWidth="6" strokeLinecap="round" fill="none" />
            <Path d="M 88 88 Q 104 80 118 87 L 116 93 L 88 93 Z" fill={BODY_SKIN_MID} />
            {/* ACTIVE MUSCLE: PECTORAL */}
            <Path
              d="M 92 84 C 95 78, 108 77, 115 81 C 117 85, 112 89, 105 89 C 98 89, 92 87, 92 84 Z"
              fill="url(#activeMuscle)"
              stroke={HIGHLIGHT_STROKE}
              strokeWidth="1"
            />
            <Path d="M 98 83 L 92 63 L 90 48" stroke="url(#athleteFlesh)" strokeWidth="6" strokeLinecap="round" fill="none" />
            <Path d="M 114 83 L 118 63 L 120 48" stroke={BODY_SKIN_SHADOW} strokeWidth="6" strokeLinecap="round" fill="none" />
            <Rect x="80" y="45" width="20" height="4" rx="1.5" fill="url(#steelBar)" />
            <Rect x="80" y="36" width="5" height="22" rx="2" fill="url(#castIronPlate)" stroke="#111" strokeWidth="0.8" />
            <Rect x="95" y="36" width="5" height="22" rx="2" fill="url(#castIronPlate)" stroke="#111" strokeWidth="0.8" />
            <Rect x="110" y="45" width="20" height="4" rx="1.5" fill="url(#steelBar)" />
            <Rect x="110" y="36" width="5" height="22" rx="2" fill="url(#castIronPlate)" stroke="#111" strokeWidth="0.8" />
            <Rect x="125" y="36" width="5" height="22" rx="2" fill="url(#castIronPlate)" stroke="#111" strokeWidth="0.8" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 5. Incline Bench Press Barbell                           */}
        {/* ======================================================== */}
        {scene === 'incline_bench_barbell' && (
          <G id="inclineBenchBarbell">
            <Line x1="28" y1="126" x2="152" y2="126" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Line x1="122" y1="126" x2="104" y2="92" stroke={STEEL_FRAME} strokeWidth="6" strokeLinecap="round" />
            <Line x1="56" y1="102" x2="114" y2="60" stroke={BENCH_PAD} strokeWidth="8.5" strokeLinecap="round" />
            <Rect x="118" y="38" width="6" height="88" rx="1" fill={STEEL_FRAME} />
            <Circle cx="116" cy="54" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 62 100 L 74 102 L 110 62 L 100 58 Z" fill={BODY_SKIN_SHADOW} />
            <Path d="M 92 65 C 97 59, 107 61, 109 67 C 106 71, 96 73, 91 69 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Line x1="93" y1="65" x2="96" y2="38" stroke="url(#athleteFlesh)" strokeWidth="6" strokeLinecap="round" />
            <Line x1="106" y1="65" x2="112" y2="38" stroke={BODY_SKIN_SHADOW} strokeWidth="6" strokeLinecap="round" />
            <Line x1="68" y1="36" x2="152" y2="36" stroke="url(#steelBar)" strokeWidth="4" strokeLinecap="round" />
            <Rect x="76" y="16" width="7" height="42" rx="2" fill="url(#castIronPlate)" stroke="#111" strokeWidth="1" />
            <Rect x="142" y="16" width="7" height="42" rx="2" fill="url(#castIronPlate)" stroke="#111" strokeWidth="1" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 6. Cable Crossover                                       */}
        {/* ======================================================== */}
        {scene === 'cable_crossover' && (
          <G id="cableCrossover">
            <Rect x="15" y="14" width="8" height="118" rx="2" fill={CABLE_TOWER} />
            <Rect x="177" y="14" width="8" height="118" rx="2" fill={CABLE_TOWER} />
            <Circle cx="19" cy="22" r="4" fill="#333" />
            <Circle cx="181" cy="22" r="4" fill="#333" />
            <Circle cx="100" cy="40" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 93 48 L 107 48 L 103 84 L 97 84 Z" fill="url(#athleteFlesh)" />
            <Path d="M 93 50 C 96 48, 104 48, 107 50 C 108 58, 104 63, 100 64 C 96 63, 92 58, 93 50 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Path d="M 93 52 Q 62 52 80 74" stroke="url(#athleteFlesh)" strokeWidth="5.5" fill="none" strokeLinecap="round" />
            <Path d="M 107 52 Q 138 52 120 74" stroke={BODY_SKIN_SHADOW} strokeWidth="5.5" fill="none" strokeLinecap="round" />
            <Line x1="19" y1="22" x2="80" y2="74" stroke="#606070" strokeWidth="1.5" />
            <Line x1="181" y1="22" x2="120" y2="74" stroke="#606070" strokeWidth="1.5" />
            <Path d="M 97 84 L 84 105 L 80 128" stroke={BODY_DEEP} strokeWidth="6" fill="none" strokeLinecap="round" />
            <Path d="M 103 84 L 114 105 L 118 128" stroke={BODY_SKIN_SHADOW} strokeWidth="6" fill="none" strokeLinecap="round" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 7. Barbell Back Squat                                    */}
        {/* ======================================================== */}
        {scene === 'squat_barbell' && (
          <G id="squatBarbell">
            <Line x1="20" y1="130" x2="180" y2="130" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Rect x="42" y="32" width="5" height="98" fill={STEEL_FRAME} />
            <Rect x="153" y="32" width="5" height="98" fill={STEEL_FRAME} />
            <Circle cx="100" cy="48" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 92 56 L 108 56 L 105 86 L 95 86 Z" fill={BODY_SKIN_SHADOW} />
            {/* ACTIVE QUADRICEPS */}
            <Path
              d="M 95 84 C 88 86, 74 92, 74 104 C 74 112, 84 112, 92 104 L 96 88 Z"
              fill="url(#activeMuscle)"
              stroke={HIGHLIGHT_STROKE}
              strokeWidth="1"
            />
            <Path
              d="M 105 84 C 112 86, 126 92, 126 104 C 126 112, 116 112, 108 104 L 104 88 Z"
              fill="url(#activeMuscle)"
              stroke={HIGHLIGHT_STROKE}
              strokeWidth="1"
            />
            <Path d="M 76 106 L 78 128 L 70 128" stroke={BODY_DEEP} strokeWidth="6" fill="none" strokeLinecap="round" />
            <Path d="M 124 106 L 122 128 L 130 128" stroke={BODY_SKIN_SHADOW} strokeWidth="6" fill="none" strokeLinecap="round" />
            <Path d="M 92 58 L 82 54 L 84 50" stroke="url(#athleteFlesh)" strokeWidth="5" fill="none" strokeLinecap="round" />
            <Path d="M 108 58 L 118 54 L 116 50" stroke={BODY_SKIN_SHADOW} strokeWidth="5" fill="none" strokeLinecap="round" />
            <Line x1="45" y1="51" x2="155" y2="51" stroke="url(#steelBar)" strokeWidth="4.5" strokeLinecap="round" />
            <Rect x="54" y="24" width="9" height="54" rx="3" fill="url(#castIronPlate)" stroke="#111" strokeWidth="1" />
            <Rect x="137" y="24" width="9" height="54" rx="3" fill="url(#castIronPlate)" stroke="#111" strokeWidth="1" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 8. Leg Press 45 Machine                                  */}
        {/* ======================================================== */}
        {scene === 'leg_press_machine' && (
          <G id="legPress">
            <Line x1="30" y1="126" x2="162" y2="34" stroke={STEEL_FRAME} strokeWidth="6.5" strokeLinecap="round" />
            <Rect x="35" y="106" width="28" height="6" rx="2" fill={BENCH_PAD} />
            <Line x1="36" y1="108" x2="48" y2="82" stroke={BENCH_PAD} strokeWidth="8" strokeLinecap="round" />
            <Line x1="118" y1="64" x2="148" y2="42" stroke="#333" strokeWidth="9" strokeLinecap="round" />
            <Rect x="138" y="32" width="7" height="28" rx="2" fill="url(#castIronPlate)" />
            <Circle cx="54" cy="74" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 45 106 L 56 106 L 58 84 L 48 82 Z" fill={BODY_SKIN_SHADOW} />
            {/* ACTIVE QUADRICEPS */}
            <Path
              d="M 56 100 C 65 92, 85 80, 96 74 C 99 78, 96 85, 84 94 C 74 102, 60 106, 56 100 Z"
              fill="url(#activeMuscle)"
              stroke={HIGHLIGHT_STROKE}
              strokeWidth="1"
            />
            <Path d="M 94 76 L 126 56" stroke={BODY_SKIN_SHADOW} strokeWidth="6.5" strokeLinecap="round" fill="none" />
            <Rect x="124" y="50" width="8" height="12" rx="2" fill={BODY_CONTOUR} />
          </G>
        )}

        {/* ======================================================== */}
        {/* 9. Lat Pulldown                                          */}
        {/* ======================================================== */}
        {scene === 'lat_pulldown' && (
          <G id="latPulldown">
            <Rect x="30" y="14" width="140" height="4" rx="1" fill={STEEL_FRAME} />
            <Line x1="100" y1="14" x2="100" y2="38" stroke="#666" strokeWidth="2" />
            <Rect x="86" y="106" width="28" height="6" rx="2" fill={BENCH_PAD} />
            <Rect x="97" y="112" width="6" height="20" fill={STEEL_FRAME} />
            <Rect x="82" y="90" width="36" height="6" rx="3" fill="#2E2E35" />
            <Path d="M 52 44 L 70 40 L 130 40 L 148 44" stroke="url(#steelBar)" strokeWidth="4" fill="none" strokeLinecap="round" />
            <Circle cx="100" cy="54" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 93 62 L 107 62 L 104 106 L 96 106 Z" fill={BODY_SKIN_SHADOW} />
            {/* ACTIVE WIDE LATS */}
            <Path
              d="M 94 63 C 82 68, 80 82, 85 92 C 91 92, 96 86, 96 74 Z"
              fill="url(#activeMuscle)"
              stroke={HIGHLIGHT_STROKE}
              strokeWidth="1"
            />
            <Path
              d="M 106 63 C 118 68, 120 82, 115 92 C 109 92, 104 86, 104 74 Z"
              fill="url(#activeMuscle)"
              stroke={HIGHLIGHT_STROKE}
              strokeWidth="1"
            />
            <Path d="M 93 62 L 72 50 L 64 42" stroke="url(#athleteFlesh)" strokeWidth="5.5" fill="none" strokeLinecap="round" />
            <Path d="M 107 62 L 128 50 L 136 42" stroke={BODY_SKIN_SHADOW} strokeWidth="5.5" fill="none" strokeLinecap="round" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 10. Pullups / Dominadas                                  */}
        {/* ======================================================== */}
        {scene === 'pullups' && (
          <G id="pullups">
            <Line x1="28" y1="24" x2="172" y2="24" stroke={STEEL_DARK} strokeWidth="4.5" strokeLinecap="round" />
            <Rect x="42" y="8" width="4" height="20" fill={STEEL_FRAME} />
            <Rect x="154" y="8" width="4" height="20" fill={STEEL_FRAME} />
            <Circle cx="100" cy="20" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 93 28 L 107 28 L 103 68 L 97 68 Z" fill={BODY_SKIN_SHADOW} />
            <Path d="M 94 30 C 82 36, 78 50, 84 60 C 90 60, 96 54, 96 42 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Path d="M 106 30 C 118 36, 122 50, 116 60 C 110 60, 104 54, 104 42 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Path d="M 93 30 L 76 26 L 72 24" stroke="url(#athleteFlesh)" strokeWidth="5.5" fill="none" strokeLinecap="round" />
            <Path d="M 107 30 L 124 26 L 128 24" stroke={BODY_SKIN_SHADOW} strokeWidth="5.5" fill="none" strokeLinecap="round" />
            <Path d="M 97 68 L 95 96 L 102 114" stroke={BODY_DEEP} strokeWidth="5.5" fill="none" strokeLinecap="round" />
            <Path d="M 103 68 L 105 96 L 98 114" stroke={BODY_SKIN_SHADOW} strokeWidth="5.5" fill="none" strokeLinecap="round" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 11. Barbell Bent-Over Row                                */}
        {/* ======================================================== */}
        {scene === 'barbell_row' && (
          <G id="barbellRow">
            <Line x1="20" y1="130" x2="180" y2="130" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Circle cx="130" cy="54" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 78 92 L 92 92 L 126 60 L 116 56 Z" fill={BODY_SKIN_SHADOW} />
            {/* ACTIVE UPPER BACK & LATS */}
            <Path d="M 96 72 C 104 64, 116 62, 120 66 C 118 76, 106 82, 98 78 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Path d="M 80 92 L 76 110 L 78 128" stroke={BODY_DEEP} strokeWidth="6" fill="none" strokeLinecap="round" />
            <Path d="M 88 92 L 86 110 L 90 128" stroke={BODY_SKIN_SHADOW} strokeWidth="6" fill="none" strokeLinecap="round" />
            <Path d="M 114 62 L 104 78 L 100 88" stroke="url(#athleteFlesh)" strokeWidth="5.5" fill="none" strokeLinecap="round" />
            <Line x1="58" y1="88" x2="145" y2="88" stroke="url(#steelBar)" strokeWidth="4" strokeLinecap="round" />
            <Rect x="66" y="68" width="7" height="40" rx="2" fill="url(#castIronPlate)" />
            <Rect x="135" y="68" width="7" height="40" rx="2" fill="url(#castIronPlate)" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 12. Military Press Barbell                               */}
        {/* ======================================================== */}
        {scene === 'military_press_barbell' && (
          <G id="militaryPress">
            <Line x1="20" y1="130" x2="180" y2="130" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Circle cx="100" cy="54" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 93 62 L 107 62 L 104 96 L 96 96 Z" fill="url(#athleteFlesh)" />
            {/* ACTIVE DELTOIDS */}
            <Circle cx="91" cy="64" r="5.5" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Circle cx="109" cy="64" r="5.5" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Path d="M 91 64 L 84 44 L 86 26" stroke="url(#athleteFlesh)" strokeWidth="5.5" fill="none" strokeLinecap="round" />
            <Path d="M 109 64 L 116 44 L 114 26" stroke={BODY_SKIN_SHADOW} strokeWidth="5.5" fill="none" strokeLinecap="round" />
            <Line x1="52" y1="24" x2="148" y2="24" stroke="url(#steelBar)" strokeWidth="4" strokeLinecap="round" />
            <Rect x="62" y="6" width="7" height="36" rx="2" fill="url(#castIronPlate)" />
            <Rect x="131" y="6" width="7" height="36" rx="2" fill="url(#castIronPlate)" />
            <Path d="M 96 96 L 94 128" stroke={BODY_DEEP} strokeWidth="6" fill="none" strokeLinecap="round" />
            <Path d="M 104 96 L 106 128" stroke={BODY_SKIN_SHADOW} strokeWidth="6" fill="none" strokeLinecap="round" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 13. Lateral Raise                                        */}
        {/* ======================================================== */}
        {scene === 'lateral_raise' && (
          <G id="lateralRaise">
            <Line x1="20" y1="130" x2="180" y2="130" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Circle cx="100" cy="40" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 93 48 L 107 48 L 104 88 L 96 88 Z" fill="url(#athleteFlesh)" />
            {/* ACTIVE LATERAL DELTOIDS */}
            <Path d="M 87 48 C 89 44, 93 46, 94 51 C 93 56, 87 55, 87 48 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Path d="M 113 48 C 111 44, 107 46, 106 51 C 107 56, 113 55, 113 48 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Path d="M 89 50 L 60 48 L 42 52" stroke="url(#athleteFlesh)" strokeWidth="5.5" fill="none" strokeLinecap="round" />
            <Path d="M 111 50 L 140 48 L 158 52" stroke={BODY_SKIN_SHADOW} strokeWidth="5.5" fill="none" strokeLinecap="round" />
            <Rect x="34" y="50" width="14" height="4" rx="1" fill="url(#steelBar)" />
            <Rect x="34" y="42" width="4.5" height="20" rx="1.5" fill="url(#castIronPlate)" />
            <Rect x="44" y="42" width="4.5" height="20" rx="1.5" fill="url(#castIronPlate)" />
            <Rect x="152" y="50" width="14" height="4" rx="1" fill="url(#steelBar)" />
            <Rect x="152" y="42" width="4.5" height="20" rx="1.5" fill="url(#castIronPlate)" />
            <Rect x="162" y="42" width="4.5" height="20" rx="1.5" fill="url(#castIronPlate)" />
            <Path d="M 96 88 L 93 128" stroke={BODY_DEEP} strokeWidth="6" fill="none" strokeLinecap="round" />
            <Path d="M 104 88 L 107 128" stroke={BODY_SKIN_SHADOW} strokeWidth="6" fill="none" strokeLinecap="round" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 14. Bicep Curl Barbell                                   */}
        {/* ======================================================== */}
        {scene === 'bicep_curl_barbell' && (
          <G id="bicepCurlBarbell">
            <Line x1="20" y1="130" x2="180" y2="130" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Circle cx="100" cy="40" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 93 48 L 107 48 L 104 88 L 96 88 Z" fill="url(#athleteFlesh)" />
            {/* ACTIVE BICEPS */}
            <Circle cx="88" cy="62" r="6" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Circle cx="112" cy="62" r="6" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Path d="M 91 50 L 88 64 L 86 54" stroke="url(#athleteFlesh)" strokeWidth="5.5" fill="none" strokeLinecap="round" />
            <Path d="M 109 50 L 112 64 L 114 54" stroke={BODY_SKIN_SHADOW} strokeWidth="5.5" fill="none" strokeLinecap="round" />
            <Line x1="62" y1="54" x2="138" y2="54" stroke="url(#steelBar)" strokeWidth="4" strokeLinecap="round" />
            <Rect x="70" y="38" width="6" height="32" rx="2" fill="url(#castIronPlate)" />
            <Rect x="124" y="38" width="6" height="32" rx="2" fill="url(#castIronPlate)" />
            <Path d="M 96 88 L 94 128" stroke={BODY_DEEP} strokeWidth="6" fill="none" strokeLinecap="round" />
            <Path d="M 104 88 L 106 128" stroke={BODY_SKIN_SHADOW} strokeWidth="6" fill="none" strokeLinecap="round" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 15. Bicep Curl Dumbbells                                 */}
        {/* ======================================================== */}
        {scene === 'bicep_curl_dumbbell' && (
          <G id="bicepCurlDumbbell">
            <Line x1="20" y1="130" x2="180" y2="130" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Circle cx="100" cy="40" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 93 48 L 107 48 L 104 88 L 96 88 Z" fill="url(#athleteFlesh)" />
            <Circle cx="88" cy="62" r="6" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Circle cx="112" cy="62" r="6" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Path d="M 91 50 L 87 64 L 85 52" stroke="url(#athleteFlesh)" strokeWidth="5.5" fill="none" strokeLinecap="round" />
            <Path d="M 109 50 L 113 64 L 115 52" stroke={BODY_SKIN_SHADOW} strokeWidth="5.5" fill="none" strokeLinecap="round" />
            <Rect x="76" y="50" width="16" height="4" rx="1" fill="url(#steelBar)" />
            <Rect x="76" y="42" width="4.5" height="20" rx="1.5" fill="url(#castIronPlate)" />
            <Rect x="88" y="42" width="4.5" height="20" rx="1.5" fill="url(#castIronPlate)" />
            <Rect x="108" y="50" width="16" height="4" rx="1" fill="url(#steelBar)" />
            <Rect x="108" y="42" width="4.5" height="20" rx="1.5" fill="url(#castIronPlate)" />
            <Rect x="120" y="42" width="4.5" height="20" rx="1.5" fill="url(#castIronPlate)" />
            <Path d="M 96 88 L 94 128" stroke={BODY_DEEP} strokeWidth="6" fill="none" strokeLinecap="round" />
            <Path d="M 104 88 L 106 128" stroke={BODY_SKIN_SHADOW} strokeWidth="6" fill="none" strokeLinecap="round" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 16. Preacher Scott Curl (Banco Scott / Máquina Scott)    */}
        {/* ======================================================== */}
        {scene === 'preacher_curl' && (
          <G id="preacherCurl">
            <Line x1="30" y1="126" x2="165" y2="126" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Line x1="104" y1="126" x2="104" y2="82" stroke={STEEL_FRAME} strokeWidth="6" strokeLinecap="round" />
            <Line x1="84" y1="92" x2="122" y2="70" stroke={BENCH_PAD} strokeWidth="10" strokeLinecap="round" />
            <Rect x="48" y="98" width="24" height="6" rx="2" fill={BENCH_PAD} />
            <Rect x="58" y="104" width="6" height="22" fill={STEEL_FRAME} />
            <Path d="M 126 84 L 126 98 L 118 98" stroke={STEEL_FRAME} strokeWidth="3.5" fill="none" />
            <Circle cx="76" cy="50" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 60 94 L 72 96 L 86 64 L 76 60 Z" fill={BODY_SKIN_SHADOW} />
            <Path d="M 60 96 L 50 110 L 48 126" stroke={BODY_DEEP} strokeWidth="6" strokeLinecap="round" fill="none" />
            <Line x1="84" y1="64" x2="108" y2="76" stroke="url(#athleteFlesh)" strokeWidth="6.5" strokeLinecap="round" />
            {/* ACTIVE BICEPS PEAK */}
            <Path
              d="M 88 62 C 96 56, 106 60, 105 70 C 99 72, 91 70, 88 62 Z"
              fill="url(#activeMuscle)"
              stroke={HIGHLIGHT_STROKE}
              strokeWidth="1"
            />
            <Path d="M 108 76 L 118 60 L 114 48" stroke="url(#athleteFlesh)" strokeWidth="5.5" strokeLinecap="round" fill="none" />
            <Line x1="92" y1="46" x2="136" y2="46" stroke="url(#steelBar)" strokeWidth="3.5" strokeLinecap="round" />
            <Circle cx="96" cy="46" r="7.5" fill="url(#castIronPlate)" stroke="#111" strokeWidth="0.8" />
            <Circle cx="132" cy="46" r="7.5" fill="url(#castIronPlate)" stroke="#111" strokeWidth="0.8" />
            <Circle cx="96" cy="46" r="2.5" fill="#888" />
            <Circle cx="132" cy="46" r="2.5" fill="#888" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 17. Incline Bicep Curl (Curl en banco inclinado)         */}
        {/* ======================================================== */}
        {scene === 'incline_bicep_curl' && (
          <G id="inclineBicepCurl">
            <Line x1="28" y1="126" x2="152" y2="126" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Line x1="58" y1="126" x2="58" y2="105" stroke={STEEL_FRAME} strokeWidth="6" strokeLinecap="round" />
            <Line x1="122" y1="126" x2="104" y2="92" stroke={STEEL_FRAME} strokeWidth="6" strokeLinecap="round" />
            <Line x1="56" y1="102" x2="114" y2="60" stroke={BENCH_PAD} strokeWidth="8.5" strokeLinecap="round" />
            <Line x1="50" y1="106" x2="68" y2="104" stroke={BENCH_PAD} strokeWidth="7" strokeLinecap="round" />
            <Circle cx="116" cy="54" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 62 100 L 74 102 L 110 62 L 100 58 Z" fill={BODY_SKIN_SHADOW} />
            <Path d="M 62 102 L 48 114 L 44 126" stroke={BODY_DEEP} strokeWidth="6" strokeLinecap="round" fill="none" />
            <Path d="M 70 104 L 60 116 L 58 126" stroke="url(#athleteFlesh)" strokeWidth="6" strokeLinecap="round" fill="none" />
            <Path d="M 98 62 L 96 82" stroke="url(#athleteFlesh)" strokeWidth="6" strokeLinecap="round" />
            {/* ACTIVE BICEPS */}
            <Path
              d="M 93 68 C 88 72, 88 80, 95 82 C 99 82, 100 75, 96 68 Z"
              fill="url(#activeMuscle)"
              stroke={HIGHLIGHT_STROKE}
              strokeWidth="1"
            />
            <Path d="M 96 82 L 110 80 L 116 66" stroke="url(#athleteFlesh)" strokeWidth="5.5" strokeLinecap="round" fill="none" />
            <Rect x="108" y="64" width="16" height="4" rx="1" fill="url(#steelBar)" />
            <Rect x="108" y="56" width="4" height="20" rx="1.5" fill="url(#castIronPlate)" stroke="#111" strokeWidth="0.8" />
            <Rect x="120" y="56" width="4" height="20" rx="1.5" fill="url(#castIronPlate)" stroke="#111" strokeWidth="0.8" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 18. Concentration Curl (Curl concentrado)                */}
        {/* ======================================================== */}
        {scene === 'concentration_curl' && (
          <G id="concentrationCurl">
            <Line x1="30" y1="126" x2="160" y2="126" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Rect x="42" y="88" width="76" height="8" rx="2" fill={BENCH_PAD} />
            <Rect x="50" y="96" width="6" height="30" fill={STEEL_FRAME} />
            <Circle cx="88" cy="46" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 56 86 L 68 86 L 94 54 L 84 50 Z" fill={BODY_SKIN_SHADOW} />
            <Path d="M 68 86 L 82 92 L 86 126" stroke={BODY_DEEP} strokeWidth="6" strokeLinecap="round" fill="none" />
            <Path d="M 58 86 L 106 90 L 114 126" stroke={BODY_SKIN_MID} strokeWidth="6" strokeLinecap="round" fill="none" />
            <Line x1="88" y1="56" x2="98" y2="88" stroke="url(#athleteFlesh)" strokeWidth="6" strokeLinecap="round" />
            {/* ACTIVE PEAK BICEP */}
            <Circle cx="94" cy="74" r="6" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Line x1="98" y1="88" x2="88" y2="68" stroke="url(#athleteFlesh)" strokeWidth="5" strokeLinecap="round" />
            <Rect x="80" y="66" width="16" height="4" rx="1" fill="url(#steelBar)" />
            <Rect x="80" y="58" width="4" height="20" rx="1.5" fill="url(#castIronPlate)" stroke="#111" strokeWidth="0.8" />
            <Rect x="92" y="58" width="4" height="20" rx="1.5" fill="url(#castIronPlate)" stroke="#111" strokeWidth="0.8" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 19. Tricep Pushdown Cable                                */}
        {/* ======================================================== */}
        {scene === 'tricep_pushdown' && (
          <G id="tricepPushdown">
            <Rect x="135" y="14" width="8" height="118" rx="2" fill={CABLE_TOWER} />
            <Circle cx="139" cy="18" r="4" fill="#333" />
            <Circle cx="85" cy="44" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 79 52 L 93 52 L 89 88 L 81 88 Z" fill={BODY_SKIN_SHADOW} />
            {/* ACTIVE TRICEPS */}
            <Path d="M 87 54 C 93 52, 98 60, 96 68 C 93 68, 87 62, 87 54 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Path d="M 87 54 L 94 70 L 108 90" stroke="url(#athleteFlesh)" strokeWidth="5" fill="none" strokeLinecap="round" />
            <Line x1="139" y1="18" x2="108" y2="90" stroke="#606070" strokeWidth="1.5" />
            <Path d="M 81 88 L 75 128" stroke={BODY_DEEP} strokeWidth="6" fill="none" strokeLinecap="round" />
            <Path d="M 89 88 L 93 128" stroke={BODY_SKIN_SHADOW} strokeWidth="6" fill="none" strokeLinecap="round" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 20. Tricep Skullcrusher (Press Francés)                  */}
        {/* ======================================================== */}
        {scene === 'tricep_skullcrusher' && (
          <G id="tricepSkullcrusher">
            <Line x1="28" y1="124" x2="152" y2="124" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Rect x="48" y="94" width="7" height="28" rx="1" fill={STEEL_FRAME} />
            <Rect x="116" y="94" width="7" height="28" rx="1" fill={STEEL_FRAME} />
            <Rect x="38" y="90" width="94" height="8.5" rx="3" fill={BENCH_PAD} />
            <Circle cx="122" cy="86" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 64 88 L 116 88 L 114 93 L 64 93 Z" fill={BODY_SKIN_SHADOW} />
            <Path d="M 64 90 Q 50 102 46 122" stroke={BODY_DEEP} strokeWidth="6" strokeLinecap="round" fill="none" />
            <Line x1="112" y1="86" x2="114" y2="60" stroke="url(#athleteFlesh)" strokeWidth="6" strokeLinecap="round" />
            {/* ACTIVE TRICEP */}
            <Path d="M 112 62 C 117 62, 120 70, 118 78 C 114 78, 112 70, 112 62 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Line x1="114" y1="60" x2="134" y2="70" stroke="url(#athleteFlesh)" strokeWidth="5.5" strokeLinecap="round" />
            <Line x1="134" y1="52" x2="134" y2="88" stroke="url(#steelBar)" strokeWidth="3.5" strokeLinecap="round" />
            <Rect x="126" y="52" width="16" height="4" rx="1.5" fill="url(#castIronPlate)" />
            <Rect x="126" y="84" width="16" height="4" rx="1.5" fill="url(#castIronPlate)" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 21. Tricep Overhead Extension                            */}
        {/* ======================================================== */}
        {scene === 'tricep_overhead' && (
          <G id="tricepOverhead">
            <Line x1="30" y1="130" x2="170" y2="130" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Circle cx="95" cy="54" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 88 62 L 102 62 L 99 98 L 91 98 Z" fill="url(#athleteFlesh)" />
            <Line x1="95" y1="62" x2="98" y2="34" stroke="url(#athleteFlesh)" strokeWidth="6" strokeLinecap="round" />
            {/* ACTIVE TRICEPS */}
            <Path d="M 98 36 C 104 38, 104 50, 98 56 C 94 56, 94 44, 98 36 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Line x1="98" y1="34" x2="114" y2="48" stroke="url(#athleteFlesh)" strokeWidth="5.5" strokeLinecap="round" />
            <Rect x="110" y="44" width="14" height="4" rx="1" fill="url(#steelBar)" />
            <Rect x="107" y="38" width="5" height="16" rx="2" fill="url(#castIronPlate)" />
            <Rect x="121" y="38" width="5" height="16" rx="2" fill="url(#castIronPlate)" />
            <Path d="M 91 98 L 88 128" stroke={BODY_DEEP} strokeWidth="6" strokeLinecap="round" fill="none" />
            <Path d="M 99 98 L 102 128" stroke={BODY_SKIN_SHADOW} strokeWidth="6" fill="none" strokeLinecap="round" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 22. Seated Cable Row (Remo Gironda)                      */}
        {/* ======================================================== */}
        {scene === 'seated_cable_row' && (
          <G id="seatedCableRow">
            <Line x1="24" y1="126" x2="176" y2="126" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Rect x="150" y="30" width="14" height="96" rx="2" fill={STEEL_FRAME} />
            <Rect x="152" y="55" width="10" height="60" rx="1" fill="url(#castIronPlate)" />
            <Circle cx="148" cy="86" r="4" fill="#333" />
            <Line x1="128" y1="80" x2="134" y2="94" stroke={BENCH_PAD} strokeWidth="6" strokeLinecap="round" />
            <Rect x="44" y="98" width="48" height="7" rx="2" fill={BENCH_PAD} />
            <Circle cx="64" cy="54" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 56 96 L 70 96 L 74 62 L 60 62 Z" fill={BODY_SKIN_SHADOW} />
            {/* ACTIVE LATS & RHOMBOIDS */}
            <Path d="M 58 64 C 52 70, 52 82, 60 90 C 66 90, 68 82, 68 64 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Path d="M 70 96 L 102 90 L 128 86" stroke="url(#athleteFlesh)" strokeWidth="6.5" strokeLinecap="round" fill="none" />
            <Path d="M 72 66 L 86 78 L 84 84" stroke="url(#athleteFlesh)" strokeWidth="5.5" strokeLinecap="round" fill="none" />
            <Line x1="148" y1="86" x2="84" y2="84" stroke="#606070" strokeWidth="1.5" />
            <Path d="M 82 80 L 86 84 L 82 88" stroke="url(#steelBar)" strokeWidth="3" fill="none" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 23. Dumbbell Row (Remo Serrucho a una mano)              */}
        {/* ======================================================== */}
        {scene === 'dumbbell_row' && (
          <G id="dumbbellRow">
            <Line x1="24" y1="126" x2="160" y2="126" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Rect x="40" y="92" width="86" height="8" rx="2" fill={BENCH_PAD} />
            <Rect x="48" y="100" width="6" height="26" fill={STEEL_FRAME} />
            <Rect x="114" y="100" width="6" height="26" fill={STEEL_FRAME} />
            <Line x1="112" y1="72" x2="114" y2="92" stroke={BODY_SKIN_SHADOW} strokeWidth="5" strokeLinecap="round" />
            <Path d="M 68 82 L 68 92 L 52 92" stroke={BODY_DEEP} strokeWidth="6" strokeLinecap="round" fill="none" />
            <Line x1="72" y1="84" x2="80" y2="126" stroke="url(#athleteFlesh)" strokeWidth="6" strokeLinecap="round" />
            <Path d="M 68 80 L 112 70 L 108 62 L 66 72 Z" fill={BODY_SKIN_SHADOW} />
            <Circle cx="120" cy="62" r="7.5" fill="url(#athleteFlesh)" />
            {/* ACTIVE LAT */}
            <Path d="M 76 68 C 84 62, 98 62, 104 66 C 98 74, 84 76, 76 68 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Path d="M 98 66 L 96 52 L 94 74" stroke="url(#athleteFlesh)" strokeWidth="5.5" strokeLinecap="round" fill="none" />
            <Rect x="86" y="72" width="16" height="4" rx="1" fill="url(#steelBar)" />
            <Rect x="86" y="64" width="4.5" height="20" rx="1.5" fill="url(#castIronPlate)" stroke="#111" strokeWidth="0.8" />
            <Rect x="98" y="64" width="4.5" height="20" rx="1.5" fill="url(#castIronPlate)" stroke="#111" strokeWidth="0.8" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 24. Dumbbell Shoulder Press                              */}
        {/* ======================================================== */}
        {scene === 'dumbbell_shoulder_press' && (
          <G id="dumbbellShoulderPress">
            <Line x1="26" y1="126" x2="160" y2="126" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Rect x="95" y="46" width="10" height="52" rx="2" fill={BENCH_PAD} />
            <Rect x="84" y="98" width="32" height="6" rx="2" fill={BENCH_PAD} />
            <Rect x="97" y="104" width="6" height="22" fill={STEEL_FRAME} />
            <Circle cx="100" cy="40" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 92 48 L 108 48 L 105 98 L 95 98 Z" fill="url(#athleteFlesh)" />
            {/* ACTIVE DELTOIDS */}
            <Circle cx="89" cy="52" r="6" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Circle cx="111" cy="52" r="6" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Path d="M 89 52 L 78 36 L 76 22" stroke="url(#athleteFlesh)" strokeWidth="5.5" strokeLinecap="round" fill="none" />
            <Path d="M 111 52 L 122 36 L 124 22" stroke={BODY_SKIN_SHADOW} strokeWidth="5.5" fill="none" strokeLinecap="round" />
            <Rect x="67" y="20" width="18" height="4" rx="1" fill="url(#steelBar)" />
            <Rect x="67" y="12" width="4.5" height="20" rx="1.5" fill="url(#castIronPlate)" stroke="#111" strokeWidth="0.8" />
            <Rect x="80" y="12" width="4.5" height="20" rx="1.5" fill="url(#castIronPlate)" stroke="#111" strokeWidth="0.8" />
            <Rect x="115" y="20" width="18" height="4" rx="1" fill="url(#steelBar)" />
            <Rect x="115" y="12" width="4.5" height="20" rx="1.5" fill="url(#castIronPlate)" stroke="#111" strokeWidth="0.8" />
            <Rect x="128" y="12" width="4.5" height="20" rx="1.5" fill="url(#castIronPlate)" stroke="#111" strokeWidth="0.8" />
            <Path d="M 95 98 L 86 110 L 84 126" stroke={BODY_DEEP} strokeWidth="6" strokeLinecap="round" fill="none" />
            <Path d="M 105 98 L 114 110 L 116 126" stroke={BODY_SKIN_SHADOW} strokeWidth="6" fill="none" strokeLinecap="round" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 25. Face Pull / Rear Delt Fly                            */}
        {/* ======================================================== */}
        {scene === 'face_pull' && (
          <G id="facePull">
            <Line x1="20" y1="130" x2="180" y2="130" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Rect x="150" y="14" width="10" height="112" rx="2" fill={STEEL_FRAME} />
            <Circle cx="148" cy="24" r="4" fill="#333" />
            <Circle cx="86" cy="42" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 80 50 L 94 50 L 90 88 L 80 88 Z" fill="url(#athleteFlesh)" />
            {/* ACTIVE REAR DELTOIDS */}
            <Path d="M 78 50 C 74 54, 76 66, 84 66 C 88 66, 88 56, 84 50 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Path d="M 82 52 L 72 44 L 88 38" stroke="url(#athleteFlesh)" strokeWidth="5.5" strokeLinecap="round" fill="none" />
            <Path d="M 92 52 L 104 44 L 96 36" stroke={BODY_SKIN_SHADOW} strokeWidth="5.5" fill="none" strokeLinecap="round" />
            <Line x1="148" y1="24" x2="88" y2="38" stroke="#606070" strokeWidth="1.5" />
            <Line x1="148" y1="24" x2="96" y2="36" stroke="#606070" strokeWidth="1.5" />
            <Path d="M 80 88 L 72 108 L 68 128" stroke={BODY_DEEP} strokeWidth="6" strokeLinecap="round" fill="none" />
            <Path d="M 90 88 L 102 108 L 106 128" stroke={BODY_SKIN_SHADOW} strokeWidth="6" fill="none" strokeLinecap="round" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 26. Leg Extension Machine                                */}
        {/* ======================================================== */}
        {scene === 'leg_extension_machine' && (
          <G id="legExtension">
            <Line x1="28" y1="126" x2="160" y2="126" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Rect x="42" y="60" width="14" height="54" rx="2" fill="url(#castIronPlate)" />
            <Rect x="64" y="52" width="8" height="48" rx="2" fill={BENCH_PAD} />
            <Rect x="66" y="96" width="38" height="7" rx="2" fill={BENCH_PAD} />
            <Rect x="78" y="103" width="6" height="23" fill={STEEL_FRAME} />
            <Path d="M 104 98 L 136 86" stroke={STEEL_FRAME} strokeWidth="4" strokeLinecap="round" />
            <Circle cx="136" cy="86" r="6" fill={BENCH_PAD} />
            <Circle cx="72" cy="44" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 68 52 L 80 52 L 78 96 L 68 96 Z" fill={BODY_SKIN_SHADOW} />
            <Line x1="76" y1="94" x2="104" y2="94" stroke={BODY_SKIN_SHADOW} strokeWidth="8" strokeLinecap="round" />
            {/* ACTIVE QUADRICEPS */}
            <Path d="M 80 90 C 88 84, 100 84, 106 92 C 100 96, 86 96, 80 90 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Line x1="104" y1="94" x2="134" y2="86" stroke="url(#athleteFlesh)" strokeWidth="6.5" strokeLinecap="round" />
            <Rect x="134" y="80" width="10" height="6" rx="2" fill={BODY_CONTOUR} />
          </G>
        )}

        {/* ======================================================== */}
        {/* 27. Leg Curl Machine                                     */}
        {/* ======================================================== */}
        {scene === 'leg_curl_machine' && (
          <G id="legCurl">
            <Line x1="30" y1="126" x2="150" y2="126" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Path d="M 44 94 L 88 84 L 126 94" stroke={BENCH_PAD} strokeWidth="8" strokeLinecap="round" fill="none" />
            <Rect x="54" y="98" width="6" height="28" fill={STEEL_FRAME} />
            <Rect x="114" y="98" width="6" height="28" fill={STEEL_FRAME} />
            <Rect x="144" y="60" width="12" height="52" rx="2" fill="url(#castIronPlate)" />
            <Circle cx="44" cy="80" r="7" fill="url(#athleteFlesh)" />
            <Path d="M 48 88 L 86 80 L 86 86 L 48 92 Z" fill={BODY_SKIN_SHADOW} />
            <Line x1="86" y1="82" x2="114" y2="90" stroke={BODY_SKIN_SHADOW} strokeWidth="7" strokeLinecap="round" />
            {/* ACTIVE HAMSTRINGS */}
            <Path d="M 88 78 C 96 72, 108 76, 114 84 C 108 88, 96 86, 88 78 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Line x1="114" y1="90" x2="100" y2="60" stroke="url(#athleteFlesh)" strokeWidth="6" strokeLinecap="round" />
            <Circle cx="100" cy="60" r="6" fill={BENCH_PAD} />
          </G>
        )}

        {/* ======================================================== */}
        {/* 28. Bulgarian Split Squat / Lunges                       */}
        {/* ======================================================== */}
        {scene === 'bulgarian_split_squat' && (
          <G id="bulgarianSplitSquat">
            <Line x1="20" y1="130" x2="180" y2="130" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Rect x="38" y="90" width="34" height="7" rx="2" fill={BENCH_PAD} />
            <Rect x="50" y="97" width="5" height="29" fill={STEEL_FRAME} />
            <Path d="M 94 76 L 68 86 L 54 90" stroke={BODY_DEEP} strokeWidth="6" strokeLinecap="round" fill="none" />
            <Path d="M 98 76 L 122 84 L 122 126" stroke="url(#athleteFlesh)" strokeWidth="6.5" strokeLinecap="round" fill="none" />
            {/* ACTIVE QUAD & GLUTE */}
            <Path d="M 98 74 C 108 72, 118 76, 122 84 C 116 90, 104 88, 98 74 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Circle cx="96" cy="76" r="6" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Path d="M 92 48 L 104 48 L 100 76 L 92 76 Z" fill="url(#athleteFlesh)" />
            <Circle cx="98" cy="40" r="7.5" fill="url(#athleteFlesh)" />
            <Line x1="94" y1="52" x2="92" y2="76" stroke="url(#athleteFlesh)" strokeWidth="4.5" strokeLinecap="round" />
            <Rect x="85" y="74" width="14" height="4" rx="1" fill="url(#steelBar)" />
            <Rect x="85" y="68" width="4" height="16" rx="1.5" fill="url(#castIronPlate)" />
            <Rect x="95" y="68" width="4" height="16" rx="1.5" fill="url(#castIronPlate)" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 29. Deadlift Barbell (Conventional / Sumo)               */}
        {/* ======================================================== */}
        {scene === 'deadlift_barbell' && (
          <G id="deadliftBarbell">
            <Line x1="20" y1="130" x2="180" y2="130" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Line x1="50" y1="108" x2="150" y2="108" stroke="url(#steelBar)" strokeWidth="4" strokeLinecap="round" />
            <Rect x="58" y="80" width="8" height="48" rx="2.5" fill="url(#castIronPlate)" stroke="#111" strokeWidth="1" />
            <Rect x="134" y="80" width="8" height="48" rx="2.5" fill="url(#castIronPlate)" stroke="#111" strokeWidth="1" />
            <Circle cx="120" cy="52" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 80 82 L 90 82 L 122 58 L 114 54 Z" fill={BODY_SKIN_SHADOW} />
            {/* ACTIVE POSTERIOR CHAIN */}
            <Circle cx="82" cy="84" r="7" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Path d="M 80 84 C 74 94, 76 108, 84 116 C 90 116, 90 102, 88 86 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Path d="M 94 76 C 104 68, 114 62, 118 64 C 114 74, 102 80, 94 76 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Path d="M 82 86 L 86 108 L 86 128" stroke={BODY_DEEP} strokeWidth="6" strokeLinecap="round" fill="none" />
            <Line x1="114" y1="58" x2="98" y2="108" stroke="url(#athleteFlesh)" strokeWidth="5" strokeLinecap="round" />
            <Line x1="118" y1="58" x2="110" y2="108" stroke={BODY_SKIN_SHADOW} strokeWidth="5" strokeLinecap="round" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 30. Romanian Deadlift                                    */}
        {/* ======================================================== */}
        {scene === 'romanian_deadlift' && (
          <G id="romanianDeadlift">
            <Line x1="20" y1="130" x2="180" y2="130" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Circle cx="132" cy="54" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 84 88 L 96 88 L 128 58 L 120 54 Z" fill={BODY_SKIN_SHADOW} />
            {/* ACTIVE HAMSTRINGS & GLUTES */}
            <Path
              d="M 83 88 C 78 96, 78 108, 85 116 C 91 116, 93 104, 93 88 Z"
              fill="url(#activeMuscle)"
              stroke={HIGHLIGHT_STROKE}
              strokeWidth="1"
            />
            <Path d="M 85 116 L 85 128" stroke={BODY_DEEP} strokeWidth="6" fill="none" strokeLinecap="round" />
            <Path d="M 118 58 L 102 96" stroke="url(#athleteFlesh)" strokeWidth="5.5" fill="none" strokeLinecap="round" />
            <Line x1="58" y1="96" x2="145" y2="96" stroke="url(#steelBar)" strokeWidth="4" strokeLinecap="round" />
            <Rect x="66" y="74" width="7" height="44" rx="2" fill="url(#castIronPlate)" />
            <Rect x="135" y="74" width="7" height="44" rx="2" fill="url(#castIronPlate)" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 31. Hip Thrust with Barbell                              */}
        {/* ======================================================== */}
        {scene === 'hip_thrust_barbell' && (
          <G id="hipThrust">
            <Rect x="110" y="86" width="30" height="34" rx="3" fill={BENCH_PAD} />
            <Circle cx="126" cy="74" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 122 80 L 85 80 L 85 87 L 122 87 Z" fill={BODY_SKIN_SHADOW} />
            {/* ACTIVE GLUTES */}
            <Circle cx="88" cy="83" r="7.5" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Path d="M 85 82 L 54 82 L 54 122" stroke="url(#athleteFlesh)" strokeWidth="6.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Line x1="58" y1="78" x2="116" y2="78" stroke="url(#steelBar)" strokeWidth="4" strokeLinecap="round" />
            <Rect x="64" y="58" width="7" height="40" rx="2" fill="url(#castIronPlate)" />
            <Rect x="105" y="58" width="7" height="40" rx="2" fill="url(#castIronPlate)" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 32. Standing Calf Raise                                  */}
        {/* ======================================================== */}
        {scene === 'calf_raise_standing' && (
          <G id="calfRaise">
            <Line x1="20" y1="130" x2="180" y2="130" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Rect x="84" y="122" width="34" height="8" rx="2" fill="#383842" />
            <Circle cx="100" cy="36" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 93 44 L 107 44 L 104 84 L 96 84 Z" fill="url(#athleteFlesh)" />
            <Path d="M 96 84 L 96 104" stroke={BODY_SKIN_SHADOW} strokeWidth="6" fill="none" strokeLinecap="round" />
            <Path d="M 104 84 L 104 104" stroke={BODY_SKIN_SHADOW} strokeWidth="6" fill="none" strokeLinecap="round" />
            {/* ACTIVE CALVES */}
            <Path d="M 93 104 C 89 108, 89 114, 95 118 C 98 118, 99 112, 97 104 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Path d="M 107 104 C 111 108, 111 114, 105 118 C 102 118, 101 112, 103 104 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Path d="M 95 118 L 91 121" stroke={BODY_CONTOUR} strokeWidth="4.5" fill="none" strokeLinecap="round" />
            <Path d="M 105 118 L 109 121" stroke={BODY_CONTOUR} strokeWidth="4.5" fill="none" strokeLinecap="round" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 33. Hanging Leg Raise / Abdominal Crunch                 */}
        {/* ======================================================== */}
        {(scene === 'hanging_leg_raise' || scene === 'ab_crunch') && (
          <G id="absExercise">
            <Line x1="36" y1="16" x2="164" y2="16" stroke={STEEL_DARK} strokeWidth="4" strokeLinecap="round" />
            <Circle cx="100" cy="32" r="7.5" fill="url(#athleteFlesh)" />
            {/* ACTIVE SIX-PACK */}
            <Rect x="95" y="48" width="10" height="24" rx="3" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Line x1="100" y1="48" x2="100" y2="72" stroke="#9A1010" strokeWidth="1.2" />
            <Line x1="95" y1="54" x2="105" y2="54" stroke="#9A1010" strokeWidth="1.2" />
            <Line x1="95" y1="60" x2="105" y2="60" stroke="#9A1010" strokeWidth="1.2" />
            <Line x1="95" y1="66" x2="105" y2="66" stroke="#9A1010" strokeWidth="1.2" />
            <Path d="M 93 40 L 85 28 L 85 18" stroke="url(#athleteFlesh)" strokeWidth="5" fill="none" strokeLinecap="round" />
            <Path d="M 107 40 L 115 28 L 115 18" stroke={BODY_SKIN_SHADOW} strokeWidth="5" fill="none" strokeLinecap="round" />
            <Path d="M 100 72 L 66 76 L 38 76" stroke={BODY_SKIN_SHADOW} strokeWidth="6" fill="none" strokeLinecap="round" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 34. Parallel Chest / Tricep Dips                         */}
        {/* ======================================================== */}
        {scene === 'chest_dips' && (
          <G id="chestDips">
            <Line x1="20" y1="130" x2="180" y2="130" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Rect x="64" y="58" width="6" height="68" fill={STEEL_FRAME} />
            <Rect x="130" y="58" width="6" height="68" fill={STEEL_FRAME} />
            <Line x1="56" y1="58" x2="138" y2="58" stroke={STEEL_DARK} strokeWidth="5" strokeLinecap="round" />
            <Circle cx="104" cy="30" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 94 38 L 108 38 L 102 74 L 92 74 Z" fill={BODY_SKIN_SHADOW} />
            {/* ACTIVE CHEST / TRICEPS */}
            <Path d="M 96 42 C 100 40, 108 40, 110 44 C 110 52, 104 56, 98 56 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Circle cx="86" cy="52" r="5" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Path d="M 94 40 L 84 50 L 78 58" stroke="url(#athleteFlesh)" strokeWidth="5.5" strokeLinecap="round" fill="none" />
            <Path d="M 108 40 L 118 50 L 122 58" stroke={BODY_SKIN_SHADOW} strokeWidth="5.5" fill="none" strokeLinecap="round" />
            <Path d="M 94 74 L 88 96 L 94 108" stroke={BODY_DEEP} strokeWidth="5.5" strokeLinecap="round" fill="none" />
            <Path d="M 100 74 L 96 96 L 98 108" stroke={BODY_SKIN_SHADOW} strokeWidth="5.5" fill="none" strokeLinecap="round" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 35. Pushups                                              */}
        {/* ======================================================== */}
        {scene === 'pushups' && (
          <G id="pushups">
            <Line x1="20" y1="126" x2="180" y2="126" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Circle cx="52" cy="80" r="7.5" fill="url(#athleteFlesh)" />
            <Path d="M 58 84 L 112 88 L 112 96 L 58 92 Z" fill={BODY_SKIN_SHADOW} />
            {/* ACTIVE PECTORAL & TRICEPS */}
            <Path d="M 64 86 C 72 82, 84 84, 88 90 C 82 94, 70 94, 64 86 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Circle cx="76" cy="94" r="5" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Path d="M 68 86 L 76 104 L 76 126" stroke="url(#athleteFlesh)" strokeWidth="5.5" strokeLinecap="round" fill="none" />
            <Path d="M 112 90 L 152 110 L 156 124" stroke={BODY_DEEP} strokeWidth="6" strokeLinecap="round" fill="none" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 36. Plank                                                */}
        {/* ======================================================== */}
        {scene === 'plank' && (
          <G id="plank">
            <Line x1="20" y1="126" x2="180" y2="126" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Circle cx="50" cy="88" r="7.5" fill="url(#athleteFlesh)" />
            <Line x1="64" y1="126" x2="80" y2="126" stroke={BODY_CONTOUR} strokeWidth="4" strokeLinecap="round" />
            <Line x1="64" y1="94" x2="64" y2="126" stroke="url(#athleteFlesh)" strokeWidth="5.5" strokeLinecap="round" />
            <Path d="M 62 94 L 118 94 L 118 104 L 62 104 Z" fill={BODY_SKIN_SHADOW} />
            {/* ACTIVE CORE */}
            <Rect x="78" y="96" width="30" height="7" rx="2" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Line x1="118" y1="96" x2="160" y2="124" stroke={BODY_DEEP} strokeWidth="6" strokeLinecap="round" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 37. Hyperextensions 45                                   */}
        {/* ======================================================== */}
        {scene === 'hyperextensions' && (
          <G id="hyperextensions">
            <Line x1="20" y1="126" x2="180" y2="126" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Line x1="42" y1="126" x2="108" y2="60" stroke={STEEL_FRAME} strokeWidth="6.5" strokeLinecap="round" />
            <Line x1="96" y1="72" x2="114" y2="54" stroke={BENCH_PAD} strokeWidth="9" strokeLinecap="round" />
            <Circle cx="56" cy="116" r="6" fill={BENCH_PAD} />
            <Line x1="56" y1="116" x2="106" y2="66" stroke={BODY_DEEP} strokeWidth="6.5" strokeLinecap="round" />
            <Path d="M 106 66 L 142 50 L 146 58 L 110 74 Z" fill={BODY_SKIN_SHADOW} />
            <Circle cx="148" cy="44" r="7.5" fill="url(#athleteFlesh)" />
            {/* ACTIVE LOWER BACK & GLUTES */}
            <Circle cx="106" cy="66" r="7" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Path d="M 112 62 C 120 54, 132 50, 136 54 C 132 62, 120 66, 112 62 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Path d="M 134 50 L 126 56 L 138 60" stroke="url(#athleteFlesh)" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 38. Shrugs (Encogimientos de trapecio)                   */}
        {/* ======================================================== */}
        {scene === 'shrugs' && (
          <G id="shrugs">
            <Line x1="20" y1="130" x2="180" y2="130" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Circle cx="100" cy="36" r="7.5" fill="url(#athleteFlesh)" />
            {/* ACTIVE TRAPEZIUS */}
            <Path d="M 84 46 C 90 38, 96 38, 100 42 C 104 38, 110 38, 116 46 C 110 52, 90 52, 84 46 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Path d="M 88 50 L 112 50 L 106 90 L 94 90 Z" fill={BODY_SKIN_SHADOW} />
            <Line x1="86" y1="48" x2="74" y2="84" stroke="url(#athleteFlesh)" strokeWidth="5.5" strokeLinecap="round" />
            <Line x1="114" y1="48" x2="126" y2="84" stroke={BODY_SKIN_SHADOW} strokeWidth="5.5" fill="none" strokeLinecap="round" />
            <Rect x="64" y="82" width="18" height="4" rx="1" fill="url(#steelBar)" />
            <Rect x="64" y="74" width="5" height="20" rx="1.5" fill="url(#castIronPlate)" />
            <Rect x="77" y="74" width="5" height="20" rx="1.5" fill="url(#castIronPlate)" />
            <Rect x="118" y="82" width="18" height="4" rx="1" fill="url(#steelBar)" />
            <Rect x="118" y="74" width="5" height="20" rx="1.5" fill="url(#castIronPlate)" />
            <Rect x="131" y="74" width="5" height="20" rx="1.5" fill="url(#castIronPlate)" />
            <Path d="M 94 90 L 92 128" stroke={BODY_DEEP} strokeWidth="6" strokeLinecap="round" fill="none" />
            <Path d="M 106 90 L 108 128" stroke={BODY_SKIN_SHADOW} strokeWidth="6" fill="none" strokeLinecap="round" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 39. Wrist Curl (Curl de antebrazo / muñeca)              */}
        {/* ======================================================== */}
        {scene === 'wrist_curl' && (
          <G id="wristCurl">
            <Line x1="20" y1="130" x2="180" y2="130" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Rect x="46" y="90" width="70" height="8" rx="2" fill={BENCH_PAD} />
            <Rect x="52" y="98" width="6" height="28" fill={STEEL_FRAME} />
            <Path d="M 64 88 L 86 64 L 98 68 L 80 92 Z" fill={BODY_SKIN_SHADOW} />
            <Circle cx="102" cy="56" r="7.5" fill="url(#athleteFlesh)" />
            <Line x1="84" y1="84" x2="116" y2="84" stroke="url(#athleteFlesh)" strokeWidth="6.5" strokeLinecap="round" />
            {/* ACTIVE FOREARMS */}
            <Rect x="88" y="80" width="22" height="7" rx="3" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            <Circle cx="120" cy="80" r="4.5" fill={BODY_CONTOUR} />
            <Line x1="120" y1="62" x2="120" y2="98" stroke="url(#steelBar)" strokeWidth="3.5" strokeLinecap="round" />
            <Circle cx="120" cy="66" r="7" fill="url(#castIronPlate)" />
            <Circle cx="120" cy="94" r="7" fill="url(#castIronPlate)" />
          </G>
        )}

        {/* ======================================================== */}
        {/* 40. Universal Guaranteed Fallback Muscular Silhouette   */}
        {/* Renders whenever an exercise does not have a custom scene*/}
        {/* NEVER leaves an exercise card blank!                     */}
        {/* ======================================================== */}
        {!isCustomScene && (
          <G id="genericAnatomyFigure">
            <Line x1="20" y1="130" x2="180" y2="130" stroke={STEEL_DARK} strokeWidth="3" strokeLinecap="round" />
            <Circle cx="100" cy="36" r="8" fill="url(#athleteFlesh)" />
            <Rect x="97" y="43" width="6" height="6" fill={BODY_SKIN_MID} />
            <Path d="M 87 48 L 113 48 L 107 88 L 93 88 Z" fill="url(#athleteFlesh)" />

            {/* Targeted Muscle Highlights */}
            {primaryMuscle === 'pectoral' && (
              <Path d="M 90 50 C 94 48, 106 48, 110 50 C 111 59, 106 65, 100 66 C 94 65, 89 59, 90 50 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            )}
            {primaryMuscle === 'hombros' && (
              <G>
                <Circle cx="85" cy="51" r="5.5" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
                <Circle cx="115" cy="51" r="5.5" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
              </G>
            )}
            {primaryMuscle === 'biceps' && (
              <G>
                <Circle cx="83" cy="64" r="5.5" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
                <Circle cx="117" cy="64" r="5.5" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
              </G>
            )}
            {primaryMuscle === 'triceps' && (
              <G>
                <Circle cx="81" cy="62" r="5.5" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
                <Circle cx="119" cy="62" r="5.5" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
              </G>
            )}
            {primaryMuscle === 'trapecio' && (
              <Path d="M 91 46 L 109 46 L 104 55 L 96 55 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            )}
            {(primaryMuscle === 'abdomen' || primaryMuscle === 'oblicuos') && (
              <Rect x="95" y="64" width="10" height="20" rx="3" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
            )}
            {primaryMuscle === 'cuadriceps' && (
              <G>
                <Path d="M 93 88 C 87 94, 87 108, 93 114 L 97 88 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
                <Path d="M 107 88 C 113 94, 113 108, 107 114 L 103 88 Z" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
              </G>
            )}
            {(primaryMuscle === 'isquiotibiales' || primaryMuscle === 'gluteos') && (
              <G>
                <Circle cx="94" cy="94" r="6" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
                <Circle cx="106" cy="94" r="6" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
              </G>
            )}
            {primaryMuscle === 'pantorrillas' && (
              <G>
                <Circle cx="94" cy="120" r="4.5" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
                <Circle cx="106" cy="120" r="4.5" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
              </G>
            )}
            {primaryMuscle === 'antebrazo' && (
              <G>
                <Rect x="80" y="70" width="6" height="14" rx="2" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
                <Rect x="114" y="70" width="6" height="14" rx="2" fill="url(#activeMuscle)" stroke={HIGHLIGHT_STROKE} strokeWidth="1" />
              </G>
            )}

            <Path d="M 87 50 L 81 72 L 81 86" stroke="url(#athleteFlesh)" strokeWidth="5" fill="none" strokeLinecap="round" />
            <Path d="M 113 50 L 119 72 L 119 86" stroke={BODY_SKIN_SHADOW} strokeWidth="5" fill="none" strokeLinecap="round" />
            <Path d="M 94 88 L 92 110 L 92 128" stroke={BODY_DEEP} strokeWidth="6" fill="none" strokeLinecap="round" />
            <Path d="M 106 88 L 108 110 L 108 128" stroke={BODY_SKIN_SHADOW} strokeWidth="6" fill="none" strokeLinecap="round" />

            {equipment === 'barra' && (
              <Line x1="56" y1="86" x2="144" y2="86" stroke="url(#steelBar)" strokeWidth="3.5" strokeLinecap="round" />
            )}
            {equipment === 'mancuerna' && (
              <G>
                <Rect x="75" y="84" width="13" height="4" rx="1" fill="url(#steelBar)" />
                <Rect x="112" y="84" width="13" height="4" rx="1" fill="url(#steelBar)" />
              </G>
            )}
            {equipment === 'polea' && (
              <Line x1="81" y1="86" x2="100" y2="20" stroke="#606070" strokeWidth="1.5" />
            )}
          </G>
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
