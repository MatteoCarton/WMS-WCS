import { boot, create, tick, type Installation } from './installation.js'
import { createPilot, drive, observe, plan, type Pilot } from './pilot.js'
import type { Telegram } from './telegram.js'

export type Runtime = {
  readonly state: Installation
  readonly pilot: Pilot
}

export type Advanced = {
  readonly runtime: Runtime
  readonly telegrams: readonly Telegram[]
}

export const start = (): Advanced => {
  const booted = boot(create())
  return {
    runtime: { state: booted.state, pilot: observe(createPilot(), booted.telegrams) },
    telegrams: booted.telegrams,
  }
}

export const step = (runtime: Runtime): Advanced => {
  const advanced = tick(runtime.state)
  const watched = plan(observe(runtime.pilot, advanced.telegrams))
  const driven = drive(watched, advanced.state)
  return {
    runtime: { state: driven.state, pilot: observe(driven.pilot, driven.telegrams) },
    telegrams: [...advanced.telegrams, ...driven.telegrams],
  }
}
