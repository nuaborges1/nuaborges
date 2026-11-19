'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Film,
  Home,
  LogOut,
  Receipt,
  Sparkles,
  User,
  Video,
} from 'lucide-react';
import { Header } from '@/components/nua/site/Header';
import { Footer } from '@/components/nua/site/Footer';
import {
  fetchAppointments,
  fetchCustomerSession,
  fetchLibrary,
  fetchOverview,
  fetchPersonalizados,
  logoutCustomer,
  NuaIdAppointment,
  NuaIdLibraryItem,
  NuaIdOverviewResponse,
  NuaIdPersonalizado,
  NuaIdProfile,
} from '@/lib/nuaIdClient';
import { NuaIdLoginView } from './NuaIdLoginView';
import { ClaimOrderBox } from './ClaimOrderBox';
import { LibrarySection } from './LibrarySection';
import { AppointmentsSection } from './AppointmentsSection';
import { PersonalizadosSection } from './PersonalizadosSection';
import { OrdersSection } from './OrdersSection';
import { ProfileSection } from './ProfileSection';

type AccountTab = 'inicio' | 'biblioteca' | 'chamadas' | 'personalizados' | 'compras' | 'perfil';

const TABS: Array<{ id: AccountTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'inicio', label: 'Início', icon: Home },
  { id: 'biblioteca', label: 'Minha Biblioteca', icon: Film },
  { id: 'chamadas', label: 'Chamadas VIP', icon: Video },
  { id: 'personalizados', label: 'Personalizados', icon: Sparkles },
  { id: 'compras', label: 'Minhas Compras', icon: Receipt },
  { id: 'perfil', label: 'Meu Perfil', icon: User },
];

