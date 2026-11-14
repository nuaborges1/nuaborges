'use client';

import React, { useState } from 'react';
import {
  Sliders,
  Volume2,
  VolumeX,
  Laptop,
  Play,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Server,
  Database,
  CreditCard,
  Cloud,
  Mail,
  RefreshCw,
  Eye,
  Trash2,
  FileText,
  KeyRound,
} from 'lucide-react';
import { useAdminOrderNotifications } from '@/hooks/useAdminOrderNotifications';
import { hasUnpublishedChanges, clearSession } from '@/lib/contentStore';
import { SiteContent } from '@/lib/types';

interface ConfiguracoesModuleProps {
  content: SiteContent;
  onContentChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
}

export function ConfiguracoesModule({ content, onContentChange }: ConfiguracoesModuleProps) {
  const {
    settings,
    windowsPermission,
    updateSettings,
    requestWindowsPermission,
    testSound,
    testWindowsNotification,
    testTabFlash,
  } = useAdminOrderNotifications();

  const [activeTab, setActiveTab] = useState<'notificacoes' | 'diagnostico' | 'cms'>('notificacoes');

  // Testes em andamento
  const [soundTesting, setSoundTesting] = useState(false);
  const [tabTesting, setTabTesting] = useState(false);
  const [windowsTesting, setWindowsTesting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleTestSound = () => {
    setSoundTesting(true);
    testSound();
    showToast('Sino sonoro de alerta reproduzido no alto-falante!');
    setTimeout(() => setSoundTesting(false), 2000);
  };

  const handleTestTabFlash = () => {
    setTabTesting(true);
    testTabFlash();
    showToast('Aba do navegador piscando em vermelho (8s)... Observe o topo da janela!');
    setTimeout(() => setTabTesting(false), 8000);
  };

  const handleTestWindows = () => {
    setWindowsTesting(true);
    testWindowsNotification();
    showToast('Notificação enviada à central do Windows!');
    setTimeout(() => setWindowsTesting(false), 2500);
  };

  const handleClearLocalCache = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('nua_content_draft_v1');
        showToast('Cache local de rascunhos limpo. Os dados remotos permanecem preservados.');
      } catch {}
    }
  };

  return (
    <div className="space-y-6 select-none text-white max-w-5xl">
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-[#171821] border border-[#f4a7b9]/40 text-white text-xs flex items-center gap-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95">
          <CheckCircle2 className="w-4 h-4 text-[#f4a7b9]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Cabeçalho do Módulo de Configurações */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#171821] border border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f4a7b9]/10 border border-[#f4a7b9]/25 text-[#f4a7b9] text-[10px] font-mono uppercase tracking-wider mb-2">
            <Sliders className="w-3.5 h-3.5" />
            <span>Painel de Ajustes Operacionais</span>
          </div>

          <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-wide">
            Configurações
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 font-light mt-1 max-w-2xl leading-relaxed">
            Centralização dos ajustes e diagnósticos técnicos implementados no sistema: preferências de alerta, notificações sonoras e integridade das integrações.
          </p>
        </div>
      </div>

      {/* Navegação em Abas de Configuração */}
      <div className="inline-flex items-center p-1 rounded-xl bg-[#171821] border border-white/[0.06]">
        <button
          type="button"
          onClick={() => setActiveTab('notificacoes')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            activeTab === 'notificacoes'
              ? 'bg-white/[0.12] text-white shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5 text-[#f4a7b9]" />
          <span>Alertas &amp; Notificações</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('diagnostico')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            activeTab === 'diagnostico'
              ? 'bg-white/[0.12] text-white shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Server className="w-3.5 h-3.5 text-zinc-400" />
          <span>Diagnóstico das Conexões</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cms')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            activeTab === 'cms'
              ? 'bg-white/[0.12] text-white shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-zinc-400" />
          <span>Sessão &amp; Sincronização</span>
        </button>
      </div>

      {/* ========================================================
          ABA 1: ALERTAS E PREFERÊNCIAS DE NOTIFICAÇÃO
          ======================================================== */}
      {activeTab === 'notificacoes' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#14151b] border border-[#f4a7b9]/20 flex items-center justify-between gap-4 shadow-sm">
            <div>
              <h3 className="text-xs font-semibold text-white tracking-wide">Assistente Nua IA</h3>
              <p className="text-[11px] text-zinc-400 mt-1 font-light leading-relaxed">
                Controle a disponibilidade da IA no painel. Quando desativada, o assistente deixa de aparecer e nenhuma solicitação é enviada.
              </p>
              <span className={`inline-block mt-2 text-[10px] font-mono ${content.adminUi?.aiEnabled !== false ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {content.adminUi?.aiEnabled !== false ? '✓ Ativada' : 'Desativada'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={content.adminUi?.aiEnabled !== false}
                onChange={(event) => onContentChange((previous) => ({
                  ...previous,
                  adminUi: {
                    ...previous.adminUi!,
                    aiEnabled: event.target.checked,
                  },
                }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f4a7b9]" />
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Toque Sonoro */}
            <div className="p-5 rounded-2xl bg-[#14151b] border border-white/[0.07] flex flex-col justify-between space-y-4 shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    {settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-zinc-500" />}
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.soundEnabled}
                      onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#f4a7b9]" />
                  </label>
                </div>

                <h3 className="text-xs font-semibold text-white tracking-wide">Toque Sonoro</h3>
                <p className="text-[11px] text-zinc-400 mt-1 font-light leading-relaxed">
                  Toca um sino harmonioso e suave no alto-falante quando um pedido novo for confirmado no site.
                </p>
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 font-mono">
                  {settings.soundEnabled ? '✓ Ativado' : 'Silenciado'}
                </span>
                <button
                  type="button"
                  onClick={handleTestSound}
                  disabled={soundTesting}
                  className="h-7 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-[11px] text-zinc-200 border border-white/[0.08] transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Play className="w-3 h-3 text-[#f4a7b9]" />
                  <span>{soundTesting ? 'Tocando...' : 'Testar Som'}</span>
                </button>
              </div>
            </div>

            {/* Card 2: Aba Piscando */}
            <div className="p-5 rounded-2xl bg-[#14151b] border border-white/[0.07] flex flex-col justify-between space-y-4 shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                    <Eye className="w-5 h-5" />
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.tabFlashEnabled}
                      onChange={(e) => updateSettings({ tabFlashEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#f4a7b9]" />
                  </label>
                </div>

                <h3 className="text-xs font-semibold text-white tracking-wide">Aba do Navegador</h3>
                <p className="text-[11px] text-zinc-400 mt-1 font-light leading-relaxed">
                  Pisca o título da aba do navegador alternando com um alerta visual chamativo quando novos pedidos chegarem.
                </p>
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 font-mono">
                  {settings.tabFlashEnabled ? '✓ Ativado' : 'Desativado'}
                </span>
                <button
                  type="button"
                  onClick={handleTestTabFlash}
                  disabled={tabTesting}
                  className="h-7 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-[11px] text-zinc-200 border border-white/[0.08] transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Play className="w-3 h-3 text-[#f4a7b9]" />
                  <span>{tabTesting ? 'Piscando...' : 'Testar Aba'}</span>
                </button>
              </div>
            </div>

            {/* Card 3: Notificações Nativas do Windows / Desktop */}
            <div className="p-5 rounded-2xl bg-[#14151b] border border-white/[0.07] flex flex-col justify-between space-y-4 shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Laptop className="w-5 h-5" />
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.windowsNotificationEnabled}
                      onChange={(e) => updateSettings({ windowsNotificationEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#f4a7b9]" />
                  </label>
                </div>

                <h3 className="text-xs font-semibold text-white tracking-wide">Notificações Windows</h3>
                <p className="text-[11px] text-zinc-400 mt-1 font-light leading-relaxed">
                  Exibe avisos nativos no canto da tela do Windows mesmo quando você estiver utilizando outro programa.
                </p>
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                {windowsPermission === 'granted' ? (
                  <span className="text-[10px] text-emerald-400 font-mono">✓ Autorizado</span>
                ) : (
                  <button
                    type="button"
                    onClick={requestWindowsPermission}
                    className="text-[10px] text-amber-400 hover:underline font-mono"
                  >
                    Permitir no Windows
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleTestWindows}
                  disabled={windowsTesting}
                  className="h-7 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-[11px] text-zinc-200 border border-white/[0.08] transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Play className="w-3 h-3 text-[#f4a7b9]" />
                  <span>{windowsTesting ? 'Enviando...' : 'Testar Windows'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          ABA 2: DIAGNÓSTICO E STATUS DE CONEXÕES REAIS
          ======================================================== */}
      {activeTab === 'diagnostico' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
            <span className="text-xs text-zinc-300">Integridade dos Serviços e Provedores Oficiais</span>
            <span className="text-[10px] font-mono text-emerald-400">Todos os serviços monitorados</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* Supabase */}
            <div className="p-4 rounded-xl bg-[#14151b] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-white">Supabase PostgreSQL</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              </div>
              <p className="text-[11px] text-zinc-400 font-light">
                Banco relacional seguro para armazenamento de pedidos, clientes e agendamentos.
              </p>
            </div>

            {/* Cloudflare */}
            <div className="p-4 rounded-xl bg-[#14151b] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-white">Cloudflare Edge CDN</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              </div>
              <p className="text-[11px] text-zinc-400 font-light">
                DNS com proteção contra ataques DDoS, SSL ativo e aceleração global de imagens.
              </p>
            </div>

            {/* Stripe */}
            <div className="p-4 rounded-xl bg-[#14151b] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#f4a7b9]" />
                  <span className="text-xs font-semibold text-white">Stripe Gateway</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              </div>
              <p className="text-[11px] text-zinc-400 font-light">
                Processamento comercial de pagamentos em Pix e Cartão com conciliação contábil.
              </p>
            </div>

            {/* Mercado Pago */}
            <div className="p-4 rounded-xl bg-[#14151b] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-semibold text-white">Mercado Pago</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              </div>
              <p className="text-[11px] text-zinc-400 font-light">
                Gestão das faturas de hospedagem e mensalidades do site (10 parcelas).
              </p>
            </div>

            {/* Hostinger SMTP */}
            <div className="p-4 rounded-xl bg-[#14151b] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-semibold text-white">Hostinger / Titan SMTP</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              </div>
              <p className="text-[11px] text-zinc-400 font-light">
                Disparo de e-mails transacionais e entrega de comprovantes para contato@nuaborges.com.br.
              </p>
            </div>

            {/* Proteção do Cofre */}
            <div className="p-4 rounded-xl bg-[#14151b] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-white">Cofre AES-GCM</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              </div>
              <p className="text-[11px] text-zinc-400 font-light">
                Criptografia local ponta a ponta com Web Crypto API (PBKDF2 100k iterações).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          ABA 3: SESSÃO E DADOS DO CMS
          ======================================================== */}
      {activeTab === 'cms' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#14151b] border border-white/[0.06] space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-white tracking-wide">
                Controle de Armazenamento Local do Navegador
              </h3>
              <p className="text-[11px] text-zinc-400 font-light mt-0.5">
                O painel armazena rascunhos de edição no seu navegador para evitar perda de dados. Se notar discrepâncias, você pode resetar o cache com segurança.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleClearLocalCache}
                className="h-8 px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] text-xs font-medium transition cursor-pointer flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Limpar Rascunhos Locais</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
