import { stamp } from './clock.js'
import type { Installation, Lift, Section, Shuttle } from './installation.js'
import * as layout from './layout.js'
import { formatTelegram, type MachineState, type Telegram } from './telegram.js'
import type { TransportUnit } from './units.js'

export type PalletView = {
  readonly id: string
  readonly barcode: string
  readonly article: string
  readonly heightMm: number
  readonly weightKg: number
}

export type SectionView = {
  readonly id: string
  readonly label: string
  readonly from: number
  readonly to: number
  readonly identifies: boolean
  readonly state: MachineState
  readonly pallet: PalletView | null
  readonly palletX: number
}

export type LiftView = {
  readonly id: string
  readonly label: string
  readonly x: number
  readonly height: number
  readonly speed: number
  readonly state: MachineState
  readonly pallet: PalletView | null
}

export type ShuttleView = {
  readonly id: string
  readonly level: number
  readonly x: number
  readonly speed: number
  readonly state: MachineState
  readonly pallet: PalletView | null
  readonly transfer: number
  readonly origin: string | null
  readonly destination: string | null
}

export type LineView = {
  readonly kind: Telegram['kind']
  readonly source: string
  readonly text: string
}

export type Frame = {
  readonly time: number
  readonly clock: string
  readonly factor: number
  readonly running: boolean
  readonly sections: readonly SectionView[]
  readonly lifts: readonly LiftView[]
  readonly shuttles: readonly ShuttleView[]
  readonly slots: Readonly<Record<string, PalletView>>
  readonly received: number
  readonly shipped: number
  readonly stored: number
  readonly capacity: number
  readonly throughput: number
  readonly lines: readonly LineView[]
}

export type Scene = {
  readonly levels: readonly { readonly level: number; readonly height: number }[]
  readonly slots: readonly {
    readonly id: string
    readonly level: number
    readonly index: number
    readonly x: number
  }[]
  readonly aisle: { readonly from: number; readonly to: number }
  readonly lifts: readonly { readonly id: string; readonly label: string; readonly x: number }[]
  readonly sections: readonly {
    readonly id: string
    readonly label: string
    readonly line: 'infeed' | 'outfeed'
    readonly from: number
    readonly to: number
    readonly identifies: boolean
  }[]
  readonly slotPitch: number
  readonly world: {
    readonly left: number
    readonly right: number
    readonly top: number
    readonly bottom: number
  }
}

export const scene = (): Scene => ({
  levels: layout.LEVELS.map((level) => ({ level, height: layout.levelHeight(level) })),
  slots: layout.LEVELS.flatMap((level) =>
    Array.from({ length: layout.SLOTS_PER_LEVEL }, (_, index) => ({
      id: layout.slotId(level, index),
      level,
      index,
      x: layout.slotX(index),
    })),
  ),
  aisle: { from: layout.AISLE.from, to: layout.AISLE.to },
  lifts: [
    { id: layout.LIFT_IN.id, label: layout.LIFT_IN.label, x: layout.LIFT_IN.x },
    { id: layout.LIFT_OUT.id, label: layout.LIFT_OUT.label, x: layout.LIFT_OUT.x },
  ],
  sections: [
    ...layout.INFEED.map((spec) => ({ ...spec, line: 'infeed' as const })),
    ...layout.OUTFEED.map((spec) => ({ ...spec, line: 'outfeed' as const })),
  ].map((spec) => ({
    id: spec.id,
    label: spec.label,
    line: spec.line,
    from: spec.from,
    to: spec.to,
    identifies: spec.identifies,
  })),
  slotPitch: layout.SLOT_PITCH,
  world: { left: -5.2, right: 58.4, top: 17.6, bottom: -4.2 },
})

const palletOf = (unit: TransportUnit): PalletView => ({
  id: unit.id,
  barcode: unit.barcode,
  article: unit.article,
  heightMm: unit.heightMm,
  weightKg: unit.weightKg,
})

const viewOf = (unit: TransportUnit | null): PalletView | null =>
  unit === null ? null : palletOf(unit)

const labelOf = (id: string): string =>
  [...layout.INFEED, ...layout.OUTFEED].find((spec) => spec.id === id)?.label ?? id

const sectionView = (section: Section, state: MachineState): SectionView => ({
  id: section.id,
  label: labelOf(section.id),
  from: section.from,
  to: section.to,
  identifies: section.identifies,
  state,
  pallet: viewOf(section.load ? section.load.unit : null),
  palletX: section.load ? section.load.motion.position : section.from,
})

const liftView = (lift: Lift, label: string, state: MachineState): LiftView => ({
  id: lift.id,
  label,
  x: lift.x,
  height: lift.motion.position,
  speed: Math.abs(lift.motion.speed),
  state,
  pallet: viewOf(lift.load),
})

const shuttleView = (shuttle: Shuttle, state: MachineState): ShuttleView => ({
  id: shuttle.id,
  level: shuttle.level,
  x: shuttle.motion.position,
  speed: Math.abs(shuttle.motion.speed),
  state,
  pallet: viewOf(shuttle.load),
  transfer: Math.min(1, shuttle.transfer / layout.TRANSFER_SECONDS),
  origin: shuttle.task ? shuttle.task.origin : null,
  destination: shuttle.task ? shuttle.task.destination : null,
})

export const frameOf = (
  state: Installation,
  factor: number,
  running: boolean,
  telegrams: readonly Telegram[],
): Frame => {
  const stateOf = (id: string): MachineState => state.states[id] ?? 'IDLE'
  const stored = Object.keys(state.slots).length
  const hours = state.time / 3600
  return {
    time: state.time,
    clock: stamp(state.time),
    factor,
    running,
    sections: [
      ...state.infeed.map((section) => sectionView(section, stateOf(section.id))),
      ...state.outfeed.map((section) => sectionView(section, stateOf(section.id))),
    ],
    lifts: [
      liftView(state.liftIn, layout.LIFT_IN.label, stateOf(state.liftIn.id)),
      liftView(state.liftOut, layout.LIFT_OUT.label, stateOf(state.liftOut.id)),
    ],
    shuttles: state.shuttles.map((shuttle) => shuttleView(shuttle, stateOf(shuttle.id))),
    slots: Object.fromEntries(
      Object.entries(state.slots).map(([slot, unit]) => [slot, palletOf(unit)]),
    ),
    received: state.received,
    shipped: state.shipped,
    stored,
    capacity: layout.ALL_SLOTS.length,
    throughput: hours > 0 ? state.shipped / hours : 0,
    lines: telegrams.map((telegram) => ({
      kind: telegram.kind,
      source: telegram.source,
      text: formatTelegram(telegram),
    })),
  }
}
