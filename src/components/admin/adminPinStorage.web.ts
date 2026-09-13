const ADMIN_PIN_STORAGE_KEY = 'personalgim.admin-pin.v1';

export const getAdminPin = async (): Promise<string | null> => {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(ADMIN_PIN_STORAGE_KEY);
};

export const setAdminPin = async (value: string): Promise<void> => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(ADMIN_PIN_STORAGE_KEY, value);
  }
};
