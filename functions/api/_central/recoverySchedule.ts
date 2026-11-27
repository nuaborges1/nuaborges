export const RECOVERY_BATCH_LIMIT = 10;
export const RECOVERY_MAX_ATTEMPTS = 12;

export function nextRecoveryAt(attempts: number, now = Date.now()): number {
  const minutes = Math.min(1440, 2 ** Math.min(attempts, 11));
  return now + Math.round(minutes * 60_000 * (0.75 + Math.random() * 0.25));
}
