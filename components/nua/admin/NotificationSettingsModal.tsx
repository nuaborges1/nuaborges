'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Volume2,
  VolumeX,
  Laptop,
  Play,
  CheckCircle2,
  Bell,
  Eye,
  Sliders,
} from 'lucide-react';
import { NotificationSettings } from '@/hooks/useAdminOrderNotifications';
import { useScrollLock } from '@/hooks/useScrollLock';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: NotificationSettings;
  windowsPermission: NotificationPermission;
  updateSettings: (patch: Partial<NotificationSettings>) => void;
  requestWindowsPermission: () => Promise<NotificationPermission>;
  testSound: () => void;
  testWindowsNotification: () => void;
  testTabFlash: () => void;
}

export function NotificationSettingsModal({
  isOpen,
  onClose,
  settings,
  windowsPermission,
  updateSettings,
  requestWindowsPermission,
  testSound,
  testWindowsNotification,
  testTabFlash,
}: NotificationSettingsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [soundTesting, setSoundTesting] = useState(false);
  const [tabTesting, setTabTesting] = useState(false);
  const [windowsTesting, setWindowsTesting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useScrollLock(isOpen);

  // Fecha com a tecla ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleTestSound = () => {
    setSoundTesting(true);
    testSound();
    setTimeout(() => setSoundTesting(false), 2000);
  };

  const handleTestTabFlash = () => {
    setTabTesting(true);
    testTabFlash();
    setTimeout(() => setTabTesting(false), 8000);
  };

  const handleTestWindows = () => {
    setWindowsTesting(true);
    testWindowsNotification();
    setTimeout(() => setWindowsTesting(false), 2500);
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto overscroll-contain select-none">
        {/* Backdrop escuro com blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Dialog com altura responsiva e scroll interno */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="notification-settings-title"
          className="relative w-full max-w-lg bg-[#171821] border border-white/[0.08] rounded-xl shadow-2xl z-10 flex flex-col my-auto max-h-[90vh] overflow-hidden text-left"
        >
          {/* Header Fixo no Topo */}
          <div className="relative px-5 py-4 border-b border-white/[0.06] flex items-center justify-between bg-[#14151b] shrink-0">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-[#f4a7b9]/15 border border-[#f4a7b9]/30 flex items-center justify-center text-[#f4a7b9] shrink-0">
                <Sliders className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[#f4a7b9] text-[10px] font-semibold tracking-[0.2em] uppercase block">
                  Configurações do Painel
                </span>
                <h2
                  id="notification-settings-title"
                  className="text-sm sm:text-base text-white font-medium"
                >
                  Alertas de Novos Pedidos
                </h2>
              </div>
            </div>

            {/* Botão Fechar */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Fechar configurações"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Conteúdo com Scroll Interno */}
          <div
            className="p-5 sm:p-6 overflow-y-auto space-y-4 overscroll-contain flex-1"
            style={{ touchAction: 'pan-y' }}
          >
            <p className="text-zinc-400 text-xs font-light leading-relaxed">
              Configure como deseja ser avisada no computador sempre que um admirador enviar um pedido pago ou agendamento de chamada.
            </p>

            {/* 1. Toque Sonoro */}
            <div className="p-3.5 rounded-lg bg-[#101116] border border-white/[0.06] transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                    {settings.soundEnabled ? (
                      <Volume2 className="w-4 h-4" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-zinc-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-white">Toque Sonoro</h3>
                    <p className="text-xs text-zinc-400 mt-0.5 font-light leading-relaxed">
                      Toca um sino harmonioso e suave no alto-falante quando um pedido novo chegar.
                    </p>
                  </div>
                </div>

                {/* Switch */}
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-[#f4a7b9]" />
                </label>
              </div>

              <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between">
                <span className="text-[11px] text-zinc-400 font-light">
                  {settings.soundEnabled ? 'Sino de alerta ativado' : 'Sons desativados'}
                </span>
                <button
                  type="button"
                  onClick={handleTestSound}
                  disabled={soundTesting}
                  className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-zinc-200 hover:text-white transition-colors cursor-pointer disabled:opacity-50 border border-white/10"
                >
                  <Play className="w-3 h-3 text-[#f4a7b9]" />
                  <span>{soundTesting ? 'Tocando sino...' : 'Testar som'}</span>
                </button>
              </div>
            </div>

            {/* 2. Aba Piscando em Vermelho */}
            <div className="p-3.5 rounded-lg bg-[#101116] border border-white/[0.06] transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-white">Piscar Aba do Navegador</h3>
                    <p className="text-xs text-zinc-400 mt-0.5 font-light leading-relaxed">
                      Alterna o título da aba e o ícone com um alerta vermelho vibrante exibindo o valor do pedido.
                    </p>
                  </div>
                </div>

                {/* Switch */}
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={settings.tabFlashEnabled}
                    onChange={(e) => updateSettings({ tabFlashEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-[#f4a7b9]" />
                </label>
              </div>

              <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between">
                <span className="text-[11px] text-zinc-400 font-light">
                  {tabTesting ? (
                    <span className="text-rose-400 font-medium animate-pulse">
                      Piscando a aba agora... observe acima!
                    </span>
                  ) : (
                    'Funciona mesmo se você estiver em outro site'
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleTestTabFlash}
                  disabled={tabTesting}
                  className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-zinc-200 hover:text-white transition-colors cursor-pointer disabled:opacity-50 border border-white/10"
                >
                  <Play className="w-3 h-3 text-red-400" />
                  <span>{tabTesting ? 'Testando (8s)...' : 'Testar piscar aba'}</span>
                </button>
              </div>
            </div>

            {/* 3. Notificações Nativas do Windows */}
            <div className="p-3.5 rounded-lg bg-[#101116] border border-white/[0.06] transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-medium text-white">Notificações no Windows</h3>
                      {windowsPermission === 'granted' && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
                          Ativa
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5 font-light leading-relaxed">
                      Exibe um banner oficial do Windows no canto da tela mesmo com o navegador minimizado.
                    </p>
                  </div>
                </div>

                {/* Switch */}
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
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
                  <div className="w-10 h-5.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-[#f4a7b9]" />
                </label>
              </div>

              <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between flex-wrap gap-2">
                <span className="text-[11px] text-zinc-400 font-light">
                  {windowsPermission === 'granted'
                    ? 'Permissão concedida no navegador'
                    : windowsPermission === 'denied'
                    ? 'Permissão bloqueada no navegador'
                    : 'Requer autorização no navegador'}
                </span>

                {windowsPermission === 'granted' ? (
                  <button
                    type="button"
                    onClick={handleTestWindows}
                    disabled={windowsTesting}
                    className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-zinc-200 hover:text-white transition-colors cursor-pointer disabled:opacity-50 border border-white/10"
                  >
                    <Play className="w-3 h-3 text-blue-400" />
                    <span>{windowsTesting ? 'Enviando...' : 'Testar no Windows'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={requestWindowsPermission}
                    className="inline-flex items-center gap-1.5 h-7 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors cursor-pointer shadow-sm"
                  >
                    <span>Autorizar no Windows</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Rodapé Fixo com Confirmação Visual de Auto-Save */}
          <div className="px-5 py-3.5 border-t border-white/[0.06] flex items-center justify-between bg-[#14151b] shrink-0">
            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Salvo automaticamente</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-5 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs transition-all cursor-pointer shadow-sm"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
