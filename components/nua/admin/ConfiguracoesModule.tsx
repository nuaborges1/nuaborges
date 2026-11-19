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
  Heart,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { useAdminOrderNotifications } from '@/hooks/useAdminOrderNotifications';
import { SiteContent } from '@/lib/types';
import { PageHeader, AdminTabs } from './ui/AdminPrimitives';

interface ConfiguracoesModuleProps {
  content: SiteContent;
  onContentChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  onAdministrativeChange?: (
    updater: (prev: SiteContent) => SiteContent,
    options?: { summary?: string; feedbackMessage?: string }
  ) => Promise<{ success: boolean; error?: string }>;
}

export function ConfiguracoesModule({
  content,
  onContentChange,
  onAdministrativeChange,
}: ConfiguracoesModuleProps) {
  const {
    settings,
    windowsPermission,
    updateSettings,
    requestWindowsPermission,
    testSound,
    testWindowsNotification,
    testTabFlash,
  } = useAdminOrderNotifications();

  const [activeTab, setActiveTab] = useState<'notificacoes' | 'nay' | 'diagnostico' | 'cms'>('notificacoes');

  // Preferências da Assistente Nay (100% humanizadas)
  const [userName, setUserName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nua_nay_username') || content.adminUi?.texts?.assistantUserName || 'Nua';
    }
    return 'Nua';
  });

  const [tone, setTone] = useState<'objetiva' | 'criativa' | 'tranquila'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('nua_nay_tone') as any) || 'criativa';
    }
    return 'criativa';
  });

  const [emojis, setEmojis] = useState<'discreto' | 'sem_emojis'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('nua_nay_emojis') as any) || 'discreto';
    }
    return 'discreto';
  });

  const [presence, setPresence] = useState<'fita_viva' | 'discreta'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('nua_nay_presence') as any) || 'fita_viva';
    }
    return 'fita_viva';
  });

  const [ambientTips, setAmbientTips] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem('nua_nay_ambient_tips');
      return v === null ? true : v === 'true';
    }
    return true;
  });

  const [memories, setMemories] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('nua_nay_memories');
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [
      'Você prefere fotos com iluminação quente de fim de tarde.',
      'Você costuma lançar novidades às sextas-feiras.',
      'Preço que você mais gosta para conteúdos especiais: R$ 89,00.',
    ];
  });

  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [newMemoryText, setNewMemoryText] = useState('');

  const handleSaveUserName = (name: string) => {
    setUserName(name);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nua_nay_username', name);
    }
  };

  const handleSelectTone = (t: 'objetiva' | 'criativa' | 'tranquila') => {
    setTone(t);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nua_nay_tone', t);
    }
    showToast('Estilo de conversa atualizado com carinho.');
  };

  const handleSelectEmojis = (e: 'discreto' | 'sem_emojis') => {
    setEmojis(e);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nua_nay_emojis', e);
    }
    showToast('Preferência de emojis salva.');
  };

  const handleSelectPresence = (p: 'fita_viva' | 'discreta') => {
    setPresence(p);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nua_nay_presence', p);
    }
    showToast('Presença no rodapé atualizada.');
  };

  const handleToggleAmbientTips = (enabled: boolean) => {
    setAmbientTips(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nua_nay_ambient_tips', String(enabled));
    }
    showToast(enabled ? 'Observações automáticas ativadas.' : 'Observações silenciadas.');
  };

  const handleForgetMemory = (index: number) => {
    const updated = memories.filter((_, i) => i !== index);
    setMemories(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nua_nay_memories', JSON.stringify(updated));
    }
    showToast('A Nay esqueceu essa preferência.');
  };

  const handleAddMemory = () => {
    if (!newMemoryText.trim()) return;
    const updated = [...memories, newMemoryText.trim()];
    setMemories(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nua_nay_memories', JSON.stringify(updated));
    }
    setNewMemoryText('');
    setIsAddingMemory(false);
    showToast('A Nay guardou essa nova preferência!');
  };

  const handleResetConversations = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('nua_ai_chat_active_conversation_id');
        localStorage.removeItem('nua_ai_chat_conversations_v1');
        window.dispatchEvent(new CustomEvent('reset_nua_ai_chat'));
      } catch {}
    }
    showToast('Histórico limpo. Pronta para recomeçar como no primeiro café!');
  };

  const handleToggleAi = (enabled: boolean) => {
    if (onAdministrativeChange) {
      onAdministrativeChange(
        (previous) => ({
          ...previous,
          adminUi: {
            version: previous.adminUi?.version ?? 1,
            modules: previous.adminUi?.modules || [],
            texts: previous.adminUi?.texts || {},
            ...previous.adminUi,
            aiEnabled: enabled,
          },
        }),
        {
          summary: enabled ? 'Assistente Nay ativada' : 'Assistente Nay pausada',
          feedbackMessage: enabled
            ? 'Assistente Nay pronta no painel.'
            : 'Assistente Nay pausada. Você está no comando solo.',
        }
      );
    } else {
      onContentChange((previous) => ({
        ...previous,
        adminUi: {
          ...previous.adminUi!,
          aiEnabled: enabled,
        },
      }));
    }
  };

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
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-[#171821] border border-[#e5b894]/40 text-white text-xs flex items-center gap-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95">
          <CheckCircle2 className="w-4 h-4 text-[#e5b894]" />
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
            : activeTab === 'nay'
            ? 'beta_ia'
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
              label: 'Alertas & Sons',
              icon: Volume2,
            },
            {
              id: 'nay',
              label: 'Assistente Nay',
              icon: Heart,
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Toque Sonoro */}
            <div className="p-5 rounded-2xl bg-[#14161d] border border-white/[0.06] flex flex-col justify-between space-y-4 shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#e5b894]">
                    {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.soundEnabled}
                      onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#e5b894]" />
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
                  <Play className="w-3 h-3 text-[#e5b894]" />
                  <span>{soundTesting ? 'Tocando...' : 'Testar Som'}</span>
                </button>
              </div>
            </div>

            {/* Card 2: Aba Piscando */}
            <div className="p-5 rounded-2xl bg-[#14161d] border border-white/[0.06] flex flex-col justify-between space-y-4 shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#e5b894]">
                    <Eye className="w-4 h-4" />
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.tabFlashEnabled}
                      onChange={(e) => updateSettings({ tabFlashEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#e5b894]" />
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
                  <Play className="w-3 h-3 text-[#e5b894]" />
                  <span>{tabTesting ? 'Piscando...' : 'Testar Aba'}</span>
                </button>
              </div>
            </div>

            {/* Card 3: Notificações no Computador */}
            <div className="p-5 rounded-2xl bg-[#14161d] border border-white/[0.06] flex flex-col justify-between space-y-4 shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#e5b894]">
                    <Laptop className="w-4 h-4" />
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.windowsNotificationEnabled}
                      onChange={(e) => updateSettings({ windowsNotificationEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#e5b894]" />
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
                    className="text-[10px] text-[#e5b894] hover:underline font-mono cursor-pointer"
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
                  <Play className="w-3 h-3 text-[#e5b894]" />
                  <span>{windowsTesting ? 'Enviando...' : 'Testar Aviso'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: ASSISTENTE NAY (HUMANIZADA, ZERO JARGÃO TÉCNICO) */}
      {activeTab === 'nay' && (
        <div className="space-y-6">
          {/* Seção 1: Como Nos Tratamos */}
          <div className="p-6 rounded-2xl bg-[#14161d] border border-white/[0.06] space-y-5 shadow-sm">
            <div className="border-b border-white/[0.06] pb-3">
              <h3 className="text-xs font-semibold tracking-wider uppercase font-mono text-[#e5b894]">
                Como Nos Tratamos
              </h3>
              <p className="text-[11px] text-zinc-400 font-light mt-0.5">
                Ajuste o tom e a intimidade da conversa nos bastidores.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-200 mb-1.5">
                  Como quero que você me chame:
                </label>
                <div className="max-w-xs">
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => handleSaveUserName(e.target.value)}
                    placeholder="Ex: Nua, Lua..."
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0e0f14] border border-white/10 text-xs text-white focus:outline-none focus:border-[#e5b894]/60 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-200 mb-2">
                  Como você quer que a Nay converse com você no dia a dia:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'objetiva',
                      title: 'Objetiva e Prática',
                      desc: 'Poucas palavras, foco em tarefas e agilidade.',
                    },
                    {
                      id: 'criativa',
                      title: 'Criativa e Cúmplice',
                      desc: 'Ideias de roteiros, fotos e reflexões.',
                    },
                    {
                      id: 'tranquila',
                      title: 'Tranquila e Calma',
                      desc: 'Sem pressa, tom suave e acolhedor.',
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectTone(item.id as any)}
                      className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        tone === item.id
                          ? 'bg-[#e5b894]/10 border-[#e5b894]/50 shadow-sm'
                          : 'bg-[#0e0f14] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div>
                        <span className={`text-xs font-semibold block ${tone === item.id ? 'text-[#e5b894]' : 'text-zinc-200'}`}>
                          {item.title}
                        </span>
                        <span className="text-[11px] text-zinc-400 font-light block mt-1 leading-relaxed">
                          {item.desc}
                        </span>
                      </div>
                      <span className={`inline-block mt-3 text-[10px] font-mono ${tone === item.id ? 'text-[#e5b894]' : 'text-zinc-600'}`}>
                        {tone === item.id ? '● Selecionado' : '○ Escolher'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-200 mb-2">
                  Uso de emojis nas respostas:
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectEmojis('discreto')}
                    className={`px-4 py-2 rounded-xl border text-xs font-medium transition cursor-pointer ${
                      emojis === 'discreto'
                        ? 'bg-[#e5b894]/15 border-[#e5b894]/50 text-[#e5b894]'
                        : 'bg-[#0e0f14] border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Discreto (1 ou 2 sutis)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectEmojis('sem_emojis')}
                    className={`px-4 py-2 rounded-xl border text-xs font-medium transition cursor-pointer ${
                      emojis === 'sem_emojis'
                        ? 'bg-[#e5b894]/15 border-[#e5b894]/50 text-[#e5b894]'
                        : 'bg-[#0e0f14] border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Sem emojis (só texto)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Seção 2: Presença na Tela */}
          <div className="p-6 rounded-2xl bg-[#14161d] border border-white/[0.06] space-y-5 shadow-sm">
            <div className="border-b border-white/[0.06] pb-3">
              <h3 className="text-xs font-semibold tracking-wider uppercase font-mono text-[#e5b894]">
                Presença na Tela
              </h3>
              <p className="text-[11px] text-zinc-400 font-light mt-0.5">
                Escolha como o Bastidor da Nay se comporta no rodapé do seu painel.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-200 mb-2">
                  Como a Nay deve ficar no rodapé:
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectPresence('fita_viva')}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-medium transition cursor-pointer text-left ${
                      presence === 'fita_viva'
                        ? 'bg-[#e5b894]/15 border-[#e5b894]/50 text-[#e5b894]'
                        : 'bg-[#0e0f14] border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="block font-semibold">Fita viva com animação sutil</span>
                    <span className="block text-[10px] text-zinc-400 font-light mt-0.5">Respiração e levitação suave no centro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPresence('discreta')}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-medium transition cursor-pointer text-left ${
                      presence === 'discreta'
                        ? 'bg-[#e5b894]/15 border-[#e5b894]/50 text-[#e5b894]'
                        : 'bg-[#0e0f14] border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="block font-semibold">Discreta (só ao chamar)</span>
                    <span className="block text-[10px] text-zinc-400 font-light mt-0.5">Fica submersa até você clicar para abrir</span>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ambientTips}
                    onChange={(e) => handleToggleAmbientTips(e.target.checked)}
                    className="mt-0.5 rounded border-white/20 bg-zinc-900 text-[#e5b894] focus:ring-[#e5b894]"
                  />
                  <div>
                    <span className="text-xs font-medium text-zinc-200 block">
                      Observações automáticas sobre a tela ativa
                    </span>
                    <span className="text-[11px] text-zinc-400 font-light block mt-0.5">
                      Avisa com calma quando houver algo útil (vitrine, rascunhos, pedidos), com intervalo suave de 12 segundos.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Seção 3: O Que a Nay Aprendeu Sobre Você */}
          <div className="p-6 rounded-2xl bg-[#14161d] border border-white/[0.06] space-y-5 shadow-sm">
            <div className="border-b border-white/[0.06] pb-3">
              <h3 className="text-xs font-semibold tracking-wider uppercase font-mono text-[#e5b894]">
                O Que a Nay Aprendeu Sobre Você
              </h3>
              <p className="text-[11px] text-zinc-400 font-light mt-0.5">
                Coisas que você comentou nas conversas e a Nay guardou para facilitar sua rotina.
              </p>
            </div>

            <div className="space-y-2.5">
              {memories.map((mem, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#0e0f14] border border-white/[0.06] flex items-center justify-between gap-3 text-xs"
                >
                  <span className="text-zinc-200 font-light">• {mem}</span>
                  <button
                    type="button"
                    onClick={() => handleForgetMemory(idx)}
                    className="text-[11px] text-zinc-500 hover:text-rose-400 px-2 py-1 rounded hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                  >
                    Esquecer
                  </button>
                </div>
              ))}

              {/* Ensinar uma preferência */}
              <div className="pt-2">
                {isAddingMemory ? (
                  <div className="p-3 rounded-xl bg-[#0e0f14] border border-[#e5b894]/30 space-y-2">
                    <input
                      type="text"
                      value={newMemoryText}
                      onChange={(e) => setNewMemoryText(e.target.value)}
                      placeholder="Ex: Prefiro fotos com iluminação quente de fim de tarde..."
                      className="w-full px-3 py-1.5 rounded-lg bg-[#14161d] border border-white/10 text-xs text-white focus:outline-none focus:border-[#e5b894]"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingMemory(false);
                          setNewMemoryText('');
                        }}
                        className="px-3 py-1 text-xs text-zinc-400 hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleAddMemory}
                        disabled={!newMemoryText.trim()}
                        className="px-3 py-1 rounded-lg bg-[#e5b894] text-zinc-950 font-medium text-xs hover:bg-[#ebd2bc] transition"
                      >
                        Lembrar disso
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingMemory(true)}
                    className="text-xs text-[#e5b894] hover:text-[#ebd2bc] font-medium inline-flex items-center gap-1.5 p-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ensinar uma preferência para a Nay</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Seção 4: Recomeçar do Zero */}
          <div className="p-6 rounded-2xl bg-[#14161d] border border-white/[0.06] space-y-3 shadow-sm">
            <h3 className="text-xs font-semibold tracking-wider uppercase font-mono text-zinc-400">
              Recomeçar
            </h3>
            <p className="text-[11px] text-zinc-400 font-light">
              Quer que a Nay esqueça as conversas antigas e comece como no primeiro café? Seus ensaios, vendas e produtos continuarão 100% seguros.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={handleResetConversations}
                className="h-8 px-4 rounded-xl bg-white/[0.04] hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/30 text-zinc-300 hover:text-rose-200 text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Recomeçar nossa conversa do zero</span>
              </button>
            </div>
          </div>

          {/* Seção 5: Pausa da Assistente */}
          <div className="p-6 rounded-2xl bg-[#14161d] border border-white/[0.06] flex items-center justify-between gap-4 shadow-sm">
            <div>
              <h3 className="text-xs font-semibold text-white tracking-wide">Pausa</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5 font-light">
                Assistente Nay ativa no painel (desmarque se preferir navegar sozinha).
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={content.adminUi?.aiEnabled !== false}
                onChange={(e) => handleToggleAi(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#e5b894]" />
            </label>
          </div>
        </div>
      )}

      {/* ABA 3: STATUS DOS SERVIÇOS (Linguagem clara para o negócio) */}
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
                  <Cloud className="w-4 h-4 text-[#e5b894]" />
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
                  <Database className="w-4 h-4 text-[#e5b894]" />
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
                  <CreditCard className="w-4 h-4 text-[#e5b894]" />
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
                  <CreditCard className="w-4 h-4 text-[#e5b894]" />
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
                  <Mail className="w-4 h-4 text-[#e5b894]" />
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
                  <ShieldCheck className="w-4 h-4 text-[#e5b894]" />
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
