export const TICK_SECONDS = 0.02

export const MAX_TICKS_PER_FRAME = 4000

export type Pacer = {
  readonly factor: number
  readonly carry: number
}

export const makePacer = (factor: number): Pacer => ({ factor, carry: 0 })

export const setFactor = (pacer: Pacer, factor: number): Pacer => ({ ...pacer, factor })

export const drawTicks = (
  pacer: Pacer,
  realSeconds: number,
): { readonly pacer: Pacer; readonly ticks: number } => {
  const available = pacer.carry + (realSeconds * pacer.factor) / TICK_SECONDS
  const wanted = Math.floor(available + 1e-9)
  const ticks = Math.min(wanted, MAX_TICKS_PER_FRAME)
  return {
    pacer: { factor: pacer.factor, carry: available - ticks },
    ticks,
  }
}

export const stamp = (seconds: number): string => {
  const whole = Math.floor(seconds)
  const hours = Math.floor(whole / 3600)
  const minutes = Math.floor((whole % 3600) / 60)
  const rest = whole % 60
  const millis = Math.floor((seconds - whole) * 1000)
  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(rest).padStart(2, '0'),
  ].join(':') + '.' + String(millis).padStart(3, '0')
}
