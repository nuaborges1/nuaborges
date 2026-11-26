'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Video, CheckCircle2, AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

interface GoogleMeetStatus {
  connected: boolean;
  needsAttention: boolean;
  status: string;
  email: string | null;
}

export function GoogleMeetConnectionCard() {
  const [data, setData] = useState<GoogleMeetStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/google/status', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setData({
          connected: Boolean(json.connected),
          needsAttention: Boolean(json.needsAttention),
          status: String(json.status || 'disconnected'),
          email: json.email || null,
        });
      }
    } catch {
      // Silencioso
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleConnect = () => {
    window.location.href = '/api/google/auth';
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetch('/api/google/disconnect', { method: 'POST' });
      await loadStatus();
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-[#14161d] border border-white/[0.06] space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#6B1D2F]/25 border border-[#6B1D2F]/40 flex items-center justify-center">
            <Video className="w-4 h-4 text-[#e09fb0]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Google Meet</h3>
            <p className="text-xs text-zinc-400">
              {loading
                ? 'Verificando conexão...'
                : data?.connected
                ? `Conectado como ${data.email}`
                : data?.needsAttention
                ? 'Precisamos reconectar sua conta Google.'
                : 'Conecte sua conta para criar links e atualizar chamadas automaticamente.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {data?.connected && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Google Meet conectado
            </span>
          )}
          {data?.needsAttention && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <AlertTriangle className="w-3.5 h-3.5" />
              Atenção necessária
            </span>
          )}
        </div>
      </div>

      {data?.connected && (
        <p className="text-xs text-zinc-400">
          Suas chamadas são criadas e atualizadas automaticamente quando os atendimentos começam e terminam.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {!data?.connected ? (
          <button
            type="button"
            onClick={handleConnect}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-[#6B1D2F] hover:bg-[#7d2338] text-white transition-colors disabled:opacity-50"
          >
            <Video className="w-3.5 h-3.5" />
            {data?.needsAttention ? 'Reconectar conta Google' : 'Conectar conta Google'}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleConnect}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reconectar
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 transition-colors disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              {disconnecting ? 'Desconectando...' : 'Desconectar'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
