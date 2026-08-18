import assert from 'node:assert/strict'
import { test } from 'node:test'
import { advance, arrived, atRest, travelSeconds, type Limits } from './kinematics.js'

const SHUTTLE: Limits = { maxSpeed: 2, acceleration: 0.8 }

const run = (from: number, to: number, limits: Limits): { seconds: number; peak: number } => {
  let motion = atRest(from)
  let seconds = 0
  let peak = 0
  while (!arrived(motion, to) && seconds < 600) {
    motion = advance(motion, to, limits, 0.02)
    peak = Math.max(peak, Math.abs(motion.speed))
    seconds += 0.02
  }
  return { seconds, peak }
}

test('the machine reaches its target and stops on it', () => {
  const outcome = run(0, 30, SHUTTLE)
  assert.ok(outcome.seconds < 600)
})

test('the speed never exceeds the rated speed', () => {
  const outcome = run(0, 30, SHUTTLE)
  assert.ok(outcome.peak <= SHUTTLE.maxSpeed + 1e-9)
})

test('a short run leaves no time to reach the rated speed', () => {
  const outcome = run(0, 1, SHUTTLE)
  assert.ok(outcome.peak < SHUTTLE.maxSpeed)
})

test('the simulated time follows the theoretical trapezoidal profile', () => {
  const outcome = run(0, 30, SHUTTLE)
  const expected = travelSeconds(30, SHUTTLE)
  assert.ok(Math.abs(outcome.seconds - expected) < 0.5, `${outcome.seconds} vs ${expected}`)
})

test('a run in reverse behaves like a run forward', () => {
  const forward = run(0, 20, SHUTTLE)
  const backward = run(20, 0, SHUTTLE)
  assert.ok(Math.abs(forward.seconds - backward.seconds) < 0.05)
})
