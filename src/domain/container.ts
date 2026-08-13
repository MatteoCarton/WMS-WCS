import type { Sku } from "./item.js";
import type { LocationCode } from "./location.js";

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
  readonly expiryDate: Date | null;
}

export interface Container {
  readonly lpn: Lpn;
  readonly state: ContainerState;
  readonly locationCode: LocationCode | null;
  readonly contents: readonly StockLine[];
}
