import type { Sku } from "./item.js";
import type { LocationCode } from "./location.js";
import type { Result } from "./result.js";
import { ok } from "./result.js";
import type { IllegalTransition, TransitionTable } from "./state-machine.js";
import { transition } from "./state-machine.js";

export type Lpn = string;

export type ContainerState =
  | "in_stock"
  | "reserved"
  | "moving"
  | "at_station"
  | "blocked";

export interface StockLine {
  readonly sku: Sku;
  readonly quantity: number;
  readonly reservedQuantity: number;
  readonly receivedAt: Date;
  readonly expiryDate: Date | null;
}

export interface Container {
  readonly lpn: Lpn;
  readonly state: ContainerState;
  readonly locationCode: LocationCode | null;
  readonly contents: readonly StockLine[];
}

export const containerTransitions: TransitionTable<ContainerState> = {
  in_stock: ["reserved", "moving", "blocked"],
  reserved: ["in_stock", "moving", "blocked"],
  moving: ["in_stock", "at_station", "blocked"],
  at_station: ["moving", "blocked"],
  blocked: [],
};

export function changeContainerState(
  container: Container,
  to: ContainerState,
): Result<Container, IllegalTransition<ContainerState>> {
  const next = transition(containerTransitions, container.state, to);
  return next.ok ? ok({ ...container, state: next.value }) : next;
}
