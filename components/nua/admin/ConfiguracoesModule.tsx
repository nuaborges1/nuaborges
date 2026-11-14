'use client';

import React, { useState } from 'react';
import {
  Sliders,
  Volume2,
  VolumeX,
  Laptop,
  Play,
  CheckCircle2,
  ShieldCheck,
  Server,
  Database,
  CreditCard,
  Cloud,
  Mail,
  Eye,
  Trash2,
} from 'lucide-react';
import { useAdminOrderNotifications } from '@/hooks/useAdminOrderNotifications';
import { SiteContent } from '@/lib/types';
import { PageHeader, AdminTabs } from './ui/AdminPrimitives';

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
    showToast('Notificação enviada à central do sistema!');
    setTimeout(() => setWindowsTesting(false), 2500);
  };

  const handleClearLocalCache = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('nua_content_draft_v1');
        showToast('Cache local de rascunhos limpo. Os dados publicados permanecem preservados.');
      } catch {}
    }
  };

  return (
    <div className="space-y-6 select-none text-white w-full">
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-[#171821] border border-[#f4a7b9]/40 text-white text-xs flex items-center gap-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95">
          <CheckCircle2 className="w-4 h-4 text-[#f4a7b9]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Cabeçalho Padronizado do Módulo de Configurações */}
      <PageHeader
        title="Configurações"
        subtitle="Personalize como você deseja receber avisos de novos pedidos, verifique o funcionamento do site e gerencie rascunhos locais."
        helpId={
          activeTab === 'notificacoes'
            ? 'config_notificacoes'
            : activeTab === 'diagnostico'
            ? 'config_diagnostico'
            : 'config_sistema'
        }
      >
        <AdminTabs
          activeId={activeTab}
          onChange={setActiveTab}
          ariaLabel="Abas de Configurações"
          items={[
            {
              id: 'notificacoes',
              label: 'Alertas & Notificações',
              icon: Volume2,
            },
            {
              id: 'diagnostico',
              label: 'Status dos Serviços',
              icon: Server,
            },
            {
              id: 'cms',
              label: 'Sessão & Rascunhos',
              icon: Database,
            },
          ]}
        />
      </PageHeader>

      {/* ABA 1: ALERTAS E PREFERÊNCIAS DE NOTIFICAÇÃO */}
      {activeTab === 'notificacoes' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#14161d] border border-white/[0.06] flex items-center justify-between gap-4 shadow-sm">
            <div>
              <h3 className="text-xs font-semibold text-white tracking-wide">Assistente Nua IA</h3>
              <p className="text-[11px] text-zinc-400 mt-1 font-light leading-relaxed">
                Controle a disponibilidade da assistente inteligente no painel administrativo.
              </p>
              <span className={`inline-block mt-2 text-[10px] font-mono ${content.adminUi?.aiEnabled !== false ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {content.adminUi?.aiEnabled !== false ? 'Ativada' : 'Desativada'}
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
            <div className="p-5 rounded-2xl bg-[#14161d] border border-white/[0.06] flex flex-col justify-between space-y-4 shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#f4a7b9]">
                    {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
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
                  Toca um aviso sonoro suave quando um pedido novo for confirmado no site.
                </p>
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 font-mono">
                  {settings.soundEnabled ? 'Ativado' : 'Silenciado'}
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
            <div className="p-5 rounded-2xl bg-[#14161d] border border-white/[0.06] flex flex-col justify-between space-y-4 shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#f4a7b9]">
                    <Eye className="w-4 h-4" />
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
                  Destaca o título da aba do navegador quando novos pedidos chegarem.
                </p>
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 font-mono">
                  {settings.tabFlashEnabled ? 'Ativado' : 'Desativado'}
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

            {/* Card 3: Notificações no Computador */}
            <div className="p-5 rounded-2xl bg-[#14161d] border border-white/[0.06] flex flex-col justify-between space-y-4 shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#f4a7b9]">
                    <Laptop className="w-4 h-4" />
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

                <h3 className="text-xs font-semibold text-white tracking-wide">Avisos na Tela</h3>
                <p className="text-[11px] text-zinc-400 mt-1 font-light leading-relaxed">
                  Exibe avisos no canto da tela mesmo quando você estiver usando outro aplicativo.
                </p>
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                {windowsPermission === 'granted' ? (
                  <span className="text-[10px] text-emerald-400 font-mono">Autorizado</span>
                ) : (
                  <button
                    type="button"
                    onClick={requestWindowsPermission}
                    className="text-[10px] text-[#f4a7b9] hover:underline font-mono cursor-pointer"
                  >
                    Permitir avisos
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleTestWindows}
                  disabled={windowsTesting}
                  className="h-7 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-[11px] text-zinc-200 border border-white/[0.08] transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Play className="w-3 h-3 text-[#f4a7b9]" />
                  <span>{windowsTesting ? 'Enviando...' : 'Testar Aviso'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: STATUS DOS SERVIÇOS (Linguagem clara para o negócio) */}
      {activeTab === 'diagnostico' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#14161d] border border-white/[0.06] flex items-center justify-between">
            <span className="text-xs text-zinc-300">Funcionamento dos Serviços do Site</span>
            <span className="text-[10px] font-mono text-emerald-400">Tudo funcionando normalmente</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-xl bg-[#14161d] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-[#f4a7b9]" />
                  <span className="text-xs font-semibold text-white">Site Público &amp; Fotos</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              </div>
              <p className="text-[11px] text-zinc-400 font-light">
                Hospedagem rápida com cadeado de segurança (SSL) e carregamento otimizado de fotos e vídeos.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#14161d] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#f4a7b9]" />
                  <span className="text-xs font-semibold text-white">Banco de Dados do Painel</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              </div>
              <p className="text-[11px] text-zinc-400 font-light">
                Guarda seus packs, pedidos personalizados, agendamentos de chamadas e configurações.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#14161d] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#f4a7b9]" />
                  <span className="text-xs font-semibold text-white">Pagamentos de Clientes (Mercado Pago)</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              </div>
              <p className="text-[11px] text-zinc-400 font-light">
                Recebimento automático das vendas de Packs, Personalizados e Chamadas VIP.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#14161d] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#f4a7b9]" />
                  <span className="text-xs font-semibold text-white">Mensalidade do Site (PIX)</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              </div>
              <p className="text-[11px] text-zinc-400 font-light">
                Geração de QR Code PIX e recibos automáticos para as parcelas de manutenção do site.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#14161d] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#f4a7b9]" />
                  <span className="text-xs font-semibold text-white">Envio de E-mails</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              </div>
              <p className="text-[11px] text-zinc-400 font-light">
                Entrega automática de links de acesso aos clientes e recebimento de contatos comerciais.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#14161d] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#f4a7b9]" />
                  <span className="text-xs font-semibold text-white">Segurança e Criptografia</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              </div>
              <p className="text-[11px] text-zinc-400 font-light">
                Sessão administrativa protegida e tokens exclusivos para entregas no cofre dos clientes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: SESSÃO E RASCUNHOS DO PAINEL */}
      {activeTab === 'cms' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#14151b] border border-white/[0.06] space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-white tracking-wide">
                Rascunhos Salvos neste Navegador
              </h3>
              <p className="text-[11px] text-zinc-400 font-light mt-0.5">
                O painel guarda automaticamente rascunhos enquanto você edita o site. Se quiser descartar rascunhos locais não publicados neste aparelho, use o botão abaixo.
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
