import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Line, Path, Rect, Stop } from 'react-native-svg';
import { ExerciseCategory } from '../../data/exerciseCategories';

/**
 * Compact anatomical illustrations used by the muscle-group cards.
 * These are intentionally vector based so they stay crisp on mobile and do
 * not add another set of raster assets to the exercise library.
 */
export const ExerciseCategoryIllustration: React.FC<{ category: ExerciseCategory }> = ({ category }) => {
  const skin = '#AEB7C4';
  const skinDark = '#697381';
  const outline = '#353B46';
  const shadow = '#101217';
  const accent = category.color;
  const front = category.side !== 'back';
  const gradientId = `figure-${category.id}`;

  return (
    <Svg width="100%" height="100%" viewBox="50 0 120 150" fill="none" preserveAspectRatio="xMidYMid meet">
      <Defs>
        <LinearGradient id={gradientId} x1="82" y1="24" x2="140" y2="126" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#D7DCE4" />
          <Stop offset="0.52" stopColor={skin} />
          <Stop offset="1" stopColor={skinDark} />
        </LinearGradient>
      </Defs>

      <Ellipse cx="110" cy="141" rx="72" ry="5" fill={shadow} opacity={0.7} />
      <Circle cx="110" cy="23" r="12" fill={`url(#${gradientId})`} stroke={outline} strokeWidth="2" />
      <Path d="M103 33h14v11h-14z" fill={skinDark} />

      {/* torso and back contour */}
      <Path
        d={front
          ? 'M91 42Q110 33 129 42L136 76Q130 88 110 91Q90 88 84 76Z'
          : 'M92 42Q110 34 128 42L134 77Q126 89 110 92Q94 89 86 77Z'}
        fill={`url(#${gradientId})`}
        stroke={outline}
        strokeWidth="2"
      />
      {front ? (
        <Path d="M110 44V86M91 59Q110 67 129 59" stroke={skinDark} strokeWidth="1.5" opacity={0.6} />
      ) : (
        <G stroke={skinDark} strokeWidth="1.5" opacity={0.6}>
          <Path d="M110 44V86" />
          <Path d="M95 50Q110 60 125 50" />
          <Path d="M96 69Q110 77 124 69" />
        </G>
      )}

      {/* shoulders and arms */}
      <Path d="M91 44Q80 49 78 66L70 91" stroke={skin} strokeWidth="9" strokeLinecap="round" />
      <Path d="M129 44Q140 49 142 66L150 91" stroke={skinDark} strokeWidth="9" strokeLinecap="round" />
      <Circle cx="78" cy="66" r="4" fill={skin} />
      <Circle cx="142" cy="66" r="4" fill={skinDark} />

      {/* legs */}
      <Path d="M99 86L96 124" stroke={skin} strokeWidth="11" strokeLinecap="round" />
      <Path d="M121 86L124 124" stroke={skinDark} strokeWidth="11" strokeLinecap="round" />
      <Path d="M94 126h9M120 126h10" stroke={outline} strokeWidth="4" strokeLinecap="round" />

      {/* Neutral muscle map, inspired by anatomical training charts. */}
      {front ? (
        <G fill="#65707E" opacity={0.7} stroke={outline} strokeWidth="0.7">
          <Path d="M91 48Q101 41 109 48L108 63Q98 66 91 60Z" />
          <Path d="M111 48Q119 41 129 48L129 60Q122 66 112 63Z" />
          <Path d="M100 62h8v10h-8zM112 62h8v10h-8zM100 75h8v9h-8zM112 75h8v9h-8z" />
          <Path d="M98 86Q105 88 109 88L105 119Q100 124 95 120Z" />
          <Path d="M122 86Q115 88 111 88L115 119Q120 124 125 120Z" />
        </G>
      ) : (
        <G fill="#65707E" opacity={0.7} stroke={outline} strokeWidth="0.7">
          <Path d="M96 45L110 57L124 45L128 60L110 70L92 60Z" />
          <Path d="M94 58Q102 61 108 65L105 83Q96 79 89 70Z" />
          <Path d="M126 58Q118 61 112 65L115 83Q124 79 131 70Z" />
          <Path d="M99 84Q105 88 110 88L105 105Q100 108 96 101Z" />
          <Path d="M121 84Q115 88 110 88L115 105Q120 108 124 101Z" />
        </G>
      )}

      {/* highlighted muscle group */}
      {category.id === 'pecho' && (
        <G fill={accent} opacity={0.96}>
          <Path d="M91 48Q101 41 109 48L108 63Q98 66 91 60Z" />
          <Path d="M111 48Q119 41 129 48L129 60Q122 66 112 63Z" />
        </G>
      )}
      {category.id === 'espalda' && (
        <G fill={accent} opacity={0.96}>
          <Path d="M95 48Q102 54 108 59L105 80Q96 79 89 71Z" />
          <Path d="M125 48Q118 54 112 59L115 80Q124 79 131 71Z" />
          <Path d="M108 49h4v36h-4z" opacity={0.55} />
        </G>
      )}
      {category.id === 'hombros' && (
        <G fill={accent} opacity={0.96}>
          <Ellipse cx="89" cy="48" rx="10" ry="8" />
          <Ellipse cx="131" cy="48" rx="10" ry="8" />
        </G>
      )}
      {category.id === 'biceps' && (
        <G fill={accent} opacity={0.96}>
          <Path d="M82 58Q89 52 94 60L89 78Q82 79 79 70Z" />
          <Path d="M138 58Q131 52 126 60L131 78Q138 79 141 70Z" />
        </G>
      )}
      {category.id === 'triceps' && (
        <G fill={accent} opacity={0.96}>
          <Path d="M77 58Q83 54 88 61L84 79Q78 78 75 69Z" />
          <Path d="M143 58Q137 54 132 61L136 79Q142 78 145 69Z" />
        </G>
      )}
      {category.id === 'antebrazos' && (
        <G stroke={accent} strokeWidth="8" strokeLinecap="round" opacity={0.96}>
          <Line x1="72" y1="78" x2="69" y2="94" />
          <Line x1="148" y1="78" x2="151" y2="94" />
        </G>
      )}
      {category.id === 'abdominales' && (
        <G fill={accent} opacity={0.96}>
          <Rect x="100" y="59" width="8" height="10" rx="3" />
          <Rect x="112" y="59" width="8" height="10" rx="3" />
          <Rect x="100" y="72" width="8" height="10" rx="3" />
          <Rect x="112" y="72" width="8" height="10" rx="3" />
        </G>
      )}
      {category.id === 'gluteos' && (
        <G fill={accent} opacity={0.96}>
          <Ellipse cx="100" cy="81" rx="12" ry="10" />
          <Ellipse cx="120" cy="81" rx="12" ry="10" />
        </G>
      )}
      {category.id === 'piernas' && (
        <G fill={accent} opacity={0.96}>
          <Path d="M98 84Q105 88 109 88L105 119Q100 124 95 120Z" />
          <Path d="M122 84Q115 88 111 88L115 119Q120 124 125 120Z" />
        </G>
      )}
      <Circle cx="110" cy="23" r="2" fill="#FFFFFF" opacity={0.32} />
    </Svg>
  );
};
