import type { Container, StockLine } from "../domain/container.js";
import type { Sku } from "../domain/item.js";
import type { Order, OrderLine, OrderState } from "../domain/order.js";
import { changeOrderState } from "../domain/order.js";
import type { Result } from "../domain/result.js";
import { err, ok } from "../domain/result.js";
import type { TaskId } from "../domain/task.js";
import type { PickInstruction, Plan } from "./planner.js";

export type PickState = "waiting" | "ready" | "confirmed" | "cancelled";

export interface PendingPick {
  readonly instruction: PickInstruction;
  readonly state: PickState;
}

export interface Warehouse {
  readonly containers: readonly Container[];
  readonly orders: readonly Order[];
  readonly picks: readonly PendingPick[];
}

export type ConfirmRefusal =
  | "unknown_pick"
  | "pick_not_ready"
  | "unknown_container"
  | "unknown_order"
  | "not_enough_in_container";

function withPickState(
  warehouse: Warehouse,
  taskId: TaskId,
  from: PickState,
  to: PickState,
): Warehouse {
  return {
    ...warehouse,
    picks: warehouse.picks.map((pick) =>
      pick.instruction.taskId === taskId && pick.state === from
        ? { ...pick, state: to }
        : pick,
    ),
  };
}

export function receivePlan(warehouse: Warehouse, plan: Plan): Warehouse {
  const references = new Set(
    plan.instructions.map((instruction) => instruction.orderReference),
  );

  return {
    ...warehouse,
    orders: warehouse.orders.map((order) => {
      if (!references.has(order.reference) || order.state !== "received") {
        return order;
      }

      const planned = changeOrderState(order, "planned");
      return planned.ok ? planned.value : order;
    }),
    picks: [
      ...warehouse.picks,
      ...plan.instructions.map(
        (instruction): PendingPick => ({ instruction, state: "waiting" }),
      ),
    ],
  };
}

export function markArrived(warehouse: Warehouse, taskId: TaskId): Warehouse {
  return withPickState(warehouse, taskId, "waiting", "ready");
}

export function markLost(warehouse: Warehouse, taskId: TaskId): Warehouse {
  return withPickState(warehouse, taskId, "waiting", "cancelled");
}

function removeFromLine(
  line: StockLine,
  taken: number,
  released: number,
): StockLine {
  return {
    ...line,
    quantity: line.quantity - taken,
    reservedQuantity: Math.max(0, line.reservedQuantity - released),
  };
}

function removeFromContainer(
  container: Container,
  sku: Sku,
  taken: number,
  released: number,
): Container {
  return {
    ...container,
    contents: container.contents.map((line) =>
      line.sku === sku ? removeFromLine(line, taken, released) : line,
    ),
  };
}

function isComplete(line: OrderLine): boolean {
  return line.pickedQuantity >= line.requestedQuantity;
}

function creditLine(lines: readonly OrderLine[], sku: Sku, taken: number) {
  const target = lines.findIndex(
    (line) => line.sku === sku && !isComplete(line),
  );

  return lines.map((line, index) =>
    index === target
      ? { ...line, pickedQuantity: line.pickedQuantity + taken }
      : line,
  );
}

function moveOrder(order: Order, to: OrderState): Order {
  if (to === order.state) {
    return order;
  }

  const moved = changeOrderState(order, to);

  if (!moved.ok) {
    console.error("wms: illegal order transition", moved.error);
    return order;
  }

  return moved.value;
}

function advanceOrder(order: Order, sku: Sku, taken: number): Order {
  const lines = creditLine(order.lines, sku, taken);
  const picking = moveOrder({ ...order, lines }, "picking");

  return lines.every(isComplete) ? moveOrder(picking, "picked") : picking;
}

export function confirmPick(
  warehouse: Warehouse,
  taskId: TaskId,
  quantity: number,
): Result<Warehouse, ConfirmRefusal> {
  const pending = warehouse.picks.find(
    (pick) => pick.instruction.taskId === taskId,
  );

  if (pending === undefined) {
    return err("unknown_pick");
  }

  if (pending.state !== "ready") {
    return err("pick_not_ready");
  }

  const instruction: PickInstruction = pending.instruction;

  const container = warehouse.containers.find(
    (candidate) => candidate.lpn === instruction.lpn,
  );

  const line = container?.contents.find(
    (candidate) => candidate.sku === instruction.sku,
  );

  if (container === undefined || line === undefined) {
    return err("unknown_container");
  }

  if (quantity > line.quantity) {
    return err("not_enough_in_container");
  }

  const order = warehouse.orders.find(
    (candidate) => candidate.reference === instruction.orderReference,
  );

  if (order === undefined) {
    return err("unknown_order");
  }

  return ok({
    containers: warehouse.containers.map((candidate) =>
      candidate.lpn === instruction.lpn
        ? removeFromContainer(
            candidate,
            instruction.sku,
            quantity,
            instruction.quantity,
          )
        : candidate,
    ),
    orders: warehouse.orders.map((candidate) =>
      candidate.reference === order.reference
        ? advanceOrder(candidate, instruction.sku, quantity)
        : candidate,
    ),
    picks: warehouse.picks.map((pick) =>
      pick.instruction.taskId === taskId
        ? { ...pick, state: "confirmed" }
        : pick,
    ),
  });
}
