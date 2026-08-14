import assert from "node:assert/strict";
import { test } from "node:test";
import { decode } from "./decode.js";
import { encode } from "./encode.js";
import type { Field, TelegramValues } from "./format.js";
import { frameLength, moveFields, reportFields } from "./format.js";

const move: TelegramValues = {
  type: "MOVE",
  sequence: "147",
  taskId: "TSK00042",
  lpn: "BIN00104",
  from: "C03-045-07-A",
  to: "PCK-02",
};

const report: TelegramValues = {
  type: "RPRT",
  sequence: "148",
  taskId: "TSK00042",
  outcome: "DONE",
  equipment: "SRM-C03",
  at: "186400",
};

function frameOf(fields: readonly Field[], values: TelegramValues): string {
  const framed = encode(fields, values);
  if (!framed.ok) {
    assert.fail(`encode refused: ${JSON.stringify(framed.error)}`);
  }
  return framed.value;
}

function roundTrip(fields: readonly Field[], values: TelegramValues): void {
  const parsed = decode(fields, frameOf(fields, values));
  if (!parsed.ok) {
    assert.fail(`decode refused: ${JSON.stringify(parsed.error)}`);
  }
  assert.deepEqual(parsed.value, values);
}

test("a move telegram survives the round trip", () => {
  roundTrip(moveFields, move);
});

test("a report telegram survives the round trip", () => {
  roundTrip(reportFields, report);
});

test("zero survives the round trip", () => {
  roundTrip(reportFields, { ...report, at: "0" });
});

test("an empty text field survives the round trip", () => {
  roundTrip(moveFields, { ...move, to: "" });
});

test("frames have the declared length", () => {
  assert.equal(frameOf(moveFields, move).length, frameLength(moveFields));
  assert.equal(frameOf(reportFields, report).length, frameLength(reportFields));
});

test("fields land on their declared positions", () => {
  assert.equal(
    frameOf(moveFields, move),
    "MOVE00000147TSK00042BIN00104C03-045-07-APCK-02      \r\n",
  );
});

test("a value longer than its field is refused", () => {
  const framed = encode(moveFields, { ...move, from: "C03-045-07-A-BIS" });
  assert.deepEqual(framed, {
    ok: false,
    error: {
      kind: "overflow",
      field: "from",
      value: "C03-045-07-A-BIS",
      maxLength: 12,
    },
  });
});

test("a missing field is refused", () => {
  const framed = encode(moveFields, { type: "MOVE" });
  assert.deepEqual(framed, {
    ok: false,
    error: { kind: "missing", field: "sequence" },
  });
});

test("a frame of the wrong length is refused", () => {
  const parsed = decode(moveFields, "MOVE0000\r\n");
  assert.deepEqual(parsed, {
    ok: false,
    error: { kind: "length", expectedLength: 54, actualLength: 10 },
  });
});

test("a frame without its terminator is refused", () => {
  const truncated = frameOf(moveFields, move).slice(0, -2) + "  ";
  const parsed = decode(moveFields, truncated);
  if (parsed.ok) {
    assert.fail("decode accepted a frame with no terminator");
  }
  assert.equal(parsed.error.kind, "terminator");
});
