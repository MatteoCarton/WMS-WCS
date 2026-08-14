import type { Container, Lpn } from "../domain/container.js";
import type { Sku } from "../domain/item.js";
import type { LocationCode } from "../domain/location.js";
import type { Order, OrderReference } from "../domain/order.js";
import type { PickStrategy } from "../domain/stock.js";
import { allocate } from "../domain/stock.js";
import type { Task, TaskId } from "../domain/task.js";
import { pad } from "../shared/pad.js";

export interface PickInstruction {
  readonly taskId: TaskId;
  readonly orderReference: OrderReference;
  readonly sku: Sku;
  readonly lpn: Lpn;
  readonly quantity: number;
}

export interface Shortfall {
  readonly sku: Sku;
  readonly missing: number;
}

export interface Plan {
  readonly tasks: readonly Task[];
  readonly instructions: readonly PickInstruction[];
  readonly shortfalls: readonly Shortfall[];
}

export interface PlanningContext {
  readonly containers: readonly Container[];
  readonly strategy: PickStrategy;
  readonly station: LocationCode;
  readonly now: Date;
  readonly firstTaskNumber: number;
}

export function taskId(taskNumber: number): TaskId {
  return `TSK${pad(taskNumber, 5)}`;
}

function locationOf(
  containers: readonly Container[],
  lpn: Lpn,
): LocationCode | null {
  return containers.find((container) => container.lpn === lpn)?.locationCode ?? null;
}

function reserve(
  containers: readonly Container[],
  sku: Sku,
  lpn: Lpn,
  quantity: number,
): readonly Container[] {
  return containers.map((container) =>
    container.lpn === lpn
      ? {
          ...container,
          contents: container.contents.map((line) =>
            line.sku === sku
              ? { ...line, reservedQuantity: line.reservedQuantity + quantity }
              : line,
          ),
        }
      : container,
  );
}

export function planOrder(order: Order, context: PlanningContext): Plan {
  const tasks: Task[] = [];
  const instructions: PickInstruction[] = [];
  const shortfalls: Shortfall[] = [];

  let containers = context.containers;
  let taskNumber = context.firstTaskNumber;

  for (const line of order.lines) {
    const missing = line.requestedQuantity - line.pickedQuantity;

    if (missing <= 0) {
      continue;
    }

    const allocation = allocate(containers, line.sku, missing, context.strategy);

    for (const pick of allocation.picks) {
      const from = locationOf(containers, pick.lpn);

      if (from === null) {
        shortfalls.push({ sku: line.sku, missing: pick.quantity });
        continue;
      }

      const id = taskId(taskNumber);
      taskNumber += 1;

      tasks.push({
        id,
        type: "picking",
        state: "created",
        lpn: pick.lpn,
        fromLocation: from,
        toLocation: context.station,
        orderReference: order.reference,
        attempts: 0,
        createdAt: context.now,
      });

      instructions.push({
        taskId: id,
        orderReference: order.reference,
        sku: line.sku,
        lpn: pick.lpn,
        quantity: pick.quantity,
      });

      containers = reserve(containers, line.sku, pick.lpn, pick.quantity);
    }

    if (allocation.shortfall > 0) {
      shortfalls.push({ sku: line.sku, missing: allocation.shortfall });
    }
  }

  return { tasks, instructions, shortfalls };
}
