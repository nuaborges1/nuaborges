'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { AppointmentScheduleSettings } from '@/lib/appointmentsCanonical';

const WEEKDAYS = [
  { id: 0, label: 'Domingo' },
  { id: 1, label: 'Segunda-feira' },
  { id: 2, label: 'Terça-feira' },
  { id: 3, label: 'Quarta-feira' },
  { id: 4, label: 'Quinta-feira' },
  { id: 5, label: 'Sexta-feira' },
  { id: 6, label: 'Sábado' },
];

interface AppointmentsSettingsTabProps {
  settings: AppointmentScheduleSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppointmentScheduleSettings>>;
  onSaveSettings: () => void;
  showToast: (msg: string) => void;
}

export function AppointmentsSettingsTab({
  settings,
  setSettings,
  onSaveSettings,
  showToast,
}: AppointmentsSettingsTabProps) {
  const [newBlockedDate, setNewBlockedDate] = useState('');

  const handleAddBlockedDate = () => {
    if (!newBlockedDate || !/^\d{4}-\d{2}-\d{2}$/.test(newBlockedDate)) {
      showToast('Informe uma data válida (AAAA-MM-DD).');
      return;
    }
    if (settings.blockedDates?.includes(newBlockedDate)) {
      showToast('Esta data já está bloqueada.');
      return;
    }
    const updated = {
      ...settings,
      blockedDates: [...(settings.blockedDates || []), newBlockedDate].sort(),
    };
    setSettings(updated);
    setNewBlockedDate('');
  };

  const handleRemoveBlockedDate = (dateToRemove: string) => {
    const updated = {
      ...settings,
      blockedDates: (settings.blockedDates ?? []).filter((d) => d !== dateToRemove),
    };
    setSettings(updated);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Horários Semanais */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] space-y-4 shadow-sm">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-white mb-1">
            Dias e Horários de Atendimento Semanal
          </h3>
          <p className="text-zinc-400 text-xs font-light">
            Defina em quais dias você atende e o intervalo de início e término.
          </p>
        </div>

        <div className="space-y-2.5">
          {WEEKDAYS.map((day) => {
            const daySchedule = settings.weeklyHours?.[day.id] || { enabled: false, ranges: [] };
            const range = daySchedule.ranges?.[0] || { start: '14:00', end: '21:00' };

            return (
              <div
                key={day.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-[#101116] border border-white/[0.06] gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={daySchedule.enabled}
                    onChange={(e) => {
                      const updated = {
                        ...settings,
                        weeklyHours: {
                          ...settings.weeklyHours,
                          [day.id]: {
                            enabled: e.target.checked,
                            ranges: e.target.checked
                              ? [{ start: range.start, end: range.end }]
                              : [],
                          },
                        },
                      };
                      setSettings(updated);
                    }}
                    className="rounded bg-[#0e0f14] border-white/20 text-[#f4a7b9] cursor-pointer"
                  />
                  <span className={`font-medium ${daySchedule.enabled ? 'text-white' : 'text-zinc-500'}`}>
                    {day.label}
                  </span>
                </div>

                {daySchedule.enabled ? (
                  <div className="flex items-center gap-2 font-mono">
                    <span>Das</span>
                    <input
                      type="time"
                      value={range.start}
                      onChange={(e) => {
                        const updated = {
                          ...settings,
                          weeklyHours: {
                            ...settings.weeklyHours,
                            [day.id]: {
                              enabled: true,
                              ranges: [{ start: e.target.value, end: range.end }],
                            },
                          },
                        };
                        setSettings(updated);
                      }}
                      className="bg-[#0e0f14] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                    <span>às</span>
                    <input
                      type="time"
                      value={range.end}
                      onChange={(e) => {
                        const updated = {
                          ...settings,
                          weeklyHours: {
                            ...settings.weeklyHours,
                            [day.id]: {
                              enabled: true,
                              ranges: [{ start: range.start, end: e.target.value }],
                            },
                          },
                        };
                        setSettings(updated);
                      }}
                      className="bg-[#0e0f14] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                ) : (
                  <span className="text-zinc-600 font-mono text-[11px]">Fechado / Sem atendimento</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Regras de Agenda (Buffer, Antecedência, Limite) */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] space-y-4 shadow-sm">
        <h3 className="text-sm sm:text-base font-semibold text-white">Regras de Agendamento</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
          <div>
            <label className="block text-zinc-400 mb-1.5 font-medium">
              Intervalo entre chamadas (Buffer)
            </label>
            <select
              value={settings.bufferMinutes}
              onChange={(e) => setSettings({ ...settings, bufferMinutes: Number(e.target.value) })}
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white"
            >
              <option value={10}>10 minutos</option>
              <option value={15}>15 minutos (recomendado)</option>
              <option value={20}>20 minutos</option>
              <option value={30}>30 minutos</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1.5 font-medium">
              Antecedência Mínima
            </label>
            <select
              value={settings.minNoticeHours}
              onChange={(e) => setSettings({ ...settings, minNoticeHours: Number(e.target.value) })}
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white"
            >
              <option value={2}>2 horas</option>
              <option value={4}>4 horas (recomendado)</option>
              <option value={12}>12 horas</option>
              <option value={24}>24 horas (1 dia)</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1.5 font-medium">
              Limite Futuro de Reserva
            </label>
            <select
              value={settings.maxFutureDays}
              onChange={(e) => setSettings({ ...settings, maxFutureDays: Number(e.target.value) })}
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white"
            >
              <option value={15}>15 dias à frente</option>
              <option value={30}>30 dias à frente (recomendado)</option>
              <option value={60}>60 dias à frente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bloqueio de Datas Especiais (Férias, Folgas) */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] space-y-4 shadow-sm">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-white mb-1">
            Datas Bloqueadas (Férias e Folgas)
          </h3>
          <p className="text-zinc-400 text-xs font-light">
            Adicione datas específicas em que você não irá atender (formato AAAA-MM-DD).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={newBlockedDate}
            onChange={(e) => setNewBlockedDate(e.target.value)}
            className="bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
          />
          <button
            type="button"
            onClick={handleAddBlockedDate}
            className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] text-xs font-medium cursor-pointer"
          >
            Bloquear Data
          </button>
        </div>

        {settings.blockedDates?.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {settings.blockedDates.map((d) => (
              <span
                key={d}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-mono"
              >
                <span>{d.split('-').reverse().join('/')}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveBlockedDate(d)}
                  className="hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Botão Salvar Todas as Configurações */}
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={onSaveSettings}
          className="h-9 px-6 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs transition-all shadow-sm cursor-pointer"
        >
          Salvar Alterações de Horários
        </button>
      </div>
    </div>
  );
}
