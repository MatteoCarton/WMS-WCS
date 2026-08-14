import assert from "node:assert/strict";
import { test } from "node:test";
import type { Task } from "../domain/task.js";
import type { MoveOutcome } from "./driver.js";
import { createDispatcher } from "./dispatcher.js";
import { createMemoryDriver } from "./memory-driver.js";

function task(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    type: "picking",
    state: "created",
    lpn: "BIN00104",
    fromLocation: "C03-041-12-B",
    toLocation: "PCK-02",
    orderReference: "ORD-2026-0002",
    attempts: 0,
    createdAt: new Date("2026-08-14T09:00:00Z"),
    ...overrides,
  };
}

function report(id: string, outcome: MoveOutcome) {
  return { taskId: id, outcome, equipmentId: "SRM-C03", at: 1000 };
}

test("dispatching sends one command and marks the task sent", () => {
  const driver = createMemoryDriver("carton-store");
  const dispatcher = createDispatcher(driver);

  const sent = dispatcher.dispatch(task("TSK00042"));

  assert.ok(sent.ok);
  assert.equal(sent.value.state, "sent");
  assert.deepEqual(driver.sent(), [
    {
      taskId: "TSK00042",
      lpn: "BIN00104",
      from: "C03-041-12-B",
      to: "PCK-02",
    },
  ]);
});

test("a task without a route is refused before anything is sent", () => {
  const driver = createMemoryDriver("carton-store");
  const dispatcher = createDispatcher(driver);

  const refused = dispatcher.dispatch(task("TSK00042", { toLocation: null }));

  assert.deepEqual(refused, { ok: false, error: "missing_route" });
  assert.deepEqual(driver.sent(), []);
});

test("the same task is never dispatched twice", () => {
  const driver = createMemoryDriver("carton-store");
  const dispatcher = createDispatcher(driver);

  dispatcher.dispatch(task("TSK00042"));
  const again = dispatcher.dispatch(task("TSK00042"));

  assert.deepEqual(again, { ok: false, error: "already_dispatched" });
  assert.equal(driver.sent().length, 1);
});

test("acceptance then completion walks the task to done", () => {
  const driver = createMemoryDriver("carton-store");
  const dispatcher = createDispatcher(driver);

  dispatcher.dispatch(task("TSK00042"));

  driver.emit(report("TSK00042", "accepted"));
  assert.equal(dispatcher.taskOf("TSK00042")?.state, "accepted");

  driver.emit(report("TSK00042", "completed"));
  assert.equal(dispatcher.taskOf("TSK00042")?.state, "done");
});

test("a duplicated completion changes nothing", () => {
  const driver = createMemoryDriver("carton-store");
  const dispatcher = createDispatcher(driver);
  const settled: string[] = [];

  dispatcher.onSettled((done) => settled.push(done.id));
  dispatcher.dispatch(task("TSK00042"));

  driver.emit(report("TSK00042", "accepted"));
  driver.emit(report("TSK00042", "completed"));
  driver.emit(report("TSK00042", "completed"));
  driver.emit(report("TSK00042", "completed"));

  assert.deepEqual(settled, ["TSK00042"]);
});

test("a refusal sends the task back to the queue with one more attempt", () => {
  const driver = createMemoryDriver("carton-store");
  const dispatcher = createDispatcher(driver);

  dispatcher.dispatch(task("TSK00042"));
  driver.emit(report("TSK00042", "rejected"));

  const back = dispatcher.taskOf("TSK00042");

  assert.equal(back?.state, "created");
  assert.equal(back?.attempts, 1);
  assert.deepEqual(dispatcher.retryable().map((waiting) => waiting.id), [
    "TSK00042",
  ]);
});

test("a task gives up after the third refusal", () => {
  const driver = createMemoryDriver("carton-store");
  const dispatcher = createDispatcher(driver, { maxAttempts: 3 });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const waiting = dispatcher.taskOf("TSK00042") ?? task("TSK00042");
    dispatcher.dispatch(waiting);
    driver.emit(report("TSK00042", "rejected"));
  }

  const dead = dispatcher.taskOf("TSK00042");

  assert.equal(dead?.state, "failed");
  assert.equal(dead?.attempts, 3);
  assert.deepEqual(dispatcher.retryable(), []);
  assert.deepEqual(dispatcher.settled().map((one) => one.id), ["TSK00042"]);
});

test("a report for a task the WCS never sent is ignored", () => {
  const driver = createMemoryDriver("carton-store");
  const dispatcher = createDispatcher(driver);

  driver.emit(report("TSK09999", "completed"));

  assert.equal(dispatcher.taskOf("TSK09999"), null);
});
