/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Video } from 'lucide-react';
import { Header } from '@/components/nua/site/Header';
import { Footer } from '@/components/nua/site/Footer';
import { ContactModal } from '@/components/nua/site/ContactModal';
import { CheckoutModal, UniversalCheckoutContext } from '@/components/nua/site/CheckoutModal';
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
} from '@/lib/appointmentsCanonical';
import {
  fetchAvailableSlots,
  submitBooking,
} from '@/lib/services/nua/appointmentsService';
import { fetchCustomerSession } from '@/lib/nuaIdClient';
import { PublicPageHero } from '@/components/nua/site/PublicPageHero';
import { PublicBackground } from '@/components/nua/site/PublicBackground';
import { ChamadasModalitiesSelector } from '@/components/nua/chamadas/ChamadasModalitiesSelector';
import { ChamadasCalendarPicker } from '@/components/nua/chamadas/ChamadasCalendarPicker';
import { ChamadasTimeSlotPicker } from '@/components/nua/chamadas/ChamadasTimeSlotPicker';
import { ChamadasBookingSummaryCard } from '@/components/nua/chamadas/ChamadasBookingSummaryCard';
import { ChamadasComingSoonView } from '@/components/nua/chamadas/ChamadasComingSoonView';
import { CHAMADAS_PUBLIC_ENABLED } from '@/lib/featureFlags';

export default function ChamadasPage() {
  if (!CHAMADAS_PUBLIC_ENABLED) {
    return <ChamadasComingSoonView />;
  }

  return <ChamadasBookingFlow />;
}

function ChamadasBookingFlow() {
  const router = useRouter();
  const content = usePublishedContent();
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
  const [selectedDate, setSelectedDate] = useState<string>(scheduleNow.dateString);

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

  // Carrega horários disponíveis sempre que a data ou modalidade mudar
  useEffect(() => {
    let active = true;
    async function loadSlots() {
      if (!selectedDate || !selectedModality) return;
      setLoadingSlots(true);
      setSlotsError(null);
      setSelectedTime('');

      try {
        const res = await fetchAvailableSlots(selectedDate, selectedModality.id);
        if (active) {
          if (res.success && res.slots) {
            setAvailableSlots(res.slots);
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
    const shownMonth = new Date(Date.UTC(currentYear, currentMonth, 1));
    const nowMonth = new Date(Date.UTC(scheduleNow.year, scheduleNow.month - 1, 1));
    if (shownMonth <= nowMonth) return;
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    const limit = new Date(`${maxCalendarLimit}T12:00:00Z`);
    const shownMonth = new Date(Date.UTC(currentYear, currentMonth, 1));
    if (shownMonth.getUTCFullYear() > limit.getUTCFullYear() || (shownMonth.getUTCFullYear() === limit.getUTCFullYear() && shownMonth.getUTCMonth() >= limit.getUTCMonth())) return;
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Matriz de dias do mês atual
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(Date.UTC(currentYear, currentMonth, 1, 12, 0, 0)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 12, 0, 0)).getUTCDate();

    const days: Array<{
      dateString: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isPast: boolean;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    // Espaços do mês anterior
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({
        dateString: '',
        dayNumber: 0,
        isCurrentMonth: false,
        isPast: true,
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

      days.push({
        dateString,
        dayNumber: day,
        isCurrentMonth: true,
        isPast: isPast || isBeyondLimit,
        isToday,
        isSelected,
      });
    }

    return days;
  }, [currentYear, currentMonth, selectedDate, scheduleNow.dateString, maxCalendarLimit]);

  // Submissão do agendamento
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
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
      });

      if (res.success && res.booking) {
        setCreatedBooking(res.booking);
        try {
          // Salva objeto COMPLETO da reserva no armazenamento local para resiliência máxima
          localStorage.setItem('nua_last_active_booking', JSON.stringify(res.booking));
        } catch {}
        window.scrollTo({ top: 320, behavior: 'smooth' });
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

      <main className="flex-1 pt-28 sm:pt-36 pb-20 sm:pb-28 select-none relative">
        {/* Glow de fundo editorial unificado */}
        <PublicBackground />

        {/* Header Unificado & Padronizado */}
        <PublicPageHero
          icon={Video}
          eyebrow="EXPERIÊNCIA PRIVATIVA & AO VIVO"
          title="Encontros em Vídeo Privativo"
          subtitle="Tempo de qualidade, intimidade autoral e conexão profunda em sala privativa segura. Escolha a modalidade, selecione data e horário de sua preferência."
        />

        {/* Grade de Agendamento Oficial */}
        <section className="px-4 sm:px-8 md:px-10 lg:px-12 max-w-[72rem] mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* COLUNA ESQUERDA: Modalidades & Calendário & Horários (7 colunas) */}
            <div className="lg:col-span-7 space-y-6">
              <ChamadasModalitiesSelector
                modalities={modalities}
                selectedModality={selectedModality}
                onSelectModality={setSelectedModality}
              />

              <ChamadasCalendarPicker
                currentMonth={currentMonth}
                currentYear={currentYear}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                calendarDays={calendarDays}
                onSelectDate={setSelectedDate}
                timezoneLabel={`Fuso da agenda: ${getTimezoneShortLabel(scheduleTimezone)}`}
              />

              <ChamadasTimeSlotPicker
                loadingSlots={loadingSlots}
                slotsError={slotsError}
                availableSlots={availableSlots}
                selectedTime={selectedTime}
                onSelectTime={setSelectedTime}
                timezoneLabel={`Fuso da agenda: ${getTimezoneShortLabel(scheduleTimezone)}`}
              />
            </div>

            {/* COLUNA DIREITA: Formulário e Confirmação (5 colunas) */}
            <ChamadasBookingSummaryCard
              selectedModality={selectedModality}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              timezoneLabel={`Horário (${getTimezoneShortLabel(scheduleTimezone)})`}
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
        </section>
      </main>

      {/* Modal Universal de Checkout Compartilhado (Avulsos, Chamadas e Personalizados) */}
      <CheckoutModal
        isOpen={!!createdBooking}
        onClose={() => setCreatedBooking(null)}
        checkoutContext={chamadaContext}
      />

      <Footer
        customFooterData={content.footer}
        customInstitutionalData={content.institutional}
      />

      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        customContactData={content.contact}
      />
    </div>
  );
}
