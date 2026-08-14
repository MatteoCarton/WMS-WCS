import assert from "node:assert/strict";
import { test } from "node:test";
import { cartonCrane } from "./equipment.js";
import type { MoveOrder, Simulation } from "./engine.js";
import { advanceTo, submit } from "./engine.js";
import { buildLayout, cartonAddresses } from "./layout.js";

const layout = buildLayout(cartonAddresses());

function freshSimulation(): Simulation {
  return { now: 0, layout, equipment: [cartonCrane(3)] };
}

const order: MoveOrder = {
  taskId: "TSK00042",
  lpn: "BIN00104",
  from: "C03-041-12-B",
  to: "PCK-02",
};

test("an accepted order puts the crane to work", () => {
  const { simulation, report } = submit(freshSimulation(), order);
  const crane = simulation.equipment[0];

  assert.equal(report.outcome, "accepted");
  assert.equal(report.equipmentId, "SRM-C03");
  assert.equal(report.at, 0);

  assert.equal(crane?.state, "busy");
  assert.equal(crane?.movement?.taskId, "TSK00042");
});

test("the cycle costs going, picking, returning and dropping", () => {
  const { simulation } = submit(freshSimulation(), order);

  assert.equal(simulation.equipment[0]?.movement?.finishesAt, 18000);
});

test("nothing happens before the crane is done", () => {
  const started = submit(freshSimulation(), order).simulation;
  const { simulation, reports } = advanceTo(started, 17999);

  assert.deepEqual(reports, []);
  assert.equal(simulation.equipment[0]?.state, "busy");
});

test("the crane reports and frees itself once the time has passed", () => {
  const started = submit(freshSimulation(), order).simulation;
  const { simulation, reports } = advanceTo(started, 18000);
  const crane = simulation.equipment[0];

  assert.equal(reports.length, 1);
  assert.equal(reports[0]?.outcome, "completed");
  assert.equal(reports[0]?.taskId, "TSK00042");
  assert.equal(reports[0]?.at, 18000);

  assert.equal(crane?.state, "idle");
  assert.equal(crane?.movement, null);
});

test("the crane ends up where it dropped the load", () => {
  const started = submit(freshSimulation(), order).simulation;
  const { simulation } = advanceTo(started, 18000);

  assert.deepEqual(simulation.equipment[0]?.position, { x: 0, y: 0, z: 0 });
});

test("a busy crane refuses a second order", () => {
  const started = submit(freshSimulation(), order).simulation;
  const { report } = submit(started, { ...order, taskId: "TSK00043" });

  assert.equal(report.outcome, "rejected");
  assert.equal(report.reason, "equipment_busy");
});

test("an order for an aisle without a crane is refused", () => {
  const { report } = submit(freshSimulation(), {
    ...order,
    from: "C05-041-12-B",
  });

  assert.equal(report.outcome, "rejected");
  assert.equal(report.reason, "no_equipment_for_aisle");
});

test("an unreadable source location is refused", () => {
  const { report } = submit(freshSimulation(), { ...order, from: "PCK-02" });

  assert.equal(report.outcome, "rejected");
  assert.equal(report.reason, "unknown_source");
});

test("a refused order leaves the simulation untouched", () => {
  const before = freshSimulation();
  const { simulation } = submit(before, { ...order, from: "PCK-02" });

  assert.equal(simulation, before);
});

test("two cranes work at the same time", () => {
  const start: Simulation = {
    now: 0,
    layout,
    equipment: [cartonCrane(1), cartonCrane(3)],
  };

  const first = submit(start, { ...order, from: "C01-001-01-A" });
  const second = submit(first.simulation, { ...order, taskId: "TSK00043" });

  assert.equal(first.report.outcome, "accepted");
  assert.equal(second.report.outcome, "accepted");
  assert.notEqual(first.report.equipmentId, second.report.equipmentId);

  const { reports } = advanceTo(second.simulation, 60000);

  assert.equal(reports.length, 2);
  assert.ok((reports[0]?.at ?? 0) <= (reports[1]?.at ?? 0));
});
