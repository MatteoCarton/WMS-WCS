import assert from "node:assert/strict";
import { test } from "node:test";
import { createClock } from "./clock.js";

test("a new clock starts at zero", () => {
  assert.equal(createClock().now(), 0);
});

test("advancing accumulates", () => {
  const clock = createClock();

  clock.advance(500);
  clock.advance(250);

  assert.equal(clock.now(), 750);
});

test("two clocks are independent", () => {
  const first = createClock();
  const second = createClock();

  first.advance(1000);

  assert.equal(first.now(), 1000);
  assert.equal(second.now(), 0);
});
