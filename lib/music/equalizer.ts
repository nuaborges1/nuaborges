export const DUMMY_BARS: [number, number, number] = [0.08, 0.08, 0.08];

export function calculateFrequencyBars(
  analyser: AnalyserNode | null,
  freqData: Uint8Array | null,
  isPlaying: boolean,
  isMuted: boolean,
  volume: number
): [number, number, number] {
  if (typeof document !== 'undefined' && document.hidden) {
    return DUMMY_BARS;
  }

  if (!analyser || !isPlaying || isMuted || volume < 0.05) {
    return DUMMY_BARS;
  }

  try {
    if (!freqData || freqData.length !== analyser.frequencyBinCount) {
      return DUMMY_BARS;
    }
    analyser.getByteFrequencyData(freqData as any);

    const len = freqData.length;
    const bEnd = Math.max(1, Math.floor(len * 0.2));
    const mEnd = Math.max(bEnd + 1, Math.floor(len * 0.6));

    let bSum = 0;
    for (let i = 0; i < bEnd; i++) bSum += freqData[i];
    let mSum = 0;
    for (let i = bEnd; i < mEnd; i++) mSum += freqData[i];
    let tSum = 0;
    for (let i = mEnd; i < len; i++) tSum += freqData[i];

    const bass = bSum / (bEnd * 255);
    const mid = mSum / ((mEnd - bEnd) * 255);
    const treble = tSum / ((len - mEnd) * 255);

    return [
      Math.max(0.08, Math.min(1, bass * 1.5)),
      Math.max(0.08, Math.min(1, mid * 1.3)),
      Math.max(0.08, Math.min(1, treble * 1.2)),
    ];
  } catch {
    return DUMMY_BARS;
  }
}
