/**
 * Audio Notification Engine — Nua Borges Platform
 * 
 * Sintetizador harmônico via Web Audio API pura:
 * - Não depende de carregamento de arquivos externos de áudio (zero 404, zero lag)
 * - Frequências afinadas para som cristalino e agradável de novo pedido ("Chime Luxo")
 * - Respeita políticas de autoplay de navegadores com resume automático no primeiro gesto
 */

class AudioNotificationEngine {
  private audioCtx: AudioContext | null = null;
  private isUnlocked: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    return this.audioCtx;
  }

  /**
   * Desbloqueia o contexto de áudio após interação do usuário (clique em qualquer lugar)
   */
  public unlockAudio() {
    if (this.isUnlocked || typeof window === 'undefined') return;
    const ctx = this.getContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          this.isUnlocked = true;
        }).catch(() => {});
      } else {
        this.isUnlocked = true;
      }
    }
  }

  /**
   * Toca o sino de notificação de novo pedido
   * @param volume Nível de volume de 0 a 1 (padrão: 0.8)
   */
  public playOrderChime(volume: number = 0.8): boolean {
    const ctx = this.getContext();
    if (!ctx) return false;

    try {
      const t = ctx.currentTime;
      const vol = Math.max(0, Math.min(1, volume));

      // Acorde harmônico ascendente em E Maior com brilho estendido:
      // E5 (659Hz) -> G#5 (830Hz) -> B5 (987Hz) -> E6 (1318Hz)
      const notes = [
        { freq: 659.25, time: 0.00, dur: 0.40, gain: 0.35 * vol }, // E5
        { freq: 830.61, time: 0.10, dur: 0.45, gain: 0.40 * vol }, // G#5
        { freq: 987.77, time: 0.22, dur: 0.55, gain: 0.45 * vol }, // B5
        { freq: 1318.51, time: 0.35, dur: 0.90, gain: 0.55 * vol }, // E6 (Sino principal)
      ];

      notes.forEach(({ freq, time, dur, gain }) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();

        // Onda senoidal pura para timbre aveludado e elegante
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + time);

        // Curva suave de ataque e decaimento exponencial
        g.gain.setValueAtTime(0.0001, t + time);
        g.gain.linearRampToValueAtTime(gain, t + time + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + time + dur);

        osc.connect(g);
        g.connect(ctx.destination);

        osc.start(t + time);
        osc.stop(t + time + dur);
      });

      return true;
    } catch (err) {
      console.warn('[AudioEngine] Falha ao tocar sino de pedido:', err);
      return false;
    }
  }

  /**
   * Toca um som de confirmação curto para testes
   */
  public playTestChime(volume: number = 0.8): boolean {
    return this.playOrderChime(volume);
  }
}

export const audioNotification = new AudioNotificationEngine();
