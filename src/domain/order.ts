import type { Sku } from "./item.js";

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
