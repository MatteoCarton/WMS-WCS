import { TICK_SECONDS } from './clock.js'
import { advance, arrived, atRest, type Motion } from './kinematics.js'
import * as layout from './layout.js'
import type { MachineState, Telegram } from './telegram.js'
import { makeTransportUnit, type TransportUnit } from './units.js'

const DOCK_DWELL = 5

const SEED_SERIAL = 900

const SEEDED: readonly { readonly level: number; readonly index: number }[] = layout.LEVELS.flatMap(
  (level) =>
    Array.from({ length: layout.SLOTS_PER_LEVEL }, (_, index) => ({ level, index })).filter(
      (cell) => (cell.index + level) % 2 === 0,
    ),
)

export type Load = {
  readonly unit: TransportUnit
  readonly motion: Motion
  readonly identified: boolean
}

export type Section = {
  readonly id: string
  readonly from: number
  readonly to: number
  readonly identifies: boolean
  readonly dwell: number
  readonly load: Load | null
  readonly blocked: boolean
}

export type LiftOrder = {
  readonly sequence: number
  readonly unit: string
  readonly fromLevel: number
  readonly toLevel: number
  readonly issuedAt: number
}

export type Lift = {
  readonly id: string
  readonly x: number
  readonly motion: Motion
  readonly order: LiftOrder | null
  readonly load: TransportUnit | null
  readonly blocked: boolean
}

export type ShuttleTask = {
  readonly sequence: number
  readonly unit: string
  readonly origin: string
  readonly destination: string
  readonly issuedAt: number
}

export type Shuttle = {
  readonly id: string
  readonly level: number
  readonly motion: Motion
  readonly load: TransportUnit | null
  readonly task: ShuttleTask | null
  readonly transfer: number
  readonly blocked: boolean
}

export type Installation = {
  readonly time: number
  readonly sequence: number
  readonly infeed: readonly Section[]
  readonly outfeed: readonly Section[]
  readonly liftIn: Lift
  readonly liftOut: Lift
  readonly shuttles: readonly Shuttle[]
  readonly slots: Readonly<Record<string, TransportUnit>>
  readonly states: Readonly<Record<string, MachineState>>
  readonly serial: number
  readonly sinceProduction: number
  readonly received: number
  readonly shipped: number
}

export type Order = {
  readonly machine: string
  readonly unit: string
  readonly from: string
  readonly to: string
  readonly priority: number
}

export type Outcome = {
  readonly state: Installation
  readonly telegrams: readonly Telegram[]
}

export type MachineReport = {
  readonly id: string
  readonly state: MachineState
  readonly position: number
  readonly speed: number
  readonly load: string
}

const sectionOf = (spec: layout.SectionSpec, dwell: number): Section => ({
  id: spec.id,
  from: spec.from,
  to: spec.to,
  identifies: spec.identifies,
  dwell,
  load: null,
  blocked: false,
})

const liftOf = (spec: { readonly id: string; readonly x: number }): Lift => ({
  id: spec.id,
  x: spec.x,
  motion: atRest(layout.levelHeight(1)),
  order: null,
  load: null,
  blocked: false,
})

const sectionState = (section: Section): MachineState =>
  section.load === null ? 'IDLE' : section.blocked ? 'BLOCKED' : 'BUSY'

const liftState = (lift: Lift): MachineState =>
  lift.order === null && lift.load === null ? 'IDLE' : lift.blocked ? 'BLOCKED' : 'BUSY'

const shuttleState = (shuttle: Shuttle): MachineState =>
  shuttle.task === null ? 'IDLE' : shuttle.blocked ? 'BLOCKED' : 'BUSY'

const sectionReport = (section: Section): MachineReport => ({
  id: section.id,
  state: sectionState(section),
  position: section.load ? section.load.motion.position : section.to,
  speed: section.load ? Math.abs(section.load.motion.speed) : 0,
  load: section.load ? section.load.unit.id : '-',
})

