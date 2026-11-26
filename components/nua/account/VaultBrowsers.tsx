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
    <section className="space-y-4 rounded-[24px] border border-white/[0.08] bg-[#08080c] p-5 sm:p-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Lock className="size-4 text-[#C97A8D]" />
          <h3 className="font-serif text-lg font-normal text-[#F5EEE9]">Navegadores autorizados</h3>
        </div>
        <p className="text-xs text-zinc-400">
          Navegadores confirmados para exibir conteúdos protegidos nesta conta.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/30 px-3.5 py-2.5 text-xs text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-16 rounded-xl bg-white/[0.03]" />
      ) : devices.length === 0 ? (
        <p role="status" className="rounded-xl border border-white/[0.06] bg-black/45 px-4 py-3 text-xs text-zinc-400">
          Nenhum navegador autorizado para mídias no momento.
        </p>
      ) : (
        <div className="space-y-2">
          {devices.map((d) => (
            <div
              key={d.id}
              className="flex flex-col justify-between gap-2.5 rounded-xl border border-white/[0.06] bg-black/45 px-4 py-3 text-xs sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Globe className="size-4 shrink-0 text-zinc-500" />
                <div className="min-w-0">
                  <p className="truncate text-[#F5EEE9]">{d.label}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    Autorização válida até {new Date(d.expires).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={revokingId !== null}
                onClick={() => void loadOrRevoke(d.id)}
                className="inline-flex min-h-[36px] shrink-0 items-center justify-center gap-1.5 rounded-full border border-rose-500/25 bg-rose-950/20 px-3.5 text-xs text-rose-200 transition-colors hover:border-rose-400/50 hover:bg-rose-950/45 disabled:opacity-45 cursor-pointer"
              >
                {revokingId === d.id && <Loader2 className="size-3 animate-spin" />}
                <span>Revogar</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
