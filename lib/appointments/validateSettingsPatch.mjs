const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const weekdays = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

/** @param {unknown} settings */
export function validateSettingsPatch(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return 'Configurações de agenda inválidas.';
  }
  if (!('weeklyHours' in settings)) return null;

  const weeklyHours = settings.weeklyHours;
  if (!weeklyHours || typeof weeklyHours !== 'object' || Array.isArray(weeklyHours)) {
    return 'Os horários habituais da agenda são inválidos.';
  }
  for (const [day, schedule] of Object.entries(weeklyHours)) {
    const weekday = weekdays[Number(day)];
    if (!/^[0-6]$/.test(day) || !schedule || typeof schedule !== 'object' || Array.isArray(schedule)) {
      return 'Dia da semana inválido nos horários habituais.';
    }
    if ('enabled' in schedule && typeof schedule.enabled !== 'boolean') {
      return `Disponibilidade inválida para ${weekday}.`;
    }
    if (!('ranges' in schedule)) continue;
    if (!Array.isArray(schedule.ranges)) return `Horários inválidos para ${weekday}.`;

    for (const range of schedule.ranges) {
      if (!range || typeof range.start !== 'string' || typeof range.end !== 'string' ||
          !timePattern.test(range.start) || !timePattern.test(range.end)) {
        return `Revise os horários de ${weekday}. Use o formato HH:mm.`;
      }
      if (range.end <= range.start) {
        return `Revise os horários de ${weekday}. O término precisa ser depois do início no mesmo dia.`;
      }
    }
  }
  return null;
}
