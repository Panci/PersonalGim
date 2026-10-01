import React, { useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Exercise } from '../../types';
import { COLORS } from '../../theme/colors';
import { ExerciseIllustration } from './ExerciseIllustration';

interface ExerciseInfoModalProps {
  exercise: Exercise | null;
  onClose: () => void;
  onToggleFavorite: (exerciseId: string) => void;
  onAdd?: (exerciseId: string) => void;
}

export const ExerciseInfoModal: React.FC<ExerciseInfoModalProps> = ({ exercise, onClose, onToggleFavorite, onAdd }) => {
  const [showVideo, setShowVideo] = useState(false);
  if (!exercise) return null;

  const videoUri = Platform.OS === 'web' && exercise.localVideoPath
    ? exercise.localVideoPath
    : exercise.videoUrl;
  const close = () => {
    setShowVideo(false);
    onClose();
  };

  return (
    <>
      <Modal visible transparent animationType="slide" onRequestClose={close}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>{exercise.primaryMuscle.toUpperCase()}</Text>
                <Text style={styles.title}>{exercise.name}</Text>
              </View>
              <TouchableOpacity onPress={close} accessibilityRole="button" accessibilityLabel="Cerrar detalle del ejercicio" hitSlop={10}>
                <Ionicons name="close" size={24} color="#A1A1A6" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              <View style={styles.imageBox}>
                <TouchableOpacity
                  style={styles.favoriteButton}
                  onPress={() => onToggleFavorite(exercise.id)}
                  accessibilityRole="button"
                  accessibilityLabel={exercise.isFavorite ? `Quitar ${exercise.name} de favoritos` : `Marcar ${exercise.name} como favorito`}
                >
                  <Ionicons name={exercise.isFavorite ? 'star' : 'star-outline'} size={22} color={exercise.isFavorite ? '#FF9500' : '#8E8E93'} />
                </TouchableOpacity>
                <ExerciseIllustration exercise={exercise} height={210} />
              </View>

              <View style={styles.pills}>
                <Text style={styles.pill}>{exercise.equipment.toUpperCase().replace('_', ' ')}</Text>
                {exercise.secondaryMuscles.length > 0 && (
                  <Text style={styles.pill}>Secundarios: {exercise.secondaryMuscles.join(', ')}</Text>
                )}
              </View>

              {!!exercise.description && (
                <>
                  <Text style={styles.sectionTitle}>Descripción</Text>
                  <Text style={styles.paragraph}>{exercise.description}</Text>
                </>
              )}
              <Text style={styles.sectionTitle}>Instrucciones de ejecución</Text>
              <Text style={styles.paragraph}>{exercise.instructions || 'Sin instrucciones adicionales para este ejercicio.'}</Text>

              {!!exercise.executionSteps?.length && (
                <>
                  <Text style={styles.sectionTitle}>Pasos de ejecución</Text>
                  {exercise.executionSteps.map((step, index) => (
                    <View key={`${exercise.id}-step-${index}`} style={styles.guidanceRow}>
                      <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{index + 1}</Text></View>
                      <Text style={styles.guidanceText}>{step}</Text>
                    </View>
                  ))}
                </>
              )}

              {!!exercise.indications?.length && (
                <>
                  <Text style={styles.sectionTitle}>Indicaciones y seguridad</Text>
                  {exercise.indications.map((indication, index) => (
                    <View key={`${exercise.id}-indication-${index}`} style={styles.guidanceRow}>
                      <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.success} />
                      <Text style={styles.guidanceText}>{indication}</Text>
                    </View>
                  ))}
                </>
              )}

              {!!exercise.tips?.length && (
                <>
                  <Text style={styles.sectionTitle}>Consejos</Text>
                  {exercise.tips.map((tip, index) => (
                    <View key={`${exercise.id}-tip-${index}`} style={styles.guidanceRow}>
                      <Ionicons name="bulb-outline" size={18} color={COLORS.primary} />
                      <Text style={styles.guidanceText}>{tip}</Text>
                    </View>
                  ))}
                </>
              )}

              {!!exercise.commonMistakes?.length && (
                <>
                  <Text style={styles.sectionTitle}>Errores comunes</Text>
                  {exercise.commonMistakes.map((mistake, index) => (
                    <View key={`${exercise.id}-mistake-${index}`} style={styles.guidanceRow}>
                      <Ionicons name="warning-outline" size={18} color="#FF9500" />
                      <Text style={styles.guidanceText}>{mistake}</Text>
                    </View>
                  ))}
                </>
              )}

              {!!videoUri && (
                <TouchableOpacity style={styles.videoButton} onPress={() => setShowVideo(true)} accessibilityRole="button" accessibilityLabel={`Ver movimiento de ${exercise.name}`}>
                  <Ionicons name="play-circle-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.videoButtonText}>Ver movimiento del ejercicio</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <TouchableOpacity
              style={onAdd ? styles.actionButton : styles.closeButton}
              onPress={onAdd ? () => onAdd(exercise.id) : close}
              accessibilityRole="button"
              accessibilityLabel={onAdd ? `Añadir ${exercise.name} a la rutina` : 'Volver a ejercicios'}
            >
              <Text style={styles.actionText}>{onAdd ? 'Añadir a la rutina' : 'Volver a ejercicios'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {showVideo && !!videoUri && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowVideo(false)}>
          <View style={styles.videoOverlay}>
            <View style={styles.videoSheet}>
              <View style={styles.header}>
                <Text style={styles.videoTitle}>{exercise.name}</Text>
                <TouchableOpacity onPress={() => setShowVideo(false)} accessibilityLabel="Cerrar vídeo" hitSlop={10}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <View style={styles.videoFrame}>
                {Platform.OS === 'web' ? React.createElement('video', {
                  src: videoUri,
                  controls: true,
                  autoPlay: true,
                  playsInline: true,
                  poster: exercise.localImagePath || exercise.imageUrl,
                  style: styles.videoPlayer,
                  'aria-label': `Vídeo de ${exercise.name}`,
                } as any) : (
                  <Text style={styles.videoFallback}>El vídeo está disponible en la versión web de la biblioteca.</Text>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 430, maxHeight: '92%', backgroundColor: '#1C1C1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: '#34343A', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  headerCopy: { flex: 1, paddingRight: 12 },
  eyebrow: { color: COLORS.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.7 },
  title: { color: '#FFFFFF', fontSize: 21, fontWeight: '800', marginTop: 4 },
  scroll: { flexGrow: 0 },
  imageBox: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 10, marginBottom: 16, overflow: 'hidden' },
  favoriteButton: { position: 'absolute', top: 10, right: 10, zIndex: 1, padding: 7, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.94)' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  pill: { color: '#D1D1D6', fontSize: 12, fontWeight: '700', backgroundColor: '#26262A', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  sectionTitle: { color: '#8E8E93', fontSize: 12, fontWeight: '800', letterSpacing: 0.4, marginBottom: 8 },
  paragraph: { color: '#FFFFFF', fontSize: 14, lineHeight: 22, marginBottom: 18 },
  guidanceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  guidanceText: { flex: 1, color: '#D1D1D6', fontSize: 13, lineHeight: 19 },
  stepNumber: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.primaryTint(0.18), alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: COLORS.primary, fontSize: 11, fontWeight: '800' },
  videoButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.successTint(0.14), borderWidth: 1, borderColor: COLORS.successTint(0.35), borderRadius: 14, paddingVertical: 12, marginBottom: 8 },
  videoButtonText: { color: COLORS.success, fontSize: 14, fontWeight: '800' },
  actionButton: { backgroundColor: COLORS.primary, borderRadius: 14, alignItems: 'center', paddingVertical: 14, marginTop: 10 },
  closeButton: { backgroundColor: '#2C2C30', borderRadius: 14, alignItems: 'center', paddingVertical: 14, marginTop: 10 },
  actionText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  videoOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center', padding: 14 },
  videoSheet: { width: '100%', maxWidth: 430, backgroundColor: '#1C1C1E', borderRadius: 20, padding: 16 },
  videoTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', flex: 1, paddingRight: 12 },
  videoFrame: { width: '100%', aspectRatio: 16 / 9, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
  videoPlayer: { width: '100%', height: '100%', objectFit: 'contain', display: 'block', backgroundColor: '#000000' } as any,
  videoFallback: { color: '#D1D1D6', fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
});
