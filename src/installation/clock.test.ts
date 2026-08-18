import assert from 'node:assert/strict'
import { test } from 'node:test'
import { drawTicks, makePacer, setFactor, stamp, TICK_SECONDS } from './clock.js'

test('une seconde réelle produit le nombre de pas attendu', () => {
  const drawn = drawTicks(makePacer(1), 1)
  assert.equal(drawn.ticks, 1 / TICK_SECONDS)
})

test('le facteur multiplie le nombre de pas, pas leur durée', () => {
  const slow = drawTicks(makePacer(1), 1)
  const fast = drawTicks(makePacer(5), 1)
  assert.equal(fast.ticks, slow.ticks * 5)
})

test('le reste est reporté au lieu d’être perdu', () => {
  const first = drawTicks(makePacer(1), 0.03)
  assert.equal(first.ticks, 1)
  const second = drawTicks(first.pacer, 0.03)
  assert.equal(second.ticks, 2)
})

test('changer de facteur conserve le reste accumulé', () => {
  const drawn = drawTicks(makePacer(1), 0.03)
  const switched = setFactor(drawn.pacer, 5)
  assert.equal(switched.carry, drawn.pacer.carry)
  assert.equal(switched.factor, 5)
})

test('l’horloge s’affiche en heures, minutes, secondes, millisecondes', () => {
  assert.equal(stamp(3725.5), '01:02:05.500')
})
