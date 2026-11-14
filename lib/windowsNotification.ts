/**
 * Windows Native Notifications Engine — Nua Borges Platform
 *
 * Utiliza a Web Notification API padrão para disparar notificações
 * nativas no Windows (Central de Ações / Notificações Toast do Windows).
 *
 * Suporta:
 * - Solicitação amigável de permissão
 * - Detecção de suporte do sistema operacional
 * - requireInteraction: true (mantém o alerta no Windows até ser clicado)
 * - Ao clicar no toast do Windows, foca a aba do Admin automaticamente
 */

export interface WindowsNotificationPayload {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  badge?: string;
  data?: any;
  onClick?: () => void;
}

class WindowsNotificationEngine {
  /**
   * Verifica se a API de notificações está disponível no navegador
   */
  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window;
  }

  /**
   * Obtém o estado atual da permissão
   */
  public getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  /**
   * Solicita autorização ao usuário para exibir notificações no Windows
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (err) {
      console.warn('[WindowsNotification] Erro ao solicitar permissão:', err);
      return 'denied';
    }
  }

  /**
   * Dispara uma notificação nativa no Windows
   */
  public show(payload: WindowsNotificationPayload): boolean {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    try {
      const options: NotificationOptions = {
        body: payload.body,
        icon: payload.icon || '/icon.svg',
        badge: payload.badge || '/icon.svg',
        tag: payload.tag || `nua_order_${Date.now()}`,
        requireInteraction: true, // Garante que a notificação fica visível no Windows até o usuário interagir
        silent: false, // Permite que o próprio Windows emita o som de sistema se configurado
        data: payload.data,
      };

      const notification = new Notification(payload.title, options);

      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        notification.close();
        if (payload.onClick) {
          payload.onClick();
        }
      };

      return true;
    } catch (err) {
      console.warn('[WindowsNotification] Falha ao exibir notificação:', err);
      return false;
    }
  }

  /**
   * Dispara uma notificação de teste no Windows
   */
  public showTestNotification(): boolean {
    return this.show({
      title: '🔔 Notificação do Windows Ativada!',
      body: 'O sistema de alertas da Nua Borges agora está conectado ao seu Windows com sucesso.',
      tag: 'test_notification',
      onClick: () => {
        window.focus();
      },
    });
  }
}

export const windowsNotification = new WindowsNotificationEngine();
