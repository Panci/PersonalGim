import { Platform } from 'react-native';
import { EquipmentType, GymMember, MemberLevel, MemberObjective, RoutineCollection, RoutineTemplate, WeekDay, WorkoutSession } from '../types';
import { AuthSession, AuthUser, UserRole } from './types';

// Keep this as a direct EXPO_PUBLIC_* member access so Expo can inline the
// value from .env.local during the web/native build. Optional chaining around
// process.env prevented the local API URL from being embedded in the bundle.
const configuredBaseUrl = process.env.EXPO_PUBLIC_API_URL;
const normalizedBaseUrl = typeof configuredBaseUrl === 'string' ? configuredBaseUrl.trim().replace(/\/$/, '') : '';
const apiBaseUrl = normalizedBaseUrl || (Platform.OS === 'web' ? '/api' : '');

const endpoint = (path: string) => {
  if (!apiBaseUrl) {
    throw new Error('Configura EXPO_PUBLIC_API_URL para conectar la aplicación móvil al servidor.');
  }
  return `${apiBaseUrl}${path}`;
};

const readResponse = async <T>(response: Response): Promise<T> => {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('El servicio de acceso no está disponible todavía.');
  }
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo conectar con el servidor.');
  }
  return data as T;
};

export const loginRequest = async (email: string, pin: string): Promise<AuthSession> => {
  try {
    const response = await fetch(endpoint('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pin }),
    });
    return readResponse<AuthSession>(response);
  } catch (error) {
    if (error instanceof Error && error.message !== 'Failed to fetch') throw error;
    throw new Error('No se puede contactar con el servidor. Comprueba la conexión e inténtalo de nuevo.');
  }
};

export const currentUserRequest = async (token: string): Promise<AuthUser> => {
  try {
    const response = await fetch(endpoint('/auth/me'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await readResponse<{ user: AuthUser }>(response);
    return data.user;
  } catch (error) {
    if (error instanceof Error && error.message !== 'Failed to fetch') throw error;
    throw new Error('No se puede contactar con el servidor.');
  }
};

export const updateAccountRequest = async (
  token: string,
  payload: { currentPin: string; email: string; newPin?: string },
): Promise<AuthSession> => {
  const response = await fetch(endpoint('/auth/account'), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return readResponse<AuthSession>(response);
};

export const saveWorkoutRequest = async (token: string, workout: WorkoutSession): Promise<void> => {
  const response = await fetch(endpoint('/workouts'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      routineId: workout.routineId,
      name: workout.name,
      startedAt: workout.startTime,
      finishedAt: workout.endTime,
      durationSeconds: workout.durationSeconds,
      totalKcal: workout.totalKcal,
      totalVolumeKg: workout.totalVolumeKg,
      exercises: workout.exercises,
    }),
  });
  await readResponse<{ workout: unknown }>(response);
};

export const getRoutinesRequest = async (token: string): Promise<RoutineCollection[]> => {
  const response = await fetch(endpoint('/routines'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await readResponse<{ routines: RoutineCollection[] }>(response);
  return Array.isArray(data.routines) ? data.routines : [];
};

export const saveRoutinesRequest = async (
  token: string,
  routines: RoutineCollection[],
): Promise<void> => {
  const response = await fetch(endpoint('/routines'), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ routines }),
  });
  await readResponse<{ routines: RoutineCollection[] }>(response);
};

export const getGymMembersRequest = async (token: string): Promise<GymMember[]> => {
  const response = await fetch(endpoint('/members'), { headers: { Authorization: `Bearer ${token}` } });
  const data = await readResponse<{ members: GymMember[] }>(response);
  return Array.isArray(data.members) ? data.members : [];
};

export const getRoutineTemplatesRequest = async (token: string): Promise<RoutineTemplate[]> => {
  const response = await fetch(endpoint('/routine-templates'), { headers: { Authorization: `Bearer ${token}` } });
  const data = await readResponse<{ templates: RoutineTemplate[] }>(response);
  return Array.isArray(data.templates) ? data.templates : [];
};

export const createRoutineTemplateRequest = async (
  token: string,
  template: Omit<RoutineTemplate, 'createdAt' | 'updatedAt'>,
): Promise<RoutineTemplate> => {
  const response = await fetch(endpoint('/routine-templates'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(template),
  });
  const data = await readResponse<{ template: RoutineTemplate }>(response);
  return data.template;
};

export const assignRoutineTemplateRequest = async (
  token: string,
  memberId: string,
  templateId: string,
): Promise<{ assignedRoutineId: string; assignedRoutineTitle: string }> => {
  const response = await fetch(endpoint(`/members/${encodeURIComponent(memberId)}/assign-routine`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ templateId }),
  });
  return readResponse<{ assignedRoutineId: string; assignedRoutineTitle: string }>(response);
};

export interface AiProviderSettings {
  provider: 'gemini';
  configured: boolean;
  updatedAt: string | null;
}

export const getAiProviderSettingsRequest = async (token: string): Promise<AiProviderSettings> => {
  const response = await fetch(endpoint('/admin/ai-settings'), { headers: { Authorization: `Bearer ${token}` } });
  return readResponse<AiProviderSettings>(response);
};

export const saveGeminiApiKeyRequest = async (token: string, apiKey: string): Promise<AiProviderSettings> => {
  const response = await fetch(endpoint('/admin/ai-settings'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ apiKey }),
  });
  return readResponse<AiProviderSettings>(response);
};

export interface AiRoutineGenerationRequest {
  sex: 'mujer' | 'hombre' | 'no_especificado';
  objective: MemberObjective;
  level: MemberLevel;
  equipment: EquipmentType[];
  trainingDays: WeekDay[];
  weeklyStructure: 'repetir_bloques' | 'dias_distintos';
  focus?: string;
  exerciseCatalog: Array<{ id: string; name: string; primaryMuscle: string; equipment: EquipmentType }>;
}

export interface AiRoutinePlan {
  title: string;
  subtitle: string;
  blocks: Array<{
    name: string;
    scheduledDays: WeekDay[];
    exercises: Array<{ exerciseId: string; sets: number; repRange: string; restSeconds: number }>;
  }>;
}

export const generateAiRoutineRequest = async (
  token: string,
  payload: AiRoutineGenerationRequest,
): Promise<AiRoutinePlan> => {
  const response = await fetch(endpoint('/ai/routine-generation'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const data = await readResponse<{ plan: AiRoutinePlan }>(response);
  return data.plan;
};

export const createUserRequest = async (
  token: string,
  payload: {
    fullName: string;
    email: string;
    pin: string;
    role: UserRole;
    memberProfile?: { phone?: string; objective: GymMember['objective']; level: GymMember['level'] };
  },
): Promise<AuthUser> => {
  const response = await fetch(endpoint('/users'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await readResponse<{ user: AuthUser }>(response);
  return data.user;
};