export function MinhaNuaShell() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [profile, setProfile] = useState<NuaIdProfile | null>(null);
  const [activeTab, setActiveTab] = useState<AccountTab>('inicio');
  const [refreshSignal, setRefreshSignal] = useState(0);

  const [overview, setOverview] = useState<NuaIdOverviewResponse['summary'] | null>(null);
  const [library, setLibrary] = useState<NuaIdLibraryItem[]>([]);
  const [appointments, setAppointments] = useState<NuaIdAppointment[]>([]);
  const [personalizados, setPersonalizados] = useState<NuaIdPersonalizado[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const checkSession = useCallback(async () => {
    setCheckingSession(true);
    try {
      const res = await fetchCustomerSession();
      if (res.ok && res.data?.authenticated && res.data.profile) {
        setProfile(res.data.profile);
      } else {
        setProfile(null);
      }
    } catch {
      setProfile(null);
    } finally {
      setCheckingSession(false);
    }
  }, []);

  const loadAccountData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [ov, lib, apt, pers] = await Promise.all([
        fetchOverview(),
        fetchLibrary(),
        fetchAppointments(),
        fetchPersonalizados(),
      ]);
      if (ov.ok && ov.data?.summary) setOverview(ov.data.summary);
      if (lib.ok && lib.data?.items) setLibrary(lib.data.items);
      if (apt.ok && apt.data?.appointments) setAppointments(apt.data.appointments);
      if (pers.ok && pers.data?.personalizados) setPersonalizados(pers.data.personalizados);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (profile) {
      loadAccountData();
    }
  }, [profile, loadAccountData, refreshSignal]);

  const handleLogout = async () => {
    await logoutCustomer();
    setProfile(null);
    setOverview(null);
    setLibrary([]);
    setAppointments([]);
    setPersonalizados([]);
    setActiveTab('inicio');
  };

  const triggerRefresh = () => setRefreshSignal((n) => n + 1);

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-[#080608] text-[#F5EEE9] selection:bg-[#661C30] selection:text-white">
      <Header activeSection="minha-nua" />

      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-24 sm:px-8 sm:pt-32">
        {checkingSession ? (
          <div className="mx-auto max-w-md space-y-4">
            <div className="h-10 w-48 animate-pulse rounded-full bg-[#171115]" />
            <div className="h-64 animate-pulse rounded-2xl border border-white/[0.06] bg-[#171115]/70" />
          </div>
        ) : !profile ? (
          <div className="py-6 sm:py-10">
            <NuaIdLoginView
              onAuthenticated={(prof) => {
                setProfile(prof);
              }}
            />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Cabeçalho editorial discreto */}
            <div className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-5 sm:flex-row sm:items-end sm:pb-6">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#A65B6C]">
                  Minha NUA · Área Privativa
                </p>
                <h1 className="mt-1.5 break-words font-serif text-2xl font-normal text-[#F5EEE9] sm:text-3xl">
                  Olá, {profile.displayName}
                </h1>
                <p className="mt-1 truncate text-xs text-zinc-400">{profile.email}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex min-h-[44px] w-full sm:w-fit items-center justify-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-300 transition-colors hover:border-[#90364B]/50 hover:text-[#F5EEE9] touch-manipulation"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sair da conta
              </button>
            </div>

            {/* Navegação de seções (mobile-first com scroll horizontal suave e sem quebra) */}
            <nav
              aria-label="Navegação da área privativa"
              className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:px-0"
            >
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs transition-all touch-manipulation ${
                      active
                        ? 'bg-[#661C30] font-semibold text-[#F5EEE9] shadow-[0_6px_20px_rgba(102,28,48,0.45)]'
                        : 'border border-white/[0.08] bg-[#140f13]/70 text-zinc-400 hover:border-[#7A293D]/45 hover:text-[#F5EEE9]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            {/* Conteúdo da seção ativa */}
            {activeTab === 'inicio' && (
              <div className="space-y-6">
                {/* Avisos relevantes */}
                {overview?.notices && overview.notices.length > 0 && (
                  <div className="space-y-2">
                    {overview.notices.map((n) => (
                      <div
                        key={n.id}
                        className="flex items-center gap-2.5 rounded-xl border border-amber-500/25 bg-amber-950/20 px-4 py-3 text-xs text-amber-200"
                      >
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{n.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                <ClaimOrderBox onClaimed={triggerRefresh} />

                {/* Acesso rápido sem dashboard SaaS inchado */}
                <div className="grid gap-4 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('biblioteca')}
                    className="group rounded-2xl border border-white/[0.08] bg-[#151014] p-5 text-left transition-colors hover:border-[#7A293D]/55"
                  >
                    <Film className="h-5 w-5 text-[#A65B6C]" />
                    <p className="mt-3 font-serif text-lg text-[#F5EEE9]">Minha Biblioteca</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {overview?.counts.libraryActive ?? 0} conteúdo(s) disponível(is)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('chamadas')}
                    className="group rounded-2xl border border-white/[0.08] bg-[#151014] p-5 text-left transition-colors hover:border-[#7A293D]/55"
                  >
                    <Video className="h-5 w-5 text-[#A65B6C]" />
                    <p className="mt-3 font-serif text-lg text-[#F5EEE9]">Chamadas VIP</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {overview?.counts.appointmentsUpcoming ?? 0} agendamento(s) ativo(s)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('personalizados')}
                    className="group rounded-2xl border border-white/[0.08] bg-[#151014] p-5 text-left transition-colors hover:border-[#7A293D]/55"
                  >
                    <Sparkles className="h-5 w-5 text-[#A65B6C]" />
                    <p className="mt-3 font-serif text-lg text-[#F5EEE9]">Personalizados</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {overview?.counts.personalizadosActive ?? 0} pedido(s) em andamento
                    </p>
                  </button>
                </div>

                {/* Últimas compras */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-serif text-lg text-[#F5EEE9]">Últimas movimentações</h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('compras')}
                      className="text-xs text-[#A65B6C] hover:text-[#F5EEE9]"
                    >
                      Ver histórico completo
                    </button>
                  </div>
                  {dataLoading ? (
                    <div className="h-28 animate-pulse rounded-2xl bg-[#151014]" />
                  ) : !overview || overview.recentOrders.length === 0 ? (
                    <div className="rounded-2xl border border-white/[0.07] bg-[#140f13]/60 p-6 text-center text-xs text-zinc-400">
                      Você ainda não tem pedidos vinculados a esta conta.{' '}
                      <Link href="/avulsos" className="text-[#A65B6C] underline hover:text-[#F5EEE9]">
                        Ver conteúdos disponíveis
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#151014]">
                      {overview.recentOrders.map((ord) => (
                        <div key={ord.id} className="flex items-center justify-between gap-4 px-4 py-3.5 text-xs">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-[#F5EEE9]">{ord.title}</p>
                            <p className="text-[11px] text-zinc-500">
                              {ord.kindLabel} · {ord.operationalLabel}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-medium text-[#F5EEE9]">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ord.amount)}
                            </p>
                            <p className="text-[11px] text-zinc-400">{ord.financialLabel}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {activeTab === 'biblioteca' && <LibrarySection items={library} loading={dataLoading} />}
            {activeTab === 'chamadas' && (
              <AppointmentsSection
                appointments={appointments}
                loading={dataLoading}
                onUpdated={triggerRefresh}
              />
            )}
            {activeTab === 'personalizados' && (
              <PersonalizadosSection items={personalizados} loading={dataLoading} />
            )}
            {activeTab === 'compras' && (
              <OrdersSection refreshSignal={refreshSignal} onClaimed={triggerRefresh} />
            )}
            {activeTab === 'perfil' && (
              <ProfileSection
                profile={profile}
                onProfileUpdated={(p) => setProfile(p)}
                onLoggedOut={handleLogout}
              />
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
