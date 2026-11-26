'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Globe, Loader2, Lock } from 'lucide-react';
import { getPublicApiUrl } from '@/lib/contentStore';

interface BrowserDevice {
  id: string;
  label: string;
  expires: number;
}

export function VaultBrowsers() {
  const [devices, setDevices] = useState<BrowserDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadOrRevoke = useCallback(async (id?: string) => {
    setError(null);
    if (id) setRevokingId(id);
    else setLoading(true);
    try {
      const response = await fetch(`${getPublicApiUrl()}/api/me/cofre`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: id ? 'revoke' : 'devices', id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(data.devices)) {
        throw new Error('vault_devices_error');
      }
      setDevices(data.devices);
    } catch {
      setError('Não foi possível consultar os navegadores autorizados no Cofre.');
    } finally {
      setLoading(false);
      setRevokingId(null);
    }
  }, []);

  useEffect(() => {
    void loadOrRevoke();
  }, [loadOrRevoke]);

  return (
    <section className="space-y-4 rounded-[28px] border border-white/[0.08] bg-[#08080c] p-5 sm:p-6 shadow-[0_16px_50px_rgba(0,0,0,0.85)]">
      <div>
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-[#C97A8D]" />
          <h3 className="font-serif text-base text-[#F5EEE9]">Navegadores autorizados para mídias</h3>
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          Navegadores confirmados para exibir seus conteúdos protegidos nesta conta.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/35 px-3.5 py-2.5 text-xs text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-16 animate-pulse rounded-xl bg-black/55" />
      ) : devices.length === 0 ? (
        <p role="status" className="rounded-xl border border-white/[0.06] bg-black/45 px-4 py-3 text-xs text-zinc-400">
          Nenhum navegador autorizado no Cofre no momento.
        </p>
      ) : (
        <div className="space-y-2">
          {devices.map((d) => (
            <div
              key={d.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-white/[0.06] bg-black/55 px-4 py-3 text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Globe className="h-4 w-4 shrink-0 text-zinc-500" />
                <div className="min-w-0">
                  <p className="truncate text-[#F5EEE9]">{d.label}</p>
                  <p className="text-[11px] text-zinc-500">
                    Autorização válida até {new Date(d.expires).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={revokingId !== null}
                onClick={() => void loadOrRevoke(d.id)}
                className="inline-flex min-h-[36px] shrink-0 items-center justify-center gap-1.5 rounded-full border border-rose-500/25 bg-rose-950/20 px-3.5 py-1.5 text-xs text-rose-200 transition-colors duration-200 hover:border-rose-400/50 hover:bg-rose-950/50 hover:text-rose-100 disabled:opacity-45 cursor-pointer"
              >
                {revokingId === d.id && <Loader2 className="h-3 w-3 animate-spin" />}
                Revogar acesso
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
