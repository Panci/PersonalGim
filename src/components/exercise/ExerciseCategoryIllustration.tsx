import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { ExerciseCategory } from '../../data/exerciseCategories';

export const ExerciseCategoryIllustration: React.FC<{ category: ExerciseCategory }> = ({ category }) => {
  const skin = '#B7BEC8';
  const shadow = '#777F8B';
  const deep = '#353B44';
  const accent = category.color;
  const back = category.side === 'back';

  return (
    <Svg width="100%" height="100%" viewBox="0 0 220 150" fill="none">
      <Ellipse cx="110" cy="142" rx="70" ry="4" fill="#0B0D10" opacity={0.55} />
      <Circle cx="110" cy="22" r="12" fill={deep} />
      <Path d="M93 39 Q110 29 127 39 L132 77 Q125 87 110 88 Q95 87 88 77Z" fill={skin} />
      <Path d="M94 42 Q110 34 126 42 L121 76 Q110 83 99 76Z" fill={shadow} opacity={0.55} />
      {!back && category.id === 'pecho' && <Path d="M91 45 Q101 37 110 46 Q119 37 129 45 L126 62 Q111 68 94 62Z" fill={accent} />}
      {back && category.id === 'espalda' && <Path d="M95 40 L110 55 L125 40 L130 72 Q110 84 90 72Z" fill={accent} />}
      {category.id === 'hombros' && <G fill={accent}><Circle cx="90" cy="45" r="9" /><Circle cx="130" cy="45" r="9" /></G>}
      {category.id === 'biceps' && <G fill={accent}><Ellipse cx="87" cy="67" rx="7" ry="15" /><Ellipse cx="133" cy="67" rx="7" ry="15" /></G>}
      {category.id === 'triceps' && <G fill={accent}><Ellipse cx="84" cy="67" rx="6" ry="14" /><Ellipse cx="136" cy="67" rx="6" ry="14" /></G>}
      {category.id === 'antebrazos' && <G stroke={accent} strokeWidth="7" strokeLinecap="round"><Line x1="84" y1="65" x2="73" y2="93" /><Line x1="136" y1="65" x2="147" y2="93" /></G>}
      {category.id === 'abdominales' && <Rect x="101" y="59" width="18" height="27" rx="7" fill={accent} />}
      {category.id === 'gluteos' && <G fill={accent}><Ellipse cx="101" cy="82" rx="13" ry="10" /><Ellipse cx="119" cy="82" rx="13" ry="10" /></G>}
      {category.id === 'piernas' && <G fill={accent}><Path d="M98 82 Q88 100 91 132 L105 132 Q107 108 110 88Z" /><Path d="M122 82 Q132 100 129 132 L115 132 Q113 108 110 88Z" /></G>}
      <Path d="M91 43 Q82 56 82 72 L72 91" stroke={skin} strokeWidth="8" strokeLinecap="round" />
      <Path d="M129 43 Q138 56 138 72 L148 91" stroke={shadow} strokeWidth="8" strokeLinecap="round" />
      <Path d="M100 86 L96 124" stroke={shadow} strokeWidth="9" strokeLinecap="round" />
      <Path d="M120 86 L124 124" stroke={deep} strokeWidth="9" strokeLinecap="round" />
    </Svg>
  );
};
