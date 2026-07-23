export function triggerHaptic(
  enabled: boolean,
  style: 'light' | 'medium' | 'success' = 'light',
): void {
  if (!enabled || typeof navigator === 'undefined') return
  if (!('vibrate' in navigator)) return
  const pattern =
    style === 'success' ? [12, 40, 18] : style === 'medium' ? [18] : [8]
  try {
    navigator.vibrate(pattern)
  } catch {
    // Ignore unsupported vibration errors
  }
}

export function playSoftClick(enabled: boolean): void {
  if (!enabled) return
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 420
    gain.gain.value = 0.03
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08)
    osc.stop(ctx.currentTime + 0.09)
    window.setTimeout(() => void ctx.close(), 150)
  } catch {
    // Audio may be blocked until a gesture
  }
}
