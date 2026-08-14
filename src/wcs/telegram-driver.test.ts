import assert from "node:assert/strict";
import type { TestContext } from "node:test";
import { test } from "node:test";
import { startSimulator } from "../simulator/server.js";
import type { EquipmentDriver, MoveReport } from "./driver.js";
import { connectTelegramDriver } from "./telegram-driver.js";

async function drivenSimulator(
  t: TestContext,
  speedFactor: number,
): Promise<EquipmentDriver> {
  const simulator = await startSimulator({
    port: 0,
    aisles: 6,
    tickMilliseconds: 5,
    speedFactor,
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

  return driver;
}

function awaitReports(
  driver: EquipmentDriver,
  count: number,
): Promise<readonly MoveReport[]> {
  return new Promise((resolve) => {
    const seen: MoveReport[] = [];

    driver.onReport((report) => {
      seen.push(report);

      if (seen.length >= count) {
        resolve(seen);
      }
    });
  });
}

test("the WCS drives the simulator through the seam", async (t) => {
  const driver = await drivenSimulator(t, 200);
  const reports = awaitReports(driver, 2);

  driver.send({
    taskId: "TSK00042",
    lpn: "BIN00104",
    from: "C03-041-12-B",
    to: "PCK-02",
  });

  const [accepted, completed] = await reports;

  assert.equal(accepted?.outcome, "accepted");
  assert.equal(accepted?.equipmentId, "SRM-C03");

  assert.equal(completed?.outcome, "completed");
  assert.equal(completed?.taskId, "TSK00042");
  assert.equal((completed?.at ?? 0) - (accepted?.at ?? 0), 18000);
});

test("a refusal comes back as a refusal, not as a crash", async (t) => {
  const driver = await drivenSimulator(t, 1);
  const reports = awaitReports(driver, 2);

  driver.send({
    taskId: "TSK00042",
    lpn: "BIN00104",
    from: "C03-041-12-B",
    to: "PCK-02",
  });

  driver.send({
    taskId: "TSK00043",
    lpn: "BIN00105",
    from: "C03-002-01-A",
    to: "PCK-02",
  });

  const [first, second] = await reports;

  assert.equal(first?.outcome, "accepted");
  assert.equal(second?.outcome, "rejected");
  assert.equal(second?.taskId, "TSK00043");
});

test("several aisles work in parallel", async (t) => {
  const driver = await drivenSimulator(t, 200);
  const reports = awaitReports(driver, 6);

  for (const aisle of ["C01", "C02", "C03"]) {
    driver.send({
      taskId: `TSK000${aisle.slice(2)}`,
      lpn: "BIN00104",
      from: `${aisle}-041-12-B`,
      to: "PCK-02",
    });
  }

  const seen = await reports;
  const completed = seen.filter((report) => report.outcome === "completed");

  assert.equal(seen.filter((report) => report.outcome === "accepted").length, 3);
  assert.equal(completed.length, 3);
  assert.equal(new Set(completed.map((report) => report.equipmentId)).size, 3);
});

test("the driver reports which link it speaks for", async (t) => {
  const driver = await drivenSimulator(t, 1);

  assert.equal(driver.name, "carton-store");
});
