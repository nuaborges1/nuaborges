/**
 * Módulo de Chamadas VIP — Painel Administrativo Nua Borges
 * Centraliza e exporta todas as telas, componentes e lógicas de agendamento de chamadas (Arquitetura V9).
 */

export { ChamadasModule } from './ChamadasModule';
export { AppointmentsEditor } from './AppointmentsEditor';

// 5 Abas Oficiais V9
export { OverviewTab } from './OverviewTab';
export { BookingsTab } from './BookingsTab';
export { CalendarTab } from './CalendarTab';
export { AvailabilityTab } from './AvailabilityTab';
export { AppointmentsModalitiesTab } from './AppointmentsModalitiesTab';

// Modais V9 e Suporte
export {
  BookingDetailModal,
  ProposalModal,
  CancellationAnalysisModal,
  BlockPeriodModal,
} from './AppointmentsV9Modals';
export {
  ModalityEditModal,
  CreateManualBookingModal,
} from './AppointmentsModals';

export { useAppointmentsData } from './useAppointmentsData';
