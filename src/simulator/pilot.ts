import { TICK_SECONDS } from './clock.js'
import { submit, type Installation, type Order } from './installation.js'
import * as layout from './layout.js'
import type { MachineState, Telegram } from './telegram.js'

export type Placement = {
  readonly slot: string
  readonly unit: string
}

export type Pilot = {
  readonly queues: Readonly<Record<string, readonly Order[]>>
  readonly states: Readonly<Record<string, MachineState>>
  readonly reserved: readonly string[]
  readonly stored: readonly Placement[]
  readonly leaving: readonly Placement[]
  readonly waiting: readonly string[]
  readonly sinceDispatch: number
}

export type Driven = {
  readonly pilot: Pilot
  readonly state: Installation
  readonly telegrams: readonly Telegram[]
}

export const createPilot = (): Pilot => ({
  queues: {},
  states: {},
  reserved: [],
  stored: [],
  leaving: [],
  waiting: [],
  sinceDispatch: 0,
})

const enqueue = (pilot: Pilot, order: Order): Pilot => ({
  ...pilot,
  queues: {
    ...pilot.queues,
    [order.machine]: [...(pilot.queues[order.machine] ?? []), order],
  },
})

const taken = (pilot: Pilot): readonly string[] => [
  ...pilot.reserved,
  ...pilot.stored.map((entry) => entry.slot),
  ...pilot.leaving.map((entry) => entry.slot),
]

const chooseSlot = (pilot: Pilot): string | null => {
  const busy = new Set(taken(pilot))
  const ranked = layout.LEVELS.map((level) => {
    const free = Array.from({ length: layout.SLOTS_PER_LEVEL }, (_, index) =>
      layout.slotId(level, index),
    ).filter((slot) => !busy.has(slot))
    const queued = (pilot.queues[layout.shuttleId(level)] ?? []).length
    return { level, free, queued }
  })
    .filter((entry) => entry.free.length > 0)
    .sort((left, right) =>
      left.queued === right.queued
        ? right.free.length - left.free.length
        : left.queued - right.queued,
    )
  return ranked[0]?.free[0] ?? null
}

const assign = (pilot: Pilot, unit: string, slot: string): Pilot => {
  const level = layout.slotLevel(slot)
  const reserved = { ...pilot, reserved: [...pilot.reserved, slot] }
  const lifted = enqueue(reserved, {
    machine: layout.LIFT_IN.id,
    unit,
    from: 'N1',
    to: `N${level}`,
    priority: 5,
  })
  return enqueue(lifted, {
    machine: layout.shuttleId(level),
    unit,
    from: layout.LIFT_IN.id,
    to: slot,
    priority: 5,
  })
}

const onIdentified = (pilot: Pilot, unit: string): Pilot => {
  const slot = chooseSlot(pilot)
  return slot ? assign(pilot, unit, slot) : { ...pilot, waiting: [...pilot.waiting, unit] }
}

const onStored = (pilot: Pilot, unit: string, slot: string): Pilot => ({
  ...pilot,
  reserved: pilot.reserved.filter((entry) => entry !== slot),
  stored: [...pilot.stored, { slot, unit }],
})

const onHandedToExit = (pilot: Pilot, unit: string): Pilot => ({
  ...pilot,
  leaving: pilot.leaving.filter((entry) => entry.unit !== unit),
})

export const observe = (pilot: Pilot, telegrams: readonly Telegram[]): Pilot =>
  telegrams.reduce((current, telegram) => {
    if (telegram.kind === 'STSMSG' || telegram.kind === 'TRPACK') {
      return { ...current, states: { ...current.states, [telegram.source]: telegram.state } }
    }
    if (telegram.kind === 'INVRPT') {
      return {
        ...current,
        stored: [...current.stored, { slot: telegram.location, unit: telegram.unit }],
      }
    }
    if (telegram.kind === 'IDNRPT') {
      return onIdentified(current, telegram.unit)
    }
    if (telegram.kind === 'TRPFIN' && telegram.source.startsWith('NAV')) {
      return telegram.location === layout.LIFT_OUT.id
        ? onHandedToExit(current, telegram.unit)
        : onStored(current, telegram.unit, telegram.location)
    }
    return current
  }, pilot)

const admit = (pilot: Pilot): Pilot => {
  const first = pilot.waiting[0]
  if (!first) return pilot
  const slot = chooseSlot(pilot)
  if (!slot) return pilot
  return assign({ ...pilot, waiting: pilot.waiting.slice(1) }, first, slot)
}

const dispatchable = (pilot: Pilot): boolean =>
  pilot.leaving.length < layout.DISPATCH_IN_FLIGHT &&
  (pilot.queues[layout.LIFT_OUT.id] ?? []).length < layout.DISPATCH_IN_FLIGHT &&
  pilot.stored.length > layout.DISPATCH_FLOOR

const retrieve = (pilot: Pilot, oldest: Placement): Pilot => {
  const level = layout.slotLevel(oldest.slot)
  const moved: Pilot = {
    ...pilot,
    sinceDispatch: 0,
    stored: pilot.stored.filter((entry) => entry.unit !== oldest.unit),
    leaving: [...pilot.leaving, oldest],
  }
  const shuttled = enqueue(moved, {
    machine: layout.shuttleId(level),
    unit: oldest.unit,
    from: oldest.slot,
    to: layout.LIFT_OUT.id,
    priority: 7,
  })
  return enqueue(shuttled, {
    machine: layout.LIFT_OUT.id,
    unit: oldest.unit,
    from: `N${level}`,
    to: 'N1',
    priority: 7,
  })
}

export const plan = (pilot: Pilot): Pilot => {
  const admitted = { ...admit(pilot), sinceDispatch: pilot.sinceDispatch + TICK_SECONDS }
  if (admitted.sinceDispatch < layout.DISPATCH_INTERVAL) return admitted
  if (!dispatchable(admitted)) return admitted
  const oldest = admitted.stored[0]
  return oldest ? retrieve(admitted, oldest) : admitted
}

export const drive = (pilot: Pilot, state: Installation): Driven =>
  Object.keys(pilot.queues).reduce<Driven>(
    (current, machine) => {
      const queue = current.pilot.queues[machine] ?? []
      const head = queue[0]
      if (!head) return current
      if ((current.pilot.states[machine] ?? 'IDLE') !== 'IDLE') return current
      const outcome = submit(current.state, head)
      const accepted = outcome.telegrams.some(
        (telegram) => telegram.kind === 'TRPACK' && telegram.result === '00',
      )
      const telegrams = [...current.telegrams, ...outcome.telegrams]
      if (!accepted) return { ...current, state: outcome.state, telegrams }
      return {
        pilot: {
          ...current.pilot,
          queues: { ...current.pilot.queues, [machine]: queue.slice(1) },
          states: { ...current.pilot.states, [machine]: 'BUSY' },
        },
        state: outcome.state,
        telegrams,
      }
    },
    { pilot, state, telegrams: [] },
  )
