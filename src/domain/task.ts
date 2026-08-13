import type { Lpn } from "./container.js";
import type { LocationCode } from "./location.js";
import type { OrderReference } from "./order.js";

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
