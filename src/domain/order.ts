import type { Sku } from "./item.js";
import type { Result } from "./result.js";
import { ok } from "./result.js";
import type { IllegalTransition, TransitionTable } from "./state-machine.js";
import { transition } from "./state-machine.js";

export type OrderReference = string;

export type OrderState =
  | "received"
  | "planned"
  | "picking"
  | "picked"
  | "shipped"
  | "cancelled";

export interface OrderLine {
  readonly sku: Sku;
  readonly requestedQuantity: number;
  readonly pickedQuantity: number;
}

export interface Order {
  readonly reference: OrderReference;
  readonly customer: string;
  readonly createdAt: Date;
  readonly state: OrderState;
  readonly lines: readonly OrderLine[];
}

export const orderTransitions: TransitionTable<OrderState> = {
  received: ["planned", "cancelled"],
  planned: ["picking", "cancelled"],
  picking: ["picked", "cancelled"],
  picked: ["shipped", "cancelled"],
  shipped: [],
  cancelled: [],
};

export function changeOrderState(
  order: Order,
  to: OrderState,
): Result<Order, IllegalTransition<OrderState>> {
  const next = transition(orderTransitions, order.state, to);
  return next.ok ? ok({ ...order, state: next.value }) : next;
}
