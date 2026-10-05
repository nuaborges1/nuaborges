/**
 * Cliente HTTP da Central phdev (Admin Geral)
 * Responsável pela comunicação autenticada com os backends dos projetos clientes
 */

export interface AdminGeralClientOptions {
  targetApiUrl?: string;
  masterKey?: string;
}

export class AdminGeralClient {
  private targetApiUrl: string;
  private masterKey: string;

  constructor(options: AdminGeralClientOptions = {}) {
    this.targetApiUrl = options.targetApiUrl || '';
    this.masterKey = options.masterKey || '';
  }

  setCredentials(targetApiUrl: string, masterKey: string) {
    this.targetApiUrl = targetApiUrl.replace(/\/$/, '');
    this.masterKey = masterKey.trim();
  }

  getTargetApiUrl(): string {
    return this.targetApiUrl;
  }

  getMasterKey(): string {
    return this.masterKey;
  }

  async fetchFromApi(path: string, options: RequestInit = {}): Promise<Response> {
    const baseUrl = this.targetApiUrl.replace(/\/$/, '');
    const fullUrl = `${baseUrl}${path}`;

    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');

    if (this.masterKey) {
      headers.set('Authorization', `Bearer ${this.masterKey}`);
      headers.set('X-Master-Key', this.masterKey);
    }

    return fetch(fullUrl, {
      ...options,
      headers,
    });
  }

  async testConnection(): Promise<{ ok: boolean; latencyMs: number; status?: number; error?: string }> {
    const start = performance.now();
    try {
      const res = await this.fetchFromApi('/api/audit/feed');
      const latencyMs = Math.round(performance.now() - start);

      if (res.ok) {
        return { ok: true, latencyMs, status: res.status };
      }
      return { ok: false, latencyMs, status: res.status, error: `HTTP ${res.status}` };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      return { ok: false, latencyMs, error: err?.message || 'Falha de rede.' };
    }
  }
}

// Singleton default client para uso fácil em componentes
let defaultClientInstance: AdminGeralClient | null = null;

export function getAdminGeralClient(options?: AdminGeralClientOptions): AdminGeralClient {
  if (!defaultClientInstance) {
    defaultClientInstance = new AdminGeralClient(options);
  } else if (options) {
    if (options.targetApiUrl !== undefined || options.masterKey !== undefined) {
      defaultClientInstance.setCredentials(
        options.targetApiUrl ?? defaultClientInstance.getTargetApiUrl(),
        options.masterKey ?? defaultClientInstance.getMasterKey()
      );
    }
  }
  return defaultClientInstance;
}
