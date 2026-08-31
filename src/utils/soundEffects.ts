/**
 * Web Audio API based Celebration & Success Chime
 * Zero external audio files required - works 100% offline & on all mobile browsers!
 */
export function playSuccessChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()

    const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6 (Celebration arpeggio)
    const now = ctx.currentTime

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now + idx * 0.1)

      gain.gain.setValueAtTime(0.01, now + idx * 0.1)
      gain.gain.exponentialRampToValueAtTime(0.3, now + idx * 0.1 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now + idx * 0.1)
      osc.stop(now + idx * 0.1 + 0.45)
    })
  } catch (e) {
    console.warn('Audio chime playback error:', e)
  }
}
