import assert from 'node:assert/strict'
import { test } from 'node:test'
import { drawTicks, makePacer, setFactor, stamp, TICK_SECONDS } from './clock.js'

test('a real second produces the expected number of ticks', () => {
  const drawn = drawTicks(makePacer(1), 1)
  assert.equal(drawn.ticks, 1 / TICK_SECONDS)
})

test('the factor multiplies the number of ticks, not their duration', () => {
  const slow = drawTicks(makePacer(1), 1)
  const fast = drawTicks(makePacer(5), 1)
  assert.equal(fast.ticks, slow.ticks * 5)
})

test('the remainder carries over instead of being lost', () => {
  const first = drawTicks(makePacer(1), 0.03)
  assert.equal(first.ticks, 1)
  const second = drawTicks(first.pacer, 0.03)
  assert.equal(second.ticks, 2)
})

test('changing the factor keeps the accumulated carry', () => {
  const drawn = drawTicks(makePacer(1), 0.03)
  const switched = setFactor(drawn.pacer, 5)
  assert.equal(switched.carry, drawn.pacer.carry)
  assert.equal(switched.factor, 5)
})

test('the clock reads as hours, minutes, seconds and milliseconds', () => {
  assert.equal(stamp(3725.5), '01:02:05.500')
})