const liftReport = (lift: Lift): MachineReport => ({
  id: lift.id,
  state: liftState(lift),
  position: lift.motion.position,
  speed: Math.abs(lift.motion.speed),
  load: lift.load ? lift.load.id : '-',
})

const shuttleReport = (shuttle: Shuttle): MachineReport => ({
  id: shuttle.id,
  state: shuttleState(shuttle),
  position: shuttle.motion.position,
  speed: Math.abs(shuttle.motion.speed),
  load: shuttle.load ? shuttle.load.id : '-',
})

export const reports = (state: Installation): readonly MachineReport[] => [
  ...state.infeed.map(sectionReport),
  liftReport(state.liftIn),
  ...state.shuttles.map(shuttleReport),
  liftReport(state.liftOut),
  ...state.outfeed.map(sectionReport),
]

export const create = (): Installation => {
  const infeed = layout.INFEED.map((spec) => sectionOf(spec, 0))
  const outfeed = layout.OUTFEED.map((spec, index) =>
    sectionOf(spec, index === layout.OUTFEED.length - 1 ? DOCK_DWELL : 0),
  )
  const shuttles = layout.LEVELS.map((level) => ({
    id: layout.shuttleId(level),
    level,
    motion: atRest(layout.LIFT_IN.x),
    load: null,
    task: null,
    transfer: 0,
    blocked: false,
  }))
  const skeleton: Installation = {
    time: 0,
    sequence: 0,
    infeed,
    outfeed,
    liftIn: liftOf(layout.LIFT_IN),
    liftOut: liftOf(layout.LIFT_OUT),
    shuttles,
    slots: Object.fromEntries(
      SEEDED.map((cell, rank) => [
        layout.slotId(cell.level, cell.index),
        makeTransportUnit(SEED_SERIAL + rank),
      ]),
    ),
    states: {},
    serial: 0,
    sinceProduction: layout.PRODUCTION_INTERVAL,
    received: 0,
    shipped: 0,
  }
  return {
    ...skeleton,
    states: Object.fromEntries(reports(skeleton).map((report) => [report.id, report.state])),
  }
}

export const boot = (state: Installation): Outcome => {
  let sequence = state.sequence
  const status = reports(state).map((report): Telegram => {
    sequence += 1
    return {
      kind: 'STSMSG',
      sequence,
      at: state.time,
      source: report.id,
      target: 'WCS',
      state: report.state,
      position: report.position,
      speed: report.speed,
      load: report.load,
      fault: '0000',
    }
  })
  const inventory = Object.entries(state.slots).map(([slot, unit]): Telegram => {
    sequence += 1
    return {
      kind: 'INVRPT',
      sequence,
      at: state.time,
      source: 'RCK',
      target: 'WCS',
      unit: unit.id,
      location: slot,
      barcode: unit.barcode,
    }
  })
  return { state: { ...state, sequence }, telegrams: [...status, ...inventory] }
}

const levelOfName = (name: string): number => Number(name.slice(1))

