import assert from "node:assert/strict";
import type { TestContext } from "node:test";
import { test } from "node:test";
import type { Container } from "./domain/container.js";
import type { Order } from "./domain/order.js";
import type { Task } from "./domain/task.js";
import { startSimulator } from "./simulator/server.js";
import { createDispatcher } from "./wcs/dispatcher.js";
import { connectTelegramDriver } from "./wcs/telegram-driver.js";
import { planOrder } from "./wms/planner.js";
import type { Warehouse } from "./wms/warehouse.js";
import {
  confirmPick,
  markArrived,
  markLost,
  receivePlan,
} from "./wms/warehouse.js";

const NOW = new Date("2026-08-14T09:00:00Z");

function bin(lpn: string, at: string, quantity: number, expiry: string): Container {
  return {
    lpn,
    state: "in_stock",
    locationCode: at,
    contents: [
      {
        sku: "YOG-NAT-500",
        quantity,
        reservedQuantity: 0,
        receivedAt: NOW,
        expiryDate: new Date(expiry),
      },
    ],
  };
}

const containers: readonly Container[] = [
  bin("BIN00104", "C03-041-12-B", 30, "2026-08-28"),
  bin("BIN00110", "C01-012-04-A", 30, "2026-08-20"),
];

const order: Order = {
  reference: "ORD-2026-0002",
  customer: "Colruyt Tournai",
  createdAt: NOW,
  state: "received",
  lines: [{ sku: "YOG-NAT-500", requestedQuantity: 50, pickedQuantity: 0 }],
};

test("an order travels from the WMS to the machines and back", async (t) => {
  const simulator = await startSimulator({
    port: 0,
    aisles: 6,
    tickMilliseconds: 5,
    speedFactor: 200,
  });

  const driver = await connectTelegramDriver({
    host: "127.0.0.1",
    port: simulator.port,
    name: "carton-store",
  });

  t.after(async () => {
    await driver.close();
    await simulator.stop();
  });

  const dispatcher = createDispatcher(driver);

  const plan = planOrder(order, {
    containers,
    strategy: "fefo",
    station: "PCK-02",
    now: NOW,
    firstTaskNumber: 1,
  });

  assert.equal(plan.tasks.length, 2);
  assert.deepEqual(plan.shortfalls, []);
  assert.equal(plan.instructions[0]?.lpn, "BIN00110");

  let warehouse: Warehouse = receivePlan(
    { containers, orders: [order], picks: [] },
    plan,
  );

  assert.equal(warehouse.orders[0]?.state, "planned");

  const everythingSettled = new Promise<void>((resolve) => {
    const settled: Task[] = [];

    dispatcher.onSettled((task) => {
      warehouse =
        task.state === "done"
          ? markArrived(warehouse, task.id)
          : markLost(warehouse, task.id);

      settled.push(task);

      if (settled.length === plan.tasks.length) {
        resolve();
      }
    });
  });

  for (const task of plan.tasks) {
    assert.ok(dispatcher.dispatch(task).ok);
  }

  await everythingSettled;

  assert.equal(
    warehouse.picks.filter((pick) => pick.state === "ready").length,
    2,
  );

  for (const pick of warehouse.picks) {
    const confirmed = confirmPick(
      warehouse,
      pick.instruction.taskId,
      pick.instruction.quantity,
    );

    assert.ok(confirmed.ok);
    warehouse = confirmed.value;
  }

  assert.equal(warehouse.orders[0]?.state, "picked");
  assert.equal(warehouse.orders[0]?.lines[0]?.pickedQuantity, 50);

  const left = warehouse.containers.flatMap((container) =>
    container.contents.map((line) => line.quantity),
  );

  assert.deepEqual(left.reduce((total, quantity) => total + quantity, 0), 10);
  assert.deepEqual(
    warehouse.picks.map((pick) => pick.state),
    ["confirmed", "confirmed"],
  );
});
