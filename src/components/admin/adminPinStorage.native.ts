import * as SecureStore from 'expo-secure-store';

const ADMIN_PIN_STORAGE_KEY = 'personalgim.admin-pin.v1';

export const getAdminPin = () => SecureStore.getItemAsync(ADMIN_PIN_STORAGE_KEY);

export const setAdminPin = (value: string) => SecureStore.setItemAsync(ADMIN_PIN_STORAGE_KEY, value);
