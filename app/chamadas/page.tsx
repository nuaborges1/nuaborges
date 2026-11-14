'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/nua/site/Header';
import { Footer } from '@/components/nua/site/Footer';
import { ContactModal } from '@/components/nua/site/ContactModal';
import { CheckoutModal, UniversalCheckoutContext } from '@/components/nua/site/CheckoutModal';
import { usePublishedContent } from '@/lib/contentStore';
import {
  AppointmentModality,
  DEFAULT_MODALITIES,
  formatCurrencyBrl,
  getBrasiliaNow,
} from '@/lib/appointmentsCanonical';
import {
  fetchAvailableSlots,
  submitBooking,
  verifyPixPayment,
} from '@/lib/services/nua/appointmentsService';
import { ChamadasHero } from '@/components/nua/chamadas/ChamadasHero';
import { ChamadasModalitiesSelector } from '@/components/nua/chamadas/ChamadasModalitiesSelector';
import { ChamadasCalendarPicker } from '@/components/nua/chamadas/ChamadasCalendarPicker';
import { ChamadasTimeSlotPicker } from '@/components/nua/chamadas/ChamadasTimeSlotPicker';
import { ChamadasBookingSummaryCard } from '@/components/nua/chamadas/ChamadasBookingSummaryCard';

export default function ChamadasPage() {
  const router = useRouter();
  const content = usePublishedContent();
  const [contactModalOpen, setContactModalOpen] = useState(false);

  // Estados do fluxo de agendamento
  const [modalities, setModalities] = useState<AppointmentModality[]>(DEFAULT_MODALITIES);
  const [selectedModality, setSelectedModality] = useState<AppointmentModality>(DEFAULT_MODALITIES[0]);

  // Calendário
  const brasiliaNow = useMemo(() => getBrasiliaNow(), []);
  const [currentMonth, setCurrentMonth] = useState(brasiliaNow.month - 1);
  const [currentYear, setCurrentYear] = useState(brasiliaNow.year);
  const [selectedDate, setSelectedDate] = useState<string>(brasiliaNow.dateString);

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
      subtitle: 'Chamada Privativa por Vídeo com Lua Borges',
      priceFormatted: formatCurrencyBrl(createdBooking.payment?.amount ?? createdBooking.price),
      numericPrice: createdBooking.payment?.amount ?? createdBooking.price,
      badge: 'Horário Pré-Reservado',
      details: [
        { label: 'Modalidade', value: createdBooking.modalityName },
        { label: 'Data', value: createdBooking.date.split('-').reverse().join('/') },
        { label: 'Horário', value: `${createdBooking.startTime} (Brasília)` },
        { label: 'Duração', value: `${createdBooking.durationMinutes} minutos` },
        { label: 'Cliente', value: createdBooking.clientName },
      ],
      accessUrl: `/chamadas/reserva?token=${createdBooking.publicToken}`,
      accessButtonText: 'Ver Voucher da Reserva',
      initialPayment: createdBooking.payment ? {
        orderId: createdBooking.payment.orderId || `apt_${createdBooking.id}`,
        purchaseToken: createdBooking.publicToken,
        qrCode: createdBooking.payment.pixPayload || '',
        qrCodeUrl: createdBooking.payment.pixQrCode || '',
        amount: createdBooking.payment.amount ?? createdBooking.price,
      } : undefined,
    };
  }, [createdBooking]);

  // Carrega modalidades e horários atualizados pelo administrador
  useEffect(() => {
    let active = true;
    async function loadServerModalities() {
      try {
        const apiUrl = typeof window !== 'undefined' ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3105' : '') : '';
        const res = await fetch(`${apiUrl}/api/appointments/availability?mode=modalities`);
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (active && data.success && Array.isArray(data.modalities) && data.modalities.length > 0) {
            setModalities(data.modalities);
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

  // Polling automático da confirmação do Pix em tempo real
  useEffect(() => {
    if (!createdBooking || createdBooking.status === 'confirmada' || createdBooking.status === 'confirmado') return;
    let cancelled = false;

    const interval = setInterval(async () => {
      try {
        const res = await verifyPixPayment(createdBooking.id);
        if (!cancelled && res.success && res.paid && res.booking) {
          clearInterval(interval);
          setCreatedBooking(res.booking);
          router.push(`/chamadas/reserva?token=${res.booking.publicToken}`);
        }
      } catch {
        // Ignora erros momentâneos de rede durante o polling
      }
    }, 2500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [createdBooking, router]);

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
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
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

      const isPast = dateString < brasiliaNow.dateString;
      const isToday = dateString === brasiliaNow.dateString;
      const isSelected = dateString === selectedDate;

      days.push({
        dateString,
        dayNumber: day,
        isCurrentMonth: true,
        isPast,
        isToday,
        isSelected,
      });
    }

    return days;
  }, [currentYear, currentMonth, selectedDate, brasiliaNow.dateString]);

  // Submissão do agendamento
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTime) {
      setSubmitError('Por favor, selecione um horário para a chamada.');
      return;
    }
    if (!termsAccepted) {
      setSubmitError('Por favor, aceite os termos de serviço e privacidade.');
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
      });

      if (res.success && res.booking) {
        setCreatedBooking(res.booking);
        try {
          localStorage.setItem(
            'nua_last_active_booking',
            JSON.stringify({
              token: res.booking.publicToken,
              id: res.booking.id,
              date: res.booking.date,
              startTime: res.booking.startTime,
              modalityName: res.booking.modalityName,
              createdAt: new Date().toISOString(),
            })
          );
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
    <div className="min-h-screen bg-black text-white selection:bg-[#f4a7b9] selection:text-black font-sans flex flex-col">
      <Header
        onOpenContact={() => setContactModalOpen(true)}
        activeSection="chamadas"
        customHeaderData={content.header}
      />

      <main className="flex-1 pt-28 sm:pt-32 pb-24 relative overflow-hidden">
        {/* Glow de fundo editorial */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-[#f4a7b9]/[0.035] rounded-full blur-[160px] pointer-events-none" />

        <div className="max-w-[72rem] mx-auto px-4 sm:px-8 md:px-10 lg:px-12 relative z-10">
          <ChamadasHero />

          {/* Grade de Agendamento Oficial */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* COLUNA ESQUERDA: Modalidades & Calendário & Horários (7 colunas) */}
            <div className="lg:col-span-7 space-y-10">
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
              />

              <ChamadasTimeSlotPicker
                loadingSlots={loadingSlots}
                slotsError={slotsError}
                availableSlots={availableSlots}
                selectedTime={selectedTime}
                onSelectTime={setSelectedTime}
              />
            </div>

            {/* COLUNA DIREITA: Formulário e Confirmação (5 colunas) */}
            <ChamadasBookingSummaryCard
              selectedModality={selectedModality}
              selectedDate={selectedDate}
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
      </main>

      {/* Modal Universal de Checkout Compartilhado (Avulsos, Chamadas e Personalizados) */}
      <CheckoutModal
        isOpen={!!createdBooking}
        onClose={() => setCreatedBooking(null)}
        checkoutContext={chamadaContext}
        onSuccess={() => {
          if (createdBooking?.publicToken) {
            router.push(`/chamadas/reserva?token=${createdBooking.publicToken}`);
          }
        }}
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
