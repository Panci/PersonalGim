export const PIN_LENGTH = 4;
export const PIN_PATTERN = /^\d{4}$/;

export const normalizePin = (value: string): string => value.replace(/\D/g, '').slice(0, PIN_LENGTH);

export const isValidPin = (value: string): boolean => PIN_PATTERN.test(value);
