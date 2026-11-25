/* Vinho maduro / Nua Borges */
'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Volume2,
  VolumeX,
  Laptop,
  Play,
  CheckCircle2,
  Bell,
  Eye,
  Sliders,
  AlertCircle,
  ShieldCheck,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { useAdminOrderNotifications } from '@/hooks/useAdminOrderNotifications';

export function NotificationSettingsEditor() {
  const {
    settings,
    windowsPermission,
    updateSettings,
    requestWindowsPermission,
    testSound,
    testWindowsNotification,
    testTabFlash,
  } = useAdminOrderNotifications();

  const [soundTesting, setSoundTesting] = useState(false);
  const [tabTesting, setTabTesting] = useState(false);
  const [windowsTesting, setWindowsTesting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleTestSound = () => {
    setSoundTesting(true);
    testSound();
    showFeedback('Sino de alerta reproduzido!');
    setTimeout(() => setSoundTesting(false), 2000);
  };

  const handleTestTabFlash = () => {
    setTabTesting(true);
    testTabFlash();
    showFeedback('Aba do navegador piscando em vermelho (8s)... Observe o topo da janela!');
    setTimeout(() => setTabTesting(false), 8000);
  };

  const handleTestWindows = () => {
    setWindowsTesting(true);
    testWindowsNotification();
    showFeedback('Notificação enviada ao Windows!');
    setTimeout(() => setWindowsTesting(false), 2500);
  };

  return (
    <div className="space-y-8 select-none">
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-[#171821] border border-[#843C52]/40 text-white text-xs flex items-center gap-2 shadow-2xl backdrop-blur-xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#843C52]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] relative overflow-hidden shadow-sm">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#843C52]/10 border border-[#843C52]/25 text-[#843C52] text-[10px] font-semibold tracking-wider uppercase mb-2">
            <Sliders className="w-3 h-3" />
            <span>Preferências do Sistema</span>
          </div>

          <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
            Configurações de Alertas &amp; Notificações
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm font-light mt-1 leading-relaxed">
            Mantenha-se avisada instantaneamente quando novos pedidos pagos, ensaios sob medida ou chamadas de vídeo forem solicitados, mesmo trabalhando em outros programas ou abas.
          </p>
        </div>
      </div>

      {/* Grid de Configurações */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Áudio & Sino */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] flex flex-col justify-between space-y-4 shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                {settings.soundEnabled ? (
                  <Volume2 className="w-5 h-5" />
                ) : (
                  <VolumeX className="w-5 h-5 text-zinc-500" />
                )}
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#843C52]" />
              </label>
            </div>

            <h3 className="text-sm font-semibold text-white">Toque Sonoro</h3>
            <p className="text-xs text-zinc-400 mt-1 font-light leading-relaxed">
              Toca um sino harmonioso e suave no alto-falante quando um pedido novo for confirmado no site.
            </p>
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">
              {settings.soundEnabled ? 'Áudio ativado' : 'Silenciado'}
            </span>
            <button
              type="button"
              onClick={handleTestSound}
              disabled={soundTesting}
              className="h-7 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-zinc-200 border border-white/[0.08] transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Play className="w-3 h-3 text-[#843C52]" />
              <span>{soundTesting ? 'Tocando...' : 'Testar Som'}</span>
            </button>
          </div>
        </div>

        {/* Card 2: Aba Piscando */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] flex flex-col justify-between space-y-4 shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <Eye className="w-5 h-5" />
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.tabFlashEnabled}
                  onChange={(e) => updateSettings({ tabFlashEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#843C52]" />
              </label>
            </div>

            <h3 className="text-sm font-semibold text-white">Piscar Aba do Navegador</h3>
            <p className="text-xs text-zinc-400 mt-1 font-light leading-relaxed">
              Alterna o título e o ícone da aba em vermelho com o valor do pedido para chamar atenção mesmo em outras abas.
            </p>
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">
              {tabTesting ? (
                <span className="text-rose-400 font-medium animate-pulse">Piscando...</span>
              ) : (
                'Alerta visual'
              )}
            </span>
            <button
              type="button"
              onClick={handleTestTabFlash}
              disabled={tabTesting}
              className="h-7 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-zinc-200 border border-white/[0.08] transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Play className="w-3 h-3 text-red-400" />
              <span>{tabTesting ? 'Testando...' : 'Testar Aba'}</span>
            </button>
          </div>
        </div>

        {/* Card 3: Windows */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] flex flex-col justify-between space-y-4 shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Laptop className="w-5 h-5" />
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.windowsNotificationEnabled && windowsPermission === 'granted'}
                  onChange={(e) => {
                    if (windowsPermission !== 'granted') {
                      requestWindowsPermission();
                    } else {
                      updateSettings({ windowsNotificationEnabled: e.target.checked });
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#843C52]" />
              </label>
            </div>

            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Avisos no Windows</h3>
              {windowsPermission === 'granted' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
                  Ativo
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-400 mt-1 font-light leading-relaxed">
              Exibe um balão oficial do sistema operacional no canto inferior direito da tela ao chegar pedidos.
            </p>
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">
              {windowsPermission === 'granted'
                ? 'Autorizado'
                : windowsPermission === 'denied'
                ? 'Bloqueado'
                : 'Não autorizado'}
            </span>

            {windowsPermission === 'granted' ? (
              <button
                type="button"
                onClick={handleTestWindows}
                disabled={windowsTesting}
                className="h-7 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-zinc-200 border border-white/[0.08] transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <Play className="w-3 h-3 text-blue-400" />
                <span>{windowsTesting ? 'Enviando...' : 'Testar Windows'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={requestWindowsPermission}
                className="h-7 px-3 rounded-full bg-[#843C52] hover:bg-[#992b4a] text-white font-semibold text-xs transition-colors cursor-pointer shadow-sm inline-flex items-center gap-1.5"
              >
                <span>Ativar Windows</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
