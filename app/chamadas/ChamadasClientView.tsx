/* Vinho maduro / Nua Borges */
'use client';

import type { SiteContent } from '@/lib/types';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Video } from 'lucide-react';
import { Header } from '@/components/nua/site/Header';
import { Footer } from '@/components/nua/site/Footer';
import { ContactModal } from '@/components/nua/site/ContactModal';
import { LazyCheckoutModal } from '@/components/nua/site/LazyCheckoutModal';
import type { UniversalCheckoutContext } from '@/components/nua/checkout/types';
import { usePublishedContent, getPublicApiUrl } from '@/lib/contentStore';
import {
  AppointmentModality,
  DEFAULT_MODALITIES,
  DEFAULT_APPOINTMENTS_TIMEZONE,
  formatCurrencyBrl,
  formatDateForDisplay,
  getScheduleNow,
  getThreeMonthsFutureLimit,
  getTimezoneShortLabel,
  convertSlotBetweenTimezones,
} from '@/lib/appointmentsCanonical';
import {
  fetchAvailableSlots,
  fetchMonthAvailability,
  MonthDayAvailability,
  submitBooking,
} from '@/lib/services/nua/appointmentsService';
import { fetchCustomerSession, hasCustomerSessionHint } from '@/lib/nuaIdClient';
import { PublicPageHero } from '@/components/nua/site/PublicPageHero';
import { PublicBackground } from '@/components/nua/site/PublicBackground';
import { ChamadasModalitiesSelector } from '@/components/nua/chamadas/ChamadasModalitiesSelector';
import { CalendarDay, ChamadasCalendarPicker } from '@/components/nua/chamadas/ChamadasCalendarPicker';
import { ChamadasTimeSlotPicker } from '@/components/nua/chamadas/ChamadasTimeSlotPicker';
import { MobilePurchaseSteps, focusMobilePurchaseStep } from '@/components/nua/site/MobilePurchaseSteps';
import {
  ChamadasBookingSummaryCard,
  ChamadasFinalizationCard,
} from '@/components/nua/chamadas/ChamadasBookingSummaryCard';
import { ChamadasComingSoonView } from '@/components/nua/chamadas/ChamadasComingSoonView';
import { CHAMADAS_PUBLIC_ENABLED } from '@/lib/featureFlags';
import { useCopy } from '@/lib/copy';

export function ChamadasClientView({ initialContent }: { initialContent?: Partial<SiteContent> }) {
  if (!CHAMADAS_PUBLIC_ENABLED) {
    return <ChamadasComingSoonView />;
  }

  return <ChamadasBookingFlow initialContent={initialContent} />;
}

