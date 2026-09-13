/**
 * Creates opaque client-side ids without relying on a millisecond timestamp.
 * The random component prevents collisions when a user adds several records in
 * one render or when a batch is created synchronously.
 */
let sequence = 0;

export const createId = (prefix: string): string => {
  sequence = (sequence + 1) % 1_000_000;
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${sequence.toString(36)}-${random}`;
};
