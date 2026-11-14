import { isLocalhost } from '../env';
import {
  STORAGE_KEYS,
  getPublicApiUrl,
  getStoredSessionToken,
} from '../sessionToken';

export async function verifyAdminPassword(
  password: string
): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') return { success: false };
  const trimmed = password.trim();
  if (!trimmed) return { success: false, error: 'A senha é obrigatória.' };

  try {
    const apiUrl = getPublicApiUrl();
    const res = await fetch(`${apiUrl}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: trimmed }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      if (data.token) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
      }
      setSessionActive();
      return { success: true };
    }

    if (res.status === 429) {
      return {
        success: false,
        error: data.error || 'Muitas tentativas. Aguarde 15 minutos.',
      };
    }

    return {
      success: false,
      error: data.error || 'Senha incorreta. Verifique e tente novamente.',
    };
  } catch {
    return {
      success: false,
      error: 'Falha ao conectar com o serviço de autenticação.',
    };
  }
}

export async function setAdminPassword(_newPassword: string): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.PASSWORD_HASH);
  }
}

export async function checkServerSession(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (isLocalhost()) return true;

  try {
    const apiUrl = getPublicApiUrl();
    const token = getStoredSessionToken();
    const res = await fetch(`${apiUrl}/api/auth/session`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (typeof data.authenticated === 'boolean') {
        if (!data.authenticated) {
          localStorage.removeItem(STORAGE_KEYS.SESSION);
          localStorage.removeItem(STORAGE_KEYS.TOKEN);
        }
        return data.authenticated;
      }
    }
  } catch {
    // If backend is unreachable, check local session expiry
  }

  return isSessionActive();
}

export function isSessionActive(): boolean {
  if (typeof window === 'undefined') return false;
  if (isLocalhost()) return true;
  try {
    const session = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!session) return false;
    const { expiresAt } = JSON.parse(session);
    return Date.now() < expiresAt;
  } catch {
    return false;
  }
}

export function setSessionActive(): void {
  if (typeof window === 'undefined') return;
  const session = {
    active: true,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
  localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      const apiUrl = getPublicApiUrl();
      const token = getStoredSessionToken();
      await fetch(`${apiUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch {}
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.PASSWORD_HASH);
  }
}
