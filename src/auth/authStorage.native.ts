import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'personalgim.auth.token';

export const getAuthToken = (): Promise<string | null> => SecureStore.getItemAsync(TOKEN_KEY);

export const setAuthToken = (token: string): Promise<void> => SecureStore.setItemAsync(TOKEN_KEY, token);

export const clearAuthToken = (): Promise<void> => SecureStore.deleteItemAsync(TOKEN_KEY);
