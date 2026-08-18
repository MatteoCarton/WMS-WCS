import type { Limits } from './kinematics.js'

export const LEVELS = [1, 2, 3] as const

export const SLOTS_PER_LEVEL = 16

export const LEVEL_HEIGHTS: readonly number[] = [0, 6, 12]

export const CONVEYOR: Limits = { maxSpeed: 0.35, acceleration: 0.45 }

export const LIFT: Limits = { maxSpeed: 1.2, acceleration: 1.0 }

export const SHUTTLE: Limits = { maxSpeed: 2.0, acceleration: 0.8 }

export const TRANSFER_SECONDS = 6.5

export const PRODUCTION_INTERVAL = 34

export const DISPATCH_INTERVAL = 18

export const DISPATCH_FLOOR = 22

export const DISPATCH_IN_FLIGHT = 3

export type SectionSpec = {
  readonly id: string
  readonly label: string
  readonly from: number
  readonly to: number
  readonly identifies: boolean
}

export const INFEED: readonly SectionSpec[] = [
  { id: 'CNV01', label: 'Convoyeur à rouleaux', from: 0.8, to: 6.2, identifies: false },
  { id: 'SCN01', label: "Point d'identification", from: 6.6, to: 9.2, identifies: true },
  { id: 'CNV02', label: 'Convoyeur à rouleaux', from: 9.6, to: 12.6, identifies: false },
]

export const OUTFEED: readonly SectionSpec[] = [
  { id: 'CNV03', label: 'Convoyeur à rouleaux', from: 47.8, to: 51.4, identifies: false },
  { id: 'EXP01', label: 'Convoyeur de quai', from: 51.8, to: 56.2, identifies: false },
]

export const LIFT_IN = { id: 'LFT01', label: "Élévateur d'entrée", x: 13.9 } as const

export const LIFT_OUT = { id: 'LFT02', label: 'Élévateur de sortie', x: 46.1 } as const

export const AISLE = { from: LIFT_IN.x, to: LIFT_OUT.x } as const

export const FIRST_SLOT_X = 16.6

export const SLOT_PITCH = 1.8

export const shuttleId = (level: number): string => `NAV0${level}`

export const slotId = (level: number, index: number): string =>
  `RCK.N${level}.${String(index + 1).padStart(2, '0')}`

export const slotLevel = (slot: string): number => Number(slot.slice(5, 6))

export const slotIndex = (slot: string): number => Number(slot.slice(7)) - 1

export const slotX = (index: number): number => FIRST_SLOT_X + index * SLOT_PITCH

export const levelHeight = (level: number): number => LEVEL_HEIGHTS[level - 1] ?? 0

export const ALL_SLOTS: readonly string[] = LEVELS.flatMap((level) =>
  Array.from({ length: SLOTS_PER_LEVEL }, (_, index) => slotId(level, index)),
)
