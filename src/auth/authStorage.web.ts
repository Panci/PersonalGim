const TOKEN_KEY = 'personalgim.auth.token';

export const getAuthToken = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
};

export const setAuthToken = async (token: string): Promise<void> => {
  window.localStorage.setItem(TOKEN_KEY, token);
};

export const clearAuthToken = async (): Promise<void> => {
  window.localStorage.removeItem(TOKEN_KEY);
};
