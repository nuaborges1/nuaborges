/**
 * Sistema de Áudio e Notificações em Tempo Real (Web Audio API)
 * Gera bips, chimes e alertas sonoros sintetizados nativamente no navegador
 * Sem necessidade de arquivos de áudio externos (100% offline, zero falhas 404)
 */

let globalAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return null;
    if (!globalAudioCtx) {
      globalAudioCtx = new AudioCtxClass();
    }
    if (globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => {});
    }
    return globalAudioCtx;
  } catch (err) {
    console.warn('[AudioAlert] Web Audio API indisponível:', err);
    return null;
  }
}

/** Desbloqueia o contexto de áudio em resposta a uma interação do usuário */
export function unlockAudioContext(): boolean {
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return !!ctx;
  } catch {
    return false;
  }
}

export type SoundEffectType = 'task_done' | 'new_request' | 'new_message' | 'status_progress';

/**
 * Toca efeito sonoro sintetizado via Web Audio API
 */
export function playAlertSound(type: SoundEffectType): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    if (type === 'task_done') {
      // Chime festivo ascendente: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
      // Indica sucesso absoluto / tarefa concluída no site
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.11);

        gain.gain.setValueAtTime(0.001, t + idx * 0.11);
        gain.gain.linearRampToValueAtTime(0.28, t + idx * 0.11 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.11 + 0.65);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t + idx * 0.11);
        osc.stop(t + idx * 0.11 + 0.7);
      });
    } else if (type === 'new_request') {
      // Chime de alta atenção para o Desenvolvedor: F5 (698Hz) -> C6 (1046Hz) duplo
      const freqs = [698.46, 1046.5, 1318.5];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.13);

        gain.gain.setValueAtTime(0.001, t + idx * 0.13);
        gain.gain.linearRampToValueAtTime(0.32, t + idx * 0.13 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.13 + 0.75);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t + idx * 0.13);
        osc.stop(t + idx * 0.13 + 0.8);
      });
    } else if (type === 'new_message') {
      // Pop suave de mensagem / resposta
      const freqs = [783.99, 987.77];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.08);

        gain.gain.setValueAtTime(0.001, t + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.2, t + idx * 0.08 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t + idx * 0.08);
        osc.stop(t + idx * 0.08 + 0.4);
      });
    } else {
      // status_progress: mudança de status intermediária (Em Análise / Em Dev)
      const freqs = [587.33, 739.99]; // D5 -> F#5
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.09);

        gain.gain.setValueAtTime(0.001, t + idx * 0.09);
        gain.gain.linearRampToValueAtTime(0.2, t + idx * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.09 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t + idx * 0.09);
        osc.stop(t + idx * 0.09 + 0.45);
      });
    }
  } catch (err) {
    console.warn('[AudioAlert] Falha na reprodução:', err);
  }
}

/**
 * Faz o título da aba piscar alternadamente para chamar a atenção
 */
export function flashTabTitle(alertTitle: string, durationMs = 12000): () => void {
  if (typeof document === 'undefined') return () => {};

  const originalTitle = document.title;
  let isAlert = false;

  const interval = setInterval(() => {
    document.title = isAlert ? alertTitle : originalTitle;
    isAlert = !isAlert;
  }, 900);

  const cleanup = () => {
    clearInterval(interval);
    document.title = originalTitle;
    window.removeEventListener('focus', cleanup);
  };

  setTimeout(cleanup, durationMs);
  window.addEventListener('focus', cleanup);

  return cleanup;
}
