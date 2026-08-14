import assert from "node:assert/strict";
import { test } from "node:test";
import type { Container } from "../domain/container.js";
import type { Order } from "../domain/order.js";
import { planOrder } from "./planner.js";
import type { Warehouse } from "./warehouse.js";
import {
  confirmPick,
  markArrived,
  markLost,
  receivePlan,
} from "./warehouse.js";

const NOW = new Date("2026-08-14T09:00:00Z");

const bin: Container = {
  lpn: "BIN00104",
  state: "in_stock",
  locationCode: "C03-041-12-B",
  contents: [
    {
      sku: "YOG-NAT-500",
      quantity: 50,
      reservedQuantity: 0,
      receivedAt: NOW,
      expiryDate: new Date("2026-08-28"),
    },
  ],
};

const order: Order = {
  reference: "ORD-2026-0002",
  customer: "Colruyt Tournai",
  createdAt: NOW,
  state: "received",
  lines: [
    { sku: "YOG-NAT-500", requestedQuantity: 20, pickedQuantity: 0 },
  ],
};

function planned(): Warehouse {
  const empty: Warehouse = { containers: [bin], orders: [order], picks: [] };

  const plan = planOrder(order, {
    containers: [bin],
    strategy: "fefo",
    station: "PCK-02",
    now: NOW,
    firstTaskNumber: 1,
  });

  return receivePlan(empty, plan);
}

test("planning registers a waiting pick and marks the order planned", () => {
  const warehouse = planned();

  assert.equal(warehouse.picks.length, 1);
  assert.equal(warehouse.picks[0]?.state, "waiting");
  assert.equal(warehouse.picks[0]?.instruction.quantity, 20);
  assert.equal(warehouse.orders[0]?.state, "planned");
});

test("a pick cannot be confirmed before the bin has arrived", () => {
  const refused = confirmPick(planned(), "TSK00001", 20);

  assert.deepEqual(refused, { ok: false, error: "pick_not_ready" });
});

test("confirming takes the stock out and advances the order", () => {
  const ready = markArrived(planned(), "TSK00001");
  const confirmed = confirmPick(ready, "TSK00001", 20);

  assert.ok(confirmed.ok);

  const line = confirmed.value.containers[0]?.contents[0];

  assert.equal(line?.quantity, 30);
  assert.equal(line?.reservedQuantity, 0);
  assert.equal(confirmed.value.orders[0]?.lines[0]?.pickedQuantity, 20);
  assert.equal(confirmed.value.orders[0]?.state, "picked");
  assert.equal(confirmed.value.picks[0]?.state, "confirmed");
});

test("picking less than asked leaves the order unfinished", () => {
  const ready = markArrived(planned(), "TSK00001");
  const confirmed = confirmPick(ready, "TSK00001", 18);

  assert.ok(confirmed.ok);

  const stock = confirmed.value.containers[0]?.contents[0];

  assert.equal(stock?.quantity, 32);
  assert.equal(stock?.reservedQuantity, 0);
  assert.equal(confirmed.value.orders[0]?.lines[0]?.pickedQuantity, 18);
  assert.equal(confirmed.value.orders[0]?.state, "picking");
});

test("the reservation is released even when nothing is taken", () => {
  const ready = markArrived(planned(), "TSK00001");
  const confirmed = confirmPick(ready, "TSK00001", 0);

  assert.ok(confirmed.ok);

  const stock = confirmed.value.containers[0]?.contents[0];

  assert.equal(stock?.quantity, 50);
  assert.equal(stock?.reservedQuantity, 0);
  assert.equal(confirmed.value.orders[0]?.state, "picking");
});

test("a pick cannot be confirmed twice", () => {
  const ready = markArrived(planned(), "TSK00001");
  const once = confirmPick(ready, "TSK00001", 20);

  assert.ok(once.ok);

  const twice = confirmPick(once.value, "TSK00001", 20);

  assert.deepEqual(twice, { ok: false, error: "pick_not_ready" });
});

test("more than the bin holds is refused", () => {
  const ready = markArrived(planned(), "TSK00001");

  assert.deepEqual(confirmPick(ready, "TSK00001", 80), {
    ok: false,
    error: "not_enough_in_container",
  });
});

test("a lost task cancels its pick instead of stranding it", () => {
  const lost = markLost(planned(), "TSK00001");

  assert.equal(lost.picks[0]?.state, "cancelled");
  assert.deepEqual(confirmPick(lost, "TSK00001", 20), {
    ok: false,
    error: "pick_not_ready",
  });
});

test("a confirmation for a task nobody planned is refused", () => {
  assert.deepEqual(confirmPick(planned(), "TSK09999", 20), {
    ok: false,
    error: "unknown_pick",
  });
});
