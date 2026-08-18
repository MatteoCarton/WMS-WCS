import assert from 'node:assert/strict'
import { test } from 'node:test'
import { drawTicks, makePacer, type Pacer } from './clock.js'
import * as layout from './layout.js'
import { start, step, type Runtime } from './runtime.js'
import type { Telegram } from './telegram.js'

const LOOP = 0.02

const simulate = (
  factor: number,
  realSeconds: number,
): { readonly runtime: Runtime; readonly ticks: number; readonly telegrams: Telegram[] } => {
  const begun = start()
  let runtime = begun.runtime
  let pacer: Pacer = makePacer(factor)
  let ticks = 0
  const telegrams: Telegram[] = [...begun.telegrams]
  const frames = Math.round(realSeconds / LOOP)
  for (let frame = 0; frame < frames; frame += 1) {
    const drawn = drawTicks(pacer, LOOP)
    pacer = drawn.pacer
    ticks += drawn.ticks
    for (let index = 0; index < drawn.ticks; index += 1) {
      const advanced = step(runtime)
      runtime = advanced.runtime
      telegrams.push(...advanced.telegrams)
    }
  }
  return { runtime, ticks, telegrams }
}

test('accélérer l’horloge ne change rien au comportement de l’installation', () => {
  const fast = simulate(5, 40)
  const slow = simulate(1, 200)
  assert.equal(fast.ticks, slow.ticks)
  assert.deepEqual(fast.runtime.state, slow.runtime.state)
  assert.deepEqual(
    fast.telegrams.map((telegram) => telegram.sequence),
    slow.telegrams.map((telegram) => telegram.sequence),
  )
})

test('une palette traverse toute l’installation, de la production au quai', () => {
  const outcome = simulate(1, 200)
  const state = outcome.runtime.state

  assert.ok(state.received > 0, 'aucune palette produite')
  assert.ok(Object.keys(state.slots).length > 0, 'aucune palette rangée en alvéole')
  assert.ok(state.shipped > 0, 'aucune palette expédiée')

  const shipped = outcome.telegrams.find(
    (telegram) => telegram.kind === 'TRPFIN' && telegram.location === 'DOCK01',
  )
  assert.ok(shipped, 'aucun compte rendu de départ quai')
})

test('le point d’identification annonce le code-barres et les dimensions réelles', () => {
  const outcome = simulate(1, 60)
  const read = outcome.telegrams.find((telegram) => telegram.kind === 'IDNRPT')
  assert.ok(read && read.kind === 'IDNRPT')
  assert.equal(read.source, 'SCN01')
  assert.equal(read.barcode.length, 13)
  assert.equal(read.lengthMm, 1200)
  assert.equal(read.widthMm, 800)
  assert.ok(read.weightKg > 0)
})

test('chaque ordre reçoit un accusé de réception de la machine visée', () => {
  const outcome = simulate(1, 120)
  const orders = outcome.telegrams.filter((telegram) => telegram.kind === 'TRPORD')
  assert.ok(orders.length > 0)
  for (const order of orders) {
    const acknowledged = outcome.telegrams.some(
      (telegram) =>
        telegram.kind === 'TRPACK' &&
        telegram.order === order.sequence &&
        telegram.source === order.target,
    )
    assert.ok(acknowledged, `ordre ${order.sequence} sans accusé`)
  }
})

test('une alvéole ne reçoit jamais deux palettes à la fois', () => {
  const state = simulate(1, 200).runtime.state
  const occupied = Object.entries(state.slots)
  const units = new Set(occupied.map(([, unit]) => unit.id))
  assert.equal(units.size, occupied.length)
  for (const [slot] of occupied) {
    assert.ok(layout.ALL_SLOTS.includes(slot), `alvéole inconnue : ${slot}`)
  }
})

test('le magasin trouve son équilibre au lieu de se vider ou de saturer', () => {
  const state = simulate(1, 1800).runtime.state
  const stored = Object.keys(state.slots).length
  assert.ok(stored > 12, `le magasin se vide : ${stored} palettes en rayon`)
  assert.ok(
    stored < layout.ALL_SLOTS.length - 6,
    `le magasin sature : ${stored}/${layout.ALL_SLOTS.length}`,
  )
  assert.ok(state.shipped > 20, `seulement ${state.shipped} palettes expédiées`)
  assert.ok(state.received > 20, `seulement ${state.received} palettes produites`)
})

test('une palette identifiée sans alvéole libre n’est pas oubliée', () => {
  const outcome = simulate(1, 1800)
  const stores = outcome.telegrams.filter(
    (telegram) => telegram.kind === 'TRPORD' && telegram.to.startsWith('RCK'),
  )
  const reads = outcome.telegrams.filter((telegram) => telegram.kind === 'IDNRPT')
  assert.ok(reads.length > 0)
  assert.ok(
    stores.length >= reads.length - outcome.runtime.pilot.waiting.length - 3,
    `${reads.length} lectures pour seulement ${stores.length} ordres de rangement`,
  )
})

test('les machines rapportent leur état au démarrage', () => {
  const begun = start()
  const reported = begun.telegrams.filter((telegram) => telegram.kind === 'STSMSG')
  assert.equal(reported.length, layout.LEVELS.length + layout.INFEED.length + layout.OUTFEED.length + 2)
  assert.ok(reported.every((telegram) => telegram.kind === 'STSMSG' && telegram.state === 'IDLE'))
})

test('le stock déjà en rayon est annoncé au WCS au démarrage', () => {
  const begun = start()
  const inventory = begun.telegrams.filter((telegram) => telegram.kind === 'INVRPT')
  assert.equal(inventory.length, Object.keys(begun.runtime.state.slots).length)
  assert.ok(inventory.length > 0)
  for (const line of inventory) {
    assert.ok(line.kind === 'INVRPT' && layout.ALL_SLOTS.includes(line.location))
  }
  assert.equal(begun.runtime.pilot.stored.length, inventory.length)
})

test('le WCS ne range jamais une palette dans une alvéole déjà pleine', () => {
  const outcome = simulate(1, 200)
  const occupied = new Set(Object.keys(outcome.runtime.state.slots))
  const stores = outcome.telegrams.filter(
    (telegram) => telegram.kind === 'TRPORD' && telegram.to.startsWith('RCK'),
  )
  assert.ok(stores.length > 0)
  const targets = stores.map((telegram) => (telegram.kind === 'TRPORD' ? telegram.to : ''))
  assert.equal(new Set(targets).size, targets.length)
  assert.ok(occupied.size > 0)
})
