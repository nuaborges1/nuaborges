/**
 * Serviço de Telemetria — Central phdev (Admin Geral)
 * Responsável pelas estatísticas de visitantes, dispositivos e métricas de tráfego
 */

export interface TelemetryData {
  totalPageviews: number;
  uniqueVisitors: number;
  topPages: Record<string, number>;
  devices: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  countries: Record<string, number>;
  browsers: Record<string, number>;
  recentVisits: Array<{
    path: string;
    timestamp: string;
    country: string;
    city: string;
    device: string;
    browser: string;
    os: string;
    ipMasked: string;
  }>;
}

export async function fetchTelemetryStats(
  fetchFromApi: (path: string, options?: RequestInit) => Promise<Response>
): Promise<TelemetryData | null> {
  try {
    const res = await fetchFromApi('/api/telemetry/stats');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[telemetryService] Erro ao buscar telemetria:', err);
  }
  return null;
}
