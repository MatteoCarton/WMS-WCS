import type { Lpn } from "./container.js";
import type { LocationCode } from "./location.js";
import type { OrderReference } from "./order.js";
import type { Result } from "./result.js";
import { ok } from "./result.js";
import type { IllegalTransition, TransitionTable } from "./state-machine.js";
import { transition } from "./state-machine.js";

export type TaskId = string;

export type TaskType = "putaway" | "picking" | "replenishment" | "transfer";

export type TaskState =
  | "created"
  | "sent"
  | "accepted"
  | "running"
  | "done"
  | "failed";

export interface Task {
  readonly id: TaskId;
  readonly type: TaskType;
  readonly state: TaskState;
  readonly lpn: Lpn;
  readonly fromLocation: LocationCode | null;
  readonly toLocation: LocationCode | null;
  readonly orderReference: OrderReference | null;
  readonly attempts: number;
  readonly createdAt: Date;
}

export const taskTransitions: TransitionTable<TaskState> = {
  created: ["sent", "failed"],
  sent: ["accepted", "created", "failed"],
  accepted: ["running", "done", "failed"],
  running: ["done", "failed"],
  done: [],
  failed: [],
};

export function changeTaskState(
  task: Task,
  to: TaskState,
): Result<Task, IllegalTransition<TaskState>> {
  const next = transition(taskTransitions, task.state, to);
  return next.ok ? ok({ ...task, state: next.value }) : next;
}
