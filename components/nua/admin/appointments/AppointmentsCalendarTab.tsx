'use client';

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Ban,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Plus,
  Eye,
  Clock,
} from 'lucide-react';
import {
  AppointmentBooking,
  AppointmentScheduleSettings,
  formatCurrencyBrl,
} from '@/lib/appointmentsCanonical';

const WEEKDAYS = [
  { id: 0, label: 'Domingo' },
  { id: 1, label: 'Segunda-feira' },
  { id: 2, label: 'Terça-feira' },
  { id: 3, label: 'Quarta-feira' },
  { id: 4, label: 'Quinta-feira' },
  { id: 5, label: 'Sexta-feira' },
  { id: 6, label: 'Sábado' },
];

interface AppointmentsCalendarTabProps {
  calendarDateInfo: {
    title: string;
    days: Array<{ dayNumber: number; dateStr: string } | null>;
    year: number;
    month: number;
  };
  setCalendarMonthOffset: React.Dispatch<React.SetStateAction<number>>;
  selectedCalendarDate: string;
  setSelectedCalendarDate: (d: string) => void;
  settings: AppointmentScheduleSettings;
  bookings: AppointmentBooking[];
  selectedDayBookings: AppointmentBooking[];
  upcomingBookings: AppointmentBooking[];
  onToggleBlockDate: (d: string) => void;
  onOpenMeetingModal: (b: AppointmentBooking) => void;
  onOpenBookingDetails?: (b: AppointmentBooking) => void;
}

