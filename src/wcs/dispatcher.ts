import type { Result } from "../domain/result.js";
import { err, ok } from "../domain/result.js";
import type { Task, TaskId } from "../domain/task.js";
import { changeTaskState } from "../domain/task.js";
import type { EquipmentDriver, MoveReport } from "./driver.js";

export type DispatchRefusal =
  | "already_dispatched"
  | "not_dispatchable"
  | "missing_route";

export interface DispatcherOptions {
  readonly maxAttempts: number;
}

export const DEFAULT_DISPATCHER_OPTIONS: DispatcherOptions = {
  maxAttempts: 3,
};

export type TaskListener = (task: Task) => void;

export interface Dispatcher {
  readonly dispatch: (task: Task) => Result<Task, DispatchRefusal>;
  readonly taskOf: (taskId: TaskId) => Task | null;
  readonly retryable: () => readonly Task[];
  readonly settled: () => readonly Task[];
  readonly onSettled: (listener: TaskListener) => void;
}

export function createDispatcher(
  driver: EquipmentDriver,
  options: DispatcherOptions = DEFAULT_DISPATCHER_OPTIONS,
): Dispatcher {
  const tasks = new Map<TaskId, Task>();
  const listeners = new Set<TaskListener>();

  function remember(task: Task): Task {
    tasks.set(task.id, task);
    return task;
  }

  function settle(task: Task): void {
    remember(task);

    for (const listener of listeners) {
      listener(task);
    }
  }

  function move(task: Task, to: Task["state"]): Task | null {
    const next = changeTaskState(task, to);

    if (!next.ok) {
      console.error(`${driver.name}: illegal transition`, next.error);
      return null;
    }

    return next.value;
  }

  function onAccepted(task: Task): void {
    const accepted = move(task, "accepted");

    if (accepted !== null) {
      remember(accepted);
    }
  }

  function onCompleted(task: Task): void {
    const done = move(task, "done");

    if (done !== null) {
      settle(done);
    }
  }

  function onRefused(task: Task): void {
    const attempts = task.attempts + 1;
    const exhausted = attempts >= options.maxAttempts;
    const next = move({ ...task, attempts }, exhausted ? "failed" : "created");

    if (next === null) {
      return;
    }

    if (exhausted) {
      settle(next);
      return;
    }

    remember(next);
  }

  driver.onReport((report: MoveReport) => {
    const task = tasks.get(report.taskId);

    if (task === undefined) {
      console.error(`${driver.name}: report for an unknown task`, report.taskId);
      return;
    }

    if (task.state === "done" || task.state === "failed") {
      return;
    }

    if (report.outcome === "accepted") {
      onAccepted(task);
      return;
    }

    if (report.outcome === "completed") {
      onCompleted(task);
      return;
    }

    onRefused(task);
  });

  return {
    dispatch: (task: Task) => {
      const known = tasks.get(task.id);

      if (known !== undefined && known.state !== "created") {
        return err("already_dispatched");
      }

      if (task.state !== "created") {
        return err("not_dispatchable");
      }

      if (task.fromLocation === null || task.toLocation === null) {
        return err("missing_route");
      }

      const sent = move(task, "sent");

      if (sent === null) {
        return err("not_dispatchable");
      }

      remember(sent);

      driver.send({
        taskId: sent.id,
        lpn: sent.lpn,
        from: task.fromLocation,
        to: task.toLocation,
      });

      return ok(sent);
    },

    taskOf: (taskId: TaskId) => tasks.get(taskId) ?? null,

    retryable: () =>
      [...tasks.values()].filter((task) => task.state === "created"),

    settled: () =>
      [...tasks.values()].filter(
        (task) => task.state === "done" || task.state === "failed",
      ),

    onSettled: (listener: TaskListener) => {
      listeners.add(listener);
    },
  };
}
