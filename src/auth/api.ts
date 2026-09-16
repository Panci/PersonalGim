import { Platform } from 'react-native';
import { WorkoutSession } from '../types';
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

export const createUserRequest = async (
  token: string,
  payload: { fullName: string; email: string; pin: string; role: UserRole },
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
