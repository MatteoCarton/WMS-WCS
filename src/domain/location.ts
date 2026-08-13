export type LocationCode = string;

export type LocationZone =
  | "receiving"
  | "bulk"
  | "picking"
  | "packing"
  | "shipping";

export interface Location {
  readonly code: LocationCode;
  readonly zone: LocationZone;
  readonly aisle: string;
  readonly bay: number;
  readonly level: number;
  readonly slot: string;
}
