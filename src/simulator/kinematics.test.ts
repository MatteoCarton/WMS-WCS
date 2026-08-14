import assert from "node:assert/strict";
import { test } from "node:test";
import type { MotionProfile } from "./kinematics.js";
import {
  rampDistance,
  simultaneousTravelTime,
  travelTime,
} from "./kinematics.js";

const cartonCraneHorizontal: MotionProfile = { maxSpeed: 6, acceleration: 3 };
const cartonCraneVertical: MotionProfile = { maxSpeed: 3, acceleration: 3 };

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

test("standing still takes no time", () => {
  assert.equal(travelTime(cartonCraneHorizontal, 0), 0);
});

test("a long move reaches full speed", () => {
  assert.equal(travelTime(cartonCraneHorizontal, 24), 6);
});

test("a short move never reaches full speed", () => {
  assert.equal(round(travelTime(cartonCraneHorizontal, 4), 2), 2.31);
});

test("ramping up and down costs 12 metres", () => {
  assert.equal(rampDistance(cartonCraneHorizontal), 12);
});

test("both formulas agree at the ramp distance", () => {
  const boundary = rampDistance(cartonCraneHorizontal);

  assert.equal(travelTime(cartonCraneHorizontal, boundary), 4);
  assert.equal(
    round(travelTime(cartonCraneHorizontal, boundary - 0.000001), 4),
    4,
  );
});

test("ignoring the ramps underestimates every move", () => {
  const naive = 24 / cartonCraneHorizontal.maxSpeed;

  assert.equal(naive, 4);
  assert.ok(travelTime(cartonCraneHorizontal, 24) > naive);
});

test("a crane climbs while it travels, so the slowest axis wins", () => {
  const horizontal = travelTime(cartonCraneHorizontal, 30);
  const vertical = travelTime(cartonCraneVertical, 5);

  assert.equal(horizontal, 7);
  assert.equal(round(vertical, 2), 2.67);

  assert.equal(
    simultaneousTravelTime([
      { profile: cartonCraneHorizontal, distance: 30 },
      { profile: cartonCraneVertical, distance: 5 },
    ]),
    7,
  );
});

test("no axis to move takes no time", () => {
  assert.equal(simultaneousTravelTime([]), 0);
});
