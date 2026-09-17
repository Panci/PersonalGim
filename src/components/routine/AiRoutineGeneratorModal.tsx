import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { generateAiRoutineRequest } from '../../auth/api';
import { useAuth } from '../../auth/AuthProvider';
import { EquipmentType, MemberLevel, MemberObjective, RoutineCollection, RoutineDay, RoutineExercise, WeekDay } from '../../types';
import { useWorkoutStore } from '../../store/workoutStore';
import { COLORS } from '../../theme/colors';
import { createId } from '../../utils/ids';

interface AiRoutineGeneratorModalProps {
  visible: boolean;
  onClose: () => void;
}

const weekdayOptions: Array<[WeekDay, string]> = [['lun', 'LUN'], ['mar', 'MAR'], ['mie', 'MIE'], ['jue', 'JUE'], ['vie', 'VIE'], ['sab', 'SAB'], ['dom', 'DOM']];
const objectiveOptions: Array<[MemberObjective, string]> = [['hipertrofia', 'Hipertrofia'], ['fuerza', 'Fuerza'], ['perdida_grasa', 'Pérdida grasa'], ['salud_general', 'Salud']];
const levelOptions: Array<[MemberLevel, string]> = [['principiante', 'Principiante'], ['intermedio', 'Intermedio'], ['avanzado', 'Avanzado']];
const equipmentOptions: Array<[EquipmentType, string]> = [['maquina', 'Máquinas'], ['barra', 'Barra'], ['mancuerna', 'Mancuernas'], ['polea', 'Poleas'], ['peso_corporal', 'Corporal'], ['cardio', 'Cardio'], ['otro', 'Otro']];
const sexOptions: Array<['mujer' | 'hombre' | 'no_especificado', string]> = [['mujer', 'Mujer'], ['hombre', 'Hombre'], ['no_especificado', 'No indicar']];

const initialRepetitions = (range: string) => {
  const firstNumber = Number(range.match(/\d+/)?.[0]);
  return Number.isFinite(firstNumber) && firstNumber > 0 ? firstNumber : 10;
};

