/**
 * Serviço de Contato — Projeto Nua Borges
 * Responsável pelo envio de formulário comercial e parcerias
 */

export interface ContactMessagePayload {
  name: string;
  email: string;
  subject: string;
  message: string;
  company_website_verify?: string; // Honeypot field
  renderedAt?: number;             // Time trap timestamp
}

export interface ContactResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function submitContactMessage(payload: ContactMessagePayload): Promise<ContactResponse> {
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: payload.name.trim(),
        email: payload.email.trim(),
        subject: payload.subject,
        message: payload.message.trim(),
        company_website_verify: payload.company_website_verify,
        renderedAt: payload.renderedAt,
      }),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: true, message: data.message || 'Mensagem enviada com sucesso!' };
    }

    const errData = await res.json().catch(() => ({}));
    return { success: false, error: errData.error || 'Erro ao processar mensagem.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha de conexão com o servidor.' };
  }
}
