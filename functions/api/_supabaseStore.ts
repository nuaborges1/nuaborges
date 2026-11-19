/**
 * Supabase Store — Camada de Acesso e Persistência Unificada | Nua Borges
 * 
 * Centraliza todas as operações em PostgreSQL Supabase para:
 * - Conteúdo do Site (site_content, content_backups)
 * - Agendamentos de Chamadas (appointments_settings, appointments)
 * - Encomendas Personalizadas (personalizados_settings, personalizados_orders)
 * - Pedidos Comerciais e Pagamentos (orders)
 */

export {
  getSiteContentFromSupabase,
  saveSiteContentToSupabase,
  getSystemKVFromSupabase,
  setSystemKVInSupabase,
  deleteSystemKVFromSupabase,
} from './supabase/content';

export {
  getAppointmentsSettingsFromSupabase,
  saveAppointmentsSettingsToSupabase,
  bookingToSupabaseRow,
  supabaseRowToBooking,
  listAppointmentsFromSupabase,
  listAppointmentsForScheduleDateFromSupabase,
  expirePendingAppointmentsFromSupabase,
  getAppointmentByIdFromSupabase,
  saveAppointmentToSupabase,
  reserveAppointmentAtomically,
  rescheduleAppointmentAtomically,
} from './supabase/appointments';

export {
  getPersonalizadosSettingsFromSupabase,
  savePersonalizadosSettingsToSupabase,
  orderToPersonalizadoRow,
  personalizadoRowToOrder,
  listPersonalizadosOrdersFromSupabase,
  getPersonalizadoOrderFromSupabase,
  savePersonalizadoOrderToSupabase,
} from './supabase/personalizados';

export {
  type CommercialOrder,
  saveOrderToSupabase,
  getOrderFromSupabase,
  updateOrderStatusInSupabase,
  updateOrderInSupabase,
} from './supabase/orders';