export const AiRoutineGeneratorModal: React.FC<AiRoutineGeneratorModalProps> = ({ visible, onClose }) => {
  const { session } = useAuth();
  const { exercises, createRoutineTemplate } = useWorkoutStore();
  const [sex, setSex] = useState<'mujer' | 'hombre' | 'no_especificado'>('no_especificado');
  const [objective, setObjective] = useState<MemberObjective>('hipertrofia');
  const [level, setLevel] = useState<MemberLevel>('principiante');
  const [equipment, setEquipment] = useState<EquipmentType[]>(['maquina', 'peso_corporal']);
  const [trainingDays, setTrainingDays] = useState<WeekDay[]>(['lun', 'mie', 'vie']);
  const [weeklyStructure, setWeeklyStructure] = useState<'repetir_bloques' | 'dias_distintos'>('repetir_bloques');
  const [focus, setFocus] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const catalog = useMemo(() => exercises
    .filter((exercise) => equipment.includes(exercise.equipment))
    .slice(0, 300)
    .map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      primaryMuscle: exercise.primaryMuscle,
      equipment: exercise.equipment,
    })), [equipment, exercises]);

  const close = (force = false) => {
    if (generating && !force) return;
    setError('');
    onClose();
  };

  const toggleItem = <T,>(items: T[], value: T, setItems: (next: T[]) => void, preventEmpty = false) => {
    if (items.includes(value)) {
      if (preventEmpty && items.length === 1) return;
      setItems(items.filter((item) => item !== value));
      return;
    }
    setItems([...items, value]);
  };

  const createFromAi = async () => {
    if (!session) return;
    if (!equipment.length || !trainingDays.length) {
      setError('Selecciona al menos un material y un día de entrenamiento.');
      return;
    }
    if (catalog.length < 8) {
      setError('Ese material tiene pocos ejercicios disponibles. Selecciona otro material adicional.');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const plan = await generateAiRoutineRequest(session.token, {
        sex,
        objective,
        level,
        equipment,
        trainingDays,
        weeklyStructure,
        focus: focus.trim() || undefined,
        exerciseCatalog: catalog,
      });
      const collectionId = createId('collection');
      const days: RoutineDay[] = plan.blocks.map((block) => {
        const dayId = createId('routine-day');
        const routineExercises: RoutineExercise[] = block.exercises.map((exercise, index) => ({
          id: createId('routine-exercise'),
          routineId: dayId,
          exerciseId: exercise.exerciseId,
          orderIndex: index + 1,
          targetSets: exercise.sets,
          targetRepRange: exercise.repRange,
          targetWeightRange: 'Ajustar con técnica',
          targetRestSeconds: exercise.restSeconds,
          defaultSets: Array.from({ length: exercise.sets }, (_, setIndex) => ({
            id: createId('routine-set'),
            setNumber: setIndex + 1,
            type: 'normal' as const,
            reps: initialRepetitions(exercise.repRange),
            weightKg: 0,
            isCompleted: false,
            restSeconds: exercise.restSeconds,
          })),
        }));
        return {
          id: dayId,
          name: block.name,
          dayBadge: block.scheduledDays[0],
          scheduledDays: block.scheduledDays,
          estimatedMinutes: Math.max(25, routineExercises.length * 12),
          estimatedCalories: Math.max(180, routineExercises.length * 70),
          exercisesCount: routineExercises.length,
          exercises: routineExercises,
        };
      });
      const routine: RoutineCollection = { id: collectionId, title: plan.title, subtitle: plan.subtitle, days };
      await createRoutineTemplate({ id: collectionId, title: plan.title, subtitle: plan.subtitle, objective, level, equipment, routine });
      Alert.alert('Plantilla creada', 'Gemini ha creado una propuesta. Revísala antes de asignarla a un socio.');
      close(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo generar la rutina.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => close()}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>GEMINI · PROPUESTA REVISABLE</Text>
              <Text style={styles.title}>Crear plan con IA</Text>
              <Text style={styles.helper}>Elige el perfil y Gemini organizará las rutinas de la semana usando solo vuestra biblioteca.</Text>
            </View>
            <TouchableOpacity onPress={() => close()} style={styles.closeButton} accessibilityLabel="Cerrar creador con IA">
              <Ionicons name="close" size={22} color="#A1A1A6" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <Text style={styles.label}>SEXO</Text>
            <View style={styles.chipRow}>{sexOptions.map(([id, label]) => <TouchableOpacity key={id} onPress={() => setSex(id)} style={[styles.chip, sex === id && styles.chipActive]}><Text style={[styles.chipText, sex === id && styles.chipTextActive]}>{label}</Text></TouchableOpacity>)}</View>

            <Text style={styles.label}>QUÉ QUIERE MEJORAR</Text>
            <View style={styles.chipRow}>{objectiveOptions.map(([id, label]) => <TouchableOpacity key={id} onPress={() => setObjective(id)} style={[styles.chip, objective === id && styles.chipActive]}><Text style={[styles.chipText, objective === id && styles.chipTextActive]}>{label}</Text></TouchableOpacity>)}</View>

            <Text style={styles.label}>NIVEL</Text>
            <View style={styles.chipRow}>{levelOptions.map(([id, label]) => <TouchableOpacity key={id} onPress={() => setLevel(id)} style={[styles.chip, level === id && styles.chipActive]}><Text style={[styles.chipText, level === id && styles.chipTextActive]}>{label}</Text></TouchableOpacity>)}</View>

            <Text style={styles.label}>DÍAS DE ENTRENAMIENTO</Text>
            <View style={styles.weekdayRow}>{weekdayOptions.map(([id, label]) => <TouchableOpacity key={id} onPress={() => toggleItem(trainingDays, id, setTrainingDays, true)} style={[styles.weekday, trainingDays.includes(id) && styles.weekdayActive]}><Text style={[styles.weekdayText, trainingDays.includes(id) && styles.weekdayTextActive]}>{label}</Text></TouchableOpacity>)}</View>

            <Text style={styles.label}>ORGANIZACIÓN DE LA SEMANA</Text>
            <View style={styles.structureRow}>
              <TouchableOpacity onPress={() => setWeeklyStructure('repetir_bloques')} style={[styles.structureOption, weeklyStructure === 'repetir_bloques' && styles.structureOptionActive]} activeOpacity={0.8}>
                <MaterialCommunityIcons name="repeat" size={19} color={weeklyStructure === 'repetir_bloques' ? COLORS.primary : '#A1A1A6'} />
                <View style={styles.structureCopy}>
                  <Text style={[styles.structureTitle, weeklyStructure === 'repetir_bloques' && styles.structureTitleActive]}>Repetir bloques</Text>
                  <Text style={styles.structureHint}>La misma rutina puede aparecer en varios días.</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setWeeklyStructure('dias_distintos')} style={[styles.structureOption, weeklyStructure === 'dias_distintos' && styles.structureOptionActive]} activeOpacity={0.8}>
                <MaterialCommunityIcons name="calendar-multiselect" size={19} color={weeklyStructure === 'dias_distintos' ? COLORS.primary : '#A1A1A6'} />
                <View style={styles.structureCopy}>
                  <Text style={[styles.structureTitle, weeklyStructure === 'dias_distintos' && styles.structureTitleActive]}>Días distintos</Text>
                  <Text style={styles.structureHint}>Ejercicios y grupos musculares alternos cada día.</Text>
                </View>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>MATERIAL DISPONIBLE</Text>
            <View style={styles.chipRow}>{equipmentOptions.map(([id, label]) => <TouchableOpacity key={id} onPress={() => toggleItem(equipment, id, setEquipment, true)} style={[styles.chip, equipment.includes(id) && styles.chipActive]}><Text style={[styles.chipText, equipment.includes(id) && styles.chipTextActive]}>{label}</Text></TouchableOpacity>)}</View>
            <Text style={styles.caption}>{catalog.length} ejercicios de la biblioteca disponibles para Gemini.</Text>

            <Text style={styles.label}>PRIORIDAD DEL MONITOR (OPCIONAL)</Text>
            <TextInput style={styles.input} value={focus} onChangeText={setFocus} placeholder="Ej. Priorizar glúteos y espalda; evitar impacto" placeholderTextColor="#6E6E73" maxLength={400} multiline />
            <Text style={styles.note}>Es una propuesta general de entrenamiento. Revísala y adapta cargas, técnica o cualquier situación de salud antes de asignarla.</Text>
            {error !== '' && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity style={[styles.generateButton, generating && styles.generateButtonDisabled]} onPress={() => void createFromAi()} disabled={generating}>
              {generating ? <ActivityIndicator color="#FFFFFF" /> : <><MaterialCommunityIcons name="creation-outline" size={20} color="#FFFFFF" /><Text style={styles.generateText}>Generar plantilla con Gemini</Text></>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.76)' },
  sheet: { width: '100%', maxWidth: 430, maxHeight: '94%', backgroundColor: '#1C1C1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderWidth: 1, borderColor: '#34343A' },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 13 },
  headerCopy: { flex: 1, paddingRight: 10 },
  eyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
  title: { color: '#FFFFFF', fontSize: 23, fontWeight: '900', marginTop: 4 },
  helper: { color: '#B0B0B5', fontSize: 13, lineHeight: 18, marginTop: 5 },
  closeButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#29292D', alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 4 },
  label: { color: '#8E8E93', fontSize: 10, fontWeight: '800', letterSpacing: 0.7, marginTop: 14, marginBottom: 7 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderRadius: 10, borderWidth: 1, borderColor: '#3A3A40', backgroundColor: '#26262A', paddingHorizontal: 10, paddingVertical: 8 },
  chipActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(22,201,91,0.14)' },
  chipText: { color: '#C7C7CC', fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: COLORS.primary },
  weekdayRow: { flexDirection: 'row', gap: 6 },
  weekday: { flex: 1, minWidth: 38, height: 34, borderRadius: 8, borderWidth: 1, borderColor: '#3A3A40', backgroundColor: '#26262A', alignItems: 'center', justifyContent: 'center' },
  weekdayActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  weekdayText: { color: '#A1A1A6', fontSize: 10, fontWeight: '800' },
  weekdayTextActive: { color: '#FFFFFF' },
  structureRow: { gap: 8 },
  structureOption: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#3A3A40', backgroundColor: '#26262A', borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10 },
  structureOptionActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(22,201,91,0.12)' },
  structureCopy: { flex: 1 },
  structureTitle: { color: '#D1D1D6', fontSize: 14, fontWeight: '800' },
  structureTitleActive: { color: COLORS.primary },
  structureHint: { color: '#A1A1A6', fontSize: 11, lineHeight: 15, marginTop: 2 },
  caption: { color: '#8E8E93', fontSize: 11, marginTop: 7 },
  input: { minHeight: 58, borderRadius: 11, borderWidth: 1, borderColor: '#3A3A40', backgroundColor: '#27272B', color: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, textAlignVertical: 'top' },
  note: { color: '#A1A1A6', fontSize: 11, lineHeight: 16, marginTop: 10 },
  error: { color: '#FF6961', fontSize: 12, lineHeight: 17, marginTop: 10 },
  generateButton: { height: 52, marginTop: 16, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  generateButtonDisabled: { opacity: 0.65 },
  generateText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