export const submit = (state: Installation, order: Order): Outcome => {
  const orderSequence = state.sequence + 1
  const request: Telegram = {
    kind: 'TRPORD',
    sequence: orderSequence,
    at: state.time,
    source: 'WCS',
    target: order.machine,
    unit: order.unit,
    from: order.from,
    to: order.to,
    priority: order.priority,
  }

  const refuse = (reason: string, machineState: MachineState): Outcome => ({
    state: { ...state, sequence: orderSequence + 1 },
    telegrams: [
      request,
      {
        kind: 'TRPACK',
        sequence: orderSequence + 1,
        at: state.time,
        source: order.machine,
        target: 'WCS',
        order: orderSequence,
        result: reason,
        state: machineState,
      },
    ],
  })

  const accept = (next: Installation, machineState: MachineState): Outcome => ({
    state: { ...next, sequence: orderSequence + 1 },
    telegrams: [
      request,
      {
        kind: 'TRPACK',
        sequence: orderSequence + 1,
        at: state.time,
        source: order.machine,
        target: 'WCS',
        order: orderSequence,
        result: '00',
        state: machineState,
      },
    ],
  })

  if (order.machine === state.liftIn.id || order.machine === state.liftOut.id) {
    const lift = order.machine === state.liftIn.id ? state.liftIn : state.liftOut
    if (lift.order !== null) return refuse('02', liftState(lift))
    const loaded: Lift = {
      ...lift,
      order: {
        sequence: orderSequence,
        unit: order.unit,
        fromLevel: levelOfName(order.from),
        toLevel: levelOfName(order.to),
        issuedAt: state.time,
      },
    }
    const next =
      order.machine === state.liftIn.id
        ? { ...state, liftIn: loaded }
        : { ...state, liftOut: loaded }
    return accept(next, 'BUSY')
  }

  const index = state.shuttles.findIndex((shuttle) => shuttle.id === order.machine)
  const shuttle = state.shuttles[index]
  if (!shuttle) return refuse('04', 'FAULT')
  if (shuttle.task !== null) return refuse('02', shuttleState(shuttle))

  const tasked: Shuttle = {
    ...shuttle,
    task: {
      sequence: orderSequence,
      unit: order.unit,
      origin: order.from,
      destination: order.to,
      issuedAt: state.time,
    },
    transfer: 0,
  }
  const shuttles = state.shuttles.map((entry, at) => (at === index ? tasked : entry))
  return accept({ ...state, shuttles }, 'BUSY')
}

const pointX = (point: string): number =>
  point === layout.LIFT_IN.id
    ? layout.LIFT_IN.x
    : point === layout.LIFT_OUT.id
      ? layout.LIFT_OUT.x
      : layout.slotX(layout.slotIndex(point))

const runSection = (
  section: Section,
): { readonly section: Section; readonly identified: TransportUnit | null } => {
  if (!section.load) return { section: { ...section, blocked: false }, identified: null }
  const motion = advance(section.load.motion, section.to, layout.CONVEYOR, TICK_SECONDS)
  const middle = (section.from + section.to) / 2
  const reads = section.identifies && !section.load.identified && motion.position >= middle
  return {
    section: {
      ...section,
      blocked: false,
      load: {
        unit: section.load.unit,
        motion,
        identified: section.load.identified || reads,
      },
    },
    identified: reads ? section.load.unit : null,
  }
}

const runLift = (lift: Lift): Lift => {
  if (!lift.order) {
    return {
      ...lift,
      motion: advance(lift.motion, layout.levelHeight(1), layout.LIFT, TICK_SECONDS),
      blocked: false,
    }
  }
  const height = layout.levelHeight(
    lift.load === null ? lift.order.fromLevel : lift.order.toLevel,
  )
  const motion = advance(lift.motion, height, layout.LIFT, TICK_SECONDS)
  return { ...lift, motion, blocked: arrived(motion, height) }
}

