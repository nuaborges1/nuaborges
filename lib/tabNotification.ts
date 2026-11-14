/**
 * Tab Notification Engine — Nua Borges Platform
 *
 * Alerta visual chamativo e confiável na aba do navegador:
 * 1. Alterna o título (document.title) entre aviso vermelho e identificador da loja
 * 2. Alterna o favicon da aba entre o monograma padrão e um farol vermelho pulsante
 * 3. Funciona em abas ativas, abas em segundo plano e em testes manuais
 */

const RED_ALERT_FAVICON_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="%23ef4444"/><circle cx="16" cy="16" r="11" fill="%23ffffff" fill-opacity="0.3"/><circle cx="16" cy="16" r="7" fill="%23ffffff"/><circle cx="16" cy="16" r="4" fill="%23dc2626"/></svg>`;

const NORMAL_FAVICON_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="%2309090b" stroke="%23f4a7b9" stroke-width="1.5"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="%23f4a7b9" font-family="sans-serif" font-weight="700" font-size="16">N</text></svg>`;

export interface TabFlashOptions {
  isTest?: boolean;
  durationMs?: number;
}

class TabNotificationEngine {
  private timer: ReturnType<typeof setInterval> | null = null;
  private autoStopTimeout: ReturnType<typeof setTimeout> | null = null;
  private originalTitle: string = 'Admin | Nua Borges';
  private originalFaviconHref: string | null = null;
  private isFlashing: boolean = false;
  private isTestMode: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Captura o título inicial assim que o script carrega
      if (document.title) {
        this.originalTitle = document.title;
      }

      window.addEventListener('focus', () => {
        // Se for um teste manual em andamento, não interrompe imediatamente no foco
        if (this.isTestMode) return;

        // Se for um pedido real e o usuário voltar para a aba, encerra após 4s para dar tempo de visualizar
        if (this.isFlashing) {
          setTimeout(() => {
            if (this.isFlashing && !this.isTestMode) {
              this.stopFlashing();
            }
          }, 4000);
        }
      });
    }
  }

  /**
   * Atualiza ou cria a tag de favicon garantindo que o navegador renderize a mudança
   */
  private applyFavicon(href: string) {
    if (typeof document === 'undefined') return;

    try {
      let activeLink = document.getElementById('nua-dynamic-favicon') as HTMLLinkElement | null;

      if (!activeLink) {
        // Encontra o favicon original para guardar como fallback
        const existing = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
        if (existing && !this.originalFaviconHref) {
          this.originalFaviconHref = existing.href;
        }

        activeLink = document.createElement('link');
        activeLink.id = 'nua-dynamic-favicon';
        activeLink.rel = 'icon';
        activeLink.type = 'image/svg+xml';
        document.head.appendChild(activeLink);
      }

      // Adiciona timestamp para forçar atualização do cache de ícones do navegador
      activeLink.href = href;
    } catch {
      // Falha silenciosa em ambientes sem DOM
    }
  }

  /**
   * Inicia o piscar em vermelho da aba com texto descritivo do pedido
   * @param alertMessage Texto do pedido (ex: "Novo Pedido de R$ 350,00" ou "Cliente - R$ 120,00")
   * @param options Configurações adicionais de duração e modo de teste
   */
  public startFlashing(
    alertMessage: string = 'NOVO PEDIDO!',
    options: TabFlashOptions = {}
  ) {
    if (typeof window === 'undefined') return;

    // Preserva o título atual antes de alterar
    if (!this.isFlashing && document.title) {
      this.originalTitle = document.title;
    }

    this.stopFlashing(false);
    this.isFlashing = true;
    this.isTestMode = Boolean(options.isTest);

    let toggle = true;

    // Executa a primeira piscada IMEDIATAMENTE (t = 0ms)
    const cleanMsg = alertMessage.replace(/[\n\r]+/g, ' ').trim();
    document.title = `🔴 NOVO PEDIDO! • ${cleanMsg.toUpperCase()}`;
    this.applyFavicon(RED_ALERT_FAVICON_SVG);

    // Alterna a cada 800ms
    this.timer = setInterval(() => {
      toggle = !toggle;

      if (toggle) {
        document.title = `🔴 NOVO PEDIDO! • ${cleanMsg.toUpperCase()}`;
        this.applyFavicon(RED_ALERT_FAVICON_SVG);
      } else {
        document.title = `🚨 [PEDIDO RECEBIDO] — Nua Borges`;
        this.applyFavicon(this.originalFaviconHref || NORMAL_FAVICON_SVG);
      }
    }, 800);

    // Encerra após a duração estipulada (se fornecida)
    if (options.durationMs && options.durationMs > 0) {
      this.autoStopTimeout = setTimeout(() => {
        this.stopFlashing();
      }, options.durationMs);
    }
  }

  /**
   * Para o piscar e restaura o título e ícone originais da aba
   */
  public stopFlashing(resetState: boolean = true) {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (this.autoStopTimeout) {
      clearTimeout(this.autoStopTimeout);
      this.autoStopTimeout = null;
    }

    if (resetState) {
      this.isFlashing = false;
      this.isTestMode = false;
      if (typeof document !== 'undefined') {
        document.title = this.originalTitle || 'Admin | Nua Borges';
        this.applyFavicon(this.originalFaviconHref || NORMAL_FAVICON_SVG);
      }
    }
  }

  public getStatus() {
    return this.isFlashing;
  }
}

export const tabNotification = new TabNotificationEngine();
