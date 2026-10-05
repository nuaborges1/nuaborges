/**
 * Serviço de Autenticação — Projeto Nua Borges
 * Responsável pelo login da cliente, verificação de sessão e logout
 */

import { getPublicApiUrl, getStoredSessionToken } from '@/lib/contentStore';

export interface LoginResult {
  success: boolean;
  token?: string;
  error?: string;
}

export async function loginAdmin(password: string): Promise<LoginResult> {
  const apiUrl = getPublicApiUrl();
  try {
    const res = await fetch(`${apiUrl}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: true,
        token: data.token,
      };
    }

    const data = await res.json().catch(() => ({}));
    return {
      success: false,
      error: data.error || 'Senha incorreta. Tente novamente.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Falha de conexão com o servidor.',
    };
  }
}

export async function checkAdminSession(): Promise<boolean> {
  const apiUrl = getPublicApiUrl();
  const token = getStoredSessionToken();

  try {
    const res = await fetch(`${apiUrl}/api/auth/session`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return !!data.authenticated;
    }
  } catch {
    // Falha silenciosa
  }
  return false;
}

export async function logoutAdmin(): Promise<void> {
  const apiUrl = getPublicApiUrl();
  const token = getStoredSessionToken();

  try {
    await fetch(`${apiUrl}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    // Ignora erro de rede no logout
  }
}

export async function verifyContractPassword(password: string): Promise<boolean> {
  const apiUrl = getPublicApiUrl();
  try {
    const res = await fetch(`${apiUrl}/api/auth/contract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return !!data.success;
    }
  } catch {
    // Fallback
  }
  return false;
}
