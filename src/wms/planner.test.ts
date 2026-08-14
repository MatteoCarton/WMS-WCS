import assert from "node:assert/strict";
import { test } from "node:test";
import type { Container } from "../domain/container.js";
import type { Order } from "../domain/order.js";
import type { PlanningContext } from "./planner.js";
import { planOrder } from "./planner.js";

const NOW = new Date("2026-08-14T09:00:00Z");

function bin(
  lpn: string,
  quantity: number,
  receivedAt: string,
  locationCode: string | null = "C03-041-12-B",
): Container {
  return {
    lpn,
    state: "in_stock",
    locationCode,
    contents: [
      {
        sku: "YOG-NAT-500",
        quantity,
        reservedQuantity: 0,
        receivedAt: new Date(receivedAt),
        expiryDate: new Date(receivedAt),
      },
    ],
  };
}

function order(requested: number, picked = 0): Order {
  return {
    reference: "ORD-2026-0002",
    customer: "Colruyt Tournai",
    createdAt: NOW,
    state: "planned",
    lines: [
      {
        sku: "YOG-NAT-500",
        requestedQuantity: requested,
        pickedQuantity: picked,
      },
    ],
  };
}

function context(containers: readonly Container[]): PlanningContext {
  return {
    containers,
    strategy: "fefo",
    station: "PCK-02",
    now: NOW,
    firstTaskNumber: 1,
  };
}

test("one container covering the line yields one task", () => {
  const plan = planOrder(order(20), context([bin("BIN00104", 50, "2026-08-01")]));

  assert.equal(plan.tasks.length, 1);
  assert.deepEqual(plan.shortfalls, []);

  assert.equal(plan.tasks[0]?.id, "TSK00001");
  assert.equal(plan.tasks[0]?.type, "picking");
  assert.equal(plan.tasks[0]?.state, "created");
  assert.equal(plan.tasks[0]?.fromLocation, "C03-041-12-B");
  assert.equal(plan.tasks[0]?.toLocation, "PCK-02");
  assert.equal(plan.tasks[0]?.orderReference, "ORD-2026-0002");
});

test("the quantity travels on the instruction, never on the task", () => {
  const plan = planOrder(order(20), context([bin("BIN00104", 50, "2026-08-01")]));

  assert.deepEqual(plan.instructions, [
    {
      taskId: "TSK00001",
      orderReference: "ORD-2026-0002",
      sku: "YOG-NAT-500",
      lpn: "BIN00104",
      quantity: 20,
    },
  ]);
});

test("a line spread over three containers yields three numbered tasks", () => {
  const plan = planOrder(
    order(100),
    context([
      bin("BIN00104", 30, "2026-08-01"),
      bin("BIN00105", 30, "2026-08-02"),
      bin("BIN00110", 60, "2026-08-03"),
    ]),
  );

  assert.deepEqual(
    plan.tasks.map((task) => task.id),
    ["TSK00001", "TSK00002", "TSK00003"],
  );

  assert.deepEqual(
    plan.instructions.map((instruction) => instruction.quantity),
    [30, 30, 40],
  );
});

test("FEFO decides which container is emptied first", () => {
  const plan = planOrder(
    order(10),
    context([
      bin("BIN00104", 50, "2026-09-11"),
      bin("BIN00110", 50, "2026-08-20"),
    ]),
  );

  assert.equal(plan.instructions[0]?.lpn, "BIN00110");
});

test("what is already picked is not planned again", () => {
  const plan = planOrder(
    order(50, 50),
    context([bin("BIN00104", 50, "2026-08-01")]),
  );

  assert.deepEqual(plan.tasks, []);
  assert.deepEqual(plan.shortfalls, []);
});

test("missing stock is reported instead of being invented", () => {
  const plan = planOrder(order(80), context([bin("BIN00104", 50, "2026-08-01")]));

  assert.equal(plan.tasks.length, 1);
  assert.deepEqual(plan.shortfalls, [{ sku: "YOG-NAT-500", missing: 30 }]);
});

test("a container with no location cannot be planned", () => {
  const plan = planOrder(
    order(20),
    context([bin("BIN00111", 50, "2026-08-01", null)]),
  );

  assert.deepEqual(plan.tasks, []);
  assert.deepEqual(plan.shortfalls, [{ sku: "YOG-NAT-500", missing: 20 }]);
});

test("planning a second line does not sell the same stock twice", () => {
  const twoLines: Order = {
    ...order(30),
    lines: [
      { sku: "YOG-NAT-500", requestedQuantity: 30, pickedQuantity: 0 },
      { sku: "YOG-NAT-500", requestedQuantity: 30, pickedQuantity: 0 },
    ],
  };

  const plan = planOrder(
    twoLines,
    context([bin("BIN00104", 40, "2026-08-01")]),
  );

  assert.deepEqual(
    plan.instructions.map((instruction) => instruction.quantity),
    [30, 10],
  );

  assert.deepEqual(plan.shortfalls, [{ sku: "YOG-NAT-500", missing: 20 }]);
});