export function AppointmentsCalendarTab({
  calendarDateInfo,
  setCalendarMonthOffset,
  selectedCalendarDate,
  setSelectedCalendarDate,
  settings,
  bookings,
  selectedDayBookings,
  upcomingBookings,
  onToggleBlockDate,
  onOpenMeetingModal,
  onOpenBookingDetails,
}: AppointmentsCalendarTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda: Calendário Mensal */}
        <div className="lg:col-span-7 bg-[#171821] border border-white/[0.06] rounded-2xl p-5 sm:p-6 shadow-xl">
          {/* Controles de Mês */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-5">
            <div>
              <h3 className="font-serif text-lg sm:text-xl text-white font-medium capitalize">
                {calendarDateInfo.title}
              </h3>
              <p className="text-[11px] text-zinc-400">
                Clique em qualquer dia para ver horários ou bloquear na agenda
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCalendarMonthOffset((prev) => prev - 1)}
                className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white transition cursor-pointer"
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setCalendarMonthOffset(0);
                  setSelectedCalendarDate(new Date().toISOString().split('T')[0]);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white text-xs font-medium transition cursor-pointer"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setCalendarMonthOffset((prev) => prev + 1)}
                className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white transition cursor-pointer"
                title="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cabeçalho dos Dias da Semana */}
          <div className="grid grid-cols-7 gap-1.5 mb-2 text-center">
            {WEEKDAYS.map((wd) => (
              <span key={wd.id} className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider py-1">
                {wd.label.slice(0, 3)}
              </span>
            ))}
          </div>

          {/* Grade de Dias */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarDateInfo.days.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="h-14 sm:h-18 rounded-xl bg-transparent" />;
              }

              const todayStr = new Date().toISOString().split('T')[0];
              const isToday = day.dateStr === todayStr;
              const isSelected = day.dateStr === selectedCalendarDate;
              const isBlocked = (settings.blockedDates ?? []).includes(day.dateStr);

              const dateObj = new Date(`${day.dateStr}T12:00:00Z`);
              const weekdayId = dateObj.getUTCDay();
              const isWeekdayActive = settings.weeklyHours?.[weekdayId]?.enabled ?? true;

              const dayBookings = bookings.filter((b) => b.date === day.dateStr && b.status !== 'cancelada');
              const hasConfirmed = dayBookings.some((b) => b.status === 'confirmada');
              const hasPending = dayBookings.some((b) => b.status === 'aguardando_pagamento');

              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => setSelectedCalendarDate(day.dateStr)}
                  className={`h-14 sm:h-18 p-1.5 sm:p-2 rounded-xl text-left flex flex-col justify-between transition-all duration-150 cursor-pointer relative ${isSelected
                    ? 'ring-2 ring-[#f4a7b9] bg-[#f4a7b9]/15 shadow-lg shadow-[#f4a7b9]/5'
                    : isBlocked
                      ? 'bg-red-950/20 border border-red-500/25 hover:border-red-500/40 text-zinc-400'
                      : !isWeekdayActive
                        ? 'bg-[#12131a] opacity-40 hover:opacity-75 border border-white/[0.02]'
                        : 'bg-[#101117] border border-white/[0.04] hover:border-white/[0.12] hover:bg-[#161722]'
                    }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-mono font-medium ${isSelected
                        ? 'text-[#f4a7b9] font-bold'
                        : isToday
                          ? 'text-white font-bold px-1.5 py-0.2 rounded-full bg-[#f4a7b9]/25 text-[11px]'
                          : isBlocked
                            ? 'text-red-400'
                            : 'text-zinc-300'
                        }`}
                    >
                      {day.dayNumber}
                    </span>

                    {isBlocked && (
                      <span title="Data bloqueada na agenda">
                        <Ban className="w-3 h-3 text-red-400" />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 mt-auto">
                    {dayBookings.length > 0 && (
                      <div className="flex items-center gap-1">
                        {hasConfirmed && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                        )}
                        {hasPending && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
                        )}
                        <span className="text-[10px] font-mono text-zinc-400 font-semibold">
                          {dayBookings.length}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legenda do Calendário */}
          <div className="flex flex-wrap items-center gap-4 mt-5 pt-4 border-t border-white/[0.06] text-[11px] text-zinc-400 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Confirmada (Paga)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Aguardando Pix</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Ban className="w-3 h-3 text-red-400" />
              <span>Dia Bloqueado (Folga)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full ring-1 ring-[#f4a7b9] bg-[#f4a7b9]/20" />
              <span>Dia Selecionado</span>
            </span>
          </div>
        </div>

        {/* Coluna Direita: Detalhes do Dia Selecionado */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#171821] border border-white/[0.06] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div>
                <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider block">
                  Dia Selecionado
                </span>
                <h4 className="font-semibold text-base text-white">
                  {selectedCalendarDate.split('-').reverse().join('/')}
                </h4>
              </div>

              <button
                type="button"
                onClick={() => onToggleBlockDate(selectedCalendarDate)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${settings.blockedDates.includes(selectedCalendarDate)
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400'
                  }`}
              >
                <Ban className="w-3.5 h-3.5" />
                <span>
                  {settings.blockedDates.includes(selectedCalendarDate)
                    ? 'Desbloquear Dia'
                    : 'Bloquear Folga'}
                </span>
              </button>
            </div>

            {/* Status da Data */}
            {settings.blockedDates.includes(selectedCalendarDate) ? (
              <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/20 text-xs text-red-300 flex items-center gap-2">
                <Ban className="w-4 h-4 text-red-400 shrink-0" />
                <span>Esta data está bloqueada para novos clientes no site (Folga).</span>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Agenda aberta para clientes agendarem nesta data.</span>
              </div>
            )}

            {/* Lista de Chamadas no Dia */}
            <div className="space-y-2.5 pt-2">
              <h5 className="text-xs font-mono uppercase text-zinc-400 tracking-wider">
                Agendamentos no Dia ({selectedDayBookings.length})
              </h5>

              {selectedDayBookings.length === 0 ? (
                <div className="py-8 text-center rounded-xl bg-[#101117] border border-white/[0.04]">
                  <Calendar className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
                  <p className="text-xs text-zinc-400">Nenhum agendamento para este dia.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {selectedDayBookings.map((b) => (
                    <div
                      key={b.id}
                      className="p-3.5 rounded-xl bg-[#101117] border border-white/[0.06] hover:border-white/[0.12] transition space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#f4a7b9]" />
                          <span>{b.startTime} às {b.endTime}</span>
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${b.status === 'confirmada'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : b.status === 'aguardando_pagamento'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-white/[0.06] text-zinc-400'
                            }`}
                        >
                          {b.status === 'confirmada'
                            ? 'Confirmada'
                            : b.status === 'aguardando_pagamento'
                              ? 'Pendente'
                              : b.status}
                        </span>
                      </div>

                      <div className="text-xs text-zinc-300 font-medium">{b.clientName}</div>
                      <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                        <span>{b.modalityName}</span>
                        <span className="font-mono text-[#f4a7b9]">{formatCurrencyBrl(b.price)}</span>
                      </div>

                      <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between gap-2">
                        {b.meeting?.url ? (
                          <a
                            href={b.meeting.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-[#f4a7b9] hover:underline flex items-center gap-1 truncate max-w-[150px]"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span>Abrir Sala</span>
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onOpenMeetingModal(b)}
                            className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Adicionar Link</span>
                          </button>
                        )}

                        {onOpenBookingDetails && (
                          <button
                            type="button"
                            onClick={() => onOpenBookingDetails(b)}
                            className="h-6 px-2.5 rounded-lg bg-[#f4a7b9]/15 hover:bg-[#f4a7b9]/25 text-[#f4a7b9] text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Detalhes</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card de Próximas Chamadas Confirmadas */}
          <div className="bg-[#171821] border border-white/[0.06] rounded-2xl p-4 shadow-xl space-y-3">
            <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider block">
              Próximas Chamadas Confirmadas
            </span>
            {upcomingBookings.length === 0 ? (
              <p className="text-xs text-zinc-500 py-2">Nenhuma chamada futura agendada.</p>
            ) : (
              <div className="space-y-2">
                {upcomingBookings.map((ub) => (
                  <div
                    key={ub.id}
                    onClick={() => {
                      setSelectedCalendarDate(ub.date);
                    }}
                    className="p-2.5 rounded-lg bg-[#101117] hover:bg-[#141620] border border-white/[0.04] flex items-center justify-between text-xs cursor-pointer transition"
                  >
                    <div>
                      <div className="font-medium text-white flex items-center gap-1.5">
                        <span>{ub.clientName}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          ({ub.date.split('-').reverse().join('/')})
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-[#f4a7b9]" />
                        <span>{ub.startTime} &bull; {ub.modalityName}</span>
                      </div>
                    </div>
                    <span className="text-[#f4a7b9] font-mono text-xs font-semibold">
                      {formatCurrencyBrl(ub.price)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
