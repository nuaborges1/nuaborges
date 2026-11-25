/**
 * Envelope Padronizado de Respostas e Erros — Pasta Central Controladora.
 *
 * Nunca expõe stack traces nem `err.message` interno ao cliente.
 */

export function createCorrelationId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return 'req_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function jsonError(
  status: number,
  message: string,
  extraHeaders: Record<string, string> = {},
  options?: {
    code?: string;
    correlationId?: string;
    retryAfterSeconds?: number;
  }
): Response {
  const correlationId = options?.correlationId || createCorrelationId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'X-Correlation-Id': correlationId,
    ...extraHeaders,
  };
  if (options?.retryAfterSeconds && options.retryAfterSeconds > 0) {
    headers['Retry-After'] = String(options.retryAfterSeconds);
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      ...(options?.code ? { code: options.code } : {}),
      correlationId,
    }),
    { status, headers }
  );
}

export function safeInternalError(
  scope: string,
  err: unknown,
  extraHeaders: Record<string, string> = {},
  friendlyMessage = 'Erro interno temporário. Tente novamente em instantes.'
): Response {
  const correlationId = createCorrelationId();
  const detail = err instanceof Error ? err.message : String(err || 'unknown');
  console.error(`[${scope}][${correlationId}]`, detail);
  return jsonError(500, friendlyMessage, extraHeaders, {
    code: 'INTERNAL_ERROR',
    correlationId,
  });
}
