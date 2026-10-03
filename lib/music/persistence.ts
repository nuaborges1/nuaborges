// lib/music/persistence.ts
// Gerencia persistência de preferências do usuário no localStorage.
// REGRA: config administrativa (autoplay, enabled) NUNCA é sobreposta pelo localStorage.

const VOL_KEY = 'nua_player_vol_v2';
const POS_KEY = 'nua_player_pos_v2';
const POS_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas

export interface SavedPosition {
  trackId: string;
  time: number;
}

export function loadSavedVolume(): number {
  try {
    const raw = localStorage.getItem(VOL_KEY);
    if (raw === null) return 0.7;
    const v = parseFloat(raw);
    return isNaN(v) ? 0.7 : Math.max(0, Math.min(1, v));
  } catch {
    return 0.7;
  }
}

export function saveVolume(volume: number): void {
  try {
    localStorage.setItem(VOL_KEY, String(volume));
  } catch { }
}

export function loadSavedPosition(): SavedPosition | null {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return null;
    const { trackId, time, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > POS_TTL_MS) {
      localStorage.removeItem(POS_KEY);
      return null;
    }
    if (typeof trackId === 'string' && typeof time === 'number' && time > 0) {
      return { trackId, time };
    }
    return null;
  } catch {
    return null;
  }
}

export function savePosition(trackId: string, time: number): void {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify({ trackId, time, timestamp: Date.now() }));
  } catch { }
}

export function clearPosition(): void {
  try {
    localStorage.removeItem(POS_KEY);
  } catch { }
}

const DUR_KEY = 'nua_player_durations_v1';

export function loadDurationCache(): Record<string, number> {
  try {
    const raw = localStorage.getItem(DUR_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveTrackDuration(trackId: string, duration: number): void {
  if (!trackId || !duration || !isFinite(duration)) return;
  try {
    const cache = loadDurationCache();
    cache[trackId] = Math.round(duration);
    localStorage.setItem(DUR_KEY, JSON.stringify(cache));
  } catch { }
}