function ChamadasBookingFlow({ initialContent }: { initialContent?: Partial<SiteContent> }) {
  const router = useRouter();
  const content = usePublishedContent(initialContent);
  const { copy } = useCopy();
  const [step, setStep] = useState(0);
  const stepLabels = ['Modalidade', 'Data e horário', 'Dados e Pix'];
  const changeStep = (next: number) => {
    setStep(next);
    focusMobilePurchaseStep();
  };
  const [contactModalOpen, setContactModalOpen] = useState(false);

  // Estados do fluxo de agendamento
  const [modalities, setModalities] = useState<AppointmentModality[]>(DEFAULT_MODALITIES);
  const [selectedModality, setSelectedModality] = useState<AppointmentModality>(DEFAULT_MODALITIES[0]);
  const [scheduleTimezone, setScheduleTimezone] = useState(DEFAULT_APPOINTMENTS_TIMEZONE);
  const [maxAdvanceMonths, setMaxAdvanceMonths] = useState(3);

  // Fuso da agenda e fuso detectado do visitante
  const clientTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
    } catch {
      return 'America/Sao_Paulo';
    }
  }, []);

  const scheduleNow = useMemo(() => getScheduleNow(scheduleTimezone), [scheduleTimezone]);
  const maxCalendarLimit = useMemo(() => getThreeMonthsFutureLimit(scheduleTimezone, new Date(), maxAdvanceMonths), [scheduleTimezone, maxAdvanceMonths]);

  const [currentMonth, setCurrentMonth] = useState(scheduleNow.month - 1);
  const [currentYear, setCurrentYear] = useState(scheduleNow.year);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [monthAvailability, setMonthAvailability] = useState<Record<string, MonthDayAvailability>>({});
  const [loadingMonth, setLoadingMonth] = useState(true);
  const [monthError, setMonthError] = useState<string | null>(null);
  const [monthReloadSeq, setMonthReloadSeq] = useState(0);
  const [autoAdvancedMonthOnce, setAutoAdvancedMonthOnce] = useState(false);

  // Horários disponíveis
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // Formulário do Cliente
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Pré-preenche nome e e-mail se o cliente já estiver autenticado no NUA ID
  useEffect(() => {
    if (!hasCustomerSessionHint()) return;
    let active = true;
    fetchCustomerSession()
      .then((res) => {
        if (!active || !res.ok || !res.data?.authenticated || !res.data.profile) return;
        const prof = res.data.profile;
        setClientName((prev) => prev || prof.displayName || '');
        setClientEmail((prev) => prev || prof.email || '');
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Submissão & Checkout Pix
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdBooking, setCreatedBooking] = useState<any | null>(null);

  // Contexto para o Modal Universal de Pagamento Compartilhado
  const chamadaContext: UniversalCheckoutContext | null = useMemo(() => {
    if (!createdBooking) return null;
    return {
      type: 'chamada',
      id: createdBooking.id,
      title: createdBooking.modalityName,
      subtitle: 'Chamada Privativa por Vídeo com Nua Borges',
      priceFormatted: formatCurrencyBrl(createdBooking.payment?.amount ?? createdBooking.price),
      numericPrice: Number(createdBooking.payment?.amount ?? createdBooking.price) || 0,
      badge: 'Horário Pré-Reservado',
      details: [
        { label: 'Modalidade', value: createdBooking.modalityName },
        { label: 'Data', value: formatDateForDisplay(createdBooking.date) },
        {
          label: 'Horário',
          value: createdBooking.endTime
            ? `${createdBooking.startTime} às ${createdBooking.endTime}`
            : createdBooking.startTime,
        },
        { label: 'Duração', value: `${createdBooking.durationMinutes || 30} minutos` },
        { label: 'Cliente', value: createdBooking.clientName || 'Cliente VIP' },
      ],
      accessUrl: `/chamadas/reserva?token=${createdBooking.publicToken}`,
      accessButtonText: 'Ver Voucher da Reserva',
      initialPayment: createdBooking.payment ? {
        orderId: createdBooking.payment.orderId || createdBooking.id,
        purchaseToken: createdBooking.publicToken,
        qrCode: createdBooking.payment.pixPayload || '',
        qrCodeUrl: createdBooking.payment.pixQrCode || '',
        expiresAt: createdBooking.expiresAt,
        amount: Number(createdBooking.payment.amount ?? createdBooking.price) || 0,
      } : undefined,
    };
  }, [createdBooking]);

  // Carrega modalidades e horários atualizados pelo administrador
  useEffect(() => {
    let active = true;
    async function loadServerModalities() {
      try {
        const apiUrl = getPublicApiUrl();
        const res = await fetch(`${apiUrl}/api/appointments/availability?mode=modalities`);
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (active && data.success && Array.isArray(data.modalities) && data.modalities.length > 0) {
            setModalities(data.modalities);
            if (typeof data.settings?.timezone === 'string') setScheduleTimezone(data.settings.timezone);
            if (Number.isFinite(Number(data.settings?.maxAdvanceMonths))) setMaxAdvanceMonths(Number(data.settings.maxAdvanceMonths));
            setSelectedModality((prev) => {
              const matched = data.modalities.find((m: AppointmentModality) => m.id === prev?.id);
              return matched || data.modalities[0];
            });
          }
        }
      } catch {}
    }
    loadServerModalities();
    return () => {
      active = false;
    };
  }, []);

  const canGoPrevMonth = useMemo(() => {
    const shownMonth = new Date(Date.UTC(currentYear, currentMonth, 1));
    const nowMonth = new Date(Date.UTC(scheduleNow.year, scheduleNow.month - 1, 1));
    return shownMonth > nowMonth;
  }, [currentYear, currentMonth, scheduleNow.year, scheduleNow.month]);

  const canGoNextMonth = useMemo(() => {
    const limit = new Date(`${maxCalendarLimit}T12:00:00Z`);
    const shownMonth = new Date(Date.UTC(currentYear, currentMonth, 1));
    return (
      shownMonth.getUTCFullYear() < limit.getUTCFullYear() ||
      (shownMonth.getUTCFullYear() === limit.getUTCFullYear() &&
        shownMonth.getUTCMonth() < limit.getUTCMonth())
    );
  }, [currentYear, currentMonth, maxCalendarLimit]);

  // Carrega mapa mensal de disponibilidade real (fail-closed: sem mapa, nenhum dia fica clicável)
  useEffect(() => {
    let active = true;
    async function loadMonthMap() {
      if (!selectedModality) return;
      setLoadingMonth(true);
      setMonthError(null);
      try {
        const res = await fetchMonthAvailability(currentYear, currentMonth + 1, selectedModality.id);
        if (!active) return;
        if (res.success && res.days) {
          setMonthAvailability(res.days);
          setMonthError(null);
          if (typeof res.timezone === 'string') setScheduleTimezone(res.timezone);
          if (Number.isFinite(Number(res.maxAdvanceMonths))) {
            setMaxAdvanceMonths(Number(res.maxAdvanceMonths));
          }

          const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-`;
          setSelectedDate((prev) => {
            if (prev && prev.startsWith(currentMonthPrefix) && res.days[prev]?.available) {
              return prev;
            }
            return res.firstAvailableDate || '';
          });

          // Se o mês atual na abertura inicial estiver 100% sem vagas e houver próximo mês dentro do limite, avança uma vez
          if (!res.firstAvailableDate && !autoAdvancedMonthOnce && canGoNextMonth) {
            setAutoAdvancedMonthOnce(true);
            if (currentMonth === 11) {
              setCurrentMonth(0);
              setCurrentYear((y) => y + 1);
            } else {
              setCurrentMonth((m) => m + 1);
            }
          }
        } else {
          setMonthAvailability({});
          setSelectedDate('');
          setMonthError(res.error || 'Não foi possível consultar a agenda agora. Tente novamente.');
        }
      } catch {
        if (active) {
          setMonthAvailability({});
          setSelectedDate('');
          setMonthError('Falha de conexão ao consultar a disponibilidade. Tente novamente.');
        }
      } finally {
        if (active) setLoadingMonth(false);
      }
    }

    loadMonthMap();
    return () => {
      active = false;
    };
  }, [currentYear, currentMonth, selectedModality, autoAdvancedMonthOnce, canGoNextMonth, monthReloadSeq]);

  // Carrega horários disponíveis sempre que a data ou modalidade mudar
  useEffect(() => {
    let active = true;
    async function loadSlots() {
      if (!selectedDate || !selectedModality) {
        setAvailableSlots([]);
        setSelectedTime('');
        setSlotsError(null);
        setLoadingSlots(false);
        return;
      }
      setLoadingSlots(true);
      setSlotsError(null);
      setSelectedTime('');

      try {
        const res = await fetchAvailableSlots(selectedDate, selectedModality.id);
        if (active) {
          if (res.success && res.slots) {
            setAvailableSlots(res.slots);
            // Mantém mapa mensal sincronizado caso o último slot do dia tenha acabado de expirar/ser ocupado
            if (res.slots.length === 0) {
              setMonthAvailability((prev) => ({
                ...prev,
                [selectedDate]: { available: false, count: 0, reason: 'no_slots' },
              }));
            }
          } else {
            setAvailableSlots([]);
            setSlotsError(res.error || 'Nenhum horário disponível para esta data.');
          }
        }
      } catch {
        if (active) {
          setAvailableSlots([]);
          setSlotsError('Erro ao carregar horários livres.');
        }
      } finally {
        if (active) setLoadingSlots(false);
      }
    }

    loadSlots();
    return () => {
      active = false;
    };
  }, [selectedDate, selectedModality]);

  // Navegação do calendário
  const handlePrevMonth = () => {
    if (!canGoPrevMonth) return;
    setAutoAdvancedMonthOnce(true);
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (!canGoNextMonth) return;
    setAutoAdvancedMonthOnce(true);
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Matriz de dias do mês atual com bloqueio determinístico por disponibilidade real
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(Date.UTC(currentYear, currentMonth, 1, 12, 0, 0)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 12, 0, 0)).getUTCDate();

    const days: CalendarDay[] = [];

    // Espaços do mês anterior
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({
        dateString: '',
        dayNumber: 0,
        isCurrentMonth: false,
        isPast: true,
        isUnavailable: true,
        isToday: false,
        isSelected: false,
      });
    }

    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateString = `${currentYear}-${monthStr}-${dayStr}`;

      const isPast = dateString < scheduleNow.dateString;
      const isBeyondLimit = dateString > maxCalendarLimit;
      const isToday = dateString === scheduleNow.dateString;
      const isSelected = dateString === selectedDate;
      const dayInfo = monthAvailability[dateString];
      // Fail-closed: se o mapa mensal falhou ou não trouxe a data, não libera o clique
      const isUnavailable = Boolean(monthError) || (dayInfo ? !dayInfo.available : !loadingMonth);

      days.push({
        dateString,
        dayNumber: day,
        isCurrentMonth: true,
        isPast: isPast || isBeyondLimit,
        isUnavailable,
        slotsCount: dayInfo?.count,
        unavailableReason: dayInfo?.reason,
        isToday,
        isSelected,
      });
    }

    return days;
  }, [
    currentYear,
    currentMonth,
    selectedDate,
    scheduleNow.dateString,
    maxCalendarLimit,
    monthAvailability,
    monthError,
    loadingMonth,
  ]);

  const hasAnyAvailableInMonth = useMemo(() => {
    if (monthError) return false;
    const keys = Object.keys(monthAvailability);
    if (keys.length === 0) return loadingMonth;
    return keys.some((k) => monthAvailability[k]?.available);
  }, [monthAvailability, monthError, loadingMonth]);

  const scheduleInBrasilia = selectedDate && selectedTime
    ? convertSlotBetweenTimezones(selectedDate, selectedTime, scheduleTimezone, "America/Sao_Paulo")
    : null;

  // Submissão do agendamento
  const handleSubmitBooking = async (e: React.FormEvent, turnstileToken?: string) => {
    e.preventDefault();
    if (createdBooking) {
      setCheckoutOpen(true);
      return;
    }
    if (!selectedTime) {
      setSubmitError('Por favor, selecione um horário para a chamada.');
      return;
    }
    if (!termsAccepted) {
      setSubmitError('Por favor, aceite as diretrizes para prosseguir com o agendamento.');
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const res = await submitBooking({
        modalityId: selectedModality.id,
        date: selectedDate,
        startTime: selectedTime,
        clientName,
        clientEmail,
        clientPhone,
        clientNotes,
        termsAccepted,
        clientTimezone,
        turnstileToken,
      });

      if (res.success && res.booking) {
        setCreatedBooking(res.booking);
        setCheckoutOpen(true);
      } else {
        setSubmitError(res.error || 'Não foi possível confirmar o horário selecionado.');
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'Erro de comunicação ao agendar chamada.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-black text-white selection:bg-[#661C30] selection:text-white font-sans flex flex-col">
      <Header
        onOpenContact={() => setContactModalOpen(true)}
        activeSection="chamadas"
        customHeaderData={content.header}
      />

      <main className="flex-1 pt-28 sm:pt-36 pb-20 sm:pb-28 relative">
        {/* Glow de fundo editorial unificado */}
        <PublicBackground />

        {/* Header Unificado & Padronizado */}
        <PublicPageHero
          icon={Video}
          eyebrow={copy.chamadas.pageHeroEyebrow}
          title={copy.chamadas.pageHeroTitle}
          subtitle={copy.chamadas.pageHeroSubtitle}
        />

        {/* Grade de Agendamento em 3 Faixas Equilibradas */}
        <section className="px-4 sm:px-8 md:px-10 lg:px-12 max-w-[72rem] mx-auto relative z-10">
          <MobilePurchaseSteps labels={stepLabels} step={step} onChange={changeStep} summary={selectedModality.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />

          <div className="space-y-8 lg:space-y-10">
            {/* FAIXA 1: Escolha horizontal de modalidades */}
            <div className={step === 0 ? 'block' : 'hidden lg:block'}>
              <ChamadasModalitiesSelector
                modalities={modalities}
                selectedModality={selectedModality}
                onSelectModality={setSelectedModality}
              />
            </div>

            {/* FAIXA 2: Card único unificando Calendário (esq.) & Horários (dir.) */}
            <div className={step === 1 ? 'block' : 'hidden lg:block'}>
              <section
                aria-label="Escolha de data e horário"
                className="rounded-[28px] bg-[#08080c] border border-white/[0.08] p-5 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)]"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-0 items-start">
                  <div className="lg:col-span-5 lg:pr-8 lg:border-r lg:border-white/[0.08]">
                    <ChamadasCalendarPicker
                      embedded
                      currentMonth={currentMonth}
                      currentYear={currentYear}
                      canGoPrevMonth={canGoPrevMonth}
                      canGoNextMonth={canGoNextMonth}
                      loadingMonth={loadingMonth}
                      monthError={monthError}
                      onRetryMonth={() => setMonthReloadSeq((s) => s + 1)}
                      hasAnyAvailableInMonth={hasAnyAvailableInMonth}
                      onPrevMonth={handlePrevMonth}
                      onNextMonth={handleNextMonth}
                      calendarDays={calendarDays}
                      onSelectDate={setSelectedDate}
                      timezoneLabel={`Fuso da agenda: ${getTimezoneShortLabel(scheduleTimezone)}`}
                    />
                  </div>

                  <div className="lg:col-span-7 lg:pl-8 pt-6 border-t border-white/[0.08] lg:pt-0 lg:border-t-0">
                    <ChamadasTimeSlotPicker
                      embedded
                      loadingSlots={loadingSlots}
                      slotsError={slotsError}
                      availableSlots={availableSlots}
                      selectedDate={selectedDate}
                      selectedTime={selectedTime}
                      onSelectTime={setSelectedTime}
                      formatSlot={(time) => {
                        if (scheduleTimezone === 'America/Sao_Paulo') return '';
                        const slot = convertSlotBetweenTimezones(selectedDate, time, scheduleTimezone, 'America/Sao_Paulo');
                        return slot.date === selectedDate ? slot.time : slot.time + ' · ' + slot.date.slice(8, 10) + '/' + slot.date.slice(5, 7);
                      }}
                      timezoneLabel={`Fuso da agenda: ${getTimezoneShortLabel(scheduleTimezone)}`}
                    />
                  </div>
                </div>
              </section>
            </div>

            {step < 2 && (
              <MobilePurchaseSteps
                footer
                labels={stepLabels}
                step={step}
                onChange={changeStep}
                canContinue={step === 0 ? Boolean(selectedModality) : Boolean(selectedDate && selectedTime && !loadingSlots && availableSlots.includes(selectedTime))}
                hint="Escolha um dia e um horário disponível."
              />
            )}

            {/* FAIXA 3: Fechamento equilibrado — Identificação (esq.) + Resumo & Diretrizes (dir.) */}
            <div className={step === 2 ? 'block' : 'hidden lg:block'}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
                <aside
                  aria-label="Resumo da reserva"
                  className="order-1 lg:order-2 lg:col-span-5 flex flex-col"
                >
                  <ChamadasBookingSummaryCard
                    selectedModality={selectedModality}
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    timezoneLabel={`Horário (${getTimezoneShortLabel(scheduleTimezone)})`}
                    brasiliaSummary={scheduleInBrasilia && scheduleTimezone !== 'America/Sao_Paulo' ? formatDateForDisplay(scheduleInBrasilia.date) + ' às ' + scheduleInBrasilia.time : null}
                  />
                </aside>

                <div className="order-2 lg:order-1 lg:col-span-7">
                  <ChamadasFinalizationCard
                    selectedTime={selectedTime}
                    clientName={clientName}
                    setClientName={setClientName}
                    clientEmail={clientEmail}
                    setClientEmail={setClientEmail}
                    clientPhone={clientPhone}
                    setClientPhone={setClientPhone}
                    clientNotes={clientNotes}
                    setClientNotes={setClientNotes}
                    termsAccepted={termsAccepted}
                    setTermsAccepted={setTermsAccepted}
                    submitError={submitError}
                    isSubmitting={isSubmitting}
                    onSubmit={handleSubmitBooking}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {createdBooking && !checkoutOpen && (
        <aside className="mx-auto w-full max-w-[72rem] px-4 pb-6 sm:px-8" aria-label="Reserva criada">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#90364B]/40 bg-[#140c12] p-4">
            <p className="flex-1 text-sm text-white">Você já iniciou esta reserva.</p>
            <button type="button" className="min-h-11 rounded-xl bg-[#79283e] px-4 text-sm font-semibold text-white" onClick={() => setCheckoutOpen(true)}>Continuar pagamento</button>
            <a className="inline-flex min-h-11 items-center text-sm text-[#e6b2be] underline" href={chamadaContext?.accessUrl}>Ver reserva</a>
            <button type="button" className="min-h-11 text-sm text-zinc-300 underline" onClick={() => {
              setCreatedBooking(null);
              changeStep(1);
            }}>Escolher outro horário</button>
          </div>
        </aside>
      )}

      {/* Modal Universal de Checkout Compartilhado (Avulsos, Chamadas e Personalizados) */}
      <LazyCheckoutModal
        isOpen={checkoutOpen && !!createdBooking}
        onClose={() => setCheckoutOpen(false)}
        checkoutContext={chamadaContext}
      />

      <Footer
        customFooterData={content.footer}
        customInstitutionalData={content.institutional}
        customChannelsData={content.channels}
      />

      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        customContactData={content.contact}
      />
    </div>
  );
}
