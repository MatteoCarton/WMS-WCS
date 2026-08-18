import { stamp } from './clock.js'

export type MachineState = 'IDLE' | 'BUSY' | 'BLOCKED' | 'FAULT'

type Envelope = {
  readonly sequence: number
  readonly at: number
  readonly source: string
  readonly target: string
}

export type Telegram =
  | (Envelope & {
      readonly kind: 'TRPORD'
      readonly unit: string
      readonly from: string
      readonly to: string
      readonly priority: number
    })
  | (Envelope & {
      readonly kind: 'TRPACK'
      readonly order: number
      readonly result: string
      readonly state: MachineState
    })
  | (Envelope & {
      readonly kind: 'TRPFIN'
      readonly order: number
      readonly unit: string
      readonly location: string
      readonly duration: number
    })
  | (Envelope & {
      readonly kind: 'IDNRPT'
      readonly unit: string
      readonly barcode: string
      readonly lengthMm: number
      readonly widthMm: number
      readonly heightMm: number
      readonly weightKg: number
    })
  | (Envelope & {
      readonly kind: 'STSMSG'
      readonly state: MachineState
      readonly position: number
      readonly speed: number
      readonly load: string
      readonly fault: string
    })
  | (Envelope & {
      readonly kind: 'INVRPT'
      readonly unit: string
      readonly location: string
      readonly barcode: string
    })
  | (Envelope & {
      readonly kind: 'ERRMSG'
      readonly code: string
      readonly text: string
      readonly severity: number
    })

const fixed = (value: number, digits: number): string => value.toFixed(digits)

const body = (telegram: Telegram): string => {
  switch (telegram.kind) {
    case 'TRPORD':
      return `TU=${telegram.unit} FROM=${telegram.from} TO=${telegram.to} PRIO=${telegram.priority}`
    case 'TRPACK':
      return `ORD=${String(telegram.order).padStart(6, '0')} RES=${telegram.result} STATE=${telegram.state}`
    case 'TRPFIN':
      return `ORD=${String(telegram.order).padStart(6, '0')} TU=${telegram.unit} AT=${telegram.location} DUR=${fixed(telegram.duration, 2)}`
    case 'IDNRPT':
      return `TU=${telegram.unit} BC=${telegram.barcode} L=${telegram.lengthMm} W=${telegram.widthMm} H=${telegram.heightMm} KG=${telegram.weightKg}`
    case 'STSMSG':
      return `STATE=${telegram.state} POS=${fixed(telegram.position, 2)} SPD=${fixed(telegram.speed, 2)} LOAD=${telegram.load} ERR=${telegram.fault}`
    case 'INVRPT':
      return `TU=${telegram.unit} AT=${telegram.location} BC=${telegram.barcode}`
    case 'ERRMSG':
      return `ERR=${telegram.code} TXT=${telegram.text} SEV=${telegram.severity}`
  }
}

export const formatTelegram = (telegram: Telegram): string =>
  [
    stamp(telegram.at),
    `SEQ=${String(telegram.sequence).padStart(6, '0')}`,
    telegram.kind,
    `${telegram.source.padEnd(5, ' ')} > ${telegram.target.padEnd(5, ' ')}`,
    body(telegram),
  ].join('  ')
