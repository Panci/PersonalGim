import React from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Exercise } from '../../types';
import { ExerciseIllustration } from './ExerciseIllustration';

interface ExerciseMovementPreviewProps {
  exercise: Exercise;
  width?: number;
  height?: number;
}

/**
 * Small exercise cue for workout screens. Web uses the downloaded SmartWorkout
 * clip so the movement is visible immediately; native falls back to the
 * downloaded/remote image until a native video player is added.
 */
export const ExerciseMovementPreview: React.FC<ExerciseMovementPreviewProps> = ({
  exercise,
  width = 82,
  height = 68,
}) => {
  const imageUri = Platform.OS === 'web' && exercise.localImagePath
    ? exercise.localImagePath
    : exercise.imageUrl || exercise.localImagePath;
  const videoUri = Platform.OS === 'web'
    ? exercise.localVideoPath || exercise.videoUrl
    : undefined;

  return (
    <View style={[styles.frame, { width, height }]} accessibilityLabel={`Movimiento de ${exercise.name}`}>
      {videoUri ? (
        React.createElement('video', {
          src: videoUri,
          autoPlay: true,
          muted: true,
          loop: true,
          playsInline: true,
          poster: imageUri,
          style: styles.video,
          'aria-label': `Movimiento de ${exercise.name}`,
        } as any)
      ) : imageUri ? (
        <Image
          source={{ uri: imageUri }}
          resizeMode="cover"
          style={styles.image}
          accessibilityLabel={`Imagen de ${exercise.name}`}
        />
      ) : (
        <ExerciseIllustration exercise={exercise} height={height} />
      )}
      {videoUri && (
        <View pointerEvents="none" style={styles.playBadge}>
          <Ionicons name="play" size={11} color="#FFFFFF" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#242428',
    borderWidth: 1,
    borderColor: '#34343A',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  } as any,
  playBadge: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
});
