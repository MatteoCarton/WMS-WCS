import assert from "node:assert/strict";
import { test } from "node:test";
import { createFramer } from "./framer.js";

test("a chunk shorter than a frame yields nothing", () => {
  const framer = createFramer(10);

  assert.deepEqual(framer.push("ABCDE"), []);
  assert.equal(framer.pending(), 5);
});

test("an exact chunk yields one frame", () => {
  const framer = createFramer(10);

  assert.deepEqual(framer.push("ABCDEFGHIJ"), ["ABCDEFGHIJ"]);
  assert.equal(framer.pending(), 0);
});

test("frames are cut wherever the network split them", () => {
  const framer = createFramer(10);

  assert.deepEqual(framer.push("ABCDEFGH"), []);
  assert.deepEqual(framer.push("IJKLMNOPQR"), ["ABCDEFGHIJ"]);
  assert.deepEqual(framer.push("ST"), ["KLMNOPQRST"]);
  assert.equal(framer.pending(), 0);
});

test("one chunk can carry several frames at once", () => {
  const framer = createFramer(4);

  assert.deepEqual(framer.push("AAAABBBBCC"), ["AAAA", "BBBB"]);
  assert.equal(framer.pending(), 2);
});

test("a byte at a time works just as well", () => {
  const framer = createFramer(4);
  const collected = [..."ABCDEFGH"].flatMap((byte) => framer.push(byte));

  assert.deepEqual(collected, ["ABCD", "EFGH"]);
});

test("two framers keep their own buffers", () => {
  const first = createFramer(4);
  const second = createFramer(4);

  first.push("AB");

  assert.equal(first.pending(), 2);
  assert.equal(second.pending(), 0);
});