export const tick = (state: Installation): Outcome => {
  const time = state.time + TICK_SECONDS
  let sequence = state.sequence
  const telegrams: Telegram[] = []
  const emit = (build: (next: number) => Telegram): void => {
    sequence += 1
    telegrams.push(build(sequence))
  }

  let serial = state.serial
  let received = state.received
  let shipped = state.shipped
  let sinceProduction = state.sinceProduction + TICK_SECONDS
  let slots: Record<string, TransportUnit> = { ...state.slots }

  const identified: TransportUnit[] = []
  let infeed = state.infeed.map((section) => {
    const outcome = runSection(section)
    if (outcome.identified) identified.push(outcome.identified)
    return outcome.section
  })
  let outfeed = state.outfeed.map((section) => runSection(section).section)

  const head = infeed[0]
  if (head && head.load === null && sinceProduction >= layout.PRODUCTION_INTERVAL) {
    serial += 1
    received += 1
    sinceProduction = 0
    const unit = makeTransportUnit(serial)
    infeed = infeed.map((section, index) =>
      index === 0
        ? { ...section, load: { unit, motion: atRest(section.from), identified: false } }
        : section,
    )
  }

  let liftIn = runLift(state.liftIn)
  let liftOut = runLift(state.liftOut)

  const shuttles = state.shuttles.map((shuttle) => {
    if (!shuttle.task) {
      return { ...shuttle, blocked: false, transfer: 0 }
    }
    const task = shuttle.task
    const destination = shuttle.load === null ? task.origin : task.destination
    const target = pointX(destination)
    const motion = advance(shuttle.motion, target, layout.SHUTTLE, TICK_SECONDS)
    if (!arrived(motion, target)) {
      return { ...shuttle, motion, blocked: false, transfer: 0 }
    }

    const height = layout.levelHeight(shuttle.level)
    const ready =
      shuttle.load === null
        ? destination === layout.LIFT_IN.id
          ? liftIn.load !== null &&
            liftIn.load.id === task.unit &&
            arrived(liftIn.motion, height)
          : slots[destination] !== undefined
        : destination === layout.LIFT_OUT.id
          ? liftOut.load === null &&
            liftOut.order !== null &&
            liftOut.order.unit === task.unit &&
            arrived(liftOut.motion, height)
          : slots[destination] === undefined

    if (!ready) return { ...shuttle, motion, blocked: true, transfer: 0 }

    const transfer = shuttle.transfer + TICK_SECONDS
    if (transfer < layout.TRANSFER_SECONDS) {
      return { ...shuttle, motion, blocked: false, transfer }
    }

    if (shuttle.load === null) {
      if (destination === layout.LIFT_IN.id) {
        const carried = liftIn.load
        const order = liftIn.order
        if (carried && order) {
          emit((next) => ({
            kind: 'TRPFIN',
            sequence: next,
            at: time,
            source: liftIn.id,
            target: 'WCS',
            order: order.sequence,
            unit: carried.id,
            location: `N${order.toLevel}`,
            duration: time - order.issuedAt,
          }))
          liftIn = { ...liftIn, load: null, order: null, blocked: false }
          return { ...shuttle, motion, load: carried, blocked: false, transfer: 0 }
        }
        return { ...shuttle, motion, blocked: true, transfer: 0 }
      }
      const carried = slots[destination]
      if (!carried) return { ...shuttle, motion, blocked: true, transfer: 0 }
      const { [destination]: _taken, ...rest } = slots
      slots = rest
      return { ...shuttle, motion, load: carried, blocked: false, transfer: 0 }
    }

    const carried = shuttle.load
    if (destination === layout.LIFT_OUT.id) {
      liftOut = { ...liftOut, load: carried, blocked: false }
    } else {
      slots = { ...slots, [destination]: carried }
    }
    emit((next) => ({
      kind: 'TRPFIN',
      sequence: next,
      at: time,
      source: shuttle.id,
      target: 'WCS',
      order: task.sequence,
      unit: carried.id,
      location: destination,
      duration: time - task.issuedAt,
    }))
    return { ...shuttle, motion, load: null, task: null, blocked: false, transfer: 0 }
  })

  for (let index = infeed.length - 1; index >= 0; index -= 1) {
    const section = infeed[index]
    if (!section || !section.load) continue
    if (!arrived(section.load.motion, section.to)) continue
    const downstream = infeed[index + 1]
    if (downstream) {
      if (downstream.load !== null) {
        infeed = infeed.map((entry, at) => (at === index ? { ...entry, blocked: true } : entry))
        continue
      }
      const moved = section.load
      infeed = infeed.map((entry, at) =>
        at === index
          ? { ...entry, load: null }
          : at === index + 1
            ? {
                ...entry,
                load: {
                  unit: moved.unit,
                  motion: { position: entry.from, speed: moved.motion.speed },
                  identified: moved.identified,
                },
              }
            : entry,
      )
      continue
    }
    const accepts =
      liftIn.load === null &&
      liftIn.order !== null &&
      liftIn.order.unit === section.load.unit.id &&
      arrived(liftIn.motion, layout.levelHeight(liftIn.order.fromLevel))
    if (!accepts) {
      infeed = infeed.map((entry, at) => (at === index ? { ...entry, blocked: true } : entry))
      continue
    }
    liftIn = { ...liftIn, load: section.load.unit }
    infeed = infeed.map((entry, at) => (at === index ? { ...entry, load: null } : entry))
  }

  for (let index = outfeed.length - 1; index >= 0; index -= 1) {
    const section = outfeed[index]
    if (!section || !section.load) continue
    if (!arrived(section.load.motion, section.to)) continue
    const downstream = outfeed[index + 1]
    if (!downstream) {
      const waited = section.dwell - TICK_SECONDS
      if (waited > 0) {
        outfeed = outfeed.map((entry, at) =>
          at === index ? { ...entry, dwell: waited, blocked: true } : entry,
        )
        continue
      }
      const leaving = section.load.unit
      shipped += 1
      emit((next) => ({
        kind: 'TRPFIN',
        sequence: next,
        at: time,
        source: section.id,
        target: 'WCS',
        order: 0,
        unit: leaving.id,
        location: 'DOCK01',
        duration: 0,
      }))
      outfeed = outfeed.map((entry, at) =>
        at === index ? { ...entry, load: null, dwell: DOCK_DWELL, blocked: false } : entry,
      )
      continue
    }
    if (downstream.load !== null) {
      outfeed = outfeed.map((entry, at) => (at === index ? { ...entry, blocked: true } : entry))
      continue
    }
    const moved = section.load
    outfeed = outfeed.map((entry, at) =>
      at === index
        ? { ...entry, load: null }
        : at === index + 1
          ? {
              ...entry,
              load: {
                unit: moved.unit,
                motion: { position: entry.from, speed: moved.motion.speed },
                identified: moved.identified,
              },
            }
          : entry,
    )
  }

  const dock = outfeed[0]
  if (
    liftOut.load !== null &&
    liftOut.order !== null &&
    arrived(liftOut.motion, layout.levelHeight(liftOut.order.toLevel)) &&
    dock &&
    dock.load === null
  ) {
    const carried = liftOut.load
    const order = liftOut.order
    emit((next) => ({
      kind: 'TRPFIN',
      sequence: next,
      at: time,
      source: liftOut.id,
      target: 'WCS',
      order: order.sequence,
      unit: carried.id,
      location: dock.id,
      duration: time - order.issuedAt,
    }))
    outfeed = outfeed.map((entry, at) =>
      at === 0
        ? { ...entry, load: { unit: carried, motion: atRest(entry.from), identified: true } }
        : entry,
    )
    liftOut = { ...liftOut, load: null, order: null, blocked: false }
  }

  const settled: Installation = {
    ...state,
    time,
    sequence,
    infeed,
    outfeed,
    liftIn,
    liftOut,
    shuttles,
    slots,
    serial,
    sinceProduction,
    received,
    shipped,
  }

  for (const unit of identified) {
    emit((next) => ({
      kind: 'IDNRPT',
      sequence: next,
      at: time,
      source: 'SCN01',
      target: 'WCS',
      unit: unit.id,
      barcode: unit.barcode,
      lengthMm: unit.lengthMm,
      widthMm: unit.widthMm,
      heightMm: unit.heightMm,
      weightKg: unit.weightKg,
    }))
  }

  const states: Record<string, MachineState> = { ...state.states }
  for (const report of reports(settled)) {
    if (states[report.id] === report.state) continue
    states[report.id] = report.state
    emit((next) => ({
      kind: 'STSMSG',
      sequence: next,
      at: time,
      source: report.id,
      target: 'WCS',
      state: report.state,
      position: report.position,
      speed: report.speed,
      load: report.load,
      fault: '0000',
    }))
  }

  return { state: { ...settled, sequence, states }, telegrams }
}
